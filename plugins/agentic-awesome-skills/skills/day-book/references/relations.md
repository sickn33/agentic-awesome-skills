# Relations

Link fields: `Source Documents`

`Source Documents` points at the filing register, so a day-book line can be traced back to the
voucher, receipt or bank advice behind it. In SQL it is `VARCHAR(255)` with a comment rather than
a foreign key, and in Notion it resolves only once the filing register has been imported. The
`VARCHAR(255)` with a comment is deliberate: no `FOREIGN KEY` is declared to a table this build
does not create.

`Transaction Reference` is deliberately free text, not a relation. On a `Movement` row it holds the
receipt, payment or petty-cash number the line came from, and the same number also appears in the
filing register; on a `Day Summary` row it holds the day's own reference. Confirm with the
business whether they want it as a live relation before adding one.
