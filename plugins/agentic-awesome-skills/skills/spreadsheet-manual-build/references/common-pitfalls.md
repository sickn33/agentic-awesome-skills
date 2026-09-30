# Common Pitfalls

- **Problem:** the workbook arrives with a dashboard, a lookup sheet and a chart.
  **Solution:** build the smallest useful register. One sheet, one header, one column per
  field, unless the confirmed workflow needs more.
- **Problem:** dates and amounts show as text or as numbers with no format.
  **Solution:** apply a date format to date fields and a number format to numeric ones. A
  cell cannot be a date because the header says so.
- **Problem:** a column of invented values appears in an "empty" template.
  **Solution:** examples only on request, and then obviously fake. An empty template has a
  header and no rows.
- **Problem:** an Excel formula computes a figure the parent skill says belongs elsewhere.
  **Solution:** keep the column as a value and leave the calculation to the system the
  parent skill names.
- **Problem:** a currency symbol appears in a column and nobody chose it.
  **Solution:** apply a currency format only where the user named the currency.
- **Problem:** a relation column looks linked but is not.
  **Solution:** a spreadsheet holds a reference key, not a link. Say so rather than
  implying a relationship the file does not have.


See the [Related Skills](references/related-skills.md) reference for the full guidance.
