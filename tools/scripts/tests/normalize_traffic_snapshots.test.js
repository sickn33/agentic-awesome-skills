const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const scriptPath = path.resolve(__dirname, "..", "normalize_traffic_snapshots.js");
const { normalizeSnapshots } = require(scriptPath);

const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "traffic-normalizer-"));

function writeJson(relativePath, value) {
  const filePath = path.join(fixtureRoot, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value), "utf8");
}

function writeManifest(date, repo = "owner/repo", timezone = "Europe/Rome") {
  writeJson(`${date}/manifest.json`, { repo, timezone });
}

function dashboard(property, dailyValues, extra = {}) {
  return {
    status: "success",
    dashboard_url: `https://www.bing.com/webmasters/searchperf?siteUrl=${encodeURIComponent(property)}`,
    date_range_visible: "3 M (April 12, 2026 to July 10, 2026)",
    daily_values: dailyValues,
    totals: { clicks: 10, impressions: 100 },
    ...extra,
  };
}

function npmRange(packageName, daily) {
  return {
    package: packageName,
    start: daily[0].date,
    end: daily.at(-1).date,
    downloads: daily.map(({ date, downloads }) => ({ day: date, downloads })),
  };
}

function npmDownloads(responses, extra = {}) {
  return { status: "success", responses, ...extra };
}

try {
  writeManifest("2026-07-01");
  writeJson("2026-07-01/views.json", {
    views: [{ timestamp: "2026-06-30T00:00:00Z", count: 1, uniques: 1 }],
  });
  writeJson("2026-07-01/clones.json", {
    clones: [{ timestamp: "2026-06-30T00:00:00Z", count: 2, uniques: 1 }],
  });
  writeJson("2026-07-01/bing-webmaster-search-performance.json", dashboard(
    "https://sickn33.github.io/antigravity-awesome-skills/",
    [{ date: "2026-06-30", clicks: 3, impressions: 30 }],
  ));
  writeJson("2026-07-01/google-search-console.json", {
    status: "success",
    intended_property: "https://sickn33.github.io/antigravity-awesome-skills/",
    date_range_visible: "June 1, 2026 to July 9, 2026",
    totals: { clicks: 4, impressions: "1.5K" },
  });
  writeJson("2026-07-01/npm-downloads.json", npmDownloads([
    npmRange("antigravity-awesome-skills", [
      { date: "2026-06-30", downloads: 5 },
      { date: "2026-07-01", downloads: 7 },
    ]),
    npmRange("agentic-awesome-skills", [{ date: "2026-06-30", downloads: 15 }]),
  ]));

  writeManifest("2026-07-02");
  writeJson("2026-07-02/views.json", {
    views: [{ timestamp: "2026-06-30T00:00:00Z", count: 9, uniques: 8 }],
  });
  writeJson("2026-07-02/clones.json", {
    clones: [{ timestamp: "2026-06-30T00:00:00Z", count: 7, uniques: 6 }],
  });
  writeJson("2026-07-02/bing-webmaster-search-performance.json", dashboard(
    "https://sickn33.github.io/agentic-awesome-skills/",
    [{ date: "2026-06-30", clicks: 11, impressions: 110 }],
  ));
  writeJson("2026-07-02/google-search-console.json", {
    status: "success",
    dashboard_url: "https://search.google.com/search-console/performance?resource_id=https%3A%2F%2Fsickn33.github.io%2Fagentic-awesome-skills%2F",
    date_range_visible: "June 1, 2026 to July 10, 2026",
    totals: { clicks: 5, impressions_visible: "2,5K" },
  });
  writeJson("2026-07-02/bing-webmaster-ai-performance.json", {
    status: "success",
    dashboard_url: "https://www.bing.com/webmasters/aiperformance?siteUrl=https%3A%2F%2Fsickn33.github.io%2Fagentic-awesome-skills%2F",
    daily_values: [{ date: "June 30, 2026", total_citations: 7, avg_cited_pages: 1 }],
    total_citations: 7,
  });
  writeJson("2026-07-02/npm-downloads.json", npmDownloads([
    {
      package: "antigravity-awesome-skills",
      start: "2026-07-01",
      end: "2026-07-02",
      downloads: [
        { day: "2026-07-01", downloads: 7 },
        { day: "2026-07-02", downloads: 8 },
      ],
    },
    {
      package: "agentic-awesome-skills",
      start: "2026-07-01",
      end: "2026-07-01",
      downloads: [{ day: "2026-07-01", downloads: 3 }],
    },
  ]));

  // A malformed file and partial rows must not leak values into valid rows.
  writeManifest("2026-07-03");
  fs.mkdirSync(path.join(fixtureRoot, "2026-07-03"), { recursive: true });
  fs.writeFileSync(path.join(fixtureRoot, "2026-07-03", "views.json"), "{not json", "utf8");
  writeJson("2026-07-03/clones.json", { clones: [{ timestamp: "2026-06-30T00:00:00Z", count: 99 }] });
  writeJson("2026-07-03/bing-webmaster-search-performance.json", dashboard(
    "https://sickn33.github.io/agentic-awesome-skills/",
    [{ date: "2026-06-30", impressions: 999 }],
  ));

  const normalized = normalizeSnapshots(fixtureRoot);
  assert.strictEqual(normalized.schema_version, "3.0.0");
  assert.strictEqual(normalized.repo, "owner/repo");
  assert.deepStrictEqual(normalized.source_repositories, ["owner/repo"]);
  assert.deepStrictEqual(normalized.snapshots, ["2026-07-01", "2026-07-02", "2026-07-03"]);
  const row = normalized.rows.find((value) => value.date === "2026-06-30");
  assert.strictEqual(row.github.views.count, 9, "latest GitHub view observation wins per date");
  assert.strictEqual(row.github.views.observed_from_snapshot, "2026-07-02");
  assert.strictEqual(row.github.clones.count, 7, "partial newer clone row cannot overwrite complete observation");
  assert.strictEqual(row.bing_search.length, 2, "different dashboard properties remain separate");
  assert.deepStrictEqual(row.bing_search.map((value) => value.property_identity), ["current", "legacy"]);
  assert.deepStrictEqual(row.bing_search.map((value) => value.coverage_end), ["2026-06-30", "2026-06-30"]);
  assert.deepStrictEqual(row.bing_search.map((value) => value.clicks), [11, 3]);
  assert.strictEqual(row.bing_ai[0].citations, 7, "human-readable compact Bing dates and total_citations are supported");
  assert.strictEqual(row.npm_downloads.status, "complete");
  assert.strictEqual(row.npm_downloads.total_downloads, 20);
  assert.strictEqual(row.npm_downloads.current_package_share, 0.75);
  assert.strictEqual(row.npm_downloads.packages["antigravity-awesome-skills"].downloads, 5);
  assert.strictEqual(row.npm_downloads.packages["agentic-awesome-skills"].downloads, 15);
  const npmMissingCurrent = normalized.rows.find((value) => value.date === "2026-07-02").npm_downloads;
  assert.strictEqual(npmMissingCurrent.status, "missing_current");
  assert.strictEqual(npmMissingCurrent.total_downloads, null);
  assert.strictEqual(npmMissingCurrent.current_package_share, null);
  assert.strictEqual(normalized.combined_view.github_repository.status, "canonical_only");
  assert.strictEqual(normalized.combined_view.dashboard_properties.status, "not_combined");
  assert.strictEqual(normalized.combined_view.npm_downloads.status, "per_date_status_in_rows");

  const gscTotals = normalized.snapshot_totals.google_search_console;
  assert.strictEqual(gscTotals.length, 2, "GSC legacy and current totals are never coalesced");
  assert.deepStrictEqual(gscTotals.map((value) => value.property_identity), ["current", "legacy"]);
  assert.deepStrictEqual(gscTotals.map((value) => value.coverage_end), ["2026-07-10", "2026-07-09"]);
  assert.deepStrictEqual(gscTotals.map((value) => value.impressions), [2500, 1500]);
  assert.ok(normalized.warnings.some((warning) => warning.includes("malformed JSON")));
  assert.ok(normalized.warnings.some((warning) => warning.includes("partial dashboard")));

  writeManifest("2026-07-04", "attacker/other-repo", "Mars/Olympus");
  writeJson("2026-07-04/views.json", {
    views: [{ timestamp: "2026-06-30T00:00:00Z", count: 999, uniques: 999 }],
  });
  writeManifest("2026-07-05");
  writeJson("2026-07-05/views.json", {
    views: [{ timestamp: "2026-99-99T00:00:00Z", count: -4, uniques: 1 }],
  });
  writeJson("2026-07-05/google-search-console.json", {
    dashboard_url: "https://search.google.com/search-console/performance?resource_id=https%3A%2F%2Fsickn33.github.io%2Fagentic-awesome-skills%2F",
    totals: { clicks: 1 },
  });
  writeJson("2026-07-05/bing-webmaster-ai-performance.json", {
    status: "success",
    dashboard_url: "https://www.bing.com/webmasters/aiperformance?siteUrl=https%3A%2F%2Fsickn33.github.io%2Fagentic-awesome-skills%2F",
    date_range_visible: "2026-99-99 to 2026-99-99",
    total_citations: 5,
  });
  writeManifest("2026-07-06");
  writeJson("2026-07-06/google-search-console.json", {
    status: "success",
    intended_property: "https://sickn33.github.io/agentic-awesome-skills/",
    dashboard_url: "https://search.google.com/search-console/performance?resource_id=https%3A%2F%2Fsickn33.github.io%2Fantigravity-awesome-skills%2F",
    totals: { clicks: 8, impressions: 80 },
  });
  writeJson("2026-07-06/bing-webmaster-search-performance.json", {
    status: "success",
    dashboard_url: "https://attacker.example/webmasters/searchperf?siteUrl=https%3A%2F%2Fsickn33.github.io%2Fagentic-awesome-skills%2F",
    totals: { clicks: 8, impressions: 80 },
  });
  writeManifest("2026-07-07");
  writeJson("2026-07-07/google-search-console.json", {
    status: "success",
    dashboard_url: "https://search.google.com/search-console/performance?resource_id=https%3A%2F%2Fsickn33.github.io%2Fagentic-awesome-skills%2F",
    date_range_visible: "June 1, 2026 to July 10, 2026",
    daily_values: [{ date: "2026-06-29", clicks: 5, impressions: 50 }],
    totals: { clicks: 5, impressions: 50 },
  });
  writeManifest("2026-07-08");
  writeJson("2026-07-08/google-search-console.json", {
    status: "success",
    intended_property: "https://sickn33.github.io/agentic-awesome-skills/",
    date_range_visible: "June 1, 2026 to July 10, 2026",
    daily_values: [{ date: "2026-06-29", clicks: 999, impressions: 999 }],
    totals: { clicks: 999, impressions: 999 },
  });
  writeJson("2026-07-05/npm-downloads.json", { status: "unavailable", responses: [] });
  writeJson("2026-07-06/npm-downloads.json", npmDownloads([
    npmRange("antigravity-awesome-skills", [{ date: "2026-07-03", downloads: 1 }]),
    npmRange("agentic-awesome-skills", [{ date: "2026-07-03", downloads: 2 }]),
    npmRange("attacker-awesome-skills", [{ date: "2026-07-03", downloads: 999 }]),
  ]));
  writeJson("2026-07-07/npm-downloads.json", npmDownloads([
    npmRange("antigravity-awesome-skills", [{ date: "2026-06-30", downloads: 99 }]),
    npmRange("agentic-awesome-skills", [{ date: "2026-06-30", downloads: 15 }]),
  ]));
  writeJson("2026-07-08/npm-downloads.json", npmDownloads([
    npmRange("antigravity-awesome-skills", [{ date: "2026-07-04", downloads: 1 }]),
    npmRange("antigravity-awesome-skills", [{ date: "2026-07-04", downloads: 1 }]),
    {
      package: "agentic-awesome-skills",
      start: "2026-07-04",
      end: "2026-07-04",
      downloads: [{ day: "2026-07-04", downloads: -1 }],
    },
  ]));
  writeManifest("2026-07-09");
  writeJson("2026-07-09/npm-downloads.json", npmDownloads([
    npmRange("antigravity-awesome-skills", [{ date: "2026-07-05", downloads: 4 }]),
  ]));
  writeManifest("2026-07-10");
  writeJson("2026-07-10/npm-downloads.json", npmDownloads([
    {
      package: "antigravity-awesome-skills",
      start: "1900-01-01",
      end: "9999-12-31",
      downloads: [
        { day: "1900-01-01", downloads: 1 },
        { day: "9999-12-31", downloads: 1 },
      ],
    },
  ]));
  const adversarial = normalizeSnapshots(fixtureRoot);
  const stableRow = adversarial.rows.find((value) => value.date === "2026-06-30");
  assert.strictEqual(stableRow.github.views.count, 9, "mismatched repository snapshot cannot overwrite the series");
  assert(!adversarial.rows.some((value) => value.date === "2026-99-99"), "invalid calendar dates are rejected");
  assert(adversarial.warnings.some((warning) => warning.includes("repository or timezone mismatch")));
  assert(adversarial.warnings.some((warning) => warning.includes("non-success capture")));
  const invalidCoverageTotal = adversarial.snapshot_totals.bing_ai.find((value) => value.observed_from_snapshot === "2026-07-05");
  assert.strictEqual(invalidCoverageTotal.coverage_end, null, "impossible free-text coverage dates are rejected");
  const conflictedGsc = adversarial.snapshot_totals.google_search_console.find((value) => value.observed_from_snapshot === "2026-07-06");
  assert.strictEqual(conflictedGsc.property_identity, "legacy", "observed dashboard property wins over a conflicting intention");
  assert.strictEqual(conflictedGsc.property_provenance, "observed");
  assert(adversarial.warnings.some((warning) => warning.includes("intended property disagrees")));
  assert(!adversarial.snapshot_totals.bing_search.some((value) => value.observed_from_snapshot === "2026-07-06"), "attacker-host dashboard evidence is skipped");
  const preferredDaily = adversarial.rows.find((value) => value.date === "2026-06-29").google_search_console
    .find((value) => value.property_identity === "current");
  assert.strictEqual(preferredDaily.clicks, 5, "observed daily evidence cannot be overwritten by newer intended-only data");
  assert.strictEqual(preferredDaily.property_provenance, "observed");
  const preferredTotal = adversarial.snapshot_totals.google_search_console
    .find((value) => value.property_identity === "current" && value.coverage_end === "2026-07-10");
  assert.strictEqual(preferredTotal.clicks, 5, "observed totals cannot be overwritten by newer intended-only data");
  assert.strictEqual(preferredTotal.property_provenance, "observed");
  const conflictingNpm = adversarial.rows.find((value) => value.date === "2026-06-30").npm_downloads;
  assert.strictEqual(conflictingNpm.status, "conflicting_observations");
  assert.strictEqual(conflictingNpm.total_downloads, null);
  assert.strictEqual(conflictingNpm.current_package_share, null);
  const unknownNpm = adversarial.rows.find((value) => value.date === "2026-07-03").npm_downloads;
  assert.strictEqual(unknownNpm.status, "invalid_capture", "unknown identities cannot make a combined total eligible");
  assert.strictEqual(unknownNpm.packages["antigravity-awesome-skills"].downloads, 1, "known package evidence remains raw and inspectable");
  assert.strictEqual(unknownNpm.packages["agentic-awesome-skills"].downloads, 2);
  const onePackageNpm = adversarial.rows.find((value) => value.date === "2026-07-05").npm_downloads;
  assert.strictEqual(onePackageNpm.status, "missing_current", "a one-package capture retains the valid raw legacy observation");
  assert.strictEqual(onePackageNpm.packages["antigravity-awesome-skills"].downloads, 4);
  assert.strictEqual(onePackageNpm.total_downloads, null);
  assert(adversarial.warnings.some((warning) => warning.includes("npm-downloads.json: skipped non-success capture")));
  assert(adversarial.warnings.some((warning) => warning.includes("npm-downloads.json: unknown package identity")));
  assert(adversarial.warnings.some((warning) => warning.includes("npm-downloads.json: duplicate package identity")));
  assert(adversarial.warnings.some((warning) => warning.includes("npm range daily downloads are incomplete")));

  const outputPath = path.join(fixtureRoot, "out", "daily-normalized.json");
  const first = spawnSync(process.execPath, [scriptPath, "--input", fixtureRoot, "--output", outputPath], { encoding: "utf8" });
  assert.strictEqual(first.status, 0, first.stderr);
  const firstOutput = fs.readFileSync(outputPath, "utf8");
  const second = spawnSync(process.execPath, [scriptPath, "--input", fixtureRoot, "--output", outputPath], { encoding: "utf8" });
  assert.strictEqual(second.status, 0, second.stderr);
  assert.strictEqual(fs.readFileSync(outputPath, "utf8"), firstOutput, "stable input produces stable output");

  const missing = spawnSync(process.execPath, [scriptPath, "--input", path.join(fixtureRoot, "missing"), "--output", outputPath], { encoding: "utf8" });
  assert.strictEqual(missing.status, 1, "missing input is an operational failure");
  assert.match(missing.stderr, /input directory does not exist/);

  const rejectedRoot = fs.mkdtempSync(path.join(os.tmpdir(), "traffic-normalizer-rejected-"));
  writeJson(path.relative(fixtureRoot, path.join(rejectedRoot, "2026-07-01", "manifest.json")), { repo: "owner/repo" });
  const allRejected = spawnSync(process.execPath, [scriptPath, "--input", rejectedRoot, "--output", path.join(rejectedRoot, "out.json")], { encoding: "utf8" });
  assert.strictEqual(allRejected.status, 1, "all-rejected snapshots are an operational failure");
  assert.match(allRejected.stderr, /no snapshots .* were accepted/);
  fs.rmSync(rejectedRoot, { recursive: true, force: true });

  console.log("traffic snapshot normalizer tests passed.");
} finally {
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
}
