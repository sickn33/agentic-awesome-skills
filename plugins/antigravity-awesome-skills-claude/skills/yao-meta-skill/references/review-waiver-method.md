# Review Waiver Method

Review waivers make human risk acceptance explicit. They are not a way to hide problems; they are a local audit record for warning-level risks that the reviewer intentionally accepts for a bounded release window.

## When To Use

Use a waiver when:

- Review Studio shows a warning that is understood and intentionally accepted.
- The warning cannot be fixed before release without a worse tradeoff.
- A reviewer can name the reason, scope, evidence, and expiry date.

Do not use a waiver for blocker gates in v0. Blockers must be fixed before production, library, governed, or public readiness is claimed. In governed mode, missing or invalid high-permission approvals are blockers and should be fixed in `security/permission_policy.json`, not waived.

## Required Fields

Every waiver must include:

- `gate_key`: the Review Studio gate being accepted.
- `decision`: `accepted-risk`, `false-positive`, or `temporary-exception`.
- `reviewer`: the accountable human or team.
- `reason`: a concrete reason of at least 20 characters.
- `created_at`: ISO date.
- `expires_at`: ISO date.
- `evidence`: optional path or note that explains the decision.
- `scope`: default `current-release`.

## Gate Key Policy

The waiver ledger must track the Review Studio gate universe explicitly:

- `review_studio_gate_keys`: every gate Review Studio can render.
- `waiverable_gate_keys`: warning gates that may receive bounded human acceptance.
- `non_waivable_gate_keys`: gates that must not be accepted through a waiver.

When Review Studio adds or renames a gate, update the waiver gate policy and tests in the same change. `review-waivers` and `world-class-evidence` stay non-waivable: the first is the waiver mechanism itself, and the second can only be satisfied by accepted ledger evidence.

## Release Semantics

- Invalid waiver records block Review Studio.
- Expired waiver records stay visible and no longer cover warnings.
- Active waivers cover only the exact gate key they name.
- A warning without an active waiver remains visible as a warning.
- Raw user prompts, outputs, credentials, and private transcripts must not be stored in waiver reasons.

## Commands

Render or validate the ledger:

```bash
python3 scripts/render_review_waivers.py .
```

Add a bounded approval:

```bash
python3 scripts/yao.py review-waivers . \
  --add-waiver \
  --gate-key trust-report \
  --reviewer "Yao Team" \
  --reason "Network-capable scripts are documented and bounded for this release." \
  --expires-at 2026-09-30
```

For a non-governed release where `permission-gates` is only a warning, the same command can name `--gate-key permission-gates`. Governed releases must instead provide reviewer, scope, reason, expiry, evidence, and target-enforcement fields in `security/permission_policy.json`.

Review Studio reads `reports/review_waivers.json` and links to `reports/review_waivers.md`.

## Candidate Actions

The waiver report also surfaces current candidate actions from local evidence:

- waiverable warning candidates, such as an `output-lab` warning caused by pending reviewer decisions or missing provider-backed runs
- non-waivable boundaries, especially `world-class-evidence`, where pending ledger evidence cannot be converted into completion by a waiver

A waiver can make a bounded warning auditable for a release window. It cannot count as provider-backed evidence, human adjudication, native runtime enforcement, external telemetry, or public world-class readiness.
