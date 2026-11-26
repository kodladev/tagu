import { bench, describe } from 'vitest';
import { documents, kb, options } from './data.js';
import { finish, writers } from './parsers.js';

for (const [name, html] of documents()) {
  describe(`parse and write back: ${name} (${kb(html)})`, () => {
    for (const [parser, write] of Object.entries(writers)) {
      bench(parser, () => finish(write(html)), options);
    }
  });
}
