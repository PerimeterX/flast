const assert = require('assert');
const {generateFlatAST, generateCode} = require(__dirname + '/../src/index');

/**
 * Verify the code breakdown generates the expected nodes by checking the number of nodes for each expected type.
 */
function testNumberOfNodes() {
	const code = `console.log('hello' + ' ' + 'there');`;
	const ast = generateFlatAST(code);
	const expectedBreakdown = {
		Program: 1,
		ExpressionStatement: 1,
		CallExpression: 1,
		MemberExpression: 1,
		Identifier: 2,
		BinaryExpression: 2,
		Literal: 3,
	};
	const expectedNubmerOfNodes = 11;
	assert(ast.length === expectedNubmerOfNodes,
		`Unexpected number of nodes: Expected ${expectedNubmerOfNodes} but got ${ast.length}`);
	for (const nodeType of Object.keys(expectedBreakdown)) {
		const numberOfNodes = ast.filter(n => n.type === nodeType).length;
		assert(numberOfNodes === expectedBreakdown[nodeType],
			`There are ${numberOfNodes} ${nodeType} nodes instead of the expected ${expectedBreakdown[nodeType]}`);
	}
}

/**
 * Verify the AST can be parsed and regenerated into the same code.
 */
function testParseAndGenerate() {
	const code = `console.log('hello' + ' ' + 'there');`;
	const ast = generateFlatAST(code);
	const regeneratedCode = generateCode(ast[0]);
	assert(code === regeneratedCode,
		`Original code did not regenerate back to the same source.\nOriginal:\t${code}\nRegenerated:\t${regeneratedCode}`);
}

const tests = {
	'number of nodes': testNumberOfNodes,
	'parse and generate': testParseAndGenerate,
};

module.exports = tests;