import { describe, expect, it } from 'vitest';
import { htmlToAst } from '../src/index.js';

const source = `text
<div class="a"
     id=b c>
  <p>one</p> two <!-- c -->
  <script>var a</script>
</div>`;

// Every node of the tree, attributes included, in document order.
function nodes(node, list = []) {
  list.push(node);
  for (const attribute of node.attributes ?? []) list.push(attribute);
  for (const child of node.children ?? []) nodes(child, list);
  return list;
}

// The index a line and column point at.
function offset(text, { line, column }) {
  return (
    text
      .split('\n')
      .slice(0, line - 1)
      .join('\n').length +
    (line > 1 ? 1 : 0) +
    column
  );
}

describe('position.index', () => {
  it('should point every node at its own source', () => {
    const ast = htmlToAst(source, { position: { index: true } });
    const [text, div] = ast.children;
    const slice = node => source.slice(node.start, node.end);
    expect(slice(text)).toBe('text\n');
    expect(slice(div)).toBe(source.slice(5));
    expect(div.attributes.map(slice)).toEqual(['class="a"', 'id=b', 'c']);
    const [, p, two, comment, , script] = div.children;
    expect([p, two, comment, script].map(slice)).toEqual([
      '<p>one</p>',
      ' two ',
      '<!-- c -->',
      '<script>var a</script>',
    ]);
    expect(slice(script.children[0])).toBe('var a');
    expect([ast.start, ast.end]).toEqual([0, source.length]);
  });

  it('should not add loc', () => {
    const ast = htmlToAst(source, { position: { index: true } });
    expect(nodes(ast).some(node => 'loc' in node)).toBe(false);
  });

  it('should position attributes when affixes are on', () => {
    const html = '<div @click|once={go} :x="1">t</div>';
    const [div] = htmlToAst(html, {
      position: { index: true },
      attribute: { affix: true },
    }).children;
    expect(div.attributes.map(a => html.slice(a.start, a.end))).toEqual([
      '@click|once={go}',
      ':x="1"',
    ]);
  });
});

describe('position.loc', () => {
  it('should count lines from 1 and columns from 0', () => {
    const [text, div] = htmlToAst(source, { position: { loc: true } }).children;
    expect(text.loc).toEqual({ start: { line: 1, column: 0 }, end: { line: 2, column: 0 } });
    expect(div.loc).toEqual({ start: { line: 2, column: 0 }, end: { line: 6, column: 6 } });
    expect(div.attributes[1].loc).toEqual({
      start: { line: 3, column: 5 },
      end: { line: 3, column: 9 },
    });
  });

  it('should agree with the index of every node', () => {
    const ast = htmlToAst(source, { position: { index: true, loc: true } });
    for (const node of nodes(ast)) {
      expect([offset(source, node.loc.start), offset(source, node.loc.end)]).toEqual([
        node.start,
        node.end,
      ]);
    }
  });

  it('should not add indexes when only loc is asked for', () => {
    const ast = htmlToAst(source, { position: { loc: true } });
    expect(nodes(ast).some(node => 'start' in node || 'end' in node)).toBe(false);
    expect(nodes(ast).every(node => 'loc' in node)).toBe(true);
  });

  it('should stay fast on a long document', () => {
    const rows = '<tr class="row"><td>cell</td><td>cell</td></tr>\n'.repeat(5000);
    const start = performance.now();
    const ast = htmlToAst(`<table>\n${rows}</table>`, { position: { loc: true } });
    expect(performance.now() - start).toBeLessThan(1000);
    expect(ast.children[0].children.at(-2).loc.start.line).toBe(5001);
  });
});
