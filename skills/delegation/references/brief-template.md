# A brief's skeleton, and the handoff that comes back

Copy, fill, delete what doesn't apply. Order matters: the goal comes first because it is the part a delegate cannot reconstruct from the code.

```markdown
## Goal — what we're trying to achieve, and why
<The outcome in the owner's terms: who it is for and what changes for them.
 The decision this feeds, if any: "we are choosing between A and B".>

## Where things stand
<What is known, with the evidence compressed: three lines of log, the failing
 test's name, the file and line you suspect. Paste the artifact, not a
 description of it. Name what you already ruled out and why. For a feature that
 guesses from real-world input, the numbers from running today's code on a
 real corpus. Prior art from another product that solved the same surface:
 what it learned, the files to read (read-only), and what doesn't apply here.>

## Constraints that bind
<The rules the code alone doesn't show: invariants, trust boundaries, a
 contract mirrored elsewhere, files that are generated and never hand-edited,
 what may not be touched (commits, pushes, migrations, production). For a stage
 built beside others: the shared numbers it takes (its migration number and
 timestamp floor), which migrations are applied and which only written. The
 rules review rounds taught since this brief was first written, or the file
 that holds them, folded in before the builder starts: a builder working from
 an older brief repeats what those rounds fixed. Who commits: where the
 builder's sandbox can't write the main checkout's git directory (a linked
 worktree's index lives there), you do. For a change with screens: the `ui-design`
 skill by name, from the pack installed in the builder ($app-stack:ui-design in
 Codex), the jobs map rows it serves, and the data rules that stay out of the
 copy.>

## Traps
<The plausible fixes that would be wrong, and why: "do not fix this in X —
 the same value feeds Y". This section is where a long brief earns out.>

## Load-bearing claims to check
<Any claim your conclusion will rest on. Ask the delegate to confirm or refute
 it against a primary source, not to assume it.>

## Builder boundaries
You never deploy, apply migrations, push, change a provider setting or secret,
or read production credentials. Only one agent runs suites on shared
development data at a time; coordinate the window with the session agent.
Hand new migrations to the session agent to apply to development before
running the tests that need them. Run tests on development with dedicated
test accounts, fixing failures before handoff.
<For a Codex build running tests: --sandbox danger-full-access runs without
 a sandbox; these instructions are its boundary. The owner may choose
 another boundary; record any checks handed back and their concrete blocker.>

## What stays with me
<Deploys, promotions, pushes, applied migrations, persistent servers, workers,
 provider settings, secrets, drills and production credentials, including
 development operational changes. Suite runs and their test servers and
 fixtures are delegated within the boundaries above. Make each operational
 step one command and name it.>

## How it's proved — done, for this hand-off
<What the delegate can finish where it runs: the code, its tests run and fixed,
 current doc lines, the handoff. Name each changed journey and its committed
 end-to-end spec. Where the tool/platform cannot run a suite, name the
 concrete blocker and who runs it: "write it; I run it". Exercise every
 existing page and function the stage touches, not only the new ones. The
 stage's own done-when, when it needs real systems, stays with me.>

## Scope
<The files or area it may change. The range under review, named as a git
 range (`<last-reviewed>..HEAD`), never a pinned commit in a reusable brief.>

## Added while you build
<Dated, appended when a fact changes mid-build; never a side message.>
```

What a brief does **not** carry: a step-by-step procedure, prescribed filenames or libraries that are not hard constraints, your argument for why the design is right (for a reviewer, that is steering), or what an earlier reviewer found (for a fresh review round, `independent-review` § Writing the brief).

## The handoff the delegate writes

Ask for it by name in the brief, as a file beside the brief. Each part is there because a handoff without it once cost a round or a day:

```markdown
<Status line, added by you when you take it over: dated — merged, reviewed in
 which rounds, deployed where, what still waits.>

Branch and base. Which development suites it ran and which systems they
touched; no operational changes. "This is a
code handoff, not the stage done."

## Built
## Choices where the brief was silent      <each with its reason>
## Where the spec needs correcting         <with the vendor docs that say so>
## Decisions this brief forced             <product decisions the owner should
                                            make, kept apart from corrections:
                                            two of the brief's rules that
                                            can't both hold, say>
## Blockers                                <stated as blockers, never as a
                                            claimed fix; an unreproduced bug
                                            stays open, with what to capture
                                            when it recurs>
## Validation actually run                 <commands, exit codes read from the
                                            log, counts; what was written but
                                            not run; any attempt that may have
                                            reached a real system>
## Commands for you                        <each operational step as one command>
## Integration notes                       <for stages built in parallel: what
                                            to merge or apply first>
## Release follow-through                  <what must be redeployed after the
                                            push: a runtime whose code changed>
## Deferred candidates
## Doc mismatches noticed, not caused      <left for the owner, not reconciled>

## Your changes                            <added by you, dated; the
                                            delegate's text above stays as written>
```

(`2026-10-23`, a monitoring product's builder handoffs: one's spec correction — the payment provider's events API names no endpoint and no first-failure time — was carried out the next day; another's release follow-through, "this check code changed: redeploy the probes", was done that night; a third reported an icon bug it could not reproduce as a blocker rather than a fix, and the coordinator's own run with the original bytes did not reproduce it either. `2026-11-01`, an evals product: a builder working from a brief written before three review rounds repeated three mistakes those rounds had fixed, and another's objection, that two of its brief's rules contradicted each other, was a product decision with no section to go in.)
