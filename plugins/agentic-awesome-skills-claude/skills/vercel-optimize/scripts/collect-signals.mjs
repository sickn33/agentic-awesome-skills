#!/usr/bin/env node
// Emits signals.json: Vercel CLI capability probe + project config + plan +
// usage + codebase stack + metric queries. Status → stderr, JSON → stdout.
// Degrades gracefully when capabilities are missing.

import {
  checkCliVersion,
  checkAuth,
  resolveProjectId,
  resolveCommandScope,
  hasObservabilityPlus,
  checkObservabilityPlusConfiguration,
  getMetricsSchema,
  getProjectConfig,
  getAccountPlan,
  getContract,
  getUsage,
  filterUsageByProject,
  inferPlan,
  queryMetric,
  detectStack,
  redactSensitiveText,
} from '../lib/vercel.mjs';
import { classifyFrameworkSupport } from '../lib/framework-support.mjs';
import { QUERIES, TIME_WINDOW, normalizerFor } from '../lib/queries.mjs';

const SCHEMA_VERSION = '1.2';

const log = (...args) => console.error('[collect-signals]', ...args);

function parseArgs(argv) {
  let explicitProjectId = null;
  let continueWithoutObservability = process.env.VERCEL_OPTIMIZE_CONTINUE_WITHOUT_OBSERVABILITY === '1';
  let continueUnsupportedFramework = process.env.VERCEL_OPTIMIZE_CONTINUE_UNSUPPORTED_FRAMEWORK === '1';

  for (const arg of argv) {
    if (arg === '--continue-without-observability') {
      continueWithoutObservability = true;
      continue;
    }
    if (arg === '--continue-unsupported-framework') {
      continueUnsupportedFramework = true;
      continue;
    }
    if (arg.startsWith('--')) {
      throw new Error(`UNKNOWN_ARG: ${arg}`);
    }
    if (!explicitProjectId) {
      explicitProjectId = arg;
      continue;
    }
    throw new Error(`UNKNOWN_ARG: ${arg}`);
  }

  return { explicitProjectId, continueWithoutObservability, continueUnsupportedFramework };
}

async function main() {
  const { explicitProjectId, continueWithoutObservability, continueUnsupportedFramework } = parseArgs(process.argv.slice(2));

  log('checking Vercel CLI version…');
  const cli = await checkCliVersion();
  log(`vercel CLI v${cli.join('.')} OK`);

  log('checking auth…');
  await checkAuth();
  log('auth OK');

  log('resolving project id…');
  const project = await resolveProjectId(explicitProjectId);
  if (!project) {
    throw new Error(
      'NO_PROJECT_ID: pass one as argv, set VERCEL_PROJECT_ID, or run `vercel link` in this directory.'
    );
  }
  log(`project link resolved (source=${project.source}; teamScope=${project.orgId ? 'yes' : 'no'})`);

  if (!project.orgId) {
    throw new Error('PROJECT_SCOPE_UNRESOLVED: the project was resolved without an owner account. Ask the user which Vercel team or personal scope owns the project, then rerun from a linked app directory or set VERCEL_PROJECT_ID with VERCEL_ORG_ID for that scope.');
  }

  log('checking framework support…');
  const stack = await detectStack();
  const frameworkSupport = classifyFrameworkSupport(stack);
  log(`framework=${stack.framework}@${stack.frameworkVersion ?? '?'} support=${frameworkSupport.status}`);

  if (!frameworkSupport.ok && !continueUnsupportedFramework) {
    writeOutput({
      schemaVersion: SCHEMA_VERSION,
      collectedAt: new Date().toISOString(),
      timeWindow: TIME_WINDOW,
      projectId: project.projectId,
      orgId: project.orgId,
      projectIdSource: project.source,
      commandScope: null,
      frameworkSupport,
      frameworkSupportBlocker: frameworkSupport.blocker,
      frameworkSupportDetail: frameworkSupport.detail,
      observabilityPlus: null,
      observabilityPlusPreflight: null,
      observabilityPlusUsable: null,
      observabilityPlusBlocker: null,
      observabilityPlusBlockerDetail: null,
      plan: {
        plan: 'uncertain',
        reason: 'not collected before unsupported-framework confirmation',
      },
      project: null,
      contract: null,
      usage: null,
      usageScope: null,
      usageTeamTotal: null,
      usageError: 'NOT_COLLECTED_UNSUPPORTED_FRAMEWORK',
      stack,
      metrics: {},
      metricsSchema: null,
    }, { usable: true, blocker: null, detail: 'Observability Plus was not checked.' }, frameworkSupport);
    return;
  }

  if (!frameworkSupport.ok && continueUnsupportedFramework) {
    log('continuing after unsupported framework blocker because --continue-unsupported-framework was set');
  }

  log('resolving Vercel CLI command scope…');
  const commandScope = await resolveCommandScope(project);
  if (!commandScope.ok) {
    throw new Error(`SCOPE_UNRESOLVED: ${commandScope.detail} Run \`vercel switch <team>\` or re-link with \`vercel link --yes --project <project-name-or-id> --team <team-slug>\`.`);
  }
  const scope = commandScope.cliScope || undefined;
  log(`command scope resolved (source=${commandScope.source}; scoped=${scope ? 'yes' : 'no'})`);

  log('validating linked project belongs to the resolved scope…');
  const projectCfg = await getProjectConfig(project.projectId, project.orgId);
  const projectScope = validateProjectScope(projectCfg, project);
  if (!projectScope.ok) {
    throw new Error(`PROJECT_SCOPE_MISMATCH: ${projectScope.detail} Ask the user to confirm the exact Vercel project and team/personal scope, then rerun after \`vercel link --yes --project <project-name-or-id> --team <team-slug>\` or after setting both VERCEL_PROJECT_ID and VERCEL_ORG_ID for the intended scope.`);
  }
  log(`project scope verified (source=${projectScope.source})`);

  log('checking Observability Plus configuration…');
  const observabilityPlusConfig = await checkObservabilityPlusConfiguration({
    orgId: project.orgId,
    projectId: project.projectId,
  });
  log(`observabilityPlusPreflight=${observabilityPlusConfig.access === true ? 'enabled' : observabilityPlusConfig.blocker ?? 'unknown'} (${observabilityPlusConfig.source})`);

  let oplus = observabilityPlusConfig.access === true;
  if (observabilityPlusConfig.access == null) {
    log('Observability Plus configuration preflight inconclusive; falling back to metrics schema probe…');
    oplus = await hasObservabilityPlus(scope);
  }
  log(`observabilityPlus=${oplus}`);

  const schema = oplus ? await getMetricsSchema(scope) : null;
  if (oplus && schema) {
    const count = Array.isArray(schema) ? schema.length : (schema.metrics?.length ?? 0);
    log(`metric catalog: ${count} metrics available`);
  }

  // Check one cheap metric before pulling slower project context. If this fails,
  // the orchestrator can ask the user immediately instead of waiting on billing.
  let metrics = {};
  let metricsCanaryOk = false;
  if (oplus) {
    log(`checking Observability Plus metrics access (window=${TIME_WINDOW})…`);
    const t0 = Date.now();
    const canary = await queryMetric('vercel.request.count', {
      aggregation: 'sum',
      since: TIME_WINDOW,
      limit: 1,
      scope,
    });
    metricsCanaryOk = !!canary?.ok;
    if (!metricsCanaryOk) {
      metrics = {
        observabilityPlusCanary: {
          ...canary,
          metricId: 'vercel.request.count',
          aggregation: 'sum',
        },
      };
      log(`metrics access check failed: ${canary?.code ?? 'unknown'} — skipping full metrics fan-out`);
    } else {
      log(`metrics access check passed in ${Date.now() - t0}ms`);
    }
  } else {
    log('skipping metric queries (Observability Plus preflight did not confirm access)');
  }

  let oplusDiag = observabilityPlusConfig.access === false
    ? {
        usable: false,
        blocker: observabilityPlusConfig.blocker,
        detail: observabilityPlusConfig.detail,
      }
    : (metricsCanaryOk
        ? { usable: true, blocker: null, detail: 'Observability Plus metrics access check passed.' }
        : diagnoseObservabilityPlus(metrics, oplus));

  if (!oplusDiag.usable && !continueWithoutObservability) {
    writeOutput({
      schemaVersion: SCHEMA_VERSION,
      collectedAt: new Date().toISOString(),
      timeWindow: TIME_WINDOW,
      projectId: project.projectId,
      orgId: project.orgId,
      projectIdSource: project.source,
      commandScope,
      observabilityPlus: oplus,
      observabilityPlusPreflight: observabilityPlusConfig,
      observabilityPlusUsable: oplusDiag.usable,
      observabilityPlusBlocker: oplusDiag.blocker,
      observabilityPlusBlockerDetail: oplusDiag.detail,
      frameworkSupport,
      frameworkSupportBlocker: frameworkSupport.blocker,
      frameworkSupportDetail: frameworkSupport.detail,
      plan: {
        plan: 'uncertain',
        reason: 'not collected before Observability Plus blocker confirmation',
      },
      project: projectCfg,
      contract: null,
      usage: null,
      usageScope: null,
      usageTeamTotal: null,
      usageError: 'NOT_COLLECTED_OBSERVABILITY_BLOCKED',
      stack: null,
      metrics,
      metricsSchema: schema,
    }, oplusDiag);
    return;
  }

  if (!oplusDiag.usable && continueWithoutObservability) {
    log('continuing after Observability Plus blocker because --continue-without-observability was set');
  }

  log('pulling account plan + contract + usage in parallel…');
  const [accountPlan, contract, usageResult] = await Promise.all([
    getAccountPlan(project.orgId || scope),
    getContract(scope),
    getUsage({ days: 14, scope }),
  ]);

  let usage = null;
  let usageContextMismatch = false;
  let usageTotalCost = null;
  let usageScope = 'team';
  let usageTeamTotal = null;
  if (usageResult?.ok) {
    usage = usageResult.data;
    const contractContext = contract?.context;
    if (usage?.context && contractContext && usage.context !== contractContext) {
      usageContextMismatch = true;
      log(`usage: WARNING context mismatch — returned context=${usage.context} but project team=${contractContext}; treating usage as unavailable for this project`);
      usage = null;
    } else {
      // Capture team total pre-filter so the report can label "this project vs team-wide" honestly.
      usageTeamTotal = sumUsageCosts(usage);
      const filterResult = filterUsageByProject(usage, project.projectId, projectCfg?.name);
      if (filterResult.matched) {
        usage = filterResult.filtered;
        usageScope = 'project';
        usageTotalCost = sumUsageCosts(usage);
        log(`usage: filtered to project — ~$${usageTotalCost.toFixed(2)} (team-wide ~$${usageTeamTotal.toFixed(2)}; unattributed ~$${filterResult.unattributedTotal.toFixed(2)})`);
      } else {
        usageTotalCost = usageTeamTotal;
        log(`usage: ~$${usageTotalCost.toFixed(2)} billed across services (team-wide — no per-project usage rows matched the linked project; report will label this team-wide)`);
      }
    }
  } else {
    log(`usage: unavailable (${usageResult?.code ?? 'unknown'}) — degrading to scanner+metrics-only mode`);
  }

  const planInfo = inferPlan(contract, { accountPlan, usageTotalCost });
  log(`plan=${planInfo.plan} (${planInfo.reason})`);

  if (projectCfg?.error) {
    log(`project config: failed (${projectCfg.error}) — gates that need it will skip`);
  }

  log(`stack: ${stack.framework}@${stack.frameworkVersion ?? '?'} ${stack.hasAppRouter ? 'app-router' : ''}${stack.hasPagesRouter ? ' pages-router' : ''}${stack.orm !== 'none' ? ` orm=${stack.orm}` : ''}`);

  // Each query is wrapped; one failure degrades only that metric.
  if (oplus && metricsCanaryOk) {
    log(`querying observability metrics (${QUERIES.length} metrics in parallel)…`);
    const t0 = Date.now();
    metrics = await collectMetrics(scope);
    const wallMs = Date.now() - t0;
    const counts = Object.fromEntries(
      Object.entries(metrics).map(([k, v]) => {
        if (!v) return [k, 'null'];
        if (!v.ok) return [k, `err:${v.code}`];
        const rows = Array.isArray(v.rows) ? v.rows.length : 0;
        return [k, `${rows} rows`];
      })
    );
    log(`metrics collected in ${wallMs}ms: ${JSON.stringify(counts)}`);
  }

  // The `vercel metrics schema` probe alone is NOT a reliable usability signal:
  // it can return OK while per-route queries fail with payment_required (metrics
  // unavailable for the team) or FORBIDDEN (auth-scope mismatch). Diagnose AFTER
  // running queries by counting failure codes so the orchestrator can PAUSE and
  // surface the choice before falling back to scanner-only mode.
  oplusDiag = observabilityPlusConfig.access === false
    ? {
        usable: false,
        blocker: observabilityPlusConfig.blocker,
        detail: observabilityPlusConfig.detail,
      }
    : diagnoseObservabilityPlus(metrics, oplus);


  const output = {
    schemaVersion: SCHEMA_VERSION,
    collectedAt: new Date().toISOString(),
    timeWindow: TIME_WINDOW,
    projectId: project.projectId,
    orgId: project.orgId,
    projectIdSource: project.source,
    commandScope,
    observabilityPlus: oplus,
    observabilityPlusPreflight: observabilityPlusConfig,
    observabilityPlusUsable: oplusDiag.usable,
    observabilityPlusBlocker: oplusDiag.blocker,
    observabilityPlusBlockerDetail: oplusDiag.detail,
    frameworkSupport,
    frameworkSupportBlocker: frameworkSupport.blocker,
    frameworkSupportDetail: frameworkSupport.detail,
    plan: planInfo,
    project: projectCfg,
    contract,
    usage,
    usageScope,
    usageTeamTotal,
    usageError: usageResult?.ok
      ? (usageContextMismatch ? 'USAGE_CONTEXT_MISMATCH' : null)
      : (usageResult?.code ?? 'UNKNOWN'),
    stack,
    metrics,
    metricsSchema: schema,
  };

  writeOutput(output, oplusDiag);
}

function writeOutput(output, oplusDiag, frameworkSupport = output.frameworkSupport) {
  if (frameworkSupport?.blocker) {
    log(`⚠ Framework is not supported for metric-backed route-to-file optimization: ${frameworkSupport.detail}`);
    log('   The orchestrator should PAUSE and ask whether to continue with a limited platform/scanner audit.');
  }
  if (!oplusDiag.usable) {
    log(`⚠ Observability Plus is NOT usable on this project: blocker=${oplusDiag.blocker} (${oplusDiag.detail})`);
    log('   The orchestrator should PAUSE and follow the blocker-specific remediation before proceeding.');
  }

  process.stdout.write(JSON.stringify(output, null, 2) + '\n');
  log('done');
}

function validateProjectScope(projectCfg, project) {
  if (!projectCfg || projectCfg.error) {
    return {
      ok: false,
      source: 'project-api',
      detail: `The resolved account could not read the resolved project (project API error=${projectCfg?.error ?? 'unknown'}).`,
    };
  }

  if (projectCfg.id && String(projectCfg.id) !== String(project.projectId)) {
    return {
      ok: false,
      source: 'project-api',
      detail: 'The project API returned a different project than the collector resolved from the link or environment.',
    };
  }

  const ownerId = firstString(
    projectCfg.accountId,
    projectCfg.orgId,
    projectCfg.ownerId,
    projectCfg.teamId,
    projectCfg.team?.id,
    projectCfg.account?.id,
    projectCfg.owner?.id,
  );
  if (ownerId && project.orgId && String(ownerId) !== String(project.orgId)) {
    return {
      ok: false,
      source: 'project-api',
      detail: 'The project API returned an owner account that differs from the collector-resolved account.',
    };
  }

  return {
    ok: true,
    source: ownerId ? 'project-api-owner' : 'project-api-readable',
  };
}

function firstString(...values) {
  return values.find((value) => typeof value === 'string' && value.trim() !== '') ?? null;
}

async function collectMetrics(scope) {
  const results = await Promise.all(
    QUERIES.map(async (entry) => {
      const r = await queryMetric(entry.metricId, {
        aggregation: entry.aggregation,
        groupBy: entry.groupBy,
        filter: entry.filter,
        since: TIME_WINDOW,
        limit: entry.limit,
        scope,
      });
      return [entry, r];
    })
  );

  const out = {};
  for (const [entry, result] of results) {
    out[entry.id] = enrichEntry(entry, result);
  }
  return out;
}

function enrichEntry(entry, result) {
  if (!result?.ok) {
    return {
      ...result,
      metricId: entry.metricId,
      aggregation: entry.aggregation,
      groupBy: entry.groupBy,
    };
  }
  const normalize = normalizerFor(entry);
  const { rows } = normalize(result.data);
  return {
    ...result,
    rows,
    metricId: entry.metricId,
    aggregation: entry.aggregation,
    groupBy: entry.groupBy,
  };
}

// `vercel usage --format json` shape is documented but not stable across CLI
// versions; try several roots, return null if none match.
function sumUsageCosts(usage) {
  if (!usage) return null;
  if (typeof usage.totalCost === 'number') return usage.totalCost;
  if (typeof usage.totals?.billedCost === 'number') return usage.totals.billedCost;
  if (Array.isArray(usage.services)) {
    return usage.services.reduce((s, x) => s + (x.billedCost ?? x.cost ?? 0), 0);
  }
  if (Array.isArray(usage.breakdown?.data)) {
    return usage.breakdown.data.reduce((s, d) => {
      if (Array.isArray(d.services)) {
        return s + d.services.reduce((ss, x) => ss + (x.billedCost ?? x.cost ?? 0), 0);
      }
      return s + (d.billedCost ?? d.cost ?? 0);
    }, 0);
  }
  return null;
}

// Returns { usable, blocker, detail }. `blocker` enum:
//   null | 'no_oplus_probe' | 'project_disabled' | 'payment_required' |
//   'forbidden' | 'daily_quota_exceeded' | 'project_not_found' |
//   'not_linked' | 'all_failed_other' | 'no_traffic'
export function diagnoseObservabilityPlus(metrics, oplusProbe) {
  if (!oplusProbe) {
    return {
      usable: false,
      blocker: 'no_oplus_probe',
      detail: 'vercel metrics schema returned non-OK; the team does not have Observability Plus enabled.',
    };
  }

  const entries = Object.values(metrics);
  if (entries.length === 0) {
    return { usable: false, blocker: 'no_oplus_probe', detail: 'No metrics were attempted.' };
  }

  const failures = entries.filter((m) => m && m.ok === false);
  const successes = entries.filter((m) => m && m.ok !== false);

  if (successes.length === 0) {
    const codeCounts = new Map();
    for (const f of failures) {
      const code = String(f.code ?? 'unknown').toLowerCase();
      codeCounts.set(code, (codeCounts.get(code) ?? 0) + 1);
    }
    const top = [...codeCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    const topCode = top?.[0] ?? 'unknown';
    if (/daily_quota_exceeded/.test(topCode)) {
      return {
        usable: false,
        blocker: 'daily_quota_exceeded',
        detail: `${top[1]}/${entries.length} metric queries hit the daily Observability query limit. Retry after the next UTC midnight reset.`,
      };
    }
    if (/payment_required/.test(topCode)) {
      const text = failures
        .map((f) => `${f.message ?? ''}\n${f.stderr ?? ''}`)
        .join('\n')
        .toLowerCase();
      if (
        /subscription to observability plus[\s\S]{0,160}required/.test(text) ||
        /observability plus[\s\S]{0,160}not enabled/.test(text)
      ) {
        return {
          usable: false,
          blocker: 'no_oplus_probe',
          detail: `${top[1]}/${entries.length} metric queries need route-level Observability Plus data. Enable Observability Plus, then re-run the metric-backed audit.`,
        };
      }
      return {
        usable: false,
        blocker: 'payment_required',
        detail: `${top[1]}/${entries.length} metric queries returned payment_required. Route-level metrics were recognized for this team, but these queries are not usable. Check the team's Observability Plus subscription or event quota.`,
      };
    }
    if (/forbidden|not_authorized|403/.test(topCode)) {
      return {
        usable: false,
        blocker: 'forbidden',
        detail: `${top[1]}/${entries.length} metric queries returned FORBIDDEN. Auth-scope mismatch — likely logged in to the wrong team (run \`vercel switch\`).`,
      };
    }
    if (/project_not_found/.test(topCode)) {
      return {
        usable: false,
        blocker: 'project_not_found',
        detail: `Project ID not visible to the auth'd team. Run \`vercel switch\` or verify the project ID.`,
      };
    }
    if (/not_linked/.test(topCode)) {
      return {
        usable: false,
        blocker: 'not_linked',
        detail: `${top[1]}/${entries.length} metric queries returned NOT_LINKED. Link the app directory first: \`vercel link --yes --project <project-name-or-id> --cwd <project-dir>\`; add \`--team <team-id-or-slug>\` when the team is known.`,
      };
    }
    return {
      usable: false,
      blocker: 'all_failed_other',
      detail: `Every metric query failed; top error code was \`${topCode}\` (${top?.[1]}/${entries.length}).`,
    };
  }

  // Some queries succeeded; zero rows across the board = "no traffic in window",
  // NOT an Observability Plus billing issue.
  const totalRows = successes.reduce((s, m) => s + (Array.isArray(m.rows) ? m.rows.length : 0), 0);
  if (totalRows === 0) {
    return {
      usable: true,
      blocker: 'no_traffic',
      detail: 'Observability Plus queries succeeded but every metric returned 0 rows. Either the project has no traffic in the 14-day window, or Observability Plus retention is limited (free tier = 1 day on Pro).',
    };
  }

  return { usable: true, blocker: null, detail: 'Observability Plus is usable; queries returned data.' };
}

// Run main() only as a CLI; the test suite imports diagnoseObservabilityPlus directly.
import { fileURLToPath } from 'node:url';
import { realpathSync } from 'node:fs';
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  main().catch((err) => {
    console.error('[collect-signals] FAILED:', redactSensitiveText(err.message));
    process.exit(1);
  });
}
