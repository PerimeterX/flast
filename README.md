# flAST - FLat Abstract Syntax Tree
[![Run Tests](https://github.com/PerimeterX/flast/actions/workflows/node.js.yml/badge.svg?branch=main)](https://github.com/PerimeterX/flast/actions/workflows/node.js.yml)
[![Downloads](https://img.shields.io/npm/dm/flast.svg?maxAge=43200)](https://www.npmjs.com/package/flast)

Efficient, flat, and richly-annotated JavaScript AST manipulation for code transformation, analysis, and more.

For comments and suggestions feel free to open an issue or find me on Twitter/X - [@ctrl__esc](https://x.com/ctrl__esc)

## Table of Contents
* [Installation](#installation)
* [Features](#features)
* [Usage Examples](#usage-examples)
* [How to Contribute](#how-to-contribute)
* [Projects Using flAST](#projects-using-flast)

---

## Installation
Requires Node 18 or newer.

### npm
```bash
npm install flast
```

### Clone the Repo
```bash
git clone git@github.com:PerimeterX/flast.git
cd flast
npm install
```
---

## Features

### Parsing and Code Generation
- **Code to AST:** Parse JavaScript code into a flat, richly annotated AST.
- **AST to Code:** Generate code from any AST node, supporting round-trip transformations.

### Flat AST Structure
- **Flat AST (`generateFlatAST`):** All nodes are in a single array, allowing direct access and efficient traversal without recursive tree-walking.
- **Type Map:** `ast[0].typeMap` provides fast lookup of all nodes by type.
- **Scopes:** `ast[0].allScopes` gives direct access to all lexical scopes.

### Node Richness
Each node in the flat AST includes:
- `src`: The original code for this node.
- `parentNode` and `childNodes`: Easy navigation and context.
- `parentKey`: The property name this node occupies in its parent.
- `declNode`: For variables, a reference to their declaration node.
- `references`: For declarations, a list of all reference nodes.
- `lineage`: Traceable ancestry of scopes for each node.
- `nodeId`: Unique identifier for each node.
- `scope`, `scopeId`, and more for advanced analysis.

### Arborist: AST Modification
- **Delete nodes:** Mark nodes for removal and apply changes safely.
- **Replace nodes:** Mark nodes for replacement, with all changes validated and applied in a single pass.

### Utilities
- **applyIteratively:** Apply a series of transformation functions (using Arborist) to the AST/code, iterating until no further changes are made. Automatically reverts changes that break the code.
- **logger:** Simple log utility that can be controlled downstream and used for debugging or custom output.
- **treeModifier:** (Deprecated) Simple wrapper for AST iteration.
---

## Usage Examples

> **Tip:**
> For best performance, always iterate over only the relevant node types using `ast[0].typeMap`. For example, to process all identifiers and variable declarations:
> ```js
> const relevantNodes = [
>   ...ast[0].typeMap.Identifier, 
>   ...ast[0].typeMap.VariableDeclarator,
> ];
> for (let i = 0; i < relevantNodes.length; i++) {
>   const n = relevantNodes[i];
>   // ... process n ...
> }
> ```
> Only iterate over the entire AST as a last resort.

### Basic Example
```js
import {Arborist} from 'flast';

const replacements = {'Hello': 'General', 'there!': 'Kenobi'};

const arb = new Arborist(`console.log('Hello' + ' ' + 'there!');`);
// This is equivalent to:
//   const ast = generateFlatAST(`console.log('Hello' + ' ' + 'there!');`);
//   const arb = new Arborist(ast);
// Since the Arborist accepts either code as a string or a flat AST object.

for (let i = 0; i < arb.ast.length; i++) {
  const n = arb.ast[i];
  if (n.type === 'Literal' && replacements[n.value]) {
    arb.markNode(n, {
      type: 'Literal',
      value: replacements[n.value],
      raw: `'${replacements[n.value]}'`,
    });
  }
}
arb.applyChanges();
console.log(arb.script); // console.log('General' + ' ' + 'Kenobi');
```
---

### Example 1: Numeric Calculation Simplification
Replace constant numeric expressions with their computed value.
```js
import {applyIteratively} from 'flast';

function simplifyNumericExpressions(arb) {
  const binaryNodes = arb.ast[0].typeMap.BinaryExpression || [];
  for (let i = 0; i < binaryNodes.length; i++) {
    const n = binaryNodes[i];
    if (n.left.type === 'Literal' && typeof n.left.value === 'number' &&
      n.right.type === 'Literal' && typeof n.right.value === 'number') {
      let result;
      switch (n.operator) {
        case '+': result = n.left.value + n.right.value; break;
        case '-': result = n.left.value - n.right.value; break;
        case '*': result = n.left.value * n.right.value; break;
        case '/': result = n.left.value / n.right.value; break;
        default: continue;
      }
      arb.markNode(n, {type: 'Literal', value: result, raw: String(result)});
    }
  }
  return arb;
}

const script = 'let x = 5 * 3 + 1;';
const result = applyIteratively(script, [simplifyNumericExpressions]);
console.log(result); // let x = 16;
```
---

### Example 2: Transform Arrow Function to Regular Function
```js
import {applyIteratively} from 'flast';

function arrowToFunction(arb) {
  const arrowNodes = arb.ast[0].typeMap.ArrowFunctionExpression || [];
  for (let i = 0; i < arrowNodes.length; i++) {
    const n = arrowNodes[i];
    arb.markNode(n, {
      type: 'FunctionExpression',
      id: null,
      params: n.params,
      body: n.body.type === 'BlockStatement' ? n.body : {type: 'BlockStatement', body: [{ type: 'ReturnStatement', argument: n.body }] },
      generator: false,
      async: n.async,
      expression: false,
    });
  }
  return arb;
}

const script = 'const f = (a, b) => a + b;';
const result = applyIteratively(script, [arrowToFunction]);
console.log(result); 
/* 
const f = function(a, b) {
  return a + b;
};
*/
```
---

### Example 3: Modify Nodes Based on Attached Comments
Suppose you want to double any numeric literal that has a comment `// double` attached:
```js
import {applyIteratively} from 'flast';

function doubleLiteralsWithComment(arb) {
  const literalNodes = arb.ast[0].typeMap.Literal || [];
  for (let i = 0; i < literalNodes.length; i++) {
    const n = literalNodes[i];
    if (
      typeof n.value === 'number' &&
      n.leadingComments &&
      n.leadingComments.some(c => c.value.includes('double'))
    ) {
      arb.markNode(n, { type: 'Literal', value: n.value * 2, raw: String(n.value * 2) });
    }
  }
  return arb;
}

const script = 'const x = /* double */ 21;';
const result = applyIteratively(script, [doubleLiteralsWithComment], 1); // Last argument is the maximum number of iterations allowed.
console.log(result); // const x = /* double */ 42;
```
---

### Example 4: Proxy Variable Replacement Using References
Replace all references to a variable that is a proxy for another variable.
```js
import {applyIteratively} from 'flast';

function replaceProxyVars(arb) {
  const declarators = arb.ast[0].typeMap.VariableDeclarator || [];
  for (let i = 0; i < declarators.length; i++) {
    const n = declarators[i];
    if (n.init && n.init.type === 'Identifier' && n.id && n.id.name) {
      // Replace all references to this variable with the variable it proxies
      const refs = n.references || [];
      for (let j = 0; j < refs.length; j++) {
        const ref = refs[j];
        arb.markNode(ref, {
          type: 'Identifier',
          name: n.init.name,
        });
      }
    }
  }
  return arb;
}

const script = 'var a = b; var b = 42; console.log(a);';
const result = applyIteratively(script, [replaceProxyVars]);
console.log(result); // var a = b; var b = 42; console.log(b);
```
---

## Projects Using flAST
- **[Obfuscation-Detector](https://github.com/PerimeterX/obfuscation-detector):** Uses flAST to analyze and detect unique obfuscation in JavaScript code.
- **[REstringer](https://github.com/PerimeterX/restringer):** Uses flAST for advanced code transformation and analysis.

---

## How to Contribute
To contribute to this project see our [contribution guide](CONTRIBUTING.md)
