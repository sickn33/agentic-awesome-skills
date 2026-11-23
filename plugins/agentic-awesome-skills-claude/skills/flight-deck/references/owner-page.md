# The owner's page: how to run it

`SKILL.md` § The owner's page says what the page is for and its rules. This file is the mechanics: the data, publishing, the loop, and the file to use in a session without the Artifact tool.

## The data

The page (`assets/owner-page.html`) renders status documents, owner items and saved answers from its database and nothing else.

**`status/current`**: one document, written by the agent, a projection of `STATUS.md`.

```json
{
  "phase": "Phase 3 of 5: billing",
  "percent": 55,
  "milestones": [
    {"name": "Prototype", "state": "done"},
    {"name": "Sign-in and data", "state": "done"},
    {"name": "Billing", "state": "now"},
    {"name": "First release", "state": "next"},
    {"name": "Go-live", "state": "next"}
  ],
  "done": ["Sign-in with Google", "The pricing page"],
  "now": ["The checkout stage, in review"],
  "next": ["The first release to production, once you give the go", "Custom domains"],
  "updated": "25 Oct, 14:10"
}
```

Only `phase` is needed. `percent` draws a bar; `milestones` are the plan's own phases, not tasks; the page shows at most three lines each of `done` (just built), `now` (in progress) and `next` (what's next), and adds "N things wait on you" itself. `done` is what landed since the owner last looked, in their terms, not a changelog: replace its lines, never append. Write the document when a milestone changes or a line stops being true, not on every step. It needs no republish. (Field names as a monitoring product's board ran them, 2026-10-25.)

**Several areas: `status/<area>`**, one document per area. Use a short id such as `api`, `mobile-app` or `pricing-study`. Each has the fields above, plus:

| Field | Holds |
|---|---|
| `name` | the tab and Overview name; falls back to the area id |
| `where` | repository or folder, and branch if it matters, as the area's RESUME block in `STATUS.md` gives it; shown as written |
| `kind` | `code` or `other` (work without code: its `done` lines show as "Just done" rather than "Just built"); anything else shows as code |
| `touched` | when a session last worked on it (the newest session in its RESUME block), in ISO 8601; shown in the viewer's locale, or as written if it does not parse as a date |
| `order` | tab and Overview order, then name |
| `board` | an array of key work items, described below |

For example, `status/pricing-study`:

```json
{
  "name": "Pricing study",
  "where": "Working folder: pricing study",
  "kind": "other",
  "touched": "2026-11-06T14:10:00Z",
  "order": 3,
  "phase": "Phase 2 of 3: testing assumptions",
  "percent": 50,
  "milestones": [
    {"name": "Scope", "state": "done"},
    {"name": "Test assumptions", "state": "now"},
    {"name": "Recommendation", "state": "next"}
  ],
  "done": ["Compared the current plans"],
  "now": ["Testing willingness to pay"],
  "next": ["Recommend a plan structure"],
  "board": [
    {"title": "Draft the recommendation", "column": "next"},
    {"title": "Test price assumptions", "column": "now"},
    {"title": "Compare contract terms", "column": "blocked", "note": "Waiting on the owner for the current agreement"},
    {"title": "Compare current plans", "column": "done", "note": "Compared all four plans against the same criteria"},
    {"title": "Define the study", "column": "done", "note": "Scope and success measures recorded"}
  ]
}
```

**The mode comes from the `status` collection**, read through one subscription. With only `current` (or no documents), the page keeps its single-project layout and items need no `area`. Any other document turns on Overview and an area tab per document. A `current` beside other documents is one more area, with id `current`; nothing written there is hidden. To move a project to areas, write `status/<area>` from `status/current`, set `area` on its items, and delete `status/current`, in one batch.

Overview lists each area's name, location, kind, phase, at most three lines each of done/now/next, waiting count and last touch; milestones and boards stay on the area's tab. Below it are full answerable cards for every item across areas, tagged with their area and sorted gate, now, decide, later, then `order`; an answered item stays there, showing its saved answer, until you delete it, as on its tab. Each area tab shows its status, board and items in the original groups. An item without `area`, or with an unknown area, stays on Overview tagged "No area". A gate waits until the go is in chat; any other item waits until answered. That count shows on each tab, each Overview row and the Overview's total. The page remembers each viewer's tab in their browser, opens on Overview otherwise, and falls back to it when that area is gone.

**`board`** is an array on a status document: `[{"title": "…", "column": "next", "note": "…"}]`. Keep 5 to 10 key work items, not every task and not the owner's asks. `title` is required. `column` is `next`, `now`, `blocked` or `done`; an unknown value shows under Next. The page shows at most 10 cards, in the order written within each column. `note` is one line: why blocked and on whom, or the evidence it is done. A card blocked on the owner says so in its note, and the ask itself is an item in `items`, where they can answer it. Rewrite the array in place, like done/now/next; never append a history. A `status/current` with a board shows it too; without one, its layout stays the same.

**`items/<id>`**: one per thing that needs the owner. The agent writes it.

| Field | Holds |
|---|---|
| `area` | the status document's area id in a page with several areas; omitted for a single project |
| `kind` | `decision`, `task` (something only they can do) or `gate` (a go/no-go on a one-way door) |
| `group` | `now`, `decide`, `gate` or `later` (needed before a later milestone). Anything else shows under `later`. Work that will reach the owner but needs nothing yet is not an item; it is a `next` line in the status |
| `title` | the ask, in a few words |
| `what` | what you need from them, in their terms. Paragraphs split on a blank line; `[label](https://…)` becomes a link |
| `steps` | for a task, exact steps: what to open, what to click, which file or setting a value goes into |
| `link` | where: the page or dashboard it happens in |
| `why` | why only they can do or decide it |
| `rec` | your recommendation, in one or two sentences |
| `options` | for a decision: `[{"id", "label", "note", "recommended": true}]`. The recommended one is preselected |
| `after` | what you do once they answer |
| `order`, `updated` | sort order within the group; when it was added ("25 Oct") |

**`answers/<id>`**: written by the page when the owner presses Save. It has the same id as its item and holds `{at, note, choice}` for a decision or `{at, note, done}` for a task. Until you delete it, the item shows the saved answer in its form with "Saved <time>". There is no other state: no "read", no "replied".

**An answer outlives its item unless you delete both.** Deleting an item doesn't delete the answer saved under the same id, and orphaned answers pile up unseen (`2026-10-25`: 27 were found under items removed days earlier). Delete them in the same write.

## Publishing (where the Artifact tool exists)

1. Copy `assets/owner-page.html`. Change the `<title>`, and the `<h1>` if you like, to the project's name ("Acme: what I need from you"). Change nothing else.
2. Publish it with `capabilities: {db: {}}`. By default, everyone signed in who can open the page reads every document, people with Contributor access and up write and delete, and Viewers and Commenters never write (Claude's artifact runtime docs, read `2026-10-25`). So share the page only with people who may read every item on it.
3. Write `status/current` and the first items with the artifact's database tool in one batch, after publishing. For several areas, write `status/<area>` for each and put its id in each item's `area`; with nothing for the owner yet, write the status documents alone. Never put them in the HTML.
4. Send the owner the link. On first use, ask them to save one answer, then quote it back, so they know Save works.
5. Keep the URL in `STATUS.md`. Put it in every chat message that mentions the page.

Reuse the same artifact for the whole project, or for every area on the page, and republish to that URL when the page changes. The database survives a republish. With areas, each area's `STATUS.md` keeps the URL and its area id.

## The loop

**Check for answers** at the fixed points in `SKILL.md`. Read the `answers` collection, or query `at` greater than the time of your last check, which you keep in `STATUS.md`.

**On a page with several areas, consume only your own area's answers**: those to items whose `area` is the one your `STATUS.md` names (a session working on several areas, each of theirs). Leave the others on the page for their own sessions. An item with no `area`, or one naming no area, is fixed by the session that wrote it: set its `area`.

**For each answer, in this order:**

1. **Record it.** Write the decision in the product's decision log (who chose, what, the date, the note's substance). Put whatever work it creates into `STATUS.md`'s QUEUED, and the reasoning into `LOG.md`, with the answer's id and `at`. An answer whose id and `at` `LOG.md` already holds (recorded by an earlier check whose delete didn't land) is not recorded or queued again: go to step 2.
2. **Delete the item and its answer together**, in one batch write, each pinned to the `version` your read returned (the database tool's `if_version`). If the owner saved again after your read, the batch writes nothing, and you read again. **For a gate, delete only the answer** (below).
3. **Then act**, from your records, not from the page. On a gate, only once the go is in chat.
4. **Confirm in chat** in one line: what you recorded and what happens next. The page never carries a reply.

**A run with no chat** (a scheduled pass, below) does steps 1 and 2 as written and stops there: step 1 has queued the work, and it does none of it. Its confirmation goes into `STATUS.md`, for the next session to repeat in chat. Nobody can type a go there, so it never passes a gate, and it never builds or publishes a page.

If the answer raises a new question, delete the answered item and add a new one. Don't edit the old one into a conversation.

**A note on a gate doesn't close it; only a go typed in chat does.** Record the note and answer it in chat, delete only the answer (pinned the same way), and leave the gate on the page. A condition they set goes into the gate's `what`, so the go is asked against it.

**An answer in chat closes the item too**, and a gate only when it is the go. Record it the same way and delete the item. An item left open after the owner answered it elsewhere is the most common stale line (observed 2026-10-24).

**When an item stops needing them**, delete it, and its answer if there is one: you found a way to do it yourself, it was overtaken, or they did it without saying.

## A scheduled check without a session

Where the harness has a scheduler (cron, the operating system's task scheduler, or the harness's own), schedule a pass in the area's folder for the hours no session is running. Keep the page URL, the area id, the schedule and the pass's prompt and output files in `STATUS.md`, so a fresh session finds the check and can stop or replace it. One pass at a time, and none while a session is working the same area.

**The pass is a session with no chat.** It loads this skill and runs § The loop for its own area, as that section says for a run with no chat. Its prompt goes in a file passed on stdin, never as an argument, where a shell would expand its quotes and backticks:

```text
Apply the flight-deck skill. Read STATUS.md first. Then check the owner's page at <page URL>
for area <area>, following its references/owner-page.md, section The loop, for a run with no
chat. Do none of the work an answer creates. Never call the Artifact tool: no page is built,
published or republished from here.
```

**In Claude Code** (observed `2026-11-06`, Claude Code 2.1.319): a headless `claude -p` run has the Artifact tool, and ArtifactData and ArtifactComments as deferred tools it loads through ToolSearch. It read a page's answers with `--allowedTools ArtifactData`, but every database write, a delete included, was denied in the default and `dontAsk` permission modes, allowed or not: a write asks for an approval nobody can give in a headless run. In `auto` mode the write ran, and with `Skill` in `--tools` the run listed the installed skills, this one among them. The run that worked end to end, its prompt read from stdin:

```bash
claude -p --permission-mode auto --permission-prompts none --strict-mcp-config --tools "Skill,ToolSearch,Artifact,ArtifactData,Read,Edit" --max-turns 30 --output-format json < <the prompt file> > <the output file STATUS.md names>
```

`--tools` is the run's whole tool set (ArtifactData was missing unless Artifact was listed too, so the prompt forbids it); `--strict-mcp-config` leaves out the account's other connectors; `--permission-prompts none` denies at once whatever would wait on a prompt. Where auto mode isn't available (a model or an organization without it), the run starts in a mode that denies the writes, file edits included, so the pass consumes nothing: don't schedule it there. Judge a pass by its output file, not its exit code: `is_error` true, or any entry in `permission_denials`, means it didn't finish, and the next session checks the page itself. A run stopped by `--max-turns` exits non-zero; don't retry it on failure, since the next scheduled pass continues. The `claude-agents` skill has more on what a `-p` run loads and why its permission mode is always passed.

## Without the Artifact tool: the same page as a file

In a session where the Artifact tool does not exist (Codex, Cursor, a plain repository), keep `OWNER.md` at the root of the working area, shaped the same way:

```markdown
# What I need from you
Phase 3 of 5: billing · Running: checkout, in review · 2 things wait on you

## Your decisions
### Plan names for the pricing page
What I need: … Why only you: … I recommend: A.
Options: A. Starter / Pro (recommended) · B. Free / Builder
Your answer:
```

For several areas, keep one section per area with its name, location, kind, phase, done/now/next, waiting count, last touch, board and asks. The owner writes under "Your answer:" and saves; you read it at the same fixed points, and the same consume rule applies, to your own area's section only: record it, delete the ask's section, act, confirm in chat (a run with no chat records and deletes only). Answered asks never stay in the file, except a gate's: it stays until the go is typed in chat, and you clear only its answer.
