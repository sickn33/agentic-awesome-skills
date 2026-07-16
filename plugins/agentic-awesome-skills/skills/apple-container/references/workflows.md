# `container` — Task-Oriented Workflows

Copy-pasteable recipes for Apple's `container` CLI (`apple/container`) — Linux containers as
lightweight VMs on Apple-silicon macOS. This is **Apple's `container`, not Docker**: flags,
defaults, and the daemon model differ. See `commands.md` for the full flag reference. Use
fully-qualified image refs (`docker.io/library/alpine`) in scripts. `container` targets
**macOS 26**; several features are gated (called out inline).

> **Version:** recipes track the **1.0.0** release. `container cp`, `container prune`,
> `container image prune`, and `container system version` used below were added in 1.0.0 (not in
> 0.7.1) — run `container --help` to confirm your installed surface.

## Recipes

- [First run: install + start + first container](#first-run-install--start--first-container)
- [Run interactive vs detached](#run-interactive-vs-detached)
- [Publish ports](#publish-ports)
- [Set environment variables](#set-environment-variables)
- [Mounts: bind, volume, tmpfs](#mounts-bind-volume-tmpfs)
- [Build an image from a Dockerfile](#build-an-image-from-a-dockerfile)
- [Multi-tag, build-args, no-cache, target](#multi-tag-build-args-no-cache-target)
- [Tag & push to Docker Hub / private registry](#tag--push-to-docker-hub--private-registry)
- [Set the default registry](#set-the-default-registry)
- [Container-to-container networking](#container-to-container-networking)
- [Local DNS domain for name resolution](#local-dns-domain-for-name-resolution)
- [Custom isolated networks (macOS 26)](#custom-isolated-networks-macos-26)
- [Inspect a container](#inspect-a-container)
- [View logs](#view-logs)
- [Exec into a running container](#exec-into-a-running-container)
- [Copy files in and out](#copy-files-in-and-out)
- [Resource limits (CPU / memory)](#resource-limits-cpu--memory)
- [Cleanup: stop, remove, prune](#cleanup-stop-remove-prune)
- [Upgrade / downgrade / uninstall](#upgrade--downgrade--uninstall)
- [Troubleshooting](#troubleshooting)

---

### First run: install + start + first container

There is **no CLI installer command** — download and double-click the signed `.pkg`, then start
the services and run a container.

```bash
# 1. Download the signed installer .pkg from the GitHub releases page:
#    https://github.com/apple/container/releases
#    Double-click the .pkg and follow the prompts (admin password installs under /usr/local).

# 2. Start the background services. On first run this prompts to install the default Linux kernel.
container system start

# 3. Verify (empty list is expected on a fresh install).
container list --all

# 4. Run your first container.
container run --rm -it docker.io/library/alpine:latest sh
```

Note: double-clicking the `.pkg` is the only install path; `container system start` prompts for the recommended kernel (or use `container system kernel set --recommended`).

---

### Run interactive vs detached

```bash
# Interactive shell (-i keeps stdin open, -t allocates a TTY; commonly combined as -it).
container run --rm -it docker.io/library/ubuntu:latest /bin/bash

# Detached, named, auto-removed on stop.
container run -d --name web --rm docker.io/library/nginx:latest

# One-shot command in the foreground (exits when the command finishes).
container run --rm docker.io/library/alpine:latest uname -a
```

Note: foreground by default; stdin stays closed unless `-i`. `--rm` deletes the container after it exits.

---

### Publish ports

`-p` / `--publish` forwards loopback traffic to the container. Spec: `[host-ip:]host-port:container-port[/protocol]` (`tcp`/`udp`, case-insensitive).

```bash
# host 8080 -> container 80
container run -d --rm -p 8080:80 docker.io/library/nginx:latest

# bind to a specific host IP
container run -d --rm -p 127.0.0.1:8080:8000 docker.io/library/node:latest npx http-server -a :: -p 8000

# IPv6 loopback (quote the bracketed address)
container run -d --rm -p '[::1]:8080:8000' docker.io/library/node:latest npx http-server -a :: -p 8000

# UDP
container run -d --rm -p 5353:5353/udp docker.io/library/alpine:latest
```

Note: if a container attaches to multiple networks, published ports forward to the IP of the first network's interface.

---

### Set environment variables

```bash
# Individual vars (-e / --env); repeatable. Bare `KEY` inherits from the host.
container run --rm -e NODE_ENV=production -e PORT=8080 docker.io/library/node:latest env

# Inherit HOME from the host shell
container run --rm -e HOME docker.io/library/alpine:latest sh -c 'echo $HOME'

# From a file (KEY=value per line; # comments and blanks ignored); repeatable.
container run --rm --env-file ./app.env docker.io/library/alpine:latest env
```

Note: `-e` and `--env-file` may be combined and each repeated; later values win.

---

### Mounts: bind, volume, tmpfs

```bash
# Bind-mount a host folder (-v host:container). Use absolute host paths.
container run --rm -v "${HOME}/Desktop/assets:/content/assets" docker.io/library/python:alpine ls -l /content/assets

# Same via --mount key=value syntax.
container run --rm --mount source="${HOME}/Desktop/assets",target=/content/assets docker.io/library/python:alpine ls /content/assets

# Named volume (create first, then mount by name).
container volume create data
container run --rm -v data:/var/lib/app docker.io/library/alpine:latest sh

# Anonymous volume (-v /path) — NOT auto-removed by --rm; delete it yourself.
container run --rm -v /data docker.io/library/alpine:latest sh
# It leaves an anon-<id> volume. List to find the exact name, then remove THAT one by name:
container volume list          # locate the new anon-<id> row
container volume rm anon-<id>  # ⚠️ delete the specific volume — do NOT `grep anon | rm`, which
                              #    would match (and destroy) every anonymous volume on the machine

# Read-only bind via --mount.
container run --rm --mount type=bind,source="${PWD}/conf",target=/etc/conf,readonly docker.io/library/alpine:latest cat /etc/conf/app.ini

# tmpfs (in-memory) mount; repeatable.
container run --rm --tmpfs /scratch docker.io/library/alpine:latest sh -c 'df -h /scratch'
```

Note: unlike Docker, anonymous volumes do not auto-clean with `--rm` — remove them via `container volume rm`.

---

### Build an image from a Dockerfile

```bash
# Build from ./Dockerfile in the current context, tag as web-test.
container build -t web-test .

# Explicit Dockerfile path.
container build -f docker/Dockerfile.prod -t web-test:prod .

# Build, then run it.
container build -t web-test .
container run -d --name my-web-server --rm web-test
```

Note: with no `-f`, the builder looks for `Dockerfile` then `Containerfile`. The builder runs in its own VM (see resource-limits recipe to size it).

---

### Multi-tag, build-args, no-cache, target

```bash
# Multiple tags on one build (-t repeatable).
container build -t my-app:latest -t my-app:v1.0.0 .

# Build-time variables (repeatable).
container build --build-arg NODE_VERSION=18 --build-arg ENV=prod -t my-app .

# Skip the build cache.
container build --no-cache -t my-app .

# Target a specific multi-stage build stage.
container build --target production -t my-app:prod .

# Multi-architecture image (arm64 + amd64 via Rosetta).
container build --arch arm64 --arch amd64 -t docker.io/me/web-test:latest .
```

Note: `--arch` is repeatable/comma-separated; `--platform` (`os/arch[/variant]`) takes precedence over `--os`/`--arch`.

---

### Tag & push to Docker Hub / private registry

Registry commands live under the **Image** group (`container registry`, alias `r`). Credentials are stored in the macOS keychain.

```bash
# Log in (prompts for username + password, or use -u / --password-stdin).
container registry login docker.io
container registry login -u alice ghcr.io
echo "$TOKEN" | container registry login -u alice --password-stdin ghcr.io

# HTTP for a local registry.
container registry login --scheme http localhost:5000

# Tag the local image with a full registry reference.
container image tag web-test docker.io/alice/web-test:latest

# Push it (the final reference is printed on success).
container image push docker.io/alice/web-test:latest

# Private registry.
container image tag web-test registry.example.com/fido/web-test:latest
container image push registry.example.com/fido/web-test:latest

# List saved logins / log out.
container registry list   # 1.0.0+ (added after 0.7.1)
container registry logout ghcr.io
```

Note: the default registry is `docker.io`, so a bare `web-test:latest` resolves against Docker Hub. Change it via the `registry.domain` property (next recipe).

---

### Set the default registry

```bash
# Inspect current properties (includes [registry] domain).
container system property list
```

Edit `~/.config/container/config.toml`:

```toml
[registry]
domain = "registry.example.com"
```

Note: with `registry.domain` set, unqualified image names resolve against that host instead of `docker.io`.

---

### Container-to-container networking

Each container gets its own IP on the `default` vmnet network. Read it from `container ls` or `container inspect`.

```bash
# Start a server, then find its IP.
container run -d --name my-web-server --rm web-test
container ls                       # IP column shows e.g. 192.168.64.3

# Scriptable IP lookup via inspect + jq.
container inspect my-web-server | jq -r '.[0].networks[0].address'

# Reach it from another container by IP (requires macOS 26 — see note).
container run --rm -it web-test curl http://192.168.64.3
```

Note: container-to-container access over the virtual network requires macOS 26 and **does not work on macOS 15**, where containers are isolated from one another at the network layer (see `concepts.md` §3) — a naming scheme cannot restore connectivity. The DNS domain in the next recipe resolves names **host-side only** (host → container); it does not enable container-to-container traffic on macOS 15.

---

### Local DNS domain for name resolution

Register a local domain so `<name>.<domain>` resolves to a named container's IP. `dns create`/`delete` need `sudo` (writes under `/etc/resolver`).

```bash
# Create the domain (admin password required).
sudo container system dns create test
```

Make it the default DNS domain by setting `dns.domain` in `~/.config/container/config.toml`
(there is no `property set` command — properties are edited in the config file):

```toml
[dns]
domain = "test"
```

```bash
# Now a named container is reachable as <name>.<domain>.
container run -d --name my-web-server --rm web-test
curl http://my-web-server.test

# List / remove domains.
container system dns list
sudo container system dns delete test

# Confirm the effective domain.
container system property list        # shows [dns] domain = "test"
```

Note: `container system property` only supports `list`/`ls` — set `dns.domain` via `config.toml`, not a CLI setter. A container named `my-web-server` with domain `test` answers at `my-web-server.test`.

---

### Custom isolated networks (macOS 26)

The entire `container network` group **requires macOS 26** (absent on macOS 15, which has only the single default subnet).

```bash
# Create an isolated network.
container network create foo

# With custom subnets.
container network create foo --subnet 192.168.100.0/24 --subnet-v6 fd00:1234::/64

# Attach a container to it.
container run -d --name my-web-server --network foo --rm web-test

# List / delete (detach all containers first).
container network list
container stop my-web-server
container network delete foo
```

Note: networks are mutually isolated — a container on `foo` has no connectivity to containers on `default`.

---

### Inspect a container

```bash
# Full pretty JSON (one or more IDs).
container inspect my-web-server

# Extract specific fields with jq.
container inspect my-web-server | jq -r '.[0].status'
container inspect my-web-server | jq -r '.[0].networks[0].address'

# Table/JSON listing of all containers, including stopped.
container ls --all
container ls --all --format json | jq '.[] | [.configuration.id, .networks[0].address]'
```

Note: `inspect` requires at least one ID; a missing ID errors. `container image inspect <ref>` does the same for images.

---

### View logs

```bash
# Application stdio.
container logs my-web-server

# Follow live output.
container logs -f my-web-server

# Last N lines (-n is short-only; there is no --lines).
container logs -n 100 my-web-server

# VM boot / init logs.
container logs --boot my-web-server
```

Note: `--boot` shows the VM kernel + `vminitd` init log, useful for boot/networking diagnostics.

---

### Exec into a running container

```bash
# Interactive shell in a running container.
container exec -it my-web-server sh

# One-off command.
container exec my-web-server ls /content

# With env / as a specific user.
container exec -e DEBUG=1 -u root my-web-server env
```

Note: `exec` targets a **running** container and shares the same process options as `run` (`-e`, `--env-file`, `-u`, `-w`, etc.).

---

### Copy files in and out

Exactly one side must be a `container_id:path` reference. The container must be running.

```bash
# Host -> container.
container cp ./config.json my-web-server:/etc/app/

# Container -> host.
container cp my-web-server:/var/log/app.log ./logs/
```

Note: `container copy` and `container cp` are the same command.

---

### Resource limits (CPU / memory)

Container defaults: 4 CPUs, 1 GiB RAM. Builder VM defaults: 2 CPUs, 2 GiB RAM.

```bash
# Per-container limits on run/create.
container run --rm --cpus 8 --memory 32g docker.io/library/alpine:latest sh

# Short flags.
container run --rm -c 2 -m 1G docker.io/library/node:latest

# Size the builder VM before a heavy build.
container builder start --cpus 8 --memory 32g
container build -t big-app .

# Change a running builder: stop, delete, restart with new limits.
# ⚠️ `builder delete` discards the BuildKit builder and its layer cache — the next build
#    re-fetches base images and rebuilds every layer from scratch.
container builder stop
container builder delete
container builder start --cpus 8 --memory 32g
```

Note: memory accepts `K`/`M`/`G`/`T`/`P` suffixes. Monitor live usage with `container stats` (`--no-stream` for a single snapshot).

---

### Cleanup: stop, remove, prune

> **⚠️ Scope matters.** The `-a`/`--all`/`prune` variants act on **every** container, image,
> volume, or network on the machine — not just this project's. `container volume prune` and
> `container image rm --all` permanently delete data belonging to *unrelated* containers. To clean
> up after one workload, use the **targeted** commands (by name/tag); reach for the machine-wide
> ones only when you deliberately want a full sweep. Do not paste this whole block blindly.

```bash
# --- Targeted (scoped to named resources — safe for cleaning up one workload) ---
container stop my-web-server            # stop one container
container delete my-web-server          # rm is an alias; add -f to remove a running one
container image delete web-test         # remove one image by name/tag
container volume rm data                # remove one volume by name

# --- Machine-wide (destroys ALL matching resources — use deliberately) ---
container stop -a                       # stop every running container
container rm --all                      # delete every container
container image rm --all                # delete every image
container image prune                   # remove dangling (untagged) images only
container image prune -a                # remove every image not used by a container
container volume prune                  # delete every volume with no container reference
container network prune                 # macOS 26+; delete every unused network
container prune                         # remove all stopped containers

# Check disk usage across images/containers/volumes.
container system df
```

Note: `container prune` only removes **stopped** containers. `image prune` (no `-a`) removes only dangling images.

---

### Upgrade / downgrade / uninstall

Both scripts install to `/usr/local/bin`. **Stop the services first.**

```bash
# Always stop before upgrading/downgrading.
container system stop

# Upgrade to the latest release.
/usr/local/bin/update-container.sh

# Downgrade: uninstall (keep user data with -k), then pin the previous release.
/usr/local/bin/uninstall-container.sh -k
/usr/local/bin/update-container.sh -v 0.7.1   # replace with the version you want

# Restart after any change.
container system start

# Uninstall. Default to -k (keep user data) unless you truly want everything gone.
/usr/local/bin/uninstall-container.sh -k      # keep images/containers/volumes for a later reinstall
/usr/local/bin/uninstall-container.sh -d      # ⚠️ also deletes ALL user data (images, containers, volumes) — irreversible
```

Note: you can also upgrade/downgrade by re-downloading and double-clicking the signed `.pkg`. `-v` pins `update-container.sh` to a specific version.

---

### Troubleshooting

```bash
# "XPC connection error" / commands hang -> services aren't running. Start them.
container system start

# Confirm services are up.
container system status

# View service logs (default last 5m; --last <n>[m|h|d], -f to follow).
container system logs
container system logs --last 1h
container system logs -f

# Add --debug to any command for verbose output (or set CONTAINER_DEBUG).
container --debug run --rm docker.io/library/alpine:latest true

# Version info for CLI + API server.
container system version
```

Note: an XPC/connection error means the background API server isn't started — run `container system start`. Feature gates to keep in mind: container-to-container access and the `container network` group require **macOS 26** (both unavailable on **macOS 15**). The CLI refuses to run under Rosetta — Apple silicon only.
