"use strict";

function safePlaceholder(value) {
  return /^(?:your[-_](?:api[-_]?key|access[-_]?key|token|secret|password|credential)(?:[-_]here)?|example(?:[-_](?:value|token|api[-_]?key|secret|password|credential))?|placeholder(?:[-_](?:value|token|api[-_]?key|secret|password|credential))?|<[^<>\r\n]{1,64}>|redacted|changeme)$/i.test(value);
}

function secretLike(text) {
  if (typeof text !== "string") return false;
  if (/\b(?:Authorization|X-API-Key)\s*:\s*[^\r\n]+|\b(?:Bearer|Basic)\s+[A-Za-z0-9+\/=._-]+/i.test(text)) return true;
  if (/\bglpat-[A-Za-z0-9_-]+\b|\bSG\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/i.test(text)) return true;
  if (/\b(?:npm_[A-Za-z0-9]{20,}|pypi-[A-Za-z0-9_-]{20,}|hf_[A-Za-z0-9]{20,})\b/i.test(text)) return true;
  if (/\b\d{6,}:[A-Za-z0-9_-]{20,}\b|https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9_\/-]{20,}/i.test(text)) return true;
  if (/(?:^|[?&])sig=[A-Za-z0-9%+\/_=-]{12,}(?:&|$)/im.test(text)) return true;
  if (/(?:^|[^A-Fa-f0-9])[a-f0-9]{32,}(?:$|[^A-Fa-f0-9])/im.test(text)) return true;
  if (/-----BEGIN [A-Z ]*PRIVATE KEY-----|\b(?:AKIA|ASIA)[A-Z0-9]{16}\b|\b(?:ghp|gho|ghu|ghs|github_pat|sk|xox[baprs])[-_][A-Za-z0-9_-]{12,}\b|\bAIza[0-9A-Za-z_-]{30,}\b|\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b|\b(?:https?|[a-z][a-z0-9+.-]*):\/\/[^\s\/@:]+:[^\s\/@]+@/i.test(text)) return true;
  const authorization = text.match(/\bAuthorization\s*:\s*(?:Bearer|Basic)\s+([^\s,;]+)/i);
  if (authorization && !safePlaceholder(authorization[1])) return true;
  const assignments = text.matchAll(/["']?[A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD|PASSWD|CREDENTIAL|SESSION_ID|COOKIE)[A-Z0-9_]*["']?\s*[:=]\s*(?:"([^"]*)"|'([^']*)'|([^\s,;]+))/gi);
  for (const assignment of assignments) {
    const value = assignment[1] ?? assignment[2] ?? assignment[3] ?? "";
    if (value && !safePlaceholder(value)) return true;
  }
  for (const token of text.match(/[A-Za-z0-9+/_=-]{24,}/g) || []) {
    if (/[A-Z]/.test(token) && /[a-z]/.test(token) && /[0-9]/.test(token)) return true;
  }
  return false;
}

function secretIdentifierLike(text) {
  if (typeof text !== "string") return false;
  return text.split("/").some((segment) => secretLike(segment));
}

module.exports = { safePlaceholder, secretIdentifierLike, secretLike };
