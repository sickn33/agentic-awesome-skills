#!/usr/bin/env node
// unify-trace.mjs — join autobrowse's trace.json (per-turn agent log) with
// browser-trace's CDP firehose into one time-ordered NDJSON stream.
//
// Output: <trace-dir>/unified-events.jsonl — the primary artifact an outer
// agent reads when iterating with --browser-trace. Drill-down files
// (trace.json, .o11y/<run>/cdp/*) remain untouched and continue to back
// queries that need full payloads or grouped slices.
//
// Wall-clock alignment matches bisect-cdp.mjs: anchor on the first CDP
// monotonic timestamp, then add manifest.started_at. TimeSinceEpoch events
// (e.g. Console.messageAdded) carry a ms-since-epoch timestamp directly.
//
// Method filtering: emit only events that aid hypothesis formation. Skip
// noisy/redundant methods (Network.dataReceived, frame Started/Stopped
// Loading, ExtraInfo events, Runtime.executionContextCreated). The full
// firehose is one drill-down away in cdp/raw.ndjson.
//
// Usage:
//   node unify-trace.mjs --trace-dir <run-root> --o11y-dir <.o11y/<run-id>>

import fs from "node:fs";
import path from "node:path";

function getArg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : null;
}

const traceDir = getArg("trace-dir");
const o11yDir = getArg("o11y-dir");
if (!traceDir || !o11yDir) {
  console.error("usage: unify-trace.mjs --trace-dir <run-root> --o11y-dir <.o11y/<run-id>>");
  process.exit(2);
}

const tracePath = path.join(traceDir, "trace.json");
const rawPath = path.join(o11yDir, "cdp", "raw.ndjson");
const manifestPath = path.join(o11yDir, "manifest.json");

for (const p of [tracePath, rawPath, manifestPath]) {
  if (!fs.existsSync(p)) {
    console.error(`missing input: ${p}`);
    process.exit(1);
  }
}

const trace = JSON.parse(fs.readFileSync(tracePath, "utf-8"));
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
const rawLines = fs.readFileSync(rawPath, "utf-8").trim().split("\n").filter(Boolean);
const cdpEvents = rawLines.map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);

const startedMs = manifest.started_at ? new Date(manifest.started_at).getTime() : null;

const isMonotonic = (ts) => ts != null && ts < 1e9;
const anchorCdp = cdpEvents.map((e) => e?.params?.timestamp).find(isMonotonic) ?? null;

function cdpTsToMs(ev) {
  const ts = ev?.params?.timestamp;
  if (ts == null) return null;
  if (isMonotonic(ts)) {
    if (anchorCdp == null || startedMs == null) return null;
    return Math.floor((ts - anchorCdp) * 1000 + startedMs);
  }
  return Math.floor(ts);
}

function topNavUrl(ev) {
  return ev?.method === "Page.frameNavigated" && !ev?.params?.frame?.parentId
    ? ev.params.frame.url ?? null
    : null;
}
let pid = -1;
const pageIdByIndex = [];
for (let i = 0; i < cdpEvents.length; i++) {
  if (topNavUrl(cdpEvents[i]) != null) pid += 1;
  pageIdByIndex[i] = pid < 0 ? 0 : pid;
}

const SKIP_METHODS = new Set([
  "Network.dataReceived",
  "Network.loadingFinished",
  "Network.requestWillBeSentExtraInfo",
  "Network.responseReceivedExtraInfo",
  "Network.resourceChangedPriority",
  "Network.policyUpdated",
  "Page.frameStartedLoading",
  "Page.frameStoppedLoading",
  "Page.frameRequestedNavigation",
  "Page.javascriptDialogOpening",
  "Page.javascriptDialogClosed",
  "Runtime.executionContextCreated",
  "Runtime.executionContextDestroyed",
  "Runtime.executionContextsCleared",
  "Target.targetInfoChanged",
  "Target.detachedFromTarget",
  "Log.entryAdded",
]);

function truncate(s, n = 500) {
  if (typeof s !== "string") return s;
  return s.length > n ? s.slice(0, n) + "…" : s;
}

function summarizeCdp(ev, page_id) {
  const m = ev.method;
  const p = ev.params || {};
  const base = { source: "browser", method: m, page_id };
  switch (m) {
    case "Network.requestWillBeSent":
      return { ...base, url: p.request?.url, request_method: p.request?.method, type: p.type, redirect_response_status: p.redirectResponse?.status };
    case "Network.responseReceived":
      return { ...base, url: p.response?.url, status: p.response?.status, mime: p.response?.mimeType, type: p.type };
    case "Network.loadingFailed":
      return { ...base, type: p.type, error: p.errorText, canceled: p.canceled };
    case "Network.webSocketCreated":
      return { ...base, url: p.url };
    case "Page.frameStartedNavigating":
      return { ...base, url: p.url };
    case "Page.frameNavigated":
      return { ...base, url: p.frame?.url, parent_id: p.frame?.parentId || null };
    case "Page.lifecycleEvent":
      return { ...base, name: p.name };
    case "Page.domContentEventFired":
    case "Page.loadEventFired":
      return base;
    case "Page.navigatedWithinDocument":
      return { ...base, url: p.url };
    case "Page.fileChooserOpened":
      return { ...base, mode: p.mode };
    case "Console.messageAdded":
      return { ...base, level: p.message?.level, text: truncate(p.message?.text) };
    case "Runtime.consoleAPICalled":
      return { ...base, level: p.type, text: truncate((p.args || []).map((a) => a.value ?? a.description ?? "").join(" ")) };
    case "Runtime.exceptionThrown":
      return { ...base, text: truncate(p.exceptionDetails?.text || p.exceptionDetails?.exception?.description || ""), url: p.exceptionDetails?.url, line: p.exceptionDetails?.lineNumber };
    case "Target.attachedToTarget":
    case "Target.targetCreated":
      return { ...base, target_id: p.targetInfo?.targetId || p.targetId, type: p.targetInfo?.type, url: p.targetInfo?.url };
    default:
      return base;
  }
}

const browserRows = [];
for (let i = 0; i < cdpEvents.length; i++) {
  const ev = cdpEvents[i];
  if (!ev.method || SKIP_METHODS.has(ev.method)) continue;
  const ts_ms = cdpTsToMs(ev);
  if (ts_ms == null) continue;
  const row = summarizeCdp(ev, pageIdByIndex[i]);
  browserRows.push({ _ts_ms: ts_ms, ts: new Date(ts_ms).toISOString(), ...row });
}

const agentRows = [];
for (const entry of trace) {
  const ts_ms = entry.timestamp ? new Date(entry.timestamp).getTime() : null;
  if (ts_ms == null) continue;
  const base = { source: "agent", turn: entry.turn, role: null };
  if (entry.role === "assistant" && entry.reasoning) {
    base.role = "reasoning";
    base.text = truncate(entry.reasoning);
  } else if (entry.role === "assistant" && entry.tool_name) {
    base.role = "tool_call";
    base.tool = entry.tool_name;
    base.command = entry.tool_input?.command;
  } else if (entry.role === "tool_result") {
    base.role = "tool_result";
    base.command = entry.command;
    base.ok = !entry.error;
    base.duration_ms = entry.duration_ms;
    base.output_preview = truncate(entry.output);
  } else {
    continue;
  }
  agentRows.push({ _ts_ms: ts_ms, ts: new Date(ts_ms).toISOString(), ...base });
}

const all = [...browserRows, ...agentRows].sort((a, b) => a._ts_ms - b._ts_ms);

const outPath = path.join(traceDir, "unified-events.jsonl");
const out = fs.openSync(outPath, "w");
for (const row of all) {
  const { _ts_ms, ...rest } = row;
  fs.writeSync(out, JSON.stringify(rest) + "\n");
}
fs.closeSync(out);

console.log(`unified: ${all.length} events (${browserRows.length} browser, ${agentRows.length} agent) → ${outPath}`);
