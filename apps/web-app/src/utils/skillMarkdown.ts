import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { releaseFileUrl, skillSourcePath } from './catalogRelease';

interface MarkdownNode {
  type: string;
  value?: string;
  alt?: string | null;
  depth?: number;
  children?: MarkdownNode[];
  data?: { hProperties?: Record<string, unknown> };
}

function plainText(node: MarkdownNode): string {
  return node.value ?? node.alt ?? node.children?.map(plainText).join('') ?? '';
}

// Both the rendered headings and the outline use the Markdown AST. This also
// excludes headings inside code fences and handles inline markup and duplicates.
function assignHeadings(tree: MarkdownNode): Array<{ label: string; id: string }> {
  const used = new Set<string>();
  const outline: Array<{ label: string; id: string }> = [];
  function visit(node: MarkdownNode) {
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

const parser = unified().use(remarkParse).use(remarkGfm);

export function getSkillHeadings(markdown: string) {
  return assignHeadings(parser.parse(markdown));
}

export function remarkSkillHeadings() {
  return (tree: MarkdownNode) => { assignHeadings(tree); };
}

export function skillMarkdownUrl(url: string, key: string, skillPath: string, pageUrl: string): string {
  if (/^https?:\/\//i.test(url) || (key === 'href' && /^mailto:/i.test(url))) return url;
  if (url.startsWith('#')) return key === 'href' ? `${pageUrl.split('#')[0]}${url}` : '';
  const source = skillSourcePath(skillPath);
  return source ? releaseFileUrl(url, source, key === 'src') : '';
}
