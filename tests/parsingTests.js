const assert = require('node:assert');
const {generateFlatAST} = require(__dirname + '/../src/index');
module.exports = [
	{
		enabled: true,
		name: 'Function expression namespace scope is exchanged for child scope.',
		description: 'Verify the function-expression-name scope is always replaced with its child scope.',
		run() {
			const code = `
(function test(p) {
  let i = 1;
  i;
})();`;
			const ast = generateFlatAST(code);
			const testedScope = [...new Set(ast.map(n => n.scope))][1];
			const expectedParentScopeType = 'function-expression-name';
			const expectedScopeType = 'function';
			assert(testedScope.type === expectedScopeType,
				`Unexpected scope. Got "${testedScope.type}" instead of "${expectedScopeType}"`);
			assert(testedScope.upper.type === expectedParentScopeType,
				`Tested scope is not the child of the correct scope. Got "${testedScope.upper.type}" instead of "${expectedParentScopeType}"`);
		},
	},
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