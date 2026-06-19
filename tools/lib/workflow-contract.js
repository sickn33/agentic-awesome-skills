const fs = require("fs");
const path = require("path");

const { findProjectRoot } = require("./project-root");

const DOC_PREFIXES = ["docs/"];
const DOC_FILES = new Set(["README.md", "CONTRIBUTING.md", "CHANGELOG.md", "walkthrough.md"]);
const INFRA_PREFIXES = [".github/", "tools/", "apps/"];
const INFRA_FILES = new Set(["package.json", "package-lock.json"]);
const REFERENCES_PREFIXES = ["docs/", ".github/", "tools/", "apps/", "data/"];
const REFERENCES_FILES = new Set([
  "README.md",
  "CONTRIBUTING.md",
  "CHANGELOG.md",
  "walkthrough.md",
  "package.json",
  "package-lock.json",
]);

function normalizeRepoPath(filePath) {
  return String(filePath || "").replace(/\\/g, "/").replace(/^\.\//, "");
}

function matchesContractEntry(filePath, entry) {
  const normalizedPath = normalizeRepoPath(filePath);
  const normalizedEntry = normalizeRepoPath(entry);

  if (!normalizedEntry) {
    return false;
  }

  if (normalizedEntry.endsWith("/")) {
    return normalizedPath.startsWith(normalizedEntry);
  }

  return normalizedPath === normalizedEntry;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function loadWorkflowContract(startDir = __dirname) {
  const projectRoot = findProjectRoot(startDir);
  const configPath = path.join(projectRoot, "tools", "config", "generated-files.json");
  const rawConfig = fs.readFileSync(configPath, "utf8");
  const config = JSON.parse(rawConfig);

  return {
    projectRoot,
    configPath,
    derivedFiles: config.derivedFiles.map(normalizeRepoPath),
    mixedFiles: config.mixedFiles.map(normalizeRepoPath),
    releaseManagedFiles: config.releaseManagedFiles.map(normalizeRepoPath),
  };
}

function getManagedFiles(contract, options = {}) {
  const includeMixed = Boolean(options.includeMixed);
  const includeReleaseManaged = Boolean(options.includeReleaseManaged);
  const managedFiles = [...contract.derivedFiles];

  if (includeMixed) {
    managedFiles.push(...contract.mixedFiles);
  }

  if (includeReleaseManaged) {
    managedFiles.push(...contract.releaseManagedFiles);
  }

  return [...new Set(managedFiles.map(normalizeRepoPath))];
}

function isDerivedFile(filePath, contract) {
  return contract.derivedFiles.some((entry) => matchesContractEntry(filePath, entry));
}

function isMixedFile(filePath, contract) {
  return contract.mixedFiles.some((entry) => matchesContractEntry(filePath, entry));
}

function isDocLikeFile(filePath) {
  const normalized = normalizeRepoPath(filePath);
  return normalized.endsWith(".md") || DOC_FILES.has(normalized) || DOC_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

function isInfraLikeFile(filePath) {
  const normalized = normalizeRepoPath(filePath);
  return (
    INFRA_FILES.has(normalized) ||
    INFRA_PREFIXES.some((prefix) => normalized.startsWith(prefix))
  );
}

function classifyChangedFiles(changedFiles, contract) {
  const categories = new Set();
  const normalizedFiles = changedFiles.map(normalizeRepoPath).filter(Boolean);

  for (const filePath of normalizedFiles) {
    if (isDerivedFile(filePath, contract)) {
      continue;
    }

    const isSkillPath = filePath.startsWith("skills/");

    if (isSkillPath) {
      categories.add("skill");
    }

    if (!isSkillPath && (isDocLikeFile(filePath) || isMixedFile(filePath, contract))) {
      categories.add("docs");
    }

    if (isInfraLikeFile(filePath)) {
      categories.add("infra");
    }
  }

  const orderedCategories = ["skill", "docs", "infra"].filter((category) => categories.has(category));
  let primaryCategory = "none";
  if (orderedCategories.includes("infra")) {
    primaryCategory = "infra";
  } else if (orderedCategories.includes("skill")) {
    primaryCategory = "skill";
  } else if (orderedCategories.includes("docs")) {
    primaryCategory = "docs";
  }

  return {
    categories: orderedCategories,
    primaryCategory,
  };
}

function getDirectDerivedChanges(changedFiles, contract) {
  return changedFiles
    .map(normalizeRepoPath)
    .filter(Boolean)
    .filter((filePath) => isDerivedFile(filePath, contract));
}

function requiresReferencesValidation(changedFiles, contract) {
  return changedFiles
    .map(normalizeRepoPath)
    .filter(Boolean)
    .some((filePath) => {
      if (isDerivedFile(filePath, contract) || isMixedFile(filePath, contract)) {
        return true;
      }

      return (
        REFERENCES_FILES.has(filePath) ||
        REFERENCES_PREFIXES.some((prefix) => filePath.startsWith(prefix))
      );
    });
}

function extractChangelogSection(content, version) {
  const headingExpression = new RegExp(`^## \\[${escapeRegExp(version)}\\].*$`, "m");
  const headingMatch = headingExpression.exec(content);
  if (!headingMatch) {
    throw new Error(`CHANGELOG.md does not contain a section for version ${version}.`);
  }

  const startIndex = headingMatch.index;
  const remainder = content.slice(startIndex + headingMatch[0].length);
  const nextSectionRelativeIndex = remainder.search(/^## \[/m);
  const endIndex =
    nextSectionRelativeIndex === -1
      ? content.length
      : startIndex + headingMatch[0].length + nextSectionRelativeIndex;

  return `${content.slice(startIndex, endIndex).trim()}\n`;
}

function hasQualityChecklist(body) {
  return /quality bar checklist/i.test(String(body || ""));
}

function hasIssueLink(body) {
  return /(?:closes|fixes)\s+#\d+/i.test(String(body || ""));
}

module.exports = {
  classifyChangedFiles,
  extractChangelogSection,
  getDirectDerivedChanges,
  getManagedFiles,
  hasIssueLink,
  hasQualityChecklist,
  isDerivedFile,
  isMixedFile,
  loadWorkflowContract,
  normalizeRepoPath,
  matchesContractEntry,
  requiresReferencesValidation,
};
