import assert from 'node:assert';
import {describe, it} from 'node:test';
import {generateFlatAST, generateCode} from '../src/index.js';

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
		assert.equal(testedScope.upper.type, expectedParentScopeType, `Tested scope is not the child of the correct scope`);
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
	it(`Verify proper handling of class properties`, () => {
		const code = `class a {
  static b = 1;
  #c = 2;
}`;
		const expected = code;
		const ast = generateFlatAST(code);
		const result = generateCode(ast[0]);
		assert.strictEqual(result, expected);
	});
	it(`Verify the type map is generated accurately`, () => {
		const code = `class a {
  static b = 1;
  #c = 2;
}`;
		const ast = generateFlatAST(code);
		const expected = {
			Program: [ast[0]],
			ClassDeclaration: [ast[1]],
			Identifier: [ast[2], ast[5]],
			ClassBody: [ast[3]],
			PropertyDefinition: [ast[4], ast[7]],
			Literal: [ast[6], ast[9]],
			PrivateIdentifier: [ast[8]],
		};
		const result = ast[0].typeMap;
		assert.deepEqual(result, expected);
	});
	it(`Verify node relations are parsed correctly`, () => {
		const code = `for (var i = 0; i < 10; i++);\nfor (var i = 0; i < 10; i++);`;
		try {
			generateFlatAST(code);
		} catch (e) {
			assert.fail(`Parsing failed: ${e.message}`);
		}
	});
	it(`Verify the module scope is ignored`, () => {
		const code = `function a() {return [1];}\nconst b = a();`;
		const ast = generateFlatAST(code);
		ast.forEach(n => assert.ok(n.scope.type !== 'module', `Module scope was not ignored`));
	});
	it(`Verify the lineage is correct`, () => {
		const code = `(function() {var a; function b() {var c;}})();`;
		const ast = generateFlatAST(code);
		function extractLineage(node) {
			const lineage = [];
			let currentNode = node;
			while (currentNode) {
				lineage.push(currentNode.scope.scopeId);
				if (!currentNode.scope.scopeId) break;
				currentNode = currentNode.parentNode;
			}
			return [...new Set(lineage)].reverse();
		}
		ast[0].typeMap.Identifier.forEach(n => {
			const extractedLineage = extractLineage(n);
			assert.deepEqual(n.lineage, extractedLineage);
		});
	});
	it(`Verify null childNodes are correctly parsed`, () => {
		const code = `[,,,].join('-');`;
		const ast = generateFlatAST(code);
		assert.notEqual(ast, [1]);
	});
});