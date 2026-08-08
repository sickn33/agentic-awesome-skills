---
name: unslop
description: "Post-process AI-generated text through the unslop CLI to strip AI writing patterns before publishing"
category: writing
risk: safe
source: community
source_repo: MohamedAbdallah-14/unslop
source_type: community
date_added: "2026-04-25"
author: MohamedAbdallah-14
tags: [writing, content-quality, ai-writing, text-processing, cli, publishing]
tools: [claude-code, cursor, gemini-cli, codex-cli, antigravity]
license: "MIT"
license_source: "https://github.com/MohamedAbdallah-14/unslop/blob/main/LICENSE"
---

# unslop — Strip AI Writing Patterns via CLI

## Overview

unslop is a CLI tool that post-processes text to remove AI writing patterns programmatically. Unlike skills that ask the agent to avoid AI-isms, unslop runs as a deterministic pipeline step: pipe text in, get clean text out. Use it as a final pass before committing docs, publishing posts, or sending any AI-generated content to production.

The `--deterministic` flag makes output reproducible — same input always produces same output. The `--stdin` flag reads from stdin, enabling shell pipeline composition.

## When to Use This Skill

- When you have AI-generated text ready to publish and want a final cleanup pass
- When working in a shell pipeline where text quality needs to be enforced automatically
- When writing commit hooks or CI steps that validate content before it ships
- When you need reproducible text normalization across multiple runs

## Setup

Install once:

```bash
pipx install unslop
# or
uv tool install unslop
```

Verify:

```bash
unslop --version
```

## How It Works

### Step 1: Pipe Text Through unslop

Standard cleanup (may vary slightly between runs):

```bash
echo "This leverages cutting-edge AI to deliver robust solutions." | unslop --stdin
```

Deterministic cleanup (same input → same output every run):

```bash
echo "This leverages cutting-edge AI to deliver robust solutions." | unslop --stdin --deterministic
```

### Step 2: Use in Shell Pipelines

Pipe the output of any command through unslop:

```bash
cat draft.md | unslop --stdin --deterministic > clean.md
```

Or chain with other tools:

```bash
cat draft.md | unslop --stdin --deterministic | pbcopy   # macOS: copy clean text to clipboard
```

### Step 3: Integrate into Commit Hooks or CI

Add to a pre-commit hook or CI step to enforce quality gates on any generated content before it ships:

```bash
# In .git/hooks/pre-commit or a CI script
CONTENT=$(cat docs/changelog.md)
CLEANED=$(echo "$CONTENT" | unslop --stdin --deterministic)
if [ "$CONTENT" != "$CLEANED" ]; then
  echo "Changelog contains AI writing patterns. Run: cat docs/changelog.md | unslop --stdin --deterministic > docs/changelog.md"
  exit 1
fi
```

## Examples

### Example 1: Clean a Draft Document

```bash
cat blog-post-draft.md | unslop --stdin --deterministic > blog-post-final.md
```

### Example 2: Inline Cleanup During Writing

```bash
# Write content, pipe through unslop, write result back
cat README.md | unslop --stdin > README.clean.md && mv README.clean.md README.md
```

### Example 3: Validate Before Submitting a PR

```bash
# Check if any generated docs need cleanup
for f in docs/*.md; do
  ORIGINAL=$(cat "$f")
  CLEANED=$(echo "$ORIGINAL" | unslop --stdin --deterministic)
  [ "$ORIGINAL" != "$CLEANED" ] && echo "Needs cleanup: $f"
done
```

## Best Practices

- ✅ Use `--deterministic` in CI and automation to ensure reproducible output
- ✅ Run on the final draft, not intermediate iterations
- ✅ Combine with the `avoid-ai-writing` skill for both generation-time guidance and post-processing
- ❌ Don't run on code files — unslop targets prose, not source code
- ❌ Don't skip review after unslop: automated cleanup can occasionally change meaning; read the output

## Limitations

- Processes prose only — not code, JSON, or structured data
- Does not catch factual errors or substantive writing issues
- Some replacements may not fit every context; review the output before publishing
- Requires Python tooling such as `pipx` or `uv` for standalone CLI installation

## Security & Safety Notes

- unslop reads from stdin and writes to stdout — no file system side effects by default
- `--deterministic` mode is local and does not make LLM API calls
- Default LLM mode may use `ANTHROPIC_API_KEY` or the Claude CLI; use `--deterministic` for sensitive local files and CI gates
- Safe to run in CI pipelines and commit hooks when pinned to deterministic mode
