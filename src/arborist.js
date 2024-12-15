import {logger} from './utils/logger.js';
import {generateCode, generateFlatAST} from './flast.js';

const Arborist = class {
	/**
	 * @param {string|ASTNode[]} scriptOrFlatAstArr - the target script or a flat AST array
	 */
	constructor(scriptOrFlatAstArr) {
		this.script                = '';
		this.ast                   = [];
		this.markedForDeletion     = [];  // Array of node ids.
		this.appliedCounter        = 0;   // Track the number of times changes were applied.
		this.replacements          = [];
		this.logger = logger;
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
		const relevantTypes = ['ExpressionStatement', 'UnaryExpression', 'UpdateExpression'];
		const relevantClauses = ['consequent', 'alternate'];
		let currentNode = startNode;
		while (relevantTypes.includes(currentNode?.parentNode?.type) ||
			(currentNode.parentNode.type === 'VariableDeclaration' &&
				(currentNode.parentNode.declarations.length === 1 ||
					!currentNode.parentNode.declarations.some(d => d !== currentNode && !d.isMarked))
			)) currentNode = currentNode.parentNode;
		if (relevantClauses.includes(currentNode.parentKey)) currentNode.isEmpty = true;
		return currentNode;
	}

	/**
	 * @returns {number} The number of changes to be applied.
	 */
	getNumberOfChanges() {
		return this.replacements.length + this.markedForDeletion.length;
	}

	/**
	 * Replace the target node with another node or delete the target node completely, depending on whether a replacement
	 * node is provided.
	 * @param {ASTNode} targetNode The node to replace or remove.
	 * @param {object|ASTNode} replacementNode If exists, replace the target node with this node.
	 */
	markNode(targetNode, replacementNode) {
		if (!targetNode.isMarked) {
			if (replacementNode) {  // Mark for replacement
				this.replacements.push([targetNode, replacementNode]);
				targetNode.isMarked = true;
			} else {                // Mark for deletion
				targetNode = this._getCorrectTargetForDeletion(targetNode);
				if (targetNode.isEmpty) this.markNode(targetNode, {type: 'EmptyStatement'});
				else if (!targetNode.isMarked) {
					this.markedForDeletion.push(targetNode.nodeId);
					targetNode.isMarked = true;
				}
			}
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
			if (this.getNumberOfChanges() > 0) {
				let rootNode = this.ast[0];
				if (rootNode.isMarked) {
					const rootNodeReplacement = this.replacements.find(n => n[0].nodeId === 0);
					++changesCounter;
					this.logger.debug(`[+] Applying changes to the root node...`);
					const leadingComments =  rootNode.leadingComments || [];
					const trailingComments = rootNode.trailingComments || [];
					rootNode = rootNodeReplacement[1];
					if (leadingComments.length && rootNode.leadingComments !== leadingComments) rootNode.leadingComments = (rootNode.leadingComments || []).concat(leadingComments);
					if (trailingComments.length && rootNode.trailingComments !== trailingComments) rootNode.trailingComments = (rootNode.trailingComments || []).concat(trailingComments);
				} else {
					for (let i = 0; i < this.markedForDeletion.length; i++) {
						const targetNodeId = this.markedForDeletion[i];
						try {
							let targetNode = this.ast[targetNodeId];
							targetNode = targetNode.nodeId === targetNodeId ? targetNode : this.ast.find(n => n.nodeId === targetNodeId);
							if (targetNode) {
								const parent = targetNode.parentNode;
								if (parent[targetNode.parentKey] === targetNode) {
									delete parent[targetNode.parentKey];
									const comments = (targetNode.leadingComments || []).concat(targetNode.trailingComments || []);
									if (comments.length) parent.trailingComments = (parent.trailingComments || []).concat(comments);
									++changesCounter;
								} else if (Array.isArray(parent[targetNode.parentKey])) {
									const idx = parent[targetNode.parentKey].indexOf(targetNode);
									parent[targetNode.parentKey].splice(idx, 1);
									const comments = (targetNode.leadingComments || []).concat(targetNode.trailingComments || []);
									if (comments.length) {
										const targetParent = idx > 0 ? parent[targetNode.parentKey][idx - 1] : parent[targetNode.parentKey].length > 1 ? parent[targetNode.parentKey][idx + 1] : parent;
										targetParent.trailingComments = (targetParent.trailingComments || []).concat(comments);
									}
									++changesCounter;
								}
							}
						} catch (e) {
							this.logger.debug(`[-] Unable to delete node: ${e}`);
						}
					}
					for (let i = 0; i < this.replacements.length; i++) {
						const [targetNode, replacementNode] = this.replacements[i];
						try {
							if (targetNode) {
								const parent = targetNode.parentNode;
								if (parent[targetNode.parentKey] === targetNode) {
									parent[targetNode.parentKey] = replacementNode;
									const leadingComments =  targetNode.leadingComments || [];
									const trailingComments = targetNode.trailingComments || [];
									if (leadingComments.length) replacementNode.leadingComments = (replacementNode.leadingComments || []).concat(leadingComments);
									if (trailingComments.length) replacementNode.trailingComments = (replacementNode.trailingComments || []).concat(trailingComments);
									++changesCounter;
								} else if (Array.isArray(parent[targetNode.parentKey])) {
									const idx = parent[targetNode.parentKey].indexOf(targetNode);
									parent[targetNode.parentKey][idx] = replacementNode;
									const comments = (targetNode.leadingComments || []).concat(targetNode.trailingComments || []);
									if (idx > 0) {
										const commentsTarget = parent[targetNode.parentKey][idx - 1];
										commentsTarget.trailingComments = (commentsTarget.trailingComments || []).concat(comments);
									} else if (parent[targetNode.parentKey].length > 1) {
										const commentsTarget = parent[targetNode.parentKey][idx + 1];
										commentsTarget.leadingComments = (commentsTarget.leadingComments || []).concat(comments);
									} else parent.trailingComments = (parent.trailingComments || []).concat(comments);
									++changesCounter;
								}
							}
						} catch (e) {
							this.logger.debug(`[-] Unable to replace node: ${e}`);
						}
					}
				}
				if (changesCounter) {
					this.replacements.length = 0;
					this.markedForDeletion.length = 0;
					// If any of the changes made will break the script the next line will fail and the
					// script will remain the same. If it doesn't break, the changes are valid and the script can be marked as modified.
					const script = generateCode(rootNode);
					const ast = generateFlatAST(script);
					if (ast && ast.length) {
						this.ast = ast;
						this.script = script;
					}
					else {
						this.logger.log(`[-] Modified script is invalid. Reverting ${changesCounter} changes...`);
						changesCounter = 0;
					}
				}
			}
		} catch (e) {
			this.logger.log(`[-] Unable to apply changes to AST: ${e}`);
		}
		++this.appliedCounter;
		return changesCounter;
	}
};

export {
	Arborist,
};