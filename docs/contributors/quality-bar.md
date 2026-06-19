# 🏆 Quality Bar & Validation Standards

To transform **Antigravity Awesome Skills** from a collection of scripts into a trusted platform, every skill must meet a specific standard of quality and safety.

## The "Validated" Badge ✅

A skill earns the "Validated" badge only if it meets these **6 quality checks**. Some are enforced automatically today, while others still require reviewer judgment:

### 1. Metadata Integrity

The `SKILL.md` frontmatter must be valid YAML and contain:

- `name`: Kebab-case, matches folder name.
- `description`: Under 200 chars, clear value prop.
- `risk`: One of `[none, safe, critical, offensive, unknown]`. Use `unknown` only for legacy or unclassified skills; prefer a concrete level for new skills.
- `source`: URL to original source (or "self" if original).

### 2. Clear Triggers ("When to use")

The skill MUST have a section explicitly stating when to trigger it.

- **Good**: "Use when the user asks to debug a React component."
- **Bad**: "This skill helps you with code."
Accepted headings: `## When to Use`, `## Use this skill when`, `## When to Use This Skill`.

### 3. Safety & Risk Classification

Every skill must declare its risk level:

- 🟢 **none**: Pure text/reasoning (e.g., Brainstorming).
- 🔵 **safe**: Reads files, runs safe commands (e.g., Linter).
- 🟠 **critical**: Modifies state, deletes files, pushes to prod (e.g., Git Push).
- 🔴 **offensive**: Pentesting/Red Team tools. **MUST** have "Authorized Use Only" warning.

### 4. Copy-Pasteable Examples

At least one code block or interaction example that a user (or agent) can immediately use.

### 5. Explicit Limitations

A list of known edge cases or things the skill _cannot_ do.

- _Example_: "Does not work on Windows without WSL."

### 6. Instruction Safety Review

If a skill includes command examples, remote fetch steps, secrets, or mutation guidance, the PR must document the risk and pass `npm run security:docs` in addition to normal validation.

For pull requests that add or modify `SKILL.md`, GitHub also runs the automated `skill-review` workflow. Treat that review as part of the normal PR quality gate and address any actionable findings before merge.
Automated checks are necessary, but they do **not** replace manual reviewer judgment on logic, safety, and likely failure modes.

`npm run security:docs` enforces a repo-wide scan for:

- command pipelines like `curl ... | bash`, `wget ... | sh`, `irm ... | iex`,
- inline token/secret-style command examples,
- deliberate allowlisted high-risk documentation commands via `<!-- security-allowlist: ... -->`.

### Additional Maintainer Audit

Use `npm run audit:skills` when you need a repo-wide report that goes beyond schema validation and answers:

- which skills are structurally valid but still need usability cleanup,
- which skills still have truncated descriptions (issue `#365`),
- which skills are missing examples or limitations,
- and which skills have the highest concentration of warnings/errors.

Maintainers can pair that report with `npm run sync:risk-labels` for conservative legacy cleanup. That sync only rewrites `risk: unknown` when the suggested label is explicit and high-confidence enough to automate safely, and it preserves the contributor-facing rule that new or uncertain submissions can still start as `unknown`.

---

## Support Levels

We also categorize skills by who maintains them:

| Level         | Badge | Meaning                                             |
| :------------ | :---- | :-------------------------------------------------- |
| **Official**  | 🟣    | Maintained by the core team. High reliability.      |
| **Community** | ⚪    | Contributed by the ecosystem. Best effort support.  |
| **Verified**  | ✨    | Community skill that has passed deep manual review. |

---

## How to Validate Your Skill

The canonical validator is `tools/scripts/validate_skills.py`, but the recommended entrypoint is `npm run validate` before submitting a PR:

```bash
npm run validate
npm run audit:skills
npm run validate:references
npm test
npm run security:docs
```

Notes:

- `npm run validate` is the operational contributor gate.
- `npm run audit:skills` is the maintainer-facing compliance/usability report for the full library.
- `npm run sync:risk-labels` is a maintainer cleanup tool for high-confidence legacy `risk:` fixes.
- `npm run security:docs` is required for command-heavy or risky skill content.
- PRs that touch `SKILL.md` also get an automated `skill-review` GitHub Actions check.
- Skill changes and risky guidance still require a manual logic review before merge, even when the automated gates pass.
- `npm run validate:strict` is a useful hardening pass, but the repository still contains legacy skills that do not yet satisfy strict validation.
- Examples and limitations remain part of the quality bar even when they are not fully auto-enforced by the current validator.
