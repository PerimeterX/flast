const tests = {
	Parsing: __dirname + '/parsingTests',
	Functionality: __dirname + '/functionalityTests',
	Arborist: __dirname + '/aboristTests',
};

let allTests = 0;
let skippedTests = 0;
console.time('tests in');
for (const [moduleName, moduleTests] of Object.entries(tests)) {
	const loadedTests = require(moduleTests);
	for (const test of loadedTests) {
		allTests++;
		if (test.enabled) {
			process.stdout.write(`[${moduleName}] ${test.name}`.padEnd(90, '.'));
			console.time('PASS');
			test.run();
			console.timeEnd('PASS');
		} else {
			skippedTests++;
			console.log(`Testing [${moduleName}] ${test.name}...`.padEnd(101, '.') + ` SKIPPED: ${test.reason}`);
		}
	}
}
if (skippedTests > 0) {
	process.stdout.write(`Completed ${allTests - skippedTests}/${allTests} (${skippedTests} skipped) `);
} else process.stdout.write(`Completed ${allTests} `);
console.timeEnd('tests in');

module.exports = tests;