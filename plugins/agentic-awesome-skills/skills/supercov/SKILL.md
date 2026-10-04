---
name: supercov
description: "Measure line, branch and MC/DC coverage of a project's existing tests with the supercov CLI, then write small, focused tests for the code no test reaches."
category: testing
risk: critical
source: https://github.com/supercorp-ai/supercov/tree/main/plugins/supercov/skills/supercov
source_repo: supercorp-ai/supercov
source_type: community
date_added: "2026-10-04"
author: Supercorp
tags: [testing, coverage, mcdc, test-generation]
tools: [claude, cursor, gemini, codex]
license: MIT
license_source: https://github.com/supercorp-ai/supercov/blob/main/LICENSE
---

# Supercov

## Overview

Supercov runs the project's own test command on the user's machine and reports line, branch and MC/DC coverage per test. It changes no source, tests or configuration. This skill uses that report to pick one untested piece of code at a time and write a focused test for it.

It works with JavaScript, TypeScript, Python, Ruby, Rust, Go, Java and Kotlin projects.

## When to Use This Skill

- Use when the user asks to add or improve tests.
- Use when the user asks which code is untested, or asks to raise coverage.
- Use when the user asks which file to refactor first and has agreed to a quality check (see "Quality check").

## Preconditions

- Node.js 22 or newer. If it is missing, tell the user. Do not install software without the user's approval.
- The project's test command, for example `npm test`, `pytest` or `cargo test`. Ask if it is not obvious from the repository.
- Always run the pinned version, `npx supercov@3.0.4`. The first run downloads that release from npm, so get the user's approval before it.

## How It Works

### Step 1: Measure the suite

Run the full test command under Supercov. Coverage is measured locally and sends nothing over the network.

```bash
npx supercov@3.0.4 -- npm test
```

### Step 2: Pick a target

List the untested code, pick one item, and read it in context.

```bash
npx supercov@3.0.4 runs latest gaps --limit 5
npx supercov@3.0.4 runs latest file src/session.js
```

### Step 3: Write one focused test

Write one test for the chosen target. Change only test files unless the user asks otherwise.

### Step 4: Rerun and report

Rerun the command from step 1. Report the test you added and the coverage before and after.

For anything not shown here, `npx supercov@3.0.4 docs <topic>` prints the guide for that version. Topics: `agent-loop`, `quality`, `supported-suites`, `troubleshooting`.

## Examples

### Example 1: Add a test for untested code

```bash
npx supercov@3.0.4 -- npm test
npx supercov@3.0.4 runs latest gaps --limit 5
# add one test for the first gap, then:
npx supercov@3.0.4 -- npm test
```

### Example 2: Other languages

```bash
npx supercov@3.0.4 -- pytest
npx supercov@3.0.4 -- cargo test
npx supercov@3.0.4 -- go test ./...
npx supercov@3.0.4 -- ./gradlew test
```

## Quality check

`npx supercov@3.0.4 quality` ranks files by code smells, and `npx supercov@3.0.4 quality patch` reports what a change introduced.

- These two commands send the project's source files to TypeSafe's API for analysis. Run them only when the user asked for a quality check, and tell the user before running that their source files will be sent to TypeSafe.
- They need the user's own `TYPESAFE_API_KEY` in the environment. Never ask the user to paste a key into the conversation, and never create, read or print one.
- If the key is missing, tell the user the check needs it, then answer from reading the code and say Supercov did not check it.

## Best Practices

- ✅ Measure the full suite first, so the gaps reflect every test.
- ✅ Add one test per gap and rerun before picking the next.
- ✅ Report coverage before and after with the numbers Supercov printed.
- ❌ Don't change application code to raise coverage unless the user asks.
- ❌ Don't run the quality commands without the user's request and consent.

## Limitations

- Coverage shows which code ran under a test. It does not show that the test checked the result.
- Supercov measures the suites listed in `npx supercov@3.0.4 docs supported-suites`. Other runners are not measured.
- The test command runs as the project defines it. If the suite needs services, credentials or network access, those needs still apply.
- This skill does not replace environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, or safety boundaries are missing.

## Security & Safety Notes

- The skill runs the project's own test command and writes test files in the user's repository. Run it only in a repository the user has authorized, and keep changes to test files unless the user asks otherwise.
- Supercov writes its run data to a `.supercov` directory in the project. It does not edit source, tests or configuration.
- `npx supercov@3.0.4` downloads a pinned release from the npm registry. Get the user's approval before the first run. Upgrading the pin needs a new review.
- Coverage commands make no network requests. Only the quality commands contact a third party, TypeSafe's API, and only with the user's consent and their own key.

## Related Skills

- `@test-driven-development` - Use when the behavior does not exist yet and the test should come first.
