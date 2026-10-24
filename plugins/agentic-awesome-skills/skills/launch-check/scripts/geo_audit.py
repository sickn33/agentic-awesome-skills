#!/usr/bin/env python3
# Adapted from agent-forge geo-seo-audit v1.0: AAS scoped redirects, inert local reads, safe emitted drafts and honest audit boundaries.
"""geo-seo-audit: crawl a site (or a built static folder) and score its SEO + AI-search (GEO) readiness.

Usage:
  python geo_audit.py https://example.com [--max-pages 50] [--delay 1.0]
  python geo_audit.py --local ./public --base-url https://example.com
  python geo_audit.py https://example.com --json > audit.json
  python geo_audit.py https://example.com --emit-fixes ./seo-fixes      # writes suggested files there only
  python geo_audit.py --local ./public --baseline before.json            # before/after score deltas
  python geo_audit.py https://example.com --report report.html          # one-page HTML client report
  python geo_audit.py --list-rules                                       # every rule, category, severity

Checks (10 categories, 69 rules): titles/descriptions (length, duplicates), canonical, hreflang, heading
outline, broken internal links, sitemap.xml vs crawl, robots.txt rules for AI crawlers (GPTBot, ClaudeBot,
Claude-SearchBot, OAI-SearchBot, PerplexityBot, Google-Extended, CCBot ...), llms.txt presence and validity,
JSON-LD schema.org validity per type, Open Graph, answerability signals for AI search, page weight and
render-blocking resources, image alt text, JavaScript-only content.

Network is the feature in URL mode and is polite and contained: robots.txt read first and applied to crawl requests using a limited parser, only http(s) on the audited host (no file://, ftp://, UNC, off-site redirects or sitemaps),
Crawl-delay honoured, 1 request per --delay seconds, --timeout per request, same-site only, --max-pages cap,
HTML bodies capped at 3 MB. --local needs no network at all.

Exit codes: 0 = no high-severity finding (and score >= --min-score), 1 = high finding or score gate failed,
2 = usage error or the site could not be audited.
"""

from __future__ import annotations

import argparse
import csv
from html import escape as html_escape
import gzip
from launch_check import sanitize_report
import io
import json
import math
import os
import posixpath
import re
import sys
import time
import zlib
from collections import Counter, defaultdict, deque
from html.parser import HTMLParser
from pathlib import Path
from urllib import error as urlerror
from urllib import parse as urlparse
from urllib import request as urlrequest
from xml.etree import ElementTree

VERSION = "1.0"
USER_AGENT = f"geo-seo-audit/{VERSION} (+https://github.com/Ces107/agent-forge; polite SEO audit)"
ROBOTS_TOKEN = "geo-seo-audit"
MAX_BODY = 3_000_000
MAX_SITEMAP_FILES = {"network": 25, "local": 500}
MAX_SITEMAP_URLS = 50_000
SEV_WEIGHT = {"high": 5, "medium": 3, "low": 1, "info": 0}
SEV_ORDER = {"high": 0, "medium": 1, "low": 2, "info": 3}
CATEGORIES = ["indexing", "links", "metadata", "structure", "social", "schema", "ai-access", "answers",
              "speed", "images"]
NON_HTML_EXT = {".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".svg", ".ico", ".css", ".js",
                ".mjs", ".json", ".xml", ".txt", ".zip", ".gz", ".tgz", ".mp4", ".webm", ".mp3", ".woff",
                ".woff2", ".ttf", ".eot", ".map", ".csv", ".xlsx", ".docx", ".pptx", ".exe", ".dmg", ".whl",
                ".rss", ".atom", ".md", ".rst", ".py", ".tar", ".bz2", ".xz", ".7z", ".iso", ".apk", ".msi"}

# (token, owner, purpose). purpose "answers" = fetches pages to cite them in AI/search answers;
# "training" = collects data for model training (blocking it is a business choice, reported as info).
AI_BOTS = [
    ("OAI-SearchBot", "OpenAI", "answers"), ("ChatGPT-User", "OpenAI", "answers"),
    ("Claude-SearchBot", "Anthropic", "answers"), ("Claude-User", "Anthropic", "answers"),
    ("PerplexityBot", "Perplexity", "answers"), ("Perplexity-User", "Perplexity", "answers"),
    ("DuckAssistBot", "DuckDuckGo", "answers"), ("Googlebot", "Google", "answers"),
    ("Bingbot", "Microsoft", "answers"), ("Applebot", "Apple", "answers"),
    ("GPTBot", "OpenAI", "training"), ("ClaudeBot", "Anthropic", "training"),
    ("anthropic-ai", "Anthropic", "training"), ("Google-Extended", "Google", "training"),
    ("Applebot-Extended", "Apple", "training"), ("CCBot", "Common Crawl", "training"),
    ("Meta-ExternalAgent", "Meta", "training"), ("Bytespider", "ByteDance", "training"),
    ("Amazonbot", "Amazon", "training"), ("cohere-ai", "Cohere", "training"),
]

# rule id -> (category, severity, short title, one-line fix)
RULES = {
    "robots-missing": ("indexing", "low", "No robots.txt", "Add /robots.txt with a Sitemap: line."),
    "robots-soft404": ("indexing", "medium", "robots.txt answers with an HTML page (soft 404)",
                       "Serve a plain-text robots.txt, or a real 404."),
    "robots-blocks-all": ("indexing", "high", "robots.txt disallows the whole site for every crawler",
                          "Remove 'Disallow: /' from the 'User-agent: *' group unless the site must stay hidden."),
    "robots-no-sitemap": ("indexing", "low", "robots.txt does not declare the sitemap",
                          "Add 'Sitemap: https://<host>/sitemap.xml' to robots.txt."),
    "sitemap-missing": ("indexing", "medium", "No sitemap.xml found",
                        "Publish a sitemap.xml (--emit-fixes writes one from the crawl)."),
    "sitemap-invalid": ("indexing", "high", "sitemap.xml is not valid sitemap XML",
                        "Serve well-formed <urlset>/<sitemapindex> XML."),
    "sitemap-broken": ("indexing", "high", "Sitemap lists URLs that return an error",
                       "Remove dead URLs from the sitemap or restore the pages."),
    "sitemap-noindex": ("indexing", "high", "Sitemap lists pages marked noindex",
                        "Drop noindex pages from the sitemap, or remove the noindex."),
    "sitemap-offsite": ("indexing", "high", "Sitemap lists URLs on another host or invalid <loc> values",
                        "List only absolute URLs of this site (a staging host in the sitemap is a classic mistake)."),
    "sitemap-redirect": ("indexing", "low", "Sitemap lists URLs that redirect",
                         "List the final URL, not the redirecting one."),
    "sitemap-non-canonical": ("indexing", "medium", "Sitemap lists URLs whose canonical points elsewhere",
                              "List only canonical URLs in the sitemap."),
    "not-in-sitemap": ("indexing", "low", "Indexable page missing from sitemap.xml",
                       "Add the page to the sitemap (or regenerate it)."),
    "canonical-missing": ("indexing", "low", "No rel=canonical", "Add <link rel=\"canonical\" href=\"<absolute URL>\">."),
    "canonical-multiple": ("indexing", "high", "Several different rel=canonical tags",
                           "Keep exactly one canonical per page."),
    "canonical-relative": ("indexing", "low", "rel=canonical is a relative URL", "Use an absolute canonical URL."),
    "canonical-offsite": ("indexing", "medium", "rel=canonical points to another host",
                          "Point the canonical to this site unless the page is a deliberate copy."),
    "canonical-broken": ("indexing", "high", "rel=canonical target returns an error",
                         "Point the canonical to a live 200 page."),
    "broken-link": ("links", "high", "Internal link returns an error", "Fix or remove the link."),
    "redirect-link": ("links", "low", "Internal link goes through a redirect", "Link straight to the final URL."),
    "orphan-page": ("links", "low", "Page is not linked from any crawled page",
                    "Link to it from a related page, or remove it from the sitemap."),
    "title-missing": ("metadata", "high", "Missing <title>", "Write a unique 30-60 character title."),
    "title-long": ("metadata", "low", "Title longer than 60 characters", "Shorten to 30-60 characters."),
    "title-short": ("metadata", "low", "Title shorter than 15 characters", "Describe the page in 30-60 characters."),
    "title-duplicate": ("metadata", "medium", "Same title on several pages", "Make every title unique."),
    "desc-missing": ("metadata", "medium", "Missing meta description",
                     "Add a 70-160 character description (--emit-fixes suggests one)."),
    "desc-length": ("metadata", "low", "Meta description outside 70-160 characters", "Rewrite to 70-160 characters."),
    "desc-duplicate": ("metadata", "medium", "Same meta description on several pages", "Make every description unique."),
    "viewport-missing": ("metadata", "medium", "No mobile viewport meta",
                         "Add <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">."),
    "lang-missing": ("metadata", "low", "No <html lang>", "Add lang=\"en\" (or the page language) to <html>."),
    "h1-missing": ("structure", "medium", "No <h1>", "Give every page one <h1> that names its topic."),
    "h1-multiple": ("structure", "low", "Several <h1>", "Keep one <h1>; demote the others to <h2>."),
    "heading-skip": ("structure", "low", "Heading levels skip (e.g. h2 -> h4)", "Nest headings without gaps."),
    "heading-empty": ("structure", "low", "Empty heading", "Put text in the heading or remove it."),
    "hreflang-invalid": ("structure", "medium", "Invalid hreflang code or relative hreflang URL",
                         "Use codes like en, en-GB, x-default and absolute URLs."),
    "hreflang-no-self": ("structure", "low", "hreflang set without a self reference",
                         "Include the page itself in its hreflang set."),
    "hreflang-no-return": ("structure", "medium", "hreflang target does not link back",
                           "Every alternate must list the others (return links)."),
    "hreflang-no-xdefault": ("structure", "low", "hreflang set without x-default", "Add an x-default alternate."),
    "og-missing": ("social", "medium", "Open Graph tags missing (og:title / og:description / og:image)",
                   "Add og:title, og:description and an absolute og:image."),
    "og-image-relative": ("social", "low", "og:image is not an absolute URL", "Use an absolute https:// image URL."),
    "twitter-card-missing": ("social", "low", "No twitter:card", "Add <meta name=\"twitter:card\" content=\"summary_large_image\">."),
    "schema-home-org": ("schema", "medium", "Home page has no Organization/WebSite JSON-LD",
                        "Add Organization + WebSite JSON-LD (--emit-fixes writes it)."),
    "jsonld-none": ("schema", "low", "No structured data (JSON-LD) on the page",
                    "Add JSON-LD for the page type (BreadcrumbList at least)."),
    "jsonld-parse": ("schema", "high", "JSON-LD block is not valid JSON", "Fix the JSON syntax."),
    "jsonld-context": ("schema", "medium", "JSON-LD @context is not schema.org", "Use \"@context\": \"https://schema.org\"."),
    "jsonld-required": ("schema", "high", "JSON-LD misses a required property for its type",
                        "Add the listed properties."),
    "jsonld-recommended": ("schema", "low", "JSON-LD misses recommended properties", "Add the listed properties."),
    "jsonld-format": ("schema", "medium", "JSON-LD value has a wrong format (date, URL, price, position)",
                      "Use ISO 8601 dates, absolute URLs, numeric prices, positions 1..n."),
    "jsonld-mismatch": ("schema", "medium", "JSON-LD describes content that is not visible on the page",
                        "Mark up only what the page shows (e.g. every FAQ question on the page)."),
    "ai-search-bot-blocked": ("ai-access", "high", "robots.txt blocks AI answer/search crawlers",
                              "Allow the answer crawlers (OAI-SearchBot, Claude-SearchBot, PerplexityBot ...); "
                              "see robots.txt in --emit-fixes."),
    "ai-search-bot-partial": ("ai-access", "low", "robots.txt keeps AI answer crawlers out of some paths",
                              "Fine for search results, carts or paywalls; check that no content you want cited is blocked."),
    "ai-training-bot-blocked": ("ai-access", "info", "robots.txt blocks AI training crawlers (a choice, not an error)",
                                "Keep it if you do not want your content used for model training."),
    "llms-missing": ("ai-access", "low", "No /llms.txt",
                     "Publish /llms.txt (--emit-fixes writes a draft from the crawl)."),
    "llms-soft404": ("ai-access", "medium", "/llms.txt answers with an HTML page (soft 404)",
                     "Serve llms.txt as text/plain or text/markdown."),
    "llms-invalid": ("ai-access", "medium", "/llms.txt does not follow the llms.txt format",
                     "Start with '# Name', a '> summary', then '## Section' lists of '- [title](url): note'."),
    "llms-dead-link": ("ai-access", "medium", "/llms.txt links to pages that return an error", "Fix or drop those links."),
    "js-only-content": ("ai-access", "high", "Page text is rendered by JavaScript (almost no text in the HTML)",
                        "Server-render or pre-render the content; most AI crawlers do not run JavaScript."),
    "question-headings": ("answers", "low", "Long page with no question-style headings",
                          "Phrase key sections as the questions people ask (\"How do I ...?\")."),
    "answer-not-concise": ("answers", "medium", "Question heading not followed by a short direct answer",
                           "Answer in the first 1-2 sentences (under 80 words) right after the question."),
    "no-lists-tables": ("answers", "low", "Long page with no list or table",
                        "Put steps, options and specs in lists or tables."),
    "date-missing": ("answers", "low", "No machine-readable published/updated date",
                     "Add <time datetime> or datePublished/dateModified in JSON-LD."),
    "author-missing": ("answers", "low", "No author signal",
                       "Name the author (meta author or JSON-LD author with a Person)."),
    "wall-of-text": ("answers", "low", "Paragraphs longer than 150 words",
                     "Split long paragraphs; one idea each."),
    "html-heavy": ("speed", "medium", "HTML document larger than 250 KB", "Trim inline data, scripts and markup."),
    "no-compression": ("speed", "medium", "HTML served without gzip/brotli compression",
                       "Enable gzip or brotli on the server/CDN."),
    "render-blocking-js": ("speed", "medium", "Synchronous <script src> in <head>", "Add defer (or async / type=module)."),
    "render-blocking-css": ("speed", "low", "More than 3 render-blocking stylesheets in <head>",
                            "Combine stylesheets or load non-critical CSS later."),
    "slow-response": ("speed", "low", "HTML took more than 1.5 s to arrive", "Cache the page or add a CDN."),
    "img-alt-missing": ("images", "medium", "Images without an alt attribute",
                        "Describe the image in alt (alt=\"\" for decorative images)."),
    "img-dimensions": ("images", "low", "Images without width/height (layout shift)",
                       "Set width and height attributes on <img>."),
}

# A heading is a question when it ends with "?" / starts with "¿", or starts with a question word followed by an
# auxiliary verb ("How do I ...", "What is ..."). "How to fix X" and "Do not over-tighten" are titles, not questions.
QUESTION_START = re.compile(
    r"^(how|what|why|when|where|who|which|whose)\s+(do|does|did|is|are|was|were|can|could|should|will|would|"
    r"has|have|happens|if|i|you|we)\b", re.I)
WORD = re.compile(r"[^\W_]+(?:['’-][^\W_]+)*", re.U)
ISO_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$")
HREFLANG = re.compile(r"^(x-default|[a-z]{2,3}(-[a-z]{4})?(-([a-z]{2}|\d{3}))?)$", re.I)
HEAD_TAGS = {"html", "head", "title", "meta", "link", "script", "style", "base", "noscript", "template"}
SKIP_TEXT = {"script", "style", "noscript", "template", "svg"}
BLOCK_BREAK = {"p", "div", "section", "article", "ul", "ol", "table", "h1", "h2", "h3", "h4", "h5", "h6",
               "blockquote", "pre", "main", "header", "footer", "aside", "nav", "form", "dl", "figure"}


# ----------------------------------------------------------------------------------------------- parsing
class PageParser(HTMLParser):
    """Collects everything the checks need in one pass over the HTML."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.title: str | None = None
        self.titles = 0
        self.html_lang: str | None = None
        self.metas: list[dict] = []
        self.link_tags: list[dict] = []
        self.anchors: list[str] = []
        self.headings: list[tuple[int, str]] = []
        self.images: list[dict] = []
        self.scripts: list[dict] = []
        self.jsonld: list[str] = []
        self.paragraphs: list[str] = []
        self.blocks: list[tuple] = []
        self.lists = 0
        self.tables = 0
        self.times: list[str] = []
        self.text: list[str] = []
        self.root_app = False
        self.noscript_js = False
        self.chrome_text: list[str] = []
        self._chrome = 0
        self._root_pending = False
        self._in_head = True
        self._skip: list[str] = []
        self._title_buf: list[str] | None = None
        self._heading: tuple[int, list[str]] | None = None
        self._para: list[str] | None = None
        self._script: dict | None = None

    # helpers
    def _close_para(self) -> None:
        if self._para is not None:
            text = " ".join("".join(self._para).split())
            if text:
                self.paragraphs.append(text)
                self.blocks.append(("p", text))
            self._para = None

    def handle_starttag(self, tag: str, attrs_list: list) -> None:
        attrs = {k.lower(): (v if v is not None else "") for k, v in attrs_list}
        self._root_pending = False
        if tag not in HEAD_TAGS:
            self._in_head = False
        if tag == "body":
            self._in_head = False
        if tag == "html" and attrs.get("lang"):
            self.html_lang = attrs["lang"].strip()
        elif tag == "title" and self._in_head and not self._skip:
            self.titles += 1
            self._title_buf = []
        elif tag == "meta":
            self.metas.append(attrs)
        elif tag == "link":
            attrs["_in_head"] = self._in_head
            self.link_tags.append(attrs)
        elif tag == "a" and "href" in attrs:
            self.anchors.append(attrs["href"])
        elif tag == "img":
            self.images.append(attrs)
        elif tag == "time" and attrs.get("datetime"):
            self.times.append(attrs["datetime"])
        elif tag == "script":
            self._script = {"src": attrs.get("src", ""), "type": attrs.get("type", "").lower(),
                            "async": "async" in attrs, "defer": "defer" in attrs, "in_head": self._in_head,
                            "body": []}
        elif tag in ("div", "main") and attrs.get("id", "").lower() in {"root", "app", "__next", "__nuxt", "svelte"}:
            self._root_pending = True  # an app mount point; it counts only if it stays empty
        if tag in ("ul", "ol", "dl"):
            self.lists += 1
            self.blocks.append(("list",))
        elif tag == "table":
            self.tables += 1
            self.blocks.append(("table",))
        if tag in BLOCK_BREAK:
            self._close_para()
        if tag in SKIP_TEXT:
            self._skip.append(tag)
        if tag in ("header", "nav", "footer"):
            self._chrome += 1
        if re.fullmatch(r"h[1-6]", tag) and not self._skip:
            self._heading = (int(tag[1]), [])
        elif tag == "p" and not self._skip:
            self._para = []
        elif tag == "li":
            self.blocks.append(("li",))
        elif tag == "br" and self._para is not None:
            self._para.append(" ")

    def handle_startendtag(self, tag: str, attrs_list: list) -> None:
        self.handle_starttag(tag, attrs_list)
        if tag in SKIP_TEXT and self._skip and self._skip[-1] == tag:
            self._skip.pop()

    def handle_endtag(self, tag: str) -> None:
        if tag in ("header", "nav", "footer") and self._chrome:
            self._chrome -= 1
        if self._root_pending and tag in ("div", "main"):
            self.root_app = True
        self._root_pending = False
        if tag == "title" and self._title_buf is not None:
            if self.title is None:
                self.title = " ".join("".join(self._title_buf).split())
            self._title_buf = None
        elif tag == "script" and self._script is not None:
            body = "".join(self._script.pop("body"))
            self._script["inline_len"] = len(body)
            if self._script["type"] == "application/ld+json":
                self.jsonld.append(body)
            self.scripts.append(self._script)
            self._script = None
        if self._skip and tag == self._skip[-1]:
            self._skip.pop()
        if self._heading and tag == f"h{self._heading[0]}":
            text = " ".join("".join(self._heading[1]).split())
            self.headings.append((self._heading[0], text))
            self.blocks.append(("h", self._heading[0], text))
            self._heading = None
        if tag == "p" or tag in BLOCK_BREAK:
            self._close_para()

    def handle_data(self, data: str) -> None:
        if self._script is not None:
            self._script["body"].append(data)
            return
        if data.strip():
            self._root_pending = False
        if self._title_buf is not None:
            self._title_buf.append(data)
            return
        if self._skip:
            if self._skip[-1] == "noscript" and "javascript" in data.lower():
                self.noscript_js = True
            return
        self.text.append(data)
        if self._chrome:
            self.chrome_text.append(data)
        if self._heading is not None:
            self._heading[1].append(data)
        if self._para is not None:
            self._para.append(data)

    def close(self) -> None:
        super().close()
        self._close_para()


def parse_page(html: str) -> PageParser:
    parser = PageParser()
    try:
        parser.feed(html)
        parser.close()
    except Exception:  # malformed markup: keep what was collected
        pass
    return parser


def meta_content(parser: PageParser, key: str) -> str | None:
    key = key.lower()
    for meta in parser.metas:
        if meta.get("name", "").lower() == key or meta.get("property", "").lower() == key:
            return meta.get("content", "")
    return None


def words(text: str) -> int:
    return len(WORD.findall(text))


# ------------------------------------------------------------------------------------------------ robots
class Robots:
    """robots.txt subset: groups, Allow/Disallow, * and $ wildcards, longest match wins; not full RFC conformance."""

    def __init__(self, text: str = "") -> None:
        self.groups: list[tuple[list[str], list[tuple[str, str]]]] = []
        self.sitemaps: list[str] = []
        self.crawl_delay: dict[str, float] = {}
        agents: list[str] = []
        rules: list[tuple[str, str]] = []
        last = None
        for raw in text.lstrip("\ufeff").splitlines():
            line = raw.split("#", 1)[0].strip()
            if ":" not in line:
                continue
            key, value = (part.strip() for part in line.split(":", 1))
            key = key.lower()
            if key in ("user-agent", "useragent"):
                if last == "rule":
                    self.groups.append((agents, rules))
                    agents, rules = [], []
                agents.append(value.lower())
                last = "agent"
            elif key in ("allow", "disallow") and agents:
                rules.append((key, value))
                last = "rule"
            elif key == "crawl-delay" and agents:
                try:
                    for agent in agents:
                        self.crawl_delay[agent] = float(value)
                except ValueError:
                    pass
                last = "rule"
            elif key == "sitemap" and value:
                self.sitemaps.append(value)
        if agents:
            self.groups.append((agents, rules))

    def rules_for(self, token: str) -> list[tuple[str, str]] | None:
        token = token.lower()
        specific = [rules for agents, rules in self.groups if token in agents]
        if specific:
            return [rule for rules in specific for rule in rules]
        star = [rules for agents, rules in self.groups if "*" in agents]
        if star:
            return [rule for rules in star for rule in rules]
        return None

    def has_specific_group(self, token: str) -> bool:
        return any(token.lower() in agents for agents, _ in self.groups)

    @staticmethod
    def _match(pattern: str, path: str) -> bool:
        if not pattern:
            return False
        anchored = pattern.endswith("$")
        body = pattern[:-1] if anchored else pattern
        regex = "".join(".*" if ch == "*" else re.escape(ch) for ch in body)
        return re.match(regex + ("$" if anchored else ""), path) is not None

    def allowed(self, token: str, url_or_path: str) -> bool:
        parts = urlparse.urlsplit(url_or_path)
        path = (parts.path or "/") + (f"?{parts.query}" if parts.query else "")
        if path == "/robots.txt":
            return True
        rules = self.rules_for(token)
        if not rules:
            return True
        best_len, verdict = -1, True
        for kind, pattern in rules:
            if not pattern:
                continue
            for candidate in {pattern, urlparse.unquote(pattern)}:
                if self._match(candidate, path) or self._match(candidate, urlparse.unquote(path)):
                    length = len(pattern)
                    if length > best_len or (length == best_len and kind == "allow"):
                        best_len, verdict = length, kind == "allow"
        return verdict

    def delay_for(self, token: str) -> float:
        return self.crawl_delay.get(token.lower(), self.crawl_delay.get("*", 0.0))


# --------------------------------------------------------------------------------------------- fetching
class Response:
    def __init__(self, url: str, status: int, headers: dict | None = None, body: bytes = b"",
                 final_url: str | None = None, elapsed: float = 0.0, error: str = "") -> None:
        self.url = url
        self.status = status
        self.headers = {k.lower(): v for k, v in (headers or {}).items()}
        self.body = body
        self.final_url = final_url or url
        self.elapsed = elapsed
        self.error = error
        self.raw_size = len(body)

    @property
    def ctype(self) -> str:
        return self.headers.get("content-type", "").lower()

    @property
    def is_html(self) -> bool:
        if "html" in self.ctype:
            return True
        return not self.ctype and self.body.lstrip()[:15].lower().startswith((b"<!doctype html", b"<html"))

    def text(self) -> str:
        match = re.search(r"charset=[\"']?([\w-]+)", self.ctype)
        if not match:  # no charset in the header: sniff <meta charset> / http-equiv in the first 2 KB
            match = re.search(rb"<meta[^>]+charset=[\"']?([\w-]+)", self.body[:2048], re.I)
            encoding = match.group(1).decode("ascii", "ignore") if match else "utf-8"
        else:
            encoding = match.group(1)
        try:
            text = self.body.decode(encoding, errors="replace")
        except LookupError:
            text = self.body.decode("utf-8", errors="replace")
        return text.lstrip("\ufeff")

    @property
    def looks_like_markup(self) -> bool:
        head = self.body[:1024]
        return b"\x00" not in head and b"<" in head


def host_of(url: str) -> str:
    """host[:port] after normalization: another port on the same machine is another site."""
    return urlparse.urlsplit(normalize(url)).netloc if url else ""


class HttpFetcher:
    """http(s) only, one host only (after the start page), redirects followed by hand and checked."""

    mode = "network"

    def __init__(self, user_agent: str, timeout: float, delay: float) -> None:
        self.user_agent = user_agent
        self.timeout = timeout
        self.delay = delay
        self.requests = 0
        self.allowed_hosts: set | None = None  # None until the start page is known; then only these hosts
        self.refused: list[str] = []
        self._last = 0.0
        # Only the HTTP and HTTPS handlers: no file://, ftp://, data: or automatic redirects (SSRF guard).
        self._opener = urlrequest.OpenerDirector()
        self._opener.add_handler(urlrequest.HTTPHandler())
        self._opener.add_handler(urlrequest.HTTPSHandler())

    def permitted(self, url: str) -> bool:
        parts = urlparse.urlsplit(url)
        if parts.scheme not in ("http", "https") or not parts.hostname or parts.username or parts.password or "\\" in url:
            return False
        return self.allowed_hosts is None or host_of(url) in self.allowed_hosts

    def _wait(self) -> None:
        pause = self._last + self.delay - time.monotonic()
        if pause > 0:
            time.sleep(pause)
        self._last = time.monotonic()

    def get(self, url: str, method: str = "GET", max_redirects: int = 5) -> Response:
        current = url
        for _ in range(max_redirects + 1):
            if not self.permitted(current):
                if len(self.refused) < 50:
                    self.refused.append(current[:200])
                return Response(url, 0, error="not fetched: outside the audited site or not http(s)",
                                final_url=current)
            resp = self._once(current, method)
            if resp.status in (301, 302, 303, 307, 308) and resp.headers.get("location"):
                target = normalize(urlparse.urljoin(current, resp.headers["location"]))
                if not self.permitted(target):  # off-site redirect: report it, do not follow
                    resp.url, resp.final_url, resp.error = url, target, "redirect leaves the audited site"
                    return resp
                current = target
                continue
            resp.url = url
            resp.final_url = current
            return resp
        return Response(url, 0, error="too many redirects", final_url=current)

    def _once(self, url: str, method: str) -> Response:
        if urlparse.urlsplit(url).scheme not in ("http", "https"):
            return Response(url, 0, error="not http(s)")
        self._wait()
        self.requests += 1
        req = urlrequest.Request(url, method=method, headers={
            "User-Agent": self.user_agent, "Accept-Encoding": "gzip, deflate",
            "Accept": "text/html,application/xhtml+xml,text/plain,application/xml;q=0.9,*/*;q=0.5"})
        started = time.monotonic()
        try:
            with self._opener.open(req, timeout=self.timeout) as handle:  # nosec B310 - http(s) handlers only
                raw = handle.read(MAX_BODY + 1) if method == "GET" else b""
                status, headers = handle.status, dict(handle.headers.items())
        except urlerror.HTTPError as exc:
            try:
                raw = exc.read(MAX_BODY + 1) if method == "GET" else b""
            except Exception:
                raw = b""
            status, headers = exc.code, dict(exc.headers.items()) if exc.headers else {}
        except Exception as exc:  # DNS, TLS, timeout, connection reset
            return Response(url, 0, error=f"{type(exc).__name__}: {exc}"[:160], elapsed=time.monotonic() - started)
        elapsed = time.monotonic() - started
        resp = Response(url, status, headers, b"", elapsed=elapsed)
        resp.raw_size = len(raw)
        resp.body = decode_body(raw[:MAX_BODY], resp.headers.get("content-encoding", ""))
        return resp


def decode_body(raw: bytes, encoding: str) -> bytes:
    """Decompress gzip/deflate with the output capped at MAX_BODY (no decompression bombs)."""
    encoding = encoding.lower().strip()
    try:
        if encoding == "gzip" or raw[:2] == b"\x1f\x8b":
            return gzip.GzipFile(fileobj=io.BytesIO(raw)).read(MAX_BODY)
        if encoding == "deflate":
            try:
                return zlib.decompressobj().decompress(raw, MAX_BODY)
            except zlib.error:
                return zlib.decompressobj(-zlib.MAX_WBITS).decompress(raw, MAX_BODY)
    except Exception:
        return raw
    return raw


class LocalFetcher:
    """Serves a built static site folder as if it were the live host (pretty URLs, index.html, 404)."""

    mode = "local"
    TYPES = {".html": "text/html; charset=utf-8", ".htm": "text/html; charset=utf-8", ".txt": "text/plain",
             ".xml": "application/xml", ".md": "text/markdown", ".json": "application/json"}

    def __init__(self, root: Path, base: str) -> None:
        self.root = root.resolve()
        self.base = base
        self.requests = 0

    def path_for(self, url: str) -> Path | None:
        parts = urlparse.urlsplit(url)
        base = urlparse.urlsplit(self.base)
        if parts.netloc.lower() != base.netloc.lower():
            return None
        rel = urlparse.unquote(parts.path)
        prefix = base.path.rstrip("/")
        if prefix and rel.startswith(prefix):
            rel = rel[len(prefix):]
        rel = rel.lstrip("/")
        candidates = [rel] if rel else []
        if not rel or rel.endswith("/"):
            candidates = [rel + "index.html", rel + "index.htm"]
        else:
            candidates += [rel + ".html", rel + "/index.html"]
        for candidate in candidates:
            target = (self.root / candidate).resolve()
            try:
                target.relative_to(self.root)
            except ValueError:
                return None
            if target.is_file():
                return target
        return None

    def get(self, url: str, method: str = "GET") -> Response:
        self.requests += 1
        target = self.path_for(url)
        if target is None:
            return Response(url, 404, {"content-type": "text/plain"}, b"not found")
        with target.open("rb") as handle:
            body = handle.read(MAX_BODY)
        ctype = self.TYPES.get(target.suffix.lower(), "application/octet-stream")
        final = url
        parts = urlparse.urlsplit(url)
        if not parts.path.endswith("/") and target.name.lower() in ("index.html", "index.htm") and                 not parts.path.lower().endswith(("/index.html", "/index.htm")):
            final = urlparse.urlunsplit((parts.scheme, parts.netloc, parts.path + "/", parts.query, ""))
        return Response(url, 200, {"content-type": ctype, "content-encoding": "local"}, body, final_url=final)


# ------------------------------------------------------------------------------------------------- utils
PATH_SAFE = "/:@!$&'()*+,;=-._~"
QUERY_SAFE = "/:@!$&'()*+,;=-._~?%"


def normalize(url: str) -> str:
    """Canonical form: lower-case scheme/host, IDNA host, no default port, no fragment, dot segments resolved,
    path percent-encoded once (a raw non-ASCII path and its percent-escaped form are the same page), spaces and non-ASCII escaped."""
    parts = urlparse.urlsplit(url.strip())
    scheme = parts.scheme.lower()
    netloc = parts.netloc.lower()
    if netloc and not netloc.isascii():
        try:
            host, sep, port = netloc.partition(":")
            netloc = host.encode("idna").decode("ascii") + sep + port
        except UnicodeError:
            pass
    if (scheme == "http" and netloc.endswith(":80")) or (scheme == "https" and netloc.endswith(":443")):
        netloc = netloc.rsplit(":", 1)[0]
    path = parts.path or "/"
    path = re.sub(r"/{2,}", "/", path)
    if "/." in path:
        trailing = path.endswith("/")
        path = posixpath.normpath(path) + ("/" if trailing and path != "/" else "")
        if not path.startswith("/"):
            path = "/" + path
    path = urlparse.quote(urlparse.unquote(path), safe=PATH_SAFE)
    query = urlparse.quote(parts.query, safe=QUERY_SAFE)
    return urlparse.urlunsplit((scheme, netloc, path, query, ""))


def is_html_like(url: str) -> bool:
    ext = posixpath.splitext(urlparse.urlsplit(url).path)[1].lower()
    return ext not in NON_HTML_EXT


def short(url: str, base: str) -> str:
    parts, root = urlparse.urlsplit(url), urlparse.urlsplit(base)
    if parts.netloc == root.netloc:
        return (parts.path or "/") + (f"?{parts.query}" if parts.query else "")
    return url


def slug(url: str) -> str:
    path = urlparse.unquote(urlparse.urlsplit(url).path).strip("/")
    path = re.sub(r"\.html?$", "", path)
    return re.sub(r"[^\w]+", "-", path).strip("-_").lower()[:80] or "home"


class Page:
    def __init__(self, url: str, resp: Response, depth: int) -> None:
        self.url = url
        self.resp = resp
        self.depth = depth
        self.final = normalize(resp.final_url)
        self.status = resp.status
        self.parser: PageParser | None = None
        self.links: list[str] = []
        self.noindex = False
        self.canonicals: list[str] = []
        self.stub = False

    @property
    def ok_html(self) -> bool:
        return self.status == 200 and self.parser is not None

    @property
    def indexable(self) -> bool:
        return self.ok_html and not self.noindex


# ------------------------------------------------------------------------------------------------- audit
class Audit:
    def __init__(self, fetcher, start: str, max_pages: int, link_budget: int, local_root: Path | None) -> None:
        self.fetcher = fetcher
        self.start = normalize(start)
        self.max_pages = max_pages
        self.link_budget = link_budget
        self.local_root = local_root
        self.pages: dict[str, Page] = {}
        self.extra_status: dict[str, Response] = {}
        self.inlinks: dict[str, set] = defaultdict(set)
        self.robots = Robots("")
        self.robots_resp: Response | None = None
        self.sitemap_urls: list[str] = []
        self.sitemap_info: dict = {"found": False, "files": [], "errors": [], "truncated": False,
                                   "bad_locs": [], "offsite_files": []}
        self.llms: dict = {"found": False}
        self.robots_skipped: list[str] = []
        self.hit_limit = False
        self.results: dict[str, dict] = {}
        self.notes: list[str] = []
        self.ai_bots: dict[str, dict] = {}
        self.elapsed = 0.0
        self.scope = ""

    # -- scoring primitives
    def result(self, rule: str, passed: bool, url: str | None = None, detail: str | None = None) -> None:
        entry = self.results.setdefault(rule, {"pass": 0, "fail": 0, "urls": [], "details": []})
        if passed:
            entry["pass"] += 1
            return
        entry["fail"] += 1
        if url and url not in entry["urls"]:
            entry["urls"].append(url)
        if detail and len(entry["details"]) < 25 and detail not in entry["details"]:
            entry["details"].append(detail)

    # -- crawl
    def in_scope(self, url: str) -> bool:
        return url.startswith(self.scope) and urlparse.urlsplit(url).scheme in ("http", "https")

    def status_of(self, url: str) -> int | None:
        url = normalize(url)
        if url in self.pages:
            return self.pages[url].status
        if url in self.extra_status:
            return self.extra_status[url].status
        return None

    def may_fetch(self, url: str) -> bool:
        """robots.txt applies to every request the crawler makes (network mode)."""
        return self.fetcher.mode != "network" or self.robots.allowed(ROBOTS_TOKEN, url)

    def _robots_gate(self) -> None:
        self.load_robots()
        if self.robots_resp is not None and (self.robots_resp.status == 0 or self.robots_resp.status >= 500):
            raise SystemExit("error: robots.txt is unreachable (5xx); RFC 9309 says a crawler must stop. "
                             "Retry later or audit a local build with --local.")
        if not self.may_fetch(self.start):
            raise SystemExit(f"error: robots.txt disallows {ROBOTS_TOKEN} on {self.start}; not crawling. "
                             "Audit a local build with --local instead.")

    def run(self) -> None:
        started = time.monotonic()
        given = urlparse.urlsplit(self.start)
        self.origin = urlparse.urlunsplit((given.scheme, given.netloc, "/", "", ""))
        if self.fetcher.mode == "network":
            self.fetcher.allowed_hosts = {host_of(self.start)}
            self._robots_gate()  # robots.txt before anything else
        first = self.fetcher.get(self.start)
        if first.status == 0:
            raise SystemExit(f"error: could not fetch {self.start}: {first.error}")
        final = normalize(first.final_url)
        if self.fetcher.mode == "network":
            self.fetcher.allowed_hosts = {host_of(self.start), host_of(final)} - {""}
        self.start = final
        root = urlparse.urlsplit(final)
        start_path = root.path if root.path.endswith("/") else posixpath.dirname(root.path) + "/"
        self.scope = urlparse.urlunsplit((root.scheme, root.netloc, start_path, "", ""))
        new_origin = urlparse.urlunsplit((root.scheme, root.netloc, "/", "", ""))
        if self.fetcher.mode != "network":
            self.origin = new_origin
            self.load_robots()
        elif new_origin != self.origin:  # the start page redirected to another host: its robots.txt rules
            self.origin = new_origin
            self.fetcher.allowed_hosts = {host_of(final)}
            self._robots_gate()
        if self.fetcher.mode == "network":
            delay = self.robots.delay_for(ROBOTS_TOKEN)
            if delay > self.fetcher.delay:
                if not math.isfinite(delay) or delay > 30:
                    raise SystemExit("error: robots crawl delay exceeds the bounded audit budget; use --local or retry with a suitable schedule")
                self.fetcher.delay = delay
                self.notes.append(f"robots.txt Crawl-delay {delay:g}s honoured")
        self.load_sitemaps()
        self.crawl(first)
        self.check_extra_links()
        self.load_llms()
        self.elapsed = time.monotonic() - started

    def load_robots(self) -> None:
        url = urlparse.urljoin(self.origin, "/robots.txt")
        resp = self.fetcher.get(url)
        self.robots_resp = resp
        if resp.status == 200 and not resp.is_html:
            self.robots = Robots(resp.text())

    def rehost(self, loc: str) -> str:
        """--local without a known public URL: compare sitemap URLs by path, whatever host they name."""
        if self.fetcher.mode == "local" and getattr(self, "local_base_guessed", False) and re.match(r"^https?://", loc):
            parts = urlparse.urlsplit(loc)
            return urlparse.urljoin(self.origin, parts.path + (f"?{parts.query}" if parts.query else ""))
        return loc

    def same_site(self, url: str) -> bool:
        parts = urlparse.urlsplit(url)
        return parts.scheme in ("http", "https") and host_of(url) == host_of(self.origin)

    def load_sitemaps(self) -> None:
        info = self.sitemap_info
        declared = [normalize(urlparse.urljoin(self.origin, self.rehost(s))) for s in self.robots.sitemaps]
        candidates = []
        for url in declared:
            if self.same_site(url):
                candidates.append(url)
            else:  # never fetched: another host, or file:// / ftp:// / UNC
                info["offsite_files"].append(url[:200])
        if not declared:
            for guess in (urlparse.urljoin(self.scope, "sitemap.xml"), urlparse.urljoin(self.origin, "/sitemap.xml")):
                guess = normalize(guess)
                if guess not in candidates and self.may_fetch(guess):  # a guessed URL obeys robots.txt
                    candidates.append(guess)
        cap = MAX_SITEMAP_FILES[self.fetcher.mode]
        queue, seen, files = deque(candidates), set(), 0
        while queue:
            url = queue.popleft()
            if url in seen:
                continue
            if files >= cap:
                info["truncated"] = True
                self.notes.append(f"read {files} sitemap files (cap {cap}); sitemap-based checks limited")
                break
            seen.add(url)
            if not self.may_fetch(url):
                self.robots_skipped.append(url)
                continue
            resp = self.fetcher.get(url)
            files += 1
            if resp.status != 200:
                continue
            self.sitemap_info["found"] = True
            self.sitemap_info["files"].append(url)
            if resp.is_html:
                self.sitemap_info["errors"].append(f"{url} answers with HTML")
                continue
            try:
                tree = ElementTree.fromstring(resp.body)
            except ElementTree.ParseError as exc:
                self.sitemap_info["errors"].append(f"{url}: {exc}")
                continue
            tag = tree.tag.split("}")[-1]
            locs = [self.rehost(el.text.strip()) for el in tree.iter() if el.tag.split("}")[-1] == "loc" and el.text]
            if tag == "sitemapindex":
                for loc in locs:
                    if self.same_site(loc):
                        queue.append(normalize(loc))
                    else:
                        info["offsite_files"].append(loc[:200])
            elif tag == "urlset":
                for loc in locs:
                    if re.match(r"^https?://", loc) and self.same_site(loc):
                        self.sitemap_urls.append(normalize(loc))
                    else:
                        info["bad_locs"].append(loc[:120])
                if len(self.sitemap_urls) > MAX_SITEMAP_URLS:
                    info["truncated"] = True
                    break
            else:
                self.sitemap_info["errors"].append(f"{url}: root element <{tag}> is not urlset/sitemapindex")
        self.sitemap_urls = list(dict.fromkeys(self.sitemap_urls))

    def crawl(self, first: Response) -> None:
        queue: deque = deque([(self.start, 0)])
        queued = {self.start}
        sitemap_added = False
        prefetched = {self.start: first}
        while True:
            if not queue and not sitemap_added:
                sitemap_added = True
                for url in self.sitemap_urls:
                    if url not in queued and self.in_scope(url) and is_html_like(url):
                        queued.add(url)
                        queue.append((url, 99))
            if not queue:
                break
            if sum(1 for p in self.pages.values() if not p.stub) >= self.max_pages:
                self.hit_limit = True
                break
            url, depth = queue.popleft()
            if not self.may_fetch(url):
                self.robots_skipped.append(url)
                continue
            resp = prefetched.pop(url, None) or self.fetcher.get(url)
            final = normalize(resp.final_url)
            if final != url:
                # keep a redirect stub for the requested URL; analyse the page under its final URL
                stub = Page(url, Response(url, 301, final_url=final), depth)
                stub.stub = True
                self.pages[url] = stub
                queued.add(final)
                if final in self.pages or not self.in_scope(final):
                    continue
                url = final
            page = Page(url, resp, depth)
            self.pages[url] = page
            if resp.status != 200 or not resp.is_html:
                continue
            if not resp.looks_like_markup:
                self.notes.append(f"skipped {short(url, self.origin)}: served as HTML but is not markup")
                continue
            self.analyse(page)
            for link in page.links:
                self.inlinks[link].add(url)
                if link not in queued and self.in_scope(link) and is_html_like(link):
                    queued.add(link)
                    queue.append((link, depth + 1))
        if queue:
            self.hit_limit = True

    def analyse(self, page: Page) -> None:
        parser = parse_page(page.resp.text())
        page.parser = parser
        base = page.final
        for tag in parser.link_tags:
            if tag.get("rel", "").lower() == "base":
                pass
        base_href = next((m.get("href") for m in [] if m), None)
        _ = base_href
        robots_meta = " ".join(
            (meta.get("content", "") or "").lower() for meta in parser.metas
            if meta.get("name", "").lower() in ("robots", "googlebot"))
        header = page.resp.headers.get("x-robots-tag", "").lower()
        page.noindex = "noindex" in robots_meta or "noindex" in header or "none" in robots_meta.split(",")
        page.canonicals = [tag.get("href", "").strip() for tag in parser.link_tags
                           if "canonical" in tag.get("rel", "").lower().split()]
        for href in parser.anchors:
            href = href.strip()
            if not href or href.startswith(("#", "mailto:", "tel:", "javascript:", "data:")):
                continue
            absolute = normalize(urlparse.urljoin(base, href))
            if urlparse.urlsplit(absolute).scheme not in ("http", "https"):
                continue
            if absolute not in page.links:
                page.links.append(absolute)

    def check_extra_links(self) -> None:
        targets = [url for url in self.inlinks if url not in self.pages and self.in_scope(url)]
        targets += [normalize(urlparse.urljoin(p.final, c)) for p in self.pages.values() for c in p.canonicals
                    if c and self.in_scope(normalize(urlparse.urljoin(p.final, c)))]
        budget = self.link_budget
        for url in dict.fromkeys(targets):
            if url in self.pages or url in self.extra_status:
                continue
            if budget <= 0:
                break
            if not self.may_fetch(url):
                continue
            resp = self.fetcher.get(url, method="HEAD")
            if resp.status in (405, 501) or resp.status == 0:
                resp = self.fetcher.get(url)
            self.extra_status[url] = resp
            budget -= 1

    def load_llms(self) -> None:
        url = urlparse.urljoin(self.scope, "llms.txt")
        if not self.may_fetch(url):
            self.llms = {"url": url, "found": False, "status": None, "html": False, "text": "",
                         "skipped": "robots.txt disallows it"}
            return
        resp = self.fetcher.get(url)
        if resp.status != 200 and self.scope != self.origin and self.may_fetch(urlparse.urljoin(self.origin, "/llms.txt")):
            url = urlparse.urljoin(self.origin, "/llms.txt")
            resp = self.fetcher.get(url)
        self.llms = {"url": url, "found": resp.status == 200, "status": resp.status, "html": resp.is_html,
                     "text": resp.text() if resp.status == 200 and not resp.is_html else ""}
        if self.llms["text"]:
            self.llms.update(parse_llms(self.llms["text"], url))
            budget = 10
            dead = []
            for link in self.llms.get("links", []):
                link = normalize(link)
                if not self.in_scope(link):
                    continue
                status = self.status_of(link)
                if status is None and budget > 0 and self.may_fetch(link):
                    resp_link = self.fetcher.get(link, method="HEAD")
                    if resp_link.status in (405, 501, 0):
                        resp_link = self.fetcher.get(link)
                    self.extra_status[link] = resp_link
                    status = resp_link.status
                    budget -= 1
                if status is not None and (status >= 400 or status == 0):
                    dead.append(f"{short(link, self.origin)} ({status})")
            self.llms["dead"] = dead


# --------------------------------------------------------------------------------------------- llms.txt
def parse_llms(text: str, url: str) -> dict:
    lines = [line.rstrip() for line in text.splitlines()]
    nonblank = [line for line in lines if line.strip()]
    problems: list[str] = []
    links: list[str] = []
    h1 = [line for line in nonblank if re.match(r"^# \S", line)]
    if not nonblank or not re.match(r"^# \S", nonblank[0]):
        problems.append("first line must be '# <project name>'")
    if len(h1) > 1:
        problems.append(f"{len(h1)} H1 headings (want exactly one)")
    has_summary = any(line.startswith(">") for line in nonblank[1:4])
    sections = [line[3:].strip() for line in nonblank if line.startswith("## ")]
    in_section = False
    bad_items = 0
    for line in lines:
        if line.startswith("## "):
            in_section = True
            continue
        if in_section and re.match(r"^\s*[-*+] ", line):
            match = re.match(r"^\s*[-*+] \[([^\]]+)\]\(([^)\s]+)\)(?::\s*(.*))?\s*$", line)
            if not match:
                bad_items += 1
            else:
                links.append(urlparse.urljoin(url, match.group(2)))
    if bad_items:
        problems.append(f"{bad_items} list item(s) not in '- [title](url): note' form")
    if not links:
        problems.append("no '- [title](url)' links under '## ' sections")
    if len(text.encode("utf-8")) > 200_000:
        problems.append("larger than 200 KB (keep llms.txt short; put the long version in llms-full.txt)")
    return {"problems": problems, "links": links, "sections": sections, "summary": has_summary}


# ----------------------------------------------------------------------------------------------- JSON-LD
ARTICLE_TYPES = {"article", "newsarticle", "blogposting", "techarticle", "report", "scholarlyarticle"}
ORG_TYPES = {"organization", "corporation", "ngo", "educationalorganization", "governmentorganization",
             "onlinebusiness", "onlinestore"}
LOCAL_TYPES = {"localbusiness", "store", "restaurant", "bikestore", "autorepair", "dentist", "medicalclinic",
               "professionalservice", "legalservice", "homeandconstructionbusiness", "foodestablishment",
               "lodgingbusiness", "healthandbeautybusiness", "sportsactivitylocation"}
SPEC = {
    "organization": {"required": ["name"], "recommended": ["url", "logo", "sameAs"]},
    "localbusiness": {"required": ["name", "address"], "recommended": ["telephone", "url", "openingHoursSpecification", "geo"]},
    "website": {"required": ["name", "url"], "recommended": []},
    "product": {"required": ["name"], "one_of": ["offers", "review", "aggregateRating"],
                "recommended": ["image", "description", "brand"]},
    "offer": {"required": ["priceCurrency"], "one_of": ["price", "priceSpecification"], "recommended": ["availability"]},
    "article": {"required": ["headline"], "recommended": ["author", "datePublished", "dateModified", "image"]},
    "faqpage": {"required": ["mainEntity"], "recommended": []},
    "question": {"required": ["name", "acceptedAnswer"], "recommended": []},
    "breadcrumblist": {"required": ["itemListElement"], "recommended": []},
    "softwareapplication": {"required": ["name"], "recommended": ["offers", "applicationCategory", "operatingSystem"]},
    "person": {"required": ["name"], "recommended": []},
    "event": {"required": ["name", "startDate", "location"], "recommended": ["endDate", "offers", "image"]},
    "videoobject": {"required": ["name", "thumbnailUrl", "uploadDate"], "recommended": ["description", "duration"]},
    "recipe": {"required": ["name", "image"], "recommended": ["recipeIngredient", "recipeInstructions", "author"]},
}
DATE_KEYS = {"datePublished", "dateModified", "uploadDate", "startDate", "endDate", "dateCreated", "priceValidUntil"}
URL_KEYS = {"url", "logo", "item", "image", "thumbnailUrl", "sameAs", "contentUrl"}


def spec_key(type_name: str) -> str | None:
    name = type_name.split("/")[-1].split(":")[-1].lower()
    if name in ARTICLE_TYPES:
        return "article"
    if name in LOCAL_TYPES:
        return "localbusiness"
    if name in ORG_TYPES:
        return "organization"
    if name == "webapplication" or name == "mobileapplication":
        return "softwareapplication"
    return name if name in SPEC else None


def node_types(node: dict) -> list[str]:
    value = node.get("@type", [])
    return [value] if isinstance(value, str) else [v for v in value if isinstance(v, str)]


def iter_nodes(value):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from iter_nodes(child)
    elif isinstance(value, list):
        for child in value:
            yield from iter_nodes(child)


def empty(value) -> bool:
    return value is None or value == "" or value == [] or value == {}


def check_jsonld(blocks: list[str], visible: str) -> dict:
    """Validate JSON-LD blocks. Returns types found and problems per rule."""
    out = {"types": [], "parse": [], "context": [], "required": [], "recommended": [], "format": [], "mismatch": []}
    visible_norm = fold(visible)
    for raw in blocks:
        raw = raw.strip().removeprefix("<!--").removesuffix("-->").strip()
        if not raw:
            continue
        try:
            data = json.loads(raw)
        except json.JSONDecodeError as exc:
            out["parse"].append(f"line {exc.lineno}: {exc.msg}")
            continue
        tops = data if isinstance(data, list) else [data]
        for top in tops:
            if not isinstance(top, dict):
                continue
            context = top.get("@context", "")
            context_text = json.dumps(context) if not isinstance(context, str) else context
            if "schema.org" not in context_text:
                out["context"].append(f"@context {context_text[:40]!r}")
        for node in iter_nodes(data):
            for type_name in node_types(node):
                key = spec_key(type_name)
                out["types"].append(type_name)
                if not key:
                    continue
                spec = SPEC[key]
                missing = [prop for prop in spec["required"] if empty(node.get(prop))]
                if spec.get("one_of") and all(empty(node.get(p)) for p in spec["one_of"]):
                    missing.append("|".join(spec["one_of"]))
                if missing:
                    out["required"].append(f"{type_name}: {', '.join(missing)}")
                rec = [prop for prop in spec["recommended"] if empty(node.get(prop))]
                if rec:
                    out["recommended"].append(f"{type_name}: {', '.join(rec)}")
                check_formats(node, type_name, key, out, visible_norm)
    for key in ("types",):
        out[key] = list(dict.fromkeys(out[key]))
    return out


def check_formats(node: dict, type_name: str, key: str, out: dict, visible_norm: str) -> None:
    for prop in DATE_KEYS & node.keys():
        value = node[prop]
        if isinstance(value, str) and not ISO_DATE.match(value.strip()):
            out["format"].append(f"{type_name}.{prop} {value!r} is not ISO 8601")
    for prop in URL_KEYS & node.keys():
        values = node[prop] if isinstance(node[prop], list) else [node[prop]]
        for value in values:
            if isinstance(value, str) and value and not re.match(r"^https?://", value):
                out["format"].append(f"{type_name}.{prop} {value[:50]!r} is not an absolute URL")
    if key == "offer":
        price = node.get("price")
        if isinstance(price, str) and not re.fullmatch(r"\d+(\.\d+)?", price.strip()):
            out["format"].append(f"Offer.price {price!r} is not a plain number")
        currency = node.get("priceCurrency")
        if isinstance(currency, str) and not re.fullmatch(r"[A-Z]{3}", currency):
            out["format"].append(f"Offer.priceCurrency {currency!r} is not an ISO 4217 code")
    if key == "article":
        headline = node.get("headline")
        if isinstance(headline, str) and len(headline) > 110:
            out["format"].append(f"{type_name}.headline is {len(headline)} chars (max 110)")
        author = node.get("author")
        authors = author if isinstance(author, list) else [author]
        for item in authors:
            if isinstance(item, dict) and empty(item.get("name")):
                out["required"].append(f"{type_name}.author: name")
    if key == "breadcrumblist":
        items = node.get("itemListElement")
        items = items if isinstance(items, list) else [items] if isinstance(items, dict) else []
        positions = []
        for index, item in enumerate(items):
            if not isinstance(item, dict):
                continue
            try:
                positions.append(int(item.get("position")))
            except (TypeError, ValueError):
                positions.append(-1)
            name = item.get("name") or (item.get("item") or {}).get("name") if isinstance(item.get("item"), dict) \
                else item.get("name")
            if empty(name):
                out["required"].append(f"BreadcrumbList item {index + 1}: name")
            if index < len(items) - 1 and empty(item.get("item")):
                out["required"].append(f"BreadcrumbList item {index + 1}: item (URL)")
        if positions and positions != list(range(1, len(positions) + 1)):
            out["format"].append(f"BreadcrumbList positions {positions} are not 1..{len(positions)}")
    if key == "faqpage":
        entities = node.get("mainEntity")
        entities = entities if isinstance(entities, list) else [entities] if isinstance(entities, dict) else []
        for entity in entities:
            if not isinstance(entity, dict):
                continue
            name = entity.get("name")
            if isinstance(name, str) and name.strip():
                probe = fold(name)[:60].rsplit(" ", 1)[0] if len(fold(name)) > 60 else fold(name)
                if visible_norm and probe not in visible_norm:
                    out["mismatch"].append(f"FAQ question not on the page: {name[:60]!r}")
            answer = entity.get("acceptedAnswer")
            if isinstance(answer, dict) and empty(answer.get("text")):
                out["required"].append("Question.acceptedAnswer: text")


# ------------------------------------------------------------------------------------------------ checks
def run_checks(audit: Audit) -> None:
    pages = [p for p in audit.pages.values() if p.ok_html]
    origin = audit.origin
    home = audit.pages.get(audit.start)

    # robots.txt
    robots_resp = audit.robots_resp
    robots_ok = robots_resp is not None and robots_resp.status == 200 and not robots_resp.is_html
    audit.result("robots-missing", robots_resp is not None and robots_resp.status == 200, short(origin + "robots.txt", origin))
    if robots_resp is not None and robots_resp.status == 200:
        audit.result("robots-soft404", not robots_resp.is_html, "/robots.txt")
    if robots_ok:
        audit.result("robots-blocks-all", audit.robots.allowed("*", "/") or bool(audit.robots.rules_for("*") is None),
                     "/robots.txt", "User-agent: * / Disallow: /")
        audit.result("robots-no-sitemap", bool(audit.robots.sitemaps), "/robots.txt")

    # sitemap
    info = audit.sitemap_info
    audit.result("sitemap-missing", info["found"] or bool(info["offsite_files"]), "/sitemap.xml")
    for loc in info["bad_locs"] + info["offsite_files"]:
        audit.result("sitemap-offsite", False, "/sitemap.xml", f"<loc>{loc[:70]}</loc>")
    for _ in audit.sitemap_urls:
        audit.result("sitemap-offsite", True)
    if info["found"]:
        audit.result("sitemap-invalid", not info["errors"], info["files"][0] if info["files"] else None,
                     "; ".join(info["errors"])[:200] or None)
        for url in audit.sitemap_urls:
            if not audit.in_scope(url):
                continue
            status = audit.status_of(url)
            if status is None:
                continue
            audit.result("sitemap-broken", 0 < status < 400, short(url, origin), f"{short(url, origin)} -> {status}")
            page = audit.pages.get(url)
            if page is None:
                continue
            if page.status == 301 and page.parser is None:
                audit.result("sitemap-redirect", False, short(url, origin),
                             f"{short(url, origin)} -> {short(page.final, origin)}")
            if page.ok_html:
                audit.result("sitemap-redirect", page.final == url, short(url, origin),
                             f"{short(url, origin)} -> {short(page.final, origin)}")
                audit.result("sitemap-noindex", not page.noindex, short(url, origin))
                canon = [normalize(urlparse.urljoin(page.final, c)) for c in page.canonicals if c]
                audit.result("sitemap-non-canonical", not canon or canon[0] in (url, page.final), short(url, origin),
                             f"{short(url, origin)} canonical -> {short(canon[0], origin) if canon else ''}")
        listed = set(audit.sitemap_urls)
        for page in (pages if not info["truncated"] else []):  # a partly read sitemap proves nothing missing
            if page.indexable and page.url == page.final:
                canon = [normalize(urlparse.urljoin(page.final, c)) for c in page.canonicals if c]
                if canon and canon[0] != page.final:
                    continue
                audit.result("not-in-sitemap", page.url in listed, short(page.url, origin))

    # links
    for target, sources in audit.inlinks.items():
        if not audit.in_scope(target):
            continue
        status = audit.status_of(target)
        if status is None:
            continue
        example = short(sorted(sources)[0], origin)
        audit.result("broken-link", 0 < status < 400, short(target, origin),
                     f"{example} -> {short(target, origin)} ({status or 'no response'})")
        page = audit.pages.get(target)
        if page is not None and page.final != target and 0 < status < 400:
            audit.result("redirect-link", False, short(target, origin),
                         f"{example} -> {short(target, origin)} -> {short(page.final, origin)}")
        elif 0 < status < 400:
            audit.result("redirect-link", True)
    if not audit.hit_limit:
        linked = set(audit.inlinks) | {audit.start}
        linked |= {p.final for p in audit.pages.values() if p.url in linked}
        candidates = [u for u in audit.sitemap_urls if audit.in_scope(u)]
        if audit.local_root is not None:
            for path in sorted(audit.local_root.rglob("*.htm*")):
                if path.is_symlink() or audit.local_root not in path.resolve().parents:
                    continue
                rel = path.relative_to(audit.local_root).as_posix()
                if path.name.lower() in ("404.html", "404.htm") or rel.startswith((".", "_")):
                    continue
                try:
                    with path.open("rb") as handle:
                        head = handle.read(4096).lower()
                except OSError:
                    continue
                if not re.search(rb"<(!doctype|html|body|head)\b", head):  # theme templates, partials
                    continue
                url = urlparse.urljoin(audit.scope, rel)
                if rel.endswith("index.html"):
                    url = url[: -len("index.html")]
                candidates.append(normalize(url))
        for url in dict.fromkeys(candidates):
            status = audit.status_of(url)
            known = audit.pages.get(url)
            if (status is not None and (status >= 400 or status == 0)) or (known is not None and known.noindex):
                continue
            variants = {url, url.rstrip("/"), url.rstrip("/") + "/", re.sub(r"\.html?$", "", url),
                        re.sub(r"/index\.html?$", "/", url)}
            if url.endswith("/"):
                variants.add(url + "index.html")
            else:
                variants.add(url + ".html")
            audit.result("orphan-page", bool(variants & linked), short(url, origin))

    # per page metadata / structure / social / schema / answers / speed / images
    titles: dict[str, list[str]] = defaultdict(list)
    descs: dict[str, list[str]] = defaultdict(list)
    hreflang_sets: dict[str, dict[str, str]] = {}

    def check_page(page: Page) -> None:
        parser = page.parser
        url = short(page.url, origin)
        indexable = page.indexable
        title = parser.title or ""
        audit.result("title-missing", bool(title.strip()), url)
        if title.strip():
            audit.result("title-long", len(title) <= 60, url, f"{url}: {len(title)} chars")
            audit.result("title-short", len(title) >= 15, url, f"{url}: {len(title)} chars: {title}")
            if indexable:
                titles[title.strip().lower()].append(url)
        desc = (meta_content(parser, "description") or "").strip()
        audit.result("desc-missing", bool(desc), url)
        if desc:
            audit.result("desc-length", 70 <= len(desc) <= 160, url, f"{url}: {len(desc)} chars")
            if indexable:
                descs[desc.lower()].append(url)
        audit.result("viewport-missing", meta_content(parser, "viewport") is not None, url)
        audit.result("lang-missing", bool(parser.html_lang), url)

        canon = [c for c in page.canonicals if c]
        if indexable:
            audit.result("canonical-missing", bool(canon), url)
        if canon:
            resolved = {normalize(urlparse.urljoin(page.final, c)) for c in canon}
            audit.result("canonical-multiple", len(resolved) <= 1, url, ", ".join(sorted(resolved))[:160])
            audit.result("canonical-relative", bool(re.match(r"^https?://", canon[0])), url, canon[0])
            target = normalize(urlparse.urljoin(page.final, canon[0]))
            same_host = urlparse.urlsplit(target).netloc == urlparse.urlsplit(page.final).netloc
            if audit.fetcher.mode == "local" and audit.local_base_guessed:
                same_host = True
            audit.result("canonical-offsite", same_host, url, f"{url} -> {target}")
            status = audit.status_of(target) if same_host else None
            if status is not None:
                audit.result("canonical-broken", 0 < status < 400, url, f"{url} -> {short(target, origin)} ({status})")

        levels = [level for level, _ in parser.headings]
        h1s = levels.count(1)
        audit.result("h1-missing", h1s >= 1, url)
        if h1s:
            audit.result("h1-multiple", h1s == 1, url, f"{h1s} h1")
        skips = [f"h{a}->h{b}" for a, b in zip(levels, levels[1:]) if b > a + 1]
        audit.result("heading-skip", not skips, url, f"{url}: {', '.join(skips[:3])}")
        audit.result("heading-empty", all(text for _, text in parser.headings), url)

        alternates = {}
        for tag in parser.link_tags:
            if "alternate" in tag.get("rel", "").lower().split() and tag.get("hreflang"):
                alternates[tag["hreflang"].strip()] = tag.get("href", "").strip()
        if alternates:
            bad = [f"{code}={href}" for code, href in alternates.items()
                   if not HREFLANG.match(code) or not re.match(r"^https?://", href)]
            audit.result("hreflang-invalid", not bad, url, f"{url}: {', '.join(bad[:3])}")
            resolved = {code: normalize(urlparse.urljoin(page.final, href)) for code, href in alternates.items()}
            audit.result("hreflang-no-self", page.final in resolved.values() or page.url in resolved.values(), url)
            audit.result("hreflang-no-xdefault", "x-default" in {c.lower() for c in resolved}, url)
            hreflang_sets[page.final] = resolved

        og = {key: meta_content(parser, key) for key in ("og:title", "og:description", "og:image")}
        missing_og = [key for key, value in og.items() if not value]
        if indexable:
            audit.result("og-missing", not missing_og, url, f"{url}: {', '.join(missing_og)}")
            audit.result("twitter-card-missing", meta_content(parser, "twitter:card") is not None, url)
        if og["og:image"]:
            audit.result("og-image-relative", bool(re.match(r"^https?://", og["og:image"])), url, og["og:image"][:80])

        visible = " ".join(" ".join(parser.text).split())
        ld = check_jsonld(parser.jsonld, visible)
        page.jsonld_types = ld["types"]
        if indexable:
            audit.result("jsonld-none", bool(parser.jsonld), url)
        if parser.jsonld:
            audit.result("jsonld-parse", not ld["parse"], url, f"{url}: {'; '.join(ld['parse'][:2])}")
            audit.result("jsonld-context", not ld["context"], url, f"{url}: {'; '.join(ld['context'][:2])}")
            audit.result("jsonld-required", not ld["required"], url, f"{url}: {'; '.join(ld['required'][:3])}")
            audit.result("jsonld-recommended", not ld["recommended"], url, f"{url}: {'; '.join(ld['recommended'][:3])}")
            audit.result("jsonld-format", not ld["format"], url, f"{url}: {'; '.join(ld['format'][:2])}")
            if "FAQPage" in ld["types"] or any(t.lower() == "faqpage" for t in ld["types"]):
                audit.result("jsonld-mismatch", not ld["mismatch"], url, f"{url}: {'; '.join(ld['mismatch'][:2])}")
        page.visible_words = words(visible)

        # AI access: JavaScript-only content
        scripts = [s for s in parser.scripts if s["type"] not in ("application/ld+json", "application/json",
                                                                  "text/template", "importmap")]
        main_words = max(0, page.visible_words - words(" ".join(parser.chrome_text)))
        src_scripts = sum(1 for s in scripts if s["src"])
        js_heavy = bool(scripts) and (
            (parser.root_app and main_words < 60)  # empty app mount point; only nav/header/footer text around it
            or (parser.noscript_js and page.visible_words < 60)
            or (page.visible_words < 25 and src_scripts >= 1))
        audit.result("js-only-content", not js_heavy, url,
                     f"{url}: {main_words} words of content text in the HTML (outside nav/header/footer)")

        # answerability (long content pages only)
        if indexable and page.visible_words >= 300 and page.url != audit.start:
            questions = [text for level, text in parser.headings if level >= 2 and is_question(text)]
            audit.result("question-headings", bool(questions), url)
            for index, block in enumerate(parser.blocks):
                if block[0] != "h" or block[1] < 2 or not is_question(block[2]):
                    continue
                answer = None
                for nxt in parser.blocks[index + 1:]:
                    if nxt[0] == "h":
                        break
                    if nxt[0] in ("p", "list", "table"):
                        answer = nxt
                        break
                concise = answer is not None and (answer[0] != "p" or words(answer[1]) <= 80)
                detail = f"{url}: '{block[2][:50]}' -> " + (
                    "no answer before the next heading" if answer is None else
                    f"{words(answer[1])}-word paragraph" if answer[0] == "p" else f"answered by a {answer[0]}")
                audit.result("answer-not-concise", concise, url, detail)
            if page.visible_words >= 600:
                audit.result("no-lists-tables", parser.lists + parser.tables > 0, url)
            dated = bool(parser.times) or any(meta_content(parser, k) for k in (
                "article:published_time", "article:modified_time", "date", "dc.date", "last-modified")) or \
                any(re.search(r'"date(Published|Modified)"', block) for block in parser.jsonld)
            audit.result("date-missing", dated, url)
            authored = bool(meta_content(parser, "author")) or bool(meta_content(parser, "article:author")) or \
                any("author" in tag.get("rel", "").lower().split() for tag in parser.link_tags) or \
                any('"author"' in block for block in parser.jsonld)
            audit.result("author-missing", authored, url)
            long_paras = [words(p) for p in parser.paragraphs if words(p) > 150]
            audit.result("wall-of-text", not long_paras, url, f"{url}: {len(long_paras)} paragraph(s), longest {max(long_paras, default=0)} words")

        # speed
        size = len(page.resp.body)
        audit.result("html-heavy", size <= 250_000, url, f"{url}: {size // 1024} KB")
        if audit.fetcher.mode == "network":
            encoding = page.resp.headers.get("content-encoding", "").lower()
            if page.resp.raw_size > 4096 or size > 4096:
                audit.result("no-compression", encoding in ("gzip", "br", "deflate", "zstd"), url,
                             f"{url}: {size // 1024} KB uncompressed")
            audit.result("slow-response", page.resp.elapsed <= 1.5, url, f"{url}: {page.resp.elapsed:.1f}s")
        blocking_js = [s["src"] for s in parser.scripts if s["in_head"] and s["src"] and not s["async"]
                       and not s["defer"] and s["type"] in ("", "text/javascript", "application/javascript")]
        audit.result("render-blocking-js", not blocking_js, url, f"{url}: {len(blocking_js)} script(s), e.g. {blocking_js[0] if blocking_js else ''}"[:160])
        css = [t for t in parser.link_tags if t.get("_in_head") and "stylesheet" in t.get("rel", "").lower().split()
               and t.get("media", "all").lower() not in ("print",) and "disabled" not in t]
        audit.result("render-blocking-css", len(css) <= 3, url, f"{url}: {len(css)} stylesheets")

        # images
        if parser.images:
            no_alt = [img.get("src", "")[:60] for img in parser.images if "alt" not in img]
            audit.result("img-alt-missing", not no_alt, url, f"{url}: {len(no_alt)} of {len(parser.images)}, e.g. {no_alt[0] if no_alt else ''}")
            no_dims = [img for img in parser.images if not (img.get("width") and img.get("height"))
                       and not img.get("src", "").startswith("data:")]
            audit.result("img-dimensions", not no_dims, url, f"{url}: {len(no_dims)} of {len(parser.images)}")

    for page in pages:
        try:
            check_page(page)
        except Exception as exc:  # one odd page must not lose a whole polite crawl
            audit.notes.append(f"checks failed on {short(page.url, origin)}: {type(exc).__name__}: {exc}"[:200])

    for title, urls in titles.items():
        for u in urls:
            audit.result("title-duplicate", len(urls) == 1, u, f"{len(urls)} pages: {title[:50]!r}")
    for desc, urls in descs.items():
        for u in urls:
            audit.result("desc-duplicate", len(urls) == 1, u, f"{len(urls)} pages share: {desc[:50]!r}")
    for src, alternates in hreflang_sets.items():
        for code, target in alternates.items():
            if target == src:
                continue
            target_page = audit.pages.get(target)
            if target not in hreflang_sets and not (target_page is not None and target_page.ok_html):
                continue
            back = src in hreflang_sets.get(target, {}).values()
            audit.result("hreflang-no-return", back, short(src, origin),
                         f"{short(src, origin)} -> {short(target, origin)} ({code}) has no link back")

    if home is not None and home.ok_html:
        types = {t.lower() for t in getattr(home, "jsonld_types", [])}
        has_org = bool(types & (ORG_TYPES | LOCAL_TYPES | {"website"}))
        audit.result("schema-home-org", has_org, short(home.url, origin))

    # AI crawlers
    sample = [p.url for p in pages] or [audit.start]
    for token, owner, purpose in AI_BOTS:
        blocked = [u for u in sample if not audit.robots.allowed(token, u)]
        home_blocked = not audit.robots.allowed(token, audit.start)
        # blocked = shut out of the home page or of most pages; a few disallowed paths is "partial"
        if not blocked:
            state = "allowed"
        elif home_blocked or len(blocked) * 2 > len(sample):
            state = "blocked"
        else:
            state = "partial"
        paths = [v for k, v in (audit.robots.rules_for(token) or []) if k == "disallow" and v][:4]
        audit.ai_bots[token] = {"owner": owner, "purpose": purpose, "state": state,
                                "blocked_pages": len(blocked), "pages": len(sample),
                                "explicit": audit.robots.has_specific_group(token), "disallowed_paths": paths}
        detail = f"{token} ({owner}) {state}: {len(blocked)}/{len(sample)} pages"
        if purpose == "answers":
            audit.result("ai-search-bot-blocked", state != "blocked", "/robots.txt", detail)
            if state != "blocked":
                audit.result("ai-search-bot-partial", state == "allowed", "/robots.txt",
                             f"{detail}, Disallow: {' '.join(paths)}")
        else:
            audit.result("ai-training-bot-blocked", state == "allowed", "/robots.txt", detail)

    # llms.txt
    llms = audit.llms
    audit.result("llms-missing", llms.get("found", False), "/llms.txt")
    if llms.get("found"):
        audit.result("llms-soft404", not llms.get("html"), "/llms.txt")
        if not llms.get("html"):
            audit.result("llms-invalid", not llms.get("problems"), "/llms.txt", "; ".join(llms.get("problems", [])) or None)
            audit.result("llms-dead-link", not llms.get("dead"), "/llms.txt", ", ".join(llms.get("dead", [])[:5]) or None)


def is_question(text: str) -> bool:
    text = text.strip()
    return text.endswith(("?", "？")) or text.startswith("¿") or bool(QUESTION_START.match(text))


QUOTES = str.maketrans({"’": "'", "‘": "'", "‛": "'", "´": "'", "`": "'", "“": '"', "”": '"', "„": '"',
                        "«": '"', "»": '"', "–": "-", "—": "-", "\u00a0": " "})


def fold(text: str) -> str:
    """Lower-case, typographic quotes and dashes to ASCII, punctuation dropped: for 'is this text on the page'."""
    text = text.translate(QUOTES).lower()
    return " ".join(re.sub(r"[^\w\s]", " ", text).split())


# ------------------------------------------------------------------------------------------------ scoring
def score(audit: Audit) -> tuple[int, dict, list]:
    per_cat: dict[str, list[float]] = {c: [0.0, 0.0] for c in CATEGORIES}
    findings = []
    for rule, entry in audit.results.items():
        category, severity, title, fix = RULES[rule]
        total = entry["pass"] + entry["fail"]
        weight = SEV_WEIGHT[severity]
        if total and weight:
            per_cat[category][0] += weight * entry["pass"] / total
            per_cat[category][1] += weight
        if entry["fail"]:
            findings.append({"rule": rule, "category": category, "severity": severity, "title": title, "fix": fix,
                             "count": entry["fail"], "checked": total, "urls": entry["urls"][:50],
                             "details": entry["details"]})
    cats = {c: (round(100 * got / possible) if possible else None) for c, (got, possible) in per_cat.items()}
    present = [v for v in cats.values() if v is not None]
    overall = round(sum(present) / len(present)) if present else 0
    findings.sort(key=lambda f: (SEV_ORDER[f["severity"]], -f["count"], f["rule"]))
    return overall, cats, findings


# ------------------------------------------------------------------------------------------------- report
def build_report(audit: Audit, overall: int, cats: dict, findings: list) -> dict:
    pages = []
    for page in audit.pages.values():
        parser = page.parser
        pages.append({
            "url": page.url, "final_url": page.final, "status": page.status, "depth": page.depth,
            "title": parser.title if parser else None,
            "description": meta_content(parser, "description") if parser else None,
            "words": getattr(page, "visible_words", None), "noindex": page.noindex,
            "jsonld_types": getattr(page, "jsonld_types", []), "bytes": len(page.resp.body),
            "elapsed_s": round(page.resp.elapsed, 3), "outlinks": len(page.links),
        })
    return {
        "tool": "geo-seo-audit", "version": VERSION, "site": audit.start, "scope": audit.scope,
        "mode": audit.fetcher.mode, "score": overall, "categories": cats,
        "pages_crawled": sum(1 for p in audit.pages.values() if p.status == 200),
        "pages_fetched": len(audit.pages), "requests": audit.fetcher.requests,
        "hit_page_limit": audit.hit_limit, "robots_skipped": audit.robots_skipped[:50],
        "elapsed_s": round(audit.elapsed, 2), "notes": audit.notes,
        "high": sum(1 for f in findings if f["severity"] == "high"),
        "findings": findings, "ai_crawlers": audit.ai_bots,
        "llms_txt": {k: v for k, v in audit.llms.items() if k != "text"},
        "sitemap": {**audit.sitemap_info, "urls": len(audit.sitemap_urls)},
        "robots_txt": {"status": audit.robots_resp.status if audit.robots_resp else None,
                       "sitemaps": audit.robots.sitemaps},
        "pages": pages,
    }


def print_human(report: dict, top: int, baseline: dict | None, out=sys.stdout) -> None:
    w = out.write
    mode = "local folder" if report["mode"] == "local" else f"{report['requests']} requests, robots.txt respected"
    limit = " (page limit hit)" if report["hit_page_limit"] else ""
    w(f"geo-seo-audit {report['site']}\n")
    w(f"{report['pages_crawled']} pages{limit} in {report['elapsed_s']:.1f}s, {mode}\n")
    cats = report["categories"]
    cells = [f"{c} {cats[c] if cats[c] is not None else '-'}" for c in CATEGORIES]
    w(f"SCORE {report['score']}/100  " + "  ".join(cells[:5]) + "\n")
    w(" " * 15 + "  ".join(cells[5:]) + "\n")
    if baseline:
        delta = report["score"] - baseline.get("score", 0)
        before = {f["rule"] for f in baseline.get("findings", [])}
        after = {f["rule"] for f in report["findings"]}
        w(f"vs baseline: {baseline.get('score')} -> {report['score']} ({delta:+d}); "
          f"{len(before - after)} rules fixed, {len(after - before)} new\n")
    bots = report["ai_crawlers"]
    blocked = [t for t, b in bots.items() if b["state"] != "allowed" and b["purpose"] == "answers"]
    blocked_train = [t for t, b in bots.items() if b["state"] != "allowed" and b["purpose"] == "training"]
    allowed = sum(1 for b in bots.values() if b["state"] == "allowed")
    w(f"AI crawlers: {allowed}/{len(bots)} allowed")
    hard = [t for t in blocked if bots[t]["state"] == "blocked"]
    partial = [t for t in blocked if bots[t]["state"] == "partial"]
    if hard:
        w(f"; answer bots blocked: {', '.join(hard)}")
    if partial:
        w(f"; answer bots with blocked paths: {', '.join(partial)}")
    if blocked_train:
        w(f"; training bots blocked: {', '.join(blocked_train)}")
    w("\n")
    llms = report["llms_txt"]
    llms_state = "missing" if not llms.get("found") else ("HTML soft 404" if llms.get("html") else
                                                            ("valid" if not llms.get("problems") else "invalid"))
    sitemap = report["sitemap"]
    sm = f"{sitemap['urls']} URLs" if sitemap["found"] else "missing"
    if sitemap.get("truncated"):
        sm += f" (partial: {len(sitemap['files'])} files read)"
    bad = len(sitemap.get("bad_locs", [])) + len(sitemap.get("offsite_files", []))
    if bad:
        sm += f", {bad} off-site/invalid"
    robots = report["robots_txt"]["status"]
    w(f"llms.txt {llms_state} | sitemap.xml {sm} | robots.txt {'ok' if robots == 200 else robots}\n")
    ranked = [f for f in report["findings"] if f["severity"] != "info"]
    verdict = "FAIL" if report["high"] else "PASS"
    w(f"{verdict}: {report['high']} high, {sum(1 for f in ranked if f['severity'] == 'medium')} medium, "
      f"{sum(1 for f in ranked if f['severity'] == 'low')} low rule(s) failing\n")
    if ranked:
        w("FIX FIRST\n")
    marks = {"high": "✗", "medium": "!", "low": "·"}
    labels = {"high": "HIGH", "medium": "MED ", "low": "LOW "}
    for index, f in enumerate(ranked[:top], 1):
        example = f["details"][0] if f["details"] else (f["urls"][0] if f["urls"] else "")
        pages = f"{f['count']}/{f['checked']}"
        w(f"{marks[f['severity']]} {index:>2} {labels[f['severity']]} {f['rule']:<22} {pages:>6}  {example[:66]}\n")
        w(f"        fix: {f['fix'][:95]}\n")
    if len(ranked) > top:
        w(f"... {len(ranked) - top} more rule(s): --json for all, --top N to show more\n")
    if report["notes"]:
        w("note: " + "; ".join(report["notes"]) + "\n")


def list_rules(out=sys.stdout) -> None:
    out.write(f"{'rule':<24} {'category':<10} {'severity':<8} title\n")
    for rule, (cat, sev, title, _) in sorted(RULES.items(), key=lambda kv: (CATEGORIES.index(kv[1][0]), kv[0])):
        out.write(f"{rule:<24} {cat:<10} {sev:<8} {title}\n")


# --------------------------------------------------------------------------------------------- emit fixes
EMIT_MARKER = "# Suggested fixes from geo-seo-audit"


def emit_dir_ok(out_dir: Path) -> bool:
    """Empty or missing, or a folder this tool wrote before (its README starts with the marker)."""
    if not out_dir.exists():
        return True
    if not out_dir.is_dir():
        return False
    if not any(out_dir.iterdir()):
        return True
    readme = out_dir / "README.md"
    try:
        return readme.is_file() and readme.read_text(encoding="utf-8").startswith(EMIT_MARKER)
    except OSError:
        return False


def emit_fixes(audit: Audit, report: dict, out_dir: Path) -> list[str]:
    if out_dir.is_symlink(): raise ValueError("Output directory must not be a symlink")
    if out_dir.exists() and any(p.is_symlink() for p in out_dir.rglob("*")):
        raise ValueError("Output tree contains symlinks; choose a new directory")
    out_dir.mkdir(parents=True, exist_ok=True)
    written: list[str] = []
    origin = audit.origin
    pages = [p for p in audit.pages.values() if p.indexable and p.url == p.final]
    home = audit.pages.get(audit.start)
    hp = home.parser if home is not None and home.parser else None
    site_name = guess_site_name(audit, hp)
    site_desc = (meta_content(hp, "description") if hp else "") or ""

    # llms.txt
    groups: dict[str, list[Page]] = defaultdict(list)
    for page in pages:
        segment = urlparse.urlsplit(page.url).path[len(urlparse.urlsplit(audit.scope).path):].strip("/").split("/")[0]
        segment = re.sub(r"\.html?$", "", segment)
        groups["Main" if not segment or "/" not in urlparse.urlsplit(page.url).path.strip("/") else segment.replace("-", " ").title()].append(page)
    lines = [f"# {site_name.strip()}", ""]
    if site_desc:
        lines += [f"> {site_desc.strip()}", ""]
    count = 0
    for name in sorted(groups, key=lambda n: (n != "Main", n)):
        lines.append(f"## {name}")
        lines.append("")
        for page in groups[name]:
            title = strip_brand((page.parser.title or slug(page.url)).strip(), site_name)
            note = (meta_content(page.parser, "description") or "").strip()
            lines.append(f"- [{title}]({page.url})" + (f": {note}" if note else ""))
            count += 1
        lines.append("")
    if not audit.llms.get("found") or audit.llms.get("html") or audit.llms.get("problems"):
        (out_dir / "llms.txt").write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
        written.append(f"llms.txt ({count} links)")

    # robots.txt suggestion
    robots_lines = ["# Suggested by geo-seo-audit. Review before replacing your robots.txt.",
                    "# Answer/search crawlers (cite your pages in AI answers): allowed.",
                    "# Training crawlers: your existing decision is kept; change Allow/Disallow as you prefer.", ""]
    def delay_lines(agent: str) -> list[str]:
        delay = audit.robots.crawl_delay.get(agent.lower())
        return [f"Crawl-delay: {delay:g}"] if delay is not None else []

    def blanket(rule: tuple) -> bool:
        return rule[0] == "disallow" and rule[1].strip() in ("/", "/*", "*")

    ai_tokens = {t.lower() for t, _, _ in AI_BOTS}
    for agents, rules in audit.robots.groups:
        keep = [a for a in agents if a not in ai_tokens]
        if keep:
            robots_lines += [f"User-agent: {a}" for a in keep]
            robots_lines += [f"{k.title()}: {v}" for k, v in rules] or ["Disallow:"]
            robots_lines += delay_lines(keep[0])
            robots_lines.append("")
    for token, owner, purpose in AI_BOTS:
        specific = audit.robots.has_specific_group(token)
        own = audit.robots.rules_for(token) or []  # its own group, else the * group
        state = audit.ai_bots.get(token, {}).get("state", "allowed")
        if purpose == "answers" and state == "blocked":
            # drop only the blanket block; every path rule stays (search pages, carts, paywalls ...)
            star = audit.robots.rules_for("*") or []
            rules = ([r for r in own if not blanket(r)] or [r for r in star if not blanket(r)]
                     or [("allow", "/")])
        elif specific:
            rules = list(own) or [("allow", "/")]
        else:
            continue
        robots_lines += [f"User-agent: {token}"] + [f"{k.title()}: {v}" for k, v in rules]
        robots_lines += delay_lines(token) + [""]
    sitemaps = audit.robots.sitemaps or [urlparse.urljoin(audit.scope, "sitemap.xml")]
    robots_lines += [f"Sitemap: {s}" for s in sitemaps]
    if any(f["rule"] in ("ai-search-bot-blocked", "robots-no-sitemap", "robots-missing", "robots-soft404")
           for f in report["findings"]):
        (out_dir / "robots.txt").write_text("\n".join(robots_lines) + "\n", encoding="utf-8")
        written.append("robots.txt")

    # sitemap.xml: never smaller than yours. Existing URLs are kept unless proven bad; crawled pages are added.
    info = audit.sitemap_info
    crawled = []
    for page in pages:
        canon = [normalize(urlparse.urljoin(page.final, c)) for c in page.canonicals if c]
        if not canon or canon[0] == page.final:
            crawled.append(page.url)
    removed: list[str] = []
    if info["truncated"] or (info["found"] and info["errors"] and not audit.sitemap_urls):
        sitemap_note = "not written: your sitemap was only partly read (or unreadable); fix the findings by hand"
        entries = None
    elif info["found"]:
        keep = []
        for url in audit.sitemap_urls:
            page = audit.pages.get(url)
            status = audit.status_of(url)
            bad = (status in (404, 410)) or (page is not None and (
                page.stub or page.noindex or (page.ok_html and page.final != url)))
            if bad:
                removed.append(url)
            else:
                keep.append(url)
        additions = [u for u in crawled if u not in set(audit.sitemap_urls)]
        entries = keep + additions
        sitemap_note = (f"merged: your {len(audit.sitemap_urls)} URLs, {len(removed)} removed (proven 404/noindex/"
                        f"redirect), {len(additions)} crawled pages added")
        if not removed and not additions:
            entries, sitemap_note = None, "not needed: your sitemap already matches the crawl"
    else:
        entries = crawled
        sitemap_note = f"new: {len(crawled)} crawled pages" + (" (crawl hit --max-pages: add the rest)"
                                                                 if audit.hit_limit else "")
    if entries is not None:
        xml = ('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
               + "\n".join(f"  <url><loc>{xml_escape(u)}</loc></url>" for u in entries) + "\n</urlset>\n")
        (out_dir / "sitemap.xml").write_text(xml, encoding="utf-8")
        written.append(f"sitemap.xml ({len(entries)} URLs)")
    report["sitemap_emit"] = {"note": sitemap_note, "removed": removed[:50]}

    # JSON-LD snippets
    snippets = []
    used_names: set[str] = set()
    jsonld_dir = out_dir / "jsonld"
    for page in pages:
        types = {t.lower() for t in getattr(page, "jsonld_types", [])}
        blocks = []
        parser = page.parser
        if page.url == audit.start and not types & (ORG_TYPES | LOCAL_TYPES | {"website"}):
            org = {"@context": "https://schema.org", "@type": "Organization", "name": site_name.strip(),
                   "url": audit.scope}
            icon = next((t.get("href") for t in parser.link_tags if "icon" in t.get("rel", "").lower()), None)
            og_image = meta_content(parser, "og:image")
            if og_image or icon:
                org["logo"] = urlparse.urljoin(page.final, og_image or icon)
            blocks.append(org)
            blocks.append({"@context": "https://schema.org", "@type": "WebSite", "name": site_name.strip(),
                           "url": audit.scope})
        path = urlparse.urlsplit(page.url).path[len(urlparse.urlsplit(audit.scope).path):].strip("/")
        if path and "breadcrumblist" not in types:
            items = [{"@type": "ListItem", "position": 1, "name": "Home", "item": audit.scope}]
            parts = path.split("/")
            for depth in range(1, len(parts) + 1):
                sub = "/".join(parts[:depth])
                url = urlparse.urljoin(audit.scope, sub + ("/" if depth < len(parts) else ""))
                known = audit.pages.get(normalize(url))
                name = page.parser.headings[0][1] if depth == len(parts) and page.parser.headings else (
                    known.parser.title if known and known.parser and known.parser.title else
                    re.sub(r"\.html?$", "", parts[depth - 1]).replace("-", " ").title())
                item = {"@type": "ListItem", "position": depth + 1, "name": name}
                item["item"] = page.url if depth == len(parts) else url
                items.append(item)
            blocks.append({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": items})
        qa = question_answers(parser)
        if len(qa) >= 2 and "faqpage" not in types:
            blocks.append({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
                {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in qa]})
        if getattr(page, "visible_words", 0) >= 300 and page.url != audit.start and not types & ARTICLE_TYPES:
            # only facts found on the page: no placeholders that would be pasted as-is
            article = {"@context": "https://schema.org", "@type": "Article",
                       "headline": (parser.headings[0][1] if parser.headings else parser.title or "")[:110],
                       "mainEntityOfPage": page.url}
            if meta_content(parser, "author"):
                article["author"] = {"@type": "Person", "name": meta_content(parser, "author")}
            if parser.times and ISO_DATE.match(parser.times[0].strip()):
                article["datePublished"] = parser.times[0].strip()
            image = meta_content(parser, "og:image")
            if image:
                article["image"] = urlparse.urljoin(page.final, image)
            blocks.append(article)
        if blocks:
            jsonld_dir.mkdir(exist_ok=True)
            base_name, n = slug(page.url), 1
            name = f"{base_name}.html"
            while name.lower() in used_names:
                n += 1
                name = f"{base_name}-{n}.html"
            used_names.add(name.lower())
            body = "\n".join('<script type="application/ld+json">\n' + json.dumps(b, indent=2, ensure_ascii=False).replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
                             + "\n</script>" for b in blocks)
            (jsonld_dir / name).write_text(body + "\n", encoding="utf-8")
            snippets.append({"url": page.url, "file": f"jsonld/{name}", "types": [b["@type"] for b in blocks]})
    if snippets:
        (jsonld_dir / "manifest.json").write_text(json.dumps(snippets, indent=2), encoding="utf-8")
        written.append(f"jsonld/ ({len(snippets)} pages)")

    # meta fixes
    rows = []
    for page in pages:
        parser = page.parser
        title = (parser.title or "").strip()
        desc = (meta_content(parser, "description") or "").strip()
        if not desc:
            first = next((p for p in parser.paragraphs if words(p) >= 8), "")
            rows.append([page.url, "description-missing", "", trim(first, 155)])
        elif not 70 <= len(desc) <= 160:
            rows.append([page.url, "description-length", desc, trim(desc, 155) if len(desc) > 160 else ""])
        if title and len(title) > 60:
            rows.append([page.url, "title-long", title, trim(title, 60)])
        if not title:
            rows.append([page.url, "title-missing", "", parser.headings[0][1] if parser.headings else ""])
    for f in report["findings"]:
        if f["rule"] in ("title-duplicate", "desc-duplicate"):
            for url in f["urls"]:
                rows.append([urlparse.urljoin(origin, url), f["rule"], "", "write a unique one"])
    if rows:
        with open(out_dir / "meta-fixes.csv", "w", newline="", encoding="utf-8") as handle:
            writer = csv.writer(handle)
            writer.writerow(["url", "issue", "current", "suggestion"])
            writer.writerows([["'" + cell if isinstance(cell, str) and cell.lstrip().startswith(("=", "+", "-", "@")) else cell for cell in row] for row in rows])
        written.append(f"meta-fixes.csv ({len(rows)} rows)")

    readme = [EMIT_MARKER, "",
              f"Site: {audit.start}  Score: {report['score']}/100  Generated from {report['pages_crawled']} crawled pages.",
              "Nothing here is applied automatically. Review each file, then copy it into your site.", ""]
    howto = {
        "llms.txt": "Put at the site root as /llms.txt (text/plain). Edit the summary and drop pages you do not want listed.",
        "robots.txt": "Review policy before any replacement: this draft may allow answer/search bots your existing policy blocked; training groups are preserved where parsed.",
        "sitemap.xml": "Serve as /sitemap.xml after review.",
        "jsonld/": "Paste each file's <script> blocks into the <head> of the page listed in jsonld/manifest.json. Add author and datePublished to Article blocks when you know them.",
        "meta-fixes.csv": "Titles/descriptions to rewrite. Suggestions are trimmed drafts: rewrite them for people.",
    }
    for item in written:
        key = item.split(" ")[0]
        readme.append(f"- **{item}**: {howto.get(key, '')}")
    readme += ["", f"sitemap.xml: {report['sitemap_emit']['note']}."]
    readme += [f"- removed: {u}" for u in report["sitemap_emit"]["removed"][:20]]
    readme += ["", "Ranked findings:"]
    for f in report["findings"]:
        if f["severity"] != "info":
            readme.append(f"- [{f['severity']}] {f['rule']} ({f['count']}): {f['fix']}")
    (out_dir / "README.md").write_text("\n".join(readme) + "\n", encoding="utf-8")
    written.append("README.md")
    return written


def guess_site_name(audit: Audit, hp: PageParser | None) -> str:
    """og:site_name, else a JSON-LD Organization/WebSite name, else the title part most pages share."""
    if hp is None:
        return urlparse.urlsplit(audit.origin).netloc
    name = meta_content(hp, "og:site_name")
    if name:
        return name.strip()
    for raw in hp.jsonld:
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            continue
        for node in iter_nodes(data):
            types = {t.lower() for t in node_types(node)}
            if types & (ORG_TYPES | LOCAL_TYPES | {"website"}) and isinstance(node.get("name"), str):
                return node["name"].strip()
    parts = [p.strip() for p in re.split(r"\s+[|\-–—:·]\s+", hp.title or "") if p.strip()]
    if not parts:
        return urlparse.urlsplit(audit.origin).netloc
    titles = [p.parser.title or "" for p in audit.pages.values() if p.parser is not None]
    return max(parts, key=lambda part: (sum(part in t for t in titles), -len(part)))


def strip_brand(title: str, brand: str) -> str:
    stripped = re.sub(r"\s+[|\-–—:·]\s+" + re.escape(brand) + r"\s*$", "", title).strip()
    stripped = re.sub(r"^" + re.escape(brand) + r"\s+[|\-–—:·]\s+", "", stripped).strip()
    return stripped or title


def question_answers(parser: PageParser) -> list[tuple[str, str]]:
    pairs = []
    for index, block in enumerate(parser.blocks):
        if block[0] == "h" and block[1] >= 2 and is_question(block[2]):
            for nxt in parser.blocks[index + 1:]:
                if nxt[0] == "h":
                    break
                if nxt[0] == "p":
                    pairs.append((block[2], nxt[1]))
                    break
    return pairs


def trim(text: str, limit: int) -> str:
    text = " ".join(text.split())
    if len(text) <= limit:
        return text
    cut = text[: limit - 1].rsplit(" ", 1)[0].rstrip(",;:-")
    return cut + "…"


def xml_escape(text: str) -> str:
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


# ------------------------------------------------------------------------------------------------------ cli
REPORT_CSS = """
*{box-sizing:border-box}body{margin:0;background:#f8fafc;color:#0f172a;font:15px/1.45 system-ui,-apple-system,
'Segoe UI',Roboto,sans-serif}.w{max-width:980px;margin:0 auto;padding:28px 20px}
h1{font-size:22px;margin:0}h2{font-size:15px;text-transform:uppercase;letter-spacing:.06em;color:#475569;
margin:26px 0 10px}.sub{color:#64748b;font-size:13px;margin-top:4px;overflow-wrap:anywhere}
.top{display:flex;gap:28px;align-items:center;flex-wrap:wrap;background:#fff;border:1px solid #e2e8f0;
border-radius:14px;padding:20px}.dial{flex:0 0 auto;text-align:center}.dial b{display:block;font-size:13px;
color:#64748b;font-weight:600}.bars{flex:1 1 380px;display:grid;grid-template-columns:1fr 1fr;gap:8px 22px}
.bar{display:grid;grid-template-columns:86px 1fr 34px;align-items:center;gap:8px;font-size:13px}
.track{height:9px;background:#e2e8f0;border-radius:6px;position:relative;overflow:hidden}
.fill{position:absolute;inset:0 auto 0 0;border-radius:6px}.ghost{position:absolute;top:-3px;bottom:-3px;width:2px;
background:#0f172a;opacity:.55}.num{text-align:right;font-variant-numeric:tabular-nums;font-weight:600}
.chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.chip{border-radius:999px;padding:3px 10px;
font-size:12px;font-weight:600;border:1px solid #e2e8f0;background:#fff}
.g{color:#15803d;background:#dcfce7;border-color:#bbf7d0}.a{color:#a16207;background:#fef9c3;border-color:#fde68a}
.r{color:#b91c1c;background:#fee2e2;border-color:#fecaca}.n{color:#475569;background:#f1f5f9}
.bots{display:grid;grid-template-columns:1fr 1fr;gap:14px}.card{background:#fff;border:1px solid #e2e8f0;
border-radius:12px;padding:12px 14px}.card h3{margin:0 0 8px;font-size:13px;color:#475569}
.bot{display:flex;justify-content:space-between;gap:8px;padding:3px 0;font-size:13px;border-top:1px solid #f1f5f9}
table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #e2e8f0;border-radius:12px;
overflow:hidden;font-size:13px}td,th{padding:9px 10px;text-align:left;vertical-align:top;border-top:1px solid
#f1f5f9}th{background:#f1f5f9;color:#475569;font-size:12px}td.x{overflow-wrap:anywhere;color:#334155}
.fix{color:#64748b;font-size:12px;margin-top:2px}.delta{font-size:26px;font-weight:700}
footer{color:#94a3b8;font-size:12px;margin-top:26px}
@media (max-width:640px){.bars,.bots{grid-template-columns:1fr}.hide{display:none}}
@media print{body{background:#fff}.w{padding:0}}
"""


def _tone(value) -> str:
    if value is None:
        return "n"
    return "g" if value >= 80 else ("a" if value >= 50 else "r")


def _color(value) -> str:
    return {"g": "#22c55e", "a": "#eab308", "r": "#ef4444", "n": "#94a3b8"}[_tone(value)]


def render_report(report: dict, baseline: dict | None = None) -> str:
    """One self-contained HTML page (no external files, all site text escaped) for a client or a PR."""
    esc = html_escape
    if baseline is not None:
        if not isinstance(baseline, dict): raise ValueError("Baseline must be an object")
        for field in ("score", "high"):
            value = baseline.get(field, 0)
            if not isinstance(value, (int, float)) or isinstance(value, bool) or not math.isfinite(value):
                raise ValueError("Baseline numeric field invalid")
        if not isinstance(baseline.get("categories", {}), dict): raise ValueError("Baseline categories invalid")
        if any(v is not None and (not isinstance(v, (int, float)) or isinstance(v, bool) or not math.isfinite(v) or not 0 <= v <= 100) for v in baseline.get("categories", {}).values()):
            raise ValueError("Baseline categories must be bounded numbers")
    score_value = report["score"]
    ring = 2 * math.pi * 52
    dial = (f'<svg width="150" height="150" viewBox="0 0 120 120" role="img" aria-label="score {score_value} of 100">'
            f'<circle cx="60" cy="60" r="52" fill="none" stroke="#e2e8f0" stroke-width="12"/>'
            f'<circle cx="60" cy="60" r="52" fill="none" stroke="{_color(score_value)}" stroke-width="12" '
            f'stroke-linecap="round" stroke-dasharray="{ring * score_value / 100:.1f} {ring:.1f}" '
            f'transform="rotate(-90 60 60)"/><text x="60" y="68" text-anchor="middle" font-size="30" '
            f'font-weight="700" fill="#0f172a">{score_value}</text></svg>')
    before_cats = (baseline or {}).get("categories", {})
    bars = []
    for cat in CATEGORIES:
        value = report["categories"].get(cat)
        width = value if value is not None else 0
        ghost = ""
        if baseline and before_cats.get(cat) is not None:
            ghost = f'<span class="ghost" style="left:{before_cats[cat]}%" title="before: {before_cats[cat]}"></span>'
        bars.append(f'<div class="bar"><span>{esc(cat)}</span><span class="track"><span class="fill" '
                    f'style="width:{width}%;background:{_color(value)}"></span>{ghost}</span>'
                    f'<span class="num">{"-" if value is None else value}</span></div>')
    llms = report["llms_txt"]
    llms_tone = "r" if not llms.get("found") or llms.get("html") else ("g" if not llms.get("problems") else "a")
    llms_text = "missing" if not llms.get("found") else ("soft 404" if llms.get("html") else
                                                          ("valid" if not llms.get("problems") else "invalid"))
    sitemap = report["sitemap"]
    sm_tone = "g" if sitemap["found"] and not sitemap.get("errors") and not sitemap.get("bad_locs") else (
        "a" if sitemap["found"] else "r")
    robots_ok = report["robots_txt"]["status"] == 200
    chips = [f'<span class="chip {"r" if report["high"] else "g"}">{report["high"]} high</span>',
             f'<span class="chip {llms_tone}">llms.txt {esc(llms_text)}</span>',
             f'<span class="chip {sm_tone}">sitemap {sitemap["urls"] if sitemap["found"] else "missing"}</span>',
             f'<span class="chip {"g" if robots_ok else "a"}">robots.txt {"ok" if robots_ok else "missing"}</span>']
    compare = ""
    if baseline:
        delta = score_value - baseline.get("score", 0)
        before_high = baseline.get("high", 0)
        compare = (f'<h2>Before / after</h2><div class="top"><div><div class="delta">{baseline.get("score")} &rarr; '
                   f'{score_value} <span class="chip {"g" if delta >= 0 else "r"}">{delta:+d}</span></div>'
                   f'<div class="sub">high: {before_high} &rarr; {report["high"]} &middot; marker on each bar = before'
                   f'</div></div></div>')
    bot_cards = []
    for purpose, label in (("answers", "Answer / search crawlers"), ("training", "Training crawlers")):
        rows = []
        for token, info in report["ai_crawlers"].items():
            if info["purpose"] != purpose:
                continue
            tone = {"allowed": "g", "partial": "a", "blocked": "r" if purpose == "answers" else "n"}[info["state"]]
            rows.append(f'<div class="bot"><span>{esc(token)}</span><span class="chip {tone}">'
                        f'{esc(info["state"])}</span></div>')
        bot_cards.append(f'<div class="card"><h3>{label}</h3>{"".join(rows)}</div>')
    fixes = []
    ranked = [f for f in report["findings"] if f["severity"] != "info"][:12]
    for index, f in enumerate(ranked, 1):
        tone = {"high": "r", "medium": "a", "low": "n"}[f["severity"]]
        example = f["details"][0] if f["details"] else (f["urls"][0] if f["urls"] else "")
        fixes.append(f'<tr><td>{index}</td><td><span class="chip {tone}">{esc(f["severity"])}</span></td>'
                     f'<td><b>{esc(f["title"])}</b><div class="fix">{esc(f["fix"])}</div></td>'
                     f'<td class="num">{f["count"]}/{f["checked"]}</td><td class="x hide">{esc(example[:120])}</td></tr>')
    if not fixes:
        fixes.append('<tr><td colspan="5">No failing rules.</td></tr>')
    when = time.strftime("%Y-%m-%d")
    mode = "local build" if report["mode"] == "local" else "live crawl"
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>SEO + AI search report: {esc(report['site'])}</title>
<style>{REPORT_CSS}</style></head><body><div class="w">
<h1>SEO + AI search report</h1><div class="sub">{esc(report['site'])} &middot; {when} &middot; {report['pages_crawled']} pages &middot; {mode}</div>
<h2>Score</h2><div class="top"><div class="dial">{dial}<b>of 100</b></div><div class="bars">{''.join(bars)}</div></div>
<div class="chips">{''.join(chips)}</div>{compare}
<h2>AI crawlers (robots.txt)</h2><div class="bots">{''.join(bot_cards)}</div>
<h2>Fix first</h2><table><tr><th>#</th><th>Severity</th><th>Issue and fix</th><th>Failing</th><th class="hide">Example</th></tr>
{''.join(fixes)}</table>
<footer>geo-seo-audit {VERSION} &middot; measured from the HTML and robots.txt; not a ranking or citation forecast.</footer>
</div></body></html>
"""


def guess_base(root: Path) -> tuple[str, bool]:
    index = root / "index.html"
    if index.is_file() and not index.is_symlink() and root.resolve() in index.resolve().parents and index.stat().st_size <= MAX_BODY:
        parser = parse_page(index.read_text(encoding="utf-8", errors="replace"))
        for candidate in [tag.get("href", "") for tag in parser.link_tags
                          if "canonical" in tag.get("rel", "").lower().split()] + [meta_content(parser, "og:url") or ""]:
            if re.match(r"^https?://", candidate):
                parts = urlparse.urlsplit(candidate)
                return urlparse.urlunsplit((parts.scheme, parts.netloc, "/", "", "")), False
    return "https://local.invalid/", True


def build_parser() -> argparse.ArgumentParser:
    ap = argparse.ArgumentParser(
        prog="geo_audit.py", description="Crawl a site (or a built static folder) and score SEO + AI-search readiness.",
        epilog="Exit codes: 0 pass, 1 high-severity finding or --min-score not met, 2 usage/fetch error.")
    ap.add_argument("url", nargs="?", help="start URL (https://...). Network mode: polite crawl of this site")
    ap.add_argument("--local", metavar="DIR", help="audit a built static site folder instead (no network)")
    ap.add_argument("--base-url", help="public URL of the --local site (default: from its canonical/og:url)")
    ap.add_argument("--max-pages", type=int, default=50, help="HTML pages to crawl (default 50)")
    ap.add_argument("--delay", type=float, default=1.0, help="seconds between requests (default 1.0; Crawl-delay wins if larger)")
    ap.add_argument("--timeout", type=float, default=15.0, help="seconds per request (default 15)")
    ap.add_argument("--link-budget", type=int, default=20,
                    help="extra HEAD checks for linked pages beyond the crawl (default 20)")
    ap.add_argument("--user-agent", default=USER_AGENT, help="User-Agent header (default identifies geo-seo-audit)")
    ap.add_argument("--json", action="store_true", help="machine-readable report on stdout")
    ap.add_argument("--top", type=int, default=10, help="ranked fixes to show (default 10)")
    ap.add_argument("--min-score", type=int, default=None, help="exit 1 if the overall score is below this")
    ap.add_argument("--baseline", metavar="JSON", help="earlier --json report: print score delta and fixed rules")
    ap.add_argument("--emit-fixes", metavar="DIR", help="write suggested llms.txt, robots.txt, sitemap.xml, JSON-LD, meta fixes to DIR")
    ap.add_argument("--force", action="store_true", help="let --emit-fixes write into a non-empty folder")
    ap.add_argument("--report", metavar="HTML", help="write a one-page, self-contained HTML report for a client")
    ap.add_argument("--list-rules", action="store_true", help="print every rule with category and severity")
    ap.add_argument("--version", action="version", version=f"geo-seo-audit {VERSION}")
    return ap


def main(argv: list[str] | None = None) -> int:
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass
    ap = build_parser()
    args = ap.parse_args(argv)
    if args.list_rules:
        list_rules()
        return 0
    if bool(args.url) == bool(args.local):
        ap.print_usage(sys.stderr)
        sys.stderr.write("error: give a URL or --local DIR (exactly one)\n")
        return 2
    if not 1 <= args.max_pages <= 1000 or not 0 <= args.delay <= 30 or not 0 < args.timeout <= 120 or not 0 <= args.link_budget <= 1000:
        sys.stderr.write("error: --max-pages >= 1, --delay >= 0, --timeout > 0\n")
        return 2
    local_root = None
    guessed = False
    if args.local:
        local_root = Path(args.local).expanduser()
        if not local_root.is_dir():
            sys.stderr.write(f"error: {args.local} is not a folder\n")
            return 2
        local_root = local_root.resolve()
        if args.base_url:
            base = args.base_url if args.base_url.endswith("/") else args.base_url + "/"
        else:
            base, guessed = guess_base(local_root)
        if not re.match(r"^https?://[^/]+", base):
            sys.stderr.write("error: --base-url must look like https://example.com/\n")
            return 2
        fetcher = LocalFetcher(local_root, base)
        start = base
    else:
        start = args.url if re.match(r"^https?://", args.url) else "https://" + args.url
        if not urlparse.urlsplit(start).netloc:
            sys.stderr.write(f"error: not a URL: {args.url}\n")
            return 2
        fetcher = HttpFetcher(args.user_agent, args.timeout, args.delay)
    if args.emit_fixes and local_root is not None:
        target = Path(args.emit_fixes).expanduser().resolve()
        if target == local_root or local_root in target.parents:
            sys.stderr.write("error: --emit-fixes must be outside the audited folder (it never writes into your site)\n")
            return 2
    if args.emit_fixes and not args.force and not emit_dir_ok(Path(args.emit_fixes).expanduser()):
        sys.stderr.write(f"error: {args.emit_fixes} is not empty and was not written by geo-seo-audit; "
                         "pick an empty folder (or pass --force to overwrite files there)\n")
        return 2
    baseline = None
    if args.baseline:
        try:
            baseline = json.loads(Path(args.baseline).read_text(encoding="utf-8-sig"))
        except (OSError, json.JSONDecodeError) as exc:
            sys.stderr.write(f"error: cannot read baseline {args.baseline}: {exc}\n")
            return 2
    audit = Audit(fetcher, start, args.max_pages, args.link_budget, local_root)
    audit.local_base_guessed = guessed
    try:
        audit.run()
    except SystemExit as exc:
        sys.stderr.write(f"{exc}\n")
        return 2
    if not any(p.ok_html for p in audit.pages.values()):
        first = next(iter(audit.pages.values()), None)
        status = first.status if first else "?"
        sys.stderr.write(f"error: no HTML page could be audited (start page status {status})\n")
        return 2
    run_checks(audit)
    overall, cats, findings = score(audit)
    report = build_report(audit, overall, cats, findings)
    if guessed:
        report["notes"].append("no --base-url and no absolute canonical in index.html: host checks relaxed")
    if audit.fetcher.mode == "network" and audit.fetcher.refused:
        report["notes"].append(f"{len(audit.fetcher.refused)} URL(s) outside the site not fetched")
        report["refused_urls"] = audit.fetcher.refused
    if args.emit_fixes:
        report["emitted"] = emit_fixes(audit, report, Path(args.emit_fixes).expanduser())
    report = sanitize_report(report)
    if args.report:
        try:
            Path(args.report).expanduser().write_text(render_report(report, baseline), encoding="utf-8")
        except OSError as exc:
            sys.stderr.write(f"error: cannot write {args.report}: {exc}\n")
            return 2
    if args.json:
        if baseline:
            report["baseline_score"] = baseline.get("score")
        sys.stdout.write(json.dumps(report, indent=2, ensure_ascii=False) + "\n")
    else:
        print_human(report, args.top, baseline)
        if args.emit_fixes:
            sys.stdout.write(f"wrote to {args.emit_fixes}: {', '.join(report['emitted'])}\n")
        if args.report:
            sys.stdout.write(f"report: {args.report}\n")
    failed = report["high"] > 0 or (args.min_score is not None and overall < args.min_score)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
