# Visit

Calls your functions on the nodes of a tree.

## Import

```js
import { visit } from 'tagu';
```

## `visit`

Give it functions named after the node types: `Element`, `Attribute`, `Text`, `Comment`, `Doctype`, `Document`.

```js
const ast = htmlToAst('<h1 id=title>Hello <b>World</b>!</h1>');

visit(ast, {
  Element(node) {
    if (node.name === 'h1') node.name = 'h2';
  },
  Text(node) {
    node.content = node.content.replace('World', 'Everyone');
  },
});

astToHtml(ast);
//=> <h2 id=title>Hello <b>Everyone</b>!</h2>
```

Or one function for every node:

```js
let count = 0;
visit(ast, () => count++);
```

A node is visited first, then its attributes, then its children. The visit can start from any node, not only the document.

### Parent and index

Each function gets the node, its parent and its index in the parent's `children` (or `attributes`). The node the visit starts from gets neither.

```js
visit(ast, {
  Text(node, parent, index) {
    const previous = parent.children[index - 1];
    const next = parent.children[index + 1];
  },
});
```

### Skipping

Return `false` to skip what is inside a node: its attributes and its children.

```js
visit(ast, {
  Element(node) {
    if (node.name === 'svg') return false;
  },
});
```

The visit adds nothing to the nodes. The tree stays plain data.

## Recipes

### Collect every link

```js
const links = [];
visit(ast, {
  Element(node) {
    if (node.name === 'a') links.push(node.attributes.find(a => a.name === 'href')?.value);
  },
});
```

### Remove nodes

A node may take itself out of its parent. The next node is not skipped.

```js
visit(ast, {
  Comment(node, parent, index) {
    parent.children.splice(index, 1);
  },
  Element(node, parent, index) {
    if (node.name === 'script') {
      parent.children.splice(index, 1);
      return false;
    }
  },
});
```

### Read the text

```js
let text = '';
visit(ast, {
  Element: node => node.name !== 'script' && node.name !== 'style',
  Text(node) {
    text += node.content;
  },
});
```

### Add an attribute

```js
visit(ast, {
  Element(node) {
    if (node.name === 'a')
      node.attributes.push({ type: 'Attribute', name: 'rel', value: 'noopener' });
  },
});
```
