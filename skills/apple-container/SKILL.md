---
name: apple-container
description: "Build, run, and manage OCI/Linux containers as lightweight per-container VMs on Apple-silicon macOS using Apple's open-source container CLI, no Docker daemon required."
category: devops
risk: unknown
source: https://github.com/sanjay3290/ai-skills/tree/main/skills/apple-container
source_repo: sanjay3290/ai-skills
source_type: community
date_added: "2026-07-09"
author: sanjay3290
tags: [macos, containers, oci, apple-silicon]
tools: [claude, cursor, gemini]
license: "Apache-2.0"
license_source: "https://github.com/sanjay3290/ai-skills/blob/main/LICENSE"
---

# Apple `container`

## When to Use

- Use when building, running, or managing OCI/Linux containers on Apple-silicon macOS with Apple's open-source `container` CLI
- Use when you want lightweight per-container VMs instead of a Docker daemon
- Use when translating Docker-style workflows (build, run, exec, logs, networking) to Apple's container tooling

Apple's `container` is an open-source CLI for building, running, and managing OCI/Linux
containers on Apple-silicon Macs. Each container runs inside its own lightweight virtual
machine (backed by the Containerization framework and the Virtualization API), so there is no
shared daemon like Docker — services run per-user via `launchd`. Images are standard OCI
artifacts, so they interoperate with Docker registries and other OCI tooling. The CLI is
deliberately Docker-like (`container run`, `container build`, and image ops under
`container image push`/`pull`), but it is a distinct tool: do not assume Docker command paths,
flags, defaults, or daemon behavior carry over (e.g. there is no `container images`/`push`/`pull`
top-level command — image verbs live under `container image`).

## Requirements

- **Apple silicon only** (M1 or later). Intel Macs are not supported.
- **macOS 26 (Tahoe) is the officially supported target.** The maintainers do not support
  older macOS and typically will not fix issues that can't be reproduced on 26. The binary
  still runs on **macOS 15 (Sequoia)** but with reduced networking: only the single default
  subnet is available, and the `container network` group and `--network` flag error out.
  macOS-26-gated features are called out throughout the reference files.
- **Version:** this skill documents the **1.0.0** release (the fullest feature set). The `machine`
  group, `container cp`, `container export`, `container prune`, `container image prune`,
  `container registry list`, and `container system version` were **added in 1.0.0** (not in 0.7.1)
  — features that postdate 0.7.1 are flagged *(1.0.0+)* in the reference files. Run `container --version` and
  `container <group> --help` to see what your installed build supports.
- Install by downloading the signed `.pkg` installer from the project's GitHub releases
  (`apple/container`) and running it. See `references/concepts.md` for the full
  requirements/compatibility matrix and how the VM-per-container model works.

## Setup

Install the signed package, then start the background services once:

1. **Download** the latest signed installer `.pkg` from the
   [GitHub releases page](https://github.com/apple/container/releases).
2. **Double-click** the downloaded package and follow the prompts, entering your admin
   password so it can place files under `/usr/local`. (There is no documented CLI `installer`
   invocation — installation is via the GUI package.)
3. **Start the services** and confirm they are healthy:

```bash
# Start the container services (container-apiserver + helpers via launchd). On first run it
# offers to install the default Linux kernel — accept it, or start non-interactively with
# `--disable-kernel-install` and add a kernel later via `container system kernel set`.
container system start

# Verify services are healthy
container system status
```

`container system start` must have run before any container/image/build command works — a
connection/XPC error almost always means the services are stopped, so run it again. Stop and
deregister the `launchd` services with `container system stop` (which takes only `-p/--prefix`).
The startup flags for `container system start` (`-a/--app-root`, `--install-root`, `--log-root`,
`--enable-kernel-install`/`--disable-kernel-install`, `--timeout`) are in
`references/configuration.md`.

**Upgrade / downgrade / uninstall** use helper scripts in `/usr/local/bin` (stop first with
`container system stop`): `update-container.sh` (add `-v <version>` to pin a version), and
`uninstall-container.sh -d` to remove user data or `-k` to keep it. Full recipes in
`references/workflows.md`.

## Command groups at a glance

Invoke everything as `container <group> <subcommand>`. Container-lifecycle verbs (`run`,
`create`, `start`, `stop`, `exec`, `logs`, `inspect`, `list`/`ls`, `delete`/`rm`, `kill`,
`stats`) and `build` are top-level; image operations like `push`, `pull`, and `tag` live
under `container image`. Run `container <group> --help` for exact flags, or read
`references/commands.md` for the exhaustive matrix.

| Group | What it does | Example |
|-------|--------------|---------|
| container lifecycle | Create, start, run, stop, exec, inspect, list, remove containers | `container run --rm -it docker.io/library/alpine sh` |
| build | Build an OCI image from a Dockerfile in the builder VM | `container build -t myapp:latest .` |
| image | List, tag, inspect, remove, load/save, prune local images; push/pull to registries | `container image ls` |
| registry | Authenticate (login/logout/list) to OCI registries | `container registry login ghcr.io` |
| system | Start/stop/status services, logs, disk usage (`df`), DNS, kernel, properties | `container system status` |
| network | Create/list/remove container networks (**macOS 26 only**) | `container network create mynet` |
| volume | Create/list/inspect/remove persistent volumes | `container volume create data` |
| builder | Manage the builder VM that runs `container build` (start/stop/status) | `container builder status` |
| machine *(1.0.0+)* | Persistent Linux "machine" environments (added in 1.0.0) | `container machine --help` |

Exact subcommand names, aliases, arguments, and flags for each group live in
`references/commands.md` — consult it before running an unfamiliar command rather than
guessing Docker-equivalent syntax.

## Navigating this skill

Read the reference file that matches the task; do not guess flags or behavior.

- **`references/commands.md`** — exhaustive CLI reference: every command group, subcommand,
  alias, argument, and flag. Read this to construct any concrete `container ...` invocation,
  or to confirm a flag exists before using it.
- **`references/concepts.md`** — architecture (VM-per-container, Containerization framework),
  system requirements and macOS 15 vs 26 differences, networking model, per-container IPs,
  security model, and a Docker-vs-`container` comparison. Read this to explain how or why
  something works, or when a Docker mental model gives the wrong answer.
- **`references/configuration.md`** — the system service, `config.toml` / property model,
  default kernel, DNS domains, default registry, builder resources, and machine settings.
  Read this to change defaults, tune CPU/memory, point at a private registry, or manage the
  kernel.
- **`references/workflows.md`** — copy-pasteable task recipes (run an image, build & push,
  wire up local DNS, mount a volume, expose ports) and troubleshooting for common failures.
  Read this first when the user wants to accomplish a concrete end-to-end task.

## Key rules

- **This is not Docker.** The CLI resembles Docker, but flags, defaults, and daemon behavior
  differ. Verify syntax in `references/commands.md` instead of assuming Docker equivalence.
- **Always ensure services are up first.** Run `container system start` (and confirm with
  `container system status`) before any container/image/build command; connection errors
  usually mean the services are stopped.
- **Images are standard OCI artifacts** and interoperate with Docker registries and other OCI
  tools. Image references that omit a registry default to `docker.io` (configurable via the
  `registry.domain` property — see `references/configuration.md`).
- **Each container gets its own IP address** on its network (one lightweight VM per
  container). There is no shared Docker bridge; reach a container directly by its IP, or set
  up a local DNS domain (`container system dns create ...`, admin required) for name-based
  access.
- **`container network` requires macOS 26.** On macOS 15 only the single default subnet is
  available and the network command group is unavailable — see `references/concepts.md`.
- **Use fully-qualified image references** when precision matters (e.g.
  `docker.io/library/alpine` rather than bare `alpine`) to avoid ambiguity about the source
  registry.
