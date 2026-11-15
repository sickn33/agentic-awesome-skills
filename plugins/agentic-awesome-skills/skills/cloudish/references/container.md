# How Cloudish isolates containers

What keeps one app's container apart from another's, and from the platform
itself, on this deployment (https://cloudish.ai). It describes how things work
today, not a guarantee.

## Where a container runs

- Each app is its own Kubernetes Deployment and pod, running its own image,
  with its own internal address and, if it has one, its own volume.
- App pods run on worker machines reserved for apps: the platform's own
  services run on separate machines, and image builds on separate build
  machines.
- Apps from different keys share worker machines, and so that machine's
  Linux kernel, as containers on one machine do. There is no per-app
  virtual machine or kernel sandbox.
- All apps run in one Kubernetes namespace, alongside the platform's own
  services. The rest of this page is what keeps them apart.

## Network

- **Inbound:** an app's container accepts connections only from the
  platform's proxy, which every request to its subdomain or custom domains
  passes through. A private app's access check happens in that proxy, so
  nothing reaches the container without passing it. Other apps can't
  connect to the container directly.
- **Outbound:** the container can reach the internet, DNS, and any public
  URL, including other Cloudish apps and the Cloudish API at their public
  addresses. It can't reach another app's pod, the platform's internal
  services at their internal addresses, the database, the cloud provider's
  metadata service, the machines' own ports, or the Kubernetes API.
  Private, link-local and CGNAT address ranges are blocked.
- Apps that talk to each other do it over their public URLs, with whatever
  authentication they set up themselves.

## Privileges

- **No Kubernetes credentials:** no service-account token is mounted.
- **No service links:** the container gets no environment variables
  advertising other services in the cluster.
- **System call filter:** the container runtime's default seccomp profile
  (`RuntimeDefault`) limits which system calls the container can make.
- **No privilege escalation** (`allowPrivilegeEscalation: false`): setuid
  programs such as `sudo` and `su` can't raise privileges. A container
  that starts as root and switches to another user is unaffected.
- **No raw sockets** (`NET_RAW` dropped): the container can't forge network
  packets, and `ping` doesn't work. The other default capabilities stay,
  so binding port 80, `chown` and switching users work as usual.
- **User:** the container runs as the user its image sets with `USER`, or
  root if it sets none. Cloudish doesn't force a non-root user, because many
  images expect root. A volume is mounted with group 10001 (`fsGroup`), so
  a non-root user can write to it.

## Resources

- Each app reserves the CPU and memory of its size, and can't use more than
  its limit. A container over its memory limit is restarted.
- `shared` reserves 0.1 CPU and 0.2 GB and may use up to 1 CPU and 1 GB when the
  machine has them spare. It has a lower priority than other sizes, and is
  the first restarted when a machine runs short of memory. Sizes:
  [instances.md](instances.md).

## Storage

- A volume is a block device attached to one app's pod only: no other app
  can mount it. It survives restarts and sleep.

## Builds

- Each build runs in its own short-lived pod on the build machines, with
  rootless BuildKit. BuildKit needs seccomp and AppArmor unconfined, so a
  build doesn't get the system call filter apps do.
- A build's network is restricted like an app's, plus the platform's
  registry and the build's own uploaded context.

## What the platform adds to traffic

- Requests reach the app with `X-Forwarded-For`, `-Host` and `-Proto`
  headers set by the proxy.
- Responses get `Strict-Transport-Security` from the HTTPS ingress, and
  nothing else: no CORS or other security headers. An app sets its own.
