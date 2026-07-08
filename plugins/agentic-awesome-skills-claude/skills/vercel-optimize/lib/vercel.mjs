// Vercel CLI helpers. All shell-outs use execFile (not exec) — no shell injection. Error detection: exit code + JSON-parse first; stderr grep only as fallback (CLI error strings aren't a stable contract).

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { getMetricThrottle, isDailyQuotaExceeded, retryOnRateLimit } from './throttle.mjs';

const exec = promisify(execFile);
const MIN_CLI_VERSION = [53, 0, 0];

// Pre-v53 lacks `vercel metrics` and `vercel contract`.
export async function checkCliVersion() {
  let raw;
  try {
    const { stdout } = await exec('vercel', ['--version']);
    raw = stdout.trim();
  } catch (err) {
    throw new Error('VERCEL_NOT_INSTALLED: `vercel` CLI not found in PATH. Install with `npm i -g vercel@latest`.');
  }
  const m = raw.match(/(\d+)\.(\d+)\.(\d+)/);
  if (!m) throw new Error(`VERCEL_VERSION_UNPARSEABLE: ${raw}`);
  const v = [Number(m[1]), Number(m[2]), Number(m[3])];
  for (let i = 0; i < 3; i++) {
    if (v[i] > MIN_CLI_VERSION[i]) return v;
    if (v[i] < MIN_CLI_VERSION[i]) {
      throw new Error(
        `VERCEL_CLI_TOO_OLD: have ${v.join('.')}, need >= ${MIN_CLI_VERSION.join('.')}. Upgrade with \`npm i -g vercel@latest\`.`
      );
    }
  }
  return v;
}

export async function checkAuth() {
  try {
    await exec('vercel', ['whoami']);
  } catch {
    throw new Error('NOT_AUTH: run `vercel login`.');
  }
}

export async function getCliIdentity() {
  const r = await runVercelJson(['whoami', '--format', 'json']);
  return r.ok ? r.data : null;
}

// Supports newer `.vercel/repo.json` (multi-project) + legacy `.vercel/project.json` (single-project).
export async function readProjectJson(cwd = process.cwd()) {
  try {
    const raw = await readFile(join(cwd, '.vercel', 'repo.json'), 'utf-8');
    const parsed = JSON.parse(raw);
    const projects = Array.isArray(parsed?.projects) ? parsed.projects.filter((p) => p?.id) : [];
    if (projects.length > 1) {
      throw new Error('AMBIGUOUS_PROJECT_LINK: `.vercel/repo.json` contains multiple projects. Run from the linked app directory, or pass the intended projectId together with VERCEL_ORG_ID.');
    }
    const first = projects[0];
    if (first?.id) {
      return { projectId: first.id, orgId: first.orgId ?? null, source: 'repo.json' };
    }
  } catch (err) {
    if (err?.message?.startsWith('AMBIGUOUS_PROJECT_LINK:')) throw err;
    /* fall through */
  }

  // Legacy single-project format.
  try {
    const raw = await readFile(join(cwd, '.vercel', 'project.json'), 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed?.projectId) {
      return { projectId: parsed.projectId, orgId: parsed.orgId ?? null, source: 'project.json' };
    }
  } catch { /* fall through */ }

  return null;
}

// Does NOT auto-run `vercel link` — interactive surprises bad.
export async function resolveProjectId(explicit, cwd = process.cwd()) {
  if (explicit) {
    const linked = process.env.VERCEL_ORG_ID
      ? null
      : await readLinkedOwnerForProjectId(explicit, cwd);
    return {
      projectId: explicit,
      orgId: process.env.VERCEL_ORG_ID || linked?.orgId || null,
      source: linked?.source ? `arg+${linked.source}` : 'arg',
    };
  }
  if (process.env.VERCEL_PROJECT_ID) {
    const linked = process.env.VERCEL_ORG_ID
      ? null
      : await readLinkedOwnerForProjectId(process.env.VERCEL_PROJECT_ID, cwd);
    return {
      projectId: process.env.VERCEL_PROJECT_ID,
      orgId: process.env.VERCEL_ORG_ID || linked?.orgId || null,
      source: linked?.source ? `env+${linked.source}` : 'env',
    };
  }
  return await readProjectJson(cwd);
}

async function readLinkedOwnerForProjectId(projectId, cwd = process.cwd()) {
  try {
    const raw = await readFile(join(cwd, '.vercel', 'repo.json'), 'utf-8');
    const parsed = JSON.parse(raw);
    const matches = (Array.isArray(parsed?.projects) ? parsed.projects : [])
      .filter((p) => p?.id && String(p.id) === String(projectId));
    if (matches.length > 1) {
      throw new Error('AMBIGUOUS_PROJECT_LINK: `.vercel/repo.json` contains multiple entries for the requested projectId. Ask the user to confirm the intended Vercel team/personal scope.');
    }
    const match = matches[0];
    if (match?.orgId) return { orgId: match.orgId, source: 'repo.json' };
  } catch (err) {
    if (err?.message?.startsWith('AMBIGUOUS_PROJECT_LINK:')) throw err;
    /* fall through */
  }

  try {
    const raw = await readFile(join(cwd, '.vercel', 'project.json'), 'utf-8');
    const parsed = JSON.parse(raw);
    if (String(parsed?.projectId ?? '') === String(projectId) && parsed?.orgId) {
      return { orgId: parsed.orgId, source: 'project.json' };
    }
  } catch { /* fall through */ }

  return null;
}

export async function resolveCommandScope(project = {}) {
  const orgId = project?.orgId ?? null;

  if (!orgId) {
    return {
      ok: false,
      cliScope: null,
      source: 'missing-org-scope',
      required: true,
      error: 'PROJECT_SCOPE_UNRESOLVED',
      detail: 'The project was resolved without an owner account, so the collector cannot prove which Vercel scope to query.',
    };
  }

  const identity = await getCliIdentity();
  const currentTeam = identity?.team ?? null;

  if (String(orgId).startsWith('team_')) {
    if (currentTeam?.id === orgId && currentTeam?.slug) {
      return {
        ok: true,
        cliScope: currentTeam.slug,
        source: 'whoami-current-team',
        required: true,
        teamId: orgId,
        detail: 'Resolved linked team ID to the current CLI team slug.',
      };
    }

    const team = await getTeamInfo(orgId);
    if (team.ok && team.slug) {
      return {
        ok: true,
        cliScope: team.slug,
        source: 'team-api',
        required: true,
        teamId: orgId,
        detail: 'Resolved linked team ID to a Vercel CLI scope slug.',
      };
    }

    return {
      ok: false,
      cliScope: null,
      source: 'team-api',
      required: true,
      teamId: orgId,
      error: team.error ?? 'TEAM_SCOPE_UNRESOLVED',
      detail: 'Could not resolve the linked team ID to a Vercel CLI scope slug.',
    };
  }

  if (String(orgId).startsWith('usr_')) {
    const user = identity?.user ?? identity ?? {};
    const userId = user.id ?? identity?.id ?? null;
    const username = user.username ?? identity?.username ?? null;
    if ((!userId || userId === orgId) && username) {
      return {
        ok: true,
        cliScope: username,
        source: 'whoami-user',
        required: true,
        userId: orgId,
        detail: 'Resolved linked user ID to a Vercel CLI username scope.',
      };
    }
    return {
      ok: false,
      cliScope: null,
      source: 'whoami-user',
      required: true,
      userId: orgId,
      error: 'USER_SCOPE_UNRESOLVED',
      detail: 'Could not resolve the linked user ID to the authenticated Vercel username.',
    };
  }

  return {
    ok: true,
    cliScope: orgId,
    source: 'linked-org-scope',
    required: true,
    detail: 'Using the linked org value as the Vercel CLI scope.',
  };
}

async function getTeamInfo(teamIdOrSlug) {
  const r = await runVercelJson(['api', `/v2/teams/${encodeURIComponent(teamIdOrSlug)}`]);
  if (!r.ok) return { ok: false, error: r.code ?? 'UNKNOWN' };
  const team = r.data?.team ?? r.data ?? {};
  return {
    ok: true,
    id: team.id ?? null,
    slug: team.slug ?? null,
    name: team.name ?? null,
  };
}

// Some commands emit `{error: {...}}` on stdout AND exit non-zero — parse stdout first; embedded `error` is the most reliable signal.
// 32 MiB buffer: 14d function-duration timeseries across many routes exceeds Node's 1 MiB default.
export async function runVercelJson(args, opts = {}) {
  let stdout = '';
  let stderr = '';
  let exitCode = 0;
  try {
    const r = await exec('vercel', args, { maxBuffer: 32 * 1024 * 1024, ...opts });
    stdout = r.stdout;
    stderr = r.stderr;
  } catch (err) {
    stdout = err.stdout || '';
    stderr = err.stderr || '';
    exitCode = err.code ?? err.exitCode ?? 1;
  }
  const safeStderr = redactSensitiveText(stderr);

  if (stdout && stdout.trim().startsWith('{')) {
    try {
      const data = JSON.parse(stdout);
      if (data && typeof data === 'object' && data.error) {
        const failure = {
          ok: false,
          code: data.error.code || `EXIT_${exitCode}`,
          message: redactSensitiveText(data.error.message || ''),
          allowedValues: data.error.allowedValues,
          stderr: safeStderr,
        };
        return isDailyQuotaExceeded(failure)
          ? { ...failure, code: 'DAILY_QUOTA_EXCEEDED', originalCode: failure.code }
          : failure;
      }
      if (exitCode === 0) return { ok: true, data };
      // Exit non-zero, no `error` key, parseable stdout → still useful.
      return { ok: true, data };
    } catch {
      /* fall through to stderr categorization */
    }
  }

  // Metrics schema returns a top-level array.
  if (stdout && stdout.trim().startsWith('[')) {
    try {
      const data = JSON.parse(stdout);
      if (exitCode === 0) return { ok: true, data };
    } catch { /* fall through */ }
  }

  return {
    ok: false,
    code: categorizeError(exitCode, stderr),
    stderr: safeStderr,
  };
}

export function redactSensitiveText(value) {
  return String(value ?? '')
    .replace(/\b(Bearer)\s+[A-Za-z0-9._~+/=-]{12,}/gi, '$1 [REDACTED]')
    .replace(/\b(Authorization:\s*)[^\r\n]+/gi, '$1[REDACTED]')
    .replace(/\b(x-vercel-id:\s*)[^\r\n]+/gi, '$1[REDACTED]')
    .replace(/\b(VERCEL_TOKEN|TURBO_TOKEN|NPM_TOKEN|NODE_AUTH_TOKEN|GITHUB_TOKEN)=("[^"]+"|'[^']+'|[^\s"'`]+)/g, '$1=[REDACTED]')
    .replace(/(--token(?:=|\s+))("[^"]+"|'[^']+'|[^\s"'`]+)/gi, '$1[REDACTED]')
    .replace(/\b(prj|team|usr)_[A-Za-z0-9]{8,}\b/g, '$1_[REDACTED]')
    .replace(/("token"\s*:\s*")[^"]{8,}(")/gi, '$1[REDACTED]$2');
}

// CLI doesn't emit machine-readable error codes for these states — stderr substring is fallback only.
function categorizeError(exitCode, stderr) {
  const lc = (stderr || '').toLowerCase();
  if (isDailyQuotaExceeded({ ok: false, stderr })) return 'DAILY_QUOTA_EXCEEDED';
  if (lc.includes('observability plus')) return 'OPLUS_REQUIRED';
  if (lc.includes('costs not found')) return 'USAGE_UNAVAILABLE';
  if (lc.includes('project not found')) return 'PROJECT_NOT_FOUND';
  if (lc.includes('not linked') || lc.includes('no project')) return 'NOT_LINKED';
  if (lc.includes('log in') || lc.includes('credentials')) return 'NOT_AUTH';
  if (lc.includes('rate limit') || lc.includes('429')) return 'RATE_LIMIT';
  if (lc.includes('permission') || lc.includes('not authorized') || lc.includes('403'))
    return 'FORBIDDEN';
  return `EXIT_${exitCode}`;
}

// Schema is global per team — pass scope so we hit the right team rather than user's currentTeam.
export async function hasObservabilityPlus(scope) {
  const r = await runVercelJson(scopedArgs(['metrics', 'schema', '--format', 'json'], scope));
  return r.ok;
}

export async function getMetricsSchema(scope) {
  const r = await runVercelJson(scopedArgs(['metrics', 'schema', '--format', 'json'], scope));
  return r.ok ? r.data : null;
}

export async function checkObservabilityPlusConfiguration({ orgId, projectId } = {}) {
  if (!orgId) {
    return {
      ok: false,
      source: 'observability-configuration-api',
      blocker: 'unknown',
      detail: 'No team ID was available for the Observability Plus configuration preflight.',
    };
  }
  if (String(orgId).startsWith('usr_')) {
    return {
      ok: false,
      source: 'observability-configuration-api',
      access: null,
      blocker: 'unknown',
      detail: 'The Observability Plus team configuration preflight is not available for a user-owned project; falling back to the scoped metrics probe.',
    };
  }
  const qs = `?teamId=${encodeURIComponent(orgId)}`;
  const r = await runVercelJson(['api', `/v1/observability/manage/configuration/projects${qs}`]);
  return classifyObservabilityPlusConfiguration(r, { projectId });
}

export function classifyObservabilityPlusConfiguration(result, { projectId } = {}) {
  const source = 'observability-configuration-api';
  if (result?.ok) {
    const disabledProjects = Array.isArray(result.data?.disabledProjects) ? result.data.disabledProjects : [];
    const disabled = projectId
      ? disabledProjects.find((p) => String(p?.id ?? '') === String(projectId))
      : null;
    if (disabled) {
      return {
        ok: true,
        source,
        access: false,
        blocker: 'project_disabled',
        detail: 'Observability Plus is enabled for the team but disabled for this project.',
        disabledProject: {
          id: disabled.id,
          name: disabled.name ?? null,
          disabledAt: disabled.disabledAt ?? null,
        },
      };
    }
    return {
      ok: true,
      source,
      access: true,
      blocker: null,
      detail: 'Observability Plus is enabled for this team/project.',
    };
  }

  const code = String(result?.code ?? 'unknown').toLowerCase();
  const text = `${result?.message ?? ''}\n${result?.stderr ?? ''}`.toLowerCase();
  const mentionsObservabilityPlusNotEnabled =
    /observability plus[\s\S]{0,160}not enabled/.test(text) ||
    /not enabled[\s\S]{0,160}observability plus/.test(text) ||
    /subscription to observability plus[\s\S]{0,160}required/.test(text);
  if (code === 'oplus_required' || ((code === 'not_found' || code === '404') && mentionsObservabilityPlusNotEnabled)) {
    return {
      ok: true,
      source,
      access: false,
      blocker: 'no_oplus_probe',
      detail: 'Route-level metrics are unavailable because Observability Plus is not enabled for this team.',
    };
  }
  if (/forbidden|not_authorized|403/.test(code) || /forbidden|not authorized|permission|403/.test(text)) {
    return {
      ok: false,
      source,
      access: null,
      blocker: 'forbidden',
      detail: 'Could not read Observability Plus configuration for this team. Run `vercel switch <team>` and verify access.',
    };
  }
  if (/not_auth|unauthorized|401/.test(code) || /unauthorized|log in|credentials|401/.test(text)) {
    return {
      ok: false,
      source,
      access: null,
      blocker: 'forbidden',
      detail: 'Could not read Observability Plus configuration because the Vercel CLI is not authenticated.',
    };
  }
  return {
    ok: false,
    source,
    access: null,
    blocker: 'unknown',
    detail: `Could not determine Observability Plus configuration before querying metrics (code=${code}).`,
  };
}

// Returns `{ok, ...}`. CLI summary defaults to top 10 groups under --group-by; widen via opts.limit.
export async function queryMetric(metricId, opts = {}) {
  const args = ['metrics', metricId, '--format', 'json'];
  if (opts.aggregation) args.push('-a', opts.aggregation);
  for (const dim of opts.groupBy ?? []) args.push('--group-by', dim);
  if (opts.filter) args.push('-f', opts.filter);
  if (opts.since) args.push('--since', opts.since);
  if (opts.until) args.push('--until', opts.until);
  if (opts.limit) args.push('--limit', String(opts.limit));

  // 3-layer protection: semaphore (8 concurrent) + sliding-window (80/60s) + retryOnRateLimit (3× 60-90s jitter). payment_required is terminal.
  const throttle = getMetricThrottle();
  const onRetry = (attempt, delayMs) => {
    console.error(`[queryMetric] ${metricId} hit RATE_LIMITED; retry ${attempt}/3 after ${(delayMs / 1000).toFixed(0)}s`);
  };
  return await throttle.run(() =>
    retryOnRateLimit(() => runVercelJson(scopedArgs(args, opts.scope)), { onRetry })
  );
}

// Team-owned projects need `?teamId=<orgId>` to avoid current-team drift. User-
// owned projects use the authenticated user context and should not pass teamId.
export async function getProjectConfig(projectId, orgId) {
  const qs = orgId && !String(orgId).startsWith('usr_')
    ? `?teamId=${encodeURIComponent(orgId)}`
    : '';
  const r = await runVercelJson(['api', `/v9/projects/${projectId}${qs}`]);
  return r.ok ? r.data : { error: r.code, stderr: r.stderr };
}

// USAGE_UNAVAILABLE distinguishes "no Costs feature" from genuine emptiness.
export async function getUsage({ days = 14, scope, groupByProject = true } = {}) {
  const toDate = new Date();
  const fromDate = new Date(toDate.getTime() - days * 86400000);
  const fmt = (d) => d.toISOString().slice(0, 10);
  const args = [
    'usage',
    '--format', 'json',
    '--from', fmt(fromDate),
    '--to', fmt(toDate),
  ];
  // The CLI rejects --breakdown with --group-by. Project grouping is higher
  // value for this skill because every recommendation must be project-scoped.
  if (groupByProject) args.push('--group-by', 'project');
  else args.push('--breakdown', 'daily');
  return await runVercelJson(scopedArgs(args, scope));
}

// CLI `--group-by project` returns project buckets under groupBy.data. Older
// breakdown-shaped fixtures tag service rows with projectId; keep both paths.
export function filterUsageByProject(usage, projectId, projectName = null) {
  if (!usage || !projectId) return { filtered: null, matched: false, unattributedTotal: 0 };
  if (usage.groupBy?.dimension === 'project' && Array.isArray(usage.groupBy.data)) {
    const project = usage.groupBy.data.find((entry) => projectMatches(entry, projectId, projectName));
    if (!project) return { filtered: null, matched: false, unattributedTotal: 0 };
    return {
      filtered: {
        ...usage,
        groupBy: { ...usage.groupBy, data: [project] },
        services: Array.isArray(project.services) ? project.services : [],
        totals: project.totals ?? null,
        project: { name: project.name ?? projectName ?? null, projectId: project.projectId ?? projectId },
      },
      matched: true,
      unattributedTotal: 0,
    };
  }
  const breakdown = usage.breakdown;
  if (!breakdown || !Array.isArray(breakdown.data)) {
    return { filtered: null, matched: false, unattributedTotal: 0 };
  }
  const out = {
    ...usage,
    breakdown: { ...breakdown, data: [] },
  };
  let matchedAny = false;
  let projectTotal = 0;
  let unattributedTotal = 0;

  for (const day of breakdown.data) {
    const services = Array.isArray(day.services) ? day.services : [];
    const projectRows = services.filter((s) => projectMatches(s, projectId, projectName));
    const unattributedRows = services.filter((s) => !s.projectId && !s.project);
    for (const r of projectRows) projectTotal += (r.billedCost ?? r.cost ?? 0);
    for (const r of unattributedRows) unattributedTotal += (r.billedCost ?? r.cost ?? 0);
    if (projectRows.length === 0) continue;
    matchedAny = true;
    out.breakdown.data.push({ ...day, services: projectRows });
  }

  if (!matchedAny) return { filtered: null, matched: false, unattributedTotal };

  out.services = aggregateServicesByName(out.breakdown.data);
  out.totals = { billedCost: projectTotal };
  return { filtered: out, matched: true, unattributedTotal };
}

function projectMatches(serviceRow, projectId, projectName = null) {
  if (!serviceRow) return false;
  if (serviceRow.projectId === projectId) return true;
  if (projectName && serviceRow.name === projectName) return true;
  if (projectName && serviceRow.project === projectName) return true;
  if (serviceRow.project === projectId) return true;
  if (serviceRow.project && (serviceRow.project.id === projectId || serviceRow.project.projectId === projectId || serviceRow.project.name === projectName)) return true;
  return false;
}

function aggregateServicesByName(days) {
  const byName = new Map();
  for (const day of days) {
    for (const s of (day.services ?? [])) {
      const key = s.name ?? '(unnamed)';
      const prev = byName.get(key) ?? { name: key, billedCost: 0, pricingQuantity: 0, pricingUnit: s.pricingUnit ?? null };
      prev.billedCost += (s.billedCost ?? s.cost ?? 0);
      prev.pricingQuantity += (s.pricingQuantity ?? 0);
      byName.set(key, prev);
    }
  }
  return Array.from(byName.values()).sort((a, b) => (b.billedCost ?? 0) - (a.billedCost ?? 0));
}

export async function getContract(scope) {
  const r = await runVercelJson(scopedArgs(['contract', '--format', 'json'], scope));
  return r.ok ? r.data : null;
}

export async function getAccountPlan(scope) {
  const currentTeamId = scope ? null : await getCurrentTeamId();
  const teamScope = scope || currentTeamId;

  if (teamScope && !String(teamScope).startsWith('usr_')) {
    const team = await getBillingPlanFromPath(`/v2/teams/${encodeURIComponent(teamScope)}`, 'team.billing.plan');
    if (team.plan !== 'unknown' || !/not_found|404/i.test(String(team.error ?? ''))) {
      return team;
    }
    // Older project links can carry a user/org id instead of a team id. If the
    // team lookup misses, fall back to the authenticated user's billing record.
  }

  return await getBillingPlanFromPath('/v2/user', 'user.billing.plan');
}

async function getCurrentTeamId() {
  const identity = await getCliIdentity();
  return identity?.team?.id ?? null;
}

async function getBillingPlanFromPath(path, source) {
  const r = await runVercelJson(['api', path]);
  if (!r.ok) {
    return {
      plan: 'unknown',
      reason: `${source} unavailable (${r.code ?? 'unknown'})`,
      source,
      error: r.code ?? 'unknown',
    };
  }

  const parsed = extractBillingPlan(r.data);
  if (!parsed) {
    return {
      plan: 'unknown',
      reason: `${source} missing from Vercel API response`,
      source,
    };
  }

  return {
    ...parsed,
    reason: `${source}=${parsed.plan}`,
    source,
  };
}

export function extractBillingPlan(data) {
  const raw =
    data?.billing?.plan ??
    data?.team?.billing?.plan ??
    data?.user?.billing?.plan ??
    null;
  const plan = normalizeBillingPlan(raw);
  return plan ? { plan, rawPlan: raw } : null;
}

function normalizeBillingPlan(raw) {
  const value = String(raw ?? '').trim().toLowerCase();
  if (value === 'hobby' || value === 'pro' || value === 'enterprise') return value;
  return null;
}

// Primary source: billing.plan from `/v2/teams/:team` or `/v2/user`.
// Fallbacks: contract category, then recent billed usage for legacy CLI/API gaps.
export function inferPlan(contract, opts = {}) {
  const accountPlan = extractPlanOption(opts?.accountPlan);
  if (accountPlan) {
    return {
      plan: accountPlan.plan,
      reason: accountPlan.reason ?? `${accountPlan.source ?? 'billing.plan'}=${accountPlan.plan}`,
    };
  }

  const commits = contract?.commitments ?? [];

  if (commits.length > 0) {
    const c0 = commits[0] ?? {};
    // category field names are tentative — try several.
    const category = c0.category ?? c0.commitmentCategory ?? c0.type ?? null;
    if (category === 'Spend' || category === 'spend') {
      return { plan: 'pro', reason: `commitment category=${category}` };
    }
    if (category === 'Usage' || category === 'usage') {
      return { plan: 'enterprise', reason: `commitment category=${category}` };
    }
    return { plan: 'uncertain', reason: `unknown commitment category=${category}` };
  }

  const totalCost = opts?.usageTotalCost;
  if (typeof totalCost === 'number' && totalCost > 0) {
    return {
      plan: 'pro',
      reason: `commitments=[] but usage=$${totalCost.toFixed(2)}/window — Pro pay-as-you-go (Hobby teams don't bill)`,
    };
  }

  return {
    plan: 'uncertain',
    reason: typeof totalCost === 'number' && totalCost === 0
      ? 'no commitments and no billed usage in window (could be Hobby, or Pro with no recent billing)'
      : 'no commitments on contract; usage unavailable',
  };
}

function extractPlanOption(accountPlan) {
  if (!accountPlan) return null;
  if (typeof accountPlan === 'string') {
    const plan = normalizeBillingPlan(accountPlan);
    return plan ? { plan, reason: `billing.plan=${plan}` } : null;
  }

  const plan = normalizeBillingPlan(accountPlan.plan);
  if (!plan) return null;
  return {
    plan,
    reason: accountPlan.reason ?? (
      accountPlan.source
        ? `${accountPlan.source}=${plan}`
        : `billing.plan=${plan}`
    ),
    source: accountPlan.source ?? null,
  };
}

export async function detectStack(cwd = process.cwd()) {
  const pkgPath = join(cwd, 'package.json');
  let pkg = {};
  try {
    pkg = JSON.parse(await readFile(pkgPath, 'utf-8'));
  } catch {
    return baselineStack();
  }
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };

  const framework =
    deps.next ? 'next' :
    deps.nuxt ? 'nuxt' :
    deps.astro ? 'astro' :
    deps['@sveltejs/kit'] ? 'sveltekit' :
    deps['@remix-run/react'] ? 'remix' :
    deps.hono ? 'hono' :
    'unknown';

  const frameworkVersion = (() => {
    const m = { next: 'next', nuxt: 'nuxt', astro: 'astro', sveltekit: '@sveltejs/kit', remix: '@remix-run/react', hono: 'hono' };
    const dep = m[framework];
    if (!dep) return null;
    return (deps[dep] || '').replace(/^[\^~]/, '') || null;
  })();

  const hasAppRouter = await pathExists(join(cwd, 'app')) || await pathExists(join(cwd, 'src/app'));
  const hasPagesRouter = await pathExists(join(cwd, 'pages')) || await pathExists(join(cwd, 'src/pages'));
  const typescript = await pathExists(join(cwd, 'tsconfig.json'));
  const cacheComponents = framework === 'next'
    ? await detectNextCacheComponents(cwd)
    : null;

  const orm =
    deps.prisma || deps['@prisma/client'] ? 'prisma' :
    deps['drizzle-orm'] ? 'drizzle' :
    deps.kysely ? 'kysely' :
    'none';
  const vercelFlagsPackages = [
    '@vercel/flags',
    '@vercel/flags/next',
    '@vercel/flags/sveltekit',
    '@vercel/flags/nuxt',
  ].filter((name) => deps[name]);
  const workflowPackages = Object.keys(deps)
    .filter((name) => name === 'workflow' || name.startsWith('@workflow/'))
    .sort();

  const isMonorepo =
    !!pkg.workspaces ||
    await pathExists(join(cwd, 'pnpm-workspace.yaml')) ||
    await pathExists(join(cwd, 'lerna.json'));

  return {
    framework,
    frameworkVersion,
    hasAppRouter,
    hasPagesRouter,
    cacheComponents,
    typescript,
    orm,
    isMonorepo,
    rootDirectory: null,
    hasVercelFlagsPackage: vercelFlagsPackages.length > 0,
    vercelFlagsPackages,
    hasWorkflowPackage: workflowPackages.length > 0,
    workflowPackages,
  };
}

function baselineStack() {
  return {
    framework: 'unknown', frameworkVersion: null,
    hasAppRouter: false, hasPagesRouter: false, cacheComponents: null, typescript: false,
    orm: 'none', isMonorepo: false, rootDirectory: null,
    hasVercelFlagsPackage: false, vercelFlagsPackages: [],
    hasWorkflowPackage: false, workflowPackages: [],
  };
}

async function detectNextCacheComponents(cwd) {
  for (const name of ['next.config.js', 'next.config.mjs', 'next.config.ts', 'next.config.cjs']) {
    try {
      const content = await readFile(join(cwd, name), 'utf-8');
      if (/\bcacheComponents\s*:\s*true\b/.test(content)) return true;
      if (/\bcacheComponents\s*:\s*false\b/.test(content)) return false;
    } catch {}
  }
  return null;
}

async function pathExists(p) {
  try { await access(p); return true; } catch { return false; }
}

// `--scope <teamId>` is buggy on several subcommands (silently falls back to
// currentTeam). Resolve raw account IDs to slugs/usernames before scoped calls.
function scopedArgs(args, scope) {
  if (!scope) return args;
  if (typeof scope === 'string' && /^(team|usr)_/.test(scope)) {
    throw new Error('RAW_ID_SCOPE_UNRESOLVED: resolve the linked org/user ID to a CLI scope slug before running Vercel commands.');
  }
  return [...args, '--scope', scope];
}

// CLI summary field is `<metric_id_with_underscores>_<aggregation>` (e.g. `vercel_request_count_sum`).
export function normalizeSummary(metricResponse, metricId, aggregation, groupBy = []) {
  if (!metricResponse || metricResponse.error) return [];
  const field = `${metricId.replace(/\./g, '_')}_${aggregation}`;
  const rows = Array.isArray(metricResponse.summary) ? metricResponse.summary : [];
  return rows.map((row) => {
    const out = { value: row[field] ?? null };
    for (const dim of groupBy) {
      if (row[dim] !== undefined) out[dim] = row[dim];
    }
    return out;
  });
}
