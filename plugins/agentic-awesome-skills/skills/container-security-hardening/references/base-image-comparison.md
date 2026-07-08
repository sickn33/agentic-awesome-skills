# Base Image Comparison Reference

Quick decision guide for choosing the right container base image — balancing security, compatibility, size, and debuggability.

---

## Quick Decision Matrix

| Runtime / Need | Best Choice | Fallback |
|---|---|---|
| Go / Rust — fully static binary | `scratch` | `gcr.io/distroless/static-debian12` |
| Go / Rust — with CGO or dynamic libs | `gcr.io/distroless/base-debian12` | `alpine:3.20` |
| Node.js app (production) | `gcr.io/distroless/nodejs20-debian12` | `node:20-slim` |
| Python app (production) | `gcr.io/distroless/python3-debian12` | `python:3.12-slim` |
| Java app (production) | `gcr.io/distroless/java21-debian12` | `eclipse-temurin:21-jre-alpine` |
| Shell scripts required | `alpine:3.20` | `debian:12-slim` |
| musl compatibility issue | `node:20-slim` (glibc) | `debian:12-slim` |
| Debugging in staging | distroless `:debug` variant | `ubuntu:24.04` (temporary) |

---

## Size & CVE Comparison

> Approximate values as of mid-2025. Run `trivy image <name>` for current counts.

| Image | Compressed Size | Typical CVE Count | Shell | Package Manager | libc |
|---|---|---|---|---|---|
| `scratch` | 0 MB | 0 | No | No | None |
| `gcr.io/distroless/static-debian12` | ~2 MB | 0–2 | No | No | None |
| `gcr.io/distroless/base-debian12` | ~20 MB | 0–3 | No | No | glibc |
| `gcr.io/distroless/nodejs20-debian12` | ~55 MB | 0–5 | No | No | glibc |
| `gcr.io/distroless/python3-debian12` | ~50 MB | 0–5 | No | No | glibc |
| `gcr.io/distroless/java21-debian12` | ~220 MB | 0–5 | No | No | glibc |
| `alpine:3.20` | ~3.5 MB | 0–5 | Yes (ash) | Yes (apk) | musl |
| `node:20-alpine` | ~65 MB | 5–20 | Yes | Yes | musl |
| `python:3.12-alpine` | ~55 MB | 5–20 | Yes | Yes | musl |
| `node:20-slim` | ~90 MB | 15–40 | Yes | Yes (minimal apt) | glibc |
| `python:3.12-slim` | ~60 MB | 15–40 | Yes | Yes (minimal apt) | glibc |
| `eclipse-temurin:21-jre-alpine` | ~180 MB | 5–20 | Yes | Yes | musl |
| `node:20` (full) | ~370 MB | 80–200 | Yes | Yes (full apt) | glibc |
| `ubuntu:24.04` | ~30 MB | 20–60 | Yes | Yes (full apt) | glibc |
| `ubuntu:24.04` (full packages) | ~200 MB+ | 50–150 | Yes | Yes | glibc |

---

## Detailed Trade-offs

### `scratch`
**Best for:** Go, Rust, or any fully static binary with `CGO_ENABLED=0`

- ✅ Zero attack surface — literally empty
- ✅ Smallest possible image
- ✅ No package manager to exploit
- ❌ No libc, no shell, no CA certs, no timezone data — must `COPY` them in
- ❌ Cannot exec into for debugging (no shell at all)

```dockerfile
FROM golang:1.22-alpine AS builder
WORKDIR /build
COPY go.* ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags="-s -w -extldflags=-static" \
    -o app .

FROM scratch
# Copy CA certs for HTTPS calls
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
# Copy timezone data if needed
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo
COPY --from=builder /build/app /app
USER 65532:65532
ENTRYPOINT ["/app"]
```

---

### `gcr.io/distroless` (Google)
**Best for:** Production Node.js, Python, Java, Go (with CGO)

- ✅ No shell, no package manager — dramatically reduced attack surface
- ✅ Includes CA certs and tzdata by default
- ✅ Built-in `nonroot` user (UID 65532)
- ✅ Based on Debian — glibc compatibility (no musl issues)
- ✅ Regularly patched by Google
- ❌ Cannot exec into with `docker exec -it` (no shell) — use `:debug` variant for staging

```bash
# Available distroless variants
gcr.io/distroless/static-debian12       # No libc — for fully static binaries
gcr.io/distroless/base-debian12         # glibc + openssl — for dynamic Go/Rust
gcr.io/distroless/nodejs20-debian12     # Node.js 20 runtime
gcr.io/distroless/nodejs22-debian12     # Node.js 22 runtime
gcr.io/distroless/python3-debian12      # Python 3 runtime
gcr.io/distroless/java21-debian12       # JRE 21
gcr.io/distroless/cc-debian12           # C/C++ runtime

# Debug variants — include busybox shell for staging only
gcr.io/distroless/nodejs20-debian12:debug
gcr.io/distroless/python3-debian12:debug
```

**Debugging a distroless container (staging only):**
```bash
# Use a sidecar debug container instead of modifying the production image
kubectl debug -it deploy/myapp \
  --image=busybox \
  --target=app \
  --copy-to=debug-pod
```

---

### `alpine`
**Best for:** Images where a shell is required, or when image size is a primary concern

- ✅ Very small (~3.5 MB)
- ✅ Has shell (ash) and package manager (apk) — great for debugging
- ✅ Regularly patched, active community
- ⚠️ Uses **musl libc** — some Python C extensions, Node.js native modules, or glibc-dependent binaries may fail
- ❌ More CVEs than distroless (more packages)

**musl compatibility check:**
```bash
# Test your app on alpine before committing
docker run -it --rm -v $(pwd):/app node:20-alpine sh -c "cd /app && npm ci && npm test"
```

**Common musl issues:**
- `bcrypt`, `node-gyp`, `sharp`, `canvas` native modules → may need build tools
- Python with `numpy`, `scipy`, `pandas` → use `python:3.12-slim` instead
- Java apps → generally fine, but test thoroughly

---

### `slim` variants (Debian-based)
**Best for:** Apps with glibc dependencies that can't use distroless

- ✅ glibc compatibility — no musl issues
- ✅ Familiar `apt` ecosystem
- ✅ Smaller than full image (~60–90 MB vs 300–400 MB)
- ❌ More CVEs than distroless (has apt, shell, more system libraries)
- ❌ Larger than alpine

```dockerfile
FROM node:20-slim
# Install only what's needed and clean up in the same layer
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      libssl3 \
    && rm -rf /var/lib/apt/lists/*
```

---

### Full Images (`node:20`, `ubuntu:24.04`, `python:3.12`)
**Only for:** Development, CI build stages, or debugging — NEVER as production runtime

- ❌ Massive attack surface (50–200+ CVEs)
- ❌ Includes compilers, build tools, package managers — not needed at runtime
- ❌ Huge size increases pull time and storage costs

Use as a build stage only:
```dockerfile
FROM node:20 AS builder     # Full image for building
FROM node:20-slim AS runtime  # Slim image for production
```

---

## Keeping Base Images Updated

**The most common source of container CVEs is outdated base images.**

### Manual Check
```bash
# Pull latest and check digest
docker pull node:20-slim
docker inspect node:20-slim --format='{{index .RepoDigests 0}}'

# Check for CVEs in current base before updating
trivy image node:20-slim --severity HIGH,CRITICAL
```

### Automate with Renovate (Recommended)
```json
// .renovaterc.json
{
  "extends": ["config:base"],
  "dockerfile": {
    "enabled": true,
    "pinDigests": true
  },
  "packageRules": [
    {
      "matchDatasources": ["docker"],
      "matchPackagePatterns": ["^gcr.io/distroless"],
      "automerge": true,
      "automergeType": "branch"
    }
  ]
}
```

### Automate with Dependabot
```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "docker"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
```

---

## Distroless Digest Pinning Reference

Always pin to digest. Check current digests at:
- `gcr.io/distroless/nodejs20-debian12` → `docker pull gcr.io/distroless/nodejs20-debian12 && docker inspect gcr.io/distroless/nodejs20-debian12 --format='{{index .RepoDigests 0}}'`
- Use [Google's distroless tags page](https://github.com/GoogleContainerTools/distroless/blob/main/README.md) for latest releases

---

## Image Size Reduction Checklist

When an image is too large:

- [ ] Switched to distroless or alpine runtime stage?
- [ ] Multi-stage build separating build from runtime?
- [ ] `npm ci --only=production` / `pip install --no-dev`?
- [ ] Build cache cleaned in same `RUN` layer (`rm -rf /var/lib/apt/lists/*`, `npm cache clean --force`)?
- [ ] `.dockerignore` excludes `node_modules`, `.git`, `tests/`, `docs/`?
- [ ] Using `--mount=type=cache` for package manager cache (BuildKit)?
- [ ] Only necessary files `COPY`-ed into runtime stage?
- [ ] No debug tools in production image?

```bash
# Analyze image layers to find what's taking space
docker history --no-trunc myapp:latest
dive myapp:latest    # Interactive layer explorer: https://github.com/wagoodman/dive
```
