"use strict";

const YAML = require("yaml");
const { MAX_FRONTMATTER_DEPTH, MAX_FRONTMATTER_NODES } = require("./constants");

const VALID_RISKS = new Set(["none", "safe", "critical", "offensive", "unknown"]);

function splitFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return { metadata: null, body: content, errors: ["missing_or_malformed_frontmatter"] };
  if (Buffer.byteLength(match[1], "utf8") > 32 * 1024) {
    return { metadata: null, body: content.slice(match[0].length), errors: ["frontmatter_too_large"] };
  }
  if (/(^|[\s\[{,:])[*&][A-Za-z0-9_-]+/m.test(match[1]) || /(^|\s)![^\s]+/m.test(match[1])) {
    return { metadata: null, body: content.slice(match[0].length), errors: ["yaml_alias_anchor_or_tag_forbidden"] };
  }
  try {
    const document = YAML.parseDocument(match[1], {
      maxAliasCount: 20,
      prettyErrors: false,
      strict: true,
      uniqueKeys: true,
    });
    if (document.errors.length) return { metadata: null, body: content.slice(match[0].length), errors: ["invalid_yaml"] };
    let nodes = 0;
    function visit(node, depth) {
      if (!node) return;
      nodes += 1;
      if (depth > MAX_FRONTMATTER_DEPTH || nodes > MAX_FRONTMATTER_NODES) throw new Error("yaml_structure_limit");
      if (Array.isArray(node.items)) {
        for (const item of node.items) {
          if (item?.key !== undefined || item?.value !== undefined) { visit(item.key, depth + 1); visit(item.value, depth + 1); }
          else visit(item, depth + 1);
        }
      }
    }
    visit(document.contents, 1);
    const metadata = document.toJS({ maxAliasCount: 20 });
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
      return { metadata: null, body: content.slice(match[0].length), errors: ["frontmatter_not_mapping"] };
    }
    return { metadata, body: content.slice(match[0].length), errors: [] };
  } catch {
    return { metadata: null, body: content.slice(match[0].length), errors: ["invalid_yaml"] };
  }
}

function deterministicValidation(content, skillId) {
  const { metadata, body, errors } = splitFrontmatter(content);
  const checks = [];
  const check = (id, passed, detail) => checks.push({ id, passed: Boolean(passed), detail });
  check("frontmatter", errors.length === 0, errors.join(", ") || "valid");
  check("name", typeof metadata?.name === "string" && metadata.name.trim() === skillId.split("/").at(-1), "name matches canonical leaf id");
  check("description", typeof metadata?.description === "string" && metadata.description.trim().length >= 20, "description has at least 20 characters");
  check("risk", VALID_RISKS.has(metadata?.risk), "risk uses an AAS value");
  check("source", typeof metadata?.source === "string" && metadata.source.trim().length > 0, "source is present");
  check("source_fidelity", typeof metadata?.source === "string" && !/\b(?:unknown|todo|tbd)\b/i.test(metadata.source), "source is attributable");
  check("when_to_use", /^##\s+When to Use\b/im.test(body), "When to Use section is present");
  check("limitations", /^##\s+Limitations\b/im.test(body), "Limitations section is present");
  const risky = ["critical", "offensive"].includes(metadata?.risk);
  check("safety_boundary", !risky || /\b(authorized|approval|permission|safety|do not|never|before)\b/i.test(body), "high-risk skills declare a safety boundary");
  check("repo_conventions", !/^#\s*$/m.test(body) && !/\bTODO\b/i.test(body), "body avoids empty headings and TODO markers");
  check("substantive_body", body.trim().length >= 100, "body has at least 100 characters");
  const passed = checks.filter((item) => item.passed).length;
  return {
    implementation: "aas-compatible-validation-v1",
    score: passed / checks.length,
    checks,
  };
}

function tesslAlignedValidation(bundle, skillId) {
  const primary = bundle.files[0];
  const { metadata, body, errors: parseErrors } = splitFrontmatter(primary.text);
  const checks = [];
  const add = (name, status, detail) => checks.push({ name, status, detail });
  const lineCount = primary.text.split(/\r?\n/).length;
  add("skill_md_line_count", lineCount > 500 ? "warning" : "passed", { lineCount, limit: 500 });
  add("frontmatter_valid", parseErrors.length ? "error" : "passed", { errors: parseErrors });
  const name = metadata?.name;
  const validName = typeof name === "string" && name.length >= 1 && name.length <= 64
    && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name) && name === skillId.split("/").at(-1);
  add("name_field", validName ? "passed" : "error", { length: typeof name === "string" ? name.length : 0 });
  const description = metadata?.description;
  const validDescription = typeof description === "string" && description.length >= 1 && description.length <= 1024;
  add("description_field", validDescription ? "passed" : "error", { length: typeof description === "string" ? description.length : 0 });
  const compatibility = metadata?.compatibility;
  add("compatibility_field", compatibility === undefined || (typeof compatibility === "string" && compatibility.length >= 1 && compatibility.length <= 500) ? "passed" : "error", { present: compatibility !== undefined });
  const allowedTools = metadata?.["allowed-tools"];
  add("allowed_tools_field", allowedTools === undefined || typeof allowedTools === "string" ? "passed" : "error", { present: allowedTools !== undefined });
  const metadataField = metadata?.metadata;
  const metadataMap = metadataField && typeof metadataField === "object" && !Array.isArray(metadataField);
  const version = metadataMap ? metadataField.version : undefined;
  const validVersion = typeof version === "string" && /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(version);
  add("metadata_version", metadataField === undefined || validVersion ? "passed" : "warning", { present: version !== undefined });
  const validMetadata = metadataField === undefined || (metadataMap && Object.entries(metadataField).every(([key, value]) => typeof key === "string" && typeof value === "string"));
  add("metadata_field", validMetadata ? "passed" : "warning", { present: metadataField !== undefined });
  const license = metadata?.license;
  add("license_field", license === undefined || (typeof license === "string" && license.trim()) ? "passed" : "error", { present: license !== undefined });
  const allowed = new Set(["name", "description", "compatibility", "allowed-tools", "metadata", "license"]);
  const unknown = Object.keys(metadata || {}).filter((key) => !allowed.has(key)).sort();
  add("frontmatter_unknown_keys", unknown.length ? "warning" : "passed", { count: unknown.length });
  add("body_present", body.trim() ? "passed" : "error", { bytes: Buffer.byteLength(body, "utf8") });
  for (const root of ["scripts", "references", "assets"]) {
    add(`${root}_directory`, "passed", { files: bundle.files.filter((file) => file.path.includes(`/${root}/`)).length });
  }
  const base = primary.path.slice(0, -"SKILL.md".length);
  const available = new Set(bundle.files.map((file) => file.path.slice(base.length)));
  const exists = (target) => available.has(target) || [...available].some((item) => item.startsWith(`${target.replace(/\/$/, "")}/`));
  const classify = (targets) => {
    const issues = { missing: [], too_deep: [], suspicious: [] };
    for (const raw of [...new Set(targets)]) {
      let target = raw.replace(/^<|>$/g, "").split("#", 1)[0].split("?", 1)[0];
      try { target = decodeURIComponent(target); } catch { issues.suspicious.push(raw); continue; }
      if (!target || /^(?:[a-z][a-z0-9+.-]*:|#|\/)/i.test(target)) continue;
      if (target.includes("\\") || target.split("/").includes("..") || target.split("/").includes(".")) { issues.suspicious.push(raw); continue; }
      const parts = target.replace(/\/$/, "").split("/").filter(Boolean);
      if (parts.length > 2) { issues.too_deep.push(raw); continue; }
      if (!exists(target)) issues.missing.push(raw);
    }
    return Object.fromEntries(Object.entries(issues).filter(([, values]) => values.length));
  };
  const linkTargets = [];
  for (const match of body.matchAll(/!?\[[^\]]*\]\(\s*(?:<([^>]+)>|([^\s)]+))/g)) linkTargets.push(match[1] || match[2]);
  const linkIssues = classify(linkTargets);
  add("relative_links", Object.keys(linkIssues).length ? "warning" : "passed", linkIssues);
  const mentioned = [];
  for (const match of body.matchAll(/\b(?:scripts|references|assets)\/[A-Za-z0-9._/-]+/g)) mentioned.push(match[0].replace(/[.,;:]+$/, ""));
  const pathIssues = classify(mentioned);
  add("referenced_paths_exist", Object.keys(pathIssues).length ? "warning" : "passed", pathIssues);
  const errors = checks.filter((item) => item.status === "error").length;
  const warnings = checks.filter((item) => item.status === "warning").length;
  const normalized = Math.max(0, (checks.length - errors - 0.5 * warnings) / checks.length);
  return {
    implementation: "tessl-aligned-validation-v2",
    overallPassed: errors === 0,
    errorCount: errors,
    warningCount: warnings,
    normalized,
    score: normalized,
    checks,
  };
}

module.exports = { deterministicValidation, splitFrontmatter, tesslAlignedValidation };
