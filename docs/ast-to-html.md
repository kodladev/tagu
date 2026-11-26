# AST to HTML

Writes a tree back as HTML.

## Import

```js
import { astToHtml } from 'tagu';
```

## `astToHtml`

```js
const ast = htmlToAst(`<a href=x title='y' class="z" hidden>link</a><br><ul><li>one<li>two</ul>`);

astToHtml(ast);
//=> <a href=x title='y' class="z" hidden>link</a><br><ul><li>one<li>two</ul>
```

The tree is written the way the source was. Quotes, `<br>` or `<br/>`, end tags that were left out and the doctype keyword come back as the parser [noted them](./html-to-ast.md#notes-on-how-it-was-written).

The output always comes from the tree, so a node you changed is written changed, and a tree you built by hand is written too.

```js
const [a] = ast.children;
a.attributes[0].value = 'two words';

astToHtml(ast);
//=> <a href="two words" title='y' class="z" hidden>link</a><br><ul><li>one<li>two</ul>
```

The value no longer fits without quotes, so it gets them.

## `normalize`

Writes the corrected form instead: double quotes, `/>` on void tags, every end tag, `DOCTYPE`.

```js
astToHtml(ast, { normalize: true });
//=> <a href="x" title="y" class="z" hidden>link</a><br/><ul><li>one</li><li>two</li></ul>
```

## What is not kept

The whitespace inside a tag. Attributes written on separate lines come back on one line, a single space apart:

```html
<div class="a" id="b">
  →
  <div class="a" id="b"></div>
</div>
```

End tags that match nothing open are dropped, as they are while parsing.

To change a file and leave every other byte as it was, use the [indexes](./html-to-ast.md#positions) and edit the source text.

## Entities

Pass the options the tree was parsed with. When `transform.entities` decoded the tree, text and attribute values are escaped again, but only where they would be read back as something else: an `&` that starts an entity, a `<` that starts a tag. Template code in text (`{a < b && c}`) is left alone.

```js
import { astToHtml, decodeEntities, htmlToAst } from 'tagu';

const options = { transform: { entities: decodeEntities } };
const ast = htmlToAst('<p title="a &amp; b">&lt;b&gt; &amp; c</p>', options);

astToHtml(ast, options);
//=> <p title="a & b">&lt;b> & c</p>
```

## Options

| Option               | Default | What it does                                                        |
| -------------------- | ------- | ------------------------------------------------------------------- |
| `normalize`          | `false` | Write the corrected form, not the form as written.                  |
| `transform.entities` | `false` | Set when the tree was decoded, so it is escaped again.              |
| `tags.addSpecial`    | `[]`    | The same list given to `htmlToAst`; their content is never escaped. |
| `tags.void`          | HTML's  | The tags that may be written without `/>`.                          |
