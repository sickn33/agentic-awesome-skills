import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { releaseFileUrl, skillSourcePath } from './catalogRelease';
import { assignHeadings } from './markdownHeadings.js';

interface MarkdownNode {
  type: string;
  value?: string;
  alt?: string | null;
  depth?: number;
  children?: MarkdownNode[];
  data?: { hProperties?: Record<string, unknown> };
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
