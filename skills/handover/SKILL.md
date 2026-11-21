---
name: handover
description: Write a concise agent handover with task state, exact workspace, evidence, open decisions and the next safe step.
argument-hint: '<optional: what the next session will do>'
disable-model-invocation: true
risk: safe
source: https://github.com/phuryn/product-engineering
source_repo: phuryn/product-engineering
source_type: official
license: MIT
license_source: https://github.com/phuryn/product-engineering/blob/8ebb50bb1b28dc9e8bc669199493e6020b808cc6/LICENSE.md
author: Pawel Huryn
upstream_commit: 8ebb50bb1b28dc9e8bc669199493e6020b808cc6
date_added: '2026-11-21'
category: development
---

# Handover — what the next session starts from

## Operational boundaries

Keep the scope, sandbox, credentials and approval settings supplied by the user or host. Obtain authorization before delegating, exposing project files to another provider, enabling connectors or hooks, using paid services or deploying. Use synthetic or redacted inputs for examples. Keep security reviews static and defensive, with findings and fixes grounded in source inspection.

## When to Use

Write a concise agent handover with task state, exact workspace, evidence, open decisions and the next safe step.


**Write the one note the next session reads first.** The session is ending, or its context is; work continues tomorrow, in a fresh session, or with another agent. Start that session from what is true rather than what this session remembers.

## Invocation

```
handover                          Claude Code, plugin installed
handover the next session finishes the billing stage
handover                          Codex, plugin installed
/handover   ·   $handover                        the skill folder copied into a repository
```

## Steps

### 1. Reconcile with reality first

**Check what this session believes against reality before writing a word.**

- **Check the disk and name uncommitted work as uncommitted.** Read `git status`, the branch, commits made this session, and files the work touched.
- **Check every background job, server, watcher and build this session started.** Each is still running, finished with its exit code read from its log, or gone.
- **Correct project state files where the disk contradicts them.** Check the plan's status, status board, backlog and earlier handover; correct those lines rather than copying them.

**An inherited report is a claim, this session's own memory included.**

### 2. Write what the next session needs

| Section | Holds |
|---|---|
| Objective | what the work is for, in a line, and who asked |
| Where it stands | what is true now: built, committed, pushed, deployed, each said plainly |
| Evidence | what was actually run and observed: the command, its exit code, the number, the verdict. Not what was intended. Anything unverified says so |
| Left to do | in order, each small enough to start on |
| Open decisions | each with its options, a recommendation, and whose decision it is |
| Where things are | branches, worktrees, files, logs, URLs, processes still running and how to stop them |
| Next action | one concrete first step: a command to run, a file to open. Never "continue" |

**Keep it short enough to stay true, preserving the evidence.** Evidence costs most to lose. A re-run experiment costs money; restating a number from memory is how a wrong one reaches the owner.

### 3. Put it where the project keeps such things

**Use the project's own handover convention before creating a new file.** Use its status board, plan's status lines or existing handoff file. With none, keep one `HANDOVER.md` at the repository root, rewritten in place each time. It says what is true now, not the history.

**Use the `flight-deck` skill for hours, multiple sessions or background jobs.** That work wants its status board and log instead of a single note. A few lines are enough for a short session.

**Name where secrets are kept without putting them in the handover.** No keys, tokens, passwords or connection strings.

### 4. Tell the owner how to start the next session

**End with the next session's starting line and anything left running.** For example: *Read `HANDOVER.md` and start from its next action.*

Each rule's origin, the case that taught it, is in `receipts.md` beside this file; read it when a rule's edge is unclear.

## How you can tell it worked

A fresh session given only the note can say what the work is for, what is verified and what is not, and run the next action without asking what happened.

## Limitations

Treat upstream examples as patterns. Validate scope and results against current project constraints, available tools and decisions recorded by the owner.

Adapted from [Pawel Huryn’s upstream skill](https://github.com/phuryn/product-engineering/tree/8ebb50bb1b28dc9e8bc669199493e6020b808cc6/agent-harness/skills/handover).
