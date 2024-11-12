# flAST - FLat Abstract Syntax Tree
[![Run Tests](https://github.com/PerimeterX/flast/actions/workflows/node.js.yml/badge.svg?branch=main)](https://github.com/PerimeterX/flast/actions/workflows/node.js.yml)
[![Downloads](https://img.shields.io/npm/dm/flast.svg?maxAge=43200)](https://www.npmjs.com/package/flast)

Flatten an Abstract Syntax Tree by placing all the nodes in a single flat array.

For comments and suggestions feel free to open an issue or find me on Twitter - [@ctrl__esc](https://twitter.com/ctrl__esc)

## Table of Contents
* [Installation](#installation)
  * [npm](#npm)
  * [Clone The Repo](#clone-the-repo)
* [Features](#features)
  * [flAST Data Structure](#flast-data-structure)
* [Usage](#usage)
  * [flAST](#flast)
    * [generateFlatAST Options](#generateflatast-options)
    * [generateCode Options](#generatecode-options)
  * [Arborist](#arborist)
* [How to Contribute](#how-to-contribute)
***

## Installation
### npm
```bash
npm install flast
```

### Clone The Repo
Requires Node 18 or newer.
```bash
git clone git@github.com:PerimeterX/flast.git
cd flast
npm install
```

***

## Features
- Keeps all relations between parent and child nodes.
- Tracks scope and connects each declaration to its references.  
  See [eslint-scope](https://github.com/eslint/eslint-scope) for more info on the scopes used.
- Adds a unique id to each node to simplify tracking and understanding relations between nodes.
- Maps the types to the nodes for easier access.
- <u>Arborist</u> - marks nodes for replacement or deletion and applies all changes in a single iteration over the tree.

### flAST Data Structure
<details>
  <summary>Example of how a flat AST would look like.</summary>

Input code: `console.log('flAST');`.
Output object:
```javascript
const tree = [
  {
    type: 'program',
    start: 0,
    end: 21,
    range: [0, 21],
    body: [
      '<ref to nodeId#2>'
    ],
    sourceType: 'script',
    comments: [],
    nodeId: 0,
    src: "console.log('flAST');",
    childNodes: [
      '<ref to nodeId#1>'
    ],
    parentNode: null,
    scope: '<GlobalScope scopeId#0>'
  },
  {
    type: 'ExpressionStatement',
    start: 0,
    end: 21,
    range: [0, 21],
    expression: '<ref to nodeId#2>',
    nodeId: 1,
    src: "console.log('flAST');",
    childNodes: [
      '<ref to nodeId#2>'
    ],
    parentNode: '<ref to nodeId#0>',
    scope: '<GlobalScope scopeId#0>'
  },
  {
    type: 'CallExpression',
    start: 0,
    end: 20,
    range: [0, 20],
    callee: '<ref to nodeId#3>',
    arguments: [
      '<ref to nodeId#6>'
    ],
    optional: false,
    nodeId: 2,
    src: "console.log('flAST')",
    childNodes: [
      '<ref to nodeId#3>',
      '<ref to nodeId#6>'
    ],
    parentNode: '<ref to nodeId#1>',
    scope: '<GlobalScope scopeId#0>'
  },
  {
    type: 'MemberExpression',
    start: 0,
    end: 11,
    range: [0, 11],
    object: '<ref to nodeId#4>',
    property: '<ref to nodeId#5>',
    computed: false,
    optional: false,
    nodeId: 3,
    src: 'console.log',
    childNodes: [
      '<ref to nodeId#4>',
      '<ref to nodeId#5>'
    ],
    parentNode: '<ref to nodeId#2>',
    scope: '<GlobalScope scopeId#0>'
  },
  {
    type: 'Identifier',
    start: 0,
    end: 7,
    range: [0, 7],
    name: 'console',
    nodeId: 4,
    src: 'console',
    childNodes: [],
    parentNode: '<ref to nodeId#3>',
    scope: '<GlobalScope scopeId#0>'
  },
  {
    type: 'Identifier',
    start: 8,
    end: 11,
    range: [8, 11],
    name: 'log',
    nodeId: 5,
    src: 'log',
    childNodes: [],
    parentNode: '<ref to nodeId#3>',
    scope: '<GlobalScope scopeId#0>'
  },
  {
    type: 'Literal',
    start: 12,
    end: 19,
    range: [12, 19],
    value: "flAST",
    raw: "'flAST'",
    nodeId: 6,
    src: "'flAST'",
    childNodes: [],
    parentNode: '<ref to nodeId#2>',
    scope: '<GlobalScope scopeId#0>'
  }
];
```
</details>

## Usage
### flAST

```javascript
import {generateFlatAST, generateCode} from 'flast';
const ast = generateFlatAST(`console.log('flAST')`);
const reconstructedCode = generateCode(ast[0]); // rebuild from root node
```
#### generateFlatAST Options
```javascript
const generateFlatASTDefaultOptions = {
  detailed: true,   // If false, include only original node without any further details
  includeSrc: true, // If false, do not include node src. Only available when `detailed` option is true
};
```

#### generateCode Options
See [Espree's documentation](https://github.com/eslint/espree#options) for more information
```javascript
const generateCodeDefaultOptions = {
  format: {
    indent: {
      style: '  ',
      adjustMultilineComment: true,
    },
    quotes: 'auto',
    escapeless: true,
    compact: false,
  },
  comment: true,
};
```

### Arborist

```javascript
import {generateFlatAST, generateCode, Arborist} from 'flast';
const ast = generateFlatAST(`console.log('Hello' + ' ' + 'there!');`);
const replacements = {
  'Hello': 'General',
  'there!': 'Kenobi',
};
const arborist = new Arborist(ast);
// Mark all relevant nodes for replacement.
ast.filter(n => n.type === 'Literal' && replacements[n.value]).forEach(n => arborist.markNode(n, {
  type: 'Literal',
  value: replacements[n.value],
  raw: `'${replacements[n.value]}'`,
}));
const numberOfChangesMade = arborist.applyChanges();
console.log(generateCode(arborist.ast[0]));  // console.log('General' + ' ' + 'Kenobi');
```
The Arborist can be called with an extra argument - logFunc - which can be used to override the log
function inside the arborist. 

## How to Contribute
To contribute to this project see our [contribution guide](CONTRIBUTING.md)