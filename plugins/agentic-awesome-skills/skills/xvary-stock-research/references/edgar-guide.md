# EDGAR Guide for Claude Code Usage

This guide explains how the skill reads SEC data with `tools/edgar.py`.

## Endpoints Used

- CIK lookup: `https://www.sec.gov/files/company_tickers.json`
- Company facts (XBRL): `https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json`
- Submission metadata: `https://data.sec.gov/submissions/CIK{cik}.json`

## Supported Filing Forms

- `10-K`
- `10-Q`
- `20-F`
- `6-K`

## Public Functions

- `get_cik(ticker)`
- `get_company_facts(ticker)`
- `get_financials(ticker)`
- `get_filings_metadata(ticker)`

## Data Normalization Patterns

- Normalize ticker to uppercase.
- Resolve `.` and `-` variants during CIK lookup.
- Parse both `us-gaap` and `ifrs-full` concept namespaces.
- Map IFRS terms into common output field names where possible.
- Keep annual and quarterly snapshots separate.
- Return `shares_outstanding` only from period-end share concepts; if unavailable, keep it null instead of using weighted-average EPS denominators.

## CLI Examples

```bash
python3 tools/edgar.py AAPL
python3 tools/edgar.py NVDA --mode filings
python3 tools/edgar.py ASML --mode facts
```

## Practical Notes

- Set `SEC_USER_AGENT` to your own application name and genuine contact email; do not impersonate the upstream author.
- Follow [SEC fair access](https://www.sec.gov/about/developer-resources): at most 10 requests per second across all machines, with backoff/caching and less traffic where practical.
- Companyfacts contains entity-wide standard taxonomy facts; custom concepts and context-specific disclosures can be absent. See [SEC API documentation](https://www.sec.gov/search-filings/edgar-application-programming-interfaces).
- A 10-Q/6-K can contain cumulative six- or nine-month flows; filing form alone does not make every value a standalone quarter.
- SEC endpoints can rate-limit bursty traffic; avoid aggressive loops.
- International tickers may have sparse EDGAR coverage.
- Values should be tied to filing metadata when presented in analysis.

## Error Handling Philosophy

- Fail loudly on invalid ticker/CIK resolution.
- Return partial datasets when some concepts are unavailable.
- Never invent missing values.
