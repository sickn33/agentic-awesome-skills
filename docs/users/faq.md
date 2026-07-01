# Frequently Asked Questions (FAQ)

**Got questions?** You're not alone! Here are answers to the most common questions about Antigravity Awesome Skills.

---

## General Questions

### What are "skills" exactly?

Skills are specialized instruction files that teach AI assistants how to handle specific tasks. Think of them as expert knowledge modules that your AI can load on-demand.
**Simple analogy:** Just like you might consult different experts (a lawyer, a doctor, a mechanic), these skills let your AI become an expert in different areas when you need them.

### Do I need to install every skill?

**No!** When you clone the repository, all skills are available, but your AI only loads them when you explicitly invoke them with `@skill-name`.
It's like having a library - all books are there, but you only read the ones you need.
**Pro Tip:** Use [Starter Packs](bundles.md) to focus on the skills that match your role first.

If you want a narrower install surface for **Claude Code** or **Codex**, use the new plugin distributions documented in [plugins.md](plugins.md) instead of the full library install.

### What is the difference between Bundles and Workflows?

- **Bundles** are curated recommendations grouped by role or domain.
- **Workflows** are ordered execution playbooks for concrete outcomes.

Use bundles when you are deciding _which skills_ to include. Use workflows when you need _step-by-step execution_.

Start from:

- [bundles.md](bundles.md)
- [workflows.md](workflows.md)

### What is the difference between skills and MCP tools?

- **Skills** are reusable `SKILL.md` playbooks that guide an AI assistant through a workflow.
- **MCP tools** are integrations or callable capabilities that let the assistant interact with external systems.

Use skills when you want better process, structure, and execution quality. Use MCP tools when you need access to APIs, services, databases, or other systems. Use both when you want reliable workflows plus external capabilities.

For the longer explanation, read [skills-vs-mcp-tools.md](skills-vs-mcp-tools.md).

### Which AI tools work with these skills?

- ✅ **Claude Code** (Anthropic CLI)
- ✅ **Gemini CLI** (Google)
- ✅ **Codex CLI** (OpenAI)
- ✅ **Cursor** (AI IDE)
- ✅ **Antigravity IDE**
- ✅ **OpenCode**
- ✅ **Kiro CLI** (Amazon)
- ✅ **Kiro IDE** (Amazon)
- ✅ **AdaL CLI**
- ⚠️ **GitHub Copilot** (partial support via copy-paste)

### Are these skills free to use?

**Yes.** Original code and tooling are licensed under MIT, and original documentation/non-code written content is licensed under CC BY 4.0.

- ✅ Free for personal use
- ✅ Free for commercial use
- ✅ You can modify them

See [../../LICENSE](../../LICENSE), [../../LICENSE-CONTENT](../../LICENSE-CONTENT), and [../sources/sources.md](../sources/sources.md) for attribution and third-party license details.

### How do these skills avoid overflowing the model context?

Some host tools (for example custom agents built on Jetski/Cortex + Gemini) might be tempted to **concatenate every `SKILL.md` file into a single system prompt**.  
This is **not** how this repository is designed to be used, and it will almost certainly overflow the model’s context window if you concatenate the whole repository into one prompt.

Instead, hosts should:

- use `skills_index.json` as the **canonical array-format manifest** for discovery;
- use `data/skills_index.json` as the compatibility mirror in `data/` when needed;
- validate each discovered `path` against `SKILLS_ROOT` before reading; and
- load individual `SKILL.md` files **only when a skill is invoked** (e.g. via `@skill-id` in the conversation).

Manifest contract references:

- [`schemas/skills-index.v1.schema.json`](../../schemas/skills-index.v1.schema.json)
- [`discovery-manifest.md`](discovery-manifest.md)

For a concrete example (including pseudo‑code) see:

- [`docs/integrations/jetski-cortex.md`](../integrations/jetski-cortex.md)

### Do skills work offline?

The skill files themselves are stored locally on your computer, but your AI assistant needs an internet connection to function.

### Does the hosted web app write anything back to the repository?

No. The public site is a static GitHub Pages deploy.

- The maintainer `Sync Skills` flow is local-development only and is not a public production endpoint.
- Browser save/star interactions are intentionally local-first for now. Until the project has a real backend contract, treat them as browser-local state rather than shared repository writes.

---

## Security & Trust

### What do the Risk Labels mean?

We classify skills so you know what you're running. These values map directly to the `risk:` field in every `SKILL.md` frontmatter:

- ⚪ **`unknown`**: Legacy or unclassified content. Review the skill manually before use.
- 🟢 **`none`**: Pure reference or planning content — no shell commands, no mutations, no network access.
- 🔵 **`safe`**: Non-destructive guidance such as read-only commands, planning, code review, and analysis.
- 🟠 **`critical`**: Skills that modify files, drop data, use network scanners, or perform destructive actions. **Use with caution.**
- 🔴 **`offensive`**: Security-focused offensive techniques (pentesting, exploitation). **Authorized use only** — always confirm the target is in scope.

### Can these skills hack my computer?

**No.** Skills are text files. However, they _instruct_ the AI to run commands. If a skill says "delete all files", a compliant AI might try to do it.
_Always check the Risk label and review the code._

---

## Installation & Setup

### Where should I install the skills?

It depends on how you install:

- **Using the installer CLI (`npx antigravity-awesome-skills`)**:
  The default install target is `~/.agents/skills/` for Antigravity's global library.
- **Using a tool-specific flag**:
  Use `--claude`, `--cursor`, `--gemini`, `--codex`, `--kiro`, or `--antigravity` to target the matching tool path automatically.
- **Using a manual clone or custom workspace path**:
  `.agent/skills/` is still a good universal workspace convention for Antigravity/custom setups.

If you get a 404 from npm, use: `npx github:sickn33/antigravity-awesome-skills`

**Using git clone:**

```bash
git clone https://github.com/sickn33/antigravity-awesome-skills.git .agent/skills
```

The installer CLI is the recommended path for most users because it performs a lighter shallow clone of the current library. Manual `git clone` is still the right option when you want the full repository history or plan to contribute from the same checkout.

**Tool-specific paths:**

- Claude Code: `.claude/skills/`
- Gemini CLI: `.gemini/skills/`
- Codex CLI: `.codex/skills/`
- Cursor: `.cursor/skills/` or project root

**Claude Code plugin marketplace alternative:**

```text
/plugin marketplace add sickn33/antigravity-awesome-skills
/plugin install antigravity-awesome-skills
```

This repository now includes `.claude-plugin/marketplace.json` and `.claude-plugin/plugin.json` so Claude Code can install the same skill tree through the plugin marketplace.

**Codex plugin alternative:**

This repository also includes repo-local plugin metadata for Codex:

- `.agents/plugins/marketplace.json`
- `plugins/antigravity-awesome-skills/.codex-plugin/plugin.json`

That path exposes the new plugin-safe Codex root plugin plus generated bundle plugins. For the full explanation, read [plugins.md](plugins.md).

### Why do I not see `Sync Skills` on the hosted website?

Because the public site is a static GitHub Pages catalog, not a maintainer control surface.

`Sync Skills` is only meant for local maintainer/development runs behind the Vite dev server, and it stays hidden unless the local environment explicitly enables it.

### What does `Public catalog mode` mean?

It means you are looking at the published static catalog build.

In that mode:

- catalog browsing and skill detail pages work normally
- dev-only `/api/refresh-skills` behavior is not available
- anything that would require a backend or mutable server state is intentionally disabled or reduced to local-only behavior

### Are saves/stars global or just local?

Right now they are local to your browser.

The app may show optional read-only community counts when configured, but clicking save/star does not create a shared server-side vote. Until the project ships a real backend write contract with abuse controls, treat saves as a personal local bookmark signal.

### What does `plugin-safe` mean?

Plugin-safe means the published Claude Code and Codex plugins only include the subset of skills that is ready for marketplace-style distribution.

Skills can stay repo-only for a while if they still need:

- portability cleanup
- explicit setup metadata
- additional hardening for plugin ecosystems

So it is normal for the **full library** to be larger than the **plugin-safe** plugin subset. The repository stays the complete source of truth; plugins publish the hardened subset.

### Does this work with Windows?

**Yes.** Use the same standard install flow as other platforms:

```bash
npx antigravity-awesome-skills
```

If you have an older clone created around the removed symlink workaround, reinstall into a fresh directory or rerun `npx antigravity-awesome-skills`.

### I hit a truncation or context crash loop on Windows. How do I recover?

If Antigravity or a Jetski/Cortex-based host keeps reopening into:

> `TrajectoryChatConverter: could not convert a single message before hitting truncation`

use the dedicated Windows recovery guide:

- [`windows-truncation-recovery.md`](windows-truncation-recovery.md)

It includes:

- the manual cleanup steps for broken Local Storage / Session Storage / IndexedDB state
- the default Antigravity Windows paths to back up first
- an optional batch script adapted from [issue #274](https://github.com/sickn33/antigravity-awesome-skills/issues/274)

### I hit context overload on Linux or macOS. What should I do?

If Antigravity becomes unstable only when the full skills library is active, switch to the activation flow instead of exposing every skill at once:

- [agent-overload-recovery.md](agent-overload-recovery.md)

That guide shows how to run `scripts/activate-skills.sh` from a cloned copy of this repository so only the bundles or skill ids you need stay active in `~/.agents/skills`.

### I use OpenCode with `.agents/skills`. Should I install the whole library?

Usually no. For OpenCode and other hosts that read from `.agents/skills`, start with a reduced install instead of copying the full library:

```bash
npx antigravity-awesome-skills --path .agents/skills --category development,backend --risk safe,none
```

You can narrow further with `--tags` or exclude values with a trailing `-`:

```bash
npx antigravity-awesome-skills --path .agents/skills --tags debugging,typescript-
```

The filter rules are:

- comma-separated values are ORed within one flag
- exclusions use a trailing `-`, for example `legal-`
- `--risk`, `--category`, and `--tags` combine with AND

This keeps the installed skill set smaller and reduces the chance of context overload in OpenCode-style runtimes.

### OpenCode on Windows crashes with Bun or enters repeated compaction loops after adding many skills. What should I do?

Treat this as two separate problems:

- **Binary crash on startup (`bun.exe` segfault):** this is usually an OpenCode runtime issue, not a skill-content issue. Verify OpenCode can run without this repository loaded first.
- **Compaction/summary loops after loading many skills:** this is usually context overload from too many active skills at once.

Practical mitigation:

1. Start with a reduced install in `.agents/skills`:

```bash
npx antigravity-awesome-skills --path .agents/skills --category development,backend --risk safe,none
```

2. Avoid loading large autonomy/conductor-style skills until the base flow is stable.
3. Add skills incrementally and retest after each addition.
4. If loops continue, follow the overload recovery guide: [agent-overload-recovery.md](agent-overload-recovery.md)

### Gemini CLI hangs after a few turns or says "This is taking a bit longer, we're still on it". What should I do?

Start with a quick isolation check:

1. Start a brand-new Gemini CLI conversation.
2. Try one prompt with no skills at all.
3. Try the same task again with only one small skill such as `brainstorming`.
4. Temporarily reduce your active skill set to 2-5 skills and retry.

How to interpret the result:

- If plain Gemini CLI hangs even without skills, the problem is likely on the Gemini CLI/runtime side rather than this repository.
- If plain Gemini works, but hangs only when skills are present or after several turns, the likely cause is conversation/context growth.

In that case:

- keep a much smaller active set
- start fresh conversations more often
- use the overload guide: [agent-overload-recovery.md](agent-overload-recovery.md)

### How do I update skills?

Navigate to your skills directory and pull the latest changes:

```bash
cd .agent/skills
git pull origin main
```

---

## Using Skills

> **💡 For a complete guide with examples, see [usage.md](usage.md)**

### How do I invoke a skill?

Use the `@` symbol followed by the skill name:

```bash
@brainstorming help me design a todo app
```

### Can I invoke a whole bundle like `@Essentials` or `/web-wizard`?

No. Bundles are curated lists of skills, not standalone invokable mega-skills.

Use them in one of these two ways:

- pick individual skills from the bundle and invoke those directly
- install the dedicated Claude Code or Codex bundle plugin if you want a marketplace-scoped subset
- use the activation scripts if you want only that bundle's skills active in Antigravity

Examples:

```bash
./scripts/activate-skills.sh --clear Essentials
./scripts/activate-skills.sh --clear "Web Wizard"
```

### Can I use multiple skills at once?

**Yes!** You can invoke multiple skills:

```bash
@brainstorming help me design this, then use @writing-plans to create a task list.
```

### How do I know which skill to use?

1. **Browse the catalog**: Check the [Skill Catalog](../../CATALOG.md).
2. **Search**: `ls skills/ | grep "keyword"`
3. **Ask your AI**: "What skills do you have for testing?"

---

## Troubleshooting

### My AI assistant doesn't recognize skills

**Possible causes:**

1. **Wrong installation path**: Check your tool's docs. Try `.agent/skills/`.
2. **Restart Needed**: Restart your AI/IDE after installing.
3. **Typos**: Did you type `@brain-storming` instead of `@brainstorming`?

### A skill gives incorrect or outdated advice

Please [Open an issue](https://github.com/sickn33/antigravity-awesome-skills/issues)!
Include:

- Which skill
- What went wrong
- What should happen instead

---

## Contribution

### I'm new to open source. Can I contribute?

**Absolutely!** We welcome beginners.

- Fix typos
- Add examples
- Improve docs
  Check out [CONTRIBUTING.md](../../CONTRIBUTING.md) for instructions.

### My PR failed "Quality Bar" check. Why?

The repository enforces automated quality control. Your skill might be missing:

1. A valid `description`.
2. Clear usage guidance or examples.
3. The expected PR template checklist in the PR body.

Run `npm run validate` locally before you push, and make sure you opened the PR with the default template so the Quality Bar checklist is present.

### My PR failed "security docs" check. What should I do?

Run the security docs gate locally and address the findings:

```bash
npm run security:docs
```

Common fixes:

- Replace risky examples like `curl ... | bash`, `wget ... | sh`, `irm ... | iex` with safer alternatives.
- Remove or redact token-like command-line examples.
- For intentional high-risk guidance, add explicit justification via:

```markdown
<!-- security-allowlist: reason and scope -->
```

### My PR triggered the `skill-review` automated check. What is it?

Since v8.0.0, GitHub automatically runs a `skill-review` workflow on any PR that adds or modifies a `SKILL.md` file. It reviews your skill against the quality bar and flags common issues — missing sections, weak triggers, or risky command patterns. The workflow now uses Tessl Review; fork PRs may need maintainer manual review when GitHub withholds repository secrets.

**If it reports findings:**

1. Open the **Checks** tab on your PR and read the `skill-review` job output.
2. Address any **actionable** findings (missing "When to Use", unclear triggers, blocked security patterns).
3. Push a new commit to the same branch — the check reruns automatically.

You do not need to close and reopen the PR. Informational or style-only findings do not block merging.

### Do community PRs need generated files like `CATALOG.md` or `skills_index.json`?

**No.** Community PRs should stay **source-only**.

Do **not** include generated registry artifacts like:

- `CATALOG.md`
- `skills_index.json`
- `data/*.json`

Maintainers regenerate and canonicalize those files on `main` after merge. If you touch docs, workflows, or infra, run `npm run validate:references` and `npm test` locally instead.

### Can I update an "Official" skill?

**No.** Official skills (in `skills/official/`) are mirrored from vendors. Open an issue instead.

---

## Pro Tips

- Start with `@brainstorming` before building anything new
- Use `@systematic-debugging` when stuck on bugs
- Try `@test-driven-development` for better code quality
- Explore `@skill-creator` to make your own skills

**Still confused?** [Open a discussion](https://github.com/sickn33/antigravity-awesome-skills/discussions) and we'll help you out! 🙌
