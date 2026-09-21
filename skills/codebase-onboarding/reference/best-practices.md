# Agent Best Practices

- Keep the answer graph-first and concise.
- Separate measured graph facts from inference.
- Prefer capability output over source search.
- Include confidence: high when graph nodes and relationships directly answer the question, medium when evidence is partial, low when fallback file inspection was required.
- Never generate SDKs, refactors, or security claims from the skill itself. The skill may plan workflows, but Ontoly remains the source of truth.
