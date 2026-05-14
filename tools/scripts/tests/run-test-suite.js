#!/usr/bin/env node

const { spawnSync } = require("child_process");
const path = require("path");

const NETWORK_TEST_ENV = "ENABLE_NETWORK_TESTS";
const ENABLED_VALUES = new Set(["1", "true", "yes", "on"]);
const TOOL_SCRIPTS = path.join("tools", "scripts");
const TOOL_TESTS = path.join(TOOL_SCRIPTS, "tests");
const LOCAL_TEST_COMMANDS = [
    [path.join(TOOL_TESTS, "activate_skills_shell.test.js")],
    [path.join(TOOL_TESTS, "activate_skills_batch_smoke.test.js")],
    [path.join(TOOL_TESTS, "activate_skills_batch_security.test.js")],
    [path.join(TOOL_TESTS, "automation_workflows.test.js")],
    [path.join(TOOL_TESTS, "apply_skill_optimization_security.test.js")],
    [path.join(TOOL_TESTS, "build_catalog_bundles.test.js")],
    [path.join(TOOL_TESTS, "claude_plugin_marketplace.test.js")],
    [path.join(TOOL_TESTS, "codex_plugin_marketplace.test.js")],
    [path.join(TOOL_TESTS, "plugin_directories.test.js")],
    [path.join(TOOL_SCRIPTS, "run-python.js"), path.join(TOOL_TESTS, "test_editorial_bundles.py")],
    [path.join(TOOL_SCRIPTS, "run-python.js"), path.join(TOOL_TESTS, "test_plugin_compatibility.py")],
    [path.join(TOOL_TESTS, "installer_antigravity_guidance.test.js")],
    [path.join(TOOL_TESTS, "installer_filters.test.js")],
    [path.join(TOOL_TESTS, "installer_update_sync.test.js")],
    [path.join(TOOL_TESTS, "jetski_gemini_loader.test.cjs")],
    [path.join(TOOL_TESTS, "merge_batch.test.js")],
    [path.join(TOOL_TESTS, "npm_package_contents.test.js")],
    [path.join(TOOL_TESTS, "repo_hygiene_security.test.js")],
    [path.join(TOOL_TESTS, "copy_security.test.js")],
    [path.join(TOOL_TESTS, "setup_web_sync.test.js")],
    [path.join(TOOL_TESTS, "skill_filter.test.js")],
    [path.join(TOOL_TESTS, "validate_skills_headings.test.js")],
    [path.join(TOOL_TESTS, "validate_skills_metadata.test.js")],
  [path.join(TOOL_TESTS, "workflow_contracts.test.js")],
  [path.join(TOOL_TESTS, "docs_security_content.test.js")],
  [path.join(TOOL_SCRIPTS, "run-python.js"), path.join(TOOL_TESTS, "test_bundle_activation_security.py")],
  [path.join(TOOL_SCRIPTS, "run-python.js"), path.join(TOOL_TESTS, "test_audit_skills.py")],
  [path.join(TOOL_SCRIPTS, "run-python.js"), path.join(TOOL_TESTS, "test_audit_consistency.py")],
  [path.join(TOOL_SCRIPTS, "run-python.js"), path.join(TOOL_TESTS, "test_cleanup_synthetic_skill_sections.py")],
  [path.join(TOOL_SCRIPTS, "run-python.js"), path.join(TOOL_TESTS, "test_fix_missing_skill_metadata.py")],
  [path.join(TOOL_SCRIPTS, "run-python.js"), path.join(TOOL_TESTS, "test_fix_missing_skill_sections.py")],
  [path.join(TOOL_SCRIPTS, "run-python.js"), path.join(TOOL_TESTS, "test_fix_truncated_descriptions.py")],
  [path.join(TOOL_SCRIPTS, "run-python.js"), path.join(TOOL_TESTS, "test_generate_index_categories.py")],
    [path.join(TOOL_SCRIPTS, "run-python.js"), path.join(TOOL_TESTS, "test_repair_description_usage_summaries.py")],
    [path.join(TOOL_SCRIPTS, "run-python.js"), path.join(TOOL_TESTS, "test_readme_credits.py")],
    [path.join(TOOL_SCRIPTS, "run-python.js"), path.join(TOOL_TESTS, "test_sync_microsoft_skills_security.py")],
  [path.join(TOOL_SCRIPTS, "run-python.js"), path.join(TOOL_TESTS, "test_sync_repo_metadata.py")],
    [path.join(TOOL_SCRIPTS, "run-python.js"), path.join(TOOL_TESTS, "test_sync_contributors.py")],
  [path.join(TOOL_SCRIPTS, "run-python.js"), path.join(TOOL_TESTS, "test_sync_risk_labels.py")],
  [path.join(TOOL_SCRIPTS, "run-python.js"), path.join(TOOL_TESTS, "test_skill_source_metadata.py")],
  [path.join(TOOL_SCRIPTS, "run-python.js"), path.join(TOOL_TESTS, "test_validation_warning_budget.py")],
  [path.join(TOOL_SCRIPTS, "run-python.js"), path.join(TOOL_TESTS, "test_whatsapp_config_logging_security.py")],
  [path.join(TOOL_SCRIPTS, "run-python.js"), path.join(TOOL_TESTS, "test_maintainer_audit.py")],
  [path.join(TOOL_SCRIPTS, "run-python.js"), path.join(TOOL_TESTS, "test_validate_skills_headings.py")],
  [path.join(TOOL_SCRIPTS, "run-python.js"), path.join(TOOL_TESTS, "test_validate_skills_strict.py")],
];
const NETWORK_TEST_COMMANDS = [
  [path.join(TOOL_SCRIPTS, "run-python.js"), path.join(TOOL_TESTS, "inspect_microsoft_repo.py")],
  [path.join(TOOL_SCRIPTS, "run-python.js"), path.join(TOOL_TESTS, "test_comprehensive_coverage.py")],
];

function isNetworkTestsEnabled() {
  const value = process.env[NETWORK_TEST_ENV];
  if (!value) {
    return false;
  }
  return ENABLED_VALUES.has(String(value).trim().toLowerCase());
}

function runNodeCommand(args) {
  const result = spawnSync(process.execPath, args, {
    env: {
      ...process.env,
      PYTHONDONTWRITEBYTECODE: process.env.PYTHONDONTWRITEBYTECODE || "1",
    },
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.signal) {
    process.kill(process.pid, result.signal);
  }

  if (typeof result.status !== "number") {
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status);
  }
}

function runCommandSet(commands) {
  for (const commandArgs of commands) {
    runNodeCommand(commandArgs);
  }
}

function main() {
  const mode = process.argv[2];

  if (mode === "--local") {
    runCommandSet(LOCAL_TEST_COMMANDS);
    return;
  }

  if (mode === "--network") {
    runCommandSet(NETWORK_TEST_COMMANDS);
    return;
  }

  runCommandSet(LOCAL_TEST_COMMANDS);

  if (!isNetworkTestsEnabled()) {
    console.log(
      `[tests] Skipping network integration tests. Set ${NETWORK_TEST_ENV}=1 to enable.`,
    );
    return;
  }

  console.log(`[tests] ${NETWORK_TEST_ENV} enabled; running network integration tests.`);
  runCommandSet(NETWORK_TEST_COMMANDS);
}

main();
