// Detects Turborepo cache bypass patterns that cause every commit to rebuild every project,
// driving Build Minutes to dominate the bill on monorepos.
//
// Three signal subtypes:
//   force-flag      — `TURBO_FORCE=true` env var or `turbo run ... --force` in build script
//   cache-disabled  — `turbo.json` declares `"cache": false` for the build pipeline
//   no-ignore-step  — repo has turbo.json and no repo-declared ignoreCommand;
//                     verify Vercel's skip-unaffected project setting before recommending one
//
// This pattern has caused full-monorepo rebuilds on every commit. Build-skip
// settings and right-sized build machines can reduce Build Minutes when the
// project is rebuilding unchanged work.

export const metadata = {
  id: 'turbo-force-bypass',
  title: 'Turborepo cache bypass on a monorepo',
  severity: 'high',
  billingDimension: 'build',
  trafficIndependent: true, // build-time, fires regardless of route traffic
  description:
    "Turborepo's per-task cache can be bypassed by an explicit force flag, a `cache: false` config, or missing build-skip configuration. Every commit can rebuild unchanged work; Build Minutes climb with project count.",
  fix:
    "Remove `TURBO_FORCE=true` from build env/scripts unless intentional. Set `tasks.build.cache: true` in `turbo.json` (or remove the override), and include generated outputs in Turbo's cache contract. Prefer Vercel's skip-unaffected monorepo behavior when available; use `ignoreCommand` only when that setting cannot cover the project.",
  citations: [
    'https://vercel.com/docs/monorepos',
    'https://vercel.com/docs/builds',
    'https://turborepo.dev/docs/crafting-your-repository/caching',
  ],
  excludeGlobs: ['node_modules/**', '.next/**', 'dist/**'],
  includeGlobs: ['turbo.json', '**/turbo.json', 'package.json', '**/package.json', 'vercel.json', '**/vercel.json'],
};

const FORCE_ENV_RE = /TURBO_FORCE\s*=\s*(?:true|1)\b/;
const FORCE_FLAG_RE = /\bturbo\s+(?:run\s+)?[a-z:_-]+[^\n&|;]*\s--force\b/;

export function scan({ files }) {
  const out = [];
  let hasTurboJson = false;
  let vercelJsonFile = null;
  let vercelJsonContent = null;

  for (const { path, content } of files) {
    const name = path.split('/').pop();

    if (name === 'turbo.json') {
      hasTurboJson = true;
      const buildCacheDisabled = detectBuildCacheDisabled(content);
      if (buildCacheDisabled) {
        out.push({
          pattern: metadata.id,
          file: path,
          line: buildCacheDisabled.line,
          evidence: 'turbo.json: tasks.build.cache = false',
          trafficIndependent: metadata.trafficIndependent,
          subtype: 'cache-disabled',
        });
      }
      continue;
    }

    if (name === 'package.json') {
      const scripts = safeScripts(content);
      for (const [scriptName, body] of Object.entries(scripts)) {
        if (FORCE_ENV_RE.test(body) || FORCE_FLAG_RE.test(body)) {
          const line = lineOfMatch(content, body) ?? 1;
          out.push({
            pattern: metadata.id,
            file: path,
            line,
            evidence: `package.json scripts.${scriptName}: ${truncate(body, 80)}`,
            trafficIndependent: metadata.trafficIndependent,
            subtype: 'force-flag',
          });
        }
      }
      continue;
    }

    if (name === 'vercel.json') {
      vercelJsonFile = path;
      vercelJsonContent = content;
    }
  }

  // No-ignore-step: repo has turbo.json AND vercel.json lacks an ignoreCommand.
  // This is an investigation prompt, not proof that the dashboard skip setting is off.
  if (hasTurboJson && vercelJsonFile && !/"ignoreCommand"\s*:/.test(vercelJsonContent ?? '')) {
    out.push({
      pattern: metadata.id,
      file: vercelJsonFile,
      line: 1,
      evidence: 'turbo repo without ignoreCommand in vercel.json; verify Vercel skip-unaffected setting',
      trafficIndependent: metadata.trafficIndependent,
      subtype: 'no-ignore-step',
    });
  }

  return out;
}

function detectBuildCacheDisabled(content) {
  // Tolerate JSONC comments and trailing commas — light scan, not full parse.
  // Match `"build": { ... "cache": false ... }` within reasonable lookahead.
  const buildTask = /"build"\s*:\s*\{([\s\S]{0,400}?)\}/.exec(content);
  if (!buildTask) return null;
  if (!/"cache"\s*:\s*false/.test(buildTask[1])) return null;
  const lineNum = content.slice(0, buildTask.index).split('\n').length;
  return { line: lineNum };
}

function safeScripts(content) {
  try {
    const parsed = JSON.parse(content);
    return parsed?.scripts && typeof parsed.scripts === 'object' ? parsed.scripts : {};
  } catch {
    return {};
  }
}

function lineOfMatch(haystack, needle) {
  const idx = haystack.indexOf(needle);
  if (idx < 0) return null;
  return haystack.slice(0, idx).split('\n').length;
}

function truncate(s, n) {
  if (typeof s !== 'string') return '';
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
