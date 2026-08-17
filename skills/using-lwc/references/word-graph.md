# LWC Word Graph

## Use when

Use the Word Graph in `lwc view` to discover shared terms that connect a bounded
sample of Wiki pages and sources. It is useful when a query finds several
documents and you need to see the vocabulary that links them before choosing
which documents to open.

## Skip when

Skip it for a known page or source, an exhaustive corpus-wide term analysis, or
code structure. A displayed edge proves sampled term occurrence, not semantic
equivalence or causality.

## Minimum workflow

1. Run `lwc --scope project view` and open the Word Graph tab.
2. Search with a focused query of at most eight searchable terms. The graph does
   not load until a query is submitted.
3. Inspect one result page at a time. The backend selects matching documents
   through FTS first, then samples at most 25 documents, 30 terms, four passages
   per document, 4 MiB of text, 200 nodes, and 500 edges. Larger requested limits
   are clamped.
4. Use Previous/Next for another bounded 25-document sample. Open the relevant
   pages or sources to verify meaning before drawing conclusions.

Never request or render the entire vocabulary. Treat `has_more`, `truncated`,
`truncation_reasons`, `limits`, and `diagnostics` as part of the result rather
than as errors to bypass.

## Consent boundaries

`lwc view` starts a local read-only HTTP server and normally opens a browser; use
`--no-open` when browser launch is unwanted. Word Graph queries do not enable a
graph engine, create a CodeGraph index, or mutate Wiki content.

## Completion evidence

- The response records the query, enforced limits, sample diagnostics, and any
  truncation reason.
- The visible documents and terms remain within the fixed bounds and pagination
  is used instead of an all-corpus load.
- Important relationships are verified against the full page or source; shared
  sampled words alone are not promoted to durable facts.
