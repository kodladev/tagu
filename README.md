<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/kodladev/tagu/refs/heads/main/.github/assets/logo-dark.svg">
    <img alt="tagu logo" src="https://raw.githubusercontent.com/kodladev/tagu/refs/heads/main/.github/assets/logo.svg" width="80"/>
  </picture>
</div>

<p align="center">
  <br/>
  A small HTML parser that understands template syntax.
  <br/><br/>
</p>

<div align="center">

[![test](https://github.com/kodladev/tagu/actions/workflows/test.yaml/badge.svg?branch=main)][TEST]
&nbsp;[![npm](https://img.shields.io/npm/v/tagu.svg)][PACKAGE]
&nbsp;[![shaking](https://img.shields.io/badge/tree%20shakeable-blue?color=gray&logo=gumtree&logoColor=72ef36)][SIZE]

</div>

## Install

```shell
npm i tagu
```

## Usage

```js
import { astToHtml, htmlToAst, visit } from 'tagu';

const ast = htmlToAst('<button on:click={() => count++} disabled>Save</button>');

ast.children[0].attributes[0].value; //=> '{() => count++}'

visit(ast, {
  Element(node) {
    node.name = 'a';
  },
});

astToHtml(ast); //=> '<a on:click={() => count++} disabled>Save</a>'
```

- **Template syntax.** A `>` inside braces does not end the tag: `:x={a > b}`, `{...rest}`.
- **Attribute parts.** Ask for it and `on:click|once` is split into `on`, `:click` and `|once`.
- **Real pages.** Tags left open, scripts, styles and comments are read as browsers read them.
- **Written back as written.** Quotes, `<br>` or `<br/>` and missing end tags stay as they were.
- **Plain objects.** Log the tree, copy it, save it as JSON.
- **About 5 kB.** Minified and gzipped, dependencies included.

## Documentation

Visit our [documentation][DOCUMENTATION] for options, node types and recipes.

## Benchmark

Speed, memory, size and what each one reads, measured next to other parsers. See the [results][BENCHMARK].

```shell
npm run bench
```

---

<details>
<summary>Release Notes</summary>

All notable changes to this project will be documented in the [changelog][CHANGELOG].

</details>

<details>
<summary>License</summary>

[MIT][LICENSE]

</details>

<br/>

<div align="center">
  <a href="https://kodla.net">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/kodladev/tagu/refs/heads/main/.github/assets/kodla-dark.svg">
      <img alt="Kodla" src="https://raw.githubusercontent.com/kodladev/tagu/refs/heads/main/.github/assets/kodla.svg" width="110"/>
    </picture>
  </a>
  <br/>
  <sub>tagu is part of Kodla's open source tools.</sub>
</div>

[TEST]: https://github.com/kodladev/tagu/actions/workflows/test.yaml
[PACKAGE]: https://www.npmjs.com/package/tagu
[SIZE]: https://bundlephobia.com/package/tagu
[LICENSE]: https://github.com/kodladev/tagu/blob/main/LICENSE
[CHANGELOG]: https://github.com/kodladev/tagu/blob/main/CHANGELOG.md
[DOCUMENTATION]: https://github.com/kodladev/tagu/tree/main/docs
[BENCHMARK]: https://github.com/kodladev/tagu/tree/main/bench
