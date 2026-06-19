const fs = require("fs");
const path = require("path");
const cp = require("child_process");
const YAML = require("yaml");

const ROOT = process.cwd();
const UPSTREAM_SHA = "70b2e1062fc6a38fce854226c27097a87732cb5f";
const SOURCE_LABEL = "vibeship-spawner-skills (Apache 2.0)";
const LIST_PATH = "/tmp/vibeship_files.txt";
const FILES = fs.existsSync(LIST_PATH)
  ? fs.readFileSync(LIST_PATH, "utf8").trim().split("\n").filter(Boolean)
  : [];
const TREE = JSON.parse(
  runCommand(
    `gh api 'repos/vibeforge1111/vibeship-spawner-skills/git/trees/${UPSTREAM_SHA}?recursive=1'`,
  ),
);
const SKILL_PATHS = TREE.tree
  .filter((entry) => /(^|\/)skill\.yaml$/.test(entry.path))
  .map((entry) => entry.path);

function runCommand(cmd) {
  return cp.execSync(cmd, {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    cwd: ROOT,
  });
}

function fetchText(url) {
  return cp.execFileSync("curl", ["-fsSL", "--max-time", "30", url], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    cwd: ROOT,
  });
}

function parseOptionalYaml(relPath) {
  const url = `https://raw.githubusercontent.com/vibeforge1111/vibeship-spawner-skills/${UPSTREAM_SHA}/${relPath}`;
  try {
    return YAML.parse(fetchText(url));
  } catch {
    return null;
  }
}

function parseFrontmatter(content) {
  if (!content.startsWith("---\n")) {
    return { data: {}, body: content };
  }

  const end = content.indexOf("\n---\n", 4);
  if (end === -1) {
    return { data: {}, body: content };
  }

  return {
    data: YAML.parse(content.slice(4, end)) || {},
    body: content.slice(end + 5),
  };
}

function stringifyFrontmatter(data) {
  return `---\n${YAML.stringify(data).trimEnd()}\n---\n`;
}

function sanitizeText(text) {
  return String(text || "")
    .replace(/\r/g, "")
    .replace(/\/Users\/yourname\//g, "~/")
    .replace(/\/Users\/username\//g, "~/")
    .replace(/C:\/Users\/yourname\//g, "%USERPROFILE%/")
    .replace(/C:\/Users\/username\//g, "%USERPROFILE%/");
}

function clean(text) {
  return sanitizeText(String(text || "")).trim();
}

function isScalar(value) {
  return ["string", "number", "boolean"].includes(typeof value);
}

function formatInline(value) {
  if (value === null || value === undefined || value === "") return "";
  if (isScalar(value)) return clean(value);
  if (Array.isArray(value)) {
    const rendered = value.map((entry) => formatInline(entry)).filter(Boolean);
    return rendered.join(", ");
  }
  if (typeof value === "object") {
    const preferredKeys = [
      "name",
      "title",
      "role",
      "trigger",
      "skill",
      "id",
      "description",
      "summary",
      "context",
      "action",
      "pattern",
      "severity",
      "provides",
      "receives",
    ];
    const orderedKeys = [
      ...preferredKeys.filter((key) => key in value),
      ...Object.keys(value).filter((key) => !preferredKeys.includes(key)),
    ];
    const parts = [];
    for (const key of orderedKeys) {
      const rendered = formatInline(value[key]);
      if (!rendered) continue;
      if (["name", "title", "role", "trigger", "skill", "id"].includes(key)) {
        parts.push(rendered);
      } else {
        parts.push(`${titleize(key)}: ${rendered}`);
      }
    }
    return parts.join(" | ");
  }
  return clean(String(value));
}

function renderMarkdown(text) {
  return sanitizeText(String(text || "")).replace(/\r/g, "").trim();
}

function titleize(slug) {
  return String(slug || "")
    .split("-")
    .filter(Boolean)
    .map((part) => {
      const lower = part.toLowerCase();
      if (lower === "ai") return "AI";
      if (lower === "llm") return "LLM";
      if (part.toUpperCase() === part && part.length <= 5) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
}

function summarizeDescription(raw) {
  const cleaned = clean(raw).replace(/\n+/g, " ").replace(/\s+/g, " ").trim();
  if (cleaned.length <= 280) return cleaned;

  const sentences = cleaned.match(/[^.!?]+[.!?]+/g);
  if (sentences) {
    let acc = "";
    for (const sentence of sentences) {
      const next = (acc ? `${acc} ` : "") + sentence.trim();
      if (next.length > 280) break;
      acc = next;
    }
    if (acc) return acc;
  }

  return `${cleaned.slice(0, 277).trimEnd()}...`;
}

function bullets(items) {
  return items
    .map((item) => formatInline(item))
    .filter(Boolean)
    .map((item) => `- ${item}`)
    .join("\n");
}

function codeBlock(text) {
  return ["```", clean(text), "```"].join("\n");
}

function objectBullets(obj, indent = "") {
  const lines = [];

  for (const [key, value] of Object.entries(obj || {})) {
    const label = titleize(key);

    if (Array.isArray(value)) {
      if (!value.length) continue;

      if (value.every((entry) => typeof entry === "string")) {
        lines.push(`${indent}- ${label}: ${value.join(", ")}`);
        continue;
      }

      lines.push(`${indent}- ${label}:`);
      for (const entry of value) {
        if (typeof entry === "string") {
          lines.push(`${indent}  - ${entry}`);
          continue;
        }

        if (!entry || typeof entry !== "object") continue;
        const parts = [];
        for (const [entryKey, entryValue] of Object.entries(entry)) {
          if (entryValue === null || entryValue === undefined || entryValue === "") continue;
          parts.push(
            `${entryKey}: ${
              typeof entryValue === "string" ? entryValue : JSON.stringify(entryValue)
            }`,
          );
        }
        lines.push(`${indent}  - ${parts.join(" | ")}`);
      }
      continue;
    }

    if (value && typeof value === "object") {
      lines.push(`${indent}- ${label}:`);
      lines.push(objectBullets(value, `${indent}  `));
      continue;
    }

    if (value !== null && value !== undefined && value !== "") {
      lines.push(`${indent}- ${label}: ${value}`);
    }
  }

  return lines.join("\n");
}

function renderToolingSection(title, obj) {
  if (!obj || typeof obj !== "object") return null;

  const parts = [];
  for (const [key, value] of Object.entries(obj)) {
    if (!value || (Array.isArray(value) && !value.length)) continue;

    parts.push(`### ${titleize(key)}`);
    if (Array.isArray(value)) {
      const rows = value
        .map((entry) => {
          if (typeof entry === "string") return `- ${entry}`;
          if (!entry || typeof entry !== "object") return null;

          const label = entry.name || entry.skill || entry.id || "Item";
          const details = [];
          if (entry.when) details.push(`When: ${entry.when}`);
          if (entry.note) details.push(`Note: ${entry.note}`);
          if (entry.description) details.push(entry.description);
          return `- ${label}${details.length ? ` - ${details.join(" ")}` : ""}`;
        })
        .filter(Boolean);

      if (rows.length) {
        parts.push(rows.join("\n"));
      }
      continue;
    }

    if (typeof value === "object") {
      parts.push(objectBullets(value));
      continue;
    }

    parts.push(String(value));
  }

  if (!parts.length) return null;
  return `## ${title}\n\n${parts.join("\n\n")}`;
}

function renderIdentity(identity) {
  if (!identity || typeof identity !== "object") return null;

  const parts = [];
  if (identity.role) parts.push(`**Role**: ${clean(identity.role)}`);
  if (identity.personality) parts.push(renderMarkdown(identity.personality));
  if (Array.isArray(identity.expertise) && identity.expertise.length) {
    parts.push(`### Expertise\n\n${bullets(identity.expertise)}`);
  }

  for (const [key, value] of Object.entries(identity)) {
    if (["role", "personality", "expertise"].includes(key)) continue;
    if (!value || (Array.isArray(value) && !value.length)) continue;
    if (typeof value === "string") {
      parts.push(`### ${titleize(key)}\n\n${renderMarkdown(value)}`);
    } else if (Array.isArray(value)) {
      parts.push(`### ${titleize(key)}\n\n${bullets(value)}`);
    } else if (typeof value === "object") {
      parts.push(`### ${titleize(key)}\n\n${objectBullets(value)}`);
    }
  }

  if (!parts.length) return null;
  return parts.join("\n\n");
}

function renderPatterns(patterns) {
  if (!Array.isArray(patterns) || !patterns.length) return null;

  const blocks = patterns.map((pattern) => {
    const lines = [`### ${pattern.name || pattern.id || "Pattern"}`];
    if (pattern.description) lines.push("", clean(pattern.description));
    const whenToUse = pattern.when_to_use || pattern.when;
    if (whenToUse) lines.push("", `**When to use**: ${clean(whenToUse)}`);

    const implementation = pattern.implementation || pattern.example;
    if (implementation) lines.push("", renderMarkdown(implementation));

    for (const [key, value] of Object.entries(pattern)) {
      if (
        ["name", "id", "description", "when", "when_to_use", "implementation", "example"].includes(
          key,
        )
      ) {
        continue;
      }
      if (!value || (Array.isArray(value) && !value.length)) continue;
      if (typeof value === "string") {
        lines.push("", `### ${titleize(key)}`, "", renderMarkdown(value));
      } else if (Array.isArray(value)) {
        lines.push("", `### ${titleize(key)}`, "", bullets(value));
      } else if (typeof value === "object") {
        lines.push("", `### ${titleize(key)}`, "", objectBullets(value));
      }
    }
    return lines.join("\n");
  });

  return `## Patterns\n\n${blocks.join("\n\n")}`;
}

function renderSharpEdges(data) {
  const edges = data && Array.isArray(data.sharp_edges) ? data.sharp_edges : null;
  if (!edges || !edges.length) return null;

  const blocks = edges.map((edge) => {
    const lines = [`### ${edge.title || edge.summary || edge.id || "Sharp Edge"}`];
    if (edge.severity) lines.push("", `Severity: ${String(edge.severity).toUpperCase()}`);
    if (edge.situation) lines.push("", `Situation: ${clean(edge.situation)}`);
    if (edge.symptom) lines.push("", "Symptoms:", clean(edge.symptom));
    if (Array.isArray(edge.symptoms) && edge.symptoms.length) {
      lines.push("", "Symptoms:", bullets(edge.symptoms));
    }
    if (edge.why) lines.push("", "Why this breaks:", clean(edge.why));
    if (edge.solution) lines.push("", "Recommended fix:", "", renderMarkdown(edge.solution));
    return lines.join("\n");
  });

  return `## Sharp Edges\n\n${blocks.join("\n\n")}`;
}

function renderValidations(data) {
  const validations = data && Array.isArray(data.validations) ? data.validations : null;
  if (!validations || !validations.length) return null;

  const blocks = validations.slice(0, 10).map((entry) => {
    const lines = [`### ${entry.name || entry.id || "Validation"}`];
    if (entry.severity) lines.push("", `Severity: ${String(entry.severity).toUpperCase()}`);
    if (entry.description) lines.push("", clean(entry.description));
    if (entry.message) lines.push("", `Message: ${clean(entry.message)}`);
    if (entry.fix_action) lines.push("", `Fix action: ${clean(entry.fix_action)}`);
    return lines.join("\n");
  });

  return `## Validation Checks\n\n${blocks.join("\n\n")}`;
}

function renderCollaboration(data) {
  if (!data || typeof data !== "object") return null;

  const parts = [];
  if (Array.isArray(data.delegation_triggers) && data.delegation_triggers.length) {
    const rows = data.delegation_triggers.map(
      (entry) =>
        `- ${entry.trigger} -> ${entry.delegate_to}${
          entry.context ? ` (${entry.context})` : ""
        }`,
    );
    parts.push(`### Delegation Triggers\n\n${rows.join("\n")}`);
  }

  if (Array.isArray(data.common_combinations) && data.common_combinations.length) {
    const combos = data.common_combinations.map((entry) => {
      const lines = [`### ${entry.name || "Combination"}`];
      if (Array.isArray(entry.skills) && entry.skills.length) {
        lines.push("", `Skills: ${entry.skills.join(", ")}`);
      }
      if (entry.workflow) lines.push("", "Workflow:", "", codeBlock(entry.workflow));
      return lines.join("\n");
    });
    parts.push(combos.join("\n\n"));
  }

  if (!parts.length) return null;
  return `## Collaboration\n\n${parts.join("\n\n")}`;
}

function renderWhenToUse(skill) {
  const triggers = Array.isArray(skill.triggers) ? skill.triggers : [];
  if (!triggers.length) {
    return "## When to Use\n\nUse this skill when the request clearly matches the capabilities and patterns described above.";
  }
  return `## When to Use\n\n${bullets(
    triggers.map((trigger) => `User mentions or implies: ${trigger}`),
  )}`;
}

function buildBody(skill, sharp, validations, collaboration) {
  const sections = [];

  sections.push(`# ${skill.name || titleize(skill.id || "skill")}`);
  if (skill.description) sections.push(clean(skill.description));
  const identitySection = renderIdentity(skill.identity);
  if (identitySection) sections.push(identitySection);
  if (Array.isArray(skill.principles) && skill.principles.length) {
    sections.push(`## Principles\n\n${bullets(skill.principles)}`);
  }
  if (Array.isArray(skill.owns) && skill.owns.length) {
    sections.push(`## Capabilities\n\n${bullets(skill.owns)}`);
  }

  const prereq = [];
  if (skill.prerequisites && typeof skill.prerequisites === "object") {
    prereq.push(objectBullets(skill.prerequisites));
  }
  if (Array.isArray(skill.requires) && skill.requires.length) {
    prereq.push(`- Required skills: ${skill.requires.join(", ")}`);
  }
  if (prereq.length) sections.push(`## Prerequisites\n\n${prereq.filter(Boolean).join("\n")}`);

  const scope = [];
  if (skill.limits && typeof skill.limits === "object") {
    scope.push(objectBullets(skill.limits));
  }
  if (skill.does_not_own) {
    if (Array.isArray(skill.does_not_own)) scope.push(bullets(skill.does_not_own));
    else if (typeof skill.does_not_own === "object") scope.push(objectBullets(skill.does_not_own));
  }
  if (scope.length) sections.push(`## Scope\n\n${scope.filter(Boolean).join("\n")}`);

  const tooling = [
    renderToolingSection("Tooling", skill.stack),
    renderToolingSection("Ecosystem", skill.ecosystem),
  ].filter(Boolean);
  if (tooling.length) sections.push(tooling.join("\n\n"));

  const patterns = renderPatterns(skill.patterns);
  if (patterns) sections.push(patterns);

  const sharpEdges = renderSharpEdges(sharp);
  if (sharpEdges) sections.push(sharpEdges);

  const validationChecks = renderValidations(validations);
  if (validationChecks) sections.push(validationChecks);

  const collaborationSection = renderCollaboration(collaboration);
  if (collaborationSection) sections.push(collaborationSection);

  const related = Array.isArray(skill.pairs_with) ? skill.pairs_with : [];
  if (related.length) {
    sections.push(
      `## Related Skills\n\nWorks well with: ${related
        .map((name) => "`" + name + "`")
        .join(", ")}`,
    );
  }

  sections.push(renderWhenToUse(skill));

  return `${sections.filter(Boolean).join("\n\n")}\n`;
}

function forceUpstreamDescription(absPath, description) {
  const content = fs.readFileSync(absPath, "utf8");
  const parsed = parseFrontmatter(content);
  const next = { ...parsed.data, description: summarizeDescription(description || parsed.data.description || "") };
  fs.writeFileSync(absPath, `${stringifyFrontmatter(next)}\n${parsed.body.replace(/^\n/, "")}`);
}

function loadUpstreamPathBySkillId() {
  const map = new Map();
  for (const upstreamPath of SKILL_PATHS) {
    const skillId = path.posix.basename(path.posix.dirname(upstreamPath));
    if (!map.has(skillId)) map.set(skillId, []);
    map.get(skillId).push(upstreamPath);
  }
  return map;
}

function main() {
  if (!fs.existsSync(LIST_PATH)) {
    throw new Error(`Missing skill list: ${LIST_PATH}`);
  }

  const skillPathMap = loadUpstreamPathBySkillId();
  const touched = [];
  const skipped = [];

  for (const rel of FILES) {
    const skillId = rel.split("/")[1];
    const matches = skillPathMap.get(skillId) || [];
    if (matches.length !== 1) {
      skipped.push({ rel, matches });
      continue;
    }

    const upstreamPath = matches[0];
    const baseDir = path.posix.dirname(upstreamPath);
    const skill = YAML.parse(
      fetchText(
        `https://raw.githubusercontent.com/vibeforge1111/vibeship-spawner-skills/${UPSTREAM_SHA}/${upstreamPath}`,
      ),
    );
    const sharp = parseOptionalYaml(`${baseDir}/sharp-edges.yaml`);
    const validations = parseOptionalYaml(`${baseDir}/validations.yaml`);
    const collaboration = parseOptionalYaml(`${baseDir}/collaboration.yaml`);

    const abs = path.join(ROOT, rel);
    const existing = parseFrontmatter(fs.readFileSync(abs, "utf8"));
    const frontmatter = { ...existing.data };
    frontmatter.name = frontmatter.name || skill.id || skillId;
    frontmatter.description = summarizeDescription(skill.description || existing.data.description || "");
    frontmatter.risk = frontmatter.risk || "unknown";
    frontmatter.source = existing.data.source || SOURCE_LABEL;
    if (existing.data.date_added !== undefined) {
      frontmatter.date_added = existing.data.date_added;
    }

    fs.writeFileSync(
      abs,
      `${stringifyFrontmatter(frontmatter)}\n${buildBody(skill, sharp, validations, collaboration)}`,
    );
    forceUpstreamDescription(abs, skill.description);
    touched.push(rel);
  }

  console.log(`Rebuilt ${touched.length} vibeship skill files.`);
  if (skipped.length) {
    console.log("Skipped mappings:");
    for (const entry of skipped) {
      console.log(`- ${entry.rel} (${entry.matches.length} upstream matches)`);
    }
  }
}

if (require.main === module) {
  main();
}
