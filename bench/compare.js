/**
  Benchmark Compare
  --------------------------------------------------------------------------------------------------
  Tells whether a change made the parser faster or slower. It measures the `src` folder as it is
  now against an earlier one, taking turns in a single process, so both meet the same machine
  state and the same garbage collector. Two separate benchmark runs cannot promise that.

    npm run bench:compare              against the last commit
    npm run bench:compare -- v0.1.0    against a tag, a branch or a commit
    npm run bench:compare -- ../old    against a folder that holds a `src`
  --------------------------------------------------------------------------------------------------
*/

import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { documents, kb, template } from './data.js';

const root = fileURLToPath(new URL('..', import.meta.url));
// The earlier `src` is copied inside the package, so its imports resolve like the current one's.
const copy = join(root, 'bench', '.compare');
const target = process.argv[2] ?? 'HEAD';
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });

rmSync(copy, { recursive: true, force: true });
if (existsSync(join(target, 'src'))) {
  cpSync(join(target, 'src'), join(copy, 'src'), { recursive: true });
} else {
  // Inside a larger repository the package sits under a prefix; `git show` wants the full path.
  const prefix = git('rev-parse', '--show-prefix').trim();
  const files = git('ls-tree', '-r', '--name-only', target, '--', 'src')
    .split('\n')
    .filter(Boolean);
  if (files.length === 0) throw new Error(`no src folder found at "${target}"`);
  for (const file of files) {
    const path = join(copy, file);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, git('show', `${target}:${prefix}${file}`));
  }
}

const before = await import(pathToFileURL(join(copy, 'src', 'index.js')));
const now = await import('../src/index.js');

const median = times => times.sort((a, b) => a - b)[times.length >> 1];
const list = [...documents(), ['component template', template]];

// Warm both up on every document before any timing.
for (let i = 0; i < 60; i++) {
  for (const [, html] of list) {
    before.htmlToAst(html);
    now.htmlToAst(html);
  }
}

console.log(`now against ${target}\n`);
console.log(
  'document'.padEnd(34) + 'before'.padStart(11) + 'now'.padStart(11) + 'change'.padStart(9)
);
for (const [name, html] of list) {
  // A small document is parsed many times per sample, so the clock has something to measure.
  const repeat = Math.max(1, Math.round(20000 / html.length));
  const times = { before: [], now: [] };
  for (let round = 0; round < 150; round++) {
    // Swap who goes first every round.
    for (const side of round % 2 ? ['before', 'now'] : ['now', 'before']) {
      const parse = side === 'now' ? now.htmlToAst : before.htmlToAst;
      const start = performance.now();
      for (let i = 0; i < repeat; i++) parse(html);
      times[side].push((performance.now() - start) / repeat);
    }
  }
  const a = median(times.before);
  const b = median(times.now);
  const change = ((b / a - 1) * 100).toFixed(0);
  console.log(
    `${name} (${kb(html)})`.padEnd(34) +
      (a.toFixed(3) + ' ms').padStart(11) +
      (b.toFixed(3) + ' ms').padStart(11) +
      ((change > 0 ? '+' : '') + change + '%').padStart(9)
  );
}
console.log('\nA change of a few percent either way is noise; run it again before trusting it.');
