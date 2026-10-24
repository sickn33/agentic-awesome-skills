# Best Practices

- One question per message, and only one that changes the output.
- Reuse everything already confirmed, including by the module skill that owns the list.
- Keep CSV and Notion field names identical, in the same order.
- Include the mapping when requested; honor CSV-only output rather than forcing an extra artifact.
- Recommend the smallest useful solution and never force a connection or an automation.
- No sample records by default, and none that could be mistaken for real ones.
- Separate data storage from business calculations.
- Distinguish the properties Notion sets on import from the ones the user configures.
