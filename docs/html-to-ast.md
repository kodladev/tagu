# HTML to AST

Reads HTML into a tree of plain objects.

## Import

```js
import { htmlToAst } from 'tagu';
```

## `htmlToAst`

```js
htmlToAst('<h1 id="title">Hello World!</h1>');
```

```json
{
  "type": "Document",
  "children": [
    {
      "type": "Element",
      "name": "h1",
      "voidElement": false,
      "attributes": [{ "type": "Attribute", "name": "id", "value": "title" }],
      "children": [{ "type": "Text", "content": "Hello World!" }]
    }
  ]
}
```

Text is never dropped. Whatever is not a tag is text: `a < b`, `1<2`, a tag that never ends. Only two things in the source leave no node: an end tag that matches nothing open, and a declaration other than the doctype (`<!ELEMENT …>`).

## Nodes

| Type        | Fields                                            |
| ----------- | ------------------------------------------------- |
| `Document`  | `children`                                        |
| `Element`   | `name`, `voidElement`, `attributes`, `children`   |
| `Attribute` | `name`, `value`                                   |
| `Text`      | `content`                                         |
| `Comment`   | `content`                                         |
| `Doctype`   | `content` (what follows the keyword, e.g. `html`) |

Names are kept as written (`viewBox`, `MyComponent`). An attribute without a value has no `value`; `alt=""` has the empty string.

### Notes on how it was written

Some fields appear only when the source was written in a less usual way. [`astToHtml`](./ast-to-html.md) uses them to write the tree back as it was.

| Field               | On          | Meaning                                             |
| ------------------- | ----------- | --------------------------------------------------- |
| `quote: "'"`        | `Attribute` | The value was in single quotes.                     |
| `quote: ''`         | `Attribute` | The value had no quotes: `href=x`.                  |
| `brace: true`       | `Attribute` | The value was in braces: `x={a}`, `{a}`.            |
| `selfClosing: true` | `Element`   | The tag ended with `/>`: `<br/>`, `<Foo/>`.         |
| `endTag: false`     | `Element`   | The end tag is not in the source: `<li>one<li>two`. |
| `keyword`           | `Doctype`   | The keyword as written, when it was not `DOCTYPE`.  |

## Template syntax

Braces are read as a whole, so what is inside them cannot end the tag or the value.

```js
htmlToAst('<li class={a > b ? "x" : "y"} on:click={() => { pick(item) }} {disabled} {...rest}>');
```

```json
[
  { "type": "Attribute", "name": "class", "value": "{a > b ? \"x\" : \"y\"}", "brace": true },
  { "type": "Attribute", "name": "on:click", "value": "{() => { pick(item) }}", "brace": true },
  { "type": "Attribute", "name": "disabled", "value": "{disabled}", "brace": true },
  { "type": "Attribute", "name": "...rest", "value": "{...rest}", "brace": true }
]
```

Strings inside braces are skipped over, so `{a ? "}" : ">"}` is one value. Braces in text (`{#if a > b}`, `{name}`) stay part of the text.

### Affixes

With `attribute.affix`, a name is split into its prefix, its name and its suffixes.

```js
htmlToAst('<input :value={name} on:input|trim={save}>', { attribute: { affix: true } });
```

```json
[
  { "type": "Attribute", "prefix": ":", "name": "value", "value": "{name}", "brace": true },
  {
    "type": "Attribute",
    "name": "on",
    "suffix": [
      { "prefix": ":", "name": "input" },
      { "prefix": "|", "name": "trim" }
    ],
    "value": "{save}",
    "brace": true
  }
]
```

The affixes known by default are `:`, `@`, `|`, `*`, `#` and `^`. Add your own with `addAffix`:

```js
htmlToAst('<div !flag=1>', { attribute: { affix: true, addAffix: ['!'] } });
```

## Tags left open

HTML lets some end tags be left out. The start of a tag closes the open one it cannot sit inside, and an end tag closes everything still open inside its element.

```js
htmlToAst('<ul><li>one<li>two</ul>');
//=> ul > [li > "one", li > "two"]

htmlToAst('<p>one<div>two</div>');
//=> [p > "one", div > "two"]
```

This covers `li`, `dt`, `dd`, `p`, `option`, `optgroup`, `tr`, `td`, `th`, `thead`, `tbody`, `tfoot`, `rt` and `rp`. An end tag that matches nothing open is ignored.

Turn it off to keep the nesting exactly as written, for example in a template language where a `<div>` may sit inside a `<p>`:

```js
htmlToAst('<p>one<div>two</div></p>', { tags: { implied: false } });
//=> p > ["one", div > "two"]
```

## Special and void tags

The content of `script`, `style`, `template`, `textarea` and `title` is not parsed; it becomes one text node. Comments are kept the same way.

```js
htmlToAst('<script>if (a < b) document.write("<p>")</script>');
//=> script > 'if (a < b) document.write("<p>")'
```

Add tags of your own with `addSpecial`:

```js
htmlToAst('<markdown># Title <b></markdown>', { tags: { addSpecial: ['markdown'] } });
//=> markdown > '# Title <b>'
```

Void tags have no content and no end tag: `area`, `base`, `br`, `col`, `embed`, `hr`, `img`, `input`, `link`, `meta`, `source`, `track`, `wbr`. A tag that ends with `/>` is void too, whatever its name. Replace the list with `tags.void`:

```js
htmlToAst('<icon name="x"><p>t</p>', { tags: { void: ['icon'] } });
//=> [icon, p > "t"]
```

## Whitespace

Whitespace is kept by default.

```js
htmlToAst('<div>\n  <p> text </p>\n</div>');
//=> div > ["\n  ", p > " text ", "\n"]
```

`whitespace: false` drops the text nodes that hold nothing but whitespace, and removes line breaks from the others. `trim: true` also trims each text.

```js
htmlToAst('<div>\n  <p> text </p>\n</div>', { transform: { whitespace: false } });
//=> div > [p > " text "]

htmlToAst('<div>\n  <p> text </p>\n</div>', { transform: { whitespace: false, trim: true } });
//=> div > [p > "text"]
```

## Entities

Text and attribute values are kept as written: `&amp;` stays `&amp;`. To decode them, pass a decoder. See [Entities](./entities.md).

```js
import { decodeEntities, htmlToAst } from 'tagu';

htmlToAst('<p title="a &amp; b">c &lt; d</p>', { transform: { entities: decodeEntities } });
//=> p[title="a & b"] > "c < d"
```

## Positions

`position.index` adds `start` and `end` to every node, attributes included: the indexes of the node in the source.

```js
htmlToAst('<h1>Hello World!</h1>', { position: { index: true } });
```

```json
{
  "type": "Document",
  "children": [
    {
      "type": "Element",
      "name": "h1",
      "voidElement": false,
      "attributes": [],
      "children": [{ "type": "Text", "content": "Hello World!", "start": 4, "end": 16 }],
      "start": 0,
      "end": 21
    }
  ],
  "start": 0,
  "end": 21
}
```

`position.loc` adds `loc` instead, with lines counted from 1 and columns from 0. Ask for both to get both.

```js
htmlToAst('<h1>Hello\nWorld!</h1>', { position: { loc: true } }).children[0].loc;
//=> { start: { line: 1, column: 0 }, end: { line: 2, column: 11 } }
```

Indexes let you change a file and leave every other byte alone:

```js
const source = '<p class="a">one</p>';
const [p] = htmlToAst(source, { position: { index: true } }).children;
const [attribute] = p.attributes;

source.slice(0, attribute.start) + 'class="b"' + source.slice(attribute.end);
//=> <p class="b">one</p>
```

## Options

| Option                 | Default | What it does                                                 |
| ---------------------- | ------- | ------------------------------------------------------------ |
| `tags.void`            | HTML's  | The tags that have no content.                               |
| `tags.addSpecial`      | `[]`    | More tags whose content is kept as text.                     |
| `tags.implied`         | HTML's  | Which start tag closes which open tag; `false` turns it off. |
| `attribute.affix`      | `false` | Split attribute names into prefix, name and suffixes.        |
| `attribute.addAffix`   | `[]`    | More affix characters.                                       |
| `transform.whitespace` | `true`  | Keep text that is only whitespace.                           |
| `transform.trim`       | `false` | Trim every text.                                             |
| `transform.entities`   | `false` | A function that decodes entities, such as `decodeEntities`.  |
| `position.index`       | `false` | Add `start` and `end`.                                       |
| `position.loc`         | `false` | Add `loc`.                                                   |

## Limits

- Braces are followed four levels deep. Deeper nesting, or a lone apostrophe inside braces (`{/* don't */ x}`), ends the tag at the next `>`.
- A `<template>` inside a `<template>` ends at the first `</template>`.
- Misnested tags stay where they are written (`<a>` inside `<a>`), and no `<tbody>` is added to a table that has none. So on broken HTML the tree can differ from a browser's; do not use it to decide what is safe to show.
- `<![CDATA[…]]>` is kept as text, markers included.
- The content of `<noscript>` is parsed as markup.
