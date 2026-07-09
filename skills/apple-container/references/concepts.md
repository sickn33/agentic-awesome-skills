# `container` — Concepts & Architecture

Mental model for Apple's `container`: the one-VM-per-container design, the process
topology, platform requirements, networking, images/storage, and the security/isolation
model. Read this to explain *how* or *why* something works, or when a Docker mental model
gives the wrong answer. For concrete flags see `references/commands.md`; for defaults,
`config.toml`, and the machine settings see `references/configuration.md`; for end-to-end
recipes see `references/workflows.md`.

Sources: Apple's `docs/technical-overview.md`, `README.md`, `docs/container-machine.md`,
`SECURITY.md`, and `BUILDING.md`, as of the **1.0.0** release. For behavior on a specific
version, open the matching tag on the
[release page](https://github.com/apple/container/releases).

> **Not Docker.** The CLI is deliberately Docker-like (`container run`, `container build`, image
> ops under `container image`), but `container` is a distinct tool with a different runtime model.
> Do not assume Docker command paths, flags, defaults, or daemon behavior carry over (there is no
> `container images`/`push`/`pull` top-level command) — verify in `references/commands.md`.

---

## 1. What `container` is — one lightweight VM per container

`container` builds and runs standard **OCI/Linux containers** on **Apple-silicon** Macs. It's
written in Swift and built on Apple's open-source
[Containerization](https://github.com/apple/containerization) package for low-level container,
image, and process management.

The defining design choice: **each container you create runs inside its own dedicated
lightweight Linux VM.** This is the opposite of the usual macOS approach (Docker Desktop,
Podman, Lima), where a *single* long-lived Linux VM hosts a daemon and *all* containers share
that one kernel via namespaces.

Each per-container VM boots a **minimal Linux** — a small set of core utilities and dynamic
libraries plus a `vminitd` init — rather than a full userland. Consequences of the model:

| Property | What the per-container VM gives you |
|----------|-------------------------------------|
| **Security** | Every container has the isolation of a *full VM*, not just kernel namespaces. The minimal guest shrinks the attack surface and resource use. |
| **Privacy** | Mount **only the host data a given container needs** into that container's VM. A shared VM forces you to mount everything up front so it can be re-mounted selectively; per-container VMs avoid that broad exposure. |
| **Performance** | Lower memory than a full VM, with **boot times comparable to** containers inside a shared VM (sub-second in practice). |
| **Interop** | Consumes and produces standard **OCI images**, so images move freely to/from Docker registries and other OCI tooling. |

There is **no shared daemon** like `dockerd`. Instead, per-user background services run under
`launchd` and a runtime helper is launched **per container** (see §2).

---

## 2. Architecture — CLI, API server, and helper services

You drive everything through the **`container` CLI**. The CLI uses a **client library**
(`ContainerClient`) that talks over **XPC** to `container-apiserver` and its helpers.

```
container CLI
  └── ContainerClient library  ──XPC──►  container-apiserver   (launchd launch agent)
                                             ├──►  container-core-images     ──► local content store
                                             ├──►  container-network-vmnet   ──► virtual network (vmnet)
                                             ├──►  builder (buildkit)        ──► image builds
                                             └──►  container-runtime-linux   (one instance per container)
                                                       └── my-web-server     (that container's Linux VM)
```

| Component | Role | Lifecycle |
|-----------|------|-----------|
| `container` CLI + `ContainerClient` | Command entry point; talks to the apiserver over XPC. | Runs per invocation. |
| `container-apiserver` | **launchd launch agent** exposing the client APIs for container and network resources. Launches the helpers below. | Started by `container system start`, torn down by `container system stop`. |
| `container-core-images` | XPC helper exposing the **image-management API**; owns the **local content store**. | Started by the apiserver. |
| `container-network-vmnet` | XPC helper managing the **virtual network** via the vmnet framework; allocates container IPs. | Started by the apiserver. |
| `builder` (`buildkit`) | Utility VM that runs `container build`; communicates over gRPC. | On demand; runs as a container named `buildkit`. |
| `container-runtime-linux` | Container **runtime helper** — **one instance per container** — exposing the management API for that specific container's VM. | One per running container. |

`container system` is the control plane for this topology: `start`/`stop` bring the
apiserver and helpers up/down, `status` health-checks them, and `logs`/`df`/`kernel`/`dns`/
`property` manage system-wide state. **No container, image, or build command works until
`container system start` has run** — connection errors almost always mean the services are
stopped. See `references/configuration.md` for the full `container system` reference.

launchd service labels (all under the `com.apple.container.` prefix) look like:

```
com.apple.container.apiserver
com.apple.container.container-core-images
com.apple.container.container-network-vmnet.default
com.apple.container.container-runtime-linux.<container-name>
```

macOS frameworks `container` builds on: **Virtualization** (VMs + attached devices),
**vmnet** (virtual network), **XPC** (client↔service IPC), **launchd** (service management),
**Keychain** (registry credentials), and the **unified logging system** (logs, surfaced via
`container system logs`).

---

## 3. Requirements & platform constraints

| Requirement | Detail |
|-------------|--------|
| **Chip** | **Apple silicon only** (M1 or later). Intel Macs are not supported. |
| **macOS** | **macOS 26 is the supported target** — `container` relies on new virtualization/networking features there. It **runs on macOS 15** but with the limitations in §7. Maintainers typically will not address issues that can't be reproduced on macOS 26. |
| **Install** | Download the signed `.pkg` from the GitHub release page and run it (installs under `/usr/local`, admin password required). Then `container system start`. |

Some features are **gated on macOS 26** because they depend on vmnet capabilities absent in
macOS 15 (see §4/§7). This gating is enforced at runtime: using a macOS-26-only feature (e.g.
`container network create`, or `--network <name>`) on macOS 15 **errors** rather than
degrading silently.

### macOS 26 vs macOS 15 — feature differences

| Capability | macOS 26 | macOS 15 |
|------------|----------|----------|
| Container-to-container traffic over the virtual network | Works | **Not possible** — vmnet only creates networks where attached containers are isolated from one another. |
| Multiple / custom networks (`container network` group, `--network <name>`) | Available | **Unavailable** — all containers attach to the single `default` vmnet network; `container network …` and `--network` **error**. |
| Container network creation timing | Robust | Network is created only when the **first container starts**; the network helper (which hands out IPs) and vmnet can **disagree on the subnet**, potentially cutting containers off. See "All networking fails on macOS 15" in the upstream `troubleshooting.md`. |

> Build-from-source requirement differs slightly: building needs **macOS 15 minimum, macOS 26
> recommended**, plus **Xcode 26** as the active developer directory (see §6).

---

## 4. Networking model

- Networking is provided by the macOS **vmnet framework**, managed by the
  `container-network-vmnet` helper.
- `container system start` creates a vmnet network named **`default`**, typically on CIDR
  **192.168.64.0/24** (gateway **192.168.64.1**). Containers attach to `default` unless
  `--network` names another.
- **Each container is a first-class network endpoint with its own dedicated IP** on that
  network (a direct consequence of the per-container-VM model — there is no shared Docker
  bridge). The network helper allocates the IP; read it with `container ls` or
  `container inspect <name>` (`.networks[].address`).
- **Reach a container by IP directly.** For name-based access, register a **local DNS domain**
  (admin required) so unqualified container names resolve:

  ```bash
  sudo container system dns create test    # register domain "test" on the host resolver
  # make it the default suffix by editing ~/.config/container/config.toml:  [dns] domain = "test"
  # (there is NO `property set` CLI — only `container system property list` to view values)
  # a container named my-web-server is then reachable as my-web-server.test
  ```

  DNS domain create/delete edits the host resolver configuration, so it **must run as
  administrator** (`sudo`). The `dns.domain` property itself is set in `config.toml`, not via a
  CLI setter. See `references/configuration.md` for the `dns` commands and the `dns.domain` property.
- **Reach a host service from a container:** create a domain pointed at a host IP with
  `--localhost` (e.g. `sudo container system dns create host.container.internal --localhost
  203.0.113.113`). Note the macOS caveats: this disables Private Relay, and the packet-filter
  rule is dropped on restart.
- **Publish ports to the Mac's loopback** with `--publish [host-ip:]host-port:container-port
  [/protocol]`. If a container is on multiple networks, published ports forward to the
  interface on the **first** network.
- **Custom / isolated networks require macOS 26.** Create with `container network create
  <name> [--subnet … --subnet-v6 …]`. Networks are **mutually isolated** — a container on one
  network has no connectivity to containers on another. Default subnets for new networks come
  from the `[network]` config (`network.subnet` / `subnetv6`) or are auto-allocated
  non-overlapping; the system rejects overlapping custom subnets. Networks support IPv4 and
  IPv6. On macOS 15 this whole group is unavailable (§3).

---

## 5. Images & storage

- **Standard OCI in, standard OCI out.** Pull/run images from any OCI registry, and push
  images you build to any OCI registry; they run in any other OCI-compatible tool.
- The **local content store** (host-side image/content storage) is owned by the
  `container-core-images` helper, which exposes the image-management API. Manage it with the
  `images` command group and disk usage with `container system df`.
- **Registries:** image references that omit a host default to **`docker.io`**, configurable
  via the `registry.domain` property (see `references/configuration.md`). Prefer
  fully-qualified references (`docker.io/library/alpine`, not bare `alpine`) when the source
  registry matters. Registry credentials are stored in the macOS **Keychain**.
- **Selective host data sharing.** Only the data a given container needs is mounted into that
  container's VM — a privacy/isolation win over the shared-VM model where everything must be
  mounted into the one VM up front.
- The application **data root** (default `~/Library/Application Support/com.apple.container/`)
  holds `content/`, `containers/`, `images`, `kernels/`, `networks/`, `volumes/`, etc. — see
  the data-locations table in `references/configuration.md`.

---

## 6. Security, isolation & building from source

**Isolation model.** Each container is a **full VM**, so isolation is VM-grade rather than
namespace-grade as in a shared-daemon runtime. The minimal guest (small core utility/library
set + `vminitd`) keeps each VM's attack surface and footprint small, and per-container host
mounts limit data exposure to exactly what each container needs.

**Security reporting.** Report vulnerabilities via the project's
[GitHub private vulnerability reporting](https://github.com/apple/container/security/advisories/new),
not public issues. Known/published CVEs may be filed as normal issues. These reports are
**not** eligible for Apple Security Bounties.

**Building from source (brief).** Requires Apple silicon, **macOS 15 min / 26 recommended**,
and **Xcode 26** set as the active developer directory.

```bash
# Build + run tests in an isolated data dir
rm -rf test-data
make APP_ROOT=test-data all test integration

# Install binaries to /usr/local/bin and /usr/local/libexec (admin password)
make install

# Release build (better perf than debug)
BUILD_CONFIGURATION=release make all test integration
BUILD_CONFIGURATION=release make install
```

> **vmnet path bug (macOS 26):** network creation fails if the `container` helper binaries
> live under `~/Documents` or `~/Desktop`. Use `make install` (runs from `/usr/local`), or
> keep the project elsewhere (e.g. `~/projects/container`) when running the `bin`/`libexec`
> build artifacts directly.

To develop against a local checkout of the Containerization package or `container-builder-shim`,
point the runtime config (`~/.config/container/config.toml`) at your local `vminit`/builder
image and restart the services — see `BUILDING.md` for the exact swift-package steps. Attach a
debugger to an XPC helper by exporting `CONTAINER_DEBUG_LAUNCHD_LABEL=<launchd-label>` before
`container system start`.

---

## 7. How it differs from Docker, when to prefer it, and known limits

### `container` vs Docker / shared-VM on macOS

| Aspect | `container` (Apple) | Docker / shared-VM on macOS |
|--------|---------------------|-----------------------------|
| VM topology | **One lightweight Linux VM per container** | One big Linux VM shared by all containers |
| Isolation | Full-VM per container | Namespace isolation within one VM |
| Guest contents | Minimal core utils + libs + `vminitd` | Full Linux userland + daemon |
| Control plane | CLI → `ContainerClient` → `container-apiserver` (launchd) + XPC helpers | `dockerd` daemon inside the shared VM |
| Host data sharing | Mount only what each container needs | Mount everything into the shared VM up front |
| Networking | Per-container dedicated IP on vmnet (`default` ≈ 192.168.64.0/24) | Shared VM networking / Docker bridge |
| Images | Standard **OCI** in/out | OCI |
| Platform | **Apple silicon + macOS 26** (15 with limits) | Cross-platform |

**Prefer `container` when:** you're on Apple silicon and want VM-grade isolation per
container, minimal per-container footprint, per-container IPs, tight macOS integration
(launchd/Keychain/unified logging), and no always-on shared daemon. **Prefer Docker/Podman
when:** you need Intel-Mac support, features `container` hasn't implemented yet, or maximum
Docker-flag/ecosystem compatibility.

### Known limitations

- **Memory is not fully returned to macOS.** The Virtualization framework has only partial
  memory ballooning. A VM uses only what the app needs (start with `--memory 16g` but see ~2
  GiB in Activity Monitor), but pages freed *inside* the guest are **not** relinquished to the
  host. Running many memory-heavy containers may require occasionally **restarting** them.
- **Young project.** 1.0.0 is the first stable release; some containerization features common in
  Docker are still unimplemented (check `container <group> --help`). Expect standard semver going
  forward — breaking changes on major bumps, not patch releases.
- **macOS 15 networking limits** (see §3): no container-to-container traffic, single `default`
  network only, `container network`/`--network` unavailable, and a network-creation race that
  can cut containers off.

---

## 8. Container machines — a related but distinct concept

> **⚠️ Requires 1.0.0+.** The `container machine` group was added in 1.0.0 (not in 0.7.1). Check
> `container machine --help` on your install.

`container machine` (alias `m`) is **not** the app-shaped container above: it's a persistent,
integrated **Linux environment** modeled after a distro rather than a single app. It runs the
image's **init system** (so you can register long-running services / a process supervisor),
and **auto-maps your host username and home directory** into the guest, so your repos and
dotfiles are available on both sides with no copy step.

| Trait | Container | Container machine |
|-------|-----------|-------------------|
| Modeled after | one application | a full Linux environment / distro |
| Init | minimal (`vminitd`) | the image's own init (e.g. `systemd`) |
| User | as configured / `root` | matches your **host** account; `$HOME` mounted in |
| Lifetime | ephemeral by task | **persistent** across stop/start |

```bash
container machine create alpine:latest --name dev
container machine run -n dev whoami     # your host username, not root
container machine run -n dev            # interactive shell; your $HOME is mounted in
container machine set-default dev        # then drop -n
container machine set -n dev cpus=4 memory=8G   # takes effect after next stop/start
```

- Memory defaults to **half of host memory**; the home mount can be `rw` (default), `ro`, or
  `none`. Changes via `container machine set` apply after the next stop/start.
- **Nested virtualization** (`--virtualization` + a custom `CONFIG_KVM=y` kernel via
  `--kernel`) needs **Apple silicon M3+ and macOS 15+**; the default kernel does not support
  it.
- **Bring your own image:** any Linux image with `/sbin/init` works. On first boot `container`
  runs a built-in setup script to provision the mapped user; override it with an executable
  `/etc/machine/create-user.sh` in the image (runs once as root with `CONTAINER_UID`,
  `CONTAINER_GID`, `CONTAINER_USER`, `CONTAINER_HOME`, `CONTAINER_MACHINE_ID` set).

See `references/commands.md` for the full `machine` subcommand/flag matrix.
