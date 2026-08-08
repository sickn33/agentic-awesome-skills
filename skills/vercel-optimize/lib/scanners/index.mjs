import * as unoptimizedImage from './unoptimized-image.mjs';
import * as forceDynamic from './force-dynamic.mjs';
import * as middlewareBroad from './middleware-broad-matcher.mjs';
import * as missingCacheHeaders from './missing-cache-headers.mjs';
import * as maxAgeNoSMaxage from './max-age-without-s-maxage.mjs';
import * as headersInPage from './headers-in-page.mjs';
import * as sourceMapsProd from './source-maps-production.mjs';
import * as prismaIncludeTree from './prisma-include-tree.mjs';
import * as sveltekitPrerenderMissing from './sveltekit-prerender-missing.mjs';
import * as largeStaticAsset from './large-static-asset.mjs';
import * as edgeHeavyImport from './edge-heavy-import.mjs';
import * as useCacheDateStamp from './use-cache-date-stamp.mjs';
import * as cacheComponentsSuspenseDedupe from './cache-components-suspense-dedupe.mjs';
import * as turboForceBypass from './turbo-force-bypass.mjs';
import * as regionPinInConfig from './region-pin-in-config.mjs';

// `use-client-cascade` is intentionally NOT registered: 0.3% conversion
// rate, and client-bundle size isn't billed on Vercel.
export const scanners = [
  unoptimizedImage,
  forceDynamic,
  middlewareBroad,
  missingCacheHeaders,
  maxAgeNoSMaxage,
  headersInPage,
  sourceMapsProd,
  prismaIncludeTree,
  sveltekitPrerenderMissing,
  largeStaticAsset,
  edgeHeavyImport,
  useCacheDateStamp,
  cacheComponentsSuspenseDedupe,
  turboForceBypass,
  regionPinInConfig,
];
