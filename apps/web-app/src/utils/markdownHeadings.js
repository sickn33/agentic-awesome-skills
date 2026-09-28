function plainText(node) {
  return node.value ?? node.alt ?? node.children?.map(plainText).join('') ?? '';
}

// Shared by browser rendering, static HTML, and link verification.
export function assignHeadings(tree) {
  const used = new Set();
  const outline = [];
  function visit(node) {
    if (node.type === 'heading') {
      const label = plainText(node).trim();
      const slug = label.toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s/g, '-') || 'section';
      let id = slug;
      let suffix = 0;
      while (used.has(id)) id = `${slug}-${++suffix}`;
      used.add(id);
      node.data = { ...node.data, hProperties: { ...node.data?.hProperties, id } };
      if (node.depth === 2) outline.push({ label, id });
    }
    node.children?.forEach(visit);
  }
  visit(tree);
  return outline;
}

export function remarkHeadings() {
  return (tree) => { assignHeadings(tree); };
}
