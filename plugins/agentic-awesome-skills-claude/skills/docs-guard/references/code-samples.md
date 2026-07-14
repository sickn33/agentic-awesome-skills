# Docs Guard — Code Sample Rules

A code sample is the most-trusted part of any documentation: readers paste it. That trust makes a broken sample worse than no sample.

## Contents

- Shippable sample checklist
- Realistic data
- Secrets and credentials
- Error-path examples
- Language and environment tags
- Sample drift

## Shippable sample checklist

Every sample must pass all of these:

1. **Imports resolve** — every import/require/use names a real module at the documented version.
2. **APIs are real** — every call verified per [verification.md](verification.md): name, argument order, defaults, return shape.
3. **Self-contained or explicit** — runs on a clean machine, or states its prerequisites immediately above the block ("requires the client from the previous step").
4. **No local residue** — no `/Users/yourname/`, no `C:\Dev\`, no machine-specific ports or hostnames; use placeholder conventions the project already uses.
5. **Syntactically valid** — parse it mentally line by line; when the runtime allows, actually run or lint it.
6. **Output shown is output produced** — if the sample shows a result, that result must be what the code yields, not an idealized version.

## Realistic data

Use data that exposes the API's shape honestly: realistic field names, plausible values, at least one non-ASCII string where text handling matters. `foo`/`bar` hides bugs that `"Café Münster"` reveals — especially for the i18n-aware audience.

## Secrets and credentials

- Placeholders that cannot be mistaken for real values: `YOUR_API_KEY`, `example.com`, RFC 5737 IPs (`192.0.2.x`), `sk_test_…` style markers only when the provider defines them.
- Never paste real-looking tokens — even invented ones train readers to paste theirs, and secret scanners will flag the repo.
- Auth setup goes in one place and is linked, not repeated with variations in every sample.

## Error-path examples

For any API that can fail in normal operation, show one failure: what the error object/exception/status looks like and the minimal correct response to it — using the error types the code actually raises (verify the raise site). Happy-path-only documentation produces catch-all error swallowing downstream, the exact failure clean-code-guard exists to stop.

## Language and environment tags

- Fenced blocks carry the correct language tag — broken highlighting is a trust signal readers notice.
- State the environment when it changes behavior: shell prompts (`$` vs `#`), OS-specific paths, version-gated syntax.

## Sample drift

Samples drift faster than prose because nobody re-runs them. On any code change touching a documented API, grep the docs for the old symbol (SKILL.md Rule 6) — samples are where the stale hits hide. Projects with executable-docs tooling (doctest and kin): prefer it; this skill's manual verification is the floor, not the ceiling.
