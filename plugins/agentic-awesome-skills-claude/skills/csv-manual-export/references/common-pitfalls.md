# Common Pitfalls


- **Problem:** the file has an example row the user did not ask for.
  **Solution:** empty by default. A stray row is imported as a real record.
- **Problem:** the target system shows every column as text.
  **Solution:** that is the format, not a fault. Set the types on the far side using the
  mapping, and do not claim the CSV enforces them.
- **Problem:** a value containing a comma splits into two columns.
  **Solution:** quote it. Same for a quote, which is doubled, and a line break, which
  stays inside the quotes.
- **Problem:** dates come in as `03/04/2026` and nobody can say which is the month.
  **Solution:** export ISO `YYYY-MM-DD` unless the user names another format.
- **Problem:** a currency symbol sits in the amount column.
  **Solution:** money is a plain numeric value, and the currency is stated separately
  unless the source schema embeds it.
- **Problem:** a column was renamed to match the target system's habit.
  **Solution:** headers come from the confirmed field list. If a name has to change, say
  so and ask, rather than changing it silently.
