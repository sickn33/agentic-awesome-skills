# The decision log

**What it is for:** a dated log of the product decisions that had real options — what was considered, what was picked, why, and what would reopen it.

**Read it** before reopening a decision, before choosing between options an earlier decision may already have weighed, and when a default choice is reopened: the product section names the reopening, and the entry here holds the reasoning.

**Rules**

- **Newest first, one entry per decision.**
- **An entry is a receipt.** A later reversal is a *new* entry that names the one it replaces; the old entry is never edited into the new answer.
- **A question not yet decided is an open entry** — *Picked: open*, with the options seen so far — and is filled in, not replaced, when the owner picks. The brief stage turns everything the idea leaves open into open entries; the screen-options stage closes them in the proposal artifact.
- **When the proposal artifact or a design pass offers options, the options and the owner's pick land here.**
- **A pick the agent made under the owner's blanket go is provisional** — *Picked: provisional*, by the agent, with the go quoted — and listed for the owner's one read. It becomes a pick once the owner has read it, or a new entry where the owner says otherwise. (`2026-10-30`, an evals product: with an accepted proposal and a go on every suggestion, the useful brief-stage output was provisional entries listed for one read, and the log had no word for them.)
- **Every entry has a reopen trigger.** A decision with no stated condition for revisiting it gets re-argued every time someone new meets it.
- **Every pick says who made it.** *Picked by the owner*, with their own words; *picked by the agent*, with why it was the agent's call to make. A number the agent proposed is labelled as its proposal until the owner confirms it. An unattributed pick reads, a week later, as the owner's. (`2026-10-22` to `2026-10-24`, a monitoring product's log attributed every pick this way, quoting the owner wherever the owner decided.)
- **The log records decisions.** Proposal and plan choices are asked on the proposal's page, which the `flight-deck` owner's page links to rather than repeats; other asks go on the owner's page. Once answered, record the decision here in the same turn and close the ask.
- Product decisions only. A rule about how to build goes in the agent instructions; deferred work goes in the backlog with its revisit trigger.

## Skeleton — copy from here

```markdown
# Product decisions

A dated log of the product decisions that had real options: what was considered, what was picked, why, and what would reopen it. Read it before reopening a decision, before choosing between options an earlier decision already weighed, and when a default choice is reopened — the product section names the reopening, and the entry here holds the reasoning.

Newest first, one entry per decision. An entry is a receipt: a later reversal is a new entry that names the one it replaces. A question not yet decided is an **open** entry — **Picked:** open, with the options seen so far — and is filled in, not replaced, when the owner picks.

## <YYYY-MM-DD> — <the decision, in a few words>

- **Options considered:** …
- **Picked:** … — by <the owner: "their words" | the agent: why it was the agent's call>
- **Why:** …
- **Reopen when:** …
```

## The form of an entry, by kind

Illustrative — the options and the pick are the kind a live Q&A product faced; the date and the last two lines show the form, not a real record:

```markdown
## YYYY-MM-DD — whether a room's questions wait for a moderator

- **Options considered:** always moderated; never moderated; the host's choice when opening a room, ticked by default.
- **Picked:** the host's choice, ticked by default, stored on the room; a later change is atomic with the queue it affects — by the owner: <their words>.
- **Why:** <the reason, in the owner's terms — who it serves and what it costs>.
- **Reopen when:** <an observable condition, not "if needed">.
```
