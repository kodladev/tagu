import { createBundle } from 'dts-buddy';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('.', import.meta.url));
const pkg = JSON.parse(fs.readFileSync(`${dir}/package.json`, 'utf-8'));

await createBundle({
  project: 'jsconfig.json',
  output: `${dir}/type/index.d.ts`,
  compilerOptions: {
    strict: true,
  },
  modules: {
    [pkg.name]: `${dir}/src/index.js`,
  },
});
