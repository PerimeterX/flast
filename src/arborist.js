// eslint-disable-next-line no-unused-vars
const estraverse = require('estraverse');
const {generateCode, generateFlatAST} = require(__dirname + '/flast');
const Arborist = class {
	/**
	 *
	 * @param {ASTNode[]} ast - A flattened AST structure where the first item is the root object.
	 * @param {Function} logFunc - (optional) Logging function
	 */
	constructor(ast, logFunc = null) {
		this.ast                   = ast;
		this.log                   = logFunc || (() => {});
		this.maxLogLength          = 60;  // Max length of logged strings.
		this.markedForDeletion     = [];  // Array of node ids.
		this.markedForReplacement  = {};  // nodeId: replacementNode pairs.
		this._badReplacements      = {};  // Replacements which broke the code and should not be attempted again.
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
			if (!replacementNodeIds.length && !this.markedForDeletion.length) return changesCounter;
			const replacementLogCache = [];
			const badReplacements = Object.keys(this._badReplacements);
			estraverse.replace(this.ast[0], {
				enter(node) {
					try {
						if (replacementNodeIds.includes(node.nodeId)) {
							if (badReplacements.includes(node.src) && that._badReplacements[node.src] === that.markedForReplacement[node.nodeId]) return;
							changesCounter++;
							const nsrc = node.src.replace(/\n/g, ' ')
								.substring(0, that.maxLogLength)
								.replace(/([\n\r])/g, ' ')
								.replace(/\s{2,}/g, ' ')
								.padEnd(that.maxLogLength, ' ');
							if (!replacementLogCache.includes(nsrc)) {
								const tsrc = generateCode(that.markedForReplacement[node.nodeId])
									.replace(/\n/g, ' ')
									.substring(0, that.maxLogLength)
									.replace(/([\n\r])/g, ' ')
									.replace(/\s{2,}/g, ' ');
								that.log(`\t\t[+] Replacing\t${nsrc}\t--with--\t${tsrc}`, 2);
								replacementLogCache.push(nsrc);
							}
							return that.markedForReplacement[node.nodeId];
						} else if (that.markedForDeletion.includes(node.nodeId)) {
							that.log(`\t\t[+] Removing\t${node.src.substring(0, that.maxLogLength).replace(/([\n\r])/g, ' ').replace(/\s{2,}/g, ' ').padEnd(that.maxLogLength, ' ')}`, 2);
							this.remove();
							changesCounter++;
							return null;
						}
					} catch (e) {
						that.log(`[-] Unable to replace/delete node: ${e}`);
						that._badReplacements[node.src] = that.markedForReplacement[node.nodeId].src;
					}
				},
			});
			if (changesCounter) {
				this.markedForReplacement = {};
				this.markedForDeletion = [];
				// If any of the changes made will break the script the next line will fail and the
				// script will remain the same. If it doesn't break, the changes are valid and the script can be marked as modified.
				this.ast = generateFlatAST(generateCode(this.ast[0]));
			}
		} catch (e) {
			this.log(`[-] Unable to apply changes to AST: ${e}`);
		}
		return changesCounter;
	}
};

module.exports = {
	Arborist,
};