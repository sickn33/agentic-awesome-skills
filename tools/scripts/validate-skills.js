/**
 * Legacy / alternative validator. For CI and PR checks, use tools/scripts/validate_skills.py.
 * Run: npm run validate (or npm run validate:strict)
 */
const fs = require("fs");
const path = require("path");
const { listSkillIds, parseFrontmatter } = require("../lib/skill-utils");
const { findProjectRoot } = require("../lib/project-root");

const ROOT = findProjectRoot(__dirname);
const SKILLS_DIR = path.join(ROOT, "skills");
const BASELINE_PATH = path.join(ROOT, "validation-baseline.json");

const errors = [];
const warnings = [];
const missingUseSection = [];
const missingDoNotUseSection = [];
const missingInstructionsSection = [];
const longFiles = [];
const unknownFieldSkills = [];
const isStrict =
  process.argv.includes("--strict") ||
  process.env.STRICT === "1" ||
  process.env.STRICT === "true";
const writeBaseline =
  process.argv.includes("--write-baseline") ||
  process.env.WRITE_BASELINE === "1" ||
  process.env.WRITE_BASELINE === "true";

const NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_NAME_LENGTH = 64;
const MAX_DESCRIPTION_LENGTH = 1024;
const MAX_COMPATIBILITY_LENGTH = 500;
const MAX_SKILL_LINES = 500;
const SOURCE_REPO_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const VALID_SOURCE_TYPES = new Set(["official", "community", "self"]);
const ALLOWED_FIELDS = new Set([
  "name",
  "description",
  "risk",
  "source",
  "source_repo",
  "source_type",
  "license",
  "compatibility",
  "metadata",
  "allowed-tools",
  "package",
  "date_added",
]);

const USE_SECTION_PATTERNS = [
  /^##\s+When\s+to\s+Use/im,
  /^##\s+Use\s+this\s+skill\s+when/im,
  /^##\s+When\s+to\s+Use\s+This\s+Skill/im,
];

function hasUseSection(content) {
  return USE_SECTION_PATTERNS.some((pattern) => pattern.test(content));
}

function isPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function validateStringField(
  fieldName,
  value,
  { min = 1, max = Infinity } = {},
) {
  if (typeof value !== "string") {
    return `${fieldName} must be a string.`;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return `${fieldName} cannot be empty.`;
  }
  if (trimmed.length < min) {
    return `${fieldName} must be at least ${min} characters.`;
  }
  if (trimmed.length > max) {
    return `${fieldName} must be <= ${max} characters.`;
  }
  return null;
}

function addError(message) {
  errors.push(message);
}

function addWarning(message) {
  warnings.push(message);
}

function loadBaseline() {
  if (!fs.existsSync(BASELINE_PATH)) {
    return {
      useSection: [],
      doNotUseSection: [],
      instructionsSection: [],
      longFile: [],
    };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8"));
    return {
      useSection: Array.isArray(parsed.useSection) ? parsed.useSection : [],
      doNotUseSection: Array.isArray(parsed.doNotUseSection)
        ? parsed.doNotUseSection
        : [],
      instructionsSection: Array.isArray(parsed.instructionsSection)
        ? parsed.instructionsSection
        : [],
      longFile: Array.isArray(parsed.longFile) ? parsed.longFile : [],
    };
  } catch (err) {
    addWarning(
      "Failed to parse validation-baseline.json; strict mode may fail.",
    );
    return {
      useSection: [],
      doNotUseSection: [],
      instructionsSection: [],
      longFile: [],
    };
  }
}

function addStrictSectionErrors(label, missing, baselineSet) {
  if (!isStrict) return;
  const strictMissing = missing.filter((skillId) => !baselineSet.has(skillId));
  if (strictMissing.length) {
    addError(
      `Missing "${label}" section (strict): ${strictMissing.length} skills (examples: ${strictMissing.slice(0, 5).join(", ")})`,
    );
  }
}

function validateSourceMetadata(data, skillId) {
  const sourceErrors = [];

  if (data.source_repo !== undefined) {
    const sourceRepoError = validateStringField("source_repo", data.source_repo, {
      min: 3,
      max: 256,
    });
    if (sourceRepoError) {
      sourceErrors.push(`${sourceRepoError} (${skillId})`);
    } else if (!SOURCE_REPO_PATTERN.test(String(data.source_repo).trim())) {
      sourceErrors.push(`source_repo must match OWNER/REPO. (${skillId})`);
    }
  }

  if (data.source_type !== undefined) {
    const sourceTypeError = validateStringField("source_type", data.source_type, {
      min: 4,
      max: 16,
    });
    if (sourceTypeError) {
      sourceErrors.push(`${sourceTypeError} (${skillId})`);
    } else if (!VALID_SOURCE_TYPES.has(String(data.source_type).trim())) {
      sourceErrors.push(`source_type must be one of official, community, self. (${skillId})`);
    }
  }

  return sourceErrors;
}

function run() {
  const skillIds = listSkillIds(SKILLS_DIR);
  const baseline = loadBaseline();
  const baselineUse = new Set(baseline.useSection || []);
  const baselineDoNotUse = new Set(baseline.doNotUseSection || []);
  const baselineInstructions = new Set(baseline.instructionsSection || []);
  const baselineLongFile = new Set(baseline.longFile || []);

  for (const skillId of skillIds) {
    const skillPath = path.join(SKILLS_DIR, skillId, "SKILL.md");

    if (!fs.existsSync(skillPath)) {
      addError(`Missing SKILL.md: ${skillId}`);
      continue;
    }

    const content = fs.readFileSync(skillPath, "utf8");
    const {
      data,
      errors: fmErrors,
      hasFrontmatter,
    } = parseFrontmatter(content);
    const lineCount = content.split(/\r?\n/).length;

    if (!hasFrontmatter) {
      addError(`Missing frontmatter: ${skillId}`);
    }

    if (fmErrors && fmErrors.length) {
      fmErrors.forEach((error) =>
        addError(`Frontmatter parse error (${skillId}): ${error}`),
      );
    }

    if (!NAME_PATTERN.test(skillId)) {
      addError(`Folder name must match ${NAME_PATTERN}: ${skillId}`);
    }

    if (data.name !== undefined) {
      const nameError = validateStringField("name", data.name, {
        min: 1,
        max: MAX_NAME_LENGTH,
      });
      if (nameError) {
        addError(`${nameError} (${skillId})`);
      } else {
        const nameValue = String(data.name).trim();
        if (!NAME_PATTERN.test(nameValue)) {
          addError(`name must match ${NAME_PATTERN}: ${skillId}`);
        }
        if (nameValue !== skillId) {
          addError(`name must match folder name: ${skillId} -> ${nameValue}`);
        }
      }
    }

    const descError =
      data.description === undefined
        ? "description is required."
        : validateStringField("description", data.description, {
            min: 1,
            max: MAX_DESCRIPTION_LENGTH,
          });
    if (descError) {
      addError(`${descError} (${skillId})`);
    }

    if (data.license !== undefined) {
      const licenseError = validateStringField("license", data.license, {
        min: 1,
        max: 128,
      });
      if (licenseError) {
        addError(`${licenseError} (${skillId})`);
      }
    }

    if (data.compatibility !== undefined) {
      const compatibilityError = validateStringField(
        "compatibility",
        data.compatibility,
        { min: 1, max: MAX_COMPATIBILITY_LENGTH },
      );
      if (compatibilityError) {
        addError(`${compatibilityError} (${skillId})`);
      }
    }

    validateSourceMetadata(data, skillId).forEach(addError);

    if (data["allowed-tools"] !== undefined) {
      if (typeof data["allowed-tools"] !== "string") {
        addError(
          `allowed-tools must be a space-delimited string. (${skillId})`,
        );
      } else if (!data["allowed-tools"].trim()) {
        addError(`allowed-tools cannot be empty. (${skillId})`);
      }
    }

    if (data.metadata !== undefined) {
      if (!isPlainObject(data.metadata)) {
        addError(`metadata must be a string map/object. (${skillId})`);
      } else {
        for (const [key, value] of Object.entries(data.metadata)) {
          if (typeof value !== "string") {
            addError(`metadata.${key} must be a string. (${skillId})`);
          }
        }
      }
    }

    if (data && Object.keys(data).length) {
      const unknownFields = Object.keys(data).filter(
        (key) => !ALLOWED_FIELDS.has(key),
      );
      if (unknownFields.length) {
        unknownFieldSkills.push(skillId);
        addError(
          `Unknown frontmatter fields (${skillId}): ${unknownFields.join(", ")}`,
        );
      }
    }

    if (lineCount > MAX_SKILL_LINES) {
      longFiles.push(skillId);
    }

    if (!hasUseSection(content)) {
      missingUseSection.push(skillId);
    }

    if (!content.includes("## Do not use")) {
      missingDoNotUseSection.push(skillId);
    }

    if (!content.includes("## Instructions")) {
      missingInstructionsSection.push(skillId);
    }
  }

  if (missingUseSection.length) {
    addWarning(
      `Missing "Use this skill when" section: ${missingUseSection.length} skills (examples: ${missingUseSection.slice(0, 5).join(", ")})`,
    );
  }

  if (missingDoNotUseSection.length) {
    addWarning(
      `Missing "Do not use" section: ${missingDoNotUseSection.length} skills (examples: ${missingDoNotUseSection.slice(0, 5).join(", ")})`,
    );
  }

  if (missingInstructionsSection.length) {
    addWarning(
      `Missing "Instructions" section: ${missingInstructionsSection.length} skills (examples: ${missingInstructionsSection.slice(0, 5).join(", ")})`,
    );
  }

  if (longFiles.length) {
    addWarning(
      `SKILL.md over ${MAX_SKILL_LINES} lines: ${longFiles.length} skills (examples: ${longFiles.slice(0, 5).join(", ")})`,
    );
  }

  if (unknownFieldSkills.length) {
    addWarning(
      `Unknown frontmatter fields detected: ${unknownFieldSkills.length} skills (examples: ${unknownFieldSkills.slice(0, 5).join(", ")})`,
    );
  }

  addStrictSectionErrors("Use this skill when", missingUseSection, baselineUse);
  addStrictSectionErrors(
    "Do not use",
    missingDoNotUseSection,
    baselineDoNotUse,
  );
  addStrictSectionErrors(
    "Instructions",
    missingInstructionsSection,
    baselineInstructions,
  );
  addStrictSectionErrors(
    `SKILL.md line count <= ${MAX_SKILL_LINES}`,
    longFiles,
    baselineLongFile,
  );

  if (writeBaseline) {
    const baselineData = {
      generatedAt: new Date().toISOString(),
      useSection: [...missingUseSection].sort(),
      doNotUseSection: [...missingDoNotUseSection].sort(),
      instructionsSection: [...missingInstructionsSection].sort(),
      longFile: [...longFiles].sort(),
    };
    fs.writeFileSync(BASELINE_PATH, JSON.stringify(baselineData, null, 2));
    console.log(`Baseline written to ${BASELINE_PATH}`);
  }

  if (warnings.length) {
    console.warn("Warnings:");
    for (const warning of warnings) {
      console.warn(`- ${warning}`);
    }
  }

  if (errors.length) {
    console.error("\nErrors:");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log(`Validation passed for ${skillIds.length} skills.`);
}

if (require.main === module) {
  run();
}

module.exports = {
  ALLOWED_FIELDS,
  SOURCE_REPO_PATTERN,
  VALID_SOURCE_TYPES,
  hasUseSection,
  run,
  validateSourceMetadata,
};
