/**
 * The named entities known by default, as one string of `name` + `character` pairs.
 * Every character is a non-alphanumeric one, so it also marks where a name ends.
 * @type {string}
 */
const NAMED =
  'amp&lt<gt>quot"apos\'nbsp\u00a0shy\u00adensp\u2002emsp\u2003thinsp\u2009zwnj\u200czwj\u200dlrm\u200erlm\u200f' +
  'copy©reg®trade™hellip…mdash—ndash–minus−lsquo‘rsquo’sbquo‚ldquo“rdquo”bdquo„laquo«raquo»' +
  'lsaquo‹rsaquo›bull•middot·prime′Prime″times×divide÷plusmn±ne≠le≤ge≥asymp≈infin∞deg°' +
  'microµpara¶sect§dagger†Dagger‡permil‰euro€pound£yen¥cent¢curren¤larr←rarr→uarr↑darr↓' +
  'harr↔iexcl¡iquest¿frac12½frac14¼frac34¾sup1¹sup2²sup3³ordfªordmºcheck✓';

/**
 * Matches one entity: hexadecimal, decimal or named. The semicolon is required.
 * @type {RegExp}
 */
const RGX_ENTITY = /&(?:#x([0-9a-f]+)|#(\d+)|([a-z][a-z0-9]*));/gi;

/**
 * Matches the characters that would change the markup if written as they are.
 * @type {RegExp}
 */
const RGX_ESCAPE = /[&<>"\u00a0]/g;

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\u00a0': '&nbsp;' };

/**
 * Matches only what would be read back as something else: an `&` that starts an entity and
 * a `<` that starts markup. `a < b && c` has neither, so template code in text is left alone.
 * @type {RegExp}
 */
const RGX_AMBIGUOUS = /&(?=#?\w+;)|<(?=[a-zA-Z/!])/g;

/** @type {Map<string, string>|undefined} */
let named;

/**
 * Decodes the entities in a text: every numeric one (`&#39;`, `&#x27;`) and the common named
 * ones (`&amp;`, `&nbsp;`, `&copy;`, …). Anything it does not know stays as written.
 *
 * @param {string} text - The text to decode.
 * @returns {string} - The decoded text.
 */
export function decodeEntities(text) {
  if (!text.includes('&')) return text;
  named ??= new Map(
    Array.from(NAMED.matchAll(/([a-z0-9]+)([^a-z0-9])/gi), pair => [pair[1], pair[2]])
  );
  return text.replace(RGX_ENTITY, (entity, hex, decimal, name) => {
    if (name) return named.get(name) ?? entity;
    const code = hex ? parseInt(hex, 16) : +decimal;
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity;
  });
}

/**
 * Escapes the characters that would change the markup: `&`, `<`, `>`, `"` and the
 * non-breaking space. It is the way back for text decoded with `decodeEntities`.
 *
 * @param {string} text - The text to escape.
 * @returns {string} - The escaped text.
 */
export function encodeEntities(text) {
  return text.replace(RGX_ESCAPE, character => ESCAPES[character]);
}

/**
 * Escapes the least that keeps decoded text meaning the same when it is parsed again:
 * `&lt;b&gt;` decoded to `<b>` goes back as `&lt;b>`, while `a < b && c` is not touched.
 *
 * @param {string} text - The decoded text.
 * @returns {string} - Text that is safe to write into markup.
 */
export function escapeAmbiguous(text) {
  return text.replace(RGX_AMBIGUOUS, character => ESCAPES[character]);
}
