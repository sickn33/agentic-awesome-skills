#!/usr/bin/env node

/**
 * playwright.mjs — Runner for the Playwright codegen target.
 *
 * Invoked by codegen.mjs's verify step. Installs the scaffolded deps if
 * needed, spawns `npx tsx <script>` against a fresh BB session, and emits
 * a single {"passed":boolean, ...} JSON line on stdout.
 *
 * Contract:
 *   --out-dir <path>      the scaffolded output dir
 *   --script <basename>   file inside --out-dir to run (e.g. acme.ts)
 *
 * Shared with stagehand.mjs via lib/tsx-runner.mjs — only differences are
 * the label and the PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD trick (so playwright's
 * postinstall doesn't try to fetch chromium; we use connectOverCDP).
 */

import { runTsxTarget } from "./lib/tsx-runner.mjs";

runTsxTarget({
  label: "playwright",
  // PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 is required at install time too,
  // otherwise the playwright postinstall pulls hundreds of MB of browser
  // binaries that we never use (we always connectOverCDP to a remote BB
  // session). Set it for both install and run.
  installEnv: { PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: "1" },
  extraEnv: { PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: "1" },
});
