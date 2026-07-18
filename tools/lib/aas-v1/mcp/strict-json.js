"use strict";

const MAX_LINE_BYTES = 4096;
const MAX_JSON_DEPTH = 16;

class StrictJsonError extends Error {
  constructor(code) {
    super(code);
    this.name = "StrictJsonError";
    this.code = code;
  }
}

function strictJsonError(code) {
  throw new StrictJsonError(code);
}

function scanJson(text, maximumDepth = MAX_JSON_DEPTH) {
  let cursor = 0;

  function skipWhitespace() {
    while (cursor < text.length && /[\u0009\u000a\u000d\u0020]/.test(text[cursor])) cursor += 1;
  }

  function scanString() {
    if (text[cursor] !== "\"") strictJsonError("AAS_MCP_JSON_STRING_EXPECTED");
    const start = cursor;
    cursor += 1;
    while (cursor < text.length) {
      const character = text[cursor];
      if (character === "\"") {
        cursor += 1;
        const raw = text.slice(start, cursor);
        try {
          return JSON.parse(raw);
        } catch {
          strictJsonError("AAS_MCP_JSON_STRING_INVALID");
        }
      }
      if (character === "\\") {
        cursor += 2;
      } else {
        cursor += 1;
      }
    }
    strictJsonError("AAS_MCP_JSON_STRING_UNTERMINATED");
  }

  function scanPrimitive() {
    const start = cursor;
    while (cursor < text.length && !/[\u0009\u000a\u000d\u0020,}\]]/.test(text[cursor])) cursor += 1;
    if (start === cursor) strictJsonError("AAS_MCP_JSON_VALUE_EXPECTED");
    try {
      JSON.parse(text.slice(start, cursor));
    } catch {
      strictJsonError("AAS_MCP_JSON_PRIMITIVE_INVALID");
    }
  }

  function scanValue(depth) {
    skipWhitespace();
    if (cursor >= text.length) strictJsonError("AAS_MCP_JSON_VALUE_EXPECTED");
    const character = text[cursor];
    if (character === "{") return scanObject(depth + 1);
    if (character === "[") return scanArray(depth + 1);
    if (character === "\"") return scanString();
    return scanPrimitive();
  }

  function assertDepth(depth) {
    if (depth > maximumDepth) strictJsonError("AAS_MCP_JSON_DEPTH_EXCEEDED");
  }

  function scanObject(depth) {
    assertDepth(depth);
    const keys = new Set();
    cursor += 1;
    skipWhitespace();
    if (text[cursor] === "}") {
      cursor += 1;
      return;
    }
    while (cursor < text.length) {
      skipWhitespace();
      const key = scanString();
      if (keys.has(key)) strictJsonError("AAS_MCP_JSON_DUPLICATE_KEY");
      keys.add(key);
      skipWhitespace();
      if (text[cursor] !== ":") strictJsonError("AAS_MCP_JSON_COLON_EXPECTED");
      cursor += 1;
      scanValue(depth);
      skipWhitespace();
      if (text[cursor] === "}") {
        cursor += 1;
        return;
      }
      if (text[cursor] !== ",") strictJsonError("AAS_MCP_JSON_SEPARATOR_EXPECTED");
      cursor += 1;
    }
    strictJsonError("AAS_MCP_JSON_OBJECT_UNTERMINATED");
  }

  function scanArray(depth) {
    assertDepth(depth);
    cursor += 1;
    skipWhitespace();
    if (text[cursor] === "]") {
      cursor += 1;
      return;
    }
    while (cursor < text.length) {
      scanValue(depth);
      skipWhitespace();
      if (text[cursor] === "]") {
        cursor += 1;
        return;
      }
      if (text[cursor] !== ",") strictJsonError("AAS_MCP_JSON_SEPARATOR_EXPECTED");
      cursor += 1;
    }
    strictJsonError("AAS_MCP_JSON_ARRAY_UNTERMINATED");
  }

  scanValue(0);
  skipWhitespace();
  if (cursor !== text.length) strictJsonError("AAS_MCP_JSON_TRAILING_DATA");
}

function parseStrictJsonLine(bytes, options = {}) {
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  const maximumBytes = options.maximumBytes ?? MAX_LINE_BYTES;
  if (buffer.length > maximumBytes) strictJsonError("AAS_MCP_LINE_TOO_LARGE");
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    strictJsonError("AAS_MCP_UTF8_INVALID");
  }
  scanJson(text, options.maximumDepth ?? MAX_JSON_DEPTH);
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    strictJsonError("AAS_MCP_JSON_INVALID");
  }
  if (Array.isArray(value)) strictJsonError("AAS_MCP_JSONRPC_BATCH_FORBIDDEN");
  if (!value || typeof value !== "object") strictJsonError("AAS_MCP_JSONRPC_OBJECT_REQUIRED");
  return value;
}

module.exports = {
  MAX_JSON_DEPTH,
  MAX_LINE_BYTES,
  StrictJsonError,
  parseStrictJsonLine,
  scanJson,
};
