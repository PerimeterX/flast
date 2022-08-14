const assert = require('node:assert');
const {generateFlatAST} = require(__dirname + '/../src/index');
module.exports = [
	{
		enabled: true,
		name: 'Local variable declaration supercedes outer scope declaration',
		description: 'Verify declNode references the local declaration correctly.',
		run() {
			const innerScopeVal = 'inner';
			const outerScopeVal = 'outer';
			const code = `var a = '${outerScopeVal}';
			if (true) {
				let a = '${innerScopeVal}';
				console.log(a);
			}
			console.log(a);`;
			const ast = generateFlatAST(code);
			const [innerIdentifier, outerIdentifier] = ast.filter(n => n.type === 'Identifier' && n.parentNode.type === 'CallExpression');
			const innerValResult = innerIdentifier.declNode.parentNode.init.value;
			const outerValResult = outerIdentifier.declNode.parentNode.init.value;
			assert(innerValResult === innerScopeVal,
				`Decleration node (inner scope) is incorrectly referenced. Got "${innerValResult}" instead of "${innerScopeVal}"`);
			assert(outerValResult === outerScopeVal,
				`Decleration node (outer scope) is incorrectly referenced. Got "${outerValResult}" instead of "${innerScopeVal}"`);
		},
	},
];