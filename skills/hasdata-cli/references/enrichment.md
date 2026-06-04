# Data enrichment

Enriching a name, email, domain, or row of a CSV with public data. The highest-leverage workflow this skill enables — turning a sparse list (just names) into a structured dataset (name + role + employer + LinkedIn + emails + company HQ + recent activity).

## SERP first. Web-scraping is the last resort.

`google-serp` is your primary enrichment tool. Reasons:

- **Google has already extracted the structured fields you want.** `.knowledge_graph` carries HQ, founder, founded year, parent company, employees, industry. `.organic_results[]` titles and snippets carry person → role → employer mappings (LinkedIn titles are literally `Name — Role at Company`). `.local_results[]` carry phone/address/hours.
- **It bypasses anti-bot.** Many target sites (LinkedIn, Crunchbase, Glassdoor) gate or rate-limit direct access. Google's snippets reflect the same data without you needing to render their JS or get a 403.
- **It's the catch-all reverse index.** Quoted queries (`--q '"jane@example.com"'`, `--q '"+1 555 123 4567"'`, `--q '"Acme Corp"'`) work as a universal lookup over the entire indexed web.

Use `google-serp` (or `google-news` for recency, `google-maps` for places, `google-shopping` for products) **first**. Only fall through to `web-scraping` when:
- A specific field you need isn't in any SERP snippet, AND
- The target page renders that field server-side or via JS that the scraper can handle, AND
- The user explicitly needs it (don't fan out to N web-scraping calls when SERP would have answered N − 0 of them).

The patterns below show the full chain so you understand when to escalate. Most rows in a real CSV stop after step 1 or 2.

---

## Person enrichment

### Step 1 — SERP for role, employer, LinkedIn URL

```bash
hasdata google-serp --q '"Jane Doe" linkedin' --num 5 --raw \
  | jq -c '.organic_results[] | select(.link | contains("linkedin.com/in/")) |
           {title, snippet, link}'
```

The result usually looks like:

```json
{
  "title": "Jane Doe — Senior Engineer at Acme Corp | LinkedIn",
  "snippet": "San Francisco, CA · 500+ connections · Engineering @ Acme. Previously...",
  "link": "https://www.linkedin.com/in/janedoe"
}
```

You now have role, employer, location, LinkedIn URL, and a connection-count hint — without scraping anything. **Stop here unless a specific extra field is required.**

### Step 2 — Refine with targeted SERP queries

If step 1 didn't carry what you need, ask Google more specifically:

```bash
# Disambiguate by company
hasdata google-serp --q '"Jane Doe" "Acme Corp"' --num 10 --raw \
  | jq -c '.organic_results[] | {title, snippet, link}'

# Other social profiles
hasdata google-serp --q '"Jane Doe" site:twitter.com OR site:x.com' --num 3 --raw
hasdata google-serp --q '"Jane Doe" site:github.com' --num 3 --raw

# Past employers / bio paragraphs
hasdata google-serp --q '"Jane Doe" bio OR background OR experience' --num 5 --raw \
  | jq -r '.organic_results[].snippet'
```

### Step 3 — Web-scraping (only if SERP came up short)

When SERP snippets truncated the field you need, or the user explicitly wants the full profile content:

```bash
hasdata web-scraping --url "https://www.linkedin.com/in/janedoe" \
  --output-format markdown --no-screenshot --no-block-resources \
  --raw | jq -r .markdown
```

Or for structured fields, AI extraction:

```bash
hasdata web-scraping --url "https://www.linkedin.com/in/janedoe" \
  --ai-extract-rules-json '{
    "headline":   {"type": "string"},
    "location":   {"type": "string"},
    "company":    {"type": "string"},
    "role":       {"type": "string"},
    "followers":  {"type": "number"},
    "experience": {"type": "list", "output": {
      "company":  {"type": "string"},
      "role":     {"type": "string"},
      "duration": {"type": "string"}
    }}
  }' --raw | jq .
```

LinkedIn sometimes blocks the public preview; if it does, fall back to step 2 (combining SERP snippets) — it's almost always enough.

### Email lookup

Triangulate, don't promise. SERP first, scraping last.

```bash
# 1. Has Google already indexed the email anywhere?
hasdata google-serp --q '"jane.doe@acme.com"' --num 10 --raw \
  | jq -c '.organic_results[] | {title, snippet, link}'

# 2. What email format does the company use? Look for any indexed @company.com address.
hasdata google-serp --q 'site:acme.com "@acme.com"' --num 10 --raw \
  | jq -r '.organic_results[].snippet' \
  | grep -oE '[A-Za-z0-9._-]+@acme\.com' | sort -u

# 3. Pattern-guess + SERP-verify
for guess in "jane.doe" "jdoe" "jane" "j.doe" "janed"; do
  count=$(hasdata google-serp --q "\"$guess@acme.com\"" --num 1 --raw \
            | jq -r '.organic_results | length')
  [ "$count" -gt 0 ] && echo "$guess@acme.com  (appears in SERP)"
done

# 4. Last resort — scrape the company's contact / about / team pages for emails
hasdata web-scraping --url "https://acme.com/about" --extract-emails --raw \
  | jq -r '.emails // [] | .[]'
```

Always tell the user when an email is a pattern-guess vs. confirmed via SERP/scrape.

---

## Company enrichment

### Step 1 — SERP knowledge_graph

```bash
hasdata google-serp --q "Acme Corp" --num 5 --raw | jq '.knowledge_graph // {}'
```

`.knowledge_graph` typically contains: founder, founded (year), headquarters, parent_organization, ceo, employees (range), revenue, stock_price, industry, products. **For the majority of company enrichment requests, this single call is the entire answer.**

### Step 2 — Targeted SERP for specific fields

```bash
# Headquarters
hasdata google-serp --q '"Acme Corp" headquarters' --num 5 --raw \
  | jq -r '.organic_results[].snippet'

# Funding / acquisition signals
hasdata google-serp --q '"Acme Corp" raises OR acquires OR acquired OR ipo OR funding' --num 10 --raw \
  | jq -c '.organic_results[] | {title, snippet, link}'

# Recent news
hasdata google-news --q "Acme Corp" --gl us --raw \
  | jq -c '.news_results[] | {title, source: .source.name, date, link}'

# LinkedIn company page
hasdata google-serp --q '"Acme Corp" site:linkedin.com/company' --num 3 --raw \
  | jq -c '.organic_results[] | {title, snippet, link}'

# Employee profiles in a specific function/region
hasdata google-serp \
  --q 'site:linkedin.com/in "Acme Corp" engineer' --gl us --num 25 --raw \
  | jq -r '.organic_results[] | "\(.title)\t\(.link)"'
```

### Step 3 — Web-scraping (only when SERP can't fill a specific field)

```bash
# Company About page → AI-extract structured fields
hasdata web-scraping --url "https://acme.com/about" \
  --ai-extract-rules-json '{
    "name":         {"type": "string"},
    "founded":      {"type": "number"},
    "headquarters": {"type": "string"},
    "employees":    {"type": "string"},
    "industry":     {"type": "string"},
    "description":  {"type": "string"},
    "products":     {"type": "list"}
  }' --raw | jq .
```

Reach for this only when the user wants something SERP can't provide (e.g. mission statement verbatim, full product taxonomy, leadership team page parsed into rows).

---

## CSV row enrichment

For a list of N rows, fan out one or two SERP calls per row. Keep web-scraping out of the loop unless a specific row needs it.

```bash
# Input: people.csv with one column "name"
while IFS=, read -r name; do
  result=$(hasdata google-serp --q "\"$name\" linkedin" --num 1 --raw)
  linkedin=$(echo "$result" | jq -r '.organic_results[0].link // ""')
  title=$(echo "$result"    | jq -r '.organic_results[0].title // ""')
  snippet=$(echo "$result"  | jq -r '.organic_results[0].snippet // ""')
  printf '%s\t%s\t%s\t%s\n' "$name" "$title" "$snippet" "$linkedin"
done < people.csv > enriched.tsv
```

That's it. One SERP call per row, role/employer/LinkedIn extracted from the title and snippet. Add a second SERP call only if a row's first result didn't match (`select(.title | test("\(name)"; "i"))` filtering for confidence).

---

## Reverse-lookup

Always SERP-first with the literal value quoted.

```bash
# Email → identity
hasdata google-serp --q '"jane@example.com"' --num 10 --raw \
  | jq -c '.organic_results[] | {title, snippet, link}'

# Phone → owner / business
hasdata google-serp --q '"+1 555 123 4567"' --num 10 --raw
# Combine with yelp-search / yellowpages-search if it's a business number.

# Domain → company
hasdata google-serp --q "site:example.com" --num 5 --raw \
  | jq '.organic_results[0].title'
hasdata google-serp --q "Acme Corp" --num 5 --raw | jq '.knowledge_graph // {}'
```

Only scrape the domain (`web-scraping --url "https://example.com"`) when you specifically need the homepage's body text.

---

## Tips for reliable enrichment

- **Always quote names and other multi-token strings** — `"Jane Doe"` matches the exact person; `Jane Doe` matches noise.
- **Use `site:` aggressively** — `site:linkedin.com/in/`, `site:linkedin.com/company/`, `site:github.com`, `site:crunchbase.com`. Google's `site:` is the cheapest way to scope an enrichment search.
- **Read the `.knowledge_graph`** before doing anything else for a company. If it's populated, you're often done.
- **AI-extract over CSS selectors** when you do need to scrape — LinkedIn / Crunchbase / About-page markup changes constantly; AI extraction with field names + descriptions survives layout churn.
- **Cross-source verify** — never enrich from a single source. If LinkedIn's title says "Acme Corp" and a `--q '"Jane Doe" "Acme Corp"'` SERP corroborates with multiple results, confidence is high.
- **Mark guesses** — pattern-guessed emails, inferred locations, single-source roles should be flagged to the user as unverified.
