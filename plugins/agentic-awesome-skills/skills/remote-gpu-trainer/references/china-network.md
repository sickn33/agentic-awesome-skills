# China network + model-download reference

Universal recipe for pulling code, packages, and model weights onto **any GPU box behind the GFW** —
AutoDL, 矩池云, 恒源云, Featurize, 揽睿星舟, or a bare CN SSH instance. The whole problem reduces to **four
orthogonal env-var switches** (mirror, cache location, resume tier, proxy scope); none requires editing
training code. This file owns the CN-specific transport swap and stall-retry; **REQUIRED:**
`huggingface-skills:hf-cli` owns the generic `hf download` / `hf upload` verbs underneath it.

Universal gotchas (inode caps, silent sync, symlinked caches) are **not** restated here — see
`references/gotchas_universal.md`. The AutoDL-pinned form lives in `profiles/autodl.md`.

To jump: `grep -in '<keyword>' references/china-network.md` (try `mirror`, `HF_ENDPOINT`, `hfd`,
`no_proxy`, `hf_transfer`, `decision`).

## Table of contents

1. Mirrors table — PyPI / conda / HuggingFace / alt hub
2. Env switchboard — the four switches + the import-time trap + cache redirect
3. Resumable-download ladder — three tiers + the `hf_transfer` caution
4. The `no_proxy` trap — a proxy that fixes one domain breaks all the others
5. Decision rule + `scripts/setup-china-mirrors.sh`

---

## 1. Mirrors table

Swap the *source*, not the workflow. Same package names, same repo IDs — only the endpoint changes. Ship
this verbatim; it is identical across every CN platform.

| Channel | Set | Endpoint(s) |
|---|---|---|
| **PyPI** | `pip config set global.index-url <url>` or `pip install -i <url> pkg` | Tsinghua TUNA `https://pypi.tuna.tsinghua.edu.cn/simple` · Aliyun `https://mirrors.aliyun.com/pypi/simple` · USTC `https://pypi.mirrors.ustc.edu.cn/simple` |
| **conda** | channels in `~/.condarc` (TUNA Anaconda) | `https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/main` + `.../free` + the `cloud/` channels (pytorch, conda-forge) |
| **HuggingFace** | `export HF_ENDPOINT=https://hf-mirror.com` | drop-in reverse proxy — identical repo IDs, identical `hf download` / `from_pretrained` calls |
| **Alt model hub** | ModelScope CLI / SDK | `pip install modelscope`; `modelscope download <id>` or `snapshot_download(id, ...)` — often hosts the same Qwen / GLM / Llama weights domestically |

**conda trap — NEVER mirror `pytorch-nightly`.** TUNA (and every CN Anaconda mirror) syncs the stable
`pytorch` channel but **does not carry `pytorch-nightly`** — pointing the nightly channel at a mirror
silently resolves to a stale or absent build. Install nightly only from the official channel (over a real
proxy if the box is offline), and mirror just the stable channels.

Source: HF-Mirror `https://hf-mirror.com/`; TUNA PyPI `https://mirrors.tuna.tsinghua.edu.cn/help/pypi/`;
TUNA Anaconda `https://mirrors.tuna.tsinghua.edu.cn/help/anaconda/`; ModelScope client
`https://github.com/modelscope/modelscope_hub`.

---

## 2. Env switchboard + the import-time trap

Everything below is **environment variables only** — no code edits. Export them once per shell (or bake
them into `scripts/setup-china-mirrors.sh`, §5) before anything that touches the wire.

```bash
# --- mirror routing ---
export HF_ENDPOINT=https://hf-mirror.com           # MUST precede any HF import (see trap below)
# --- caches OFF the small reset-on-release system disk, ONTO the data disk ---
export HF_HOME=/path/to/datadisk/hf                 # parent for hub/, datasets/, etc.
export HF_HUB_CACHE=/path/to/datadisk/hf/hub        # the model-blob cache specifically
export MODELSCOPE_CACHE=/path/to/datadisk/modelscope
# --- keep hf_transfer OFF on flaky CN links (see §3) ---
export HF_HUB_ENABLE_HF_TRANSFER=0
```

**The import-time trap — `HF_ENDPOINT` is read once, at import.** `huggingface_hub` / `transformers` /
`datasets` snapshot `HF_ENDPOINT` the moment they are **imported**. Setting it *after* the import (or in a
notebook cell run after the first `import transformers`) is a no-op — the library already cached the
international endpoint and every download hits the slow path. Two safe forms:

```bash
# Inline on the command — the env is set before the interpreter starts:
HF_ENDPOINT=https://hf-mirror.com python train.py
# Or export in the wrapper, ABOVE any python invocation:
export HF_ENDPOINT=https://hf-mirror.com   # then later: python -m src.train ...
```

**Cache redirect — why it matters.** Most CN images pair a tiny reset-on-release system disk with a larger
persistent data disk. Left at defaults, `~/.cache/huggingface` lands on the system disk and either fills it
(crashing downloads) or is **wiped on restart** on platforms where `/root` is ephemeral. Redirecting
`HF_HOME` / `HF_HUB_CACHE` / `MODELSCOPE_CACHE` onto the data disk ties model storage to the same
disk-budget discipline as checkpoints (principle #5; survival matrix in each profile).

Source: HF-Mirror `https://hf-mirror.com/`; ModelScope client
`https://github.com/modelscope/modelscope_hub`.

---

## 3. Resumable-download ladder

Bulk weight pulls are the prototypically flaky step on a CN link — a stall is **not** a permanent failure,
and every tier below accumulates progress across kills. Escalate by file size and instability.

**Tier 1 — `hf download <repo> --resume-download` (default).**
Writes partial blobs as `*.incomplete`; re-running the identical command resumes from the byte offset. Best
for single repos under ~10 GB. Wrap in a `timeout … && break` retry loop so a stall self-recovers:

```bash
#!/usr/bin/env bash
set -u
for _ in $(seq 1 20); do
  timeout 600 hf download "$REPO" --local-dir "$DIR" --resume-download && break
  echo "stall, retrying (progress is saved)"; sleep 5
done
```

(Underlying verbs — `hf download --resume-download`, `hf cache verify` — belong to **REQUIRED:**
`huggingface-skills:hf-cli`; this ladder only wraps them with CN-mirror routing + stall-retry.)

**Tier 2 — `hfd.sh` (aria2 multi-connection) for any single file > 10 GB.**
`hfd.sh` (the HF-Mirror companion script) drives `aria2c` with many parallel connections per file —
markedly faster and more stall-resistant than the single-stream CLI on large `.safetensors` shards over a
congested evening link. Reach for it whenever one file exceeds ~10 GB:

```bash
./hfd.sh "$REPO" --tool aria2c -x 8     # 8 connections per file, resumes on re-run
```

**Tier 3 — ModelScope `snapshot_download` (HTTP-Range resume).**
When a model exists on ModelScope (most CN-origin models do), pull it domestically — `snapshot_download`
does per-file HTTP-Range resume, per-file retry with backoff, and SHA256 verification, all over a domestic
route that never touches the GFW:

```python
from modelscope import snapshot_download
snapshot_download("Org/Model", local_dir="/path/to/datadisk/model")
```

Note: ModelScope writes a plain directory and does **not** populate the HF cache, so
`from_pretrained("Org/Model")` won't find it — point the load at the local dir.

**`hf_transfer` caution — keep `HF_HUB_ENABLE_HF_TRANSFER=0` on flaky CN networks.**
`hf_transfer` is a Rust accelerator that helps on fast, stable links, but it has a **documented
hang-with-no-error** in exactly the unstable-bandwidth conditions CN ops hit — the download wedges with no
progress and no exception, defeating every retry loop above. Leave it **off** by default on any CN box;
only enable it once a route is verified fast and stable.

Source: hf CLI resume `https://github.com/huggingface/huggingface_hub/issues/3580`; hf_transfer hang
`https://github.com/huggingface/hf_transfer/issues/30`; ModelScope download
`https://deepwiki.com/modelscope/modelscope/3.1-model-download-and-caching`.

---

## 4. The `no_proxy` trap

**The highest-value gotcha in this file.** A Clash / VPN proxy added to reach `huggingface.co`
**simultaneously breaks every domestic mirror** — `pip`, the TUNA index, ModelScope, intra-cloud OSS all
get routed out through an overseas exit node, producing `ProxyError` or multi-minute stalls (principle #7:
a proxy speeds ONE route and slows the others).

**Symptom** → after exporting `http_proxy`/`https_proxy` to fix HF, `pip install` and ModelScope downloads
hang or raise `ProxyError`, while `huggingface.co` now works.
**Root cause** → the proxy is global; domestic mirrors that were fast on the direct route are now hauled
overseas and back.
**Fix** → exempt every domestic host from the proxy with a `no_proxy` allowlist, minding these library
quirks:

- **Leading-dot domains, no `*` wildcards.** `requests` honors `no_proxy` but does **not** expand `*` — use
  `.modelscope.cn` (leading dot matches the domain and all subdomains), never `*.modelscope.cn`.
- **Set BOTH `no_proxy` and `NO_PROXY`.** Different libraries read different casings; set both to the same
  value.
- **List `127.0.0.1` AND `localhost`.** They are distinct entries; omitting either lets a loopback call
  (TensorBoard, a local API) get proxied.
- **`pip` ignores `no_proxy` for its own connections** — pass `pip install --proxy ""` to force pip onto the
  direct route regardless of an inherited proxy env.

```bash
# Only export this WHEN a proxy is present (see below):
DOMESTIC=".tuna.tsinghua.edu.cn,.aliyun.com,.aliyuncs.com,.ustc.edu.cn,.modelscope.cn,.tencentyun.com"
export no_proxy="127.0.0.1,localhost,${DOMESTIC}"
export NO_PROXY="$no_proxy"
```

**A clean box with no proxy needs no `no_proxy` at all.** `no_proxy` only un-routes a proxy that is already
set. On a freshly rented box with no `http_proxy`/`https_proxy` exported, adding `no_proxy` does nothing —
add it **only** in the same breath as exporting a proxy (§5's "real overseas proxy" branch), and clear it
when the proxy is unset.

Source: requests `no_proxy` `https://github.com/psf/requests/issues/4871`; no_proxy guide
`https://www.browserstack.com/guide/no_proxy-environment-variable`; Clash pip ProxyError
`https://github.com/clash-verge-rev/clash-verge-rev/issues/2607`.

---

## 5. Decision rule + delivery

**Pick the cheapest route that reaches the weights, in order:**

1. **hf-mirror first** — `HF_ENDPOINT=https://hf-mirror.com`. Drop-in, same repo IDs, no proxy, no
   `no_proxy` to manage. Default for everything.
2. **ModelScope** if the model is absent on the mirror or the mirror route is flaky — same Qwen / GLM /
   Llama weights domestically, Tier-3 resume, no GFW crossing.
3. **`hfd.sh`** for any single file > 10 GB on a stable-but-slow link — aria2 multi-connection.
4. **A real overseas proxy ONLY when a model exists *only* on `huggingface.co`** and neither mirror nor
   ModelScope carries it. The moment a proxy goes on, **immediately apply the §4 `no_proxy` block** so the
   domestic mirrors keep working — and unset both when the pull is done.

**Never** reach for a proxy by reflex: it is the slowest, most fragile option and the one that breaks
everything else. Mirror → alt hub → multi-connection → proxy, in that order of preference.

**Ship `scripts/setup-china-mirrors.sh`** — the orchestrator `scp`s it onto the box and `source`s it on
first connect. It bakes §1 (PyPI + conda mirrors), §2 (the four env switches + cache redirect off the
system disk), and the §3 default (`HF_HUB_ENABLE_HF_TRANSFER=0`) into one idempotent step, leaving the §4
proxy block commented out (added only on the rare proxy branch). Author it with `#!/usr/bin/env bash` +
`set -u`, forward-slash paths, and **no unquoted `|` inside any `grep`** (an unquoted pipe in a regex reads
stdin and hangs the setup forever).

Source: HF-Mirror `https://hf-mirror.com/`; ModelScope `https://github.com/modelscope/modelscope_hub`.
