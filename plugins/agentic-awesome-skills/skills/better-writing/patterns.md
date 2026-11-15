# Copy patterns

Templates for destructive flows and status copy, and recipes for plurals and locale formatting.

## Destructive flows

| Situation | Copy |
| --- | --- |
| Reversible, frequent action | Toast: "Project archived" with an `Undo` action |
| Irreversible, one item | Title: "Delete 'Q3 report'?" Body: "This permanently deletes the report and its 4 comments." Buttons: `Delete report`, `Cancel` |
| Irreversible, many items | Title: "Delete 12 files?" Body: "You can't undo this." Buttons: `Delete 12 files`, `Cancel` |
| Affects other people | Body names who: "The 8 members of Design lose access." |
| Account, workspace or repository | Field label: "Type 'acme-web' to confirm". The button stays disabled until it matches |

An undo toast carries an action, so how long it stays on screen is `better-accessibility`'s.

## Status copy

| State | Pattern | Example |
| --- | --- | --- |
| In progress | Verb in `-ing` plus the object | "Saving changes…", "Loading invoices…" |
| Done | Object plus past-tense verb, no "successfully" | "Changes saved", "Invite sent to sam@example.com" |
| Failed | What didn't happen, then the next step | "Changes not saved. Check your connection and try again." |
| Unavailable | Why, and what unlocks it, beside the control | "Add a payment method to publish" |
| Partial | Counts for both outcomes | "9 of 12 files uploaded. Retry 3 failed files" |

Keep the in-progress and done strings parallel, so "Saving changes…" resolves to "Changes saved".

## Plurals and placeholders

Write one message per sentence in ICU MessageFormat, which most i18n libraries read. The variable sits inside the sentence and the translator moves it:

```text
inbox.count = {count, plural,
  =0 {No new messages}
  one {# new message}
  other {# new messages}
}
invite.sent = {name} invited you to {project}
```

`=0` matches the number zero exactly. `one` and `other` are plural categories, and a translator adds `few` or `many` where the language needs them. Without a library, pick the category with `new Intl.PluralRules(locale).select(count)`.

## Locale formatting

Never hand-build a number, date or list. Pass the user's locale to `Intl`:

| Value | Call | `en-US` output |
| --- | --- | --- |
| Currency | `new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" })` | `€4,320.00` |
| Unit | `new Intl.NumberFormat(locale, { style: "unit", unit: "megabyte" })` | `12 MB` |
| Date | `new Intl.DateTimeFormat(locale, { dateStyle: "medium" })` | `Jun 30, 2026` |
| Relative time | `new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(-1, "day")` | `yesterday` |
| List | `new Intl.ListFormat(locale, { type: "conjunction" })` | `Ana, Ben, and Cy` |

`Intl.ListFormat` follows each locale's own comma and conjunction rules, so never join names with `", "` and `" and "` by hand.
