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

/**
 * Return the key the child node is assigned in the parent node if applicable; null otherwise.
 * @param {ASTNode} parent
 * @param {number} targetChildNodeId
 * @returns {string|null}
 */
function getParentKey(parent, targetChildNodeId) {
	if (parent) {
		for (const key of Object.keys(parent)) {
			if (parent[key]?.nodeId === targetChildNodeId) return key;
			else if (Array.isArray(parent[key])) {
				for (const item of (parent[key] || [])) {
					if (item?.nodeId === targetChildNodeId) return key;
				}
			}
		}
	}
	return null;
}

const generateFlatASTDefaultOptions = {
	// If false, include only original node with nodeId, without any further details
	detailed: true,
	// If false, do not include node src. Only available when `detailed` option is true
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
	const parseOpts = opts.parseOpts || {};
	let rootNode;
	try {
		rootNode = parseCode(inputCode, parseOpts);
	} catch (e) {
		if (opts.alernateSourceTypeOnFailure && e.message.includes('in strict mode')) rootNode = parseCode(inputCode, {...parseOpts, sourceType: 'script'});
	}
	let scopeManager;
	let srcClosure;
	try {
		if (opts.detailed) { // noinspection JSCheckFunctionSignatures
			scopeManager = analyze(rootNode, {
				optimistic: true,
				ecmaVersion,
				sourceType});
			if (opts.includeSrc) srcClosure = createSrcClosure(inputCode);
		}
	} catch {}
	const tree = [];
	let nodeId = 0;
	let scopeId = 0;
	estraverse.traverse(rootNode, {
		/**
		 * @param {ASTNode} node
		 * @param {ASTNode} parentNode
		 */
		enter(node, parentNode) {
			node.nodeId = nodeId++;
			if (opts.detailed) {
				if (opts.includeSrc) Object.defineProperty(node, 'src', {
					get() { return srcClosure(node.range[0], node.range[1]);},
				});
				node.childNodes = [];
				node.parentNode = parentNode;
				node.parentKey = parentNode ? getParentKey(parentNode, node.nodeId) : '';

				// Keep track of the node's lineage
				if (parentNode) node.lineage = [...parentNode?.lineage || [], parentNode.nodeId];
				// Acquire scope
				node.scope = scopeManager.acquire(node);
				if (!node.scope) node.scope = node.parentNode.scope;
				else if (node.scope.type.includes('-name') && node.scope?.childScopes?.length === 1) node.scope = node.scope.childScopes[0];
				if (node.scope.scopeId === undefined) node.scope.scopeId = scopeId++;
				if (parentNode) parentNode.childNodes.push(node);
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
			tree.push(node);
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
	estraverse,
	generateCode,
	generateFlatAST,
	parseCode,
};
