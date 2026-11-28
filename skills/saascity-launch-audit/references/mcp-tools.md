# SaaSCity Keyless MCP Tools Reference

Endpoint: `https://saascity.io/api/mcp`  
Transport: Streamable HTTP (`POST` JSON-RPC 2.0, CORS enabled)  
Authentication: None (keyless, per-IP rate limits)  
Documentation: [https://saascity.io/mcp](https://saascity.io/mcp)

## Launch Readiness

### `check_launch_readiness`

Audits a homepage's static HTML across 16 checks: HTTPS, `noindex`, `<title>`, meta description, live `og:image` fetch, X card, favicon, canonical URL, mobile viewport, `<h1>`, JSON-LD, `robots.txt`, `sitemap.xml`, parked/404 status, response time, and non-empty HTML without JavaScript.

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `url` | `string` | Yes | Product homepage URL (`https://` prefix optional) |

Returns: `finalUrl`, `httpStatus`, `responseMs`, `score` (`0–100`), `verdict` (`ready`, `almost_ready`, `not_ready`), `saascityBadge`, and `checks[]` (`id`, `label`, `status`, `detail`, `critical`).

## Directory Selection

### `recommend_launch_directories`

Returns hand-picked directories grouped by submission timing (launch platforms first, evergreen directories after), with editorial notes, Ahrefs DR, link type, pricing, and badge-exchange status.

| Argument | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `product_type` | `string` | No | `any` | One of `saas`, `ai`, `devtools`, `any` |
| `free_only` | `boolean` | No | `false` | Return only picks with a free or freemium route |

### `find_launch_directories`

Filters 1,600+ startup, SaaS, and AI directories.

| Argument | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `query` | `string` | No | `""` | Substring match against directory name or domain |
| `category` | `string` | No | — | Directory category filter |
| `min_dr` | `integer` | No | `0` | Minimum Ahrefs Domain Rating (`0–100`) |
| `link_type` | `string` | No | `any` | `any`, `dofollow`, or `nofollow` |
| `pricing` | `string` | No | `any` | `any`, `free`, `free_or_freemium`, or `paid` |
| `exclude_badge_exchange` | `boolean` | No | `false` | Omit directories whose free tier requires a reciprocal badge |
| `sort` | `string` | No | `dr` | `dr` (highest first) or `name` (alphabetical) |
| `limit` | `integer` | No | `20` | Page size (`1–50`) |
| `offset` | `integer` | No | `0` | Pagination offset |

### `get_launch_directory`

Looks up a single directory by domain or URL to inspect Ahrefs DR, link type, pricing, badge requirement, submit URL, and editorial note.

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `domain` | `string` | Yes | Bare domain or URL (e.g., `uneed.best`) |

## SaaSCity Draft Submission & Status

### `submit_project`

Creates an unpublished draft listing on SaaSCity and returns a `claimUrl`. Nothing goes live until the user opens the link, signs in, picks a plan, and submits.

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `title` | `string` | Yes | Product name (`3–60` chars) |
| `tagline` | `string` | Yes | Single-line summary (`10–100` chars) |
| `category` | `string` | Yes | Listing category ID |
| `description` | `string` | Yes | Plain-text overview (`50–5000` chars) |
| `website_url` | `string` | Yes | `https://` URL on a custom domain |
| `twitter_url` | `string` | No | X/Twitter profile URL |
| `github_url` | `string` | No | Public repository URL |
| `tags` | `string[]` | No | Up to 10 short keywords |

### `check_badge` & `get_submission_status`

- `check_badge`: Confirms whether a homepage contains the SaaSCity badge anchor needed for a free badge slot.
- `get_submission_status`: Checks review, launch week, badge status, and link type for a draft token.

## Post-Launch Backlink Audit

### `check_backlink`

Fetches static HTML from a live directory listing page and inspects every anchor targeting your domain.

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `page_url` | `string` | Yes | Live directory page URL listing your product |
| `your_domain` | `string` | Yes | Your domain or URL (subdomains match) |

Returns: `verdict` (`dofollow`, `nofollow`, `redirect_only`, `not_found`), `httpStatus`, `pageIndexable`, `pageNofollow`, `canonicalElsewhere`, `links[]` (`href`, `text`, `rel`, `followed`, `hidden`), `linkCount`, and `redirectLinkCount`.
