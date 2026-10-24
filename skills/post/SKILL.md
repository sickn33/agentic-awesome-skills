---
name: post
description: "Make share-post image sets that look native: Xiaohongshu carousels, X images, covers, App Store poster layouts, real screenshots and faithful app-UI mocks. Use for 图文, 配图, 组图, 封面, 分享帖."
category: marketing
risk: safe
source: self
source_repo: jack-reson8/post-skill
source_type: self
date_added: "2026-10-24"
author: jack-reson8
tags: [social, image, xiaohongshu, carousel]
tools: [claude, codex, cursor]
license: "MIT"
license_source: "https://github.com/jack-reson8/post-skill/blob/main/LICENSE"
---

# Post — share images that look native and sell

The bar: someone scrolling sees a real app screen and a funny line, not a designed slide. Every set also does a job for the account (promote a product, grow the series, earn a follow).

## When to Use This Skill

- the user wants a Xiaohongshu carousel, X image set, cover image or launch post visuals
- the user wants an App Store poster layout, real-screenshot or app-UI mock share images

## 1 · Brief → `post/brief.md`
Write before anything else:
- goal of this post (which product / note / follower action) and the platform (XHS = image-led, more text per image; X = 1–4 images, image supports the text)
- series identity: account name, series name, episode number, the recurring progress metric (e.g. "paid back $0 / $200")
- the true facts of today, each with its source (dashboard, repo, chat log). **Nothing goes into an image that isn't on this list.**

## 2 · References → `post/refs.md` (gate: no layout before this exists)
- Search the target platform for the topic and grid the top covers by likes (method in `references/cover-patterns.md`).
- Look at 2+ App Store screenshot sets of tasteful apps (`references/app-store-patterns.md`).
- Write 3 takeaways you will actually use. Don't copy a famous style literally; the user's examples are directions, not specs.

## 3 · Storyboard → `post/storyboard.md`
Table, one row per frame (XHS 7–9, X 1–4): `# | headline (≤2 lines, a number if possible) | evidence (real screenshot / UI mock / figure) | floating card | joke | GTM role`.
Required rows: a cover with a series lockup and an honest proof line; at least one product frame (what it does + who for + real output + price pill); one full-bleed accent frame with one giant number; a last frame that hooks the follow (streak calendar + tomorrow's task + a specific CTA). Adjacent frames use different evidence types. Figures follow `references/dataviz-forms.md`.

## 4 · Copy
Write fluent, complete sentences with normal punctuation first: conclusion first, one logic line per paragraph, read it aloud. Then at most one light joke in the whole set and at most one 金句 (a concrete image that grows out of this story), only if one fits; stacked jokes read as greasy. `references/humor.md` is optional. No emoji, no slogans, no "not X but Y". Re-check every claim against brief.md. Read `references/lessons.md` now.

## 5 · Build
- Real screenshots: `scripts/shoot.sh <url> screens/raw/name.png` (set `PROXY=` if needed).
- UI mocks: copy `assets/ui.html` (390pt iPhone frames, zoomed to 1080×1440: `xl` X light, `xd` X dark with media, `ls` lock screen, `gg` Google no results, `sp` Stripe today, `cc` Claude chat). Before adding a new app, open its real UI or App Store screenshots and match status bar, type, spacing, icons.
- Figures: copy `assets/figs.html` (`tl` timeline, `fn` ladder, `mp` map).
- Posters: copy `assets/poster.html` (frames `p1`–`p9`; series lockup, DAY tag and progress bar are injected on every frame; dark base + yellow marker + PingFang 900; `.ph` phone, `.pop` floating card, `.mag` magnifier, `.aside` handwritten note). Put inputs in `screens/`.
- Render: `scripts/render.sh poster.html out p1 p2 …` (UI mocks and figures first, posters last since they embed them).

## 6 · Review → contact sheet
`scripts/contact.py out/sheet.jpg out/p*.png`, then look at it at thumbnail size and check: headline readable at feed size; one hero per frame; nothing overlapping the progress bar or cut at an edge; no two neighbours alike; series lockup on every frame; numbers match brief.md. Fix and re-render.

## 7 · Hand-off
Show the contact sheet and the post text (2–3 title options). Publishing is the user's call, every time. Record any new rejection or acceptance in `references/lessons.md`.

Example output: `assets/example/day1-contact-sheet.jpg` (Day 1 of a building-in-public series).

## Limitations

- Images are built from the user's real screenshots and assets
-  it does not invent product claims
- Publishing is left to the user
