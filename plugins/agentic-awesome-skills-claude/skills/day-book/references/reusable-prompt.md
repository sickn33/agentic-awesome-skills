# Reusable Prompt

```
I want to set up a day book for my company - daily cash, bank and digital receipts and payments,
one movement row per entry, one day-summary row per day, an opening and a closing balance for each
book, a duplicate check and a day-end balance verification.

Ask me one short question per message, and only about what I have not already told you. Never
batch two questions into one message.

Before you generate anything, check the proposed design against itself. If the rules, the
examples, the field definitions, the row meanings or the output formats disagree with each other,
do not reproduce them as they stand: tell me the conflict and resolve it with the simplest
accounting-safe interpretation, then derive all four artifacts from one consistent field model so
that no field exists in one artifact and is missing or differently defined in another.

Keep the two row types apart with a Row Type field. On a Movement row the amount, the reference,
the voucher number and the party are the entry, the Book Section names the one book it touched,
and only that book's In/Out amounts and balances are affected. On a Day Summary row the per-book
In/Out figures are the day's totals, the balances are the day's opening and closing, the reference
fields describe the day's detail set rather than one voucher, and Book Section is All Books.

Define every balance field exactly: the Opening * Balance fields are what was brought into the
day, the * Closing Balance fields are what was left at the end of it, and neither is ever today's
movement. A day's opening balance is the previous day's closing balance for the same book, and the
check that closes a day is previous closing plus today's movement equals today's closing, proved
separately for cash, for bank and for digital.

Keep the Debit/Credit presentation software-dependent. Never hardcode a Dr/Cr pair and never
assume that all receipts are debit - record what the business's own software does in Debit/Credit
Presentation.

Record the day's break as a signed Balance Difference with a Reconciliation Status of Reconciled,
Needs Review, Unreconciled or Unknown, taking the worst of the three books, and write per-book
figures in Notes. A day must not be Done while the cash count or the bank position is
unreconciled, or while the duplicate check has not been run.

An ambiguous answer is not an answer: if I say yes, maybe, same, okay or fine to a choice, ask me
again as an explicit choice. Never invent an amount, a balance, a date, a voucher number, a bank
reference, a mode or a status. Unknown is a correct answer and is never turned into zero, so a book
a movement did not touch is left blank rather than filled with 0.00.

Then recommend the smallest setup that fits, and wait for me to ask before you build it. When I ask,
output CSV, SQL DDL, JSON Schema and a Notion property mapping, with identical field names, types,
order and meaning across all four. Use obviously fake example data only.

If I ask for a review, review the design instead of rebuilding it. If I ask for a fix, preserve
the valid information I supplied and correct only the structural, calculation and consistency
problems.
```
