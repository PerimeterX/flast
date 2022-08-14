const assert = require('node:assert');
const {generateFlatAST, generateCode, Arborist} = require(__dirname + '/../src/index');
module.exports = [
	{
		enabled: true,
		name: 'Node replacement',
		description: 'Verify node replacement works as expected.',
		run() {
			const code = `console.log('Hello' + ' ' + 'there!');`;
			const ast = generateFlatAST(code);
			const expectedOutput = `console.log('General' + ' ' + 'Kenobi');`;
			const replacements = {
				'Hello': 'General',
				'there!': 'Kenobi',
			};
			const arborist = new Arborist(ast);
			ast.filter(n => n.type === 'Literal' && replacements[n.value])
				.forEach(n => arborist.markNode(n, {
					type: 'Literal',
					value: replacements[n.value],
					raw: `'${replacements[n.value]}'`,
				}));
			const numberOfChangesMade = arborist.applyChanges();
			const result = generateCode(arborist.ast[0]);

			assert(result === expectedOutput,
				`Result does not match expected output: Expected\n\t${expectedOutput}\nbut got\n\t${result}`);
			assert(numberOfChangesMade === Object.keys(replacements).length,
				`The number of actual replacements does not match expectations: Expected ${Object.keys(replacements).length} but got ${numberOfChangesMade}`);
			return true;
		},
	},
	{
		enabled: true,
		name: 'Node deletion',
		description: 'Verify node deletion works as expected.',
		run() {
			const code = `const a = ['There', 'can', 'be', 'only', 'one'];`;
			const ast = generateFlatAST(code);
			const expectedOutput = `const a = ['one'];`;
			const literalToSave = 'one';
			const arborist = new Arborist(ast);
			ast.filter(n => n.type === 'Literal' && n.value !== literalToSave).forEach(n => arborist.markNode(n));
			const numberOfChangesMade = arborist.applyChanges();
			const expectedNumberOfChanges = 4;
			const result = generateCode(arborist.ast[0]);

			assert(result === expectedOutput,
				`Result does not match expected output: Expected\n\t${expectedOutput}\nbut got\n\t${result}`);
			assert(numberOfChangesMade === expectedNumberOfChanges,
				`The number of actual changes does not match expectations: Expected ${expectedNumberOfChanges} but got ${numberOfChangesMade}`);
		},
	},
];