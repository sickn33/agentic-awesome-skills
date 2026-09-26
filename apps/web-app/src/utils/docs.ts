import docs from '../data/docs.json';
import { catalogVersion, releaseFileUrl } from './catalogRelease';

export function docsUrl(url: string, source: string, image = false): string {
  if (/^https?:\/\//i.test(url) || (!image && /^mailto:/i.test(url))) return url;
  if (url.startsWith('#')) return image ? '' : `${import.meta.env.BASE_URL}docs/${source}/${url}`;
  const releaseUrl = releaseFileUrl(url, `docs/users/${source}.md`, image);
  const commit = __DOCS_METADATA__[source]?.commit;
  const resolved = commit ? releaseUrl.replace(`/v${catalogVersion}/`, `/${commit}/`) : releaseUrl;
  if (!image && resolved) {
    const parsed = new URL(resolved);
    const match = parsed.pathname.match(/\/docs\/users\/([^/]+)\.md$/);
    if (match && docs.some((doc) => doc.slug === match[1])) {
      return `${import.meta.env.BASE_URL}docs/${match[1]}/${parsed.hash}`;
    }
  }
  return resolved;
}
