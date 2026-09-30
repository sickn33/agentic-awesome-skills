# Best Practices

- Build when requested; recommend and offer a build for advice-only requests.
- One question per message. A batched intake reads as a form and gets guessed at.
- Check the design against itself before generating anything, and resolve each conflict with the
  simplest accounting-safe reading rather than reproducing both versions.
- Never hardcode a Debit/Credit rule, and never write that all receipts are debit. The
  presentation follows the software's day-book format, and `Debit/Credit Presentation` records
  what that format actually is.
- Never let one field carry two meanings. `Row Type` says whether a row is a movement or a day-end
  control, and `Book Section` only ever names the book.
- Close the day, not the week. Count the cash, agree the bank balance to the statement and confirm
  the digital wallet balance before the day is marked verified.
- A day's opening balance is the previous day's closing balance. Where they disagree, that is the
  difference - not a fresh number typed in to make the day look complete.
- Record the difference, never repair it. `Balance Difference` is signed, and the component that
  caused it is left alone for a human to resolve.
- Take `Reconciliation Status` as the worst of the three books. A bank that agrees does not
  reconcile a cash drawer that does not.
- Use `Duplicate Check` honestly. `Not Checked` is a valid answer; a false `Checked - Clear` is
  not, and it is not compatible with `Done`.
- One `Movement` row per entry, from the voucher. A day book written from memory is where
  duplicates and omissions come from.
- Leave a book that a movement did not touch blank rather than zero. Blank means not applicable
  here; zero would claim the drawer was counted and empty.
- Keep the narration specific enough to be understood six months later - invoice number, party and
  what it was for.
- Keep every field name, type and position identical across CSV, SQL, JSON Schema and the Notion
  mapping. A field that is in one and missing or retyped in another is the defect, not a detail.
- Money fields are `currency`, never `text`. Dates are `date`, never free text. Round once, at the
  end, so the day re-derives from its movements.
- If the user requests an example row, keep it obviously fake so nobody imports it as real data.
