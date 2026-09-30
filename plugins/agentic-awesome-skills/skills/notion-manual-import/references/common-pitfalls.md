# Common Pitfalls

- **Problem:** every column imported as Text and the user assumes the import failed.
  **Solution:** that is normal. A CSV carries no types. Apply the property mapping once,
  after import, in the order above.
- **Problem:** dates or money behave as free text in the new database.
  **Solution:** convert those properties to Date and to Number with the format the user
  names. Never map money to Text.
- **Problem:** select options are missing, or invented.
  **Solution:** add only the options the confirmed schema defines, and let the user rename
  them to match how the business talks.
- **Problem:** the ID column is plain text, or IDs are generated for records that have
  none.
  **Solution:** convert to Unique ID with the source prefix where that fits, or keep the
  imported value as Text. Never mint production IDs.
- **Problem:** relation columns do not link.
  **Solution:** the target database has to exist first. Import both, then convert the
  column to Relation by hand and verify the links.
- **Problem:** the whole table was rebuilt when a conversion was all that was needed.
  **Solution:** emit only the corrections that were asked for.
- **Problem:** the user is told a Notion action happened.
  **Solution:** this skill only emits text. Say the user does the import and the
  configuration, and say which step they are on.


See the [Related Skills](references/related-skills.md) reference for the full guidance.
