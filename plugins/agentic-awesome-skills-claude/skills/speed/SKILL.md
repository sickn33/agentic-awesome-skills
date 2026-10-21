---
name: speed
description: Launch RSVP speed reader for text
trigger: command
risk: critical
source: community
date_added: "2026-03-06"
tools: Write, Bash, Read
---

# Speed Reader

Launch the RSVP speed reader to display text one word at a time with Spritz-style ORP (Optimal Recognition Point) highlighting.

## When to Use
- You want to launch the RSVP speed reader for text in the current session.
- The task is to turn either provided text or the assistant's prior response into a word-by-word reading view.
- You need a quick reading aid rather than a document transformation or summary.

## Instructions

1. **Get the text:**
   - If `$ARGUMENTS` is provided, use that text
   - Otherwise, extract the main content from your **previous response** in this conversation

2. **Prepare the content:**
   - Preserve meaningful prose; do not discard user-requested code or numbers silently.
   - Use a reviewed, actually installed reader template. The historical
     `~/.claude/skills/speed/data/reader.html` path is not bundled by this AAS skill.
   - Keep original assets immutable: write a separate private preview copy.

3. **Serialize safely:**
   - Serialize text as JSON rather than ad-hoc quote replacement. When embedding
     JSON inside a script element, escape `<` as `\u003c` (and any required Unicode
     separators) so supplied `</script>` text cannot become executable HTML.
   - Do not put source text into shell arguments or execute its contents.
   - If the template is absent, report the missing runtime; do not pretend a reader opened.

4. **Launch and verify:**
   - Open the preview using the current host's supported local-file action, not a
     macOS-only command on every platform. Inspect actual displayed text and controls.
   - Confirm opening only after successful host evidence; adjust speed to the user.

## Arguments
$ARGUMENTS

## Example

**User request:**

> Launch the RSVP speed reader for text in the current session.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
