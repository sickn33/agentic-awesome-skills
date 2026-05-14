# Getting Started with Antigravity Awesome Skills (V11.2.0)

**New here? This guide will help you supercharge your AI Agent in 5 minutes.**

> **💡 Confused about what to do after installation?** Check out the [**Complete Usage Guide**](usage.md) for detailed explanations and examples!

---

## What Are "Skills"?

AI Agents (like **Claude Code**, **Gemini**, **Cursor**) are smart, but they lack specific knowledge about your tools.
**Skills** are specialized instruction manuals (markdown files) that teach your AI how to perform specific tasks perfectly, every time.

**Analogy:** Your AI is a brilliant intern. **Skills** are the SOPs (Standard Operating Procedures) that make them a Senior Engineer.

---

## Quick Start: The "Starter Packs"

Don't panic about the size of the repository. You don't need everything at once.
We have curated **Starter Packs** to get you running immediately.

You **install the full repo once** (npx or clone); Starter Packs are curated lists to help you **pick which skills to use** by role (e.g. Web Wizard, Hacker Pack)—they are not a different way to install.

If you prefer a marketplace-style install for **Claude Code** or **Codex**, use the new plugin distributions described in [plugins.md](plugins.md).

### 1. Install the Repo

**Option A — npx (easiest):**

```bash
npx antigravity-awesome-skills
```

This clones to `~/.gemini/antigravity/skills` by default. Use `--cursor`, `--claude`, `--gemini`, `--codex`, or `--kiro` to install for a specific tool, or `--path <dir>` for a custom location. Run `npx antigravity-awesome-skills --help` for details.
The installer uses a shallow clone by default so you get the current library without paying for the full git history on first install.

If you see a 404 error, use: `npx github:sickn33/antigravity-awesome-skills`

**Option B — git clone:**

```bash
# Universal (works for most agents)
git clone https://github.com/sickn33/antigravity-awesome-skills.git .agent/skills
```

### 2. Pick Your Persona

Find the bundle that matches your role (see [bundles.md](bundles.md)):

| Persona               | Bundle Name    | What's Inside?                                    |
| :-------------------- | :------------- | :------------------------------------------------ |
| **Web Developer**     | `Web Wizard`   | React Patterns, Tailwind mastery, Frontend Design |
| **Security Engineer** | `Hacker Pack`  | OWASP, Metasploit, Pentest Methodology            |
| **Manager / PM**      | `Product Pack` | Brainstorming, Planning, SEO, Strategy            |
| **Everything**        | `Essentials`   | Clean Code, Planning, Validation (The Basics)     |

---

## Bundles vs Workflows

Bundles and workflows solve different problems:

- **Bundles** = curated sets by role (what to pick).
- **Workflows** = step-by-step playbooks (how to execute).

Start with bundles in [bundles.md](bundles.md), then run a workflow from [workflows.md](workflows.md) when you need guided execution.

Example:

> "Use **@antigravity-workflows** and run `ship-saas-mvp` for my project idea."

---

## How to Use a Skill

Once installed, just talk to your AI naturally.

### Example 1: Planning a Feature (**Essentials**)

> "Use **@brainstorming** to help me design a new login flow."

**What happens:** The AI loads the brainstorming skill, asks you structured questions, and produces a professional spec.

### Example 2: Checking Your Code (**Web Wizard**)

> "Run **@lint-and-validate** on this file and fix errors."

**What happens:** The AI follows strict linting rules defined in the skill to clean your code.

### Example 3: Security Audit (**Hacker Pack**)

> "Use **@api-security-best-practices** to review my API endpoints."

**What happens:** The AI audits your code against OWASP standards.

---

## 🔌 Supported Tools

| Tool            | Status          | Path                                                                  |
| :-------------- | :-------------- | :-------------------------------------------------------------------- |
| **Claude Code** | ✅ Full Support | `.claude/skills/` or install via `/plugin marketplace add sickn33/antigravity-awesome-skills` |
| **Gemini CLI**  | ✅ Full Support | `.gemini/skills/`                                                     |
| **Codex CLI**   | ✅ Full Support | `.codex/skills/` or use the repo-local plugin metadata described in [plugins.md](plugins.md) |
| **Kiro CLI**    | ✅ Full Support | Global: `~/.kiro/skills/` · Workspace: `.kiro/skills/`                |
| **Kiro IDE**    | ✅ Full Support | Global: `~/.kiro/skills/` · Workspace: `.kiro/skills/`                |
| **Antigravity** | ✅ Native       | Global: `~/.gemini/antigravity/skills/` · Workspace: `.agent/skills/` |
| **Cursor**      | ✅ Native       | `.cursor/skills/`                                                     |
| **OpenCode**    | ✅ Full Support | `.agents/skills/` (prefer reduced installs with `--risk`, `--category`, or `--tags`) |
| **AdaL CLI**    | ✅ Full Support | `.adal/skills/`                                                       |
| **Copilot**     | ⚠️ Text Only    | Manual copy-paste                                                     |

---

## Trust & Safety

We classify skills so you know what you're running:

- ⚪ **unknown**: legacy/unclassified content that still needs maintainer triage.
- 🟢 **none**: pure text/reasoning guidance.
- 🔵 **safe**: read-only or low-risk operational guidance.
- 🟠 **critical**: state-changing or deployment-impacting guidance.
- 🔴 **offensive**: pentest/red-team guidance with an explicit Authorized Use Only warning.

Community PRs may still submit `risk: unknown`, but maintainers now audit and progressively reconcile those labels using the repo-wide audit/report tooling. High-risk guidance is extra-reviewed with repository-wide `security:docs` scanning before release.

_Check the [Skill Catalog](../../CATALOG.md) for the full list._

---

## FAQ

If you prefer a plugin install instead of copying skills into tool directories, start with [plugins.md](plugins.md).

For Claude Code, use:

```text
/plugin marketplace add sickn33/antigravity-awesome-skills
/plugin install antigravity-awesome-skills
```

For Codex, this repository also ships a root plugin plus bundle plugins through the repo-local metadata described in [plugins.md](plugins.md).

**Q: Do I need to install every skill?**
A: You clone the whole repo once; your AI only _reads_ the skills you invoke (or that are relevant), so it stays lightweight. **Starter Packs** in [bundles.md](bundles.md) are curated lists to help you discover the right skills for your role—they don't change how you install.

**Q: Can I make my own skills?**
A: Yes! Use the **@skill-creator** skill to build your own.

**Q: What if Antigravity on Windows gets stuck in a truncation crash loop?**
A: Follow the recovery steps in [windows-truncation-recovery.md](windows-truncation-recovery.md). It explains which Antigravity storage folders to back up and clear, and includes an optional batch helper adapted from [issue #274](https://github.com/sickn33/antigravity-awesome-skills/issues/274).

**Q: What if Antigravity overloads on Linux or macOS when too many skills are active?**
A: Use the activation flow in [agent-overload-recovery.md](agent-overload-recovery.md). It shows how to run `scripts/activate-skills.sh` from a cloned repo so you can keep the full library archived and activate only the bundles or skills you need in the live Antigravity directory.

**Q: What if OpenCode or another `.agents/skills` host becomes unstable with a full install?**
A: Start with a reduced install instead of copying the whole library. For example: `npx antigravity-awesome-skills --path .agents/skills --category development,backend --risk safe,none`. You can narrow further with `--tags` and use a trailing `-` to exclude values such as `typescript-`.

**Q: Is this free?**
A: Yes. Original code and tooling are MIT-licensed, and original documentation/non-code written content is CC BY 4.0. See [../../LICENSE](../../LICENSE) and [../../LICENSE-CONTENT](../../LICENSE-CONTENT).

---

## Next Steps

Need a tool-specific starting point first?

- [Claude Code skills](claude-code-skills.md)
- [Plugins for Claude Code and Codex](plugins.md)
- [Cursor skills](cursor-skills.md)
- [Codex CLI skills](codex-cli-skills.md)
- [Gemini CLI skills](gemini-cli-skills.md)

1. [Browse the Bundles](bundles.md)
2. [See Real-World Examples](../contributors/examples.md)
3. [Contribute a Skill](../../CONTRIBUTING.md)
