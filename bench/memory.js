/**
  Benchmark Memory
  --------------------------------------------------------------------------------------------------
  Measures the heap each parser's trees keep alive. Every parser runs in its own process, so one
  does not pay for another's leftovers: the documents are parsed, the trees are held, the garbage
  collector runs, and the growth of the heap is what the trees cost.
  --------------------------------------------------------------------------------------------------
*/

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { documents, kb } from './data.js';
import { parsers } from './parsers.js';

const ROUNDS = 5;
const name = process.argv[2];

if (name) {
  // Child process: measure one parser and print megabytes per round of documents.
  const parse = parsers[name];
  const list = documents().map(([, html]) => html);
  for (let i = 0; i < 20; i++) for (const html of list) parse(html);
  globalThis.gc();
  globalThis.gc();
  const before = process.memoryUsage().heapUsed;
  const kept = [];
  for (let i = 0; i < ROUNDS; i++) for (const html of list) kept.push(parse(html));
  globalThis.gc();
  globalThis.gc();
  const after = process.memoryUsage().heapUsed;
  console.log(((after - before) / ROUNDS / 1048576).toFixed(1), kept.length);
} else {
  const list = documents();
  console.log(
    `Heap kept by the trees of ${list.length} documents (${kb(list.map(d => d[1]).join(''))})\n`
  );
  for (const parser of Object.keys(parsers)) {
    const run = spawnSync(process.execPath, [
      '--expose-gc',
      fileURLToPath(import.meta.url),
      parser,
    ]);
    const megabytes = run.stdout.toString().split(' ')[0] || 'failed';
    console.log(parser.padEnd(30), megabytes.padStart(6), 'MB');
  }
}
