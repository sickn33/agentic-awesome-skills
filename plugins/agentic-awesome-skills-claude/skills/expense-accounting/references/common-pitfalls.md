# Common Pitfalls

- **Problem:** a static mapping is described as a completed workspace build.
  **Solution:** deliver manual mappings without a connection; claim a live change only
  after the authorized tool operation succeeds.
- **Problem:** asked all six questions in one message.
  **Solution:** ask one, wait, and drop any the first answer already covered.
- **Problem:** opened by asking for the largest expense category.
  **Solution:** the first question targets the biggest missing fact that changes the output -
  here, whether the scope is expense entries only or expense entries plus payments.
- **Problem:** the user said `yes` to a two-way question and it was treated as a choice.
  **Solution:** re-ask as an explicit either/or and wait.
- **Problem:** a partial answer filled in the half the user never gave.
  **Solution:** record only the answered part; leave the rest `Unknown` and never turn it
  into 0.
- **Problem:** no bill, so a Kharche/Kharpai was raised to close the entry.
  **Solution:** check the transaction type first. Only farmer and individual purchases, wage
  sheets and rent records genuinely lack a formal invoice. Everywhere else, chase the bill.
- **Problem:** VAT rate was filled in with 18 because the business is registered.
  **Solution:** registration is not a rate. Leave it `Unknown` until the user supplies it.
- **Problem:** `Amount` was treated as tax-exclusive because that is what the last vendor
  did.
  **Solution:** the basis is per-invoice and must be stated. Ask, and record the answer.
- **Problem:** `Net Payable` was added and quietly computed as Amount + VAT - TDS.
  **Solution:** the formula has to be defined and confirmed first, or the field stays out.
- **Problem:** payment and TDS fields appeared in an expense-only table.
  **Solution:** they are payment-stage facts. Add them only on a stated scope change.
- **Problem:** the document type is right but nothing is attached.
  **Solution:** link `Source Document` so the entry carries its own evidence.
- **Problem:** TDS was deducted here but never reached the TDS register.
  **Solution:** add the withholding fields deliberately and hand the deduction to
  `tds-booking-payment`.
- **Problem:** built a full system when one table was asked for.
  **Solution:** build what was requested; mention the parent skill separately.
- **Problem:** all four artifacts drift apart.
  **Solution:** derive all four from the Field Reference table, never by hand.
- **Problem:** Notion import shows every column as Text.
  **Solution:** that is expected. Apply the property mapping table once, after import.


See the [Related Skills](references/related-skills.md) reference for the full guidance.
