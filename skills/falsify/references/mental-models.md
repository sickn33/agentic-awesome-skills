# Mental Model Catalog (心智模型目录)

Companion to `SKILL.md`. Use the model that fits the stage, never all of them. 2–3 models per pass is plenty.

## Stage 1 · Axiomatize (公理化)
| Model | Question it answers |
|---|---|
| First Principles | What do we know to be fundamentally true? Break until irreducible. |
| MECE Decomposition | Are my categories gap-free and non-overlapping? |
| The Map is Not the Territory | Where might our model diverge from reality? |
| Circle of Concern vs Influence | Can we actually affect this? (drop what we can't) |

## Stage 2 · Hypothesize (假设化)
| Model | Question it answers |
|---|---|
| Falsifiability | What evidence would disprove this? If none — rewrite. |
| Base Rate Neglect | What is the prior probability before this specific case? |
| Inversion | What would guarantee the wrong answer? Avoid it. |
| Hypothesis-Driven Solving | What is the fastest test to confirm or kill this? |

## Stage 3 · Adversarialize (对抗)
| Model | Question it answers |
|---|---|
| Pre-Mortem | It is a year later and this failed — why? |
| Chesterton's Fence | Do I understand why this exists before removing it? |
| Red Team Analysis | How would an adversary defeat this plan? |
| Survivorship Bias | Am I only looking at winners? |
| Reframing | What if this isn't the problem at all? |
| Second-Order Thinking | And then what? And then what after that? |

## Stage 4 · Verify (验证)
| Model | Question it answers |
|---|---|
| Bayesian Updating | How should each piece of evidence shift confidence? |
| Triangulation | Do two independent sources/methods agree? |
| Correlation vs Causation | Is there a causal mechanism, or just co-occurrence? |
| Skin in the Game | Does the source of this claim bear consequences for being wrong? |
| Bright Spots Analysis | Where is this already working (and why)? |

## Stage 5 · Converge (收束)
| Model | Question it answers |
|---|---|
| Verifiable Verdict | What specific claim can the user check? |
| Margin of Safety | What buffer exists if assumptions are wrong? |
| Reversibility Test | Is this a one-way or two-way door? (ADR if one-way) |
| Regret Minimization | Which choice minimizes regret if things go wrong? |
| Lindy Effect | How long has this survived? That predicts its future. |
| 10/10/10 Rule | How will this look in 10 minutes, 10 months, 10 years? |

## Orientation diagnostics (Stage 0)
Before reasoning, detect whether the conclusion is already sealed:
- **Conclusion-preserving**: explaining away contrary evidence → ask "what would have to be true for the other side to win?"
- **Authority-preserving**: attached to sounding expert → advise someone else instead.
- **Threat-reducing**: rushing to resolve ambiguity for comfort → hold both options open.
- **Completion-seeking**: wants *an* answer not *the right* answer → pause before settling.
- **Monitor co-option**: elaborate analysis that always confirms one conclusion → demand a verifiable prediction.

## Reasoning-type calibration (Stage 5)
Label which inference you used; the label sets the honest confidence range:
| Type | Strength | What to verify |
|---|---|---|
| Deductive | strong, brittle | the premises, not just the chain |
| Inductive | probabilistic | sample size + bias |
| Abductive (best explanation) | weakest | list ≥1 alternative explanation |
| Analogical | similarity ≠ identity | where the two things differ |
| Counterfactual | decision-only | actual world vs imagined world stated explicitly |

## Frontier questioning (Stage 0)
Ask the whole open frontier in one round — numbered questions, each with a recommended answer. Never ask what you could look up. Recomputed the frontier after each answer round.

## v0.4 additions (superforecaster / preregistration / MetaCrit)
| Model | Question it answers | Stage |
|---|---|---|
| Outside View / Reference Class | What usually happens in situations like this, before this specific case? | 1 |
| Decomposition vs Benchmark | Do my part-estimates reconcile with the base rate (gap >20pt → investigate)? | 1 |
| Pre-Commitment | Did I write the prediction (with probability) before seeing the evidence? | 2 |
| Brier Scoring | Over time, are my 0.55s right as often as my 0.95s? (overconfidence check) | 4 |
| Failure-Mode Summation | Do my quantified failure modes match the failure rate my confidence implies? | 3 |
| Parallel Attack Lenses | What do user / machine / developer / support see that I don't? | 3 |
| Multi-Perspective Review | Would the executor, the stakeholder, and the skeptic all sign this verdict? | 5 |
| Strong Opinions, Weakly Held | What condition would make me revise this conclusion? | 5 |
| Uncertainty Two-Signal | Action-confidence vs request-uncertainty (0/0.5/1) reported separately | 5 |
| Socratic Taxonomy (Paul & Elder) | Clarity / precision / accuracy / relevance / depth / breadth / logic / significance / fairness — which dimension is weakest? | 0/3 |
| Circle of Competence | Am I (or my verified sources) actually qualified to answer this? | all |

## v0.5 additions (ACH / Heuer / Lakatos / Mayo)
| Model | Question it answers | Stage |
|---|---|---|
| ACH Hypothesis Set | Are there 3–7 mutually exclusive candidates, including at least one I don't believe? | 2 |
| Diagnostic Evidence | Does this evidence discriminate between candidates? (count the I's, not the C's) | 3 |
| Lakatos Protective Belt | Am I patching a failing core with auxiliary assumptions (degenerating programme)? | 3 |
| Mayo Severity | Would this test have caught a wrong hypothesis (low P(E|¬H))? | 4 |
| Duhem-Quine Underdetermination | Which auxiliary assumption could be the real culprit, not the core claim? | 1/4 |
| IBE Exhaustion | Did I exhaust the candidate explanations, or just the available ones? | 2 |
| Sensitivity Analysis | Which single piece of evidence, if wrong, flips the verdict? | 5 |

## v0.6 additions (Argument Mapping / Pearl / Self-Reflection / PR-FAQ)
| Model | Question it answers | Stage |
|---|---|---|
| Argument Mapping (Toulmin) | Can I draw contention → reasons → co-premises → warrant before attacking? | 2 |
| Co-Premise Check (van Gelder) | What hidden assumption does each reason silently depend on? (weakest spot) | 2/3 |
| Warrant Check (Toulmin) | What logical principle connects reason to claim — and is it actually stated? | 2/3 |
| Structure ≠ Truth (van Gelder) | Even if the logic holds, are the load-bearing premises true? | 3/all |
| Causal Ladder (Pearl) | Am I claiming association, intervention do(x), or counterfactual? | 4 |
| Backdoor Criterion (Pearl) | Is there a confounder I failed to condition on that manufactured the association? | 4 |
| Collider Trap (Pearl) | Did conditioning on a collider open a path and create the bias I am now seeing? | 4 |
| Self-Reflection Warning (Huang et al. 2023) | What external signal changed my confidence — or is the re-read just drift? | 4/5 |
| PR/FAQ Decision Artifact (Amazon) | Is this hard decision documented as evidence + assumptions + stop conditions, not a story? | 5 |

## v0.7 additions (Kahneman / Simon / Galef / decision theory / Bayes odds)
| Model | Question it answers | Stage |
|---|---|---|
| Dual-Process Routing (Kahneman) | Which lane: System 1 fast or System 2 deliberate — and what is my effort budget right now? | 0 |
| Satisficing / Bounded Rationality (Simon) | What is the pre-declared aspiration threshold, and did I stop at the first option that clears it? | 0/5 |
| Reversal Test (Galef) | Would I accept the same evidence pointing the other way, or is that special pleading? | 3 |
| Scope Sensitivity (Galef) | Do my probabilities scale with magnitude, or am I scope-insensitive? | 3/4 |
| Status Quo Bias (Galef) | Am I assuming "no change" needs no evidence while change needs a lot? | 3/4 |
| Bias Audit (Galef / lex-bias) | Which of the six (confirmation/availability/anchoring/affect/overconfidence/sunk cost) is active, and by how much? | 4 |
| CI Surprise Test | Do outcomes fall outside my intervals more often than they should — and if so, widen 1.5–2×? | 4 |
| Likelihood Ratio (Bayes odds form) | What is P(E|H)/P(E|¬H), and did I multiply the prior odds by it? | 4 |
| Expected Value (vNM) | EV = Σ(pᵢ×vᵢ) — which rule: max EV, max EU, minimax regret, or satisfice? | 5 |
| Risk Aversion / Utility | Is this a one-shot high-stakes bet where raw EV overstates the rational choice? | 5 |
| Option Value | In sequential decisions, did I keep the value of stopping, pivoting, or waiting? | 5 |

## v0.8 additions (Cynefin / Kepner-Tregoe / Boyd OODA / debiasing / systems)
| Model | Question it answers | Stage |
|---|---|---|
| Cynefin Classification (Snowden) | Which cause–effect domain am I in — clear/complicated/complex/chaotic/disorder — and which method does it demand? | 0 |
| OODA Loop (Boyd) | Is this moving + reversible → act at ~70%, re-observe, loop? | 0 |
| IS/IS-NOT Matrix (Kepner-Tregoe) | For a selective defect: what/where/when/extent differs from the closest comparable non-affected side? | 1 |
| Pre-Registered Update Rules (Galef debiasing) | Did I lock "if Z → update to W" + acceptance criteria before seeing the evidence? | 2/4 |
| MUST/WANT Screen (Kepner-Tregoe) | Which options fail a non-negotiable MUST, and which wins weighted WANTs (1–10)? | 5 |
| Adverse-Consequence Test (Kepner-Tregoe) | What probability×impact downside hides behind the highest score? | 5 |
| Systems Leverage Hierarchy | Am I intervening at the highest feasible level (goals → rules → loops → structure → params)? | 1/3 |
| Bias Catalog Index | Which of the 25 biases is active, and what is its detection question + remediation? | 4 |
