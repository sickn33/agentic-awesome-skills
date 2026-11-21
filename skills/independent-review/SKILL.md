---
name: independent-review
description: 'Before ''ship it'', a deploy or release, for ''an independent review'', and after each fix until a round is clean: a fresh reviewer that never saw the build.'
risk: critical
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

# Independent review — the gate before a change ships

## Operational boundaries

Keep the scope, sandbox, credentials and approval settings supplied by the user or host. Obtain authorization before delegating, exposing project files to another provider, enabling connectors or hooks, using paid services or deploying. Use synthetic or redacted inputs for examples. Keep security reviews static and defensive, with findings and fixes grounded in source inspection.

## When to Use

Before 'ship it', a deploy or release, for 'an independent review', and after each fix until a round is clean: a fresh reviewer that never saw the build.


**The session that wrote the code never clears it.** A fresh reviewer that never saw the build reads the change for what would block or break it. That separation applies at every size: a one-line fix that ships gets a short round, never no round. Inside a phase, it joins the phase's series (§ When).

## Reviewer selection and isolation

**The tool is optional; the review is not.** By default, the wrapper chooses the first installed of Codex, headless Claude Code and Grok. Run `python <skill dir>/scripts/review.py --check` to see which.

**A fresh session of the builder's own model is independent: it never saw the build.** It shares more blind spots than another family would. Accept that cost: a round that runs beats one skipped.

The method holds for any reviewer. Apply `codex-agents`, `claude-agents` or `grok-agents` to drive its CLI from another agent.

**The repository's own instructions come first.** Follow its agent instructions or release docs for reviewer, fallback, review bar, required moments and release range. They may also name the test gate and where deferred findings go.

**A repository ranks its reviewers; it cannot rule out a review.** When none of its named reviewers can run, use the wrapper's reviewer without asking. If no other family can run, use a fresh session of the builder's family. Never use the building session or skip review. Interpret "a model never reviews its own family's work" as "prefer another family". Apply `agent-instructions` to rewrite it accordingly and record owner choices and their precedence.

**Apply one bar to every reviewer, including a repository's named reviewer.** Require a fresh session that never saw the build, never a resume, fork or subagent of it: the reviewer must not inherit the builder's beliefs. Use read-only tools only, no MCP servers or connectors, memory off, and high effort or above. Switch off project and user instructions where the CLI allows. Name everything that cannot be switched off in the round's report.

A sandbox flag alone is insufficient. The wrapper prints what still loads. For each CLI's controls, observed limitations and manual setup, read `references/reviewer-clis.md`.

When a named reviewer cannot meet that bar, use the product's recorded fallback if it can, without asking. Otherwise use the fallback above, without asking. Name the actual reviewer and why it replaced the named one in the report. Where repository instructions say nothing, use these defaults. Ask when a default needs an owner-only fact, such as the released branch or last release.

**Verify findings yourself, and after every fix rerun the tests it touches yourself.** Check each finding against the code, including its severity and how often its trigger happens (§ Triage). Fix what the bar names and run each fix's regression test and the tests it touches. Get a fresh round on the changed state until the bar holds.

**Treat findings and their severity labels as claims, not results.** Triage below is mandatory; it is the part that most often goes wrong.

## When

- **Review before every release, however green the tests are.** A release without an independent pass is not a release.
- **Review before every push to a branch that deploys.** When users receive the push, "just push it" requires a round first. The push closes the round (§ Keep the subject still).
- **The first push goes only where the owner named.** Every URL from `git remote get-url --push --all origin | sed -E 's#//[^/@]*@#//#'` must name that repository. The `sed` removes any username or token. If any URL differs, push nothing and ask.
- **Review again after fixing anything a round found.** A fix is unreviewed code, and fixes produce the worst defects. Never report readiness from a round you fixed anything after, however small or confident the fix.
- **Review the completed phase; test each stage as it lands.** A phase is the review unit: related stages ending in one state the owner can try. Size phases for agents: a few hours of builder turns, ending in something clickable and deployable. A first version usually needs two to four phases. A sprint is an analogy, not a human timetable. A stage is one consistent, testable piece inside a phase; a delegated piece is part of a stage.
- **Choose the split and cadence, and state them before building.** The coordinator chooses what agents can handle and what improves quality without needless delay. The plan message itself names the phase split, review cadence and rough builder-hour estimate. Repository instructions or the owner may set another cadence; record it in the plan. Findings land later on a larger diff; split an oversized subject by stages' commits or area, never shorten it (§ The subject).
- **Run phase reviews after the coordinator's gate, visual and docs checks.** Apply `release-gate` § Stage and phase close for stage checks, the ordered phase checks, closing push and owner preview. A stage's optional advisory round clears nothing.
- **Run the full applicable gate before reviewing a finished standalone change.** Rerun it on the cleared phase or standalone change if a fix followed its last full run, before pushing or calling it done. If that gate fails, its fix gets a fresh round. A gate of a couple of minutes can run after every fix.

## The subject: computed from git, and it narrows after round 1

**Compute the subject from git, covering the whole phase or unreleased range.** A prose description can leave an unapplied migration or untracked file unreviewed. A phase's first round starts at the last commit a round cleared, or at the work's first commit when none has. It takes everything from there, plus the working tree. Before a release, round 1 takes everything unreleased, committed or not: last release to `HEAD`, plus the working tree.

```bash
git log --oneline $RELEASED..HEAD               # the unreleased commits
git diff $RELEASED...HEAD --stat                # its shape
git status --porcelain -uall                    # and anything uncommitted, file by file
```

**Read that status for what does not belong, too.** The wrapper inlines every untracked file under 200 KB, including its content. The cap is per file. A directory of small generated files therefore goes in whole: copied data, fixtures, scratch output or build artefacts without ignore rules. The turn cap rises to fit it. For anything outside the change, delete only what this session generated; otherwise `.gitignore` it or ask the owner before the round. A subject much longer than the diff's `--stat` suggests usually signals this. The wrapper warns when untracked files add more than 20,000 lines or most of a subject over 5,000, and never refuses.

**Use the repository's last released state as `$RELEASED`.** It may be production branch `origin/<prod>`, a release tag or the deployed commit.

**Before the first release, review the whole history with `--subject HEAD`.** Earlier phase series cover their phases; they do not replace this whole-product review. The wrapper writes every commit's author and message, every file `HEAD` holds, and every line its history removed. Include the first commit: a push sends every commit, and `<first commit>..HEAD` would omit it. A clone or fork whose history began in another repository uses the same `--subject HEAD`. The source repository's tags and branches are not this product's releases. Before any release, nothing is live yet. The brief therefore marks every finding INTRODUCED, including code that came with the history.

**Never narrow the range by hand to make it fit.** A release's first round includes already-pushed code: when pushes deploy, that code is exactly what users run. A range too large for one round is split, never shortened, in one of two ways:

- **Split by commits when the history falls into stages.** Give each round a contiguous slice and the rest of the range as context, oldest first. Each later round reads earlier slices for interactions. This fits a few build stages.
- **Split by surface when the history does not partition.** This fits a first release covering the whole product, or commits that each touch everything. Each round takes the whole range and reads its assigned area in full, with other areas named as context. Examples are public surfaces; data, permissions and money; and member screens. Together, the areas cover every changed file. Area rounds read one still snapshot and run in parallel, each with its own brief and output file so concurrent rounds do not all read the last brief written.

**Narrow every later round to commits since the previous round.** Give the remaining unreleased range as context to read for interactions. Naming new code is scoping, not steering. Re-reviewing cleared code adds time and pre-existing noise while burying new findings. Passes find bugs, so cheap rounds beat thorough ones.

**Bring old code into scope only where the change makes it newly reachable or newly wrong.** Say this explicitly in the brief; interactions hold serious findings. Keep both kinds of pass: a whole-range review sees composition that per-commit rounds cannot.

**Keep coordinator notes out of the review subject until its series closes.** Suspected defects and running triage steer a fresh reviewer. Commit those notes only after the series' final code-clearing round, or keep them outside the repository until the series closes.

**Scope the subject by what a reviewer must read, not by file count, and keep generated prose out of it.** Give generated docs as context for code questions, not review subject; prose can exhaust a round that fits the code and tests.

## Running it

**Use the wrapper to apply review flags and reject short failed rounds.** It picks the reviewer and fails loudly when output is too short to show a round ran:

```bash
S="<a scratch directory>"
python <skill dir>/scripts/review.py \
     --brief "$S/review-NNN-brief.md" --cwd <repo> \
     --subject "<range>" --out "$S/review-NNN.md" < /dev/null
echo "exit=$?"   # 2: failed round (length or Codex event checks); 3: the reviewer is out of usage
```

With `--out`, Codex also saves `<out>.events.jsonl`, recording what the reviewer read and ran; treat it like the report and never commit it.

`--subject` takes a git range, `<sha>^!` for one commit or `HEAD` before the first release. The wrapper refuses an empty subject, a range without a start, or one with no commits and a clean tree. Keep the brief, report and events outside the repository. The wrapper writes the range's log, diffs and working tree, including untracked files, into the git directory for the reviewer.

**A range that contains a merge also carries the range's cumulative diff.** `git log -p` shows merge commits without their diffs, omitting conflict resolutions or edits inside merges. The wrapper adds the cumulative diff for `A..B` and `<sha>^!`. A bare ref such as `HEAD` needs none: its subject includes every held file and every line removed in history. It warns on any other range shape. Each commit's change appears again, nearly doubling the subject; size the round accordingly.

**Send the net diff when a range wrote code and later removed it.** With an `A..B` or `<sha>^!` subject, `--net` keeps the one-line commit list and replaces each commit's patch with the range's cumulative diff and every line its history removed, which a push still sends. `--exclude <glob>`, repeatable, leaves out paths that are not the change, such as working notes from earlier series.

**Use the repository's runnable fallback when the default reviewer cannot run.** Pick `--reviewer codex`, `claude` or `grok` as needed, and pass the confirmed review model with `--model`. See `references/reviewer-clis.md` for CLI flags, Windows setup and the event checks.

**An installed reviewer can still be out of usage.** Exit 3 prints the same round with the next installed reviewer, or the `--subject-only` route if none is installed. Use the repository's qualifying fallback and its model, or use the printed fallback without asking. A fresh session of the builder's family can run when no other family can. Record the reviewer and reason (§ Reviewer selection and isolation).

**With none of the three CLIs, give the wrapper's prompt to a fresh separate process.** Use `--subject-only` with `--brief`, `--cwd` and `--subject` as above. It writes the subject and prompt into the git directory and prints their paths. The prompt contains the brief plus paging instructions. Give it to a fresh read-only session of your agent, started as a separate process in the checkout under review. Never use a subagent, fork or resumed session of this one. Require read-only tools, no MCP servers or connectors, high reasoning effort or above, and memory off where it allows. Switch off project and personal instructions where allowed. In a review worktree, the git directory is outside the checkout; give read access there, never write.

Where no fresh session can be started, stop and hand the owner the prompt path. The round has not run until a fresh session answers. Apply the same report and evidence checks as below. Delete both files when the round ends.

**Check what the reviewer actually read before accepting any round.** Open the report and saved read evidence. Apply `references/reviewer-clis.md` when a reviewer needs manual setup or a round fails at the CLI.

- **A short clean round is a failed round.** A reviewer unable to use its tools, such as Grok without `--always-approve`, can exit 0 after a sentence of preamble. That reads like "found nothing". A genuinely empty round argues its way there over paragraphs. Require it to say what it read, what it expected to find and why it holds. The wrapper fails output under 1,500 characters with exit 2; measure a manual round the same way. Accept a shorter round by hand only when its saved events (`--out`) show commands that printed the subject's content and the report names what it read.
- **A round whose reviewer couldn't read is failed however long it is.** Refused reads, such as "blocked by policy", without any successful reads mean nothing was reviewed. So does an answer saying it could not open the files. A refused write is different: the read-only sandbox is doing its job. For Codex, the wrapper fails a round with no successful command and lists failed commands for you to judge. Check the same evidence in a manual run; opening, listing and searching files are reads.
- **A round takes minutes at a high effort.** Run it in the background.

**A round can fail by running out of room, leaving the same short output.** Read its log. Memory flushes distinguish context exhaustion from a reviewer that read nothing. Split a large phase subject by its stages' commits or area; never shorten the range. Keep and verify findings emitted before failure.

## Keep the subject still

**Review in a still checkout for the length of the round.** Use the current checkout for serial review and keep it still throughout. For a phase or advisory stage round that overlaps another build, follow `references/overlapping-phases.md`. It isolates the exact snapshot, preserves the full gate and release go, and protects linked dependencies when removing the worktree.

**Commit means "reviewed from here". Push means "this round is closed".** Local history is working state; a deploying branch receives only the state a closing series cleared. Advisory stage rounds clear nothing; before hosting, a phase can remain local. A production push remains a release and requires the owner's go.

**A push can have side effects beyond the deploy.** An integration may apply migrations, or a hook may publish. Complete prerequisites before pushing, such as applying and verifying migrations by hand, so the push finds nothing pending. A production migration also waits for the owner's go; apply `release-gate`. Keep files you do not intend to run out of any integration's pickup location.

**the whole-range round before a release still runs against a still tree.** Parallel review finds issues against code that has moved; fixes land on a changed tree. A structural finding can cost the newer work. That trade is fair at a phase boundary with a settled foundation, never at the end. The whole-range round must see everything together.

## Writing the brief

**Write only these five parts, in this order, to avoid steering.**

1. Say what the product is in two sentences. Name its binding spec files, such as agent instructions and architecture docs. Explain how its pieces fit: trust boundaries, ownership and where writes go. A diff alone cannot show interactions.
2. Paste the subject from the git commands above, naming the earlier range as context.
3. Give the usage model: who uses which surface, how many and at what moment. State what stays serious however exotic the trigger. For most products: another tenant's data, private data on a public surface, lost or duplicated writes, anonymous access to a member capability. State what does not block, such as cosmetic divergence the next refresh fixes. When information is hidden from users, explain from whom, why, what honest users might expose accidentally, and what requires deliberately defeating their own measurement (§ Triage).
4. Ask what would block or break this release. Label every finding INTRODUCED or PRE-EXISTING. Require the literal triggering sequence and who performs it. A finding unable to name its trigger usually has none; requiring it exposes over-claiming before a fix is briefed.
5. Request a numbered list: claim, `file:line` evidence, what to change. Keep it terse, without praise, ranked. End with those most likely to bite.

Do not include earlier findings, suspected files, your argument for the design, or a request for approval. A reviewer asked whether it approves will tell you it approves.

## Triage — the part that goes wrong

**Question zero, before any other: say in ONE SENTENCE what actually goes wrong for the person.** If it does not sound bad read aloud, there is nothing to fix. "You land on one of your own items that a filter was hiding" dies unaided. The reviewer's severity label is part of its claim, and taking one at face value is how a clean release grows two invented P1s.

**Weigh how often a finding happens before fixing it, and prefer a simpler assumption.** A reviewer reports what the code permits, not what people hit, and its severity is a claim like the rest; check both, whichever model it is. A failure seen in real use outranks a finding read out of code. A trigger that needs two uncommon conditions at once is Low unless it crosses a line below. When a fix would add machinery for a case almost nobody meets and no such line is crossed, state the limit, drop the case or refuse it with a clear message instead, and tell the owner. A system most people can understand beats one that serves every case.

**A trigger that needs a rare precondition is Low.** The usual ones:

- two people, apps or views of one app acting on the same work at once;
- a system or environment failure, at the instant of an act or lasting;
- two acts within the same second;
- the person removing what running work stands on, such as deleting or restarting it mid-run;
- state that only an unreleased build could have written;
- a device or width the product does not support.

The exception is crossing one of the lines below, such as lost work or an irreversible external write the person did not approve or had stopped. A stated limit is safe when the case stops loudly, with a refusal or a state the person can see and repair, and never produces a wrong result silently. Refusing at the door while the work runs is often the cheapest. Write each limit where the product keeps its assumptions, so a later round's report of the same case is matched against it rather than fixed.

**Record each finding's harm, who hits it and how often, and the line it crosses.** Write one sentence for each before the verdict, which follows from them; the reviewer's label is one more claim. Judge them by the usage model the brief gave the reviewer (§ Writing the brief). A finding a later round reports again keeps its recorded verdict unless new evidence changes it. A principle with no place to write it down gets skipped under time pressure.

**does anything cross a line the person cares about?** Examples are another tenant's data, private data on a public surface, another user's private content, disappearing work, lost writes, an irreversible external write the person did not approve or had stopped, or anonymous access to a member capability. If everything already belongs to the person and stays visible, it is a surprise; a surprise is polish. Distrust a real mechanism with a scary label and speculative harm. Ask whether the person can see where they are. Builder reports and reviewer priorities are both claims; neither model decides.

**Require literal steps, permitted execution and a person with a reason.** A finding that cannot answer these three questions is not a finding:

1. **What exact sequence produces it?** Not "an attacker could": literal steps in order.
2. **Does this system permit that sequence?** Check the code that must allow it. This is where most die.
3. **Who does it, and why?** If it needs someone already holding the owner's session on the owner's own screen, they had the screen.

**A layout or performance claim is settled on the running build, not by re-reading the file — in either direction.** Stylesheet arithmetic may be right while the conclusion is false. A flex item's automatic minimum is its content; cells wider on paper than their container can shrink rather than overflow. "Obviously it shrinks" is as speculative as "obviously it overflows": measure before accepting or rejecting. Measure visible text against neighbours in the same column, not the named container. The defect itself can produce matching box edges. Measure performance on both builds, with the baseline built from `HEAD` in its own worktree. Let the numbers retire the fix.

**When findings cluster, look for one false premise underneath before fixing any of them.**

**Rank by what it costs this product, not by where it sits in the list.** Read user and business impact: who sees it, how many and at what moment. A widely seen instruction failing at a critical moment can cost more than its mechanism suggests. A recoverable flow one admin meets once can cost less than its label. When a rule hides information from product users, grade further probes by harm to an honest user. A probe usable only by someone deliberately defeating their own measurement is Low. They hide information from themselves, then seek it out.

**A fix has a price, and the price compounds.** A confirmed defect is still a decision. Watch for rounds getting narrower, each trigger needing more actors or more precise interleaving. That finds what code permits rather than what users hit. Ask aloud what the fix costs to understand next year, by someone who was not here. State the residue's price plainly. If acceptable, write that down and stop. Ask whether the fix replaces a mechanism or adds one. Replacement is usually right; a special case per round compounds the problem.

**Accepting a finding is a legitimate outcome.** A rarely-wrong rule somebody can hold in their head beats an always-right one nobody can.

**A fix that did not need to happen is itself a defect.** Weigh branches, permanent complexity and new review surface against the occasional actual harm. Run the fix's regression test on the tree before the fix. If it passes, the finding was false: revert the fix and keep the assertion. Apply `test-harness` for that rule.

**Prefer removing the rare case to supporting it.** Constrain input, refuse the state, drop the option or choose a default that cannot produce it. An unreachable case needs no code, test or comment and cannot interact with the next fix. Ask whether it must exist before writing its branch. Only then weigh fixing against accepting the residue.

**Beware the fix that opens a door.** Two conditions right alone can be wrong together. Continue the loop past the fix that felt final.

**Fix the class, not the instance.** When a finding resembles an earlier one, say so in the next brief and ask for the audit.

**When a repair writes a field that says who decided, scope it by the subject** (this participant, this item), never by the rows' current state. A state filter skips exactly the rows another actor already decided.

**When the actor is an attacker, ask whether the finding adds a capability the attacker does not already have in that position.** A mechanism granting nothing new is a description, not a vulnerability; question 2 above passes too easily here. Watch for reasoning from one entry point without reading neighbouring rows in the permission table.

**Improve the average; the exception is the person's work.** Polish serves the case most people meet, letting the rest degrade honestly with geometry intact. Use a same-size placeholder so nothing jumps when the real thing arrives. Anything losing or duplicating what a person made gets full treatment, however rare.

**Say it plainly when a round is empty after triage.** "Three findings, none survive the usage model" is a result, expected on a well-built change.

**Read a clean round's argument, not only its verdict.** Code cited to prove safety can expose the same defect one surface over.

**When a round changes one user-facing sentence, read its neighbours and the assertions around its pin.** A repair can distract from a nearby claim it just made false.

**Search every doc when a state they all describe changes.** When production exists or a feature goes live, find old-state phrases and fix them in one pass. Do not stop at the line the round named. When a rule is repealed, find sentences that argued for it: comments, fixtures and doc paragraphs. Ask what each still holds up.

**Repair a drifted pair by copying the sentence that is right into the place that is wrong.** Never write a third version; pin their agreement in the same change.

**When a repair delegates behaviour to the platform, enumerate what the old code decided.** A deleted handler takes its judgement with it; the diff shows only deletion. When replacing a control, inspect its odd attributes: `aria-disabled` where `disabled` would do, or a seemingly redundant handler. Grep deleted lines for the comment arguing for them.

## The stopping rule

**Stop at no INTRODUCED finding above Low and no High or Critical of any age.** A finding's level is the one Triage gives it, not the reviewer's label. Fix High and Critical now, regardless of age. Small releases reach that bar fastest; later releases review only their own commits.

**A Low goes to the owner's list, not into the loop.** An introduced Low needs no fix and opens no round. Record it with its round number where pre-existing findings are recorded, and name it in the summary to the owner. Fix one only in a batch that already needs another round, or when the owner asks. Any fix is new code and gets a round.

**When one mechanism draws findings two rounds running, stop patching it.** Repeated inverse defects in one area mean the design is wrong. Before the next round, choose one option in writing:

- Cut it: revert to before the first fix, then ask once what signal the design is missing.
- **Redesign it once.** Write the redesign before building it. It earns that attempt only by removing machinery. A redesign more elaborate than what it replaces repeats the problem. There is no third design: if the redesign added machinery, or the next round finds another finding above Low in the same mechanism, the choice goes to the owner as cut or pause.
- Pause it: when one surface keeps drawing new Highs while the rest of the change is clean, propose to the owner, at the second such round, that it ships behind a switch that is off by default, its open findings in the backlog with the trigger that reopens them, and the next round scoped to what is reachable with it off.

Scale this by whether the work was requested. Apply it hardest to unrequested hardening, lightest to a feature the owner asked for by name.

**Budget for a fix commit's own round in ingest, queue and concurrency code.** When planning, allow for that tendency.

**Record pre-existing findings with their deferral reason and a revisit trigger.** Include the trigger because it is what gets the finding fixed. Use the repository's backlog file or issue tracker; ask if it names none. High and Critical are the exception: fix them now, regardless of age. Never silently drop a finding. The release summary states each round's finding count and what happened to each, including those not worth fixing and why.

**Number rounds in one sequence per repository.** Cite the number wherever the outcome lands: fix commit, backlog row, merge and release record.

**Verify every finding against code by hand before acting.** Cited line numbers are claims too, and so is the INTRODUCED label: check it against the released text (`git show <release>:<file>`). Rerun the tests the fix touches yourself after every fix; "it says it passes" is a claim, never a result. Record disproved findings as wrong beside confirmed ones, making the next round's hit rate legible.

Each rule's origin, the case that taught it, is in `receipts.md` beside this file; read it when a rule's edge is unclear.

## How you can tell it worked

The last round came from a fresh reviewer given only the mechanical range and found no introduced finding above Low, with nothing fixed after it. No High or Critical of any age is open; every earlier finding was checked against code before being fixed or dismissed, and accepted Lows are recorded.

## Not this skill

**Bring in a peer early for design or arguing a decision through.** Apply `codex-agents`, `claude-agents` or `grok-agents`; this skill reviews what was built.

**Use the related skills for CLI mechanics, delegation and reading defects.** Apply those three skills to drive Grok, Claude Code or Codex from another agent in any role, including reviewer. Apply `delegation` for briefing and verifying any delegate, and `code-review` for reading code for defects.

Adapted from [Pawel Huryn’s upstream skill](https://github.com/phuryn/product-engineering/tree/8ebb50bb1b28dc9e8bc669199493e6020b808cc6/ai-shipping/skills/independent-review).
