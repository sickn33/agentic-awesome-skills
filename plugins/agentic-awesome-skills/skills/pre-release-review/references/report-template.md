# Pre-release Review Report Template

Use this template for the final report. Translate headings to the user's language if useful, but
keep the same sections, priority labels, conclusion values, and finding fields.

## Priority definitions

- `P0` - Block release. A production deploy is likely to fail, corrupt data, expose secrets, break
  compatibility, or require a missing manual action.
- `P1` - High risk, must confirm before release. Evidence suggests a production dependency,
  migration, config, cache, queue, asset, or service-order risk.
- `P2` - Medium risk or ambiguous gap. Not clearly blocking, but should be checked before release
  because the diff introduces uncertainty.
- `P3` - Low-risk note. Do not include P3 in the main report unless the user asks for a complete
  audit log.

## Conclusion values

- `BLOCKED` - At least one P0 finding exists.
- `NEEDS_CONFIRMATION` - No P0 was found, but one or more P1/P2 items need confirmation.
- `NO_BLOCKER_FOUND` - No P0-P2 finding or release confirmation item was found from available
  evidence. Neutral verification limits may still be listed separately.

## Findings versus Unable To Verify

- Put diff-linked production risks in `Findings`. Examples: a new env var whose production value
  cannot be verified, a schema change with unclear migration execution, or a new queue whose
  infrastructure is not confirmed.
- Any P1 or P2 finding means the conclusion is `NEEDS_CONFIRMATION` unless a P0 makes it `BLOCKED`.
- Put only neutral tool or access limits in `Unable To Verify`. Examples: remote PR access is
  unavailable, deployment platform access is unavailable, or owner inference failed without a
  specific release-critical change.
- If an access/tool limitation prevents confirmation of a release-critical diff change, promote it
  to a P1/P2 finding instead of leaving it only in `Unable To Verify`.

## Owner inference

- Prefer `git blame` on changed lines for the file and line that caused the finding.
- If blame is unavailable or misleading, use `git log --format="%h %an %s" -- <path>`.
- If several commits contributed to the same release risk, list all relevant author names.
- Mark owners as "inferred" and do not expose email addresses.
- If no owner can be inferred, write `Unknown (not inferable from local git evidence)`.

## Secret redaction

- Never print secret values, even partially, unless the value is already a harmless placeholder such
  as `example`, `changeme`, or `REDACTED`.
- Report secrets as: path, line, variable/key name, type, and redacted hint.
- Example: `config/prod.env:12` - `PAYMENT_API_KEY`, suspected API key, value redacted.
- Do not paste PEM blocks, JWTs, cookies, session IDs, private keys, passwords, certificates, or
  cloud credentials into the report.

## Final report shape

```markdown
# Production Release Readiness Review

## Scope
- Range: <base>..<head> | PR <number> | latest 5 commits fallback
- Current branch: <branch>
- Head commit: <hash>
- Compared from: <tag/hash/pr-base>
- Commit count: <count>
- Dirty worktree: <yes/no and short note>
- Commands used: <short list of read-only commands>

## Conclusion
`BLOCKED` | `NEEDS_CONFIRMATION` | `NO_BLOCKER_FOUND`

## Findings
| Priority | Module | Finding | Evidence | Inferred owner | Risk | Recommended action |
| --- | --- | --- | --- | --- | --- | --- |
| P0/P1/P2 | <area/service> | <short issue> | <file:line or commit/range> | <name(s) or unknown> | <why it matters> | <release action> |

## Deployment Order / Release Actions
- <Only include when relevant. State service order, migrations, queue/cache/resource actions, and compatibility constraints.>

## Unable To Verify
- <Tooling, auth, remote, production-config, or repository limits that prevent confirmation.>
```

## Finding writing rules

- Keep each finding actionable and short.
- Include only P0-P2 or explicit confirmation risks.
- Do not include clean categories like "database OK" or "security OK".
- Use evidence-driven wording: "schema changed but no migration file changed" is better than
  "maybe migration missing".
- If risk is ambiguous, say exactly what must be confirmed before release.
- If no findings exist, omit the `Findings` table and write:
  `No P0-P2 release blockers or confirmation items were found from the available repository evidence.`
