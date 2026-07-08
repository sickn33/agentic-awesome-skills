// Warn when a rec's claimed rendering mode (static/ISR/SSR) contradicts
// the scanner-tagged mode for that route. No-op when the scanner didn't
// tag a renderingMode — full AST inference isn't implemented yet.

import { extractRoute } from '../util.mjs';

const MODE_PATTERNS = {
  static: /\bstatic(?:ally rendered)?\b|prerender(?:ed)?\b/i,
  isr: /\bISR\b|incremental[- ]?static|revalidate\s*:\s*\d/i,
  ssr: /\bSSR\b|server[- ]?side rendered|dynamic\s*=\s*['"]force-dynamic['"]/i,
};

export const metadata = {
  id: 'rendering-mode-mislabel',
  description: 'Catch recs that blame the wrong rendering mode (e.g. "convert from ISR" on a static page).',
};

export function apply(rec, ctx = {}) {
  const route = extractRoute(rec);
  if (!route) return {};
  const routes = ctx?.signals?.codebase?.routes ?? [];
  const match = routes.find((r) => r.routePath === route);
  const actualMode = match?.renderingMode;
  if (!actualMode) return {};

  const text = [rec.what, rec.why, rec.fix, rec.currentBehavior, rec.desiredBehavior]
    .filter((s) => typeof s === 'string')
    .join('\n');
  const claimedModes = Object.entries(MODE_PATTERNS)
    .filter(([, re]) => re.test(text))
    .map(([m]) => m);

  if (claimedModes.length === 0 || claimedModes.includes(actualMode)) return {};

  const warning = `\n\n_⚠ Rendering-mode mismatch: this rec describes the route as \`${claimedModes.join(', ')}\` but the scanner classified it as \`${actualMode}\`. Verify the rendering mode before applying._`;
  if (typeof rec.fix === 'string') rec.fix += warning;
  return { tag: `rendering-mode-mislabel:${claimedModes.join(',')}!=${actualMode}`, needsReview: true };
}
