---
name: bulletmind
description: >
  Convert any input into clean, structured, hierarchical bullet points only. Use this skill when user says phrases like 'explain in bullets', 'convert to bullets'. Always rewrite content into a clear, indented bullet hierarchy suitable for summarization and note-taking
risk: safe
source: community
date_added: "2026-04-21"
---

# BULLETMIND

All responses remain strictly in hierarchical bullet format with no paragraphs, no prose blocks, no drift, and only structured bullet output.

---

## When to USE This Skill

Transform any input (paragraphs, notes, explanations, articles, webpage, etc.) into a **structured bullet hierarchy**:
- No paragraphs or long prose
- Only bullets with clean indentation

This improves readability, memorization, and structured thinking often helpful in note taking.

---

## Persistence

ACTIVE ALWAYS. Every response stays in bullet mode.
Default: **full**. Switch: `/bulletmind lite|full|ultra`.

---

## Intensity

| Level | Behavior                                                                                            |
| ----- | --------------------------------------------------------------------------------------------------- |
| lite  | clean hierarchical bullets, light restructuring, preserve sentence flow                             |
| full  | default strict hierarchy, balanced compression, clear grouping + splitting                          |
| ultra | deep hierarchical decomposition, aggressive splitting, high granularity, maximal structural clarity |

---

## Bullet Structure

Use consistent indentation:
- Top-level idea
  - Sub-point
    - Detail
  - Sub-point
- Next top-level idea
  - Sub-point

---

## Rules

- NO paragraphs
- ONLY bullets `-`
- ALWAYS hierarchical structure
- GROUP related ideas under parent bullets
- SPLIT long sentences into smaller bullets
- KEEP meaning intact, no over-summarize
- REMOVE filler words

---

## Formatting

- Use `-` for all bullets
- Indent: 2 spaces per level
- Keep bullets short
- One idea per line
- No mixed symbols and no prose bridging lines

---

## Transformation Logic

- Paragraph -> main ideas -> top bullets
- Details -> nested bullets
- Messy notes -> cleaned hierarchy
- Existing bullets -> restructure + normalize depth
- Short input -> still convert into bullet tree

---

## Compression Strategy

- Remove filler words
- Split complex sentences
- Preserve key facts + relationships
- Do NOT flatten structure
- Prefer clarity over max compression

---

## When NOT to use

- User requests paragraphs
- creative writing (stories, essays)
- formats where bullets reduce clarity

---

## Output Rule

Always output:
- Structured bullet hierarchy
- No commentary or explanation

### Examples

- Refer `EXAMPLES.md` for output templates

---

## When NOT TO USE This Skill

- User explicitly asks for paragraphs
- Creative writing tasks (stories, essays, etc.)
- Formatting where bullets would harm clarity

---

## Important Notes

- Prefer clarity over strict compression
- Avoid flattening everything into one level
- Maintain a logical tree structure