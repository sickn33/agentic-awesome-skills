// Parse Markdown template comments only for evidence presence. This is not the
// output security boundary; literal() escapes all displayed untrusted values.
// Keep a newline at each removed span so fragments cannot join into new markup.
function evidenceText(body) {
  const text = String(body || "");
  const visible = [];
  let cursor = 0;
  while (cursor < text.length) {
    const open = text.indexOf("<!--", cursor);
    if (open === -1) {
      visible.push(text.slice(cursor));
      break;
    }
    visible.push(text.slice(cursor, open), "\n");
    const close = text.indexOf("-->", open + 4);
    if (close === -1) break;
    cursor = close + 3;
  }
  return visible.join("");
}
const crypto = require("node:crypto");
const SECTIONS = ["Change evidence", "Validation evidence", "Source and operational boundaries"];

function missingEvidence(body) {
  if (typeof body !== "string" || body.length > 65536) return [...SECTIONS];
  const sections = new Map();
  let current = null;
  let fence = null;
  for (const line of evidenceText(body).split(/\r?\n/)) {
    const marker = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    if (marker) {
      if (!fence) fence = marker[1];
      else if (marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = null;
      if (current) sections.get(current).at(-1).push(line);
      continue;
    }
    if (!fence && /^#{1,2}\s/.test(line)) {
      const heading = /^##[ \t]+(.+?)[ \t]*$/.exec(line)?.[1]?.trim().toLowerCase();
      current = SECTIONS.find(name => name.toLowerCase() === heading) || null;
      if (current) {
        if (!sections.has(current)) sections.set(current, []);
        sections.get(current).push([]);
      }
    } else if (current) sections.get(current).at(-1).push(line);
  }
  return SECTIONS.filter(name => {
    const entries = sections.get(name);
    if (entries?.length !== 1) return true;
    const value = entries[0].join("\n").trim();
    return value.length < 12 || /^\[.*\]$/.test(value)
      || /^(?:todo|tbd|placeholder|replace with)\b/i.test(value)
      || /^(?:n\/?a|none|not applicable|pending|not tested)[.!\s]*$/i.test(value);
  });
}
function requiresEvidence(records) {
  return Array.isArray(records) && records.some(record =>
    (record.status === "C" ? [record.new_path] : [record.old_path, record.new_path])
      .some(file => typeof file === "string" && /^skills\/[^/]+\//.test(file)));
}
function evaluateAdmission(records, body, available = typeof body === "string") {
  const applicable = requiresEvidence(records);
  const missing = applicable && available ? missingEvidence(body) : [];
  return { applicable, checked: applicable && available, blocking: applicable && (!available || missing.length > 0), missing,
    reason: applicable && !available ? "PR description unavailable; supply --body-file or the real PR event." : null };
}
function bodyDigest(body) {
  return crypto.createHash("sha256").update(JSON.stringify(typeof body === "string" ? body : null)).digest("hex");
}
function admissionMessage(result) {
  return "Skill PR evidence is incomplete. " + (result.reason || "Complete these PR sections: " + result.missing.join(", "))
    + " Short, truthful evidence is sufficient; explain unrun tests. Paid tools and live consequential actions are not required.";
}
module.exports = { SECTIONS, evidenceText, missingEvidence, requiresEvidence, evaluateAdmission, bodyDigest, admissionMessage };
