# Debugging and iteration

How to iterate cheaply, read logs, and smoke-test. Dev mode + SSH exists as a last resort (covered at the bottom).

## The rung ladder

Pick the cheapest update mechanism that fits the change. Going one rung too high wastes 30 s – 15 min per cycle.

| Rung | When | Command | Cost |
|---|---|---|---|
| 1. Hot-reload | Pure Python edit on a Gradio Space (SDK 6.1+), **no new deps** | `hf spaces hot-reload <id> -f app.py` | seconds, no rebuild |
| 2. `hf upload` | Code-only change hot-reload can't handle (`gr.Server`, Streamlit, Docker entrypoint, non-Python file) | `hf upload <id> . --include '<file>'` | 30–90 s app restart |
| 3. Full rebuild | `requirements.txt`, `Dockerfile`, README frontmatter, or hardware change | `hf upload <id> . && hf spaces logs <id> --build --follow` | 1–15 min |
| 4. Factory reboot | Container in inconsistent state (broken pip env, etc.) | `hf spaces restart <id> --factory-reboot` | full rebuild + cold start |

### How hot-reload works

`hf spaces hot-reload <id> -f app.py` patches the running Python process in place via `jurigged` (vendored inside the `spaces` package), then commits the change to the repo with a hot-reload marker that tells the platform to skip its usual restart. Seconds, no rebuild.

Applies cleanly to function-body changes and new top-level symbols. Does **not** rerun module-level imports or one-time init — the model was loaded when `app.py` first ran and jurigged won't re-execute that load. New pip deps, README frontmatter, `Dockerfile`, and hardware changes need a full rebuild (rung 3).

Independent of dev mode. Marked experimental in the CLI. Requires Gradio SDK 6.1+.

### Footguns

- **Hot-reload poisons factory reboot.** A commit that's only a hot-reload leaves runtime metadata that's valid only while the hot process is alive. `--factory-reboot` on top of one can fail with `fatal: could not read Username for 'https://huggingface.co'`. Recovery: push any normal `hf upload` commit (even a one-line no-op) first, then restart.
- **`runtime.sha` lags repo SHA on restart.** `hf upload` succeeds → repo updates → `hf spaces info` keeps reporting the *previous* commit's SHA under `runtime` for several minutes while the new container loads. Poll `runtime.sha`, not just `stage`, and don't issue another restart until it flips.
- **Concurrent uploads or restart-while-uploading collide.** Wait for one to finish.
- **"Let me try locally first"** for anything that depends on the Space's Python / torch / CUDA env. The Space environment is the only one that matters. `python3 -m py_compile app.py` is the maximum local check worth doing before pushing.

## Reading logs

```bash
hf spaces info <id> --expand runtime           # stage at a glance
hf spaces logs <id> --build --follow           # build log, live
hf spaces logs <id> --follow                   # run log, live
hf spaces logs <id> --build --tail 500         # bigger window — default is small
```

Find the **first** error in the build log, not the last. Cascading errors after the first are noise.

State machine (terminal states in bold):

```
BUILDING → APP_STARTING → RUNNING
                      ↘ RUNTIME_ERROR
        ↘ BUILD_ERROR
        ↘ CONFIG_ERROR
```

For stage-specific lookups, see [`known-errors.md`](known-errors.md).

## Smoke-test patterns

A Space isn't done until a `gradio_client` call against the live URL exercises the endpoint end-to-end. Four steps in order — keep `hf spaces logs <id> --follow` running in another terminal throughout, so any silent fallback (model snapping to a different size, missing optional dep, dtype downgrade) surfaces.

### A. Alive?

```bash
hf spaces info <id> --expand runtime --format json \
  | python3 -c "import json,sys; r=json.load(sys.stdin)['runtime']; \
                print(r['stage'], r.get('hardware','?'))"
# expect: RUNNING zero-a10g
```

If `requested_hardware` is `cpu-basic` when you wanted GPU, your `--flavor` was rejected silently. Fix with `hf spaces settings <id> --hardware zero-a10g`.

### B. Logs clean post-boot?

```bash
hf spaces logs <id> --tail 200
```

Confirm the model finished loading, no import warnings, no "falling back to CPU" / dtype-downgrade messages, no failing health checks the platform forgave. Do this before calling the API — many silent failures (a config typo loading the wrong model, a missing optional dep, a one-time init that errored but didn't crash boot) are only visible here.

### C. API actually functions?

Default — sync `gr.Interface` / `gr.Blocks` / `gr.ChatInterface` / `gr.Server` `@app.api`:

```python
from gradio_client import Client, handle_file
import os

c = Client("<ns>/<name>", token=os.environ["HF_TOKEN"],
           httpx_kwargs={"timeout": 600})   # ≥ @spaces.GPU duration + 60s

print(c.view_api())                          # discover endpoints — don't guess api_name

result = c.predict(
    handle_file("test.png"),                 # file inputs need handle_file()
    "short prompt",
    api_name="/generate",                    # matches @app.api(name=...) or the function name
)
```

**Streaming endpoints** (function uses `yield` or `TextIteratorStreamer`) — `.predict()` returns only the final value. Iterate chunks via `.submit()`:

```python
job = c.submit("short prompt", api_name="/chat")
for chunk in job: print(chunk, end="")
# or job.result() for the final value
```

**`gr.Server` custom `@app.get/post(...)` routes** don't appear in `view_api()`. Hit them with plain HTTP:

```python
import httpx
r = httpx.post(f"https://<subdomain>.hf.space/your_route",
               json={...}, timeout=600,
               headers={"Authorization": f"Bearer {os.environ['HF_TOKEN']}"})
```

**OAuth-gated Spaces** (`hf_oauth: true` + `gr.LoginButton`) — anonymous `Client` can't authenticate. Test interactively after sign-in, or capture a session token and pass via `httpx_kwargs={"headers": {...}}`.

**MCP server mode** (`launch(mcp_server=True)`) — different protocol. Use an MCP client.

### D. Output bytes AND logs look right?

HTTP 200 ≠ correct output. Sniff both the returned file and the run log emitted during the call.

```python
head = open(path, "rb").read(16)
# b'glTF...'          → glb
# b'\x89PNG'          → png
# b'\xff\xd8'         → jpeg
# b'RIFF...WEBP'      → webp
# b'RIFF...WAVE'      → wav
# head[4:8]==b'ftyp'  → mp4
# b'ply\n'            → ply
```

For text: non-empty, not all `<think>...</think>` (thinking-model leak), length reasonable. For images: returned dimensions match what was requested (some models snap to nearest preset).

Look at the tailed run log alongside — silent fallbacks (model snapping resolution, missing optional dep falling back to a slower path, dtype downgrade) only show up there.

### What NOT to do

- **Don't launch Playwright / headless browser** to verify backend logic. The Gradio UI calls the same API `gradio_client` does — one `predict` tests both.
- **Don't build mock-mode + local-server harnesses** before pushing. Local-green ≠ Space-green.
- **Don't smoke-test with full-budget inputs.** Smallest input that exercises the GPU code path — short prompt, small image, low step count. You're verifying wiring, not quality.

## Iterating on the Space, not locally

The Space env is the only one that matters: Python, torch, CUDA, file paths, env vars, gradio version, the `spaces` hijack all differ from your laptop.

Workflow:

1. Decide SDK + hardware. Write the smallest `app.py` / `Dockerfile` + `requirements.txt` + README frontmatter — just enough that the entry point loads.
2. Push immediately. Don't build a Playwright / mock harness first.
3. Once `RUNNING`: verify with `gradio_client` against the real Space. That's your test loop.
4. Iterate via the cheapest rung.

`python3 -m py_compile app.py` is the maximum local check worth doing.

## Last resort: dev mode + SSH

Use only when:

- A failure is non-deterministic (device-side asserts, OOM under specific shapes, race conditions).
- You need `CUDA_LAUNCH_BLOCKING=1` or `gdb` to localize a CUDA error.
- You'd burn 4+ build cycles trying variations from outside.

Reading logs + grepping [`known-errors.md`](known-errors.md) + a tight `gradio_client` smoke loop solves the vast majority of issues. Dev mode is a heavy hammer.

### Prerequisites

1. **PRO / Team / Enterprise plan** — dev mode is a paid feature.
2. **An SSH key registered on the user's HF profile.** Without this, SSH refuses the connection. If the user doesn't have one yet, they need to:
   - Generate a keypair locally: `ssh-keygen -t ed25519 -f ~/.ssh/hf_dev -N ''` (no passphrase keeps automation simple; user can pick differently if they prefer).
   - Add the **public** key (`~/.ssh/hf_dev.pub`) at https://huggingface.co/settings/keys.
   - Keep the **private** key (`~/.ssh/hf_dev`) on the machine they'll SSH from.
3. **The Space must be in `RUNNING` or `RUNTIME_ERROR`** before dev mode lets you in — not `BUILD_ERROR`. If it's in build error, push a stub `app.py` that boots cleanly first (e.g. `import gradio as gr; gr.Interface(lambda: 'ok', None, 'text').launch()`), then enable dev mode.

### Enable

No `huggingface_hub` Python wrapper yet — use the REST endpoint:

```bash
curl -s -X POST \
  -H "Authorization: Bearer $HF_TOKEN" \
  -H "Content-Type: application/json" \
  "https://huggingface.co/api/spaces/<ns>/<space>/dev-mode" \
  -d '{"enabled": true}'
```

### SSH in

```bash
ssh -i ~/.ssh/hf_dev -o BatchMode=yes -o StrictHostKeyChecking=accept-new \
    <ns>-<space>@ssh.hf.space
```

Username is `<namespace>-<space>` **lowercase**, with `-` replacing `/`. Dots in the Space name become hyphens too.

### Inside the VM

It's a normal container at `/home/user/app/`. You can edit files, `pip install`, run repros, call `@spaces.GPU`-decorated functions interactively (they get a real GPU window).

**`nvidia-smi` in the bare terminal will fail** with `NVML: Unknown Error`. Expected — ZeroGPU only exposes the real GPU inside `@spaces.GPU` calls. Don't assume the GPU is broken.

**Edits in `/home/user/app/` don't survive** a restart, sleep, or dev-mode-disable. Only commits persist.

### Smoke-test the fix inside the container

Before exiting dev mode, verify the fix actually works under a real GPU window:

```bash
cat > /home/user/app/_devtest.py <<'PY'
import spaces, torch
from app import predict   # or whatever your @spaces.GPU function is
print(predict(<realistic-args>))
PY
python3 _devtest.py
```

### Persist + exit

Commit + push from inside the container (`git config user.email / user.name` first; the HF git remote works). Then disable dev mode:

```bash
curl -s -X POST -H "Authorization: Bearer $HF_TOKEN" \
  -H "Content-Type: application/json" \
  "https://huggingface.co/api/spaces/<ns>/<space>/dev-mode" \
  -d '{"enabled": false}'
```

**Factory-reboot** to apply the pushed state (in dev mode the Space won't rebuild on commits):

```python
from huggingface_hub import HfApi
HfApi(token=HF_TOKEN).restart_space("<ns>/<space>", factory_reboot=True)
```

Then re-run the outside-the-container smoke test. Dev-mode success does **not** guarantee post-rebuild success — different image, different process tree.
