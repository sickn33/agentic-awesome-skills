# Upstream runtime notes

This skill wraps **Docker File Generator**, a Bash/Python Dockerfile generator.
The skill itself is thin: it validates dependencies, resolves the project path,
and forwards flags to a pinned runtime snapshot in `vendor/`.

## Snapshot provenance

| Field | Value |
| --- | --- |
| Source | `https://github.com/rafaabou/docker-file-generator` |
| Commit | `2c0fbaf9bd9dc20883fb1b676e4f42f9cdda05b6` (`2c0fbaf`) |
| Snapshot date | 2026-10-23 |
| Runtime version | 0.1.0 |
| License | MIT for this packaged snapshot; upstream is private and has no separate license |

See `vendor/UPSTREAM.txt` for the precise file list and exclusions. The
snapshot is included for self-contained use and is MIT licensed as part of this
package. The upstream repository remains private and unlicensed. See
`../NOTICE`.

## Why vendor a snapshot?

The skill must work when the agent cannot reach GitHub, when the upstream
repository is private, and when the user has not cloned the generator. Vendoring
also pins behavior so the skill's smoke tests are reproducible.

The tradeoff is size and freshness: the snapshot includes the full Python
package and the 6,000-line legacy Bash renderer. Refresh it deliberately, not on
every run.

## Runtime architecture

- `vendor/create-dockerfile.sh` is the compatibility wrapper.
- For Dockerfile-1-only runs (`--no-dockerfile-2`, without `--compose`,
  `--check`, or `--all`), the wrapper asks the Python router which plugin should
  handle the project.
- All 15 targets have Python plugins for Dockerfile-1.
- Dockerfile-2, `--compose`, `--check`, `--all`, and `--help` are owned by
  `vendor/legacy/create-dockerfile-legacy.sh`.
- If Python is missing, the plugin cannot claim the project, or a plugin fails,
  the wrapper falls back to the Bash renderer. Generation should still succeed.
- `vendor/config/defaults.yaml` is a generated mirror of the Python registry
  defaults. The Python package also has the defaults built in; the file is kept
  for parity and documentational value.

## Refresh procedure

Only do this when you intend to update the pinned runtime:

1. Check out the desired upstream commit.
2. Run the upstream test suite and confirm the intended behavior:
   ```bash
   bash ./all/dockerfile-tests/run-all.sh
   python3 -m pytest tests -q
   ```
3. Copy the runtime files into `vendor/`, excluding caches:
   ```bash
   cp create-dockerfile.sh vendor/
   cp -a docker_file_generator vendor/
   cp -a legacy vendor/
   cp -a config vendor/
   find vendor -type d -name __pycache__ -prune -exec rm -rf {} +
   find vendor -type f \( -name '*.pyc' -o -name '*.pyo' \) -delete
   ```
4. Update `vendor/UPSTREAM.txt` and the metadata in `SKILL.md` and
   `scripts/generate.sh` (`UPSTREAM_COMMIT`).
5. Run `bash tests/smoke.sh` and inspect the fixture outputs.
6. Keep the package's `LICENSE` and `NOTICE` with the refreshed snapshot.

Do not edit vendored files in place. Keep skill-specific changes in `scripts/`,
`adapters/`, `references/`, or `tests/`.

## Compatibility contract

The Bash renderer is the compatibility baseline. The Python plugins are
verified against it for Dockerfile-1 output and console text in the upstream
repository's parity tests. A migrated language can be rolled back at any time:
the wrapper sends Bash-owned modes to the legacy renderer without requiring a
project configuration change.

The skill does not add automatic CI. If you later publish the package, keep any
workflow manual-only unless the maintainers explicitly ask for automatic runs.

## Upstream docs

The upstream repository contains a full `README.md`, `USER-GUIDE.md`, and
`docs/CONFIGURATION.md`. They are not vendored here to keep the skill focused.
The upstream help text is available through:

```bash
bash scripts/generate.sh --upstream-help
```
