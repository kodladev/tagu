# Entities

Decodes and escapes HTML entities.

## Import

```js
import { decodeEntities, encodeEntities } from 'tagu';
```

The parser keeps text as written, so it does not carry an entity table. The table comes with `decodeEntities`, and only into the bundles that import it.

## `decodeEntities`

Decodes every numeric entity and the common named ones. What it does not know stays as written.

```js
decodeEntities('Tom &amp; Jerry &copy; &#39;x&#x27; &unknown;');
//=> Tom & Jerry © 'x' &unknown;
```

It knows about 85 names: `amp`, `lt`, `gt`, `quot`, `apos`, `nbsp`, `copy`, `reg`, `trade`, `hellip`, `mdash`, `ndash`, the curly quotes, arrows, common currency and math signs. The semicolon is required.

### Decoding a tree

Hand it to `htmlToAst`. Text and attribute values are decoded; `script` and `style` content, comments and values written in braces are not.

```js
htmlToAst('<p title="a &amp; b">c &lt; d</p>', { transform: { entities: decodeEntities } });
//=> p[title="a & b"] > "c < d"
```

Any function from string to string works there, so a decoder with the whole HTML table can take its place.

## `encodeEntities`

Escapes the characters that would change the markup: `&`, `<`, `>`, `"` and the non-breaking space.

```js
encodeEntities('a < b & "c"');
//=> a &lt; b &amp; &quot;c&quot;
```

Use it when you put text of your own into a tree that will be written as HTML.
