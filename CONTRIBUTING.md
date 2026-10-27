# Contributing to Agentic Awesome Skills

Contribute a focused skill, correct an existing one, improve documentation, or report a reproducible problem. Small corrections can go directly to a PR; an issue is not required.

## Choose a contribution

| Change | What to explain |
| --- | --- |
| New skill | The concrete task, the gap compared with existing skills, and one usable example |
| Skill correction | The previous behavior, the corrected behavior, and how you checked it |
| Upstream update | The upstream repository and full commit, changed capabilities, local adaptations retained, and license notices |
| Documentation/tooling | The user-visible problem, resulting behavior, and relevant checks |

Search the catalog and open PRs first. Prefer extending an existing skill when it already covers the task. Discuss overlapping batches, shared dependencies and executable bundles before building a large contribution. Send independent changes in separate PRs; do not copy a shared core into multiple overlapping batches.

## Prepare your branch

Requirements: Node.js 22+, Git, Python 3 with PyYAML (see `tools/requirements.txt`). Fork the repository on GitHub, then:

```bash
git clone https://github.com/YOUR-USERNAME/agentic-awesome-skills.git
cd agentic-awesome-skills
git remote add upstream https://github.com/sickn33/agentic-awesome-skills.git
git fetch upstream main
git switch -c add-my-skill upstream/main
npm ci --ignore-scripts
python3 -m venv .venv
.venv/bin/python -m pip install -r tools/requirements.txt
export ANTIGRAVITY_PYTHON="$PWD/.venv/bin/python"
```

On Windows, use `.venv\Scripts\python.exe` for the environment's Python and set `$env:ANTIGRAVITY_PYTHON` to its absolute path in PowerShell. The repository Python runner uses `ANTIGRAVITY_PYTHON`; keep it set for the validation commands. If `upstream` already exists, verify it points to the official repository instead of adding it again.

For a new skill, copy the one canonical [skill template](docs/contributors/skill-template.md) to `skills/my-skill/SKILL.md`. Replace all placeholders. Read the [quality bar](docs/contributors/quality-bar.md) and [security guardrails](docs/contributors/security-guardrails.md).

## Files to include

Keep the contribution source-only and focused on `skills/<skill-id>/`. Preserve upstream authorship and notices. Original work uses `source: self` and `source_type: self`; external imports identify `source_repo`, `source_type`, `license` and `license_source`. A license URL does not replace a required retained notice: include the upstream `LICENSE` and applicable attribution/NOTICE material with the bundle. If the right to redistribute is unclear or no license is present, ask before importing; an absent license is not permission.

The normal fork intake accepts regular non-executable `SKILL.md` files, supported reference/resource/asset files, and bounded text `skills/<skill-id>/LICENSE` files. Exact supported paths, types and limits are enforced by the current preflight. **Scripts, executable files, symlinks, workflow changes and other restricted files need a maintainer review path.** Describe the complete bundle and its purpose in [Discussions Ideas](https://github.com/sickn33/agentic-awesome-skills/discussions/new?category=ideas) before submitting it. Maintainers decide whether to sponsor a protected owner PR or decline the bundle; the ordinary fork check cannot authorize it. Do not rename scripts as data to bypass intake.

Do not edit generated catalogs, plugin mirrors or contributor lists. See `tools/scripts/generated_files.js` for the exact classification; not every file in `data/` is generated. Tracked distribution snapshots refresh in protected release PRs and may intentionally lag source `main`.

## Check your contribution

While editing, use `npm run validate`, `npm run validate:references` and `npm run security:docs` for early feedback. These are repository checks, not proof that the skill works with an agent.

Commit source changes, refresh upstream, and run the complete contribution preflight against that explicit base:

```bash
git add skills/my-skill/
git commit -m "feat: add my-skill for a concrete task"
git fetch upstream main
npm run pr:preflight -- --contributor --base upstream/main --head HEAD
```

For an existing skill, stage its actual directory and use `fix:` or an appropriate commit subject. Keep unrelated edits out of the commit. The full preflight requires a clean checkout of the selected committed head; commit your corrections and rerun it. It checks the ordinary fork boundary, evaluates changed skill trees without executing their bundled files, and runs the component validation plan in an isolated checkout. Shared, policy and unknown changes receive the full plan.

For classification only while editing, add `--no-run`. For machine-readable results, add `--json`. **Classification only is not a passing complete preflight.** A local preview cannot grant fork workflow approval, consume maintainer exceptions without a real PR identity, or replace current CI and semantic review. Keep your checkout's tooling current; GitHub uses trusted base policy and may reject an older local preview.

The report separates corrections, evidence to provide and maintainer review. If a check fails, its output identifies the details. Fix author-actionable failures and push the correction. If a restriction requires maintainer action, explain the blocker instead of repeatedly pushing the same files.

## Describe what you actually tested

Use the default PR template and enable **Allow edits from maintainers** where GitHub supports it. Include:

- **Change evidence:** the new capability or before/after behavior; for additions, name nearby skills and explain the gap; for upstream updates, pin the full revision and list local differences.
- **Validation evidence:** commands and outcomes, plus the prompt/input, agent/tool version, expected result and observed result for any practical test. Redact private data. State untested behavior explicitly. Source inspection, an MCP handshake and structural validation are useful but distinct from an end-to-end task.
- **Source and operational boundaries:** origin, retained license notices, required accounts/connectors, external data sent, writes, known costs/limits, and any affiliation with the service. Mark irrelevant items as not applicable with a short reason.

For a typo, a small wording fix or documentation-only change, scale the evidence to the change; do not invent an agent test. Never run a paid, destructive or external write merely to fill the template. Explain what was safely checked and what remains untested.

CI runs `pr-policy`, `pr-evidence`, `source-validation` and `artifact-preview`, plus applicable review workflows. Read the **Contribution readiness** summary in Actions and the full failing job output. Preview/deployment authorization messages from third-party integrations are separate from skill correctness. A green metadata check does not establish semantic correctness. Tessl `manual-review-required` means a maintainer must review and attest the exact head; it is not a passed automated review.

Maintainers review complete skill trees, safety, correctness, provenance and limitations. Resolve ordinary submission defects before requesting that review. Small maintainer edits remain possible, but a submission needing substantive corrections returns to the author. Accepted PRs use the protected GitHub merge path and preserve attribution; if a policy restriction requires a replacement PR, maintainers explain the relationship and retain contributor credit.

## Issues, questions and proposals

Use the [issue forms](https://github.com/sickn33/agentic-awesome-skills/issues/new/choose) for reproducible bugs and concrete improvements. Include the affected skill/path, installed version or commit, host/tool, exact input, expected and observed behavior, and a redacted reproduction. A report against an older release should say whether current source was also inspected.

Use [Discussions](https://github.com/sickn33/agentic-awesome-skills/discussions) for setup questions, early ideas and bundle proposals. Report vulnerabilities through the [security policy](SECURITY.md), without public credentials or exploit details. Be respectful, disclose affiliations, and keep submissions useful to users rather than promotional listings.
