#!/usr/bin/env node

/**
 * Normalize the read-only captures in .codex/traffic-snapshots.
 *
 * The source dashboards have different grains. GitHub supplies rolling daily
 * rows, while Search Console can be a snapshot total and Bing can supply both
 * totals and daily rows. This script deliberately keeps dashboard properties
 * separate: a legacy Pages property and a current Pages property are not a
 * time series that may safely be summed together.
 */

const fs = require("fs");
const path = require("path");

const DEFAULT_INPUT = path.resolve(__dirname, "..", "..", ".codex", "traffic-snapshots");
const DEFAULT_OUTPUT = path.join(DEFAULT_INPUT, "daily-normalized.json");
const SNAPSHOT_DIRECTORY = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_NAMES = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const CURRENT_REPOSITORY = "sickn33/agentic-awesome-skills";
const REPOSITORY_ALIASES = new Map([
  ["sickn33/antigravity-awesome-skills", CURRENT_REPOSITORY],
  [CURRENT_REPOSITORY, CURRENT_REPOSITORY],
]);
const CURRENT_PAGES_PROPERTY = "https://sickn33.github.io/agentic-awesome-skills/";
const LEGACY_PAGES_PROPERTY = "https://sickn33.github.io/antigravity-awesome-skills/";

const DASHBOARDS = [
  {
    file: "google-search-console.json",
    source: "google_search_console",
    dashboardHosts: new Set(["search.google.com"]),
    dashboardPathPrefix: "/search-console/",
    primaryPropertyParam: "resource_id",
    requiredDailyMetrics: ["clicks", "impressions"],
    requiredTotalMetrics: ["clicks", "impressions"],
    dailyMetrics: (value) => ({
      clicks: nonNegativeIntegerOrNull(value.clicks),
      impressions: nonNegativeIntegerOrNull(value.impressions),
    }),
    totals: (value) => ({
      clicks: nonNegativeIntegerOrNull(value?.totals?.clicks ?? value.clicks),
      impressions: nonNegativeIntegerOrNull(value?.totals?.impressions ?? value?.totals?.impressions_visible ?? value.impressions),
      ctr: value?.totals?.ctr ?? value.ctr ?? null,
      average_position: nonNegativeNumberOrNull(value?.totals?.average_position ?? value?.totals?.position ?? value.average_position),
    }),
  },
  {
    file: "bing-webmaster-search-performance.json",
    source: "bing_search",
    dashboardHosts: new Set(["bing.com", "www.bing.com"]),
    dashboardPathPrefix: "/webmasters/",
    primaryPropertyParam: "siteUrl",
    requiredDailyMetrics: ["clicks", "impressions"],
    requiredTotalMetrics: ["clicks", "impressions"],
    dailyMetrics: (value) => ({
      clicks: nonNegativeIntegerOrNull(value.clicks),
      impressions: nonNegativeIntegerOrNull(value.impressions),
    }),
    totals: (value) => ({
      clicks: nonNegativeIntegerOrNull(value?.totals?.clicks ?? value.clicks),
      impressions: nonNegativeIntegerOrNull(value?.totals?.impressions ?? value?.totals?.impressions_label ?? value.impressions),
      ctr: value?.totals?.ctr ?? value.ctr ?? null,
    }),
  },
  {
    file: "bing-webmaster-ai-performance.json",
    source: "bing_ai",
    dashboardHosts: new Set(["bing.com", "www.bing.com"]),
    dashboardPathPrefix: "/webmasters/",
    primaryPropertyParam: "siteUrl",
    requiredDailyMetrics: ["citations"],
    requiredTotalMetrics: ["citations"],
    dailyMetrics: (value) => ({
      citations: nonNegativeIntegerOrNull(value.citations ?? value.total_citations),
      avg_cited_pages: nonNegativeNumberOrNull(value.avg_cited_pages),
    }),
    totals: (value) => ({
      citations: nonNegativeIntegerOrNull(value.total_citations ?? value?.totals?.citations),
      avg_cited_pages: nonNegativeNumberOrNull(value.avg_cited_pages ?? value?.totals?.avg_cited_pages),
    }),
  },
];

function numberOrNull(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;

  const raw = value.trim().replace(/\s/g, "");
  if (!raw) return null;
  const hasK = /k$/i.test(raw);
  let numeric = raw.replace(/k$/i, "");

  // Dashboard captures use both 5.1K and Italian-style 39,4K labels.
  if (hasK) {
    numeric = numeric.replace(",", ".");
  } else if (/^\d{1,3}(?:[.,]\d{3})+$/.test(numeric)) {
    numeric = numeric.replace(/[.,]/g, "");
  } else {
    numeric = numeric.replace(",", ".");
  }

  const parsed = Number(numeric);
  return Number.isFinite(parsed) ? (hasK ? parsed * 1000 : parsed) : null;
}

function nonNegativeNumberOrNull(value) {
  const parsed = numberOrNull(value);
  return parsed !== null && parsed >= 0 ? parsed : null;
}

function nonNegativeIntegerOrNull(value) {
  const parsed = nonNegativeNumberOrNull(value);
  return parsed !== null && Number.isInteger(parsed) ? parsed : null;
}

function isCompleteMetrics(metrics) {
  return Object.values(metrics).some((value) => value !== null);
}

function normalizedDate(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (ISO_DATE.test(trimmed)) return isValidIsoDate(trimmed) ? trimmed : null;
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
    const date = trimmed.slice(0, 10);
    return isValidIsoDate(date) ? date : null;
  }
  const match = trimmed.match(
    /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})$/i,
  );
  if (!match) return null;
  const month = MONTH_NAMES.indexOf(match[1].toLowerCase()) + 1;
  const date = `${match[3]}-${String(month).padStart(2, "0")}-${String(match[2]).padStart(2, "0")}`;
  return isValidIsoDate(date) ? date : null;
}

function isValidIsoDate(value) {
  if (!ISO_DATE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
}

function canonicalProperty(candidate) {
  if (typeof candidate !== "string" || !candidate.trim()) return null;
  try {
    const url = new URL(candidate.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    url.hash = "";
    url.search = "";
    const pathname = url.pathname.endsWith("/") ? url.pathname : `${url.pathname}/`;
    return `${url.protocol}//${url.host}${pathname}`;
  } catch {
    return null;
  }
}

function propertyFromDashboardUrl(dashboardUrl, config) {
  if (typeof dashboardUrl !== "string") return { valid: false, signals: [], reason: "missing dashboard_url" };
  try {
    const url = new URL(dashboardUrl);
    const hostValid = url.protocol === "https:" && config.dashboardHosts.has(url.hostname.toLowerCase());
    const pathValid = url.pathname.startsWith(config.dashboardPathPrefix);
    const primary = canonicalProperty(url.searchParams.get(config.primaryPropertyParam));
    if (!hostValid || !pathValid || !primary) {
      return { valid: false, signals: [], reason: "dashboard host, path, or primary property parameter is invalid" };
    }
    const signals = [];
    for (const param of ["resource_id", "siteUrl"]) {
      const value = canonicalProperty(url.searchParams.get(param));
      if (value) signals.push({ source: `dashboard_url:${param}`, value });
    }
    return { valid: true, signals, reason: null };
  } catch {
    return { valid: false, signals: [], reason: "dashboard_url is malformed" };
  }
}

function sourceProperty(snapshot, config) {
  const observed = [];
  for (const [source, raw] of [
    ["source_property", snapshot.source_property],
    ["property_url", snapshot.property_url],
    ["propertyUrl", snapshot.propertyUrl],
    ["site_url", snapshot.site_url],
    ["siteUrl", snapshot.siteUrl],
  ]) {
    const value = canonicalProperty(raw);
    if (value) observed.push({ source, value });
  }
  const dashboard = propertyFromDashboardUrl(snapshot.dashboard_url, config);
  if (snapshot.dashboard_url && !dashboard.valid) {
    return { property: null, provenance: "invalid", conflict: true, reason: dashboard.reason };
  }
  observed.push(...dashboard.signals);
  const distinct = [...new Set(observed.map((signal) => signal.value))];
  if (distinct.length > 1) {
    return { property: null, provenance: "conflict", conflict: true, reason: "observed property signals conflict" };
  }
  const intended = canonicalProperty(snapshot.intended_property);
  if (distinct.length === 1) {
    return {
      property: distinct[0],
      provenance: "observed",
      conflict: false,
      reason: intended && intended !== distinct[0] ? "intended property disagrees with observed property" : null,
    };
  }
  if (intended) {
    return { property: intended, provenance: "intended_only", conflict: false, reason: "property identity comes from intended_property only" };
  }
  return { property: null, provenance: "unknown", conflict: false, reason: "no property identity signal" };
}

function propertyIdentity(property) {
  const value = canonicalProperty(property);
  if (value === LEGACY_PAGES_PROPERTY) return "legacy";
  if (value === CURRENT_PAGES_PROPERTY) return "current";
  return "unknown";
}

function coverageEnd(snapshot) {
  const dailyValues = Array.isArray(snapshot.daily_values) ? snapshot.daily_values : [];
  const dailyDates = dailyValues.map((row) => normalizedDate(row?.date)).filter(Boolean).sort();
  if (dailyDates.length) return dailyDates.at(-1);

  const text = [
    snapshot.date_range_visible,
    snapshot.date_range,
    snapshot.chart_visible?.description,
  ].filter((value) => typeof value === "string").join(" ");
  const isoDates = (text.match(/\d{4}-\d{2}-\d{2}/g) || []).map(normalizedDate).filter(Boolean);
  if (isoDates?.length) return isoDates.sort().at(-1);

  const monthDates = [...text.matchAll(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4})\b/gi,
  )].map((match) => {
    const month = MONTH_NAMES.indexOf(match[1].toLowerCase()) + 1;
    return normalizedDate(`${match[3]}-${String(month).padStart(2, "0")}-${String(match[2]).padStart(2, "0")}`);
  }).filter(Boolean);
  return monthDates.length ? monthDates.sort().at(-1) : null;
}

function readJson(filePath, warnings, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    warnings.push(`${label}: skipped malformed JSON (${error.message.split("\n")[0]})`);
    return null;
  }
}

function setLatest(map, key, observation) {
  const previous = map.get(key);
  if (!previous || observation.observed_from_snapshot > previous.observed_from_snapshot) {
    map.set(key, observation);
  }
}

function setBestDashboardEvidence(map, key, observation) {
  const previous = map.get(key);
  const strength = { observed: 2, intended_only: 1, unknown: 0 };
  const candidateStrength = strength[observation.property_provenance] ?? 0;
  const previousStrength = strength[previous?.property_provenance] ?? -1;
  if (!previous
    || candidateStrength > previousStrength
    || (candidateStrength === previousStrength && observation.observed_from_snapshot > previous.observed_from_snapshot)) {
    map.set(key, observation);
  }
}

function snapshotDirectories(inputDirectory) {
  if (!fs.existsSync(inputDirectory)) throw new Error(`input directory does not exist: ${inputDirectory}`);
  if (!fs.statSync(inputDirectory).isDirectory()) throw new Error(`input path is not a directory: ${inputDirectory}`);
  const snapshots = fs.readdirSync(inputDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && SNAPSHOT_DIRECTORY.test(entry.name) && isValidIsoDate(entry.name))
    .map((entry) => entry.name)
    .sort();
  if (!snapshots.length) throw new Error(`input directory has no valid snapshot directories: ${inputDirectory}`);
  return snapshots;
}

function canonicalRepository(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const normalized = value.trim().toLowerCase();
  return REPOSITORY_ALIASES.get(normalized) || normalized;
}

function normalizeSnapshots(inputDirectory) {
  const warnings = [];
  const github = { views: new Map(), clones: new Map() };
  const dashboardDaily = new Map();
  const dashboardTotals = new Map();
  const discoveredSnapshots = snapshotDirectories(inputDirectory);
  const snapshots = [];
  const sourceRepositories = new Set();
  let repo = null;
  let timezone = null;

  for (const snapshotDate of discoveredSnapshots) {
    const directory = path.join(inputDirectory, snapshotDate);
    const manifestPath = path.join(directory, "manifest.json");
    if (!fs.existsSync(manifestPath)) {
      warnings.push(`${snapshotDate}/manifest.json: skipped snapshot without identity manifest`);
      continue;
    }
    const manifest = readJson(manifestPath, warnings, `${snapshotDate}/manifest.json`);
    const rawRepository = typeof manifest?.repo === "string" ? manifest.repo.trim() : null;
    const snapshotRepository = canonicalRepository(rawRepository);
    const snapshotTimezone = typeof manifest?.timezone === "string" ? manifest.timezone.trim() : null;
    if (!snapshotRepository || !snapshotTimezone) {
      warnings.push(`${snapshotDate}/manifest.json: skipped snapshot with missing repository or timezone identity`);
      continue;
    }
    if ((repo && snapshotRepository !== repo) || (timezone && snapshotTimezone !== timezone)) {
      warnings.push(`${snapshotDate}/manifest.json: skipped snapshot with repository or timezone mismatch`);
      continue;
    }
    repo ||= snapshotRepository;
    timezone ||= snapshotTimezone;
    sourceRepositories.add(rawRepository);
    snapshots.push(snapshotDate);

    for (const [kind, file] of [["views", "views.json"], ["clones", "clones.json"]]) {
      const filePath = path.join(directory, file);
      if (!fs.existsSync(filePath)) continue;
      const payload = readJson(filePath, warnings, `${snapshotDate}/${file}`);
      const values = Array.isArray(payload?.[kind]) ? payload[kind] : null;
      if (!values) {
        warnings.push(`${snapshotDate}/${file}: skipped missing ${kind} array`);
        continue;
      }
      for (const value of values) {
        const date = normalizedDate(value?.timestamp);
        const count = nonNegativeIntegerOrNull(value?.count);
        const uniques = nonNegativeIntegerOrNull(value?.uniques);
        if (!date || !ISO_DATE.test(date) || count === null || uniques === null) {
          warnings.push(`${snapshotDate}/${file}: skipped malformed daily row`);
          continue;
        }
        setLatest(github[kind], date, { count, uniques, observed_from_snapshot: snapshotDate });
      }
    }

    for (const config of DASHBOARDS) {
      const filePath = path.join(directory, config.file);
      if (!fs.existsSync(filePath)) continue;
      const payload = readJson(filePath, warnings, `${snapshotDate}/${config.file}`);
      if (!payload) continue;
      if (payload.status !== "success") {
        warnings.push(`${snapshotDate}/${config.file}: skipped non-success capture`);
        continue;
      }

      const propertyEvidence = sourceProperty(payload, config);
      if (propertyEvidence.conflict) {
        warnings.push(`${snapshotDate}/${config.file}: skipped capture because ${propertyEvidence.reason}`);
        continue;
      }
      const property = propertyEvidence.property;
      if (propertyEvidence.reason) warnings.push(`${snapshotDate}/${config.file}: ${propertyEvidence.reason}`);
      const identity = propertyIdentity(property);
      if (identity === "unknown") {
        warnings.push(`${snapshotDate}/${config.file}: property identity is unknown and remains isolated`);
      }
      const end = coverageEnd(payload);
      const base = {
        source_property: property,
        property_provenance: propertyEvidence.provenance,
        property_identity: identity,
        coverage_end: end,
        observed_from_snapshot: snapshotDate,
      };
      const propertyKey = property || `unknown:${snapshotDate}`;
      const dailyValues = Array.isArray(payload.daily_values) ? payload.daily_values : [];

      for (const value of dailyValues) {
        const date = normalizedDate(value?.date);
        if (!date) {
          warnings.push(`${snapshotDate}/${config.file}: skipped malformed dashboard daily row`);
          continue;
        }
        const metrics = config.dailyMetrics(value);
        if (!isCompleteMetrics(metrics)) {
          warnings.push(`${snapshotDate}/${config.file}: skipped dashboard daily row without metrics`);
          continue;
        }
        // Never stitch a partial payload together with an older snapshot. A
        // dashboard row is useful only when its source-specific core metrics
        // arrived in the same source observation.
        if (config.requiredDailyMetrics.some((metric) => metrics[metric] === null)) {
          warnings.push(`${snapshotDate}/${config.file}: skipped partial dashboard daily row`);
          continue;
        }
        const key = `${config.source}\u0000${propertyKey}\u0000${date}`;
        setBestDashboardEvidence(dashboardDaily, key, { source: config.source, date, ...base, ...metrics });
      }

      const totals = config.totals(payload);
      if (config.requiredTotalMetrics.every((metric) => totals[metric] !== null)) {
        const key = `${config.source}\u0000${propertyKey}\u0000${end || "unknown"}`;
        setBestDashboardEvidence(dashboardTotals, key, { source: config.source, ...base, ...totals });
      } else if (isCompleteMetrics(totals)) {
        warnings.push(`${snapshotDate}/${config.file}: skipped partial dashboard totals`);
      }
    }
  }

  if (!snapshots.length) {
    throw new Error(`no snapshots with a consistent repository and timezone identity were accepted from: ${inputDirectory}`);
  }

  const rowsByDate = new Map();
  const ensureRow = (date) => {
    if (!rowsByDate.has(date)) rowsByDate.set(date, { date });
    return rowsByDate.get(date);
  };
  for (const [kind, values] of Object.entries(github)) {
    for (const [date, observation] of values) {
      const row = ensureRow(date);
      row.github ||= {};
      row.github[kind] = observation;
    }
  }
  for (const observation of dashboardDaily.values()) {
    const row = ensureRow(observation.date);
    row[observation.source] ||= [];
    const { source, date, ...record } = observation;
    row[source].push(record);
  }

  const rows = [...rowsByDate.values()].sort((left, right) => left.date.localeCompare(right.date));
  for (const row of rows) {
    for (const source of DASHBOARDS.map((config) => config.source)) {
      if (Array.isArray(row[source])) {
        row[source].sort((left, right) =>
          `${left.property_identity}\u0000${left.source_property || ""}\u0000${left.observed_from_snapshot}`.localeCompare(
            `${right.property_identity}\u0000${right.source_property || ""}\u0000${right.observed_from_snapshot}`,
          ),
        );
      }
    }
  }

  const snapshot_totals = {};
  for (const config of DASHBOARDS) {
    snapshot_totals[config.source] = [...dashboardTotals.values()]
      .filter((record) => record.source === config.source)
      .map(({ source, ...record }) => record)
      .sort((left, right) =>
        `${left.property_identity}\u0000${left.source_property || ""}\u0000${left.coverage_end || ""}\u0000${left.observed_from_snapshot}`.localeCompare(
          `${right.property_identity}\u0000${right.source_property || ""}\u0000${right.coverage_end || ""}\u0000${right.observed_from_snapshot}`,
        ),
      );
  }

  return {
    schema_version: "2.0.0",
    repo,
    source_repositories: [...sourceRepositories].sort(),
    timezone,
    grain: "date",
    caveats: [
      "GitHub rolling-window rows are deduplicated by date and retain the latest snapshot observation.",
      "Dashboard data is separated by source_property and property_identity; legacy and current properties are never summed or overwritten.",
      "coverage_end describes the latest date visible in a dashboard capture, not a promise of complete data.",
      "Malformed, partial, or non-success captures are skipped with warnings rather than merged into another observation.",
    ],
    discovered_snapshots: discoveredSnapshots,
    snapshots,
    rows,
    snapshot_totals,
    warnings: warnings.sort(),
  };
}

function atomicWrite(outputPath, value) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const temporary = path.join(
    path.dirname(outputPath),
    `.${path.basename(outputPath)}.${process.pid}.${Date.now()}.tmp`,
  );
  try {
    fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    fs.renameSync(temporary, outputPath);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

function parseArgs(args) {
  const options = { input: DEFAULT_INPUT, output: DEFAULT_OUTPUT };
  for (let index = 0; index < args.length; index += 1) {
    const option = args[index];
    if (option === "--input" || option === "--output") {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${option} requires a value`);
      options[option.slice(2)] = path.resolve(value);
      index += 1;
    } else if (option === "--help" || option === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown option: ${option}`);
    }
  }
  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log("Usage: node tools/scripts/normalize_traffic_snapshots.js [--input DIR] [--output FILE]");
    return;
  }
  const normalized = normalizeSnapshots(options.input);
  atomicWrite(options.output, normalized);
  console.log(`Normalized ${normalized.snapshots.length} snapshot directories to ${options.output}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`traffic normalization failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = {
  DEFAULT_INPUT,
  DEFAULT_OUTPUT,
  atomicWrite,
  normalizeSnapshots,
  parseArgs,
  propertyIdentity,
  sourceProperty,
};
