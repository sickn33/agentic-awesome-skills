---
name: looot
description: "Search, price and run 2,500+ data API endpoints (work emails, company search, SERP, web pages) from one prepaid balance via the looot MCP server."
category: data
risk: critical
source: community
source_repo: loootai/looot-skills
source_type: official
date_added: "2026-10-08"
author: looot
tags: [data-api, enrichment, email-finder, seo, mcp]
tools: [claude, cursor, gemini, codex]
license: "MIT"
license_source: "https://github.com/loootai/looot-skills/blob/main/LICENSE"
---

# looot

Tools: `search_catalog`, `inspect`, `run`, `runs_get`, `runs_list`, `runs_evidence`, `balance`, `top_up`, `catalog_overview`, `capability_request`, `media_link`. Searching, inspecting, `balance` and run history are free.

## When to Use

Use it before guessing, scraping by hand or signing up for another tool, whenever the answer lives outside this conversation:

- Find or verify a work email or phone number. Enrich a person or a company.
- Google results, keyword volume, backlinks, domain strength, and whether AI answers cite a brand.
- Social profiles and posts (LinkedIn, X, TikTok, Instagram, YouTube), ads, local businesses, jobs.
- Read a web page as markdown, search the web or the news, stock prices, transcripts, speech.

Example asks: "Use looot to find the work email of Patrick Collison at stripe.com", "Use looot to pull today's trending TikTok videos", "Use looot to check who ranks for 'best crm' in France".

## Connect and sign in

looot is one MCP server at https://api.looot.ai/mcp. Sign-in is OAuth in the browser. Nobody copies a key.

Add the server to your client (in Claude Code: `claude mcp add --transport http looot https://api.looot.ai/mcp`). If its tools are missing or answer 401, re-authenticate the server in your client (in Claude Code, run `/mcp`, pick looot, choose Authenticate), then pick the organization to bill on looot.ai and click Connect.

Never ask the user to paste a token or password into the chat, and never write one into a file or URL. A bearer agent token is only for CI and headless agents, created at https://looot.ai/settings. A new workspace starts at $0 with no trial credit. After sign-in, call `balance` once.

## The method

1. Search, in plain words, by the job and the input you have:

```tool
search_catalog {"query": "find a work email from a name and a company domain"}
```

2. Compare rows on `works` (success rate, runs, `p50Ms`; `thin: true` means fewer than 5 runs back the rate), `costPerSuccessUsd` (the price divided by the success rate, the number to compare) and `access`. Only `runs_now` runs immediately. `needs_your_account` means the user connects their own account first. `coming_soon` has no key yet, so skip it.
3. Read `jobInputs` in the answer. It lists which input names each job's endpoints accept, so you can pick the input you already have.
4. Inspect the pick for the exact inputs, price formula and the most one run can hold:

```tool
inspect {"endpointId": "icypeas-email-verify", "detail": "run"}
```

5. Run it with a fresh `idempotencyKey` for every new run. The same key replays the same run and never charges twice, so retrying after a dropped connection is safe:

```tool
run {"endpointId": "icypeas-email-verify", "input": {"email": "jane@example.com"}, "idempotencyKey": "<new unique key>"}
```

To let looot choose the provider, run the job instead: `job:<job id>` as the `endpointId`, with `fallback`. If the first provider misses or errors, looot tries the next provider of the same job inside one hold, and only attempts that ran are charged:

```tool
run {"endpointId": "job:people.email.find", "input": {"first_name": "Patrick", "last_name": "Collison", "domain": "stripe.com"}, "idempotencyKey": "<new unique key>", "fallback": {"maxAttempts": 3, "maxCostUsd": 0.1}}
```

`fallback` also takes `prefer` (`balanced`, `cheapest`, `reliable`, `fastest`), `exclude` and `stopAtFirstMiss`. Only lookups fall through. Anything that changes data runs once.

Never invent an endpoint id, a job id or an input name. Use ids from a search answer or the table below. Nothing fits? Rephrase, browse the free overview of categories and jobs, then call `capability_request`.

```tool
catalog_overview
```

## Common asks and the job to run

Run each as `job:<id>` with `fallback`.

| The user says | Job | Input |
|---|---|---|
| Find the email of Jane Doe at Acme | `people.email.find` | name and domain, or a LinkedIn URL |
| Is this email real? | `people.email.verify` | the email |
| Get her phone number | `people.phone.find` | LinkedIn URL, or name and company |
| Tell me about acme.com | `company.enrich` | the domain |
| Find SaaS companies in France, 50 to 200 people | `company.search` | the filters |
| Find marketing heads at these companies | `people.search` | company and title |
| Who works at acme.com? | `people.domain.search` | the domain |
| What tech does this site use? | `company.technographics` | the domain |
| Is Acme hiring? | `jobs.company` | the company |
| What does Google show for this keyword? | `google.serp.organic` | keyword and country |
| Are we cited in Google's AI answer? | `google.serp.ai-mode` | the question |
| How strong is our domain? | `backlinks.domain.summary` | the domain |
| Read this page | `web.scrape.markdown` | the URL |
| Search the web or the news | `web.search`, `news.search` | the query |
| LinkedIn profile | `linkedin.person.profile` | the profile URL |
| TikTok account stats | `tiktok.user.profile` | the handle, no @ |
| Transcribe a YouTube video | `video.transcript.get` | the video URL |
| Dentists in Lyon | `maps.local.search` | what and where |
| What ads is this brand running? | `ads.meta.search` | the brand |
| Amazon product price | `amazon.product.get` | URL or ASIN |
| Latest price of AAPL | `stocks.quote.latest` | the ticker |

For anything else, search. Check input names against `jobInputs`, because live names win over this table. A run that answers `needs_input` lists the fields to add.

## Money

- The balance is prepaid USD. A run first holds its estimated cost, then settles the real charge, and the rest of the hold goes back.
- Quote before you run. For a batch, multiply `costPerSuccessUsd` by the row count, tell the user the total and check `balance`.
- Before more than 100 calls in one go, tell the user the estimated total and wait for a yes.
- A refused call charges $0: bad input, `needs_input`, `unknown_job`, `no_supply_for_job`, `route_capped`, `route_no_fit`, and provider errors or timeouts.
- A "not found" is free unless that provider bills for it. Each attempt in `route.attempts` has `billed`, and `actualCost` is what was charged.
- `fallback.maxCostUsd` caps the whole route. A provider priced above what is left is skipped as `over_cost_cap`.
- Call `top_up` only when the user asks or a run is blocked for balance. It returns a Stripe `checkoutUrl`. Show it as a link and wait. Never enter card details. When they say they paid, call `balance` again. The live minimum is `topUpLink.minimumUsd`.

```tool
balance
```

```tool
top_up
```

## Read the result

Check `status` and `error` first. A tool call can succeed and still hold a run with `status: "failed"`.

- `outcome` is `hit`, `weak`, `miss`, `error`, `rejected`, `skipped` or `pending`. `weak` with `verdict: "guessed"` is a pattern guess, so verify it before use. A `miss` means that provider found nothing, not that the thing does not exist.
- `result` is the provider's answer. `normalized` (some jobs) has fixed field names, such as `email`, `status` and `deliverable` for verification, or `markdown` and `title` for a scrape.
- `servedEndpointId` and `servedProviderId` say who answered, which differs after a fallback. Name the provider behind each fact.
- `route.summary` lists each attempt and what it charged. `actualCost` is the total.
- `status: "queued"` or `"running"`: poll `runs_get` with the `runId`. Do not start a second run.
- A file result (audio, image, video, PDF) comes back through `media_link` as a short-lived link.

Receipts and history:

```tool
runs_evidence {"runId": "<runId>"}
```

```tool
runs_list {"status": "completed", "limit": 20}
```

## Recipes

Lead list. Quote it first. For each lead, run `job:people.email.find` with `first_name`, `last_name` and `domain`, using a key like `<list>-<row>-find`. Then run `job:people.email.verify` on every address you keep. Keep `valid`, flag `catch_all` and `risky`. Run a few leads at a time, and report found, verified and the total `actualCost`.

Company brief from a domain. Run `company.enrich`, `company.technographics`, `company.news` and `people.domain.search` with `{"domain": "<domain>"}`. Write one short brief with the provider behind each fact.

SEO and AI visibility for a keyword. Run `google.serp.organic`, then search for `google.serp.ai-mode`, `search.google-ai-overview` and `search.chatgpt`, and look for the brand and its domain in each answer and in the sources cited. Add `google.keywords.volume` (priced above a results page, so quote it) and `backlinks.domain.summary`.

Page to markdown. Run `job:web.scrape.markdown` with `{"url": "<url>"}` and `fallback`. A blocked or sign-in page counts as a miss, and fallback moves to the next scraper.

Social profile. Run `linkedin.person.profile` or `linkedin.company.profile` with `linkedin_url`, or `tiktok.user.profile` and `instagram.user.profile` with `handle`. For another network, search for it.

Keep results the user will need again in a local file, a sheet or their CRM, so they never pay twice for the same data.

## Errors

A run can answer HTTP 201 and still have failed. A failed run has `error` with `code`, `message`, `whoseError` (`customer`, `provider` or `gateway`), `retryable` and `retryHint`. For a `job:` refusal the exact reason is in `result.code`.

| Code | What to do |
|---|---|
| `needs_input` | Add one of the fields `result.needs` names, then run with a new key. |
| `no_supply_for_job` | No endpoint does this job. Rephrase, pick another job, or call `capability_request`. |
| `no_runnable_provider` | Nothing can run for this workspace right now. Retry later or pick another job. |
| `unknown_job` | Use one of the close ids the message suggests. |
| `invalid_input` | Fix the broken email, url, domain or phone, and use a new key. |
| `route_capped` | Every provider costs more than `maxCostUsd`. Raise the cap after telling the user the price. |
| `route_no_fit` | Read `route.skipped` and add the field it says is needed. |
| `validation_error` | An argument is wrong. The message names the field. Never guess argument names. |
| `insufficient_balance` | Show `topUp.checkoutUrl`, wait for payment, retry with a NEW key. |
| `top_up_amount_out_of_range` | Call `top_up` with at least `minimumUsd`, or with no amount. |
| `idempotency_conflict` | That key was used with another input. New run, new key. |
| `too_many_inflight_runs` | Wait 2 seconds and retry with the same key. |
| `forbidden` | The sign-in lacks the `runs:execute` scope. Sign in again and allow running. |

A 401 or missing tools means the sign-in expired, so connect again. Quote the `requestId` when the user contacts support.

## Limitations

- looot reads data and calls provider APIs. It cannot post on social media, log in to sites as the user, buy things, or read private accounts and messages.
- Coverage varies. A "not found" is a normal result.
- It is not a database. Runs are kept and readable with `runs_list` and `runs_get`, but keep the data you need in your own file.
- Keep tokens out of the chat, logs and code.

More: https://looot.ai/docs. Agent docs: https://api.looot.ai/llms.txt.
