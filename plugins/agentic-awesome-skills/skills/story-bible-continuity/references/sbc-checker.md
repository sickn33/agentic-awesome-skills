# Checker source

`story-bible-continuity` ships its checker as source so the review stays
auditable and dependency-free. Save the block below as `sbc.py` next to your
bible file, or run it straight from a heredoc. Stdlib only, Python 3.8+.

```python
#!/usr/bin/env python3
"""sbc.py — story-bible-continuity checker.

Deterministic, offline, stdlib only. Compares a manuscript folder against a
story bible (JSON) and reports the continuity defects that a language model
reliably misses when it re-reads its own drafts: name drift, age arithmetic,
period anachronisms, unpaid foreshadowing, chapter gaps, and POV leaks.

    sbc.py check BIBLE.json MANUSCRIPT_DIR [--json] [--fail-on warn]
    sbc.py init  BIBLE.json --title "My Novel" --period 1998-2005

Exit codes: 0 = clean (or warnings only), 1 = errors found, 2 = usage error.
"""

import argparse
import json
import os
import re
import sys

CJK = r"\u4e00-\u9fff"
POV_VERBS = ("想", "心想", "觉得", "意识到", "记得", "明白", "暗想", "琢磨")
CN_DIGITS = {"零": 0, "一": 1, "二": 2, "两": 2, "三": 3, "四": 4, "五": 5,
             "六": 6, "七": 7, "八": 8, "九": 9}


# ---------------------------------------------------------------- utilities

def cn2int(text):
    """Convert a small Chinese numeral (一 .. 一百二十九) or digits to int."""
    text = text.strip()
    if not text:
        return None
    if text.isdigit():
        return int(text)
    if text.startswith("零") and len(text) > 1:
        return cn2int(text.lstrip("零"))
    if "百" in text:
        head, _, tail = text.partition("百")
        hundreds = CN_DIGITS.get(head, 1 if head == "" else None)
        if hundreds is None:
            return None
        rest = 0
        if tail:
            sub = cn2int(tail)
            if sub is None:
                return None
            rest = sub
        return hundreds * 100 + rest
    if "十" in text:
        head, _, tail = text.partition("十")
        tens = CN_DIGITS.get(head, 1 if head == "" else None)
        if tens is None:
            return None
        ones = CN_DIGITS.get(tail) if tail else 0
        return None if ones is None else tens * 10 + ones
    if text.startswith("零"):
        text = text.lstrip("零") or "零"
    if len(text) == 1:
        return CN_DIGITS.get(text)
    return None


def distance1(a, b):
    """True when the edit distance between a and b is exactly 1 (same-length)."""
    if a == b or len(a) != len(b):
        return False
    diff = [i for i in range(len(a)) if a[i] != b[i]]
    return len(diff) == 1


def sentences(text):
    return [s for s in re.split(r"[。！？!?\n]+", text) if s.strip()]


def chapter_files(manuscript_dir):
    """Return [(number, filename, path)] sorted by chapter number.

    Recognised names: ch01.md, ch1_xxx.md, 第1章.md, 第一章.md, 001.md.
    """
    pattern_digits = re.compile(r"(?:ch|Ch|CH)?0*(\d{1,4})")
    found = []
    for name in sorted(os.listdir(manuscript_dir)):
        if not name.lower().endswith((".md", ".txt")):
            continue
        num = None
        m = re.search(r"第\s*([一二三四五六七八九十百零两\d]{1,4})\s*章", name)
        if m:
            num = cn2int(m.group(1))
        else:
            m = pattern_digits.search(name)
            if m:
                num = int(m.group(1))
        if num is None:
            continue
        path = os.path.join(manuscript_dir, name)
        if num <= 0 or not os.path.isfile(path) or os.path.islink(path):
            continue
        found.append((num, name, path))
    found.sort(key=lambda x: (x[0], x[1]))
    return found


def issue(level, check, where, message):
    return {"level": level, "check": check, "where": where, "message": message}


# ------------------------------------------------------------------- checks

def check_sequence(chapters):
    issues = []
    seen = {}
    for num, name, _ in chapters:
        if num in seen:
            issues.append(issue("error", "chapter-sequence", name,
                                "chapter number %d is used twice (also %s)" % (num, seen[num])))
        seen[num] = name
    if chapters:
        numbers = [n for n, _, _ in chapters]
        for expected in range(min(numbers), max(numbers) + 1):
            if expected not in seen:
                issues.append(issue("error", "chapter-sequence", "-",
                                    "chapter %d is missing between %d and %d"
                                    % (expected, min(numbers), max(numbers))))
    return issues


def check_anachronism(bible, chapter_texts):
    issues = []
    terms = (bible.get("era") or {}).get("forbidden_terms") or []
    period = (bible.get("era") or {}).get("setting_period", "the setting period")
    for num, name, text in chapter_texts:
        for term in terms:
            for lineno, line in enumerate(text.splitlines(), 1):
                if term and term in line:
                    issues.append(issue(
                        "error", "anachronism", "%s:%d" % (name, lineno),
                        '"%s" is outside %s' % (term, period)))
    return issues


SPEECH = ("说", "道", "问", "答", "喊", "笑", "骂", "低声道", "开口")


def check_name_drift(bible, chapter_texts):
    """Two honest signals, both with low false-positive rates.

    1. watch_spellings: variants the author already knows are risky, declared
       in the bible. Deterministic string matching, requiring context review, catches the typo the
       model keeps repeating.
    2. Speaker labels: a 2-4 character token directly in front of a speech verb
       ("陈俊说道") occupies name position, so an undeclared token there that is
       one character off a canonical name is a candidate for review, not a certain typo.
    """
    issues = []
    characters = bible.get("characters") or []
    declared = set()
    for ch in characters:
        declared.add(ch["name"])
        declared.update(ch.get("aliases") or [])
    canonicals = [ch["name"] for ch in characters]

    watches = []
    for ch in characters:
        for variant in ch.get("watch_spellings") or []:
            if variant in declared:
                continue
            watches.append((variant, ch["name"]))

    for variant, canonical in watches:
        for num, name, text in chapter_texts:
            for lineno, line in enumerate(text.splitlines(), 1):
                if variant in line:
                    issues.append(issue(
                        "error", "name-drift", "%s:%d" % (name, lineno),
                        '"%s" should be "%s" (declared as a forbidden spelling)'
                        % (variant, canonical)))

    speech_re = re.compile(r"([%s]{2,4}?)(?=%s)" % (CJK, "|".join(SPEECH)))
    for num, name, text in chapter_texts:
        for lineno, line in enumerate(text.splitlines(), 1):
            for token in speech_re.findall(line):
                if token in declared:
                    continue
                near = [c for c in canonicals if distance1(token, c)]
                if near:
                    issues.append(issue(
                        "error", "name-drift", "%s:%d" % (name, lineno),
                        '"%s" speaks here, one character off "%s" — fix it or declare it'
                        % (token, near[0])))
    return issues


def check_ages(bible, chapter_texts):
    issues = []
    people = {c["name"]: c for c in (bible.get("characters") or [])
              if c.get("birth_year")}
    if not people:
        return issues
    year_re = re.compile(r"(19\d{2}|20\d{2})\s*年")
    age_re = re.compile(r"([一二三四五六七八九十百零两\d]{1,3})\s*岁")
    for num, name, text in chapter_texts:
        for lineno, line in enumerate(text.splitlines(), 1):
            years = year_re.findall(line)
            ages = age_re.findall(line)
            if not years or not ages:
                continue
            for who, person in people.items():
                if who not in line:
                    continue
                year = int(years[0])
                age = cn2int(ages[0])
                if age is None:
                    continue
                expected = year - int(person["birth_year"])
                if abs(age - expected) > 1:
                    issues.append(issue(
                        "error", "age-arithmetic", "%s:%d" % (name, lineno),
                        "%s born %s would be %d in %d, text says %d"
                        % (who, person["birth_year"], expected, year, age)))
    return issues


def check_foreshadowing(bible, chapter_count, chapter_texts):
    issues = []
    chapter_numbers = {n for n, _, _ in chapter_texts}
    latest = max(chapter_numbers, default=0)
    for item in bible.get("foreshadowing") or []:
        fid = item.get("id", "?")
        summary = item.get("summary", "")
        payoff = item.get("payoff_chapter")
        if payoff is None:
            deadline = item.get("deadline_chapter")
            if deadline is not None and latest >= int(deadline):
                issues.append(issue("warn", "foreshadowing", fid,
                                    'planted in ch%s but never paid off: "%s"'
                                    % (item.get("planted_chapter", "?"), summary)))
            continue
        if int(payoff) not in chapter_numbers:
            issues.append(issue("error", "foreshadowing", fid,
                                "payoff_chapter %s does not exist (manuscript has %d chapters)"
                                % (payoff, chapter_count)))
            continue
        keyword = item.get("payoff_keyword")
        if keyword:
            text = next((t for n, _, t in chapter_texts if n == int(payoff)), "")
            if keyword not in text:
                issues.append(issue("warn", "foreshadowing", fid,
                                    'ch%s is marked as the payoff but "%s" never appears there'
                                    % (payoff, keyword)))
    return issues


def check_pov(bible, chapter_texts):
    issues = []
    pov = bible.get("pov") or {}
    allowed = set(pov.get("allowed_pov") or [])
    if not allowed:
        return issues
    outsiders = [c["name"] for c in (bible.get("characters") or [])
                 if c["name"] not in allowed]
    for num, name, text in chapter_texts:
        for lineno, line in enumerate(text.splitlines(), 1):
            for sentence in sentences(line):
                for who in outsiders:
                    idx = sentence.find(who)
                    if idx < 0:
                        continue
                    tail = sentence[idx + len(who):idx + len(who) + 8]
                    if any(v in tail for v in POV_VERBS):
                        issues.append(issue(
                            "warn", "pov-leak", "%s:%d" % (name, lineno),
                            'interior access to "%s", who is not a declared POV character'
                            % who))
    return issues


# ------------------------------------------------------------------- report

def run(bible_path, manuscript_dir, fail_on="error"):
    bible = json.load(open(bible_path, encoding="utf-8"))
    chapters = chapter_files(manuscript_dir)
    if not chapters:
        print("no chapter files found in %s" % manuscript_dir, file=sys.stderr)
        return 2
    chapter_texts = [(n, name, open(path, encoding="utf-8").read())
                     for n, name, path in chapters]

    issues = []
    issues += check_sequence(chapters)
    issues += check_anachronism(bible, chapter_texts)
    issues += check_name_drift(bible, chapter_texts)
    issues += check_ages(bible, chapter_texts)
    issues += check_foreshadowing(bible, len(chapters), chapter_texts)
    issues += check_pov(bible, chapter_texts)

    errors = [i for i in issues if i["level"] == "error"]
    warnings = [i for i in issues if i["level"] == "warn"]

    print("story-bible-continuity · %s" % bible.get("title", "(untitled)"))
    print("chapters: %d  (%s .. %s)"
          % (len(chapters), chapters[0][1], chapters[-1][1]))
    for item in issues:
        print("%-5s %-18s %-16s %s"
              % (item["level"].upper(), item["check"], item["where"], item["message"]))
    print("\n%d error(s), %d warning(s)" % (len(errors), len(warnings)))
    if errors or (warnings and fail_on == "warn"):
        return 1
    return 0


def init(path, title, period):
    template = {
        "title": title,
        "era": {"setting_period": period, "forbidden_terms": []},
        "pov": {"mode": "third-limited", "allowed_pov": []},
        "characters": [
            {"name": "", "aliases": [], "birth_year": None, "notes": ""}
        ],
        "timeline": [],
        "foreshadowing": [
            {"id": "F1", "summary": "", "planted_chapter": 1,
             "payoff_chapter": None, "payoff_keyword": "", "deadline_chapter": None}
        ],
    }
    with open(path, "x", encoding="utf-8") as fh:
        json.dump(template, fh, ensure_ascii=False, indent=2)
        fh.write("\n")
    print("wrote %s" % path)
    return 0


def main(argv=None):
    parser = argparse.ArgumentParser(description="story bible continuity checker")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_check = sub.add_parser("check", help="check a manuscript against a bible")
    p_check.add_argument("bible")
    p_check.add_argument("manuscript")
    p_check.add_argument("--json", action="store_true", help="machine-readable output")
    p_check.add_argument("--fail-on", choices=["error", "warn"], default="error")

    p_init = sub.add_parser("init", help="write a starter bible")
    p_init.add_argument("bible")
    p_init.add_argument("--title", default="Untitled")
    p_init.add_argument("--period", default="")

    args = parser.parse_args(argv)
    if args.cmd == "init":
        return init(args.bible, args.title, args.period)
    if args.json:
        # structured mode reuses run()'s logic but prints one JSON document
        bible = json.load(open(args.bible, encoding="utf-8"))
        chapters = chapter_files(args.manuscript)
        if not chapters:
            print("no chapter files found", file=sys.stderr)
            return 2
        texts = [(n, name, open(path, encoding="utf-8").read()) for n, name, path in chapters]
        issues = (check_sequence(chapters) + check_anachronism(bible, texts)
                  + check_name_drift(bible, texts) + check_ages(bible, texts)
                  + check_foreshadowing(bible, len(chapters), texts)
                  + check_pov(bible, texts))
        print(json.dumps({"chapters": len(chapters), "issues": issues},
                         ensure_ascii=False, indent=2))
        return 1 if any(i["level"] == "error" or args.fail_on == "warn" for i in issues) else 0
    return run(args.bible, args.manuscript, args.fail_on)


if __name__ == "__main__":
    sys.exit(main())
```
