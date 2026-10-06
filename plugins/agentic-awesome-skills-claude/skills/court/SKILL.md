---
name: court
description: "Put an idea on trial: a prosecutor and a defense Claude argue, 12 juror sub-agents vote independently, and a judge reads the verdict and the changes that would flip it."
category: productivity
risk: safe
source: community
source_repo: alexyc9381/court-skill
source_type: community
date_added: "2026-10-03"
author: "Alex Chen (@nocodealex)"
tags: [decision-making, critical-thinking, feedback, subagents, multi-agent]
tools: [claude]
license: "MIT"
license_source: "https://github.com/alexyc9381/court-skill/blob/main/LICENSE"
argument-hint: "[--jury N | --quick] [--seed S] <the idea, plan or claim>"
---

# court

For when Claude agrees with everything you say. Instead of one polite answer, the idea goes on trial:
a prosecutor builds the case against it, a defense builds the case for it, and a jury of Claudes who
never see each other votes. You are the clerk of the court. You never argue, never vote, and never
soften the verdict.

What the user typed after `/court`: `$ARGUMENTS`

If that is blank, or still reads like a placeholder, take the case from the conversation: the idea,
plan or claim the user most recently wanted an opinion on.

## When to Use This Skill

- Use when the user wants pushback instead of agreement, or says Claude agrees with everything.
- Use when the user asks "is this a good idea?" about a plan, a purchase, a post, a code plan or a claim.
- Use when the user says "court", "put it on trial" or "/court".

## The tool

Every piece of bookkeeping goes through `scripts/court.py` in this skill's folder:

```bash
python3 "${CLAUDE_SKILL_DIR}/scripts/court.py" <command>
```

Below, `COURT` means exactly that command. If the path looks unexpanded, use the "Base directory for
this skill" that Claude Code printed at the top of this skill. The state lives in
`.court/<run>/state.json` in the current directory, and every command after `init` finds it through
`.court/LATEST`.

## Step 1: size it

Read the flags out of the request. Everything that is not a flag is the case.

| flag | meaning |
| --- | --- |
| `--jury N` | N jurors, 3 to 12. Default 12. |
| `--quick` | 6 jurors. |
| `--seed S` | Fixes which jurors sit on a smaller jury. Default: random, and recorded. |

Run `COURT plan` with the same flags and tell the user in one line how big the trial is, for example
"12 jurors, 17 sub-agent calls", then start. If this skill fired on its own (the user never asked for
a trial), ask once first and offer `--quick`.

Sub-agents write into `.court/` in the current directory. In the default permission mode that is one
approval per file. Suggest accept-edits mode (Shift+Tab) for the trial. Do not change the user's
settings yourself.

## Step 2: write the case file

**Sub-agents cannot see this conversation.** The prosecutor, the defense, every juror and the judge
know only what is in the case file, so write `.court/case.md` to stand on its own:

- First line: the case in one sentence, in the user's own words where you can ("Quit my job to sell
  candles on Etsy full time").
- Then everything the user told you that matters: numbers, audience, budget, timeline, what they have
  already tried, constraints.
- Do not add facts the user never gave, and do not write your own opinion of the idea into it. A case
  file that leans one way decides the trial before it starts.

## Step 3: open the trial

```bash
COURT init --case-file .court/case.md [--jury N | --quick] [--seed S]
```

## Step 4: the trial

Always drive it with `COURT next`. It reads the files on disk and tells you the next phase and the
exact command. The phases run in this order: `opening`, `rebuttal`, `jury`, `judge`.

Every phase works the same way:

1. `COURT prompts <phase>` writes one brief per job and lists the jobs still to run, in waves.
2. Launch **one wave at a time**: a single message with one Agent tool call per job in that wave (the
   Agent tool is called Task in older Claude Code versions). Each call is:
   - `subagent_type`: `general-purpose`
   - `description`: `court <job id>`
   - `prompt`: `Read <brief path> and follow it exactly. It is your whole brief.`

   Wait until every agent in the wave has replied before you launch the next wave.
3. After the last wave, run `COURT next`. If an output is missing it sends you back to the same phase,
   and `prompts` then lists only the missing jobs. Re-run those once. If a juror fails twice, write
   the single line `NO VOTE` into its file (`COURT check jury` lists it) and move on. Never write a
   vote, a statement or a judgment yourself.

## Step 5: the verdict

When `COURT next` says the trial is over:

```bash
COURT render
```

It counts the votes, writes `VERDICT.md` into the run folder and prints it. Show the user the verdict
line, the vote table and the judge's sections exactly as written. Then add at most two lines of your
own: the single condition for acquittal you would start with, and the path to the full trial.

Rules for you, the clerk:

- Never change, soften or re-count the verdict. A guilty verdict is useful information, not bad news
  to cushion.
- Never add praise the jury did not give.
- If the user disagrees with the verdict, offer a retrial with the changes from "Conditions for
  acquittal" written into a new case file. Do not argue for either side yourself.

## Examples

```text
/court Quit my job to sell candles on Etsy full time. I have $8,000 saved and 40 sales so far.
/court --quick The plan you just gave me is the right one.
```

## Limitations

- The jury is made of language models: treat the verdict as a structured second opinion, not legal, financial or professional advice.
- The jury only knows what the user wrote; vague cases get vague verdicts.
- A full trial is 17 sub-agent calls (11 with `--quick`), and each counts toward the user's Claude plan usage.
- Runs in Claude Code (it spawns sub-agents and calls its script through `${CLAUDE_SKILL_DIR}`).

## Source

By Alex Chen ([@nocodealex](https://instagram.com/nocodealex)). Original repo with tests and a real example run: https://github.com/alexyc9381/court-skill
