---
name: babysit-pr
description: 'Babysit a pull request through its bot review rounds: verify, fix, reply,
  resolve. Use for any babysit or watch-the-PR ask.'
risk: critical
category: code-quality
source: https://github.com/amElnagdy/review-skills
source_repo: amElnagdy/review-skills
source_type: community
date_added: '2026-08-26'
license: MIT
license_source: https://github.com/amElnagdy/review-skills/blob/master/LICENSE
compatibility: Requires `gh` (GitHub) or `glab` (GitLab) authenticated, plus `jq`
  and bash for the thread harvester.
metadata:
  version: 0.1.0
---
# Babysit a PR

## When to Use

- A PR/MR has accumulated bot review threads that need verification, fixes, replies, and resolution.
- You want to drive a PR from 'just opened' to 'nothing left unanswered' across multiple review rounds.

Goal: carry a pull request (GitHub) or merge request (GitLab) from "just opened" to "nothing left
unanswered," without the human having to sit and refresh the page. "PR" below means either.

Review bots are diff-anchored samplers. Every push mints a fresh round, and a fix in one place can
light up commentary somewhere adjacent. Left alone, a PR accumulates half-answered threads that
nobody resolves, and the real bug in round three gets buried under nitpicks from rounds one and two.
Your job is to be the person who reads every finding, decides what is actually true, fixes what
blocks, and closes every loop in writing.

You know how to drive `gh` (GitHub), `glab` (GitLab), and git. What follows is only the judgment this
loop needs and the few API calls that are easy to get wrong. The harvest script picks the forge from
the cwd's git origin; everything it returns has the same shape on both, with a `capabilities` block
naming what that forge cannot tell you.

## The three rules that matter most

Verify before you believe. A bot's severity badge is a guess made without running anything. Treat
every finding, including the P1s, as a claim to check against the code. Bots are frequently right
(that is why this loop is worth running), and they are also confidently wrong often enough that
shipping their suggestions unexamined will introduce bugs. Read the actual code path before you
agree or disagree.

Every thread gets an answer. A finding you fixed, rejected, or deferred is only closed once you have
said so in that thread and resolved it. Silence reads as "ignored" to the next human who opens the
PR, and it is how a real bug gets lost.

Publish before you answer. A "fixed" reply is only true once the remote branch carries the fix.
Never post a confirmed reply, or resolve its thread, while the fix exists only locally. Rejections
need no push. Reply with evidence and resolve immediately.

## Harvest the round

Findings arrive on two different surfaces, and a round that reads only one silently misses half of
them. This is the single most common way a babysit loop goes wrong:

- Inline review threads. This is where debate-review and Codex post their findings (Codex attaches
  P1/P2-badged inline comments to an otherwise boilerplate review body; an empty-looking body proves
  nothing). Each thread carries a `thread_id` (to resolve) and a `reply_to` (to reply inside the
  thread). On GitHub these are GraphQL review threads; on GitLab they are discussions.
- Top-level review bodies. This is where Greptile summarizes, Codex sometimes posts a numbered list,
  and debate-review posts its round summary. These have no thread to resolve; answer them with one PR
  comment per round. On GitHub they are review objects; on GitLab they are plain notes.

The bundled script returns both in one call, already correlated (`<skill-dir>` is the folder that
holds this SKILL.md):

```bash
"<skill-dir>/scripts/threads.sh" <N> > /tmp/pr-<N>-round-<k>.json
```

Never trust a filtered count without its unfiltered twin. Before applying any jq filter to the
harvest, print the raw totals (`jq '{threads: (.threads|length), reviews: (.reviews|length)}'`) and
compare. A filter that eliminates 100% of items is presumed broken until the field names are
verified against the actual schema (`jq '.threads[0] | keys'`). jq selects on a misspelled field
fail silently-empty, and a "clean round" built on one is how a P1 gets a merge-gate mention posted
over it. That has happened. GitHub tooling fails by returning less data, not by erroring; pair this with the
pagination rule.

Never describe an object you did not fetch. If a query for a specific id returns empty, that is a
stop signal. Say "I can't see it" and fetch it another way (`gh api .../reviews/<id>`), never narrate
its presumed content. Related trap: every inline thread reply arrives wrapped in a zero-byte
`COMMENTED` review object, so a watcher's "new review" event may be just a reply wrapper, not a new
round. threads.sh's `.reviews` does not include these wrappers, so a review id from an event that is
missing from the harvest means "wrapper", not "gone".

Diff it against the previous round's file to see what is genuinely new. `outdated: true` on a thread
means the line moved underneath it. The finding may already be fixed, so check it against current
code before spending the round on it. A `comment_count` bump on a thread you already handled means a
bot followed up inside it.

Has this reviewer seen the current push? Only trust a field that names a sha. On GitHub each review
carries `commit_id`; compare it to `head`. For debate-review on either forge, the round body's
`debate_head` is the sha it reviewed. On GitLab other reviewers' notes carry no sha (`capabilities.
review_commit_id: false`); a note's timestamp being later than your push does not prove it reviewed
that push, so say "coverage unknown" rather than guessing.

Two kinds of author count as a reviewer. First, a bot: `author_bot: true` in the harvest. On GitHub
that comes from the API's own author type and is reliable (`chatgpt-codex-connector` and
`greptile-apps` are the usual ones; don't hardcode a whitelist). On GitLab the API only sometimes
says, so `author_bot` can be `null`; treat `null` as unknown, look at the thread, and say in your
report that you could not confirm it. Second, any thread whose first comment carries a
`<!-- debate-review:... -->` marker. debate-review posts from the user's own account, so the author
is the PR author (`author_is_pr_author: true`), but the thread is a reviewer thread. The harvest
flags these as `debate_review: true` with `debate_id`, `debate_status`, and `debate_severity` parsed
from the marker; its round body shows up in `.reviews` with `debate_head` (the sha it reviewed) and
`debate_agreed` / `debate_contested`. Treat them like any other bot thread. Anything else from the PR
author, and any human's comment without that marker, is never in scope for autonomous fixing.
Surface it to the user instead.

Bots post 5 to 10 minutes after a push, longer on a big diff. Don't poll tightly; background the wait
and review the diff yourself meanwhile. A round is "in" once every reviewer you expect has either
posted against the current head SHA or been marked unavailable after its own wait budget. An
unavailable reviewer never blocks harvesting or acting on the ones that did post. Disclose the gap
instead of reporting the PR clean.

## Classify by real impact, not by badge

After verifying a finding, sort it by consequence rather than by the label the bot attached.

Blocking, meaning it would ship a defect or stop the merge:
- a real bug, wrong behavior, or broken edge case in the changed code
- security, authorization, data-integrity, or data-loss exposure
- a violation of the change's own stated contract, acceptance criteria, or spec
- a migration or schema hazard
- a failing or newly-flaky check

Non-blocking, meaning real but ships nothing broken: naming, structure, docs, test nitpicks, micro
performance, "consider extracting this", style preference.

When a finding is genuinely ambiguous, hold it as blocking until you have read enough code to demote
it. The asymmetry is deliberate. An over-cautious fix costs minutes, a missed P1 costs a production
bug.

A debate-review thread with `debate_status: contested` means two models looked and disagreed. The
main reviewer held the finding against a refutation, and the italic last line of the comment says
what the challenge was. That is a claim with a known counter-argument, not a weaker claim. Verify it
the same way, and say in your reply which side the code supports and why.

## Fix the blockers, autonomously

Don't stop to ask about blockers. Verify, fix, push, keep watching, report what you did.

- Reproduce first where you can. A probe that fails before the fix and passes after is what separates
  a real fix from a plausible edit. This matters most on findings you initially disagreed with. Those
  are the ones where being wrong is expensive.
- One push per round, not one per finding. Every push mints a new bot round, so per-finding pushes
  multiply the rounds you have to sit through.
- Run the repo's own gate before pushing. A fix that breaks the suite costs a whole extra round.
- If a matching guard skill is installed (clean-code-guard, test-guard, wp-guard, woo-guard from
  guard-skills), run it on your fix before pushing. The guards catch the failure modes a quick fix
  under review pressure tends to produce.
- When you disagree, prove it. Rejecting a finding is legitimate and common, but the reply has to
  carry the evidence: the code path, the guard that already handles it, or the test that pins the
  behavior. "This is fine" is not a rejection.

## Publish, then reply, then resolve

Work the round in one pass, not per finding: verify everything, reproduce confirmed blockers where
practical, fix them all, run the gate, then commit and push once and confirm the remote SHA. Only
then close the loops:

- Confirmed: reply naming the fix commit, then resolve.
- Rejected: reply with concrete evidence, then resolve. No push needed; these can close anytime.
- Deferred: create the agreed issue, reply with its link, then resolve.

Non-blocker fixes the user approves ride the next consolidated push, never a dedicated push of their
own. There is no re-review-exempt push: every push, including a final docs-only or nit-only one, must
be covered by a clean round from the merge-gate reviewer before merge (see "Before merge"). If
publication or verification fails, leave the thread open and report the blocker.

Answer inside the thread the finding came from. A fresh top-level comment leaves the original thread
open and forces the reader to correlate by hand. Use the harvest's `reply_to` to reply and `thread_id`
to resolve. On GitHub those are two different identifiers (REST comment id, GraphQL thread id); on
GitLab both are the discussion id.

GitHub:

```bash
gh api --method POST "repos/<owner>/<repo>/pulls/<N>/comments/<reply_to>/replies" \
  -f body="$(cat /tmp/reply.md)"

gh api graphql -f query='mutation($t:ID!){
  resolveReviewThread(input:{threadId:$t}){ thread{ isResolved } } }' -F t="<thread_id>"
```

GitLab (`<project>` is the URL-encoded `group/path`, `--hostname` your instance):

```bash
glab api --hostname <host> --method POST "projects/<project>/merge_requests/<N>/discussions/<reply_to>/notes" \
  --raw-field "body=$(cat /tmp/reply.md)"

glab api --hostname <host> --method PUT "projects/<project>/merge_requests/<N>/discussions/<thread_id>" \
  -F resolved=true
```

The GitLab reply and resolve calls are taken from the GitLab API docs and have not yet been exercised
against a live instance from this skill. The first time you use them, check the response, and if
either fails, stop and report rather than retrying variations.

Attribution. Open every reply by naming the model writing it and the person it writes for, so a
reader never has to guess whether a human weighed in. Sign your own model name; this skill is
model-neutral. The person is whoever owns the account the reply posts from. Get the name once per
session, `gh api user -q '.name // .login'` on GitHub or `glab api user --hostname <host> | jq -r
'.name // .username'` on GitLab, and reuse it:

> I am \<model-slug\> writing on behalf of \<user\>.

Then the verdict, then the evidence, briefly:

```
I am <model-slug> writing on behalf of <user>.

Confirmed and fixed in `a1b2c3d`. You were right that `occurrence_time` was never
compared against `evidence.event_time`, so a mapping could bind proof from a
different occurrence. Reproduced with a failing test first
(`test_binds_proof_to_mapped_occurrence`), then fixed the composition check.
```

```
I am <model-slug> writing on behalf of <user>.

Declining this one. The nil case you describe is already unreachable. `resolve()`
returns early at `handlers.py:88` whenever the session is unset, which is the only
path that reaches this line. Leaving the behavior as-is.
```

Resolve only what is actually closed: fixed and pushed, rejected with evidence, or deferred with an
issue filed. Never resolve a thread whose question you have not answered. Resolution claims the loop
is closed, and a false claim is worse than an open thread.

## Non-blockers: one batched ask per round

Don't interrupt per finding, and don't silently decide. Once per round, after the blockers are
handled, bring the non-blocking findings as one list with a recommendation each (fix now, open an
issue, or reject) and let the user choose:

> Round 2 on PR #123. 1 blocker fixed and pushed (`a1b2c3d`). Three non-blocking findings left:
> 1. debate-review: extract the duplicated fixture in `test_foo.py`. Recommend issue, touches
>    files outside this change
> 2. Codex: `Counter` comparison could use `==` directly. Recommend fix now, one line
> 3. Greptile: docstring missing on the new helper. Recommend fix now, trivial
> Fix 2 and 3 in the next push, issue for 1?

Whatever they decide, close each thread the same way as any other finding. Anything deferred gets a
real issue with enough context to act on months later: a link back to the thread, the file, and why
it was deferred. Not just a title.

## Re-trigger within a fixed budget

One invocation gets the initial harvest plus at most two consolidated repair pushes and two
re-review cycles unless the user explicitly asks to continue. After each push you start the next
round yourself. How depends on the reviewer, because they are triggered in three different ways:

- debate-review is a local script, not a bot, and it works on both forges. You run it, it does the
  whole review while you wait, and it exits once the review is posted. Nothing to mention, nothing
  to poll:

  ```bash
  node "<debate-review skill-dir>/scripts/review-pr.mjs" <pr-url>
  ```

  (`<debate-review skill-dir>` is wherever that skill is installed, `~/.agents/skills/debate-review`
  on a standard install.) Run it in the background, keep working, and harvest the moment the command
  exits. It prints the review URL; exit code 3 means this head was already reviewed. It reviews
  exactly one head sha per run, so a run after a push always produces a fresh round. A run takes
  10 to 20 minutes.
- Codex is a GitHub app (there is no GitLab equivalent). Mention `@codex review` in a PR comment,
  then wait. It answers 8 to 15 minutes later, against whatever head was current when it ran. Check
  `commit_id` on its review before believing it covers your push.
- Greptile and similar bots re-review every push on their own. Don't summon them; handle their
  findings when they show up.

For a bot you are waiting on, wait at most 10 minutes past its usual window. If it is silent or
rate-limited, mark that reviewer unavailable; do not wait out a cooldown. The one exception is the
merge-gate reviewer at the merge gate, which has no timeout (see "Before merge"). Even a final
test-only, documentation-only, or nit-only push gets a round. The merge gate below is meaningless if
the last push went unreviewed.

Run the repository's required gate once per consolidated repair push; never rerun an already-passing
gate for the same SHA. If the user says "stop", "enough", or "push whatever you have", cancel active
polls and long gates, run the smallest relevant check that can finish promptly, publish the safe
work, disclose any incomplete gate, and do not trigger another review round.

Rounds should shrink. If round three is as large as round one, something systematic is wrong. Say
so rather than grinding. Findings that recur in the same shape usually mean the fix addressed a
symptom instead of the cause, which is worth surfacing.

At the budget boundary, stop and hand off the exact remaining findings, unresolved threads, last
reviewed SHA, and unavailable reviewers. Never describe an unreviewed head as clean.

## Before merge

The merge gate is an explicit clean round from the repo's primary reviewer on the exact merge
candidate, the final head sha. Which reviewer that is depends on the repo.

Where Codex is installed, mention `@codex review` after the final push and wait for its reply. A
clean round is Codex saying so in plain words ("no findings", "good job") against the final head. No
reply yet is not a pass. Codex answers 8 to 15 minutes after a push, and merging inside that window
is how a real finding lands minutes after the merge.

Where debate-review is the reviewer (on GitLab it is usually the only one), run it on the final head.
A clean round is all three of: its round body present in `.reviews` with `debate_head` equal to the
final head sha, `debate_agreed` and `debate_contested` both zero, and no unresolved reviewer threads.
If the body is missing (a run can fail after posting inline comments), the gate has not been met;
re-run it, don't infer.

Either way, a finding is a new round, not a merge. Silence well past the usual window is something
to report to the user, not approval.

Re-harvest and re-read the PR's most recent comments before proposing a merge. A watcher settled
into a quiet interval can miss a late round, and a comment posted after your last check is exactly
the one that gets merged over.

Then ask the user whether to merge. Never merge on your own initiative. Report: rounds run,
blockers fixed with their SHAs, findings rejected and why, issues filed, unresolved threads
remaining (ideally zero), and CI state. The merge decision is theirs; everything leading to it was
yours.

## When to stop and speak up

Some situations are not yours to grind through:

- A bot finding that is right but demands a change well beyond this PR's scope.
- Two bots contradicting each other on the same line, when code, tests, and the stated contract
  cannot settle it.
- The same finding recurring after a retry. The first recurrence gets a re-verified root cause and
  one more attempt inside the repair budget; a second means your model of the bug is wrong.
- A human reviewer's comment, always.
- CI failing for infrastructure reasons rather than code.
- The two-repair-cycle budget is exhausted.
- The user asks to stop, push the current work, or end the babysit loop.


## Limitations

- Requires authenticated `gh`/`glab`, `jq` and bash; harvests threads and reviews.
- Docs-only import — executable helper (`scripts/threads.sh`) not included; see upstream for full runtime. Fixes are to PR branch only, never merges.

> Adapted from [amElnagdy/review-skills](https://github.com/amElnagdy/review-skills) (MIT) — docs-only, runtime not bundled.
