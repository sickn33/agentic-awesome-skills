# Permission Analysis

Framework for evaluating tool permissions granted to agent skills.

## Tool Risk Tiers

| Tier | Tools | Risk Level | Notes |
|------|-------|------------|-------|
| **Tier 1 — Read-Only** | `Read`, `Grep`, `Glob` | Low | No direct write tools; reads can still expose private data and untrusted instructions |
| **Tier 2 — Execution** | `Bash` | Medium | Can run arbitrary commands; should have clear justification |
| **Tier 3 — Modification** | `Write`, `Edit`, `NotebookEdit` | High | Can modify files; verify the skill needs to create/edit files |
| **Tier 4 — Network** | `WebFetch`, `WebSearch` | High | Can access external URLs; verify domains are necessary |
| **Tier 5 — Delegation** | `Task` | High | Can spawn subagents; increases attack surface |
| **Tier 6 — Unrestricted** | `*` (wildcard) | Critical | Full access to all tools; almost never justified |

## Least Privilege Assessment

For each tool in `allowed-tools`, verify:

1. **Is it referenced?** Does the SKILL.md body mention operations requiring this tool?
2. **Is it necessary?** Could the skill achieve its purpose without this tool?
3. **Is the scope minimal?** Could a more restrictive tool achieve the same result?

### Assessment Checklist

| Tool | Justified When | Unjustified When |
|------|---------------|-----------------|
| `Read` | Skill reads files for analysis | — (almost always justified) |
| `Grep` | Skill searches file contents | — (almost always justified) |
| `Glob` | Skill finds files by pattern | — (almost always justified) |
| `Bash` | Running bundled scripts (`uv run`), git/gh CLI, build tools | No scripts or CLI commands in instructions |
| `Write` | Skill creates new files (reports, configs) | Skill only reads and analyzes |
| `Edit` | Skill modifies existing files | Skill only reads and analyzes |
| `WebFetch` | Skill fetches external documentation or APIs | No URLs referenced in instructions |
| `WebSearch` | Skill needs to search the web | No search-dependent logic |
| `Task` | Skill delegates to subagents for parallel work | Could run sequentially without delegation |

## Common Permission Profiles

Expected tool sets by skill type:

### Analysis / Review Skills
- **Expected**: `Read, Grep, Glob` or `Read, Grep, Glob, Bash`
- **Bash justification**: Running linters, type checkers, or bundled scripts
- **Examples**: code-review, security-review, find-bugs

### Workflow Automation Skills
- **Expected**: `Read, Grep, Glob, Bash`
- **Bash justification**: Git operations, CI commands, gh CLI
- **Examples**: commit, pr-writer, iterate-pr

### Content Generation Skills
- **Expected**: `Read, Grep, Glob, Write` or `Read, Grep, Glob, Bash, Write, Edit`
- **Write/Edit justification**: Creating or modifying documentation, configs
- **Examples**: agents-md, doc-coauthoring

### External-Facing Skills
- **Expected**: `Read, Grep, Glob, Bash, WebFetch`
- **WebFetch justification**: Fetching documentation, API specs
- **Flag if**: WebFetch is present but no URLs appear in skill instructions

### Full-Access Skills
- **Expected**: Almost never
- **If seen**: Requires strong justification — the skill should be doing something that genuinely needs broad access
- **Flag**: `*` wildcard, or more than 5 distinct tools

## Red Flags

Combinations and patterns that warrant scrutiny:

| Pattern | Concern |
|---------|---------|
| `Bash` + no scripts in skill directory | Why does it need shell access? |
| `Write` or `Edit` + skill described as "analysis" or "review" | Analysis skills shouldn't modify files |
| `WebFetch` + no URLs in instructions | What is it fetching? |
| `Task` + `Bash` + `Write` | Can spawn subagents with write access — high risk |
| `*` (unrestricted) | Maximum attack surface; almost never appropriate |
| Tools granted but never referenced in instructions | Overly permissive; violates least privilege |

## Scoring

Rate the overall permission profile:

| Rating | Criteria |
|--------|----------|
| **Appropriate** | All tools justified and minimal for the skill's purpose |
| **Slightly Overpermissioned** | 1-2 tools not clearly needed; low risk |
| **Overpermissioned** | Multiple unnecessary tools; medium risk |
| **Dangerously Overpermissioned** | Unrestricted access or many high-tier tools without justification |

## Host and evidence boundary

These tiers are advisory descriptions, not enforced permissions. Read-only tools can expose private data, and broad tool count alone does not prove maliciousness. Confirm actual host enforcement and the target scope; delegation and external writes require authorization. No numeric tier or wildcard finding can approve installation or a merge.
