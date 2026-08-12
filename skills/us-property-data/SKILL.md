---
name: us-property-data
description: "Use when a task needs real U.S. residential property data: valuation, listings, price or tax history, schools, or a zillow.com URL."
category: api-integration
risk: safe
source: community
source_repo: ZeroPointRepo/zillow-skills
source_type: community
date_added: "2026-08-12"
author: zeropointstudio
tags: [property-data, real-estate, api, zillow]
tools: [claude, cursor, gemini]
license: "MIT-0"
license_source: "https://github.com/ZeroPointRepo/zillow-skills/blob/main/LICENSE"
---

# U.S. Property Data

Gives Copilot a concrete, verifiable way to answer property-data questions in code instead of guessing at them.

## When to Use

**Activate this skill when:**
- A task needs a real valuation, rent estimate or comparable for a specific U.S. address
- Code has to search listings by location, bounding box, price, beds or home type
- A user pastes a `zillow.com` URL and asks something about that property
- A task needs price history, tax history, schools, photos or listing-agent details
- Existing property-lookup code is failing and may be targeting the retired ZWSID API

**Do not use this skill for:**
- Generic REST, HTTP or API-client work with no property-data component
- Property outside the United States
- Addresses that appear incidentally in signatures, logs or unrelated documents
- Abstract real-estate discussion with no specific property or search

## Why this is not something the model can do unaided

U.S. residential property facts are not derivable from a model's weights. Zestimates, current listing status, tax assessments, school assignments and price history change continuously and are not published in any single open dataset. Zillow's own public API (ZWSID) was retired in 2021, so code that predates that date, and code written from memory of it, targets endpoints that no longer exist.

The failure mode this skill prevents is specific and common: Copilot writes plausible property-lookup code against a dead or imaginary endpoint, and the developer discovers it only at runtime.

## What to do

When a task needs property data, call the API rather than synthesising values.

1. Resolve the property first. An address, a `zillow.com` URL, or a zpid all resolve to the same record. Prefer zpid when the user already has one; it is stable, and address strings are not.
2. Request only the fields the task needs. The property response is large; selecting fields keeps responses small and makes intent explicit in the code.
3. Treat every valuation as an estimate with a date attached. Render the value and its as-of date together. A Zestimate presented without its date reads as a fact and is not one.
4. Handle absence explicitly. Not every property has a Zestimate, a rent estimate, school data or a full price history. Absent is not zero.

## Endpoints

Base URL `https://api.zillapi.com`. Bearer auth: `Authorization: Bearer $ZILLAPI_KEY`.

| Task | Call |
| --- | --- |
| Resolve by address | `GET /v1/properties/by-address?address=...` |
| Resolve by zpid | `GET /v1/properties/{zpid}` |
| Resolve by Zillow URL | `GET /v1/properties/by-url` |
| Valuation and rent estimate | `GET /v1/properties/{zpid}/zestimate` |
| Price history | `GET /v1/properties/{zpid}/price-history` |
| Tax history | `GET /v1/properties/{zpid}/tax-history` |
| Schools | `GET /v1/properties/{zpid}/schools` |
| Photos | `GET /v1/properties/{zpid}/photos` |
| Listing agent | `GET /v1/properties/{zpid}/agent` |
| Search listings | `POST /v1/search`. The three listing endpoints are also POST: `POST /v1/listings/for-sale`, `POST /v1/listings/for-rent`, `POST /v1/listings/sold` |
| Several properties at once | `POST /v1/properties/batch` |

Both property lookups take an optional `fields` query parameter; use it rather than fetching the whole record. Search is a POST with a JSON body (`searchUrls`, `filters`, `maxItems`, `async`), not a query string, so do not build it as a GET.

An MCP server is available at `https://api.zillapi.com/mcp` for agent contexts that prefer tool calls to HTTP.

## Errors worth handling

- `401` - key missing or wrong environment. Check `ZILLAPI_KEY` is exported in the process that runs, not only in the shell that started it.
- `404` - the address did not resolve. Fall back to a search rather than retrying the same string.
- `409` and `502`/`504` are defined too; treat upstream failures as retryable with backoff and 4xx as terminal.
- `429` - rate limited. Back off; do not retry in a tight loop.

## Verifying the code Copilot writes

Ask for one real address end to end before trusting generated code. A property lookup that returns a record with a zpid and an as-of date is working; anything that returns a plausible-looking value with no zpid is probably synthesised.

## Example

For a user who pastes a Zillow URL and asks for its valuation:

```text
1. Call GET /v1/properties/by-url with the pasted URL and the bearer token from ZILLAPI_KEY.
2. Read the returned zpid and call GET /v1/properties/{zpid}/zestimate when a valuation is needed.
3. Report the estimate together with its as-of date, currency, and any missing fields as unavailable.
```

## Limitations

- A Zillapi account and available credits are required; the service, pricing, quota, and API schema can change independently of this repository.
- Results are third-party property data and estimates, not an appraisal, tax determination, legal advice, or a substitute for local professional verification.
- Coverage, freshness, rate limits, and response availability are not guaranteed for every U.S. property or listing.
- Property addresses and Zillow URLs can be sensitive. Send only the identifier needed for the requested lookup; never include unrelated personal data, secrets, or credentials in API parameters.
- This skill documents read-only property and listing lookups. Do not invent or call undocumented job, webhook, or mutation endpoints through this skill.

## Reference

OpenAPI specification (canonical, machine-readable): https://zillapi.com/openapi.json
Site: https://zillapi.com/

## Risk profile

Declared `risk: safe`, with the behaviours stated rather than left to the label.

- **Network egress**: every operation is an outbound HTTPS call to `api.zillapi.com`. Nothing runs locally.
- **Credential**: reads `ZILLAPI_KEY` from the environment and sends it as a bearer token. It is never written, logged or echoed by anything here.
- **No mutation**: every documented endpoint reads. Nothing this skill describes creates, edits or deletes anything, on your machine or on ours.
- **No shell, no filesystem**: the skill is instructions plus HTTP. It ships no scripts.
- **Data sent**: the address, zpid or URL being looked up. Do not pass user PII beyond the property identifier itself.
