/**
  Benchmark Pages
  --------------------------------------------------------------------------------------------------
  Downloads the real pages the benchmarks measure into `bench/pages/`. The pages belong to
  their sites, so they are fetched on demand and never kept in the repository. They change over
  time; compare numbers taken from the same download.
  --------------------------------------------------------------------------------------------------
*/

import { mkdirSync, writeFileSync } from 'node:fs';
import { pagesDir } from './data.js';

const pages = {
  'hacker-news': 'https://news.ycombinator.com/',
  'svelte-docs': 'https://svelte.dev/docs/svelte/overview',
  'html-spec-syntax': 'https://www.w3.org/TR/2011/WD-html5-20110405/syntax.html',
  'mdn-p-element': 'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/p',
  'github-repository': 'https://github.com/sveltejs/svelte',
  'wikipedia-html': 'https://en.wikipedia.org/wiki/HTML',
};

mkdirSync(pagesDir, { recursive: true });

for (const [name, url] of Object.entries(pages)) {
  try {
    const response = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (benchmark)' } });
    if (!response.ok) throw new Error('status ' + response.status);
    const html = await response.text();
    writeFileSync(new URL(name + '.html', pagesDir), html);
    console.log(name.padEnd(20), Math.round(html.length / 1024) + ' KB');
  } catch (error) {
    console.warn(name.padEnd(20), 'skipped:', error.message);
  }
}
