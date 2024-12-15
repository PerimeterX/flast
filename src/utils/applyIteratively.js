import {Arborist} from '../arborist.js';
import {logger} from './logger.js';
import {createHash} from 'node:crypto';

const generateHash = str => createHash('sha256').update(str).digest('hex');


/**
 * Apply functions to modify the script repeatedly until they are no long effective or the max number of iterations is reached.
 * @param {string} script The target script to run the functions on.
 * @param {function[]} funcs
 * @param {number?} maxIterations (optional) Stop the loop after this many iterations at most.
 * @return {string} The possibly modified script.
 */
function applyIteratively(script, funcs, maxIterations = 500) {
	let scriptSnapshot = '';
	let currentIteration = 0;
	let changesCounter = 0;
	let iterationsCounter = 0;
	try {
		let scriptHash = generateHash(script);
		let arborist = new Arborist(script);
		while (arborist.ast?.length && scriptSnapshot !== script && currentIteration < maxIterations) {
			const iterationStartTime = Date.now();
			scriptSnapshot = script;

			// Mark the root node with the script hash to distinguish cache of different scripts.
			arborist.ast[0].scriptHash = scriptHash;
			for (let i = 0; i <  funcs.length; i++) {
				const func = funcs[i];
				const funcStartTime = Date.now();
				try {
					logger.debug(`\t[!] Running ${func.name}...`);
					arborist = func(arborist);
					if (!arborist.ast?.length) break;
					// If the hash doesn't exist it means the Arborist was replaced
					const numberOfNewChanges = arborist.getNumberOfChanges() + +!arborist.ast[0].scriptHash;
					if (numberOfNewChanges) {
						changesCounter += numberOfNewChanges;
						logger.log(`\t[+] ${func.name} applying ${numberOfNewChanges} new changes!`);
						arborist.applyChanges();
						script = arborist.script;
						scriptHash = generateHash(script);
						arborist.ast[0].scriptHash = scriptHash;
					}
				} catch (e) {
					logger.error(`[-] Error in ${func.name} (iteration #${iterationsCounter}): ${e}\n${e.stack}`);
				} finally {
					logger.debug(`\t\t[!] Running ${func.name} completed in ` +
              `${((Date.now() - funcStartTime) / 1000).toFixed(3)} seconds`);
				}
			}
			++currentIteration;
			++iterationsCounter;
			logger.log(`[+] ==> Iteartion #${iterationsCounter} completed in ${(Date.now() - iterationStartTime) / 1000} seconds` +
          ` with ${changesCounter ? changesCounter : 'no'} changes (${arborist.ast?.length || '???'} nodes)`);
			changesCounter =  0;
		}
		if (changesCounter) script = arborist.script;
	} catch (e) {
		logger.error(`[-] Error on iteration #${iterationsCounter}: ${e}\n${e.stack}`);
	}
	return script;
}

export {applyIteratively};