# Common Pitfalls

- **Problem:** fields the business treats as mandatory are not in `required`.
  **Solution:** requiredness comes from the confirmed field list, not from intuition. If
  the user confirms it, it is added; if not, it stays optional and rejecting real data is
  the worse failure.
- **Problem:** an `enum` rejects a status the business actually uses.
  **Solution:** use `enum` only for a confirmed taxonomy. Where the options are a starting
  set, the property is a plain `string`.
- **Problem:** `"null"` is allowed everywhere, or nowhere it should be.
  **Solution:** allow `null` only where the source distinguishes null from missing.
  Otherwise omit the field instead of sending an invented null.
- **Problem:** the schema has `additionalProperties: false` and the sender is a partner
  whose payload carries one extra field.
  **Solution:** that strictness is a decision, not a default. Ask once, and loosen it
  where the contract is open.
- **Problem:** a calculation is expected of a computed field.
  **Solution:** the schema carries the type only. The producing system computes the
  value, and this skill does not restate the rule.
- **Problem:** the property names differ from the module's.
  **Solution:** they come from the module's Field Reference. A renamed property is a
  renamed column, and the two files stop being the same field list.


See the [Related Skills](references/related-skills.md) reference for the full guidance.
