/**
  Benchmark Reads
  --------------------------------------------------------------------------------------------------
  Speed says nothing when the tree is wrong. This prints which parser reads which input the way
  it was meant: plain HTML that every parser should get right, tags left open, and the brace
  syntax of component templates, where a `>` inside `{…}` is not the end of the tag.
  --------------------------------------------------------------------------------------------------
*/

import * as lukeed from '@lukeed/html/mutable';
import himalaya from 'himalaya';
import { parseDocument } from 'htmlparser2';
import { parse as nodeHtmlParser } from 'node-html-parser';
import { parseFragment } from 'parse5';
import { parse as ultrahtml } from 'ultrahtml';
import { htmlToAst } from '../src/index.js';

/**
 * Each parser's tree read the same way: element or not, name, attributes as an object,
 * children, text.
 */
const views = {
  tagu: {
    parse: html => htmlToAst(html),
    element: node => node.type === 'Element',
    name: node => node.name,
    attributes: node =>
      Object.fromEntries(
        node.attributes.map(a => [
          (a.prefix ?? '') + a.name + (a.suffix ?? []).map(s => s.prefix + s.name).join(''),
          a.value ?? '',
        ])
      ),
    children: node => node.children ?? [],
    text: node => (node.type === 'Text' ? node.content : undefined),
  },
  '@lukeed/html/mutable': {
    parse: html => lukeed.parse(html),
    element: node => node.attributes !== undefined,
    name: node => node.name,
    attributes: node => ({ ...node.attributes }),
    children: node => node.children ?? [],
    text: node =>
      node.attributes === undefined && node.children === undefined ? node.value : undefined,
  },
  himalaya: {
    parse: html => ({ children: himalaya.parse(html) }),
    element: node => node.type === 'element',
    name: node => node.tagName,
    attributes: node => Object.fromEntries(node.attributes.map(a => [a.key, a.value ?? ''])),
    children: node => node.children ?? [],
    text: node => (node.type === 'text' ? node.content : undefined),
  },
  ultrahtml: {
    parse: html => ultrahtml(html),
    element: node => node.type === 1,
    name: node => node.name,
    attributes: node => ({ ...node.attributes }),
    children: node => node.children ?? [],
    text: node => (node.type === 2 ? node.value : undefined),
  },
  htmlparser2: {
    parse: html => parseDocument(html),
    element: node => node.type === 'tag' || node.type === 'script' || node.type === 'style',
    name: node => node.name,
    attributes: node => ({ ...node.attribs }),
    children: node => node.children ?? [],
    text: node => (node.type === 'text' ? node.data : undefined),
  },
  'node-html-parser': {
    parse: html => nodeHtmlParser(html),
    element: node => node.nodeType === 1 && node.rawTagName !== null,
    name: node => node.rawTagName,
    attributes: node => ({ ...node.attributes }),
    children: node => node.childNodes ?? [],
    text: node => (node.nodeType === 3 ? node.rawText : undefined),
  },
  parse5: {
    parse: html => parseFragment(html),
    element: node => node.tagName !== undefined,
    name: node => node.tagName,
    attributes: node => Object.fromEntries(node.attrs.map(a => [a.name, a.value])),
    children: node => node.childNodes ?? [],
    text: node => (node.nodeName === '#text' ? node.value : undefined),
  },
};

/**
 * Reduces a tree to plain arrays, the same for every parser, so two trees can be compared:
 * an element is `[name, attributes, ...children]`, text is a string. Text nodes next to each
 * other are joined and empty ones dropped, since parsers split text differently.
 *
 * @param {Object} node - A node of any parser's tree.
 * @param {Object} view - How to read that parser's nodes.
 * @returns {Array} - The children of `node` in that form.
 */
function shape(node, view) {
  const list = [];
  for (const child of view.children(node)) {
    if (view.element(child)) {
      list.push([view.name(child), view.attributes(child), ...shape(child, view)]);
      continue;
    }
    const text = view.text(child);
    if (text === undefined || text === '') continue;
    if (typeof list.at(-1) === 'string') list[list.length - 1] += text;
    else list.push(text);
  }
  return list;
}

/** Input, and the tree it means. */
const cases = [
  [
    'plain attributes',
    `<a href="x" title='y' data-n=5 hidden>t</a>`,
    [['a', { href: 'x', title: 'y', 'data-n': '5', hidden: '' }, 't']],
  ],
  ['text with < and >', '<p>a < b and b > a</p>', [['p', {}, 'a < b and b > a']]],
  [
    'list items left open',
    '<ul><li>one<li>two</ul>',
    [['ul', {}, ['li', {}, 'one'], ['li', {}, 'two']]],
  ],
  [
    'paragraphs left open',
    '<p>one<p>two<div>three</div>',
    [
      ['p', {}, 'one'],
      ['p', {}, 'two'],
      ['div', {}, 'three'],
    ],
  ],
  ['> inside a brace value', '<div :x={a > b}>t</div>', [['div', { ':x': '{a > b}' }, 't']]],
  [
    'arrow function handler',
    '<button @click={() => go(1)}>ok</button>',
    [['button', { '@click': '{() => go(1)}' }, 'ok']],
  ],
  [
    'handler with a body',
    '<button on:click={() => { count += 1 }}>ok</button>',
    [['button', { 'on:click': '{() => { count += 1 }}' }, 'ok']],
  ],
  [
    'quotes inside braces',
    '<p class={a < b ? "x" : "y"}>t</p>',
    [['p', { class: '{a < b ? "x" : "y"}' }, 't']],
  ],
  [
    'shorthand and spread',
    '<input {disabled} {...rest}>',
    [['input', { disabled: '{disabled}', '...rest': '{...rest}' }]],
  ],
  [
    'block syntax in text',
    '{#if a > b}<p>{name}</p>{/if}',
    ['{#if a > b}', ['p', {}, '{name}'], '{/if}'],
  ],
];

const names = Object.keys(views);
const read = (name, html) => {
  try {
    return JSON.stringify(shape(views[name].parse(html), views[name]));
  } catch {
    return 'threw';
  }
};

console.log('input'.padEnd(26) + names.map(name => name.padEnd(22)).join(''));
for (const [label, html, expected] of cases) {
  const wanted = JSON.stringify(expected);
  console.log(
    label.padEnd(26) +
      names.map(name => (read(name, html) === wanted ? 'yes' : 'no').padEnd(22)).join('')
  );
}

// `--show` prints what every parser made of each input.
if (process.argv.includes('--show')) {
  for (const [label, html] of cases) {
    console.log('\n' + label + ': ' + html);
    for (const name of names) console.log('  ' + name.padEnd(22), read(name, html));
  }
}
