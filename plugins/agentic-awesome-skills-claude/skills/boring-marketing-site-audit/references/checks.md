# The checks: what each finding means and how to fix it

Load this in Phase 3, before deciding which findings make the top list. Each entry gives
the finding id as it appears in `findings.json`, the default severity, what the crawler
actually observed, when to move it up or down, its known blind spots, and the fix. Ids
and severities are working vocabulary; they never appear in the client's report.

Severities: critical (stops Google or customers reaching the site or a money page), high
(costs visibility on pages that matter), medium (real but contained), low (worth doing
when convenient), info (a fact or a choice, not a problem). Several checks rise one level
when a money page is affected; `key_pages_affected` in the finding says how many were.

## Getting crawled and indexed

- **homepage_unreachable** (critical). The homepage didn't answer 2xx with HTML to the
  crawler. Before reporting, load it in a browser: if it works there, the server or CDN
  refuses unknown crawlers, which is a different finding (say which). Fix the hosting,
  firewall or domain first; nothing else matters until it loads.
- **tls_error** (critical). The certificate check failed. Browsers show a warning page,
  so customers leave too. Renew or reinstall; cover both www and the bare domain.
- **not_https** (critical). The final homepage address is http://. Turn on HTTPS at the
  host or CDN and redirect every http:// URL in one hop.
- **host_variants** (high; low when the variants arrive in more than one hop). Some of
  http://, https://, www and the bare domain don't end at the main address. Each variant
  that answers on its own is a duplicate site. One 301 rule per variant fixes it.
- **robots_unreachable** (critical). robots.txt answered 5xx, 429 or nothing. Google
  stops crawling while robots.txt errors (details in `crawler-facts.md`). A clean 404 is
  fine; an error is not.
- **robots_is_html** (medium). /robots.txt returns a web page, usually a CMS catch-all.
  Google then finds no rules, so nothing is blocked, but nothing is declared either.
- **robots_missing** (low). No robots.txt. Crawlers treat that as allow-all, so the only
  cost is not declaring the sitemap. Never put this in the top list.
- **robots_too_large** (medium). Over 500 KiB; Google ignores the rest.
- **robots_blocks_google** (critical). Googlebot may not fetch `/`. Usually a staging
  rule (`Disallow: /`) that shipped to the live site. The observation quotes the rule.
- **robots_blocks_pages** (high, critical on money pages). Googlebot is blocked from
  pages that are linked from at least two pages, listed in the sitemap, or key. Admin,
  cart, account and search paths are left out on purpose. Blocking stops crawling, not
  indexing: a blocked URL can still appear in results without a description.
- **robots_blocks_resources** (medium). CSS or JavaScript files on the site are blocked
  for Googlebot (often old WordPress rules on /wp-includes/), so Google renders pages
  without their layout.
- **noindex_key_pages** (critical). Money pages, or nearly every page, carry noindex in
  meta robots, a googlebot meta tag or an X-Robots-Tag header. When nearly every page is
  noindex, look for one switch: WordPress's Settings, Reading, "Discourage search engines
  from indexing this site"; a staging setting on the host; an SEO plugin default for a
  post type. In Wix, Squarespace and Webflow the page's SEO settings have a
  hide-from-search option. Then request indexing for the main pages in Search Console.
- **noindex_pages** (medium). Other pages with noindex. Often intended (thank-you pages,
  old offers). List them and let the owner confirm; don't rank this high without a reason.
- **soft_404** (medium). A made-up URL answered 200 with a page. Google calls these soft
  404s and may treat real thin pages the same way. The server should answer 404 for
  unknown URLs while still showing a friendly page.
- **js_rendered_content** (high when most pages or the homepage are affected, else
  medium). Pages whose HTML holds under 50 words and loads scripts (or carries a known
  app root such as an empty `#root` or `#__next`). Content checks skip these pages.
  Re-run with rendered HTML before saying anything about their content. The fix is
  server-side rendering or pre-rendering; the framework's docs name the setting.
- **meta_refresh** (medium). A meta refresh redirect. Replace with a 301.

## Sitemaps

The script parses the sitemaps it reads (including sitemap indexes and gzip files), so
these findings rest on the file's real content, not on whether a URL exists.

- **sitemap_missing** (medium). None listed in robots.txt and none at /sitemap.xml or
  /sitemap_index.xml. Small sites with good internal links get found anyway, so this is
  rarely a top-three item. Most CMSs and SEO plugins generate one; submit it in Search
  Console and list it in robots.txt.
- **sitemap_unparseable** (high). The listed sitemap loads but isn't a sitemap (HTML,
  broken XML, a DOCTYPE). Google can't use it.
- **sitemap_errors** (low). Parses, with problems: URLs on another host, http:// on an
  https site, lastmod dates in the future, entries without a URL.
- **sitemap_not_in_robots** (low). A one-line fix.
- **noindex_in_sitemap** (high, critical for money pages). The sitemap says "index this"
  and the page says "don't". Decide per page which one is right. The count covers the
  sitemap URLs this run fetched; a big sitemap is sampled.
- **sitemap_non_200** (medium for redirects, high for errors). The sitemap lists URLs
  that redirect, 404 or error. List final URLs only.
- **sitemap_blocked_by_robots** (high). Listed URLs that robots.txt blocks for Googlebot.
- **sitemap_canonicalized** (medium). Listed URLs whose canonical names another page.
- **indexable_not_in_sitemap** (low). Indexable pages found by links but absent from the
  sitemap. Reported only when both the crawl and the sitemap were read in full.

## Canonicals

- **canonical_conflict** (high). Two different canonicals on one page (two tags, or a tag
  and a Link header that disagree). Usually two plugins or a theme plus a plugin.
- **canonical_to_bad_target** (high, critical on money pages). The canonical points at a
  URL that redirects, errors or is noindex.
- **canonical_off_site** (high; critical when the homepage is affected). The canonical
  names another domain. Unless the content is syndicated on purpose, look for a staging
  host, an old domain or a template copied from another site.
- **canonical_elsewhere** (medium, high on money pages). The page names a different page
  of this site as canonical, so Google is asked to index the other one. Parameter URLs
  pointing at their clean version are expected and left out.
- **canonical_missing** (low). No canonical. Google picks one itself. Hygiene, not a fix.
- **canonical_relative** (info). Works, but absolute URLs are safer.

## Links and status codes

- **broken_internal_links** (high; critical when the link sits in the menu, on the
  homepage or on half the site). Internal links whose target answered 4xx or 5xx, from
  the crawl or from a follow-up check of the most-linked targets it didn't crawl. The
  finding lists how many pages link to each target. Fix the menu link once and it is
  fixed sitewide.
- **server_errors** (high). URLs that answered 5xx. Load one in a browser before
  reporting; a temporary hiccup during the crawl is possible.
- **redirect_loop** (high). Never resolves.
- **redirect_chains** (medium). Two or more hops. Point old URLs straight at the final page.
- **internal_links_to_redirects** (low). Links to URLs that redirect: http://, a missing
  trailing slash, an old path. Fix the menu and footer first.
- **orphan_pages** (medium; low when the crawl stopped at its limit). Sitemap pages that
  no crawled page links to. Weak evidence on a truncated crawl; say so.
- **deep_pages** (low). More than three clicks from the homepage.
- Pages that refused the crawler (401, 403, 429) or never answered appear under
  `not_checked`, never as broken. They may load fine for people and for Google.

## On the page

- **title_missing** (high, escalates on money pages). No title tag on an indexable page.
- **title_duplicate** (medium). Several pages share a title, usually a template default.
- **title_length** (low). Over 60 or under 30 characters. Cosmetic; Google rewrites many
  titles anyway. Never a top-five fix.
- **description_missing**, **description_duplicate** (low). Shapes the snippet, not the
  ranking.
- **h1_missing** (medium). No H1 on a page with text.
- **h1_multiple**, **heading_structure** (info). Fine for most sites.
- **viewport_missing** (high, escalates on money pages). No mobile viewport meta, so
  phones render a shrunken desktop page.
- **lang_missing** (info).
- **images_missing_alt**, **images_missing_dimensions** (low); **images_legacy_formats**
  (info). Tracking pixels and noscript fallbacks are ignored.
- **anchor_text** (low). Internal links with no text or "click here" text.
- **social_tags_missing** (low). Key pages without og:title or og:image show a bare
  preview when shared.
- **url_hygiene** (info). Uppercase, underscores, very long URLs. Never rename working
  URLs for this alone.

## Content

- **thin_content** (medium; high when the homepage or three or more service and
  location pages are thin). Under 300 words of main content (menus and footers excluded)
  on an indexable page. Contact pages are left out. A word count is a proxy: read one
  example before calling it thin. A service page with 250 words, a price range and a
  booking form may do its job.
- **duplicate_content** (medium; high when a money page is involved). Identical main
  text on two or more indexable pages.
- **near_duplicate_content** (medium). Page pairs whose text fingerprints nearly match.
  The classic case is town pages with the town name swapped; route the rewrite to
  `/boring-marketing-service-area-pages`.
- **content_no_dates**, **content_stale**, **content_no_author**,
  **content_no_answer_capsules**, **content_thin_evidence** (low). Reported for
  articles with 300+ words. The `site.content_signals` block summarizes them across the
  articles crawled: share with a visible date, median age, share with an author,
  statistics per 100 words, quotations, outside sources, question headings and short
  answers. Use them to brief `/boring-marketing-seo-content` refreshes, not as top-list items, unless the
  site's business is its content.

## AI crawler access

The `site.ai_crawlers` block holds each crawler's robots.txt state (allowed, partial,
blocked), whether a group names it or it follows `*`, and the deciding rule. The
`site.edge_check` block holds the CDN comparison. `crawler-facts.md` says what each
crawler does.

- **ai_search_blocked** (high when fully blocked, medium when partial).
  OAI-SearchBot, Claude-SearchBot or PerplexityBot blocked in robots.txt. Confirm the
  business wants AI visibility, then remove those groups.
- **ai_user_fetch_blocked** (medium). ChatGPT-User, Claude-User or Perplexity-User
  blocked. Some of these fetchers may ignore robots.txt (see the facts file), so the
  rule may matter less than an edge block.
- **search_engine_blocked** (high). Bingbot blocked, which also cuts Copilot answers.
- **ai_blocked_at_edge** (high). The homepage answered a browser with 200 and refused a
  request naming a search or assistant crawler (403, 429, 503, a challenge page, or a
  near-empty page). Confidence is "stand-in request". Where the server hints show a CDN,
  name the setting to check there.
- **ai_training_blocked**, **ai_training_blocked_at_edge** (info). GPTBot, ClaudeBot,
  Google-Extended, CCBot and other training crawlers opted out. A choice. Mention it once
  so the owner knows, and that it doesn't affect AI search.
- **llms_txt_missing** (info). Optional hygiene.

## Structured data and the business entity

Load `schema-and-entity.md` before recommending markup.

- **schema_parse_errors** (medium). JSON-LD that isn't valid JSON is ignored by every
  engine. Common causes: two objects pasted into one script tag, a trailing comma, an
  unclosed script tag.
- **schema_problems** (low). Missing @context or basic properties.
- **faq_markup_not_visible** (medium). FAQ markup whose questions aren't in the page's
  HTML text. Questions added by JavaScript would be missed; check the rendered page
  before reporting.
- **schema_dead_types** (info). HowTo markup.
- **org_schema_missing** (low). The homepage doesn't name the business in Organization
  or LocalBusiness markup.
- **entity_inconsistent** (low; medium for a local business when phone numbers differ).
  Several business names or phone numbers across pages. Call-tracking numbers can be
  intended; ask before calling it a mistake.
- **sameas_missing**, **self_serving_reviews**, **no_structured_data** (info).

## Speed

- **slow_server** (medium). Server response over 1.8 seconds on at least a fifth of the
  pages, measured from where the audit ran. One location, one moment: say so.
- **cwv_poor** (medium; high on the homepage or money pages). Real-visitor data at the
  75th percentile in Google's poor band for LCP, INP or CLS. The PageSpeed opportunities
  in `cwv.pages[].opportunities` name the biggest levers.
- **cwv_needs_improvement** (low). In the middle band.
- **lab_slow** (low). No field data; a simulated phone load was slow. Never write
  "visitors wait" from lab data alone.

## Security and international

- **mixed_content** (high when scripts, styles or frames load over http://, which
  browsers block; low for images and media).
- **hsts_missing** (low).
- **hreflang_issues** (medium). Missing x-default, a page not listing itself, or a
  language version that doesn't link back. Only on sites that use hreflang.
