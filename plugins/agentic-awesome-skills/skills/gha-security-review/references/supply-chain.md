> AAS import adaptation (2026-10-14): `UNTRUSTED_REMOTE_EXECUTION` is a non-operational marker for downloading an untrusted payload and executing it in a shell. Attack flows remain illustrative; original delivery strings are available in the pinned upstream source recorded in `UPSTREAM-NOTICE.md`.

# Supply Chain: Third-Party Actions

## Overview

GitHub Actions workflows depend on third-party actions referenced by `uses:`. If these actions are not pinned to immutable references (full commit SHAs), attackers can compromise them via tag mutation, account takeover, or fork-and-replace attacks.

**Recommended hardening:** pin all external actions and reusable workflows (including `actions/*` and `github/*`) to a full 40-character commit SHA. A first-party mutable tag is not an independently proven exploit, but remains mutable; distinguish hardening from a traced vulnerability. Local actions inherit the reviewed checkout.

---

## What Counts As Third-Party

| Source | Classification | Pinning finding? |
|--------|----------------|------------------|
| `actions/*` (GitHub official) | First-party | Hardening candidate — version tags remain mutable |
| `github/*` (GitHub org) | First-party | Hardening candidate — version tags remain mutable |
| Same-repo / vendored (`./.github/actions/...`) | Not third-party supply chain | **No** as supply-chain pinning (still review in pwn-request context) |
| Org-owned / internal first-party actions when reviewing that org's repos | First-party for that org | **No** unless the action is external to the org's trust boundary |
| External orgs (aws-actions, docker, tj-actions, community, unknown) | Third-party | **Yes** — pin to full SHA when privilege makes it relevant |

When org ownership is unclear, treat non-`actions/*` / non-`github/*` / non-local refs as third-party.

---

## Pinning: Tags vs. SHAs

### Reportable: Unpinned Third-Party Tags

```yaml
# REPORT when third-party and the job is privileged enough (see severity)
- uses: some-org/some-action@v1     # Tag — mutable third-party
- uses: tj-actions/changed-files@v44
- uses: docker/build-push-action@v6
- uses: some-org/some-action@main   # Branch — mutable
```

Tags are **mutable Git references**. The maintainer (or attacker with write access) can delete and recreate a tag pointing to a different commit. When the tag is updated, every workflow using that tag runs the new code.

### Safe: Third-Party SHA Pinning

```yaml
# SAFE for third-party: commit SHA is immutable
- uses: docker/build-push-action@263435318d21b8e681c14492fe198d362a7d2c83  # v6.18.0
- uses: aws-actions/configure-aws-credentials@e3dd6a429d7300a6a4c196c26e071d42e0343502  # v4.0.2
```

SHAs are **immutable** — once a commit exists, its SHA cannot change. Pin third-party actions to the full 40-character SHA and add a comment with the version for readability.

### Do Not Report: First-Party Version Tags

```yaml
# NOT a supply-chain pinning finding
- uses: actions/checkout@v4
- uses: actions/setup-node@v4
- uses: actions/upload-artifact@v4
- uses: github/codeql-action/analyze@v3
- uses: ./.github/actions/local-build
```

First-party tags are mutable too; report them as hardening unless a concrete exploit path warrants a finding. Same-repo or vendored actions are not third-party supply-chain findings (they can still be unsafe if loaded from a PR-controlled checkout — that is a pwn-request / trust-crossing issue, not pinning).

---

## Attack Vectors

### Tag Mutation Attack

1. Attacker compromises a popular **third-party** action's repository (phishing, leaked credentials, insider)
2. Deletes the `v1` tag
3. Creates a new `v1` tag pointing to a malicious commit
4. Every workflow using `@v1` now runs the attacker's code

This is not theoretical — CVE-2025-30066 (`tj-actions/changed-files`) and related incidents showed tag rewrites can leak secrets at scale.

### Account Takeover / Org Compromise

If a third-party action author's GitHub account is compromised:
- All actions under that account can be backdoored
- Version tags can be silently updated
- Users won't notice unless they're pinned to SHAs

### Fork-and-Replace

1. Original action author deletes their repository
2. Attacker creates a fork with the same `owner/repo` name
3. Existing workflows that reference `owner/repo@tag` now pull from the attacker's fork

### Actions That UNTRUSTED_REMOTE_EXECUTION at Runtime

Some actions download and execute external scripts at runtime:

```yaml
# Action's action.yml — RISKY even when SHA-pinned
runs:
  using: composite
  steps:
    - run: UNTRUSTED_REMOTE_EXECUTION
      shell: bash
```

Even if you pin the action to a SHA, the external URL can change. The action itself is immutable, but its runtime dependencies are not. Report this for **third-party** actions in privileged jobs; do not use it as a reason to demand SHA pins on first-party GitHub actions.

---

## Detection Patterns

```bash
# Find third-party action references (exclude first-party + local)
grep -rn "uses:" .github/workflows/ \
  | grep -v "#" \
  | grep -v "uses: \\.\\/" \
  | grep -v "actions/" \
  | grep -v "github/"

# Among third-party refs, find unpinned tags/branches (not full SHA)
grep -rn "uses:" .github/workflows/ \
  | grep -v "#" \
  | grep -v "uses: \\.\\/" \
  | grep -v "actions/" \
  | grep -v "github/" \
  | grep -v "@[0-9a-f]\\{40\\}"

# Find third-party actions pinned to branch names
grep -rn "uses:" .github/workflows/ \
  | grep -v "actions/\\|github/\\|\\./" \
  | grep -E "@(main|master|develop|latest)"
```

Do **not** treat every non-SHA `uses:` as a finding. Filter to third-party first, then assess job privilege.

---

## When To Report

Report mutable third-party actions only when job privilege makes compromise security-relevant.

| Shape | Severity |
|-------|----------|
| Mutable third-party ref in package publishing, release signing, protected-branch push, production deploy, or token-minting job | **High** / **Critical** (unknown org + `pull_request_target` / secrets → Critical) |
| Mutable third-party ref with secrets, OIDC, or non-trivial write-scoped `GITHUB_TOKEN` | **High** or **Medium** depending on blast radius |
| Pinned third-party action that downloads and executes mutable remote scripts in a privileged job | **Medium**, or **High** when the downloaded payload runs inside the privileged step |
| Mutable third-party ref in public read-only CI with no secrets and no write scopes | **No finding** unless adjacent to another traced workflow risk |
| Unpinned first-party `actions/*` / `github/*` version tags | **No finding** |
| Local / vendored action pinning | **No finding** as supply chain (review pwn-request separately) |

---

## Risk Assessment by Third-Party Source

Use this only after the ref is classified third-party and the job is privileged enough to report:

| Source | Risk | Action |
|--------|------|--------|
| Major orgs (aws-actions, google-github-actions, docker) | Medium | Pin to SHA |
| Popular community actions (1k+ stars) | Popularity is not security evidence | Pin to SHA, review source |
| Less-known actions (under 100 stars) | Popularity is not security evidence | Pin to SHA, review source carefully, consider vendoring |
| Unknown / single-maintainer | Requires evidence-based assessment | Vendor locally or replace with inline `run:` |

---

## The Fix: SHA Pin Third-Party Actions

```yaml
steps:
  # First-party tags shown schematically; use reviewed exact SHAs for reproducible privileged jobs
  - uses: actions/checkout@v4
  - uses: actions/setup-node@v4

  # Third-party: pin to SHA, comment with version for readability
  - uses: docker/build-push-action@263435318d21b8e681c14492fe198d362a7d2c83  # v6.18.0
  - uses: aws-actions/configure-aws-credentials@e3dd6a429d7300a6a4c196c26e071d42e0343502  # v4.0.2
```

### Automated Pinning

Tools that can pin and update **third-party** action SHAs:

- **Dependabot** — GitHub native, updates action SHAs
- **Renovate** — Can pin and update actions
- **StepSecurity Secure Workflows** — Can pin actions to SHAs (configure to match third-party-only policy if you do not want first-party pins)

### Vendoring Critical Actions

For high-security workflows, vendor the third-party action locally:

```yaml
# Instead of: uses: some-org/critical-action@v1
# Copy the action into your repo:
- uses: ./.github/actions/critical-action
```

---

## Severity Guidelines

| Pattern | Severity | Rationale |
|---------|----------|-----------|
| Unpinned third-party action from unknown org used in `pull_request_target` | **Critical** | Attacker could backdoor the action AND access secrets |
| Unpinned third-party action from known org in sensitive/privileged workflow | **High** | Tag mutation risk with secret exposure |
| Unpinned third-party action with limited privilege but real write/secret surface | **Medium** | Real supply-chain risk, bounded blast radius |
| Third-party action that curls external scripts at runtime in a privileged job | **High** | Even SHA-pinned actions can be compromised via external deps |
| Unpinned first-party `actions/*` / `github/*` | **Do not report** | Outside pinning policy |
| Local action (`./.github/actions/`) unpinned | **Do not report** as pinning | Controlled by repo; only risky in pwn-request context |

---

## Exploitation Scenario Template

```
ATTACK: Supply Chain via [unpinned third-party action / tag mutation / UNTRUSTED_REMOTE_EXECUTION]
ENTRY: Attacker compromises [third-party action repo / account / external URL]
PAYLOAD: Malicious code in [action.yml / downloaded script]
TRIGGER: Workflow [file:line] uses third-party [action@tag] without SHA pin
EXECUTION: Modified action runs with workflow permissions
IMPACT: [RCE with workflow permissions, secret theft, etc.]
```

---

## References

- [GitHub Docs: Security hardening — Using third-party actions](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions#using-third-party-actions)
- [GitHub Blog: Four tips to keep your GitHub Actions workflows secure](https://github.blog/security/supply-chain-security/four-tips-to-keep-your-github-actions-workflows-secure/)
