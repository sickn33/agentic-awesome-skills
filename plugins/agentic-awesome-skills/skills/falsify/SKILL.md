---
name: falsify
description: "The scientific thinking protocol for AI agents. Use when facing complex, ambiguous, or high-stakes questions where guessing is costly: hypothesis → attempt to break it → evidence → calibrated conclusion."
risk: safe
source: community
source_repo: 263311487-ux/falsify
source_type: community
date_added: "2026-08-27"
author: 263311487-ux
category: reasoning
tags: [reasoning, falsification, science, thinking, verification, epistemology]
tools: [codex, claude, cursor, gemini, deepseek-harness]
license: "MIT"
license_source: "https://github.com/263311487-ux/falsify/blob/main/LICENSE"
---

# Falsify — The Scientific Thinking Protocol

> Think like a first-rate scientist: doubt first, verify, then believe.
> 像一流科学家一样思考：先证伪，再相信；先标不确定，再下结论。

## Overview

falsify is a single-Markdown skill that installs a 5-stage scientific thinking protocol on any AI agent (Codex, Claude Code, DeepSeek Harness, Cursor, Gemini CLI, and 20+ more). It stops the agent from giving confident answers it cannot falsify. The protocol is distilled from 70+ community sources and grounded in cognitive science and causal-inference literature.

## The Iron Law


```
NO VERDICT WITHOUT A FALSIFIABLE HYPOTHESIS.
没有可证伪的假设，就没有结论。
```

<EXTREMELY-IMPORTANT>
If you cannot write down what would prove you wrong, you are not allowed to conclude. A confident answer with no falsification path is not an answer — it is a guess wearing a lab coat. There is no exception for "obvious" or "well-known" or "everyone knows" — those are exactly the claims that need falsifying most.
</EXTREMELY-IMPORTANT>

## MODE SELECTION — route BEFORE answering (mandatory)

First decide which mode this question is, then act accordingly. **Do not run the five stages unless you picked Depth.** The wrong mode is itself a protocol failure.

| If the ask is... | Mode | Do |
|---|---|---|
| Live incident / production down / outage / "act now" / degrading | **Incident (OODA)** | **ACT first** at ~70% confidence with a known rollback and a time box. Do NOT run the five stages. Stabilize, then falsify the effect. Never demand certainty before a reversible action under time pressure. |
| Trivial / one-lookup fact / small talk / zero consequence | **Simple** | Answer briefly and directly. No protocol, no follow-up questions, no stage labels. |
| Rough estimate / ballpark / "about how much" / "大概" (low-stakes, reversible) | **Nudge** | Give the helpful estimate with its main assumption stated, then 2–3 targeted questions. No five-stage ledger. If being wrong costs time/money/trust, escalate to Depth. |
| Under-specified / unfalsifiable / missing key inputs | **Question** | Ask the whole open frontier in ONE round (numbered, with a recommended default each). Do not conclude, do not fabricate a default justification. |
| High-stakes / correctness gate / "why" about a failing system / will be acted on | **Depth** | Run the five stages below. |

In an incident, the Iron Law means "act reversibly, then falsify the effect" — never "analyze first, act later".

## When to Use This Skill


**Activate (depth mode)** for:
- Architecture / design decisions with trade-offs
- "Why" questions about a failing system or data anomaly
- Recommendations that will be acted on (a library, a fix, a strategy)
- Claims about what a user, market, or system "will" do
- Anything where being wrong costs time, money, or trust


**Default to Nudge (not depth) when the ask is a rough ballpark** — "rough estimate", "ballpark", "about how much", "大概", "粗略": give the helpful estimate directly with its main assumption stated, then 2–3 questions. A rough number is not a correctness gate; forcing a five-stage ledger onto it is protocol theater. **Exception — high-stakes ballparks go to Depth:** if the estimate will be acted on and an error costs time, money, or trust (a rough medication dose, security capacity, production sizing), do NOT nudge: gather the key inputs, state the uncertainty, and falsify before giving the number. The shortcut only pays when the error is cheap.

**Do NOT activate (answer simply)** for:
- Factual recall you can verify in one lookup
- Trivial questions where the answer is obvious and consequences are zero
- Small talk. Not everything is a thesis defense.

Every rule below is contextual: read the question first, then pull only what fits. When in doubt, default to a **one-line answer + one-line reason** — then offer depth.

## How It Works


Each stage has a deliverable. Do not skip ahead. The protocol is the point. A compact mental-model toolbox sits under each stage (full catalog: `references/mental-models.md`).

### Stage 0 — Read the room (读题)
Restate the actual question in one sentence. Name the stakes: who acts on this answer, and what happens if it is wrong. If the question is ambiguous, state your reading and proceed — do not stall.

**Orientation check** — before reasoning, notice if the answer is already emotionally committed (this is not about the user; it is about you):
- *Conclusion-preserving*: already leaning one way and explaining away the rest → ask "what would have to be true for the other side to win?"
- *Completion-seeking*: wants *an* answer, not *the right* answer → insert a pause before settling.
- *Authority-preserving*: attached to sounding expert → stress-test the idea as if advising someone else.
- If you catch any of these, name it silently and compensate. Orientation is the most common failure; the five stages cannot fix a conclusion that was pre-sealed.

**Frontier questioning** — if you need input from the user, ask the whole open frontier in **one round**: number each question and give your recommended answer next to it. Never ask for anything you could look up yourself. One question at a time is interrogation, not collaboration. The user's answers unblock the next frontier; recompute and repeat.

**Effort routing** (Kahneman dual-process / Simon bounded rationality): before choosing depth, route the question explicitly. Low stakes, reversible, or one cheap lookup → **System 1**: answer fast, keep it light. High stakes, irreversible, or a correctness gate (tests, security, "did the fix work?") → **System 2**: run the full protocol. Treat effort as a depletable budget with five states — automatic / fluent / effortful / strained / depleted — and when the budget is strained or depleted, say so instead of pretending to still be in deep mode. When a search has no natural endpoint, **satisfice**: pre-declare the pass/fail aspiration threshold BEFORE looking, search in encounter order, stop at the first option that clears it, and never move the goalposts after failure — relax only a criterion predeclared as non-load-bearing, and record the relaxation.

**Situation routing** (Cynefin / Snowden): before choosing a method, classify the cause–effect domain — the wrong-domain method is itself the failure mode. **Clear** (cause→effect obvious): sense, categorize, respond with a runbook — do not run a research project. **Complicated** (several valid expert answers): sense, analyze, respond — hypothesis testing fits here. **Complex** (emergent): probe with safe-to-fail experiments, sense what happens, amplify what works — you cannot predict your way out. **Chaotic** (no time to sense safely): act first to stabilize, then sense, then respond. **Disorder**: split the problem into parts and classify each. If the chosen domain's method stops working, reclassify — a runbook that fails on a Clear problem was not Clear.

**Time-pressure mode** (Boyd OODA): when the situation is moving and waiting for certainty costs more than a reversible action, do not run the full protocol — act at ~70% confidence with a known rollback, then immediately re-observe and loop: observe → orient (≥2 candidate explanations) → decide (action + predicted effect + next observation + time box) → act → re-observe. Exit the loop as soon as the system is stable or the next move is irreversible — then switch to the full protocol. Never OODA an irreversible launch; never demand 100% certainty for a reversible mitigation under time pressure.

### Stage 1 — Axiomatize (公理化)
Separate everything you know into three lists:
- **Axioms** — facts you are certain of (with source if possible)
- **Assumptions** — things you are treating as true but have not checked
- **Hearsay** — claims with no evidence behind them

Toolbox: *first principles* (what is fundamentally true?), *MECE* (are my categories gap-free?). Output: three explicit lists. Anything not listed is not yet allowed into your reasoning. For problems that recur despite local fixes, add *systems leverage* (intervene at the highest feasible level: goals/paradigm → rules/information → loop structure → stock/flow → buffers/parameters — never polish a parameter when a rule is the lever).

**Outside view first** (superforecaster method): before reasoning about this specific case, name its reference class and the base rate — what usually happens in situations like this? Then decompose the question into parts and estimate each; reconcile against the reference-class benchmark, and if the gap is larger than ~20 points, investigate why before proceeding. The vivid details of the current case must not override the prior.

**Two-hypothesis discipline** (LessWrong): maintain at least two hypotheses that fit everything you currently know. If only one hypothesis survives your current facts, that is a signal your facts are incomplete, not that the hypothesis is proven.

**IS/IS-NOT bounding** (Kepner-Tregoe): for a selective defect — affects some objects/places/times/cohorts but not comparable others — bound the problem before theorizing. Build the matrix: for WHAT / WHERE / WHEN / EXTENT, record the **IS** side, the **closest comparable IS-NOT** side, and the **distinction** unique to the IS side; then list the **changes** near the first occurrence. A candidate cause survives only if it explains BOTH sides of the boundary — a cause that fits "only on Mondays" must also explain why not on Tuesdays.

### Stage 2 — Hypothesize (假设化)
Write the hypothesis as a falsifiable prediction:
```
If [H], then we should observe [O].
If we observe [¬O], H is dead.
```
A hypothesis with no observable consequence is decoration. Rewrite it until it has one.

Toolbox: *base rate* (what is the prior probability before this specific case? — do not let a vivid case override the prior), *inversion* (what would guarantee the wrong answer?).

**Hypothesis-set discipline** (ACH / Heuer): before choosing, generate **3–7 mutually exclusive candidates**. The set must include at least one *awkward hypothesis* you do not believe — if you cannot write one down, you have a blind spot. Two candidates is an incomplete map, not a debate. If exactly one candidate survives your current facts, do NOT conclude: halt and generate 2–3 stress tests — either you are right and the tests will fail, or your alternatives were too weak. "Best of the available" is not "true": exhaust the candidate space first.

**Pre-commit the prediction** (harsh-critic / preregistration method): write down your prediction — including a probability — BEFORE you look at the confirming evidence. Then keep it. A prediction written after the evidence is not a prediction, it is a rationalization. Make it scoreable: a probability p that will be scored against the actual outcome y (Brier score: (p−y)²). If you cannot write a scoreable prediction, the hypothesis is not yet falsifiable.

**Pre-registered update rules** (debiasing / Galef): before looking at the evidence, write the rule that will move you — "if I observe Z, I will update to W%" — plus the acceptance criteria for Z (what makes the evidence valid: source quality, sample size, freshness). Lock the rule in while you are still objective; when Z arrives, apply the rule mechanically instead of re-deciding. This kills cherry-picking, goalpost-moving, and asymmetric evidence standards.

**Argument-mapping discipline** (Toulmin / van Gelder): draw the hypothesis's argument tree before attacking it: **contention** (the claim) → **reasons** (the supports) → **co-premises** (the hidden assumptions each reason silently depends on — this is where arguments are weakest) → **warrant** (the logical principle connecting reason to claim; a missing warrant is the single most common flaw). Flag the weak links: inferences that do not hold, and load-bearing premises with no support. An argument you cannot map, you cannot defend.

### Stage 3 — Adversarialize (对抗)
Attack your own hypothesis before anyone else can.
1. Build the strongest counter-argument (steelman the opponent).
2. List the three most likely ways your hypothesis is wrong.
3. Ask: what evidence would I refuse to accept? (If nothing would change your mind, you are not reasoning — you are defending.)

Toolbox: *pre-mortem* (it is a year later and this failed — why?), *Chesterton's Fence* (do I understand why this exists before proposing to remove it?), *red team* (how would an adversary defeat this plan?), *survivorship bias* (am I only looking at winners?).

**Quantify the failure modes** (superforecaster method): list the ways this could fail, estimate a probability for each, sum them, and compare the sum against the failure rate implied by your confidence. If your plan is 90% confident but the failure modes sum to 40%, the confidence and the failure modes cannot both be right — resolve the gap.

**Attack in parallel, from different angles** (pre-mortem skill): attack your own reasoning chain itself, not just the plan — how would an adversary exploit the step where you are most confident? If useful, run the attack from several lenses: the user, the machine, the developer, the support desk. Finding failure modes is not the same as attacking them — do both.

**Diagnostic-evidence check** (ACH / Heuer): score each piece of evidence against **all** candidates — C (consistent) / I (inconsistent) / N (neutral) / NA (not applicable). Count the **I's, not the C's**: consistent evidence proves nothing; inconsistent evidence is what discriminates. The winner is the hypothesis with the fewest contradictions, not the most confirmations. If every row is non-diagnostic, the question is under-specified or the evidence is too weak — reframe the question or gather better evidence before concluding.

**Protective-belt check** (Lakatos): separate the hard core (the claim you refuse to abandon) from the protective belt (auxiliary assumptions). If you keep adding auxiliary assumptions to rescue a failing hypothesis, that is a **degenerating research programme** — a red flag, not a rescue. A progressive programme predicts new facts; a degenerating one explains them away.

**Structure ≠ truth** (van Gelder): an argument map can be formally perfect while every premise is false. After flagging the weak links, inspect the load-bearing premises themselves — "even if this logic holds, is this premise actually true?" — before spending more effort on the structure.

**Reversal test** (Galef, scout mindset): would you accept the same evidence pointing the OTHER way? If you would accept evidence that supports you but dismiss the equivalent reversed evidence ("this source is biased", "sample too small", "outlier" — only when it disagrees), that is motivated reasoning, not reasoning. Fix: reject it both ways, accept it both ways, or weight it appropriately both ways — and if you detect the double standard, move the probability 10–15% toward 50%.

### Stage 4 — Verify (验证)
Gather evidence deliberately looking for **disconfirming** cases first (survivorship bias is the default failure).
- Grade every piece: **direct evidence / indirect / hearsay / inference**
- **Triangulate**: seek at least two independent sources or methods before raising confidence — one source agreeing with you is a starting point, not a proof.
- Assign confidence honestly: 90%+ (multiple direct, independent), 60–90% (consistent indirect), 30–60% (plausible), <30% (speculation)
- Run the cheapest real test that could break your hypothesis — an actual command, a data lookup, a minimal experiment. If you cannot run a test, say so and downgrade your confidence.

Toolbox: *Bayesian updating* (how should each piece of evidence shift confidence, not confirm it?), *correlation vs causation* (is there a mechanism, or just co-occurrence?).

**Causal-ladder check** (Pearl do-calculus): name which rung you are on — **association** (observed co-occurrence), **intervention** (do(x): what happens if you change x), or **counterfactual** (what would have happened otherwise). A correlation is a ladder step, not the top; claims of "X causes Y" require the intervention rung. When the evidence is observational:
- **Backdoor check**: is there a confounder you failed to condition on? A hidden common cause can manufacture the whole association.
- **Collider trap**: if a variable is a collider (the common outcome of two causes), conditioning on it opens a path between its parents and *creates* bias that was not there. "We filtered by X and saw Y" can be a pure selection artifact — the filter itself is the bias. Evidence hierarchy: RCT > natural experiment > longitudinal > case-control > cross-sectional > expert opinion — a causal claim is only as strong as its weakest permitted study type.

**Bias audit** (Galef / lex-bias): before locking confidence, run the six quick checks and name each hit with its direction and estimated magnitude:
- *Confirmation*: did I seek disconfirming evidence, or only supporting?
- *Availability*: am I relying on memorable/recent examples instead of representative data?
- *Anchoring*: did I form my own estimate before seeing the numbers that framed this?
- *Affect heuristic*: am I confusing what I WANT with what WILL happen?
- *Overconfidence*: are my confidence intervals too narrow for the reference class? (Surprise test: if outcomes fall outside your CIs more often than they should, widen them 1.5–2×.)
- *Sunk cost*: am I continuing a failing path because of what was already spent?
For each detected bias, state the direction (pushes the estimate up or down) and adjust the probability accordingly — a detected bias with no correction is just a label. Full 25-bias quick reference (category / impact / detection / remediation): `references/bias-catalog.md`.

**Severity check** (Mayo): a test only counts if it would have caught a wrong hypothesis — low P(E|¬H). Evidence that would appear under both H and ¬H is weak evidence, no matter how consistent it looks. List the auxiliary assumptions explicitly (Duhem-Quine): if the test fails, the culprit may be any of them, not the core hypothesis.

**Fermi fallback** (cc-thinking-skills): when data is missing, do a bounded order-of-magnitude estimate instead of guessing or refusing. State the estimate, the visible bounds (best case / worst case), and what data would tighten it. An estimate with bounds is information; a bare guess is noise.

**Calibrate like a forecaster**: end with a probability, not a vibe — and state the kill criteria that would move that probability down. Score your own predictions over time (Brier: (p−y)²); if your 0.55 predictions are right as often as your 0.95 ones, you are overconfident, and honesty means reporting the discrepancy.

**Likelihood-ratio calibration** (Bayes, odds form): when new evidence arrives, update by the likelihood ratio, not by how the evidence feels. LR = P(E|H) / P(E|¬H). Bands: 1–3 weak, 3–10 moderate, 10–100 strong, 100+ definitive, <1 evidence against. Posterior odds = prior odds × LR (multiply even when LR < 1); p = odds / (1 + odds). Yesterday's posterior is today's prior. If you cannot state P(E|¬H), you have not yet stated what the evidence would look like if you were wrong — go back to Stage 3.

### Stage 5 — Converge (收束)
- Conclude only what the evidence supports; quote the graded evidence, not vibes.
- Make the verdict **checkable**: include the specific claim someone can verify or the test that would change your mind. An unverifiable verdict is a posture.
- State explicitly what remains **unknown**.
- If a hypothesis died, record the corpse in the ledger — dead hypotheses are assets.
- Calibrate the final statement: "I am [confidence]% sure because [evidence grade], and I could be wrong if [residual risk]."
- **Label the reasoning type** — say which inference you used, and calibrate to its strength:
  - *Deductive* (rules → conclusion): strong but brittle — verify the premises, not just the chain.
  - *Inductive* (cases → generalization): probabilistic — state the sample and its bias.
  - *Abductive* (evidence → best explanation): weakest — always list at least one alternative explanation.
  - *Analogical* (A is like B): similarity is not identity — name where they differ.
  - *Counterfactual* (what-if): state the actual world vs the imagined world explicitly.
- **Multi-perspective review** before finalizing (MetaCrit / empathy-audit): re-read the verdict as (1) the executor — will this actually work? (2) the stakeholder — does this serve the person acting on it? (3) the skeptic — what is the strongest objection left? If the three views disagree, the verdict is not converged yet.
- **Strong opinions, weakly held** (decision theory): commit to the verdict enough to act on it, but state the condition under which you would revise it.
- **Split the uncertainty signal** (arXiv 2606.19559): report action-confidence ("I am X% sure, act accordingly") separately from request-uncertainty ("the question itself was under-specified: 0 fully specified / 0.5 open parameters / 1 critical information missing"). A confident answer to an ambiguous question is not a good answer.
- **Sensitivity analysis** (ACH / Heuer): remove the load-bearing evidence and re-run the verdict. If the conclusion flips, it was fragile — name the single piece of evidence that, if wrong, would change the answer. A verdict that survives removal of any one piece is robust.
- **Self-reflection warning** (Huang et al. 2023, *LLMs Cannot Self-Correct Reasoning Yet*): re-reading your own reasoning is not verification. Without an external signal — a test, a data lookup, an independent source — reflection tends to drift, not improve. If the only thing that changed between draft and final is "I looked at it again", the extra confidence is not earned. Name the external signal, or keep the original confidence.
- **Expected-value decision rule** (decision theory): when the verdict feeds a choice, go one step further and make the choice explicit — EV = Σ(pᵢ × vᵢ) over mutually exclusive, exhaustive outcomes (probabilities must sum to 1.0). Guardrails: for one-shot, high-stakes bets use expected *utility* (risk aversion), not raw EV; never round low-probability tail risk to zero; exclude sunk costs — only future costs and benefits count; in sequential decisions, keep the option value (the choice to stop, pivot, or wait). Pick a rule and say which: maximize EV, maximize EU, minimize maximum regret, or satisfice. If you cannot write probabilities and payoffs, the decision is under-specified — say so.

**MUST/WANT decision analysis** (Kepner-Tregoe): when the choice has multiple criteria rather than clean probabilities, screen before you score — define pass/fail **MUSTs** and weighted **WANTs** (importance 1–10) BEFORE seeing the options; eliminate anything that fails a MUST; score survivors against each WANT on the same scale and total the weights. Then test the downside: for leading options, list adverse consequences with probability × impact, and check which weight change or assumption would reverse the ranking. A high total that conceals a ruinous failure mode is not a win — if no option passes the MUSTs, return "none" rather than force a winner.
- If the conclusion is a hard-to-reverse decision, record it (decision log / ADR: **Context → Decision → Alternatives considered → Consequences → Status**; for product/strategy calls, the **PR/FAQ** working-backwards variant — future-dated press release + internal FAQ holding the evidence, assumptions, constraints, and stop conditions — keeps the decision honest instead of a marketing story). Reversible decisions can stay in the conversation.

## The Nudge


When the question does not warrant full depth but the answer will still be acted on, do not run the five stages — append **at most 2–3 short questions**, once per conversation, each tied to something specific in the answer just given. **High-stakes ballparks are NOT nudge territory:** a rough medication dose, security capacity, or production sizing estimate is Depth — being wrong there costs more than the shortcut saves.

1. **Check a fact** — "which claim here would be worth verifying, and against what?"
2. **Probe a step** — "where did the reasoning take a jump you might want justified?"
3. **Surface missing context** — "what did I have to assume because you didn't say?"

Skip the nudge for creative writing, simple lookups, purely educational explanations, or when the user already asked you to double-check. Once per conversation only — repetition turns a light nudge into nagging.

## Best Practices

### Red Flags


These thoughts mean STOP — you are rationalizing:

| Thought | Reality |
|---|---|
| "This is obviously true" | Evidence, or it's an opinion. |
| "Everyone knows X" | Base rate + two independent sources, or it's hearsay. |
| "The data looks clear" | Did you hunt for disconfirming cases? |
| "I've seen this pattern before" | A prior, not proof. Re-check against this specific case. |
| "It should work" | Run the cheapest test, or downgrade the confidence. |
| "It's probably fine" | What would make it NOT fine? Name it. |
| "I don't need to verify this" | That is the moment verification matters most. |
| "I already know the answer" | Orientation check: is the conclusion pre-sealed? |

### Guardrails


- **Never fabricate evidence.** A name, number, date, quote, or source must come from the actual evidence or be labeled a guess.
- **Never say "certain" below 90%.** "Probably", "likely", "I believe" are required when confidence is lower.
- **Never present "may" as "must".** Possibility is not probability; probability is not fact.
- **Never hide a failed hypothesis.** Record it; a skill that hides failures is a propaganda engine.
- **Never argue with the user's facts without evidence.** Challenge the claim, not the person. If their evidence is stronger, change your mind — publicly.
- **Never let the protocol outrank the answer.** Depth is a tool you reach for, not a costume you wear. Simple question → simple answer.
- **诚实先于体面**: admitting uncertainty is not weakness; it is the only thing that makes the rest of the answer trustworthy.
- **Circle of competence**: outside your (or the verified sources') area of competence, the correct answer is "I don't know" — not a hedged guess. Saying "I don't know" IS the calibrated answer.
- **Two-hypothesis discipline**: if you can only imagine one explanation, look for a second before concluding. A single surviving hypothesis is usually an unexamined assumption.
- **Never explain everything**: a hypothesis that post-hoc fits every possible outcome is unfalsifiable — name at least one outcome that would have contradicted it.
- **Structure ≠ truth**: a flawless argument map proves nothing if its premises are false — verify the load-bearing premises, not just the logic.
- **Reflection is not verification**: re-examining your own reasoning without an external signal adds no evidence (Huang et al. 2023) — name the test or the source that changed your confidence.
- **Desire ≠ forecast** (Galef): separate what you want from what will happen. If the desired outcome and the predicted outcome are the same number, check whether you are forecasting or hoping.
- **Sunk costs stay sunk**: what was already spent does not justify continuing — only future costs and benefits enter the decision.

## Limitations

- The protocol changes *how* an agent concludes, not *what* the agent knows — it cannot manufacture evidence the model was never given, and it must never be used to fabricate sources or confidence.
- No amount of internal falsification substitutes for an external signal: re-examining your own reasoning without new evidence adds no confidence (Huang et al. 2023). When a claim needs ground truth, the agent must name the test or the source that changed its confidence.
- The skill is contextual, not mandatory: it must not turn simple lookups or small talk into thesis defenses. Depth is a tool, not a costume.
- Outside the agent's (or the verified sources') area of competence, the calibrated answer is "I don't know" — not a hedged guess.

## Security & Safety Notes

- This is a pure reasoning protocol: it runs no shell commands, makes no network calls, and accesses no credentials by itself.
- When the protocol is applied to security-sensitive conclusions (auth, crypto, data handling), the agent must treat its own verdict as a hypothesis until verified against the actual system, environment, or threat model — never as a substitute for environment-specific validation or expert review.
- Do not use the protocol's confidence language to overstate certainty to a user. "Probably" is required below 90% confidence.

## Common Pitfalls

- **Problem:** The agent concludes first, then reverse-engineers a falsification path.
  **Solution:** Write the hypothesis and its potential disproof *before* gathering supporting evidence; if the falsification path is written after the verdict, discard it and restart.
- **Problem:** The agent treats "structure" as proof — a clean argument map with false premises.
  **Solution:** Verify the load-bearing premises themselves, not just the logic (structure ≠ truth).
- **Problem:** A single explanation survives, so the agent concludes.
  **Solution:** Two-hypothesis discipline: if you can only imagine one explanation, look for a second before concluding — a single surviving hypothesis is usually an unexamined assumption.

## Related Skills

- `@test-driven-development` — When the claim is about code behavior, use TDD to make the falsification test explicit before writing code.
- `@systematic-debugging` — When the claim is about a bug's cause, run root-cause investigation before proposing fixes; falsify the root cause, don't patch symptoms.
- `@verification-before-completion` — When the claim is "the work is done", verify with real commands and evidence before asserting completion.

## The Thinking Ledger


When depth mode is active, render the five stages as a compact ledger (see `templates/thinking-ledger.md`). The ledger makes thinking visible and auditable — it is also your before/after proof that the protocol changed the answer.

---

*Falsify is built on a simple inheritance: 公理 → 假设 → 对抗 → 验证 → 收束. Axiom → Hypothesis → Adversarialize → Verify → Converge. The five stages of the Unified Theory, turned into a thinking protocol anyone can run.*
