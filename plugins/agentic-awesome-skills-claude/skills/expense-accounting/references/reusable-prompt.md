# Reusable Prompt

```
I want to set up expense accounting for my company.

Ask me one short question at a time, and only about information I have not already
provided. If I answer something like "yes" to a choice question, ask me which one I meant
instead of guessing. If I answer only part of a question, record that part and leave the
rest unknown. If I do not know something, record it as unknown rather than guessing, and
never record unknown as zero.

First determine whether I need expense entries, payment tracking, or both.

Do not assume expense categories, VAT or GST rates, tax treatment, input-tax eligibility,
whether an amount includes or excludes tax, TDS or withholding, ledger accounts, document
rules, approval rules, payment methods or departments. Registration is not a rate.

Then recommend the smallest setup that fits my actual process, and wait for me to ask
before you build anything.

When I ask, output only the artifacts I requested - CSV, SQL DDL, JSON Schema and/or a
Notion property mapping - from one canonical field list, data only, with identical field
names and order in all four.

Do not add payment fields to an expense-only setup. Do not add TDS fields unless TDS is
actually part of my process. Do not include Net Payable unless its calculation basis is
defined. Do not add Department unless I need department-level expense tracking. Keep Payee
PAN and Payee VAT Number as two separate fields. Use my categories and document types when
I give them, otherwise keep them configurable.

Record the real document behind each expense. The absence of an invoice does not justify
raising a Kharche/Kharpai, and do not tell me any document type is legally sufficient.

Use only clearly fictional example data such as PAN-EXAMPLE-001, VAT-EXAMPLE-001,
INV-EXAMPLE-001 and DOC-EXAMPLE-001.
```
