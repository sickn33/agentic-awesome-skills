# `container` — Complete CLI Command Reference

Full command/flag reference for Apple's `container` CLI (repo `apple/container`), invoked as
`container ...` on Apple-silicon macOS. Flags, defaults, aliases, and behavior are taken from
the swift-argument-parser declarations in `Sources/ContainerCommands/` (source of truth) and
`docs/command-reference.md`; on conflicts the source wins.

Not Docker. The CLI is deliberately Docker-like, but flags, defaults, and daemon model differ —
do not assume Docker behavior carries over. Every container runs in its own lightweight VM;
there is no shared daemon (per-user `launchd` services). Registry lives under the **Image**
group, not top-level.

**Conventions used below:** a value of `—` in the Default column means "no default (unset /
optional)". "flag" in the Value column means a boolean switch (no argument). `[env: NAME]`
marks an environment-variable fallback. Command availability varies by macOS version — caveats
are called out inline.

**Version:** this reference tracks the **1.0.0** release. Items marked *(1.0.0+)* were added after
0.7.1 — namely `container cp`, `container export`, `container prune`, `container image prune`,
`container registry list`, `container system version`, and the whole `container machine` group (on
0.7.1 the `registry` group had only `login`/`logout`). Run `container <group> --help` to confirm
what your installed build supports.

---

## Table of Contents

- [Global](#global)
- [Container lifecycle](#container-lifecycle)
  - [run](#container-run) · [create](#container-create) · [exec](#container-exec) · [start](#container-start) · [stop](#container-stop) · [kill](#container-kill) · [delete / rm](#container-delete-rm) · [list / ls](#container-list-ls) · [logs](#container-logs) · [inspect](#container-inspect) · [stats](#container-stats) · [copy / cp](#container-copy-cp) · [export](#container-export) · [prune](#container-prune)
- [Images](#images)
  - [build](#container-build) · [image](#container-image-group) · [pull](#container-image-pull) · [push](#container-image-push) · [tag](#container-image-tag) · [save](#container-image-save) · [load](#container-image-load) · [inspect](#container-image-inspect) · [list / ls](#container-image-list-ls) · [delete / rm](#container-image-delete-rm) · [prune](#container-image-prune)
- [Registry](#registry)
  - [login](#container-registry-login) · [logout](#container-registry-logout) · [list / ls](#container-registry-list-ls)
- [Builder](#builder)
  - [start](#container-builder-start) · [status](#container-builder-status) · [stop](#container-builder-stop) · [delete / rm](#container-builder-delete-rm)
- [System](#system)
  - [start](#container-system-start) · [stop](#container-system-stop) · [status](#container-system-status) · [version](#container-system-version) · [logs](#container-system-logs) · [df](#container-system-df) · [dns](#container-system-dns) · [kernel set](#container-system-kernel-set) · [property list](#container-system-property-list-ls)
- [Network (macOS 26+)](#network-macos-26)
  - [create](#container-network-create) · [delete / rm](#container-network-delete-rm) · [list / ls](#container-network-list-ls) · [inspect](#container-network-inspect) · [prune](#container-network-prune)
- [Volume](#volume)
  - [create](#container-volume-create) · [delete / rm](#container-volume-delete-rm) · [list / ls](#container-volume-list-ls) · [inspect](#container-volume-inspect) · [prune](#container-volume-prune)
- [Machine](#machine)
  - [create](#container-machine-create) · [run](#container-machine-run) · [set](#container-machine-set) · [set-default](#container-machine-set-default) · [list / ls](#container-machine-list-ls) · [inspect](#container-machine-inspect) · [logs](#container-machine-logs) · [stop](#container-machine-stop) · [delete / rm](#container-machine-delete-rm)

---

## Global

Root command: `container` — "A container platform for macOS".

```bash
container [--debug] [--version] [-h|--help] <command> [<args> ...]
```

| Flag | Value | Default | Description |
|------|-------|---------|-------------|
| `--debug` | flag | `false` | Enable debug output. Applies to every command (composed via `Flags.Logging`). `[env: CONTAINER_DEBUG]` — setting the env var (any value) also enables debug. |
| `--version` | flag | — | Print CLI version (`container CLI version …`) and exit. |
| `-h, --help` | flag | — | Show help. On the bare root command, help is augmented with a `PLUGINS:` section. |

Notes:
- **There is no global `-d` short flag.** `--debug` is long-only. `-d` is `--detach` on `run`/`create`/`exec`/`machine run`.
- `--debug` is accepted on essentially every subcommand (each command composes `Flags.Logging`), so it is omitted from the per-command tables below unless useful.
- The CLI refuses to run under Rosetta translation (it exits with an error telling you to disable Rosetta in your terminal). Apple silicon only.
- Most commands talk to the background API server. If it is not running you get an "XPC connection error" hint: *"Ensure container system service has been started with `container system start`."* Run `container system start` first.

### Command groups

Top-level help organizes subcommands into groups: **Container** (lifecycle), **Image**
(`build`, `image`, `registry`), **Machine**, **Volume**, and **Other** (`builder`,
`network`, `system`). Group aliases:

| Group | Alias | Note |
|-------|-------|------|
| `container image` | `i` | The plural `images` is only the help section header, not a command (`container images` errors with "plugin not found"). |
| `container registry` | `r` | Nested under the Image group. |
| `container machine` | `m` | |
| `container volume` | `v` | |
| `container network` | `n` | **macOS 26+ only** (absent on macOS 15). |
| `container system` | `s` | |
| `container builder` | (none) | |

### Plugin passthrough

If the first argument is not a recognized subcommand (and does not start with `-`), the CLI
treats it as a **plugin invocation**: it looks for an executable named `container-<arg>` and
`execvp`s into it, passing through all remaining arguments.

- Plugin search directories (in order): the user plugins dir under the install root, the app
  bundle's `plugins/`, and `<install-root>/libexec/container/plugins/`. Only plugins whose
  config declares `isCLI` are eligible.
- Requires the system services to be running (the plugin loader queries the API server). If
  they are not, you get: *"Plugins are unavailable. Start the container system services and
  retry: `container system start`."*
- If no matching plugin is found: *"Plugin 'container-<arg>' not found."* with the searched
  paths listed.
- An unknown token starting with `-` yields *"unknown option '…'"*; an empty token yields
  *"unknown argument '…'"*.
- Before exec, `SIGINT`/`SIGTERM` handlers are reset to default so the plugin manages its own signals.

```bash
container myplugin --flag arg     # execs container-myplugin --flag arg
```

---

## Container lifecycle

The following flag groups are shared (composed via `@OptionGroup`) across `run`, `create`,
and — for the process subset — `exec`. They are defined once here and referenced by name.

**Process options** (`run`, `create`, `exec`):

| Flag | Value | Default | Description |
|------|-------|---------|-------------|
| `-e, --env` | `<key=value>` | — | Set env var. `key=value`, or bare `key` to inherit from host. Repeatable. |
| `--env-file` | `<path>` | — | Read env vars from a file (`key=value`; ignores `#` comments and blank lines). Repeatable. |
| `--gid` | `<gid>` | — | Group ID for the process. |
| `-i, --interactive` | flag | `false` | Keep stdin open even if not attached. |
| `-t, --tty` | flag | `false` | Open a TTY for the process. |
| `-u, --user` | `<user>` | — | User for the process (format `name` \| `uid[:gid]`). |
| `--uid` | `<uid>` | — | User ID for the process. |
| `-w, --workdir, --cwd` | `<dir>` | — | Initial working directory inside the container. (`-w`, `--workdir`, and `--cwd` are all accepted.) |
| `--ulimit` | `<type>=<soft>[:<hard>]` | — | Resource limit (`RLIMIT_*`, e.g. `nofile=1024:2048`). Repeatable. Part of the shared Process group, so it also parses on `exec`. |

**Resource options** (`run`, `create`):

| Flag | Value | Default | Description |
|------|-------|---------|-------------|
| `-c, --cpus` | `<n>` | — | Number of CPUs to allocate. |
| `-m, --memory` | `<size>` | — | Memory (1 MiB granularity); optional `K`/`M`/`G`/`T`/`P` suffix. |

**Management options** (`run`, `create`):

| Flag | Value | Default | Description |
|------|-------|---------|-------------|
| `-a, --arch` | `<arch>` | host arch (e.g. `arm64`) | Arch to use if the image is multi-arch. |
| `--cap-add` | `<cap>` | — | Add a Linux capability (`CAP_NET_RAW`, `NET_RAW`, or `ALL`). Repeatable. |
| `--cap-drop` | `<cap>` | — | Drop a Linux capability. Repeatable. |
| `--cidfile` | `<path>` | `""` | Write the container ID to this path. |
| `-d, --detach` | flag | `false` | Run detached from the process. |
| `--dns` | `<ip>` | — | DNS nameserver IP. Repeatable. |
| `--dns-domain` | `<domain>` | — | Default DNS domain. |
| `--dns-option` | `<option>` | — | DNS option. Repeatable. |
| `--dns-search` | `<domain>` | — | DNS search domain. Repeatable. |
| `--entrypoint` | `<cmd>` | — | Override the image entrypoint. |
| `--init` | flag | `false` | Run an init process that forwards signals and reaps zombies. |
| `--init-image` | `<image>` | — | Custom init image (customize boot-time behavior: VM daemons, eBPF filters, debugging init). |
| `-k, --kernel` | `<path>` | — | Custom kernel path (resolved to an absolute path). |
| `-l, --label` | `<key=value>` | — | Add a label. Repeatable. |
| `--mount` | `<spec>` | — | Add a mount (`type=<>,source=<>,target=<>,readonly`). Repeatable. |
| `--name` | `<name>` | — | Use this name as the container ID (auto-generated otherwise). |
| `--network` | `<spec>` | — | Attach to a network (`<name>[,mac=XX:XX:XX:XX:XX:XX][,mtu=VALUE]`). Repeatable. |
| `--no-dns` | flag | `false` | Do not configure DNS. Conflicts with any `--dns*` flag (validation error). |
| `--os` | `<os>` | `linux` | OS to use if the image is multi-OS. |
| `-p, --publish` | `<spec>` | — | Publish a port (`[host-ip:]host-port:container-port[/protocol]`). Repeatable. |
| `--platform` | `<platform>` | — | Platform for multi-platform images (`os/arch[/variant]`). Takes precedence over `--os`/`--arch`. `[env: CONTAINER_DEFAULT_PLATFORM]` |
| `--publish-socket` | `<spec>` | — | Publish a socket (`host_path:container_path`). Repeatable. |
| `--read-only` | flag | `false` | Mount the root filesystem read-only. |
| `--rm, --remove` | flag | `false` | Remove the container after it stops. |
| `--rosetta` | flag | `false` | Enable Rosetta in the container. |
| `--runtime` | `<handler>` | — | Runtime handler (default: `container-runtime-linux`). |
| `--ssh` | flag | `false` | Forward the SSH agent socket into the container. |
| `--shm-size` | `<size>` | — | Size of `/dev/shm` (e.g. `64M`, `1G`). |
| `--tmpfs` | `<path>` | — | Add a tmpfs mount at the given path. Repeatable. |
| `-v, --volume` | `<spec>` | — | Bind-mount a volume. Repeatable. |
| `--virtualization` | flag | `false` | Expose virtualization capabilities (requires host and guest support). |

**Registry options** (`run`, `create`):

| Flag | Value | Default | Description |
|------|-------|---------|-------------|
| `--scheme` | `http\|https\|auto` | `auto` | Scheme for registry connections. `auto` picks `http` for loopback / RFC-1918 / internal-DNS-domain hosts, else `https`. |

**Progress options** (`run`, `create`): `--progress <auto\|none\|ansi\|plain\|color>` (default `auto`).

**Image-fetch options** (`run`, `create`): `--max-concurrent-downloads <n>` (default `3`).

---

### `container run`

Run a container from an image. If a command is given, it runs inside the container; otherwise
the image's default command runs. Foreground by default; stdin stays closed unless `-i`.

```bash
container run [<options>] <image> [<arguments> ...]
```

**Arguments:** `<image>` (image name, required) · `<arguments>` (init-process args, captured for passthrough — everything after the image is forwarded verbatim).

**Options:** all Process + Resource + Management + Registry + Progress + Image-fetch groups above.

```bash
# interactive shell
container run -it ubuntu:latest /bin/bash
# detached web server with a name and a published port
container run -d --name web -p 8080:80 nginx:latest
# env + resource limits
container run -e NODE_ENV=production --cpus 2 --memory 1G node:18
# fixed MAC on the default network
container run --network default,mac=02:42:ac:11:00:02 ubuntu:latest
# reap zombies / forward signals
container run --init ubuntu:latest my-app
```

Notes: on non-detached, non-TTY runs, pressing Ctrl-C 3× force-exits. `--rm` removes the
container after it exits. On error the partially-created container is deleted.

---

### `container create`

Create a container from an image **without starting it**. Same Process/Resource/Management/
Registry/Progress/Image-fetch flags as `run`; the container is left stopped.

```bash
container create [<options>] <image> [<arguments> ...]
```

**Arguments:** `<image>` (required) · `<arguments>` (init-process args, passthrough).

**Options:** identical to [`container run`](#container-run).

```bash
container create --name web -p 8080:80 nginx:latest
container start web
```

---

### `container exec`

Run a command inside a **running** container. Uses the Process options group.

```bash
container exec [-d] [<process options>] <container-id> <arguments> ...
```

**Arguments:** `<container-id>` (required) · `<arguments>` (new process args, passthrough — first arg is the executable).

| Flag | Value | Default | Description |
|------|-------|---------|-------------|
| `-d, --detach` | flag | `false` | Run the process and detach from it. |

Plus the **full** Process options group (`-e/--env`, `--env-file`, `--gid`, `-i/--interactive`,
`-t/--tty`, `-u/--user`, `--uid`, `-w/--workdir/--cwd`, `--ulimit`) — `exec` composes the same
`Flags.Process` group as `run`/`create`, so all of these are accepted on `exec` too.

```bash
container exec -it web /bin/sh
container exec -e DEBUG=1 -u root web env
```

---

### `container start`

Start a stopped container. Optionally attach to its output and keep stdin open.

```bash
container start [-a] [-i] <container-id>
```

**Arguments:** `<container-id>` (required).

| Flag | Value | Default | Description |
|------|-------|---------|-------------|
| `-a, --attach` | flag | `false` | Attach stdout/stderr. |
| `-i, --interactive` | flag | `false` | Attach stdin. |

If neither `-a` nor `-i` is given, the container runs detached.

```bash
container start web
container start -ai mybox
```

---

### `container stop`

Gracefully stop running containers by sending a signal, then `SIGKILL` after a timeout.

```bash
container stop [-a] [-s <signal>] [-t <time>] [<container-ids> ...]
```

**Arguments:** `<container-ids>` (zero or more; nothing is stopped without IDs unless `-a`).

| Flag | Value | Default | Description |
|------|-------|---------|-------------|
| `-a, --all` | flag | `false` | Stop all running containers. |
| `-s, --signal` | `<signal>` | `SIGTERM` (effective) | Signal to send. The CLI flag itself has no hard default — when omitted the server applies the graceful default (`SIGTERM`). |
| `-t, --time` | `<seconds>` | `5` | Seconds to wait before `SIGKILL`. |

Aliases: none.

```bash
container stop web
container stop -a
container stop -s SIGINT -t 10 web db
```

---

### `container kill`

Immediately signal (default `KILL`) running containers. No graceful shutdown — use with care.

```bash
container kill [-a] [-s <signal>] [<container-ids> ...]
```

**Arguments:** `<container-ids>` (zero or more; nothing killed without IDs unless `-a`).

| Flag | Value | Default | Description |
|------|-------|---------|-------------|
| `-a, --all` | flag | `false` | Kill/signal all running containers. |
| `-s, --signal` | `<signal>` | `KILL` | Signal to send. |

```bash
container kill web
container kill -s HUP -a
```

---

### `container delete (rm)`

Delete one or more containers. Running containers require `--force`.

```bash
container delete [-a] [-f] [<container-ids> ...]
container rm     [-a] [-f] [<container-ids> ...]
```

**Aliases:** `rm`. **Arguments:** `<container-ids>` (zero or more; nothing deleted without IDs unless `-a`).

| Flag | Value | Default | Description |
|------|-------|---------|-------------|
| `-a, --all` | flag | `false` | Delete all containers. |
| `-f, --force` | flag | `false` | Delete even if running. |

```bash
container delete web
container rm -f web
container rm --all
```

---

### `container list (ls)`

List containers. By default only running ones are shown.

```bash
container list [-a] [--format <format>] [-q]
container ls   [-a] [--format <format>] [-q]
```

**Aliases:** `ls`.

| Flag | Value | Default | Description |
|------|-------|---------|-------------|
| `-a, --all` | flag | `false` | Include non-running containers. |
| `--format` | `json\|table\|yaml\|toml` | `table` | Output format. |
| `-q, --quiet` | flag | `false` | Only output the container ID. |

```bash
container ls
container ls -a --format json
container ls -q
```

---

### `container logs`

Fetch a container's logs. Follow, tail, or view the boot log.

```bash
container logs [--boot] [-f] [-n <n>] <container-id>
```

**Arguments:** `<container-id>` (required).

| Flag | Value | Default | Description |
|------|-------|---------|-------------|
| `--boot` | flag | `false` | Show the boot log instead of stdio. |
| `-f, --follow` | flag | `false` | Follow log output. |
| `-n` | `<n>` | — (all) | Show the last `n` lines. `-n` is short-only (no `--lines`). Omit to print everything. |

```bash
container logs -f web
container logs -n 100 web
container logs --boot web
```

---

### `container inspect`

Print detailed container info as pretty JSON.

```bash
container inspect <container-ids> ...
```

**Arguments:** `<container-ids>` (one or more, required). Duplicates de-duplicated; a missing ID errors.

No options beyond global.

```bash
container inspect web
container inspect web db
```

---

### `container stats`

Real-time resource usage (CPU %, memory, net I/O, block I/O, PIDs). Interactive by default
(like `top`); `--no-stream` gives one snapshot.

```bash
container stats [--format <format>] [--no-stream] [<container-ids> ...]
```

**Arguments:** `<container-ids>` (optional; all running containers if omitted).

| Flag | Value | Default | Description |
|------|-------|---------|-------------|
| `--format` | `json\|table\|yaml\|toml` | `table` | Output format. Any non-`table` format implies a single snapshot. |
| `--no-stream` | flag | `false` | Single snapshot instead of streaming. |

```bash
container stats
container stats web db cache
container stats --no-stream web
container stats --format json --no-stream web
```

---

### `container copy (cp)`

> **⚠️ Requires 1.0.0+** (added after 0.7.1).

Copy files between a **running** container and the host. Exactly one side must be a container
reference `container_id:path`.

```bash
container copy <source> <destination>
container cp   <source> <destination>
```

**Aliases:** `cp`. **Arguments:** `<source>`, `<destination>` (each a local path or `container_id:path`).

No options beyond global.

```bash
container cp ./config.json web:/etc/app/
container cp web:/var/log/app.log ./logs/
```

---

### `container export`

> **⚠️ Requires 1.0.0+** (added after 0.7.1). The container **must be stopped** first, or it errors
> `invalidState: "container is not stopped"`.

Export a **stopped** container's filesystem as a tar archive. Streams to stdout if `-o` omitted.

```bash
container export [-o <output>] <container-id>
```

**Arguments:** `<container-id>` (required).

| Flag | Value | Default | Description |
|------|-------|---------|-------------|
| `-o, --output` | `<path>` | stdout | Pathname for the saved filesystem tar. |

```bash
container stop mybox
container export -o mybox.tar mybox
container export mybox > mybox.tar
```

---

### `container prune`

> **⚠️ Requires 1.0.0+** (added after 0.7.1). Removes all *stopped* containers — distinct from
> `container image prune` / `container volume prune`.

Remove **stopped** containers to reclaim disk space; prints the space freed.

```bash
container prune
```

No arguments, no options beyond global.

---

## Images

### `container build`

Build an OCI image from a local context using BuildKit (in an isolated builder container).
When `-f` is not given, looks for `Dockerfile`, then falls back to `Containerfile`.

```bash
container build [<options>] [<context-dir>]
```

**Arguments:** `<context-dir>` (default `.`).

| Flag | Value | Default | Description |
|------|-------|---------|-------------|
| `-a, --arch` | `<value>` | host arch (e.g. `arm64`) | Add an architecture to the build (comma-separated and/or repeatable). |
| `--build-arg` | `<key=val>` | — | Build-time variable. Repeatable. |
| `--cache-in` | `<value>` | — | (Hidden/advanced) BuildKit cache import. Repeatable. |
| `--cache-out` | `<value>` | — | (Hidden/advanced) BuildKit cache export. Repeatable. |
| `-c, --cpus` | `<n>` | `2` | CPUs for the builder container. |
| `--dns` | `<ip>` | — | DNS nameserver IP for the build. Repeatable. |
| `--dns-domain` | `<domain>` | — | Default DNS domain. |
| `--dns-option` | `<option>` | — | DNS option. Repeatable. |
| `--dns-search` | `<domain>` | — | DNS search domain. Repeatable. |
| `-f, --file` | `<path>` | `Dockerfile`→`Containerfile` | Path to the Dockerfile/Containerfile. |
| `-l, --label` | `<key=val>` | — | Set a label. Repeatable. |
| `-m, --memory` | `<size>` | `2048MB` | Builder container memory; optional `K`/`M`/`G`/`T`/`P` suffix. |
| `--no-cache` | flag | `false` | Do not use the build cache. |
| `-o, --output` | `<value>` | `type=oci` | Output config (`type=<oci\|tar\|local>[,dest=]`). |
| `--os` | `<value>` | `linux` | Add an OS to the build (comma-separated and/or repeatable). |
| `--platform` | `<platform>` | — | Add a platform (`os/arch[/variant]`); precedence over `--os`/`--arch`. `[env: CONTAINER_DEFAULT_PLATFORM]` |
| `--progress` | `auto\|plain\|tty` | `auto` | Build progress type. (Note the values differ from the pull/push progress set.) |
| `--pull` | flag | `false` | Pull the latest base image. |
| `-q, --quiet` | flag | `false` | Suppress build output. |
| `--secret` | `id=<key>,...` | — | Build secret (`id=<key>[,env=<ENV_VAR>\|,src=<local/path>]`). Repeatable. |
| `-t, --tag` | `<name>` | — | Name/tag for the built image. Repeatable. |
| `--target` | `<stage>` | `""` | Target build stage. |
| `--vsock-port` | `<port>` | `8088` | Builder shim vsock port. |

```bash
container build -t my-app:latest .
container build -f docker/Dockerfile.prod -t my-app:prod .
container build --build-arg NODE_VERSION=18 -t my-app .
container build --target production --no-cache -t my-app:prod .
container build -t my-app:latest -t my-app:v1.0.0 .
```

---

### `container image` group

Manage images. **Alias:** `i`. (The plural `images` is only the help section header, not a
command — `container images` errors with "plugin not found".)

```bash
container image <subcommand>
container i     <subcommand>
```

Subcommands: `pull`, `push`, `tag`, `save`, `load`, `inspect`, `list`/`ls`, `delete`/`rm`, `prune`.

---

### `container image pull`

Pull an image from a registry.

```bash
container image pull [--scheme <scheme>] [--progress <type>] [--max-concurrent-downloads <n>] [-a <arch>] [--os <os>] [--platform <platform>] <reference>
```

**Arguments:** `<reference>` (required).

| Flag | Value | Default | Description |
|------|-------|---------|-------------|
| `-a, --arch` | `<arch>` | — | Limit to the specified architecture. |
| `--os` | `<os>` | — | Limit to the specified OS. |
| `--platform` | `<platform>` | — | Limit to platform (`os/arch[/variant]`); precedence over `--os`/`--arch`. `[env: CONTAINER_DEFAULT_PLATFORM]` |
| `--scheme` | `http\|https\|auto` | `auto` | Registry connection scheme. |
| `--progress` | `auto\|none\|ansi\|plain\|color` | `auto` | Progress type. |
| `--max-concurrent-downloads` | `<n>` | `3` | Max concurrent blob downloads. |

```bash
container image pull docker.io/library/alpine:latest
container image pull --platform linux/arm64 ubuntu:24.04
container image pull --scheme http --max-concurrent-downloads 6 registry.local:5000/myapp:dev
```

---

### `container image push`

Push an image to a registry. Same as `pull` **minus** `--max-concurrent-downloads`.

```bash
container image push [--scheme <scheme>] [--progress <type>] [-a <arch>] [--os <os>] [--platform <platform>] <reference>
```

**Arguments:** `<reference>` (required).

| Flag | Value | Default | Description |
|------|-------|---------|-------------|
| `-a, --arch` | `<arch>` | — | Limit to architecture. |
| `--os` | `<os>` | — | Limit to OS. |
| `--platform` | `<platform>` | — | Limit to platform; precedence over `--os`/`--arch`. `[env: CONTAINER_DEFAULT_PLATFORM]` |
| `--scheme` | `http\|https\|auto` | `auto` | Registry connection scheme. |
| `--progress` | `auto\|none\|ansi\|plain\|color` | `auto` | Progress type. |

On success the final image reference is printed to stdout.

```bash
container image push registry.local:5000/myapp:1.0.0
container image push --platform linux/amd64 docker.io/me/tool:latest
```

---

### `container image tag`

Add a new reference to an existing image. Original reference is unchanged.

```bash
container image tag <source> <target>
```

**Arguments:** `<source>` (`image-name[:tag]`), `<target>` (new reference). No options beyond global. On success the normalized target is printed.

```bash
container image tag alpine:latest myregistry.local/alpine:pinned
container image tag ubuntu:24.04 ubuntu:lts
```

---

### `container image save`

Save one or more images as an OCI-compatible tar archive. Streams to **stdout** if `-o` omitted.

```bash
container image save [-a <arch>] [--os <os>] [-o <output>] [--platform <platform>] <references> ...
```

**Arguments:** `<references>` (one or more, required).

| Flag | Value | Default | Description |
|------|-------|---------|-------------|
| `-a, --arch` | `<arch>` | — | Architecture for the saved image. |
| `--os` | `<os>` | — | OS for the saved image. |
| `-o, --output` | `<path>` | stdout | Pathname for the saved tar (resolved to absolute). |
| `--platform` | `<platform>` | — | Platform (`os/arch[/variant]`); precedence over `--os`/`--arch`. `[env: CONTAINER_DEFAULT_PLATFORM]` |

Every reference must resolve; if a platform is resolved, each image must contain content for it
(else it errors listing available platforms). Without `-o`, the tar goes to stdout and the saved
reference list is written to stderr (so it doesn't corrupt the stream).

```bash
container image save -o images.tar alpine:latest ubuntu:24.04
container image save --platform linux/arm64 -o app-arm64.tar myapp:1.0
container image save alpine:latest > alpine.tar
```

---

### `container image load`

Load images from an OCI tar archive. Reads **stdin** if `-i` omitted.

```bash
container image load [-i <input>] [-f]
```

No positional arguments.

| Flag | Value | Default | Description |
|------|-------|---------|-------------|
| `-i, --input` | `<path>` | stdin | Path to the tar archive (resolved to absolute). |
| `-f, --force` | flag | `false` | Load even if the archive contains invalid member files. |

If `--input` names a missing file, the command logs an error and exits `1`. Loaded references
are printed to stdout; rejected members are warned.

```bash
container image load -i images.tar
container image load --force --input suspect-archive.tar
cat alpine.tar | container image load
```

---

### `container image inspect`

Print detailed image info as pretty JSON.

```bash
container image inspect <images> ...
```

**Arguments:** `<images>` (one or more, required). Duplicates de-duplicated; a missing image
errors. Infra images (builder / vminit) are filtered out. No options beyond global.

```bash
container image inspect alpine:latest
container image inspect alpine:latest ubuntu:24.04
```

---

### `container image list (ls)`

List local images. **Alias:** `ls`.

```bash
container image list [--format <format>] [-q] [-v]
container image ls   [--format <format>] [-q] [-v]
```

| Flag | Value | Default | Description |
|------|-------|---------|-------------|
| `--format` | `json\|table\|yaml\|toml` | `table` | Output format. |
| `-q, --quiet` | flag | `false` | Only output the image name. |
| `-v, --verbose` | flag | `false` | Verbose (one row per platform variant). |

`-q` and `-v` are mutually exclusive (error if both). Infra images are always hidden; results
sorted by reference. Verbose columns: `NAME`, `TAG`, `INDEX DIGEST`, `OS`, `ARCH`, `VARIANT`,
`FULL SIZE`, `CREATED`, `MANIFEST DIGEST`.

```bash
container image list
container image ls --format json
container image ls -q
container image list --verbose
```

---

### `container image delete (rm)`

Delete one or more images. **Alias:** `rm`.

```bash
container image delete [-a] [-f] [<images> ...]
container image rm     [-a] [-f] [<images> ...]
```

**Arguments:** `<images>` (zero or more).

| Flag | Value | Default | Description |
|------|-------|---------|-------------|
| `-a, --all` | flag | `false` | Delete all images. |
| `-f, --force` | flag | `false` | Ignore "not found" errors. |

Exactly one of explicit images **or** `--all` must be supplied (supplying both, or neither,
errors). Infra images skipped; orphaned blobs are GC'd afterward and reclaimed space is logged.

```bash
container image delete alpine:latest
container image rm --all
container image delete --force ghost:missing alpine:latest
```

---

### `container image prune`

> **⚠️ Requires 1.0.0+** (added after 0.7.1).

Remove unused images to reclaim space. Default removes only **dangling** (untagged) images;
`-a` removes every image not referenced by any container.

```bash
container image prune [-a]
```

| Flag | Value | Default | Description |
|------|-------|---------|-------------|
| `-a, --all` | flag | `false` | Remove all unused images, not just dangling ones. |

```bash
container image prune
container image prune --all
```

---

## Registry

Manage registry logins. **Group alias:** `r`. Nested under the Image group. Credentials are
stored in the macOS keychain.

> Note: source declares only `login`, `logout`, and `list`. There is **no** `registry default`
> get/set command in the current source (despite occasional mentions of "default registry"
> elsewhere — that concept lives in system configuration, not this group).

```bash
container registry <subcommand>
container r         <subcommand>
```

---

### `container registry login`

Authenticate with a registry; credentials are saved to the keychain for reuse.

```bash
container registry login [--scheme <scheme>] [--password-stdin] [-u <username>] <server>
```

**Arguments:** `<server>` (registry server name, required).

| Flag | Value | Default | Description |
|------|-------|---------|-------------|
| `--scheme` | `http\|https\|auto` | `auto` | Registry connection scheme. |
| `--password-stdin` | flag | `false` | Read the password from stdin. **Requires `--username`.** |
| `-u, --username` | `<username>` | `""` | Registry username. |

Behavior: `--password-stdin` without `--username` errors (*"must provide --username with
--password-stdin"*). With no username supplied, prompts interactively for username; with no
password, prompts interactively. On success it pings the registry (retrying on 5xx) and stores
the credentials, logging *"Login succeeded"*.

```bash
container registry login registry.example.com                 # prompts for user + password
container registry login -u alice ghcr.io                      # prompts for password only
echo "$TOKEN" | container registry login -u alice --password-stdin ghcr.io
container registry login --scheme http localhost:5000
```

---

### `container registry logout`

Log out, removing stored credentials for the registry.

```bash
container registry logout <registry>
```

**Arguments:** `<registry>` (required). No options beyond global.

```bash
container registry logout ghcr.io
container r logout registry.example.com
```

---

### `container registry list (ls)`

> **⚠️ Requires 1.0.0+** (added after 0.7.1). On 0.7.1 the `registry` group had only
> `login`/`logout`.

List saved registry logins. **Alias:** `ls`.

```bash
container registry list [--format <format>] [-q]
container r ls          [--format <format>] [-q]
```

| Flag | Value | Default | Description |
|------|-------|---------|-------------|
| `--format` | `json\|table\|yaml\|toml` | `table` | Output format. |
| `-q, --quiet` | flag | `false` | Only output the registry hostname. |

Table columns: `HOSTNAME`, `USERNAME`, `MODIFIED`, `CREATED` (ISO-8601 dates).

```bash
container registry list
container registry list --format json
container registry ls -q
```

---

## Builder

Manage the BuildKit-based builder container used by `container build`. **No group alias.**

```bash
container builder <subcommand>
```

Subcommands: `start`, `status`, `stop`, `delete`/`rm`.

---

### `container builder start`

Start the BuildKit builder container.

```bash
container builder start [-c <cpus>] [-m <memory>] [--dns <ip> ...] [--dns-domain <domain>] [--dns-option <option> ...] [--dns-search <domain> ...]
```

| Flag | Value | Default | Description |
|------|-------|---------|-------------|
| `-c, --cpus` | `<n>` | `2` | CPUs for the builder container. |
| `-m, --memory` | `<size>` | `2048MB` | Builder memory; optional `K`/`M`/`G`/`T`/`P` suffix. |
| `--dns` | `<ip>` | — | DNS nameserver IP. Repeatable. |
| `--dns-domain` | `<domain>` | — | Default DNS domain. |
| `--dns-option` | `<option>` | — | DNS option. Repeatable. |
| `--dns-search` | `<domain>` | — | DNS search domain. Repeatable. |

```bash
container builder start
container builder start -c 4 -m 4G
```

---

### `container builder status`

Show the builder's status.

```bash
container builder status [--format <format>] [-q]
```

| Flag | Value | Default | Description |
|------|-------|---------|-------------|
| `--format` | `json\|table\|yaml\|toml` | `table` | Output format. |
| `-q, --quiet` | flag | `false` | Only output the container ID. |

When the builder is not running, table output prints `builder is not running` (or empty with `-q`).

---

### `container builder stop`

Stop the builder container.

```bash
container builder stop
```

No arguments, no options beyond global.

---

### `container builder delete (rm)`

Delete the builder container. **Alias:** `rm`.

```bash
container builder delete [-f]
container builder rm     [-f]
```

| Flag | Value | Default | Description |
|------|-------|---------|-------------|
| `-f, --force` | flag | `false` | Delete even if the builder is running (else it errors: *"BuildKit container is not stopped, use --force to override"*). |

---

## System

Manage the `container` background services (apiserver + helpers), logs, disk usage, DNS
domains, the default kernel, and system properties. **Group alias:** `s`. macOS hosts only.

```bash
container system <subcommand>
container s       <subcommand>
```

Subcommands: `start`, `stop`, `status`, `version`, `logs`, `df`, `dns` (group), `kernel`
(group), `property` (group).

> A deeper guide to the `config.toml`/property schema, DNS, default-kernel selection, and data
> locations lives in `references/configuration.md`. This section documents the CLI surface.

---

### `container system start`

Start the container services (and optionally install a default kernel). Starts
`container-apiserver` and background services.

```bash
container system start [-a <app-root>] [--install-root <path>] [--log-root <path>] [--enable-kernel-install | --disable-kernel-install] [--timeout <seconds>]
```

| Flag | Value | Default | Description |
|------|-------|---------|-------------|
| `-a, --app-root` | `<path>` | app-data default | Root directory for application data. |
| `--install-root` | `<path>` | install default | Root directory for executables and plugins. |
| `--log-root` | `<path>` | (macOS log facility) | Root directory for log data. When set, services write only to files here (and `container system logs` shows nothing). Intended for short-term diagnostics: no aggregation, no rotation. |
| `--enable-kernel-install` / `--disable-kernel-install` | flag pair | prompt user | Whether to install the default kernel. Omit to be prompted interactively. |
| `--timeout` | `<seconds>` | system default | Seconds to wait for the API service to become responsive. |

```bash
container system start
container system start --enable-kernel-install
```

---

### `container system stop`

Stop the services and deregister them from launchd.

```bash
container system stop [-p <prefix>]
```

| Flag | Value | Default | Description |
|------|-------|---------|-------------|
| `-p, --prefix` | `<prefix>` | `com.apple.container.` | Launchd prefix for the services to stop. |

---

### `container system status`

Check whether the services are running (sends a health check to the API server).

```bash
container system status [-p <prefix>] [--format <format>]
```

| Flag | Value | Default | Description |
|------|-------|---------|-------------|
| `-p, --prefix` | `<prefix>` | `com.apple.container.` | Launchd prefix for the services. |
| `--format` | `json\|table\|yaml\|toml` | `table` | Output format. |

---

### `container system version`

> **⚠️ Requires 1.0.0+** (added after 0.7.1). The top-level `container --version` flag exists in
> all versions; only the `system version` subcommand is newer.

Show CLI and (if reachable) API-server version info.

```bash
container system version [--format <format>]
```

| Flag | Value | Default | Description |
|------|-------|---------|-------------|
| `--format` | `json\|table\|yaml\|toml` | `table` | Output format. |

Table columns: `COMPONENT`, `VERSION`, `BUILD`, `COMMIT`. A second row for
`container-apiserver` appears when the server answers the health check.

---

### `container system logs`

Show logs from the container services.

```bash
container system logs [-f] [--last <period>]
```

| Flag | Value | Default | Description |
|------|-------|---------|-------------|
| `-f, --follow` | flag | `false` | Follow log output. |
| `--last` | `<period>` | `5m` | Fetch logs from the given period ago. Format `<number>[m\|h\|d]` (bare number = seconds). |

If services were started with `--log-root`, they log only to files and this command shows nothing.

```bash
container system logs -f
container system logs --last 1h
```

---

### `container system df`

Show disk usage for images, containers, and volumes (total count, active count, size,
reclaimable).

```bash
container system df [--format <format>]
```

| Flag | Value | Default | Description |
|------|-------|---------|-------------|
| `--format` | `json\|table\|yaml\|toml` | `table` | Output format. |

---

### `container system dns`

Manage local DNS domains for containers. **Requires administrator privileges** (`sudo`) for
`create`/`delete`.

```bash
container system dns <create|delete|list>
```

#### `container system dns create`

```bash
sudo container system dns create [--localhost <ip>] <domain-name>
```

**Arguments:** `<domain-name>` (required).

| Flag | Value | Default | Description |
|------|-------|---------|-------------|
| `--localhost` | `<ip>` | — | IPv4 address to redirect to localhost. |

#### `container system dns delete (rm)`

```bash
sudo container system dns delete <domain-name>
sudo container system dns rm     <domain-name>
```

**Alias:** `rm`. **Arguments:** `<domain-name>` (required). No options beyond global.

#### `container system dns list (ls)`

```bash
container system dns list [--format <format>] [-q]
container system dns ls   [--format <format>] [-q]
```

**Alias:** `ls`.

| Flag | Value | Default | Description |
|------|-------|---------|-------------|
| `--format` | `json\|table\|yaml\|toml` | `table` | Output format. |
| `-q, --quiet` | flag | `false` | Only output the domain. |

---

### `container system kernel set`

Install or update the Linux kernel used by the container runtime.

```bash
container system kernel set [--arch <arch>] [--binary <path>] [--force] [--recommended] [--tar <tar>]
```

| Flag | Value | Default | Description |
|------|-------|---------|-------------|
| `--arch` | `amd64\|arm64` | `arm64` | Architecture of the kernel binary. |
| `--binary` | `<path>` | — | Path to the kernel file (or archive member if used with `--tar`). |
| `--force` | flag | `false` | Overwrite an existing kernel of the same name. |
| `--recommended` | flag | `false` | Download and install the recommended default kernel (takes precedence over all other flags). |
| `--tar` | `<tar>` | — | Filesystem path or remote URL to a tar archive containing a kernel file. |

```bash
container system kernel set --recommended
container system kernel set --binary ./vmlinux --arch arm64 --force
container system kernel set --tar https://example.com/kernel.tar --binary boot/vmlinux
```

---

### `container system property list (ls)`

List system properties with current values. **Alias:** `ls`.

```bash
container system property list [--format <format>]
container system property ls   [--format <format>]
```

| Flag | Value | Default | Description |
|------|-------|---------|-------------|
| `--format` | `json\|toml` | `toml` | Output format. Note: only `json`/`toml` here (not the full `ListFormat` set). |

```bash
container system property list
container system property list --format json
```

---

## Network (macOS 26+)

> **Availability:** the entire `container network` group requires **macOS 26 or later**. On
> macOS 15 the command group is absent and only a single default subnet is available.

Manage user-defined container networks. **Group alias:** `n`.

```bash
container network <subcommand>
container n        <subcommand>
```

Subcommands: `create`, `delete`/`rm`, `list`/`ls`, `inspect`, `prune`.

---

### `container network create`

Create a network.

```bash
container network create [--internal] [--label <label> ...] [--option <option> ...] [--plugin <plugin>] [--subnet <subnet>] [--subnet-v6 <subnet-v6>] <name>
```

**Arguments:** `<name>` (required).

| Flag | Value | Default | Description |
|------|-------|---------|-------------|
| `--internal` | flag | `false` | Restrict to a host-only network (NAT otherwise). |
| `--label` | `<key=value>` | — | Network metadata. Repeatable. |
| `--option` | `<key=value>` | — | Plugin-specific option. Repeatable. |
| `--plugin` | `<plugin>` | `container-network-vmnet` | Network plugin to use. |
| `--subnet` | `<cidr>` | — | IPv4 subnet (e.g. `192.168.100.0/24`). |
| `--subnet-v6` | `<cidr>` | — | IPv6 prefix (e.g. `fd00:1234::/64`). |

```bash
container network create mynet
container network create --subnet 192.168.100.0/24 mynet
container network create --internal isolated
```

---

### `container network delete (rm)`

Delete one or more networks. **Alias:** `rm`.

```bash
container network delete [-a] [<network-names> ...]
container network rm     [-a] [<network-names> ...]
```

**Arguments:** `<network-names>` (zero or more; nothing deleted without names unless `-a`).

| Flag | Value | Default | Description |
|------|-------|---------|-------------|
| `-a, --all` | flag | `false` | Delete all networks. |

```bash
container network delete mynet
container network rm net1 net2
container network delete --all
```

---

### `container network list (ls)`

List user-defined networks. **Alias:** `ls`.

```bash
container network list [--format <format>] [-q]
container network ls   [--format <format>] [-q]
```

| Flag | Value | Default | Description |
|------|-------|---------|-------------|
| `--format` | `json\|table\|yaml\|toml` | `table` | Output format. |
| `-q, --quiet` | flag | `false` | Only output the network name. |

---

### `container network inspect`

Print detailed info for one or more networks.

```bash
container network inspect <networks> ...
```

**Arguments:** `<networks>` (one or more, required). No options beyond global.

---

### `container network prune`

Remove networks not connected to any containers. Default and system networks are preserved.

```bash
container network prune
```

No arguments, no options beyond global.

---

## Volume

Manage persistent volumes. **Group alias:** `v`. Volumes may be created explicitly or
implicitly (`-v myvol:/path`, or `-v /path` for an anonymous volume).

```bash
container volume <subcommand>
container v       <subcommand>
```

Subcommands: `create`, `delete`/`rm`, `list`/`ls`, `inspect`, `prune`.

---

### `container volume create`

Create a named volume.

```bash
container volume create [--label <label> ...] [--opt <opt> ...] [-s <size>] <name>
```

**Arguments:** `<name>` (required).

| Flag | Value | Default | Description |
|------|-------|---------|-------------|
| `--label` | `<key=value>` | — | Volume metadata. Repeatable. |
| `--opt` | `<key=value>` | — | Driver-specific option. Repeatable. |
| `-s` | `<size>` | — | Volume size in bytes; optional `K`/`M`/`G`/`T`/`P` suffix. Takes precedence over `--opt size=`. |

**Driver options** (`--opt key=value`, default `local` driver):

- `size=<value>` — volume size (unit suffixes as above; min 1 MiB). Equivalent to `-s`; `-s` wins if both set.
- `journal=<mode>[:<size>]` — ext4 journaling. `<mode>` ∈ `ordered` (metadata only, data-before-metadata; kernel default), `writeback` (metadata only, no data ordering; fastest, least safe), `journal` (metadata + data; safest). Optional `:<size>` sets the journal size.

```bash
container volume create --opt journal=ordered myvol
container volume create --opt journal=writeback:64m myvol
container volume create --opt journal=journal --opt size=10g myvol
container volume create -s 5G data
```

**Anonymous volumes:** auto-created with `-v /path` or `--mount type=volume,dst=/path` (UUID
name `anon-…`). Unlike Docker, they do **not** auto-clean with `--rm` — delete manually.

```bash
container run -v /data alpine
VOL=$(container volume list -q | grep anon); container volume rm "$VOL"
```

---

### `container volume delete (rm)`

Delete one or more volumes. Volumes in use (by running or stopped containers) cannot be deleted.
**Alias:** `rm`.

```bash
container volume delete [-a] [<names> ...]
container volume rm     [-a] [<names> ...]
```

**Arguments:** `<names>` (zero or more; nothing deleted without names unless `-a`).

| Flag | Value | Default | Description |
|------|-------|---------|-------------|
| `-a, --all` | flag | `false` | Delete all volumes. |

```bash
container volume delete myvol
container volume delete vol1 vol2 vol3
container volume delete --all
```

---

### `container volume list (ls)`

List volumes. **Alias:** `ls`.

```bash
container volume list [--format <format>] [-q]
container volume ls   [--format <format>] [-q]
```

| Flag | Value | Default | Description |
|------|-------|---------|-------------|
| `--format` | `json\|table\|yaml\|toml` | `table` | Output format. |
| `-q, --quiet` | flag | `false` | Only output the volume name. |

---

### `container volume inspect`

Print detailed info for one or more volumes as JSON.

```bash
container volume inspect <names> ...
```

**Arguments:** `<names>` (one or more, required). No options beyond global.

---

### `container volume prune`

Remove all volumes with no container references; reports disk space reclaimed.

```bash
container volume prune
```

No arguments, no options beyond global.

---

## Machine

> **⚠️ Requires 1.0.0+** — the entire `container machine` group was added after 0.7.1. Verify with
> `container machine --help` on your install.

Manage container machines (the Linux VMs that host containers). **Group alias:** `m`.
Commands that take an optional machine ID use the **default** machine when omitted. Changes to
a running machine's config take effect after stop + restart.

```bash
container machine <subcommand>
container m        <subcommand>
```

Subcommands: `create`, `run`, `set`, `set-default`, `list`/`ls`, `inspect`, `logs`, `stop`, `delete`/`rm`.

---

### `container machine create`

Create a container machine from an image and boot it (unless `--no-boot`).

```bash
container machine create [<options>] <image>
```

**Arguments:** `<image>` (e.g. `alpine:3.22`, required).

| Flag | Value | Default | Description |
|------|-------|---------|-------------|
| `-n, --name` | `<name>` | — | Name for the machine. |
| `--set-default` | flag | `false` | Set this machine as the default. |
| `--no-boot` | flag | `false` | Create without booting. |
| `--cpus` | `<n>` | — | Number of virtual CPUs. |
| `--memory` | `<size>` | half of system memory | Memory allocation (e.g. `2G`, `8G`). |
| `--home-mount` | `ro\|rw\|none` | `rw` | How to mount the user's home directory. |
| `--virtualization` | flag | `false` | Enable nested virtualization. Requires Apple silicon M3+, macOS 15+, and a kernel with `CONFIG_KVM=y`. |
| `--kernel` | `<path>` | — | Path to a custom kernel binary (e.g. `vmlinux`). |
| `-a, --arch` | `<arch>` | host arch | Arch for a multi-arch image. |
| `--os` | `<os>` | `linux` | OS for a multi-OS image. |
| `--platform` | `<platform>` | — | Platform for a multi-platform image; precedence over `--os`/`--arch`. |
| `--scheme` | `http\|https\|auto` | `auto` | Registry connection scheme. |
| `--progress` | `auto\|none\|ansi\|plain\|color` | `auto` | Progress type. |
| `--max-concurrent-downloads` | `<n>` | `3` | Max concurrent blob downloads. |

```bash
container machine create alpine:3.22 --name my-machine
container machine create --cpus 4 --memory 8G --set-default alpine:3.22
container machine create --no-boot alpine:3.22
container machine create --virtualization --kernel ./vmlinux-kvm alpine:3.22
```

---

### `container machine run`

Run a command in a machine (booting it first if needed). With no command, opens an interactive
login shell. Runs as a user matching the host user unless `--root`.

```bash
container machine run [<options>] [<executable>] [<arguments> ...]
```

**Arguments:** `<executable>` (default: login shell) · `<arguments>` (passthrough).

| Flag | Value | Default | Description |
|------|-------|---------|-------------|
| `-n, --name` | `<name>` | default machine | Machine ID. |
| `-d, --detach` | flag | `false` | Run detached. |
| `--root` | flag | `false` | Run as root instead of matching the host user. |

Plus the Process options group (`-e/--env`, `--env-file`, `--gid`, `-i/--interactive`,
`-t/--tty`, `-u/--user`, `--uid`, `-w/--workdir/--cwd`).

```bash
container machine run
container machine run -n my-machine uname -a
container machine run -n my-machine -- cat /proc/cpuinfo
```

---

### `container machine set`

Set config values on a machine (applied after stop + restart).

```bash
container machine set [-n <name>] <setting> ...
```

**Arguments:** `<setting>` (one or more `key=value`).

| Flag | Value | Default | Description |
|------|-------|---------|-------------|
| `-n, --name` | `<name>` | default machine | Machine ID. |

**Settings:** `cpus=<n>` · `memory=<size>` (e.g. `2G`; default half of system memory) ·
`home-mount=<ro\|rw\|none>` (default `rw`) · `virtualization=<true\|false>` (M3+, macOS 15+,
`CONFIG_KVM=y`) · `kernel=<path>` (empty `kernel=` clears the override → system default).

```bash
container machine set cpus=4 memory=8G
container machine set -n my-machine home-mount=ro
container machine set virtualization=true kernel=/opt/kernels/vmlinux-kvm
container machine set kernel=          # clear custom kernel
```

---

### `container machine set-default`

Set the default machine.

```bash
container machine set-default <id>
```

**Arguments:** `<id>` (required). No options beyond global.

---

### `container machine list (ls)`

List machines; the default is marked in the `DEFAULT` column. **Alias:** `ls`.

```bash
container machine list [--format <format>] [-q]
container machine ls   [--format <format>] [-q]
```

| Flag | Value | Default | Description |
|------|-------|---------|-------------|
| `--format` | `json\|table` | `table` | Output format. Note: machines support only `json`/`table` (not `yaml`/`toml`). |
| `-q, --quiet` | flag | `false` | Only output the machine ID. |

---

### `container machine inspect`

Print detailed machine info as JSON. Uses the default machine if no ID given.

```bash
container machine inspect [<id>]
```

**Arguments:** `<id>` (optional; default machine if omitted). No options beyond global.

---

### `container machine logs`

Fetch a machine's logs. Follow, tail, or view the boot log. Default machine if no ID given.

```bash
container machine logs [--boot] [-f] [-n <n>] [<id>]
```

**Arguments:** `<id>` (optional; default machine if omitted).

| Flag | Value | Default | Description |
|------|-------|---------|-------------|
| `--boot` | flag | `false` | Show the boot log instead of stdio. |
| `-f, --follow` | flag | `false` | Follow log output. |
| `-n` | `<n>` | — (all) | Show the last `n` lines. `-n` is short-only. |

---

### `container machine stop`

Stop a running machine. Default machine if no ID given.

```bash
container machine stop [<id>]
```

**Arguments:** `<id>` (optional; default machine if omitted). No options beyond global.

---

### `container machine delete (rm)`

Delete a machine, stopping it first if running. If it was the default, set a new one with
`container machine set-default`. **Alias:** `rm`.

```bash
container machine delete <id>
container machine rm     <id>
```

**Arguments:** `<id>` (required). No options beyond global.
