---
name: assay
description: "Run assay on a web page you just wrote or changed. It opens the page in a real browser, drives every control, and reports where the page contradicts itself. Deterministic, no API key, no network."
category: testing
risk: safe
source: "https://github.com/awss1i/assay"
source_repo: awss1i/assay
source_type: community
date_added: "2026-10-08"
author: awss1i
tags: [testing, qa, web, browser, playwright, html]
tools: [claude, cursor, gemini, codex]
license: MIT
license_source: "https://github.com/awss1i/assay/blob/main/LICENSE"
---

# Assay

## Overview

A page you have just written has no tests yet. `assay` serves the page locally, opens it in a real Chromium browser through Playwright, finds every control on it, uses all of them, and reports where the page contradicts itself. There are no tests to write, no LLM, no API key, and no network. The same page gives the same result every time.

Use this skill after you create or change a web page, to run assay on that page and report the one line it prints. The skill reports the result and does not change code because of it unless you ask.

## When to Use This Skill

- Use when you have just created an HTML page and want to know whether its controls work before you move on.
- Use when you changed a page, or the JavaScript or CSS that a page loads, and want to confirm the page still holds together.
- Use when the user asks you to check, QA, or smoke-test a local web page.
- Run it once at the end, after the last edit, on each page you changed. Do not run it while you are still making changes.

## How It Works

### Step 1: Install the CLI once

Install assay from PyPI. The package is named `assay-ui` and the command it installs is `assay`.

```bash
pip install assay-ui
```

It needs Python 3.10 or newer. On the first run assay downloads the Chromium build Playwright uses.

### Step 2: Run assay on the page you changed

Point assay at the page itself and ask for the one-line summary.

```bash
assay <the page you changed> --one-line
```

Point it at a file such as `todo.html` or `dist/index.html`. A folder also works and opens the `index.html` inside it. The page is often a folder or two above the file you edited, so a change to a script or stylesheet still means running assay on the page that loads it. assay needs no key, network, or configuration. A small page takes seconds, and a busy one can take a minute or more.

### Step 3: Report the one line assay printed, verbatim

Put assay's output, word for word, as the last thing in your reply. It is already one line, or one line and a short list. Do not summarize it, reformat it, add to it, or write your own version.

A clean run looks like this, with assay's own numbers and wording.

```text
assay: checked todo/todo.html, 8 checks, nothing flagged.
```

A run that flagged something looks like this, followed by a short list.

```text
assay: checked notes/index.html, 12 checks, 4 flagged:
```

Report the line whether it flagged anything or not. Without it, the reader cannot tell a clean page from a check that never ran.

If the command did not run, say so in your own words, name the page, and quote what the shell actually printed. Never describe a check that did not happen as one that passed, and never guess at a cause.

### Step 4: Report the finding and stop

Report what assay found and stop. Do not edit code in response to a finding in the same reply. If the user then asks you to fix it, fix it.

## Examples

### Example 1: A page that checks out clean

**User:** I added a to-do list at `todo/todo.html`. Does it work?

```bash
assay todo/todo.html --one-line
```

```text
assay: checked todo/todo.html, 8 checks, nothing flagged.
```

Report that line as the last thing in the reply, and do not change the page.

### Example 2: A page where assay flagged something

```bash
assay notes/ --one-line
```

```text
assay: checked notes/index.html, 12 checks, 4 flagged:
  - draw on canvas twice, then press Undo twice: it reacted one press late
```

Report the whole line and its short list, say that a finding is a place to look rather than a confirmed bug, and wait for the user to ask before changing anything.

### Example 3: The command did not run

```bash
assay dist/index.html --one-line
```

```text
assay: error: dist/index.html does not exist
```

Say that assay did not run, name the page, and quote the message. Do not report a check that never happened as one that passed.

## Best Practices

- ✅ Run assay once, at the end, on each page you changed.
- ✅ Point it at the built page, such as `dist/index.html`, not at a source template.
- ✅ Print assay's one line exactly as it came out, as the last thing in your reply.
- ✅ When assay flags something, treat it as a place to look and wait to be asked before changing code.
- ❌ Do not run assay while you are still editing the page.
- ❌ Do not summarize, reword, or invent the result, and never report a check that did not run as one that passed.

## Limitations

- assay will not build your project. Point it at built output. Given a source tree, it says so and names the command to run, and it will not run `npm install` for you, because installing dependencies executes their setup scripts.
- assay checks one page. It does not crawl, so run it on each page you changed.
- assay cannot check intent. A control that runs but does the wrong thing usually is not caught, because assay presses what the page offers and reports what followed without knowing what the page is for.
- A finding is a place to look, not a confirmed bug. A control can correctly do nothing in the state it was pressed in, and a value can be limited on purpose.

## Security & Safety Notes

- assay runs locally, needs no API key, and makes no network calls of its own. It serves the folder over loopback rather than opening the file directly.
- assay drives every control it finds in the browser, so if the page is wired to a live backend, a click can trigger that backend. Point assay at a local page or a local build, not at a production URL.
- assay is read-only toward your code. It does not edit your files and writes nothing to disk unless you pass `--report` to save an HTML report.
- assay will not run a project's build or install steps, because installing dependencies runs their setup scripts and this is a tool for checking code nobody has read yet.

## Common Pitfalls

- **Problem:** assay is pointed at a source file or template and reports that it cannot run.
  **Solution:** Build the project first and point assay at the built page, such as `dist/index.html`.
- **Problem:** The reply rewrites or summarizes assay's result.
  **Solution:** Paste assay's line verbatim as the last thing in the reply, with its own numbers and wording.
- **Problem:** Code gets changed in the same reply because assay flagged something.
  **Solution:** Report the finding and stop. Change code only when the user asks.
- **Problem:** A page that changed its script or stylesheet is left unchecked because only the HTML looks like "the page".
  **Solution:** Run assay on the page that loads the changed script or stylesheet, which is often a folder or two above the file you edited.

## Related Skills

- `@mock-hunter` audits a live page for mock data, hardcoded values, and broken endpoints, for when you need to know whether the values on screen are real.
- `@accesslint-diff` diffs a page's accessibility violations against a baseline, for when you care about accessibility rather than whether the controls work.

## Additional Resources

- [assay on GitHub](https://github.com/awss1i/assay) holds the source, the Python API, and the HTML report.
- [assay-ui on PyPI](https://pypi.org/project/assay-ui/) is the package that `pip install assay-ui` installs.
- [assay usage and flags](https://github.com/awss1i/assay/blob/main/docs/usage.md) documents the full command-line flags and the report output.
