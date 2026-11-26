# Benchmark

tagu next to other parsers: how fast each one is, how much memory its tree keeps, how large it is in a bundle, and what it reads correctly.

## Speed

A Wikipedia page of 794 kB, in milliseconds, on Node 24 and Apple silicon.

|                      | Parse | Parse and write |
| -------------------- | ----: | --------------: |
| **tagu**             |  4.16 |            6.60 |
| @lukeed/html/mutable |  4.81 |            1.81 |
| ultrahtml            |  6.12 |               – |
| htmlparser2          |  7.01 |           13.62 |
| himalaya             |  9.89 |           12.91 |
| node-html-parser     |  9.90 |            8.79 |
| parse5               | 14.55 |           19.10 |

**Parse** is the same job for every parser: a tree you can change, with every attribute and text read and its entities decoded. A parser that puts work off until a value is read has every value read; one that never decodes entities has its tree decoded afterwards. [`parsers.js`](./parsers.js) shows what each one needs.

**Parse and write** reads the page and writes it back as HTML, each parser its own way. `@lukeed/html` copies the source it did not change, which is why it is far ahead there.

The job is the same; the parsers are not. Read small differences as a tie.

## Memory

The heap kept by the trees of seven documents, 1.9 MB of HTML in all.

|                      |  Memory |
| -------------------- | ------: |
| himalaya             | 10.2 MB |
| @lukeed/html         | 11.3 MB |
| **tagu**             | 11.7 MB |
| htmlparser2          | 13.8 MB |
| ultrahtml            | 19.8 MB |
| parse5               | 20.1 MB |
| @lukeed/html/mutable | 23.2 MB |
| node-html-parser     | 31.3 MB |

## Size

What each parser adds to an application, minified and gzipped, with its own dependencies.

|                               |    Size |
| ----------------------------- | ------: |
| ultrahtml, parse              |  1.1 kB |
| himalaya, parse and write     |  3.5 kB |
| **tagu, parse**               |  3.8 kB |
| **tagu, parse, write, visit** |  4.5 kB |
| **tagu, everything**          |  5.1 kB |
| @lukeed/html                  | 21.5 kB |
| htmlparser2                   | 23.0 kB |
| @lukeed/html/mutable          | 24.1 kB |
| parse5                        | 43.5 kB |
| node-html-parser              | 47.1 kB |

## What each one reads

|                                          | tagu | @lukeed/html/mutable | himalaya | ultrahtml | htmlparser2 | node-html-parser | parse5 |
| ---------------------------------------- | :--: | :------------------: | :------: | :-------: | :---------: | :--------------: | :----: |
| `<a href="x" title='y' data-n=5 hidden>` |  ✓   |          ✓           |    ✓     |     –     |      ✓      |        ✓         |   ✓    |
| `<p>a < b and b > a</p>`                 |  ✓   |          ✓           |    ✓     |     ✓     |      ✓      |        ✓         |   ✓    |
| `<ul><li>one<li>two</ul>`                |  ✓   |          ✓           |    ✓     |     –     |      ✓      |        ✓         |   ✓    |
| `<p>one<p>two<div>three</div>`           |  ✓   |          ✓           |    –     |     –     |      ✓      |        ✓         |   ✓    |
| `<div :x={a > b}>`                       |  ✓   |          –           |    –     |     –     |      –      |        –         |   –    |
| `<button @click={() => go(1)}>`          |  ✓   |          –           |    –     |     –     |      –      |        –         |   –    |
| `<button on:click={() => { … }}>`        |  ✓   |          –           |    –     |     –     |      –      |        –         |   –    |
| `<p class={a < b ? "x" : "y"}>`          |  ✓   |          –           |    –     |     –     |      –      |        –         |   –    |
| `<input {disabled} {...rest}>`           |  ✓   |          –           |    –     |     –     |      –      |        –         |   –    |
| `{#if a > b}<p>{name}</p>{/if}`          |  ✓   |          ✓           |    ✓     |     ✓     |      ✓      |        ✓         |   ✓    |

The rows with braces in a tag are template syntax, which the other parsers do not aim to read.

## Run it

```shell
npm run bench:fetch     # download the real pages once, into bench/pages
npm run bench:table     # the speed table above
npm run bench           # every page, every parser
npm run bench:memory    # the memory table
npm run bench:size      # the size table
npm run bench:reads     # the last table; add -- --show to see each tree
npm run bench:compare   # the current source against an earlier one
```

The pages belong to their sites, so they are downloaded on demand and not kept here. Without them the benchmarks run on a page generated in [`data.js`](./data.js).

`npm run bench` measures one parser after another, so whichever goes first is timed before the engine has warmed up. `bench:table` and `bench:compare` warm everything up first and let the parsers take turns; use them when a few percent matter.
