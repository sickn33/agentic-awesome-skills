# Keyword Research Facts

last-verified: 2026-09-02 · ttl-days: 90 · refresh: web-search "Reddit AI search citations {current year}" and "Reddit ChatGPT Search citations {current year}", and read docs.dataforseo.com for the Google Ads search volume, Labs and SERP endpoints named below; update this file and its date.
changes: 2026-09-02. Reddit's citation share is now stated per engine; its ChatGPT Search share collapsed in the week of Aug 14 2026. 2026-11-16: added the search data API quirks below, observed in live runs Jul to Oct 2026 (re-check them against the provider's docs when this file is refreshed).

## AI-surface citation signal

- Reddit's share of AI citations is per engine, not one number: Jan 2026 ~24% of Perplexity citations, ~5% on ChatGPT, ~0.1% on Gemini, and the largest social source in Google AI Overviews. In the week of Aug 14 2026 Reddit fell from ~3.8% to ~0.5% of ChatGPT Search citations (Google surfaces drifted down, no collapse).
  When Reddit or forum results rank in the top five, the same gap can be open on Perplexity and Google AI surfaces. Check which engine cites the thread before building around it.

Source carried from `skills/ai-search/references/aeo-facts.md` (last-verified: 2026-09-02).

## Search data API quirks (DataForSEO, our pick)

Observed in live runs, Jul to Oct 2026. Each one cost someone a wrong number before it was caught.

- **Check two status levels.** A response carries a top-level status and a status per task. Both must say success before a row is read. A top-level success with a failed task is a failure for that task.
- **"No search results" is an answer.** A task that returns the no-results status observed zero for that query and place. Record zero. A timeout or a server error is a failure, and stays unknown.
- **Rows live in different places by endpoint.** The Google Ads search volume call puts rows directly in the task's `result` list; the Labs and SERP calls nest them under `result[0].items`. Field names differ too. Read one real response before writing a parser, and test the parser against that response, not a hand-typed fake. A fake with the wrong shape passes its tests and fails live.
- **Batch the volume call.** One Google Ads search volume request takes up to 1,000 keywords and costs the same with one or a thousand, and the live Google Ads endpoints allow about 12 requests a minute. Batch, then pace. The current month isn't available yet.
- **Close variants may come back merged.** Request two phrasings in separate calls when the difference between them matters, and never add their numbers.
- **The lowest reporting tier is a floor.** Local rows often bottom out at 10, which means "a little", not ten searches. A missing value means no estimate, not zero.
- **Location codes come from the provider's own catalog,** fetched (it's free), never typed from memory. The keyword-data and SERP calls keep separate catalogs. Save the location's name, code, type and the date you looked it up with the result.
- **Business listing search wants category keys,** not display names: the provider's key for "plumber", not the words a person would type.
- **AI Overviews can load late.** Ask the SERP call to wait for the asynchronous overview. An overview that didn't load is unobserved, never "no AI Overview".
- **Receipts.** Put a stable tag on every request (client, job, date, sequence), and save each task's id, status, row count and cost next to its rows in the working notes file, never in the plan. Never save the auth header. A number with no receipt gets labelled "rerun before external use".
