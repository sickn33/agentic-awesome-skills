// Four image-optimization checks emitted as `unoptimized-image` findings.
// `subtype` distinguishes raw-img / global-unoptimized / image-fill-no-sizes
// / image-svg-no-unoptimized so the recommender can frame each separately.

export const metadata = {
  id: 'unoptimized-image',
  title: 'Image optimization gap (raw <img>, global flag, missing sizes, or SVG mis-routed)',
  severity: 'high',
  billingDimension: 'image-optimization',
  trafficIndependent: false,
  description:
    'Four shapes of image-cost waste: raw <img> tags bypass the framework Image component; `images.unoptimized: true` disables Vercel image optimization globally; <Image fill> without `sizes` forces serving the largest source variant; <Image src=".svg"> without `unoptimized` routes vector data through the raster pipeline.',
  fix:
    'For raw <img>: switch to next/image, enhanced-img (SvelteKit), <Image /> (Astro), or NuxtImg. For global unoptimized:true: remove the flag unless the project is hosted outside Vercel. For fill without sizes: add `sizes="(max-width: 768px) 100vw, 50vw"` or whatever matches your layout. For SVG: add `unoptimized` so the raw SVG ships instead of rastering it.',
  citations: [
    'https://nextjs.org/docs/app/api-reference/components/image',
    'https://vercel.com/docs/image-optimization',
  ],
  excludeGlobs: ['node_modules/**', '.next/**', 'dist/**', '__tests__/**', 'cypress/**', '*.test.*'],
  includeGlobs: ['**/*.{tsx,jsx,html,svelte,astro,vue,js,mjs,ts}'],
};

const IMG_RE = /<img\s+[^>]*src\s*=\s*["'{`]/g;
const GLOBAL_UNOPT_RE = /images\s*:\s*\{[^}]*\bunoptimized\s*:\s*true/;
const IMAGE_TAG_RE = /<Image\b[^>]*?\/?>/g;
const NEXT_IMAGE_IMPORT_RE = /from\s+['"]next\/image['"]/;

export function scan({ files }) {
  const out = [];
  for (const { path, content } of files) {
    if (isJsxLike(path)) {
      let m;
      IMG_RE.lastIndex = 0;
      while ((m = IMG_RE.exec(content)) !== null) {
        out.push({
          pattern: metadata.id,
          subtype: 'raw-img',
          file: path,
          line: lineOf(content, m.index),
          evidence: snippet(content, m.index),
          trafficIndependent: metadata.trafficIndependent,
        });
      }
    }

    if (isNextConfig(path)) {
      const match = GLOBAL_UNOPT_RE.exec(content);
      if (match) {
        out.push({
          pattern: metadata.id,
          subtype: 'global-unoptimized',
          file: path,
          line: lineOf(content, match.index),
          evidence: 'images: { unoptimized: true } — disables Vercel image optimization for the entire project',
          // Config-level flag affects every image regardless of route.
          trafficIndependent: true,
        });
      }
    }

    // Only fire if next/image is imported — otherwise `Image` is some
    // other component.
    if (isJsxLike(path) && NEXT_IMAGE_IMPORT_RE.test(content)) {
      let m;
      IMAGE_TAG_RE.lastIndex = 0;
      while ((m = IMAGE_TAG_RE.exec(content)) !== null) {
        const tag = m[0];
        const hasFill = /\bfill\b/.test(tag);
        const hasSizes = /\bsizes\s*=/.test(tag);
        if (hasFill && !hasSizes) {
          out.push({
            pattern: metadata.id,
            subtype: 'image-fill-no-sizes',
            file: path,
            line: lineOf(content, m.index),
            evidence: tag.slice(0, 200),
            trafficIndependent: metadata.trafficIndependent,
          });
        }
        // Inline data: URLs never round-trip through the optimizer.
        const srcMatch = /\bsrc\s*=\s*["']([^"']+)["']/.exec(tag);
        if (srcMatch) {
          const src = srcMatch[1];
          if (/\.svg(\?|$)/i.test(src) && !src.startsWith('data:') && !/\bunoptimized\b/.test(tag)) {
            out.push({
              pattern: metadata.id,
              subtype: 'image-svg-no-unoptimized',
              file: path,
              line: lineOf(content, m.index),
              evidence: tag.slice(0, 200),
              trafficIndependent: metadata.trafficIndependent,
            });
          }
        }
      }
    }
  }
  return out;
}

import { lineOf } from '../util.mjs';

function isJsxLike(path) {
  return /\.(tsx|jsx|html|svelte|astro|vue)$/.test(path);
}
function isNextConfig(path) {
  return /(?:^|\/)next\.config\.(js|mjs|ts|cjs)$/.test(path);
}
function snippet(text, idx) {
  const start = text.lastIndexOf('\n', idx) + 1;
  const end = text.indexOf('\n', idx);
  return text.slice(start, end === -1 ? text.length : end).trim().slice(0, 160);
}
