import { RAW_EMPTY, RAW_WHITESPACE, RGX_WHITESPACE } from 'uty/define';
import { DoctypeNode, DocumentNode, TextNode } from './ast.js';
import { escapeAmbiguous } from './entities.js';
import { parseHtmlTag } from './html-tag.js';
import { addLoc } from './position.js';
import {
  HTML_ESCAPABLE_RAW_TEXT_TAGS,
  HTML_VOID_TAGS,
  RGX_HTML_DOCTYPE,
  commentStart,
  parseHtmlOptions,
  specialTags,
} from './utils.js';

/**
 * Reads HTML into a tree of plain objects.
 *
 * Braces in a tag are read as a whole (`:x={a > b}`, `{...rest}`), tags left open are closed
 * where HTML closes them, and the content of `script`, `style` and the other special tags is
 * kept as text. Text and attribute values stay as written unless `transform.entities` is set.
 *
 * @example
 * htmlToAst('<h1 id="title">Hello</h1>').children[0].name; //=> 'h1'
 *
 * @param {string} program - The HTML to read.
 * @param {Object} [options] - Options: `tags`, `attribute`, `transform`, `position`.
 * @returns {Object} - The document node; its `children` are the top-level nodes.
 */
export function htmlToAst(program, options = {}) {
  // Merge the provided options with default options
  options = parseHtmlOptions(options);

  const ast = [];
  // The elements that are open right now, outermost first; `level` is the innermost one.
  const tree = [];
  let level = -1;
  // Everything before this index is already in the tree.
  let cursor = 0;

  const end = program.length;
  const { whitespace, trim } = options.transform;
  const needIndex = options.position.index;
  const needLoc = options.position.loc;
  const needPosition = needIndex || needLoc;
  options.need = { position: needPosition };

  /**
   * Returns the list new nodes go into: the open element's children, or the root.
   * @returns {Array}
   */
  function parent() {
    return level < 0 ? ast : tree[level].children;
  }

  /**
   * Gives a node its place in the source when positions are asked for.
   * @param {Object} node - The node.
   * @param {number} start - Index the node starts at.
   * @param {number} stop - Index right after the node.
   * @returns {Object} - The same node.
   */
  function place(node, start, stop) {
    if (needPosition) {
      node.start = start;
      node.end = stop;
    }
    return node;
  }

  /**
   * Adds what lies between the last tag and `to` as text. Whatever the tag pattern does not
   * match is text, so nothing in the source is dropped: `a < b`, `1<2`, a lone `<`.
   * @param {number} to - Index the text ends at.
   */
  function text(to) {
    if (to <= cursor) return;
    let content = program.slice(cursor, to);
    const blank = RGX_WHITESPACE.test(content);
    if (whitespace) {
      if (trim && !blank) content = content.trim();
    } else {
      if (blank) return;
      if (trim) content = content.trim();
      content = content.replaceAll('\n', RAW_EMPTY);
    }
    parent().push(place(TextNode(content), cursor, to));
  }

  /**
   * Closes the innermost open element.
   * @param {number} stop - Index the element ends at.
   * @param {boolean} [written] - Whether its end tag is in the source; when it is not, the
   * element is noted as `endTag: false`.
   */
  function close(stop, written) {
    const element = tree[level];
    if (needPosition) element.end = stop;
    if (!written) element.endTag = false;
    // A list filled by `push` holds room for many more items than it has; now that the element
    // is complete, an exact copy gives that room back.
    if (element.children.length > 0) element.children = element.children.slice();
    level--;
  }

  // Walk the tags in order; the text between two tags belongs to whatever is open then.
  const tags = options.rgx.tags;
  tags.lastIndex = 0;
  for (let match; (match = tags.exec(program));) {
    const tag = match[0];
    const index = match.index;
    const after = index + tag.length;

    text(index);
    cursor = after;
    if (needPosition) options.index = { start: index };

    // A comment, or a tag whose content is kept raw (script, style, template, textarea, …):
    // the pattern captured its name in the first group.
    if (match[1] !== undefined || tag.startsWith(commentStart)) {
      parent().push(place(parseHtmlTag(tag, options), index, after));
      continue;
    }

    // A declaration (`<!DOCTYPE html>`): keep the doctype, ignore any other kind.
    if (tag.charAt(1) === '!') {
      const doctype = RGX_HTML_DOCTYPE.exec(tag);
      if (doctype) parent().push(place(DoctypeNode(doctype[2], doctype[1]), index, after));
      continue;
    }

    // A closing tag closes the nearest open element with its name, and the open ones inside
    // it. One that matches nothing open is ignored.
    if (tag.charAt(1) === '/') {
      const name = tag.slice(2, -1).trim();
      let open = level;
      while (open > -1 && tree[open].name !== name) open--;
      if (open > -1) {
        while (level > open) close(index);
        close(after, true);
      }
      continue;
    }

    const element = parseHtmlTag(tag, options);

    // Close the open tags this one ends: `<li>one<li>two`, `<p>one<div>two`.
    const implied = options.tags.implied;
    const name = element.name.toLowerCase();
    if (implied && Object.hasOwn(implied, name)) {
      while (level > -1 && implied[name].includes(tree[level].name.toLowerCase())) close(index);
    }

    parent().push(place(element, index, after));
    if (!element.voidElement) tree[++level] = element;
  }

  // The text after the last tag, then whatever was never closed ends with the source.
  text(end);
  while (level > -1) close(end);

  // Decode entities once the tree is built, so the positions still point into the source.
  // The decoder is handed in, so its entity table is only bundled by those who use it.
  const entities = options.transform.entities;
  if (entities) {
    if (typeof entities !== 'function') {
      throw new TypeError('tagu: transform.entities takes a function, such as decodeEntities');
    }
    decodeTree(ast, entities, options.tags.special);
  }

  const document = place(DocumentNode(ast.slice()), 0, end);

  // Lines and columns come from the indexes, in one pass over the finished tree.
  if (needLoc) addLoc(document, program, needIndex);
  return document;
}

/**
 * Tells whether the content of an element is raw text that entities do not apply to.
 * `title` and `textarea` are special tags too, but entities do work inside them.
 *
 * @param {string} name - The element name.
 * @param {string[]} special - The special tags in use.
 * @returns {boolean}
 */
function isRawText(name, special) {
  return special.includes(name) && !HTML_ESCAPABLE_RAW_TEXT_TAGS.includes(name);
}

/**
 * Decodes the entities of every text node and attribute value in place.
 * Raw text (`script`, `style`, …), comments and values written in braces are left alone.
 *
 * @param {Array} nodes - The nodes to go through.
 * @param {Function} decode - The function that decodes one string.
 * @param {string[]} special - The special tags in use.
 */
function decodeTree(nodes, decode, special) {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.type === 'Text') {
      // Most text holds no entity; only the rest is handed to the decoder.
      if (node.content.includes('&')) node.content = decode(node.content);
    } else if (node.type === 'Element') {
      const attributes = node.attributes;
      for (let j = 0; j < attributes.length; j++) {
        const attr = attributes[j];
        const value = attr.value;
        if (value !== undefined && !attr.brace && value.includes('&')) attr.value = decode(value);
      }
      if (node.children.length > 0 && !isRawText(node.name, special)) {
        decodeTree(node.children, decode, special);
      }
    }
  }
}

/**
 * Converts an abstract syntax tree (AST) back to an HTML string representation.
 *
 * The tree is written the way the source was: quotes, `<br>` or `<br/>`, end tags left out and
 * the doctype keyword all come back as they were noted while parsing. With `normalize: true`
 * the corrected form is written instead: double quotes, `/>` on void tags, every end tag,
 * `DOCTYPE`. Either way the output comes from the tree, so a changed node is written changed.
 * Only the whitespace inside a tag is not kept.
 *
 * Pass the options the tree was parsed with. When `transform.entities` decoded the tree, text
 * and attribute values get the least escaping that keeps their meaning when parsed again.
 *
 * @param {Object} ast - The AST structure to be converted.
 * @param {Object} [options] - The options given to `htmlToAst`, plus `normalize`.
 * @param {boolean} [options.normalize] - Write the corrected form, not the form as written.
 * @returns {string} - A string containing the HTML representation.
 */
export function astToHtml(ast, options = {}) {
  return write(ast, {
    normalize: options.normalize === true,
    // The special tags in use; set only when text gets escaped.
    special: options.transform?.entities ? specialTags(options) : undefined,
    // The tags that need no `/` to be void.
    void: options.tags?.void ? new Set(options.tags.void) : VOID,
  });
}

const VOID = new Set(HTML_VOID_TAGS);

/**
 * Writes one node and everything inside it.
 *
 * @param {Object} node - The node to write.
 * @param {Object} how - The settings from `astToHtml`.
 * @param {boolean} [raw] - Whether the node sits in raw text (`script`, `style`), never escaped.
 * @returns {string} - The node as HTML.
 */
function write(node, how, raw) {
  switch (node.type) {
    case 'Text':
      return how.special && !raw ? escapeAmbiguous(node.content) : node.content;
    case 'Element': {
      let html = '<' + node.name;
      const attributes = node.attributes;
      if (attributes) {
        for (let i = 0; i < attributes.length; i++) html += writeAttribute(attributes[i], how);
      }
      if (node.voidElement) {
        // `<br>` may stand as it is; anything else that is void needs the slash (`<Foo/>`).
        const bare = !how.normalize && !node.selfClosing && how.void.has(node.name);
        return html + (bare ? '>' : '/>');
      }
      html += '>';
      const inside = how.special !== undefined && isRawText(node.name, how.special);
      const children = node.children;
      for (let i = 0; i < children.length; i++) html += write(children[i], how, inside);
      // An end tag that was left out in the source stays left out.
      return node.endTag === false && !how.normalize ? html : html + '</' + node.name + '>';
    }
    case 'Document': {
      let html = RAW_EMPTY;
      const children = node.children;
      for (let i = 0; i < children.length; i++) html += write(children[i], how, raw);
      return html;
    }
    case 'Comment':
      return '<!--' + node.content + '-->';
    case 'Doctype': {
      const keyword = how.normalize ? 'DOCTYPE' : (node.keyword ?? 'DOCTYPE');
      return '<!' + keyword + (node.content ? RAW_WHITESPACE + node.content : RAW_EMPTY) + '>';
    }
    default:
      // An unknown node type adds nothing.
      return RAW_EMPTY;
  }
}

/**
 * Matches what a value may not contain to be written without quotes.
 * @type {RegExp}
 */
const RGX_NEEDS_QUOTES = /[\s"'=<>`]/;

/**
 * Writes one attribute, with the space that comes before it.
 *
 * @param {Object} attr - The attribute node.
 * @param {Object} how - The settings from `astToHtml`.
 * @returns {string} - The attribute as HTML.
 */
function writeAttribute(attr, how) {
  // Build the full name from prefix, name and suffixes without touching the AST.
  let name = attr.prefix === undefined ? attr.name : attr.prefix + attr.name;
  const suffix = attr.suffix;
  if (suffix !== undefined) {
    for (let i = 0; i < suffix.length; i++) name += suffix[i].prefix + suffix[i].name;
  }

  // An attribute without a value is written as its name alone: `disabled`.
  let value = attr.value;
  if (value === undefined) return RAW_WHITESPACE + name;

  // A value written in braces goes back as written: `{a}` for the shorthand, else `x={a}`.
  if (attr.brace) return RAW_WHITESPACE + (value === '{' + name + '}' ? value : name + '=' + value);

  if (how.special !== undefined) value = escapeAmbiguous(value);

  // The way it was written, as long as the value still allows it.
  if (!how.normalize) {
    if (attr.quote === RAW_EMPTY && value !== RAW_EMPTY && !RGX_NEEDS_QUOTES.test(value)) {
      return RAW_WHITESPACE + name + '=' + value;
    }
    if (attr.quote === "'" && !value.includes("'"))
      return RAW_WHITESPACE + name + "='" + value + "'";
  }

  // Double quotes; a value holding them is written in single quotes, one holding both escaped.
  if (!value.includes('"')) return RAW_WHITESPACE + name + '="' + value + '"';
  if (!value.includes("'")) return RAW_WHITESPACE + name + "='" + value + "'";
  return RAW_WHITESPACE + name + '="' + value.replaceAll('"', '&quot;') + '"';
}
