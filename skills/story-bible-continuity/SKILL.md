---
name: story-bible-continuity
description: 'Deterministic continuity check for long manuscripts against a story bible: name drift, age arithmetic, era anachronisms, unpaid foreshadowing, POV leaks. Use for continuity checks on novels or serials.'
category: content
risk: safe
source: self
source_type: self
date_added: '2026-10-19'
author: jiawood2006
tags:
- writing
- novel
- continuity
- fiction
- consistency
- manuscript
- story-bible
license: Apache-2.0
---

# Story Bible Continuity

Long manuscripts fail in a specific, boring way: the writer (or the model)
remembers the story as a vibe, not as facts. A character is 18 in chapter 1
and 23 three years later in chapter 12. A name drifts one character and stays
drifted. A modern smartphone appears in a scene set in 1998. A planted key is never paid off, and the
author discovers it at chapter 60 while the reader noticed at chapter 20.

Re-reading the draft does not catch these, because re-reading is the same
memory that produced them. The fix is a **story bible** — the story's facts as
data — plus a checker that compares prose against it mechanically. Facts are
cheap to check. Vibes are not.

This skill is the checker and the adjudication discipline around it. It does
not draft, outline, or polish. It answers one question per hit: is the
manuscript wrong, or is the bible stale?

## When to Use

Use this skill when:

- a manuscript or serial passes ~30k characters / ~10 chapters and you need a
  continuity pass before publishing or before the next arc;
- the writer reports "a name feels off", "I lost track of someone's age", or
  "I forgot whether I already paid off the key";
- you are about to continue a draft that was paused for weeks and the writer's
  memory of the earlier chapters is no longer reliable;
- a model-written draft has to be checked against facts the writer established
  earlier, not against what the model believes the story is.

Do **not** use it to judge quality, pacing, voice, or plot logic — see
Limitations.

## The bible

One JSON file beside the manuscript. Per-character birth years, era bounds and
forbidden terms, allowed POV characters, and a foreshadowing ledger with
planted/payoff chapters. Full schema, field-by-field, with a worked example:
[references/story-bible-schema.md](references/story-bible-schema.md).

```json
{
  "title": "衣冠",
  "era": {"setting_period": "1998-2005", "forbidden_terms": ["智能手机", "微信"]},
  "pov": {"mode": "third-limited", "allowed_pov": ["修逸"]},
  "characters": [
    {"name": "修逸", "aliases": ["小修"], "birth_year": 1979,
     "watch_spellings": ["修毅"]}
  ],
  "foreshadowing": [
    {"id": "F1", "summary": "父亲留下的钥匙", "planted_chapter": 3,
     "payoff_chapter": null, "payoff_keyword": "钥匙", "deadline_chapter": 40}
  ]
}
```

If no bible exists, build one first: `python3 sbc.py init bible.json --title ... --period ...`,
then fill characters and the foreshadowing ledger **from the chapters that
already exist**, not from what the story is supposed to be. A bible written
from intent hides exactly the drift you are looking for.

## The check

The checker is shipped as source, not as a committed script: copy the Python
block in `references/sbc-checker.md` to `sbc.py` beside the bible (stdlib only,
Python 3.8+), then:

```bash
python3 sbc.py check bible.json manuscript/          # human report
python3 sbc.py check bible.json manuscript/ --json   # machine report
python3 sbc.py check bible.json manuscript/ --fail-on warn
```

Exit 0 = clean or warnings only, 1 = errors, 2 = usage. Chapter files are
recognised as `ch01.md`, `003_draft.txt`, `第3章.md` — anything with a number,
`.md`/`.txt`, sorted by that number.

| Check | Severity | What it proves |
|---|---|---|
| `chapter-sequence` | error | Duplicate or missing chapter numbers in the folder |
| `anachronism` | error | An `era.forbidden_terms` string appears in prose |
| `name-drift` | error | A declared `watch_spellings` variant appears, or an undeclared token sits in speaker position one character off a canonical name |
| `age-arithmetic` | error | `1999年…N岁` contradicts `birth_year` by more than one year |
| `foreshadowing` | error/warn | Payoff chapter does not exist, payoff keyword absent, or a deadline passed with no payoff |
| `pov-leak` | warn | Interior access ("心想", "意识到") granted to a non-POV character |

## The adjudication

Every hit is one of three things, and the skill decides which — never silently
picks one:

1. **Manuscript bug** → fix the prose. The bible is the record of what earlier
   chapters already committed to, so the newer chapter yields.
2. **Stale bible** → the newer chapter changed a fact on purpose. Update the
   bible, and say so explicitly: which field changed, from what, to what, and
   which earlier chapters now conflict.
3. **Real retcon** → the story genuinely overrides an earlier fact. That is
   allowed, but it is a decision, not an accident: list every earlier passage
   that now needs rewriting before touching either file.

Report format per hit: file:line, the check name, the two conflicting facts,
and the verdict. Batch them by verdict, not by file, so the user sees "3 prose
fixes, 1 bible update, 1 retcon to approve" instead of a wall of lines.

## Limitations

Say this out loud rather than implying full coverage. It does not judge plot
logic, motivation, pacing, voice, or whether a name is *deliberately* reused.
`name-drift` only fires on declared spellings and on speaker position, so a
mistyped name mid-sentence passes. `pov-leak` is heuristic. Continuity that
needs semantic judgement — "would this character know that by now?" — is a
reading task, and the honest answer is to read the two chapters side by side,
not to claim the script covered it.

Never edit a manuscript to make a check pass. A checker that can be satisfied
by rewriting evidence is worthless.

## Verification

Before reporting a manuscript as clean, prove the checker runs: make a
throwaway two-chapter fixture (`ch01.md`, `ch02.md`) with one deliberate
name-drift and one missing payoff, run `python3 sbc.py check`, and confirm it
reports exactly those two issues and exits 1 (deterministic, ~1s, no model).

Then run `python3 sbc.py check` on the real manuscript and paste the summary line
(`N error(s), M warning(s)`) with the verdicts you assigned. A clean run on an
empty folder, or a run whose only output is "0 errors" on a bible with no
characters, proves nothing — check that the bible actually has entries and the
chapter count matches the folder.

## Checker input and coverage limits

The checker source was modified to align JSON-mode exit behavior, protect existing bible files, skip symlink/non-file chapters, and use actual chapter numbers for payoff/deadline checks. It remains a narrow Chinese-language pattern checker, not a schema validator or semantic proof. Validate bible types, unique nonempty character names, positive integer chapter/deadline fields and allowed-POV configuration before use; malformed input may otherwise raise an exception. Disabled checks must be reported as not configured. Age matching uses only the first 1900–2099 year and age on each line, does not resolve aliases, and can attach another person's age to a character. POV mode and timeline fields are documentary; omniscient narration can trigger false warnings. Keyword occurrence does not prove a payoff. The advertised two-issue fixture must be constructed and observed, not assumed; it has not been executed by this static review. Keep unpublished manuscripts local and obtain author approval for factual retcons.
