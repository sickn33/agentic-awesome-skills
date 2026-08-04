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

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseMcpRequestLine(bytes) {
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  const request = parseStrictJsonLine(buffer, { maximumBytes: MAX_LINE_BYTES });
  if (buffer.length <= MAX_BASE_REQUEST_BYTES) return request;

  if (
    request.method !== "tools/call"
    || !isPlainObject(request.params)
    || !isPlainObject(request.params._meta)
    || !isPlainObject(request.params._meta[CODEX_TURN_METADATA_KEY])
  ) {
    throw new StrictJsonError("AAS_MCP_LINE_TOO_LARGE");
  }
  const metaWithoutCodexTurn = { ...request.params._meta };
  delete metaWithoutCodexTurn[CODEX_TURN_METADATA_KEY];
  const paramsWithoutCodexTurn = { ...request.params, _meta: metaWithoutCodexTurn };
  const requestWithoutCodexTurn = { ...request, params: paramsWithoutCodexTurn };
  if (Buffer.byteLength(JSON.stringify(requestWithoutCodexTurn), "utf8") > MAX_BASE_REQUEST_BYTES) {
    throw new StrictJsonError("AAS_MCP_LINE_TOO_LARGE");
  }
  const canonicalBytes = Buffer.byteLength(JSON.stringify(request), "utf8");
  if (buffer.length > canonicalBytes + MAX_JSON_FORMATTING_OVERHEAD_BYTES) {
    throw new StrictJsonError("AAS_MCP_LINE_TOO_LARGE");
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

  function enqueue(line) {
    if (pendingRequests >= MAX_PENDING_REQUESTS) {
      writeJsonLine(output, {
        jsonrpc: "2.0",
        id: null,
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
        const code = error instanceof StrictJsonError ? error.code : "AAS_MCP_PARSE_FAILED";
        writeJsonLine(output, parseErrorResponse(code));
        return;
      }
      try {
        const response = await server.handle(request);
        if (response) writeJsonLine(output, response);
      } catch {
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
