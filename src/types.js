/**
 * @typedef ASTNode
 * @property {string} type
 * @property {ASTNode|null} [alternate]
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
 * @property {ASTNode[]} [elements]
 * @property {number} [end]
 * @property {ASTNode|boolean} [expression]
 * @property {ASTNode[]} [expressions]
 * @property {string} [flags]
 * @property {boolean} [generator]
 * @property {ASTNode|null} [id]
 * @property {ASTNode|null} [init]
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
 * @property {ASTNode|null} [parentNode]
 * @property {boolean} [prefix]
 * @property {ASTNode} [property]
 * @property {ASTNode[]} [properties]
 * @property {ASTNode[]} [quasis]
 * @property {number[]} [range]
 * @property {string} [raw]
 * @property {ASTNode[]} [references]
 * @property {ASTNode} [regex]
 * @property {ASTNode} [right]
 * @property {ScopeManager} [scope]
 * @property {string} [scriptHash]
 * @property {boolean} [shorthand]
 * @property {boolean} [static]
 * @property {number} [start]
 * @property {string} [src]
 * @property {ASTNode|null} [superClass]
 * @property {boolean} [tail]
 * @property {ASTNode|null} [test]
 * @property {ASTNode|null} [update]
 * @property {ASTNode|string|number|boolean|null} [value]
 */
class ASTNode {}
module.exports = {
	ASTNode,
};