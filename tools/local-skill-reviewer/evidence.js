"use strict";

function lineSlice(content, startLine, endLine) {
  if (!Number.isInteger(startLine) || !Number.isInteger(endLine) || startLine < 1 || endLine < startLine) {
    throw new Error("Evidence line range is invalid");
  }
  const lines = content.split(/\r?\n/);
  if (endLine > lines.length) throw new Error("Evidence line range exceeds snapshot");
  return lines.slice(startLine - 1, endLine).join("\n");
}

function verifyEvidenceItem(item, bundleByPath) {
  if (!item || typeof item !== "object") throw new Error("Evidence must be an object");
  const source = bundleByPath.get(item.path);
  if (typeof source !== "string") throw new Error(`Evidence path is outside snapshot: ${item.path}`);
  const actual = lineSlice(source, item.start_line, item.end_line);
  if (actual !== item.excerpt) throw new Error(`Evidence excerpt mismatch: ${item.path}:${item.start_line}`);
  return true;
}

function verifyJudgment(kind, judgment, bundleByPath, dimensions) {
  if (!judgment || typeof judgment !== "object") throw new Error(`${kind} judgment missing`);
  const actual = Object.keys(judgment.dimensions || {}).sort();
  const expected = Object.keys(dimensions).sort();
  if (actual.join("\0") !== expected.join("\0")) throw new Error(`${kind} dimension set mismatch`);
  for (const name of expected) {
    const dimension = judgment.dimensions[name];
    if (!Number.isInteger(dimension.score) || dimension.score < 1 || dimension.score > 3) {
      throw new Error(`${kind}.${name} score must be an integer in [1, 3]`);
    }
    if (!Array.isArray(dimension.evidence) || dimension.evidence.length === 0) {
      throw new Error(`${kind}.${name} requires evidence`);
    }
    for (const item of dimension.evidence) verifyEvidenceItem(item, bundleByPath);
    const deterministic = typeof dimension.reason_code === "string" && dimension.signals && typeof dimension.signals === "object";
    const semantic = ["reasoning", "positive", "suggestion"].every((field) => typeof dimension[field] === "string" && dimension[field].trim());
    if (!deterministic && !semantic) throw new Error(`${kind}.${name} requires deterministic signals or semantic reasoning`);
    if (deterministic && (!Number.isFinite(dimension.confidence) || dimension.confidence < 0 || dimension.confidence > 1)) {
      throw new Error(`${kind}.${name}.confidence must be in [0, 1]`);
    }
  }
  return true;
}

module.exports = { lineSlice, verifyEvidenceItem, verifyJudgment };
