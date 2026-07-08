// Append a caveat (don't drop — customer may opt in to canary) when a
// fix needs a canary/rc/beta dep version.

import { matchesFrameworkVersion } from '../citations.mjs';

const PRE_RELEASE_FEATURES = [
  {
    match: /\bppr\b|partial[- ]?prerendering/i,
    requires: 'next@canary',
    message: 'PPR is experimental — verify your Next.js version supports it as stable',
  },
  {
    match: /\buse cache['"]?\s*directive\b|"use cache"|'use cache'/i,
    requires: 'next@>=15.0.0',
    message: 'use cache directive is stable in 15+',
  },
  {
    match: /\bcacheLife\(/i,
    requires: 'next@>=15.0.0',
    message: 'cacheLife is stable in 15+',
  },
  {
    match: /\bcacheTag\(/i,
    requires: 'next@>=15.0.0',
    message: 'cacheTag is stable in 15+',
  },
];

const SEMVER_PRE_RELEASE_RE = /\b([\w-]+)@(\d+\.\d+\.\d+-(?:rc|beta|canary|alpha|next|exp)[\w.-]*)/g;

export const metadata = {
  id: 'pre-release',
  description: 'Append caveat when fix targets a canary/rc/beta feature.',
};

export function apply(rec, ctx = {}) {
  const text = [rec.fix, rec.currentBehavior, rec.desiredBehavior]
    .filter((s) => typeof s === 'string')
    .join('\n');
  if (!text) return {};

  const tags = [];
  const caveats = [];

  for (const feat of PRE_RELEASE_FEATURES) {
    if (feat.match.test(text)) {
      if (featureAvailableForStack(feat, ctx)) continue;
      const tag = `pre-release:${feat.requires}`;
      if (!tags.includes(tag)) {
        tags.push(tag);
        caveats.push(`Requires ${feat.requires} (${feat.message}).`);
      }
    }
  }

  for (const m of text.matchAll(SEMVER_PRE_RELEASE_RE)) {
    const [, pkg, version] = m;
    const tag = `pre-release:${pkg}@${version}`;
    if (!tags.includes(tag)) {
      tags.push(tag);
      caveats.push(`Requires pre-release version: \`${pkg}@${version}\`.`);
    }
  }

  if (tags.length === 0) return {};
  const caveatBlock = '\n\n_Note: ' + caveats.join(' ') + '_';
  if (typeof rec.fix === 'string') rec.fix += caveatBlock;
  return { tags, needsReview: true };
}

function featureAvailableForStack(feat, ctx) {
  if (!ctx?.framework || !ctx?.version) return false;
  return matchesFrameworkVersion(feat.requires, ctx.framework, ctx.version);
}
