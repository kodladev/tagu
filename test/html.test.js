import { describe, expect, it } from 'vitest';
import { astToHtml, htmlToAst } from '../src/index.js';

describe('htmlToAst', () => {
  it('should parse the h1 element', () => {
    const ast = htmlToAst('<h1>Hello World!</h1>');
    const result = {
      type: 'Document',
      children: [
        {
          type: 'Element',
          name: 'h1',
          voidElement: false,
          attributes: [],
          children: [{ type: 'Text', content: 'Hello World!' }],
        },
      ],
    };
    expect(JSON.stringify(ast)).toEqual(JSON.stringify(result));
  });

  it('should parse nested elements', () => {
    const ast = htmlToAst('<div><h1>Hello World!</h1></div>');
    const result = {
      type: 'Document',
      children: [
        {
          type: 'Element',
          name: 'div',
          voidElement: false,
          attributes: [],
          children: [
            {
              type: 'Element',
              name: 'h1',
              voidElement: false,
              attributes: [],
              children: [{ type: 'Text', content: 'Hello World!' }],
            },
          ],
        },
      ],
    };
    expect(JSON.stringify(ast)).toEqual(JSON.stringify(result));
  });

  it('should recognize void elements', () => {
    const ast = htmlToAst('<div><h1>Hello World!</h1><img src="renit.png" /></div>');
    const result = {
      type: 'Document',
      children: [
        {
          type: 'Element',
          name: 'div',
          voidElement: false,
          attributes: [],
          children: [
            {
              type: 'Element',
              name: 'h1',
              voidElement: false,
              attributes: [],
              children: [{ type: 'Text', content: 'Hello World!' }],
            },
            {
              type: 'Element',
              name: 'img',
              voidElement: true,
              attributes: [{ type: 'Attribute', name: 'src', value: 'renit.png' }],
              children: [],
              selfClosing: true,
            },
          ],
        },
      ],
    };
    expect(JSON.stringify(ast)).toEqual(JSON.stringify(result));
  });

  it('should recognize custom void tags', () => {
    const ast = htmlToAst('<div><component title="Hi!" /></div>');
    const result = {
      type: 'Document',
      children: [
        {
          type: 'Element',
          name: 'div',
          voidElement: false,
          attributes: [],
          children: [
            {
              type: 'Element',
              name: 'component',
              voidElement: true,
              attributes: [{ type: 'Attribute', name: 'title', value: 'Hi!' }],
              children: [],
              selfClosing: true,
            },
          ],
        },
      ],
    };
    expect(JSON.stringify(ast)).toEqual(JSON.stringify(result));
  });

  it('should parse the attributes of the element', () => {
    const ast = htmlToAst(
      '<a href="/home.html" class="btn mt-2" data-id=5 disabled {value}>HOME</a>'
    );
    const result = {
      type: 'Document',
      children: [
        {
          type: 'Element',
          name: 'a',
          voidElement: false,
          attributes: [
            { type: 'Attribute', name: 'href', value: '/home.html' },
            { type: 'Attribute', name: 'class', value: 'btn mt-2' },
            { type: 'Attribute', name: 'data-id', value: '5', quote: '' },
            { type: 'Attribute', name: 'disabled' },
            { type: 'Attribute', name: 'value', value: '{value}', brace: true },
          ],
          children: [{ type: 'Text', content: 'HOME' }],
        },
      ],
    };
    expect(JSON.stringify(ast)).toEqual(JSON.stringify(result));
  });

  it('should provide affix feature in attribute parsing', () => {
    const ast = htmlToAst(
      '<div @name="form" class:visible={display}><input :value={number} /></div>',
      {
        attribute: { affix: true },
      }
    );
    const result = {
      type: 'Document',
      children: [
        {
          type: 'Element',
          name: 'div',
          voidElement: false,
          attributes: [
            { type: 'Attribute', prefix: '@', name: 'name', value: 'form' },
            {
              type: 'Attribute',
              name: 'class',
              suffix: [{ prefix: ':', name: 'visible' }],
              value: '{display}',
              brace: true,
            },
          ],
          children: [
            {
              type: 'Element',
              name: 'input',
              voidElement: true,
              attributes: [
                { type: 'Attribute', prefix: ':', name: 'value', value: '{number}', brace: true },
              ],
              children: [],
              selfClosing: true,
            },
          ],
        },
      ],
    };
    expect(JSON.stringify(ast)).toEqual(JSON.stringify(result));
  });

  it('should allow adding new affixes', () => {
    const ast = htmlToAst('<div !variable=1>OK</div>', {
      attribute: { affix: true, addAffix: ['!'] },
    });
    const result = {
      type: 'Document',
      children: [
        {
          type: 'Element',
          name: 'div',
          voidElement: false,
          attributes: [{ type: 'Attribute', prefix: '!', name: 'variable', value: '1', quote: '' }],
          children: [{ type: 'Text', content: 'OK' }],
        },
      ],
    };
    expect(JSON.stringify(ast)).toEqual(JSON.stringify(result));
  });

  it('should recognize whitespace', () => {
    const ast = htmlToAst(`
      <div>
        <p> whitespace </p>
      </div>
    `);
    const result = {
      type: 'Document',
      children: [
        {
          type: 'Text',
          content: '\n      ',
        },
        {
          type: 'Element',
          name: 'div',
          voidElement: false,
          attributes: [],
          children: [
            {
              type: 'Text',
              content: '\n        ',
            },
            {
              type: 'Element',
              name: 'p',
              voidElement: false,
              attributes: [],
              children: [
                {
                  type: 'Text',
                  content: ' whitespace ',
                },
              ],
            },
            {
              type: 'Text',
              content: '\n      ',
            },
          ],
        },
        {
          type: 'Text',
          content: '\n    ',
        },
      ],
    };
    expect(JSON.stringify(ast)).toEqual(JSON.stringify(result));
  });

  it('should remove optional whitespace', () => {
    const ast = htmlToAst(
      `
      <div>
        <p>  renit <span> ! </span>  </p>
        <script>
          console.log();
        </script>
      </div>
    `,
      { transform: { whitespace: false, trim: true } }
    );
    const result = {
      type: 'Document',
      children: [
        {
          type: 'Element',
          name: 'div',
          voidElement: false,
          attributes: [],
          children: [
            {
              type: 'Element',
              name: 'p',
              voidElement: false,
              attributes: [],
              children: [
                { type: 'Text', content: 'renit' },
                {
                  type: 'Element',
                  name: 'span',
                  voidElement: false,
                  attributes: [],
                  children: [{ type: 'Text', content: '!' }],
                },
              ],
            },
            {
              type: 'Element',
              name: 'script',
              voidElement: false,
              attributes: [],
              children: [{ type: 'Text', content: 'console.log();' }],
            },
          ],
        },
      ],
    };
    expect(JSON.stringify(ast)).toEqual(JSON.stringify(result));
  });

  it('should not parse special HTML tags', () => {
    const ast = htmlToAst(`
      <div>
        <p>parse</p>
        <script lang="ts">
          console.log("<p>not parse</p>")
        </script>
        <!-- single line comment <p>not parse</p> -->
        <style type="text/css">
          .title {
            content: "<p>not parse</p>"
          }
        </style>
        <!--
          multiple line comment
          <p>not parse</p>
        -->
      </div>
    `);
    const result = {
      type: 'Document',
      children: [
        {
          type: 'Text',
          content: '\n      ',
        },
        {
          type: 'Element',
          name: 'div',
          voidElement: false,
          attributes: [],
          children: [
            {
              type: 'Text',
              content: '\n        ',
            },
            {
              type: 'Element',
              name: 'p',
              voidElement: false,
              attributes: [],
              children: [
                {
                  type: 'Text',
                  content: 'parse',
                },
              ],
            },
            {
              type: 'Text',
              content: '\n        ',
            },
            {
              type: 'Element',
              name: 'script',
              voidElement: false,
              attributes: [
                {
                  type: 'Attribute',
                  name: 'lang',
                  value: 'ts',
                },
              ],
              children: [
                {
                  type: 'Text',
                  content: '\n          console.log("<p>not parse</p>")\n        ',
                },
              ],
            },
            {
              type: 'Text',
              content: '\n        ',
            },
            {
              type: 'Comment',
              content: ' single line comment <p>not parse</p> ',
            },
            {
              type: 'Text',
              content: '\n        ',
            },
            {
              type: 'Element',
              name: 'style',
              voidElement: false,
              attributes: [
                {
                  type: 'Attribute',
                  name: 'type',
                  value: 'text/css',
                },
              ],
              children: [
                {
                  type: 'Text',
                  content:
                    '\n          .title {\n            content: "<p>not parse</p>"\n          }\n        ',
                },
              ],
            },
            {
              type: 'Text',
              content: '\n        ',
            },
            {
              type: 'Comment',
              content: '\n          multiple line comment\n          <p>not parse</p>\n        ',
            },
            {
              type: 'Text',
              content: '\n      ',
            },
          ],
        },
        {
          type: 'Text',
          content: '\n    ',
        },
      ],
    };
    expect(JSON.stringify(ast)).toEqual(JSON.stringify(result));
  });

  it('should allow special HTML tags but not parse their content', () => {
    const ast = htmlToAst(
      `
      <div>
        <portal target="document.body">
          <p>not {parse}</p>
        </portal>
      </div>
    `,
      { tags: { addSpecial: ['portal'] } }
    );
    const result = {
      type: 'Document',
      children: [
        { type: 'Text', content: '\n      ' },
        {
          type: 'Element',
          name: 'div',
          voidElement: false,
          attributes: [],
          children: [
            { type: 'Text', content: '\n        ' },
            {
              type: 'Element',
              name: 'portal',
              voidElement: false,
              attributes: [{ type: 'Attribute', name: 'target', value: 'document.body' }],
              children: [{ type: 'Text', content: '\n          <p>not {parse}</p>\n        ' }],
            },
            { type: 'Text', content: '\n      ' },
          ],
        },
        { type: 'Text', content: '\n    ' },
      ],
    };
    expect(JSON.stringify(ast)).toEqual(JSON.stringify(result));
  });
  it('should convert content outside tags into text nodes', () => {
    const ast = htmlToAst(`
      <div>div text</div> outside
      text <p>paragraph text</p>
    `);
    const result = {
      type: 'Document',
      children: [
        { type: 'Text', content: '\n      ' },
        {
          type: 'Element',
          name: 'div',
          voidElement: false,
          attributes: [],
          children: [{ type: 'Text', content: 'div text' }],
        },
        { type: 'Text', content: ' outside\n      text ' },
        {
          type: 'Element',
          name: 'p',
          voidElement: false,
          attributes: [],
          children: [{ type: 'Text', content: 'paragraph text' }],
        },
        { type: 'Text', content: '\n    ' },
      ],
    };
    expect(JSON.stringify(ast)).toEqual(JSON.stringify(result));
  });
});

describe('text edge cases', () => {
  const text = html => htmlToAst(html).children[0].children[0].content;

  it('should keep a bare < in text', () => {
    expect(text('<p>a < b and more</p><p>next</p>')).toBe('a < b and more');
  });

  it('should keep < followed by a digit as text', () => {
    const ast = htmlToAst('<p>1<2</p><p>next</p>');
    expect(ast.children[0].children).toEqual([{ type: 'Text', content: '1<2' }]);
    expect(ast.children[1].name).toBe('p');
  });

  it('should keep text after a comment or script inside an element', () => {
    expect(astToHtml(htmlToAst('<p>a<!-- c --> b</p>'))).toBe('<p>a<!-- c --> b</p>');
    expect(astToHtml(htmlToAst('<div><script>x</script> tail</div>'))).toBe(
      '<div><script>x</script> tail</div>'
    );
  });

  it('should keep < at the end of text', () => {
    expect(text('<p>a <</p>')).toBe('a <');
  });
});

describe('nothing in the source is dropped', () => {
  const same = (html, options) => expect(astToHtml(htmlToAst(html, options))).toBe(html);

  it('should keep text before the first tag and after the last', () => {
    same('hello <p>a</p> bye');
    same('just text');
    same(' <p>a</p> ');
  });

  it('should keep text that contains -->', () => {
    same('<p>a --> b</p> c --> d');
  });

  it('should keep a comment that starts with text: as a comment', () => {
    const [comment] = htmlToAst('<!--text:hello-->').children;
    expect(comment).toEqual({ type: 'Comment', content: 'text:hello' });
  });

  it('should keep a tag that never ends as text', () => {
    const [, text] = htmlToAst('<p>a</p> <b unclosed').children;
    expect(text).toEqual({ type: 'Text', content: ' <b unclosed' });
  });

  it('should end an element that is never closed at the end of the source', () => {
    const [div] = htmlToAst('<div>a', { position: { index: true } }).children;
    expect([div.start, div.end]).toEqual([0, 6]);
  });

  it('should treat root text like any other text when whitespace is off', () => {
    const ast = htmlToAst('one two\n <p> a </p> \n three', { transform: { whitespace: false } });
    expect(ast.children.map(node => node.content ?? node.children[0].content)).toEqual([
      'one two ',
      ' a ',
      '  three',
    ]);
  });
});

describe('attribute edge cases', () => {
  it('should split attributes written without a space', () => {
    const [a] = htmlToAst('<a href="x"title="y">t</a>').children;
    expect(a.attributes.map(({ name, value }) => [name, value])).toEqual([
      ['href', 'x'],
      ['title', 'y'],
    ]);
  });

  it('should read attribute values that span lines', () => {
    const [div] = htmlToAst('<div title="a\n{ b }" data-x=\'c\nd\' e={f\ng}>x</div>').children;
    expect(div.attributes.map(({ name, value }) => [name, value])).toEqual([
      ['title', 'a\n{ b }'],
      ['data-x', 'c\nd'],
      ['e', '{f\ng}'],
    ]);
  });
});

describe('doctype', () => {
  it('should keep the doctype as its own node', () => {
    const ast = htmlToAst('<!DOCTYPE html>\n<html><body>x</body></html>');
    expect(ast.children[0]).toEqual({ type: 'Doctype', content: 'html' });
    expect(astToHtml(ast)).toBe('<!DOCTYPE html>\n<html><body>x</body></html>');
  });

  it('should read a lowercase or legacy doctype', () => {
    expect(htmlToAst('<!doctype html><p>x</p>').children[0].content).toBe('html');
    const legacy =
      'html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"';
    expect(htmlToAst(`<!DOCTYPE ${legacy}><p>x</p>`).children[0].content).toBe(legacy);
  });

  it('should give the doctype a position', () => {
    const [doctype] = htmlToAst('<!DOCTYPE html><p>x</p>', { position: { index: true } }).children;
    expect([doctype.start, doctype.end]).toEqual([0, 15]);
  });
});

describe('found on real pages', () => {
  const attrs = html =>
    htmlToAst(html).children[0].attributes.map(({ name, value }) => [name, value]);

  it('should keep valueless attributes that contain a hyphen', () => {
    expect(attrs('<div data-turbo-body class="a" aria-hidden>t</div>')).toEqual([
      ['data-turbo-body', undefined],
      ['class', 'a'],
      ['aria-hidden', undefined],
    ]);
  });

  it('should read a long hyphenated attribute name quickly', () => {
    const name = 'data-' + 'part-'.repeat(40) + 'end';
    const start = performance.now();
    expect(attrs(`<div ${name}="1" ${name}>t</div>`)).toEqual([
      [name, '1'],
      [name, undefined],
    ]);
    expect(performance.now() - start).toBeLessThan(50);
  });

  it('should not treat a tag as special because its name starts like one', () => {
    const html = '<styled-x a="1">t</styled-x><titlebar>t</titlebar><p>n</p>';
    expect(astToHtml(htmlToAst(html))).toBe(html);
  });

  it('should keep one level of nested braces in a value', () => {
    expect(attrs('<div style={{ a: 1 }} on:click={() => a > b}>t</div>')).toEqual([
      ['style', '{{ a: 1 }}'],
      ['on:click', '{() => a > b}'],
    ]);
  });
});

describe('implied end tags', () => {
  const html = (input, options) => astToHtml(htmlToAst(input, options), { normalize: true });

  it('should close list items that are left open', () => {
    expect(html('<ul><li>one<li>two</ul><p>x</p>')).toBe(
      '<ul><li>one</li><li>two</li></ul><p>x</p>'
    );
  });

  it('should keep a nested list inside its item', () => {
    expect(html('<ul><li>a<ul><li>b</ul><li>c</ul>')).toBe(
      '<ul><li>a<ul><li>b</li></ul></li><li>c</li></ul>'
    );
  });

  it('should close a paragraph when a block starts', () => {
    expect(html('<p>one<p>two<div>three</div>')).toBe('<p>one</p><p>two</p><div>three</div>');
  });

  it('should close table rows and cells', () => {
    expect(html('<table><tr><td>a<td>b<tr><th>c</table>')).toBe(
      '<table><tr><td>a</td><td>b</td></tr><tr><th>c</th></tr></table>'
    );
  });

  it('should close options and definition terms', () => {
    expect(html('<select><option>a<option>b</select>')).toBe(
      '<select><option>a</option><option>b</option></select>'
    );
    expect(html('<dl><dt>a<dd>b<dt>c</dl>')).toBe('<dl><dt>a</dt><dd>b</dd><dt>c</dt></dl>');
  });

  it('should close open children when their parent closes', () => {
    expect(html('<div><span>a</div>b')).toBe('<div><span>a</span></div>b');
  });

  it('should ignore a closing tag that matches nothing', () => {
    expect(html('<div>a</span>b</div>c')).toBe('<div>ab</div>c');
  });

  it('should leave tags as written when turned off', () => {
    expect(html('<p>one<div>two</div></p>', { tags: { implied: false } })).toBe(
      '<p>one<div>two</div></p>'
    );
  });

  it('should set the end of an element closed this way', () => {
    const ast = htmlToAst('<ul><li>one<li>two</ul>', { position: { index: true } });
    const [one, two] = ast.children[0].children;
    expect([one.start, one.end, two.start, two.end]).toEqual([4, 11, 11, 18]);
  });
});

describe('brace values', () => {
  const attrs = html => htmlToAst(html).children[0].attributes;

  it('should mark a value written in braces', () => {
    const [a, b, c] = attrs('<div :x={a} y="{b}" z="c={d}">t</div>');
    expect([a.value, a.brace]).toEqual(['{a}', true]);
    expect([b.value, b.brace]).toEqual(['{b}', undefined]);
    expect([c.value, c.brace]).toEqual(['c={d}', undefined]);
  });

  it('should write braces and quotes back as they were', () => {
    const html =
      '<div :x={a > b} y="{b}" {c} {...rest} style={{ d: 1 }} data-e=\'{"f":1}\'>t</div>';
    expect(astToHtml(htmlToAst(html))).toBe(html);
  });

  it('should write them back with affixes on', () => {
    const html = '<div :x={a} @click|once={go} {c}>t</div>';
    expect(astToHtml(htmlToAst(html, { attribute: { affix: true } }))).toBe(html);
  });
});

describe('braces in a tag', () => {
  const same = html => {
    const ast = htmlToAst(html);
    expect(ast.children).toHaveLength(1);
    expect(astToHtml(ast)).toBe(html);
  };
  const values = html =>
    htmlToAst(html).children[0].attributes.map(({ name, value }) => [name, value]);

  it('should read a handler with a body', () => {
    same('<button on:click={() => { count += 1 }}>ok</button>');
    expect(values('<button on:click={() => { count += 1 }}>ok</button>')).toEqual([
      ['on:click', '{() => { count += 1 }}'],
    ]);
  });

  it('should read > inside nested braces', () => {
    same('<li on:click={() => { if (a > b) { pick(item) } }}>t</li>');
    same('<div style={{ color: a > b ? "red" : "blue" }}>t</div>');
    same('<input value={items.filter(i => i.price > 10).length}>');
  });

  it('should not count braces or > inside a string', () => {
    same('<p title={a ? "}" : ">"}>t</p>');
    same("<p title={a ? '{' : '>'}>t</p>");
    same('<p title={`${a} > }`}>t</p>');
    same(String.raw`<p title={'it\'s > }'}>t</p>`);
  });

  it('should read braces four levels deep', () => {
    same('<p x={() => { if (a) { for (const b of c) { d > e } } }}>t</p>');
  });

  it('should read several brace values in one tag', () => {
    expect(
      values('<x {a} {...r} :b={c > d} @e|f={() => { return 1 }} g={{h: {i: 1}}}>t</x>')
    ).toEqual([
      ['a', '{a}'],
      ['...r', '{...r}'],
      [':b', '{c > d}'],
      ['@e|f', '{() => { return 1 }}'],
      ['g', '{{h: {i: 1}}}'],
    ]);
  });

  it('should still read a tag whose braces do not close', () => {
    const [p] = htmlToAst('<p a={b>t</p>').children;
    expect(p.name).toBe('p');
  });
});

describe('spaces around =', () => {
  it('should read one attribute, not three', () => {
    const [x] = htmlToAst('<x a = "1" b= 2 c ={3} d>t</x>').children;
    expect(x.attributes.map(({ name, value }) => [name, value])).toEqual([
      ['a', '1'],
      ['b', '2'],
      ['c', '{3}'],
      ['d', undefined],
    ]);
  });
});

describe('astToHtml as written', () => {
  const same = html => expect(astToHtml(htmlToAst(html))).toBe(html);
  const fixed = html => astToHtml(htmlToAst(html), { normalize: true });

  it('should keep the quotes of every attribute', () => {
    const html = `<a href=x title='y' class="z" data-n=5 :on={go} {rest}>t</a>`;
    same(html);
    expect(fixed(html)).toBe('<a href="x" title="y" class="z" data-n="5" :on={go} {rest}>t</a>');
  });

  it('should keep the spaces inside a value', () => {
    same('<p class=" a  b ">t</p>');
  });

  it('should keep void tags with or without the slash', () => {
    const html = '<br><img src="x"><hr/><Foo bar/><input disabled />';
    expect(astToHtml(htmlToAst(html))).toBe('<br><img src="x"><hr/><Foo bar/><input disabled/>');
    expect(fixed(html)).toBe('<br/><img src="x"/><hr/><Foo bar/><input disabled/>');
  });

  it('should leave out the end tags the source left out', () => {
    const html = '<ul><li>one<li>two</ul><p>a<p>b<div>c';
    same(html);
    expect(fixed(html)).toBe('<ul><li>one</li><li>two</li></ul><p>a</p><p>b</p><div>c</div>');
  });

  it('should note an end tag that is not in the source', () => {
    const [ul, div] = htmlToAst('<ul><li>one<li>two</li></ul><div>open').children;
    expect(ul.children.map(li => li.endTag)).toEqual([false, undefined]);
    expect([ul.endTag, div.endTag]).toEqual([undefined, false]);
  });

  it('should keep the doctype keyword as written', () => {
    same('<!doctype html><p>x</p>');
    same('<!DOCTYPE html><p>x</p>');
    expect(fixed('<!doctype html>')).toBe('<!DOCTYPE html>');
  });

  it('should note only what is unusual', () => {
    const [div] = htmlToAst('<div class="a"><p>x</p><br></div>').children;
    const keys = node => Object.keys(node).sort().join(' ');
    expect(keys(div)).toBe('attributes children name type voidElement');
    expect(keys(div.children[1])).toBe('attributes children name type voidElement');
    expect('quote' in div.attributes[0]).toBe(false);
  });

  it('should write a changed node changed', () => {
    const ast = htmlToAst(`<a href=x title='y'>t</a><br><ul><li>a</ul>`);
    const [a, br, ul] = ast.children;
    a.attributes[0].value = 'two words';
    a.attributes[1].value = "it's";
    br.name = 'Break';
    ul.children[0].children.push({ type: 'Text', content: '!' });
    expect(astToHtml(ast)).toBe(`<a href="two words" title="it's">t</a><Break/><ul><li>a!</ul>`);
  });

  it('should write a tree made by hand', () => {
    const ast = {
      type: 'Document',
      children: [
        {
          type: 'Element',
          name: 'p',
          voidElement: false,
          attributes: [{ type: 'Attribute', name: 'id', value: 'a' }],
          children: [
            { type: 'Text', content: 'hi' },
            { type: 'Element', name: 'br', voidElement: true },
          ],
        },
      ],
    };
    expect(astToHtml(ast)).toBe('<p id="a">hi<br></p>');
  });
});

describe('astToHtml', () => {
  it('should quote a value that contains double quotes with single quotes', () => {
    const html = `<a title='say "hi"' x="it's">t</a>`;
    expect(astToHtml(htmlToAst(html))).toBe(html);
  });

  it('should separate attributes with a space', () => {
    const html = '<a href="x" title="y">t</a>';
    expect(astToHtml(htmlToAst(html))).toBe(html);
  });

  it('should write an attribute without a value as its name alone', () => {
    const html = '<input disabled type="text" required><button {disabled} hidden>x</button>';
    expect(astToHtml(htmlToAst(html))).toBe(html);
  });

  it('should tell an empty value from no value', () => {
    const [img] = htmlToAst('<img alt="" hidden>').children;
    expect(img.attributes.map(({ name, value }) => [name, value])).toEqual([
      ['alt', ''],
      ['hidden', undefined],
    ]);
  });

  it('should not change the AST', () => {
    const ast = htmlToAst('<i :on="x" b>t</i>', { attribute: { affix: true } });
    const copy = structuredClone(ast);
    expect(astToHtml(ast)).toBe(astToHtml(ast));
    expect(ast).toEqual(copy);
  });
});
