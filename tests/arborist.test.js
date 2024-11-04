import assert from 'node:assert';
import {describe, it} from 'node:test';
import {Arborist, generateFlatAST} from '../src/index.js';

describe('Arborist tests', () => {
	it('Verify node replacement works as expected', () => {
		const code = `console.log('Hello' + ' ' + 'there!');`;
		const expectedOutput = `console.log('General' + ' ' + 'Kenobi');`;
		const replacements = {
			'Hello': 'General',
			'there!': 'Kenobi',
		};
		const arborist = new Arborist(code);
		arborist.ast.filter(n => n.type === 'Literal' && replacements[n.value])
			.forEach(n => arborist.markNode(n, {
				type: 'Literal',
				value: replacements[n.value],
				raw: `'${replacements[n.value]}'`,
			}));
		const numberOfChangesMade = arborist.applyChanges();
		const result = arborist.script;

		assert.equal(result, expectedOutput, `Result does not match expected output.`);
		assert.equal(numberOfChangesMade, Object.keys(replacements).length, `The number of actual replacements does not match expectations.`);
	});
	it('Verify the root node replacement works as expected', () => {
		const code = `a;`;
		const expectedOutput = `b`;
		const arborist = new Arborist(code);
		arborist.markNode(arborist.ast[0], {
			type: 'Identifier',
			name: 'b',
		});
		arborist.applyChanges();
		const result = arborist.script;

		assert.equal(result, expectedOutput, `Result does not match expected output.`);
	});
	it('Verify only the root node is replaced', () => {
		const code = `a;b;`;
		const expectedOutput = `c`;
		const arborist = new Arborist(code);
		arborist.markNode(arborist.ast[4], {
			type: 'Identifier',
			name: 'v',
		});
		arborist.markNode(arborist.ast[0], {
			type: 'Identifier',
			name: 'c',
		});
		arborist.applyChanges();
		const result = arborist.script;

		assert.equal(result, expectedOutput, `Result does not match expected output.`);
	});
	it('Verify node deletion works as expected', () => {
		const code = `const a = ['There', 'can', 'be', 'only', 'one'];`;
		const expectedOutput = `const a = ['one'];`;
		const literalToSave = 'one';
		const arborist = new Arborist(code);
		arborist.ast.filter(n => n.type === 'Literal' && n.value !== literalToSave).forEach(n => arborist.markNode(n));
		const numberOfChangesMade = arborist.applyChanges();
		const expectedNumberOfChanges = 4;
		const result = arborist.script;

		assert.equal(result, expectedOutput, `Result does not match expected output.`);
		assert.equal(numberOfChangesMade, expectedNumberOfChanges, `The number of actual changes does not match expectations.`);
	});
	it('Verify the correct node is targeted for deletion', () => {
		const code = `var a = 1;`;
		const expectedResult = ``;
		const arborist = new Arborist(code);
		arborist.markNode(arborist.ast.find(n => n.type === 'VariableDeclarator'));
		arborist.applyChanges();
		assert.equal(arborist.script, expectedResult, 'An incorrect node was targeted for deletion.');
	});
	it('Verify a valid script can be used to initialize an arborist instance', () => {
		const code = `console.log('test');`;
		let error = '';
		let arborist;
		const expectedArraySize = generateFlatAST(code).length;
		try {
			arborist = new Arborist(code);
		} catch (e) {
			error = e.message;
		}
		assert.ok(arborist?.script, `Arborist failed to instantiate. ${error ? 'Error: ' + error : ''}`);
		assert.ok(!error, `Arborist instantiated with an error: ${error}`);
		assert.equal(arborist.script, code, `Arborist script did not match initialization argument.`);
		assert.equal(arborist.ast.length, expectedArraySize, `Arborist did not generate a flat AST array.`);
	});
	it('Verify a valid AST array can be used to initialize an arborist instance', () => {
		const code = `console.log('test');`;
		const ast = generateFlatAST(code);
		let error = '';
		let arborist;
		try {
			arborist = new Arborist(ast);
		} catch (e) {
			error = e.message;
		}
		assert.ok(arborist?.ast?.length, `Arborist failed to instantiate. ${error ? 'Error: ' + error : ''}`);
		assert.equal(error, '', `Arborist instantiated with an error: ${error}`);
		assert.deepEqual(arborist.ast, ast, `Arborist ast array did not match initialization argument.`);
	});
	it('Verify invalid changes are not applied', () => {
		const code = `console.log('test');`;
		const arborist = new Arborist(code);
		arborist.markNode(arborist.ast.find(n => n.type === 'Literal'), {type: 'EmptyStatement'});
		arborist.markNode(arborist.ast.find(n => n.name === 'log'), {type: 'EmptyStatement'});
		arborist.applyChanges();
		assert.equal(arborist.script, code, 'Invalid changes were applied.');
	});
	it(`Verify comments aren't duplicated when replacing the root node`, () => {
		const code = `//comment1\nconst a = 1, b = 2;`;
		const expected = `//comment1\nconst a = 1;\nconst b = 2;`;
		const arb = new Arborist(code);
		const decls = [];
		arb.ast.forEach(n => {
			if (n.type === 'VariableDeclarator') {
				decls.push({
					type: 'VariableDeclaration',
					kind: 'const',
					declarations: [n],
				});
			}
		});
		arb.markNode(arb.ast[0], {
			...arb.ast[0],
			body: decls,
		});
		arb.applyChanges();
		assert.equal(arb.script, expected);
	});
	it.skip(`FIX: Verify comments are kept when replacing a node`, () => {
		const code = `
// comment1
const a = 1;

// comment2
let b = 2;

// comment3
const c = 3;`;
		const expected = `// comment1\nvar a = 1;\n// comment2\nlet b = 2;\n// comment3\nvar c = 3;`;
		const arb = new Arborist(code);
		arb.ast.forEach(n => {
			if (n.type === 'VariableDeclaration'
					&& n.kind === 'const') {
				arb.markNode(n, {
					...n,
					kind: 'var',
				});
			}
		});
		arb.applyChanges();
		assert.equal(arb.script, expected);
	});
});