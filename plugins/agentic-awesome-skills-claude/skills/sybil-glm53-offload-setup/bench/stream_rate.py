#!/usr/bin/env python3
"""Streaming delivery check against a running server: the stream must arrive at the generation rate, not lag behind it
and flush at the end (the G072 defect in digest sha256:1159044a: ~14 tok/s delivered while ~29 tok/s were generated).

For each endpoint (OpenAI chat stream, SGLang /generate stream) one greedy long answer is streamed; with t = arrival time
of each content-bearing event and c = cumulative characters received:
  half_share  = share of the final text that has arrived by the midpoint between first and last event (uniform ~0.5;
                the defect gives ~0.25)
  tail_share  = share of the final text that arrives in the last 1 s (the defect flushes ~50 % there)
PASS when half_share >= 0.40 and tail_share <= 0.10 on every endpoint. Exit code 0 = pass, 1 = fail.
  python3 bench/stream_rate.py --url http://127.0.0.1:30000
"""
import argparse, json, sys, time, urllib.request

Q = "Write a long, detailed essay (at least 1200 words) on the history of the printing press."


def stream(url, path, payload):
    req = urllib.request.Request(url + path, data=json.dumps(payload).encode(), headers={"Content-Type": "application/json"})
    pts, total = [], 0
    with urllib.request.urlopen(req, timeout=3600) as r:
        for raw in r:
            line = raw.decode().strip()
            if not line.startswith("data:") or line[5:].strip() == "[DONE]":
                continue
            ev = json.loads(line[5:].strip())
            if "choices" in ev:   # OpenAI chunk: deltas
                d = ev["choices"][0].get("delta") or {}
                k = len(d.get("content") or "") + len(d.get("reasoning_content") or "")
                total += k
            else:                 # SGLang /generate: cumulative text
                k = len(ev.get("text") or "") - total
                total = len(ev.get("text") or "")
            if k > 0:
                pts.append((time.perf_counter(), total))
    return pts


def score(pts):
    t0, t1, n = pts[0][0], pts[-1][0], pts[-1][1]
    mid = t0 + (t1 - t0) / 2
    half = max([c for t, c in pts if t <= mid] or [0]) / n
    before_tail = max([c for t, c in pts if t <= t1 - 1.0] or [0])
    return {"events": len(pts), "chars": n, "span_s": round(t1 - t0, 2), "half_share": round(half, 3),
            "tail_share": round(1 - before_tail / n, 3)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="http://127.0.0.1:30000")
    ap.add_argument("--model", default="glm-5.3-flash")
    a = ap.parse_args()
    ok = True
    chat = stream(a.url, "/v1/chat/completions", {"model": a.model, "stream": True, "temperature": 0,
                  "messages": [{"role": "user", "content": Q}], "chat_template_kwargs": {"enable_thinking": False}})
    tok = json.loads(urllib.request.urlopen(urllib.request.Request(
        a.url + "/tokenize", data=json.dumps({"prompt": f"[gMASK]<sop><|user|>{Q}<|assistant|><think></think>"}).encode(),
        headers={"Content-Type": "application/json"}), timeout=60).read())["tokens"]
    gen = stream(a.url, "/generate", {"input_ids": tok, "stream": True, "sampling_params": {"temperature": 0}})
    for name, pts in (("chat", chat), ("generate", gen)):
        s = score(pts)
        s["pass"] = s["half_share"] >= 0.40 and s["tail_share"] <= 0.10
        ok &= s["pass"]
        print(name, json.dumps(s), flush=True)
    print("STREAM_RATE", "PASS" if ok else "FAIL", flush=True)
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
