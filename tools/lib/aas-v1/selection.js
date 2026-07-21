"use strict";

const { validateInstance } = require("./schema-validator");
const { getSkill } = require("./search");
const { validateManifest } = require("./stack");

function composeStack(catalog, input) {
  validateInstance("selection-input.schema.json", input, "AAS_SELECTION_INPUT_INVALID", "invalidInput");
  const targets = input.targets || [{ host: "codex", scope: "project" }];
  const selected = input.skillIds.map((id) => getSkill(catalog, id));
  const profile = {
    goals: [...input.profile.goals],
    ...(input.profile.projectType ? { projectType: input.profile.projectType } : {}),
    languages: [...(input.profile.languages || [])],
    frameworks: [...(input.profile.frameworks || [])],
    constraints: [...(input.profile.constraints || [])],
  };
  const manifest = {
    schemaVersion: 2,
    name: input.name || "aas-stack",
    catalog: { package: catalog.package, version: catalog.version, integrity: catalog.digest },
    targets,
    profile,
    skills: input.skillIds.map((id) => ({ id })),
  };
  const validation = validateManifest(manifest);
  if (!validation.ok) {
    const error = new Error(validation.code);
    error.code = validation.code;
    error.category = validation.category;
    error.details = validation.details;
    throw error;
  }
  return {
    ok: true,
    status: "composed",
    catalog: { package: catalog.package, version: catalog.version, digest: catalog.digest },
    selectionSource: "agent",
    selectedSkills: selected.map((skill) => ({
      id: skill.id,
      name: skill.name,
      description: skill.description,
      category: skill.category,
    })),
    manifest,
    manifestDigest: validation.manifestDigest,
  };
}

module.exports = { composeStack };
