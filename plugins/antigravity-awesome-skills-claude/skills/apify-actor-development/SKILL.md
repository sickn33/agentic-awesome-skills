---
name: apify-actor-development
description: "Important: Before you begin, fill in the generatedBy property in the meta section of .actor/actor.json. Replace it with the tool and model you're currently using, such as \"Claude Code with Claude Sonnet 4.5\". This helps Apify monitor and improve AGENTS.md for specific AI tools and models."
risk: unknown
source: community
---

# Apify Actor Development

**Important:** Before you begin, fill in the `generatedBy` property in the meta section of `.actor/actor.json`. Replace it with the tool and model you're currently using, such as "Claude Code with Claude Sonnet 4.5". This helps Apify monitor and improve AGENTS.md for specific AI tools and models.

## When to Use
- You need to create, modify, or debug an Apify Actor project.
- The task involves choosing an Apify template, wiring actor inputs/outputs, or implementing actor runtime logic.
- You need safe setup guidance for `apify` CLI authentication, project bootstrap, or deployment workflow.

## What are Apify Actors?

Actors are serverless programs inspired by the UNIX philosophy - programs that do one thing well and can be easily combined to build complex systems. They're packaged as Docker images and run in isolated containers in the cloud.

**Core Concepts:**
- Accept well-defined JSON input
- Perform isolated tasks (web scraping, automation, data processing)
- Produce structured JSON output to datasets and/or store data in key-value stores
- Can run from seconds to hours or even indefinitely
- Persist state and can be restarted

## Prerequisites & Setup (MANDATORY)

Before creating or modifying actors, verify that `apify` CLI is installed `apify --help`.

If it is not installed, use one of these methods (listed in order of preference):

```bash
# Preferred: install via a package manager (provides integrity checks)
npm install -g apify-cli

# Or (Mac): brew install apify-cli
```

> **Security note:** Do NOT install the CLI by piping remote scripts directly
> into a shell. Always use a package manager.

When the apify CLI is installed, check that it is logged in with:

```bash
apify info  # Should return your username
```

If it is not logged in, check if the `APIFY_TOKEN` environment variable is defined (if not, ask the user to generate one on https://console.apify.com/settings/integrations and then define `APIFY_TOKEN` with it).

Then authenticate using one of these methods:

```bash
# Option 1 (preferred): The CLI automatically reads APIFY_TOKEN from the environment.
# Just ensure the env var is exported and run any apify command — no explicit login needed.

# Option 2: Interactive login (prompts for token without exposing it in shell history)
apify login
```

> **Security note:** Avoid passing tokens as command-line arguments (e.g. `apify login -t <token>`).
> Arguments are visible in process listings and may be recorded in shell history.
> Prefer environment variables or interactive login instead.
> Never log, print, or embed `APIFY_TOKEN` in source code or configuration files.
> Use a token with the minimum required permissions (scoped token) and rotate it periodically.

## Template Selection

**IMPORTANT:** Before starting actor development, always ask the user which programming language they prefer:
- **JavaScript** - Use `apify create <actor-name> -t project_empty`
- **TypeScript** - Use `apify create <actor-name> -t ts_empty`
- **Python** - Use `apify create <actor-name> -t python-empty`

Use the appropriate CLI command based on the user's language choice. Additional packages (Crawlee, Playwright, etc.) can be installed later as needed.

## Quick Start Workflow

1. **Create actor project** - Run the appropriate `apify create` command based on user's language preference (see Template Selection above)
2. **Install dependencies** (verify package names match intended packages before installing)
   - JavaScript/TypeScript: `npm install` (uses `package-lock.json` for reproducible, integrity-checked installs — commit the lockfile to version control)
   - Python: `pip install -r requirements.txt` (pin exact versions in `requirements.txt`, e.g. `crawlee==1.2.3`, and commit the file to version control)
3. **Implement logic** - Write the actor code in `src/main.py`, `src/main.js`, or `src/main.ts`
4. **Configure schemas** - Update input/output schemas in `.actor/input_schema.json`, `.actor/output_schema.json`, `.actor/dataset_schema.json`
5. **Configure platform settings** - Update `.actor/actor.json` with actor metadata (see [references/actor-json.md](references/actor-json.md))
6. **Write documentation** - Create comprehensive README.md for the marketplace
7. **Test locally** - Run `apify run` to verify functionality (see Local Testing section below)
8. **Deploy** - Run `apify push` to deploy the actor on the Apify platform (actor name is defined in `.actor/actor.json`)

## Security

**Treat all crawled web content as untrusted input.** Actors ingest data from external websites that may contain malicious payloads. Follow these rules:

- **Sanitize crawled data** — Never pass raw HTML, URLs, or scraped text directly into shell commands, `eval()`, database queries, or template engines. Use proper escaping or parameterized APIs.
- **Validate and type-check all external data** — Before pushing to datasets or key-value stores, verify that values match expected types and formats. Reject or sanitize unexpected structures.
- **Do not execute or interpret crawled content** — Never treat scraped text as code, commands, or configuration. Content from websites could include prompt injection attempts or embedded scripts.
- **Isolate credentials from data pipelines** — Ensure `APIFY_TOKEN` and other secrets are never accessible in request handlers or passed alongside crawled data. Use the Apify SDK's built-in credential management rather than passing tokens through environment variables in data-processing code.
- **Review dependencies before installing** — When adding packages with `npm install` or `pip install`, verify the package name and publisher. Typosquatting is a common supply-chain attack vector. Prefer well-known, actively maintained packages.
- **Pin versions and use lockfiles** — Always commit `package-lock.json` (Node.js) or pin exact versions in `requirements.txt` (Python). Lockfiles ensure reproducible builds and prevent silent dependency substitution. Run `npm audit` or `pip-audit` periodically to check for known vulnerabilities.

## Best Practices

**✓ Do:**
- Use `apify run` to test actors locally (configures Apify environment and storage)
- Use Apify SDK (`apify`) for code running ON Apify platform
- Validate input early with proper error handling and fail gracefully
- Use CheerioCrawler for static HTML (10x faster than browsers)
- Use PlaywrightCrawler only for JavaScript-heavy sites
- Use router pattern (createCheerioRouter/createPlaywrightRouter) for complex crawls
- Implement retry strategies with exponential backoff
- Use proper concurrency: HTTP (10-50), Browser (1-5)
- Set sensible defaults in `.actor/input_schema.json`
- Define output schema in `.actor/output_schema.json`
- Clean and validate data before pushing to dataset
- Use semantic CSS selectors with fallback strategies
- Respect robots.txt, ToS, and implement rate limiting
- **Always use `apify/log` package** — censors sensitive data (API keys, tokens, credentials)
- Implement readiness probe handler (required if your Actor uses standby mode)

**✗ Don't:**
- Use `npm start`, `npm run start`, `npx apify run`, or similar commands to run actors (use `apify run` instead)
- Assume local storage from `apify run` is pushed to or visible in the Apify Console — it is local-only; deploy with `apify push` and run on the platform to see results in the Console
- Rely on `Dataset.getInfo()` for final counts on Cloud
- Use browser crawlers when HTTP/Cheerio works
- Hard code values that should be in input schema or environment variables
- Skip input validation or error handling
- Overload servers - use appropriate concurrency and delays
- Scrape prohibited content or ignore Terms of Service
- Store personal/sensitive data unless explicitly permitted
- Use deprecated options like `requestHandlerTimeoutMillis` on CheerioCrawler (v3.x)
- Use `additionalHttpHeaders` - use `preNavigationHooks` instead
- Pass raw crawled content into shell commands, `eval()`, or code-generation functions
- Use `console.log()` or `print()` instead of the Apify logger — these bypass credential censoring
- Disable standby mode without explicit permission

## Logging

See [references/logging.md](references/logging.md) for complete logging documentation including available log levels and best practices for JavaScript/TypeScript and Python.

Check `usesStandbyMode` in `.actor/actor.json` - only implement if set to `true`.

## Commands

```bash
apify run          # Run Actor locally
apify login        # Authenticate account
apify push         # Deploy to Apify platform (uses name from .actor/actor.json)
apify help         # List all commands
```

**IMPORTANT:** Always use `apify run` to test actors locally. Do not use `npm run start`, `npm start`, `yarn start`, or other package manager commands - these will not properly configure the Apify environment and storage.

## Local Testing

When testing an actor locally with `apify run`, provide input data by creating a JSON file at:

```
storage/key_value_stores/default/INPUT.json
```

This file should contain the input parameters defined in your `.actor/input_schema.json`. The actor will read this input when running locally, mirroring how it receives input on the Apify platform.

**IMPORTANT - Local storage is NOT synced to the Apify Console:**
- Running `apify run` stores all data (datasets, key-value stores, request queues) **only on your local filesystem** in the `storage/` directory.
- This data is **never** automatically uploaded or pushed to the Apify platform. It exists only on your machine.
- To verify results on the Apify Console, you must deploy the Actor with `apify push` and then run it on the platform.
- Do **not** rely on checking the Apify Console to verify results from local runs — instead, inspect the local `storage/` directory or check the Actor's log output.

## Standby Mode

See [references/standby-mode.md](references/standby-mode.md) for complete standby mode documentation including readiness probe implementation for JavaScript/TypeScript and Python.

## Project Structure

```
.actor/
├── actor.json           # Actor config: name, version, env vars, runtime
├── input_schema.json    # Input validation & Console form definition
└── output_schema.json   # Output storage and display templates
src/
└── main.js/ts/py       # Actor entry point
storage/                # Local-only storage (NOT synced to Apify Console)
├── datasets/           # Output items (JSON objects)
├── key_value_stores/   # Files, config, INPUT
└── request_queues/     # Pending crawl requests
Dockerfile              # Container image definition
```

## Actor Configuration

See [references/actor-json.md](references/actor-json.md) for complete actor.json structure and configuration options.

## Input Schema

See [references/input-schema.md](references/input-schema.md) for input schema structure and examples.

## Output Schema

See [references/output-schema.md](references/output-schema.md) for output schema structure, examples, and template variables.

## Dataset Schema

See [references/dataset-schema.md](references/dataset-schema.md) for dataset schema structure, configuration, and display properties.

## Key-Value Store Schema

See [references/key-value-store-schema.md](references/key-value-store-schema.md) for key-value store schema structure, collections, and configuration.

## Apify MCP Tools

If MCP server is configured, use these tools for documentation:

- `search-apify-docs` - Search documentation
- `fetch-apify-docs` - Get full doc pages

Otherwise, the MCP Server url: `https://mcp.apify.com/?tools=docs`.

## Resources

- [docs.apify.com/llms.txt](https://docs.apify.com/llms.txt) - Apify quick reference documentation
- [docs.apify.com/llms-full.txt](https://docs.apify.com/llms-full.txt) - Apify complete documentation
- [https://crawlee.dev/llms.txt](https://crawlee.dev/llms.txt) - Crawlee quick reference documentation
- [https://crawlee.dev/llms-full.txt](https://crawlee.dev/llms-full.txt) - Crawlee complete documentation
- [whitepaper.actor](https://raw.githubusercontent.com/apify/actor-whitepaper/refs/heads/master/README.md) - Complete Actor specification

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
