---
name: lanshu-create-ai-presenter-video
description: "Turn a topic or script into a publish-ready explainer video, led by an AI presenter or performed in one of twelve styled explainer looks."
category: media
risk: unknown
source: community
source_repo: cclank/lanshu-create-ai-presenter-video
source_type: community
date_added: "2026-10-21"
author: cclank
tags: [video, explainer, ai-presenter, ffmpeg, narration]
tools: [claude, cursor, gemini, codex]
license: "MIT"
license_source: "https://github.com/cclank/lanshu-create-ai-presenter-video/blob/main/LICENSE"
---

# Lanshu Create AI Presenter Video

Produce a verified explainer video from minimal inputs — led by a digital human, or performed in one of twelve explainer styles. The final narration is the master clock for presenter motion, captions, graphics, cuts, and delivery duration.

## When to Use

- Use when the user wants a topic or finished script turned into an explainer video, with or without an AI presenter.
- Use when the user asks for 数字人口播 / 数字人讲解, 讲解视频 / 动画讲解 / 科普视频, or names one of the twelve explainer styles.
- Use to continue, revise, caption, lip-sync repair, or re-export an existing job.
- Not for promos, ads, or footage montages.

Original trigger description from upstream: Turn a topic or finished script into a complete, publish-ready explainer video — led by an AI presenter from an authorized adult presenter image, or performed with no presenter in one of twelve explainer styles (nine visual styles and three narrative ones). Not for promos, ads, or footage montages. Use for new presenter or styled explainer videos and for continuing, revising, captioning, lip-sync repairing, or re-exporting an existing job. Use it whenever the user asks for 数字人口播 / 数字人讲解, for a 讲解视频 / 动画讲解 / 科普视频, asks which styles or templates are available (有哪些风格 / 看看风格 / 风格模板), or names one of the styles: 留白, 信号/科技感, 手帐/手绘, 立体书/纸艺, 波普漫画, 一镜到底/3D, 图纸与注脚, 黑板报, 黏土小城, 推演/动态图解, 案卷/调查复盘, 小剧场/生活场景. Keep model and provider selection capability-based and record the actual choices per job.

## Choose a route

Every job takes one of two routes, recorded as `creative.route`. Infer it when the request is clear (cues below);
otherwise ask once, with this table and the style gallery (`explainer/STYLES.md`; attach or link the images
`explainer/gallery/nine-styles-kv-cache.jpg` and `explainer/gallery/three-narrative-styles-kv-cache.jpg`). Never fall back to `presenter` silently: it needs a portrait the user
may not have.

| Route | The video | The user provides | Paid generation | Format |
|---|---|---|---|---|
| `presenter` | A digital human presents; captions and keyword graphics support it | Topic or script + authorized presenter image | Voice + presenter video | Any; 9:16 by default |
| `styled` | A performed explainer: every narrated phrase is acted out on screen in one of twelve styles (nine visual, three narrative), no presenter | Topic or script | Voice only | 16:9 |

- A presenter image or the words 数字人 / presenter / 口播 / 真人出镜 point to `presenter`; 不要真人 / "no presenter" /
  "faceless", a named style, or 动画讲解 / 手绘 / 黑板 / 黏土 / 漫画 / 推导 / 复盘 / 小剧场 point to `styled`.
- A vertical platform (抖音 / 视频号 / 小红书 / 竖屏 / 9:16) is a format request, not a route: `styled` is 16:9 only.
  If it comes with no portrait or with styled cues, ask (a 16:9 styled film vs a 9:16 presenter video) instead of
  switching routes.
- Narration the user already recorded is the locked audio on either route. Never pass it as `--voice-sample` (that
  flag is for voice cloning). On `styled` use `story.py story --audio <file>` and ask for the matching script text
  (or transcribe it and have the user check it).
- To re-style an earlier job, keep its script and locked audio (no new voice cost), build a new film from the same
  `story.json` in the new style, and re-approve the storyboard. Ask which job when it is not obvious.
- This skill makes explainers. For 宣传片 / 广告 / 发布大片 / footage edits, say so, and offer a product explainer only
  if the user wants one.
- For `styled` also choose `creative.explainer_style` (`v1-editorial` … `v12-sitcom`). Recommend two or three from the
  topic and audience (one reason each) using `explainer/STYLES.md`; when the user is unsure, build drafts in the nine
  visual styles (no extra paid calls once the audio is locked, or with `--dry`) and let them pick from a still grid.
  Settle the style before the script is locked: each style shapes how the narration is written and voiced
  (`explainer/STYLES.md`, "按风格写稿"). The three narrative styles (`v10-reasoning` 推演, `v11-casefile` 案卷,
  `v12-sitcom` 小剧场) go further: use the style's suggested arc when it helps the explanation, adapting chapters and
  order to the topic. The examples are starting points; keep room for other storytelling choices. To compare
  styles first, use `--dry` drafts of a first script, then adapt it to the chosen style.
- `styled` follows [styled-explainer.md](references/styled-explainer.md) and reuses this skill's job directory, state
  machine, approvals, and delivery checks. The styles are designed to carry the explanation on their own; if a user
  also wants their digital human in a styled film, that file describes the method (time the film to the presenter's
  locked narration, give the presenter its own space) as an optional addition, not a separate route.

How to ask, when the request leaves the choice open — one message, in the user's language:

1. The two routes, one line each: what the video looks like, what the user must provide, what is paid, and the
   format (presenter: any ratio, 9:16 by default; styled: 16:9 only). Recommend one for this topic and say why (e.g. "no portrait yet, or a concept that needs to be shown → styled"; "personal brand,
   talking to camera → presenter").
2. For `styled`, assume the user does not know the styles yet: show the whole menu — the two gallery images plus the
   twelve one-line entries of "风格菜单" in `explainer/STYLES.md` — and mark the two or three that fit this topic and
   audience, one reason each. Offer "build drafts in the nine visual styles and pick from a still grid" as the
   alternative. Do the same, without the route table, when the user only asks which styles there are.
3. Proceed with the recommendation if the user agrees or does not mind; record the choice in `job.json`.

## Required outcome

- Start from a topic or script and, for the presenter route, one authorized image containing one clear adult presenter.
- Deliver a fully decoded master video, a smaller share copy, captions, production records, and separate machine and visual QA notes.
- Keep the workflow portable across providers, models, aspect ratios, languages, and durations.

## Operating rules

- Confirm image rights, adult status, remote-upload approval, and voice-cloning authorization before the relevant remote action.
- Treat remote generation as potentially billable. Before the first paid call, state the uploaded assets, requested seconds or units, known cost, pilot size, retry ceiling, and expected output. Reuse an approval already given for that exact plan.
- Never infer a real voice from an image. Use an authorized sample or record a selected stock voice.
- Lock the complete narration before presenter generation, caption timing, or final scene boundaries.
- Prefer one presenter image, one voice identity, one visual treatment, and one continuous presenter source.
- Mute video sources in the final composition. Route only the approved external narration and intentional mix tracks.
- Preserve provider request bodies and task IDs without credentials or expiring URLs. Poll interrupted work before considering resubmission.
- Use numeric checks for technical faults and normal-speed visual review for identity, mouth timing, blinking, gestures, hands, lighting, and continuity.
- Stop after three rejected paid candidates, or before a change that materially affects cost, privacy, voice, appearance, or provider.
- Do not claim completion until the final files fully decode, the contact sheet or full playback has been reviewed, and `check_state.py` reports `verified`.

## Start or resume a job

For a new job, read [generation.md](references/generation.md). Set `SKILL_DIR` to the directory that contains this file; its location depends on the harness. Then run:

```bash
SKILL_DIR=/path/to/lanshu-create-ai-presenter-video

python3 "$SKILL_DIR/scripts/init_job.py" \
  --job-dir ~/Videos/my-presenter-video \
  --presenter-image ~/Pictures/presenter.png \
  --topic "用一分钟讲清楚上下文工程"
```

For the styled route add `--route styled --explainer-style v3-notebook` (no presenter image needed).

Use `--script` for an existing script file. Optional flags include `--voice-sample`, `--supporting-media`, `--duration`, `--aspect`, `--width`, `--height`, `--fps`, `--watermark`, and `--cta`. The initializer copies every input into the job and records job-relative paths, so the job directory is self-contained; keep later artifact paths job-relative too.

Inspect the actual source image and listen to any voice sample. Record the manual review and approvals in `job.json`, then run:

```bash
python3 "$SKILL_DIR/scripts/preflight.py" ~/Videos/my-presenter-video/job.json
```

For an existing job, read `job.json`, current artifacts, task IDs, and QA reports, then run `check_state.py` (below) to find the earliest unfinished state. Resume there without regenerating accepted work.

## Production state machine

Advance a job only when its evidence exists:

```text
intake
→ content_locked       passing preflight report, script, beat sheet
→ audio_locked         decodable final audio, ASR report
→ visual_plan_locked   timeline, storyboard, plan.status "approved"
→ presenter_generated  recorded main_presenter capability, selected video, visual review
→ composition_checked  composition report
→ rendered             decodable render with video and audio
→ verified             master, share, delivery report with passing output loudness
```

On the `styled` route there is no presenter: `presenter_generated` is reached by the performed film instead
(`artifacts.story`, `artifacts.film_project`, and the visual review).

Never edit `state` by hand. Record artifacts in `job.json`, then let the checker compute the state:

```bash
python3 "$SKILL_DIR/scripts/check_state.py" ~/Videos/my-presenter-video/job.json --write
```

Without `--write` it only reports. It exits non-zero when the recorded state claims more than the evidence supports, and lists what the next state is missing.

### 1. Lock content and audio

Read [generation.md](references/generation.md).

1. Turn a topic into one spoken content spine, or polish a supplied script without changing factual meaning silently.
2. Save the production script, beat sheet, pronunciations, and narration sections.
3. Generate the complete approved narration with one voice configuration.
4. Normalize sections consistently, run ASR on the final audio, and correct material omissions, additions, numbers, names, or repeated speech.
5. Record real durations. These durations now define the timeline.

### 2. Plan and generate the presenter

Choose a presenter-led, screen-demo, or mixed-explainer route. Use supporting media only when it proves or clarifies a spoken point.

When the provider caps request or reference-audio duration below the narration length, plan the split from the locked audio's ASR timings instead of guessing:

```bash
python3 "$SKILL_DIR/scripts/plan_segments.py" \
  --timings ~/Videos/my-presenter-video/qa/asr/sentences.json \
  --audio ~/Videos/my-presenter-video/assets/audio/final/narration.wav \
  --cap 15 --whole-seconds \
  --output ~/Videos/my-presenter-video/qa/requests/segment-plan.json
```

Save the plan path in `plan.segment_plan`. Generate every segment from the same image, seed, framing, light, and motion constraints.

Generate a short, low-cost pilot before a full run. Prioritize identity and mouth timing for the main track. Use one controlled gesture for an actionful opening or close. When body motion is accepted but mouth timing fails, preserve the motion plate and apply a dedicated lip-sync repair with the locked audio.

Archive the prompt, parameters, provider/model/version, region, task ID, requested seconds, and acceptance notes.

### 3. Edit the video

Read [editing.md](references/editing.md).

Build a deterministic timeline driven by the locked audio. Keep authored start, duration, and source offset independent. Add captions and keyword callouts only after audio and selected media are final.

When using HyperFrames, load the current `hyperframes`, `general-video`, and relevant domain instructions. Run the project check, inspect transition and emphasis frames, open the Studio preview, and wait for final visual approval before rendering.

### 4. Verify and deliver

Read [qa-recovery.md](references/qa-recovery.md).

Render at delivery quality, watch the complete video, and finalize it:

```bash
bash "$SKILL_DIR/scripts/finalize_delivery.sh" \
  ~/Videos/my-presenter-video/renders/rendered.mp4 \
  ~/Videos/my-presenter-video/outputs \
  my-video
```

The finalizer preserves the input aspect ratio, performs two-pass program loudness normalization, creates master/share encodes, fully decodes them, measures their delivered loudness, counts black and frozen-picture events, and produces a nine-frame contact sheet. It builds everything in a temporary directory and publishes nothing unless every check passes. The target defaults to `-16 LUFS`; set `PROGRAM_LUFS` (for example `PROGRAM_LUFS=-14`) when the destination requires another.

Inspect the contact sheet, review any freeze events against intentional still shots, record the outputs and delivery report in `job.json`, and run `check_state.py --write` to reach `verified`.

## Default behavior for minimal input

- Infer language from the request.
- On the presenter route, use 9:16, 1080×1920, 30fps unless the intended platform suggests another format. The styled route is always 16:9, 1920×1080, 30fps.
- Preserve a supplied script's natural duration; for a topic, target 45–75 seconds.
- Use a suitable stock voice when no authorized voice sample exists.
- On the presenter route, use a presenter-led layout with a designed hook, 2–4 useful beats, and a concise close; on the styled route, the style's starter sets the layout.
- Omit music and promotional CTA unless requested or clearly justified.
- Keep styling credible, contemporary, readable, and safe for the destination platform.

## Required job artifacts

```text
job.json
docs/{SCRIPT,BEAT_SHEET,TIMELINE,STORYBOARD}.md
assets/source/
assets/audio/{reference,raw,final}/
assets/video/{candidates,selected,render}/
assets/captions/
qa/{requests,asr,contacts,reports}/
renders/
outputs/
```

## Reference routing

- Read [styled-explainer.md](references/styled-explainer.md) whenever `creative.route` is `styled`; it maps every state above onto the explainer tools in `explainer/`. Choose styles with `explainer/STYLES.md`.
- Read [generation.md](references/generation.md) for intake, content, voice, tool selection, presenter prompts, paid generation, or provider changes.
- Read [editing.md](references/editing.md) for timeline construction, screen-demo layouts, openings, closes, captions, keyword callouts, previews, and exports.
- Read [qa-recovery.md](references/qa-recovery.md) before accepting media or delivery, and whenever lip sync, identity, hands, exposure, freezes, captions, audio, or remote jobs fail.

## Limitations

- Makes explainers only, not promos, ads, or footage montages.
- Presenter route needs an authorized adult presenter image; the styled route is 16:9 only.
- Needs Python 3.9+, FFmpeg with ffprobe, bash and jq; the styled route also needs Node.js (npx) and rsync.
- Voice and presenter generation call remote providers and need network access, provider credentials and paid usage. Confirm cost with the user before generating.
- Output quality depends on the chosen providers; verify the final render before delivery.
