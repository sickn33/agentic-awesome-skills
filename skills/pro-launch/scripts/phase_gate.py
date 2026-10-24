#!/usr/bin/env python3
"""Gate check: does the project folder contain this phase's required artifacts, and are they filled in?

  python3 phase_gate.py <project_dir> <phase|all>       phases: positioning naming refs style features ui assets qa video gtm growth ship

Prints PASS/FAIL per artifact and exits 1 on any FAIL. Run it at the START of a phase (are the previous phase's artifacts real?)
and at the END (did I produce mine?). A file counts only if it exists, is >300 bytes and has no 'TODO' / empty template fields.
Beyond "file is real", extra checks encode what the user keeps repeating (references/user-repeated-demands.md):
  refs   >=8 cards, >=4 non-App types, >=2 github/award, every card has a reverse prompt   (D1)
  style  >=3 reverse-prompt cards, bible has 要/不要 + 反例, project CLAUDE.md has 审美红线     (D2 D3)
  features/growth  must name the aha moment                                                  (D4)
  ui     "不如它" table >=3 rows, no N/10 score used as verdict                              (D5)
  video  must state the transition method (转场)                                            (D7)
  assets every asset row carries a source/授权 word                                          (D11 D19)
Paths are the skill's convention (see references/*.md); override in <project>/.prolaunch.json: {"positioning": ["docs/pos.md"]}.
"""
import json, pathlib, re, sys

GATES = {
    "positioning": ["docs/positioning.md"],
    "naming":      ["docs/naming.md", "docs/trademark.md"],
    "refs":        ["refs/style-refs/INDEX.md", "docs/competitors.md"],
    "style":       ["docs/style-bible.md"],
    "features":    ["docs/feature-map.md"],
    "ui":          ["docs/ui-log.md"],
    "assets":      ["docs/asset-list.md"],
    "qa":          ["docs/qa-walkthrough.md"],
    "video":       ["docs/video-brief.md"],
    "gtm":         ["docs/gtm.md", "docs/manual-tasks.md"],
    "growth":      ["docs/metrics.md"],
    "ship":        ["docs/ship-checklist.md", "docs/lessons.md"],
}


def ok(p):
    if not p.exists():
        return False, "missing"
    t = p.read_text(errors="ignore")
    if len(t) < 300:
        return False, "too short (<300 bytes)"
    for bad in ("TODO", ": \n", ":  \n"):
        if bad in t:
            return False, f"unfilled ({bad.strip() or 'empty field'})"
    return True, "ok"


def cards(root):
    p = root / "refs/style-refs/INDEX.md"
    if not p.exists():
        return []
    parts = re.split(r"(?m)^### ", p.read_text(errors="ignore"))[1:]
    return parts


def field(card, key):
    m = re.search(r"(?m)^- " + key + r"[^:\n]*:[ \t]*(.*)$", card)
    return m.group(1).strip() if m else ""


def read(root, rel):
    p = root / rel
    return p.read_text(errors="ignore") if p.exists() else ""


def extra_refs(root):
    cs = cards(root)
    out = []
    types = [field(c, "type").lower() for c in cs]
    n_nonapp = sum(1 for x in types if x and x not in ("app", "competitor"))
    n_open = sum(1 for x in types if x in ("github", "award", "opensource"))
    n_rev = sum(1 for c in cs if len(field(c, "reverse prompt")) > 20)
    out.append((len(cs) >= 8, f"cards>=8 (have {len(cs)})"))
    out.append((n_nonapp >= 4, f"non-App types>=4 (have {n_nonapp}; fill '- type:' with github/award/game/art/social/app)"))
    out.append((n_open >= 2, f"github/award>=2 (have {n_open})"))
    out.append((len(cs) > 0 and n_rev == len(cs), f"every card has a reverse prompt ({n_rev}/{len(cs)})"))
    return out


def extra_style(root):
    bible = read(root, "docs/style-bible.md")
    n_rev = sum(1 for c in cards(root) if len(field(c, "reverse prompt")) > 20)
    return [
        (n_rev >= 3, f"reverse-prompt cards>=3 (have {n_rev})"),
        ("不要" in bible and "要" in bible and "反例" in bible, "style-bible has 要/不要 and 反例"),
        ("审美红线" in read(root, "CLAUDE.md"), "project CLAUDE.md has 审美红线"),
    ]


def aha(rel):
    return lambda root: [("aha" in read(root, rel).lower(), f"{rel} names the aha moment")]


def extra_ui(root):
    t = read(root, "docs/ui-log.md")
    after = t.split("不如它")[-1] if "不如它" in t else ""
    n = sum(1 for l in after.splitlines() if l.count("|") >= 3 and not re.match(r"^\s*\|[\s:|-]+\|?\s*$", l))
    score = re.search(r"\b\d+(\.\d)?\s*/\s*10\b", t)
    return [
        ("不如它" in t and n >= 3, f"'哪里不如它' table has >=3 rows (have {max(n,0)})"),
        (not score, "no N/10 self-score in ui-log"),
    ]


def extra_video(root):
    return [("转场" in read(root, "docs/video-brief.md"), "video-brief states the 转场 method")]


def extra_assets(root):
    t = read(root, "docs/asset-list.md")
    return [(bool(re.search(r"授权|license|licence|出处|source", t, re.I)), "asset-list records source/授权")]


EXTRA = {"refs": extra_refs, "style": extra_style, "features": aha("docs/feature-map.md"),
         "growth": aha("docs/metrics.md"), "ui": extra_ui, "video": extra_video, "assets": extra_assets}


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    root, phase = pathlib.Path(sys.argv[1]), sys.argv[2]
    gates = dict(GATES)
    cfg = root / ".prolaunch.json"
    cfg_over = {}
    if cfg.exists():
        cfg_over = json.loads(cfg.read_text())
        gates.update(cfg_over)
    phases = list(gates) if phase == "all" else [phase]
    bad = 0
    for ph in phases:
        for rel in gates.get(ph, []):
            good, why = ok(root / rel)
            bad += not good
            print(f"{'PASS' if good else 'FAIL'}  {ph:<12}{rel}  ({why})")
        if ph in EXTRA and ph not in cfg_over:
            for good, why in EXTRA[ph](root):
                bad += not good
                print(f"{'PASS' if good else 'FAIL'}  {ph:<12}[demand] {why}")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
