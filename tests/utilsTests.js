const {utils} = require(__dirname + '/../src/index');
const assert = require('node:assert');
module.exports = [
	{
		enabled: true,
		name: 'treeModifier + applyIteratively',
		description: '',
		run() {
			const code = `console.log('Hello' + ' ' + 'there');`;
			const expectedOutput = `console.log('General' + ' ' + 'Kenobi');`;
			const expectedFuncName = 'StarWarsDialog';
			const replacements = {
				Hello: 'General',
				there: 'Kenobi',
			};
			let result = code;
			const f = n => n.type === 'Literal' && replacements[n.value];
			const m = (n, arb) => arb.markNode(n, {
				type: 'Literal',
				value: replacements[n.value],
			});
			const generatedFunc = utils.treeModifier(f, m, expectedFuncName);
			result = utils.applyIteratively(result, [generatedFunc]);

			assert.equal(result, expectedOutput,
				`Result does not match expected output.`);
			assert.equal(generatedFunc.name, expectedFuncName,
				`The name of the generated function does not match.`);
			return true;
		},
	},
];