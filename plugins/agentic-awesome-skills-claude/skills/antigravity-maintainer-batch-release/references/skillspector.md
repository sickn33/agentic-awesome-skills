# Advisory scanner interpretation

### SkillSpector advisory CI

Use the current `.github/workflows/skillspector-advisory.yml` and `tools/scripts/skillspector_advisory.py` as the implementation contract:

1. `evidence-ready` polls the exact head's checks for a `pr-evidence` result from GitHub Actions app ID `15368` associated with the same PR number. It makes up to 60 polls separated by 10 seconds, with a 12-minute job timeout. A failed evidence check or timeout means no scan ran. This workflow has only the `pull_request` trigger for `main`; it has no manual, push, or privileged trigger.
2. The advisory job checks out the PR's protected base with persisted Git credentials disabled, fetches the immutable PR head as data, and plans changed canonical `skills/<skill-id>/**` directories. A copy changes only its destination; a rename examines both roots. Plugin-only mirror changes are outside this scanner's canonical scope. Deleted roots without a `SKILL.md` are recorded as `deleted-or-no-skill`.
3. When the planned skill list is empty, installation and scanning are skipped. Inspect `manifest.json` first: an empty list with `errors` can mean an exceeded limit, not an empty or successful scan. A missing wrapper on the protected base produces the documented bootstrap skip. A green bootstrap or planning-only run is not proof that SkillSpector executed.
4. For planned skills, install NVIDIA SkillSpector v2.12.0 at immutable commit `c7958a3268d9498644b22edb75d0f051bbc8cbfc` using Python 3.12, `uv==0.8.22`, and `uv sync --frozen --no-dev`. Copy complete changed canonical trees from Git into private inert snapshots. Executable blobs are copied with mode `0600` and listed under `executable_git_blobs`; they are never invoked. Links, gitlinks, unsupported modes, and invalid paths are rejected. This scanner snapshot is separate from the deterministic evidence evaluator's stricter executable-file rejection.
5. Run `--no-llm` inside a Linux network namespace as the runner user, with a sanitized scanner environment and tracing disabled. Static mode alone does not guarantee offline behavior; the namespace also prevents OSV and other network requests. No contributed baseline or automatic suppression is applied.
6. Observe the implementation bounds: at most 50 changed skill roots, 1,000 files and 16 MiB per skill, 60 seconds per scanner invocation, a 600-second aggregate budget checked between skills, 8 MiB per JSON report, and a 15-minute advisory job timeout. Missing, malformed, oversized, timed-out, or unsupported inputs remain incomplete; never treat absent output as a clean scan.
7. Read the `skillspector-advisory-<PR_NUMBER>` artifact, retained for 14 days, and the scan-step outcome. The manifest's `head_sha` is the exact scanned head; `base_sha` is the resolved Git merge base. Compare those bindings before using the report. The job has `continue-on-error: true`, so its green overall result alone is not a scanner pass or safety certificate.

Interpret manifest states from the actual report, not from a workflow badge:

| State | Meaning and maintainer action |
| --- | --- |
| `dry-run` | Planning copied the tree but did not invoke the scanner. Look for the subsequent scan report. |
| `deleted-or-no-skill` | The head has no canonical `SKILL.md` at that root; no scan ran for it. |
| `reported` | Exit zero, execution successful, and analysis marked complete. Inspect `finding_count` and the full JSON; this is not merge approval or a general safety guarantee. |
| `partial` | Exit zero and execution successful, but analysis is incomplete. Inspect the report's limitations and coverage. |
| `scanner-nonzero` | Nonzero exit or unsuccessful execution. Inspect `exit_code`, `finding_count`, `execution_successful`, `analysis_complete`, and the full JSON: a nonzero exit may report findings rather than an operational failure. |
| `incomplete` | Snapshot rejection, timeout, malformed/missing output, or another caught operational error. Read the recorded error; do not infer a clean result. |

Review findings individually during the pilot. Missing `allowed-tools`, environment credentials sent to an API, low risk scores, and offensive educational examples require context and declared purpose. Do not bulk-accept a baseline or silently suppress reports. Any later suppression policy or blocking rule needs a separately reviewed workflow-contract change. The official skill-content review remains Tessl or exact-head maintainer attestation.

### SkillSpector triage calibration

Calibrate raw finding counts against the repository's own corpus shape before treating them as defect counts. A full static maintenance sweep prints thousands of findings, most of which are the scanner describing documentation, not the skill acting:

- Prose dominates. Roughly nine in ten findings sit in `SKILL.md`, README, and `references/**` prose. A security reference that documents `Ignore all previous instructions` or `.env` handling is describing an attack, not performing one. Triage the executable surface first: a finding in a shipped `.py`/`.js`/`.sh`/`.ts`, not in a `.md`, is the one worth a code review.
- `Credential Access` on a `.env`, `access_token`, or `keychain` token is usually configuration reading, and can even be a guard such as `--exclude='.env'`. Confirm intent by reading the line before treating it as privilege escalation.
- Offensive-by-design skills (pentest, exploit, privilege-escalation, reverse-engineering) match offensive patterns because that is their declared purpose and risk label. Do not count them as regressions or use their score to gate them.
- `partial` / incomplete analysis is the static-mode default, not a repository defect. It means at least one analyzer was degraded or a bounded parser hit its span limit.
- Bundled fixture trees (generated apps, benchmarks, `examples/**`, recorded sessions) inflate a skill's score with code the skill does not ship as guidance. Clean the packaging; do not patch fixture vulnerabilities.

When a real executable defect is confirmed, fix it in the source skill with the normal validation and PR path, and treat the scanner as advisory input. A near-total reduction in headline findings after calibration is expected and is not an unexplained gap.

The official skill-content review remains Tessl or exact-head maintainer attestation.

Evidence selection first identifies the newest exact-head upstream `ci.yml` run,
then its unique current-attempt `pr-evidence` job and GitHub Actions check. Lists
are paginated. Same-named metadata checks are not eligible. Live PR identity,
current attempt and newest-run selection must still match before scanning.
Failures are printed to the log and summary; no automatic retry of failed CI
or privileged completion-event trigger is introduced.
