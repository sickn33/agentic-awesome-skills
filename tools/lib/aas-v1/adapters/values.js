"use strict";

const { hostConfigError } = require("./errors");

function assertString(value, field, maximum = 4096) {
  if (typeof value !== "string" || value.length === 0 || value.length > maximum || value.includes("\0")) {
    throw hostConfigError("AAS_ADAPTER_SERVER_INVALID", "invalidInput", { field });
  }
  return value;
}

function normalizeArgs(args) {
  if (!Array.isArray(args) || args.length > 64) {
    throw hostConfigError("AAS_ADAPTER_SERVER_INVALID", "invalidInput", { field: "args" });
  }
  return args.map((entry, index) => assertString(entry, `args[${index}]`));
}

function normalizeEnv(env) {
  if (!env || typeof env !== "object" || Array.isArray(env) || Object.getPrototypeOf(env) !== Object.prototype) {
    throw hostConfigError("AAS_ADAPTER_SERVER_INVALID", "invalidInput", { field: "env" });
  }
  const entries = Object.entries(env);
  if (entries.length > 64) throw hostConfigError("AAS_ADAPTER_SERVER_INVALID", "invalidInput", { field: "env" });
  return Object.fromEntries(entries.sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0).map(([key, value]) => [
    assertString(key, "env.key", 256),
    typeof value === "string" && value.length <= 8192 && !value.includes("\0")
      ? value
      : (() => { throw hostConfigError("AAS_ADAPTER_SERVER_INVALID", "invalidInput", { field: `env.${key}` }); })(),
  ]));
}

function normalizeServer(host, server) {
  if (!server || typeof server !== "object" || Array.isArray(server)) {
    throw hostConfigError("AAS_ADAPTER_SERVER_INVALID", "invalidInput");
  }
  if (host === "codex") {
    if (server.enabled !== undefined && typeof server.enabled !== "boolean") {
      throw hostConfigError("AAS_ADAPTER_SERVER_INVALID", "invalidInput", { field: "enabled" });
    }
    return { command: assertString(server.command, "command"), args: normalizeArgs(server.args), enabled: server.enabled ?? true };
  }
  if (host === "claude") {
    return { command: assertString(server.command, "command"), args: normalizeArgs(server.args), env: normalizeEnv(server.env ?? {}) };
  }
  throw hostConfigError("AAS_ADAPTER_HOST_UNSUPPORTED", "invalidInput", { host });
}

module.exports = { normalizeServer };
