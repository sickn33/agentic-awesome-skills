# Anti-Sycophancy

A skill for OpenCode that detects and eliminates sycophantic patterns in AI responses. Sycophancy is when an AI prioritises affirming a user's stated or implied beliefs over epistemic integrity — an RLHF structural artifact, not an attitude problem.

## Installation

```bash
mkdir -p ~/.config/opencode/skills
cp -r anti-sycophancy ~/.config/opencode/skills/
```

## Usage

Load the skill explicitly when you want the agent to prioritise directness:

```
/skill anti-sycophancy
```

Once loaded, the agent follows a procedural anti-sycophancy process for every response: extract the user's core claim, assess it independently, conclude based on evidence, and respond conclusion-first.

You can also reference it inline:

```
With the anti-sycophancy skill active, review this architecture:
```

## Patterns Covered

### Epistemic Sycophancy (what you say)

| # | Pattern | What it catches |
|---|---------|-----------------|
| 1 | **Answer Sycophancy** | Agreeing with incorrect user claims instead of correcting them |
| 2 | **Premise Endorsement** | Answering within a flawed frame instead of challenging it |
| 3 | **Mimicry Sycophancy** | Adopting the user's errors and following flawed reasoning chains |
| 4 | **Feedback Sycophancy** | Predictably biased positive evaluation when asked to review |

### Soft Sycophancy (how you say it)

| # | Pattern | What it catches |
|---|---------|-----------------|
| 5 | **Validation-Before-Correction** | Emotional preamble before disagreement (most common form) |
| 6 | **Emotional Over-validation** | "Great question!", gratitude inflation, conversational padding |
| 7 | **False Agreement Framing** | "You're right that X, but..." where X isn't right |
| 8 | **Hedged Disagreement** | "You might also consider..." instead of "That won't work" |
| 9 | **Deference Posturing** | Inflating the user's authority to avoid taking a position |
| 10 | **Opinion Reversal on Pushback** | Changing a correct answer when challenged, without new evidence |

### Social Sycophancy (who the user is)

| # | Pattern | What it catches |
|---|---------|-----------------|
| 11 | **Status Deference** | Agreeing more readily when user signals expertise or authority |
| 12 | **Identity Alignment** | Shifting positions toward perceived user identity |
| 13 | **Face-Preserving Agreement** | Agreeing to avoid social friction despite evidence |

## How It Works

No pattern matching. A single procedural discipline applied to every response:

1. **Extract** the user's core claim from their framing. State it stripped of premises.
2. **Assess** that claim independently — evidence for/against, without referencing user agreement or authority.
3. **Conclude** based solely on step 2.
4. **Respond** with the conclusion first, evidence second.

When the user disagrees:
- New evidence → update position, state what changed
- Repeated opinion → restate position with evidence

## References

- Sharma, M., Tong, M., Korbak, T., et al. (2023). Towards Understanding Sycophancy in Language Models. *ICLR 2024*. arXiv:2310.13548.
- Perez, E., et al. (2022). Discovering Language Model Behaviors with Model-Written Evaluations. *ACL 2023 Findings*.
- Dubois, M., Ududec, C., Summerfield, C., & Luettgau, L. (2026). Ask Don't Tell: Reducing Sycophancy in Large Language Models. arXiv:2602.23971.
- Gligorić, K., et al. (2026). SWAY: A Counterfactual Computational Linguistic Approach to Measuring and Mitigating Sycophancy. arXiv:2604.02423.
- Mohsin, M. A., et al. (2026). Pressure, What Pressure? Sycophancy Disentanglement via Reward Decomposition. arXiv:2604.05279.
- Feng, Z., et al. (2026). Good Arguments Against the People Pleasers: How Reasoning Mitigates (Yet Masks) LLM Sycophancy. arXiv:2603.16643.
- Cheng, M., Yu, S., Lee, C., Khadpe, P., Ibrahim, L., & Jurafsky, D. (2026). Social Sycophancy: A Broader Understanding of LLM Sycophancy. *Proc. ICLR 2026*. arXiv:2505.13995.
- Ibrahim, L., Hafner, F. S., & Rocher, L. (2026). Training Language Models to be Warm Can Reduce Accuracy and Increase Sycophancy. *Nature*, 652, 1159–1165. DOI: 10.1038/s41586-026-10410-0.
- Cheng, M., Lee, C., Khadpe, P., Yu, S., Han, D., & Jurafsky, D. (2026). Sycophantic AI Decreases Prosocial Intentions and Promotes Dependence. *Science*, 391(6792). DOI: 10.1126/science.aec8352.
- "The Silicon Mirror: Dynamic Behavioral Gating for Anti-Sycophancy" (ArXiv 2604.00478, 2026).

## License

MIT
