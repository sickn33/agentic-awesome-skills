---
name: punchtape
description: Work under the punchtape arbiter - the human's words are the law of the task, and done is the machine's verdict, never your announcement. Use when the repo has a .punchtape/ directory (check parents too) or the human mentions punchtape.
category: development
risk: safe
source: https://github.com/neurophant/punchtape
source_repo: neurophant/punchtape
source_type: community
date_added: "2026-11-20"
author: neurophant
tags: [verification, ai-agents, task-management, arbiter, testing]
license: MIT
license_source: https://github.com/neurophant/punchtape/blob/main/LICENSE
---

# punchtape

punchtape is an external state machine beside you: it holds the
task's truth. The human's words sit in `.punchtape/demands.md`,
verbatim, one demand a line - they are the law of the task. The
machine measures your work against the claims you pin. You never
self-certify: `done: true` is the completion act, and whether the
work stands done is the machine's verdict, never your announcement.

## When to Use

- The repo has a `.punchtape/` directory (check the current
  directory and every parent).
- The human mentions punchtape or asks for machine-verified task
  completion.

## When NOT to Use

- The repo has no zone and the human has not asked for punchtape:
  do not install or birth a zone on your own initiative.
- The task is a one-line answer with no code or files to verify -
  answer directly.
- The human wants a code review or a discussion partner - use a
  review skill. This skill is about earning a finish, not opinions.

## Prerequisites

- punchtape installed (`command -v punchtape`). Homebrew:
  `brew install neurophant/tap/punchtape` (macOS, Linux x86_64).
  The repo carries all documentation (README, docs/):
  https://github.com/neurophant/punchtape
- Linux or macOS on amd64/arm64. Windows is not supported yet -
  say so to the human and stop.
- A unix shell. Any agent with a shell works. The machine does not
  care which model stands behind it.

## Find the situation first

1. Check for a zone: a `.punchtape/` directory in the current
   directory or any parent.
2. Check the machine: `command -v punchtape` (empty output - not
   installed).

Name the situation you found, offer two to four options, and WAIT
for the human's pick. Never install, birth a zone, or start work on
your own initiative.

- **No machine, no zone.** Offer: install now and start this
  project under punchtape - install and just read the printed
  contract - not now.
- **Installed, no zone in this project.** Offer: bring this
  standing project under punchtape - start a fresh task in a new
  folder - not now.
- **A zone stands.** Do not offer to bypass it. Read
  `.punchtape/state.md` (the standing and the `next:` line), then
  `.punchtape/report.md` for the last facts, and propose the work
  the `next:` line names.

## Birth, once per project (only if the human picks it)

1. Run `punchtape`. With no zone yet it prints the whole contract
   and creates nothing - read it. That text is the law you will
   work under.
2. Create `.punchtape/demands.md` and put the human's words into
   it: verbatim, one demand a line, nothing of yours mixed in.
3. Run `punchtape` again - that run births the zone.

## The daily loop inside a zone

- New words from the human enter `demands.md` at any moment: append
  them verbatim, one demand a line.
- Files of the zone: `contract.md` (the law), `reference.md` (every
  door - read it first), `state.md` (standing + `next:`),
  `report.md` (last run's facts), `template.yaml` (the submission
  shape), `inbox.yaml` (submissions), `journal/` (the machine's
  own record).
- Submissions go to `inbox.yaml` by the shape of `template.yaml`.
- Never edit anything inside `journal/` by hand: the machine checks
  every record and rejects any mismatch.
- When in doubt, run `punchtape` and read what it says. One line of
  terminal, nothing else.

## Refusals

- A refused submission stays in `inbox.yaml`. The report names the
  exact place and the exact law: fix the file in place and run
  again. Nothing is lost.
- The submission is YAML and YAML has sharp edges: quoting rules,
  no tabs. This is the most common refusal. Read the named place,
  fix it, run again.
- A zone born on another version of punchtape is refused: archive
  it and start fresh. Do not work around it.

## Several agents

Runs take turns automatically, one at a time. The machine does not
split the work between agents - who does what is the human's call.

## Example

A real zone, start to verdict (machine one-liners quoted from a live
v0.5.1 session):

1. `demands.md` holds one line: `say hello and nothing else`.
2. The agent writes `hello` (prints exactly `hello`) and submits the
   document: an execute intent for D1 with `run: "./hello"`, plus a
   behavior `hello/say` whose row pins the exact bytes:

```yaml
work: first document - a hello script, pinned to the demand's exact words
intents:
  - {lines: [D1], outcome: execute, prose: the demand says hello and nothing else, run: "./hello"}
remove: []
behaviors:
  - id: hello/say
    name: say hello
    prose: prints hello and nothing else
    claims: ["hello:1-2"]
    rows:
      - run: "./hello"
        expect:
          rc: 0
          out: "hello\n"
```

3. The machine answers, one line per run:

```text
punchtape: run 1 - 9 uncovered lines - submit their claims or loud exclusions to .punchtape/inbox.yaml
punchtape: run 1 - all green - write done: true to .punchtape/inbox.yaml and run to record the verdict
punchtape: run 1 - verdict #1 standing - show .punchtape/state.md to the human; new work goes to .punchtape/inbox.yaml as a document
```

Expected result: the uncovered lines (the machine's own AGENTS.md
block) are excluded loudly with a citing reason, the check runs green
with a proof hash, and `done: true` lands a standing verdict with a
signature. The agent never announces done - the machine does.

## Limitations

- Offline and local: the machine makes no network calls, has no
  account, no telemetry.
- The machine compares real output byte by byte. It never reads
  meaning. A recorded finish proves the checks passed exactly as
  written - the last look stays with the human.
- It cannot know a word that was never written down: demands come
  from `demands.md`, never from your chat.
- One zone, one machine version. Cross-version zones are refused.

## Safety and side effects

- Install footprint: one static binary in ~/.local/bin (or the Homebrew
  prefix), zone files inside the project directory. No system paths,
  no sudo, no background processes.
- The machine runs only when called. Whatever a command left
  running dies with it. No background processes.
- Commands inside checks execute with the agent's shell
  permissions - propose only what the human asked for.
- Nothing hides: every refusal names its exact place and law, and
  every exclusion is loud, with a reason.

## Ground rules

- Work from what you can see: quote what commands really printed.
  Never invent a terminal line, a file's content, or a result.
- Green, red, stale, verdict - those words mean what
  `.punchtape/state.md` and `.punchtape/report.md` record, nothing
  else.

## Sources

- Repo: https://github.com/neurophant/punchtape
- Documentation: https://github.com/neurophant/punchtape (README, docs/)
- Site with a recorded session: https://punchtape.dev
