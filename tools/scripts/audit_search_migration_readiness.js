#!/usr/bin/env node
'use strict';

/*
 * This audit deliberately uses only saved evidence.  It is not a substitute for
 * a live deploy check and must never turn a legacy-only dashboard capture into
 * a green migration.
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_LEGACY_PACKAGE = 'antigravity-awesome-skills';
const DEFAULT_CURRENT_PACKAGE = 'agentic-awesome-skills';
const DEFAULT_CURRENT_PAGES_URL = 'https://sickn33.github.io/agentic-awesome-skills/';
const DEFAULT_LEGACY_PAGES_URL = 'https://sickn33.github.io/antigravity-awesome-skills/';
const SNAPSHOT_DIRECTORY = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_MAX_EVIDENCE_AGE_DAYS = 7;
const DASHBOARD_FILES = {
  gsc: {
    file: 'google-search-console.json',
    hosts: new Set(['search.google.com']),
    pathPrefix: '/search-console/',
    primaryParam: 'resource_id',
  },
  bing: {
    file: 'bing-webmaster-search-performance.json',
    hosts: new Set(['bing.com', 'www.bing.com']),
    pathPrefix: '/webmasters/',
    primaryParam: 'siteUrl',
  },
};

function normaliseUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    url.hash = '';
    url.search = '';
    return url.toString();
  } catch (_) {
    return null;
  }
}

function withTrailingSlash(value) {
  const url = normaliseUrl(value);
  return url && url.endsWith('/') ? url : url && `${url}/`;
}

function readJson(filePath, errors, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    errors.push(`${label}: ${error.message}`);
    return null;
  }
}

function parseSitemap(filePath, errors) {
  let source;
  try {
    source = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    errors.push(`current sitemap: ${error.message}`);
    return [];
  }
  const locations = [...source.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)]
    .map((match) => withTrailingSlash(match[1]))
    .filter(Boolean);
  if (!locations.length) errors.push('current sitemap: contains no valid <loc> URLs');
  return [...new Set(locations)].sort();
}

function inferLegacyPagesUrl(currentPagesUrl) {
  if (!currentPagesUrl) return null;
  const inferred = withTrailingSlash(currentPagesUrl.replace('/agentic-awesome-skills/', '/antigravity-awesome-skills/'));
  return inferred && inferred !== currentPagesUrl ? inferred : null;
}

function isValidIsoDate(value) {
  if (typeof value !== 'string' || !SNAPSHOT_DIRECTORY.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

function readSnapshots(snapshotRoot, filename, errors) {
  let entries;
  try {
    entries = fs.readdirSync(snapshotRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && isValidIsoDate(entry.name))
      .map((entry) => entry.name)
      .sort();
  } catch (error) {
    errors.push(`snapshot root: ${error.message}`);
    return [];
  }
  return entries.flatMap((directory) => {
    const filePath = path.join(snapshotRoot, directory, filename);
    if (!fs.existsSync(filePath)) return [];
    const data = readJson(filePath, errors, `${directory}/${filename}`);
    return data && typeof data === 'object' ? [{ directory, filePath, data }] : [];
  });
}

function propertyEvidence(data, dashboardConfig) {
  const signals = [];
  for (const [source, raw] of [
    ['source_property', data.source_property],
    ['property_url', data.property_url],
    ['propertyUrl', data.propertyUrl],
    ['site_url', data.site_url],
    ['siteUrl', data.siteUrl],
  ]) {
    const value = withTrailingSlash(raw);
    if (value) signals.push({ source, value });
  }
  let dashboardValid = false;
  let dashboardValidationReason = 'missing dashboard_url';
  if (typeof data.dashboard_url === 'string') {
    try {
      const dashboard = new URL(data.dashboard_url);
      const hostValid = dashboard.protocol === 'https:' && dashboardConfig.hosts.has(dashboard.hostname.toLowerCase());
      const pathValid = dashboard.pathname.startsWith(dashboardConfig.pathPrefix);
      const primary = withTrailingSlash(dashboard.searchParams.get(dashboardConfig.primaryParam));
      dashboardValid = Boolean(hostValid && pathValid && primary);
      dashboardValidationReason = dashboardValid ? null : 'dashboard host, path, or primary property parameter is invalid';
      if (dashboardValid) {
        for (const param of ['resource_id', 'siteUrl']) {
          const value = withTrailingSlash(dashboard.searchParams.get(param));
          if (value) signals.push({ source: `dashboard_url:${param}`, value });
        }
      }
    } catch (_) {
      dashboardValidationReason = 'dashboard_url is malformed';
    }
  }
  const distinct = [...new Set(signals.map((signal) => signal.value))];
  const intendedProperty = withTrailingSlash(data.intended_property);
  const property = distinct.length === 1 ? distinct[0] : null;
  return {
    property,
    signals,
    property_conflict: distinct.length > 1,
    intended_property: intendedProperty,
    intended_matches_observed: !intendedProperty || (property !== null && intendedProperty === property),
    dashboard_valid: dashboardValid,
    dashboard_validation_reason: dashboardValidationReason,
  };
}

function classifyProperty(property, currentPagesUrl, legacyPagesUrl) {
  const value = withTrailingSlash(property);
  if (!value) return 'unknown';
  if (currentPagesUrl && value === currentPagesUrl) return 'current';
  if (legacyPagesUrl && value === legacyPagesUrl) return 'legacy';
  return 'other';
}

function validMetric(value) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function captureFreshness(capturedAt, snapshotDate, asOfDate, maxAgeDays) {
  const captured = typeof capturedAt === 'string' ? new Date(capturedAt) : null;
  if (!captured || Number.isNaN(captured.getTime())) {
    return { valid: false, age_days: null, reason: 'missing or invalid captured_at_utc' };
  }
  const capturedDate = captured.toISOString().slice(0, 10);
  const ageDays = (Date.parse(`${asOfDate}T00:00:00Z`) - Date.parse(`${capturedDate}T00:00:00Z`)) / 86400000;
  if (capturedDate !== snapshotDate) return { valid: false, age_days: ageDays, reason: 'capture date does not match snapshot directory' };
  if (capturedDate > asOfDate) return { valid: false, age_days: ageDays, reason: 'capture is in the future' };
  if (ageDays > maxAgeDays) return { valid: false, age_days: ageDays, reason: 'capture is stale' };
  return { valid: true, age_days: ageDays, reason: null };
}

function dashboardEvidence(snapshotRoot, dashboardConfig, currentPagesUrl, legacyPagesUrl, errors, asOfDate, maxAgeDays) {
  const evidence = readSnapshots(snapshotRoot, dashboardConfig.file, errors).map(({ directory, filePath, data }) => {
    const property = propertyEvidence(data, dashboardConfig);
    const signalPropertyClasses = [...new Set(property.signals.map((signal) =>
      classifyProperty(signal.value, currentPagesUrl, legacyPagesUrl)))];
    return {
      snapshot: directory,
      file: filePath,
      status: data.status || 'unknown',
      ...property,
      signal_property_classes: signalPropertyClasses,
      property_class: classifyProperty(property.property, currentPagesUrl, legacyPagesUrl),
      captured_at_utc: data.captured_at_utc || null,
      freshness: captureFreshness(data.captured_at_utc, directory, asOfDate, maxAgeDays),
      metrics_complete: validMetric(data?.totals?.clicks) && validMetric(data?.totals?.impressions),
    };
  });
  const current = evidence.filter((entry) => entry.status === 'success'
    && entry.property_class === 'current'
    && !entry.property_conflict
    && entry.intended_matches_observed
    && entry.dashboard_valid
    && entry.freshness.valid
    && entry.metrics_complete);
  const legacy = evidence.filter((entry) => entry.status === 'success' && entry.property_class === 'legacy');
  return {
    status: current.length ? 'pass' : 'fail',
    current_evidence: current,
    rejected_current_evidence: evidence.filter((entry) =>
      (entry.property_class === 'current' || entry.signal_property_classes.includes('current')) && !current.includes(entry)),
    legacy_evidence: legacy,
    other_evidence: evidence.filter((entry) => entry.property_class === 'other' || entry.property_class === 'unknown'),
    message: current.length
      ? 'Fresh, schema-complete saved current-property evidence is present.'
      : 'No fresh, schema-complete saved evidence for the exact current property; legacy-only or spoofed evidence is not a migration fix.',
  };
}

function manifestPairs(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  if (Array.isArray(payload.redirects)) return payload.redirects;
  if (Array.isArray(payload.routes)) return payload.routes;
  if (payload.routes && typeof payload.routes === 'object') {
    return Object.entries(payload.routes).map(([from, to]) => ({ from, to }));
  }
  if (payload.redirects && typeof payload.redirects === 'object') {
    return Object.entries(payload.redirects).map(([from, to]) => ({ from, to }));
  }
  return [];
}

function redirectCoverage(manifestPath, currentUrls, currentPagesUrl, legacyPagesUrl, errors) {
  if (!manifestPath) return { status: 'fail', expected: currentUrls.length, covered: 0, missing: currentUrls, message: 'No redirect manifest was supplied.' };
  const payload = readJson(manifestPath, errors, 'redirect manifest');
  if (!payload) return { status: 'fail', expected: currentUrls.length, covered: 0, missing: currentUrls, message: 'Redirect manifest is unreadable.' };
  const redirects = new Map();
  const duplicates = [];
  const invalid = [];
  for (const pair of manifestPairs(payload)) {
    const from = withTrailingSlash(pair && (pair.from || pair.source || pair.legacy));
    const to = withTrailingSlash(pair && (pair.to || pair.destination || pair.current));
    if (!from || !to) {
      invalid.push(pair);
    } else if (redirects.has(from)) {
      duplicates.push(from);
    } else {
      redirects.set(from, to);
    }
  }
  const expectedPairs = new Map(currentUrls.map((currentUrl) => [
    withTrailingSlash(currentUrl.replace(currentPagesUrl, legacyPagesUrl)),
    currentUrl,
  ]));
  const missing = currentUrls.filter((currentUrl) => {
    const legacyUrl = withTrailingSlash(currentUrl.replace(currentPagesUrl, legacyPagesUrl));
    return redirects.get(legacyUrl) !== currentUrl;
  });
  const unexpected = [...redirects.entries()]
    .filter(([from, to]) => expectedPairs.get(from) !== to)
    .map(([from, to]) => ({ from, to }));
  const exact = currentUrls.length && !missing.length && !duplicates.length && !invalid.length && !unexpected.length
    && redirects.size === expectedPairs.size;
  return {
    status: exact ? 'pass' : 'fail',
    expected: currentUrls.length,
    covered: currentUrls.length - missing.length,
    missing,
    duplicates,
    invalid,
    unexpected,
    message: exact ? 'Redirect manifest maps every expected legacy route exactly once and contains no extras.' : 'Redirect manifest does not exactly cover the expected legacy route set once each.',
  };
}

function packageIdentity(currentPackagePath, legacyPackagePath, currentPackageName, errors) {
  const current = readJson(currentPackagePath, errors, 'current package metadata');
  const legacy = legacyPackagePath ? readJson(legacyPackagePath, errors, 'legacy package metadata') : null;
  const currentName = currentPackageName || DEFAULT_CURRENT_PACKAGE;
  const currentOk = Boolean(current && current.name === currentName && typeof current.version === 'string' && current.version);
  const explicitReplacement = legacy && (legacy.replacementPackage || legacy.replacement_package);
  const escapedName = currentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const deprecatedMentionsExactPackage = typeof legacy?.deprecated === 'string'
    && new RegExp(`(^|[^a-z0-9_-])${escapedName}([^a-z0-9_-]|$)`, 'i').test(legacy.deprecated);
  const legacyOk = Boolean(legacy
    && legacy.name === DEFAULT_LEGACY_PACKAGE
    && typeof legacy.version === 'string'
    && (explicitReplacement === currentName || deprecatedMentionsExactPackage));
  return {
    status: currentOk && legacyOk ? 'pass' : 'fail',
    current: current ? { name: current.name || null, version: current.version || null } : null,
    legacy: legacy ? { name: legacy.name || null, version: legacy.version || null, deprecated: legacy.deprecated || null } : null,
    message: currentOk && legacyOk
      ? 'Current package identity and explicit legacy migration path are present.'
      : 'Both a current package identity and an explicit legacy-to-current package migration path are required.',
  };
}

function auditMigrationReadiness(options = {}) {
  const repoRoot = path.resolve(options.repoRoot || path.resolve(__dirname, '..', '..'));
  const errors = [];
  const sitemapPath = path.resolve(repoRoot, options.sitemapPath || 'apps/web-app/public/sitemap.xml');
  const snapshotRoot = path.resolve(repoRoot, options.snapshotRoot || '.codex/traffic-snapshots');
  const currentPackagePath = path.resolve(repoRoot, options.currentPackagePath || 'package.json');
  const asOfDate = options.asOfDate || new Date().toISOString().slice(0, 10);
  const maxEvidenceAgeDays = Number(options.maxEvidenceAgeDays ?? DEFAULT_MAX_EVIDENCE_AGE_DAYS);
  if (!isValidIsoDate(asOfDate)) throw new Error(`invalid as-of date: ${asOfDate}`);
  if (!Number.isFinite(maxEvidenceAgeDays) || maxEvidenceAgeDays < 0) throw new Error('max evidence age must be a non-negative number');
  const currentUrls = parseSitemap(sitemapPath, errors);
  const currentPagesUrl = withTrailingSlash(options.currentPagesUrl || DEFAULT_CURRENT_PAGES_URL);
  const legacyPagesUrl = withTrailingSlash(options.legacyPagesUrl || DEFAULT_LEGACY_PAGES_URL || inferLegacyPagesUrl(currentPagesUrl));
  const identitiesDistinct = Boolean(currentPagesUrl && legacyPagesUrl && currentPagesUrl !== legacyPagesUrl);
  const currentSitemap = {
    status: identitiesDistinct && currentUrls.includes(currentPagesUrl) && currentUrls.every((url) => url.startsWith(currentPagesUrl)) ? 'pass' : 'fail',
    current_pages_url: currentPagesUrl,
    urls: currentUrls,
    message: identitiesDistinct && currentUrls.includes(currentPagesUrl) && currentUrls.every((url) => url.startsWith(currentPagesUrl))
      ? 'Current sitemap includes its root and contains only the configured current Pages identity.'
      : 'Current sitemap is missing its root, malformed, uses identical legacy/current identities, or includes URLs outside the configured current Pages identity.',
  };
  const checks = {
    identity_anchors: {
      status: identitiesDistinct ? 'pass' : 'fail',
      current_package_name: options.currentPackageName || DEFAULT_CURRENT_PACKAGE,
      current_pages_url: currentPagesUrl,
      legacy_pages_url: legacyPagesUrl,
      message: identitiesDistinct ? 'Configured current and legacy identities are present and distinct.' : 'Current and legacy Pages identities must be explicit and distinct.',
    },
    current_sitemap_identity: currentSitemap,
    google_search_console: dashboardEvidence(snapshotRoot, DASHBOARD_FILES.gsc, currentPagesUrl, legacyPagesUrl, errors, asOfDate, maxEvidenceAgeDays),
    bing_webmaster: dashboardEvidence(snapshotRoot, DASHBOARD_FILES.bing, currentPagesUrl, legacyPagesUrl, errors, asOfDate, maxEvidenceAgeDays),
    redirect_manifest_coverage: redirectCoverage(
      options.redirectManifestPath && path.resolve(repoRoot, options.redirectManifestPath), currentUrls, currentPagesUrl, legacyPagesUrl, errors,
    ),
    npm_identities: packageIdentity(
      currentPackagePath,
      options.legacyPackagePath && path.resolve(repoRoot, options.legacyPackagePath),
      options.currentPackageName,
      errors,
    ),
  };
  const failedChecks = Object.entries(checks).filter(([, check]) => check.status !== 'pass').map(([name]) => name);
  return {
    schema_version: 1,
    status: failedChecks.length || errors.length ? 'not_ready' : 'ready',
    evidence_policy: { as_of_date: asOfDate, max_age_days: maxEvidenceAgeDays },
    identities: { current_pages_url: currentPagesUrl, legacy_pages_url: legacyPagesUrl },
    checks,
    third_party_state: {
      status: 'not_assessed',
      message: 'Third-party directories are outside this local audit. A request or partial third-party update is not reported as fixed.',
    },
    errors,
    failed_checks: failedChecks,
  };
}

function writeJsonAtomically(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  try {
    fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    fs.renameSync(temporary, filePath);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

function parseArgs(argv) {
  const options = {};
  const aliases = {
    '--repo-root': 'repoRoot', '--snapshot-root': 'snapshotRoot', '--sitemap': 'sitemapPath',
    '--redirect-manifest': 'redirectManifestPath', '--current-package': 'currentPackagePath',
    '--legacy-package': 'legacyPackagePath', '--current-pages-url': 'currentPagesUrl',
    '--legacy-pages-url': 'legacyPagesUrl', '--current-package-name': 'currentPackageName', '--output': 'outputPath',
    '--as-of': 'asOfDate', '--max-evidence-age-days': 'maxEvidenceAgeDays',
  };
  for (let index = 0; index < argv.length; index += 1) {
    const key = aliases[argv[index]];
    if (!key || !argv[index + 1] || argv[index + 1].startsWith('--')) throw new Error(`Unknown option or missing value: ${argv[index]}`);
    options[key] = argv[index + 1];
    index += 1;
  }
  return options;
}

if (require.main === module) {
  try {
    const options = parseArgs(process.argv.slice(2));
    const report = auditMigrationReadiness(options);
    const outputPath = path.resolve(options.repoRoot || path.resolve(__dirname, '..', '..'), options.outputPath || '.codex/traffic-snapshots/migration-readiness.json');
    writeJsonAtomically(outputPath, report);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    process.exitCode = report.status === 'ready' ? 0 : 1;
  } catch (error) {
    process.stderr.write(`migration readiness audit failed: ${error.message}\n`);
    process.exitCode = 2;
  }
}

module.exports = { auditMigrationReadiness, parseArgs, redirectCoverage, writeJsonAtomically };
