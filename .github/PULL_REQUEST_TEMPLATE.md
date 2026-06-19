# Pull Request Description

Please include a summary of the change and which skill is added or fixed.

## Change Classification

- [ ] Skill PR
- [ ] Docs PR
- [ ] Infra PR

## Issue Link (Optional)

Use this only when the PR should auto-close an issue:

`Closes #N` or `Fixes #N`

## Quality Bar Checklist ✅

**All applicable items must be checked before merging.**

- [ ] **Standards**: I have read `docs/contributors/quality-bar.md` and `docs/contributors/security-guardrails.md`.
- [ ] **Metadata**: The `SKILL.md` frontmatter is valid (checked with `npm run validate`).
- [ ] **Risk Label**: I have assigned the correct `risk:` tag (`none`, `safe`, `critical`, `offensive`, or `unknown` for legacy/unclassified content).
- [ ] **Triggers**: The "When to use" section is clear and specific.
- [ ] **Limitations**: The skill includes a `## Limitations` (or equivalent accepted constraints) section.
- [ ] **Security**: If this is an _offensive_ skill, I included the "Authorized Use Only" disclaimer.
- [ ] **Safety scan**: If this PR adds or modifies `SKILL.md` command guidance, remote/network examples, or token-like strings, I ran `npm run security:docs` (or equivalent hardening check) and addressed any findings.
- [ ] **Automated Skill Review**: If this PR changes `SKILL.md`, I checked the `skill-review` GitHub Actions result and addressed any actionable feedback.
- [ ] **Manual Logic Review**: If this PR changes `SKILL.md` or risky guidance, I manually reviewed the logic, safety, failure modes, and `risk:` label instead of relying on automated checks alone.
- [ ] **Local Test**: I have verified the skill works locally.
- [ ] **Repo Checks**: I ran `npm run validate:references` if my change affected docs, workflows, or infrastructure.
- [ ] **Source-Only PR**: I did not manually include generated registry artifacts (`CATALOG.md`, `skills_index.json`, `data/*.json`) in this PR.
- [ ] **Credits**: I have added the source credit in `README.md` (if applicable).
- [ ] **License provenance**: If this skill imports from an external `source_repo`, I have declared `license:` and `license_source:` in the frontmatter, or confirmed the upstream repo carries no restricting license.
- [ ] **Maintainer Edits**: I enabled **Allow edits from maintainers** on the PR.

## Screenshots (if applicable)
