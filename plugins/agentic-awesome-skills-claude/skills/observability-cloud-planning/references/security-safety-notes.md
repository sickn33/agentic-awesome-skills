# Security & Safety Notes

- Never invent a hostname, IP address, service identifier, provider, price, traffic figure,
  error rate, uptime percentage or recovery time. `Unknown` and blank are correct.
- Never paste credentials, API keys, tokens, SSH keys, database connection strings, backup
  locations or `.env` contents into this table. Not into a dashboard field, not into Notes.
- Never paste real customer data, personal data, health data or payment data into this
  table. `Data Handled` records the *category*, not the data.
- Do not put secrets, tokens or personal data in log lines. That decision is made when
  logging is configured, and this table is where the consequence is recorded - so a
  service that would log secrets belongs in a different design.
- Sending logs to a third-party service is a data transfer. Confirm the destination, the
  agreement, the region and the retention before enabling it, and record the decision in
  `Notes`.
- `Data Handled` = `Credentials or secrets` means access to those logs is itself a
  privileged operation. Restrict it and review who has it.
- Never leave a monitoring endpoint unauthenticated. A public status page that leaks
  internal hostnames or error detail is an information disclosure.
- Alert channels contain contact details. Keep the register in an access-restricted place;
  do not paste a real phone number or escalation tree into a shared spreadsheet while
  prototyping.
- If a monitoring tool is given production access, scope it to read-only and to the minimum
  needed. An observability agent with write access to the thing it observes is a real
  privilege.
- Local reads, generation commands, and validation are part of a requested artifact build.
  External writes, messages, provisioning, and publication require authorization for that
  action and target; existing explicit authorization does not need to be repeated.


See the [Common Pitfalls](references/common-pitfalls.md) reference for the full guidance.
