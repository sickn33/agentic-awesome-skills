#!/usr/bin/env node

/**
 * stagehand.mjs — Runner for the Stagehand codegen target.
 *
 * Same contract and shared logic as playwright.mjs (see lib/tsx-runner.mjs).
 * Differences:
 *   - No PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD trick (Stagehand uses
 *     connectOverCDP without bundling a local chromium).
 *   - Requires ANTHROPIC_API_KEY (or ANTHROPIC_AUTH_TOKEN) — Stagehand's
 *     act/extract are LLM-driven.
 */

import { runTsxTarget } from "./lib/tsx-runner.mjs";

runTsxTarget({
  label: "stagehand",
  preflight: () => {
    if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
      return "ANTHROPIC_API_KEY required for Stagehand verify";
    }
    return null;
  },
});
