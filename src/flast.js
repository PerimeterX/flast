import {parse} from 'espree';
import estraverse from 'estraverse';
import {analyze} from 'eslint-scope';
import {logger} from './utils/logger.js';
import {generate, attachComments} from 'escodegen';

const ecmaVersion = 'latest';
const sourceType = 'module';

/**
 * @param {string} inputCode
 * @param {object} opts Additional options for espree
 * @return {ASTNode} The root of the AST
 */
function parseCode(inputCode, opts = {}) {
	const rootNode = parse(inputCode, {ecmaVersion, comment: true, range: true, ...opts});
	if (rootNode.tokens) attachComments(rootNode, rootNode.comments, rootNode.tokens);
	return rootNode;
}

const excludedParentKeys = [
	'type', 'start', 'end', 'range', 'sourceType', 'comments', 'srcClosure', 'nodeId', 'leadingComments', 'trailingComments',
	'childNodes', 'parentNode', 'parentKey', 'scope', 'typeMap', 'lineage', 'allScopes', 'tokens',
];

const generateFlatASTDefaultOptions = {
	// If false, do not include any scope details
	detailed: true,
	// If false, do not include node src
	includeSrc: true,
	// Retry to parse the code with sourceType: 'script' if 'module' failed with 'strict' error message
	alernateSourceTypeOnFailure: true,
	// Options for the espree parser
	parseOpts: {
		sourceType,
		comment: true,
		tokens: true,
	},
};

/**
 * Return a function which retrieves a node's source on demand
 * @param {string} src
 * @returns {function(number, number): string}
 */
function createSrcClosure(src) {
	return function(start, end) {return src.slice(start, end);};
}

/**
 * @param {string} inputCode
 * @param {object} opts Optional changes to behavior. See generateFlatASTDefaultOptions for available options.
 * @return {ASTNode[]} An array of flattened AST
 */
function generateFlatAST(inputCode, opts = {}) {
	opts = {...generateFlatASTDefaultOptions, ...opts};
	let tree = [];
	const rootNode = generateRootNode(inputCode, opts);
	if (rootNode) {
		tree = extractNodesFromRoot(rootNode, opts);
	}
	return tree;
}

const generateCodeDefaultOptions = {
	format: {
		indent: {
			style: '  ',
			adjustMultilineComment: true,
		},
		quotes: 'auto',
		escapeless: true,
		compact: false,
	},
	comment: true,
};

/**
 * @param {ASTNode} rootNode
 * @param {object} opts Optional changes to behavior. See generateCodeDefaultOptions for available options.
 * @return {string} Code generated from AST
 */
function generateCode(rootNode, opts = {}) {
	return generate(rootNode, { ...generateCodeDefaultOptions, ...opts });
}

function generateRootNode(inputCode, opts = {}) {
	opts = {...generateFlatASTDefaultOptions, ...opts};
	const parseOpts = opts.parseOpts || {};
	let rootNode;
	try {
		rootNode = parseCode(inputCode, parseOpts);
		if (opts.includeSrc) rootNode.srcClosure = createSrcClosure(inputCode);
	} catch (e) {
		if (opts.alernateSourceTypeOnFailure && e.message.includes('in strict mode')) rootNode = parseCode(inputCode, {...parseOpts, sourceType: 'script'});
		else logger.debug(e);
	}
	return rootNode;
}

function extractNodesFromRoot(rootNode, opts) {
	opts = {...generateFlatASTDefaultOptions, ...opts};
	let nodeId = 0;
	const typeMap = {};
	const allNodes = [];
	const scopes = opts.detailed ? getAllScopes(rootNode) : {};
	const stack = [rootNode];
	while (stack.length) {
		const node = stack.shift();
		node.childNodes = node.childNodes || [];
		const childrenLoc = {};  // Store the location of child nodes to sort them by order
		if (!node.parentKey) node.parentKey = '';
		const keys = Object.keys(node);
		for (let i = 0; i < keys.length; i++) {
			const key = keys[i];
			if (excludedParentKeys.includes(key)) continue;
			const content = node[key];
			if (content && typeof content === 'object') {
				if (Array.isArray(content)) {
					for (let j = 0; j < content.length; j++) {
						const childNode = content[j];
						childNode.parentNode = node;
						childNode.parentKey = key;
						childrenLoc[childNode.start] = childNode;
					}
				} else {
					content.parentNode = node;
					content.parentKey = key;
					childrenLoc[content.start] = content;
				}
			}
		}
		stack.unshift(...Object.values(childrenLoc));
		allNodes.push(node);
		node.nodeId = nodeId++;
		if (!typeMap[node.type]) typeMap[node.type] = [node];
		else typeMap[node.type].push(node);
		node.lineage = [...node.parentNode?.lineage || []];
		if (node.parentNode) {
			node.lineage.push(node.parentNode.start);
		}
		node.childNodes.push(...Object.values(childrenLoc));
		if (opts.includeSrc && !node.src) Object.defineProperty(node, 'src', {
			get() { return rootNode.srcClosure(node.start, node.end);},
		});
		if (opts.detailed) injectScopeToNode(node, scopes);
	}
	if (allNodes?.length) allNodes[0].typeMap = typeMap;
	if (opts.detailed) allNodes[0].allScopes = scopes;
	return allNodes;
}

/**
 * @param {ASTNode} node
 * @param {ASTScope[]} scopes
 */
function injectScopeToNode(node, scopes) {
	let parentNode = node.parentNode;
	// Acquire scope
	node.scope = matchScopeToNode(node, scopes);
	if (node.type === 'Identifier' && !(!parentNode.computed && ['property', 'key'].includes(node.parentKey))) {
		// Track references and declarations
		// Prevent assigning declNode to member expression properties or object keys
		const variables = node.scope.variables.filter(n => n.name === node.name);
		if (node.parentKey === 'id' || (variables?.length && variables[0].identifiers.some(n => n === node))) {
			node.references = node.references || [];
		} else {
			// Find declaration by finding the closest declaration of the same name.
			let decls = [];
			if (variables?.length) {
				decls = variables.find(n => n.name === node.name)?.identifiers;
			}
			else {
				const scopeReference = node.scope.references.find(n => n.identifier.name === node.name);
				if (scopeReference) decls = scopeReference.resolved?.identifiers || [];
			}
			let declNode = decls[0];
			if (decls.length > 1) {
				let commonAncestors = maxSharedLength(declNode.lineage, node.lineage);
				for (let i = 1; i < decls.length; i++) {
					const ca = maxSharedLength(decls[i].lineage, node.lineage);
					if (ca > commonAncestors) {
						commonAncestors = ca;
						declNode = decls[i];
					}
				}
			}
			if (declNode) {
				declNode.references = declNode.references || [];
				declNode.references.push(node);
				node.declNode = declNode;
			}
		}
	}
}

/**
 * @param {number[]} targetArr
 * @param {number[]} containedArr
 * @return {number} Return the maximum length of shared numbers
 */
function maxSharedLength(targetArr, containedArr) {
	let count = 0;
	for (let i = 0; i < containedArr.length; i++) {
		if (targetArr[i] !== containedArr[i]) break;
		++count;
	}
	return count;
}

/**
 * @param {ASTNode} node
 * @param {ASTScope[]} scopes
 * @return {Promise}
 */
async function injectScopeToNodeAsync(node, scopes) {
	return new Promise((resolve, reject) => {
		try {
			injectScopeToNode(node, scopes);
			resolve();
		} catch (e) {
			reject(e);
		}
	});
}

function getAllScopes(rootNode) {
	const globalScope = analyze(rootNode, {
		optimistic: true,
		ecmaVersion: (new Date()).getFullYear(),
		sourceType}).acquireAll(rootNode)[0];
	const allScopes = {};
	const stack = [globalScope];
	const seen = [];
	while (stack.length) {
		let scope = stack.pop();
		if (seen.includes(scope)) continue;
		seen.push(scope);
		const scopeId = scope.block.start;
		scope.block.isScopeBlock = true;
		if (!allScopes[scopeId]) {
			allScopes[scopeId] = scope;
		}
		stack.push(...scope.childScopes);
		if (scope.type === 'module' && scope.upper?.type === 'global' && scope.variables?.length) {
			for (const v of scope.variables) if (!scope.upper.variables.includes(v)) scope.upper.variables.push(v);
		}
	}
	rootNode.allScopes = allScopes;
	return allScopes;
}

/**
 * @param {ASTNode} node
 * @param {ASTScope[]} allScopes
 * @return {ASTScope}
 */
function matchScopeToNode(node, allScopes) {
	if (node.lineage?.length) {
		for (const nid of [...node.lineage].reverse()) {
			if (allScopes[nid]) {
				let scope = allScopes[nid];
				if (scope.type.includes('-name') && scope?.childScopes?.length === 1) scope = scope.childScopes[0];
				return scope;
			}
		}
	}
	return allScopes[0]; // Global scope - this should never be reached
}

/**
 *
 * @param {string} inputCode
 * @param {object} opts
 * @return {Promise<ASTNode[]>}
 */
async function generateFlatASTAsync(inputCode, opts = {}) {
	opts = { ...generateFlatASTDefaultOptions, ...opts };
	let tree = [];
	const promises = [];
	const rootNode = generateRootNode(inputCode, opts);
	if (rootNode) {
		tree = extractNodesFromRoot(rootNode, opts);
		if (opts.detailed) {
			const scopes = getAllScopes(rootNode);
			for (let i = 0; i < tree.length; i++) {
				promises.push(injectScopeToNodeAsync(tree[i], scopes));
			}
		}
	}
	return Promise.all(promises).then(() => tree);
}

export {
	estraverse,
	extractNodesFromRoot,
	generateCode,
	generateFlatAST,
	generateFlatASTAsync,
	generateRootNode,
	injectScopeToNode,
	injectScopeToNodeAsync,
	parseCode,
};
