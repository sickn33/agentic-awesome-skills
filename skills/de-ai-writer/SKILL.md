---
name: de-ai-writer
description: "Chinese AI-smell removal engine: 35 Chinese AI-tell patterns (赋能/闭环), AI-smell scoring, de-AI rewriting, style clone. Use when a Chinese draft reads machine-written or the user asks 去AI味."
category: content-writing
risk: safe
source: community
source_repo: jiawood2006/hermes-skills
source_type: community
date_added: "2026-09-14"
author: jiawood2006
license: "MIT"
license_source: "https://github.com/jiawood2006/hermes-skills/blob/main/LICENSE"
tags: [chinese, writing, editing, humanize, de-ai, copywriting, style-clone, ai-detection]
tools: [claude, cursor, codex, gemini, hermes]
---

# De-AI Writer — Chinese AI-Smell Removal

## Overview

Chinese AI writing has its own tells, and they are not the English ones. English humanizers hunt `delve`, "it's not just X, it's Y" and em-dash overuse; a Chinese draft reads machine-written because of 赋能 / 闭环 / 抓手 / 底层逻辑, 首先-其次-最后 scaffolding, 随着…的发展 openers, 拔高意义 endings, and 公文套话. A translated English humanizer misses all of it.

This skill ships the pattern catalog plus the editing procedure: score a draft for AI smell, rewrite it against the specific patterns it hits, clone a reference style, produce tone variants, and review the result. The full 35-pattern catalog lives in `references/ai-patterns-zh.md` and is plain Markdown — usable as a prompt by any assistant, with or without the runnable engine.

## When to Use This Skill

- Use when a Chinese draft "reads like AI" and needs to sound human-authored.
- Use when the user asks 去AI味, 改得像人写的, or 这段是不是AI写的 (is this AI-written?).
- Use when editing marketing copy, WeChat articles, product listings, or social posts written in Chinese.
- Use when asked to imitate a reference writing style (风格克隆) or to produce A/B variants of the same copy.
- Use when shifting tone: casual / formal / marketing / humor / direct.

## How It Works

### Step 1: Score the draft first (diagnose before editing)

Run an AI-smell pass and record which patterns hit *and where*. Do not rewrite from vibes — the whole point is that the same phrases recur, and you need the hit list to verify the edit afterwards.

Report the result as a total, a hit count, and a per-category breakdown, ending with an AI-smell index from 0-100:

```
AI 味体检报告
总字数 77 ｜ 命中模式 8 处 ｜ AI味指数 100/100（AI味重，一眼假）
机械连接 ×3   官方黑话 ×2   空洞拔高 ×2   夸张词 ×1
```

### Step 2: Rewrite against the specific patterns, not in general

Work through the hit list one pattern at a time. Correct each pattern by its own rule (the catalog gives 识别特征 → 为什么假 → 改前/改后 for all 35). Two rules govern the whole pass:

- **A single hit is not evidence.** The catalog marks certain patterns (em-dash, hedges, passive voice, 的-stacking, quotation marks) as 弱证据 — only act when two or more appear in the same paragraph.
- **Delete, don't decorate.** Most patterns disappear by deleting the sentence that carries them: drop the negation half of 不是 X，而是 Y, drop the significance ending, drop the 开场铺垫, drop the assistant residue (希望对你有帮助).

### Step 3: Verify the rewrite

Re-score the rewritten text with the same pass. The AI-smell index should drop and the semantic content must be preserved — report both, plus how many patterns were cleared. A rewrite that lowers the score by deleting facts is a failed edit.

### Step 4: Optional — style clone, variants, tone, review

- **Style clone**: supply a reference sample (an old article, a novel fragment, a writer you like) and match its sentence rhythm, vocabulary and colloquial ratio.
- **Variants**: produce 2-6 clearly different versions (short and punchy / loose and spoken / vivid) for headline and ad-copy A/B tests.
- **Tone**: re-target the same content to casual, formal, marketing, humor or direct register.
- **Review**: score the finished text on Hook / Pacing / Emotion / AI-Smell / Clarity / Persuasion / Structure / Readability, plus three concrete improvements.

## Examples

### Example 1: Business copy with stacked AI tells

Before:

```
首先，这款产品不仅性能卓越，更是彰显了品牌的匠心精神。随着智能家居时代的发展，
它以用户为中心，赋能每一个家庭的智慧生活，具有里程碑意义。
```

After (each deletion tied to a catalog pattern):

```
这款剃须刀转速 8500 转，充电 10 小时能用 90 天，整机水洗。
```

Removed: 首先 (pattern 25, opener scaffolding), 不仅…更是 (pattern 1, negation-half padding), 随着…的发展 (pattern 25), 赋能 (pattern 2, empty jargon), 具有里程碑意义 (pattern 16, significance inflation) — five patterns, zero facts lost. The rewrite keeps the number, the runtime and the washability, which are the only claims a reader can use.

### Example 2: Assistant residue in generated output

Before:

```
当然可以！以下是我为你整理的三个要点，希望对你有所帮助。需要我展开说明吗？
```

After:

```
三个要点：
```

Pattern 31 (chatbot residue) — the wrapper adds nothing; the content stands alone.

## Best Practices

- ✅ Score before and after; report both numbers so the edit is verifiable.
- ✅ Quote the pattern number for every change — it makes the edit reviewable and teachable.
- ✅ Keep every fact, number and claim; only the packaging should change.
- ✅ Respect 弱证据 — two hits in one paragraph, not one hit anywhere.
- ✅ Keep the catalog in Chinese when editing Chinese; the tells are language-specific.
- ❌ Don't swap one AI word for another AI word (赋能 → 助力 solves nothing).
- ❌ Don't "polish" a draft into formal register — that usually adds AI smell rather than removing it.
- ❌ Don't strip caveats and qualifiers that carry real meaning (legal disclaimers, safety warnings).

## Limitations

- **Chinese-centric by design.** The pattern catalog targets Chinese AI tells; it will not fix English AI smell (use an English humanizer for that).
- **Rule-based detection, not a detector model.** The index is a heuristic score over known patterns. It cannot prove authorship and should not be used as evidence that a text "was" or "was not" AI-written.
- **Unlisted patterns are out of scope.** Tells that are not in the 35-pattern catalog pass through untouched; the catalog is the ceiling of what this skill sees.
- **Rewriting needs a model for the deep pass.** The bundled local engine clears high-frequency patterns with zero dependencies and no network, but full rewriting, style cloning, variants and scoring require an LLM (the skill can emit a ready-to-paste prompt when no API key is configured).
- **Keep-conditions need human confirmation.** Some removal is context-dependent — a safety caveat such as "do not soak for long periods" may be a legal requirement; when a pattern overlaps with a claim that must stay, ask before deleting.

## Reference

- [`references/ai-patterns-zh.md`](references/ai-patterns-zh.md) — the full 35-pattern Chinese AI-smell catalog, grouped into 摆姿势 / 机械节奏 / 注水借势 / 格式装饰 / 助手残留, each entry giving 识别特征 → 为什么假 → 改前/改后.
- Runnable engine (free, MIT): https://github.com/jiawood2006/hermes-skills
