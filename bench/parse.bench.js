import { bench, describe } from 'vitest';
import { documents, kb, options } from './data.js';
import { parsers } from './parsers.js';

for (const [name, html] of documents()) {
  describe(`parse: ${name} (${kb(html)})`, () => {
    for (const [parser, parse] of Object.entries(parsers))
      bench(parser, () => parse(html), options);
  });
}
