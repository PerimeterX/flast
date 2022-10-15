const assert = require('node:assert');
const {Arborist, generateFlatAST} = require(__dirname + '/../src/index');
module.exports = [
	{
		enabled: true,
		name: 'Node replacement',
		description: 'Verify node replacement works as expected.',
		run() {
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

			assert.equal(result, expectedOutput,
				`Result does not match expected output.`);
			assert.equal(numberOfChangesMade, Object.keys(replacements).length,
				`The number of actual replacements does not match expectations.`);
			return true;
		},
	},
	{
		enabled: true,
		name: 'Node deletion',
		description: 'Verify node deletion works as expected.',
		run() {
			const code = `const a = ['There', 'can', 'be', 'only', 'one'];`;
			const expectedOutput = `const a = ['one'];`;
			const literalToSave = 'one';
			const arborist = new Arborist(code);
			arborist.ast.filter(n => n.type === 'Literal' && n.value !== literalToSave).forEach(n => arborist.markNode(n));
			const numberOfChangesMade = arborist.applyChanges();
			const expectedNumberOfChanges = 4;
			const result = arborist.script;

			assert.equal(result, expectedOutput,
				`Result does not match expected output.`);
			assert.equal(numberOfChangesMade, expectedNumberOfChanges,
				`The number of actual changes does not match expectations.`);
		},
	},
	{
		enabled: true,
		name: 'Arborist accepts a valid script on instantiation',
		description: `Verify a valid script can be used to initialize an arborist instance.`,
		run() {
			const code = `console.log('test');`;
			let error = '';
			let arborist;
			const expectedArraySize = generateFlatAST(code).length;
			try {
				arborist = new Arborist(code);
			} catch (e) {
				error = e.message;
			}
			assert.ok(arborist?.script,
				`Arborist failed to instantiate. ${error ? 'Error: ' + error : ''}`);
			assert(!error,
				`Arborist instantiated with an error: ${error}`);
			assert.equal(arborist.script, code,
				`Arborist script did not match initialization argument.`);
			assert.equal(arborist.ast.length, expectedArraySize,
				`Arborist did not generate a flat AST array.`);
		},
	},
	{
		enabled: true,
		name: 'Arborist accepts a valid flat AST array on instantiation',
		description: `Verify a valid AST array can be used to initialize an arborist instance.`,
		run() {
			const code = `console.log('test');`;
			const ast = generateFlatAST(code);
			let error = '';
			let arborist;
			try {
				arborist = new Arborist(ast);
			} catch (e) {
				error = e.message;
			}
			assert.ok(arborist?.ast?.length,
				`Arborist failed to instantiate. ${error ? 'Error: ' + error : ''}`);
			assert.equal(error, '',
				`Arborist instantiated with an error: ${error}`);
			assert.deepEqual(arborist.ast, ast,
				`Arborist ast array did not match initialization argument.`);
		},
	},
];