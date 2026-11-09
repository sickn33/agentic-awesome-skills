# Review output format

This is the format for a review `better-interface` orchestrates.

## Scope and coverage

State the exact scope, stack and styling conventions, the project convention documents found in recon and any review boundary. Then show coverage:

| Domain | Evidence inspected | Result |
| --- | --- | --- |
| Accessibility | Files, components, states or checks | Findings count or `Clear` |

Include every domain listed under **Use domain skills as the sources of truth**. `Clear` means inspected with no actionable finding; `Not reviewed` must explain why.

## Findings

One table, ordered by severity, then by reach:

| Severity | Domain | Location | Before | After | Why |
| --- | --- | --- | --- | --- | --- |
| HIGH | Accessibility | `src/Dialog.tsx:42` | `<button><XIcon /></button>` | Add `aria-label="Close"` and hide the icon from the accessibility tree | The icon-only control has no accessible name |

- **Severity** comes from **Rank by user impact**.
- **Domain** is the owning skill without the `better-` prefix.
- **Location** is `path/to/file:line`, or the exact screen and component when the artifact has no source files.
- **Before** and **After** show the current implementation and an actionable replacement, each in its own cell.
- **Why** names the violated principle and its user impact.

With no findings, omit the table and state "No actionable interface findings."

## Verification

List each check or interaction, the exact command or steps and the observed result. Separate checks that passed from checks marked **Not verified**.

## Verdict

End with one of two:

- `Block`: one or more `HIGH` findings remain. Do not ship until they are fixed.
- `Approve`: no `HIGH` findings remain. Any `MEDIUM` and `LOW` findings stay in the table as work to do.

`Approve` covers only the domains the coverage table shows as inspected. Name every `Not reviewed` domain in the verdict line.

## Change-scoped reviews

When `interface-review` hands the review back, use its `## Review output format`. It adds the scope block, a `Status` column and the pre-existing section to the sections above.
