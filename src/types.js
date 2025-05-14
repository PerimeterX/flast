import {Scope} from 'eslint-scope';

/**
 * @typedef {Object.<string, ASTNode[]>} ASTTypeMap - Map of node type to array of nodes.
 */

/**
 * @typedef {Object.<number, ASTScope>} ASTAllScopes - Map of scopeId to ASTScope.
 */

/**
 * @typedef ASTNode
 * @property {ASTNode[]} childNodes - Array of child nodes.
 * @property {number} nodeId - Unique id in the AST.
 * @property {string} parentKey - The property name this node occupies in its parent.
 * @property {ASTNode|null} parentNode - Parent node, or null for the root.
 * @property {ASTTypeMap} typeMap - Only present on the root node. Map of node type to array of nodes.
 * @property {string} type - Node type.
 *
 * @property {ASTAllScopes} [allScopes] - Only present on the root node. Map of scopeId to ASTScope.
 * @property {ASTNode} [alternate] - Alternate branch (e.g., in IfStatement).
 * @property {ASTNode} [argument] - Argument node.
 * @property {ASTNode[]} [arguments] - Array of argument nodes.
 * @property {boolean} [async] - True if the function is async.
 * @property {ASTNode|ASTNode[]} [body] - Function or block body.
 * @property {ASTNode} [callee] - Callee node in a CallExpression.
 * @property {ASTNode[]} [cases] - Switch cases.
 * @property {Object[]} [comments] - Comments attached to the node.
 * @property {boolean} [computed] - True if property is computed.
 * @property {ASTNode} [consequent] - Consequent branch (e.g., in IfStatement).
 * @property {string} [cooked] - Cooked value for template literals.
 * @property {ASTNode} [declaration] - Declaration node.
 * @property {ASTNode[]} [declarations] - Array of declaration nodes.
 * @property {ASTNode} [declNode] - Only present on identifier nodes that are references (detailed: true).
 * @property {boolean} [delegate] - True if yield*.
 * @property {ASTNode} [discriminant] - Switch discriminant.
 * @property {ASTNode[]} [elements] - Array elements.
 * @property {number} [end] - End position in source.
 * @property {ASTNode} [exported] - Exported node.
 * @property {ASTNode|boolean} [expression] - Expression node or boolean.
 * @property {ASTNode[]} [expressions] - Array of expressions.
 * @property {string} [flags] - Regex flags.
 * @property {boolean} [generator] - True if function is a generator.
 * @property {ASTNode} [id] - Identifier node.
 * @property {ASTNode} [imported] - Imported node.
 * @property {ASTNode} [init] - Initializer node.
 * @property {boolean} [isEmpty] - True when the node is set for deletion but should be replaced with an Empty Statement instead.
 * @property {boolean} [isMarked] - True when the node has already been marked for replacement or deletion.
 * @property {ASTNode} [key] - Key node in properties.
 * @property {string} [kind] - Kind of declaration (e.g., 'const').
 * @property {ASTNode} [label] - Label node.
 * @property {Object[]} [leadingComments] - Leading comments.
 * @property {number[]} [lineage] - Only present if detailed: true. Array of scopeIds representing the ancestry of this node's scope.
 * @property {ASTNode} [left] - Left side of assignment or binary expression.
 * @property {ASTNode} [local] - Local node.
 * @property {boolean} [method] - True if method.
 * @property {string} [name] - Name of identifier.
 * @property {string} [operator] - Operator string.
 * @property {ASTNode} [object] - Object node.
 * @property {string} [pattern] - Pattern string.
 * @property {ASTNode[]} [params] - Function parameters.
 * @property {boolean} [prefix] - True if prefix operator.
 * @property {ASTNode} [property] - Property node.
 * @property {ASTNode[]} [properties] - Array of property nodes.
 * @property {ASTNode[]} [quasis] - Template literal quasis.
 * @property {number[]} [range] - [start, end] positions in source.
 * @property {string} [raw] - Raw source string.
 * @property {ASTNode} [regex] - Regex node.
 * @property {ASTNode[]} [references] - Only present on identifier and declaration nodes (detailed: true).
 * @property {ASTNode} [right] - Right side of assignment or binary expression.
 * @property {ASTScope} [scope] - Only present if detailed: true. The lexical scope for this node.
 * @property {number} [scopeId] - For nodes which are also a scope's block.
 * @property {string} [scriptHash] - Used for caching/iteration in some utilities.
 * @property {boolean} [shorthand] - True if shorthand property.
 * @property {ASTNode} [source] - Source node.
 * @property {string} [sourceType] - Source type (e.g., 'module').
 * @property {ASTNode[]} [specifiers] - Import/export specifiers.
 * @property {boolean} [static] - True if static property.
 * @property {number} [start] - Start position in source.
 * @property {ASTNode} [superClass] - Superclass node.
 * @property {boolean} [tail] - True if tail in template literal.
 * @property {ASTNode} [test] - Test node (e.g., in IfStatement).
 * @property {Object[]} [tokens] - Tokens array.
 * @property {Object[]} [trailingComments] - Trailing comments.
 * @property {ASTNode} [update] - Update node.
 * @property {ASTNode|string|number|boolean} [value] - Value of the node.
 * @property {string|function} [src] - The source code for the node, or a getter function if includeSrc is true.
 */
class ASTNode {}

/**
 * @typedef ASTScope
 * @extends Scope
 * @property {ASTNode} block - The AST node that is the block for this scope.
 * @property {ASTScope[]} childScopes - Array of child scopes.
 * @property {number} scopeId - Unique id for this scope.
 * @property {string} type - Scope type.
 */
class ASTScope extends Scope {}

export {
	ASTNode,
	ASTScope,
};