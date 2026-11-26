import { RAW_EMPTY, RAW_WHITESPACE } from 'uty/define';
import { AttributeNode, CommentNode, ElementNode, TextNode } from './ast.js';
import { RGX_HTML_FIRST_TAG, RGX_HTML_TAG_ATTRIBUTES, commentEnd, commentStart } from './utils.js';

const SLASH = 47;
const GREATER_THAN = 62;
// Character codes that end a tag name: tab, line feed, form feed, carriage return, space, `/`, `>`.
const NAME_END = new Set([9, 10, 12, 13, 32, SLASH, GREATER_THAN]);
// The shorthand `{name}` written in place of an attribute.
const RGX_SHORTHAND = /{(.*?)}/;

/**
 * Parses an HTML tag.
 *
 * This function takes an HTML tag as a string and an options object, then parses the tag
 * to create a node representation of the tag. It handles void elements, special tags
 * (like comments and certain HTML elements), and attributes.
 *
 * @param {string} tag - The HTML tag to parse.
 * @param {Object} options - Options object.
 * @returns {Object} - The parsed HTML tag represented as a node.
 */
export function parseHtmlTag(tag, options) {
  // A comment: everything between `<!--` and `-->`.
  if (tag.startsWith(commentStart)) {
    const endIndex = tag.indexOf(commentEnd);
    const value = endIndex !== -1 ? tag.slice(4, endIndex) : RAW_EMPTY;
    return CommentNode(options.transform.trim ? value.trim() : value);
  }

  // The name runs from after `<` to the first whitespace, `/` or `>`.
  let nameEnd = 1;
  while (nameEnd < tag.length && !NAME_END.has(tag.charCodeAt(nameEnd))) nameEnd++;

  const node = ElementNode(tag.slice(1, nameEnd));
  // `<br/>` and `<Foo/>` close themselves; `<br>` is void by its name alone.
  if (tag.charCodeAt(tag.length - 2) === SLASH) {
    node.voidElement = true;
    node.selfClosing = true;
  } else {
    node.voidElement = options.set.void.has(node.name);
  }

  // Determine if the tag is a special element like script, style, template, etc.
  const isSpecial = options.set.special.has(node.name);

  // A tag that ends right after its name (`<div>`) has no attributes to look for.
  if (!isSpecial && tag.charCodeAt(nameEnd) === GREATER_THAN) return node;

  // Special elements come whole (`<script …>…</script>`); only their first tag has attributes.
  const tempTag = isSpecial ? RGX_HTML_FIRST_TAG.exec(tag)[0] : tag;

  // One shared pattern, started right after the tag name.
  const rgxAttr = RGX_HTML_TAG_ATTRIBUTES;
  rgxAttr.lastIndex = nameEnd;

  // Loop through all attribute matches in the tag.
  for (;;) {
    const tree = rgxAttr.exec(tempTag);

    // If no more matches are found, exit the loop.
    if (tree === null) break;

    // Which group matched tells how the value was written: "double", 'single', {braces},
    // unquoted, or no value at all. Double quotes are the usual way and leave no note.
    let name = tree[1];
    let value;
    let quote;
    if (tree[2] !== undefined) {
      value = tree[2];
    } else if (tree[3] !== undefined) {
      value = tree[3];
      quote = "'";
    } else if (tree[4] !== undefined) {
      value = tree[4];
    } else if (tree[5] !== undefined) {
      value = tree[5];
      quote = RAW_EMPTY;
    }

    // If the match is empty, skip to the next match.
    if (!name) continue;

    name = name.trim();

    // Handle attributes with template syntax.
    const shorthand = name.includes('{') ? RGX_SHORTHAND.exec(name) : null;
    if (shorthand) {
      value = name;
      name = shorthand[1];
    }

    const select = tree[0];

    // A value written in braces (`x={a}`) keeps them, and so does the shorthand (`{a}`).
    const brace = tree[4] !== undefined || !!shorthand || undefined;

    // If the match contains attribute name and value, parse and add it to the node's attributes.
    attribute(name, value, node, select, tree.index, options, brace, quote);
  }

  // The same trim as for children: an exact copy drops the room `push` set aside.
  if (node.attributes.length > 0) node.attributes = node.attributes.slice();

  // If it's a special element, extract its raw content and add it as a child node.
  if (isSpecial) {
    const rgxRaw = new RegExp(options.rgx.special);
    const raw = rgxRaw.exec(tag);
    let text = raw ? raw.groups.raw : '';
    if (options.transform.trim) text = text.trim();
    const content = TextNode(text);
    if (options.need.position) {
      const startIndex = options.index.start + tempTag.length;
      const rawSize = raw.groups.raw.length;

      content.start = startIndex;
      content.end = startIndex + rawSize;
    }
    node.children.push(content);
  }

  // Return the parsed ElementNode.
  return node;
}

/**
 * Sets an attribute on a node with optional affixing.
 * @param {string} name - Attribute name.
 * @param {string} value - Attribute value.
 * @param {Object} node - HTML node.
 * @param {string} select - The whole attribute as matched in the tag.
 * @param {number} index - Where the match starts inside the tag.
 * @param {Object} options - Options object.
 * @param {boolean} [brace] - Whether the value was written in braces.
 * @param {string} [quote] - How the value was quoted, when not with double quotes.
 */
function attribute(name, value, node, select, index, options, brace, quote) {
  // If affixing is enabled in options, affix the attribute name
  const af = options.attribute.affix ? attributeAffix(name, options) : undefined;
  const attribute = af
    ? AttributeNode(af.name, value, af.prefix, af.suffix, brace)
    : AttributeNode(name, value, undefined, undefined, brace);
  // Only an unusual way of writing leaves a note, so the common case stays small.
  if (quote !== undefined) attribute.quote = quote;

  if (options.need.position) {
    // A valueless attribute is matched with the space before it; that space is not part of it.
    const start = options.index.start + index;
    attribute.start = select.startsWith(RAW_WHITESPACE) ? start + 1 : start;
    attribute.end = start + select.length;
  }
  node.attributes.push(attribute);
}

/**
 * Checks and affixes an attribute name with a prefix or suffix based on options.
 * @param {string} name - Attribute name.
 * @param {Object} options - Options object.
 * @returns {Object} - Affixed attribute name object.
 */
function attributeAffix(name, options) {
  // If the attribute name doesn't match the pattern, return it as is
  if (!options.rgx.checkAttrAffix.test(name)) return { name };
  const found = [];
  const matches = name.matchAll(options.rgx.attributeAffix);

  // Extract prefix and name from matches
  for (const match of matches) {
    found.push({ prefix: match[1], name: match[2] });
  }

  const first = found[0];

  // If no matches, return the name as is
  if (!first) return { name };

  found.shift();

  // Construct and return the affixed attribute name object
  return {
    prefix: first.prefix || undefined,
    name: first.name,
    suffix: found.length ? found : undefined,
  };
}
