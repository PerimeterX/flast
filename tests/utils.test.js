import assert from 'node:assert';
import {utils} from '../src/index.js';
import {describe, it} from 'node:test';

describe('Utils tests: treeModifier', () => {
	it(`Verify treeModifier sets a generic function name`, () => {
		const expectedFuncName = 'func';
		const generatedFunc = utils.treeModifier(() => {}, () => {});
		assert.equal(generatedFunc.name, expectedFuncName, `The default name of the generated function does not match`);
	});
	it(`Verify treeModifier sets the function's name properly`, () => {
		const expectedFuncName = 'expectedFuncName';
		const generatedFunc = utils.treeModifier(() => {}, () => {}, expectedFuncName);
		assert.equal(generatedFunc.name, expectedFuncName, `The name of the generated function does not match`);
	});
});
describe('Utils tests: applyIteratively', () => {
	it('Verify applyIteratively cannot remove the root node without replacing it', () => {
		const code = `a`;
		const expectedOutput = code;
		const f = n => n.type === 'Program';
		const m = (n, arb) => arb.markNode(n);
		const generatedFunc = utils.treeModifier(f, m);
		const result = utils.applyIteratively(code, [generatedFunc]);

		assert.equal(result, expectedOutput, `Result does not match expected output`);
	});
	it('Verify applyIteratively catches a critical exception', () => {
		const code = `a`;
		// noinspection JSCheckFunctionSignatures
		const result = utils.applyIteratively(code, {length: 4});
		assert.equal(result, code, `Result does not match expected output`);
	});
	it('Verify applyIteratively works as expected', () => {
		const code = `console.log('Hello' + ' ' + 'there');`;
		const expectedOutput = `console.log('General' + ' ' + 'Kenobi');`;
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
		const generatedFunc = utils.treeModifier(f, m);
		result = utils.applyIteratively(result, [generatedFunc]);

		assert.equal(result, expectedOutput, `Result does not match expected output`);
	});
});
describe('Utils tests: logger', () => {
	it(`Verify logger sets the log level to DEBUG properly`, () => {
		const expectedLogLevel = utils.logger.logLevels.DEBUG;
		utils.logger.setLogLevelDebug();
		assert.equal(utils.logger.currentLogLevel, expectedLogLevel, `The log level DEBUG was not set properly`);
	});
	it(`Verify logger sets the log level to NONE properly`, () => {
		const expectedLogLevel = utils.logger.logLevels.NONE;
		utils.logger.setLogLevelNone();
		assert.equal(utils.logger.currentLogLevel, expectedLogLevel, `The log level NONE was not set properly`);
	});
	it(`Verify logger sets the log level to LOG properly`, () => {
		const expectedLogLevel = utils.logger.logLevels.LOG;
		utils.logger.setLogLevelLog();
		assert.equal(utils.logger.currentLogLevel, expectedLogLevel, `The log level LOG was not set properly`);
	});
	it(`Verify logger sets the log level to ERROR properly`, () => {
		const expectedLogLevel = utils.logger.logLevels.ERROR;
		utils.logger.setLogLevelError();
		assert.equal(utils.logger.currentLogLevel, expectedLogLevel, `The log level ERROR was not set properly`);
	});
	it(`Verify logger sets the log function properly`, () => {
		const expectedLogFunc = () => 'test';
		utils.logger.setLogFunc(expectedLogFunc);
		assert.equal(utils.logger.logFunc, expectedLogFunc, `The log function was not set properly`);
	});
	it(`Verify logger throws an error when setting an unknown log level`, () => {
		assert.throws(() => utils.logger.setLogLevel(0), Error, `An error was not thrown when setting an unknown log level`);
	});
});