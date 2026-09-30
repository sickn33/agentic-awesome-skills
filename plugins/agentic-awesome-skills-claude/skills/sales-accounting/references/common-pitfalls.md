# Common Pitfalls

- **Problem:** a static mapping is described as a completed workspace build.
  **Solution:** deliver manual mappings without a connection; claim a live change only
  after the authorized tool operation succeeds.
- **Problem:** asked all six questions in one message.
  **Solution:** ask one, wait, and drop any the first answer already covered.
- **Problem:** opened with "how are sales invoices raised today?" when the user had already
  described the process.
  **Solution:** read the request first; ask only what would change the recommendation.
- **Problem:** one status field carrying both "paid" and "overdue".
  **Solution:** split them - `Payment Status` for what was received, `Aging Status` for
  how late it is.
- **Problem:** every row shows a TDS rate, so nobody can tell which invoices actually had it.
  **Solution:** leave it unset unless it was confirmed for that customer.
- **Problem:** credit terms and due date filled in on a cash sale.
  **Solution:** those fields are optional; a cash sale leaves them empty.
- **Problem:** a single table silently truncating a two-item invoice.
  **Solution:** settle the line question in Step 2 - repeated rows or a line table.
- **Problem:** built a full system when one table was asked for.
  **Solution:** build what was requested; mention the parent skill separately.
- **Problem:** all four artifacts drift apart.
  **Solution:** derive all four from the Field Reference, never by hand.
- **Problem:** Notion import shows every column as Text.
  **Solution:** that is expected. Apply the property mapping table once, after import.


See the [Related Skills](references/related-skills.md) reference for the full guidance.
