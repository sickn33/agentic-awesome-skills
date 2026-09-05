# 🏆 Quality Bar & Validation Standards

To transform **Agentic Awesome Skills** from a collection of scripts into a trusted platform, every skill must meet a specific standard of quality and safety.

## What validation establishes

The following checks describe contributor expectations. Passing a structural check does not award a general reliability badge. Semantic review must identify its exact content, scope, reviewer or process, actual checks and remaining limitations.

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

- ⚪ **unknown**: Legacy or unclassified content. Avoid this for new skills unless maintainer triage is genuinely needed.
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

For pull requests that add or modify `SKILL.md`, GitHub also runs the automated `skill-review` workflow. Treat that review as part of the normal PR quality gate and address any actionable findings before merge. A successful result is reused when a later push has the identical changed-skill content; if Tessl credits are unavailable, the workflow records `manual-review-required` for exact-head maintainer attestation instead of pretending an automated review passed.
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

Risk labels remain declared metadata. The audit validates their presence and shape, while ambiguous `risk: unknown` cases require semantic review rather than lexical inference.

---

## Provenance, compatibility and review evidence

Source attribution identifies origin; it does not prove current maintenance, efficacy
or security. Do not infer reliability from “official”, “community”, a risk label or
an unqualified “verified” badge. Keep original attribution and license notices when
editing; record modifications without inventing upstream endorsement.

The [compatibility map](content-aliases.json) explicitly records retained duplicate
IDs. Aliases keep complete local instructions and support files for offline use;
they are not separate capabilities, recommendations or eligibility rules. Correct the
primary editorial path and every alias together, and verify their body/bundle equality.
Do not remove callable IDs or omit support files simply to improve duplicate counts.

The [2026-09-05 content review](content-review-2026-09-05.md) records a bounded cohort,
file fingerprints, actual checks, retained aliases and remaining whole-corpus debt.
A content fingerprint binds bytes, not truth or effectiveness. Review evidence becomes
stale when those bytes change and cannot replace the exact-head merge gate.

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
- `npm run security:docs` is required for command-heavy or risky skill content.
- PRs that touch `SKILL.md` also get an automated `skill-review` GitHub Actions check.
- Skill changes and risky guidance still require a manual logic review before merge, even when the automated gates pass.
- `npm run validate:strict` is a useful hardening pass, but the repository still contains legacy skills that do not yet satisfy strict validation.
- Examples and limitations remain part of the quality bar even when they are not fully auto-enforced by the current validator.
