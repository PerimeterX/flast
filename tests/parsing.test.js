import assert from 'node:assert';
import {describe, it} from 'node:test';
import {generateFlatAST} from '../src/index.js';

describe('Parsing tests', () => {
	it('Verify the function-expression-name scope is always replaced with its child scope', () => {
		const code = `
(function test(p) {
  let i = 1;
  i;
})();`;
		const ast = generateFlatAST(code);
		const testedScope = ast[0].allScopes[Object.keys(ast[0].allScopes).slice(-1)[0]];
		const expectedParentScopeType = 'function-expression-name';
		const expectedScopeType = 'function';
		// ast.slice(-1)[0].type is the last identifier in the code and should have the expected scope type
		assert.equal(ast.slice(-1)[0].scope.type, expectedScopeType, `Unexpected scope`);
		assert.equal(testedScope.type, expectedParentScopeType, `Tested scope is not the child of the correct scope`);
	});
	it('Verify declNode references the local declaration correctly', () => {
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
		assert.equal(innerValResult, innerScopeVal, `Declaration node (inner scope) is incorrectly referenced.`);
		assert.equal(outerValResult, outerScopeVal, `Declaration node (outer scope) is incorrectly referenced.`);
	});
	it(`Verify a function's identifier isn't treated as a reference`, () => {
		const code = `function a() {
			var a;
			}`;
		const ast = generateFlatAST(code);
		const funcId = ast.find(n => n.name ==='a' && n.parentNode.type === 'FunctionDeclaration');
		const varId = ast.find(n =>n.name ==='a' && n.parentNode.type === 'VariableDeclarator');
		const functionReferencesFound = !!funcId.references?.length;
		const variableReferencesFound = !!varId.references?.length;
		assert.ok(!functionReferencesFound, `References to a function were incorrectly found`);
		assert.ok(!variableReferencesFound, `References to a variable were incorrectly found`);
	});
});