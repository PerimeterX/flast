const {Scope} = require('eslint-scope');

/**
 * @typedef ASTNode
 * @property {string} type
 * @property {ASTNode} [alternate]
 * @property {ASTNode} [argument]
 * @property {ASTNode[]} [arguments]
 * @property {boolean} [async]
 * @property {ASTNode|ASTNode[]} [body]
 * @property {ASTNode} [callee]
 * @property {ASTNode[]} [childNodes]
 * @property {boolean} [computed]
 * @property {ASTNode} [consequent]
 * @property {string} [cooked]
 * @property {ASTNode} [declaration]
 * @property {ASTNode[]} [declarations]
 * @property {ASTNode} [declNode]
 * @property {boolean} [delegate]
 * @property {ASTNode[]} [elements]
 * @property {number} [end]
 * @property {ASTNode|boolean} [expression]
 * @property {ASTNode[]} [expressions]
 * @property {string} [flags]
 * @property {boolean} [generator]
 * @property {ASTNode} [id]
 * @property {ASTNode} [init]
 * @property {boolean} [isMarked]
 * @property {ASTNode} [key]
 * @property {string} [kind]
 * @property {ASTNode} [label]
 * @property {ASTNode} [left]
 * @property {number[]} [lineage]
 * @property {boolean} [method]
 * @property {string} [name]
 * @property {number} [nodeId]
 * @property {string} [operator]
 * @property {ASTNode} [object]
 * @property {string} [pattern]
 * @property {ASTNode[]} [params]
 * @property {string} [parentKey]
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
 * @property {string} [scriptHash]
 * @property {boolean} [shorthand]
 * @property {string} [sourceType]
 * @property {boolean} [static]
 * @property {number} [start]
 * @property {string|function} [src]
 * @property {ASTNode} [superClass]
 * @property {boolean} [tail]
 * @property {ASTNode} [test]
 * @property {ASTNode} [update]
 * @property {ASTNode|string|number|boolean} [value]
 */
class ASTNode {}

/**
 * @typedef ASTScope
 * @extends Scope
 * @property {number} scopeId
 * @property {ASTScope[]} childScopes
 */
class ASTScope extends Scope {}

module.exports = {
	ASTNode,
	ASTScope,
};