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

Chinese AI writing has its own tells, and they are not the English ones. English humanizers hunt `delve`, "it's not just X, it's Y" and em-dash overuse; a Chinese draft reads machine-written because of 赋能 / 闭环 / 抓手 / 底层逻辑 (pattern 15), 首先-其次-最后 scaffolding (pattern 30), 随着…的发展 openers (pattern 25), 拔高意义 endings (pattern 16), and 公文套话 (pattern 22). A translated English humanizer misses all of it.

This skill ships the pattern catalog plus the editing procedure: score a draft for AI smell, rewrite it against the specific patterns it hits, clone a reference style, and review the result. The full 35-pattern catalog lives in `references/ai-patterns-zh.md` and is plain Markdown — usable as a prompt by any assistant.

*Note on the engine: this bundle is documentation only. A zero-dependency local rule engine is published in the source repository (see `source_repo`) as an optional external prerequisite — it is not included here.*

## When to Use This Skill

- Use when a Chinese draft "reads like AI" and needs to sound human-authored.
- Use when the user asks 去AI味, 改得像人写的, or 这段是不是AI写的 (is this AI-written?).
- Use when editing marketing copy, WeChat articles, product listings, or social posts written in Chinese.
- Use when asked to imitate a reference writing style (风格克隆) or to produce A/B variants of the same copy.
- Use when shifting tone: casual / formal / marketing / humor / direct.

## How It Works

### Step 1: Score the draft first (diagnose before editing)

Scan the text, record which patterns hit *and where*, then compute the AI-smell index with the deterministic formula below. Do not rewrite from vibes — the same phrases recur, and you need the hit list to verify the edit afterwards.

#### The AI-smell index (deterministic — the same formula must be used before and after)

1. **Count hits per paragraph.** For each pattern, count one hit per paragraph — repeats inside the same paragraph do not inflate the score.
2. **Weight by evidence strength.** 强模式 = **2 points**; patterns the catalog marks 弱证据 (破折号 / 限定词 / 被动与无主语 / "的"-字堆叠 / 引号不统一) = **1 point**.
3. **Normalize by length.** `D = 加权总分 / max(1, 总字数 / 100)` — weighted hits per 100 characters.
4. **Index.** `AI味指数 = min(100, round(D × 10))`.
5. **Bands.** 0–20 基本像人写 · 21–45 轻度 AI 味 · 46–75 明显 AI 味 · 76–100 一眼假.
6. **Report three numbers, not one:** 命中处数 / 加权总分 / AI味指数. After rewriting, recompute with the same formula so the delta is comparable. If a hit cannot be attributed to a catalogued pattern, report only the observable hit count and say the index is not computed — never invent a number.

Worked example (the sample below): 8 hits in 77 characters, 6 strong (6 × 2 = 12) + 2 weak (2 × 1 = 2) → 加权总分 14 → D = 14 / 0.77 ≈ 18.2 → 指数 = min(100, 182) = **100/100**.

```
AI 味体检报告
总字数 77 ｜ 命中 8 处 ｜ 加权 14 ｜ AI味指数 100/100（一眼假）
机械连接 ×3   官方黑话 ×2   空洞拔高 ×2   夸张词 ×1
```

### Step 2: Rewrite against the specific patterns, not in general

Work through the hit list one pattern at a time. Correct each pattern by its own rule (the catalog gives 识别特征 → 为什么假 → 改前/改后 for all 35). Two rules govern the whole pass:

- **A single hit is not evidence.** The catalog marks certain patterns (em-dash, hedges, passive voice, 的-stacking, quotation marks) as 弱证据 — only act when two or more appear in the same paragraph.
- **Delete, don't decorate.** Most patterns disappear by deleting the sentence that carries them: drop the negation half of 不是 X，而是 Y, drop the significance ending, drop the 开场铺垫, drop the assistant residue (希望对你有帮助).

**The facts come from the source, never from the pattern list.** A rewrite may delete packaging, reorder, and rephrase; it must not introduce a fact the source does not contain. If the rewrite would be clearer with a number or a specification (rotational speed, battery life, materials), and the source has none, ask the user for it — never supply one.

### Step 3: Verify the rewrite

Re-score the rewritten text with the same Step 1 formula. The index should drop and the semantic content must be preserved — report the before/after triple (命中处数 / 加权总分 / 指数), how many patterns were cleared, and confirm that no fact was added or lost. A rewrite that lowers the score by deleting facts is a failed edit; so is one that raises the count of facts in the text.

### Step 4: Optional — style clone, variants, tone, review

- **Style clone**: supply a reference sample (an old article, a novel fragment, a writer you like) and match its sentence rhythm, vocabulary and colloquial ratio.
- **Variants**: produce 2-6 clearly different versions (short and punchy / loose and spoken / vivid) for headline and ad-copy A/B tests.
- **Tone**: re-target the same content to casual, formal, marketing, humor or direct register.
- **Review**: score the finished text on Hook / Pacing / Emotion / AI-Smell / Clarity / Persuasion / Structure / Readability, plus three concrete improvements.

## Examples

### Example 1: Business copy with stacked AI tells (deletion-only edit)

Before:

```
首先，这款产品不仅性能卓越，更是彰显了品牌的匠心精神。随着智能家居时代的发展，
它以用户为中心，赋能每一个家庭的智慧生活，具有里程碑意义。
```

After — **deletion-only; every surviving phrase already appears in the source, and no specification was added**:

```
这款产品性能卓越，能融入家庭的智能生活。
```

Every change is tied to a catalogued pattern:

- 首先 → **pattern 30** (强制编号与小标题, mandatory 首先/其次 numbering)
- 不仅…更是 → **pattern 1** (不是 X，而是 Y — negation-half padding)
- 随着智能家居时代的发展 → **pattern 25** (\"随着……的发展\"式开头)
- 以用户为中心 / 赋能 → **pattern 15** (高频 AI 词) and **pattern 23** (互联网黑话)
- 彰显了品牌的匠心精神 / 具有里程碑意义 → **pattern 16** (拔高意义)

Six patterns removed, zero facts added, zero facts lost: the rewrite keeps 性能卓越 and 智能生活, the only two claims present in the source. It does **not** gain a rotation speed, a battery life or a waterproof rating — those are not in the source, and inventing them is exactly the failure mode this skill exists to prevent.

### Example 2: Assistant residue in generated output

Before:

```
当然可以！以下是我为你整理的三个要点，希望对你有所帮助。需要我展开说明吗？
```

After:

```
三个要点：
```

Pattern 31 (聊天机器人残留) — the wrapper adds nothing; the content stands alone.

## Best Practices

- ✅ Score before and after; report the triple (命中处数 / 加权总分 / 指数) so the edit is verifiable.
- ✅ Quote the pattern number for every change — it makes the edit reviewable and teachable.
- ✅ Keep every fact, number and claim from the source; only the packaging should change.
- ✅ Respect 弱证据 — two hits in one paragraph, not one hit anywhere.
- ✅ Keep the catalog in Chinese when editing Chinese; the tells are language-specific.
- ❌ Don't invent facts to make the rewrite concrete — if the source has no number, ask for one.
- ❌ Don't swap one AI word for another AI word (赋能 → 助力 solves nothing).
- ❌ Don't "polish" a draft into formal register — that usually adds AI smell rather than removing it.
- ❌ Don't strip caveats and qualifiers that carry real meaning (legal disclaimers, safety warnings).

## Limitations

- **Chinese-centric by design.** The pattern catalog targets Chinese AI tells; it will not fix English AI smell (use an English humanizer for that).
- **Documentation only.** No script and no engine is bundled in this skill. The optional local rule engine is published in the source repository; deep rewriting, style cloning, variants and scoring require an LLM of your choice.
- **Rule-based detection, not a detector model.** The index is a heuristic over known patterns, computed by the formula above. It cannot prove authorship and must not be used as evidence that a text "was" or "was not" AI-written.
- **Unlisted patterns are out of scope.** Tells that are not in the 35-pattern catalog pass through untouched; the catalog is the ceiling of what this skill sees.
- **Keep-conditions need human confirmation.** Some removal is context-dependent — a safety caveat such as "do not soak for long periods" may be a legal requirement; when a pattern overlaps with a claim that must stay, ask before deleting.

## Reference

- [`references/ai-patterns-zh.md`](references/ai-patterns-zh.md) — the full 35-pattern Chinese AI-smell catalog, grouped into 摆姿势 / 机械节奏 / 注水借势 / 格式装饰 / 助手残留, each entry giving 识别特征 → 为什么假 → 改前/改后.
- Source repository (MIT, optional runnable engine): https://github.com/jiawood2006/hermes-skills
