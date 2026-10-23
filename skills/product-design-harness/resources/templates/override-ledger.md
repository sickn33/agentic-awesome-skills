# Override Ledger

One row per verdict override, kept where every reviewer can see it.
The ledger exists because one override is judgment and ten quiet
overrides are policy nobody agreed to.

Rules:

- Any new review of a direction with an active override must list that
  override in its inputs.
- Three or more active overrides on one product area force a `verify`
  on the next review of that area, with this ledger cited as evidence.
- A row leaves the Active table only by expiry, a fired tripwire, or a
  renewal review - never by deletion. Move it to History with the exit
  reason.

## Active

| override_id | review_id | accountable_owner | overridden_verdict | expires_at | tripwire status |
|---|---|---|---|---|---|
| | | | | | |

## History

| override_id | exit reason (expired / tripwire fired / renewed by review) | date |
|---|---|---|
| | | |
