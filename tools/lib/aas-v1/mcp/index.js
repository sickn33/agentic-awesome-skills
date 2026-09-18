"use strict";

const { AGENT_SELECTION_CONTRACT, MAX_SESSION_MANIFESTS, McpServer, TOOL_DEFINITIONS, TOOL_NAMES } = require("./server");
const { parseMcpRequestLine, runStdio } = require("./stdio");
const { MAX_BASE_REQUEST_BYTES, MAX_JSON_DEPTH, MAX_LINE_BYTES, StrictJsonError, parseStrictJsonLine } = require("./strict-json");

module.exports = {
  AGENT_SELECTION_CONTRACT,
  MAX_BASE_REQUEST_BYTES,
  MAX_JSON_DEPTH,
  MAX_LINE_BYTES,
  MAX_SESSION_MANIFESTS,
  McpServer,
  StrictJsonError,
  TOOL_DEFINITIONS,
  TOOL_NAMES,
  parseStrictJsonLine,
  parseMcpRequestLine,
  runStdio,
};
