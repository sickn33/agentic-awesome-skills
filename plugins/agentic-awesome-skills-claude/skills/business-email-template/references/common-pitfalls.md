# Common Pitfalls


- **Problem:** a static mapping is described as a completed workspace build.
  **Solution:** deliver manual mappings without a connection; claim a live change only
  after the authorized tool operation succeeds.
- **Problem:** asked all five questions in one message.
  **Solution:** ask one, wait, and drop any the first answer already covered.
- **Problem:** the template looks great and the mail still goes to spam.
  **Solution:** it is authentication, not design. SPF, DKIM and DMARC, plus a warm-up
  history on the sending domain.
- **Problem:** a `Dear {First Name}` token survived into a send because the sender forgot
  to fill it in.
  **Solution:** an unsubstituted token is the classic spam trigger. Make the field
  required and test the send.
- **Problem:** four people write the same email four ways.
  **Solution:** one template, one structure, one signature block. That is the point of the
  register.
- **Problem:** the invoice email has no attachment path that works on mobile.
  **Solution:** test on a phone, and link the document as well as attaching it.
- **Problem:** the unsubscribe link is 6px grey text at the bottom.
  **Solution:** a working, visible, plain-text-legible link. This is a legal requirement, not
  a design preference.
- **Problem:** marketing email was sent to a list that was never consented.
  **Solution:** that is a compliance incident, not a template defect. Stop the send and
  refer it.
- **Problem:** all four artifacts drift apart.
  **Solution:** derive all four from the field list in this file, never by hand.
- **Problem:** Notion import shows every column as Text.
  **Solution:** that is expected. Apply the property mapping table once, after import.
