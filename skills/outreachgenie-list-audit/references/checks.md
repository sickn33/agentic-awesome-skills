# Checked behavior and report interpretation

The contract is based on OutreachGenie's saved flow/list interface as reviewed on 16 October 2026. These are product limits, not universal LinkedIn limits. Recheck the contract when the service changes; the helper rejects an unfamiliar builtin-field catalog.

| Text-bearing saved action | Field | Limit and unit |
| --- | --- | --- |
| `send_connection_request` | `invite_note` (or `inviteNote` fallback) | Optional, 200 UTF-16 units |
| `send_message` | `message` | Required, 1,000 Python Unicode code points |
| `message_sequence` | Each `messages[i].message` | Required, 1,000 code points |
| `comment_post` | `comment_text` (or `commentText` fallback) | Required, 1,000 code points; may appear in older saved flows |

Emoji outside the basic multilingual plane use two UTF-16 units. The helper checks raw invitation notes and raw message/sequence text lengths, then checks per-prospect rendered text. Missing required text is reported; optional empty invitation notes are contextual because the product omits the note. Oversized rendered text is a product execution problem. Do not imply the rest of a campaign would execute correctly.

The helper checks sequence count and message-ID shape, but **does not** validate sequence delays, all action config, graph reachability, branch conditions, reply checks, workspace limits or schedules. Non-text actions are listed under `unchecked_actions`. Every saved supported action node is inspected, including nodes a particular prospect might never reach.

When both snake_case and camelCase names exist for the same field, the helper reports `ambiguous_text_field_aliases` and skips that text field rather than assuming the order used by runtime key normalization.

## Template behavior

Builtins: `first_name`, `last_name`, `company`, `title`, `email`, `phone`, `linkedin_url`. `{{note}}` is forbidden. Custom fields can use `{{custom_fields.topic}}` or `{{topic}}`. The custom prefix form normalizes its key to lowercase; bare aliases must already follow the lowercase identifier rules. Tokens cannot contain internal whitespace. Malformed/unbalanced tokens are reported and per-record rendering conclusions for that text are skipped.

Campaign activation compares referenced custom keys to **each selected list's raw `custom_field_metadata` keys**. The workspace catalog is a union and does not prove that every list has a field. A catalog formatter may normalize a key while activation still compares the stored raw key; the helper follows the latter when auditing list metadata.

Values substitute once, then the result is stripped. A saved value containing `{{first_name}}` stays literal after substitution; the helper flags this as context rather than recursively expanding it. Empty, `null`, `false` and zero values render empty. Missing values can leave a nonempty but poor message, so report them even when length passes.

## Findings and next decisions

- `coverage_issue`: missing, inconsistent or duplicate collection evidence. Finish or recapture the selected scope before making completeness claims.
- `template_issue`: malformed tokens, a custom field missing from selected-list metadata, empty required text, or raw/rendered product-limit failures. Identify the exact list/prospect/node/field combination for review.
- `unknown`: uncaptured/unsupported values or missing active-campaign context. Obtain the missing read evidence; do not treat it as a blank or a pass.
- `review`: a captured template value is empty. Decide whether to complete the source data or revise the wording in a separate task.
- `context`: active campaigns on a selected list, empty optional notes, literal braces or privacy-sensitive `email`/`phone` references. These are context, not automatic errors or permission to modify active campaigns.
- `unsupported`: unavailable configuration or no supported outbound text fields. The report cannot stand in for a full flow check.

Reports omit raw saved field values and rendered text. They contain identifiers and field names, and therefore are still private work products. Zero findings means only that these checks found none in the supplied evidence. It says nothing about deliverability, truth, targeting quality, current LinkedIn profile state, permission to contact or provider policy compliance.
