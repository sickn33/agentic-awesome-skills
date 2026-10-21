#!/usr/bin/env python3
"""One-command QA for a styled film: check, snapshots, stillness, cover, and a composition report.

Usage: python3 tools/qa.py <project-dir> [out-dir] [--cover T]
  out-dir defaults to <project>/qa. Writes:
    <out>/contacts/       snapshots at every chapter, the closing line and the recap (frames you should look at)
    <out>/composition.json  check verdict + counts, stillness pairs, snapshot list   (record it as qa.composition_report)
    <out>/cover.png       a 1920×1080 cover frame for platform uploads (default: the middle of the recap)
  Exit status 1 if check fails or any stillness pair is under 0.001 (the camera parked / the picture froze).
No numpy needed; frames stay local (--describe false). HYPERFRAMES=npx spec (default hyperframes@0.8.81).
"""
import argparse, json, os, re, shutil, subprocess, sys, tempfile
from pathlib import Path

HF = os.environ.get("HYPERFRAMES", "hyperframes@0.8.81")
STILL = 0.001
GAP = 0.3


def story_of(project):
    text = (project / "lib" / "story.js").read_text(encoding="utf-8")
    return json.loads(re.search(r"window\.STORY = (.*);\s*$", text, re.S).group(1))


def sample_times(S):
    """mid-chapter, between lines, the closing line, recap start and recap end — where a film tends to freeze"""
    ts = {}
    for c in S.get("chapters", []):
        ts[round((c["start"] + c["end"]) / 2, 2)] = f"chapter {c['n']}"
    lines = S["lines"]
    for a, b in list(zip(lines, lines[1:]))[:3]:
        ts[round((a["end"] + b["start"]) / 2, 2)] = f"between lines {a['i']}-{b['i']}"
    if S.get("end"):
        L = next((L for L in lines if L["i"] == S["end"]["line"]), None)
        if L:
            ts[round((L["start"] + L["end"]) / 2, 2)] = "closing line"
    if S.get("recap"):
        ts[round(S["recap"]["start"] + 0.3, 2)] = "recap start"
        ts[round(S["recap"]["end"] - 0.5 - GAP, 2)] = "recap end"
    dur = float(S["duration"])
    return {t: why for t, why in sorted(ts.items()) if 0 <= t <= dur - GAP - 0.05}


def gray(png):
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(png), "-vf", "scale=480:270", "-f", "rawvideo",
                          "-pix_fmt", "gray", "-"], capture_output=True, check=True).stdout
    return raw


def diff(a, b):
    return sum(abs(x - y) for x, y in zip(a, b)) / (len(a) * 255.0)


def snapshot(project, times, out):
    result = subprocess.run(["npx", "--yes", HF, "snapshot", str(project), "--at", ",".join(f"{t:g}" for t in times),
                             "--no-end", "--describe", "false", "-o", str(out)], capture_output=True, text=True)
    if result.returncode:
        sys.stderr.write(result.stdout + result.stderr)
        result.check_returncode()
    shots = sorted(out.glob("frame-*.png"))
    return {float(re.search(r"-at-([\d.]+)s", p.name).group(1)): p for p in shots}


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("project"); ap.add_argument("out", nargs="?")
    ap.add_argument("--cover", type=float, help="time of the cover frame (default: middle of the recap)")
    a = ap.parse_args()
    P = Path(a.project).resolve()
    out = Path(a.out).resolve() if a.out else P / "qa"
    out.mkdir(parents=True, exist_ok=True)
    S = story_of(P)

    chk = subprocess.run(["npx", "--yes", HF, "check"], cwd=P, capture_output=True, text=True)
    text = chk.stdout + chk.stderr
    lint = re.search(r"(\d+) error\(s\), (\d+) warning\(s\)", text)
    check = {"passed": "Check passed" in text, "lint_errors": int(lint.group(1)) if lint else None,
             "lint_warnings": int(lint.group(2)) if lint else None,
             "problems": [ln.strip() for ln in text.splitlines() if ln.strip().startswith(("✗", "✖"))][:20]}

    picks = sample_times(S)
    cover_t = a.cover if a.cover is not None else (
        round((S["recap"]["start"] + S["recap"]["end"]) / 2, 2) if S.get("recap") else round(float(S["duration"]) * 0.5, 2))
    want = sorted(set(list(picks) + [round(t + GAP, 2) for t in picks] + [cover_t]))
    with tempfile.TemporaryDirectory() as tmp:
        shots = snapshot(P, want, Path(tmp) / "s")
        find = lambda t: shots[min(shots, key=lambda k: abs(k - t))]
        stillness = []
        for t, why in picks.items():
            d = diff(gray(find(t)), gray(find(round(t + GAP, 2))))
            stillness.append({"t": t, "where": why, "diff": round(d, 5), "ok": d > STILL})
        contacts = out / "contacts"
        shutil.rmtree(contacts, ignore_errors=True)
        contacts.mkdir(parents=True)
        for t, why in picks.items():
            shutil.copy2(find(t), contacts / f"{t:06.2f}s-{re.sub(r'[^a-z0-9]+', '-', why)}.png")
        shutil.copy2(find(cover_t), out / "cover.png")

    report = {"project": P.name, "check": check, "stillness": stillness, "stillness_threshold": STILL,
              "contacts": sorted(p.name for p in (out / "contacts").glob("*.png")), "cover": "cover.png",
              "cover_t": cover_t, "ok": check["passed"] and all(s["ok"] for s in stillness)}
    (out / "composition.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"check: {'passed' if check['passed'] else 'FAILED'}"
          + (f" ({check['lint_errors']} lint errors, {check['lint_warnings']} warnings)" if lint else ""))
    for s in stillness:
        print(f"  {'ok ' if s['ok'] else 'STILL'} {s['t']:>6.2f}s  {s['diff']:.4f}  {s['where']}")
    print(f"report: {out / 'composition.json'}   contacts: {out / 'contacts'}   cover: {out / 'cover.png'}")
    if not report["ok"]:
        print("QA failed — 检查未通过：fix check errors, or keep the camera / content moving where a pair is STILL",
              file=sys.stderr)
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
