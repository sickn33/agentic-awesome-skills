# Claude Code Skills

If you are looking for **Claude Code skills** you can install from GitHub, this repository is designed to get you from first clone to first useful prompt quickly.

Antigravity Awesome Skills gives Claude Code users an installable library of `SKILL.md` playbooks, role-based bundles, and execution workflows. The goal is not just to collect prompts, but to make repeatable engineering tasks easier to invoke, review, and reuse.

Release `9.0.0` also adds a first-class Claude Code plugin distribution plus bundle plugins. If you want the full explanation of root plugin vs bundle plugin vs full install, read [plugins.md](plugins.md).

## How to use Antigravity Awesome Skills with Claude Code

Install the library into Claude Code, then invoke focused skills directly in the conversation or through the plugin marketplace path. Claude Code benefits most when you keep the prompt specific about the skill, the scope, and the intended output.

## Why use this repo for Claude Code

- It includes 1,439+ skills instead of a narrow single-domain starter pack.
- It supports the standard `.claude/skills/` path and the Claude Code plugin marketplace flow.
- It also ships generated bundle plugins so teams can install focused packs like `Essentials` or `Security Developer` from the marketplace metadata.
- It includes onboarding docs, bundles, and workflows so new users do not need to guess where to begin.
- It covers both everyday engineering tasks and specialized work like security reviews, infrastructure, product planning, and documentation.

## Install Claude Code Skills

### Option A: installer CLI

```bash
npx antigravity-awesome-skills --claude
```

### Option B: Claude Code plugin marketplace

```text
/plugin marketplace add sickn33/antigravity-awesome-skills
/plugin install antigravity-awesome-skills
```

The Claude marketplace plugin is a plugin-safe filtered distribution of the repo. Skills that still require portability hardening or explicit setup metadata remain available in the repository, but are excluded from the plugin until they are ready.

You can also install a focused bundle plugin instead of the root plugin when you want a narrower starter surface. See [plugins.md](plugins.md) and [bundles.md](bundles.md).

### Verify the install

```bash
test -d .claude/skills || test -d ~/.claude/skills
```

## Best starter skills for Claude Code

- [`brainstorming`](../../skills/brainstorming/): plan features and specs before writing code.
- [`lint-and-validate`](../../skills/lint-and-validate/): run fast quality checks before you commit.
- [`create-pr`](../../skills/create-pr/): package your work into a clean pull request.
- [`systematic-debugging`](../../skills/systematic-debugging/): investigate failures with a repeatable process.
- [`security-auditor`](../../skills/security-auditor/): review APIs, auth, and sensitive flows with a security lens.

## Example Claude Code prompts

```text
Use @brainstorming to design a new billing workflow for my SaaS.
```

```text
Use @lint-and-validate on src/routes/api.ts and fix the issues you find.
```

```text
Use @create-pr to turn these changes into a clean PR summary and checklist.
```

## What to do next

- Start with [`bundles.md`](bundles.md) if you want a role-based shortlist.
- Use [`workflows.md`](workflows.md) if you want step-by-step execution playbooks.
- Compare options in [`best-claude-code-skills-github.md`](best-claude-code-skills-github.md) if you are still evaluating repositories.
- Go back to the main landing page in [`README.md`](../../README.md) when you want the full installation matrix.
