import {Scope} from 'eslint-scope';

/**
 * @typedef ASTNode
 * @property {string} type
 * @property {object} [allScopes]
 * @property {ASTNode} [alternate]
 * @property {ASTNode} [argument]
 * @property {ASTNode[]} [arguments]
 * @property {boolean} [async]
 * @property {ASTNode|ASTNode[]} [body]
 * @property {ASTNode} [callee]
 * @property {ASTNode[]} [cases]
 * @property {ASTNode[]} [childNodes]
 * @property {Object[]} [comments]
 * @property {boolean} [computed]
 * @property {ASTNode} [consequent]
 * @property {string} [cooked]
 * @property {ASTNode} [declaration]
 * @property {ASTNode[]} [declarations]
 * @property {ASTNode} [declNode]
 * @property {boolean} [delegate]
 * @property {ASTNode} [discriminant]
 * @property {ASTNode[]} [elements]
 * @property {number} [end]
 * @property {ASTNode} [exported]
 * @property {ASTNode|boolean} [expression]
 * @property {ASTNode[]} [expressions]
 * @property {string} [flags]
 * @property {boolean} [generator]
 * @property {ASTNode} [id]
 * @property {ASTNode} [imported]
 * @property {ASTNode} [init]
 * @property {boolean} [isEmpty] True when the node is set for deletion but should be replced with an Empty Statement instead
 * @property {boolean} [isMarked] True when the node has already been marked for replacement or deletion
 * @property {ASTNode} [key]
 * @property {string} [kind]
 * @property {ASTNode} [label]
 * @property {Object[]} [leadingComments]
 * @property {ASTNode} [left]
 * @property {number[]} [lineage] The nodeIds of all parent nodes
 * @property {ASTNode} [local]
 * @property {boolean} [method]
 * @property {string} [name]
 * @property {number} [nodeId] A unique id in the AST
 * @property {string} [operator]
 * @property {ASTNode} [object]
 * @property {string} [pattern]
 * @property {ASTNode[]} [params]
 * @property {string} [parentKey] The designation the node has within the parent node
 * @property {ASTNode} [parentNode]
 * @property {boolean} [prefix]
 * @property {ASTNode} [property]
 * @property {ASTNode[]} [properties]
 * @property {ASTNode[]} [quasis]
 * @property {number[]} [range]
 * @property {string} [raw]
 * @property {ASTNode[]} [references]
 * @property {ASTNode} [regex]
 * @property {ASTNode} [right]
 * @property {ASTScope} [scope]
 * @property {number} [scopeId] For nodes which are also a scope's block
 * @property {string} [scriptHash]
 * @property {boolean} [shorthand]
 * @property {ASTNode} [source]
 * @property {string} [sourceType]
 * @property {ASTNode[]} [specifiers]
 * @property {boolean} [static]
 * @property {number} [start]
 * @property {string|function} [src] The source code for the node
 * @property {ASTNode} [superClass]
 * @property {boolean} [tail]
 * @property {ASTNode} [test]
 * @property {ASTNode} [tokens]
 * @property {Object[]} [trailingComments]
 * @property {Object} [typeMap]
 * @property {ASTNode} [update]
 * @property {ASTNode|string|number|boolean} [value]
 */
class ASTNode {}

/**
 * @typedef ASTScope
 * @extends Scope
 * @property {ASTNode} block
 * @property {ASTScope[]} childScopes
 * @property {number} scopeId
 * @property {string} type
 */
class ASTScope extends Scope {}

export {
	ASTNode,
	ASTScope,
};