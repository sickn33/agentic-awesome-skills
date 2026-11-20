#!/usr/bin/env python3
"""Score an SGLang server against the exllamav3 reference panel (reference/qwen3.8-flash-next-exl3-ref-panel.json):
teacher-force each panel sequence (`tokens` = prompt + reference greedy completion) and compare the server's
distributions at positions prompt_len-1 .. end with the reference top-20 logprobs.

Metrics: top-1 agreement (server argmax == reference argmax), mean KL(ref || server) on the reference top-20 support
(both renormalised over those 20 ids; server logprobs for the ids come from `token_ids_logprob`, exact), plus the
fraction of positions where the reference greedy token is the server argmax.

  python3 tools/score_ref_panel.py --url http://127.0.0.1:30100 --panel ref_panel.json --out score.json
"""
import argparse
import json
import math
import urllib.request


def post(url, path, payload, timeout=3600):
    req = urllib.request.Request(url + path, data=json.dumps(payload).encode(), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="http://127.0.0.1:30100")
    ap.add_argument("--panel", required=True)
    ap.add_argument("--out")
    a = ap.parse_args()
    panel = json.load(open(a.panel))
    tot = {"pos": 0, "top1": 0, "kl": 0.0, "greedy": 0}
    per = []
    for i, item in enumerate(panel):
        toks, P = item["tokens"], item["prompt_len"]
        ref_ids, ref_lp = item["top20_ids"], item["top20_lp"]
        support = sorted({t for row in ref_ids for t in row})
        # positions P-1 .. len-1 predict tokens P .. len (the last one predicts past the end: the generated token)
        r = post(a.url, "/generate", {"input_ids": toks, "return_logprob": True, "logprob_start_len": P - 1,
                                      "top_logprobs_num": 20, "token_ids_logprob": support,
                                      "sampling_params": {"temperature": 0, "max_new_tokens": 1}})
        m = r["meta_info"]
        itop, iids = m["input_top_logprobs"], m["input_token_ids_logprobs"]
        otop, oids = m["output_top_logprobs"], m["output_token_ids_logprobs"]
        # SGLang: entry j of the input lists belongs to token (P-1+j) and holds the distribution that predicted it,
        # i.e. logits at position P-2+j; entry 0 is the prompt's first scored token. Shift by one: our position
        # p = P-1+j (predicting token p+1) is input entry j+1, and the last position is the first output entry.
        dists_top = list(itop[1:]) + [otop[0]]
        dists_ids = list(iids[1:]) + [oids[0]]
        n = len(ref_ids)
        assert len(dists_top) >= n, (len(dists_top), n)
        s = {"pos": 0, "top1": 0, "kl": 0.0, "greedy": 0}
        for j in range(n):
            srv_top = dists_top[j]
            srv_arg = max(srv_top, key=lambda e: e[0])[1]
            ref_arg = ref_ids[j][0]
            lp_by_id = {e[1]: e[0] for e in dists_ids[j]}
            pr = [math.exp(x) for x in ref_lp[j]]
            zr = sum(pr)
            qs = [math.exp(lp_by_id[t]) if lp_by_id.get(t) is not None else 1e-30 for t in ref_ids[j]]
            zq = sum(qs)
            kl = sum((p / zr) * (math.log(p / zr) - math.log(max(q / zq, 1e-30))) for p, q in zip(pr, qs))
            s["pos"] += 1
            s["top1"] += int(srv_arg == ref_arg)
            s["kl"] += kl
            if P + j < len(toks):
                s["greedy"] += int(srv_arg == toks[P + j])
        per.append({"i": i, "positions": s["pos"], "top1": s["top1"] / s["pos"], "kl": s["kl"] / s["pos"],
                    "greedy_match": s["greedy"] / max(1, s["pos"] - 1)})
        for k in tot:
            tot[k] += s[k]
        print(f"[{i}] {s['pos']} pos  top1 {s['top1'] / s['pos']:.4f}  KL {s['kl'] / s['pos']:.5f}", flush=True)
    res = {"positions": tot["pos"], "top1_agreement": tot["top1"] / tot["pos"], "mean_kl_top20": tot["kl"] / tot["pos"],
           "per_prompt": per}
    print(json.dumps({k: v for k, v in res.items() if k != "per_prompt"}), flush=True)
    if a.out:
        json.dump(res, open(a.out, "w"), indent=1)


if __name__ == "__main__":
    main()
