# Styled explainer route

Read this file when the job's `creative.route` is `styled`: a performed explainer in one of twelve styles (nine visual
styles and three narrative styles — 推演, 案卷, 小剧场 — whose look comes with a way of telling), with no presenter. The styles carry the explanation on their own — the work is in performing every line well. The engine
lives in `explainer/`:
`explainer/STYLES.md` to choose a style, `explainer/KITS.md` for the contract and tools, each style's
`kits/<style>/starter/STARTER.md` for how to perform a beat, and `examples/kv-cache/<style>/` for a finished film.

The input is a topic or script; the only paid generation is the voice. Films render 16:9 at 1920×1080 and end with a
one-frame recap. For 9:16 vertical delivery use the presenter route. To bring a digital human into a styled film, see
the last section — an optional method, not a separate route.

## Requirements

- Node.js with `npx` (HyperFrames is run as `npx --yes hyperframes@0.8.81`, override with `HYPERFRAMES`), FFmpeg,
  `rsync`, Python 3.9+ with numpy for the sound bed (`PYTHON=…` to choose the interpreter), network access for
  Google Fonts and jsDelivr (font subsets).
- Voice and word timing: the built-in path calls MiniMax T2A once per line (`MINIMAX_API_KEY`; `MINIMAX_BASE_URL` for the
  China endpoint) and takes each word's timestamp from the voice engine itself — no speech-recognition model to install.
  Narration the user voiced or recorded elsewhere works too (`story.py --audio`): lines are found at its pauses and word
  times are estimated (about 0.15 s), fine for captions and slightly looser for word-timed beats.

### Voice setup · 配音

The default voice is MiniMax `Chinese (Mandarin)_Reliable_Executive` (a steady male voice) at speed 1.1; set `voice:`
and `speed:` in `script.md` to change it — the user picks a system voice ID from the voice library in their MiniMax
console. The international API is `https://api.minimax.io` (the default); mainland-China accounts use their console's
endpoint via `MINIMAX_BASE_URL` (typically `https://api.minimaxi.com`). Write names, numbers and acronyms in the
script as they should be read; after voicing, check how numbers, units and English were read: `story/audio/pronounce.txt` lists each line as the engine read it
(e.g. 「2 GB」 read as 「二吉字节」 — rewrite the script as 「两 GB」 if that is wanted, and voice that line again).
Narration the user recorded themselves needs no TTS at all: `story.py story --audio`.

## Job layout

The usual job directory gains two folders:

```text
story/      script.md → audio/narration.wav, audio/tts/ (per-line voice + word timestamps), audio/pronounce.txt, story.json
film/       the HyperFrames project (from the style's starter); film/beats.js holds the performed scenes
```

`X` below is `$SKILL_DIR/explainer`.

## Production, state by state

### intake

```bash
python3 "$SKILL_DIR/scripts/init_job.py" --job-dir ~/Videos/kv-cache --route styled \
  --explainer-style v3-notebook --topic "讲清楚 KV cache"
```

If the user has not chosen a style, show them `explainer/STYLES.md` (attach or link its two gallery images) and
recommend two or three from the topic and audience, one reason each; or build drafts in the nine visual styles (below)
and let them pick from a still grid. Settle the style before the script is locked — the script is written for it (next
step); for a narrative style (V10–V12), adapt its suggested arc to the topic.

### content_locked

Write `story/script.md` for the chosen style — tone, sentence length, `speed:` and the recap `length:` from the
"按风格写稿" table in `explainer/STYLES.md` — with the content rules of [generation.md](generation.md): chapters (`## key | 章节标题`), one narration line per text line, `> beat notes` under each chapter
(the starters show them in the draft), `## end` with `emphasis:` for the closing line, `## recap` points, and a
`## facts` block — the only facts the film may put on screen. See `explainer/stories/kv-cache/script.md`.

For a narrative style, these arcs are useful starting points; adapt chapter count and order to the explanation:
V10 推演 a question → the figure built step by step → the pattern
→ the result and its cost; V11 案卷 the anomaly and suspects → evidence → the cause proven → the fix → the case closed
(cause / fix / cost / lesson, facts sourced, illustrative numbers marked 「示意」); V12 小剧场 one life scene and one
character: the misconception → a bill, a queue or an object comparison that shows the cause → the new way → the analogy
mapped to the real term, closed in one sentence. The bundled `explainer/stories/kv-cache-reasoning`, `kv-cache-casefile`
and `kv-cache-sitcom` are the same topic written in the three arcs. A sitcom's setting and characters can change
with the topic; the demo's milk-tea shop is an example. Keep facts sourced and label illustrative numbers.

```bash
python3 "$X/tools/story.py" story --check      # chapters, lines and the estimated length
python3 "$X/tools/docs.py" story docs          # docs/SCRIPT.md and docs/BEAT_SHEET.md from script.md
```

Record `artifacts.script = docs/SCRIPT.md` and `artifacts.beat_sheet = docs/BEAT_SHEET.md`. Show the user the script and
the estimated length before anything is voiced; that is their approval of the content and of the voice cost.

### audio_locked

`python3 "$X/tools/story.py" story` voices every line with MiniMax (cached per line, levelled to −18 LUFS so delivery
loudness passes), or voice the script with any TTS — or use the user's own recording — and run
`python3 "$X/tools/story.py" story --audio narration.wav` (the script text must match what is said).

Read the printed word times against the audio; fix the script or voice before going on. Record
`artifacts.final_audio = story/audio/narration.wav`, `artifacts.story = story/story.json`, and
`qa.asr_report = story/story.json` (its per-word times are the ASR evidence).
Read `story/audio/pronounce.txt` for misread numbers or terms. A `--dry` draft never locks the audio
(`check_state.py` refuses it); `story.json` records `timing: engine | estimated | draft`.

### visual_plan_locked

Build the draft film — it plays end to end with captions, chapter chip, closing line, recap and sound, and a
「待演绎」 placeholder per line:

```bash
bash "$X/tools/new_film.sh" <style> story film
# to compare styles first:  DEST_ROOT=drafts JOBS=3 bash "$X/tools/new_topic.sh" story
#                           python3 "$X/tools/still_grid.py" drafts 9.5,30 qa/contacts
```

Run `python3 "$X/tools/docs.py" story docs` again: it adds `docs/TIMELINE.md` and a `docs/STORYBOARD.md` table with one
row per line (time and words). Fill its "on screen" column: what is performed, on which word, using the style's idioms
(`film/STARTER.md`) and the finished example. Make t = 0 a composed frame (the first scene already on screen, not an
empty stage) — it is the first thing a feed shows. Send the user the storyboard and a phone-friendly draft
(`DRAFT=1 bash "$X/tools/render.sh" film <name> qa`, about a minute) rather than a developer preview; after their
approval of style and storyboard, set `plan.status` to `"approved"`.

### presenter_generated (here: the performed film)

There is no presenter on this route; the state means the performed film exists. Replace the placeholders in
`film/beats.js` with the storyboard's scenes, scene by scene, every beat time from `story.at()` / `story.phrase()` /
`story.span()`. Rerun `python3 "$X/tools/fonts.py" film` and `(cd film && bash tools/sfx.sh)` after edits. Record
`artifacts.film_project = film`, and write what you looked at and judged to a file (e.g. `qa/reports/visual-review.md`)
and record its path as `qa.manual_visual_review` — the checker needs a file, not a sentence.

### composition_checked

```bash
python3 "$X/tools/qa.py" film qa/film      # check + snapshots + stillness + cover.png → qa/film/composition.json
```

It exits non-zero when `check` fails or a stillness pair is under 0.001 (a parked camera or frozen picture). Look at
the snapshots in `qa/film/contacts/` (every chapter, the closing line, the recap). `composition_file_too_large` and
`nested_structure_needs_subcomposition` warnings are expected for these single-file films. Record
`qa.composition_report = qa/film/composition.json`. Get the user's approval before the final render, with a new
`DRAFT=1` render (or the Studio preview, if they prefer it).

### rendered → verified

```bash
bash "$X/tools/render.sh" film <name> outputs        # renders film/renders/<name>.mp4, then finalize_delivery.sh
```

`render.sh` calls this skill's `finalize_delivery.sh` (loudness, full decode, contact sheet), writes
`outputs/<name>.srt` (subtitles for Bilibili CC and other platforms) and `outputs/<name>-freeze.txt`; a performed
explainer should have 0 freeze events. `SKIP_RENDER=1` repeats only the finalize step. Record
`artifacts.rendered = film/renders/<name>.mp4`, `artifacts.master`, `artifacts.share`, `artifacts.caption_json` (or the
SRT), `qa.delivery_report`, then `check_state.py --write` until `verified`. Hand the user the master, the share copy,
the SRT, and `qa/film/cover.png` as the upload cover.

Recording artifacts is plain JSON editing, e.g.
`jq '.artifacts.film_project = "film"' job.json > job.tmp && mv job.tmp job.json`.

## Re-styling an earlier film

Keep the job's `story/` (script and locked audio — no new voice cost). Build a second film from the same story in the
new style (`new_film.sh <style> story film-<style>`), perform its `beats.js` from the storyboard, and get the
storyboard re-approved; QA and delivery as above, with its own output name. The first film stays untouched.

## Performing the content

- Act out every narrated phrase on screen, on its word: the thing named appears, moves, changes or is compared
  when it is said. A page that only reveals text reads as a slide.
- One plain-language note per chapter; the real term next to every analogy.
- Only facts from the script and the `## facts` block; label illustrative visuals as illustrative.
- Keep the style's aesthetic baseline (`explainer/KITS.md` §2): readable sizes at 1080p, one accent with one meaning,
  no dead space, something meaningful in motion every second, the camera never parks.
- Starters are drafts: never deliver a film whose `beats.js` still shows 「待演绎」 placeholders.

## Optional: bringing a digital human into a styled film

The styles are designed without a presenter, and most topics do not need one. When a user wants their digital human
in a styled film anyway (a personal channel, a familiar face for the hook), this method was tried on two finished
films (V2 and V9, both passing `check`); use it as a recipe, not a default.

1. **One clock.** Lock the narration the presenter route's way and generate the presenter from it (pilot, cost
   statement, evidence — [generation.md](generation.md)). Build the story from that exact audio:
   `story.py story --audio assets/audio/final/narration.wav`. The film is then timed to the words the presenter's
   mouth is already synced to; never re-voice one side only. Join a segmented presenter into one track first.
2. **Give the presenter its own space — never cover the film.** Each style fills the frame with performed content;
   anything laid on top hides it (and fails the layout and contrast checks). Shrink the film instead: wrap every
   visual child of the composition root in CSS `translate` / `scale` (they compose with the style's own transforms)
   and place the presenter in the freed column.
3. **Three states, morphing over ~0.6 s:** *on stage* for the hook and the closing line (film at about 70 % on one
   side, the presenter on a tall card beside it); *badge* while the film explains (film at about 86 %, the presenter as
   a small circle in the narrow column); *off* for the recap (film full size). Default keys from the story: on stage
   until the first line ends, badge until just before the closing line, on stage for it, off before the recap.
4. **Belong to the style.** Frame the presenter with the style's tokens (`--kit-accent` border, `--kit-surface`
   behind), the face focused near the top third (`object-position: 50% 30%`), the video muted (the film's narration
   track is the presenter's audio).
5. **Drive it from the film's clock.** Every frame is a pure function of t: update the presenter frame and the film
   transform inside the style's frame function (or a hook it calls each frame), and give the `<video>` its own
   `data-start` / `data-duration` so HyperFrames owns its playback.
6. **Verify** as for any styled film (check 0 errors, stillness pairs), plus normal-speed playback of the hook and the
   closing line for lip-sync.
