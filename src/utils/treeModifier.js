/**
 * Boilerplate for filter functions that identify the desired structure and a modifier function that modifies the tree.
 * An optional name for the function can be provided for better logging.
 * @param {Function} filterFunc
 * @param {Function} modFunc
 * @param {string} [funcName]
 * @returns {function(Arborist): Arborist}
 */
function treeModifier(filterFunc, modFunc, funcName) {
	const func = function(arb) {
		for (let i = 0; i < arb.ast.length; i++) {
			const n = arb.ast[i];
			if (filterFunc(n, arb)) {
				modFunc(n, arb);
			}
		}
		return arb;
	};
	if (funcName) Object.defineProperty(func, 'name', {value: funcName});
	return func;
}

export {treeModifier};