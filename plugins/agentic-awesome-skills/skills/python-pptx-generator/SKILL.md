---
name: python-pptx-generator
description: "Generate complete Python scripts that build polished PowerPoint decks with python-pptx and real slide content."
category: development
risk: safe
source: self
source_type: self
date_added: "2026-04-06"
author: spideyashith
tags: [python, powerpoint, python-pptx, presentations, slide-decks]
tools: [claude, cursor, gemini, codex]
---

# Python PPTX Generator

## Overview

Use this skill when the user wants a ready-to-run Python script that creates a PowerPoint presentation with `python-pptx`.
It focuses on turning a topic brief into a complete slide deck script with real slide content, sensible structure, and a working save step.

## When to Use This Skill

- Use when the user wants a Python script that generates a `.pptx` file automatically
- Use when the user needs slide content drafted and encoded directly into `python-pptx`
- Use when the user wants a quick presentation generator for demos, classes, or internal briefings

## How It Works

### Step 1: Collect the Deck Brief

Ask for the topic, audience, tone, and target number of slides if the request does not already include them.
If constraints are missing, pick conservative defaults and state them in the generated script comments.

### Step 2: Plan the Narrative Arc

Outline the deck before writing code:

1. Title slide
2. Agenda or context
3. Core teaching or business points
4. Summary or next steps

Keep the slide count realistic for the requested audience and avoid filler slides.

### Step 3: Generate the Python Script

Write a complete script that:

- imports `Presentation` from `python-pptx`
- creates the deck
- selects appropriate built-in layouts
- writes real titles and bullet points
- saves the file with a clear filename
- prints a success message after saving

### Step 4: Keep the Output Runnable

The final answer should be a Python code block that can run after installing `python-pptx`.
Avoid pseudocode, placeholders, or missing imports.

## Examples

### Example 1: Educational Deck

```text
User: Create a 5-slide presentation on the basics of machine learning for a high school class.
Output: A complete Python script that creates a title slide, overview, core concepts, examples, and recap.
```

### Example 2: Business Briefing

```text
User: Generate a 7-slide deck for sales leadership on Q2 pipeline risks and mitigation options.
Output: A python-pptx script with executive-friendly slide titles, concise bullets, and a final recommendations slide.
```

## Best Practices

- ✅ Use standard `python-pptx` layouts unless the user asks for custom positioning
- ✅ Write audience-appropriate bullet points instead of placeholders
- ✅ Save the output file explicitly in the script, for example `output.pptx`
- ✅ Keep slide titles short and the bullet hierarchy readable
- ❌ Do not return partial snippets that require the user to assemble the rest
- ❌ Do not invent unsupported styling APIs without checking `python-pptx` capabilities

## Security & Safety Notes

- Install `python-pptx` only in an environment you control, for example a local virtual environment
- If the user will run the script on a shared machine, choose a safe output path and avoid overwriting existing presentations without confirmation
- If the request includes proprietary or sensitive presentation content, keep it out of public examples and sample filenames

## Common Pitfalls

- **Problem:** The generated script uses placeholder text instead of real content  
  **Solution:** Draft the narrative first, then turn each slide into specific titles and bullets

- **Problem:** The deck uses too many slides for the requested audience  
  **Solution:** Compress the outline to the most important 4 to 8 slides unless the user explicitly wants a longer deck

- **Problem:** The script forgets to save or print a completion message  
  **Solution:** Always end with `prs.save(...)` and a short success print

## Related Skills

- `@pptx-official` - Use when the task is about inspecting or editing existing PowerPoint files
- `@docx-official` - Use when the requested output should be a document instead of a slide deck

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
