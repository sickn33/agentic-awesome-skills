# Requirements Writing Cheatsheet

## EARS pattern picker (choose by the trigger)

| If the behaviour is… | Use | Template |
|---|---|---|
| always active (no trigger) | **Ubiquitous** | The `<system>` shall `<response>`. |
| fired by a discrete event | **Event-driven** | When `<trigger>`, the `<system>` shall `<response>`. |
| active throughout a state/mode | **State-driven** | While `<state>`, the `<system>` shall `<response>`. |
| only present in some variants | **Optional-feature** | Where `<feature>`, the `<system>` shall `<response>`. |
| a fault / error / safety case | **Unwanted-behaviour** | If `<condition>`, then the `<system>` shall `<response>`. |
| gated by state *and* event | **Complex** | While `<state>`, when `<trigger>`, the `<system>` shall `<response>`. |

## Quality-characteristics checklist (per requirement)
Necessary · Appropriate (what, not how) · Unambiguous · Complete · **Singular** · Feasible · **Verifiable** · Correct · Conforming.
> Two-question gate: **Is it necessary? Can I write a pass/fail test?** Most weak requirements fail one of these.

## Decision rules
- When you can't state the pass/fail test in one breath → the requirement is unverifiable; fix the requirement.
- When the response clause contains "and" → it is compound; split it.
- When a requirement names a mechanism → ask if the mechanism is the need; if not, state the need and move the mechanism to design.
- When a number has no tolerance/condition → add value + units + tolerance + the condition it applies under.
- When a requirement traces to no parent need → it may not be necessary; challenge it.

## Verification method (assign one at write time)
**T** Test (measure) · **A** Analysis (model/calc) · **I** Inspection (examine) · **D** Demonstration (show operating). No method fits affordably → rewrite.

## Weak words to ban (replace with a measurable criterion)
user-friendly · robust · fast · quick · minimal · flexible · efficient · seamless · support · handle · process · as appropriate · etc. · and so on · including but not limited to · optimal · state-of-the-art.

## Tells & smells
- A requirement longer than ~2 lines → probably compound or carrying design detail.
- "It shall be possible to…" / passive voice → no named responsible system.
- A list of bullets under one ID → multiple requirements masquerading as one.
- Adjectives with no number → unverifiable.
- No "If/Then" requirements anywhere → fault and safety behaviour likely missing.

## Sources (cited, not reproduced)
EARS method © its authors (Mavin et al., 2009) — patterns described here in original words. Quality-characteristic and verification guidance aligns with NASA public-domain SE guidance (NPR 7123.1 / SE Handbook). For authoritative requirement-quality wording, consult ISO/IEC/IEEE 29148 directly (not reproduced here).
