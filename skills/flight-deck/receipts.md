# flight-deck: receipts

Each heading is a rule from `SKILL.md`, with the case that taught it.

## Read each new timestamp from the clock when you write it.

- `2026-11-18`, The coordinator of a live Q&A product twice corrected estimated log times that ran ahead of the machine clock. A status report built from the log would have repeated them.

## Give the owner a short status and only asks that need them.

- `2026-10-21` to `25`: The owner's-page rules come from a monitoring product built in this period, where the owner ran the whole build from such a page.

## Put RESUME first, with the work's location and how to resume.

- `2026-11-06`: with several areas in flight, an owner asked for this because finding where a piece of work stood meant hunting through old sessions.

## Before building it, open `references/owner-page.md` (the data, publishing, the loop) and `assets/owner-page.html` (the page you copy).

- `2026-10-27`: of two sessions that ran this skill the same day, one read only this file, called the page overkill for a test, and built it only when the owner asked for it as an artifact.

## A progress report starts here.

- `2026-11-01`, an evals product: asked for a deck of the progress and open decisions, an agent built slides from nothing, and the owner corrected it: the flight deck is the core way to present where the work stands.

## Ask only for a decision, a go or an owner-only task.

- `2026-10-24`: one item asked the owner to create database logins, which the agent then made itself. The owner's reply: "I'm not sure what you need… should I put it where exactly?"

## Each item carries everything needed to answer it.

- `2026-11-03`: "the curl loop from my message of 1 Nov" was gone two days and a compaction later.

## Check every step against the product before it goes on the page.

- `Undated`: A checklist sent the owner to open an incident with a button the product doesn't have.
- `2026-11-20`: in one build of an agent product, four wrong premises reached decisions the owner made: CLI facts credited to the server the product installs (a stage was rescoped and another added), a misread of a competitor's behaviour, a usage source its provider refused with a 403, and a misdescribed credential. The coordinator had checked its steps, not its facts. A first version told the agent to check each fact live or at its source. Two review rounds running found the checking itself did harm: a key read into the transcript, a token on a command line, a ping to a production heartbeat that hid a missed run. So the facts are labelled instead, and the owner decides whether an assumed one needs a check.

## A go typed on the page doesn't clear your harness's permission check for a one-way door.

- `2026-10-24`, a production release.

## Delete the item and answer once you have read the answer.

- `2026-10-24`, the owner: "I don't need answers when something is done." Replies left on finished items had left him not knowing what to do with them.

## Check at fixed points, because nothing notifies you when they save.

- `Undated`: Answers the owner never mentioned were caught only this way.

## An idle session with items waiting schedules its own check.

- `2026-11-03`: six answers saved at 17:35 were read nine hours later, when the owner asked whether the page was up to date.

## Make Save trustworthy.

- `2026-10-22`: The owner asked "Can you really read my answers?"
- `2026-10-23`: "What was the url of the artifact".

## Keep files needed after a restart outside scratchpads and system temp.

- `2026-11-11`, an evals product's owner asked to verify key flows when built without repeating costly screenshot reviews. The session kept one-off scripts in its scratchpad. A `2026-11-14` restart deleted them, every evidence file the status cited, and a kept development token. The durable response is a committed flow test rerun by the gate, with status and evidence stored where a restart cannot delete them.

## Record each phase's hours, review rounds, findings and added lines.

- `2026-11-20`, an agent product (an editor extension, its relay and a phone client): none of these numbers existed until a review of build speed computed them from git, the build logs and the session transcripts. One stage's round count was first questioned at its ninth round.

## Start each phase of a long build in a fresh session.

- `2026-11-20`, the same product: re-reading context was 55%, 71% and 85% of three sessions' usage. A builder's turn cost 39.5k input-token equivalents on a day at 347k tokens of context and 23.1k at 178k, and the context alone accounts for 88% of that gap (computed from the transcripts, a cache read weighted at a tenth of an input token). Whether a fresh session needs more turns for the same work was not measured.
