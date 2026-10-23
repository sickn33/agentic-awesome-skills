# Flags and environment reference

This is the practical flag reference for the skill wrapper. For the historical
upstream help text, run:

```bash
bash scripts/generate.sh --upstream-help
```

## Skill wrapper options

| Option | Meaning |
| --- | --- |
| `DIR` / `--project DIR` | Project directory. Defaults to the current directory. |
| `--check-deps` | Check `bash`, `python3`, `click`, `PyYAML`, `Jinja2`, and the vendored runtime. Also reports optional tools. |
| `--upstream-help` | Executes the vendored `create-dockerfile.sh --help`. |
| `-V`, `--version` | Prints the skill and upstream snapshot versions. |
| `-h`, `--help` | Prints the skill wrapper help. |
| `--` | Forwards every remaining argument to the upstream wrapper unchanged. |

## Generator flags

| Flag | Writes | Notes |
| --- | --- | --- |
| *(none)* | `Dockerfile-1`, `Dockerfile-2` where supported, `.dockerignore*` | Full default run. May invoke Docker/hadolint verification. |
| `--dry-run` | Nothing | Detect and print. Use before touching an existing project. |
| `--no-dockerfile-2` | `Dockerfile-1` + `.dockerignore` | Selects the Python plugin for all 15 targets. Best path for config/YAML features. |
| `--fast` | Same as selected mode | Skips Docker build and hadolint checks. |
| `--compose` | Also `compose.yaml` | App plus detected backing services, with health-gated `depends_on`. |
| `--all` | One Dockerfile set per app | Monorepo mode. Cannot be combined with `--compose`. |
| `--check` | Nothing | Verifies `Dockerfile-1` still matches detection; exits nonzero on drift. Cannot be combined with `--dry-run`. |
| `--init` | `dockerfile.conf` | Writes a starter config from detection. |
| `--config FILE` | Selected output | Loads a specific Python configuration file instead of `dockerfile.yaml`. |
| `--no-config` | Selected output | Ignores configuration files and uses registry defaults. |
| `--validate-config` | Nothing | Validates configuration and stops. |
| `--print-config` | Nothing | Prints the resolved configuration as JSON. |
| `--explain KEY` | Nothing | Explains one resolved option and stops. Example: `defaults.port`. |

### Python-routed flags

`--config`, `--no-config`, `--validate-config`, `--print-config`, and
`--explain` are Python CLI features. Combine them with `--no-dockerfile-2` so
the upstream wrapper selects the Python route:

```bash
bash scripts/generate.sh --project ~/src/app --no-dockerfile-2 --fast \
  --config dockerfile.yaml --print-config
```

Bash-owned modes (`--compose`, `--check`, `--all`) use the legacy renderer and
do not interpret those YAML-inspection flags. For those modes, use
`dockerfile.conf` and environment variables.

## Configuration precedence

Lowest to highest:

1. built-in registry defaults
2. `vendor/config/defaults.yaml`
3. `dockerfile.conf` (legacy, only when no `dockerfile.yaml` exists)
4. `dockerfile.yaml` in the project
5. environment variables
6. CLI flags

The Python configuration loader is strict: unknown keys, duplicate keys, wrong
types, and out-of-range values fail before files are written.

Minimal `dockerfile.yaml`:

```yaml
defaults:
  port: 9100
  health: /ready
images:
  python: python:3.12.4-alpine
backing_services:
  postgres:
    image: postgres:16-alpine
```

## Environment variables

| Variable | Effect |
| --- | --- |
| `PORT` | Override detected application port. Must be 1-65535. |
| `HEALTH` | Health endpoint path. Must start with `/`. |
| `STOPSIGNAL` | Container stop signal (`SIGTERM` or a number). |
| `COMPOSE_BIND` | Host bind for Compose ports: `127.0.0.1` (default), `0.0.0.0`, `::1`, or `::`. |
| `EXTRA_COPY` | Extra `COPY` line(s) for the build. |
| `EXTRA_RUN` | Extra `RUN` line(s) for the build. |
| `EXTRA_DIRECTIVES` | Extra allowlisted directives. |
| `D2_ASSET_URL` | Full release URL template for Dockerfile-2; supports `$TAG` and `$ARCH_SUBSTR`. |
| `D2_ASSET_SHA_URL` | Checksum URL for Dockerfile-2; first field is the SHA-256. |
| `DFG_WRAPPER` | Internal: set by the wrapper so `--all` re-enters routing. Do not set manually. |
| `DOCKERFILE_GENERATOR_HOME` | Skill wrapper only: use an upstream checkout instead of `vendor/`. |

### `EXTRA_DIRECTIVES` allowlist

Allowed: `ADD`, `ONBUILD`, `SHELL`, `STOPSIGNAL`, `LABEL`, `ENV`, `ARG`,
`EXPOSE`, `VOLUME`, `WORKDIR`, `USER`, `HEALTHCHECK`.

Rejected because they have dedicated paths: `FROM`, `RUN`, `COPY`, `CMD`,
`ENTRYPOINT`. Use `EXTRA_COPY`, `EXTRA_RUN`, or let detection emit them.

`ADD` is never emitted automatically; `COPY` is preferred for reproducible
builds. `MAINTAINER` is deprecated; use OCI `LABEL` metadata.

## Examples

```bash
SKILL_DIR=/path/to/dockerfile-generator

# Preview a Python app
bash "$SKILL_DIR/scripts/generate.sh" --project ~/src/api --dry-run

# Dockerfile-1 only, no Docker checks
bash "$SKILL_DIR/scripts/generate.sh" --project ~/src/api \
  --no-dockerfile-2 --fast

# Full default output
bash "$SKILL_DIR/scripts/generate.sh" --project ~/src/api

# Compose with backing services
bash "$SKILL_DIR/scripts/generate.sh" --project ~/src/api --compose

# Verify an existing Dockerfile-1
bash "$SKILL_DIR/scripts/generate.sh" --project ~/src/api --check

# Monorepo
bash "$SKILL_DIR/scripts/generate.sh" --project ~/src/mono --all

# Config inspection without writing
bash "$SKILL_DIR/scripts/generate.sh" --project ~/src/api \
  --no-dockerfile-2 --print-config
```

## Exit behavior

The wrapper propagates the upstream exit code. `0` means success. A nonzero
exit means generation, validation, or `--check` failed; read stderr. The wrapper
also prints a `PASS` or `FAIL` line after the run. `--check` uses a nonzero exit
to indicate drift.
