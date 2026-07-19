"use strict";

const { AGENT_SELECTION_CONTRACT, McpServer, TOOL_DEFINITIONS, TOOL_NAMES } = require("./server");
const { runStdio } = require("./stdio");
const { MAX_JSON_DEPTH, MAX_LINE_BYTES, StrictJsonError, parseStrictJsonLine } = require("./strict-json");

module.exports = {
  AGENT_SELECTION_CONTRACT,
  MAX_JSON_DEPTH,
  MAX_LINE_BYTES,
  McpServer,
  StrictJsonError,
  TOOL_DEFINITIONS,
  TOOL_NAMES,
  parseStrictJsonLine,
  runStdio,
};
