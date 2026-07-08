import { lineOf } from '../util.mjs';

export const metadata = {
  id: 'source-maps-production',
  title: 'Source maps enabled in production',
  severity: 'low',
  billingDimension: 'edge-requests',
  trafficIndependent: true,
  description:
    'productionBrowserSourceMaps: true ships .map files in the production bundle, increasing transfer size 30-100% per visitor. Useful for error reporting via Sentry; not useful for users.',
  fix:
    'Keep source maps generation but exclude them from the public bundle. Upload to your error tracker via build-time CI step; do not serve them with the deployment.',
  citations: [
    'https://nextjs.org/docs/messages/improper-devtool',
  ],
  excludeGlobs: [],
  includeGlobs: ['next.config.{js,mjs,ts}', 'svelte.config.{js,mjs,ts}'],
};

export function scan({ files }) {
  const out = [];
  for (const { path, content } of files) {
    if (!/^next\.config\.(js|mjs|ts)$/.test(path.split('/').pop() ?? '')) continue;
    const m = /productionBrowserSourceMaps\s*:\s*true/.exec(content);
    if (m) {
      out.push({
        pattern: metadata.id,
        file: path,
        line: lineOf(content, m.index),
        evidence: 'productionBrowserSourceMaps: true',
        trafficIndependent: metadata.trafficIndependent,
      });
    }
  }
  return out;
}
