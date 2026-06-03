// Flag SvelteKit pages that haven't declared prerender/ssr/config — they
// default to per-request function execution. Pages that have already opted
// in or out are skipped; the investigator agent decides actual staticness.

export const metadata = {
  id: 'sveltekit-prerender-missing',
  title: 'SvelteKit page without explicit prerender / ISR config',
  severity: 'low',
  billingDimension: 'function-duration',
  trafficIndependent: false,
  description:
    'SvelteKit page or +page.server.ts is missing an explicit `prerender`, `ssr`, or adapter `config.isr` declaration. Default is per-request function execution — investigate whether the route could be prerendered or ISR-cached.',
  fix:
    'If the page is static (no per-user / per-request data), add `export const prerender = true` in +page.ts or +page.server.ts. If the data refreshes on a schedule, prefer adapter-vercel\'s ISR option via `export const config = { isr: { expiration: 60 } }`.',
  citations: [
    'https://kit.svelte.dev/docs/page-options',
    'https://kit.svelte.dev/docs/adapter-vercel',
    'https://vercel.com/docs/incremental-static-regeneration',
  ],
  excludeGlobs: ['node_modules/**', '.svelte-kit/**', 'build/**', '__tests__/**'],
  includeGlobs: ['src/routes/**/+page.svelte', 'src/routes/**/+page.server.{ts,js}', 'src/routes/+page.svelte', 'src/routes/+page.server.{ts,js}'],
};

const PRERENDER_RE = /export\s+const\s+prerender\b/;
const SSR_RE = /export\s+const\s+ssr\b/;
const CONFIG_RE = /export\s+const\s+config\s*=\s*\{[^}]*\b(isr|prerender|runtime|split|regions)\b/;

export function scan({ files }) {
  const out = [];
  for (const { path, content } of files) {
    if (!path.includes('/routes/')) continue;
    if (PRERENDER_RE.test(content) || SSR_RE.test(content) || CONFIG_RE.test(content)) continue;
    out.push({
      pattern: metadata.id,
      file: path,
      // Absence-finding — no specific line, placeholder 1.
      line: 1,
      evidence: 'No `prerender`, `ssr`, or `config = { isr | runtime | ... }` export found',
      trafficIndependent: metadata.trafficIndependent,
    });
  }
  return out;
}
