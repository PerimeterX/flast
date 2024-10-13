const logLevels = {
	DEBUG: 1,
	LOG: 2,
	ERROR: 3,
	NONE: 9e10,
};

/**
 * @param {number} logLevel
 * @returns {function(*): void|undefined}
 */
function createLoggerForLevel(logLevel) {
	if (!Object.values(logLevels).includes(logLevel)) throw new Error(`Unknown log level ${logLevel}.`);
	return msg => logLevel >= logger.currentLogLevel ? logger.logFunc(msg) : undefined;
}

const logger = {
	logLevels,
	logFunc: console.log,
	debug: createLoggerForLevel(logLevels.DEBUG),
	log: createLoggerForLevel(logLevels.LOG),
	error: createLoggerForLevel(logLevels.ERROR),
	currentLogLevel: logLevels.NONE,

	/**
  * Set the current log level
  * @param {number} newLogLevel
  */
	setLogLevel(newLogLevel) {
		if (!Object.values(this.logLevels).includes(newLogLevel)) throw new Error(`Unknown log level ${newLogLevel}.`);
		this.currentLogLevel = newLogLevel;
	},

	setLogLevelNone() {this.setLogLevel(this.logLevels.NONE);},
	setLogLevelDebug() {this.setLogLevel(this.logLevels.DEBUG);},
	setLogLevelLog() {this.setLogLevel(this.logLevels.LOG);},
	setLogLevelError() {this.setLogLevel(this.logLevels.ERROR);},

	setLogFunc(newLogfunc) {
		this.logFunc = newLogfunc;
	},
};

export {logger};