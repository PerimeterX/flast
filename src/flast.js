const {parse} = require('espree');
const {generate} = require('escodegen');
const estraverse = require('estraverse');
const {analyze} = require('eslint-scope');

const ecmaVersion = 'latest';
const sourceType = 'module';

/**
 * @param {string} inputCode
 * @param {object} opts Additional options for espree
 * @return {ASTNode} The root of the AST
 */
function parseCode(inputCode, opts = {}) {
	return parse(inputCode, {ecmaVersion, comment: true, range: true, ...opts});
}

const excludedParentKeys = [
	'type', 'start', 'end', 'range', 'sourceType', 'comments', 'srcClosure', 'nodeId',
	'childNodes', 'parentNode', 'parentKey', 'scope',
];

/**
 * Return the key the child node is assigned in the parent node if applicable; null otherwise.
 * @param {ASTNode} node
 * @returns {string|null}
 */
function getParentKey(node) {
	if (node.parentNode) {
		const keys = Object.keys(node.parentNode);
		for (let i = 0; i < keys.length; i++) {
			if (excludedParentKeys.includes(keys[i])) continue;
			if (node.parentNode[keys[i]] === node) return keys[i];
			if (Array.isArray(node.parentNode[keys[i]])) {
				for (let j = 0; j < node.parentNode[keys[i]]?.length; j++) {
					if (node.parentNode[keys[i]][j] === node) return keys[i];
				}
			}
		}
	}
	return null;
}

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
	opts = { ...generateFlatASTDefaultOptions, ...opts };
	const rootNode = generateRootNode(inputCode, opts);
	const tree = extractNodesFromRoot(rootNode, opts);
	const sm = initScopeManager(rootNode);
	if (opts.detailed) {
		for (let i = 0; i < tree.length; i++) injectScopeToNode(tree[i], sm);
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
	opts = { ...generateFlatASTDefaultOptions, ...opts };
	const parseOpts = opts.parseOpts || {};
	let rootNode;
	try {
		rootNode = parseCode(inputCode, parseOpts);
		if (opts.includeSrc) rootNode.srcClosure = createSrcClosure(inputCode);
	} catch (e) {
		if (opts.alernateSourceTypeOnFailure && e.message.includes('in strict mode')) rootNode = parseCode(inputCode, {...parseOpts, sourceType: 'script'});
	}
	return rootNode;
}

function extractNodesFromRoot(rootNode, opts) {
	opts = { ...generateFlatASTDefaultOptions, ...opts };
	const tree = [];
	let nodeId = 0;

	estraverse.traverse(rootNode, {
		/**
		 * @param {ASTNode} node
		 * @param {ASTNode} parentNode
		 */
		enter(node, parentNode) {
			tree.push(node);
			node.nodeId = nodeId++;
			node.childNodes = [];
			node.parentNode = parentNode;
			// Keep track of the node's lineage
			node.parentKey = parentNode ? getParentKey(node) : '';
			if (opts.includeSrc) Object.defineProperty(node, 'src', {
				get() { return rootNode.srcClosure(node.range[0], node.range[1]);},
			});
		}
	});
	return tree;
}

function initScopeManager(rootNode) {
	// noinspection JSCheckFunctionSignatures
	return analyze(rootNode, {
		optimistic: true,
		ecmaVersion,
		sourceType});
}

/**
 *
 * @param {ASTNode} node
 * @param {ScopeManager} sm
 */
function injectScopeToNode(node, sm) {
	let parentNode = node.parentNode;
	// Acquire scope
	node.scope = sm.acquire(node);
	if (!node.scope) node.scope = node.parentNode.scope;
	else if (node.scope.type.includes('-name') && node.scope?.childScopes?.length === 1) node.scope = node.scope.childScopes[0];
	if (node.scope.scopeId === undefined) node.scope.scopeId = node.scope.block.nodeId;
	if (parentNode) {
		node.lineage = [...parentNode?.lineage || [], parentNode.nodeId];
		parentNode.childNodes.push(node);
	}
	if (node.type === 'Identifier') {
		// Track references and declarations
		// Prevent assigning declNode to member expression properties or object keys
		if (!(['property', 'key'].includes(node.parentKey) && !parentNode.computed)) {
			const variables = node.scope.variables.filter(n => n.name === node.name);
			const isDeclaration = variables?.length && variables[0].identifiers.filter(n => n.nodeId === node.nodeId).length;
			if (isDeclaration) node.references = node.references || [];
			else if (!(node.parentKey === 'id' && node.parentNode.type === 'FunctionDeclaration'))  {
				// Find declaration by finding the closest declaration of the same name.
				let decls = [];
				if (variables?.length) decls = variables.filter(n => n.name === node.name)[0].identifiers;
				else {
					const scopeReferences = node.scope.references.filter(n => n.identifier.name === node.name);
					if (scopeReferences.length) decls = scopeReferences[0].resolved?.identifiers || [];
				}
				let declNode = decls[0];
				if (decls.length > 1) {   // TODO: Defer setting declaration and references
					let commonAncestors = node.lineage.reduce((t, c) => declNode.lineage?.includes(c) ? ++t : t, 0);
					decls.slice(1).forEach(n => {
						const ca = node.lineage.reduce((t, c) => n.lineage?.includes(c) ? ++t : t, 0);
						if (ca > commonAncestors) {
							commonAncestors = ca;
							declNode = n;
						}
					});
				}
				if (declNode) {
					if (!declNode.references) declNode.references = [];
					declNode.references.push(node);
					node.declNode = declNode;
				}
			}
		}
	}
}

module.exports = {
	estraverse,
	extractNodesFromRoot,
	generateCode,
	generateFlatAST,
	generateRootNode,
	parseCode,
};
