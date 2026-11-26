/**
 * Creates and returns a DocumentNode object.
 * @param {Array} children
 * @returns {Object}
 */
export function DocumentNode(children = []) {
  return { type: 'Document', children };
}

/**
 * Creates and returns a textNode object.
 * @param {string} text
 * @returns {Object}
 */
export function TextNode(content) {
  return { type: 'Text', content };
}

/**
 * Creates and returns a commentNode object.
 * @param {string} content
 * @returns {Object}
 */
export function CommentNode(content) {
  return { type: 'Comment', content };
}

/**
 * Creates and returns a doctypeNode object.
 * @param {string} content - What follows the `DOCTYPE` keyword, e.g. `html`.
 * @param {string} [keyword] - The keyword as written, e.g. `doctype`.
 * @returns {Object}
 */
export function DoctypeNode(content, keyword) {
  const node = { type: 'Doctype', content };
  // The keyword is noted only when it was not written the usual way, as `DOCTYPE`.
  if (keyword !== undefined && keyword !== 'DOCTYPE') node.keyword = keyword;
  return node;
}

/**
 * Creates and returns a elementNode object.
 * @param {string} text
 * @param {boolean} voidElement
 * @param {Array} attributes
 * @param {Array} children
 * @returns {Object}
 */
export function ElementNode(name = '', voidElement = false, attributes = [], children = []) {
  return { type: 'Element', name, voidElement, attributes, children };
}

/**
 * Creates and returns an attributeNode object.
 * @param {string} name
 * @param {string} value
 * @param {string} [prefix]
 * @param {Array} [suffix]
 * @param {boolean} [brace] - `true` when the value was written in braces (`x={a}`, `{a}`), not quotes.
 * @returns {Object}
 */
export function AttributeNode(name, value, prefix, suffix, brace) {
  return { type: 'Attribute', prefix, name, suffix, value, brace };
}
