#!/usr/bin/env python3
"""Engine-agnostic hill-climb benchmark for any OpenAI-compatible server (vLLM, SGLang, llama.cpp server,
TabbyAPI, MLX-LM server, LM Studio, Ollama's /v1 ...). Standard library only.

  python3 bench.py run configs/NAME.json [--long N] [--skip-cN] [--reps 6]
  python3 bench.py show [ledger.jsonl]

Config (JSON):
  {
    "name": "ctl-a",                              # unique run name (ledger key)
    "base_url": "http://127.0.0.1:8000",
    "model": "my-model",                           # served model name
    "launch": ["docker", "run", "-d", "..."],      # optional; omit to benchmark an already-running server
    "stop":   ["docker", "stop", "-t", "60", "srv"],  # optional; run after a drain wait
    "health_timeout_s": 900,
    "concurrency": 4,                              # N for the cN test
    "prefill_lengths": [4096, 32768],              # approximate prompt tokens for cold prefill
    "extra_body": {"chat_template_kwargs": {"enable_thinking": false}},  # merged into every request
    "temperature": 0.6,
    "memory": {"cap_gib": 46, "probe": ["bash", "mem.sh", "srv"], "interval_s": 3},  # probe prints bytes
    "require_ac": true                             # refuse to run on battery (Linux / macOS)
  }

Measurements (all token counts come from the server's usage stats, never from streamed chunks):
  startup_s, ttft_short_ms, c1_decode (median of --reps), c1_all, cN_aggregate (wall clock), cN_per_stream,
  prefill_<L> (prompt_tokens / TTFT on a unique cold prompt), long-context needle retrieval (--long),
  mem_peak_gib, flags (LOOP, REQ_FAIL, ON_BATTERY, MEM_CAP). Results are appended to ledger.jsonl.
The server is left running after a run (the next run's launch stops it first); stop it yourself when done.
"""
import json, os, random, statistics, string, subprocess, sys, threading, time, urllib.request
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
PROMPTS = [  # fixed panel: acceptance and speed depend on content, so never randomise these
    "Write a Python implementation of an LRU cache with O(1) get and put, with docstrings and tests.",
    "Explain, step by step, how TCP congestion control works, including slow start and fast recovery.",
    "Write a short story (about 600 words) about a lighthouse keeper who finds a message in a bottle.",
    "Compare B-trees and LSM-trees for a write-heavy database workload. Use a table and give a recommendation.",
    "Write a bash script that backs up a directory to a timestamped tar.gz and keeps only the last 7 backups.",
    "Summarise the causes and consequences of the 1929 stock market crash in five paragraphs.",
]
WORDS = ("river stone paper cloud engine garden silver market winter orange signal harbor violet "
         "candle forest mirror thunder copper meadow lantern").split()


def log(*a):
    print(time.strftime("%H:%M:%S"), *a, flush=True)


class Server:
    def __init__(self, cfg):
        self.cfg, self.base = cfg, cfg.get("base_url", "http://127.0.0.1:8000").rstrip("/")

    def get(self, path, timeout=5):
        with urllib.request.urlopen(self.base + path, timeout=timeout) as r:
            return json.loads(r.read() or b"{}")

    def healthy(self):
        try:
            return bool(self.get("/v1/models").get("data"))
        except Exception:
            return False

    def chat(self, prompt, max_tokens, temperature=None, timeout=7200):
        """Stream one chat completion. Returns ttft, decode tok/s, prompt/completion tokens (server usage)."""
        body = {"model": self.cfg["model"], "messages": [{"role": "user", "content": prompt}],
                "max_tokens": max_tokens, "stream": True, "stream_options": {"include_usage": True},
                "temperature": self.cfg.get("temperature", 0.6) if temperature is None else temperature}
        body.update(self.cfg.get("extra_body", {}))
        req = urllib.request.Request(self.base + "/v1/chat/completions", data=json.dumps(body).encode(),
                                     headers={"Content-Type": "application/json"})
        t0 = time.monotonic(); t_first = None; text = []; usage = {}
        with urllib.request.urlopen(req, timeout=timeout) as r:
            for raw in r:
                line = raw.decode("utf-8", "replace").strip()
                if not line.startswith("data:"):
                    continue
                data = line[5:].strip()
                if data == "[DONE]":
                    break
                ev = json.loads(data)
                if ev.get("usage"):
                    usage = ev["usage"]
                for ch in ev.get("choices") or []:
                    d = ch.get("delta") or {}
                    piece = (d.get("content") or "") + (d.get("reasoning_content") or d.get("reasoning") or "")
                    if piece:
                        if t_first is None:
                            t_first = time.monotonic()
                        text.append(piece)
        t_end = time.monotonic()
        ct, pt = usage.get("completion_tokens"), usage.get("prompt_tokens")
        if t_first is None:
            t_first = t_end
        decode = (ct - 1) / (t_end - t_first) if ct and ct > 1 and t_end > t_first else None
        return {"ttft": t_first - t0, "decode": decode, "completion_tokens": ct, "prompt_tokens": pt,
                "wall": t_end - t0, "t0": t0, "t_end": t_end, "text": "".join(text)}


def looping(text, n=8, thresh=0.5):
    """Degenerate-output flag: share of repeated word n-grams."""
    w = text.split()
    grams = [tuple(w[i:i + n]) for i in range(max(0, len(w) - n))]
    return len(grams) > 50 and 1 - len(set(grams)) / len(grams) > thresh


def document(tokens, seed, needles=3):
    """Unique filler document of ~`tokens` tokens with `needles` retrieval codes at spread depths.
    Token count is approximate: the real count comes back as prompt_tokens and is what gets reported."""
    rng = random.Random(seed)
    n_words = int(tokens / 1.6)
    words = [rng.choice(WORDS) for _ in range(n_words)]
    codes = ["".join(rng.choices(string.ascii_uppercase + string.digits, k=8)) for _ in range(needles)]
    for i, c in enumerate(codes):
        pos = int(n_words * (i + 1) / (needles + 1))
        words.insert(pos, f". The secret code number {i + 1} is {c}. ")
    head = f"[doc {seed}-{time.time_ns()}] "  # defeats prefix caching
    q = "\n\nList every secret code number and its value that appears in the document above. Answer only with the codes."
    return head + " ".join(words) + q, codes


def on_ac():
    try:
        if sys.platform == "darwin":
            return "AC Power" in subprocess.run(["pmset", "-g", "batt"], capture_output=True, text=True).stdout
        import glob
        vals = [open(p).read().strip() for p in glob.glob("/sys/class/power_supply/*/online")]
        return not vals or "1" in vals
    except Exception:
        return True


class MemWatch(threading.Thread):
    def __init__(self, mcfg, on_trip):
        super().__init__(daemon=True)
        self.mcfg, self.on_trip, self.peak, self.tripped, self.stop = mcfg, on_trip, 0, False, threading.Event()

    def run(self):
        cap = self.mcfg.get("cap_gib", 1e9) * 2**30
        while not self.stop.wait(self.mcfg.get("interval_s", 3)):
            try:
                b = int(subprocess.run(self.mcfg["probe"], capture_output=True, text=True, timeout=30).stdout.strip() or 0)
            except Exception:
                continue
            self.peak = max(self.peak, b)
            if b > cap and not self.tripped:
                self.tripped = True
                log(f"MEMORY CAP EXCEEDED: {b / 2**30:.1f} GiB > {cap / 2**30:.1f} GiB")
                self.on_trip()


def run(cfg_path, long_ctx=None, skip_cn=False, reps=6):
    cfg = json.load(open(cfg_path))
    srv, res, flags = Server(cfg), {"name": cfg["name"], "time": time.strftime("%Y-%m-%dT%H:%M:%S")}, []
    if cfg.get("require_ac") and not on_ac():
        sys.exit("refusing to run on battery (require_ac)")

    def stop_server():
        if cfg.get("stop"):
            subprocess.run(cfg["stop"], capture_output=True)

    watch = MemWatch(cfg["memory"], stop_server) if cfg.get("memory", {}).get("probe") else None
    if cfg.get("launch"):
        stop_server()
        t0 = time.monotonic()
        subprocess.run(cfg["launch"], check=True, capture_output=True)
        if watch:
            watch.start()
        deadline = t0 + cfg.get("health_timeout_s", 900)
        while not srv.healthy():
            if time.monotonic() > deadline or (watch and watch.tripped):
                res.update(ok=False, error="server did not become healthy")
                return finish(res, flags, watch)
            time.sleep(1)
        res["startup_s"] = round(time.monotonic() - t0, 1)
        log("healthy after", res["startup_s"], "s")
    else:
        if not srv.healthy():
            sys.exit("server not reachable and no launch command given")
        if watch:
            watch.start()
    try:
        srv.chat("Say hello.", 16)  # warm-up (not measured)
        r = srv.chat("Reply with the single word: ready", 8)
        res["ttft_short_ms"] = round(r["ttft"] * 1000, 1)

        c1 = []
        for i in range(reps):
            r = srv.chat(PROMPTS[i % len(PROMPTS)], 512)
            if r["decode"]:
                c1.append(round(r["decode"], 2))
            if looping(r["text"]):
                flags.append("LOOP")
        res["c1_decode"] = round(statistics.median(c1), 2) if c1 else None
        res["c1_all"] = c1
        log("c1 median", res["c1_decode"], c1)

        n = int(cfg.get("concurrency", 4))
        if n > 1 and not skip_cn:
            with ThreadPoolExecutor(n) as ex:
                rs = list(ex.map(lambda i: srv.chat(PROMPTS[i % len(PROMPTS)], 512), range(n)))
            toks = sum((x["completion_tokens"] or 0) for x in rs)
            wall = max(x["t_end"] for x in rs) - min(x["t0"] for x in rs)
            res[f"c{n}_aggregate"] = round(toks / wall, 2)
            res[f"c{n}_per_stream"] = [round(x["decode"] or 0, 2) for x in rs]
            log(f"c{n} aggregate", res[f"c{n}_aggregate"])

        for L in cfg.get("prefill_lengths", [4096, 32768]):
            prompt, _ = document(L, seed=L)
            r = srv.chat(prompt, 1, temperature=0.0)
            res[f"prefill_{L}"] = round(r["prompt_tokens"] / r["ttft"], 1) if r["prompt_tokens"] else None
            res[f"prefill_{L}_tokens"] = r["prompt_tokens"]
            log(f"prefill ~{L}", res[f"prefill_{L}"], "tok/s over", r["prompt_tokens"], "tokens")

        if long_ctx:
            prompt, codes = document(long_ctx, seed=7)
            r = srv.chat(prompt, 256, temperature=0.0)
            res["long"] = {"prompt_tokens": r["prompt_tokens"], "ttft_s": round(r["ttft"], 1),
                           "prefill": round(r["prompt_tokens"] / r["ttft"], 1) if r["prompt_tokens"] else None,
                           "decode": r["decode"] and round(r["decode"], 2),
                           "retrieval": f"{sum(c in r['text'] for c in codes)}/{len(codes)}"}
            log("long", res["long"])
        res["ok"] = True
    except Exception as e:
        res.update(ok=False, error=repr(e)); flags.append("REQ_FAIL")
    return finish(res, flags, watch)


def finish(res, flags, watch):
    if watch:
        watch.stop.set()
        res["mem_peak_gib"] = round(watch.peak / 2**30, 2)
        if watch.tripped:
            flags.append("MEM_CAP"); res["ok"] = False
    if not on_ac():
        flags.append("ON_BATTERY"); res["ok"] = False
    res["flags"] = sorted(set(flags))
    with open("ledger.jsonl", "a") as f:
        f.write(json.dumps(res) + "\n")
    print(json.dumps(res, indent=1))
    return res


def show(path="ledger.jsonl"):
    rows = [json.loads(l) for l in open(path) if l.strip()]
    agg = sorted({k for d in rows for k in d if k.startswith("c") and k.endswith("_aggregate")})
    pre = sorted({k for d in rows for k in d if k.startswith("prefill_") and k[8:].isdigit()}, key=lambda k: int(k[8:]))
    keys = ["c1_decode", *agg, *pre, "ttft_short_ms", "startup_s", "mem_peak_gib"]
    print("name".ljust(24) + "".join(k[:13].rjust(14) for k in keys) + "  flags")
    for d in rows:
        print(d["name"][:24].ljust(24) + "".join(str(d.get(k, "-"))[:13].rjust(14) for k in keys) + "  " + ",".join(d.get("flags", [])))


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a or a[0] not in ("run", "show"):
        sys.exit(__doc__)
    if a[0] == "show":
        show(*(a[1:2]))
    else:
        opt = lambda k, d=None: a[a.index(k) + 1] if k in a else d
        if len(a) < 2:
            sys.exit("run requires a configuration file")
        result = run(a[1], long_ctx=int(opt("--long")) if opt("--long") else None,
                     skip_cn="--skip-cN" in a, reps=int(opt("--reps", 6)))
        sys.exit(0 if result["ok"] else 1)
