#!/usr/bin/env node
"use strict";

const path = require("node:path");
const { createVerifiedCatalogResolver } = require("../lib/aas-v1/cache/resolver");
const { McpServer, runStdio } = require("../lib/aas-v1/mcp");

function parseArgs(argv) {
  if (argv.length === 0) return {};
  if (argv.length === 2 && argv[0] === "--cache-root" && path.isAbsolute(argv[1]) && !argv[1].includes("\0")) {
    return { cacheRoot: argv[1] };
  }
  throw new Error("invalid MCP startup arguments");
}

try {
  const root = path.resolve(__dirname, "../..");
  const { cacheRoot } = parseArgs(process.argv.slice(2));
  const catalogResolver = createVerifiedCatalogResolver({ cacheRoot, bundledRoot: root });
  runStdio(new McpServer({ root, catalogResolver }));
} catch {
  process.stderr.write("AAS MCP startup failed (details redacted)\n");
  process.exitCode = 1;
}

module.exports = { parseArgs };
