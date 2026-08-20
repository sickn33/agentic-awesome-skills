# Research report schema

Save the research ledger as one UTF-8 JSON object:

```json
{
  "question": "What is being investigated?",
  "searched_at": "2026-08-20",
  "providers": ["host_web_search", "host_page_open"],
  "unavailable_providers": [],
  "sources": [
    {
      "id": "s1",
      "url": "https://example.org/primary-study",
      "publisher": "Example Institute",
      "source_type": "primary"
    }
  ],
  "claims": [
    {
      "id": "c1",
      "text": "A bounded, checkable claim.",
      "kind": "sourced",
      "confidence": "low",
      "source_ids": ["s1"],
      "supporting_source_ids": ["s1"],
      "contradicting_source_ids": [],
      "independent_source_count": 1,
      "conflict": false
    }
  ],
  "gaps": ["Independent replication is not available."]
}
```

Rules:

- Record at least two unique capability names; repeated queries to one capability still count as one.
- Source IDs and canonical URLs must be unique. URL fragments, host casing, and default ports do not create independent sources.
- Claims reference existing source IDs and declare `kind` as `sourced` or `inference`.
- `source_ids` is exactly the union of disjoint `supporting_source_ids` and `contradicting_source_ids` arrays.
- `conflict: true` requires at least one contradicting source; `conflict: false` requires none.
- High confidence requires at least three independent sources; medium requires two; low requires one.
- A conflicting claim cannot be high confidence.
- Every source must support or contradict at least one claim, and every evidence gap must be explicit.

The validator does not fetch URLs, judge credibility, detect hidden shared sources, or prove claims true.
