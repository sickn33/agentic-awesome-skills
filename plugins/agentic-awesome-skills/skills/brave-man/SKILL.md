---
name: brave-man
description: "Runs a structured clarifying interview for new project requests before building. Instead of writing code, it outputs a fully specified prompt.md for a fresh agent session to execute, preventing expensive mistakes."
risk: critical
source: community
date_added: "2026-06-16"
---

# Brave Man

## Overview

Most people describing a project ("vibe coders" included) only give a brief or partial picture of what they want. They can't be expected to specify everything up front — humans don't think in complete specs, and even when they try, they forget the small details that turn into real problems once the project has grown. If the agent starts building from a thin description, it fills the gaps with silent guesses, and by the time those guesses turn out wrong, they're expensive to undo.

Brave Man flips the order: clarify exhaustively first, build later. The agent's job here is NOT to write code, scaffold files, or produce an implementation plan. Its only job is to run a structured interview until the project is fully understood, then write that understanding down as a single, clean, self-contained `prompt.md` file that a fresh agent session can execute later.

## When to Use This Skill

- Use when a user describes wanting to build a website, app, software, tool, or any kind of project.
- Use when the user request includes phrases like "build me a website", "I want an app for X", or "make a tool that does Y".
- Use BEFORE writing any code or implementation plan for a new build request.

## Step-by-Step Guide

1. **Triage** — a couple of quick questions to size up the project so question depth matches project complexity.
2. **Phased interview** — work through the relevant phases below, one at a time, asking batched questions per phase.
3. **Track completion** — maintain a visible checklist; don't move to synthesis until every relevant phase is closed (answered or explicitly defaulted).
4. **Synthesize** — write the final `prompt.md`. Do not generate an implementation plan artifact, scaffold a repo, or write any application code in this skill.
5. **Hand off** — tell the user to start a new chat, tag `prompt.md`, and ask the agent to execute it.

Never skip straight to building because the request "sounded simple." Simple requests still go through triage — triage is what decides how short the interview gets, not whether it happens.

## Phase 0: Triage

Ask 2-3 quick questions before anything else, to calibrate depth:

- Is this just for you, or will other people use/rely on it?
- Roughly how big is this in your head — a single page/script, a small app with a few features, or something with many moving parts (accounts, payments, multiple user roles, etc.)?
- Do you already have any strong preferences (language, framework, hosting, existing codebase) or is everything open?

Use the answers to decide which phases below need full depth, which need only one or two quick questions, and which can be skipped entirely with a stated default (e.g., a single static page skips Integrations & Auth entirely rather than asking about it).

## The phases

Work through these one phase at a time. Within a phase, ask questions in one batched round (3-5 questions), not one at a time. Skip or shrink phases that triage marked irrelevant — say so explicitly ("skipping auth since this has no accounts") rather than silently dropping them.

### Phase 1 — Purpose & users
- Who is this for, and what's the one thing it absolutely must let them do?
- What does success look like — what would make you say "yes, this is exactly what I wanted"?
- Is there an existing app/site/tool you're modeling this after, or anything you specifically want to avoid?

### Phase 2 — Core features & flows
- Walk me through what a user does step by step, from opening it to getting value out of it.
- Of everything you've mentioned, what's must-have for a first version versus nice-to-have later?
- Are there any features you're assuming are "obvious" that you haven't said out loud yet?

### Phase 3 — Data & content model
- What are the main "things" this app manages (e.g. posts, orders, users, files) and how do they relate to each other?
- Does data need to persist permanently, or is some of it temporary/session-only?
- Will the same data need to be seen differently by different users (e.g. private vs shared), or is it all visible to everyone the same way?

### Phase 4 — Tech stack & environment
- Any required language/framework, or should the agent pick what fits best?
- Where will this run — a specific hosting platform, local-only, mobile, desktop, browser?
- Does this need to fit into an existing codebase/repo, or is it starting fresh?

### Phase 5 — Integrations & auth
*(skip entirely if triage shows no accounts/external services needed — state that explicitly instead of asking)*
- Does this need user accounts/login at all? If so, simple email+password, or sign-in via Google/Apple/etc.?
- Does it need to talk to any outside service (payments, email sending, maps, AI APIs, etc.)?
- Are there multiple types of users with different permissions (e.g. admin vs regular user)?

### Phase 6 — Non-functional requirements
- Roughly how many people might use this at once — a handful, hundreds, way more?
- Any sensitive data involved (personal info, payments, health data) that needs extra care?
- Any hard constraints — must work offline, must load instantly, must work on old phones, etc.?

### Phase 7 — Edge cases & error states
- What should happen when something goes wrong — bad input, lost connection, empty states (e.g. no data yet)?
- Is there any action a user could take that would be risky or hard to undo (deleting something, sending something, paying for something)? How careful should the app be about confirming those?

### Phase 8 — Definition of done
- If you handed this to someone to test, what would they check to confirm it's working correctly?
- What's explicitly out of scope for the first version, so it isn't accidentally built or left half-done?

## Best Practices

- ✅ **Do:** Batch, don't drip. One themed round per phase, not an endless single-question ping-pong.
- ✅ **Do:** Plain language over jargon. Phrase questions around real-world consequences unless the user has already shown technical fluency.
- ✅ **Do:** Offer options where possible when a question has a small number of sensible answers.
- ❌ **Don't:** Ask redundant questions that were already answered earlier or directly inferable.
- ✅ **Do:** Handle "I don't know" gracefully by proposing a sensible, named default and stating it plainly as an assumption.
- ❌ **Don't:** Jump ahead or combine phases unless the user volunteers the info naturally.
- ✅ **Do:** Honor "just use your judgment" but still require at least a default-and-confirm pass on Phase 3 (data) and Phase 5 (auth/integrations).

## Completion checklist

Keep a running, visible status of each relevant phase using this format, and show it to the user as phases close:

```
[x] Purpose & users — confirmed
[x] Core features & flows — confirmed
[~] Data & content model — defaulted (assumed simple per-user storage, no sharing)
[ ] Tech stack & environment — open
[-] Integrations & auth — skipped (no accounts needed)
...
```

Do not move to synthesis while any relevant phase is still `[ ]` open. `[x]` confirmed and `[~]` defaulted-and-accepted both count as closed.

## Synthesis: writing prompt.md

Once every relevant phase is closed, stop asking questions. Do not produce an implementation plan, do not scaffold a project, do not write application code. Instead, write a single file named `prompt.md` in the project root containing the full, distilled specification, addressed directly to whichever agent will read it next. Structure it as:

```markdown
# Project Brief: <name>

You are building the following project. Treat this file as the complete
specification — everything needed to build it correctly is below.
Do not re-ask the questions that produced this brief unless something
here is genuinely ambiguous or missing.

## Overview
<one paragraph: what it is, who it's for, what success looks like>

## Core Features (prioritized)
<must-have list, then nice-to-have list>

## User Flows
<step-by-step walkthroughs from Phase 2>

## Data Model
<entities, relationships, persistence rules from Phase 3>

## Tech Stack & Environment
<language/framework, hosting/platform, repo constraints from Phase 4>

## Integrations & Auth
<or "None — no accounts or external services required">

## Non-Functional Requirements
<scale, sensitive data handling, hard constraints from Phase 6>

## Edge Cases & Error Handling
<from Phase 7>

## Assumptions & Defaults Used
<every default that was proposed and accepted during the interview,
listed plainly so the user can spot anything they want to override later>

## Definition of Done
<acceptance criteria and explicit out-of-scope items from Phase 8>

## Suggested Build Order
<a short, sensible milestone sequence — not a full implementation plan>
```

Keep it tight and complete rather than padded — every section should contain real decisions, not filler. The "Assumptions & Defaults Used" section matters most: it's the paper trail for every gap the user couldn't have specified up front.

## Handoff

After writing `prompt.md`, tell the user, plainly:

> Your project spec is saved as `prompt.md`. For the best results, start a **new chat**, tag this file, and tell the agent to execute it. Starting fresh keeps the build conversation free of the back-and-forth that produced the spec — the agent only needs the distilled brief, not the full interview, which keeps things faster and avoids burning context on a conversation it doesn't need anymore.

Do not start implementing in the current session even if the user asks immediately after — point them to the new-chat handoff, since that's the whole point of separating interview from execution.

## Examples

### Example 1: User says "Build me a todo app"
```markdown
1. **Triage:** Is this just for you? How big is it? Any preferred stack?
2. **Phase 1 (Purpose):** What is the one thing it absolutely must let you do?
3. **Synthesis:** Outputs `prompt.md` with React/Firebase stack based on interview.
```

## Troubleshooting

### Problem: User is frustrated by too many questions
**Symptoms:** User replies with "just build it" or "I don't care".
**Solution:** Stop asking questions, propose defaults for the remaining critical phases (Data, Auth), and synthesize the `prompt.md`.

## Related Skills

- `@brainstorming` - Use when exploring abstract ideas rather than gathering a build specification.

## Limitations

- **No Code Generation:** This skill intentionally does not write any application code or scaffold repositories.
- **Requires New Session:** The generated `prompt.md` must be executed in a fresh agent session to ensure clean context.
- **Relies on User Input:** The quality of the spec depends heavily on the user's willingness to answer the interview questions.
