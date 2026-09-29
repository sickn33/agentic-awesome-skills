# Credit Cycle Analysis: Best Practices


- Build when requested; recommend and offer a build for advice-only requests.
- One question per message. A batched intake reads as a form and gets guessed at.
- Ask the customer question and the supplier question separately. One answer about terms does not
  carry over to the other side.
- Keep the six concepts apart. Terms, actual, benchmark, aging, gap and funding are six different
  numbers and each has its own field.
- Never substitute terms for actual days, or a benchmark for a target, or a day count for a money
  amount. When the underlying data is missing, the answer is `Unknown`.
- Never put one `Aging Bucket` on a party row. The party row carries bucket amounts; the bucket
  itself belongs to an invoice or a bill.
- Name the two movement fields `Credit Movement` and `Settlement` so the same fields read correctly
  for customers and for suppliers.
- Test the balance identity before reading a single day figure off a row. A cycle measured on an
  unreconciled balance is precise and wrong.
- Record a difference, never repair one. `Adjustments` is where a real adjustment goes, with a
  reason; an unexplained break is left visible with a status.
- Write the basis into `Measurement Basis` and keep it stable across periods. Changing the basis
  mid-year makes the trend a measurement change, not a change in behaviour.
- Where part-payments happen, use the weighted settlement calculation above and say so. Taking the
  final payment date as if it settled the whole invoice understates every day count.
- A benchmark must be the user’s, explicitly chosen, or labelled a proposed default. Never present
  one as a business target.
- Convert days to money only with a recorded monetary basis, and record that basis every time.
- State the gap descriptively. This module measures the timing difference and does not decide
  whether it is acceptable.
- Keep every field name identical across CSV, SQL, JSON Schema and the Notion mapping, in the same
  order. A field that exists in one and not the others is a defect.
- Money fields are `currency`, never `text`. Dates are `date`, never free text. Days are numeric.
  Percentages are stored as `97` for 97%, never `0.97`.
- Round once, at the end, so the components re-derive the total.
- If the user requests an example row, keep it obviously fake so nobody imports it as real data.

