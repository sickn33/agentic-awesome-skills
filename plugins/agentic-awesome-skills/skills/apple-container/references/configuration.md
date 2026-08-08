# Configuration & administration

Admin guide for Apple's `container` CLI runtime (Apple silicon macOS). This is **not Docker** —
the CLI is Docker-like but the runtime is a per-container lightweight VM. For exhaustive
flags/subcommands see `commands.md`; this file covers the operator surface only.

The runtime is a set of launchd-managed services (`container-apiserver` + machine API server +
background helpers). Almost everything below drives those services. Every command accepts
`--debug` (env `CONTAINER_DEBUG`). Most `list`/`status` commands accept `--format` — commonly
`json`, `table`, `yaml`, and `toml` (the exact value set and default vary by command, e.g. `table`
for `container list` but `toml` for `system property list`; check `<command> --help`).

---

## 1. System service: start / stop / status / logs

The `container` services must be running before any container/image/build command works.

```bash
container system start        # register services in launchd, launch apiserver + machine API
container system status       # health-check; prints running state + data/install roots
container system stop         # stop all services and deregister from launchd
container system logs         # recent service logs (default last 5m)
container system logs -f      # live tail
container system logs --last 1h
```

`system start` behavior worth knowing:
- Launches `container-apiserver` via launchd, then **pings it** and fails if unresponsive
  (bump `--timeout <seconds>` on slow machines).
- On first run it **installs the base filesystem (`vminit`) image** and prompts to install the
  **default kernel** unless you pass `--enable-kernel-install` / `--disable-kernel-install`.
- Loads `config.toml` (see §2) once, at startup. **Restart after any config/property change:**
  `container system stop && container system start`.

| `system start` flag | Purpose | Default |
|---------------------|---------|---------|
| `-a, --app-root <path>` | Application data root | `~/Library/Application Support/com.apple.container/` |
| `--install-root <path>` | Executables/plugins root | `/usr/local/` |
| `--log-root <path>` | Log dir; unset → macOS unified log | unset |
| `--enable-kernel-install` / `--disable-kernel-install` | Install default kernel or not (mutually exclusive) | prompt |
| `--timeout <seconds>` | Wait for apiserver readiness | XPC default |

`system stop` takes `-p, --prefix <prefix>` (launchd prefix, default `com.apple.container.`);
`system status` takes the same `--prefix` plus `--format`.

`system df` shows reclaimable disk usage for images/containers/volumes:
```bash
container system df --format json
```

**Data locations** (reported by `system status`):

| Location | Default path |
|----------|--------------|
| App data root | `~/Library/Application Support/com.apple.container/` |
| Install root | `/usr/local/` |
| User config | `~/.config/container/config.toml` |
| Package config | `<installRoot>/etc/container/config.toml` (e.g. `/usr/local/etc/...`) |

Data root holds `apiserver/`, `builder/`, `containers/`, `content/`, `kernels/`, `networks/`,
`volumes/`, `snapshots/`, `plugin-state/`, `user-plugins/`, and `state.json`.

---

## 2. System properties / config.toml

One `ContainerSystemConfig` drives the runtime. **Configure it by editing `config.toml`**;
`container system property list` is a read-only view of the effective (merged) values.

- **`config.toml`** section tables (`[build]`, `[container]`, …) are loaded at service startup,
  first-match-wins across `~/.config/container/config.toml` then
  `<installRoot>/etc/container/config.toml`. Missing keys fall back to hardcoded defaults.
- **Flat property IDs** (e.g. `build.rosetta`, `dns.domain`) are how the same values are named
  and reported. `container system property` has only the `list` subcommand — there is **no**
  per-key `get`, `set`, or `clear`. To change a value edit `config.toml`; to revert one, remove
  its key.

Property ID ⇄ TOML mapping is direct: `build.rosetta` ⇄ `[build] rosetta`, etc. (exceptions:
the builder/vminit image IDs — see table).

```bash
# View effective values (read-only)
container system property list                 # all IDs, types, current values (default: toml)
container system property list --format json
```

```toml
# Change values by editing ~/.config/container/config.toml, then restart services
[container]
cpus = 8
[registry]
domain = "ghcr.io"
```
```bash
container system stop && container system start   # apply; remove a key to revert it
```

**Every configurable key:**

| Property ID | TOML | Type | Default | Meaning |
|-------------|------|------|---------|---------|
| `build.rosetta` | `[build] rosetta` | Bool | `true` | Build amd64 images on arm64 via Rosetta (else QEMU) |
| `build.cpus` | `[build] cpus` | Int | `2` | Builder VM CPU count |
| `build.memory` | `[build] memory` | MemorySize | `"2048mb"` | Builder VM RAM |
| `image.builder` | `[build] image` | String | `ghcr.io/apple/container-builder-shim/builder:<ver>` | Builder (BuildKit) image reference |
| `container.cpus` | `[container] cpus` | Int | `4` | Default CPUs per container (when `run`/`create` omit `--cpus`) |
| `container.memory` | `[container] memory` | MemorySize | `"1g"` | Default RAM per container |
| `dns.domain` | `[dns] domain` | String? | unset | Local domain appended to unqualified container names (§4) |
| `registry.domain` | `[registry] domain` | String | `"docker.io"` | Default registry for bare image refs (§5) |
| `kernel.url` | `[kernel] url` | URL | kata-static release URL | Kernel file or archive to install (§3) |
| `kernel.binaryPath` | `[kernel] binaryPath` | String | `opt/kata/share/kata-containers/vmlinux-<ver>` | Archive-member path of the kernel |
| `network.subnet` | `[network] subnet` | CIDRv4? | unset | Default IPv4 subnet for networks; auto-allocates when unset (§7) |
| — | `[network] subnetv6` | CIDRv6? | unset | Default IPv6 prefix for networks; auto-allocates when unset (§7) |
| `image.init` | `[vminit] image` | String | `ghcr.io/apple/containerization/vminit:<ver>` | `vminitd` image booting container VMs |
| — | `[plugin.<id>]` | — | — | Plugin-scoped config; each plugin reads only its own section |

> Exact defaults (kernel version, image tags) drift per release. Confirm with
> `container system property list`; do not assume a specific version.

**MemorySize** = quoted string, integer + binary unit (`b/kb/mb/gb/tb/pb`, powers of 1024, case-insensitive);
bare integer = bytes. `"2g"` re-emits as `"2gb"`. **CIDR** = quoted, e.g. `"192.168.100.0/24"`.

Minimal `config.toml` example:
```toml
[container]
cpus = 8
memory = "4g"
[dns]
domain = "test"
```

The full per-section `config.toml` schema (keys, types, defaults, meaning), the flat property
list as emitted by the CLI, type-format details, and data locations are in the
[appendix](#appendix-configtoml-schema--data-locations).

---

## 3. Default kernel

The default guest kernel is the Linux kernel every container VM boots. Managed via
`container system kernel set` (writes the default) plus the `kernel.url` / `kernel.binaryPath`
properties (the download source `--recommended` uses).

```bash
container system kernel set --recommended        # download + install Apple's recommended kernel
container system kernel set --binary ./vmlinux --force            # install a local binary, overwrite
container system kernel set --tar https://ex.com/kata-static.tar.xz \
  --binary opt/kata/share/kata-containers/vmlinux-6.12.28-153 --arch arm64
```

| Flag | Purpose | Default |
|------|---------|---------|
| `--recommended` | Download+install recommended kernel. **Overrides `--arch`/`--binary`/`--tar`** | — |
| `--arch <amd64\|arm64>` | Kernel architecture | `arm64` |
| `--binary <path>` | Kernel file, or archive-member name when used with `--tar` | — |
| `--tar <path\|url>` | Tar archive (local or remote) containing the kernel | — |
| `--force` | Overwrite an existing kernel of the same name | — |

- Persist a custom source by editing `config.toml`:
  ```toml
  [kernel]
  url = "<url>"
  binaryPath = "<member>"
  ```
- Kernel install is also toggled at startup via `system start --enable/--disable-kernel-install`.
- Per-machine kernel override is separate — see §7 (`machine set kernel=<path>`).

---

## 4. DNS / local domain resolution

Register a **local DNS domain** so unqualified container names resolve host-side (e.g.
`my-web` → `my-web.test`). Creating/deleting a domain **modifies the host resolver and
requires admin** (`sudo`); it restarts `mDNSResponder`.

```bash
sudo container system dns create test               # register domain "test"
sudo container system dns create test --localhost 127.0.0.1   # redirect an IPv4 to localhost
container system dns list                            # list domains (no sudo)
sudo container system dns delete test                # alias: rm
```
```toml
# Activate "test" as the default domain in ~/.config/container/config.toml
[dns]
domain = "test"
```
```bash
container system stop && container system start
```

- `--localhost` must be a valid **IPv4** address; it installs a pf redirect rule to `127.0.0.1`.
- Registering a domain is not enough — set `[dns] domain` in `config.toml` to activate it for
  unqualified names.
- If domain deactivation misbehaves: `sudo killall -HUP mDNSResponder`.

---

## 5. Default registry & authentication

Bare image refs resolve against the default registry (`registry.domain`, default `docker.io` →
`alpine` becomes `docker.io/library/alpine`).

```toml
# Change the default registry in ~/.config/container/config.toml (restart to apply);
# remove the key to revert to docker.io
[registry]
domain = "ghcr.io"
```

**Auth** (`container registry`, alias `r`) — credentials are stored in the macOS keychain:

```bash
container registry login registry.example.com            # prompts user + password
container registry login -u alice ghcr.io                # prompt password only
echo "$TOKEN" | container registry login -u alice --password-stdin ghcr.io   # non-interactive
container registry list                                  # HOSTNAME/USERNAME/MODIFIED/CREATED (1.0.0+)
container registry logout ghcr.io
```

| Command | Key flags | Notes |
|---------|-----------|-------|
| `login <server>` | `-u/--username`, `--password-stdin`, `--scheme <http\|https\|auto>` | `--password-stdin` **requires** `--username`. On success pings the registry then saves to keychain |
| `logout <registry>` | — | Deletes keychain creds for the resolved host |
| `list` (`ls`) | `--format`, `-q/--quiet` | `-q` prints hostnames only |

**Insecure / HTTP registries** — `--scheme` (default `auto`):
- `auto` → `http` for internal/private hosts (`localhost`, the internal DNS domain, and RFC-1918
  ranges `10/8`, `127/8`, `192.168/16`, `172.16/12`); `https` for everything else.
- Force plaintext against a local registry: `container registry login --scheme http localhost:5000`.
- `--scheme` also applies to image `pull`/`push` and `machine create` (same enum).

> `registry list` only lists saved logins. There is no `default-registry get/set` subcommand —
> the default registry lives in the `registry.domain` property (above).

---

## 6. BuildKit builder VM

`container build` runs inside a utility container named **`buildkit`** (a lightweight VM). It
auto-starts on first build; manage it explicitly with `container builder` when you need more
resources or a clean slate.

```bash
container builder start --cpus 8 --memory 32g    # start with more resources
container builder status                          # ID/IMAGE/STATE/IP/CPUS/MEMORY
container builder stop
container builder delete                          # alias: rm  (add --force if running)
```

To resize a running builder, recreate it:
```bash
container builder stop && container builder delete && container builder start --cpus 8 --memory 32g
```

| Command | Flags | Notes |
|---------|-------|-------|
| `start` | `-c/--cpus <n>`, `-m/--memory <size>` (K/M/G/T/P suffix) | Falls back to `build.cpus`/`build.memory` (defaults 2 CPUs / 2048 MiB). Reuses an existing matching builder; recreates if image/cpu/mem/env/DNS changed |
| `status` | `--format`, `-q/--quiet` | Prints `builder is not running` when absent |
| `stop` | — | No-op warning if not running |
| `delete` (`rm`) | `-f/--force` | Errors unless stopped; `--force` stops then deletes |

- Image comes from `image.builder` / `[build] image`; Rosetta-vs-QEMU for amd64 builds is
  `build.rosetta`.
- Persistent builder defaults (not just this session) go in `[build] cpus` / `[build] memory`
  in `config.toml`.

---

## 7. Machines, custom networks, volumes

### Machines (`container machine`, alias `m`)

> **⚠️ Requires 1.0.0+ — the `container machine` group was added in 1.0.0 (not in 0.7.1).**

A **container machine** is a persistent, bootable Linux **environment** (not a one-shot
container) — it runs the image's init system, auto-mounts your macOS `$HOME` and username, and
persists across restarts. Ideal for "edit on Mac, build inside Linux" and running long-lived
services. Distinct from the transient per-container VMs that back `container run`.

```bash
container machine create alpine:3.22 --name dev --set-default
container machine run                 # interactive shell in the default machine (matches host user)
container machine run -n dev uname
container machine run -n dev -- cat /proc/cpuinfo    # everything after -- passed through verbatim
container machine list                # ls: NAME/CREATED/IP/CPUS/MEMORY/DISK/STATE/DEFAULT(*)
container machine inspect dev         # JSON detail
container machine set -n dev cpus=4 memory=8G home-mount=ro    # takes effect after stop/start
container machine set-default dev
container machine stop dev
container machine delete dev          # rm: also deletes persistent storage
container machine logs -f -n 100 dev  # --boot for boot log
```

| Subcommand | Key flags / settable keys | Notes |
|------------|---------------------------|-------|
| `create <image>` | `-n/--name`, `--set-default`, `--no-boot`, `--cpus`, `--memory`, `--home-mount <ro\|rw\|none>`, `--virtualization`, `--kernel <path>` | Memory default = half host RAM; home-mount default `rw`. Name defaults to `<image>-<tag>` |
| `set [-n]` | `cpus=`, `memory=`, `home-mount=`, `virtualization=<bool>`, `kernel=<path>` (empty `kernel=` resets to default) | `key=value`; last dupe wins; unknown key errors. Changes apply after stop/start |
| `run` | `-d/--detach`, `--root`, `-e/--env`, `-i`, `-t`, `-u/--user`, `-w/--workdir`, `--ulimit` | Boots machine if stopped; forwards `SSH_AUTH_SOCK` |
| `logs` | `--boot`, `-f/--follow`, `-n <lines>` | `-n` is short-only |
| `list`/`inspect`/`stop`/`delete`(`rm`)/`set-default` | ID optional (uses default) except `set-default`/`delete` | — |

**Nested virtualization / custom kernel** (per-machine): requires Apple Silicon **M3+** on
**macOS 15+** and a kernel with `CONFIG_KVM=y` (the default kernel does not qualify).
```bash
container machine create --virtualization --kernel /path/to/vmlinux-kvm -n kvm-dev alpine:latest
container machine run -n kvm-dev -- ls -l /dev/kvm     # verify /dev/kvm exposed
```
Any Linux image with `/sbin/init` works. Override first-boot user provisioning by adding an
executable `/etc/machine/create-user.sh` (runs once as root; env `CONTAINER_{UID,GID,USER,HOME,MACHINE_ID}`).

### Custom networks (`container network`, alias `n`) — **macOS 26+**

`system start` always creates a builtin vmnet network `default`. On **macOS 26+** you can create
additional **isolated** networks (no cross-network connectivity). Builtin networks cannot be deleted.

```bash
container network create foo                                   # prints network ID
container network create foo --subnet 192.168.100.0/24 --subnet-v6 fd00:1234::/64
container network list                                         # ls: NETWORK/SUBNET
container network inspect foo                                   # pretty JSON
container run -d --name web --network foo web-test             # attach a container
container network delete foo                                   # rm; add --all for all non-builtin
container network prune                                        # remove networks with no attached containers
```

| Flag (`create`) | Purpose | Default |
|-----------------|---------|---------|
| `--subnet <cidr4>` / `--subnet-v6 <cidr6>` | Custom subnets (validated non-overlapping) | auto-allocate / `network.subnet(v6)` |
| `--internal` | Host-only network (no NAT) | NAT |
| `--label k=v` / `--option k=v` | Metadata / plugin option (repeatable) | — |
| `--plugin <name>` | Network plugin | `container-network-vmnet` |

`delete --all` skips builtin networks; deleting a network fails if any IP is still in use.
Persistent default subnets → `network.subnet` / `[network] subnetv6`. Their effect is
version-dependent: on **macOS 15** they set the subnet of the single builtin `default` network;
on **macOS 26+** they additionally seed the default subnet for custom networks created without an
explicit `--subnet`/`--subnet-v6`. In both cases, if left unset the system auto-allocates a
non-overlapping subnet.

### Volumes (`container volume`, alias `v`)

A **volume** is host-backed storage you mount into containers to persist/share data across runs
(`container run --volume <name>:/path` or a host `path:path`). Driver is always `local`.

```bash
container volume create mydata -s 10G                         # prints volume name (-s takes K/M/G/T/P)
container volume create mydata --label env=dev --opt key=val
container volume list                                          # ls: NAME/TYPE/DRIVER/OPTIONS
container volume inspect mydata                                # pretty JSON
container volume delete mydata                                 # rm; --all for all volumes
container volume prune                                         # remove volumes with no container refs; reports reclaimed space
```

| Flag (`create`) | Purpose |
|-----------------|---------|
| `-s <size>` | Size in bytes, K/M/G/T/P suffix (stored as driver opt `size`) |
| `--label k=v` | Metadata (repeatable) |
| `--opt k=v` | Driver-specific option (repeatable) |

`delete`/`network delete` require either names **or** `--all` (not both); a missing named
resource errors, while `--all` tolerates an empty set.

---

## Appendix: `config.toml` schema & data locations

One underlying `ContainerSystemConfig` is configured by editing a **`config.toml`** file with
`[section]` tables loaded once at service startup. The same values are also named as flat
**property IDs** (`build.rosetta`, `dns.domain`, …) — view them read-only with
`container system property list` (its only subcommand; there is no `get`/`set`/`clear`). Property
IDs map onto TOML sections directly (`build.rosetta` ⇄ `[build] rosetta`), with two naming
exceptions: the builder image is `image.builder` ⇄ `[build] image`, and the vminitd image is
`image.init` ⇄ `[vminit] image`. For the CLI commands themselves see `commands.md`.

### Sources & precedence

TOML is loaded **first-match-wins**, then any key absent from both files falls back to a
hardcoded default:

1. User file — `~/.config/container/config.toml`
2. Package file (optional) — `<installRoot>/etc/container/config.toml`
   (e.g. `/usr/local/etc/container/config.toml`)

The file is read **once at startup**; restart after edits
(`container system stop && container system start`).

### Top-level sections

```toml
[build]        # builder VM resources and image
[container]    # default per-container resources
[dns]          # default DNS domain for host DNS resolution
[kernel]       # guest kernel binary path and download URL
[network]      # default subnets for networks
[registry]     # default registry domain
[vminit]       # default vminitd image
[plugin.<id>]  # zero or more plugin-scoped sections
```

All sections are optional; an omitted section falls back to its defaults wholesale. (The Swift
source also defines an internal `[machine]` section, not part of the documented user schema.)

### `[build]` — builder VM (runs `container build`)

| Key | Property ID | Type | Default | Description |
|-----|-------------|------|---------|-------------|
| `rosetta` | `build.rosetta` | Bool | `true` | Build amd64 images on arm64 using Rosetta translation, instead of QEMU. |
| `cpus` | `build.cpus` | Int | `2` | CPU count for the builder VM. |
| `memory` | `build.memory` | MemorySize | `"2048mb"` | RAM allocation for the builder VM. |
| `image` | `image.builder` | String | `ghcr.io/apple/container-builder-shim/builder:<tag>` | Reference for the builder image; `<tag>` tracks the bundled `container-builder-shim` version. (Property ID is `image.builder`, not `build.image` — see the naming exception above.) |

### `[container]` — default per-container resources

Applied when `container run` / `container create` runs without `--cpus` / `--memory`.

| Key | Property ID | Type | Default | Description |
|-----|-------------|------|---------|-------------|
| `cpus` | `container.cpus` | Int | `4` | Default CPU count per container. |
| `memory` | `container.memory` | MemorySize | `"1g"` | Default RAM per container. |

### `[dns]` — local DNS domain

| Key | Property ID | Type | Default | Description |
|-----|-------------|------|---------|-------------|
| `domain` | `dns.domain` | String? | unset | Local DNS domain appended to unqualified container hostnames. `"test"` makes `my-web` resolvable as `my-web.test`. Unset → no domain appended. See §4 for the register-then-activate workflow. |

### `[kernel]` — default guest kernel

Defaults change per release as kernels are bumped; confirm with
`container system property list`.

| Key | Property ID | Type | Default | Description |
|-----|-------------|------|---------|-------------|
| `binaryPath` | `kernel.binaryPath` | String | `opt/kata/share/kata-containers/vmlinux-<ver>` | Archive-member pathname of the kernel, when the URL points at an archive. |
| `url` | `kernel.url` | URL | kata-static release `.tar.xz`/`.tar.zst` | URL of the kernel file to install, or of an archive containing it. |

### `[network]` — default subnets

Used when creating networks without explicit `--subnet` / `--subnet-v6`. See §7 for the
macOS 15 vs macOS 26+ behavior.

| Key | Property ID | Type | Default | Description |
|-----|-------------|------|---------|-------------|
| `subnet` | `network.subnet` | CIDRv4? | unset | IPv4 CIDR, e.g. `"192.168.100.0/24"`. Unset → system auto-allocates a non-overlapping subnet. |
| `subnetv6` | — | CIDRv6? | unset | IPv6 CIDR, e.g. `"fd00:abcd::/64"`. Unset → system auto-allocates. |

### `[registry]` — default registry

| Key | Property ID | Type | Default | Description |
|-----|-------------|------|---------|-------------|
| `domain` | `registry.domain` | String | `"docker.io"` | Default registry for image references that omit a registry host (`alpine` → `docker.io/library/alpine`). See §5. |

### `[vminit]` — default vminitd image

| Key | Property ID | Type | Default | Description |
|-----|-------------|------|---------|-------------|
| `image` | `image.init` | String | `ghcr.io/apple/containerization/vminit:<tag>` | Reference for the `vminitd` image used to boot container VMs; `<tag>` tracks the bundled `containerization` version. |

### `[plugin.<id>]` — plugin-scoped config

Plugins ship their own schemas under `[plugin.<id>]` (`<id>` = plugin identifier). Each plugin
defines and reads only its own section; values cannot leak across plugins. Consult the specific
plugin's documentation for its keys.

### Type formats

**MemorySize** — a quoted string: numeric prefix + binary unit suffix (case-insensitive). All
units are **binary** (powers of 1024) even when written `kb`/`mb`/`gb`. A bare integer (`"2048"`)
parses as bytes. Encoded form uses lowercase `b`/`kb`/`mb`/`gb`/`tb`/`pb` (so `"2g"` re-emits as
`"2gb"`).

| Suffix family | Unit | Examples |
|---------------|------|----------|
| `b` | bytes | `"1024b"` |
| `k`, `kb`, `kib` | kibibytes (1024 B) | `"512k"`, `"512kb"` |
| `m`, `mb`, `mib` | mebibytes | `"2048mb"` |
| `g`, `gb`, `gib` | gibibytes | `"4g"`, `"4gb"` |
| `t`, `tb`, `tib` | tebibytes | `"1t"` |
| `p`, `pb`, `pib` | pebibytes | `"1p"` |

**CIDRv4 / CIDRv6** — quoted strings, e.g. `"192.168.100.0/24"` and `"fd00:abcd::/64"`. Invalid
CIDR strings are rejected at decode time.

### Data locations

Reported by `container system status`:

| Location | Path (default) | Overridable with |
|----------|----------------|------------------|
| Application data root | `~/Library/Application Support/com.apple.container/` | `container system start --app-root <path>` |
| Application install root | `/usr/local/` | `container system start --install-root <path>` |
| Log root | macOS unified log facility (if unset) | `container system start --log-root <path>` |
| User config file | `~/.config/container/config.toml` | — |
| Package config file | `<installRoot>/etc/container/config.toml` (e.g. `/usr/local/etc/container/config.toml`) | — |

The data root contains subdirectories such as `apiserver/`, `builder/`, `containers/`,
`content/`, `kernels/`, `networks/`, `plugin-state/`, `snapshots/`, `user-plugins/`, `volumes/`,
and a top-level `state.json`.
