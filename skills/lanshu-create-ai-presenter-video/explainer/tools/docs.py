#!/usr/bin/env python3
"""Write a job's planning documents from the story, so the styled route never has to guess their format.

Usage: python3 tools/docs.py <story-dir> <docs-dir>
  SCRIPT.md      the narration, line by line, from script.md (after `story.py --check`)
  BEAT_SHEET.md  chapters → lines → beat notes (`> notes` in script.md), the closing line, recap points, facts
  TIMELINE.md    chapters and line times, the closing line and the recap   (needs story.json: after story.py)
  STORYBOARD.md  one row per line with its time and words, and an empty "on screen" column to fill in
                 (written only when it does not exist yet, so your storyboard is never overwritten)
"""
import json, os, re, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from story import parse, UNIT, SPOKEN, PAUSE, shown  # noqa: E402


def readable(raw):
    """a script line for people: pause markers removed, paced lines marked"""
    secs = sorted(set(PAUSE.findall(raw)))
    return shown(raw) + (f"  （慢读：字间停顿 {'/'.join(secs)} 秒）" if secs else "")


def main():
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    story_dir, docs = Path(sys.argv[1]).resolve(), Path(sys.argv[2]).resolve()
    docs.mkdir(parents=True, exist_ok=True)
    meta, chapters, end, recap, facts = parse(str(story_dir / "script.md"))
    title = meta.get("title", story_dir.name)

    lines = [f"# {title}", ""]
    if meta.get("subtitle"):
        lines += [f"> {meta['subtitle']}", ""]
    n = 0
    for c in chapters:
        for s in c["lines"]:
            n += 1; lines.append(f"{n}. {readable(s)}")
    if end:
        lines.append(f"{n + 1}. {readable(end['lines'][0])}  （结尾金句）")
    (docs / "SCRIPT.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

    b = [f"# Beat sheet · {title}", ""]
    n = 0
    for k, c in enumerate(chapters, 1):
        b.append(f"## {k}. {c['title'] or c['key']}  (`{c['key']}`)")
        for s in c["lines"]:
            n += 1; b.append(f"- L{n}: {readable(s)}")
        for note in c["notes"]:
            b.append(f"  - beat: {note}")
        b.append("")
    if end:
        b += ["## Closing line", f"- L{n + 1}: {end['lines'][0]}", f"- emphasis: {end['fields'].get('emphasis', '')}", ""]
    if recap:
        b += ["## Recap (one frame, unvoiced)"] + [f"- {p['title']}: {p['text']}" for p in recap["points"]] + [""]
    if facts:
        b += ["## Facts the film may show", "```json", json.dumps(facts.get("json") or facts["fields"], ensure_ascii=False, indent=1), "```", ""]
    (docs / "BEAT_SHEET.md").write_text("\n".join(b), encoding="utf-8")

    sj = story_dir / "story.json"
    if not sj.exists():
        print("wrote SCRIPT.md, BEAT_SHEET.md (TIMELINE.md and STORYBOARD.md need story.json: run story.py first)")
        return 0
    S = json.loads(sj.read_text(encoding="utf-8"))
    t = [f"# Timeline · {title}", "", f"Total {S['duration']} s" + ("  (DRAFT: estimated times, silent)" if S.get("draft") else ""), "",
         "| chapter | start | end | title |", "| --- | --- | --- | --- |"]
    t += [f"| {c['n']} | {c['start']} | {c['end']} | {c['title']} |" for c in S["chapters"]]
    t += ["", "| line | start | end | chapter | text |", "| --- | --- | --- | --- | --- |"]
    t += [f"| {L['i']} | {L['start']} | {L['end']} | {L.get('chapter', '')} | {L['text']} |" for L in S["lines"]]
    if S.get("end"):
        t += ["", f"Closing line: L{S['end']['line']} from {S['end']['start']} s, emphasis {', '.join(S['end']['emphasis'])}"]
    if S.get("recap"):
        t += [f"Recap: {S['recap']['start']}–{S['recap']['end']} s"]
    (docs / "TIMELINE.md").write_text("\n".join(t) + "\n", encoding="utf-8")

    sb = docs / "STORYBOARD.md"
    if not sb.exists():
        rows = [f"# Storyboard · {title}", "",
                "For every line: what is performed on screen, on which word. Fill the last column; keep one visual idea per",
                "line and act out every keyword (see the style's STARTER.md idioms).", "",
                "| line | time | key words (time) | on screen |", "| --- | --- | --- | --- |"]
        for L in S["lines"]:
            keys = " ".join(f"{u}@{w:.1f}" for u, w in L["words"] if SPOKEN.match(u))[:90]
            rows.append(f"| L{L['i']} | {L['start']:.1f}–{L['end']:.1f} | {keys} |  |")
        if S.get("recap"):
            rows.append(f"| recap | {S['recap']['start']:.1f}–{S['recap']['end']:.1f} | — | one composed frame (Kit.recap) |")
        sb.write_text("\n".join(rows) + "\n", encoding="utf-8")
    print(f"wrote {', '.join(p.name for p in sorted(docs.glob('*.md')))} in {docs}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
