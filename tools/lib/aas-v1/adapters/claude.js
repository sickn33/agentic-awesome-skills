"use strict";

const { hostConfigError } = require("./errors");

const KNOWN_KEYS = ["command", "args", "env"];

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

function parseJsonAst(text) {
  let cursor = 0;
  function fail() { throw hostConfigError("AAS_ADAPTER_CLAUDE_JSON_INVALID", "invalidInput"); }
  function whitespace() { while (/[\u0009\u000a\u000d\u0020]/.test(text[cursor] || "")) cursor += 1; }
  function string() {
    const start = cursor;
    if (text[cursor] !== '"') fail();
    cursor += 1;
    while (cursor < text.length) {
      if (text[cursor] === '"') {
        cursor += 1;
        try { return { value: JSON.parse(text.slice(start, cursor)), start, end: cursor }; } catch { fail(); }
      }
      if (text[cursor] === "\\") cursor += 2;
      else cursor += 1;
    }
    fail();
  }
  function value(depth = 0) {
    if (depth > 32) fail();
    whitespace();
    const start = cursor;
    if (text[cursor] === "{") return object(depth + 1);
    if (text[cursor] === "[") return array(depth + 1);
    if (text[cursor] === '"') {
      const node = string();
      return { type: "string", ...node };
    }
    while (cursor < text.length && !/[\s,}\]]/.test(text[cursor])) cursor += 1;
    if (cursor === start) fail();
    try { return { type: "primitive", value: JSON.parse(text.slice(start, cursor)), start, end: cursor }; } catch { fail(); }
  }
  function array(depth) {
    const start = cursor;
    const items = [];
    cursor += 1;
    whitespace();
    if (text[cursor] === "]") { cursor += 1; return { type: "array", value: [], items, start, end: cursor }; }
    while (cursor < text.length) {
      const item = value(depth);
      items.push(item);
      whitespace();
      if (text[cursor] === "]") { cursor += 1; return { type: "array", value: items.map((entry) => entry.value), items, start, end: cursor }; }
      if (text[cursor] !== ",") fail();
      cursor += 1;
    }
    fail();
  }
  function object(depth) {
    const start = cursor;
    const properties = [];
    const keys = new Set();
    const result = {};
    cursor += 1;
    whitespace();
    if (text[cursor] === "}") { cursor += 1; return { type: "object", value: result, properties, start, end: cursor }; }
    while (cursor < text.length) {
      whitespace();
      const key = string();
      if (keys.has(key.value)) throw hostConfigError("AAS_ADAPTER_CLAUDE_JSON_DUPLICATE_KEY", "invalidInput", { key: key.value });
      keys.add(key.value);
      whitespace();
      if (text[cursor] !== ":") fail();
      cursor += 1;
      const child = value(depth);
      properties.push({ key: key.value, keyNode: key, valueNode: child });
      result[key.value] = child.value;
      whitespace();
      if (text[cursor] === "}") { cursor += 1; return { type: "object", value: result, properties, start, end: cursor }; }
      if (text[cursor] !== ",") fail();
      cursor += 1;
    }
    fail();
  }
  const root = value(0);
  whitespace();
  if (cursor !== text.length || root.type !== "object") fail();
  return root;
}

function property(node, key) {
  return node.properties.find((entry) => entry.key === key);
}

function indentation(text) {
  const match = text.match(/\n([ \t]+)"/);
  return match ? match[1] : "  ";
}

function lineIndent(text, offset) {
  const lineStart = text.lastIndexOf("\n", offset - 1) + 1;
  return (text.slice(lineStart, offset).match(/^[ \t]*/) || [""])[0];
}

function formatValue(value, continuationIndent, indentUnit) {
  return JSON.stringify(value, null, indentUnit).split("\n").map((line, index) => index === 0 ? line : `${continuationIndent}${line}`).join("\n");
}

function replaceRange(text, start, end, replacement) {
  return `${text.slice(0, start)}${replacement}${text.slice(end)}`;
}

function insertProperty(text, node, key, value, indentUnit) {
  const baseIndent = lineIndent(text, node.start);
  const childIndent = `${baseIndent}${indentUnit}`;
  const rendered = `${JSON.stringify(key)}: ${formatValue(value, childIndent, indentUnit)}`;
  if (node.properties.length === 0) {
    return replaceRange(text, node.start, node.end, `{\n${childIndent}${rendered}\n${baseIndent}}`);
  }
  const last = node.properties.at(-1).valueNode;
  return replaceRange(text, last.end, last.end, `,\n${childIndent}${rendered}`);
}

function sameValue(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function inspectTree(root) {
  const mcp = property(root, "mcpServers");
  if (mcp && mcp.valueNode.type !== "object") throw hostConfigError("AAS_ADAPTER_CLAUDE_SECTION_AMBIGUOUS", "invalidInput", { key: "mcpServers" });
  const aas = mcp ? property(mcp.valueNode, "aas") : null;
  if (aas && aas.valueNode.type !== "object") throw hostConfigError("AAS_ADAPTER_CLAUDE_SECTION_AMBIGUOUS", "invalidInput", { key: "aas" });
  return {
    mcp: mcp ? mcp.valueNode : null,
    aas: aas ? aas.valueNode : null,
    inspection: {
      sectionPresent: Boolean(aas),
      configured: Boolean(aas) && KNOWN_KEYS.every((key) => Object.hasOwn(aas.valueNode.value, key)),
      unknownKeys: aas ? Object.keys(aas.valueNode.value).filter((key) => !KNOWN_KEYS.includes(key)).sort() : [],
    },
  };
}

function buildClaudeText(bytes, server) {
  const source = decodeUtf8(bytes);
  const text = source.trim() === "" ? "{}\n" : source;
  const root = parseJsonAst(text);
  const { mcp, aas, inspection } = inspectTree(root);
  const changedPaths = KNOWN_KEYS.filter((key) => !aas || !Object.hasOwn(aas.value, key) || !sameValue(aas.value[key], server[key])).map((key) => `mcpServers.aas.${key}`);
  if (changedPaths.length === 0) return { text, inspection, changedPaths };
  const indentUnit = indentation(text);
  let nextText;
  if (aas) {
    const nextAas = { ...aas.value, command: server.command, args: server.args, env: server.env };
    nextText = replaceRange(text, aas.start, aas.end, formatValue(nextAas, lineIndent(text, aas.start), indentUnit));
  } else if (mcp) {
    nextText = insertProperty(text, mcp, "aas", server, indentUnit);
  } else {
    nextText = insertProperty(text, root, "mcpServers", { aas: server }, indentUnit);
  }
  return { text: nextText, inspection, changedPaths };
}

function inspectClaudeBytes(bytes) {
  const source = decodeUtf8(bytes);
  const root = parseJsonAst(source.trim() === "" ? "{}" : source);
  return inspectTree(root).inspection;
}

module.exports = { buildClaudeText, inspectClaudeBytes, parseJsonAst };
