import assert from 'node:assert';
import {describe, it} from 'node:test';
import {treeModifier, applyIteratively, logger} from '../src/index.js';

describe('Utils tests: treeModifier', () => {
	it(`Verify treeModifier sets a generic function name`, () => {
		const expectedFuncName = 'func';
		const generatedFunc = treeModifier(() => {}, () => {});
		assert.equal(generatedFunc.name, expectedFuncName, `The default name of the generated function does not match`);
	});
	it(`Verify treeModifier sets the function's name properly`, () => {
		const expectedFuncName = 'expectedFuncName';
		const generatedFunc = treeModifier(() => {}, () => {}, expectedFuncName);
		assert.equal(generatedFunc.name, expectedFuncName, `The name of the generated function does not match`);
	});
});
describe('Utils tests: applyIteratively', () => {
	it('Verify applyIteratively cannot remove the root node without replacing it', () => {
		const code = `a`;
		const expectedOutput = code;
		const f = n => n.type === 'Program';
		const m = (n, arb) => arb.markNode(n);
		const generatedFunc = treeModifier(f, m);
		const result = applyIteratively(code, [generatedFunc]);

		assert.equal(result, expectedOutput, `Result does not match expected output`);
	});
	it('Verify applyIteratively catches a critical exception', () => {
		const code = `a`;
		// noinspection JSCheckFunctionSignatures
		const result = applyIteratively(code, {length: 4});
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
		const generatedFunc = treeModifier(f, m);
		result = applyIteratively(result, [generatedFunc]);

		assert.equal(result, expectedOutput, `Result does not match expected output`);
	});
});
describe('Utils tests: logger', () => {
	it(`Verify logger sets the log level to DEBUG properly`, () => {
		const expectedLogLevel = logger.logLevels.DEBUG;
		logger.setLogLevelDebug();
		assert.equal(logger.currentLogLevel, expectedLogLevel, `The log level DEBUG was not set properly`);
	});
	it(`Verify logger sets the log level to NONE properly`, () => {
		const expectedLogLevel = logger.logLevels.NONE;
		logger.setLogLevelNone();
		assert.equal(logger.currentLogLevel, expectedLogLevel, `The log level NONE was not set properly`);
	});
	it(`Verify logger sets the log level to LOG properly`, () => {
		const expectedLogLevel = logger.logLevels.LOG;
		logger.setLogLevelLog();
		assert.equal(logger.currentLogLevel, expectedLogLevel, `The log level LOG was not set properly`);
	});
	it(`Verify logger sets the log level to ERROR properly`, () => {
		const expectedLogLevel = logger.logLevels.ERROR;
		logger.setLogLevelError();
		assert.equal(logger.currentLogLevel, expectedLogLevel, `The log level ERROR was not set properly`);
	});
	it(`Verify logger sets the log function properly`, () => {
		const expectedLogFunc = () => 'test';
		logger.setLogFunc(expectedLogFunc);
		assert.equal(logger.logFunc, expectedLogFunc, `The log function was not set properly`);
	});
	it(`Verify logger throws an error when setting an unknown log level`, () => {
		assert.throws(() => logger.setLogLevel(0), Error, `An error was not thrown when setting an unknown log level`);
	});
});