# Common Pitfalls

- **Problem:** a static mapping is described as a completed workspace build.
  **Solution:** deliver manual mappings without a connection; claim a live change only
  after the authorized tool operation succeeds.
- **Problem:** asked all six questions in one message.
  **Solution:** ask one, wait, and drop any the first answer already covered.
- **Problem:** the day book was built with hardcoded Debit and Credit columns, or receipts were
  assumed to be on the debit side.
  **Solution:** the presentation depends on the software's format. Capture it in
  `Debit/Credit Presentation` instead of assuming a universal rule.
- **Problem:** a summary row got read as one more movement, and the day's totals were added to the
  day's movements.
  **Solution:** `Row Type` is what tells them apart. A `Day Summary` row books no money; it totals
  the `Movement` rows above it and tests the identity per book.
- **Problem:** a balance field was read as today's money moved.
  **Solution:** the balance fields are balances. The `Opening * Balance` fields are brought
  forward, the `* Closing Balance` fields are what is left after the entry or the day.
- **Problem:** the Overview claimed the day row proved the balance while the model had no field
  that could record whether it did.
  **Solution:** a check with no field is a claim. `Balance Difference` and `Reconciliation Status`
  are the fields that make the day-end control real.
- **Problem:** an earlier bare `Balance Verified` yes/no was marked `Yes` on a day when the cash
  was short and only the bank had been agreed.
  **Solution:** `Reconciliation Status` takes the worst of the three books, and `Balance
  Difference` says by how much.
- **Problem:** the day was marked `Done` with the cash drawer uncounted and the bank position
  unagreed.
  **Solution:** a day must not be `Done` while the cash count or the bank position is
  unreconciled, or while `Duplicate Check` is `Not Checked`. The day is `In progress` until a
  human accepts a recorded difference.
- **Problem:** a balance break was absorbed by editing the closing balance so the row tied.
  **Solution:** record the signed difference, set the status, and leave the component alone.
- **Problem:** a book a movement did not touch was filled with `0.00`.
  **Solution:** leave it blank. Blank means not applicable on this row; zero claims a count was
  taken and the drawer was empty.
- **Problem:** the same cheque or UTR is entered twice and both stay.
  **Solution:** run the duplicate check on the transaction reference, set `Checked - Duplicate
  Found`, and resolve it with a human.
- **Problem:** the balance is verified only at month end.
  **Solution:** day end is the control. `Reconciliation Status` = `Unknown` is what an uncounted
  day looks like.
- **Problem:** a day-book line is written with no source document.
  **Solution:** the line is a claim. Link the source or mark the entry blocked.
- **Problem:** a field existed in the CSV but not in the SQL, or was defined differently in the
  JSON Schema or the Notion mapping.
  **Solution:** derive all four from one field list, and run the internal-consistency check before
  the artifacts go out.
- **Problem:** built a full system when the daily book alone was asked for.
  **Solution:** build what was requested; mention the parent skill separately.
- **Problem:** all four artifacts drift apart.
  **Solution:** derive all four from the field list in this file, never by hand.
- **Problem:** Notion import shows every column as Text.
  **Solution:** that is expected. Apply the property mapping table once, after import, and add the
  Select options then.


See the [Related Skills](references/related-skills.md) reference for the full guidance.
