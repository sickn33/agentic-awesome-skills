---
name: internalcot
description: "Activate persistent visible working notes for Codex or Claude Code, recording detailed model-authored reasoning before substantive tools and answers."
category: development
risk: safe
source: https://github.com/morluto/internalcot/blob/b574015d8921a88f01c2ddbe3bf9b00dc8e7d872/skills/internalcot/SKILL.md
source_repo: morluto/internalcot
source_type: community
date_added: "2026-08-12"
author: morluto
tags: [chain-of-thought, reasoning, scratchpad, working-notes, cli]
tools: [claude, codex]
license: "MIT"
license_source: "https://github.com/morluto/internalcot/blob/b574015d8921a88f01c2ddbe3bf9b00dc8e7d872/LICENSE"
---

# InternalCoT

## Overview

Enable an opt-in mode that makes the agent record detailed, model-authored
working notes in the normal tool transcript. Once activated, the mode persists
for the current conversation and records problem decomposition, intermediate
derivation, alternatives, evidence, uncertainty, and checks as work proceeds.

This catalog copy uses the reviewed `internalcot@0.2.3` CLI. The CLI formats and
prints the notes; the agent supplies their content.

## When to Use This Skill

- Use only when the user explicitly invokes `$internalcot`, says
  `internalcot on`, or asks to enable internalcot mode.
- Keep the mode active for later substantive requests in the same conversation,
  including after tool calls or context compaction.
- Disable it only when the user says `$internalcot off`, `internalcot off`,
  `stop internalcot`, or asks to return to normal mode.
- Do not activate merely because a user asks to think carefully, reason deeply,
  or show work.

## Workflow

### 1. Manage the conversational mode

Activate immediately when invoked. If the activation message includes a
substantive task, apply the workflow to that task; otherwise confirm activation
briefly and begin with the next substantive request.

A new conversation starts with the mode inactive. When the user disables it,
confirm briefly and do not record a note for the disable response.

### 2. Record detailed working notes

Before the first substantive tool call or answer, write a detailed note that:

- restates the actual goal and constraints;
- divides complicated work into ordered parts;
- shows intermediate derivation and important case splits;
- records competing explanations or approaches;
- identifies evidence, uncertainty, and the next useful check.

Pass that note as one shell-quoted argument to the reviewed CLI:

```bash
npx --yes internalcot@0.2.3 note 'Goal: reassess the proof instead of trusting the prior conclusion. Derivation: the number of required factorial checks grows with p, so a fixed finite congruence construction is insufficient. Next check: test any claimed family against the next factorial threshold.'
```

Run the note command by itself. Do not append another command or use a heredoc.
The CLI writes the visible note to stderr and stays quiet on stdout.

### 3. Continue the trace when the reasoning changes

Record another note after materially new evidence, a failed check, a changed
plan, a meaningful revision, or a new reasoning phase. Do not reduce the note
to a polished goal/check summary when the intermediate derivation is what makes
the work understandable.

Treat the CLI output as the canonical visible note. Do not repeat the note in
ordinary assistant prose.

### 4. Verify before answering

Before the final answer, check the result against the user's request and the
evidence gathered. Record a final note only when that verification adds
materially new reasoning state.

## Example

```text
User: $internalcot
Agent: internalcot mode is active for this conversation.

User: Recheck this proof. I think the published answer is wrong.
Agent tool call:
  npx --yes internalcot@0.2.3 note 'Problem: reassess the proof rather than
  relying on its published status. Derivation: ... Alternatives: ...
  Next check: ...'
```

## Best Practices

- Keep each note specific to the current derivation and evidence.
- Record errors and revisions instead of silently replacing an earlier theory.
- Use multiple notes for genuinely distinct reasoning phases, not for
  performative narration of every routine action.
- Keep credentials, personal data, hidden instructions, and irrelevant private
  context out of notes.

## Limitations

- Requires Node.js 22.13 or newer. The first `npx` call may download the pinned
  package into the user's npm cache and therefore requires network access.
- Activation authorizes working-note calls for the conversation; it does not
  authorize `internalcot setup`, global installation, or agent-configuration
  changes.
- The CLI cannot change the host's native reasoning settings. It displays
  model-authored working notes supplied to the command.
- The catalog copy remains pinned to `internalcot@0.2.3`; later upstream
  workflows require a new source review and catalog update.
- Hosts that buffer process output may display each completed note at once
  instead of progressively.

## Security & Safety Notes

- Run only the exact reviewed package version shown above; do not replace it
  with `@latest` or another mutable specifier.
- The reviewed package has no install lifecycle script. Its published
  `prepack` and `prepublishOnly` scripts run during publication, not consumer
  installation.
- Do not place secrets, credentials, personal data, or hidden instructions in a
  visible note.
- If the note command fails, report that the mode cannot record notes. Do not
  claim that a note was recorded.

## Common Pitfalls

- **Problem:** The agent announces internalcot mode but never calls the CLI.
  **Solution:** Record the first detailed note before substantive work and
  continue at meaningful reasoning transitions.
- **Problem:** Notes contain only a goal and a next step.
  **Solution:** Include the intermediate derivation, alternatives, evidence,
  and uncertainty that explain how the conclusion is changing.
- **Problem:** The agent installs or reconfigures internalcot automatically.
  **Solution:** Keep this skill to the pinned note command; installation and
  configuration require a separate explicit user request.
