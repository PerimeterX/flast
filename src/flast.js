import {parse} from 'espree';
import {analyze} from 'eslint-scope';
import {logger} from './utils/logger.js';
import {generate, attachComments} from 'escodegen';

const ecmaVersion = 'latest';
const currentYear = (new Date()).getFullYear();
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

/**
 * @param {string} inputCode
 * @param {object} [opts]
 * @return {ASTNode}
 */
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

/**
 * @param rootNode
 * @param opts
 * @return {ASTNode[]}
 */
function extractNodesFromRoot(rootNode, opts) {
	opts = {...generateFlatASTDefaultOptions, ...opts};
	let nodeId = 0;
	const typeMap = {};
	const allNodes = [];
	const scopes = opts.detailed ? getAllScopes(rootNode) : {};

	const stack = [rootNode];
	while (stack.length) {
		const node = stack.shift();
		if (node.nodeId) continue;
		node.childNodes = node.childNodes || [];
		const childrenLoc = {};  								// Store the location of child nodes to sort them by order
		node.parentKey = node.parentKey || '';	// Make sure parentKey exists
		// Iterate over all keys of the node to find child nodes
		const keys = Object.keys(node);
		for (let i = 0; i < keys.length; i++) {
			const key = keys[i];
			if (excludedParentKeys.includes(key)) continue;
			const content = node[key];
			if (content && typeof content === 'object') {
				// Sort each child node by its start position
				// and set the parentNode and parentKey attributes
				if (Array.isArray(content)) {
					for (let j = 0; j < content.length; j++) {
						const childNode = content[j];
						if (!childNode) continue;
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
		// Add the child nodes to top of the stack and populate the node's childNodes array
		stack.unshift(...Object.values(childrenLoc));
		node.childNodes.push(...Object.values(childrenLoc));

		allNodes.push(node);
		node.nodeId = nodeId++;
		typeMap[node.type] = typeMap[node.type] || [];
		typeMap[node.type].push(node);
		if (opts.detailed) {
			node.scope = scopes[node.scopeId] || node.parentNode?.scope;
			node.lineage = [...node.parentNode?.lineage || []];
			if (!node.lineage.includes(node.scope.scopeId)) {
				node.lineage.push(node.scope.scopeId);
			}
		}
		// Add a getter for the node's source code
		if (opts.includeSrc && !node.src) Object.defineProperty(node, 'src', {
			get() {return rootNode.srcClosure(node.start, node.end);},
		});
	}
	if (opts.detailed) {
		const identifiers = typeMap.Identifier || [];
		for (let i = 0; i < identifiers.length; i++) {
			mapIdentifierRelations(identifiers[i]);
		}
	}
	if (allNodes?.length) allNodes[0].typeMap = typeMap;
	return allNodes;
}

/**
 * @param {ASTNode} node
 */
function mapIdentifierRelations(node) {
	// Track references and declarations
	// Prevent assigning declNode to member expression properties or object keys
	if (node.type === 'Identifier' && !(!node.parentNode.computed && ['property', 'key'].includes(node.parentKey))) {
		const variables = [];
		for (let i = 0; i < node.scope.variables.length; i++) {
			if (node.scope.variables[i].name === node.name) variables.push(node.scope.variables[i]);
		}
		if (node.parentKey === 'id' || variables?.[0]?.identifiers?.includes(node)) {
			node.references = node.references || [];
		} else {
			// Find declaration by finding the closest declaration of the same name.
			let decls = [];
			if (variables?.length) {
				for (let i = 0; i < variables.length; i++) {
					if (variables[i].name === node.name) {
						decls = variables[i].identifiers || [];
						break;
					}
				}
			} else {
				for (let i = 0; i < node.scope.references.length; i++) {
					if (node.scope.references[i].identifier.name === node.name) {
						decls = node.scope.references[i].resolved?.identifiers || [];
						break;
					}
				}
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
 * @param {ASTNode} rootNode
 * @return {{number: ASTScope}}
 */
function getAllScopes(rootNode) {
	// noinspection JSCheckFunctionSignatures
	const globalScope = analyze(rootNode, {
		optimistic: true,
		ecmaVersion: currentYear,
		sourceType}).acquireAll(rootNode)[0];
	let scopeId = 0;
	const allScopes = {};
	const stack = [globalScope];
	while (stack.length) {
		const scope = stack.shift();
		if (scope.type !== 'module' && !scope.type.includes('-name')) {
			scope.scopeId = scopeId++;
			scope.block.scopeId = scope.scopeId;
			allScopes[scope.scopeId] = allScopes[scope.scopeId] || scope;

			for (let i = 0; i < scope.variables.length; i++) {
				const v = scope.variables[i];
				for (let j = 0; j < v.identifiers.length; j++) {
					v.identifiers[j].scope = scope;
					v.identifiers[j].references = [];
				}
			}
		} else if (scope.upper === globalScope && scope.variables?.length) {
			// A single global scope is enough, so if there are variables in a module scope, add them to the global scope
			for (let i = 0; i < scope.variables.length; i++) {
				const v = scope.variables[i];
				if (!globalScope.variables.includes(v)) globalScope.variables.push(v);
			}
		}
		stack.unshift(...scope.childScopes);
	}
	return rootNode.allScopes = allScopes;
}

export {
	extractNodesFromRoot,
	generateCode,
	generateFlatAST,
	generateRootNode,
	mapIdentifierRelations,
	parseCode,
};
