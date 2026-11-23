# The product plan

**What it is for:** the phases and stages that carry the product from its first screen to release and beyond, each with its scope and status. **The status lives here, and only here.**

**Read it** when planning the next stage, when asked what is done or what comes next, and at every release.

**Rules**

- **Phases start from the default stages** (`stages.md`) **or from a capability row** (`capabilities.md`). A product's plan may merge, split or reorder the default stages; its plan wins.
- **Stage skips and deferrals name the owner's decision and return trigger.** A broad go does not waive an unnamed stage. For example: "Owner deferred browser permission proof until the second role exists; resume before that role ships." (`2026-11-14`, an evals product: browser proof stayed "not started", behind later product work, with no owner deferral.)
- **Each stage states its own done-when: what a person can check when it is finished.** The default stages' done-whens are a starting point; write the product's own.
- **State the phase split, cadence and builder-hour estimate in the plan message.** The coordinator chooses boundaries for what agents can handle, what slows them down and what improves quality. Apply `independent-review` for cadence; two to four phases usually fit a first version. The suggested SaaS grouping is stages 0–3, 4–7 and 8–9, not a mandate. Put phase boundaries at deploying pushes: a phase that spans one gets a review round in its middle. (`2026-11-16`, owner: trust the agent to propose the exact split; three phases may be a suggestion.)
- **Estimate the whole plan and each part in rough builder hours.** Label estimates as estimates. Take each number from a recorded phase of the same shape and name it (the `flight-deck` skill records them), or call it an assumption. A build of another shape is no basis. Count measured full gate runs and the review series in phase estimates, including a gate rerun after fixes when needed. Stage estimates count touched tests and coordinator checks. Options put to the owner also show their rough builder-hour estimate and lasting service, store, job or vendor obligations beside each option. State elapsed-time costs separately when they differ. (`2026-11-13`, a coding-agent client: full gates estimated at 25–42 minutes ran 3–4 times per delegated piece; one stage rose from six hours to 12.5. `2026-11-16`, a live Q&A product: six roughly one-hour stages made a phase; gates consumed 110 of the first three stages' 301 critical-path minutes. `2026-11-20`, an agent product's editor extension: a small build estimated at 31.75 to 58.5 hours from a large cross-repository build's numbers took 4; its pieces took 20 to 28 minutes against 0.5 to 3.5 hours assumed, its full check 167 seconds against 51 minutes.)
- **Keep stage checks light and complete the phase checks in order.** Schedule touched tests and coordinator checks for each stage, then the full gate, visual checks, docs check and fresh review series before the closing push and preview. Apply `release-gate` § Stage and phase close.
- **Keep owner-tried status on each visible phase, separate from technical completion.** Awaiting a preview does not hold the next runnable phase. Keep explicit owner-only done-when evidence open, with technical readiness recorded separately. Feedback becomes stages of the phase in flight; only exclusive owner decisions wait. Stage 3 retains its sample-data owner click-through done-when. The release go message names every visible phase not tried. (`2026-11-16`, owner: "most of the time I’m not here, and that shouldn’t block coding agents.")
- **Each stage line names its journeys, specs and evidence for completion.** Include scope, done-when, status and the brief: active while in flight, archived when done (`stage-brief.md`). At stage end, mark it done against its done-when or state what keeps it open. List the journeys it changes and their committed end-to-end specs; stages adding no journey say so. (`2026-11-14`, an evals product: "click-through pending" survived for weeks while later stages proceeded; none was closed against its done-when.)
- **The status lives here.** The product section of the agent instructions carries at most three lines of it, with a link back.
- **The narrative of what each release shipped** — what it contained, what its review rounds and gates found — **moves to the release history at the next release.** The rules a release taught go into the agent instructions; the story does not.
- **Planned capabilities stay explicitly planned.** A row that is proposed or in flight is never written as though it exists.

## Skeleton — copy from here

```markdown
# Product plan

The phases and stages that carry the product from its first screen to release and beyond, each with its scope and status. Read it when planning the next stage, when asked what is done or what comes next, and at every release. **The status lives here.** The product section of the agent instructions carries at most three lines of it with a link back, and the narrative of what each release shipped moves to <release history path> at the next release.

## Status

<One short paragraph: the current phase and stage, what is in production, what is not, and what is waiting on whom. Planned capabilities stay explicitly planned.>

Estimated total: <rough builder hours, labelled estimate>. Parts: <rough builder-hour estimates>.

Cadence: <chosen phase split; coordinator stage checks and full phase close per release-gate § Stage and phase close>. Contract: <applicable suites; any owner-chosen omissions, reason and revisit trigger>. One full gate run: <measured duration>.

## Phases

### Phase 1 — <scope>

Estimate: <rough builder hours, labelled estimate>. Done when: <clickable, deployable state and phase-check evidence>. Status: <not started | in flight | technically ready, evidence | complete, evidence>. Owner preview: <not tried | tried, date and feedback>.

- <stage> — <scope>. Estimate: <rough builder hours>. Journeys → specs: <flows-doc journeys and committed end-to-end spec paths, or none changed>. Done when: <what a person can check>. Status: <not started | in flight (what keeps it open) | done (date, evidence) | deferred (owner decision, return trigger)>. Brief: <active or archived path>.
- <stage> — …

### Phase 2 — <scope>

Estimate: <rough builder hours, labelled estimate>. Done when: <clickable, deployable state and phase-check evidence>. Status: <not started | in flight | technically ready, evidence | complete, evidence>. Owner preview: <not tried | tried, date and feedback>.

- …
```

## A filled stage line, by kind

The first real slice — sign-in landing on the member home, workspaces, a host's rooms, the public room page, questions and upvotes.
Journeys → specs: sign-in and room ownership → `tests/e2e/rooms.auth.spec.ts`; anonymous participation → `tests/e2e/participation.spec.ts`.
Done when: hosts cannot see each other's rooms; anonymous phone users can ask and upvote once; submitted `<script>` renders as text.
The signed-in suite passes twice consecutively, touched tests pass, and the five core docs describe the slice.
Status: done (<date>, <touched-test log>, <diff and docs evidence>, <coordinator screen look>). Brief: <archived brief>.
