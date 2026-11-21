---
name: product-engineering-propose
description: '''I have an idea'', ''is this worth building'', ''what next'': research it and propose what to build, with sources and key screens to review. Not for agreed changes or bugs.'
risk: safe
source: https://github.com/phuryn/product-engineering
source_repo: phuryn/product-engineering
source_type: official
license: MIT
license_source: https://github.com/phuryn/product-engineering/blob/8ebb50bb1b28dc9e8bc669199493e6020b808cc6/LICENSE.md
author: Pawel Huryn
upstream_commit: 8ebb50bb1b28dc9e8bc669199493e6020b808cc6
date_added: '2026-11-21'
category: product
---

# Propose — research an idea, then propose what to build

## Operational boundaries

Keep the scope, sandbox, credentials and approval settings supplied by the user or host. Obtain authorization before delegating, exposing project files to another provider, enabling connectors or hooks, using paid services or deploying. Use synthetic or redacted inputs for examples. Keep security reviews static and defensive, with findings and fixes grounded in source inspection.

## When to Use

'I have an idea', 'is this worth building', 'what next': research it and propose what to build, with sources and key screens to review. Not for agreed changes or bugs.


**Research the idea, then propose what to build, interface first.** The owner has an idea, or a product in use needs its next step. Read what the owner shared, find what is missing, set the idea against that evidence, and propose something the owner reviews.

**Every claim is a hypothesis with a source until people use and pay.** What comes out is informed hypotheses, never findings.

**This is not an interview.** Questions come last, and only the ones the evidence cannot decide. An interview sharpens what the owner already thinks; this brings in what the owner doesn't know yet.

**Not for an agreed change, a bug or a small UI change.** Those go straight to a plan or a build, as does anything the owner has already decided and asks to have built.

**The owner decides; the agent owns the evidence.** The owner owns the thesis, the segment, what gets built and when. The agent owns the evidence and the proposal artifact, and says plainly where the evidence and the owner's idea disagree.

## Steps

### 1. Read what was shared, then what already exists

**Read the owner's material and the product's existing record first.** Read all supplied notes, research, data, links, screenshots and competitor names, then any brief, decision log and earlier proposal.

**Use the repository's existing equivalent of a proposal.** Duplicated proposals lose decisions between them. Rewrite an existing Markdown proposal once as HTML in the same place, removing the Markdown in that change while git keeps its history. On a rerun, start from the existing proposal (§ Running it again).

**When the product implements a published method, write its steps before the use cases.** Put those steps in the brief, above its use cases. Use the `app-lifecycle` skill's brief or the product's equivalent. Give each step a source, have the owner identify the authority and any simplification, then order the use cases accordingly. Check the first use case against the authoritative document as the first thing a new user does.

### 2. Research what is missing

- **Research up to five alternatives the people in question actually use, including doing nothing.** Include substitutes such as spreadsheets, agencies and manual workarounds, keeping them distinct from direct competitors. When installed, apply `competitor-analysis` § Output structure with five as the cap across all alternatives. Omit market-size, share and funding figures without sources.
- **Research an open segment and compare the value offered.** Apply `market-segments` and `beachhead-segment` while the segment remains open. Apply `value-proposition` and `value-curve` for the proposition and curve against alternatives.
- **Gather what people say when the owner wants it.** Use reviews, forums, Reddit and X for problems and people's words, without inferring prevalence or willingness to pay from those comments.
  - **Each quote is verbatim, checked against the page as fetched.** Include its link and the date read.
  - **Leave out posts by a vendor, its staff or its affiliates.** Also exclude paid or promoted posts. Keep only independent posts: astroturf reads as demand.
  - **Flag quotes fetched through mirrors or archives.** Say when blocked fetching required that route.
- **Every source gets its address and the date it was read.** A claim without a source is your own.

**Handle standalone market research here without building a proposal.** For requests covering competitors, segments, a value proposition, a value curve or people's comments, follow this order without a proposal. Gather people's comments alongside under the same rules:

1. The alternatives: `competitor-analysis`.
2. The segments: `market-segments`, then `beachhead-segment` while the first one is open.
3. The value proposition for the chosen segment: `value-proposition`.
4. The value curve against the alternatives: `value-curve`.

Finish by marking every claim by kind (step 3); standalone research ends there.

### 3. Mark every claim by kind

**If the proposal doesn't show each claim's source and mark the agent's own inferences, it is assumptions in a confident tone.** For new products, most evidence is other people's words interpreted by a fluent model.

| Kind | Example | Used as |
|---|---|---|
| Observed fact or reported behaviour | a published price; a review saying "I export it to a spreadsheet every Friday" | evidence, with source and date |
| Owner constraint or preference | "I want to start with educators"; "no mobile app" | a decision: recorded, not argued with |
| Agent inference | "educators will pay, because they already pay for a similar tool" | marked as the agent's, with the evidence it rests on |
| Unsupported assumption | "teams will switch within a month" | named, and tested before anything rests on it |

- **A competitor's marketing is evidence of how it positions itself.** It does not establish capabilities or customer outcomes.
- **The owner's preference is a decision; the owner's assertion is a hypothesis.** "I want this segment" records a choice. "This segment will pay" remains a hypothesis sourced only to the owner; say so in the proposal.

### 4. Check feasibility before drawing screens

**Check what may not exist or may not be allowed before drawing screens.** Screens of something that can't be built waste the owner's review. Check the API, the platform rule, access to the data, or a cost per user that eats the price, and say what you checked.

### 5. Propose

- **One direction when the evidence clearly favours it; two or three, with their trade-offs, when the choice is real.** Inventing alternatives hides the recommendation.
- **Show rough builder-hour size and lasting obligations beside every option.** Label size as an estimate; lines of code can help when useful. Name what it adds to run: each service, store, job or vendor the product keeps. Put this beside directions and open decisions, so the owner sees the cost while choosing.
- **Explain each direction's audience, value proposition, scope and advantage over alternatives.** State what its first version does and deliberately leaves out.
- **For a new product, optimize the time to learn, not completeness.** A first user stays for a few key jobs done well, not for fifty features. Build the fewest jobs that make the value proposition true, polish their common path, and put them in front of real users as soon as they work. Everything else waits for what those users do.
- **A product charges its first real users unless the owner makes it free.** Whether people pay is part of what the first version learns, and a free product is an exception the owner names.
- **Mark every requirement by its evidence: seen in use, asked for by a named person, or assumed.** The first version holds the key jobs and the value proposition. An assumed requirement beyond them goes on the leave-out list with the trigger that brings it back. The same test applies to detail inside a requirement that stays.
- **Weigh each part of the first version by what people will see against what it costs.** Put visible, cheap parts early: a landing, displayed pricing and example data filling every screen. Add hard logic once the product is worth it.
- **Name the weakest consequential assumption.** Choose the one that, if wrong, changes the recommendation. A shaky detail that changes nothing can wait, even if it is the weakest overall.
- **Recommend one direction and give the reason.** Make the choice explicit in the artifact.

### 6. Build what the owner reviews, interface first

**Build one self-contained HTML page with research, decisions and key screens.** The page opens from its file without a server or build, with its sections in this order:

1. Research, marking every claim by kind and source (§ 3).
2. Alternatives.
3. Segment.
4. Value proposition and value curve.
5. Recommendation (§ 5), with its impact-and-effort grid.
6. Jobs map.
7. Key screens.
8. Open decisions.
9. Hypotheses, including the weakest consequential assumption and its experiment.

- **Map jobs before drawing one high-fidelity screen per key job.** Number each job in the user's words, naming its screen, the question that screen answers and its primary action. Each screen shows its job's number and realistic sample data labelled as such. When replacing a familiar tool, start from its structure and justify departures.
- **Apply the `ui-design` skill.** Read the method first, with `app-stack` installed, or use the jobs map, `frontend-design` direction, token values and a checked screenshot without it. Embed and compose an existing kit's CSS inside the HTML. For new products, choose one subject-grounded direction and keep values in tokens. Where the method is present, check screenshots against it before the owner sees them.
- **Agree on static or clickable screens and build no separate prototype.** The person and agent choose together. The first working version takes hours and tests the full flow.
- **Charts follow `dataviz`'s rules in any agent.** In Claude Code, apply the built-in `dataviz` skill (read `2026-11-07`). In any other agent, follow its rules:
  - The form first: sometimes a number, not a chart.
  - One axis, and a legend for two or more series.
  - Colour follows the entity; status colours only for status.
  - Text in text colours, never a series colour.
  - Look at the render.

  Draw the value curve, segment scores and impact-and-effort grid. The grid weighs § 5's first-version parts and next builds by what people will see against cost. Mark "do first".
- **Fresh eyes before the owner: a fresh session reads the page first.** It gets only the page's screenshots (a tall page cut into ordered parts) and a reader's role, never the brief or the code. Ask what the page is, what the reader would decide from it and what is unclear, then fix what they cannot explain. This checks the page itself: no app crawl or sign-in.
- **Name key screens and what to inspect before any plan.** Give the owner that preview.
- **Define the customer experiment and what would change the recommendation.** Include hypothesis ID, participants, task, observed behaviour and the decisive result. Building the first version and putting it before paying users is often the experiment.

### 7. Ask only what the evidence can't decide

**Keep questions in the artifact and record every answer durably.** Ask only the few questions evidence cannot decide, about the owner's values, segment or scope. Put each in open decisions with options, a recommendation and its reason. Each option shows its rough builder-hour estimate and what it adds to run (§ 5).

**Support both saved page picks and choices copied into chat.** Where the host saves viewer picks, let the person pick on the page and read those picks next iteration. Claude.ai artifacts can save picks (read `2026-11-07`). For local files and other hosts without saved picks, provide a button copying choices as text for chat; direct chat answers also work. The same file supports both paths.

**Write each pick into HTML and the decision log immediately.** Do this in the same turn whichever way it arrives, then republish. Host-only page storage loses choices to the next session and other agents.

**Ask these questions only here and keep decisions with the owner.** If work has an owner's page, apply `flight-deck` and link from that page to the questions. (The author's preference, as an example to replace with your own: "a person talking to Claude", `2026-11-07`.) The owner may share the page like any other; the decisions remain theirs.

### 8. Write the record

**Keep the HTML file as the one durable proposal record.** Use the repository's existing location, else `docs/product/proposal.html`, and read `references/proposal.md` for its sections, keeping key screens inside the record. Create no Markdown duplicate; restating the record elsewhere loses decisions.

**Publish from the HTML file and republish it each iteration.** Where the host publishes pages, keep the published page aligned with this file; in Claude, publish a claude.ai artifact (observed `2026-11-07`).

| Record | Holds |
|---|---|
| The proposal artifact | research with claim kinds and sources, alternatives, segment, value proposition and curve, jobs, screens, decisions, hypotheses and experiments |
| The brief (or the product's refined idea) | the accepted intent and use cases |
| The decision log, if there is one | the choices made, their reasons, what would reopen them |

**After the owner accepts, update the brief and link the page as evidence.** Update the decision log where needed too. Write no second brief when the accepted proposal already does that job. For a SaaS, apply the `app-lifecycle` skill with the accepted artifact.

**Plan complex changes next, opening with assumptions the owner must review.** After acceptance, the next step for a complex change in any product is a plan. Explain what the ask means in this product, any wrong number or word the owner supplied, and what needs their decision.

**Put visible changes and open choices on the review page.** Use this page or a new one in the same form, showing key assumptions, high-fidelity screens of changed flows, then choices picked as § 7 describes. Keep the builders' part in the repository's plan: phases, files each changes, tests and acceptance criteria. Name tests touching production, its users or its data; run them only with the owner's go.

## Running it again, once people have used it

**Rerun the proposal using what real users did and paid for.** Collect what they used, returned to and abandoned, and record its origin: analytics, payments, support or interviews.

- **Update and republish the same HTML file.** Append evidence, update conclusions, and place each dated observation under the hypothesis it bears on, by ID. Update each hypothesis's status: supported, weakened, refuted or untested. Replace the recommendation; keeping old and new together leaves the builder choosing between them.
- **What people say they did counts; what they say they would do is a hypothesis again.** Test what people say they would do.

Each rule's origin, the case that taught it, is in `receipts.md` beside this file; read it when a rule's edge is unclear.

## How you can tell it worked

The owner can trace every claim, saw key screens before planning, made decisions on the page or in chat, and answered only questions requiring their judgement. They know which hypothesis the first users will test and what result changes the plan.

## Files

| File | Holds | Read when |
|---|---|---|
| `references/proposal.md` | the proposal's sections, the hypothesis table and the observation log, as HTML page sections | writing or updating the record |

## Limitations

Treat upstream examples as patterns. Validate scope and results against current project constraints, available tools and decisions recorded by the owner.

Adapted from [Pawel Huryn’s upstream skill](https://github.com/phuryn/product-engineering/tree/8ebb50bb1b28dc9e8bc669199493e6020b808cc6/product/skills/propose).
