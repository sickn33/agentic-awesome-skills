---
name: code-review
description: '''Review this'', ''find bugs'', ''is this fix safe'': review code for defects that matter, correctness first, each finding refuted before it''s reported.'
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

# Code Review

## Operational boundaries

Keep the scope, sandbox, credentials and approval settings supplied by the user or host. Obtain authorization before delegating, exposing project files to another provider, enabling connectors or hooks, using paid services or deploying. Use synthetic or redacted inputs for examples. Keep security reviews static and defensive, with findings and fixes grounded in source inspection.

## When to Use

'Review this', 'find bugs', 'is this fix safe': review code for defects that matter, correctness first, each finding refuted before it's reported.


## Purpose

**Review for supported defects with concrete consequences and checked counterarguments.** Most review output is noise: unranked suspicions that cannot be acted on. Each finding here needs required behaviour, a feasible trigger, a concrete contradiction, an observable consequence and the strongest counterargument checked.

**the defects reviewers miss are rarely visible inside one file.** They are disagreements between participants that each look reasonable alone. Examples include caller and callee, producer and consumer, writer and later reader, or branches that should establish the same state. A file-by-file checklist never holds both halves together. Review the agreement, not the file.

## Structure: one engine, three anchors

**Use correctness as the core, with performance and security as sub-cases.** Generic tooling covers correctness worst. Each sub-case uses the same engine, refutation discipline and report contract. Only its anchor and one or two extra rules differ.

| Sub-case | Anchor | Where its rules live |
|---|---|---|
| Correctness *(core, default)* | Agreements between participants across a boundary | This file + `references/correctness-taxonomy.md` |
| Performance | Workload → resource demand → growth or contention → consequence | `references/performance-review.md` |
| Security | Source → trust boundary → sink, with an attacker controlling the source | `references/security-review.md` |

**Read a sub-case's file only when that sub-case is selected.** Its short file states what differs; the rest of this file still applies. Sub-cases activate independently, not exclusively. Report one root cause once, with both impacts when it carries correctness and security impact.

## Invocation

**State the selected dimensions, the scope and the comparison baseline before investigating.** These are instruction arguments, not shell flags:

```
code-review
code-review dimensions=correctness scope=changes
code-review dimensions=performance,security
code-review dimensions=all
```

Claude Code ships its own bundled `/code-review`. Use the plugin-qualified form above when you mean this one.

- Bare "review this" or "find bugs" means correctness only.
- An explicit list selects exactly those sub-cases; `all` selects three. Never silently reinterpret an unknown or empty selection — ask.
- Use the scope asked for. Otherwise review working changes if present, else the repository.
- When reviewing changes, follow dependencies beyond changed lines. Distinguish defects the change introduced from defects it merely revealed.
- Review and report. Apply fixes only when asked.

## Shared engine

**Map the flow, establish an obligation and try to refute its violation.** Every sub-case uses this sequence; only its anchor and refutation rules differ:

Map a flow → identify an obligation → inspect every participant → construct a violating execution → trace the consequence → attempt refutation → report.

Build one minimal map first: inputs, major execution flows, state owners, external dependencies and observable effects. Enrich it for each selected sub-case. Do not build three maps or make a security-only run wait on correctness mapping.

## Correctness: the agreement engine

**Track consequential agreements across semantic boundaries, not just file splits.** A boundary separates caller and callee, callbacks, executions of one function, producer and consumer, or a value written now and read later.

For each consequential agreement, hold these in working notes, not the report:

```
Participants:
Value, entity or effect exchanged:
Authority (who decides the real answer):
Identity and lifetime/version:
Required relationship:
Evidence for that relationship:
Relevant transitions or orderings:
Observable consumer or consequence:
```

**Establish the obligation without inventing intent.** Use specifications, documented contracts, language or protocol semantics, tests encoding expectations, or a necessary producer/consumer relationship. A consumer's implementation alone does not prove the consumer is right. When participants disagree, explain why the outcome is wrong. The contradiction may be certain while which side should change remains open. Missing documentation is a limitation, not automatically a finding.

**Start where agreements are most likely to break.** Inspect transformed or negotiated values, reassigned identities, asynchronous work, persisted and reloaded state, and several effects that must agree. Then inspect ordinary local decisions, arithmetic, boundaries and error branches. The anchor must not discard plain bugs.

### Force a violating execution

**Construct the execution that breaks a suspicion before calling it a finding.** Where the implementation permits:

- make a requested value differ from the accepted or effective one;
- keep two operations live at once and vary their completion order;
- change the relevant identity or generation between observation and use;
- compare distinct transitions that should end in equivalent state;
- inject failure between effects, and interruption before completion;
- exercise empty, exact-boundary and adjacent-boundary inputs.

Establish that each case is actually reachable. Do not assume it.

For a non-idempotent external create, check each write's durable state before and after, and probe a rerun at each crash point. Apply the `test-harness` skill's `references/external-creates.md`.

### Two lenses that need a forced probe, not a mention

**Probe authority reconciliation and identity correlation explicitly.** Strong agents almost never even report these two classes: they miss them at the look, not at the fix. Naming them in a checklist does not make agents inspect them.

1. **Authority reconciliation.** Follow a proposed value through validation, normalisation, negotiation or commit. Find downstream state still derived from the proposal where the authority can return something different. A requested value is not an applied value. Force them apart and ask what still reads the request.
2. **Identity and correlation.** Trace how an operation's result finds its originating entity. Establish that the key stays unique, stable and live long enough under overlap, reordering, removal and reuse. A label, position or arrival order is suspicious exactly when those properties can fail. Run two operations concurrently and complete them out of order.

The full thirteen diagnostic lenses, each with a detection tell, are in `references/correctness-taxonomy.md`. They overlap; they are not a quota to fill.

## Refutation: the discipline that makes this worth running

**Require all five elements before promoting a candidate to a finding.** Each finding needs:

1. A supported obligation: what must hold, and on what evidence.
2. A feasible execution: inputs, state and ordering the real system permits.
3. A concrete contradiction: where the obligation fails.
4. An observable consequence: wrong output, state, effect, completion or progress.
5. An examined counterargument: the strongest mechanism that would prevent or repair it.

Actively hunt for the refutation. Look for an enclosing guarantee making the execution impossible, synchronisation excluding the interleaving, or reconciliation before any consequential read. Also check intentional contracts, input-excluding preconditions and a different responsible owner.

| Outcome | Rule |
|---|---|
| Keep | Evidence establishes the defect; the checked counterargument does not prevent it. |
| Drop | Cited evidence defeats the execution, obligation or consequence. |
| Unresolved | An essential contract or runtime fact is unknown. List it separately from findings. |

**A correctness defect can harm only the person who triggered it and still be serious.** Do not import security's attacker/victim test into correctness. "Keep unless disproved" is also too permissive: an ungrounded suspicion without a constructed execution is not a finding. When both sub-cases are active, apply each test only to its own dimension.

**Absorption is not prevention.** A cache that usually holds, retry that usually succeeds or default that is usually right can hide a defect downstream. That is a coincidence with good odds, not a guarantee. It fails when the absorber is cold, evicted or reconfigured. Drop only on a mechanism that makes the execution impossible, and name that mechanism.

**"it works nearly always" describes a race, not a refutation.** A timing window that usually resolves correctly is a finding. Having to reason about which side usually wins is the evidence.

**A rare finding is still a finding; its fix is a choice.** Say how often the trigger happens and who meets it. Then name the simplest way out: narrow an assumption, drop the case, or refuse it with a clear message, beside the fix. A fix that adds machinery for a case almost nobody meets costs more than it saves, unless the case crosses a line such as lost data or a leaked secret (`independent-review` § Triage).

**Deduplicate by violated agreement and root cause, never by file.** Passing tests, unfamiliar code, a suspicious name, a missing test and a sibling difference warrant investigation. None is proof, and none is refutation. There is no findings quota; zero supported findings is valid.

## Parallelism

**Partition complete flows or connected agreement groups, never files or taxonomy classes.** File partitions hide the cross-boundary defects the review should find.

1. The coordinator builds the initial map and identifies shared state.
2. Each worker gets a bounded flow, its participants, selected sub-cases and open questions.
3. Workers inspect both sides of their agreements and may follow dependencies outside their list.
4. Workers return candidates, cited evidence, completed refutations and unresolved relationships.
5. The coordinator reconciles assumptions and relationships crossing assignments.
6. Strong candidates get a separate verification pass before reporting.

**Allow overlapping reads.** Reading the same authority twice costs less than either worker holding half its contract. Keep integration capacity in reserve: a relationship spanning assignments stays unexamined until someone closes it. Target one fan-out level. When delegation is unavailable or the scope is small, run the same procedure sequentially.

**Run workers on the strongest model available, and match the current session's effort level.** Recall comes first: a missed cross-boundary flow is the costly failure. A cheaper model or lower effort can lose one. Report which workers were rerouted or downgraded; otherwise readers will misjudge coverage.

**One model. Name it on every worker.** Pass the coordinator's own model explicitly on each spawn. Fan-out buys coverage, not a second opinion. "Inherit" is not a routing decision. Never bring in a different model to review or cross-check unless explicitly asked. Mixing models makes results unattributable; a foreign worker invalidates a comparison across models. The `independent-review` skill supplies the separate pass called by `release-gate` and the ship check's Step 6. This skill never reaches for it on its own.

**Tell workers they are reading, not editing.** They need read, search and navigation access, and must not modify the tree. State that in their instructions rather than assuming host enforcement. Editing silently repairs what workers should report and prevents checking findings against the described code. Confirm the tree is unchanged when the run ends.

## Report

**Lead with supported findings ordered by impact, separating severity from evidential strength.** Use this contract:

```
Review scope:
Comparison baseline:
Selected dimensions:

[Severity] [Dimension] Concrete consequence
  Expectation:  required behaviour, and the evidence for it
  Trigger:      feasible preconditions and execution
  Defect:       the violated relationship
  Evidence:     source locations for EVERY participant
  Impact:       observable consequence and affected scope
  Refutation:   strongest counterargument checked, and why it fails
  Remedy:       minimal correction to the violated relationship
  Verification: what was executed, versus established from source

Coverage:
Unexamined areas and essential unknowns:
```

Cite both participants for a cross-boundary defect. Do not group findings only by file; that hides the relationship being reviewed.

**Coverage means work performed, not boxes ticked.** Report each selected sub-case as examined with supported findings; examined, none supported; not applicable, with reason; or not examined, with reason. Zero findings does not mean "not covered", and ticks are not completeness evidence. Say "no supported findings in the examined scope", never that the code is bug-free.

Each rule's origin, the case that taught it, is in `receipts.md` beside this file; read it when a rule's edge is unclear.

## How you can tell it worked

Every finding names an execution that breaks an agreement, survived its own refutation, and cites both sides with file and line; nothing reported is style.

## Notes

**State what is well built and the limits of static review.** A review that only accuses is easy to dismiss. Static review produces code-review findings, not confirmed exploits or measured regressions.

**Apply a sub-case's mature skill when that sub-case is the whole job.** Apply `security-audit-static` for trust boundaries, sinks and the OWASP backstop, or `performance-audit-static` for over-fetching, indexes and caching. Use its reference file when it is one dimension of a broader review; this skill does not restate either. For the doc-vs-code axis, apply the `intended-vs-implemented` skill.

## Limitations

Static review covers the available source and configuration. Record omitted files, missing runtime evidence and topics requiring qualified review. Treat tool output as evidence to verify.

Adapted from [Pawel Huryn’s upstream skill](https://github.com/phuryn/product-engineering/tree/8ebb50bb1b28dc9e8bc669199493e6020b808cc6/ai-shipping/skills/code-review).
