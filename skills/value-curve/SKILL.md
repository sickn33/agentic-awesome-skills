---
name: value-curve
description: 'Comparing a product with competitors or choosing what to be best at: a value curve on one segment''s top needs, plus price.'
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

# Value curve

## Operational boundaries

Keep the scope, sandbox, credentials and approval settings supplied by the user or host. Obtain authorization before delegating, exposing project files to another provider, enabling connectors or hooks, using paid services or deploying. Use synthetic or redacted inputs for examples. Keep security reviews static and defensive, with findings and fixes grounded in source inspection.

## When to Use

Comparing a product with competitors or choosing what to be best at: a value curve on one segment's top needs, plus price.


**Compare offerings on the factors one customer segment values.** The value curve comes from Blue Ocean Strategy (W. Chan Kim and Renée Mauborgne). It asks: does our offering meet this segment's specific needs far better than anything else they can use?

**A good strategy competes to be unique, not the best at everything.** The curve is a starting point, not the whole answer. It feeds the Alternatives part of the value proposition (the `value-proposition` skill), which needs all six parts.

## Before you start

- **One segment per curve.** Needs differ between segments, so mixing them shows no focus. If the segment isn't chosen, find clusters of customers with similar underserved needs first (`market-segments`, then `beachhead-segment`).
- **The factors are the segment's needs, not your features.** Phrase each as a solution-agnostic outcome the customer wants, as jobs to be done are phrased: "find live sports events", "content for kids".
- **Evidence comes from customers.** For every need, interviews ask its importance and satisfaction with what customers use today. Ask which competitors' products they use and what they would pay relative to those. A Van Westendorp price survey is one way. About 10-15 interviews per segment.
- **With no interviews yet, label every score an assumption and name its source.** A curve can still use only websites, reviews and the owner's own knowledge. Its first output is then what to test with customers.

## Steps

1. **Score every need for the segment.** For each, *opportunity to add value = importance × (1 − satisfaction)*, with both on a 0-1 scale. This is Dan Olsen's formula from *The Lean Product Playbook*. It is simple and agrees with the jobs-to-be-done opportunity score where it matters most: high importance, low satisfaction.
2. **Pick 5-7 factors.** Include:
   - The needs with the highest opportunity scores.
   - Must-haves: needs this segment rates highly important even though today's products already satisfy them. Their low opportunity score doesn't make them optional; dropping one loses the customer.
   - Leave out needs this segment doesn't rate as important, even if competitors compete hard on them.
   - Relative price, scored so a lower price scores higher. Name factors with customer direction, such as "Low price for one host"; higher always means better for the customer.
3. **List the offerings.** Include your product (as planned, or as it is), the 2-4 competitors the segment actually uses, and at least one substitute. Substitutes include the spreadsheet, the agency, the manual workaround and doing nothing.
4. **Score each offering 0-100 on each factor.** Use what customers said and what reviews show, not feature lists. A feature that exists but doesn't serve the need scores low.
5. **Draw it.** Put factors on the horizontal axis, ordered by importance to the segment, and scores on the vertical axis. Draw one line per offering, with a legend. Keep the score table beside the chart, with each score's source.
6. **Read the curve and write its meaning in a few sentences.** Cover:
   - Where we must be far ahead: the segment's top-opportunity needs. If our line isn't clearly above everyone else's there, there is no reason to switch.
   - Where parity is enough: the must-haves.
   - What we deliberately don't compete on: factors where we sit at or below competitors because this segment doesn't care. Saying it out loud is the strategy.
   - Lines that look the same: the same shape as a competitor's means competing on degree, not difference. Blue Ocean's four actions help reshape it: which factors to eliminate, reduce, raise or create.

**Every displayed score names its scale beside the number or in the subtitle.**

**Word each action in the customer's direction.** For example: "Raise: one host pays less". Label an unbuilt factor "to create" while its score remains low.

## Output

**Provide the segment, score table, chart, reading and assumptions to test.** Include:

- The segment the curve is for, in one line.
- The table: factors × offerings, each score with its source (an interview count, a review, or "assumption").
- The chart.
- The reading (step 6), and the Alternatives line it gives the value proposition: our unique value against each competitor and substitute, and the relative price.
- The weakest assumptions behind it, as what to test next.

## Example

A streaming service for one segment: people who care about live sports events and concerts, and whose needs today's services underserve. The scores are illustrative, on a 0–100 scale.

| Factor | Our product | Competitor A | Competitor B |
|---|---|---|---|
| Sports events | 95 | 40 | 30 |
| Concerts | 90 | 35 | 45 |
| Content for kids (must-have) | 70 | 75 | 70 |
| Movies | 30 | 90 | 85 |
| Relatively low price | 60 | 50 | 65 |

- We aim to be the best at what this segment needs most: sports events and concerts.
- Content for kids stays at parity. Customers are already satisfied with it, but it matters to them.
- Movies are left low on purpose: this segment doesn't rate them as important.

## Mistakes

- **Score needs rather than features.** Scoring features turns the curve into a feature comparison.
- **Keep the curve to seven factors or fewer.** Past seven, the shape stops saying anything.
- **Leave out factors the segment doesn't care about.** Don't keep them because competitors fight over them.
- **Don't try to beat every competitor on every factor.** That is the opposite of a strategy, and usually unaffordable.
- **Don't use one curve for several segments.**
- **Don't treat assumed scores as findings.** Unlabelled guesses look exactly like evidence on a chart.

Each rule's origin, the case that taught it, is in `receipts.md` beside this file; read it when a rule's edge is unclear.

## How you can tell it worked

The curve is for one segment, and every score has a source or is labelled an assumption. Its reading says where the product must be far ahead and what it deliberately doesn't compete on.

## Limitations

Treat upstream examples as patterns. Validate scope and results against current project constraints, available tools and decisions recorded by the owner.

Adapted from [Pawel Huryn’s upstream skill](https://github.com/phuryn/product-engineering/tree/8ebb50bb1b28dc9e8bc669199493e6020b808cc6/product/skills/value-curve).
