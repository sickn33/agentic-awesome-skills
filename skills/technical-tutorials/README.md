# technical-tutorials

**Step-by-step guides that actually work.**

## What It Does

Guides you through creating tutorials, quickstarts, and code walkthroughs. Covers prerequisites, progressive complexity, copy-paste friendly code, troubleshooting sections, and "it works!" moments.

## When to Use

- Creating a quickstart guide
- Writing a step-by-step tutorial
- Building a code walkthrough
- When you say "tutorial," "quickstart," "getting started guide," or "how to guide"

## Quick Start

```
/technical-tutorials

Create a quickstart for our Python SDK.
Target: Python developers new to our API.
Goal: First successful API call in 5 minutes.
```

The skill will:
1. Load your developer audience context
2. Structure prerequisites clearly
3. Build progressive complexity
4. Add checkpoints and troubleshooting
5. Ensure code is copy-paste ready

## Key Frameworks

### Tutorial Types

| Type | Time | Purpose |
|------|------|---------|
| Quickstart | 5-10 min | First success ASAP |
| Tutorial | 20-45 min | Learn a concept deeply |
| Workshop | 1-3 hours | Comprehensive project |

### Progressive Complexity (Layer Cake)

1. Skeleton (minimum viable code)
2. Core feature (primary functionality)
3. Real data (replace hardcoded values)
4. Error handling (production patterns)
5. Polish (logging, config, tests)

### Copy-Paste Checklist

Every code block must:
- Run standalone
- Include all imports
- Have no undefined variables
- Work cross-platform
- Explain why, not what

## Files

| File | Description |
|------|-------------|
| `SKILL.md` | Full skill instructions with templates |

## Templates Included

- Quickstart template (5-10 min)
- Full tutorial template (20-45 min)
- Troubleshooting section format
- Prerequisites section format

## Quality Checklist

- [ ] Every code block runs
- [ ] Prerequisites are explicit
- [ ] Time estimate is accurate
- [ ] Checkpoints every 3-5 steps
- [ ] Troubleshooting covers likely errors

## Tools

- **[Octolens](https://octolens.com)** — Find common questions for troubleshooting content
- **Replit/CodeSandbox** — Embed runnable examples
- **Excalidraw** — Architecture diagrams

## Related Skills

- `developer-audience-context` — Understand skill level
- `devrel-content` — General technical writing
