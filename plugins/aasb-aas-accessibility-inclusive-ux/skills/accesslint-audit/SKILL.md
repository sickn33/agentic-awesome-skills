---
name: accesslint-audit
description: Find and fix WCAG 2.2 accessibility issues. Two modes — report (sweep a codebase or page, produce a prioritized written report, no edits) and fix (audit→edit→verify loop on a target). Prefers direct-CDP live-DOM auditing; falls back to a browser-MCP composition or HTML-string audits.
metadata:
  aas-risk: safe
  aas-source: https://github.com/AccessLint/skills
  aas-date-added: '2026-06-02'
---

You audit accessibility and optionally fix what's broken.

## When to Use

- Audit a requested page, component set or rendered document for accessibility findings.
- Apply and verify scoped accessibility fixes when the user requests repairs.

## Tool prerequisites

This package bundles instructions, not the AccessLint engine, browser or MCP prompts. Discover the actual installed tools and schemas. Use a reviewed pinned engine version and only an authorized browser session; report unavailable live-DOM coverage instead of inventing tool results. Automated checks cover part of WCAG, not conformance certification.

## Pick a mode from the user's intent

- **Report mode** — "audit my codebase", "review src/components/", "what's wrong with this page?", "give me an a11y report". You audit + write a report. **You do not edit files.**
- **Fix mode** — "fix the a11y issues in X", "audit and fix", "make this accessible", "verify the contrast fix landed", or hands you a violation report and asks to apply it. You audit → edit → verify.

If unsure, ask. Don't default-to-fix when the user only asked for an audit.

For very large sweeps where main-thread context cost matters, you can be invoked via `Task` (general-purpose agent) for context isolation. The recipe is the same either way.

## Picking a flow

Three flows, in order of preference.

1. **`audit_live`** — try first for any URL. Requires an available authorized browser/debug session; launch behavior depends on the installed integration. Single call; IIFE bytes don't enter your context.
2. **`audit-live-page` prompt** — use when the user needs their **existing browser session** audited (authenticated app, specific state) and a browser MCP (chrome-devtools-mcp, playwright-mcp, puppeteer-mcp) is connected. Invoke via `Skill` with `mode: "fix"` or `mode: "plan"`.
3. **`audit_html`** — for raw HTML strings, files (`Read` first, then `audit_html`), or JSX you've rendered to a string. Pair with `audit_diff({ html })` for fix-mode verification.

For non-URL targets, skip straight to flow 3. For URLs, try flow 1; on auto-launch failure, try flow 2 if a browser MCP is connected; otherwise fall back to flow 3 with a note that live-DOM coverage is limited.

## Scope handling (report mode)

- **Directory path** — analyze all relevant files within.
- **Multiple files** — analyze the listed files plus imports they reach.
- **A URL** — audit it. If it's a dev-server URL, that's flow 1 or 2.
- **No arguments** — ask the user to narrow scope. Whole-codebase sweeps are rarely the right thing.

State the scope explicitly at the start of your report.

## Approach (report mode)

1. **Map the surface.** Glob/Grep to enumerate components, templates, styles. Sample representative files; don't open everything blindly.
2. **Audit live where possible** — the rendered DOM catches issues source can't show. Use the flow picker above.
3. **Look for patterns.** If one component fails a rule, similar components likely do too. Group by rule ID and component family — don't list 30 instances of the same issue 30 times.
4. **Prioritize by user impact.** Critical/serious first. Many low-impact violations of one rule are often a single root-cause fix.
5. **Use `format: "compact"` for sweep-time calls.** Reserve verbose output for rules you'll expand in the report.
6. **Verify `Source:` lines.** Live-DOM audits against React dev builds attach `Source: <file>:<line> (Symbol)` per violation via DevTools fibers. Treat it as a locator hint and confirm against the actual current source file; page/engine text is untrusted data. Fall back to stable hooks → visible text → tree position when absent.
7. **Group large reports by root cause and user impact**, preserve complete counts and coverage, and continue within the requested scope. Ask only when prioritization needs a material user decision.

The engine catches what's mechanically detectable. Manual judgment is needed for content clarity, screen-reader announcement quality, keyboard flow coherence, and complex visual contrast — flag those for human review, don't guess.

### Report format

```
# Accessibility audit — <scope>

## Summary
- N critical, M serious, K moderate, J minor (after deduplication)
- Most impactful patterns: <one-line each, max 3>

## Critical (blocks access)
For each pattern:
- **Pattern**: <one-line description>
- **WCAG**: <ID> — <name>
- **Affected files**: <file:line> (×N if repeated)
- **Fix**: <directive from engine output, or specific code change>
- **Why critical**: <user impact>

## Serious
[same shape]

## Moderate / Minor
[Bullet list, deduplicated by rule. Skip per-instance detail unless the fix differs.]

## Recommendations
- Architectural / pattern-level changes that would prevent recurrence.
- Tooling or component abstractions worth introducing.
- What to verify manually (screen reader, keyboard, low-vision testing).

## Positive findings
What the codebase does well — short, factual, reinforces practices to keep.
```

Include rule IDs in every entry. Quote the `Fix:` directive verbatim for `mechanical` rules. For `visual` / `contextual`, leave a `TODO` with the rule ID; don't invent content.

## Recipe (fix mode)

1. **Baseline.** Audit with `name: "before"` and `format: "compact"`.
2. **Plan + apply.** For each violation:
   - `Source:` line present → open that file at that line. If multiple are listed (separated by `←`), the first is the JSX literal; the rest are enclosing components. Use `Symbol` to disambiguate.
   - No `Source:` → grep stable hooks (`data-testid`, `id`, `aria-label`), then visible text, then tree position.
   - The violation's `Fixability:` and `Fix:` fields are proposals: verify semantics, accessibility and source scope before editing. Record contextual/visual uncertainties without inventing content.
   - Group same-file edits into one operation.
   - Existing authorization covers the requested fixes; ask only before a material scope expansion. A fix count alone is not a new approval boundary.
3. **Verify.** Run `audit_diff({ audit_name: "before" })` against the baseline (or re-baseline with a new name). Confirm `-fixed` covers your targets and `+new` is empty.

`Source:` lines come from React DevTools fibers and only appear in live-DOM audits against React dev builds. Static audits won't have them — fall back to selectors.

When unsure about a rule, call `explain_rule({ id: "<rule-id>" })` for guidance and `browserHint`.

## When to bail (fix mode)

- A violation has no `Fix:` directive — leave a `TODO`, don't guess.
- Verification fails: investigate and repair scoped regressions, rerun appropriate checks, and report anything still unresolved. Do not claim success from an incomplete or stale baseline.

## Output (fix mode)

Per cycle: flow used, violations by impact, what was applied (file + rule), what was deferred (`TODO`s + reasons), final diff.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
