"use strict";

const fs = require("node:fs");
const path = require("node:path");

const tracePath = process.env.AAS_NETWORK_TRACE;
if (!tracePath) throw new Error("AAS network observer requires an isolated trace path");

function deny(api) {
  return function deniedNetworkAttempt() {
    fs.mkdirSync(path.dirname(tracePath), { recursive: true, mode: 0o700 });
    fs.appendFileSync(tracePath, `${JSON.stringify({ schemaVersion: 1, api })}\n`, { encoding: "utf8", mode: 0o600 });
    const error = new Error(`Network attempt denied by legacy baseline observer: ${api}`);
    error.code = "AAS_LEGACY_NETWORK_DENIED";
    throw error;
  };
}

function replaceFunctions(target, names, prefix) {
  for (const name of names) {
    if (typeof target?.[name] === "function") target[name] = deny(`${prefix}.${name}`);
  }
}

const net = require("node:net");
replaceFunctions(net, ["connect", "createConnection"], "net");
if (net.Socket?.prototype) net.Socket.prototype.connect = deny("net.Socket.connect");
replaceFunctions(require("node:tls"), ["connect"], "tls");
replaceFunctions(require("node:http"), ["request", "get"], "http");
replaceFunctions(require("node:https"), ["request", "get"], "https");
replaceFunctions(require("node:dgram"), ["createSocket"], "dgram");
const dns = require("node:dns");
replaceFunctions(dns, ["lookup", "lookupService", "resolve", "resolve4", "resolve6", "resolveAny", "resolveCaa", "resolveCname", "resolveMx", "resolveNaptr", "resolveNs", "resolvePtr", "resolveSoa", "resolveSrv", "resolveTxt", "reverse"], "dns");
replaceFunctions(dns.promises, ["lookup", "lookupService", "resolve", "resolve4", "resolve6", "resolveAny", "resolveCaa", "resolveCname", "resolveMx", "resolveNaptr", "resolveNs", "resolvePtr", "resolveSoa", "resolveSrv", "resolveTxt", "reverse"], "dns.promises");
if (typeof globalThis.fetch === "function") globalThis.fetch = deny("global.fetch");
if (typeof globalThis.WebSocket === "function") globalThis.WebSocket = class DeniedWebSocket { constructor() { return deny("global.WebSocket")(); } };
