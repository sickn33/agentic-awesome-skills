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

const REGULAR_FILE_MODE = "100644";
const ABSENT_FILE_MODE = "000000";
const MAX_APPROVAL_BLOB_BYTES = 1024 * 1024;
const MAX_APPROVAL_CHANGE_RECORDS = 500;
const MAX_APPROVAL_TOTAL_BLOB_BYTES = 8 * 1024 * 1024;
const SKILL_PATH_SEGMENT = "[a-z0-9]+(?:-[a-z0-9]+)*";
const CANONICAL_SKILL_PATH = new RegExp(`^skills\\/(?:${SKILL_PATH_SEGMENT}\\/)+SKILL\\.md$`, "u");
const SKILL_SUPPORT_PATH = new RegExp(
  `^skills\\/(?:${SKILL_PATH_SEGMENT}\\/)+(?:assets|references|resources)\\/(?:[^/]+\\/)*[^/]+$`,
  "u",
);
const NARROW_DOC_PATH = /^(?:README\.md|CONTRIBUTING\.md|docs\/(?:[^/]+\/)*[^/]+\.md)$/;
const LOW_RISK_EXTENSIONS = new Set([
  ".csv",
  ".gif",
  ".jpeg",
  ".jpg",
  ".json",
  ".md",
  ".pdf",
  ".png",
  ".txt",
  ".webp",
  ".yaml",
  ".yml",
]);
const CHANGE_STATUS_SIDES = Object.freeze({
  A: { old: false, new: true },
  C: { old: true, new: true },
  D: { old: true, new: false },
  M: { old: true, new: true },
  R: { old: true, new: true },
});

function normalizeRepoPath(filePath) {
  return String(filePath || "").replace(/\\/g, "/").replace(/^\.\//, "");
}

function validateRawRepoPath(filePath) {
  const value = typeof filePath === "string" ? filePath : "";
  const reasons = [];

  if (!value) {
    reasons.push("missing_path");
  }
  if (/[\u0000-\u001f\u007f]/u.test(value)) {
    reasons.push("control_character_path");
  }
  if (value.includes("\\")) {
    reasons.push("backslash_path");
  }
  if (value.startsWith("/") || /^[A-Za-z]:/u.test(value)) {
    reasons.push("absolute_path");
  }
  if (value.startsWith("./") || value.includes("//")) {
    reasons.push("noncanonical_path");
  }

  const segments = value.split("/");
  if (segments.some((segment) => (
    !segment ||
    segment === "." ||
    segment === ".." ||
    segment.trim() !== segment ||
    segment.endsWith(".") ||
    segment.includes(":") ||
    Buffer.byteLength(segment, "utf8") > 255
  ))) {
    reasons.push("noncanonical_path");
  }
  if (Buffer.byteLength(value, "utf8") > 4096) {
    reasons.push("noncanonical_path");
  }
  if (value && path.posix.normalize(value) !== value) {
    reasons.push("noncanonical_path");
  }
  if (value && value.normalize("NFC") !== value) {
    reasons.push("noncanonical_unicode_path");
  }

  return {
    safe: reasons.length === 0,
    reasons: [...new Set(reasons)],
  };
}

function classifyPathPolicy(filePath) {
  const pathValidation = validateRawRepoPath(filePath);
  if (!pathValidation.safe) {
    return {
      safe: false,
      sensitive: true,
      approvalSafe: false,
      kind: "invalid",
      reasons: pathValidation.reasons,
    };
  }

  let kind = "unknown";
  if (CANONICAL_SKILL_PATH.test(filePath)) {
    kind = "canonical_skill";
  } else if (SKILL_SUPPORT_PATH.test(filePath)) {
    kind = "skill_support";
  } else if (NARROW_DOC_PATH.test(filePath)) {
    kind = "documentation";
  }

  const extension = path.posix.extname(filePath).toLowerCase();
  const recognizedExtension = LOW_RISK_EXTENSIONS.has(extension);
  const reasons = [];
  if (kind === "unknown") {
    reasons.push("unapproved_path");
  }
  if (!recognizedExtension) {
    reasons.push("unknown_extension");
  }

  const approvalSafe = reasons.length === 0;
  return {
    safe: approvalSafe,
    sensitive: !approvalSafe,
    approvalSafe,
    kind,
    reasons,
  };
}

function isFullObjectId(value, options = {}) {
  const allowZero = Boolean(options.allowZero);
  if (typeof value !== "string" || !/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u.test(value)) {
    return false;
  }
  return allowZero || !/^0+$/u.test(value);
}

function readBlobSize(record, side, blobSizes) {
  const inlineSize = record[`${side}_size`];
  if (Object.prototype.hasOwnProperty.call(record, `${side}_size`)) {
    return Number.isSafeInteger(inlineSize) && inlineSize >= 0 ? inlineSize : undefined;
  }

  const oid = record[`${side}_oid`];
  if (blobSizes instanceof Map) {
    return blobSizes.get(oid);
  }
  if (blobSizes && typeof blobSizes === "object") {
    return blobSizes[oid];
  }
  return undefined;
}

function classifyChangeRecords(records, options = {}) {
  const requireBlobSizes = options.requireBlobSizes !== false;
  const maxBlobBytes = Number.isSafeInteger(options.maxBlobBytes) && options.maxBlobBytes >= 0
    ? options.maxBlobBytes
    : MAX_APPROVAL_BLOB_BYTES;
  const maxChangeRecords = Number.isSafeInteger(options.maxChangeRecords) && options.maxChangeRecords >= 0
    ? options.maxChangeRecords
    : MAX_APPROVAL_CHANGE_RECORDS;
  const maxTotalBlobBytes = Number.isSafeInteger(options.maxTotalBlobBytes) && options.maxTotalBlobBytes >= 0
    ? options.maxTotalBlobBytes
    : MAX_APPROVAL_TOTAL_BLOB_BYTES;
  const reasons = [];
  const paths = [];
  const canonicalSkillChanges = [];
  const skillContentChanges = [];
  let sensitive = false;
  let totalBlobBytes = 0;

  if (!Array.isArray(records) || records.length === 0) {
    return {
      safe: false,
      sensitive: true,
      approvalSafe: false,
      reasons: ["missing_change_records"],
      paths,
      requiresHumanReview: false,
      canonicalSkillChanges,
      skillContentChanges,
    };
  }
  if (records.length > maxChangeRecords) {
    reasons.push("too_many_change_records");
    sensitive = true;
  }

  records.forEach((record, index) => {
    const prefix = `record_${index}`;
    if (!record || typeof record !== "object") {
      reasons.push(`${prefix}:malformed_record`);
      sensitive = true;
      return;
    }

    const status = String(record.status || "");
    const expectedSides = CHANGE_STATUS_SIDES[status];
    if (!expectedSides) {
      reasons.push(`${prefix}:unknown_status`);
      sensitive = true;
      return;
    }

    for (const side of ["old", "new"]) {
      const expected = expectedSides[side];
      const filePath = record[`${side}_path`];
      const mode = String(record[`${side}_mode`] || "");
      const oid = String(record[`${side}_oid`] || "");

      if (!expected) {
        if (filePath !== null) {
          reasons.push(`${prefix}:${side}_invalid_absent_path`);
        }
        if (mode !== ABSENT_FILE_MODE || !isFullObjectId(oid, { allowZero: true }) || !/^0+$/u.test(oid)) {
          reasons.push(`${prefix}:${side}_invalid_absent_side`);
        }
        continue;
      }

      if (typeof filePath !== "string" || !filePath) {
        reasons.push(`${prefix}:${side}_missing_path`);
        sensitive = true;
        continue;
      }

      const pathPolicy = classifyPathPolicy(filePath);
      paths.push({ record: index, side, path: filePath, ...pathPolicy });
      if (!pathPolicy.approvalSafe) {
        sensitive = true;
        for (const reason of pathPolicy.reasons) {
          reasons.push(`${prefix}:${side}_${reason}`);
        }
      }
      if (pathPolicy.kind === "canonical_skill") {
        canonicalSkillChanges.push(filePath);
      }
      if (["canonical_skill", "skill_support"].includes(pathPolicy.kind)) {
        skillContentChanges.push(filePath);
      }

      if (mode !== REGULAR_FILE_MODE) {
        sensitive = true;
        if (mode === "100755") {
          reasons.push(`${prefix}:${side}_executable_mode`);
        } else if (mode === "120000") {
          reasons.push(`${prefix}:${side}_symlink_mode`);
        } else if (mode === "160000") {
          reasons.push(`${prefix}:${side}_gitlink_mode`);
        } else {
          reasons.push(`${prefix}:${side}_unknown_mode`);
        }
      }

      if (!isFullObjectId(oid)) {
        sensitive = true;
        reasons.push(`${prefix}:${side}_invalid_object_id`);
      } else {
        const blobSize = readBlobSize(record, side, options.blobSizes);
        if ((!Number.isSafeInteger(blobSize) || blobSize < 0) && requireBlobSizes) {
          sensitive = true;
          reasons.push(`${prefix}:${side}_missing_blob_size`);
        } else if (Number.isSafeInteger(blobSize) && blobSize > maxBlobBytes) {
          sensitive = true;
          reasons.push(`${prefix}:${side}_oversized_blob`);
        } else if (Number.isSafeInteger(blobSize)) {
          totalBlobBytes += blobSize;
        }
      }
    }

    if (status === "M" && record.old_path !== record.new_path) {
      reasons.push(`${prefix}:path_changed_without_rename`);
      sensitive = true;
    }
    if ((status === "R" || status === "C") && record.old_path === record.new_path) {
      reasons.push(`${prefix}:rename_copy_path_unchanged`);
      sensitive = true;
    }
  });

  if (totalBlobBytes > maxTotalBlobBytes) {
    reasons.push("oversized_total_diff");
    sensitive = true;
  }

  const uniqueReasons = [...new Set(reasons)];
  const uniqueCanonicalSkillChanges = [...new Set(canonicalSkillChanges)].sort();
  const uniqueSkillContentChanges = [...new Set(skillContentChanges)].sort();
  const approvalSafe = uniqueReasons.length === 0 && !sensitive;
  return {
    safe: approvalSafe,
    sensitive: !approvalSafe,
    approvalSafe,
    reasons: uniqueReasons,
    paths,
    requiresHumanReview: uniqueSkillContentChanges.length > 0,
    canonicalSkillChanges: uniqueCanonicalSkillChanges,
    skillContentChanges: uniqueSkillContentChanges,
  };
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
  classifyChangeRecords,
  classifyChangedFiles,
  classifyPathPolicy,
  extractChangelogSection,
  getDirectDerivedChanges,
  getManagedFiles,
  hasIssueLink,
  hasQualityChecklist,
  isDerivedFile,
  isMixedFile,
  loadWorkflowContract,
  maxApprovalBlobBytes: MAX_APPROVAL_BLOB_BYTES,
  maxApprovalChangeRecords: MAX_APPROVAL_CHANGE_RECORDS,
  maxApprovalTotalBlobBytes: MAX_APPROVAL_TOTAL_BLOB_BYTES,
  normalizeRepoPath,
  matchesContractEntry,
  requiresReferencesValidation,
  validateRawRepoPath,
};
