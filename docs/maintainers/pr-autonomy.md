# Pull Request Autonomy

This document describes the repository's staged path toward lower-maintenance pull-request handling. The first stage is evidence and routing, not automatic merge.

## Trust Model

Pull-request CI is unprivileged: it has read-only repository permissions and receives no repository secrets. Reports produced there are useful to contributors and maintainers, but they are explicitly advisory because the pull-request checkout can modify the reporting code itself.

Any privileged or local maintainer action must recompute its decision from trusted `main` code against immutable base and head object IDs. It must not consume the pull-request-generated decision artifact as authorization.

`merge:batch` therefore materializes the evaluator from the exact local `main` commit after proving that local `HEAD` equals `origin/main`. It runs that tracked-only evaluator in an isolated Python process; untracked workspace files, pull-request scripts, Python environment overrides, and uploaded artifacts are not part of the authorization path.

## Evidence Artifacts

The `pr-evidence` CI job produces:

- `preflight.json`: changed files, broad change categories, source-only policy state, and pull-request template state;
- `changed-skills.json`: before/after evidence for changed canonical skills, including audit findings, score, security flags, risk, provenance, and deterministic regression reasons;
- `decision-manifest.json`: a schema-versioned shadow routing recommendation.

The manifest always contains:

```json
{
  "schema_version": 1,
  "mode": "shadow",
  "untrusted_advisory": true,
  "route": "human_review"
}
```

The `untrusted_advisory` marker is intentional. No workflow, merge command, or future bot may treat the artifact as privileged authorization.

## Shadow Routes

- `block`: deterministic repository policy failed, such as a newly introduced changed-skill regression or a direct edit to generated artifacts.
- `human_review`: the change is valid enough to inspect, but it touches canonical skill content, sensitive paths, uncertain provenance/risk, or lacks semantic review.
- `eligible_for_later_automation`: deterministic evidence found no blocker and the change belongs to a low-risk class. In the current stage this remains advisory and does not enable auto-merge.

Every new or relocated skill and every canonical skill-content change requires maintainer review in v1. A `safe` risk label is not sufficient evidence for automatic merge.

## Fork Review States

The Skill Review workflow separates three outcomes:

- `review`: a semantic review actually ran using trusted base scripts;
- `manual-review-required`: repository secrets were unavailable to a fork, so a maintainer must review and attest to the exact head SHA;
- `missing-review-credentials`: an internal branch expected semantic-review credentials but none were configured, so the check fails closed.

A successful `manual-review-required` check means only that the requirement was recorded. It is not a successful semantic review.

## Maintainer Recalculation

`merge:batch` must bind workflow approval and human attestation to one full head SHA. Before approving a waiting fork run, it independently:

1. captures base and head object IDs;
2. fetches those objects without checking out pull-request code;
3. computes a complete NUL-delimited raw Git diff with full object IDs and modes;
4. rejects unsafe paths, modes, symlinks, gitlinks, executable files, unknown types, oversized blobs, incomplete metadata, or non-allowlisted workflows;
5. verifies workflow event, workflow identity, pull-request number, and head SHA;
6. recomputes changed-skill evidence over the exact merge-base-to-head record set and requires one-to-one coverage of every skill-content Git record;
7. rejects operational errors, malformed evidence, incomplete snapshots, score-component regressions, provenance identity regressions, or any other deterministic blocker;
8. re-reads both pull-request base and head before and after approval and immediately before merge.

A real merge also requires effective server-side protection for `main`: the four exact GitHub-Actions-owned checks (`pr-policy`, `pr-evidence`, `source-validation`, and `artifact-preview`), strict up-to-date enforcement, pull-request-only changes, administrator enforcement, no applicable ruleset bypass actors, and no merge queue. If that enforcement cannot be proven, `merge:batch` refuses non-dry-run operation. Base drift is never retried with stale evidence; the batch must be rerun from the new tuple. Pre-existing auto-merge state is rejected, and the immediate GitHub merge endpoint must return `merged: true` before post-merge work begins.

For canonical `SKILL.md` or allowlisted supporting skill-content changes, the maintainer supplies `--reviewed-head <full-sha>`. A stale, abbreviated, or mismatched SHA fails closed. The Skill Review check itself is required only for `SKILL.md` changes because that workflow is path-filtered; support-only changes still require the exact-SHA human attestation.

Deletions, copies, ambiguous moves, and all canonical skill-content changes remain manual-only in this stage even when deterministic evidence contains no regression. A passing ratchet is not semantic approval and never makes a skill eligible for automatic merge.

## Protected Canonical Sync

Generated artifacts and contributor credits no longer write directly to `main`. Push and scheduled maintenance workflows regenerate the repository state without persisted checkout credentials, reject any unmanaged drift, and maintain one bot PR from `automation/canonical-repo-state`.

Because GitHub suppresses ordinary workflow recursion for PRs created with `GITHUB_TOKEN`, the trusted writer explicitly dispatches the four required checks on the bot branch. That dispatch is accepted only on the exact branch, only for files declared by the generated-files contract, and only when rerunning `sync:repo-state` produces the exact full Git tree. A trusted waiter binds the open PR to its immutable head, verifies all four exact GitHub Actions checks, confirms that `main` remains protected and unchanged, performs an immediate exact-head squash merge, and explicitly dispatches main CI, Pages, and CodeQL. The detailed protection policy is configured and audited with maintainer credentials; the workflow token has no bypass around it.

## Later Phases

Each phase requires evidence from the previous phase before activation:

1. Observe shadow route accuracy and false-positive rates on real pull requests.
2. Move remaining release writers to protected release pull requests; canonical CI, hygiene, and contributor-sync writers already use the bot pull-request lane.
3. Keep `main` protected by stable app-bound checks and remove any newly introduced direct writer.
4. Add schema-validated fork-safe semantic review whose privileged code always comes from the protected base.
5. Build deterministic release-candidate pull requests with rendering separated from publication.
6. Add immutable upstream commit/path/hash provenance and a delta-based exception ledger.
7. Consider auto-merge only for empirically proven documentation or metadata classes. New skills, security-sensitive content, workflows, installers, releases, provenance exceptions, and policy changes remain human decisions.

Merge queue is not part of the current plan. The repository is personally owned, and its workflows do not currently support a `merge_group` event.
