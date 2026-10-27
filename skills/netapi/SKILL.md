---
name: netapi
description: "Check domains and IPs against a free compromised feed, find newly registered lookalike domains, and get TLD stats and Top 1M ranks from NetAPI, with no API key."
category: security
risk: safe
source: self
source_type: self
date_added: "2026-10-27"
author: NetAPI
tags: [threat-intel, ioc, domains, phishing, osint, dns, registrar, mcp]
tools: [claude, cursor, codex, gemini]
metadata:
  publisher: NetAPI
  homepage: https://netapi.com/
  docs: https://netapi.com/help/api/
  mcp-docs: https://netapi.com/help/mcp/
  mcp-server: https://mcp.netapi.com/mcp
---

# NetAPI Domain Intelligence

## Overview

NetAPI (https://netapi.com/) tracks the registered domains of more than 1,500 zones and publishes free data built from them: a compromised feed of domains and IP addresses reported by public threat feeds, the daily lists of newly registered domains, zone statistics and the NetAPI Top 1M popularity ranking. This skill answers domain and IP questions with NetAPI's JSON API. The free methods need no account and no API key. Risk is `safe`: every call is a read-only HTTPS GET, and the only data sent is the indicator or search text itself.

## When to Use This Skill

- Use when the user asks whether a domain, hostname, URL or IP address is known as compromised, or when enriching indicators from logs, alerts, emails or a hunt.
- Use when the user wants newly registered domains that contain a brand or keyword, for lookalike and phishing monitoring.
- Use when the user asks how popular a domain is, how big a TLD is, or how much abuse a TLD, registrar or DNS provider has.
- Do not use for private or internal indicators (RFC 1918 or loopback addresses, internal hostnames), or for indicators the user has not agreed to send to a third-party service.

## How It Works

### Step 1: Pick the method

Every call is `GET https://netapi.com/api-json/?method=<method>&<parameters>` and returns JSON.

| Method | Parameters | Answers |
|---|---|---|
| `compromised-check` | `value`: domain, hostname, URL or IP | `listed_now` (reported within the last 24 hours), `listed_ever`, `first_seen`, `last_seen`, `block_reason` (source tag), `matched_value`, `registrar`. For a hostname the parent domains are checked too. |
| `search-new` | `q` (4+ characters), `days` (1-7), `tld`, `match` (`contains` or `starts`), `limit` | Domains registered in the last days whose name contains or starts with `q`, from the zones that publish daily lists (1,100+ TLDs). |
| `domain-rank` | `domain` | Position in the NetAPI Top 1M and inside its TLD (`in_top_1m`, `rank`, `rank_in_tld`). |
| `tld-stats` | `tld` (`com`, `io`, ...) | Domain count, daily new and deleted counts where the registry publishes them, abuse share, registry. |
| `registrar-info` | `q`: registrar name or id | Size, rank by size and abuse rate of a registrar. |
| `dns-provider-info` | `q`: provider name or nameserver root | Size and market share of a DNS provider. |
| `top-1m` | `limit`, `offset` | A slice of the Top 1M. |
| `top-websites` | `country`: name or two-letter code | The most visited websites in a country. |
| `zones` | `min_domains`, `cctld` (`1` or `0`) | Every tracked zone with its figures. |

### Step 2: Call the API and handle errors

Errors come back as `{"error": {"code": "...", "message": "..."}}` with an HTTP status: 400 for invalid input (`invalid_value`, `query_too_short`), 404 for an unknown zone or name, 429 when a limit is reached (the response carries `Retry-After`). Report the message instead of guessing.

### Step 3: Report the result

- `listed_now: true` means the indicator was reported within the last 24 hours; `listed_ever: true` with `listed_now: false` means an older listing, so give `last_seen`.
- `listed_ever: false` means the feed never held it. That is not a verdict that the indicator is clean.
- Name the source (NetAPI, https://netapi.com/) and the date of the data in the answer.

## Examples

### Example 1: Check an indicator

```bash
curl -s "https://netapi.com/api-json/?method=compromised-check&value=example.com"
```

```json
{
  "value": "example.com",
  "type": "domain",
  "listed_now": false,
  "listed_ever": false,
  "matched_value": null,
  "first_seen": null,
  "last_seen": null,
  "block_reason": null,
  "note": "Not in the current or historical compromised feed."
}
```

A URL or a subdomain can be passed as it is: `value=https://login.example.com/path` is checked as `login.example.com` and then `example.com`.

### Example 2: Watch for lookalike registrations

```bash
curl -s "https://netapi.com/api-json/?method=search-new&q=paypal&days=2&limit=50"
```

Each result has `domain`, `tld` and `added_on`. Use `match=starts` to keep only names that begin with the text, and `tld=com` to narrow it to one zone.

### Example 3: Enrich a list of indicators (Python, standard library only)

```python
import json
import time
import urllib.parse
import urllib.request

def netapi(method, **params):
    url = "https://netapi.com/api-json/?" + urllib.parse.urlencode({"method": method, **params})
    with urllib.request.urlopen(url, timeout=30) as response:
        return json.load(response)

for indicator in sorted(set(["example.com", "203.0.113.10"])):
    result = netapi("compromised-check", value=indicator)
    print(indicator, result["listed_now"], result["last_seen"])
    time.sleep(2)  # stays under the 30 requests a minute allowed without a key
```

A non-200 answer raises `urllib.error.HTTPError`; read its body for the JSON error message.

### Example 4: Connect the MCP server instead

The same data is available as MCP tools. `https://mcp.netapi.com/mcp/public` offers the free tools without an account; `https://mcp.netapi.com/mcp` signs in with OAuth and adds the account tools. Setup per client: https://netapi.com/help/mcp/

## Best Practices

- ✅ Deduplicate indicators before a batch and pace the calls; on a 429, wait for `Retry-After`.
- ✅ Ask before sending indicators from a confidential investigation to an external service.
- ✅ Treat a listing as a lead: check `last_seen`, and remember that a well-ranked domain can be listed because one of its pages was compromised.
- ❌ Don't send private, loopback or internal names and addresses; they cannot be listed and only leak internal data.
- ❌ Don't put an API token in a command line or a file; read it from an environment variable.

## Limitations

- The feed holds what public threat feeds reported. An indicator that was never reported is not in it, so absence is not proof of safety.
- The feed holds mostly domains and IPv4 addresses.
- `search-new` covers the last 7 days of the zones that publish daily lists; zones refreshed by crawling (marked N/A on netapi.com) have no new-domain lists.
- `domain-rank` ranks registrable domains (a leading `www.` is dropped); other subdomains have no rank.
- Without a key: 30 requests a minute and 1,000 a day per IP for single lookups, 6 a minute and 100 a day for `search-new`. A free NetAPI account raises these to 60 / 5,000 and 30 / 500.
- `lookup-domain`, `lookup-ip` and `download-url` (full domain lists and datasets) need a paid plan.

## Security & Safety Notes

- All calls are read-only GET requests to `netapi.com`; nothing is installed and no local file is changed.
- With a free account, send the token as a header from an environment variable, for example `-H "Authorization: Bearer $NETAPI_TOKEN"`.
- The indicator or search text leaves the machine. Confirm with the user first when it comes from private data.

## Common Pitfalls

- **Problem:** `query_too_short` from `search-new`.
  **Solution:** The search text must be at least 4 characters.
- **Problem:** `invalid_value` from `compromised-check`.
  **Solution:** Pass one domain, hostname, URL or IP per call, without spaces or lists.
- **Problem:** HTTP 429.
  **Solution:** The per-minute or daily limit is used up; wait for `Retry-After`, or use a free account token.

## Related Skills

- `@threat-intelligence` - Broader IOC and campaign enrichment from public sources; use this skill as one of its lookups.
- `@threat-hunting` - Turn listed domains and IPs into detections.
- `@osint-methodology` - Authorized attack-surface work that needs newly registered lookalike domains.
