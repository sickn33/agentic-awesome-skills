import packageJson from '../../../package.json' with { type: 'json' };
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { remarkHeadings } from '../src/utils/markdownHeadings.js';
import { releaseFileUrl, skillSourcePath } from '../src/utils/releaseLinks.js';
const { version } = packageJson;

export function renderSkillBody(markdown, skillPath, pageUrl) {
  const body = markdown.replace(/^---\s*\r?\n[\s\S]*?\r?\n---\s*(?:\r?\n|$)/, '');
  return renderToStaticMarkup(createElement(Markdown, {
    remarkPlugins: [remarkGfm, remarkHeadings],
    urlTransform: (url, key) => {
      if (/^https?:\/\//i.test(url) || (key === 'href' && /^mailto:/i.test(url))) return url;
      if (url.startsWith('#')) return key === 'href' ? `${pageUrl.split('#')[0]}${url}` : '';
      const source = skillSourcePath(skillPath);
      return source ? releaseFileUrl(url, source, key === 'src', version) : '';
    },
  }, body));
}

export function setRootFallback(html, fallbackHtml) {
  const rootPattern = /<div\s+id=["']root["']><\/div>/i;

  if (!fallbackHtml || !rootPattern.test(html)) {
    return html;
  }

  return html.replace(rootPattern, () => `<div id="root">${fallbackHtml}</div>`);
}
