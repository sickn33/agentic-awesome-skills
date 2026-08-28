# Setup dialogue details

Load this when running a configure / reconfigure session. `SKILL.md` is authoritative and states each
rule once; this page expands the dialogue itself — the interview, how to ask it, how to read a usage
scan, and how to label what you propose.

## Grounding the lane map

The grounding menu is `SKILL.md` step 3. When the user picks the interview:

### The four interview questions

Allocation policy only. Users cannot rank model IDs — that is your job, not theirs.

| # | Ask | What it settles |
| --- | --- | --- |
| 1 | What kind of work do you delegate most? | The main lane — and its **name**. “migrations”, “bug triage”, “release-prep” beat the canned `feature`/`tests`/`ui`/`fast`/`complex` five |
| 2 | Which paid subscriptions should I burn, and which should I spare? | Quota economics. Discovery cannot see plans, limits, or what a run costs — only the user knows |
| 3 | Any CLI you already trust — and for what kind of work? Any that has burned you? | Lived experience outranks your priors about the underlying models. Trust is scoped: an answer qualifies the CLI for work like the work that earned it — follow up on the scope before it qualifies a high-stakes lane. It is never an order to assign work: "trusted + spared" means qualified but normally excluded (the spare rule is in `SKILL.md` step 3) |
| 4 | Default to fast and cheap, or slow and thorough? | Effort / variant dials, and who gets the `complex` lane |

Stop at four.

### How to ask them

The questions are conversation, not a survey — cramming all four into one cold multiple-choice
form loses exactly what they exist to collect.

- **One medium per round.** Every question you ask in a turn goes through the same channel: all
  prose, or all in one form. Never mix the two — submitting a form ends the turn, so any prose
  question asked beside it is simply lost, and the silence that follows is not an answer to it.
- **Question 1 is open-ended.** You want the user's words — they become lane names. If your harness
  forces options, derive them from evidence (repo, usage scan, what the user has said), keep them one
  genre (kinds of work — never a mix of domains and task types, which overlap), and treat a selection
  as a draft lane name, not a category.
- **Questions 2 and 3 are set-valued.** The answer is a mapping across CLIs, so options must span the
  *discovered* CLIs — never an arbitrary subset — with both directions expressible: burn *and* spare,
  trust *and* burned-by. Multi-select if the harness has it; otherwise ask in prose.
- **Question 4 may be a closed choice.** Do not pre-mark an option as recommended — recommendations
  belong in the proposal, after the answers.
- **Lead with question 1.** Its answer usually reshapes or removes the others — fewer than four is
  better.
- **Silence shrinks the map** — the consent rule is in `SKILL.md` step 3; here is the phrasing for
  it. Name the axis in one line — “nobody told me which subscriptions to spare, so I set no effort
  dials; each CLI will use the default you configured” — and add that the answer is welcome anytime.

### Reading a usage scan

`node <skill-dir>/scripts/discover.mjs --usage` adds `usage` to each discovered CLI:
`{ "sessions": <int>, "lastUsed": <ISO-8601 | null> }`, or `null`.

- What to tell the user before running it: it counts session files and reads their timestamps. It
  never opens one, so no conversation content is read.
- `usage: null` also covers a CLI with no local state directory — never report it as zero.
- Large disparities show where activity occurs — not what role the CLI played in it. 1600 codex
  sessions against 20 pi sessions cannot tell you whether the user works inside codex (and would
  orchestrate from it) or sends delegated work to it. Treat a meaningful disparity as a signal to
  **ask**, never to assign: "codex has the most local sessions, but the scan cannot tell whether
  you work inside it or delegate work to it — should I protect its quota, burn it as an
  implementer, or treat it as mixed?" Combine the answer with the burn/spare interview answer when
  the interview also ran; in a scan-only session the role answer is your only quota evidence —
  propose conservatively and name the map quota-blind (the shrink rule in `SKILL.md` step 3).
- Low usage alone is not evidence of task fit. A surplus CLI still needs to be installed,
  authenticated, and reliable to earn a lane.
- Small differences are noise. 97 against 61 decides nothing — fall back to the interview or to your
  opinion, and label it as such.
- `lastUsed` weighs as much as the count. A big count that stopped months ago is a CLI the user moved
  off; a recent date on a small count is one they are adopting.
- Counts are lifetime totals for that machine, not “this month”, and only cover sessions the CLI still
  keeps on disk.

### Labelling the basis

The Basis values, and the rule that every lane carries one, are in `SKILL.md`. What lives here is the
split label and the addendum.

Label the parts separately when they differ. A lane whose implementer came from the usage scan but
whose model you chose is `usage + my opinion (model)`, never a flat `usage data` — session counts
say where the user works, not which model or effort level to buy for them. That split only exists in
quick-defaults mode, or when the user asked you for a dial: the evidence modes gate every dial
(`SKILL.md` rule 7), so there is no opinion-dial left to label.

In the evidence modes, unsolicited opinions about dials travel as an **addendum**, never as a
pre-filled field (quick-defaults proposals may include opinion-labeled dials — the user hired that
opinion). Show the table and the JSON first, then, in a separate paragraph after it: “If you want my
picks for models and effort levels, say the word and I’ll add them.” Then wait. A dial the user
asked for is theirs; the same dial sitting inside the JSON they are about to approve spent their
quota on your say-so.

## Auth and models

- `authenticated: null` (unknown) usually means no auth probe is wired for that CLI — currently `agy`
  and `pi`, which expose no status command. Say that, rather than implying the login failed.
- Prefer not binding a lane to a CLI discover reports as `authenticated: false`.
- For claude specifically, `authenticated: false` can be a Keychain artifact when discovery itself
  ran inside a sandbox: on macOS the live credentials sit in the login Keychain, and a sandbox that
  blocks Keychain access makes the probe fall back to a possibly stale credentials file. Verify with
  `claude auth status` outside the sandbox before treating the CLI as unauthenticated.
- Never invent model ids (rule 6): use `models.values` when `status` is `reported`, or ask the user,
  or omit `model` when the CLI has a safe default (OpenCode does **not** — require a model for
  opencode lanes).
