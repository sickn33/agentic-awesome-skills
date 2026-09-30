# Security & Safety Notes

Never put a secret in a schema. Never embed password, token, API key, banking or health values as defaults or examples.
A requested schema may describe a sensitive field without containing its real value.

Never put real personal data in an `examples` block. Examples are obviously fake, and a
schema is published in places a spreadsheet is not.

If the user pastes a real payload to debug it, describe the failing rule instead of
echoing unnecessary personal data. Do not claim that deleting a message erases service storage.


See the [Common Pitfalls](references/common-pitfalls.md) reference for the full guidance.
