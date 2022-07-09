// noinspection JSUnusedGlobalSymbols

// eslint-disable-next-line no-unused-vars
const {parse, ASTNode} = require('espree');
const {generate} = require('escodegen');
const estraverse = require('estraverse');
const eslineScope = require('eslint-scope');

const ecmaVersion = 2022;

/**
 * @param inputCode
 * @return {ASTNode} The root of the AST
 */
function parseCode(inputCode) {
	return parse(inputCode, {ecmaVersion, comment: true, range: true});
}

const generateFlatASTDefaultOptions = {
	detailed: true,   // If false, include only original node without any further details
	includeSrc: true, // If false, do not include node src. Only available when `detailed` option is true
};

/**
 * @param {string} inputCode
 * @param {object} opts Optional changes to behavior. See generateFlatASTDefaultOptions for available options.
 * @return {ASTNode[]} An array of flattened AST
 */
function generateFlatAST(inputCode, opts = {}) {
	opts = { ...generateFlatASTDefaultOptions, ...opts };
	const rootNode = parseCode(inputCode);
	let scopeManager;
	try {
		if (opts.detailed) { // noinspection JSCheckFunctionSignatures
			scopeManager = eslineScope.analyze(rootNode, {optimistic: true, ecmaVersion});
		}
	} catch {}
	const tree = [];
	let nodeId = 0;
	let scopeId = 0;
	let currentScope;
	if (opts.detailed) { // noinspection JSCheckFunctionSignatures
		currentScope = scopeManager?.acquire(rootNode) ?? {};
	}
	estraverse.traverse(rootNode, {
		enter(node, parentNode) {
			if (opts.detailed) {
				node.nodeId = nodeId++;
				if (opts.includeSrc) node.src = inputCode.substring(node.range[0], node.range[1]);
				node.childNodes = [];
				node.parentNode = parentNode;
				// Set new scope when entering a function structure
				if (scopeManager && /Function/.test(node.type)) currentScope = scopeManager.acquire(node);
				if (currentScope && currentScope.scopeId === undefined) currentScope.scopeId = scopeId++;
				// If no scope was acquired use parent scope
				node.scope = currentScope ? currentScope : node.parentNode.scope;
				// If the current node is the function's id, use the parent scope
				if (node.scope && node.type === 'Identifier' && parentNode.type === 'FunctionDeclaration') node.scope = node.scope.upper;
				if (parentNode) parentNode.childNodes.push(node);
				if (node.type === 'Identifier') {
					// Collect all references for this identifier, self excluded
					const refs = node.scope.variables.filter(n =>
						n.identifiers.length &&
						n.identifiers[0].nodeId === node.nodeId);
					if (refs.length === 1) {
						node.references = refs[0].references.map(r => r.identifier).filter(n => n.nodeId !== node.nodeId);
						node.references.forEach(n => n.declNode = node);
					}
				}
			}
			tree.push(node);
		},
		leave(node) {
			if (scopeManager && /Function/.test(node.type)) currentScope = scopeManager.upper;
		},
	});
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

module.exports = {
	generateFlatAST,
	parseCode,
	estraverse,
	generateCode,
	ASTNode,
};
