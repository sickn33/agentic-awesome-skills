---
name: geo-crawlers
description: AI crawler access analysis.
category: seo
risk: safe
source: https://github.com/zubair-trabzada/geo-seo-claude
source_repo: zubair-trabzada/geo-seo-claude
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/zubair-trabzada/geo-seo-claude/blob/main/LICENSE
compatibility: Docs-only; upstream helper scripts and templates are not bundled. Site
  audits need network access to the target site; PDF reports need pandoc and headless
  Chrome.
allowed-tools:
- Read
- Grep
- Glob
- Bash
- WebFetch
- Write
---

# AI Crawler Access Analysis Skill

## Purpose

Review crawler access for a specified site and publisher policy. Access is one
input to discovery, not a guarantee of indexing/citation; training opt-out is
separate from search access and cannot remove existing model knowledge. Do not
recommend allowing training merely to improve a visibility score. Confirm the
owner's licensing, privacy, load and search goals first.

## Verified operator distinctions

| Token | Purpose/control | Policy implication |
|---|---|---|
| GPTBot | OpenAI model-training crawl | Independent of search permission |
| OAI-SearchBot | ChatGPT search indexing | Search opt-out can still permit navigational links |
| ChatGPT-User | User-directed requests | Not automatic indexing; robots rules may not apply |
| ClaudeBot | Potential model-training content | Distinct from Claude search/retrieval agents |
| Claude-SearchBot | Search indexing/quality | Review separately from training |
| Claude-User | User-directed retrieval | Review the publisher's desired access |
| Google-Extended | Product-control token for Gemini training/grounding | No separate HTTP UA; does not control Google Search inclusion/ranking |

Sources: [OpenAI](https://developers.openai.com/api/docs/bots),
[Anthropic](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler),
[Google](https://developers.google.cn/crawling/docs/crawlers-fetchers/google-common-crawlers?hl=en).
User-Agent text is spoofable: verify operator-published source IPs/methods before
attributing log traffic. Full UA versions change; match documented tokens.

Other imported names (PerplexityBot, GoogleOther, Applebot-Extended, Amazonbot,
FacebookBot, CCBot, Bytespider, cohere-ai and historical anthropic-ai) are leads to
verify against each operator's current documentation. Do not infer their current
search/training behavior, user counts or business value from this list.

## Worked policy example

For a publisher who explicitly wants ChatGPT search but declines OpenAI training,
propose a minimal diff after reviewing existing groups:

```text
User-agent: OAI-SearchBot
Allow: /public/
Disallow: /

User-agent: GPTBot
Disallow: /
```

This allows the selected public subtree according to longest-match rules. Merge
with the existing policy; never replace unrelated crawler/path restrictions or
rely on robots.txt as access control. Private pages still need authentication.
Actual retrieval also depends on WAF/CDN policy, robots status and crawl caches.

---

## Analysis Procedure

### Step 1: Fetch and Parse robots.txt

1. Validate the authorized HTTPS origin, redirects and public destination; bound requests/time/bytes and fetch `[domain]/robots.txt` without credentials. Record errors/status distinctly from missing rules.
2. Parse all User-agent directives and their associated Allow/Disallow rules.
3. For each verified crawler and representative URL, apply RFC 9309 group merging and longest-path match (Allow wins equal specificity), not a whole-site binary:
   - Check if there is a specific User-agent block for that crawler
   - Check if there is a wildcard (`User-agent: *`) block that would apply
   - Determine effective access: **Allowed**, **Blocked**, or **Not Mentioned** (inherits wildcard rules)
4. Note any `Crawl-delay` directives that may slow AI crawler access.
5. Check for `Sitemap` directives (AI crawlers use these for discovery).

### Step 2: Check Meta Robots Tags

1. For a sample of 5-10 key pages, fetch the HTML and check for:
   - `<meta name="robots" content="noindex">` -- indexing directive for supporting agents, not access control
   - `<meta name="robots" content="nofollow">` -- supported link-handling hint, not a universal fetch ban
   - `<meta name="robots" content="noai">` -- nonstandard proposal; verify operator support before assigning effect
   - `<meta name="robots" content="noimageai">` -- nonstandard; do not assume operator enforcement
   - Bot-specific meta tags: `<meta name="GPTBot" content="noindex">`
2. Record any page-level overrides of the robots.txt directives.

### Step 3: Check HTTP Headers

1. For the same sample pages, check response headers for:
   - `X-Robots-Tag: noindex` -- HTTP header equivalent of meta noindex
   - `X-Robots-Tag: noai` -- HTTP header to block AI use
   - `X-Robots-Tag: noimageai` -- nonstandard; do not assume operator enforcement
   - Bot-specific headers: `X-Robots-Tag: GPTBot: noindex`
2. Evaluate supported meta/header directives together under each operator's documented rules; there is no universal header-overrides-meta rule. Headers can cover non-HTML resources.

### Step 4: Check for AI-Specific Files

1. Check for `/llms.txt` as an optional proposal; presence is not a platform indexing requirement.
2. Record a legacy `/.well-known/ai-plugin.json` only as historical integration metadata, not a current crawler prerequisite.
3. Check for `/ai.txt` (proposed standard, similar to ads.txt for AI).
4. Record presence/absence and quality of each file.

### Step 5: Assess JavaScript Rendering Requirements

1. Check if the site is a Single Page Application (SPA) or heavily JavaScript-rendered.
2. Compare raw response with an authorized rendered page and record which content
   requires JavaScript. Do not invent each crawler's rendering capabilities from
   product names; Google-Extended is a control token, not a rendering engine.
3. If critical content requires JS rendering, flag this as a potential issue.
4. Check for Server-Side Rendering (SSR) or Static Site Generation (SSG) as mitigations.

### Step 6: Parse Content Signals

Using the already-fetched robots.txt from Step 1, scan for `Content-Signal:` directives (optional provider-defined extension; not RFC 9309 enforcement).

1. Scan every line for a line starting with `Content-Signal:` (case-insensitive).
2. If found:
   - Parse all key=value pairs (split on `,` then on `=`).
   - Validate keys against the known set: `ai-train`, `search`, `ai-input` in the Cloudflare Content Signals implementation.
   - Validate values: only `yes` and `no` are valid.
   - Flag any unknown keys or invalid values as a warning — record the exact implementation/version; do not conflate it with a final IETF standard.
   - Record syntax as **Parsed**, not proof of compliance or crawler behavior and surface parsed values with plain-English meaning.
3. If absent: record as **Absent** — ask whether the publisher wants an optional declaration.

No additional HTTP request is needed. robots.txt is already fetched in Step 1.

---

## Output Format

Generate a file called `GEO-CRAWLER-ACCESS.md`:

```markdown
# AI Crawler Access Report: [Domain]

**Analysis Date:** [Date]
**Domain:** [Domain]
**robots.txt Status:** [Found/Not Found/Error]

---

## Crawler Access Summary

| Crawler | Operator | Tier | Status | Impact |
|---|---|---|---|---|
| GPTBot | OpenAI | 1 | [Allowed/Blocked/Not Mentioned] | [Impact description] |
| OAI-SearchBot | OpenAI | 1 | [Status] | [Impact] |
| ChatGPT-User | OpenAI | 1 | [Status] | [Impact] |
| ClaudeBot | Anthropic | 1 | [Status] | [Impact] |
| PerplexityBot | Perplexity | 1 | [Status] | [Impact] |
| Google-Extended | Google | 2 | [Status] | [Impact] |
| GoogleOther | Google | 2 | [Status] | [Impact] |
| Applebot-Extended | Apple | 2 | [Status] | [Impact] |
| Amazonbot | Amazon | 2 | [Status] | [Impact] |
| FacebookBot | Meta | 2 | [Status] | [Impact] |
| CCBot | Common Crawl | 3 | [Status] | [Impact] |
| anthropic-ai | Anthropic | 3 | [Status] | [Impact] |
| Bytespider | ByteDance | 3 | [Status] | [Impact] |
| cohere-ai | Cohere | 3 | [Status] | [Impact] |

## AI Visibility Score: [X]/100

**Tier 1 Access:** [X/5 crawlers allowed]
**Tier 2 Access:** [X/5 crawlers allowed]
**Tier 3 Access:** [X/4 crawlers allowed]

---

## Critical Issues

[List any Tier 1 crawlers that are blocked]

## Recommendations

### Immediate Actions
[Specific robots.txt changes needed]

### robots.txt Recommendation
```
[Complete recommended robots.txt content for AI crawlers]
```

### Additional Technical Findings
- **Meta Robots Tags:** [Findings]
- **X-Robots-Tag Headers:** [Findings]
- **JavaScript Rendering:** [Assessment]
- **llms.txt:** [Present/Absent]
- **Sitemap Accessibility:** [Assessment]

### Content Signals (IETF Draft)

**Status:** Present / Absent

<!-- If present: -->
| Signal Key | Value | Meaning |
|---|---|---|
| ai-train | no | Opted out of AI model training |
| search | yes | Prefers indexing and links/excerpts; this implementation separates generative input |
| ai-input | yes | Prefers use as generative model input |

<!-- If absent: -->
**Recommendation:** Add a `Content-Signal:` directive to robots.txt to declare AI usage preferences explicitly. Example:

`Content-Signal: ai-train=no, search=yes, ai-input=yes`

See https://contentsignals.org/ for the full specification.
```

---

## Scoring for Crawler Access

The imported tier/point rubric below is an optional internal inventory aid,
not a measured AI visibility score. Update counts to the actually verified token
set and report training-policy choices separately; do not penalize a deliberate
training opt-out or missing optional llms.txt as a search defect. Mark unknown
access as unknown, never pass. [Content Signals implementation](https://contentsignals.org/)
uses separate `search`, `ai-input` and `ai-train` preferences and is voluntary.



The AI Crawler Access Score is calculated as:

| Component | Weight | Scoring |
|---|---|---|
| Tier 1 Crawlers Allowed | 50% | 20 points per Tier 1 crawler allowed (5 crawlers = 100 points max, scaled to 50) |
| Tier 2 Crawlers Allowed | 25% | 20 points per Tier 2 crawler allowed (5 crawlers = 100 points max, scaled to 25) |
| No Blanket AI Blocks | 15% | Full points if no `User-agent: *` Disallow: / and no noai meta tags |
| AI-Specific Files Present | 10% | 5 points for llms.txt, 5 points for sitemap accessible to AI crawlers |

Final score = sum of all weighted components, capped at 100.

## When to Use

- You need a Generative Engine Optimization task for a website: audit, citability, crawlers, schema, llms.txt, content, platform tuning, or client reporting.
- Run read-only analysis first; propose site changes before making any.

## Limitations

- Audits are read-only analysis; never publish, deploy, or modify the target site without explicit approval.
- Scores and citation likelihoods are heuristics, not guarantees from AI search platforms.
- Docs-only import: upstream scripts, agents, hooks, and schema templates are not bundled.

### Example

```bash
curl -s https://example.com/robots.txt
curl -s https://example.com/llms.txt
```

> Adapted from [zubair-trabzada/geo-seo-claude](https://github.com/zubair-trabzada/geo-seo-claude) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: upstream runtime helpers not bundled.
