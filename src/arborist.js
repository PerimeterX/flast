// eslint-disable-next-line no-unused-vars
const estraverse = require('estraverse');
const {generateCode, generateFlatAST,} = require(__dirname + '/flast');

const Arborist = class {
	/**
	 * @param {string|ASTNode[]} scriptOrFlatAstArr - the target script or a flat AST array
	 * @param {Function} logFunc - (optional) Logging function
	 */
	constructor(scriptOrFlatAstArr, logFunc = null) {
		this.script                = '';
		this.ast                   = [];
		this.log                   = logFunc || (() => true);
		this.maxLogLength          = 60;  // Max length of logged strings.
		this.markedForDeletion     = [];  // Array of node ids.
		this.markedForReplacement  = {};  // nodeId: replacementNode pairs.
		this.appliedCounter        = 0;   // Track the number of times changes were applied.
		if (typeof scriptOrFlatAstArr === 'string') {
			this.script = scriptOrFlatAstArr;
			this.ast = generateFlatAST(scriptOrFlatAstArr);
		} else if (Array.isArray(scriptOrFlatAstArr)) {
			this.ast = scriptOrFlatAstArr;
		} else throw Error(`Undetermined argument`);
	}

	/**
	 * When applicable, replace the provided node with its nearest parent node that can be removed without breaking the code.
	 * @param {ASTNode} startNode
	 * @return {ASTNode}
	 */
	_getCorrectTargetForDeletion(startNode) {
		let currentNode = startNode;
		while (
			['ExpressionStatement', 'UnaryExpression', 'UpdateExpression'].includes(currentNode?.parentNode?.type) ||
			(currentNode.parentNode.type === 'VariableDeclaration' &&
				(currentNode.parentNode.declarations.length === 1 ||
					!currentNode.parentNode.declarations.filter(d => d.nodeId !== currentNode.nodeId && !d.isMarked).length)
			)) currentNode = currentNode.parentNode;
		return currentNode;
	}

	/**
	 * @param {string} src
	 * @param {boolean} padEnd Pad end with spaces to the maxLogLength if true.
	 * @returns {string} A parsed string fit for a log.
	 * @private
	 */
	_parseSrcForLog(src, padEnd = false) {
		const output = src
			.replace(/\n/g, ' ')
			.substring(0, this.maxLogLength)
			.replace(/([\n\r])/g, ' ')
			.replace(/\s{2,}/g, ' ');
		return padEnd ? output.padEnd(this.maxLogLength, ' ') : output;
	}

	/**
	 *
	 * @returns {number} The number of changes to be applied.
	 */
	getNumberOfChanges() {
		return Object.keys(this.markedForReplacement).length + this.markedForDeletion.length;
	}

	/**
	 * Replace the target node with another node or delete the target node completely, depending on whether a replacement
	 * node is provided.
	 * @param targetNode The node to replace or remove.
	 * @param replacementNode If exists, replace the target node with this node.
	 */
	markNode(targetNode, replacementNode) {
		if (!targetNode.isMarked) {
			if (replacementNode) {  // Mark for replacement
				this.markedForReplacement[targetNode.nodeId] = replacementNode;
				targetNode.isMarked = true;
			} else {                // Mark for deletion
				targetNode = this._getCorrectTargetForDeletion(targetNode);
				if (!targetNode.isMarked) {
					this.markedForDeletion.push(targetNode.nodeId);
					targetNode.isMarked = true;
				}
			}
			this.ast = this.ast.filter(n => n.nodeId !== targetNode.nodeId);
		}
	}

	/**
	 * Iterate over the complete AST and replace / remove marked nodes,
	 * then rebuild code and AST to validate changes.
	 * @return {number} The number of modifications made.
	 */
	applyChanges() {
		let changesCounter = 0;
		try {
			const that = this;
			const replacementNodeIds = Object.keys(this.markedForReplacement).map(nid => parseInt(nid));
			if (this.getNumberOfChanges() > 0) {
				const removalLogCache = [];     // Prevents multiple printing of similar changes to the log
				const replacementLogCache = [];
				const badReplacements = [];
				const rootNode = this.ast[0];
				estraverse.replace(rootNode, {
					enter(node) {
						try {
							if (replacementNodeIds.includes(node.nodeId)) {
								if (badReplacements.includes(node.src)) return;
								const nsrc = that._parseSrcForLog(node.src, true);
								if (!replacementLogCache.includes(nsrc)) {
									const tsrc = that._parseSrcForLog(generateCode(that.markedForReplacement[node.nodeId]));
									that.log(`\t\t[+] Replacing\t${nsrc}\t--with--\t${tsrc}`, 2);
									replacementLogCache.push(nsrc);
								}
								++changesCounter;
								return that.markedForReplacement[node.nodeId];
							} else if (that.markedForDeletion.includes(node.nodeId)) {
								const ns = that._parseSrcForLog(node.src);
								if (!removalLogCache.includes(ns)) {
									that.log(`\t\t[+] Removing\t${ns}`, 2);
									removalLogCache.push(ns);
								}
								this.remove();
								++changesCounter;
								return null;
							}
						} catch (e) {
							that.log(`[-] Unable to replace/delete node: ${e}`);
							badReplacements.push(node.src);
						}
					},
				});
				if (changesCounter) {
					this.markedForReplacement = {};
					this.markedForDeletion.length = 0;
					// If any of the changes made will break the script the next line will fail and the
					// script will remain the same. If it doesn't break, the changes are valid and the script can be marked as modified.
					this.script = generateCode(rootNode);
					const ast = generateFlatAST(this.script);
					if (ast && ast.length) this.ast = ast;
					else throw Error('Script is broken.');
				}
			}
		} catch (e) {
			this.log(`[-] Unable to apply changes to AST: ${e}`);
		}
		++this.appliedCounter;
		return changesCounter;
	}
};

module.exports = {
	Arborist,
};