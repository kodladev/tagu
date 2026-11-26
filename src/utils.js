import { merge, mergeDeep } from 'uty/collect';
import { isEmpty, isNil } from 'uty/is';

/**
 * Array containing names of HTML void tags.
 * @type {string[]}
 */
// prettier-multiline-arrays-next-line-pattern: 7
export const HTML_VOID_TAGS = [
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'source',
  'track',
  'wbr',
];

/**
 * The name of the HTML <template> tag
 * @type {string}
 */
const HTML_TEMPLATE_TAG = 'template';

/**
 * Array containing names of HTML raw text tags
 * @type {string[]}
 */
const HTML_RAW_TEXT_TAGS = ['script', 'style'];

/**
 * Array containing names of HTML escapable raw text tags
 * @type {string[]}
 */
export const HTML_ESCAPABLE_RAW_TEXT_TAGS = ['textarea', 'title'];

/**
 * Array containing names of HTML special tags
 * @type {string[]}
 */
const HTML_SPECIAL_TAGS = [
  HTML_TEMPLATE_TAG,
  ...HTML_RAW_TEXT_TAGS,
  ...HTML_ESCAPABLE_RAW_TEXT_TAGS,
];

/**
 * A string inside braces: double quoted, single quoted or a template literal, with escapes.
 * A `}` or `>` inside it is text, not markup.
 * @type {string}
 */
const SRC_STRING = '"(?:[^"\\\\]|\\\\.)*"|\'(?:[^\'\\\\]|\\\\.)*\'|`(?:[^`\\\\]|\\\\.)*`';

/**
 * A run of braces, as source for a pattern: `{a}`, `{() => { a > b }}`, `{a ? "}" : ">"}`.
 * Inside are strings, any other character, or another run of braces. A pattern cannot count
 * without limit, so the nesting is written out four levels deep.
 * @type {string}
 */
const SRC_BRACES = (() => {
  const inside = SRC_STRING + '|[^{}"\'`]';
  let braces = `{(?:${inside})*}`;
  for (let level = 1; level < 4; level++) braces = `{(?:${inside}|${braces})*}`;
  return braces;
})();

/**
 * What a tag holds between its name and its `>`, as source for a pattern: quoted values and
 * runs of braces go by whole, so a `>` inside them does not end the tag.
 * @type {string}
 */
const SRC_TAG_BODY = `(?:"[^"]*"|'[^']*'|${SRC_BRACES}|[^'"}>])*`;

/**
 * Matches one attribute of a tag: the name once, then one of the ways a value is written:
 * `"double"`, `'single'`, `{braces}`, unquoted, or no value. Whitespace may surround the `=`.
 * @type {RegExp}
 */
export const RGX_HTML_TAG_ATTRIBUTES = new RegExp(
  `([^\\s"'=<>/]+)(?:\\s*=\\s*(?:"([^"]*)"|'([^']*)'|(${SRC_BRACES})|(?!["'{])([^\\s>]*)))?`,
  'g'
);

/**
 * Regular expression pattern to match the first tag in HTML content.
 * @type {RegExp}
 */
export const RGX_HTML_FIRST_TAG = new RegExp(`<(?:/|)[a-zA-Z]${SRC_TAG_BODY}>`);

/**
 * Tags that may be left open in HTML, keyed by the tag whose start closes them:
 * `<li>one<li>two` closes the first `li` when the second starts.
 * @type {Object<string, string[]>}
 */
const HTML_IMPLIED_END_TAGS = {
  li: ['li'],
  dt: ['dt', 'dd'],
  dd: ['dt', 'dd'],
  option: ['option'],
  optgroup: ['option', 'optgroup'],
  td: ['td', 'th'],
  th: ['td', 'th'],
  tr: ['td', 'th', 'tr'],
  thead: ['td', 'th', 'tr', 'thead', 'tbody', 'tfoot'],
  tbody: ['td', 'th', 'tr', 'thead', 'tbody', 'tfoot'],
  tfoot: ['td', 'th', 'tr', 'thead', 'tbody', 'tfoot'],
  rt: ['rt', 'rp'],
  rp: ['rt', 'rp'],
};

// A paragraph ends when any of these block-level tags starts.
const HTML_PARAGRAPH_ENDERS =
  'address article aside blockquote details div dl fieldset figcaption figure footer form ' +
  'h1 h2 h3 h4 h5 h6 header hgroup hr main menu nav ol p pre section table ul';

for (const name of HTML_PARAGRAPH_ENDERS.split(' ')) {
  HTML_IMPLIED_END_TAGS[name] = ['p'];
}

/**
 * The start of an HTML comment.
 * @type {string}
 */
export const commentStart = '<!--';

/**
 * Matches a doctype declaration; captures the keyword as written and what follows it.
 * @type {RegExp}
 */
export const RGX_HTML_DOCTYPE = /^<!(doctype)\s*([^>]*?)\s*>$/i;

/**
 * The end of an HTML comment.
 * @type {string}
 */
export const commentEnd = '-->';

/**
 * Lists the special tags the given options ask for, without building the whole options.
 * @param {Object} options - The options given to `htmlToAst`.
 * @returns {string[]}
 */
export function specialTags(options) {
  return [...(options.tags?.special ?? HTML_SPECIAL_TAGS), ...(options.tags?.addSpecial ?? [])];
}

/**
 * Function to generate options for HTML parsing.
 * @param {Object} options - Options object.
 * @returns {Object} - Merged options object.
 */
export function parseHtmlOptions(opts) {
  // Nothing asked for: the defaults are built once and handed out again.
  if (isEmpty(opts)) return (DEFAULT_OPTIONS ??= buildHtmlOptions({}));
  return buildHtmlOptions(opts);
}

/** @type {Object|undefined} The options for a call that passes none. */
let DEFAULT_OPTIONS;

/**
 * Builds the options `parseHtmlOptions` hands out.
 * @param {Object} opts - Options object.
 * @returns {Object} - Merged options object.
 */
function buildHtmlOptions(opts) {
  // Default options
  let options = {
    tags: {
      void: HTML_VOID_TAGS, // HTML void tags
      special: HTML_SPECIAL_TAGS, // HTML special tags,
      addSpecial: [], // Additional special tags to add
      implied: HTML_IMPLIED_END_TAGS, // Tags that close an open tag when they start; false turns it off
    },
    rgx: {
      tags: undefined, // Regular expression for HTML tags
      special: undefined, // Regular expression for special elements raw content
      attributeAffix: undefined, // Regular expression for attribute affixes
      checkAttrAffix: undefined, // Regular expression to check attribute affixes
    },
    attribute: {
      affix: false, // Flag to determine whether to affix attribute names parse
      affixList: [':', '@', '\\|', '\\*', '#', '\\^'], // List of attribute affixes
      addAffix: [], // Additional attribute affixes to add
    },
    transform: {
      whitespace: true, // Flag to preserve or remove whitespace in parsed HTML
      trim: false, // Flag to trim whitespace from tag content
      entities: false, // A function that decodes entities in text and attribute values, e.g. decodeEntities
    },
    position: {
      index: false, // Flag to include index positions.
      loc: false, // Flag to include line and column positions.
    },
  };

  // Merge provided options with default options (user values win)
  options = mergeDeep(opts, options);
  const tags = options.tags;
  const rgx = options.rgx;
  const attr = options.attribute;

  // Merge additional special tags with the special tags list
  if (!isEmpty(tags.addSpecial)) {
    tags.special = merge(tags.addSpecial, tags.special);
  }

  // Merge additional attribute affixes with the affix list
  if (!isEmpty(attr.addAffix)) {
    attr.affixList = merge(attr.addAffix, attr.affixList);
  }

  // If regular expression for HTML tags is not provided, generate it
  if (isNil(rgx.tags)) {
    options.rgx = generateRgxHtml(tags.special, attr.affixList);
  }

  // Comments are kept raw like special tags; a new array so the shared default list never grows
  tags.special = [...tags.special, '!--'];

  // Every tag asks "is this name void, is it special"; a Set answers without walking a list.
  options.set = { void: new Set(tags.void), special: new Set(tags.special) };

  // Return merged options
  return options;
}

/**
 * The patterns already built, by the tag and affix lists they were built from.
 * @type {Map<string, Object>}
 */
const RGX_HTML_CACHE = new Map();

/**
 * Function to generate regular expressions for HTML tags and special elements.
 * @param {string[]} tags - Array of HTML tags.
 * @param {string[]} affixList - Array of affix attribute.
 * @returns {Object} - Object containing regular expressions for tags and special elements.
 */
export function generateRgxHtml(tags, affixList) {
  // The same lists always give the same patterns, so they are built once and reused.
  const key = tags.join('|') + ' ' + affixList.join('|');
  let made = RGX_HTML_CACHE.get(key);
  if (!made) RGX_HTML_CACHE.set(key, (made = buildRgxHtml(tags, affixList)));
  return made;
}

/**
 * Builds the patterns `generateRgxHtml` hands out.
 * @param {string[]} tags - Array of HTML tags.
 * @param {string[]} affixList - Array of affix attribute.
 * @returns {Object} - Object containing regular expressions for tags and special elements.
 */
function buildRgxHtml(tags, affixList) {
  // OR operator
  tags = tags.join('|');

  // Regular expression pattern to match raw content within HTML special elements.
  const rgxTags = `(?:(?:<!--[\\s\\S]*?-->)|(?:<![a-zA-Z][^>]*>)|(?:<(${tags})(?![\\w-])${SRC_TAG_BODY}>[^]*?</(\\1)>)|(?:<(?:/|)(?!(${tags})(?![\\w-]))[a-zA-Z]${SRC_TAG_BODY}>))`;

  // Regular expression pattern to match raw content within HTML special elements.
  const rgxSpecial = `(?:<(?<e>${tags})(?![\\w-])${SRC_TAG_BODY}>(?<raw>[^]*?)<\\/(\\k<e>)>)`;

  const attributeAffix = `((?:${affixList.join('|')})?)([a-zA-Z0-9_\\-]+)`;
  const checkAttrAffix = `[${affixList.join('')}]`;

  const rgx = e => new RegExp(e, 'g');

  // Return an object containing regular expressions
  return {
    tags: rgx(rgxTags),
    special: rgx(rgxSpecial),
    attributeAffix: rgx(attributeAffix),
    checkAttrAffix: new RegExp(checkAttrAffix),
  };
}
