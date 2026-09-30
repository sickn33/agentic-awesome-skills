# Common Pitfalls

- **Problem:** a static mapping is described as a completed workspace build.
  **Solution:** deliver manual mappings without a connection; claim a live change only
  after the authorized tool operation succeeds.
- **Problem:** asked all six questions in one message.
  **Solution:** ask one, wait, and drop any the first answer already covered.
- **Problem:** the user said `yes` to "a full count or a cycle count?" and it was recorded
  as a full count.
  **Solution:** that question had no yes/no answer to give, so `yes` is not a choice. Re-ask
  it as an explicit either/or and wait.
- **Problem:** `20 to 50` to "how many items, and when did you last count?" filled in a count
  date as well.
  **Solution:** keep only the answered half. The date stays `Unknown`.
- **Problem:** `Manager` was copied into `Verified By` because the manager also approves
  adjustments.
  **Solution:** three roles, three questions, three answers. Approval says nothing about
  verification.
- **Problem:** an illustrative count was shipped in the CSV and got counted as a real count.
  **Solution:** the template is a header row. Add a data row only when the user asks for one,
  and label it.
- **Problem:** quantities, locations and variance reasons were filled with plausible values
  to make the template look finished.
  **Solution:** blank is a correct answer. Unknown is not zero.
- **Problem:** adjustments posted with no approver and no reason.
  **Solution:** leave the status at `In progress` until the reason and the approver are
  recorded. A variance without an investigated cause is a question, not an adjustment.
- **Problem:** a variance was marked `Done` because the adjustment had been booked.
  **Solution:** a booked adjustment is not an investigated one. The reason and the approver
  are the gate.
- **Problem:** a shortage was quietly written down to make the books agree.
  **Solution:** record the difference and mark it for review. A forced tie-out is a hidden
  adjustment.
- **Problem:** built a full system when one table was asked for.
  **Solution:** build what was requested; mention the parent skill separately.
- **Problem:** all four artifacts drift apart.
  **Solution:** derive all four from the Field Reference table, never by hand.
- **Problem:** Notion import shows every column as Text.
  **Solution:** that is expected. Apply the property mapping table once, after import.


See the [Related Skills](references/related-skills.md) reference for the full guidance.
