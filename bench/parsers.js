/**
  Benchmark Parsers
  --------------------------------------------------------------------------------------------------
  Every parser does the same job here, so the numbers can be compared.

  The job: turn the whole document into a tree in which every element, every attribute and every
  text is read and its entities are decoded.

  Parsers reach that result in different ways. Some do all of it while parsing. Some put work
  off until a value is read, so every value is read here. Some never decode entities, so their
  tree is decoded here with the same function tagu uses. What each one needs is noted next to it.

  The job is the same; the parsers are not. tagu knows about 85 entity names where the others
  know them all, and keeps names as written. @lukeed/html always records source offsets, most of
  the others link each node to its parent, and parse5 applies every recovery rule of the
  specification. Read small differences as a tie.
  --------------------------------------------------------------------------------------------------
*/

import * as lukeed from '@lukeed/html';
import * as mutable from '@lukeed/html/mutable';
import himalaya from 'himalaya';
import { DomUtils, parseDocument } from 'htmlparser2';
import { parse as nodeHtmlParser } from 'node-html-parser';
import { parse as parse5, serialize } from 'parse5';
import { parse as ultrahtml } from 'ultrahtml';
import { astToHtml, decodeEntities, htmlToAst } from '../src/index.js';

const decode = { transform: { entities: decodeEntities } };

/**
 * Reads every attribute and text of an @lukeed/html tree; both are parsed and decoded on read.
 * @param {Object} node - A node of the tree.
 * @returns {Object} - The same node.
 */
function readLukeed(node) {
  for (const child of node.children ?? []) {
    if (child.attributes) {
      for (const name in child.attributes) void child.attributes[name];
      readLukeed(child);
    } else void child.value;
  }
  return node;
}

/**
 * Reads every attribute and text of a node-html-parser tree; both are parsed and decoded on read.
 * @param {Object} node - A node of the tree.
 * @returns {Object} - The same node.
 */
function readNodeHtmlParser(node) {
  for (const child of node.childNodes) {
    if (child.nodeType === 1) {
      void child.attributes;
      readNodeHtmlParser(child);
    } else void child.text;
  }
  return node;
}

/**
 * Decodes the text and attribute values of a himalaya tree, which keeps them as written.
 * @param {Array} nodes - The nodes of the tree.
 * @returns {Array} - The same nodes.
 */
function decodeHimalaya(nodes) {
  for (const node of nodes) {
    if (node.type === 'text') node.content = decodeEntities(node.content);
    else if (node.type === 'element') {
      for (const attribute of node.attributes) {
        if (attribute.value !== null) attribute.value = decodeEntities(attribute.value);
      }
      if (node.tagName !== 'script' && node.tagName !== 'style') decodeHimalaya(node.children);
    }
  }
  return nodes;
}

/**
 * Decodes the text and attribute values of an ultrahtml tree, which keeps them as written.
 * @param {Object} node - A node of the tree.
 * @returns {Object} - The same node.
 */
function decodeUltrahtml(node) {
  for (const child of node.children ?? []) {
    if (child.type === 2) child.value = decodeEntities(child.value);
    else if (child.type === 1) {
      for (const name in child.attributes)
        child.attributes[name] = decodeEntities(child.attributes[name]);
      if (child.name !== 'script' && child.name !== 'style') decodeUltrahtml(child);
    }
  }
  return node;
}

/** Source to a tree with everything read and decoded. */
export const parsers = {
  // Parses everything; decoding is asked for.
  tagu: html => htmlToAst(html, decode),
  // Parses attributes and text when they are read: all of them are read.
  '@lukeed/html': html => readLukeed(lukeed.parse(html)),
  '@lukeed/html/mutable': html => readLukeed(mutable.parse(html)),
  // Does not decode entities: the tree is decoded afterwards. No error recovery.
  ultrahtml: html => decodeUltrahtml(ultrahtml(html)),
  // Parses and decodes everything.
  htmlparser2: html => parseDocument(html),
  // Parses attributes and decodes text when they are read: all of them are read.
  'node-html-parser': html => readNodeHtmlParser(nodeHtmlParser(html)),
  // Does not decode entities: the tree is decoded afterwards.
  himalaya: html => decodeHimalaya(himalaya.parse(html)),
  // Parses and decodes everything, following the whole HTML specification.
  parse5: html => parse5(html),
};

/**
 * Makes the engine finish building a string. A string put together from many pieces stays a
 * chain of those pieces until something looks inside it; asking for its length does not. Reading
 * one character does, so the cost of writing is counted and not left for whoever uses the result.
 *
 * @param {string} text - The string a writer returned.
 * @returns {number}
 */
export function finish(text) {
  return text.charCodeAt(text.length - 1);
}

/** Source to tree and back to source, each the way its own documentation shows. */
export const writers = {
  // Written from the tree, the way the source was.
  tagu: html => astToHtml(htmlToAst(html)),
  // The source is copied back; nothing is written again.
  '@lukeed/html': html => lukeed.stringify(lukeed.parse(html)),
  // Untouched parts are copied from the source.
  '@lukeed/html/mutable': html => mutable.stringify(mutable.parse(html)),
  // Written from the tree.
  htmlparser2: html => DomUtils.getOuterHTML(parseDocument(html)),
  'node-html-parser': html => nodeHtmlParser(html).toString(),
  // Written from the tree; every quote becomes a single quote.
  himalaya: html => himalaya.stringify(himalaya.parse(html)),
  parse5: html => serialize(parse5(html)),
};
