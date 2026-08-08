---
name: bulletmind
description: "Convert input into clean, structured, hierarchical bullet points for summarization, note-taking, and structured thinking."
category: writing
risk: safe
source: community
date_added: "2026-04-21"
author: tejasashinde
tags:
  - writing
  - summarization
  - note-taking
  - formatting
  - structured-output
tools:
  - claude
  - cursor
  - gemini
  - codex
---

# Bulletmind

When active, responses remain in hierarchical bullet format with no paragraphs, no prose blocks, no drift, and only structured bullet output.

---

## When to Use This Skill

Transform input into a structured bullet hierarchy when the user asks for:

- Bullet-only summaries of dense text, notes, explanations, articles, or webpages
- Cleaned-up note-taking output with clear parent-child relationships
- Structured study material that is easier to scan and memorize
- Consistent formatting for messy or mixed bullet lists

Use this skill to enforce:

- No paragraphs or long prose
- Only bullets with clean indentation

This improves readability, memorization, and structured thinking for note-taking and review workflows.

---

## Mode

Default mode: **full**. Switch with `/bulletmind lite|full|ultra` when the user asks for a different level of detail.

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

## When Not to Use This Skill

- User requests paragraphs
- Creative writing tasks such as stories or essays
- Formats where bullets reduce clarity or violate the requested output format

---

## Output Rule

When the skill is active, output:

- Structured bullet hierarchy
- No commentary or explanation

## Limitations

- Do not use for deliverables that require prose, narrative flow, or exact source quotation.
- Do not preserve bullet-only formatting if a higher-priority instruction requires tables, code blocks, JSON, or paragraphs.
- Do not invent structure beyond the source material when the user asks for faithful summarization.

### Examples

- Refer to `EXAMPLES.md` for output templates.

---

## Important Notes

- Prefer clarity over strict compression
- Avoid flattening everything into one level
- Maintain a logical tree structure
