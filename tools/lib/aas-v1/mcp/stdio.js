"use strict";

const {
  MAX_BASE_REQUEST_BYTES,
  MAX_LINE_BYTES,
  StrictJsonError,
  parseStrictJsonLine,
} = require("./strict-json");

const MAX_PENDING_REQUESTS = 32;
const MAX_JSON_FORMATTING_OVERHEAD_BYTES = 64;
const CODEX_TURN_METADATA_KEY = "x-codex-turn-metadata";
const ARTIFACT_TOOLS = new Set(["compose_stack", "inspect_stack", "diff_stack", "export_selection_evidence", "inspect_selection_evidence"]);

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNotification(request) {
  return request.jsonrpc === "2.0" && typeof request.method === "string" && !Object.hasOwn(request, "id");
}

function requestLimitError(request) {
  const error = new StrictJsonError("AAS_MCP_LINE_TOO_LARGE");
  // Only attach an ID after strict JSON parsing, and never reflect unbounded data.
  if (request.jsonrpc === "2.0" && typeof request.method === "string") {
    if (Number.isSafeInteger(request.id) || (typeof request.id === "string" && request.id.length <= 128)) error.requestId = request.id;
    if (!Object.hasOwn(request, "id")) error.notification = true;
  }
  return error;
}

function parseMcpRequestLine(bytes) {
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  const request = parseStrictJsonLine(buffer, { maximumBytes: MAX_LINE_BYTES });
  if (buffer.length <= MAX_BASE_REQUEST_BYTES) return request;

  if (request.method !== "tools/call" || !isPlainObject(request.params)) throw requestLimitError(request);
  const params = { ...request.params };
  const hasCodexMetadata = isPlainObject(params._meta) && isPlainObject(params._meta[CODEX_TURN_METADATA_KEY]);
  const hasArtifact = ARTIFACT_TOOLS.has(params.name) && isPlainObject(params.arguments);
  if (!hasCodexMetadata && !hasArtifact) throw requestLimitError(request);
  if (hasCodexMetadata) {
    params._meta = { ...params._meta };
    delete params._meta[CODEX_TURN_METADATA_KEY];
  }
  // Artifact arguments share the existing absolute frame limit. Their schemas
  // still validate inside the server; arbitrary envelope/metadata stays at 4 KiB.
  if (hasArtifact) params.arguments = {};
  if (Buffer.byteLength(JSON.stringify({ ...request, params }), "utf8") > MAX_BASE_REQUEST_BYTES) {
    throw requestLimitError(request);
  }
  const canonicalBytes = Buffer.byteLength(JSON.stringify(request), "utf8");
  if (buffer.length > canonicalBytes + MAX_JSON_FORMATTING_OVERHEAD_BYTES) {
    throw requestLimitError(request);
  }
  return request;
}

function parseErrorResponse(code = "AAS_MCP_PARSE_FAILED") {
  return {
    jsonrpc: "2.0",
    id: null,
    error: { code: -32700, message: "Parse error", data: { code } },
  };
}

function writeJsonLine(stream, value) {
  stream.write(`${JSON.stringify(value)}\n`);
}

function runStdio(server, options = {}) {
  const input = options.input || process.stdin;
  const output = options.output || process.stdout;
  const diagnostics = options.diagnostics || process.stderr;
  let pending = Buffer.alloc(0);
  let discardingOversizedLine = false;
  let pendingRequests = 0;
  let sequence = Promise.resolve();

  function rejectParse(error) {
    const code = error instanceof StrictJsonError ? error.code : "AAS_MCP_PARSE_FAILED";
    if (error.notification) return;
    if (error.requestId !== undefined) {
      writeJsonLine(output, { jsonrpc: "2.0", id: error.requestId, error: { code: -32602, message: "Request exceeds its byte limit", data: { code } } });
      return;
    }
    writeJsonLine(output, parseErrorResponse(code));
  }

  function enqueue(line) {
    if (pendingRequests >= MAX_PENDING_REQUESTS) {
      // Rejected requests still need correlation. Parse with the same bounded,
      // duplicate-key-rejecting parser; never extract IDs from raw text.
      let request;
      try { request = parseMcpRequestLine(line); }
      catch (error) { rejectParse(error); return; }
      if (isNotification(request)) return;
      const validId = request.id === null || (typeof request.id === "number" && Number.isFinite(request.id))
        || (typeof request.id === "string" && request.id.length <= 128);
      if (request.jsonrpc !== "2.0" || typeof request.method !== "string" || !validId) {
        writeJsonLine(output, { jsonrpc: "2.0", id: null, error: { code: -32600, message: "Invalid Request" } });
        return;
      }
      writeJsonLine(output, {
        jsonrpc: "2.0",
        id: request.id,
        error: { code: -32000, message: "Request queue full", data: { code: "AAS_MCP_QUEUE_FULL" } },
      });
      return;
    }
    pendingRequests += 1;
    sequence = sequence.then(async () => {
      let request;
      try {
        request = parseMcpRequestLine(line);
      } catch (error) {
        rejectParse(error);
        return;
      }
      try {
        const response = await server.handle(request);
        if (response) writeJsonLine(output, response);
      } catch {
        if (isNotification(request)) {
          diagnostics.write("AAS MCP notification error (details redacted)\n");
          return;
        }
        writeJsonLine(output, {
          jsonrpc: "2.0",
          id: Object.hasOwn(request, "id") ? request.id : null,
          error: { code: -32603, message: "Internal error" },
        });
        diagnostics.write("AAS MCP internal error (details redacted)\n");
      }
    }).finally(() => { pendingRequests -= 1; });
  }

  input.on("data", (chunk) => {
    let buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    while (buffer.length) {
      const newline = buffer.indexOf(0x0a);
      const part = newline === -1 ? buffer : buffer.subarray(0, newline);
      buffer = newline === -1 ? Buffer.alloc(0) : buffer.subarray(newline + 1);
      if (discardingOversizedLine) {
        if (newline !== -1) {
          discardingOversizedLine = false;
          enqueue(Buffer.alloc(MAX_LINE_BYTES + 1));
        }
        continue;
      }
      const framedBytes = pending.length + part.length + (newline === -1 ? 0 : 1);
      if (framedBytes > MAX_LINE_BYTES) {
        pending = Buffer.alloc(0);
        if (newline === -1) discardingOversizedLine = true;
        else enqueue(Buffer.alloc(MAX_LINE_BYTES + 1));
        continue;
      }
      pending = Buffer.concat([pending, part]);
      if (newline !== -1) {
        if (pending[pending.length - 1] === 0x0d) pending = pending.subarray(0, -1);
        enqueue(pending);
        pending = Buffer.alloc(0);
      }
    }
  });

  input.on("end", () => {
    if (discardingOversizedLine) enqueue(Buffer.alloc(MAX_LINE_BYTES + 1));
    else if (pending.length) enqueue(pending);
  });

  return { completed: () => sequence };
}

module.exports = { MAX_PENDING_REQUESTS, parseErrorResponse, parseMcpRequestLine, runStdio, writeJsonLine };
