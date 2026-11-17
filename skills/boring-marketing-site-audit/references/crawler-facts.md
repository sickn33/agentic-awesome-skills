# Crawler, CDN and PageSpeed facts (perishable: check the header before relying on anything below)

last-verified: 2026-11-16 · ttl-days: 90 · refresh: re-read the source pages listed at the end (OpenAI, Anthropic and Perplexity crawler docs; Google's common crawlers page and robots.txt spec; Cloudflare's "AI Crawler and Agent access policies" page; the PageSpeed Insights get-started page and the CrUX API page), update any row that changed, add crawler names the vendors added, and keep `AI_BOTS` in scripts/crawl_audit.py in step
changes: 2026-11-16 first version, every row read from the vendor's own page that day.

Load this before describing what a crawler does, what a CDN blocks by default, or what
PageSpeed can and can't measure. If today is past last-verified + ttl-days, refresh first
and say so in one line: `Refreshed crawler facts (cache was N days old).`

## AI and search crawlers

| Token in robots.txt | Vendor | Job | Honors robots.txt | What blocking it costs |
|---|---|---|---|---|
| Googlebot | Google | Search, including AI Overviews and AI Mode | Yes | Google Search |
| Google-Extended | Google | Control token only (no user agent of its own): Gemini training and grounding in Gemini Apps and Vertex AI | Yes | Gemini training and grounding. Google says it does not affect inclusion or ranking in Google Search |
| Bingbot | Microsoft | Search for Bing and Copilot | Yes | Bing and Copilot answers |
| OAI-SearchBot | OpenAI | Search in ChatGPT | Yes (about 24 hours to take effect) | Pages aren't shown as sources in ChatGPT search answers; OpenAI says they may still appear as navigational links |
| ChatGPT-User | OpenAI | Fetches a page when a person asks ChatGPT or a custom GPT | OpenAI says robots.txt rules may not apply to these user-initiated visits | ChatGPT can't open the page for the person asking |
| GPTBot | OpenAI | Training | Yes | Training only; OpenAI states each setting is independent |
| OAI-AdsBot | OpenAI | Checks landing pages submitted as ChatGPT ads | Visits submitted pages only | Not in the audit's list; only relevant to advertisers |
| Claude-SearchBot | Anthropic | Indexes content to improve Claude's search results | Yes | Anthropic says blocking it may reduce visibility and accuracy in Claude's search results |
| Claude-User | Anthropic | Fetches a page when a person asks Claude | Yes | Claude can't retrieve the page for the person asking |
| ClaudeBot | Anthropic | Training | Yes (also reads Crawl-delay) | Training only; does not stop Claude-SearchBot or Claude-User |
| PerplexityBot | Perplexity | Surfaces and links sites in Perplexity search; not used for training | Yes (up to 24 hours) | Pages can't be surfaced in Perplexity answers |
| Perplexity-User | Perplexity | Fetches a page for a person's question | Perplexity says it generally ignores robots.txt | Only an edge block stops it |
| Applebot-Extended | Apple | Control token for training | Not re-read | Training only |
| CCBot | Common Crawl | Open crawl dataset many models train on | Not re-read | Training datasets |
| meta-externalagent | Meta | Training | Not re-read | Training only |
| Bytespider | ByteDance | Training | Not re-read | Training only |
| Amazonbot | Amazon | Alexa answers and model work | Not re-read | Amazon's assistants |

The Googlebot, Bingbot and OpenAI rows, and the Anthropic and Perplexity rows, come
from the vendors' pages listed below. Applebot-Extended, CCBot, meta-externalagent,
Bytespider, Amazonbot and the smaller training crawlers in the script (cohere-ai,
AI2Bot, Timpibot, FacebookBot) were not re-read this time; read the vendor's page before
saying how one behaves.

What this means for a business that wants to be found: allow the search and user-fetch
crawlers; the training crawlers are a separate choice that doesn't remove a site from AI
search. Vendors verify their crawlers by published IP ranges (OpenAI and Perplexity
publish JSON lists), so a firewall rule that trusts the user agent alone can be fooled,
and a rule that checks IPs will refuse a stand-in request that merely uses the name.

## How Google reads robots.txt

From Google's robots.txt specification (last updated 2026-10-23):

- **Status codes.** 2xx: rules are used. 3xx: Google follows at least five hops, then
  treats it as a 404. 4xx except 429: treated as if no robots.txt exists, so no crawl
  restrictions. 5xx (and timeouts, DNS and connection errors, which count as server
  errors): for the first 12 hours Google stops crawling the site; for the next 30 days it
  uses the last good copy (with no cached copy, it assumes no restrictions); after 30
  days it behaves as if there were no robots.txt when the site is otherwise available,
  and stops crawling when it isn't. A 503 gets retried often.
- **Size.** 500 KiB; content past the limit is ignored.
- **Fields.** user-agent, allow, disallow, sitemap. Crawl-delay is not supported by Google
  (other crawlers, including ClaudeBot, read it). Unknown lines are ignored, and a sitemap
  line between user-agent lines doesn't split the group.
- **Groups.** A crawler follows the most specific group naming its product token,
  case-insensitively. Several groups for the same token are merged. A named group and the
  `*` group are never combined, so a bot named anywhere ignores the `*` rules entirely.
- **Rule precedence.** The longest matching path wins; on a tie the least restrictive
  (allow) wins. `*` matches any characters and `$` anchors the end. Rules without a path
  are ignored, so `Disallow:` with nothing after it allows everything.
- Google generally caches robots.txt for up to 24 hours.

From Google's robots.txt introduction and its noindex page: a URL disallowed in
robots.txt can still be indexed if other pages link to it, and noindex only works when
the page is not blocked by robots.txt, because a crawler that can't fetch the page never
sees the tag. Keep a page out of results with noindex, not Disallow.

## CDNs and AI crawlers

- **Cloudflare** (AI Crawler and Agent access policies page, last updated Nov 2, 2026):
  policies are set per behavior (Search, Agent, Training) with actions Block, Block on
  pages with ads, Allow, and Disallow (Training only, written into robots.txt). For new
  domains all three behaviors default to Allow. Blocking Training also blocks
  mixed-purpose crawlers used for both training and search. Older zones may still carry
  an earlier "Block AI bots" setting or Cloudflare's managed robots.txt, which inserts a
  block marked `# BEGIN Cloudflare Managed content` that disallows training crawlers
  (GPTBot, ClaudeBot, Google-Extended, CCBot and others) and adds a
  `Content-signal: search=yes, ai-train=no` line. Bot Fight Mode can also challenge
  crawlers. The audit detects the managed block and records content-signal lines.
- Other CDNs and firewalls (Akamai, Fastly, Vercel, Sucuri, Wordfence and the like) have
  their own bot rules; this file makes no claim about their defaults. Name the CDN the
  server headers point to and tell the owner where its bot settings live.

## PageSpeed Insights and Core Web Vitals

- **API.** `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=...&strategy=mobile`.
  Works with or without a key; Google recommends a key for frequent, automated queries.
  Keyless calls share one quota and often fail with "Quota exceeded ... Queries per day";
  a free key from the Google Cloud console fixes it.
- **Field data is going away from this API.** Google's get-started page says it plans to
  stop including Chrome UX Report (real-visitor) data in the PageSpeed Insights API and
  recommends the CrUX API instead. The script reads field data from PageSpeed while it is
  there, and falls back to the CrUX API when a key is available.
- **CrUX API.** `POST https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=...`
  with `{"url": ..., "formFactor": "PHONE"}` or `{"origin": ...}`. Needs a Google Cloud
  key with the Chrome UX Report API enabled; free, 150 queries a minute per project. A
  404 means not enough traffic for that page or origin.
- Field data covers the trailing 28 days at the 75th percentile, and exists only for
  pages and origins with enough Chrome traffic. Lab data is one simulated load.
- **Thresholds** (Google): good LCP is within 2.5 s, INP under 200 ms, CLS under 0.1.
  Poor is LCP over 4 s, INP over 500 ms, CLS over 0.25.
- **Weight.** Google says Core Web Vitals are used by its ranking systems, that good
  scores don't guarantee top rankings, and that it "always seeks to show the most
  relevant content, even if the page experience is sub-par". Speed matters most when it
  loses customers, not as a ranking lever.

## Structured data and AI files

Carried from this library's AI search facts (`ai-search/references/aeo-facts.md`,
verified 2026-09-02); re-check there:
- FAQ rich results were removed for every site on May 7, 2026; FAQ markup's remaining
  value is a clean question-and-answer structure. HowTo rich results ended in 2023.
- Google's guidance on AI features says no special markup is needed and llms.txt isn't
  needed for Google Search; no engine has confirmed rewarding llms.txt.
- In a matched-control test, schema on a page showed no citation lift on its own.

## Sources (read 2026-11-16)

- OpenAI crawlers: https://developers.openai.com/api/docs/bots
- Anthropic crawlers: https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler
- Perplexity crawlers: https://docs.perplexity.ai/docs/resources/perplexity-crawlers
- Google common crawlers (Googlebot, Google-Extended): https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers
- Google robots.txt spec: https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec
- Cloudflare AI crawler policies: https://developers.cloudflare.com/bots/additional-configurations/block-ai-bots/
- Cloudflare managed robots.txt: https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/
- PageSpeed Insights API: https://developers.google.com/speed/docs/insights/v5/get-started
- CrUX API: https://developer.chrome.com/docs/crux/api
- Robots introduction and noindex: https://developers.google.com/search/docs/crawling-indexing/robots/intro and https://developers.google.com/search/docs/crawling-indexing/block-indexing
- Core Web Vitals and page experience: https://developers.google.com/search/docs/appearance/core-web-vitals and https://developers.google.com/search/docs/appearance/page-experience
