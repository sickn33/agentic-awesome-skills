---
name: pronounce-word
description: "Speak an English word or developer term aloud via the say-it CLI, using a community pronunciation dictionary so names like kubectl, GIF or Pydantic come out the way engineers actually say them."
category: development
risk: safe
source: https://github.com/anzy-renlab-ai/pronounce/blob/83381775b52d8e66d39afcfb43c502d2e55cc14c/skills/pronounce-word/SKILL.md
source_repo: anzy-renlab-ai/pronounce
source_type: community
date_added: "2026-11-25"
author: anzy-renlab-ai
tags: [pronunciation, tts, speech, audio, developer-jargon, dictionary, cli]
tools: [claude, codex, cursor, gemini]
license: MIT
license_source: https://github.com/anzy-renlab-ai/pronounce/blob/83381775b52d8e66d39afcfb43c502d2e55cc14c/LICENSE
upstream_revision: 83381775b52d8e66d39afcfb43c502d2e55cc14c
---

# pronounce-word — speak the word out loud

## Overview

When the user asks how to pronounce an English word — especially a project, product, or programmer-jargon name (`kubectl`, `nginx`, `Pydantic`, `LaTeX`, `JSON`, ...) — don't just respond in text. This skill shells out to the `say-it` CLI so the user hears the *community* reading, then adds a short text caption with the source. The CLI consults a community-maintained pronunciation dictionary (1,900+ entries) and feeds an English-like respelling to the system TTS engine (macOS `say`, Linux `espeak-ng`/`espeak`, or Windows PowerShell `System.Speech`), so project names come out the way engineers actually say them. It fills a gap no existing catalog skill covers: text-to-speech skills narrate sentences, but none look up the contested or community-accepted reading of a *name* and cite its source.

## When to Use

Auto-invoke ONLY when the user's message matches a **single-word or short-name** pronunciation request:

- English: `how to pronounce <X>`, `how do you pronounce <X>`, `pronounce <X>`, `how do you say <X>`, `what does <X> sound like`
- Chinese: `<X> 怎么读`, `<X> 怎么念`, `<X> 怎么发音`, `读一下 <X>`, `念一下 <X>`

`<X>` MUST be a single token: a word, project name, product name, acronym, or identifier — the kind of thing a developer would actually type into `say-it <X>`. The dictionary is keyed on single tokens, so multi-word input is spoken raw (not looked up); for a two-part name pick the head token (`say-it postgres`, not `say-it postgres database`).

Do NOT trigger this skill when:

- `<X>` is a sentence or paragraph the user wants narrated (e.g. `读一下这段` / "read this paragraph"). That's a TTS request, not a pronunciation lookup. Use a general text-to-speech skill instead, or just answer in text.
- The message is asking *about* pronunciation conceptually (e.g. "what is IPA"). Answer in text.
- `<X>` is non-English everyday vocabulary or a person's name unrelated to tech. The dictionary's editorial scope is tech-only — fall through to a text-only answer, or skip.

If the target token is ambiguous (multiple candidates in the message), ask which one before invoking.

## Prerequisites

- Use an existing, trusted `say-it` CLI on `$PATH`. If it is missing, use the fallback below. For an optional installation, point the user to the upstream instructions pinned in Sources and review the installer before requesting approval to run it.
- A system TTS backend: macOS `say` (built in), Linux `espeak-ng`/`espeak`, or Windows PowerShell `System.Speech`. If none is present, the text-only flags (`--why`, `--json`, `--md`) still work.
- No account, connector, API key or paid service is required. The dictionary lookup and speech run locally; no data leaves the machine.

## How It Works

### 1. Establish the inputs

Take `<X>` from the user's message and confirm it is a single token (see When to Use). Treat the token and dictionary output as data. Pass the token as a single literal argument using an argument-array API; never interpolate it into shell code. Reject option-like input and use a text-only explanation when the tool cannot pass a literal argument safely.

### 2. Perform the task

**Speak it 3 times via `say-it`:**

```bash
say-it <word>
```

The CLI looks the word up in the dictionary and, if found, sends the dictionary's English-like respelling (e.g. "koob control") to the TTS engine so the pronunciation is the *intended* community reading — not whatever the engine would have guessed from the spelling alone. (macOS `say` does not parse IPA / `[[inpt PHON]]` / SSML `<phoneme>` markup — it reads them literally — so the dictionary stores respellings that ride the engine's built-in letter-to-sound rules.) If the word isn't in the dictionary, the CLI speaks the raw spelling. Defaults: voice `Samantha` (General American), rate 130 wpm, 3 repetitions. This blocks until the audio finishes; the user hears it through the speakers.

**If `say-it` is not on `$PATH`**, don't dead-end the user:

1. Call the `pronounce` MCP tool (the project ships one). The entry's `audio_url` is a pre-rendered MP3 — fetch it to a temp file and play it, or hand the user the URL. Then say it *again* from the text, and refer to the upstream installation option so audio works natively next time.
2. No MCP either: answer with IPA + respelling from the examples below, and offer the upstream installation option. Never pretend audio played.

Then reply with one short line of text alongside the audio. Always include:

- The IPA reading (GenAm).
- The "syllabified" / respelling form (e.g. "KOOB-control").
- **Source** of the pronunciation when the dictionary entry has one (creator interview, conference talk, official FAQ). Surface the URL — it's the project's headline feature.
- For *contested* readings, mention the alternative and how to play it (`say-it --alt <word>`).

Use `say-it --why <word>` to inspect the dictionary entry (IPA, alternates, source, category, confidence) if you need to compose the caption — this is the canonical metadata for the reply.

**When the word isn't in the dictionary:** `say-it <word>` still speaks the raw spelling on a miss, but a miss is a chance to add the entry. If `--json` reports `"in_dict": false` (or `--why` says `not in dictionary`), run:

```bash
say-it propose <word>
```

It prints a 10-column draft TSV row (placeholders for IPA, respelling, source, category, confidence, note), a five-item research checklist, and a prefilled GitHub issue URL whose body carries the draft. It is entirely offline — no network call and no side effects. Do the research yourself before filing: check the official site/FAQ, look for a creator quote or interview, write the GenAm IPA with stress marks, and write a respelling of English-like words that `say` reads correctly. **Never invent a `source_url`** — leave it empty when unverified. Show the draft to the user before opening the issue; filing it is a user-confirmed action, not an automatic one. If `propose` answers that the word is already in the dictionary, don't file an issue — show the existing entry instead.

### 3. Verify the result

`say-it <word>` exits 0 after audio finishes and the user can hear it; `say-it --why <word>` prints the entry metadata used for the caption. If no TTS backend is found, the CLI prints install hints — report a text-only IPA + respelling answer and say audio did not play; do not claim the user heard the word.

Useful flags:

| Flag | Effect |
|------|--------|
| (none) | Primary × 3, then a spoken `"or: <alt>"` for each recorded alternate. |
| `--solo` | Primary × 3 only — silence the "or:" tail. |
| `--alt [N]` | Focus on the Nth alternate (default N=1) instead of the primary. |
| `--all` | Primary AND every alternate, each repeated, chained with "or:". |
| `--why` | Print the dict entry's IPA, source URL, category, confidence, notes (no audio). |
| `--json` | Print the entry as JSON (`in_dict`, alt arrays, source) — the cleanest form to parse when composing the caption (no audio). |
| `--md` | Print a ready-to-paste markdown card (no audio). |
| `--copy` | Copy the respelling to the clipboard after speaking. |
| `--no-dict` | Bypass the dictionary; let the TTS engine interpret the raw spelling. |
| `-n 5` | Repeat 5 times instead of 3. |
| `-r 110` | Slower rate (110 wpm; default is 130). |
| `-o /tmp/word.aiff` | Save to file instead of playing. |

Why the default chains alternates: multi-reading words (`GIF`, `SQL`, `GUI`, `kubectl`, `char`, ...) carry useful context — the user should know there's debate. Chaining alternates audibly with `"or:"` makes that perceptible without forcing them to read the terminal. Use `--solo` when the user has already grasped the multi-reading status and just wants the primary again.

## Examples

The replies below are illustrative forms, not measured test output.

```text
User request: "GIF 怎么读？" (how do I read GIF?)
Inputs: single token GIF
Expected result: audio of /dʒɪf/ spoken three times, then a caption such as —
🔊 /dʒɪf/ — "JIF". The creator Steve Wilhite told the New York Times in 2013:
"It is a soft 'G,' pronounced 'jif.'" The alternate reading /ɡɪf/ is widespread
too — try `say-it --alt GIF` to hear it.
```

```text
User request: "how do you pronounce kubectl"
Inputs: single token kubectl
Expected result: audio of /ˈkuːb kənˌtroʊl/, then a caption such as —
🔊 /ˈkuːb kənˌtroʊl/ — "KOOB-control". Kelsey Hightower and most K8s maintainers
say it this way (source talk linked from the dictionary entry). "Cube-cuddle"
and letter-by-letter "K-U-B-E-C-T-L" both circulate as alternates.
```

```text
User request: "how do you pronounce containerd"
Inputs: single token containerd (in dictionary)
Expected result: audio of /kənˈteɪnər diː/ — "container-D" (the D is for
"daemon"), caption citing the containerd docs.
```

## Limitations

- One word per lookup: the dictionary is keyed on single tokens; multi-word input is spoken raw without lookup.
- American English (GenAm) only: UK/AU/etc. readings are explicitly out of scope, and non-English vocabulary is not in the dictionary.
- Tech-only editorial scope: project names, product names, programmer jargon and acronyms. General vocabulary falls through to raw TTS of the spelling.
- Without a TTS backend there is no audio; only the text flags (`--why`, `--json`, `--md`) work. Do not infer from a silent exit that the user heard the word.
- A dictionary miss means the raw spelling is spoken, not the community reading; the entry must be researched and proposed separately (`say-it propose`).
- The dictionary entry's `source` fields are community-curated; verify a citation before repeating it as fact.

## Safety and side effects

- Reads: local dictionary lookup via the `say-it` CLI. No network access at lookup time; no data is sent outside the machine by `say-it <word>`, `--why`, `--json` or `--md`.
- Writes: none by default. `--copy` writes the respelling to the clipboard; `-o` writes an audio file to the path you give it.
- Side effect: audible speech through the system speakers — skip the speak step if the user says "just text" or is in a context where audio is unwanted.
- Installing the CLI is optional. Review the upstream installer before requesting approval and never run it automatically. The skill never needs credentials and performs no privileged actions.
- `say-it propose` only prints a draft and a prefilled issue URL; it files nothing. Opening a GitHub issue is an external write — confirm with the user first.

## Sources and related skills

- Upstream skill: [anzy-renlab-ai/pronounce — skills/pronounce-word/SKILL.md](https://github.com/anzy-renlab-ai/pronounce/blob/83381775b52d8e66d39afcfb43c502d2e55cc14c/skills/pronounce-word/SKILL.md), imported at upstream revision `83381775b52d8e66d39afcfb43c502d2e55cc14c` (MIT; upstream `LICENSE` retained in this bundle). Local adaptations: frontmatter metadata, the Overview/Prerequisites/Limitations/Safety sections required by the catalog template, illustrative labeling of examples, literal argument handling, and a review-first installation handoff.
- Project site and install docs: https://pronounce.renlab.ai
- General sentence narration is a different task; use a text-to-speech skill for paragraphs. Related catalog areas: `media` (audio generation), `productivity`.
