# Bias Catalog · 认知偏差速查表

Companion to the Stage 4 bias audit in `SKILL.md`. The six-quick-check audit covers the high-frequency six; this catalog indexes 25 for deeper review. Detection question first, remediation second — a bias you can name is a bias you can correct.

## Quick reference

| Bias | Cluster | Detect | Remediate |
|---|---|---|---|
| Confirmation | Confirmation | Did I seek disconfirming evidence? | Red-team the forecast; list counter-evidence first |
| Desirability | Confirmation | Do I want this outcome? | Forecast before declaring preference; outsource to neutral party |
| Availability | Availability | What recent/vivid events dominate my memory? | Look up actual statistics; use reference class |
| Recency | Availability | Am I extrapolating the last few data points? | Expand the time window; check for cycles |
| Anchoring | Anchoring | Am I too close to the first number I heard? | Generate my own estimate first; use independent sources |
| Priming | Anchoring | What did I just read/see that colored this? | Pause between exposure and estimation |
| Affect Heuristic | Affect | Do feelings about it drive my probability? | Acknowledge the emotion, then set it aside |
| Loss Aversion | Affect | Am I weighting losses more than gains? | Evaluate gains/losses symmetrically; use EV |
| Overconfidence | Overconfidence | Are my intervals too narrow? | Track calibration; widen intervals (surprise test) |
| Dunning-Kruger | Overconfidence | How much experience do I actually have here? | Seek expert feedback; calibrate to competence |
| Optimism | Overconfidence | Am I assuming "it won't happen to me"? | Apply the base rate to myself |
| Pessimism | Overconfidence | Am I only counting the downsides? | List positive scenarios with their rates |
| Attribution Error | Attribution | Am I blaming the person, not the situation? | Consider constraints and context first |
| Self-Serving | Attribution | Success = skill, failure = luck? | Apply the same standard to both |
| Framing | Framing | Does presentation change my answer? | Rephrase the question multiple ways |
| Narrative Fallacy | Framing | Is the story too clean to be true? | Prefer statistics over stories |
| Sunk Cost | Temporal | Am I justifying the past, not the future? | Decide as if starting fresh today |
| Hindsight | Temporal | Does it feel obvious in retrospect? | Judge by the information available then; keep written forecasts |
| Planning Fallacy | Temporal | Am I underestimating time/cost? | Use reference-class timelines; add a buffer |
| Outcome Bias | Temporal | Am I judging the process by the result? | Judge by what was knowable at decision time |
| Clustering Illusion | Pattern | Am I seeing patterns in noise? | Test statistical significance |
| Gambler's Fallacy | Pattern | Am I expecting short-term balancing? | Use actual probabilities; events are independent |
| Base Rate Neglect | Bayesian | Did I start with the prior? | Always anchor on the base rate first |
| Conjunction Fallacy | Pattern/Bayesian | Is "specific" rated more likely than "general"? | P(A∧B) ≤ P(A) — always |
| Halo / Authority | Social | One trait or credential coloring everything? | Assess dimensions separately; weigh evidence, not titles |

## How to use with falsify

1. Run the Stage 4 six-quick-check (confirmation / availability / anchoring / affect / overconfidence / sunk cost).
2. If a suspicion survives, find the matching row here for its detection question and remediation.
3. State the direction (pushes estimate up or down) and the magnitude; apply the correction.
4. Track your own susceptibility over time — a bias you have corrected once is one you will meet again.

*Distilled from Galef's scout-mindset cognitive-bias-catalog and lex-bias; 25 entries, detection-first.*
