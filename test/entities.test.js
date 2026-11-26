import { describe, expect, it } from 'vitest';
import { astToHtml, decodeEntities, encodeEntities, htmlToAst } from '../src/index.js';

describe('decodeEntities', () => {
  it('should decode numeric entities', () => {
    expect(decodeEntities('&#39;a&#x27; &#X1F600; &#128512;')).toBe("'a' 😀 😀");
  });

  it('should decode common named entities', () => {
    expect(decodeEntities('a &amp; b &lt;c&gt; &quot;d&quot; &copy;&nbsp;&mdash;&hellip;')).toBe(
      'a & b <c> "d" ©\u00a0—…'
    );
  });

  it('should leave what it does not know as written', () => {
    const text = '&unknown; &amp &; &#; &#xZZ; &#99999999; a && b; AT&T;';
    expect(decodeEntities(text)).toBe(text);
  });

  it('should decode once, not twice', () => {
    expect(decodeEntities('&amp;lt;')).toBe('&lt;');
  });
});

describe('encodeEntities', () => {
  it('should escape what would change the markup', () => {
    expect(encodeEntities('a & b <c> "d"\u00a0')).toBe('a &amp; b &lt;c&gt; &quot;d&quot;&nbsp;');
  });

  it('should undo decodeEntities for those characters', () => {
    const text = 'a &amp; b &lt;c&gt; &quot;d&quot;&nbsp;';
    expect(encodeEntities(decodeEntities(text))).toBe(text);
  });
});

describe('entities option', () => {
  const options = { transform: { entities: decodeEntities } };

  it('should keep everything as written by default', () => {
    const html = '<p title="a &amp; &quot;b&quot;">c &lt;i&gt; &copy; d</p>';
    const [p] = htmlToAst(html).children;
    expect([p.attributes[0].value, p.children[0].content]).toEqual([
      'a &amp; &quot;b&quot;',
      'c &lt;i&gt; &copy; d',
    ]);
    expect(astToHtml(htmlToAst(html))).toBe(html);
  });

  it('should decode text and attribute values with the function given', () => {
    const ast = htmlToAst('x &amp; y<p title="a &amp; b">c &lt; d<b>&copy;</b></p>', options);
    const [text, p] = ast.children;
    expect(text.content).toBe('x & y');
    expect([p.attributes[0].value, p.children[0].content]).toEqual(['a & b', 'c < d']);
    expect(p.children[1].children[0].content).toBe('©');
  });

  it('should not touch scripts, styles, comments or brace values', () => {
    const html =
      '<div x={a &amp; b}><script>a &amp; b</script><style>a &gt; b</style><!-- &amp; --></div>';
    const [div] = htmlToAst(html, options).children;
    expect(div.attributes[0].value).toBe('{a &amp; b}');
    expect(div.children.map(node => node.content ?? node.children[0].content)).toEqual([
      'a &amp; b',
      'a &gt; b',
      ' &amp; ',
    ]);
    expect(astToHtml(htmlToAst(html, options), options)).toBe(html);
  });

  it('should decode the escapable raw text of title and textarea', () => {
    const [title] = htmlToAst('<title>a &amp; b <i></title>', options).children;
    expect(title.children[0].content).toBe('a & b <i>');
  });

  it('should take any function, for a fuller table', () => {
    const entities = text => text.replaceAll('&CounterClockwiseContourIntegral;', '∳');
    const [p] = htmlToAst('<p>&CounterClockwiseContourIntegral;</p>', {
      transform: { entities },
    }).children;
    expect(p.children[0].content).toBe('∳');
  });

  it('should say so when it is not given a function', () => {
    expect(() => htmlToAst('<p>a</p>', { transform: { entities: true } })).toThrow(
      'tagu: transform.entities takes a function, such as decodeEntities'
    );
  });

  it('should write decoded text back with the escapes that keep its meaning', () => {
    const html = '<p title="a &amp; &quot;b&quot; &amp;amp;">&lt;script&gt; &amp; c &amp;lt;</p>';
    const out = astToHtml(htmlToAst(html, options), options);
    expect(out).toBe(`<p title='a & "b" &amp;amp;'>&lt;script> & c &amp;lt;</p>`);
    // Parsed again, it decodes to the same text and values.
    const decoded = text => astToHtml(htmlToAst(text, options), { normalize: true });
    expect(decoded(out)).toBe(decoded(html));
  });

  it('should leave template code in text alone', () => {
    const html = '<p>{a < b && c ? "x" : y}</p>{#if a && b}<i>{@html c}</i>{/if}';
    expect(astToHtml(htmlToAst(html, options), options)).toBe(html);
  });

  it('should keep custom special tags raw both ways', () => {
    const custom = { transform: { entities: decodeEntities }, tags: { addSpecial: ['portal'] } };
    const html = '<portal><p>a &amp; b</p></portal>';
    expect(astToHtml(htmlToAst(html, custom), custom)).toBe(html);
  });
});
