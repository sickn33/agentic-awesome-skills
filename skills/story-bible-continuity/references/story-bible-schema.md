# Story bible schema

One JSON file, UTF-8, no comments. Unknown top-level keys are ignored by the
checker but preserved by hand-editing, so it is safe to add notes.
`sbc.py init` writes a skeleton you can fill in.

## Top level

| Key | Type | Required | Meaning |
|---|---|---|---|
| `title` | string | yes | Shown in the report header |
| `era.setting_period` | string | recommended | Human-readable window, e.g. `"1998-2005"`; used only in messages |
| `era.forbidden_terms` | string[] | recommended | Strings that must never appear in this era (`"智能手机"`, `"微信"`, `"高铁"`) |
| `pov.mode` | string | optional | `third-limited`, `first`, `omniscient` — documentary only |
| `pov.allowed_pov` | string[] | recommended | Characters allowed interior access |
| `characters` | object[] | recommended | See below |
| `timeline` | object[] | optional | `{id, date, summary, chapter}` — documentary; keeps dated events in one place |
| `foreshadowing` | object[] | recommended | See below |

An empty `characters` array disables `name-drift`, `age-arithmetic`, and
`pov-leak`. Empty `era.forbidden_terms` disables `anachronism`. A check that
cannot fire should be reported as "not configured", never as "clean".

## characters[]

| Key | Type | Meaning |
|---|---|---|
| `name` | string | Canonical spelling used in prose |
| `aliases` | string[] | Legitimate shorter forms / nicknames — never flagged |
| `birth_year` | int\|null | Enables `age-arithmetic` |
| `watch_spellings` | string[] | Known wrong spellings — flagged wherever they appear |
| `notes` | string | Free text, ignored by the checker |

`watch_spellings` is data, not a guess: when a reviewer spots a typo the model
keeps repeating, it belongs here so the next run catches it. `aliases` and
`watch_spellings` are mutually exclusive — a spelling in both is skipped, so
remove the alias if the form is wrong.

## foreshadowing[]

| Key | Type | Meaning |
|---|---|---|
| `id` | string | Short handle used in the report (`F1`) |
| `summary` | string | What was planted, in one line |
| `planted_chapter` | int | Chapter number where it appears |
| `payoff_chapter` | int\|null | Chapter where it resolves; `null` = still open |
| `payoff_keyword` | string | A literal string that must appear in the payoff chapter |
| `deadline_chapter` | int\|null | With `payoff_chapter: null`, warn once the manuscript reaches this chapter |

Severity: payoff chapter beyond the manuscript = **error**; deadline passed
with no payoff = **warn**; payoff chapter present but `payoff_keyword` missing =
**warn** (the payoff may be worded differently — reword the keyword, do not
assume the chapter is wrong).

## age arithmetic

Any single line containing both a four-digit year (`1999年`) and an age
(`十八岁`, `23岁`) and a character name whose `birth_year` is set gets checked.
Tolerance is one year, because colloquial narration rounds. The checker selects the first year and age on a line; adjudicate multi-person or multi-date lines manually rather than rewriting correct prose merely to satisfy it.

## Example

```json
{
  "title": "衣冠",
  "era": {"setting_period": "1998-2005",
          "forbidden_terms": ["智能手机", "微信", "高铁"]},
  "pov": {"mode": "third-limited", "allowed_pov": ["修逸"]},
  "characters": [
    {"name": "修逸", "aliases": ["小修"], "birth_year": 1979,
     "watch_spellings": ["修毅"], "notes": "主角，观察力强，话少"},
    {"name": "陈骏", "aliases": [], "birth_year": 1976},
    {"name": "贺军生", "aliases": ["老贺"], "birth_year": 1968}
  ],
  "timeline": [
    {"id": "E1", "date": "1999-03-12", "summary": "修逸第一次进拆迁办", "chapter": 1},
    {"id": "E2", "date": "2003-09-01", "summary": "老贺调走", "chapter": 14}
  ],
  "foreshadowing": [
    {"id": "F1", "summary": "父亲留下的钥匙", "planted_chapter": 3,
     "payoff_chapter": null, "payoff_keyword": "钥匙", "deadline_chapter": 40},
    {"id": "F2", "summary": "档案袋上的红章", "planted_chapter": 7,
     "payoff_chapter": 22, "payoff_keyword": "红章"}
  ]
}
```

Note `贺军生` with alias `老贺`: without the alias declaration, `老贺` is not a
name at all as far as the checker is concerned, and nothing fires. Declaring
aliases is what turns the bible from a document into a test.
