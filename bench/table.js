/**
  Benchmark Table
  --------------------------------------------------------------------------------------------------
  Prints the table shown in the README. `npm run bench` measures one parser after another, so the
  one that goes first is timed before the engine has warmed up. Here every parser is warmed up
  first, then they take turns, and the order shifts every round. Each of three rounds gives a
  median per parser; the table shows the mean of the three.

    npm run bench:table                       the Wikipedia page from bench/pages
    npm run bench:table -- generated          a document by name
  --------------------------------------------------------------------------------------------------
*/

import { documents, kb } from './data.js';
import { finish, parsers, writers } from './parsers.js';

const ROUNDS = 3;
const SAMPLES = 40;

const wanted = process.argv[2] ?? 'wikipedia';
const [name, html] = documents().find(([title]) => title.includes(wanted)) ?? documents()[0];

/**
 * Times a set of functions on the document, fairly.
 * @param {Object<string, Function>} jobs - The functions by name.
 * @returns {Object<string, number>} - Milliseconds by name.
 */
function measure(jobs) {
  const names = Object.keys(jobs);
  for (let i = 0; i < 30; i++) for (const job of names) jobs[job](html);

  const medians = Object.fromEntries(names.map(job => [job, []]));
  for (let round = 0; round < ROUNDS; round++) {
    const times = Object.fromEntries(names.map(job => [job, []]));
    for (let sample = 0; sample < SAMPLES; sample++) {
      // Start one further along each time, so nobody is always first.
      for (let i = 0; i < names.length; i++) {
        const job = names[(i + sample) % names.length];
        const start = performance.now();
        jobs[job](html);
        times[job].push(performance.now() - start);
      }
    }
    for (const job of names) medians[job].push(times[job].sort((a, b) => a - b)[SAMPLES >> 1]);
  }
  return Object.fromEntries(
    names.map(job => [job, medians[job].reduce((sum, time) => sum + time, 0) / ROUNDS])
  );
}

const parse = measure(parsers);
const write = measure(
  Object.fromEntries(
    Object.entries(writers).map(([job, fn]) => [job, source => finish(fn(source))])
  )
);

console.log(`${name} (${kb(html)}), milliseconds, mean of ${ROUNDS} medians of ${SAMPLES}\n`);
console.log('| | Parse | Parse and write |');
console.log('| --- | --: | --: |');
for (const job of Object.keys(parse).sort((a, b) => parse[a] - parse[b])) {
  const written = job in write ? write[job].toFixed(2) : '–';
  console.log(`| ${job} | ${parse[job].toFixed(2)} | ${written} |`);
}
