import { describe, expect, it } from 'vitest';
import { astToHtml, htmlToAst, visit } from '../src/index.js';

const html = '<div id="a"><p class="b">one</p><!-- c --><script>x</script>two</div>';

describe('visit', () => {
  it('should call a function for every node, parents first', () => {
    const seen = [];
    visit(htmlToAst(html), node => seen.push(node.name ?? node.type));
    expect(seen).toEqual([
      'Document',
      'div',
      'id',
      'p',
      'class',
      'Text',
      'Comment',
      'script',
      'Text',
      'Text',
    ]);
  });

  it('should call the function named after the node type', () => {
    const ast = htmlToAst('<h1 id="title">Hello World!</h1>');
    visit(ast, {
      Element(node) {
        node.name = 'p';
      },
      Attribute(node) {
        node.name = 'class';
      },
      Text(node) {
        node.content = 'Hello Everyone!';
      },
    });
    expect(astToHtml(ast)).toBe('<p class="title">Hello Everyone!</p>');
  });

  it('should pass the parent and the place in it', () => {
    const ast = htmlToAst(html);
    const [div] = ast.children;
    const seen = [];
    visit(ast, {
      Document: (node, parent, index) => seen.push(['Document', parent, index]),
      Element: (node, parent, index) => seen.push([node.name, parent.name ?? parent.type, index]),
      Attribute: (node, parent, index) => seen.push([node.name, parent.name, index]),
    });
    expect(seen).toEqual([
      ['Document', undefined, undefined],
      ['div', 'Document', 0],
      ['id', 'div', 0],
      ['p', 'div', 0],
      ['class', 'p', 0],
      ['script', 'div', 2],
    ]);
    visit(ast, {
      Comment: (node, parent, index) => expect(parent.children[index - 1]).toBe(div.children[0]),
    });
  });

  it('should skip what is inside a node when the function returns false', () => {
    const seen = [];
    visit(htmlToAst(html), node => {
      seen.push(node.name ?? node.type);
      if (node.name === 'p' || node.name === 'script') return false;
    });
    expect(seen).toEqual(['Document', 'div', 'id', 'p', 'Comment', 'script', 'Text']);
  });

  it('should start from any node', () => {
    const [div] = htmlToAst(html).children;
    const seen = [];
    visit(div.children[0], node => seen.push(node.name ?? node.type));
    expect(seen).toEqual(['p', 'class', 'Text']);
  });

  it('should let a node remove itself without skipping the next one', () => {
    const ast = htmlToAst('<ul><li>a</li><!-- x --><!-- y --><li>b</li></ul>');
    const names = [];
    visit(ast, {
      Comment: (node, parent, index) => void parent.children.splice(index, 1),
      Element: node => void names.push(node.name),
    });
    expect(astToHtml(ast)).toBe('<ul><li>a</li><li>b</li></ul>');
    expect(names).toEqual(['ul', 'li', 'li']);
  });

  it('should leave the tree as plain data', () => {
    const ast = htmlToAst(html);
    const copy = structuredClone(ast);
    visit(ast, () => {});
    expect(ast).toEqual(copy);
    expect(() => structuredClone(ast)).not.toThrow();
  });
});
