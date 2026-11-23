# independent-review: receipts

Each heading is a rule from `SKILL.md`, with the case that taught it.

## A fresh session of the builder's own model is independent: it never saw the build.

- `2026-11-14`, owner, on why a fresh Codex session reviews when Grok cannot: "if Grok is not available, also GPT 6.1 Sol [at xhigh] for code reviews. So independent sessions from the same lab and the same model. That's fine." Until then the wrapper went from Grok straight to a fresh Claude Code session. The model is the owner's pick; the reader chooses their own.
- `2026-11-18`, the owner moved builds and reviews to GPT-6.2 Sol at `xhigh` and made a fresh Codex session the default reviewer, replacing Grok.

## A repository ranks its reviewers; it cannot rule out a review.

- `2026-11-06`, owner: "Of course the same family when there is no other".

## Review again after fixing anything a round found.

- `2026-10-22` to `24`, a monitoring product: in about 140 rounds, commit messages name at least seven chains in which a round's finding was caused by the previous round's fix. In one, keeping an incident already open folded a real outage into a seeded test incident, so uptime never dipped; the next round caught it.

## Review the completed phase; test each stage as it lands.

- `2026-11-13`, a coding-agent client with an editor extension, desktop app and phone view built on a local branch in seven stages. Its coordinator ran the full gate 3 to 4 times per delegated piece and a fresh review round per piece. The model worked about 35% of roughly 22 hours: 429 minutes building and 31 reviewing. The rest went to gate runs, review rounds and waiting. Those stages were roughly six-hour builds. One full gate was estimated at 25 to 42 minutes; one stage's estimate rose from 6 hours to 12.5. Four per-piece rounds found 16 real defects, all confirmed and fixed. The reviews were useful; per-stage review costs later findings on a larger diff. Owner: "Checks and review once per stage - YES." "6 stages should be 6 review series. We review till nothing > Low. Low is acceptable."
- `2026-10-11`, owner: "No need to run review every tiny iteration."

- `2026-11-16`, invoices in a live Q&A product: six stages took roughly one builder hour each. The first three used 301 critical-path minutes: build 137, full gates 110, fixes 30, setup and commits 24. Review rounds overlapped the next build and added zero wall time. The earlier stage-review case had roughly six-hour stages. Owner: "a phase is a larger piece of development … we implement something in steps, and after every step we add unit tests. We may also briefly review, but I wouldn’t run full code reviews with a separate session … Only once the entire phase is complete … do we run full tests and a full review on the diff."

## Choose the split and cadence, and state them before building.

- `2026-11-16`, owner: "Rather than prescribing everything I’d rather trust the agent to choose best and propose the exact split that works for it considering what agents can handle and what will slow us down vs. what will improve quality. If you think it’s fine you can suggest three phases for a new product, that can also be a suggestion."
- `2026-11-16`, owner: "Ok phase is one sprint, makes sense. In any case we’re talking about AI not humans so those are not exact analogies."

## Keep coordinator notes out of the review subject until its series closes.

- `2026-11-16`, a live Q&A product: a coordinator's suspected-defect log entered the review subject and steered the reviewer toward those suspicions.

## Read that status for what does not belong, too.

- `2026-10-11`, 364 data files left untracked swelled a round's subject to 89k lines; the round was stopped, the directory deleted and the round run again.

## Split by surface when the history does not partition.

- `2026-10-22`, a monitoring product's first whole-range review, split by surface: the rounds on the public surfaces and on data and screens found a paused component drawn green on the public page and an address that handed its password to every visitor. Three area rounds started at once had all read the last brief written, which is why the wrapper names its prompt and subject files per run.

## Scope the subject by what a reviewer must read, not by file count, and keep generated prose out of it.

- `2026-09-17`, one commit reviewed as code completed; the same commit reviewed with its docs exhausted the round.

## Send the net diff when a range wrote code and later removed it.

- `2026-11-18`, a live Q&A product's last review series covered a range holding code built over three stages and then deleted, and notes commits carrying earlier rounds' findings. The wrapper's subject was 26,205 lines; the net diff without the notes was 4,728, and the coordinator rebuilt it by hand for seven rounds.

## An installed reviewer can still be out of usage.

- `2026-10-31`: a signed-in Grok CLI answered `402 usage balance exhausted`.

## A short clean round is a failed round.

- `2026-09-08`: two such rounds were read as clean before a third, run properly, found a real defect in the commit both had "cleared".
- `2026-11-18`, A hung round for a live Q&A product returned 123 characters with zero commands. Four other short reports had evidence of subject reads and probes. The coordinator accepted those after reading the events.

## A round can fail by running out of room, leaving the same short output.

- `2026-09-17`, a round exhausted context across 77 files and stopped after one real finding.

## A push can have side effects beyond the deploy.

- `2026-09-16`, a migration that could not have applied cleanly was moved out of the migrations directory for exactly this reason.
- `2026-10-22`, a review found a migration revoking two worker boxes' table grants sitting in the migrations directory while both still ran the build that needed them, so the routine push would have applied it early.

## Weigh how often a finding happens before fixing it, and prefer a simpler assumption.

- `2026-11-18`, rounds 160 to 162 on GPT-6.2 Sol rated Medium a second worker starting the same operation of a single-user tool, storage filling between two writes, two reviewers' accounts running out together, and a reviewer searching for a literal secret while stderr went to a shared log. Fixes for the first two went in, and a short-report mechanism grew a new hole each round. The owner asked for the claim and the priority to be checked against how often the case happens, and for simplicity over serving every case: the two fixes became a stated assumption and the mechanism was removed. The rule already stood in this section, but not where the loop says to fix.

## does anything cross a line the person cares about?

- `2026-09-03`, a costly fix was reverted after the owner rejected its claimed High severity.

## A layout or performance claim is settled on the running build, not by re-reading the file — in either direction.

- `2026-09-20`, a reported overflow measured 16px clear at ten widths.
- `2026-09-21`, a full-bleed card's edges matched its neighbours' while its text started at x=14 and theirs at 30.
- `2026-09-25`, a proposed layout-shift fix addressed 0.002 of shift while the real source was a poll.

## When findings cluster, look for one false premise underneath before fixing any of them.

- `Undated`: Three findings in one review came from a single wrong assumption about the product.

## Rank by what it costs this product, not by where it sits in the list.

- `2026-11-04`, an evals product: rounds 27–29 each rated another way to distinguish held-out labels High; two cycles of patches opened the next probe before one simpler rule removed the surface.

## Prefer removing the rare case to supporting it.

- `2026-10-10`, four rounds each patched the last round's guard on a recorded marker; computing the value instead of recording it ended them.
- `2026-10-22`, four rounds each found another encoding in which a stored secret header slipped past a masker; sending that header only to the exact address it was saved for ended them.

## Beware the fix that opens a door.

- `Undated`: One round's guard enabled the next round's theft, and a later guard silently reinstated a defect two rounds older, because two conditions that were each right alone were wrong together. Nothing caught it — not the suite, not the next round. Which is exactly why the loop continues past the fix that felt final.

## When a repair writes a field that says who decided, scope it by the subject

- `2026-09-20`, a live Q&A product, two rounds: a ban's repair re-stamped who hid questions but skipped those the AI moderator had already hidden, leaving the wrong actor.

## When the actor is an attacker, ask whether the finding adds a capability the attacker does not already have in that position.

- `2026-09-04`, a remote-control product: a compromised relay could inject a credential into a desktop machine, which was true step by step; it was gated, the gate needed a fix of its own, and both were reverted once someone read the same table and saw that relay could already send prompts and approve the tool calls they produce. The injected credential granted strictly less.

## Improve the average; the exception is the person's work.

- `2026-08-21`, a transcript cache grew four negotiating mechanisms over one question the host already answered.

## Read a clean round's argument, not only its verdict.

- `2026-09-21`, a live Q&A product: a clean round's citation exposed a neighbouring reopen that left the opened timestamp alone.

## When a round changes one user-facing sentence, read its neighbours and the assertions around its pin.

- `2026-09-17`, three consecutive rounds each found another false sentence beside the previous fix.

## Search every doc when a state they all describe changes.

- `2026-10-24`, a monitoring product: eight rounds in one day each found more lines still describing production as unbuilt; the first sweep by phrase came at the fifth, and later rounds still found stragglers.
- `2026-09-20`, a live Q&A product: a comment arguing for a repealed rule kept a dead fixture item alive, hiding an uncovered screen.

## Repair a drifted pair by copying the sentence that is right into the place that is wrong.

- `2026-09-21`, a live Q&A product, two rounds: rewriting both documents' versions of one rule made it wrong in a new way.

## When a repair delegates behaviour to the platform, enumerate what the old code decided.

- `2026-09-17`, native dialog dismissal lost the guard against closing during an in-flight action.
- `2026-09-20`, a live Q&A product: replacing an `aria-disabled` control with a disabled one lost the native dialog's focus return.

## Stop at no INTRODUCED finding above Low and no High or Critical of any age.

- `2026-10-24`: a monitoring product's five production promotions each closed on such a round, after 9, 5, 1, 2 and 1 rounds. The first, the whole product, took the most; each later one reviewed only its own commits.

## A Low goes to the owner's list, not into the loop.

- `2026-11-13`, owner: "We review till nothing > Low. Low is acceptable."
- `2026-11-19`, an agent product's stage: two of round 7's findings were created by the fix for a Low found in round 6.

## When one mechanism draws findings two rounds running, stop patching it.

- `2026-07-31`, again `2026-08-17`: Machinery added in response to findings produced a new defect in nearly every later round, each fix creating its own inverse; four mechanisms were built and then deleted.
- `2026-11-01`, an evals product: one fallback took six shapes over rounds 5 to 12, each round's Medium introduced by the fix before it; then five rounds in a row found new Highs in one surface, paid production sampling, while the rest was clean, and pausing it behind an off-by-default switch ended the loop three rounds after the pause was first due.
- `2026-10-29` and `30`, this collection's own release review: a landing page's analytics drew findings in eleven of 23 rounds, three of them running at the start, and the loop closed three rounds after the tag's address rewrite came out.
- `Undated`: a feature the owner asked for by name, which this rule once abandoned wrongly.

## Redesign it once.

- `2026-08-20`: a liveness probe that deleted a timeout no value could make right.
- `2026-11-19`, the stage above: the redesign at round 6 added machinery, one more function and a property test of 19,440 cases, and the mechanism drew findings again in rounds 7, 8 and 9. Hence no third design.
- `2026-11-19`, tested against the same rounds: the rule above, read on time, fires at round 5; no third design stops the loop at round 7 and saves rounds 8 and 9, 5 to 7 hours (2 rounds at 2.5 to 3.5 hours).

## Budget for a fix commit's own round in ingest, queue and concurrency code.

- `2026-11-01`, the same product (an evals product): rounds 2 to 4 of its first slice each found a Medium the previous round's fix introduced: an index that no longer matched, a retry split the wrong way round, a cap that moved a trace's clock.

## Record pre-existing findings with their deferral reason and a revisit trigger.

- `2026-10-24`: a Low deferred "until a paid-only location goes live" was closed the day that location went live.

## Number rounds in one sequence per repository.

- `2026-10-22`, three sequences ran on one day, so "round 3" named three different rounds; with one sequence from then on, over a hundred rounds stayed citable.

## A trigger that needs a rare precondition is Low.

- `2026-11-19`, a coordinator's report on one stage of an agent product (an editor extension, a desktop app and a web relay): one mechanism, what happens to a release approval when its conversation is restarted, deleted or fails to load, drew INTRODUCED Mediums by the reviewer's label six rounds running (4, 2, 2, 4, 1 and 2). The late triggers needed two apps acting on the same work at once, or a failure at the instant of a click. Each round's answer was a fuller rule, and its property test grew from 36 shapes to 20,952 cases. The owner: "Overall, remember to simplify assumptions where possible. We do not have to support every bizarre edge case." The product now says that two apps acting on one release at once is not supported, with one test documenting today's behaviour. The external-write exception is `test-harness`'s receipt of `2026-11-18`: recovery after a lost reply or a crash was 16 of 41 findings above Low for a tool that writes to an external API.
- `2026-11-19`, the same coordinator, testing this rule against rounds 4 to 9: the 15 findings labelled INTRODUCED Medium became 6 to 8 that gate. Four of the 15 were the person's own act removing what running work stood on, and that class ended once a correction refused the act at the door while the work ran. "An older install" findings came back in rounds 4 to 8 for a feature in no released version. A chat start failing three times showed that failures last, not only strike at an instant. The first draft gated every irreversible external write; an approved release finishing after a restart in another window crosses no line, while a push after Stop does.

## Record each finding's harm, who hits it and how often, and the line it crosses.

- `2026-11-19`, the same stage: its findings table had columns for introduced or older, severity and cause, and none for how often, so nobody asked for nine rounds. The frequency rule had reached this skill the day before; the coordinator's installed copy was ten days older.
- `2026-11-19`, the same stage: one sign-in defect was rated Low in round 6 and Medium in round 9 by the same verifier. The product's release procedure already handed the reviewer a usage model ("one workspace from one phone or a few tabs; refresh is an acceptable cure for stale state"), and nobody applied it to the findings.
