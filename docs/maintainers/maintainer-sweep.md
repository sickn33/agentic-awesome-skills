# Maintainer sweep

`maintainer:sweep` is a single local command that replaces the usual first pass of a
merge batch: align with `origin/main`, skim repo health, list open PRs with required
check status, download advisory **CI `pr-evidence-<PR>`** artifacts when available,
optionally run Jev batch triage, dry-run `merge:batch` on CI-ready PRs, and print
**Next actions** hints (`inspect_first`, `wait_ci`, `merge_dry_run_ok`, etc.).

CI evidence is `untrusted_advisory` (see `docs/maintainers/pr-autonomy.md`). It avoids
re-running `npm run pr:evidence` locally when the artifact matches the PR head; privileged
merge still uses `merge:batch` on trusted `main`.

It does **not** merge PRs and does **not** satisfy skill review.

## Usage

```bash
npm run maintainer:sweep
```

JSON for scripting (includes per-phase `timings_ms`):

```bash
npm run maintainer:sweep -- --json
```

Skip expensive steps:

```bash
npm run maintainer:sweep -- --skip-jev --skip-merge-dry-run --skip-fetch
```

Compare against a naive sequential `gh` scan (timing only):

```bash
npm run maintainer:sweep -- --benchmark
```

## Flags

| Flag | Default | Purpose |
|------|---------|---------|
| `--max-prs` | 20 | Open PRs to scan |
| `--max-skills` | 5 | Jev API calls (via `maintainer:jev-batch`) |
| `--max-merge-dry-run` | 3 | `merge:batch --dry-run` on CI-ready PRs |
| `--skip-fetch` | off | Skip `git fetch origin` |
| `--skip-jev` | off | Skip Jev batch |
| `--skip-merge-dry-run` | off | Skip merge dry-runs |
| `--skip-ci-evidence` | off | Skip CI artifact download |
| `--max-ci-evidence` | 8 | Max PRs to fetch `pr-evidence-*` for |

## Suggested batch flow

1. `npm run maintainer:sweep`
2. Deep-read / Tessl / attestation only on Jev **Inspect first** and non-ready checks
3. `npm run merge:batch -- --prs … --reviewed-head <sha>` for accepted PRs
4. Wait for `automation/canonical-repo-state` once after the source batch

See also [`jev-hints.md`](jev-hints.md) and [`merge-batch.md`](merge-batch.md).
