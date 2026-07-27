# Naver Content MCP

An **authless remote MCP server** that reads Naver blog, news, cafe, and place
content by scraping Naver's public mobile pages from the Cloudflare edge. No
Naver Open API key is used.

It exists because Claude mobile / Cowork cannot reach `naver.com` directly —
those requests are refused by the egress proxy (`PROXY_REJECTED`). Running the
fetch at the edge sidesteps that, since the edge is not behind that proxy.

## Tools

| Tool | What it does |
| --- | --- |
| `naver_blog_search(query, count, sort)` | Scrapes the mobile blog search tab. Pages via `start`, up to 100 results. |
| `naver_blog_read(url)` | Full post body as markdown. Normalises `blog.naver.com` → `m.blog.naver.com` because the desktop page renders the body in an iframe. |
| `naver_news_search(query, count)` | Mobile news search tab. |
| `naver_news_read(url)` | Full article body from `n.news.naver.com`. |
| `naver_cafe_search(query, count)` | Public cafe posts only. Member-only boards are not attempted. |
| `naver_place_reviews(query)` | Blog reviews written about a place. |

## Fallback chain

`naver_blog_read` tries four routes in order and returns the first that yields a
body. All four stay in the chain, so a block on one degrades instead of breaking.

1. **`direct-mobile`** — `m.blog.naver.com/{blogId}/{logNo}`
2. **`pc-postview`** — `blog.naver.com/PostView.naver?blogId=…&logNo=…`
3. **`jina-reader`** — `r.jina.ai/https://m.blog.naver.com/…` (no key required)
4. **`rss`** — `rss.blog.naver.com/{blogId}.xml`

Body extraction prefers SmartEditor ONE (`se-main-container`) and falls back to
older layouts (`postViewArea`, `post-view`, `__content`, `se_component_wrap`).

## Error reporting

Failures are classified rather than collapsed into one message, because
"Naver refused us" and "we could not find the body" need different fixes:

- `BLOCKED` — HTTP 403/429, or a genuine block page
- `PARSE_FAILED` — page fetched fine, no known container matched
- `NOT_FOUND` — post deleted or private
- `TRANSPORT` / `UPSTREAM` — network or Naver-side error

Failed blog reads include the per-route trace so you can see what each fallback did.

## Request shaping

Requests carry a real mobile Chrome `User-Agent`, `Accept-Language: ko-KR`, a
matching `Referer`, and the `Sec-Fetch-*` / `Sec-Ch-Ua` headers a browser sends.
Naver rejects `python-urllib`-style clients. Search paging sleeps ~600 ms between
pages, and 403/429/5xx are retried with exponential backoff.

## Verification

Two workflows, both of which run on GitHub runners (which, unlike the Claude
Code sandbox, can reach Naver):

- **`naver-edge-probe.yml`** — the step-0 gate. Probes all four fallback routes
  plus every search surface and fails if no route returns a post body. A second
  job runs the shipped tool code against live Naver.
- **`naver-mcp-deploy.yml`** — deploys to Cloudflare Workers, then drives the
  deployed endpoint over JSON-RPC exactly like a Claude connector does
  (`initialize` → `tools/list` → `tools/call`) and asserts real body text comes back.

## Deploying

Set two repository secrets, then run the deploy workflow:

- `CLOUDFLARE_API_TOKEN` — created from the **Edit Cloudflare Workers** template
- `CLOUDFLARE_ACCOUNT_ID`

The workflow prints the connector URL (`https://<worker>.workers.dev/mcp`) in its
job summary.

Locally: `npm install && npx wrangler deploy`.

## Connecting from Claude

Settings → Connectors → Add custom connector → paste the `/mcp` URL. No auth.

## Scope

Reads publicly accessible pages only. It does not log in, does not touch
member-only cafe boards, and does not use Naver's Open API.
