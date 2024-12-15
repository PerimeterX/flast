import path from 'node:path';
import assert from 'node:assert';
import {describe, it} from 'node:test';
import {fileURLToPath} from 'node:url';
import {generateFlatAST, generateCode} from '../src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Functionality tests', () => {
	it('Verify the code breakdown generates the expected nodes by checking the properties of the generated ASTNodes', () => {
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
				assert.equal(v, parsedNode[k], `Node #${node.nodeId} parsed wrong on key '${k}'`);
			}
		});
	});
	it('Verify the expected functions and classes can be imported', async () => {
		const availableImports = [
			'Arborist',
			'ASTNode',
			'ASTScope',
			'generateCode',
			'generateFlatAST',
			'parseCode',
			'applyIteratively',
			'logger',
			'treeModifier',
		];
		const flast = await import(path.resolve(__dirname + '/../src/index.js'));
		for (const importName of availableImports) {
			assert.ok(importName in flast, `Failed to import "${importName}"`);
		}
	});
	it('Verify the code breakdown generates the expected nodes by checking the number of nodes for each expected type', () => {
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
		assert.equal(ast.length, expectedNumberOfNodes, `Unexpected number of nodes`);
		for (const nodeType of Object.keys(expectedBreakdown)) {
			const numberOfNodes = ast.filter(n => n.type === nodeType).length;
			assert.equal(numberOfNodes, expectedBreakdown[nodeType], `Wrong number of nodes for '${nodeType}' node type`);
		}
	});
	it('Verify the AST can be parsed and regenerated into the same code', () => {
		const code = `console.log('hello' + ' ' + 'there');`;
		const ast = generateFlatAST(code);
		const regeneratedCode = generateCode(ast[0]);
		assert.equal(regeneratedCode, code, `Original code did not regenerate back to the same source.`);
	});
	it(`Verify generateFlatAST's detailed option works as expected`, () => {
		const code = `var a = [1]; a[0];`;
		const noDetailsAst = generateFlatAST(code, {detailed: false});
		const [noDetailsVarDec, noDetailsVarRef] = noDetailsAst.filter(n => n.type === 'Identifier');
		assert.equal(noDetailsVarDec.references || noDetailsVarRef.declNode || noDetailsVarRef.scope, undefined,
			`Flat AST generated with details despite 'detailed' option set to false.`);

		const noSrcAst = generateFlatAST(code, {includeSrc: false});
		assert.equal(noSrcAst.find(n => n.src !== undefined), null, `Flat AST generated with src despite 'includeSrc' option set to false.`);

		const detailedAst = generateFlatAST(code, {detailed: true});
		const [detailedVarDec, detailedVarRef] = detailedAst.filter(n => n.type === 'Identifier');
		assert.ok(detailedVarDec.parentNode && detailedVarDec.childNodes && detailedVarDec.references &&
				detailedVarRef.declNode && detailedVarRef.nodeId && detailedVarRef.scope && detailedVarRef.src,
		`Flat AST missing details despite 'detailed' option set to true.`);

		const detailedNoSrcAst = generateFlatAST(code, {detailed: true, includeSrc: false});
		assert.equal(detailedNoSrcAst[0].src, undefined, `Flat AST includes details despite 'detailed' option set to true and 'includeSrc' option set to false.`);
	});
	it(`Verify a script is parsed in "sloppy mode" if strict mode is restricting parsing`, () => {
		const code = `let a; delete a;`;
		let ast = [];
		let error = '';
		try {
			ast = generateFlatAST(code);
		} catch (e) {
			error = e.message;
		}
		assert.ok(ast.length, `Script was not parsed. Got the error "${error}"`);
	});
	it(`Verify a script is only parsed in its selected sourceType`, () => {
		const code = `let a; delete a;`;
		let unparsedAst = [];
		let parsedAst = [];
		let unparsedError = '';
		let parsedError = '';
		try {
			unparsedAst = generateFlatAST(code, {alernateSourceTypeOnFailure: false});
		} catch (e) {
			unparsedError = e.message;
		}
		try {
			parsedAst = generateFlatAST(code, {alernateSourceTypeOnFailure: true});
		} catch (e) {
			parsedError = e.message;
		}
		assert.equal(unparsedAst.length, 0, `Script was not parsed.${unparsedError ? 'Error: ' + unparsedError : ''}`);
		assert.ok(parsedAst.length, `Script was not parsed.${parsedError ? 'Error: ' + parsedError : ''}`);
	});
	it(`Verify generateFlatAST doesn't throw an exception for invalid code`, () => {
		const code = `return a;`;
		let result;
		const expectedResult = [];
		try {
			result = generateFlatAST(code, {alernateSourceTypeOnFailure: false});
		} catch (e) {
			result = e.message;
		}
		assert.deepStrictEqual(result, expectedResult);
	});
});