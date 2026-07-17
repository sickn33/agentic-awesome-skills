"use strict";

const { atomicWriteJson } = require("./cache");
const { PILOT_LIMITS } = require("./constants");
const { resolveOutputPath } = require("./output");
const { validateInterpretation, validatePacket } = require("./schema");
const { artifactName, readBoundedRegular } = require("./safe-io");

function loadBoundedJson(filePath, maxBytes, label) { return JSON.parse(readBoundedRegular(filePath, maxBytes, label).toString("utf8")); }

function readPacket(outputRoot, skillId, result) {
  const packet = loadBoundedJson(resolveOutputPath(outputRoot, `packets/${artifactName(skillId)}.json`), PILOT_LIMITS.maxPacketBytes, "Packet");
  validatePacket(packet, result);
  return packet;
}

function importInterpretation({ outputRoot, skillId, sourcePath, packet }) {
  const value = loadBoundedJson(sourcePath, PILOT_LIMITS.maxInterpretationBytes, "Interpretation");
  return storeInterpretation({ outputRoot, skillId, value, packet });
}

function storeInterpretation({ outputRoot, skillId, value, packet }) {
  validateInterpretation(value, packet);
  atomicWriteJson(outputRoot, `interpretations/${artifactName(skillId)}.json`, value);
  return value;
}

function verifyStoredInterpretation({ outputRoot, skillId, packet }) {
  const target = resolveOutputPath(outputRoot, `interpretations/${artifactName(skillId)}.json`);
  const value = loadBoundedJson(target, PILOT_LIMITS.maxInterpretationBytes, "Interpretation");
  validateInterpretation(value, packet);
  return value;
}

module.exports = { importInterpretation, loadBoundedJson, readPacket, storeInterpretation, verifyStoredInterpretation };
