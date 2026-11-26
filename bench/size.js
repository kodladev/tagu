/**
  Benchmark Size
  --------------------------------------------------------------------------------------------------
  Prints what each parser adds to an application: the bytes left after a bundler has dropped
  the unused code and minified the rest, then gzip. Every package is measured the same way,
  importing only what the job needs, with its own dependencies bundled in.
  --------------------------------------------------------------------------------------------------
*/

import { build } from 'esbuild';
import { gzipSync } from 'node:zlib';

const root = new URL('..', import.meta.url).pathname;

/** What is measured: a label and the import an application would write. */
const entries = [
  ['tagu: parse', `export { htmlToAst } from './src/index.js'`],
  ['tagu: parse, write, visit', `export { htmlToAst, astToHtml, visit } from './src/index.js'`],
  ['tagu: everything', `export * from './src/index.js'`],
  ['ultrahtml: parse', `export { parse } from 'ultrahtml'`],
  [
    'himalaya: parse, write',
    `import himalaya from 'himalaya'; export const a = [himalaya.parse, himalaya.stringify]`,
  ],
  ['@lukeed/html: parse, write', `export { parse, stringify } from '@lukeed/html'`],
  ['@lukeed/html/mutable', `export { parse, stringify } from '@lukeed/html/mutable'`],
  ['htmlparser2: parse', `export { parseDocument } from 'htmlparser2'`],
  ['parse5: parse, write', `export { parse, serialize } from 'parse5'`],
  ['node-html-parser: parse', `export { parse } from 'node-html-parser'`],
];

console.log('package'.padEnd(30) + 'minified'.padStart(11) + 'gzip'.padStart(11));
for (const [label, contents] of entries) {
  const result = await build({
    stdin: { contents, resolveDir: root },
    bundle: true,
    minify: true,
    format: 'esm',
    write: false,
    logLevel: 'silent',
  });
  const code = result.outputFiles[0].contents;
  const kb = bytes => (bytes / 1024).toFixed(1) + ' kB';
  console.log(
    label.padEnd(30) +
      kb(code.length).padStart(11) +
      kb(gzipSync(code, { level: 9 }).length).padStart(11)
  );
}
