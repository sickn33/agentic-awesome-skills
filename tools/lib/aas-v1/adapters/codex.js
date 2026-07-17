"use strict";

const { hostConfigError } = require("./errors");

const SECTION = "mcp_servers.aas";
const KNOWN_KEYS = ["command", "args", "enabled"];

function decodeUtf8(bytes) {
  if (bytes.length > 1024 * 1024) throw hostConfigError("AAS_ADAPTER_CONFIG_TOO_LARGE", "invalidInput");
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (text.charCodeAt(0) === 0xfeff) throw new Error("bom");
    return text;
  } catch {
    throw hostConfigError("AAS_ADAPTER_CONFIG_ENCODING_INVALID", "invalidInput");
  }
}

function stripInlineComment(value) {
  let quoted = false;
  let escaped = false;
  let depth = 0;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') quoted = false;
      continue;
    }
    if (character === '"') quoted = true;
    else if (character === "[") depth += 1;
    else if (character === "]") depth -= 1;
    else if (character === "#" && depth === 0) return { value: value.slice(0, index).trim(), comment: value.slice(index) };
  }
  return { value: value.trim(), comment: "" };
}

function findAssignment(line) {
  let quoted = false;
  let escaped = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') quoted = false;
    } else if (character === '"') quoted = true;
    else if (character === "=") return { key: line.slice(0, index).trim(), raw: line.slice(index + 1), indent: line.match(/^\s*/)[0] };
  }
  return null;
}

function parseKnownValue(key, raw) {
  const source = stripInlineComment(raw).value;
  try {
    if (key === "command") {
      const value = JSON.parse(source);
      if (typeof value !== "string") throw new Error("not string");
      return value;
    }
    if (key === "args") {
      const value = JSON.parse(source);
      if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) throw new Error("not string array");
      return value;
    }
    if (key === "enabled" && /^(true|false)$/.test(source)) return source === "true";
  } catch {
    // Convert all unsupported TOML forms into a stable adapter error below.
  }
  throw hostConfigError("AAS_ADAPTER_CODEX_SECTION_AMBIGUOUS", "invalidInput", { key });
}

function parseCodexText(text) {
  const newline = text.includes("\r\n") ? "\r\n" : "\n";
  const terminalNewline = text.endsWith("\n");
  const lines = text.length === 0 ? [] : text.split(/\r?\n/);
  if (terminalNewline) lines.pop();
  let currentSection = "";
  let exactStart = -1;
  let exactEnd = lines.length;
  let exactCount = 0;
  const values = {};
  const lineIndexes = {};
  const unknownKeys = [];

  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    const header = trimmed.match(/^\[([^\]]+)\]\s*(?:#.*)?$/);
    const arrayHeader = trimmed.match(/^\[\[([^\]]+)\]\]\s*(?:#.*)?$/);
    if (arrayHeader) {
      const name = arrayHeader[1].trim();
      if (name.includes("mcp_servers") && name.includes("aas")) throw hostConfigError("AAS_ADAPTER_CODEX_SECTION_AMBIGUOUS", "invalidInput");
      currentSection = name;
      continue;
    }
    if (header) {
      const name = header[1].trim();
      if (currentSection === SECTION && exactEnd === lines.length) exactEnd = index;
      if (name === SECTION) {
        exactCount += 1;
        exactStart = index;
      } else if (name.includes("mcp_servers") && name.includes("aas")) {
        throw hostConfigError("AAS_ADAPTER_CODEX_SECTION_AMBIGUOUS", "invalidInput");
      }
      currentSection = name;
      continue;
    }
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    const assignment = findAssignment(lines[index]);
    if (!assignment) continue;
    const key = assignment.key;
    if (currentSection !== SECTION) {
      if (key === "mcp_servers.aas" || key.startsWith("mcp_servers.aas.") || (currentSection === "mcp_servers" && (key === "aas" || key.startsWith("aas.")))) {
        throw hostConfigError("AAS_ADAPTER_CODEX_SECTION_AMBIGUOUS", "invalidInput");
      }
      continue;
    }
    if (KNOWN_KEYS.includes(key)) {
      if (Object.hasOwn(lineIndexes, key)) throw hostConfigError("AAS_ADAPTER_CODEX_SECTION_AMBIGUOUS", "invalidInput", { key });
      values[key] = parseKnownValue(key, assignment.raw);
      lineIndexes[key] = index;
    } else {
      unknownKeys.push(key);
    }
  }
  if (currentSection === SECTION && exactEnd === lines.length) exactEnd = lines.length;
  if (exactCount > 1) throw hostConfigError("AAS_ADAPTER_CODEX_SECTION_AMBIGUOUS", "invalidInput");
  return { newline, terminalNewline, lines, present: exactCount === 1, start: exactStart, end: exactEnd, values, lineIndexes, unknownKeys };
}

function encodeValue(key, value) {
  if (key === "command") return JSON.stringify(value);
  if (key === "args") return `[${value.map((entry) => JSON.stringify(entry)).join(", ")}]`;
  return value ? "true" : "false";
}

function sameValue(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function buildCodexText(bytes, server) {
  const text = decodeUtf8(bytes);
  const parsed = parseCodexText(text);
  const lines = [...parsed.lines];
  if (!parsed.present) {
    if (lines.length > 0 && lines.at(-1).trim() !== "") lines.push("");
    lines.push(`[${SECTION}]`);
    for (const key of KNOWN_KEYS) lines.push(`${key} = ${encodeValue(key, server[key])}`);
  } else {
    for (const key of KNOWN_KEYS) {
      if (!Object.hasOwn(parsed.lineIndexes, key)) continue;
      if (sameValue(parsed.values[key], server[key])) continue;
      const index = parsed.lineIndexes[key];
      const assignment = findAssignment(lines[index]);
      const { comment } = stripInlineComment(assignment.raw);
      lines[index] = `${assignment.indent}${key} = ${encodeValue(key, server[key])}${comment ? ` ${comment}` : ""}`;
    }
    const missing = KNOWN_KEYS.filter((key) => !Object.hasOwn(parsed.lineIndexes, key));
    if (missing.length > 0) lines.splice(parsed.end, 0, ...missing.map((key) => `${key} = ${encodeValue(key, server[key])}`));
  }
  const nextText = `${lines.join(parsed.newline)}${lines.length > 0 && (parsed.terminalNewline || text.length === 0) ? parsed.newline : ""}`;
  return {
    text: nextText,
    inspection: {
      sectionPresent: parsed.present,
      configured: parsed.present && KNOWN_KEYS.every((key) => Object.hasOwn(parsed.values, key)),
      unknownKeys: [...parsed.unknownKeys].sort(),
    },
    changedPaths: KNOWN_KEYS.filter((key) => !Object.hasOwn(parsed.values, key) || !sameValue(parsed.values[key], server[key])).map((key) => `mcp_servers.aas.${key}`),
  };
}

function inspectCodexBytes(bytes) {
  const parsed = parseCodexText(decodeUtf8(bytes));
  return {
    sectionPresent: parsed.present,
    configured: parsed.present && KNOWN_KEYS.every((key) => Object.hasOwn(parsed.values, key)),
    unknownKeys: [...parsed.unknownKeys].sort(),
  };
}

module.exports = { buildCodexText, inspectCodexBytes, parseCodexText };
