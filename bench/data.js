/**
  Benchmark Data
  --------------------------------------------------------------------------------------------------
  Shared inputs for the benchmarks. Three kinds of document are measured: a generated page that
  is always there, a template file with brace syntax, and real pages downloaded on demand with
  `npm run bench:fetch` (they are not kept in the repository).
  --------------------------------------------------------------------------------------------------
*/

import { existsSync, readdirSync, readFileSync } from 'node:fs';

/** Options shared by every case: a short sampling window keeps the whole run short. */
export const options = { time: 300 };

/** Where the downloaded pages live. */
export const pagesDir = new URL('./pages/', import.meta.url);

/** A component template: braces in attributes and text, shorthand, affixes, unquoted values. */
export const template = readFileSync(new URL('./data/template.html', import.meta.url), 'utf8');

/**
 * A page built here, so the benchmarks run without a download: a table of 2,000 rows with
 * attributes, entities, comments, a script and a list whose items are left open.
 */
export const generated = [
  '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>Orders &amp; returns</title>',
  '<script>window.rows = 2000; if (window.rows < 1) console.log("</table>");</script>\n</head>\n<body>',
  '<!-- generated for the benchmark -->\n<ul class=menu>',
  ...Array.from({ length: 40 }, (_, i) => `<li><a href="/page/${i}" data-n=${i}>Page ${i}</a>`),
  '</ul>\n<table id="orders" class="table table-striped">\n<tbody>',
  ...Array.from(
    { length: 2000 },
    (_, i) =>
      `<tr class="row ${i % 2 ? 'odd' : 'even'}" data-id="${i}"><td>${i}</td>` +
      `<td><a href="/order/${i}?a=1&amp;b=2" title='Order ${i}'>Order &#35;${i}</a></td>` +
      `<td class="price">${(i * 1.5).toFixed(2)}&nbsp;&euro;</td>` +
      `<td><input type="checkbox" name="pick" value="${i}"${i % 3 ? '' : ' checked'}><br></td></tr>`
  ),
  '</tbody>\n</table>\n</body>\n</html>\n',
].join('\n');

/**
 * The documents to measure, by name: the generated page, then every downloaded page.
 * @returns {Array<[string, string]>}
 */
export function documents() {
  const list = [['generated page', generated]];
  if (existsSync(pagesDir)) {
    for (const file of readdirSync(pagesDir).sort()) {
      if (file.endsWith('.html')) list.push([file, readFileSync(new URL(file, pagesDir), 'utf8')]);
    }
  }
  return list;
}

/**
 * Formats a size in bytes for a label.
 * @param {string} text - The document.
 * @returns {string}
 */
export function kb(text) {
  return Math.round(Buffer.byteLength(text) / 1024) + ' KB';
}
