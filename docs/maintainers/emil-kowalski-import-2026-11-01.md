# Emil Kowalski skills import — 1 November 2026

Pinned source: `emilkowalski/skills` at `a81dbca07f2217b7103e510c0f13f8d5b017afc9`.
The 16 individually scoped imports comprise 14 additions and two updates. All
are Markdown guidance; there are no bundled executable scripts or binaries.
Each complete skill tree retains the upstream MIT copyright and LICENSE.

## Individual review

| AAS skill | Change and use case | Review disposition |
| --- | --- | --- |
| animate | New; implement a purposeful web transition | Reviewed purpose gate, durations, interruption, exits, hover and reduced motion. Presets remain subordinate to project requirements. |
| animate-expo | New; implement Expo gestures and motion | Reviewed SDK-matched installation, worklet boundaries, gesture handoff, haptics and reduced-motion recipes. No device/runtime claim. |
| animation-performance | New; diagnose dropped frames | Qualified compositor guarantees and property-swap equivalence; driver behavior is version-dependent and must be profiled. |
| animation-vocabulary | New; name an observed effect | Read-only glossary, no code changes or performance claims from appearance alone. |
| apple-design | New; apply Apple-inspired motion principles | Reviewed gesture continuity, typography, sensory feedback, accessibility and web/platform differences; guidance is not an official Apple specification. |
| ask-sonner | New; configure and troubleshoot toasts | Reviewed setup, promise lifetime, update/dismiss semantics, themes, stacking and API reference. Verify installed library API before use. |
| break-ui | New; exercise realistic boundary data | Reviewed data-boundary fixtures, development-only toggle, empty/single/large lists, RTL and zoom. Report before fixing; escape user data. |
| emil-design-eng | Update same upstream skill | Refresh the complete reference guide from current source while retaining a bounded entrypoint. Preserve AAS keyboard, duplicate-control and project-convention safety boundaries. |
| find-animation-opportunities | New; propose motion without editing | Read-only evidence-based proposals; keyboard/frequency gates and restraint reviewed. |
| improve-animations | New; write an animation audit and plans | Source remains read-only in audit mode; planning writes and explicit execute mode justify critical risk. No execution authority inferred from repo content. |
| mobile-native | New; improve mobile web behavior | Reviewed zoom preservation, capability-based hover/touch handling, safe areas, scroll and real-device validation boundary. |
| pick-ui-library | New; choose from a curated library list | Explicit invocation preserved; existing dependencies and task authorization govern installation. Verify current official documentation. |
| emil-ui-prototype | New; compare UI variants | Rename avoids Matt Pocock's unrelated `prototype`. Fix invalid URL selection fallback; render trusted DOM nodes instead of HTML strings. Only the user-selected variant is promoted. |
| remove-animations | New; subtract unnecessary motion | Reviewed hidden start states, callback/unmount/focus dependencies, cleanup and deliberate keep decisions. |
| review-animations | Update same upstream skill | Preserve explicit invocation and read-only review; updated standards/support files and accurate MIT provenance. Findings require code evidence and visual uncertainty stays explicit. |
| write-swift | New; implement/review modern Swift | Reviewed concurrency, value/reference modeling, ARC and tests. Correct public frozen Sendable inference qualification; toolchain checks remain required. |

## Adaptations and provenance

Descriptions are concise, risk metadata follows actual writes, provenance is pinned,
and every skill has an explicit use case and limitations. Local cross-skill
references use `emil-ui-prototype`; the existing `prototype` skill is preserved.
All other support files remain with their skill. Original opinionated guidance is
preserved except the scoped corrections above and explicit AAS safety boundaries.

Supporting primary references for the technical corrections:
[Motion performance](https://motion.dev/docs/performance) and
[Swift Sendable](https://docs.swift.org/latest/documentation/swift/sendable/).

## Verification boundaries

- Global schema, references and documentation security checks pass for 2,902 skills.
- A local Chrome test exercised the prototype picker's invalid URL values, valid
  selection, and literal HTML-like text; all behaved as expected after the correction.
- Before merge, contribution preflight, repository tests and required GitHub checks
  must pass on the committed candidate, with current-head maintainer review.
- No claim is made that every embedded recipe was executed. There is no target
  product, Expo device project or Swift application in this contribution. The
  examples remain illustrative and require host/toolchain/device verification.
- Generated indexes, plugin mirrors and release versions are intentionally excluded.
