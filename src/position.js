/**
 * Adds `loc` (line and column) to every node that has `start` and `end` indexes.
 *
 * The line starts are found in one scan of the source, then each index is looked up with a
 * binary search. Lines count from 1 and columns from 0.
 *
 * @param {Object} root - The document node.
 * @param {string} source - The text the indexes point into.
 * @param {boolean} keepIndex - Whether `start` and `end` stay on the nodes.
 */
export function addLoc(root, source, keepIndex) {
  const lines = [0];
  for (let i = source.indexOf('\n'); i !== -1; i = source.indexOf('\n', i + 1)) lines.push(i + 1);

  const at = index => {
    let low = 0;
    let high = lines.length - 1;
    while (low < high) {
      const middle = (low + high + 1) >> 1;
      if (lines[middle] <= index) low = middle;
      else high = middle - 1;
    }
    return { line: low + 1, column: index - lines[low] };
  };

  const visit = node => {
    node.loc = { start: at(node.start), end: at(node.end) };
    if (!keepIndex) {
      delete node.start;
      delete node.end;
    }
    node.attributes?.forEach(visit);
    node.children?.forEach(visit);
  };

  visit(root);
}
