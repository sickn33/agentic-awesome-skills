# System prompts

The system prompt is the load-bearing config of an agent. Most "the agent isn't doing what I want" problems trace back to a system prompt that's too long, too vague, or mixing concerns.

This file is opinionated: keep system prompts on **persona and global behavior**, push tool-specific instructions into tool descriptions, and iterate. The system prompt goes in `options.systemMessage` on the agent node.

---

## What the system prompt is for

1. **Persona / role.** Who, scope, tone.
2. **Global output rules.** Format conventions, display protocols (e.g. "show images via `![]()` markdown"), language.
3. **Refusal and safety behavior.** What the agent should NOT do — prefer specific bounds over generic boilerplate.
4. **Universal context.** Current date, user's name/role, company/product context.
5. **Inter-tool flow rules.** "After generating, always show via the display protocol", "confirm before destructive operations" — things that touch multiple tools.
6. **File-handling injection.** When chat includes uploaded files, inject the storage keys so the agent can reference them in tool calls (mechanics → **n8n-binary-and-data**).

What it is NOT for: per-tool usage instructions. Those go in the tool's description.

---

## Always include the current date

A hardcoded date is stale immediately. Inject it at runtime:

```
Current date: {{ $now }}
```

or formatted:

```
The current time is {{ $now.format('DDDD TTTT') }}
```

---

## The modular split

```
System prompt    → Persona, global behavior, format rules, file handling
Tool description → How to use THIS tool, its parameters, when to pick it over others
$fromAI desc.    → What value to put in this specific parameter
```

Why this split:

- **Reuse.** A well-described tool works in any agent; the system prompt doesn't re-teach it.
- **Token efficiency.** Tool details only "load" when the model considers that tool. Per-tool text in the system prompt burns tokens every turn.
- **Maintainability.** Update one tool description, not a paragraph buried in a 5000-token prompt.

### What to move where

| Was in the system prompt | Better location |
|---|---|
| "When using Generate Image, prefer realistic photography over `8k cinematic`" | `Generate Image` tool description |
| "When the user uploads an image and asks for background changes, edit it, don't generate new" | `Edit Image` tool description (and a "do not use" boundary on `Generate Image`) |
| "Use 9:16 aspect ratio for video tools" | `Generate Video` tool description |
| "Respond with markdown image embeds: `![alt](url)`" | **System prompt** (global display rule) |
| "Refuse to generate images of real people without consent" | **System prompt** (global safety) |
| "Today is 2026-04-25" | **System prompt** as `{{ $now }}` (universal context, computed) |

The first three move out; the last three stay in.

---

## Storing the prompt

Inline (typed directly into `systemMessage`) is fine for a first agent or any prompt that lives in one place. A 1500-token inline prompt is a normal shape — don't push first-time builders toward externalization.

The real reason to externalize is **piecing**, not length. Reusable chunks of context — `COMPANY_DESCRIPTION`, `BRAND_VOICE`, `CURRENT_PROMOTION` — each get one canonical home, and every prompt that needs them references that home. Suggest this when you see one of:

- Multiple agents share the same context (same product description, same compliance language).
- Pieces drift on their own cadence (`COMPANY_DESCRIPTION` quarterly, `CURRENT_PROMOTION` weekly).
- A non-engineer owns part of the prompt (marketing owns brand voice, legal owns disclosures).
- You want to A/B test one chunk without touching the rest.

If none apply, stay inline. Mid-prompt restructures cost more than they save with no second consumer to pay them back.

### How piecing works

Load each chunk at workflow start (one node per chunk — a Data Table `Get Row`, an HTTP fetch, a Set node), then reference them inline in `systemMessage` where they should appear:

```
=You are the assistant for {{ $('Company Description').first().json.value }}.

## Market positioning
{{ $('Market Fit').first().json.value }}

## Brand voice
{{ $('Brand Voice').first().json.value }}

Current date: {{ $now }}
User: {{ $('Lookup').first().json.name }}
```

Mix sources: a **Data Table** (default for shared chunks, editable in UI), **n8n Variables** (`$vars.X`, paid plans — short shared values like a brand name), or **computed at run time** (`$now`, current user, available files).

---

## Common patterns

### Include

- **Display protocols** for output needing specific formatting (markdown image syntax, link format, code-block conventions).
- **Conversational style cues** for user-facing agents ("ask one clarifying question before destructive actions").
- **Boundaries** unique to this agent ("only answer questions about domain X, otherwise redirect").
- **Universal context** that changes per execution (date, user identity, files).

### Exclude

- **Per-tool usage docs** — move to tool descriptions.
- **Generic safety language** — built in; reinforcing adds tokens without changing behavior. Reserve for specific risks.
- **"You are a helpful assistant" preamble** — replace with a specific role.
- **Lengthy examples that aren't earning their tokens** — one sharp example beats five mediocre ones.

---

## Iteration loop

Treat the system prompt like code:

1. Run the agent on representative inputs.
2. Note where it does the wrong thing.
3. Decide: system-prompt fix, tool-description fix, or downstream-validation fix?
4. Make the smallest change that addresses it.
5. Re-test on the same inputs PLUS one or two new ones.
6. Watch for regressions on previously-working inputs.

Most "the agent doesn't follow my instructions" issues are conflicts between the system prompt, tool descriptions, and model defaults. Resolve those conflicts first.

---

## Anti-patterns

| Anti-pattern | Symptom | Fix |
|---|---|---|
| "You are a helpful assistant" + no specifics | Generic responses, no identity | Replace with a specific role and scope |
| 5000-token prompt with a section per tool | Token cost, slow responses, hard to edit | Move tool sections to tool descriptions |
| Hardcoded date / "current year" | Stale immediately | Inject `{{ $now }}` at runtime |
| A stack of `DON'T` rules | Model gets defensive, refuses too eagerly | Frame as positive instructions where possible |
| Multiple pasted "examples" | Cargo-cult, rarely earns its tokens | One sharp example, or none |
| Per-execution context hardcoded | Hard to update | Build the prompt from a template + variables |

---

## Cross-references

- Tool descriptions as the other half of the split → **TOOLS.md**
- The system-prompt half of structured output → **STRUCTURED_OUTPUT.md**
- File-handling injection mechanics → **n8n-binary-and-data**
