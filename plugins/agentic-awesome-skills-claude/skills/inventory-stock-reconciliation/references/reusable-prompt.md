# Reusable Prompt

```
I want to set up physical counts against book quantities, differences investigated and
authorised adjustments, for my company.

Ask me one short question at a time, and only about information I have not already
provided. Treat an ambiguous answer such as "yes" to a multiple-choice question as
unresolved and ask me to choose. If I answer only part of a question, record that part and
leave the rest unknown. If I do not know something, record it as unknown rather than
guessing, and never record unknown as zero.

Never infer or invent names, dates, quantities, values, locations, approvals, variance
reasons, roles or any other business fact.

Keep counting, verification and adjustment approval as three separate roles. Ask who counts,
who verifies and who approves an adjustment as three separate questions, and never fill one
from another.

Then recommend the smallest setup that fits my confirmed context and wait for me to ask
before you build.

When I ask you to build it, output only the artifacts I requested - CSV, SQL DDL, JSON
Schema and/or a Notion property mapping - as empty templates, using one identical canonical
field list, with identical field names and order, across all of them.

Do not include invented or illustrative transaction rows unless I explicitly request an
example row, and label any example row clearly as illustrative. A variance with no
investigated reason stays unresolved, and no record is marked done while a required check
is outstanding.
```
