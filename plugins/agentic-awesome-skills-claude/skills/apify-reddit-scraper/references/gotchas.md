# Gotchas — apify-reddit-scraper

Prices and measured-run observations below are historical examples, not guarantees for a future Actor build or account. Confirm the live pricing/schema and run metadata.

Cost guardrails, error recovery and the quirks that cost real runs. Read on demand.

## Cost guardrails

`harshmaur/reddit-scraper` is `PAY_PER_EVENT`:

| Event | Price |
|---|---|
| Actor start | $0.02 per run |
| Result stored (post, comment, community or user row) | $0.002 each ($2.00 per 1,000); $1.50 per 1,000 on plans with Store discounts |
| AI analysis (`aiAnalysis: true`) | +$0.50 per 1,000 analysed rows (`analyzed_item`); the schema says "ignored on free plans", but a measured run on a free-plan account was billed 30 × $0.0005 — count it on every plan |
| Custom AI label (`customLabels`, paid plans only) | +$0.10 per 1,000 evaluations per label |

Estimate before running. `maxPostsCount` and `maxCommentsCount` are **per search term** (and `maxPostsCount` per subreddit or profile URL), not run totals — the input schema's title says "total across all inputs", but the README and measured runs (4 terms × 8 → 32 posts, 4 × 6 → 24, 6 × 5 → 30) say per term:

```
posts ≈ |searchTerms| × maxPostsCount + |subredditUrls or profile startUrls| × maxPostsCount
items ≈ posts + (crawlCommentsPerPost ? posts × maxCommentsPerPost : 0) + (searchComments ? |searchTerms| × maxCommentsCount : 0)
cost  ≈ $0.02 + items × $0.002
```

Worked example: 5 terms, `maxPostsCount: 24`, `crawlCommentsPerPost: true`, `maxCommentsPerPost: 5` → 120 posts + 600 comments = 720 items ≈ $1.46 worst case. Estimated as a total (144 items ≈ $0.31), a $0.50 charge limit stopped the run at 241 items and two threads lost their comments. Write the per-term numbers and the USD figure into the run section of your answer (SKILL.md Step 3) and compare them with the settled cost afterwards.

Run only within an explicitly authorized account, purpose and spending cap. Small estimates do not create spending permission. Check current Actor pricing and use the platform's supported charge limit; include starts, enrichment and connector costs. A retry is another billable run.

Free Apify plans: results beyond the plan's monthly credit stop the crawl (the Actor halts when the platform's charge limit is hit), and only the first 40 `searchTerms` per run are searched.

## The traps

1. **Post permalinks in `subredditUrls` are dropped silently.** The run SUCCEEDS with 0 items and no error. Permalinks belong in `startUrls`.
2. **Reddit search is literal.** Long descriptive phrases return nothing. Convert topics into short keywords and run several `searchTerms`.
3. **~1,000-post ceiling per listing.** Reddit stops paginating any search or subreddit listing around 1,000 posts regardless of `maxPostsCount`. Use `postedAfter`/`postedBefore` windows to walk further back; posts older than the ceiling in a busy subreddit are not reachable at all.
4. **`crawlCommentsPerPost` multiplies cost.** 200 posts × default `maxCommentsPerPost` 200 can be 40,000 rows. Set `maxCommentsPerPost` deliberately. A very large thread returns about 600–3,000 comments, even when `maxCommentsPerPost` is higher.
5. **Search options don't apply to `startUrls`.** `searchSort`, `searchTime` and `withinCommunity` only shape `searchTerms` runs. For a subreddit URL, sort by putting it in the URL (`/r/x/new/`, `/r/x/top/?t=week`).
6. **`/s/` share links work in `startUrls`.** The Actor resolves each one to the post or profile it points to. An expired link resolves to the subreddit listing, not the post.
7. **Some fields can be `null`.** `onlineUsersCount` is always `null`. Some rows can have `null` in `membersCount`, `description` or `subredditSubscribers`. Check for `null` before you rank or filter communities by size. `fastMode` has no effect any more, so do not send it.
8. **Dates are UTC, `YYYY-MM-DD`.** `postedAfter` is 00:00 UTC of that day, `postedBefore` is 23:59:59 UTC. Setting either date forces newest-first (`sort=new`) and ignores `searchSort` and `searchTime`; re-running the same window with `relevance` returns the same set again (30 of 32 posts in a measured pair), so don't expect a "relevance" cut from a dated run. The reverse trap: `searchTime` alone does **not** guarantee the window — `relevance` + `searchTime: "month"` returned 12 of 30 posts dated 2022 to January 2026 in one measured run (quoted phrases) and 0 of 24 out of window in two others (plain terms). "Last month" / "past week" therefore means `postedAfter` = today − N unless the user explicitly wants relevance ranking, in which case filter `createdAt` yourself.
9. **NSFW is off by default.** Adult subreddits and posts need `includeNSFW: true`; NSFW communities also only appear in community search when it is on.
10. **`removedByCategory` is the only reliable removal signal.** Fields like `removed_by` or `banned_by` are moderator-only and null for everyone else.

## Common errors

The Actor repairs recoverable input instead of failing: every run writes a `RUN-SUMMARY` record (`itemsTotal`, `items` per `dataType`, `skipped[].reason`, `inputWarnings`, `emptyReason`) to its key-value store — fetch it with `apify key-value-stores get-value "<defaultKeyValueStoreId>" RUN-SUMMARY 2>/dev/null` (the store id is `defaultKeyValueStoreId` in the `apify runs info` output, SKILL.md Step 3; `get-value` has no `--json` flag and prints the record as stored) and read it before diagnosing a short or empty result.

| Error / symptom | Cause | Fix |
|---|---|---|
| 0 items, SUCCEEDED, `emptyReason` set in `RUN-SUMMARY` | No `searchTerms`, `startUrls` or `subredditUrls` (often an invented field name like `query`); the Actor does not fail, it finishes empty and charges nothing | Use the real field names |
| More items than the date window should give; `inputWarnings` in `RUN-SUMMARY` mentions the date | `postedAfter` > `postedBefore`, or bad date format — the Actor drops the filter and scrapes the full range instead of failing | Fix to `YYYY-MM-DD`, re-run; check `inputWarnings` before trusting any dated result |
| Memory note in `inputWarnings` | Run memory set above 512 MB; every run fits in 512 MB | Harmless; leave default memory |
| 0 items, SUCCEEDED | Permalinks in `subredditUrls`, or literal search miss | See traps 1 and 2 |
| Run summary lists skipped targets | Private/banned/quarantined community, deleted user, or a 404 | Terminal; report it, don't retry |
| Slow run (>5 min) | Full subreddit + comments, or many `searchTerms` | Poll asynchronously; or split into smaller runs |

## Delivery to Slack / Notion / Sheets (MCP connectors)

`mcpConnector` names an MCP connector already authorized in the user's Apify account (Console → Integrations). `mcpTarget` is the destination ID (Slack channel ID, Notion database ID, Sheet ID). `mcpMode` is `perPost` (one message per post, capped by `mcpMaxItems`, default 50) or `summary` (one digest). `mcpMessage` is a template over any post field, e.g. `"**{{title}}** ({{score}}↑) {{postUrl}}"`. Delivery never fails the run; check the run log for connector errors.
