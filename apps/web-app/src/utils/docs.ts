import docs from '../data/docs.json';
import { releaseFileUrl } from './catalogRelease';

export function docsUrl(url: string, source: string, image = false): string {
  if (/^https?:\/\//i.test(url) || (!image && /^mailto:/i.test(url))) return url;
  if (url.startsWith('#')) return image ? '' : url;
  const resolved = releaseFileUrl(url, `docs/users/${source}.md`, image);
  if (!image && resolved) {
    const parsed = new URL(resolved);
    const match = parsed.pathname.match(/\/docs\/users\/([^/]+)\.md$/);
    if (match && docs.some((doc) => doc.slug === match[1])) {
      return `${import.meta.env.BASE_URL}docs/${match[1]}/${parsed.hash}`;
    }
  }
  return resolved;
}
