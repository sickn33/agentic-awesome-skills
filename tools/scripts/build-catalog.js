const fs = require("fs");
const path = require("path");
const {
  listSkillIdsRecursive,
  readSkill,
  tokenize,
  unique,
} = require("../lib/skill-utils");
const { findProjectRoot } = require("../lib/project-root");

const ROOT = findProjectRoot(__dirname);
const SKILLS_DIR = path.join(ROOT, "skills");

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "by",
  "for",
  "from",
  "has",
  "have",
  "in",
  "into",
  "is",
  "it",
  "its",
  "of",
  "on",
  "or",
  "our",
  "out",
  "over",
  "that",
  "the",
  "their",
  "they",
  "this",
  "to",
  "use",
  "when",
  "with",
  "you",
  "your",
  "will",
  "can",
  "if",
  "not",
  "only",
  "also",
  "more",
  "best",
  "practice",
  "practices",
  "expert",
  "specialist",
  "focused",
  "focus",
  "master",
  "modern",
  "advanced",
  "comprehensive",
  "production",
  "production-ready",
  "ready",
  "build",
  "create",
  "deliver",
  "design",
  "implement",
  "implementation",
  "strategy",
  "strategies",
  "patterns",
  "pattern",
  "workflow",
  "workflows",
  "guide",
  "template",
  "templates",
  "tool",
  "tools",
  "project",
  "projects",
  "support",
  "manage",
  "management",
  "system",
  "systems",
  "services",
  "service",
  "across",
  "end",
  "end-to-end",
  "using",
  "based",
  "ensure",
  "ensure",
  "help",
  "needs",
  "need",
  "focuses",
  "handles",
  "builds",
  "make",
]);

const TAG_STOPWORDS = new Set([
  "pro",
  "expert",
  "patterns",
  "pattern",
  "workflow",
  "workflows",
  "templates",
  "template",
  "toolkit",
  "tools",
  "tool",
  "project",
  "projects",
  "guide",
  "management",
  "engineer",
  "architect",
  "developer",
  "specialist",
  "assistant",
  "analysis",
  "review",
  "reviewer",
  "automation",
  "orchestration",
  "scaffold",
  "scaffolding",
  "implementation",
  "strategy",
  "context",
  "management",
  "feature",
  "features",
  "smart",
  "system",
  "systems",
  "design",
  "development",
  "development",
  "test",
  "testing",
  "workflow",
]);

const CATEGORY_RULES = [
  {
    name: "security",
    keywords: [
      "security",
      "sast",
      "compliance",
      "privacy",
      "threat",
      "vulnerability",
      "owasp",
      "pci",
      "gdpr",
      "secrets",
      "risk",
      "malware",
      "forensics",
      "attack",
      "incident",
      "auth",
      "mtls",
      "zero",
      "trust",
    ],
  },
  {
    name: "infrastructure",
    keywords: [
      "kubernetes",
      "k8s",
      "helm",
      "terraform",
      "cloud",
      "network",
      "devops",
      "gitops",
      "prometheus",
      "grafana",
      "observability",
      "monitoring",
      "logging",
      "tracing",
      "deployment",
      "istio",
      "linkerd",
      "service",
      "mesh",
      "slo",
      "sre",
      "oncall",
      "incident",
      "pipeline",
      "cicd",
      "ci",
      "cd",
      "kafka",
    ],
  },
  {
    name: "education",
    keywords: [
      "education",
      "student",
      "syllabus",
      "exam",
      "study",
      "teacher",
      "curriculum",
      "classroom",
      "school",
      "examprep",
      "roadmap",
      "academic",
      "university",
    ],
  },
  {
    name: "data-ai",
    keywords: [
      "data",
      "database",
      "db",
      "sql",
      "postgres",
      "mysql",
      "analytics",
      "etl",
      "warehouse",
      "dbt",
      "ml",
      "ai",
      "llm",
      "rag",
      "vector",
      "embedding",
      "spark",
      "airflow",
      "cdc",
      "pipeline",
    ],
  },
  {
    name: "development",
    keywords: [
      "python",
      "javascript",
      "typescript",
      "java",
      "golang",
      "go",
      "rust",
      "csharp",
      "dotnet",
      "php",
      "ruby",
      "node",
      "react",
      "frontend",
      "backend",
      "mobile",
      "ios",
      "android",
      "flutter",
      "fastapi",
      "django",
      "nextjs",
      "vue",
      "api",
    ],
  },
  {
    name: "architecture",
    keywords: [
      "architecture",
      "c4",
      "microservices",
      "event",
      "cqrs",
      "saga",
      "domain",
      "ddd",
      "patterns",
      "decision",
      "adr",
    ],
  },
  {
    name: "testing",
    keywords: ["testing", "tdd", "unit", "e2e", "qa", "test"],
  },
  {
    name: "business",
    keywords: [
      "business",
      "market",
      "sales",
      "finance",
      "startup",
      "legal",
      "hr",
      "product",
      "customer",
      "seo",
      "marketing",
      "kpi",
      "contract",
      "employment",
    ],
  },
  {
    name: "workflow",
    keywords: [
      "workflow",
      "orchestration",
      "conductor",
      "automation",
      "process",
      "collaboration",
    ],
  },
];

const FRONTMATTER_CATEGORY_OVERRIDES = new Map([
  ["business", "business"],
  ["product", "business"],
]);

const BUNDLE_RULES = {
  "core-dev": {
    description:
      "Core development skills across languages, frameworks, and backend/frontend fundamentals.",
    keywords: [
      "python",
      "javascript",
      "typescript",
      "go",
      "golang",
      "rust",
      "java",
      "node",
      "frontend",
      "backend",
      "react",
      "fastapi",
      "django",
      "nextjs",
      "api",
      "mobile",
      "ios",
      "android",
      "flutter",
      "php",
      "ruby",
    ],
  },
  "security-core": {
    description: "Security, privacy, and compliance essentials.",
    excludeCategories: new Set(["business"]),
    keywords: [
      "security",
      "sast",
      "compliance",
      "threat",
      "risk",
      "privacy",
      "secrets",
      "owasp",
      "gdpr",
      "pci",
      "vulnerability",
      "auth",
    ],
  },
  "k8s-core": {
    description: "Kubernetes and service mesh essentials.",
    keywords: [
      "kubernetes",
      "k8s",
      "helm",
      "istio",
      "linkerd",
      "service",
      "mesh",
    ],
  },
  "data-core": {
    description: "Data engineering and analytics foundations.",
    keywords: [
      "data",
      "database",
      "sql",
      "dbt",
      "airflow",
      "spark",
      "analytics",
      "etl",
      "warehouse",
      "postgres",
      "mysql",
      "kafka",
    ],
  },
  "ops-core": {
    description: "Operations, observability, and delivery pipelines.",
    keywords: [
      "observability",
      "monitoring",
      "logging",
      "tracing",
      "prometheus",
      "grafana",
      "devops",
      "gitops",
      "deployment",
      "cicd",
      "pipeline",
      "slo",
      "sre",
      "incident",
    ],
  },
  "automation-core": {
    description: "Automation platforms, workflow tooling, and business systems.",
    keywords: [
      "automation",
      "workflow",
      "airtable",
      "notion",
      "slack",
      "calendar",
      "sheets",
      "outlook",
      "hubspot",
      "zendesk",
      "shopify",
      "stripe",
      "sendgrid",
      "calendly",
      "clickup",
      "make",
      "n8n",
      "zoom",
    ],
  },
  "azure-core": {
    description: "Azure cloud, platform, and AI development.",
    keywords: ["azure", "azd"],
  },
  "commerce-core": {
    description: "Commerce, payments, and revenue operations skills.",
    keywords: [
      "stripe",
      "paypal",
      "plaid",
      "ecommerce",
      "commerce",
      "billing",
      "monetization",
      "crm",
      "shopify",
      "hubspot",
      "woocommerce",
      "odoo",
    ],
  },
  "mobile-core": {
    description: "Mobile app development across native and cross-platform stacks.",
    keywords: [
      "mobile",
      "ios",
      "android",
      "flutter",
      "expo",
      "swiftui",
      "compose",
      "appstore",
    ],
  },
  "seo-core": {
    description: "SEO, search visibility, and structured content optimization.",
    keywords: [
      "seo",
      "schema",
      "keyword",
      "snippet",
      "meta",
      "cannibalization",
      "authority",
    ],
  },
  "docs-core": {
    description: "Documents, spreadsheets, presentations, and office workflows.",
    keywords: [
      "docx",
      "pptx",
      "xlsx",
      "pdf",
      "slides",
      "spreadsheet",
      "libreoffice",
      "writer",
      "calc",
      "impress",
      "office",
    ],
  },
};

const CURATED_COMMON = [
  "bash-pro",
  "python-pro",
  "javascript-pro",
  "typescript-pro",
  "golang-pro",
  "rust-pro",
  "java-pro",
  "frontend-developer",
  "backend-architect",
  "nodejs-backend-patterns",
  "fastapi-pro",
  "api-design-principles",
  "sql-pro",
  "database-architect",
  "kubernetes-architect",
  "terraform-specialist",
  "observability-engineer",
  "security-auditor",
  "sast-configuration",
  "gitops-workflow",
];

function normalizeTokens(tokens) {
  return unique(tokens.map((token) => token.toLowerCase())).filter(Boolean);
}

function deriveTags(skill) {
  let tags = Array.isArray(skill.tags) ? skill.tags : [];
  tags = tags.map((tag) => tag.toLowerCase()).filter(Boolean);

  if (!tags.length) {
    tags = skill.id
      .split("-")
      .map((tag) => tag.toLowerCase())
      .filter((tag) => tag && !TAG_STOPWORDS.has(tag));
  }

  return normalizeTokens(tags);
}

function detectCategory(skill, tags) {
  const explicitCategory =
    typeof skill.category === "string" ? skill.category.trim().toLowerCase() : "";
  if (FRONTMATTER_CATEGORY_OVERRIDES.has(explicitCategory)) {
    return FRONTMATTER_CATEGORY_OVERRIDES.get(explicitCategory);
  }

  const haystack = normalizeTokens([
    ...tags,
    ...tokenize(skill.name),
    ...tokenize(skill.description),
  ]);
  const haystackSet = new Set(haystack);

  for (const rule of CATEGORY_RULES) {
    for (const keyword of rule.keywords) {
      if (haystackSet.has(keyword)) {
        return rule.name;
      }
    }
  }

  return "general";
}

function buildTriggers(skill, tags) {
  const tokens = tokenize(`${skill.name} ${skill.description}`).filter(
    (token) => token.length >= 2 && !STOPWORDS.has(token),
  );
  return unique([...tags, ...tokens]).slice(0, 12);
}

/** Common typo aliases (e.g. em dash — instead of hyphen -) for skill lookup. */
const TYPO_ALIASES = {
  "shopify—development": "shopify-development",
};

function buildAliases(skills) {
  const existingIds = new Set(skills.map((skill) => skill.id));
  const aliases = {};
  const used = new Set();

  for (const skill of skills) {
    if (skill.name && skill.name !== skill.id) {
      const alias = skill.name.toLowerCase();
      if (!existingIds.has(alias) && !used.has(alias)) {
        aliases[alias] = skill.id;
        used.add(alias);
      }
    }

    const tokens = skill.id.split("-").filter(Boolean);
    if (skill.id.length < 28 || tokens.length < 4) continue;

    const deduped = [];
    const tokenSeen = new Set();
    for (const token of tokens) {
      if (tokenSeen.has(token)) continue;
      tokenSeen.add(token);
      deduped.push(token);
    }

    const aliasTokens =
      deduped.length > 3
        ? [deduped[0], deduped[1], deduped[deduped.length - 1]]
        : deduped;
    const alias = unique(aliasTokens).join("-");

    if (!alias || alias === skill.id) continue;
    if (existingIds.has(alias) || used.has(alias)) continue;

    aliases[alias] = skill.id;
    used.add(alias);
  }

  for (const [typo, canonicalId] of Object.entries(TYPO_ALIASES)) {
    if (existingIds.has(canonicalId) && !aliases[typo]) {
      aliases[typo] = canonicalId;
    }
  }

  return aliases;
}

function buildBundles(skills) {
  const bundles = {};
  const skillTokens = new Map();

  for (const skill of skills) {
    const tokens = normalizeTokens([
      ...skill.tags,
      ...tokenize(skill.name),
      ...tokenize(skill.description),
    ]);
    skillTokens.set(skill.id, new Set(tokens));
  }

  for (const [bundleName, rule] of Object.entries(BUNDLE_RULES)) {
    const bundleSkills = [];
    const keywords = rule.keywords.map((keyword) => keyword.toLowerCase());
    const excludeCategories = rule.excludeCategories || new Set();

    for (const skill of skills) {
      if (excludeCategories.has(skill.category)) {
        continue;
      }

      const tokenSet = skillTokens.get(skill.id) || new Set();
      if (keywords.some((keyword) => tokenSet.has(keyword))) {
        bundleSkills.push(skill.id);
      }
    }

    bundles[bundleName] = {
      description: rule.description,
      skills: bundleSkills.sort(),
    };
  }

  const common = CURATED_COMMON.filter((skillId) => skillTokens.has(skillId));

  return { bundles, common };
}

function truncate(value, limit) {
  if (!value || value.length <= limit) return value || "";
  return `${value.slice(0, limit - 3)}...`;
}

function escapeMarkdownTableCell(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, " ");
}

function renderCatalogMarkdown(catalog) {
  const lines = [];
  lines.push("# Skill Catalog");
  lines.push("");
  lines.push(`Generated at: ${catalog.generatedAt}`);
  lines.push("");
  lines.push(`Total skills: ${catalog.total}`);
  lines.push("");

  const categories = Array.from(
    new Set(catalog.skills.map((skill) => skill.category)),
  ).sort();
  for (const category of categories) {
    const grouped = catalog.skills.filter(
      (skill) => skill.category === category,
    );
    lines.push(`## ${category} (${grouped.length})`);
    lines.push("");
    lines.push("| Skill | Description | Tags | Triggers |");
    lines.push("| --- | --- | --- | --- |");

    for (const skill of grouped) {
      const description = escapeMarkdownTableCell(truncate(skill.description, 160));
      const tags = escapeMarkdownTableCell(skill.tags.join(", "));
      const triggers = escapeMarkdownTableCell(skill.triggers.join(", "));
      lines.push(
        `| \`${skill.id}\` | ${description} | ${tags} | ${triggers} |`,
      );
    }

    lines.push("");
  }

  return lines.join("\n");
}

function readCatalogGeneratedAt() {
  if (process.env.SOURCE_DATE_EPOCH) {
    return new Date(process.env.SOURCE_DATE_EPOCH * 1000).toISOString();
  }

  const readmePath = path.join(ROOT, "README.md");
  try {
    const readme = fs.readFileSync(readmePath, "utf8");
    const match = readme.match(/<!-- registry-sync: .*?updated_at=([^ ]+) -->/);
    if (match) {
      return new Date(match[1]).toISOString();
    }
  } catch {
    // Keep catalog builds available in minimal fixtures without README.md.
  }

  return "2026-02-08T00:00:00.000Z";
}

function buildCatalog() {
  const skillRelPaths = listSkillIdsRecursive(SKILLS_DIR);
  const skills = skillRelPaths.map((relPath) => readSkill(SKILLS_DIR, relPath));
  const catalogSkills = [];

  for (const skill of skills) {
    const tags = deriveTags(skill);
    const category = detectCategory(skill, tags);
    const triggers = buildTriggers(skill, tags);

    catalogSkills.push({
      id: skill.id,
      name: skill.name,
      description: skill.description,
      category,
      tags,
      triggers,
      // Normalize separators for deterministic cross-platform output.
      path: path.relative(ROOT, skill.path).split(path.sep).join("/"),
    });
  }

  const catalog = {
    generatedAt: readCatalogGeneratedAt(),
    total: catalogSkills.length,
    skills: catalogSkills.sort((a, b) =>
      a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
    ),
  };

  const aliases = buildAliases(catalog.skills);
  const bundleData = buildBundles(catalog.skills);

  const catalogPath = path.join(ROOT, "data", "catalog.json");
  const catalogMarkdownPath = path.join(ROOT, "CATALOG.md");
  const bundlesPath = path.join(ROOT, "data", "bundles.json");
  const aliasesPath = path.join(ROOT, "data", "aliases.json");

  fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2));
  fs.writeFileSync(catalogMarkdownPath, renderCatalogMarkdown(catalog));
  fs.writeFileSync(
    bundlesPath,
    JSON.stringify(
      { generatedAt: catalog.generatedAt, ...bundleData },
      null,
      2,
    ),
  );
  fs.writeFileSync(
    aliasesPath,
    JSON.stringify({ generatedAt: catalog.generatedAt, aliases }, null, 2),
  );

  return catalog;
}

if (require.main === module) {
  const catalog = buildCatalog();
  console.log(`Generated catalog for ${catalog.total} skills.`);
}

module.exports = {
  buildCatalog,
};
