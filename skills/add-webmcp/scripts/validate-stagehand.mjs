#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { browserbase, localBrowser, Stagehand } from "@browserbasehq/stagehand";

const RISKS = new Set(["read-only", "reversible", "consequential"]);

function usage() {
  return [
    "Usage: validate-stagehand.mjs --url <url> --config <file> (--local | --browserbase)",
    "       [--init-script <file>] [--executable-path <file>] [--headless] [--no-sandbox]",
    "       [--allow-consequential]",
  ].join("\n");
}

function parseArgs(argv) {
  const args = {
    mode: null,
    headed: null,
    noSandbox: false,
    allowConsequential: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--url" || value === "--config" || value === "--init-script" || value === "--executable-path") {
      const key = value.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      const next = argv[index + 1];
      if (!next) throw new Error(`${value} requires a value`);
      args[key] = next;
      index += 1;
    } else if (value === "--local" || value === "--browserbase") {
      const mode = value.slice(2);
      if (args.mode && args.mode !== mode) throw new Error("Choose exactly one of --local or --browserbase");
      args.mode = mode;
    } else if (value === "--headed") {
      args.headed = true;
    } else if (value === "--headless") {
      args.headed = false;
    } else if (value === "--no-sandbox") {
      args.noSandbox = true;
    } else if (value === "--allow-consequential") {
      args.allowConsequential = true;
    } else {
      throw new Error(`Unknown argument: ${value}\n${usage()}`);
    }
  }
  if (!args.url || !args.config || !args.mode) throw new Error(usage());
  if (args.headed !== null && args.mode !== "local") {
    throw new Error("--headed and --headless are only valid with --local");
  }
  if (args.headed === null) args.headed = true;
  if (args.noSandbox && args.mode !== "local") throw new Error("--no-sandbox is only valid with --local");
  if (args.executablePath && args.mode !== "local") throw new Error("--executable-path is only valid with --local");
  return args;
}

function assertPlainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
}

function validateConfig(config) {
  assertPlainObject(config, "Config");
  if (!Array.isArray(config.tools) || config.tools.length === 0) {
    throw new Error("Config tools must be a non-empty array");
  }
  if (config.timeoutMs !== undefined && (!Number.isFinite(config.timeoutMs) || config.timeoutMs < 0)) {
    throw new Error("Config timeoutMs must be a non-negative number");
  }
  if (config.expectedDom !== undefined) {
    if (!Array.isArray(config.expectedDom)) throw new Error("Config expectedDom must be an array");
    for (const [index, expectation] of config.expectedDom.entries()) {
      assertPlainObject(expectation, `expectedDom[${index}]`);
      if (typeof expectation.selector !== "string" || !expectation.selector.trim()) {
        throw new Error(`expectedDom[${index}].selector is required`);
      }
      if (typeof expectation.text !== "string") throw new Error(`expectedDom[${index}].text must be a string`);
    }
  }

  const names = new Set();
  for (const [index, tool] of config.tools.entries()) {
    assertPlainObject(tool, `tools[${index}]`);
    if (typeof tool.name !== "string" || !tool.name.trim()) throw new Error(`tools[${index}].name is required`);
    if (names.has(tool.name)) throw new Error(`Duplicate expected tool: ${tool.name}`);
    names.add(tool.name);
    if (!RISKS.has(tool.risk)) {
      throw new Error(`Tool ${tool.name} risk must be read-only, reversible, or consequential`);
    }
    if (tool.expectedAnnotations !== undefined) assertPlainObject(tool.expectedAnnotations, `${tool.name}.expectedAnnotations`);
    if (tool.expectedOutputSubset !== undefined) assertPlainObject(tool.expectedOutputSubset, `${tool.name}.expectedOutputSubset`);
    if (tool.input !== undefined) assertPlainObject(tool.input, `${tool.name}.input`);
  }
}

function deepSubset(actual, expected, location = "value") {
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) return `${location} is not an array`;
    if (actual.length < expected.length) return `${location} has ${actual.length} items; expected at least ${expected.length}`;
    for (let index = 0; index < expected.length; index += 1) {
      const failure = deepSubset(actual[index], expected[index], `${location}[${index}]`);
      if (failure) return failure;
    }
    return null;
  }
  if (expected && typeof expected === "object") {
    if (!actual || typeof actual !== "object" || Array.isArray(actual)) return `${location} is not an object`;
    for (const [key, expectedValue] of Object.entries(expected)) {
      if (!(key in actual)) return `${location}.${key} is missing`;
      const failure = deepSubset(actual[key], expectedValue, `${location}.${key}`);
      if (failure) return failure;
    }
    return null;
  }
  return Object.is(actual, expected) ? null : `${location} was ${JSON.stringify(actual)}; expected ${JSON.stringify(expected)}`;
}

async function launch(args) {
  if (args.mode === "browserbase") {
    if (!process.env.BROWSERBASE_API_KEY) throw new Error("BROWSERBASE_API_KEY is required for --browserbase");
    return browserbase.launch({
      apiKey: process.env.BROWSERBASE_API_KEY,
      userMetadata: { suite: "add-webmcp-validator" },
    });
  }
  return localBrowser.launch({
    headless: !args.headed,
    ...(args.noSandbox ? { chromiumSandbox: false } : {}),
    ...(args.executablePath ? { executablePath: path.resolve(args.executablePath) } : {}),
  });
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const configPath = path.resolve(args.config);
  const config = JSON.parse(await readFile(configPath, "utf8"));
  validateConfig(config);

  const unsafe = config.tools.filter((tool) => tool.risk === "consequential" && Object.hasOwn(tool, "input"));
  if (unsafe.length > 0 && !args.allowConsequential) {
    throw new Error(
      `Refusing consequential invocation(s): ${unsafe.map((tool) => tool.name).join(", ")}. ` +
        "Remove input for discovery-only validation or use --allow-consequential in an explicitly authorized sandbox.",
    );
  }

  const browser = await launch(args);
  let stagehand;
  const failures = [];
  try {
    stagehand = await Stagehand.create({ browser });
    const pages = await stagehand.browser.context.pages();
    const page = pages[0] ?? (await stagehand.browser.context.newPage());
    if (args.initScript) {
      await page.addInitScript({ path: path.resolve(args.initScript) });
    }
    await page.goto(args.url, { waitUntil: "load" });

    const timeout = config.timeoutMs ?? 5_000;
    const discovered = await page.tools({ timeout });
    console.log(`Stagehand discovered ${discovered.length} WebMCP tool(s)`);

    for (const expected of config.tools) {
      const tool = discovered.find((candidate) => candidate.name === expected.name);
      if (!tool) {
        failures.push(`${expected.name}: not discovered`);
        console.log(`FAIL ${expected.name}: not discovered`);
        continue;
      }
      const failureCountBeforeValidation = failures.length;
      if (!tool.description?.trim()) failures.push(`${expected.name}: description is empty`);
      if (!tool.inputSchema || typeof tool.inputSchema !== "object" || Array.isArray(tool.inputSchema)) {
        failures.push(`${expected.name}: input schema is missing or not an object`);
      }
      if (expected.expectedAnnotations) {
        const mismatch = deepSubset(tool.annotations, expected.expectedAnnotations, `${expected.name}.annotations`);
        if (mismatch) failures.push(mismatch);
      }

      if (!Object.hasOwn(expected, "input")) {
        const status = failures.length === failureCountBeforeValidation ? "PASS" : "FAIL";
        console.log(`${status} ${expected.name}: discovered (discovery-only, risk=${expected.risk})`);
        continue;
      }

      const invocation = await tool.invoke({ input: expected.input });
      const response = await invocation.result({ timeout });
      const expectedStatus = expected.expectedStatus ?? "Completed";
      if (response.status !== expectedStatus) {
        failures.push(`${expected.name}: status ${response.status}; expected ${expectedStatus}`);
      }
      if (expected.expectedOutputSubset) {
        const mismatch = deepSubset(response.output, expected.expectedOutputSubset, `${expected.name}.output`);
        if (mismatch) failures.push(mismatch);
      }
      const status = failures.length === failureCountBeforeValidation ? "PASS" : "FAIL";
      console.log(`${status} ${expected.name}: invoked status=${response.status} risk=${expected.risk}`);
      if (expected.expectedOutputSubset) {
        console.log(`  verified output subset: ${JSON.stringify(expected.expectedOutputSubset)}`);
      }
    }

    for (const expected of config.expectedDom ?? []) {
      const actualText = await page.locator(expected.selector).textContent();
      if (actualText !== expected.text) {
        failures.push(`DOM ${expected.selector}: text was ${JSON.stringify(actualText)}; expected ${JSON.stringify(expected.text)}`);
        console.log(`FAIL DOM ${expected.selector}`);
      } else {
        console.log(`PASS DOM ${expected.selector}: ${JSON.stringify(expected.text)}`);
      }
    }
  } finally {
    await stagehand?.close().catch(() => {});
    await browser.close().catch(() => {});
  }

  if (failures.length > 0) {
    console.error("Validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
  } else {
    console.log(`Validation passed: ${config.tools.length}/${config.tools.length} expected tool(s)`);
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
