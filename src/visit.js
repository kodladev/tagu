/**
 * Visits a node and everything inside it, parents first: the node, then its attributes,
 * then its children.
 *
 * The visitor is either one function called for every node, or an object with a function
 * per node type (`Element`, `Attribute`, `Text`, `Comment`, `Doctype`, `Document`). Each
 * call gets the node, its parent and its index in the parent's `children` (or `attributes`);
 * the node the visit starts from gets neither. Returning `false` skips what is inside the node.
 *
 * Nodes are never changed by the visit itself. A function may change its node, or remove it
 * from the parent with `parent.children.splice(index, 1)`.
 *
 * @example
 * visit(ast, {
 *   Element(node) {
 *     if (node.name === 'script') return false;
 *   },
 *   Text(node, parent, index) {
 *     node.content = node.content.trim();
 *   },
 * });
 *
 * @param {Object} node - The node to start from.
 * @param {Function|Object<string, Function>} visitor - A function, or functions by node type.
 * @param {Object} [parent] - The parent of `node`; set by the visit itself.
 * @param {number} [index] - The index of `node` in its parent; set by the visit itself.
 */
export function visit(node, visitor, parent, index) {
  const fn = typeof visitor === 'function' ? visitor : visitor[node.type];
  if (fn && fn(node, parent, index) === false) return;
  if (node.attributes) visitList(node.attributes, visitor, node);
  if (node.children) visitList(node.children, visitor, node);
}

/**
 * Visits the nodes of a list in order. When a node removes itself, the next one has moved
 * into its place, so the same index is visited again.
 *
 * @param {Array} list - The `children` or `attributes` of `parent`.
 * @param {Function|Object<string, Function>} visitor - A function, or functions by node type.
 * @param {Object} parent - The node that owns the list.
 */
function visitList(list, visitor, parent) {
  for (let index = 0; index < list.length; index++) {
    const node = list[index];
    const length = list.length;
    visit(node, visitor, parent, index);
    if (list.length < length && list[index] !== node) index--;
  }
}
