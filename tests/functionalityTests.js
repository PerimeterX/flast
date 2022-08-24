const assert = require('node:assert');
const {generateFlatAST, generateCode} = require(__dirname + '/../src/index');
module.exports = [
	{
		enabled: true,
		name: 'ASTNode structure integrity',
		description: 'Verify the code breakdown generates the expected nodes by checking the properties of the generated ASTNodes.',
		run() {
			const code = `a=3`;
			const ast = generateFlatAST(code);
			const expectedBreakdown = [
				{nodeId: 0, type: 'Program', start: 0, end: 3, src: 'a=3', parentNode: null, parentKey: ''},
				{nodeId: 1, type: 'ExpressionStatement', start: 0, end: 3, src: 'a=3', parentKey: 'body'},
				{nodeId: 2, type: 'AssignmentExpression', start: 0, end: 3, src: 'a=3', operator: '=', parentKey: 'expression'},
				{nodeId: 3, type: 'Identifier', start: 0, end: 1, src: 'a', parentKey: 'left'},
				{nodeId: 4, type: 'Literal', start: 2, end: 3, src: '3', value: 3, raw: '3', parentKey: 'right'},
			];
			expectedBreakdown.forEach(node => {
				const parsedNode = ast[node.nodeId];
				for (const [k, v] of Object.entries(node)) {
					assert(parsedNode[k] === v,
						`Value in parsed node, ${parsedNode[k]}, does not match expected value: ${v}, for key ${k}`);
				}
			});
		},
	},
	{
		enabled: true,
		name: 'Number of nodes',
		description: 'Verify the code breakdown generates the expected nodes by checking the number of nodes for each expected type.',
		run() {
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
			const expectedNumberOfNodes = 11;
			assert(ast.length === expectedNumberOfNodes,
				`Unexpected number of nodes: Expected ${expectedNumberOfNodes} but got ${ast.length}`);
			for (const nodeType of Object.keys(expectedBreakdown)) {
				const numberOfNodes = ast.filter(n => n.type === nodeType).length;
				assert(numberOfNodes === expectedBreakdown[nodeType],
					`There are ${numberOfNodes} ${nodeType} nodes instead of the expected ${expectedBreakdown[nodeType]}`);
			}
		},
	},
	{
		enabled: true,
		name: 'Parse and generate',
		description: 'Verify the AST can be parsed and regenerated into the same code.',
		run() {
			const code = `console.log('hello' + ' ' + 'there');`;
			const ast = generateFlatAST(code);
			const regeneratedCode = generateCode(ast[0]);
			assert(code === regeneratedCode,
				`Original code did not regenerate back to the same source.\nOriginal:\t${code}\nRegenerated:\t${regeneratedCode}`);
		},
	},
	{
		enabled: true,
		name: 'Options: detailed',
		description: `Verify generateFlatAST's detailed option works as expected.`,
		source: `var a = [1]; a[0];`,
		run() {
			const code = `var a = [1]; a[0];`;
			const noDetailsAst = generateFlatAST(code, {detailed: false, includeSrc: true}); // includeSrc will be ignored
			const [noDetailsVarDec, noDetailsVarRef] = noDetailsAst.filter(n => n.type === 'Identifier');
			assert(!(
				noDetailsVarDec.parentNode || noDetailsVarDec.childNodes || noDetailsVarDec.references ||
					noDetailsVarRef.declNode || noDetailsVarRef.nodeId || noDetailsVarRef.scope || noDetailsVarRef.src),
			`Flat AST generated with details despite 'detailed' option set to false.`);
			const detailedAst = generateFlatAST(code, {detailed: true});
			const [detailedVarDec, detailedVarRef] = detailedAst.filter(n => n.type === 'Identifier');
			assert(
				detailedVarDec.parentNode && detailedVarDec.childNodes && detailedVarDec.references &&
				detailedVarRef.declNode && detailedVarRef.nodeId && detailedVarRef.scope && detailedVarRef.src,
				`Flat AST missing details despite 'detailed' option set to true.`);
			const detailedNoSrcAst = generateFlatAST(code, {detailed: true, includeSrc: false});
			assert(!detailedNoSrcAst[0].src,
				`Flat AST includes details despite 'detailed' option set to true and 'includeSrc' option set to false.`);
		},
	},
];