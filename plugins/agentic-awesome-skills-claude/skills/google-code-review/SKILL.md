---
name: google-code-review
description: "Review code or prepare a change for review using Google's engineering practices: reviewer and author modes, severity labels, CL descriptions, review speed and pushback."
category: development
risk: none
source: self
source_type: self
license: CC-BY-3.0
license_source: https://github.com/google/eng-practices/blob/master/LICENSE
date_added: "2026-11-16"
author: instax-dutta
tags: [code-review, pull-request, changelist, engineering-practices, communication, review-etiquette]
---

# Google Code Review

## Overview

Most AI code reviews are vibes-based: nitpicks, no consistent bar, no guidance for
the author. This skill installs Google's documented engineering standard in two
modes that mirror the two audiences in Google's guide:

- **Reviewer mode** - reviewing someone else's code.
- **Author mode** - preparing code for review, writing the description, handling
  feedback.

The overarching rule is Google's: favour approving a change once it definitely
improves the overall code health of the system, even if it is not perfect. Seek
continuous improvement, not perfection.

This differs from a lint or static-analysis skill: it covers judgement, review
structure, comment wording, review speed and disagreement, not rule checking.

## When to Use

- The user asks for a code review, a PR review, a CL review, or "review my
  changes".
- The user wants to prepare a change for review, write or improve a CL/PR
  description, split a large change, or handle reviewer feedback.
- The user asks a process question: how fast reviews should be, what counts as an
  emergency, how to resolve pushback, whether to approve with comments.
- The user mentions code review standards even without naming Google. The
  practices are broadly applicable.

Use a linter, type checker or CI skill when the question is "does this pass the
rules". Use this skill when the question is "should this change land, and how do
we talk about it".

## Prerequisites

No tools, accounts or network access. Inputs: the diff or files to review, and for
author mode the change being prepared. For a review, a missing description is
itself a finding: flag it before reading the code.

## How It Works

### 1. Determine the mode

Review request goes to reviewer mode. "Help me get this ready" goes to author
mode. A general process question loads the matching reference from the upstream
repository listed at the end.

### 2. Reviewer mode

Read the description first, then look at the change in this order of importance:
design, functionality, complexity, tests, naming, comments, style, documentation,
every line, and the effect on the wider file and system.

Structure the review broad to narrow: does the change make sense at all, then the
files with the largest logical changes, then the rest. Optionally read tests first
to understand intent.

Comment rules:

- Comment on the code, not the person.
- Explain the reasoning and the practice behind each point.
- Label severity: `Nit:` for non-blocking polish, `Optional:` or `Consider:` for
  suggestions, `FYI:` for information.
- Praise work that is done well; it is the cheapest mentoring available.
- Do not accept "I will clean it up later" outside a genuine emergency.

Review speed: respond within one business day, at a break point rather than
mid-task, because response speed matters more than total turnaround. Approve with
unresolved minor comments when the author can be trusted to address them. Ask for
a large change to be split.

Handling pushback: assume the author may be right, explain your reasoning if not,
stay polite, escalate when consensus fails, and never let a change sit because of
disagreement.

Emergency bar: only small changes fixing production bugs, security holes, legal
issues or a blocked major launch. Most "urgent" requests are not emergencies.

### 3. Author mode

- Description: first line is a short imperative summary that stands alone; the
  body explains why, the approach and the tradeoffs. "Fix bug" and "Phase 1" are
  failures.
- Size: one self-contained change, around 100 lines is reasonable, around 1000 is
  too large. Split by stacking, by file, by layer or by feature, keep tests in the
  same change, and separate refactors from behaviour changes.
- Feedback: fix the code rather than the explanation, ask questions instead of
  arguing, and never respond in anger.
- Before submitting: re-read the description against the final state of the diff.

### 4. Verify the output

A review is complete when it names the blocking issues, separates them from nits,
says whether the change should land, and gives the author something actionable per
point. Author help is complete when the description explains why and the change is
sized for one review pass.

## Examples

```text
User request: "Review this 900-line PR that mixes a refactor with a feature."
Inputs: diff plus a one-line description ("updates").
Expected result (illustrative):
  Blocking: description does not explain why; the refactor and the feature should
  be two changes; test coverage only on the feature path (design and tests fail).
  Nit: helper name `doStuff2` is not communicative.
  Verdict: not ready to land - split into a refactor CL and a feature CL, write the
  description, then request review. Approve-with-comments would be wrong here.
```

## Limitations

- It carries Google's bar, which assumes a reviewer with commit rights. An agent
  cannot approve, merge or block a change by itself.
- Style points come from Google's published guides; a repository with different
  conventions wins over the generic advice, and personal preference still needs a
  `Nit:` label.
- It does not run tests, linters or CI; it reviews what it is given.
- The emergency policy is Google's; other organisations may define emergencies
  differently.

## Safety and side effects

Read-only. No repository writes, no branch operations, no network calls. Review
comments are produced as text for the user to post. Do not paste credentials or
private customer data from a diff into the review body.

## Sources and related skills

- Google's engineering practices, CC-BY 3.0:
  <https://github.com/google/eng-practices>
- Upstream skill repository, including the full reviewer guide, developer guide
  and emergency policy:
  <https://github.com/instax-dutta/google-code-review>

This skill text is a derivative of Google's eng-practices documentation and is
distributed under CC BY 3.0, the same license as the source. It condenses and
restructures the original into reviewer and author modes and adds worked examples,
limitations and safety notes; the practices themselves are unchanged. The
attribution and full license text are in the `LICENSE` file next to this file.

- Pair with a testing or CI skill when the question is whether the change is
  correct rather than whether it should land.
