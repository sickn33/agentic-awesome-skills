# Credit Cycle Analysis: Security Notes


- Never fill in real customer or supplier names, balances, invoice numbers or bank details.
  Placeholders only.
- Label example rows as synthetic, and keep bank and payment references masked.
- Local reads, generation commands, and validation are part of a requested artifact build.
  External writes, messages, provisioning, and publication require authorization for that
  action and target; existing explicit authorization does not need to be repeated.
- If the user pastes a real ledger extract, generate the template and tell them to delete the
  pasted data from the conversation.
- A cycle analysis names customers and suppliers alongside how badly each one is paying. Treat it
  as commercially sensitive and keep it inside the finance function.
- Privacy, legal and disciplinary cases need a qualified human reviewer before anything is acted
  on.

