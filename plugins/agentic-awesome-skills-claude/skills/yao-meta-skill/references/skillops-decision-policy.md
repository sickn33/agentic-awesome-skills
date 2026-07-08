# SkillOps Decision Policy

Use this policy when turning explicit-source conversation evidence into SkillOps opportunities, proposals, or release work. The goal is to make repeated user signals actionable without letting automation write durable instructions, skills, scripts, or evals without review.

## Decision Order

1. Classify the signal as no action, report only, Memory, AGENTS.md, existing Skill patch, candidate Skill, script, eval, report, merge, split, or archive.
2. Prefer the smallest durable surface that fixes the repeated friction.
3. Require evidence for every write action.
4. Require a proposal or approval ledger entry before any source-file write.
5. Map every proposed change to at least one verification command.

## Score Bands

SkillOps opportunities use a `0-100` score. Scores are advisory and never bypass approval.

| Score | Decision |
| ---: | --- |
| `85-100` | Ready for approval review |
| `70-84` | Proposal review |
| `50-69` | Observe more evidence |
| `0-49` | Report only or no action |

High-risk items stay proposal-only even when their score is high.

## Action Mapping

| Pattern | Default Action | Durable Surface |
| --- | --- | --- |
| `language_default` | Patch existing skill | Report template or artifact doctrine |
| `report_ui` | Patch existing skill | Report renderer, artifact doctrine, visual test |
| `approval_safety` | AGENTS update | Governance guidance or approval policy |
| `delivery_format` | Patch existing skill | CLI output, README, generated summary copy |
| `evidence_testing` | Add eval | Focused regression, report-quality, or release gate |
| Unknown pattern | Report only | Manual review queue |

## Safety Rules

- Do not scan private logs implicitly; only use explicit user-supplied sources.
- Do not store raw conversation content in reports; use redacted excerpts and aggregate counts.
- Do not write source files from a daily report run.
- Do not count SkillOps reports as public world-class evidence.
- Do not treat planned work, draft submissions, or generated proposals as accepted evidence.

## Verification

Every implementation that changes this policy should run:

```bash
python3 tests/verify_skillops_opportunity.py
python3 tests/verify_daily_skillops.py
python3 tests/verify_yao_cli.py
```
