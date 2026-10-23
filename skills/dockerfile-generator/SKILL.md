---
name: dockerfile-generator
description: "Generate production-ready Dockerfiles, .dockerignore files, and optional compose.yaml for 15 languages. Use when containerizing an app, refreshing a Dockerfile, or adding a monorepo build."
category: devops
risk: critical
source: self
source_type: self
date_added: "2026-10-23"
author: rafaabou
tags: [docker, dockerfile, containers, devops, multi-stage, compose]
tools: [claude, codex, cursor, copilot, antigravity, devin, opencode, cline, kiro]
license: MIT
compatibility: "Requires bash 4.4+, python3 3.10+, and click, PyYAML, Jinja2. Docker and hadolint are optional. Writes project-local Dockerfile and .dockerignore files; inspect with --dry-run first."
metadata:
  author: rafaabou
  version: "1.0.0"
  upstream: "https://github.com/rafaabou/docker-file-generator"
  upstream-commit: "2c0fbaf"
---

# Dockerfile Generator

## Overview

Generate a Dockerfile from the project itself instead of starting from a blank
template. The bundled runtime detects the language, framework, package manager,
port, and health endpoint, then writes a multi-stage `Dockerfile-1` and, where
supported, a release-asset `Dockerfile-2`, plus the matching `.dockerignore`
files.

The skill is self-contained. It includes the pinned runtime, a portable installer
for nine agent layouts, fallback adapters, reference material, and a smoke suite.

## When to Use This Skill

Use this skill when the user asks to:

- containerize an application or add a Dockerfile
- create or refresh a production multi-stage build
- generate `compose.yaml` for an app and its backing services
- add Dockerfiles to a monorepo
- check whether an existing `Dockerfile-1` still matches the project
- work with Python, Go, Node.js/SPA, Rust, Java, Kotlin, Ruby, C#, PHP, Swift,
  Scala, Elixir, Clojure, or Haskell

Run the generator before hand-writing a Dockerfile. Inspect its output first,
then make deliberate project-specific edits only when the detected result needs
them.

## Do Not Use This Skill When

- The user only wants to review or harden an existing Dockerfile; use
  [docker-expert](../docker-expert/) instead.
- The task is operating an existing Compose stack; use
  [docker-compose](../docker-compose/) or [docker-management](../docker-management/).
- The target is Kubernetes, Helm, or a cloud container service rather than a
  Dockerfile build.
- The user needs a one-line snippet and does not want project detection or
  verification.

## Requirements

| Requirement | Needed for |
| --- | --- |
| `bash` 4.4+ | Wrapper and legacy renderer |
| `python3` 3.10+ | Python plugins and routing |
| `click`, `PyYAML`, `Jinja2` | Python runtime |
| `docker` + `hadolint` | Optional build/lint verification |
| `git` | Optional repository metadata |

Install the Python dependencies:

```bash
python3 -m pip install -r requirements.txt
```

On Debian/Ubuntu, distro packages also work:

```bash
sudo apt install python3-yaml python3-jinja2 python3-click
```

## How It Works

1. **Resolve the project.** Set `SKILL_DIR` to the directory containing this
   `SKILL.md`, then run `--project /path/to/app --dry-run`. The wrapper prints
   the resolved project path and the runtime it will use.
2. **Detect the build shape.** The runtime inspects project markers such as
   `go.mod`, `package.json`, `pyproject.toml`, `Cargo.toml`, and framework
   configuration. It selects a language target, package manager, port, and
   health endpoint.
3. **Generate files.** A normal run writes `Dockerfile-1`, `.dockerignore`, and
   `Dockerfile-2`/`.dockerignore-2` where supported. `--compose` also writes a
   `compose.yaml`; `--all` walks a monorepo one application at a time.
4. **Verify.** Inspect the generated files, run `hadolint` when available, run
   the project's build or tests, and use `--check` to confirm the generated
   Dockerfile still matches current detection.

The wrapper propagates the generator's exit code. A nonzero exit means
generation or verification failed; read stderr before retrying.

## Quick Start

Let `SKILL_DIR` be the directory containing this `SKILL.md`:

```bash
SKILL_DIR=/path/to/dockerfile-generator

# Preview, write nothing
bash "$SKILL_DIR/scripts/generate.sh" --project /path/to/app --dry-run

# Generate Dockerfile-1 only, skipping Docker/hadolint verification
bash "$SKILL_DIR/scripts/generate.sh" --project /path/to/app \
  --no-dockerfile-2 --fast

# Full default run (may also write Dockerfile-2)
bash "$SKILL_DIR/scripts/generate.sh" --project /path/to/app
```

- `--no-dockerfile-2` writes only `Dockerfile-1` and its `.dockerignore`.
- `--fast` skips Docker build and hadolint checks. Use it when Docker is
  unavailable or the user only wants files.
- Without `--fast`, the generator may run Docker/hadolint verification. That is
  slower and requires those tools.
- Without `--no-dockerfile-2`, the generator may also write `Dockerfile-2` and
  `.dockerignore-2`.

## Common Commands

| Goal | Command (after `--project /path/to/app`) |
| --- | --- |
| Preview without writing | `--dry-run` |
| Dockerfile-1 only | `--no-dockerfile-2 --fast` |
| Full generated output | no extra flags |
| Also write `compose.yaml` | `--compose` |
| Monorepo, one app at a time | `--all` |
| Verify Dockerfile-1 matches detection | `--check` |
| Create a starter `dockerfile.conf` | `--init` |
| Use a specific config file | `--config dockerfile.yaml` |
| Ignore all config files | `--no-config` |
| Validate configuration only | `--validate-config` |
| Print resolved config as JSON | `--print-config` |
| Explain one setting | `--explain defaults.port` |
| Show the upstream full help | `--upstream-help` |

`--all` cannot be combined with `--compose`; run `--compose` separately in each
application directory. `--dry-run` and `--check` cannot be combined.

## Configuration

The generator reads, in increasing precedence:

1. built-in registry defaults
2. the bundled `vendor/config/defaults.yaml`
3. `dockerfile.conf` (legacy, only when no `dockerfile.yaml` exists)
4. `dockerfile.yaml` in the project
5. environment variables
6. CLI flags

Common environment overrides:

```bash
PORT=8080 HEALTH=/ready STOPSIGNAL=SIGTERM COMPOSE_BIND=127.0.0.1 \
  bash "$SKILL_DIR/scripts/generate.sh" --project /path/to/app --fast
```

Other supported variables include `EXTRA_COPY`, `EXTRA_RUN`,
`EXTRA_DIRECTIVES`, `D2_ASSET_URL`, and `D2_ASSET_SHA_URL`. See
`references/FLAGS.md` for details.

## Examples

### Example 1: Python service

```bash
bash "$SKILL_DIR/scripts/generate.sh" --project ./services/api --dry-run
bash "$SKILL_DIR/scripts/generate.sh" --project ./services/api \
  --no-dockerfile-2 --fast
```

Inspect `services/api/Dockerfile-1`, confirm the Python base image, build
stages, exposed port, health check, and non-root runtime user, then run the
project's tests.

### Example 2: Node.js SPA with Compose

```bash
bash "$SKILL_DIR/scripts/generate.sh" --project ./web --compose --fast
```

This writes `Dockerfile-1`, `.dockerignore`, and `compose.yaml`. The default
Compose binding is `127.0.0.1`; change it only when remote access is
intentional.

### Example 3: Monorepo

```bash
bash "$SKILL_DIR/scripts/generate.sh" --project . --all --fast
```

The generator visits each detected application and writes its own files. Run
`--compose` separately in each application directory when needed.

### Example 4: Detect drift

```bash
bash "$SKILL_DIR/scripts/generate.sh" --project . --check
```

`--check` verifies detection output; it does not lint arbitrary hand edits.

## Output and Verification

A successful run normally writes:

- `Dockerfile-1` - builds from the project source
- `Dockerfile-2` - installs from a release/package registry, when supported
- `.dockerignore` or `.dockerignore-1` / `.dockerignore-2`
- `compose.yaml` only when `--compose` is used

After generation:

1. Inspect the files and confirm the base image, build stages, exposed port,
   health check, and runtime user are appropriate.
2. Check that no existing user files were overwritten unexpectedly.
3. Run `hadolint Dockerfile-1` if hadolint is available.
4. Run the project's build or tests when the environment allows it.
5. Use `--check` to confirm Dockerfile-1 still matches current detection.

## Best Practices

- Run `--dry-run` first and review the detection summary.
- Keep generated files in the project rather than in the skill directory.
- Prefer `--no-dockerfile-2 --fast` when Docker is unavailable or the user only
  wants a build file.
- Keep project-specific overrides in `dockerfile.yaml`, not in the vendored
  runtime.
- Run `hadolint` and the project's tests before treating a generated file as
  production-ready.
- Re-run `--check` after changing dependencies, build scripts, or runtime
  versions.

## Limitations

- Requires bash 4.4+ and Python 3.10+. Native Windows shells are not supported;
  use WSL.
- Detection covers 15 language/target families. Uncommon frameworks or custom
  build systems may need a `dockerfile.yaml` override or a hand-written
  Dockerfile.
- Docker build and hadolint verification are optional and are skipped with
  `--fast` or when the tools are unavailable.
- `--check` compares detection output, not arbitrary hand edits.
- `--all` cannot be combined with `--compose`; Compose generation is per
  application.
- The generator writes project-local files and can overwrite generated paths.
  It is not a sandbox and does not manage secrets or registry credentials.
- `Dockerfile-2` is not available for every language or target.

## Security & Safety Notes

- Run `git status` and `--dry-run` before generating in a repository that may
  already contain `Dockerfile-1`, `Dockerfile-2`, `.dockerignore*`, or
  `compose.yaml`. The generator can overwrite generated paths.
- Do not silently overwrite a user's hand-written Dockerfile. If one exists,
  show the diff or ask before replacing it.
- Do not add secrets, private registry credentials, or host-specific paths to
  generated files.
- Generated Compose files bind to `127.0.0.1` by default. Set
  `COMPOSE_BIND=0.0.0.0` only when remote access is intentional.
- Use `--fast` when Docker is unavailable, but tell the user that build and
  lint verification were skipped.
- Do not modify `vendor/`. It is a pinned runtime snapshot; update it only
  through a deliberate snapshot refresh with the package's `LICENSE` and
  `NOTICE`.

## Common Pitfalls

| Symptom | Cause | Fix |
| --- | --- | --- |
| Wrong language detected | Missing project marker | Add the expected marker (for example `go.mod` or `requirements.txt`) or use `dockerfile.yaml` |
| `Dockerfile-2` missing | Target does not support it | Use `--no-dockerfile-2` if Dockerfile-1 is enough |
| `--check` reports drift | Existing file no longer matches detection | Review the diff and regenerate, or keep the hand-written file with a documented reason |
| Docker verification fails | Docker unavailable or build context incomplete | Use `--fast`, or fix the Docker environment/context |
| Path with spaces fails | Unquoted path | Quote the path; the wrapper handles spaces |

## Troubleshooting

- **`python3` missing** - install Python 3.10 or newer.
- **Missing Python packages** - run
  `python3 -m pip install -r "$SKILL_DIR/requirements.txt"`.
- **Docker/hadolint unavailable** - use `--fast`; verification is skipped.
- **Wrong language detected** - add the expected marker file or use a
  `dockerfile.yaml` override; run `--dry-run` to inspect detection before
  writing.
- **Path with spaces** - quote the path; the wrapper handles spaces.
- **`--check` reports drift** - the existing Dockerfile-1 no longer matches
  detection. Review the diff and regenerate, or keep the hand-written file and
  document why.

More detail: `references/FLAGS.md`, `references/LANGUAGES.md`,
`references/TROUBLESHOOTING.md`, and `references/UPSTREAM.md`.

## Related Skills

- [docker-expert](../docker-expert/) - Dockerfile review, hardening, and optimization
- [docker-compose](../docker-compose/) - Compose file authoring and operations
- [docker-management](../docker-management/) - Docker runtime and resource management

## License

MIT. The package includes a pinned runtime snapshot distributed under the same
license; see `LICENSE` and `NOTICE` in this directory. The upstream repository
remains private and does not separately declare a license.
