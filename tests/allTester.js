const availableTests = {
	Arborist: __dirname + '/testArborist',
	Flast: __dirname + '/testFlast',
};
console.time('\nAll tests completed in');
for (const [testName, testFile] of Object.entries(availableTests)) {
	console.log(`\n----------> ${testName} <----------`);
	const t = require(testFile);
	const failures = [];
	console.time('tests in');
	for (const testName in t) {
		process.stdout.write(`Testing ${testName}...`.padEnd(40, '.'));
		try {
			t[testName]();
			console.log(' PASS');
		} catch (e) {
			console.log(` FAIL\n\t${e}`);
			failures.push(`${testName} test failure: ${e}`);
		}
	}
	process.stdout.write(`Completed ${Object.keys(t).length} `);
	console.timeEnd('tests in');

	if (failures.length) throw new Error(failures.join('\n'));
}
console.timeEnd('\nAll tests completed in');
