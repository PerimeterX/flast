import {logger} from './utils/logger.js';
import {generateCode, generateFlatAST} from './flast.js';

/**
 * Arborist allows marking nodes for deletion or replacement, and then applying all changes in a single pass.
 * Note: Marking a node with markNode() only sets a flag; the AST is not officially changed until applyChanges() is called.
 */
class Arborist {
	/**
	 * @param {string|ASTNode[]} scriptOrFlatAstArr - The target script or a flat AST array.
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
	 * Mark a node for replacement or deletion. This only sets a flag; the AST is not changed until applyChanges() is called.
	 * @param {ASTNode} targetNode The node to replace or remove.
	 * @param {object|ASTNode} [replacementNode] If exists, replace the target node with this node.
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
	 * Merge comments from a source node into a target node or array.
	 * @param {ASTNode|Object} target - The node or array element to receive comments.
	 * @param {ASTNode} source - The node whose comments should be merged.
	 * @param {'leadingComments'|'trailingComments'} which
	 */
	static mergeComments(target, source, which) {
		if (!source[which] || !source[which].length) return;
		if (!target[which]) {
			target[which] = [...source[which]];
		} else if (target[which] !== source[which]) {
			target[which] = target[which].concat(source[which]);
		}
	}

	/**
	 * Iterate over the complete AST and replace / remove marked nodes,
	 * then rebuild code and AST to validate changes.
	 *
	 * Note: If you delete a node that is the only child of its parent (e.g., the only statement in a block),
	 * you may leave the parent in an invalid or empty state. Consider cleaning up empty parents if needed.
	 *
	 * @return {number} The number of modifications made.
	 */
	applyChanges() {
		let changesCounter = 0;
		let rootNode = this.ast[0];
		try {
			if (this.getNumberOfChanges() > 0) {
				if (rootNode.isMarked) {
					const rootNodeReplacement = this.replacements.find(n => n[0].nodeId === 0);
					++changesCounter;
					this.logger.debug(`[+] Applying changes to the root node...`);
					const leadingComments = rootNode.leadingComments || [];
					const trailingComments = rootNode.trailingComments || [];
					rootNode = rootNodeReplacement[1];
					if (leadingComments.length && rootNode.leadingComments !== leadingComments)
						Arborist.mergeComments(rootNode, {leadingComments}, 'leadingComments');
					if (trailingComments.length && rootNode.trailingComments !== trailingComments)
						Arborist.mergeComments(rootNode, {trailingComments}, 'trailingComments');
				} else {
					for (const targetNodeId of this.markedForDeletion) {
						try {
							let targetNode = this.ast[targetNodeId];
							targetNode = targetNode.nodeId === targetNodeId ? targetNode : this.ast.find(n => n.nodeId === targetNodeId);
							if (targetNode) {
								const parent = targetNode.parentNode;
								if (parent[targetNode.parentKey] === targetNode) {
									delete parent[targetNode.parentKey];
									Arborist.mergeComments(parent, targetNode, 'trailingComments');
									++changesCounter;
								} else if (Array.isArray(parent[targetNode.parentKey])) {
									const idx = parent[targetNode.parentKey].indexOf(targetNode);
									if (idx !== -1) {
										parent[targetNode.parentKey].splice(idx, 1);
										const comments = (targetNode.leadingComments || []).concat(targetNode.trailingComments || []);
										let targetParent = null;
										if (parent[targetNode.parentKey].length > 0) {
											if (idx > 0) {
												targetParent = parent[targetNode.parentKey][idx - 1];
												Arborist.mergeComments(targetParent, {trailingComments: comments}, 'trailingComments');
											} else {
												targetParent = parent[targetNode.parentKey][0];
												Arborist.mergeComments(targetParent, {leadingComments: comments}, 'leadingComments');
											}
										} else {
											this.logger.debug(`[!] Deleted last element from array '${targetNode.parentKey}' in parent node type '${parent.type}'. Array is now empty.`);
											Arborist.mergeComments(parent, {trailingComments: comments}, 'trailingComments');
										}
										++changesCounter;
									}
								}
							}
						} catch (e) {
							this.logger.debug(`[-] Unable to delete node: ${e}`);
						}
					}
					for (const [targetNode, replacementNode] of this.replacements) {
						try {
							if (targetNode) {
								const parent = targetNode.parentNode;
								if (parent[targetNode.parentKey] === targetNode) {
									parent[targetNode.parentKey] = replacementNode;
									Arborist.mergeComments(replacementNode, targetNode, 'leadingComments');
									Arborist.mergeComments(replacementNode, targetNode, 'trailingComments');
									++changesCounter;
								} else if (Array.isArray(parent[targetNode.parentKey])) {
									const idx = parent[targetNode.parentKey].indexOf(targetNode);
									parent[targetNode.parentKey][idx] = replacementNode;
									const comments = (targetNode.leadingComments || []).concat(targetNode.trailingComments || []);
									if (idx > 0) {
										Arborist.mergeComments(parent[targetNode.parentKey][idx - 1], {trailingComments: comments}, 'trailingComments');
									} else if (parent[targetNode.parentKey].length > 1) {
										Arborist.mergeComments(parent[targetNode.parentKey][idx + 1], {leadingComments: comments}, 'leadingComments');
									} else {
										Arborist.mergeComments(parent, {trailingComments: comments}, 'trailingComments');
									}
									++changesCounter;
								}
							}
						} catch (e) {
							this.logger.debug(`[-] Unable to replace node: ${e}`);
						}
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
		} catch (e) {
			this.logger.log(`[-] Unable to apply changes to AST: ${e}`);
		}
		++this.appliedCounter;
		return changesCounter;
	}
}

export {
	Arborist,
};