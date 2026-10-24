#!/usr/bin/env python3
"""Archive a reference image into the project and scaffold its reverse-engineered prompt card, so nobody re-looks at pictures.

  python3 ref_archive.py add path/to/image.png --id 05 --title "short name" --source "url or app" [--dir refs/style-refs]
  python3 ref_archive.py commons [--dir refs/style-refs]       # after you fill cards: prints words repeated across cards

`add` copies the image to <dir>/<id>-<slug>.<ext> and appends a card to <dir>/INDEX.md with the fields that make a reference
reusable (why it works / reverse prompt / rule we take / rule we refuse). A card with an empty field is not done: the next
design step reads INDEX.md, not the image. `commons` is the 'read all prompts together' trick: words that recur in several
reverse prompts are the real shared rules of the reference set.
"""
import argparse, collections, pathlib, re, shutil

CARD = """
### {id} {title}  ·  [{fname}]({fname})
- source: {source}
- type (github/award/game/art/social/app/competitor): 
- why it works (mechanism, not adjectives): 
- reverse prompt (English, one sentence a generator could reproduce it from): 
- rule we take (testable): 
- rule we refuse (what would be copying): 
"""


def add(a):
    d = pathlib.Path(a.dir); d.mkdir(parents=True, exist_ok=True)
    src = pathlib.Path(a.image)
    slug = re.sub(r"[^\w]+", "-", a.title).strip("-").lower() or "ref"
    fname = f"{a.id}-{slug}{src.suffix.lower()}"
    shutil.copy(src, d / fname)
    idx = d / "INDEX.md"
    if not idx.exists():
        idx.write_text("# Reference index (read this, not the pictures)\n")
    with idx.open("a") as f:
        f.write(CARD.format(id=a.id, title=a.title, fname=fname, source=a.source))
    print(f"ok {d/fname} -> card appended to {idx}; fill the 4 empty fields before moving on")


def commons(a):
    text = (pathlib.Path(a.dir) / "INDEX.md").read_text()
    prompts = re.findall(r"reverse prompt[^:]*:\s*(.+)", text)
    cnt = collections.Counter()
    for p in prompts:
        cnt.update(set(re.findall(r"[a-z][a-z\-]{3,}", p.lower())))
    stop = {"with", "that", "from", "this", "each", "into", "over", "without", "background", "behind"}
    print(f"{len(prompts)} prompts. words in >=3 prompts (= the set's real rules):")
    for w, n in cnt.most_common(40):
        if n >= 3 and w not in stop:
            print(f"  {n:>2}  {w}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(); sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("add"); p.add_argument("image"); p.add_argument("--id", required=True)
    p.add_argument("--title", required=True); p.add_argument("--source", default="?"); p.add_argument("--dir", default="refs/style-refs")
    q = sub.add_parser("commons"); q.add_argument("--dir", default="refs/style-refs")
    a = ap.parse_args()
    add(a) if a.cmd == "add" else commons(a)
