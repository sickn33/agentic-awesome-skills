---
name: ux-copy
description: Generate UX microcopy (button labels, error messages, empty states, toasts) following a casual-but-polite voice and tone
risk: unknown
source: https://github.com/bitjaru/styleseed/tree/main/engine/.claude/skills/ss-copy
source_repo: bitjaru/styleseed
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/bitjaru/styleseed/blob/main/LICENSE
---

# UX Microcopy Generator
## When to Use

Use this skill when you need generate UX microcopy (button labels, error messages, empty states, toasts) following a casual-but-polite voice and tone.


## When NOT to use

- For long-form content (blog posts, docs, marketing pages) — out of scope
- For full feedback state design (not just text) → use `/ss-feedback`
- For brand voice/tone definition itself — this skill consumes a voice spec, doesn't create it
- For translations to non-English languages — single-language only

Context: **$0**
Description: $ARGUMENTS

> **Read `engine/UX-WRITING.md` first** — it's the rule set this skill applies: buttons
> name the action (not "Submit"), errors help instead of blame, empty states invite,
> money copy stays calm, one term per concept. Korean/CJK projects: see §W8 for the
> clear-calm-human "Toss feel" (존댓말 일관성, 사용자 관점 "내 계좌", 군더더기 빼기).

## Instructions

1. Read the design language reference:
   - `DESIGN-LANGUAGE.md` sections on Microcopy Tone Guide and UX Writing

2. Apply the voice principles:

### Tone Rules
- **Casual but polite**: Friendly, not robotic. Like talking to a helpful friend.
- **Active voice**: "We saved your changes" not "Your changes have been saved"
- **Positive framing**: "Free shipping on orders over $30" not "Orders under $30 have shipping fees"
- **Plain language**: "Send money" not "Initiate transfer"
- **Concise**: Every word must earn its place

### Copy Patterns by Context

#### Button Labels (CTA)
```
Format: [Action verb] + [Object] (optional)
Good: "Place order", "Get started", "Save changes", "Try again"
Bad:  "Submit", "OK", "Click here", "Proceed to next step"
```
- One primary CTA per screen
- Label must clearly describe what happens next
- Max 3 words for primary CTA

#### Empty States
```
Format: [Friendly observation] + [Suggested action]
Good: "No activity yet. Create your first project to get started."
Bad:  "No data found."
```
- Always suggest a next action
- Use a relevant icon (32px, text-text-tertiary)
- Tone: encouraging, not blaming

#### Error Messages
```
Format: [What happened] + [What to do]
Good: "Couldn't load the data. Please try again."
Bad:  "Error 500: Internal Server Error"
```
- Never show technical errors to users
- Blame the system, not the user
- Always provide a recovery action

#### Toast Notifications
```
Format: [Confirmation of what happened]
Good: "Saved!", "Changes applied", "Item deleted · Undo"
Bad:  "Operation completed successfully"
```
- Max 2 lines
- Include "Undo" link for reversible destructive actions
- Info toasts: 3 seconds. Action toasts: 5 seconds.

#### Form Labels & Helpers
```
Label: Noun phrase ("Email address", "Password")
Placeholder: Example or hint ("name@example.com")
Helper: Format guidance ("Must be at least 8 characters")
Error: Specific issue ("This email is already registered")
```

#### Confirmation Dialogs
```
Title: [Question about the action]
Body: [Consequence explanation]
Primary: [Action verb] ("Delete", "Confirm")
Secondary: "Close" (not "Cancel" — avoids confusion)
```

3. Generate copy for the requested context, providing:
   - Primary copy (what to display)
   - Variants (if context varies)
   - Do's and Don'ts for the specific context

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
