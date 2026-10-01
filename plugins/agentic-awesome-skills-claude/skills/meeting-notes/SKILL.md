---
name: meeting-notes
description: "Turns raw meeting notes into structured minutes: conclusion first, then decisions / action items / open questions; every action item must have an owner and a deadline. Use when the user pastes meeting transcripts or rough notes and asks for minutes or a summary."
category: productivity
risk: safe
source: https://github.com/alapha888/agent-skills-en
source_repo: alapha888/agent-skills-en
source_type: community
date_added: "2026-10-01"
author: alapha888
tags: [meetings, minutes, action-items]
tools: [claude, cursor, gemini, codex]
license: MIT
license_source: https://github.com/alapha888/agent-skills-en/blob/main/LICENSE
---

# Meeting Notes

Turn messy meeting notes into minutes that let someone who missed the meeting catch up in 3 minutes — and let attendees know exactly what they owe.

## When to Use

- Use when the user pastes meeting transcripts or rough notes and asks for minutes or a summary.
- Use when decisions and action items need owners and deadlines assigned.

## Workflow

1. **Read the raw notes**: read the transcript or jotted notes the user pasted. Find "what was finally decided" first, then look back for the reasoning. Minutes record conclusions and points of disagreement, not the full discussion.
2. **Sort into three buckets**:
   - **Decisions**: one per line, phrased as "Decided to do X", never "Discussed X".
   - **Action items**: each must have an owner + a deadline. If the notes name no owner, mark `[unassigned]`; if no deadline, mark `[TBD]` — never invent them.
   - **Open questions**: issues left undecided that need a follow-up; state "what is blocking, and who owns the next step."
3. **Conclusion first**: open the minutes with ≤3 lines on "what this meeting decided", then expand the three buckets.
4. **Self-check before output**: does every action item have an owner? A deadline? Are decisions affirmative statements? Do open questions have a next step? Flag any "no" — don't gloss over it.

## Rules

- Do not fabricate. Names, dates, and numbers not in the notes must not appear; mark missing ones `[to confirm]`.
- Do not editorialize. No "Maria's proposal seemed shaky" — only "Maria's proposal was rejected because…" (if a reason was stated).
- Length control: the minutes body must be ≤1/3 of the raw notes. Longer means you didn't distill — redo it.

## Minimal example

Input (raw notes excerpt):

```text
...James said the login page is too slow, Maria suggested adding a cache layer, everyone agreed it's worth a pilot; draft the proposal by next Wednesday; pricing strategy still open, invite Finance next time...
```

Output:

```markdown
## Meeting minutes (example)

**Bottom line**: Pilot a cache layer to speed up the login page; pricing strategy undecided, pending a session with Finance.

### Decisions
- Adopt a cache layer for login-page performance (pilot first, not a full rollout).

### Action items
- [ ] Maria: draft the caching proposal, due next Wednesday `[date to confirm]`
- [ ] [unassigned]: schedule pricing discussion with Finance `[time TBD]`

### Open questions
- Pricing strategy: no decision reached; the action-item owner will book a dedicated session with Finance.
```

## Limitations

- Works only from notes the user supplies. It cannot join the meeting, recover audio, or resolve a name the notes never recorded.
- Missing owners and deadlines are marked `[unassigned]` / `[TBD]`, never invented; the minutes are therefore only as complete as the raw notes.
- It records decisions, not consensus. If the notes only say something was "discussed", the skill reports that as an open question instead of a decision.
- Summaries bias toward brevity (≤1/3 of the raw notes), so fine-grained discussion detail is intentionally dropped.

## Anti-patterns

- ❌ Chronological minutes: replaying two hours of discussion in order is the same as not organizing it.
- ❌ Ownerless action items: "everyone please follow up" — an action item without an owner and a deadline is not an action item.
- ❌ Invented details: guessing dates or names the notes never mentioned turns minutes into fiction.
- ❌ Decisions written as discussion: "Discussed the feasibility of a caching layer" — did the meeting adopt it or not? Minutes need affirmative statements.
