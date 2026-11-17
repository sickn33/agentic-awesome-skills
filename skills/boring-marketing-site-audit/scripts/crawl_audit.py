#!/usr/bin/env python3
"""Crawl a site politely and write the findings file for a technical SEO and AI-readiness audit.

Usage:
  crawl_audit.py URL [--mode full|quick] [--max-pages N] [--out DIR]
                 [--concurrency N] [--delay SECONDS] [--max-minutes N]
                 [--no-psi] [--psi-templates N] [--no-bot-check]
                 [--compare PATH|auto] [--rendered FILE] [--render firecrawl]
                 [--render-limit N] [--timeout SECONDS]

What it does, in order: reads robots.txt (and honors it for its own crawling), reads the
sitemaps, fetches the homepage, crawls same-site links breadth first (default 200 pages,
hard cap 1,000, about 4 requests in flight with a small gap between request starts),
checks unfetched internal link targets, compares how the homepage answers a browser and
each major AI crawler, runs Google's PageSpeed Insights on the homepage and a few key
templates, then turns what it saw into findings.

Writes <out>/findings.json (findings, site-level facts, Core Web Vitals, changes since
the last run) and <out>/pages.jsonl (one record per fetched page), then prints a short
summary. Every finding carries the observation behind it. Anything that could not be
checked is listed under not_checked, never reported as fine.

Python 3 standard library only. PAGESPEED_API_KEY, CRUX_API_KEY and FIRECRAWL_API_KEY are
read from the environment when present and never printed.
"""
from __future__ import annotations

import argparse
import datetime as dt
import gzip
import hashlib
import json
import math
import os
import random
import re
import socket
import ssl
import string
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import zlib
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
from pathlib import Path
from xml.etree import ElementTree

VERSION = "1.0.0"
TOOL_TOKEN = "BoringSiteAudit"
TOOL_UA = (
    f"Mozilla/5.0 (compatible; {TOOL_TOKEN}/{VERSION}; technical SEO audit; "
    "+https://github.com/boringmarketer/boring-marketing-skills)"
)
BROWSER_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)
DEFAULT_MAX_PAGES = 200
QUICK_MAX_PAGES = 20
HARD_CAP_PAGES = 1000
MAX_BODY_BYTES = 5 * 1024 * 1024
MAX_SITEMAP_BYTES = 10 * 1024 * 1024
MAX_SITEMAP_URLS = 50000
MAX_REDIRECTS = 5
MAX_QUERY_VARIANTS_PER_PATH = 3
ROBOTS_GOOGLE_LIMIT = 500 * 1024
PSI_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"
CRUX_ENDPOINT = "https://chromeuxreport.googleapis.com/v1/records:queryRecord"
FIRECRAWL_ENDPOINT = "https://api.firecrawl.dev/v2/scrape"

# Crawlers whose access matters for being found. role: search-engine, search, user-fetch,
# training, mixed. ua is the string sent in the edge test (None = not tested: Googlebot and
# Bingbot are never imitated because their CDNs verify them by IP, and Google-Extended
# and Applebot-Extended have no request user agent of their own). The strings follow the
# vendors' published formats; edge rules match on the product token.
AI_BOTS = [
    {"token": "Googlebot", "vendor": "Google", "role": "search-engine", "ua": None,
     "blocking_costs": "Google Search, including AI Overviews and AI Mode, which draw on the same index."},
    {"token": "Bingbot", "vendor": "Microsoft", "role": "search-engine", "ua": None,
     "blocking_costs": "Bing and the Copilot answers built on it."},
    {"token": "OAI-SearchBot", "vendor": "OpenAI", "role": "search",
     "ua": "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.4; +https://openai.com/searchbot",
     "blocking_costs": "Pages can't be shown as sources in ChatGPT search answers (OpenAI: they may still appear as navigational links)."},
    {"token": "ChatGPT-User", "vendor": "OpenAI", "role": "user-fetch",
     "ua": "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot",
     "blocking_costs": "ChatGPT can't open the page when a person asks it to. OpenAI says robots.txt may not apply to these user-initiated visits, so an edge block matters more than a robots rule."},
    {"token": "GPTBot", "vendor": "OpenAI", "role": "training",
     "ua": "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.4; +https://openai.com/gptbot",
     "blocking_costs": "Content is left out of OpenAI model training. It does not remove the site from ChatGPT search."},
    {"token": "Claude-SearchBot", "vendor": "Anthropic", "role": "search",
     "ua": "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Claude-SearchBot/1.0; +https://www.anthropic.com)",
     "blocking_costs": "Anthropic says blocking it may reduce the site's visibility and accuracy in Claude's search results."},
    {"token": "Claude-User", "vendor": "Anthropic", "role": "user-fetch",
     "ua": "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Claude-User/1.0; +https://www.anthropic.com)",
     "blocking_costs": "Claude can't fetch the page when a person asks about it."},
    {"token": "ClaudeBot", "vendor": "Anthropic", "role": "training",
     "ua": "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)",
     "blocking_costs": "Content is left out of Anthropic model training. It does not stop Claude-SearchBot or Claude-User."},
    {"token": "PerplexityBot", "vendor": "Perplexity", "role": "search",
     "ua": "Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)",
     "blocking_costs": "Pages can't be surfaced and linked in Perplexity's answers."},
    {"token": "Perplexity-User", "vendor": "Perplexity", "role": "user-fetch",
     "ua": "Mozilla/5.0 (compatible; Perplexity-User/1.0; +https://perplexity.ai/perplexity-user)",
     "blocking_costs": "Perplexity can't fetch the page for a person's question. Perplexity says this fetcher generally ignores robots.txt, so only an edge block stops it."},
    {"token": "Google-Extended", "vendor": "Google", "role": "training", "ua": None,
     "blocking_costs": "Content is not used for Gemini training or for grounding in Gemini Apps. Google says it does not affect Google Search."},
    {"token": "Applebot-Extended", "vendor": "Apple", "role": "training", "ua": None,
     "blocking_costs": "Apple's control token for AI training; blocking it opts the site out of that use."},
    {"token": "CCBot", "vendor": "Common Crawl", "role": "training",
     "ua": "CCBot/2.0 (https://commoncrawl.org/faq/)",
     "blocking_costs": "The site is left out of the Common Crawl dataset."},
    {"token": "meta-externalagent", "vendor": "Meta", "role": "training",
     "ua": "meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)",
     "blocking_costs": "Meta's AI crawler can't read the site."},
    {"token": "Bytespider", "vendor": "ByteDance", "role": "training",
     "ua": "Mozilla/5.0 (Linux; Android 5.0) AppleWebKit/537.36 (KHTML, like Gecko) Mobile Safari/537.36 (compatible; Bytespider; spider-feedback@bytedance.com)",
     "blocking_costs": "ByteDance's crawler can't read the site."},
    {"token": "Amazonbot", "vendor": "Amazon", "role": "mixed",
     "ua": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/600.2.5 (KHTML, like Gecko) Version/8.0.2 Safari/600.2.5 (Amazonbot/0.1; +https://developer.amazon.com/support/amazonbot)",
     "blocking_costs": "Amazon's crawler can't read the site."},
    {"token": "cohere-ai", "vendor": "Cohere", "role": "training", "ua": None,
     "blocking_costs": "Cohere's crawler token is opted out."},
    {"token": "AI2Bot", "vendor": "Allen Institute for AI", "role": "training", "ua": None,
     "blocking_costs": "AI2's crawler can't read the site."},
    {"token": "Timpibot", "vendor": "Timpi", "role": "training", "ua": None,
     "blocking_costs": "Timpi's crawler can't read the site."},
    {"token": "FacebookBot", "vendor": "Meta", "role": "training", "ua": None,
     "blocking_costs": "This older Meta crawler can't read the site."},
]
QUICK_EDGE_BOTS = ("OAI-SearchBot", "ChatGPT-User", "GPTBot", "Claude-SearchBot", "ClaudeBot", "PerplexityBot")
VISIBILITY_ROLES = ("search-engine", "search", "user-fetch")

AUTH_PATTERNS = ("/login", "/signin", "/sign-in", "/signup", "/sign-up", "/register", "/forgot",
                 "/reset-password", "/account", "/my-account", "/auth", "/sso", "/callback", "/wp-admin", "/wp-login")
UTILITY_PATTERNS = ("/cart", "/checkout", "/thank", "/privacy", "/terms", "/legal", "/cookie",
                    "/search", "/404", "/500", "/unsubscribe", "/feed", "/tag/", "/author/", "/page/")
ARTICLE_PATH = re.compile(r"/(blog|blogs|news|articles?|posts?|journal|insights|resources|guides?|learn|library|knowledge|faq|faqs|stories)(/|$)", re.I)
KEY_PATH = re.compile(
    r"/(services?|our-services|what-we-do|products?|shop|store|collections?|pricing|prices|plans|"
    r"locations?|areas?|service-areas?|areas-we-serve|contact|contact-us|book|booking|schedule|"
    r"quote|get-a-quote|estimate|free-estimate|menu|order|solutions?|features?|demo|request-a-demo)(/|$|-)",
    re.I,
)
CONTENT_SCHEMA_TYPES = {"Article", "BlogPosting", "NewsArticle", "TechArticle", "ScholarlyArticle", "Report", "HowTo"}
ORG_TYPES = {
    "Organization", "Corporation", "LocalBusiness", "ProfessionalService", "HomeAndConstructionBusiness",
    "Plumber", "Electrician", "HVACBusiness", "RoofingContractor", "GeneralContractor", "HousePainter",
    "Locksmith", "MovingCompany", "AutoRepair", "AutomotiveBusiness", "Dentist", "Physician",
    "MedicalBusiness", "MedicalClinic", "LegalService", "Attorney", "Restaurant", "FoodEstablishment",
    "Store", "OnlineStore", "OnlineBusiness", "NGO", "EducationalOrganization", "FinancialService",
    "InsuranceAgency", "RealEstateAgent", "HealthAndBeautyBusiness", "SportsActivityLocation",
    "LodgingBusiness", "Hotel", "ChildCare", "EmergencyService", "Optician", "VeterinaryCare",
}
REQUIRED_PROPS = {
    "Organization": ("name",), "LocalBusiness": ("name", "address"), "Product": ("name",),
    "Article": ("headline",), "BlogPosting": ("headline",), "NewsArticle": ("headline",),
    "FAQPage": ("mainEntity",), "BreadcrumbList": ("itemListElement",),
    "Event": ("name", "startDate", "location"), "Recipe": ("name",), "VideoObject": ("name", "thumbnailUrl", "uploadDate"),
}
SOCIAL_HOSTS = ("facebook.com", "twitter.com", "x.com", "instagram.com", "linkedin.com", "pinterest.com",
                "tiktok.com", "wa.me", "whatsapp.com", "t.me", "reddit.com/submit", "addtoany.com", "sharethis.com")
NON_HTML_EXT = re.compile(
    r"\.(jpe?g|png|gif|webp|avif|svg|ico|bmp|tiff?|pdf|zip|gz|rar|7z|mp4|mov|webm|mp3|wav|ogg|"
    r"css|js|mjs|json|xml|txt|csv|xlsx?|docx?|pptx?|woff2?|ttf|eot|otf|dmg|exe|apk)$",
    re.I,
)
SEVERITY_ORDER = {"critical": 4, "high": 3, "medium": 2, "low": 1, "info": 0}
SEVERITY_WEIGHT = {"critical": 100.0, "high": 40.0, "medium": 12.0, "low": 3.0, "info": 0.5}
CWV_THRESHOLDS = {  # good at or under the first value, poor above the second (Google's published thresholds)
    "lcp_ms": (2500, 4000), "inp_ms": (200, 500), "cls": (0.1, 0.25),
    "fcp_ms": (1800, 3000), "ttfb_ms": (800, 1800),
}


# ----------------------------------------------------------------------------- small helpers

def now_iso():
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()


def today():
    return dt.date.today()


def words_in(text):
    return re.findall(r"[^\W_]+(?:['\u2019-][^\W_]+)*", text or "")


def clip(text, n=160):
    text = " ".join((text or "").split())
    return text if len(text) <= n else text[: n - 3].rstrip() + "..."


def host_of(url):
    try:
        return (urllib.parse.urlsplit(url).hostname or "").lower()
    except ValueError:
        return ""


def variant_hosts(host):
    host = host.lower()
    if not host or re.fullmatch(r"[\d.]+|\[.*\]|localhost", host):
        return {host}
    return {host, host[4:] if host.startswith("www.") else "www." + host}


def normalize_url(url, base=None):
    """Absolute http(s) URL without fragment, default port or empty path. None if unusable."""
    if not url:
        return None
    url = url.strip()
    if base:
        try:
            url = urllib.parse.urljoin(base, url)
        except ValueError:
            return None
    try:
        parts = urllib.parse.urlsplit(url)
        port = parts.port
    except ValueError:
        return None
    scheme = parts.scheme.lower()
    if scheme not in ("http", "https") or not parts.hostname:
        return None
    host = parts.hostname.lower()
    if ":" in host:
        host = f"[{host}]"
    netloc = host if port is None or (scheme, port) in (("http", 80), ("https", 443)) else f"{host}:{port}"
    path = parts.path or "/"
    path = re.sub(r"[^\x21-\x7e]", lambda m: urllib.parse.quote(m.group(0)), path)
    return urllib.parse.urlunsplit((scheme, netloc, path, parts.query, ""))


def path_of(url):
    parts = urllib.parse.urlsplit(url)
    return (parts.path or "/") + (("?" + parts.query) if parts.query else "")


def same_page(a, b):
    """Compare two URLs the way a canonical check should: ignore a trailing slash and case of host."""
    if not a or not b:
        return False
    na, nb = normalize_url(a), normalize_url(b)
    if not na or not nb:
        return False
    return na.rstrip("/") == nb.rstrip("/")


MONTHS = {m: i for i, m in enumerate(
    ["january", "february", "march", "april", "may", "june", "july", "august", "september",
     "october", "november", "december"], start=1)}
MONTHS.update({k[:3]: v for k, v in list(MONTHS.items())})
MONTHS["sept"] = 9
MONTH_RE = r"(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?"
DATE_TEXT_RE = re.compile(
    rf"\b(?:{MONTH_RE}\s+\d{{1,2}}(?:st|nd|rd|th)?,?\s+\d{{4}}|\d{{1,2}}(?:st|nd|rd|th)?\s+{MONTH_RE},?\s+\d{{4}}|\d{{4}}-\d{{2}}-\d{{2}})\b",
    re.I,
)
LABELLED_DATE_RE = re.compile(
    rf"\b(?:last\s+updated|updated|published|posted|reviewed|modified|written)\b(?:\s+on)?:?\s*"
    rf"((?:{MONTH_RE}\s+\d{{1,2}}(?:st|nd|rd|th)?,?\s+\d{{4}})|(?:\d{{1,2}}(?:st|nd|rd|th)?\s+{MONTH_RE},?\s+\d{{4}})|\d{{4}}-\d{{2}}-\d{{2}})",
    re.I,
)


def _month(token):
    t = token.lower().rstrip(".")
    return MONTHS.get(t) or MONTHS.get(t[:3])


def parse_date(value):
    """Parse ISO or month-name dates. Returns a date or None. Never guesses day/month order."""
    if not value:
        return None
    value = str(value).strip()
    m = re.match(r"(\d{4})-(\d{2})-(\d{2})", value)
    if m:
        try:
            return dt.date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        except ValueError:
            return None
    m = re.match(rf"({MONTH_RE})\s+(\d{{1,2}})(?:st|nd|rd|th)?,?\s+(\d{{4}})", value, re.I)
    if m:
        mon = _month(m.group(1))
        try:
            return dt.date(int(m.group(3)), mon, int(m.group(2))) if mon else None
        except ValueError:
            return None
    m = re.match(rf"(\d{{1,2}})(?:st|nd|rd|th)?\s+({MONTH_RE}),?\s+(\d{{4}})", value, re.I)
    if m:
        mon = _month(m.group(2))
        try:
            return dt.date(int(m.group(3)), mon, int(m.group(1))) if mon else None
        except ValueError:
            return None
    return None


def redact(text, secrets):
    text = str(text)
    for secret in secrets:
        if secret:
            text = text.replace(secret, "<key>")
    return text


# ----------------------------------------------------------------------------- HTTP

class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):  # noqa: D401
        return None


_OPENER = urllib.request.build_opener(_NoRedirect)


def _decode_body(raw, headers):
    encoding = (headers.get("content-encoding") or "").lower()
    if raw and ("gzip" in encoding or raw[:2] == b"\x1f\x8b"):
        try:
            d = zlib.decompressobj(16 + zlib.MAX_WBITS)
            raw = d.decompress(raw, MAX_BODY_BYTES)
        except zlib.error:
            pass
    elif raw and "deflate" in encoding:
        try:
            raw = zlib.decompress(raw)
        except zlib.error:
            pass
    return raw


def charset_of(content_type, raw):
    m = re.search(r"charset=([\w.:-]+)", content_type or "", re.I)
    if not m and raw:
        m = re.search(rb"<meta[^>]+charset=[\"']?([\w.:-]+)", raw[:4096], re.I)
        if m:
            m = re.match(r"(.*)", m.group(1).decode("ascii", "ignore"))
    name = m.group(1) if m else "utf-8"
    try:
        import codecs
        codecs.lookup(name)
        return name
    except LookupError:
        return "utf-8"


class Fetcher:
    """Polite HTTP client: a minimum gap between request starts, bounded bodies, manual redirects."""

    def __init__(self, ua=TOOL_UA, timeout=20.0, delay=0.25):
        self.ua = ua
        self.timeout = timeout
        self.delay = delay
        self.requests = 0
        self._lock = threading.Lock()
        self._next = 0.0

    def _turn(self):
        with self._lock:
            now = time.monotonic()
            slot = max(now, self._next)
            self._next = slot + self.delay
            self.requests += 1
        if slot > now:
            time.sleep(slot - now)

    def one(self, url, method="GET", ua=None, accept=None, max_body=MAX_BODY_BYTES):
        """One request, no redirect following. Returns a dict; status 0 means no HTTP answer."""
        self._turn()
        headers = {
            "User-Agent": ua or self.ua,
            "Accept": accept or "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.8",
            "Accept-Encoding": "gzip",
        }
        req = urllib.request.Request(url, headers=headers, method=method)
        start = time.monotonic()
        out = {"url": url, "status": 0, "headers": {}, "body": b"", "ttfb_ms": None, "total_ms": None,
               "error": None, "truncated": False}
        resp = None
        try:
            try:
                resp = _OPENER.open(req, timeout=self.timeout)
            except urllib.error.HTTPError as err:
                resp = err
            out["ttfb_ms"] = int((time.monotonic() - start) * 1000)
            out["status"] = int(getattr(resp, "status", None) or resp.getcode() or 0)
            hdrs = {}
            for k, v in resp.headers.items():
                k = k.lower()
                hdrs[k] = (hdrs[k] + ", " + v) if k in hdrs else v
            out["headers"] = hdrs
            if method != "HEAD":
                raw = resp.read(max_body + 1)
                if len(raw) > max_body:
                    raw = raw[:max_body]
                    out["truncated"] = True
                out["body"] = _decode_body(raw, hdrs)
        except ssl.SSLError as err:
            out["error"] = f"TLS error: {err}"
        except urllib.error.URLError as err:
            reason = getattr(err, "reason", err)
            if isinstance(reason, ssl.SSLError) or "CERTIFICATE" in str(reason).upper():
                out["error"] = f"TLS error: {reason}"
            else:
                out["error"] = f"network error: {reason}"
        except (socket.timeout, TimeoutError):
            out["error"] = "timed out"
        except (ConnectionError, OSError, ValueError) as err:
            out["error"] = f"network error: {err}"
        except Exception as err:  # http.client oddities (IncompleteRead, bad status line)
            out["error"] = f"network error: {type(err).__name__}: {err}"
        finally:
            try:
                if resp is not None:
                    resp.close()
            except Exception:
                pass
        out["total_ms"] = int((time.monotonic() - start) * 1000)
        return out

    def get(self, url, method="GET", ua=None, accept=None, max_body=MAX_BODY_BYTES):
        """Follow up to MAX_REDIRECTS hops. Returns the final response plus the hop chain."""
        chain = []
        current = url
        seen = set()
        first_ttfb = None
        while True:
            res = self.one(current, method=method, ua=ua, accept=accept, max_body=max_body)
            if first_ttfb is None:
                first_ttfb = res["ttfb_ms"]
            status = res["status"]
            if status in (301, 302, 303, 307, 308):
                loc = res["headers"].get("location")
                nxt = normalize_url(loc, current) if loc else None
                chain.append({"url": current, "status": status, "location": nxt})
                if not nxt:
                    res["error"] = res["error"] or "redirect without a usable Location header"
                    break
                if nxt in seen or len(chain) > MAX_REDIRECTS:
                    res["error"] = "redirect loop" if nxt in seen else f"more than {MAX_REDIRECTS} redirect hops"
                    res["loop"] = nxt in seen
                    break
                seen.add(current)
                current = nxt
                continue
            break
        res["requested_url"] = url
        res["final_url"] = current
        res["chain"] = chain
        res["first_ttfb_ms"] = first_ttfb
        return res


# ----------------------------------------------------------------------------- HTML tree

VOID_TAGS = frozenset("area base br col embed hr img input keygen link meta param source track wbr".split())
P_CLOSERS = frozenset(
    "address article aside blockquote details dialog div dl fieldset figcaption figure footer form "
    "h1 h2 h3 h4 h5 h6 header hgroup hr main menu nav ol p pre section table ul".split()
)
NO_TEXT_TAGS = frozenset("script style noscript template svg head title iframe object canvas select option datalist".split())
BOILERPLATE_TAGS = frozenset("nav header footer aside".split())
BOILERPLATE_ROLES = frozenset("navigation banner contentinfo complementary search".split())
BLOCK_TAGS = frozenset(
    "address article aside blockquote br dd details div dl dt fieldset figcaption figure footer form "
    "h1 h2 h3 h4 h5 h6 header hr li main nav ol p pre section table td th tr ul body html".split()
)
HEADING_TAGS = ("h1", "h2", "h3", "h4", "h5", "h6")


class Node:
    __slots__ = ("tag", "attrs", "children", "parent")

    def __init__(self, tag, attrs, parent):
        self.tag = tag
        self.attrs = attrs
        self.children = []
        self.parent = parent

    def get(self, name, default=None):
        return self.attrs.get(name, default)


class _TreeBuilder(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node("#root", {}, None)
        self.stack = [self.root]

    def _close_until(self, targets, stops):
        for i in range(len(self.stack) - 1, 0, -1):
            tag = self.stack[i].tag
            if tag in targets:
                del self.stack[i:]
                return
            if tag in stops:
                return

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        attrd = {}
        for key, value in attrs:
            key = key.lower()
            if key not in attrd:
                attrd[key] = value if value is not None else ""
        top = self.stack[-1].tag
        if top == "p" and tag in P_CLOSERS:
            self.stack.pop()
        elif tag == "li":
            self._close_until({"li"}, {"ul", "ol", "menu"})
        elif tag in ("dt", "dd"):
            self._close_until({"dt", "dd"}, {"dl"})
        elif tag == "tr":
            self._close_until({"tr"}, {"table", "tbody", "thead", "tfoot"})
        elif tag in ("td", "th"):
            self._close_until({"td", "th"}, {"tr", "table"})
        elif tag == "option" and top == "option":
            self.stack.pop()
        node = Node(tag, attrd, self.stack[-1])
        self.stack[-1].children.append(node)
        if tag not in VOID_TAGS:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag in VOID_TAGS:
            return
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                del self.stack[i:]
                return

    def handle_data(self, data):
        if data:
            self.stack[-1].children.append(data)


def parse_html(text):
    builder = _TreeBuilder()
    try:
        builder.feed(text)
        builder.close()
    except Exception:
        pass  # keep whatever was built; malformed tails are common
    return builder.root


def iter_nodes(node):
    stack = [node]
    while stack:
        n = stack.pop()
        yield n
        kids = [c for c in n.children if isinstance(c, Node)]
        stack.extend(reversed(kids))


def find_all(root, *tags):
    tags = set(tags)
    return [n for n in iter_nodes(root) if n.tag in tags]


def first(root, tag):
    for n in iter_nodes(root):
        if n.tag == tag:
            return n
    return None


def is_boilerplate(node):
    return node.tag in BOILERPLATE_TAGS or (node.get("role") or "").lower() in BOILERPLATE_ROLES


def text_of(node, skip_boilerplate=False):
    out = []
    stack = [node]
    while stack:
        n = stack.pop()
        if isinstance(n, str):
            out.append(n)
            continue
        if n.tag in NO_TEXT_TAGS or "hidden" in n.attrs:
            continue
        if skip_boilerplate and n is not node and is_boilerplate(n):
            continue
        if n.tag in BLOCK_TAGS:
            out.append(" ")
        stack.extend(reversed(n.children))
    return " ".join("".join(out).split())


def ancestors(node):
    p = node.parent
    while p is not None:
        yield p
        p = p.parent


def position_of(node):
    for a in ancestors(node):
        if a.tag == "nav" or (a.get("role") or "").lower() == "navigation":
            return "nav"
        if a.tag == "header" or (a.get("role") or "").lower() == "banner":
            # a header inside an article is part of the content
            if any(x.tag in ("article", "main") for x in ancestors(a)):
                continue
            return "header"
        if a.tag == "footer" or (a.get("role") or "").lower() == "contentinfo":
            if any(x.tag in ("article", "main") for x in ancestors(a)):
                continue
            return "footer"
        if a.tag == "aside":
            return "aside"
        if a.tag in ("main", "article") or (a.get("role") or "").lower() == "main":
            return "content"
    return "other"


def main_nodes(root):
    """The page's main content: <main> or role=main, else top-level <article>s, else <body>."""
    mains = [n for n in iter_nodes(root) if n.tag == "main" or (n.get("role") or "").lower() == "main"]
    if mains:
        return mains[:1]
    articles = [n for n in iter_nodes(root) if n.tag == "article" and not any(a.tag == "article" for a in ancestors(n))]
    if articles:
        return articles
    body = first(root, "body")
    return [body or root]


# ----------------------------------------------------------------------------- page extraction

STAT_RE = re.compile(
    r"(?:[$\u20ac\u00a3]\s?\d[\d,]*(?:\.\d+)?(?:\s?(?:k|m|bn|million|billion|thousand)\b)?)"
    r"|(?:\b\d+(?:\.\d+)?\s?%)"
    r"|(?:\b\d+(?:\.\d+)?\s(?:percent|million|billion|thousand)\b)"
    r"|(?:\b\d{1,3}(?:,\d{3})+\b)"
    r"|(?:\b\d+(?:\.\d+)?x\b)"
    r"|(?:\b\d+\+)"
    r"|(?:\b\d+\s(?:in|out of)\s\d+\b)",
    re.I,
)
QUOTE_RE = re.compile(r"[\"\u201c]([^\"\u201d]{20,500})[\"\u201d]")
QUESTION_START = re.compile(
    r"^(how (much|long|many|often|do|does|to|can|should)|what (is|are|does|do|should)|why (do|does|is|are|should)|"
    r"can (i|you|we)|do (i|you|we)|does |is (it|there|my)|are (there|you)|should (i|you|we)|when (should|do|is|does)|"
    r"where (do|can|is)|which )",
    re.I,
)
DANGLING_START = {"it", "this", "that", "these", "those", "they", "he", "she", "here", "there", "above", "below"}
SHELL_MARKERS = re.compile(
    r"<div[^>]+id=[\"'](?:root|app|__next|__nuxt|svelte|main-app)[\"'][^>]*>\s*</div>|ng-version=|data-reactroot|"
    r"window\.__NUXT__|__NEXT_DATA__|data-server-rendered|<app-root",
    re.I,
)


def _jsonld_objects(value, out):
    if isinstance(value, list):
        for item in value:
            _jsonld_objects(item, out)
    elif isinstance(value, dict):
        out.append(value)
        for key, child in value.items():
            if key == "@context":
                continue
            if isinstance(child, (list, dict)):
                _jsonld_objects(child, out)


def _types(obj):
    t = obj.get("@type")
    if isinstance(t, str):
        return [t.split("/")[-1]]
    if isinstance(t, list):
        return [x.split("/")[-1] for x in t if isinstance(x, str)]
    return []


def _as_list(value):
    if value is None:
        return []
    return value if isinstance(value, list) else [value]


def _str_value(value):
    if isinstance(value, dict):
        return value.get("name") or value.get("@id") or value.get("url")
    if isinstance(value, list) and value:
        return _str_value(value[0])
    return value if isinstance(value, str) else None


def extract_schema(root):
    """JSON-LD objects, @types, parse errors and light validation; microdata/RDFa types too."""
    objects, errors, top_level = [], [], []
    for node in find_all(root, "script"):
        stype = (node.get("type") or "").lower().split(";")[0].strip()
        if stype != "application/ld+json":
            continue
        raw = "".join(c for c in node.children if isinstance(c, str)).strip()
        if not raw:
            continue
        if raw.startswith("<!--"):
            for ending in ("-->", "--!>"):
                if raw.endswith(ending):
                    raw = raw[4:-len(ending)].strip()
                    break
        try:
            data = json.loads(raw)
        except ValueError as err:
            errors.append(clip(str(err), 120))
            continue
        for item in (data if isinstance(data, list) else [data]):
            if isinstance(item, dict):
                if "@graph" in item and isinstance(item["@graph"], list):
                    top_level.extend(x for x in item["@graph"] if isinstance(x, dict))
                    if item.get("@context") and not any("@context" in x for x in item["@graph"] if isinstance(x, dict)):
                        for x in item["@graph"]:
                            if isinstance(x, dict):
                                x.setdefault("@context", item["@context"])
                else:
                    top_level.append(item)
        _jsonld_objects(data, objects)
    types = []
    for obj in objects:
        types.extend(_types(obj))
    micro = []
    for node in iter_nodes(root):
        itype = node.get("itemtype")
        if itype is not None and "itemscope" in node.attrs:
            micro.extend(x.rstrip("/").split("/")[-1] for x in itype.split() if x)
        rtype = node.get("typeof")
        if rtype:
            micro.extend(x.split(":")[-1].split("/")[-1] for x in rtype.split() if x)
    problems = []
    for obj in top_level:
        otypes = _types(obj)
        if "@context" not in obj:
            problems.append(f"{'/'.join(otypes) or 'object'} has no @context")
        for t in otypes:
            base = "LocalBusiness" if (t in ORG_TYPES and t not in ("Organization", "Corporation", "NGO", "EducationalOrganization")) else t
            for prop in REQUIRED_PROPS.get(base, ()):
                if prop not in obj:
                    problems.append(f"{t} is missing {prop}")
    orgs = []
    for obj in objects:
        otypes = set(_types(obj))
        if otypes & ORG_TYPES or any(t.endswith("Business") for t in otypes):
            orgs.append({
                "types": sorted(otypes),
                "name": _str_value(obj.get("name")),
                "url": _str_value(obj.get("url")),
                "same_as": [s for s in _as_list(obj.get("sameAs")) if isinstance(s, str)],
                "telephone": _str_value(obj.get("telephone")),
                "has_address": bool(obj.get("address")),
                "has_logo": bool(obj.get("logo") or obj.get("image")),
                "has_rating": bool(obj.get("aggregateRating") or obj.get("review")),
            })
    faq_questions = []
    for obj in objects:
        if "Question" in _types(obj):
            name = _str_value(obj.get("name"))
            if name:
                faq_questions.append(name)
    dates = {}
    for obj in objects:
        for key in ("datePublished", "dateModified"):
            if key in obj and key not in dates and isinstance(obj[key], str):
                dates[key] = obj[key]
    authors = []
    for obj in objects:
        for a in _as_list(obj.get("author")):
            name = _str_value(a)
            if name and isinstance(name, str) and not name.startswith("http"):
                authors.append(name)
    return {
        "types": sorted(set(types)),
        "microdata_types": sorted(set(micro)),
        "jsonld_count": len(top_level),
        "parse_errors": errors,
        "problems": problems[:10],
        "orgs": orgs,
        "faq_questions": faq_questions[:50],
        "dates": dates,
        "authors": sorted(set(authors))[:5],
    }


def simhash64(text):
    toks = re.findall(r"\w+", (text or "").lower())
    if len(toks) >= 3:
        toks = [" ".join(toks[i:i + 3]) for i in range(len(toks) - 2)]
    if not toks:
        return 0
    weights = [0] * 64
    for tok in toks:
        h = int.from_bytes(hashlib.md5(tok.encode("utf-8")).digest()[:8], "big")
        for i in range(64):
            weights[i] += 1 if (h >> i) & 1 else -1
    out = 0
    for i in range(64):
        if weights[i] > 0:
            out |= 1 << i
    return out


def hamming(a, b):
    return bin(a ^ b).count("1")


def _meta_map(root):
    meta = defaultdict(list)
    for node in find_all(root, "meta"):
        key = (node.get("name") or node.get("property") or node.get("itemprop") or node.get("http-equiv") or "").strip().lower()
        if key:
            meta[key].append((node.get("content") or "").strip())
    return meta


def _robots_directives(values):
    out = []
    for d in ",".join(values).lower().split(","):
        d = d.strip()
        if d and d not in out:
            out.append(d)
    return out


VALUED_DIRECTIVES = {"unavailable_after", "max-snippet", "max-image-preview", "max-video-preview"}


def x_robots_for_google(header_value):
    """Directives in X-Robots-Tag that apply to Googlebot: unscoped ones and ones scoped to googlebot."""
    if not header_value:
        return []
    out, scope = [], None
    for raw in header_value.split(","):
        tok = raw.strip()
        if not tok:
            continue
        m = re.match(r"^([A-Za-z][\w-]*)\s*:\s*(.*)$", tok)
        if m and m.group(1).lower() not in VALUED_DIRECTIVES:
            scope, tok = m.group(1).lower(), m.group(2).strip()
            if not tok:
                continue
        if scope in (None, "googlebot"):
            out.append(tok.lower())
    return out


def extract_page(url, html, headers=None, status=200):
    """Everything the audit needs from one HTML page. Pure function over the HTML string."""
    headers = headers or {}
    root = parse_html(html)
    meta = _meta_map(root)
    head_title = None
    for node in find_all(root, "title"):
        if not any(a.tag == "svg" for a in ancestors(node)):
            head_title = " ".join("".join(c for c in node.children if isinstance(c, str)).split())
            break
    base_node = first(root, "base")
    base_href = normalize_url(base_node.get("href"), url) if base_node is not None and base_node.get("href") else None
    link_base = base_href or url

    canon_html = []
    hreflang = []
    stylesheets, scripts_src = [], []
    for node in find_all(root, "link"):
        rel = (node.get("rel") or "").lower().split()
        href = node.get("href")
        if "canonical" in rel and href is not None:
            canon_html.append(href.strip())
        if "alternate" in rel and node.get("hreflang") and href:
            hreflang.append({"lang": node.get("hreflang").strip().lower(), "url": normalize_url(href, link_base) or href})
        if "stylesheet" in rel and href:
            stylesheets.append(normalize_url(href, link_base) or href)
    canon_header = None
    link_header = headers.get("link") or ""
    for m in re.finditer(r"<([^>]+)>\s*;[^,]*rel=\"?canonical\"?", link_header, re.I):
        canon_header = m.group(1).strip()
        break
    robots_meta = _robots_directives(meta.get("robots", []))
    googlebot_meta = _robots_directives(meta.get("googlebot", []))
    xrt = headers.get("x-robots-tag")
    google_directives = sorted(set(robots_meta + googlebot_meta + x_robots_for_google(xrt)))
    noindex = any(d in ("noindex", "none") for d in google_directives)
    nofollow = any(d in ("nofollow", "none") for d in google_directives)

    headings = []
    for node in iter_nodes(root):
        if node.tag in HEADING_TAGS:
            headings.append({"level": int(node.tag[1]), "text": clip(text_of(node), 200)})

    mains = main_nodes(root)
    main_text = " ".join(text_of(n, skip_boilerplate=True) for n in mains)
    body = first(root, "body") or root
    body_text = text_of(body)
    words = words_in(main_text)
    word_count = len(words)
    body_words = len(words_in(body_text))

    links_int, links_ext, tel_links = [], [], []
    for node in find_all(root, "a", "area"):
        href = node.get("href")
        if href is None:
            continue
        href = href.strip()
        low = href.lower()
        if low.startswith("tel:"):
            digits = re.sub(r"\D", "", href)
            if digits:
                tel_links.append(digits[-10:])
            continue
        if not href or low.startswith(("#", "mailto:", "javascript:", "data:", "sms:")):
            continue
        target = normalize_url(href, link_base)
        if not target:
            continue
        rel = (node.get("rel") or "").lower().split()
        anchor = text_of(node)
        if not anchor:
            img = first(node, "img")
            anchor = (img.get("alt") if img is not None else None) or node.get("aria-label") or node.get("title") or ""
        entry = {"url": target, "anchor": clip(anchor, 100), "nofollow": "nofollow" in rel or "sponsored" in rel or "ugc" in rel,
                 "pos": position_of(node)}
        (links_int if host_of(target) in variant_hosts(host_of(url)) else links_ext).append(entry)

    images = []
    modern_sources = 0
    for node in find_all(root, "source"):
        if (node.get("type") or "").lower() in ("image/webp", "image/avif"):
            modern_sources += 1
    for node in find_all(root, "img"):
        if any(a.tag == "noscript" for a in ancestors(node)):
            continue  # fallbacks and tracking pixels, not page images
        if (node.get("width"), node.get("height")) in (("1", "1"), ("0", "0")) or re.search(
                r"facebook\.com/tr|google-analytics|doubleclick|bat\.bing\.com|/pixel", node.get("src") or ""):
            continue
        src = node.get("src") or node.get("data-src") or node.get("data-lazy-src") or ""
        if not src and node.get("srcset"):
            src = node.get("srcset").split(",")[0].split()[0]
        if src.startswith("data:") and (node.get("data-src") or node.get("data-lazy-src")):
            src = node.get("data-src") or node.get("data-lazy-src")
        ext = None
        m = re.search(r"\.([a-z0-9]{3,4})(?:$|\?)", src.lower())
        if m:
            ext = m.group(1)
        images.append({
            "src": clip(normalize_url(src, link_base) or src, 300) if not src.startswith("data:") else "data-uri",
            "alt": node.get("alt"),
            "has_dims": bool(node.get("width") and node.get("height")) or bool(re.search(r"(width|height)\s*:", node.get("style") or "")),
            "lazy": (node.get("loading") or "").lower() == "lazy" or bool(node.get("data-src") or node.get("data-lazy-src")),
            "format": ext,
        })

    mixed = []
    if url.startswith("https://"):
        for node in iter_nodes(root):
            attr = None
            kind = None
            if node.tag in ("script", "iframe", "embed"):
                attr, kind = "src", "active"
            elif node.tag == "object":
                attr, kind = "data", "active"
            elif node.tag == "link" and "stylesheet" in (node.get("rel") or "").lower():
                attr, kind = "href", "active"
            elif node.tag in ("img", "video", "audio", "source"):
                attr, kind = "src", "passive"
            if attr and (node.get(attr) or "").strip().lower().startswith("http://"):
                mixed.append({"tag": node.tag, "url": clip(node.get(attr), 200), "kind": kind})
    for node in find_all(root, "script"):
        if node.get("src"):
            scripts_src.append(normalize_url(node.get("src"), link_base) or node.get("src"))

    schema = extract_schema(root)
    if schema["faq_questions"]:
        visible_low = " ".join(body_text.lower().split())
        schema["faq_visible"] = sum(1 for q in schema["faq_questions"] if " ".join(q.lower().split())[:40] in visible_low)

    # Blocks in reading order for answer capsules: headings and paragraphs in the main content.
    blocks = []
    for m_node in mains:
        stack = [m_node]
        while stack:
            n = stack.pop()
            if isinstance(n, str):
                continue
            if n is not m_node and (is_boilerplate(n) or n.tag in NO_TEXT_TAGS):
                continue
            if n.tag in HEADING_TAGS:
                blocks.append(("h", text_of(n), 0))
                continue
            leafish = n.tag == "div" and not any(isinstance(c, Node) and c.tag in BLOCK_TAGS for c in n.children)
            if n.tag == "p" or (leafish and len(words_in(text_of(n))) >= 5):
                blocks.append(("p", text_of(n), len(find_all(n, "a"))))
                continue
            stack.extend(reversed([c for c in n.children if isinstance(c, Node)]))
    question_headings = 0
    capsules = 0
    answer_links = []
    for i, (kind, text, _links) in enumerate(blocks):
        if kind != "h":
            continue
        clean = text.strip()
        if not (clean.endswith("?") or QUESTION_START.match(clean)):
            continue
        question_headings += 1
        for kind2, text2, links2 in blocks[i + 1:i + 4]:
            if kind2 == "h":
                break
            if kind2 == "p" and text2.strip():
                n_words = len(words_in(text2))
                answer_links.append(links2)
                first_word = (words_in(text2)[:1] or [""])[0].lower()
                if 10 <= n_words <= 60 and links2 <= 1 and first_word not in DANGLING_START:
                    capsules += 1
                break

    # Content signals: statistics, quotations, cited sources, dates, author.
    stats = STAT_RE.findall(main_text)
    blockquotes = len([n for m_node in mains for n in find_all(m_node, "blockquote")])
    quotes = [q for q in QUOTE_RE.findall(main_text) if len(words_in(q)) >= 5]
    cited_hosts = set()
    for link in links_ext:
        h = host_of(link["url"])
        if link["pos"] in ("content", "other") and h and not any(s in link["url"] for s in SOCIAL_HOSTS):
            cited_hosts.add(h)
    published = (
        (meta.get("article:published_time") or [None])[0] or schema["dates"].get("datePublished")
        or (meta.get("datepublished") or [None])[0] or (meta.get("date") or [None])[0]
        or (meta.get("publish_date") or [None])[0]
    )
    modified = (
        (meta.get("article:modified_time") or [None])[0] or schema["dates"].get("dateModified")
        or (meta.get("datemodified") or [None])[0] or (meta.get("og:updated_time") or [None])[0]
        or (meta.get("last-modified") or [None])[0]
    )
    time_node = None
    for node in find_all(root, "time"):
        if node.get("datetime"):
            time_node = node.get("datetime")
            break
    visible = LABELLED_DATE_RE.search(main_text)
    visible_date = visible.group(1) if visible else None
    if not visible_date:
        lead = " ".join(main_text.split()[:120])
        m = DATE_TEXT_RE.search(lead)
        visible_date = m.group(0) if m else None
    machine_dates = [parse_date(x) for x in (published, modified, time_node) if x]
    all_dates = [d for d in machine_dates + [parse_date(visible_date)] if d and d <= today()]
    newest = max(all_dates) if all_dates else None
    author = None
    for key in ("author", "article:author"):
        vals = [v for v in meta.get(key, []) if v and not v.startswith("http")]
        if vals:
            author = vals[0]
            break
    if not author and schema["authors"]:
        author = schema["authors"][0]
    if not author:
        for node in iter_nodes(root):
            cls = " ".join([node.get("class") or "", node.get("rel") or "", node.get("itemprop") or ""]).lower()
            if re.search(r"\b(author|byline)\b", cls) or (node.tag == "a" and "author" in (node.get("rel") or "").lower()):
                name = text_of(node)
                if name and len(name) <= 80:
                    author = name
                    break
    if not author:
        m = re.search(r"\bBy\s+([A-Z][a-z]+(?:\s+[A-Z][a-z'.-]+){1,3})\b", " ".join(main_text.split()[:80]))
        if m:
            author = m.group(1)

    norm_main = " ".join(main_text.lower().split())
    html_bytes = len(html.encode("utf-8", "ignore"))
    script_nodes = find_all(root, "script")
    script_count = len([s for s in script_nodes if (s.get("type") or "text/javascript").lower() not in ("application/ld+json", "application/json")])
    shell = body_words < 50 and (script_count >= 1 and (bool(SHELL_MARKERS.search(html[:200000])) or script_count >= 3))
    html_node = first(root, "html")
    viewport = (meta.get("viewport") or [None])[0]
    title = head_title
    return {
        "title": title,
        "title_len": len(title) if title is not None else None,
        "description": (meta.get("description") or [None])[0],
        "canonical_html": canon_html,
        "canonical_header": canon_header,
        "robots_meta": robots_meta,
        "googlebot_meta": googlebot_meta,
        "x_robots_tag": xrt,
        "noindex": noindex,
        "nofollow": nofollow,
        "meta_refresh": (meta.get("refresh") or [None])[0],
        "lang": html_node.get("lang") if html_node is not None else None,
        "viewport": viewport,
        "headings": headings[:60],
        "h1_count": len([h for h in headings if h["level"] == 1]),
        "word_count": word_count,
        "body_words": body_words,
        "html_bytes": html_bytes,
        "script_count": script_count,
        "js_shell": shell,
        "links_internal": links_int[:500],
        "links_external": links_ext[:300],
        "links_internal_total": len(links_int),
        "links_external_total": len(links_ext),
        "tel": sorted(set(tel_links)),
        "images": images[:200],
        "images_total": len(images),
        "modern_sources": modern_sources,
        "mixed_content": mixed[:30],
        "stylesheets": stylesheets[:30],
        "scripts": scripts_src[:40],
        "hreflang": hreflang[:60],
        "og": {k: (meta.get("og:" + k) or [None])[0] for k in ("title", "description", "image", "url", "type", "site_name")},
        "twitter": {k: (meta.get("twitter:" + k) or [None])[0] for k in ("card", "title", "description", "image")},
        "schema": schema,
        "signals": {
            "question_headings": question_headings,
            "answer_capsules": capsules,
            "answer_link_density": round(sum(answer_links) / len(answer_links), 2) if answer_links else 0,
            "stats": len(stats),
            "stats_per_100_words": round(len(stats) * 100.0 / word_count, 2) if word_count else 0,
            "stat_examples": [clip(s, 30) for s in stats[:3]],
            "quotations": blockquotes + len(quotes),
            "cited_sources": len(cited_hosts),
            "published": published,
            "modified": modified,
            "time_element": time_node,
            "visible_date": visible_date,
            "newest_date": newest.isoformat() if newest else None,
            "age_days": (today() - newest).days if newest else None,
            "author": clip(author, 80) if author else None,
        },
        "fingerprint": {
            "exact": hashlib.sha1(norm_main.encode("utf-8")).hexdigest() if word_count >= 50 else None,
            "simhash": format(simhash64(norm_main), "016x") if word_count >= 150 else None,
        },
    }


# ----------------------------------------------------------------------------- robots.txt

def _robots_token(value):
    m = re.match(r"[A-Za-z0-9_-]+|\*", value.strip())
    return m.group(0).lower() if m else ""


def _rule_regex(path):
    out = []
    for ch in path:
        if ch == "*":
            out.append(".*")
        elif ch == "$":
            out.append("$")
        else:
            out.append(re.escape(ch))
    pattern = "".join(out)
    if pattern.endswith("\\$"):
        pattern = pattern[:-2] + "$"
    return re.compile(pattern)


def _norm_path(path):
    try:
        return urllib.parse.quote(urllib.parse.unquote(path), safe="/?=&*$%:@!,;+-._~")
    except Exception:
        return path


class Robots:
    """robots.txt as Google reads it (RFC 9309 plus Google's documented behavior).

    Groups are runs of user-agent lines followed by rules; other fields (sitemap,
    crawl-delay, content-signal) do not end a group. A crawler uses the groups that name
    its product token, merged, or else the merged '*' groups. Specific and '*' groups are
    not combined. The longest matching rule wins and a tie goes to allow. Rules without a
    path are ignored.
    """

    def __init__(self, text):
        self.raw = text or ""
        self.groups = []  # list of {"agents": [...], "rules": [(kind, path, line)], "crawl_delay": x}
        self.sitemaps = []
        self.content_signals = []
        self.invalid_lines = 0
        self.cloudflare_managed = "BEGIN Cloudflare Managed content".lower() in self.raw.lower()
        self._parse()

    def _parse(self):
        text = self.raw.lstrip("\ufeff")
        current = None
        last_was_agent = False
        for number, raw_line in enumerate(re.split(r"\r\n|\r|\n", text), start=1):
            line = raw_line.split("#", 1)[0].strip()
            if not line:
                continue
            if ":" not in line:
                self.invalid_lines += 1
                continue
            field, value = line.split(":", 1)
            field = field.strip().lower()
            value = value.strip()
            if field in ("user-agent", "useragent", "user agent"):
                if not last_was_agent or current is None:
                    current = {"agents": [], "rules": [], "crawl_delay": None}
                    self.groups.append(current)
                current["agents"].append(_robots_token(value))
                last_was_agent = True
                continue
            if field in ("allow", "disallow"):
                last_was_agent = False
                if current is None:
                    self.invalid_lines += 1
                    continue
                current["rules"].append((field, value, f"{field.capitalize()}: {value}"))
                continue
            if field == "sitemap":
                if value and value not in self.sitemaps:
                    self.sitemaps.append(value)
                continue
            if field == "crawl-delay":
                if current is not None:
                    try:
                        current["crawl_delay"] = float(value)
                    except ValueError:
                        pass
                continue
            if field == "content-signal":
                self.content_signals.append(value)
                continue
            # unknown fields (host, clean-param, request-rate) are ignored and do not end a group

    def groups_for(self, token):
        token = token.lower()
        named = [g for g in self.groups if token in g["agents"]]
        if named:
            return named, True
        return [g for g in self.groups if "*" in g["agents"]], False

    def check(self, token, url_or_path):
        """Return (allowed, matched_rule_text or None, named_group: bool)."""
        path = url_or_path
        if "://" in url_or_path:
            path = path_of(url_or_path)
        if not path.startswith("/"):
            path = "/" + path
        if path == "/robots.txt":
            return True, None, False
        groups, named = self.groups_for(token)
        path_n = _norm_path(path)
        best = None  # (length, allow, text)
        for g in groups:
            for kind, rule_path, text in g["rules"]:
                if not rule_path:
                    continue
                rx = _rule_regex(_norm_path(rule_path))
                if rx.match(path_n):
                    length = len(rule_path)
                    allow = kind == "allow"
                    if best is None or length > best[0] or (length == best[0] and allow and not best[1]):
                        best = (length, allow, text)
        if best is None:
            return True, None, named
        return best[1], best[2], named

    def crawl_delay(self, token):
        groups, _ = self.groups_for(token)
        delays = [g["crawl_delay"] for g in groups if g["crawl_delay"] is not None]
        return max(delays) if delays else None

    def policy(self, token, sample_paths=("/",)):
        """Summarize a crawler's access: allowed, blocked, partial. Evidence is the deciding rule."""
        groups, named = self.groups_for(token)
        root_ok, root_rule, _ = self.check(token, "/")
        sample = [p for p in sample_paths if p] or ["/"]
        results = [(p, *self.check(token, p)[:2]) for p in sample]
        blocked = [(p, rule) for p, ok, rule in results if not ok]
        if not root_ok and len(blocked) == len(results):
            state = "blocked"
        elif blocked or not root_ok:
            state = "partial"
        else:
            state = "allowed"
        exceptions = sorted({path for g in groups for kind, path, _ in g["rules"] if kind == "disallow" and path})
        return {
            "state": state,
            "named_group": named,
            "follows": token if named else ("*" if groups else "no rules"),
            "root_rule": root_rule,
            "blocked_examples": [{"path": p, "rule": r} for p, r in blocked[:3]],
            "blocked_count": len(blocked),
            "sample_size": len(results),
            "disallowed_paths": exceptions[:10],
        }


# ----------------------------------------------------------------------------- sitemaps

def parse_sitemap(raw, base_url):
    """Parse one sitemap document (gzip allowed). Refuses DOCTYPE/ENTITY declarations."""
    out = {"kind": None, "urls": [], "children": [], "lastmod": 0, "errors": [], "url_count": 0}
    if raw is None:
        out["errors"].append("no body")
        return out
    if raw[:2] == b"\x1f\x8b":
        try:
            raw = gzip.decompress(raw)[:MAX_SITEMAP_BYTES]
        except (OSError, EOFError):
            out["errors"].append("gzip body could not be decompressed")
            return out
    text = raw.decode("utf-8", "replace") if isinstance(raw, bytes) else raw
    stripped = text.lstrip("\ufeff \t\r\n")
    if stripped[:15].lower().startswith(("<!doctype html", "<html")):
        out["errors"].append("served an HTML page, not XML")
        return out
    if re.search(r"<!\s*(doctype|entity)\b", text, re.I):
        out["errors"].append("XML has a DOCTYPE or ENTITY declaration, not parsed")
        return out
    try:
        root = ElementTree.fromstring(stripped.encode("utf-8"))
    except ElementTree.ParseError as err:
        out["errors"].append(f"XML could not be parsed: {err}")
        return out

    def local(tag):
        return tag.rsplit("}", 1)[-1].lower()

    kind = local(root.tag)
    if kind not in ("urlset", "sitemapindex"):
        out["errors"].append(f"root element is <{kind}>, not urlset or sitemapindex")
        return out
    out["kind"] = kind
    child = "url" if kind == "urlset" else "sitemap"
    for item in root:
        if local(item.tag) != child:
            continue
        loc, lastmod = None, None
        for el in item:
            name = local(el.tag)
            if name == "loc" and el.text:
                loc = el.text.strip()
            elif name == "lastmod" and el.text:
                lastmod = el.text.strip()
        if not loc:
            out["errors"].append(f"<{child}> entry without <loc>")
            continue
        resolved = normalize_url(loc, base_url)
        if not resolved:
            out["errors"].append(f"unusable <loc>: {clip(loc, 80)}")
            continue
        if kind == "urlset":
            out["url_count"] += 1
            if lastmod:
                out["lastmod"] += 1
            if len(out["urls"]) < MAX_SITEMAP_URLS:
                out["urls"].append({"loc": resolved, "lastmod": lastmod})
        else:
            out["children"].append(resolved)
    out["errors"] = out["errors"][:20]
    return out


# ----------------------------------------------------------------------------- page classification

def classify(url, schema_types, home_url):
    path = urllib.parse.urlsplit(url).path.lower() or "/"
    if same_page(url, home_url) or path in ("/", "") or re.fullmatch(r"/index\.\w+", path):
        return "homepage"
    if any(p in path for p in AUTH_PATTERNS):
        return "auth"
    if any(p in path for p in UTILITY_PATTERNS):
        return "utility"
    if KEY_PATH.search(path):
        return "money"
    if set(schema_types) & CONTENT_SCHEMA_TYPES or ARTICLE_PATH.search(path):
        return "article"
    return "general"


def looks_like_html(res):
    ctype = (res.get("headers") or {}).get("content-type", "").lower()
    if "html" in ctype:
        return True
    if not ctype and res.get("body"):
        return res["body"][:500].lstrip().lower().startswith((b"<!doctype html", b"<html"))
    return False


def challenge_markers(res):
    """Name a bot challenge or block page. Generic words only count on a refusal status or a
    tiny page, because normal pages often load reCAPTCHA or Cloudflare's detection script."""
    headers = res.get("headers") or {}
    raw = res.get("body") or b""
    body = raw[:30000].lower()
    refused = res.get("status") in (401, 403, 406, 429, 451, 503)
    tiny = len(raw) < 4000
    if (headers.get("cf-mitigated") or "").lower() == "challenge":
        return "Cloudflare challenge (cf-mitigated header)"
    if b"<title>just a moment...</title>" in body or b"cf_chl_opt" in body or b"cf-chl-" in body:
        return "Cloudflare challenge page"
    if headers.get("x-vercel-mitigated"):
        return "Vercel firewall challenge"
    if (refused or tiny) and b"access denied" in body and b"reference #" in body:
        return "Akamai access-denied page"
    if (refused or tiny) and (b"captcha" in body or b"challenge-platform" in body):
        return "challenge or CAPTCHA page"
    return None


def server_hints(headers):
    hints = []
    h = {k.lower(): v for k, v in (headers or {}).items()}
    if "cf-ray" in h or "cloudflare" in h.get("server", "").lower():
        hints.append("Cloudflare")
    if "x-vercel-id" in h or "vercel" in h.get("server", "").lower():
        hints.append("Vercel")
    if "x-nf-request-id" in h or "netlify" in h.get("server", "").lower():
        hints.append("Netlify")
    if "x-amz-cf-id" in h or "cloudfront" in h.get("via", "").lower():
        hints.append("Amazon CloudFront")
    if "akamai" in h.get("server", "").lower() or "x-akamai-transformed" in h:
        hints.append("Akamai")
    if "x-served-by" in h and "cache-" in h.get("x-served-by", ""):
        hints.append("Fastly")
    if "x-sucuri-id" in h:
        hints.append("Sucuri")
    if "x-shopify-stage" in h or "shopify" in h.get("powered-by", "").lower():
        hints.append("Shopify")
    if "wpe-backend" in h or "x-powered-by" in h and "wp engine" in h.get("x-powered-by", "").lower():
        hints.append("WP Engine")
    if "squarespace" in h.get("server", "").lower():
        hints.append("Squarespace")
    if "x-wix-request-id" in h:
        hints.append("Wix")
    return hints


class Audit:
    def __init__(self, args):
        self.args = args
        self.quick = args.mode == "quick"
        limit = args.max_pages or (QUICK_MAX_PAGES if self.quick else DEFAULT_MAX_PAGES)
        self.max_pages = max(1, min(limit, HARD_CAP_PAGES))
        self.fetcher = Fetcher(timeout=args.timeout, delay=args.delay)
        self.concurrency = max(1, min(args.concurrency, 8))
        self.deadline = time.monotonic() + args.max_minutes * 60
        self.pages = {}          # url -> record
        self.skipped_robots = {}  # url -> rule
        self.link_checks = {}    # url -> {status, final_url, chain, error}
        self.not_checked = []
        self.notes = []
        self.site = {}
        self.cwv = {"source": None, "pages": [], "notes": []}
        self.secrets = [os.environ.get("PAGESPEED_API_KEY"), os.environ.get("CRUX_API_KEY"), os.environ.get("FIRECRAWL_API_KEY")]
        self.truncated = False
        self.started = time.monotonic()

    def log(self, msg):
        if not self.args.quiet:
            print(msg, file=sys.stderr, flush=True)

    def out_of_time(self):
        return time.monotonic() > self.deadline

    # --------------------------------------------------------------- site level

    def fetch_robots(self, origin):
        res = self.fetcher.get(origin + "/robots.txt", accept="text/plain,*/*;q=0.5", max_body=ROBOTS_GOOGLE_LIMIT * 2)
        info = {"url": origin + "/robots.txt", "status": res["status"], "final_url": res["final_url"],
                "error": res["error"], "bytes": len(res["body"] or b""), "state": None}
        body = (res["body"] or b"").decode("utf-8", "replace")
        if res["error"] and not res["status"]:
            info["state"] = "unreachable"
        elif 200 <= res["status"] < 300:
            if looks_like_html(res) or body.lstrip().lower().startswith(("<!doctype html", "<html")):
                info["state"] = "html"
            else:
                info["state"] = "present"
        elif res["status"] == 429:
            info["state"] = "rate-limited"
        elif 400 <= res["status"] < 500:
            info["state"] = "absent"
        elif res["status"] >= 500:
            info["state"] = "server-error"
        else:
            info["state"] = "unknown"
        robots = Robots(body if info["state"] in ("present", "html") else "")
        info["over_google_limit"] = info["bytes"] > ROBOTS_GOOGLE_LIMIT
        info["sitemaps_declared"] = robots.sitemaps
        info["groups"] = len(robots.groups)
        info["invalid_lines"] = robots.invalid_lines
        info["content_signals"] = robots.content_signals
        info["cloudflare_managed_block"] = robots.cloudflare_managed
        info["text"] = body[:20000] if info["state"] == "present" else None
        return robots, info

    def read_sitemaps(self, origin, robots):
        declared = [normalize_url(s, origin) for s in robots.sitemaps]
        declared = [d for d in declared if d]
        candidates = declared or [origin + "/sitemap.xml", origin + "/sitemap_index.xml"]
        max_files = 3 if self.quick else 12
        queue = list(dict.fromkeys(candidates))
        seen, files, urls = set(), [], {}
        total_urls = 0
        while queue and len(files) < max_files and not self.out_of_time():
            sm_url = queue.pop(0)
            if sm_url in seen:
                continue
            seen.add(sm_url)
            if host_of(sm_url) == host_of(origin) and not robots.check(TOOL_TOKEN, sm_url)[0]:
                files.append({"url": sm_url, "status": 0, "declared": sm_url in declared, "error": "disallowed for this crawler by robots.txt",
                              "kind": None, "url_count": 0, "lastmod_share": None, "errors": []})
                continue
            res = self.fetcher.get(sm_url, accept="application/xml,text/xml,*/*;q=0.5", max_body=MAX_SITEMAP_BYTES)
            entry = {"url": sm_url, "status": res["status"], "declared": sm_url in declared,
                     "error": res["error"], "kind": None, "url_count": 0, "lastmod_share": None, "errors": []}
            if 200 <= res["status"] < 300 and res["body"]:
                parsed = parse_sitemap(res["body"], res["final_url"])
                entry.update(kind=parsed["kind"], url_count=parsed["url_count"], errors=parsed["errors"],
                             truncated_body=res["truncated"])
                if parsed["url_count"]:
                    entry["lastmod_share"] = round(parsed["lastmod"] / parsed["url_count"], 2)
                for u in parsed["urls"]:
                    if u["loc"] not in urls:
                        urls[u["loc"]] = u["lastmod"]
                total_urls += parsed["url_count"]
                for child in parsed["children"]:
                    if child not in seen:
                        queue.append(child)
            files.append(entry)
        state = "absent"
        if any(f["kind"] for f in files):
            state = "present"
        elif any(200 <= f["status"] < 300 for f in files):
            state = "unparseable"
        elif any((f["status"] == 0 or f["status"] >= 500 or f["status"] == 429) for f in files):
            state = "unknown"
        info = {
            "state": state,
            "declared_in_robots": bool(declared),
            "files": files,
            "files_not_read": len(queue),
            "url_count": total_urls,
            "urls_stored": len(urls),
            "truncated": bool(queue) or total_urls > len(urls),
            "lastmod_share": round(sum(1 for v in urls.values() if v) / len(urls), 2) if urls else None,
            "future_lastmod": sum(1 for v in urls.values() if v and (parse_date(v) or dt.date.min) > today()),
            "other_host_urls": sum(1 for u in urls if host_of(u) not in variant_hosts(host_of(origin))),
            "http_urls_on_https": sum(1 for u in urls if origin.startswith("https://") and u.startswith("http://")),
        }
        return info, urls

    def check_ai_files(self, origin):
        files = {}
        robots = self.robots_by_host.get(host_of(origin))
        for name in ("llms.txt", "llms-full.txt", "ai.txt"):
            if robots is not None and not robots.check(TOOL_TOKEN, "/" + name)[0]:
                files[name] = {"state": "unknown", "status": 0, "why": "disallowed for this crawler by robots.txt"}
                continue
            res = self.fetcher.get(f"{origin}/{name}", accept="text/plain,text/markdown,*/*;q=0.5", max_body=512 * 1024)
            body = (res["body"] or b"")[:2000].decode("utf-8", "replace")
            if 200 <= res["status"] < 300:
                if looks_like_html(res) or body.lstrip().lower().startswith(("<!doctype", "<html")):
                    state = "absent (the path serves a web page)"
                else:
                    state = "present"
            elif res["status"] in (404, 410):
                state = "absent"
            else:
                state = "unknown"
            entry = {"state": state, "status": res["status"]}
            if name == "llms.txt" and state == "present":
                entry["has_h1"] = bool(re.search(r"^# \S", body, re.M))
                entry["links"] = len(re.findall(r"\]\(https?://", body))
            files[name] = entry
        return files

    def check_variants(self, final_url):
        origin_host = host_of(final_url)
        scheme = urllib.parse.urlsplit(final_url).scheme
        results = []
        if re.fullmatch(r"[\d.]+|localhost|\[.*\]", origin_host) or ":" in urllib.parse.urlsplit(final_url).netloc.split("]")[-1]:
            return results
        tried = set()
        for h in sorted(variant_hosts(origin_host)):
            for sch in ("http", "https"):
                u = f"{sch}://{h}/"
                if same_page(u, final_url) or u in tried:
                    continue
                tried.add(u)
                res = self.fetcher.get(u)
                results.append({
                    "url": u, "status": res["status"], "final_url": res["final_url"], "hops": len(res["chain"]),
                    "reaches_main": same_page(res["final_url"], final_url) or (host_of(res["final_url"]) == origin_host and urllib.parse.urlsplit(res["final_url"]).scheme == scheme),
                    "error": clip(res["error"], 120) if res["error"] else None,
                })
        return results

    def soft_404_probe(self, origin):
        slug = "".join(random.choice(string.ascii_lowercase + string.digits) for _ in range(12))
        res = self.fetcher.get(f"{origin}/{slug}-page-that-should-not-exist")
        return {"status": res["status"], "final_url": res["final_url"],
                "soft_404": 200 <= res["status"] < 300 and looks_like_html(res)}

    def edge_check(self, url):
        """Fetch the homepage as a browser and as each AI crawler; compare."""
        tokens = QUICK_EDGE_BOTS if self.quick else [b["token"] for b in AI_BOTS if b["ua"]]
        base = self.fetcher.get(url, ua=BROWSER_UA)
        base_marker = challenge_markers(base)
        base_ok = 200 <= base["status"] < 300 and not base_marker
        base_len = len(base["body"] or b"")
        out = {"url": url, "browser": {"status": base["status"], "challenge": base_marker, "bytes": base_len,
                                       "error": base["error"]}, "bots": {}}
        if not base_ok:
            out["verdict"] = "unknown"
            out["why"] = ("The homepage didn't answer a normal browser request cleanly "
                          f"(status {base['status']}{', ' + base_marker if base_marker else ''}), so a crawler comparison would prove nothing.")
            return out
        for bot in AI_BOTS:
            if bot["token"] not in tokens:
                continue
            res = self.fetcher.get(url, ua=bot["ua"])
            marker = challenge_markers(res)
            size = len(res["body"] or b"")
            if res["status"] == 0:
                verdict = "unknown"
            elif res["status"] in (401, 403, 406, 429, 451, 503) or marker:
                verdict = "blocked" if not marker else "challenged"
            elif 200 <= res["status"] < 300 and base_len and size < base_len * 0.2:
                verdict = "different page"
            elif 200 <= res["status"] < 300:
                verdict = "allowed"
            else:
                verdict = "unknown"
            xrt = res["headers"].get("x-robots-tag")
            out["bots"][bot["token"]] = {"status": res["status"], "verdict": verdict, "challenge": marker,
                                        "bytes": size, "x_robots_tag": xrt, "error": clip(res["error"], 100) if res["error"] else None}
        out["verdict"] = "done"
        return out

    # --------------------------------------------------------------- crawl

    def record_page(self, url, res, depth, source):
        rec = {
            "url": url, "final_url": res["final_url"], "status": res["status"], "depth": depth, "source": source,
            "chain": res.get("chain", []), "ttfb_ms": res.get("first_ttfb_ms"), "total_ms": res.get("total_ms"),
            "error": res.get("error"), "content_type": (res["headers"] or {}).get("content-type"),
            "bytes": len(res["body"] or b""), "truncated": res.get("truncated", False),
            "headers": {k: v for k, v in (res["headers"] or {}).items() if k in (
                "x-robots-tag", "link", "strict-transport-security", "content-security-policy",
                "x-content-type-options", "x-frame-options", "referrer-policy", "last-modified",
                "cache-control", "server", "content-encoding")},
            "html": False,
        }
        final = res["final_url"]
        if 200 <= res["status"] < 300 and looks_like_html(res) and host_of(final) == self.host:
            ctype = (res["headers"] or {}).get("content-type", "")
            text = res["body"].decode(charset_of(ctype, res["body"]), "replace")
            rec["html"] = True
            rec.update(extract_page(final, text, res["headers"], res["status"]))
        self.pages[url] = rec
        return rec

    def allowed_for_us(self, url):
        robots = self.robots_by_host.get(host_of(url))
        if robots is None:
            return True, None
        ok, rule, _ = robots.check(TOOL_TOKEN, url)
        return ok, rule

    def crawl(self, home_url, sitemap_urls):
        """Breadth first, one link depth per batch. A sample of sitemap URLs joins the depth-1
        level (capped at a quarter of the budget while link-found pages are waiting), so
        sitemap health is measured even when links alone would fill the budget."""
        seq = 0
        frontier = []  # items: [priority, seq, url, depth, source]
        pending = {}
        inflight_depth = {}
        per_path = Counter()

        def push(url, depth, source, priority):
            nonlocal seq
            if url in pending:  # a sitemap-only URL later found by a link takes the link's depth
                item = pending[url]
                if item[4] == "sitemap" and source == "link":
                    item[0], item[3], item[4] = priority, depth, "link"
                return
            if url in inflight_depth:
                if depth is not None and (inflight_depth[url] is None or depth < inflight_depth[url]):
                    inflight_depth[url] = depth
                return
            if url in self.pages:
                rec = self.pages[url]
                if depth is not None and (rec.get("depth") is None or depth < rec["depth"]):
                    rec["depth"] = depth
                return
            parts = urllib.parse.urlsplit(url)
            if parts.hostname is None or parts.hostname.lower() != self.host:
                return
            if NON_HTML_EXT.search(parts.path or ""):
                return
            if parts.query:
                if per_path[parts.path] >= MAX_QUERY_VARIANTS_PER_PATH:
                    return
                per_path[parts.path] += 1
            seq += 1
            item = [priority, seq, url, depth, source]
            pending[url] = item
            frontier.append(item)

        home_rec = self.pages.get(home_url)
        if home_rec is None:
            push(home_url, 0, "home", 0.0)
        elif home_rec.get("html") and not home_rec.get("nofollow"):
            for link in home_rec.get("links_internal", []):
                if not link["nofollow"]:
                    push(link["url"], 1, "link", 1.0)
        sitemap_list = [u for u in sitemap_urls if host_of(u) == self.host]
        quota = int(self.max_pages * 0.25) if not self.quick else min(5, self.max_pages // 4)
        if sitemap_list and quota:
            stride = max(1, len(sitemap_list) // (quota * 2))
            for u in sitemap_list[::stride][: quota * 2]:
                push(u, None, "sitemap", 1.5)
        sitemap_only_fetched = 0
        with ThreadPoolExecutor(max_workers=self.concurrency) as pool:
            while frontier and len(self.pages) < self.max_pages:
                if self.out_of_time():
                    self.truncated = True
                    self.not_checked.append({"what": "part of the crawl", "why": f"stopped at the {self.args.max_minutes}-minute limit"})
                    break
                frontier.sort(key=lambda it: (it[0], it[1]))
                level = int(frontier[0][0])
                others_waiting = any(x[4] != "sitemap" for x in frontier)
                batch, rest = [], []
                for item in frontier:
                    room = self.max_pages - len(self.pages) - len(batch)
                    if room <= 0 or len(batch) >= self.concurrency * 3 or int(item[0]) != level:
                        rest.append(item)
                        continue
                    if item[4] == "sitemap" and sitemap_only_fetched >= quota and others_waiting:
                        rest.append(item)
                        continue
                    ok, rule = self.allowed_for_us(item[2])
                    pending.pop(item[2], None)
                    if not ok:
                        self.skipped_robots[item[2]] = rule
                        continue
                    batch.append(item)
                    inflight_depth[item[2]] = item[3]
                    if item[4] == "sitemap":
                        sitemap_only_fetched += 1
                frontier = rest
                if not batch:
                    if frontier and not others_waiting:
                        quota += self.concurrency * 3  # only sitemap URLs are left: let more in
                    elif frontier and all(x[4] == "sitemap" for x in frontier if int(x[0]) == level):
                        for x in frontier:
                            if x[4] == "sitemap":
                                x[0] = max(x[0], level + 1.5)  # wait behind the link-found pages
                    if frontier:
                        continue
                    break
                results = list(pool.map(lambda it: (it, self.fetcher.get(it[2])), batch))
                for (prio, _s, url, depth, source), res in results:
                    depth = inflight_depth.pop(url, depth)
                    rec = self.record_page(url, res, depth, source)
                    self.log(f"  {res['status'] or 'ERR'} {url}")
                    if not rec.get("html") or rec.get("nofollow"):
                        continue
                    d = depth if depth is not None else 1
                    for link in rec.get("links_internal", []):
                        if not link["nofollow"]:
                            push(link["url"], d + 1, "link", float(d + 1))
        if frontier:
            self.truncated = True
        self.unvisited_frontier = len(frontier)

    def link_check(self):
        """Status of internal link targets that the crawl didn't fetch (budget, non-HTML, host variants)."""
        targets = Counter()
        for rec in self.pages.values():
            for link in rec.get("links_internal", []):
                if link["url"] not in self.pages:
                    targets[link["url"]] += 1
        budget = 30 if self.quick else 150
        checked = 0
        for url, _n in targets.most_common():
            if checked >= budget or self.out_of_time():
                break
            ok, rule = self.allowed_for_us(url)
            if not ok:
                self.skipped_robots.setdefault(url, rule)
                continue
            res = self.fetcher.get(url, method="HEAD")
            if res["status"] in (0, 405, 501) or res["status"] >= 400:
                res = self.fetcher.get(url, max_body=64 * 1024)  # some servers mishandle HEAD
            self.link_checks[url] = {"status": res["status"], "final_url": res["final_url"],
                                     "chain": res["chain"], "error": res["error"]}
            checked += 1
        remaining = len(targets) - checked - sum(1 for u in targets if u in self.skipped_robots)
        if remaining > 0:
            self.not_checked.append({"what": f"{remaining} internal link targets",
                                     "why": f"link-check budget of {budget} requests used; most-linked targets were checked first"})

    # --------------------------------------------------------------- rendering (optional)

    def apply_rendered(self, records):
        """records: list of {url, html}. Re-extract those pages from rendered HTML."""
        applied = 0
        for item in records:
            url = normalize_url(item.get("url") or "")
            html = item.get("html")
            if not url or not html:
                continue
            match = self.pages.get(url) or next((r for r in self.pages.values() if same_page(r["final_url"], url)), None)
            if not match or not match.get("html"):
                continue
            match.update(extract_page(match["final_url"], html, match.get("headers") or {}, match["status"]))
            match["rendered"] = item.get("source", "rendered")
            applied += 1
        return applied

    def render_with_firecrawl(self, limit):
        key = os.environ.get("FIRECRAWL_API_KEY")
        if not key:
            self.not_checked.append({"what": "rendered re-read", "why": "--render firecrawl needs FIRECRAWL_API_KEY in the environment"})
            return 0
        shells = [r for r in self.pages.values() if r.get("js_shell")]
        others = [r for r in self.pages.values() if r.get("html") and not r.get("js_shell")]
        targets = (shells + others)[:limit]
        records = []
        for rec in targets:
            body = json.dumps({"url": rec["final_url"], "formats": ["rawHtml"]}).encode()
            req = urllib.request.Request(FIRECRAWL_ENDPOINT, data=body, method="POST",
                                         headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"})
            try:
                with urllib.request.urlopen(req, timeout=90) as resp:
                    data = json.loads(resp.read().decode("utf-8", "replace"))
                html = ((data or {}).get("data") or {}).get("rawHtml")
                if html:
                    records.append({"url": rec["url"], "html": html, "source": "firecrawl"})
            except Exception as err:
                self.notes.append(redact(f"Firecrawl render failed for {rec['final_url']}: {err}", self.secrets))
        return self.apply_rendered(records)

    # --------------------------------------------------------------- Core Web Vitals

    @staticmethod
    def rate(metric, value):
        if value is None or metric not in CWV_THRESHOLDS:
            return None
        good, poor = CWV_THRESHOLDS[metric]
        return "good" if value <= good else ("poor" if value > poor else "needs improvement")

    def psi(self, url):
        key = os.environ.get("PAGESPEED_API_KEY")
        params = {"url": url, "strategy": "mobile", "category": "performance"}
        if key:
            params["key"] = key
        req = urllib.request.Request(PSI_ENDPOINT + "?" + urllib.parse.urlencode(params), headers={"User-Agent": TOOL_UA})
        try:
            with urllib.request.urlopen(req, timeout=self.args.psi_timeout) as resp:
                data = json.loads(resp.read().decode("utf-8", "replace"))
        except urllib.error.HTTPError as err:
            detail = ""
            try:
                detail = json.loads(err.read().decode("utf-8", "replace")).get("error", {}).get("message", "")
            except Exception:
                pass
            return {"url": url, "error": redact(f"HTTP {err.code}: {clip(detail, 200)}", self.secrets), "http_status": err.code}
        except Exception as err:
            return {"url": url, "error": redact(f"{type(err).__name__}: {err}", self.secrets)}
        out = {"url": url, "field": {}, "field_scope": None, "lab": {}, "score": None, "opportunities": []}
        le = data.get("loadingExperience") or {}
        metrics = le.get("metrics") or {}
        names = (("lcp_ms", "LARGEST_CONTENTFUL_PAINT_MS"), ("inp_ms", "INTERACTION_TO_NEXT_PAINT"),
                 ("cls", "CUMULATIVE_LAYOUT_SHIFT_SCORE"), ("fcp_ms", "FIRST_CONTENTFUL_PAINT_MS"),
                 ("ttfb_ms", "EXPERIMENTAL_TIME_TO_FIRST_BYTE"))
        for name, key_name in names:
            m = metrics.get(key_name)
            if m and m.get("percentile") is not None:
                value = m["percentile"] / 100.0 if name == "cls" else m["percentile"]
                out["field"][name] = {"p75": value, "rating": self.rate(name, value)}
        if out["field"]:
            out["field_scope"] = "origin (not enough visits to this page)" if le.get("origin_fallback") else "page"
            out["field_source"] = "PageSpeed Insights (Chrome UX Report, 28 days)"
        lhr = data.get("lighthouseResult") or {}
        audits = lhr.get("audits") or {}
        for name, audit_id in (("lcp_ms", "largest-contentful-paint"), ("cls", "cumulative-layout-shift"),
                               ("tbt_ms", "total-blocking-time"), ("fcp_ms", "first-contentful-paint"),
                               ("speed_index_ms", "speed-index")):
            v = (audits.get(audit_id) or {}).get("numericValue")
            if isinstance(v, (int, float)):
                out["lab"][name] = round(v, 3) if name == "cls" else int(v)
        score = ((lhr.get("categories") or {}).get("performance") or {}).get("score")
        out["score"] = int(round(score * 100)) if isinstance(score, (int, float)) else None
        opps = []
        for audit_id, audit in audits.items():
            details = audit.get("details") or {}
            savings = details.get("overallSavingsMs") or (audit.get("metricSavings") or {}).get("LCP")
            if isinstance(savings, (int, float)) and savings >= 150 and (audit.get("score") is not None and audit.get("score") < 0.9):
                opps.append((savings, audit.get("title") or audit_id))
        out["opportunities"] = [f"{t} (~{int(s)} ms)" for s, t in sorted(opps, reverse=True)[:3]]
        return out

    def crux(self, url, origin):
        key = os.environ.get("CRUX_API_KEY") or os.environ.get("PAGESPEED_API_KEY")
        if not key:
            return None
        for body in ({"url": url, "formFactor": "PHONE"}, {"origin": origin, "formFactor": "PHONE"}):
            req = urllib.request.Request(CRUX_ENDPOINT + "?key=" + urllib.parse.quote(key),
                                         data=json.dumps(body).encode(), method="POST",
                                         headers={"Content-Type": "application/json"})
            try:
                with urllib.request.urlopen(req, timeout=30) as resp:
                    data = json.loads(resp.read().decode("utf-8", "replace"))
            except urllib.error.HTTPError as err:
                if err.code == 404:
                    continue
                return {"error": redact(f"CrUX HTTP {err.code}", self.secrets)}
            except Exception as err:
                return {"error": redact(f"CrUX {type(err).__name__}", self.secrets)}
            metrics = (data.get("record") or {}).get("metrics") or {}
            field = {}
            for name, key_name in (("lcp_ms", "largest_contentful_paint"), ("inp_ms", "interaction_to_next_paint"),
                                   ("cls", "cumulative_layout_shift"), ("fcp_ms", "first_contentful_paint"),
                                   ("ttfb_ms", "experimental_time_to_first_byte")):
                p75 = ((metrics.get(key_name) or {}).get("percentiles") or {}).get("p75")
                if p75 is not None:
                    value = float(p75) if name == "cls" else int(float(p75))
                    field[name] = {"p75": value, "rating": self.rate(name, value)}
            if field:
                return {"field": field, "scope": "page" if "url" in body else "origin",
                        "source": "Chrome UX Report API (28 days)"}
        return {"field": {}, "scope": None}

    def pick_templates(self, home_url, n):
        inbound = self.inbound_counts()
        groups = {}
        for url, rec in self.pages.items():
            if not rec.get("html") or rec.get("noindex") or same_page(rec["final_url"], home_url):
                continue
            ptype = rec.get("ptype")
            if ptype in ("auth", "utility"):
                continue
            seg = (urllib.parse.urlsplit(rec["final_url"]).path.strip("/").split("/") or [""])[0] or "/"
            score = inbound.get(rec["final_url"], 0) + (50 if ptype == "money" else 0) + (10 if ptype == "article" else 0)
            if seg not in groups or score > groups[seg][0]:
                groups[seg] = (score, rec["final_url"], ptype)
        ranked = sorted(groups.values(), reverse=True)
        return [u for _s, u, _t in ranked[:n]]

    def run_cwv(self, home_url, origin):
        if self.args.no_psi:
            self.not_checked.append({"what": "Core Web Vitals", "why": "skipped (--no-psi)"})
            return
        urls = [home_url] + ([] if self.quick else self.pick_templates(home_url, self.args.psi_templates))
        for i, url in enumerate(urls):
            if self.out_of_time():
                self.not_checked.append({"what": f"Core Web Vitals for {len(urls) - i} page(s)", "why": "time limit reached"})
                break
            self.log(f"PageSpeed Insights (mobile): {url}")
            res = self.psi(url)
            if res.get("error"):
                self.cwv["pages"].append({"url": url, "error": res["error"]})
                if res.get("http_status") == 429:
                    why = ("Google's keyless quota was used up" if not os.environ.get("PAGESPEED_API_KEY")
                           else "the API key's quota was used up")
                    self.not_checked.append({"what": "Core Web Vitals", "why": why + "; set PAGESPEED_API_KEY (a free Google Cloud key) and re-run"})
                    break
                continue
            if not res["field"]:
                cx = self.crux(url, origin)
                if cx and cx.get("field"):
                    res["field"] = cx["field"]
                    res["field_scope"] = cx["scope"]
                    res["field_source"] = cx["source"]
                elif cx and cx.get("error"):
                    res["crux_error"] = cx["error"]
            self.cwv["pages"].append(res)
            time.sleep(1.0)
        if any(p.get("field") for p in self.cwv["pages"]):
            self.cwv["source"] = "field data where available, lab data for the rest"
        elif any(p.get("lab") for p in self.cwv["pages"]):
            self.cwv["source"] = "lab only"
            self.cwv["notes"].append("No real-visitor (field) data was available for these pages, so the numbers are a single simulated mobile load.")

    # --------------------------------------------------------------- derived facts

    def inbound_counts(self):
        counts = Counter()
        for rec in self.pages.values():
            if not rec.get("html"):
                continue
            seen = set()
            for link in rec.get("links_internal", []):
                target = link["url"]
                if target in seen:
                    continue
                seen.add(target)
                counts[target] += 1
                dest = self.pages.get(target)
                if dest is not None and dest["final_url"] != target:
                    counts[dest["final_url"]] += 1
        return counts

    def resolve_status(self, url):
        """Status for an internal URL from the crawl or the link checks. None if never fetched."""
        rec = self.pages.get(url)
        if rec is not None:
            return rec["status"], rec["final_url"], rec.get("chain", []), rec.get("error")
        chk = self.link_checks.get(url)
        if chk is not None:
            return chk["status"], chk["final_url"], chk.get("chain", []), chk.get("error")
        return None

    def prepare(self):
        """Classify pages, resolve canonicals and indexability, mark key pages."""
        home = self.home_url
        google_robots = self.robots_by_host.get(self.host) or Robots("")
        for rec in self.pages.values():
            rec["redirected"] = bool(rec.get("chain"))
            if not rec.get("html"):
                if rec["status"] == 0:
                    rec["index_state"] = "error"
                elif not (200 <= rec["status"] < 300):
                    rec["index_state"] = "non_200"
                else:
                    rec["index_state"] = "not_html"
                rec["ptype"] = classify(rec["final_url"], [], home)
                continue
            types = rec["schema"]["types"] + rec["schema"]["microdata_types"]
            rec["ptype"] = classify(rec["final_url"], types, home)
            canon = None
            resolved = [normalize_url(c, rec["final_url"]) for c in rec.get("canonical_html", []) if c]
            resolved = [c for c in resolved if c]
            header_c = normalize_url(rec["canonical_header"], rec["final_url"]) if rec.get("canonical_header") else None
            distinct = {c.rstrip("/") for c in resolved + ([header_c] if header_c else [])}
            rec["canonical_conflict"] = len(distinct) > 1
            canon = resolved[0] if resolved else header_c
            rec["canonical"] = canon
            rec["canonical_relative"] = any(c and not re.match(r"https?://", c, re.I) for c in rec.get("canonical_html", []))
            ok, rule, _ = google_robots.check("googlebot", rec["final_url"])
            rec["googlebot_rule"] = rule
            if not ok:
                rec["index_state"] = "blocked_robots"
            elif rec.get("noindex"):
                rec["index_state"] = "noindex"
            elif canon and not same_page(canon, rec["final_url"]):
                rec["index_state"] = "canonicalized"
            else:
                rec["index_state"] = "indexable"
        inbound = self.inbound_counts()
        self.inbound = inbound
        html_count = max(1, sum(1 for r in self.pages.values() if r.get("html")))
        home_rec = self.pages.get(home)
        nav_targets = set()
        if home_rec and home_rec.get("html"):
            for link in home_rec.get("links_internal", []):
                if link["pos"] in ("nav", "header"):
                    nav_targets.add(link["url"])
                    dest = self.pages.get(link["url"])
                    if dest:
                        nav_targets.add(dest["final_url"])
        self.key_urls = set()
        for url, rec in self.pages.items():
            final = rec["final_url"]
            if rec.get("ptype") in ("auth", "utility"):
                continue
            if (rec.get("ptype") in ("homepage", "money") or url in nav_targets or final in nav_targets
                    or (html_count >= 10 and inbound.get(final, 0) >= max(3, html_count * 0.5))):
                self.key_urls.add(url)
                self.key_urls.add(final)
        for url in nav_targets:
            if not any(p in urllib.parse.urlsplit(url).path.lower() for p in AUTH_PATTERNS + UTILITY_PATTERNS):
                self.key_urls.add(url)
        for rec in self.pages.values():
            rec["key"] = rec["url"] in self.key_urls or rec["final_url"] in self.key_urls
            rec["inbound"] = inbound.get(rec["final_url"], 0)

    def content_pages(self):
        """HTML pages counted once: skip a redirecting record when its destination was crawled too."""
        out = []
        for rec in self.pages.values():
            if not rec.get("html"):
                continue
            if rec["redirected"] and rec["final_url"] in self.pages:
                continue
            out.append(rec)
        return out

    # --------------------------------------------------------------- findings

    def analyze(self):
        findings = []
        ran = set()
        fine = []
        key = self.key_urls

        def ex(rec_or_url, detail=None):
            url = rec_or_url if isinstance(rec_or_url, str) else rec_or_url["final_url"]
            out = {"url": url}
            if detail:
                out["detail"] = clip(str(detail), 200)
            return out

        def add(fid, items, observation, severity=None, extra=None, confidence="observed", keep_order=False):
            spec = CHECKS[fid]
            items = list(items)
            urls = []
            for it in items:
                u = it["url"]
                if u not in urls:
                    urls.append(u)
            key_hits = sum(1 for u in urls if u in key)
            sev = severity or spec["severity"]
            if spec.get("escalate_on_key") and key_hits and SEVERITY_ORDER[sev] < SEVERITY_ORDER["critical"]:
                sev = [k for k, v in SEVERITY_ORDER.items() if v == SEVERITY_ORDER[sev] + 1][0]
            count = len(urls) if urls else 1
            examples = (items if keep_order else sorted(items, key=lambda it: (it["url"] not in key, -(self.inbound.get(it["url"], 0)))))[:3]
            rank = SEVERITY_WEIGHT[sev] * (1.5 if key_hits else 1.0) * (1 + math.log10(max(count, 1)))
            findings.append({
                "id": fid, "category": spec["category"], "severity": sev, "title": spec["title"],
                "count": count, "key_pages_affected": key_hits, "examples": examples, "urls": urls[:50],
                "observation": observation, "fix": spec["fix"], "effort": spec["effort"],
                "confidence": confidence, "rank_score": round(rank, 1), **(extra or {}),
            })

        def ok(fid, what):
            fine.append({"id": fid, "what": what})

        pages = list(self.pages.values())
        content = self.content_pages()
        html_n = len(content)
        indexable = [r for r in content if r["index_state"] == "indexable"]
        public = [r for r in indexable if r["ptype"] not in ("auth", "utility")]
        shells = [r for r in content if r.get("js_shell") and not r.get("rendered")]
        shell_urls = {r["final_url"] for r in shells}
        robots = self.robots_by_host.get(self.host) or Robots("")
        rinfo = self.site.get("robots", {})
        home = self.pages.get(self.home_url)

        # ---- homepage and transport
        ran.add("homepage_unreachable")
        browser = (self.site.get("edge_check") or {}).get("browser") or {}
        if home is not None and home["status"] in (401, 403, 406, 429, 503) and 200 <= (browser.get("status") or 0) < 300 and not browser.get("challenge"):
            self.not_checked.append({"what": "the site's pages", "why": f"the homepage answered this crawler with {home['status']} but a browser with {browser['status']}, so the site likely refuses unknown crawlers; check Search Console's URL Inspection or re-read pages with rendered HTML"})
        elif home is None or not (200 <= home["status"] < 300) or not home.get("html"):
            status = home["status"] if home else None
            err = home.get("error") if home else "not fetched"
            if err and err.startswith("TLS"):
                add("tls_error", [ex(self.home_url, err)], f"The homepage failed the HTTPS certificate check: {clip(err, 160)}.")
            else:
                add("homepage_unreachable", [ex(self.home_url, f"status {status}, {err or 'no HTML'}")],
                    f"The homepage answered status {status or 'none'}{(' (' + clip(err, 100) + ')') if err else ''} to this crawler.")
        else:
            ok("homepage_unreachable", f"homepage answered {home['status']} with HTML")
        if self.home_url.startswith("http://"):
            add("not_https", [ex(self.home_url)], "The site's final homepage address is http://, not https://.")
        else:
            ran.add("not_https")
            ok("not_https", "the site is served over HTTPS")

        variants = self.site.get("host_variants") or []
        if variants:
            ran.add("host_variants")
            bad = [v for v in variants if not v["reaches_main"]]
            slow = [v for v in variants if v["reaches_main"] and v["hops"] > 1]
            if bad:
                add("host_variants", [ex(v["url"], f"status {v['status']}, ends at {v['final_url']}") for v in bad],
                    f"{len(bad)} other address(es) for the site don't redirect to {self.home_url} (for example {bad[0]['url']} ends at {bad[0]['final_url']} with status {bad[0]['status']}).")
            elif slow:
                add("host_variants", [ex(v["url"], f"{v['hops']} hops") for v in slow],
                    f"{len(slow)} other address(es) reach the homepage through more than one redirect.", severity="low")
            else:
                ok("host_variants", "http and www variants redirect to the main address")

        # ---- robots.txt
        state = rinfo.get("state")
        ran.update({"robots_unreachable", "robots_blocks_google"})
        if state in ("unreachable", "server-error", "rate-limited"):
            add("robots_unreachable", [ex(rinfo.get("url", ""), f"status {rinfo.get('status')}, {rinfo.get('error') or state}")],
                f"robots.txt answered {rinfo.get('status') or 'nothing'} ({state}). Google stops crawling a site while robots.txt returns server errors.")
        elif state == "html":
            add("robots_is_html", [ex(rinfo.get("url", ""))], "robots.txt returns a web page instead of plain-text rules.")
        elif state == "absent":
            add("robots_missing", [ex(rinfo.get("url", ""), f"status {rinfo.get('status')}")],
                f"There is no robots.txt (status {rinfo.get('status')}). Crawlers treat that as permission to crawl everything, so this costs nothing except a place to list the sitemap.")
        else:
            ok("robots_unreachable", "robots.txt loads as plain text")
        if rinfo.get("over_google_limit"):
            add("robots_too_large", [ex(rinfo.get("url", ""))], f"robots.txt is {rinfo.get('bytes')} bytes; Google ignores everything after 500 KiB.")
        if state == "present":
            gpol = robots.policy("googlebot", ["/"] + [path_of(r["final_url"]) for r in content[:200]])
            if not robots.check("googlebot", "/")[0]:
                add("robots_blocks_google", [ex(self.home_url, gpol["root_rule"])],
                    f"robots.txt blocks Googlebot from the homepage (rule \"{gpol['root_rule']}\" in the group for {gpol['follows']}).")
            else:
                ok("robots_blocks_google", "Googlebot may crawl the homepage")
            # key and listed pages blocked for Googlebot
            known = set(self.pages) | set(self.skipped_robots) | set(self.sitemap_urls)
            blocked = []
            for url in known:
                if host_of(url) != self.host:
                    continue
                path = urllib.parse.urlsplit(url).path.lower()
                if any(p in path for p in AUTH_PATTERNS + UTILITY_PATTERNS):
                    continue
                allowed, rule, _ = robots.check("googlebot", url)
                if not allowed and url != self.home_url:
                    linked = self.inbound.get(url, 0)
                    if url in self.sitemap_urls or linked >= 2 or url in key:
                        blocked.append(ex(url, rule))
            ran.add("robots_blocks_pages")
            if blocked:
                add("robots_blocks_pages", blocked,
                    f"{len(blocked)} page(s) that are linked or listed in the sitemap are blocked for Googlebot (for example {blocked[0]['url']} by \"{blocked[0].get('detail')}\").")
            else:
                ok("robots_blocks_pages", "no linked or sitemap-listed page is blocked for Googlebot")
            res_blocked = []
            for rec in content[:100]:
                for res_url in rec.get("stylesheets", []) + rec.get("scripts", []):
                    if host_of(res_url) == self.host:
                        allowed, rule, _ = robots.check("googlebot", res_url)
                        if not allowed:
                            res_blocked.append(ex(res_url, rule))
            ran.add("robots_blocks_resources")
            if res_blocked:
                uniq = {e["url"]: e for e in res_blocked}
                add("robots_blocks_resources", uniq.values(),
                    f"{len(uniq)} stylesheet or script file(s) the pages need are blocked for Googlebot, so Google may render the pages incomplete.")
            else:
                ok("robots_blocks_resources", "CSS and JavaScript files are crawlable")
            if not rinfo.get("sitemaps_declared") and self.site.get("sitemap", {}).get("state") == "present":
                add("sitemap_not_in_robots", [ex(rinfo.get("url", ""))], "A sitemap exists but robots.txt doesn't list it.")

        # ---- AI crawler access
        ai = self.site.get("ai_crawlers", {})
        if state == "present":
            ran.update({"ai_search_blocked", "ai_user_fetch_blocked", "search_engine_blocked"})
            search_blocked, user_blocked, training_blocked, engine_blocked = [], [], [], []
            for token, pol in ai.items():
                if token == "Googlebot":
                    continue
                if pol["state"] in ("blocked", "partial"):
                    rule = pol["root_rule"] or (pol["blocked_examples"][0]["rule"] if pol["blocked_examples"] else None)
                    item = ex(self.home_url if pol["state"] == "blocked" else (self.home_url.rstrip("/") + (pol["blocked_examples"][0]["path"] if pol["blocked_examples"] else "/")),
                              f"{token}: {pol['state']} by \"{rule}\" ({'its own group' if pol['named_group'] else 'the * group'})")
                    item["bot"] = token
                    role = pol["role"]
                    if role == "search-engine":
                        engine_blocked.append(item)
                    elif role == "search":
                        search_blocked.append(item)
                    elif role == "user-fetch":
                        user_blocked.append(item)
                    else:
                        training_blocked.append(item)
            def bots_text(items):
                return ", ".join(f"{i['bot']} ({ai[i['bot']]['state']})" for i in items)
            if engine_blocked:
                add("search_engine_blocked", engine_blocked, f"robots.txt blocks {bots_text(engine_blocked)}.")
            else:
                ok("search_engine_blocked", "Bingbot may crawl the site")
            if search_blocked:
                full = [i for i in search_blocked if ai[i["bot"]]["state"] == "blocked"]
                add("ai_search_blocked", search_blocked,
                    f"robots.txt blocks AI search crawlers: {bots_text(search_blocked)}.",
                    severity="high" if full else "medium")
            else:
                ok("ai_search_blocked", "OAI-SearchBot, Claude-SearchBot and PerplexityBot may crawl the site")
            if user_blocked:
                add("ai_user_fetch_blocked", user_blocked, f"robots.txt blocks AI assistants' page fetches: {bots_text(user_blocked)}.")
            else:
                ok("ai_user_fetch_blocked", "ChatGPT-User, Claude-User and Perplexity-User are not blocked in robots.txt")
            if training_blocked:
                add("ai_training_blocked", training_blocked,
                    f"robots.txt opts out of AI training crawlers: {bots_text(training_blocked)}. This is a business choice and does not remove the site from AI search."
                    + (" The block comes from Cloudflare's managed robots.txt." if rinfo.get("cloudflare_managed_block") else ""))
        edge = self.site.get("edge_check") or {}
        if edge.get("verdict") == "done":
            ran.add("ai_blocked_at_edge")
            hit = []
            for token, res in edge["bots"].items():
                if res["verdict"] in ("blocked", "challenged", "different page"):
                    role = next((b["role"] for b in AI_BOTS if b["token"] == token), "training")
                    item = ex(edge["url"], f"{token}: {res['verdict']} (status {res['status']}{', ' + res['challenge'] if res.get('challenge') else ''}) while a browser got {edge['browser']['status']}")
                    item["bot"] = token
                    item["role"] = role
                    hit.append(item)
            vis = [h for h in hit if h["role"] in VISIBILITY_ROLES]
            if vis:
                add("ai_blocked_at_edge", vis,
                    "The homepage answers a normal browser but refuses requests that name "
                    + ", ".join(h["bot"] for h in vis)
                    + f" ({vis[0]['detail']}). The real crawlers come from their vendors' published IP ranges, so confirm in the CDN or firewall settings before changing anything.",
                    confidence="observed with a stand-in request")
            else:
                ok("ai_blocked_at_edge", f"the homepage answered {len(edge['bots'])} AI crawler requests the same way it answered a browser")
            train = [h for h in hit if h["role"] not in VISIBILITY_ROLES]
            if train:
                add("ai_training_blocked_at_edge", train,
                    "The edge refuses AI training crawlers: " + ", ".join(h["bot"] for h in train) + ". A business choice, not a visibility problem.",
                    confidence="observed with a stand-in request")
        elif edge:
            self.not_checked.append({"what": "AI crawler access at the CDN", "why": edge.get("why", "the homepage didn't answer a browser request cleanly")})

        files = self.site.get("ai_files") or {}
        if files:
            ran.add("llms_txt_missing")
            if files.get("llms.txt", {}).get("state", "").startswith("absent"):
                add("llms_txt_missing", [ex(self.origin + "/llms.txt", files["llms.txt"]["state"])],
                    "No llms.txt at the site root. Optional: no search engine has confirmed it changes rankings or citations.")
            elif files.get("llms.txt", {}).get("state") == "present":
                ok("llms_txt_missing", "llms.txt is present")

        # ---- sitemaps
        sm = self.site.get("sitemap") or {}
        sm_state = sm.get("state")
        if sm_state == "absent":
            add("sitemap_missing", [ex(self.origin + "/sitemap.xml")],
                "No sitemap was found (none listed in robots.txt, and /sitemap.xml and /sitemap_index.xml returned no sitemap).")
        elif sm_state == "unparseable":
            bad = [f for f in sm.get("files", []) if 200 <= f["status"] < 300 and not f.get("kind")]
            add("sitemap_unparseable", [ex(f["url"], "; ".join(f.get("errors", [])[:2])) for f in bad],
                f"The sitemap at {bad[0]['url'] if bad else 'its address'} loads but can't be read as a sitemap: {'; '.join((bad[0].get('errors') if bad else [])[:2]) or 'unknown format'}.")
        elif sm_state == "unknown":
            self.not_checked.append({"what": "sitemap", "why": "the sitemap address didn't answer (server error or timeout)"})
        if sm_state == "present":
            ran.update({"sitemap_missing", "noindex_in_sitemap", "sitemap_non_200", "sitemap_blocked_by_robots"})
            ok("sitemap_missing", f"sitemap parsed: {sm.get('url_count')} URLs in {len([f for f in sm.get('files', []) if f.get('kind')])} file(s)")
            problems = []
            for f in sm.get("files", []):
                if f.get("errors"):
                    problems.append(ex(f["url"], "; ".join(f["errors"][:2])))
            if sm.get("future_lastmod"):
                problems.append(ex(self.origin, f"{sm['future_lastmod']} URL(s) have a lastmod date in the future"))
            if sm.get("other_host_urls"):
                problems.append(ex(self.origin, f"{sm['other_host_urls']} URL(s) on another host"))
            if sm.get("http_urls_on_https"):
                problems.append(ex(self.origin, f"{sm['http_urls_on_https']} http:// URL(s) on an https site"))
            if problems:
                add("sitemap_errors", problems, "The sitemap parses but has problems: " + "; ".join(p.get("detail", "") for p in problems[:3]) + ".")
            listed = set(self.sitemap_urls)
            noidx, non200, redirected, blocked_g, canon_away = [], [], [], [], []
            for url in listed:
                rec = self.pages.get(url)
                st = self.resolve_status(url)
                if rec is not None and rec.get("html"):
                    if rec["index_state"] == "noindex":
                        how = "X-Robots-Tag" if rec.get("x_robots_tag") and "noindex" in (rec.get("x_robots_tag") or "").lower() else "meta robots"
                        noidx.append(ex(url, f"{how}: {', '.join(rec.get('robots_meta') or rec.get('googlebot_meta') or [rec.get('x_robots_tag') or 'noindex'])}"))
                    elif rec["index_state"] == "canonicalized" and not rec["redirected"]:
                        canon_away.append(ex(url, f"canonical points to {rec['canonical']}"))
                if st is not None:
                    status, final, chain, err = st
                    if chain:
                        redirected.append(ex(url, f"redirects to {final} ({status})"))
                    elif status == 0 or not (200 <= status < 300):
                        non200.append(ex(url, f"status {status or err}"))
                allowed, rule, _ = robots.check("googlebot", url)
                if not allowed:
                    blocked_g.append(ex(url, rule))
            checked = sum(1 for u in listed if self.resolve_status(u) is not None)
            scope = f" (of {checked} sitemap URLs this audit fetched)"
            if noidx:
                add("noindex_in_sitemap", noidx, f"{len(noidx)} page(s) in the sitemap carry noindex{scope}; for example {noidx[0]['url']} ({noidx[0]['detail']}).")
            else:
                ok("noindex_in_sitemap", f"no noindex page among {checked} sitemap URLs fetched")
            if non200 or redirected:
                sev = "high" if non200 else "medium"
                add("sitemap_non_200", non200 + redirected,
                    f"{len(non200)} sitemap URL(s) return an error and {len(redirected)} redirect{scope}.", severity=sev)
            else:
                ok("sitemap_non_200", f"all {checked} sitemap URLs fetched returned 200")
            if blocked_g:
                add("sitemap_blocked_by_robots", blocked_g, f"{len(blocked_g)} sitemap URL(s) are blocked for Googlebot in robots.txt.")
            else:
                ok("sitemap_blocked_by_robots", "no sitemap URL is blocked by robots.txt")
            if canon_away:
                add("sitemap_canonicalized", canon_away, f"{len(canon_away)} sitemap URL(s) name a different page as canonical.")
            if not sm.get("truncated") and not self.truncated:
                ran.add("indexable_not_in_sitemap")
                missing = [ex(r) for r in public if r["final_url"] not in listed and r["url"] not in listed
                           and r["final_url"].rstrip("/") not in {u.rstrip("/") for u in listed}]
                if missing:
                    add("indexable_not_in_sitemap", missing, f"{len(missing)} indexable page(s) found by links are not in the sitemap.")

        # ---- indexability on pages
        noindexed = [r for r in content if r["index_state"] == "noindex" and r["ptype"] not in ("auth", "utility")]
        ran.update({"noindex_key_pages", "noindex_pages"})
        key_noidx = [r for r in noindexed if r["key"]]
        if html_n >= 3 and len([r for r in content if r["index_state"] == "noindex"]) >= 0.8 * html_n:
            add("noindex_key_pages", [ex(r, ", ".join(r.get("robots_meta") or [r.get("x_robots_tag") or "noindex"])) for r in noindexed],
                f"{len(noindexed)} of {html_n} pages crawled carry noindex, including the homepage. The whole site is asking Google not to index it.",
                severity="critical")
        elif key_noidx:
            add("noindex_key_pages", [ex(r, ", ".join(r.get("robots_meta") or r.get("googlebot_meta") or [r.get("x_robots_tag") or "noindex"])) for r in key_noidx],
                f"{len(key_noidx)} key page(s) carry noindex, for example {key_noidx[0]['final_url']}.")
        else:
            ok("noindex_key_pages", "no key page carries noindex")
        in_sitemap = set(self.sitemap_urls)
        other_noidx = [r for r in noindexed if not r["key"] and r["url"] not in in_sitemap and r["final_url"] not in in_sitemap]
        if other_noidx and not (html_n >= 3 and len([r for r in content if r["index_state"] == "noindex"]) >= 0.8 * html_n):
            add("noindex_pages", [ex(r, ", ".join(r.get("robots_meta") or r.get("googlebot_meta") or [r.get("x_robots_tag") or "noindex"])) for r in other_noidx],
                f"{len(other_noidx)} other page(s) carry noindex. Fine if they are meant to stay out of Google; check the list.")

        # canonicals
        ran.update({"canonical_conflict", "canonical_to_bad_target", "canonical_elsewhere", "canonical_missing"})
        conflict, bad_target, off_site, elsewhere, missing_c, relative = [], [], [], [], [], []
        for r in content:
            if r["index_state"] in ("noindex", "blocked_robots"):
                continue
            if r.get("canonical_conflict"):
                conflict.append(ex(r, f"{r.get('canonical_html')} / header {r.get('canonical_header')}"))
            c = r.get("canonical")
            if not c:
                if r["ptype"] not in ("auth", "utility"):
                    missing_c.append(ex(r))
                continue
            if r.get("canonical_relative"):
                relative.append(ex(r, r["canonical_html"][0]))
            if same_page(c, r["final_url"]):
                continue
            if host_of(c) not in variant_hosts(self.host):
                off_site.append(ex(r, f"canonical -> {c}"))
                continue
            st = self.resolve_status(c)
            target = self.pages.get(c)
            if st is not None and (st[2] or not (200 <= (st[0] or 0) < 300)):
                bad_target.append(ex(r, f"canonical -> {c} ({'redirects' if st[2] else 'status ' + str(st[0])})"))
            elif target is not None and target.get("noindex"):
                bad_target.append(ex(r, f"canonical -> {c} (which is noindex)"))
            elif urllib.parse.urlsplit(r["final_url"]).query:
                continue  # a parameter URL pointing at its clean version is the expected setup
            else:
                elsewhere.append(ex(r, f"canonical -> {c}"))
        if conflict:
            add("canonical_conflict", conflict, f"{len(conflict)} page(s) declare more than one different canonical URL.")
        else:
            ok("canonical_conflict", "no page declares conflicting canonicals")
        if bad_target:
            add("canonical_to_bad_target", bad_target, f"{len(bad_target)} page(s) point their canonical at a URL that redirects, errors or is noindex; for example {bad_target[0]['url']} ({bad_target[0]['detail']}).")
        else:
            ok("canonical_to_bad_target", "canonical targets that were checked return 200")
        if off_site:
            sev = "critical" if any(e["url"] in key for e in off_site) else "high"
            add("canonical_off_site", off_site, f"{len(off_site)} page(s) name a canonical on another domain; for example {off_site[0]['url']} ({off_site[0]['detail']}).", severity=sev)
        if elsewhere:
            add("canonical_elsewhere", elsewhere, f"{len(elsewhere)} page(s) name a different page as their canonical, so Google is asked to index the other page instead.")
        if missing_c:
            add("canonical_missing", missing_c, f"{len(missing_c)} indexable page(s) have no canonical tag. Google picks one itself; a self-referencing canonical removes the guesswork.")
        else:
            ok("canonical_missing", "every indexable page declares a canonical")
        if relative:
            add("canonical_relative", relative, f"{len(relative)} page(s) use a relative canonical URL.")

        # soft 404
        probe = self.site.get("soft_404")
        if probe:
            ran.add("soft_404")
            if probe["soft_404"]:
                add("soft_404", [ex(probe["final_url"], f"status {probe['status']}")],
                    f"A made-up address on the site answered {probe['status']} with a normal page instead of 404.")
            else:
                ok("soft_404", f"a made-up address answered {probe['status']}")

        # ---- links, statuses, redirects
        ran.update({"broken_internal_links", "server_errors", "redirect_chains"})
        sources_by_target = defaultdict(set)
        for r in content:
            for link in r.get("links_internal", []):
                sources_by_target[link["url"]].add(r["final_url"])
        broken = []
        for target, srcs in sources_by_target.items():
            st = self.resolve_status(target)
            if st is None:
                continue
            status, final, chain, err = st
            if status >= 400 or (status == 0 and err and "redirect" in err):
                share = len(srcs) / max(1, html_n)
                item = ex(target, f"status {status or err}; linked from {len(srcs)} page(s) such as {sorted(srcs)[0]}")
                item["sources"] = sorted(srcs)[:5]
                item["linked_from"] = len(srcs)
                item["sitewide"] = share >= 0.5 and html_n >= 5
                broken.append(item)
        if broken:
            sev = "critical" if any(b["sitewide"] or self.home_url in b["sources"] for b in broken) else "high"
            add("broken_internal_links", sorted(broken, key=lambda b: -b["linked_from"]),
                f"{len(broken)} internal link target(s) are broken; the most linked is {max(broken, key=lambda b: b['linked_from'])['url']} "
                f"(linked from {max(b['linked_from'] for b in broken)} page(s)).", severity=sev)
        else:
            ok("broken_internal_links", f"{sum(1 for t in sources_by_target if self.resolve_status(t) is not None)} internal link targets checked, none broken")
        errors5 = [ex(r["url"], f"status {r['status']}") for r in pages if r["status"] >= 500]
        if errors5:
            add("server_errors", errors5, f"{len(errors5)} URL(s) returned a server error (5xx).")
        else:
            ok("server_errors", "no server errors")
        chains, loops = [], []
        for url in list(self.pages) + list(self.link_checks):
            st = self.resolve_status(url)
            if not st:
                continue
            status, final, chain, err = st
            if err == "redirect loop" or (err and "redirect loop" in err):
                loops.append(ex(url, " -> ".join([c["url"] for c in chain][:4])))
            elif len(chain) >= 2:
                chains.append(ex(url, " -> ".join([c["url"] for c in chain] + [final])))
        if loops:
            add("redirect_loop", loops, f"{len(loops)} URL(s) redirect in a loop.")
        if chains:
            add("redirect_chains", chains, f"{len(chains)} internal URL(s) take two or more redirects to resolve.")
        elif not loops:
            ok("redirect_chains", "no multi-hop redirects among internal URLs")
        to_redirects = []
        for target, srcs in sources_by_target.items():
            st = self.resolve_status(target)
            if st and st[2] and 200 <= st[0] < 300:
                to_redirects.append(ex(target, f"redirects to {st[1]}; linked from {len(srcs)} page(s)"))
        if to_redirects:
            add("internal_links_to_redirects", to_redirects, f"Internal links point at {len(to_redirects)} URL(s) that redirect (often http://, a missing slash or an old path).")
        # orphans and depth
        if self.sitemap_urls:
            ran.add("orphan_pages")
            linked = set(sources_by_target)
            orphans = [ex(r) for r in content if r["source"] == "sitemap" and r["url"] not in linked
                       and r["final_url"] not in linked and r["index_state"] == "indexable" and r["ptype"] != "homepage"]
            if orphans:
                caveat = "" if not self.truncated else " The crawl stopped at its page limit, so some of these may be linked from pages it didn't reach."
                add("orphan_pages", orphans,
                    f"{len(orphans)} page(s) in the sitemap had no link from any of the {html_n} pages crawled.{caveat}",
                    severity="low" if self.truncated else None, confidence="observed" if not self.truncated else "partial")
            else:
                ok("orphan_pages", "every sitemap page fetched is linked from the crawled pages")
        deep = [ex(r, f"{r['depth']} clicks from the homepage") for r in public if (r.get("depth") or 0) > 3]
        ran.add("deep_pages")
        if deep:
            add("deep_pages", deep, f"{len(deep)} indexable page(s) sit more than 3 clicks from the homepage.")
        fetch_errors = [r for r in pages if r["status"] == 0]
        if fetch_errors:
            self.not_checked.append({"what": f"{len(fetch_errors)} page(s)", "why": "no answer to this crawler (" + clip(fetch_errors[0].get("error") or "error", 80) + "), so their content was not checked"})
        refused = [r for r in pages if r["status"] in (401, 403, 429)]
        if refused:
            self.not_checked.append({"what": f"{len(refused)} page(s)", "why": f"refused this crawler with {refused[0]['status']}; they may load fine for visitors and search engines"})

        # ---- JavaScript rendering
        ran.add("js_rendered_content")
        if shells:
            share = len(shells) / max(1, html_n)
            key_shells = [r for r in shells if r["key"]]
            sev = "high" if (share >= 0.5 or any(r["ptype"] == "homepage" for r in shells)) else "medium"
            add("js_rendered_content", [ex(r, f"{r['body_words']} words in the HTML, {r['script_count']} scripts") for r in shells],
                f"{len(shells)} of {html_n} pages send almost no text in their HTML ({shells[0]['body_words']} word(s) on {shells[0]['final_url']}); the content is built by JavaScript in the browser. Word counts, headings and content checks on those pages are left out rather than reported as thin.",
                severity=sev, extra={"share": round(share, 2), "key_shells": len(key_shells)})
        else:
            ok("js_rendered_content", "pages send their text in the HTML")

        # ---- on-page basics (indexable public pages, shells excluded)
        textual = [r for r in public if r["final_url"] not in shell_urls]
        ran.update({"title_missing", "title_duplicate", "h1_missing", "viewport_missing", "description_missing"})
        miss_title = [ex(r) for r in public if not r.get("title")]
        if miss_title:
            add("title_missing", miss_title, f"{len(miss_title)} indexable page(s) have no title tag.")
        else:
            ok("title_missing", f"all {len(public)} indexable pages have a title")
        dup_t = defaultdict(list)
        for r in public:
            if r.get("title"):
                dup_t[r["title"].strip().lower()].append(r)
        dups = [grp for grp in dup_t.values() if len(grp) > 1]
        if dups:
            items = [ex(r, f"\"{clip(r['title'], 70)}\" on {len(grp)} pages") for grp in sorted(dups, key=len, reverse=True) for r in grp]
            add("title_duplicate", items, f"{sum(len(g) for g in dups)} pages share {len(dups)} title(s); the most repeated is \"{clip(max(dups, key=len)[0]['title'], 70)}\" on {len(max(dups, key=len))} pages.")
        else:
            ok("title_duplicate", "titles are unique")
        long_t = [ex(r, f"{r['title_len']} characters") for r in public if r.get("title_len") and r["title_len"] > 60]
        short_t = [ex(r, f"{r['title_len']} characters: \"{r['title']}\"") for r in public if r.get("title_len") and r["title_len"] < 30]
        if long_t or short_t:
            parts = []
            if long_t:
                parts.append(f"{len(long_t)} title(s) run past 60 characters, where Google cuts them off in results")
            if short_t:
                parts.append(f"{len(short_t)} title(s) are under 30 characters (for example \"{clip(next(r['title'] for r in public if r.get('title_len') and r['title_len'] < 30), 40)}\")")
            add("title_length", long_t + short_t, "; ".join(parts) + ".")
        miss_d = [ex(r) for r in public if not (r.get("description") or "").strip()]
        if miss_d:
            add("description_missing", miss_d, f"{len(miss_d)} indexable page(s) have no meta description, so Google writes the search snippet itself.")
        else:
            ok("description_missing", "every indexable page has a meta description")
        dup_d = defaultdict(list)
        for r in public:
            if (r.get("description") or "").strip():
                dup_d[r["description"].strip().lower()].append(r)
        dd = [g for g in dup_d.values() if len(g) > 1]
        if dd:
            add("description_duplicate", [ex(r) for g in dd for r in g], f"{sum(len(g) for g in dd)} pages share {len(dd)} meta description(s).")
        no_h1 = [ex(r) for r in textual if r.get("h1_count", 0) == 0]
        if no_h1:
            add("h1_missing", no_h1, f"{len(no_h1)} indexable page(s) have no H1 heading.")
        else:
            ok("h1_missing", "every page with text has an H1")
        multi_h1 = [ex(r, f"{r['h1_count']} H1s") for r in textual if r.get("h1_count", 0) > 1]
        if multi_h1:
            add("h1_multiple", multi_h1, f"{len(multi_h1)} page(s) have more than one H1.")
        no_vp = [ex(r) for r in public if not r.get("viewport")]
        if no_vp:
            add("viewport_missing", no_vp, f"{len(no_vp)} page(s) have no mobile viewport tag, so phones show them as shrunken desktop pages.")
        else:
            ok("viewport_missing", "every page sets a mobile viewport")
        no_lang = [ex(r) for r in public if not r.get("lang")]
        if no_lang:
            add("lang_missing", no_lang, f"{len(no_lang)} page(s) don't declare a language on the html tag.")
        nofollow_key = [ex(r, ", ".join(r.get("robots_meta") or r.get("googlebot_meta") or [r.get("x_robots_tag") or "nofollow"]))
                        for r in content if r.get("nofollow") and (r["key"] or r["ptype"] == "homepage")]
        if nofollow_key:
            add("nofollow_key_pages", nofollow_key, f"{len(nofollow_key)} key page(s) tell search engines not to follow their links, for example {nofollow_key[0]['url']}.",
                severity="critical" if any(e["url"] == self.home_url for e in nofollow_key) else None)
        refresh = [ex(r, r.get("meta_refresh")) for r in content if r.get("meta_refresh")]
        if refresh:
            add("meta_refresh", refresh, f"{len(refresh)} page(s) use a meta refresh redirect.")
        heading_issues = []
        for r in textual:
            hs = r.get("headings") or []
            if any(not h["text"] for h in hs):
                heading_issues.append(ex(r, "empty heading"))
            elif any(hs[i + 1]["level"] > hs[i]["level"] + 1 for i in range(len(hs) - 1)):
                heading_issues.append(ex(r, "heading levels skip"))
        if heading_issues:
            add("heading_structure", heading_issues, f"{len(heading_issues)} page(s) have empty headings or skip heading levels.")

        # images and anchors
        ran.update({"images_missing_alt", "anchor_text"})
        alt_missing, dims_missing, legacy = [], [], []
        for r in textual:
            imgs = r.get("images") or []
            m_alt = [i for i in imgs if i["alt"] is None]
            if m_alt:
                alt_missing.append(ex(r, f"{len(m_alt)} of {len(imgs)} images, e.g. {clip(m_alt[0]['src'], 80)}"))
            m_dim = [i for i in imgs if not i["has_dims"] and i["format"] != "svg"]
            if m_dim:
                dims_missing.append(ex(r, f"{len(m_dim)} of {len(imgs)} images"))
            fmts = {i["format"] for i in imgs if i["format"]}
            if imgs and fmts and not (fmts & {"webp", "avif", "svg"}) and not r.get("modern_sources"):
                legacy.append(ex(r, ", ".join(sorted(fmts))))
        if alt_missing:
            add("images_missing_alt", alt_missing, f"{len(alt_missing)} page(s) have images with no alt attribute.")
        else:
            ok("images_missing_alt", "images carry alt attributes")
        if dims_missing:
            add("images_missing_dimensions", dims_missing, f"{len(dims_missing)} page(s) have images without width and height, which can make the layout jump while loading.")
        if legacy and len(legacy) >= max(3, len(textual) // 2):
            add("images_legacy_formats", legacy, f"{len(legacy)} page(s) serve only JPEG/PNG/GIF images.")
        generic = {"click here", "read more", "learn more", "here", "more", "link", "this", "more info", "details"}
        anchors = []
        for r in textual:
            empty = [l for l in r.get("links_internal", []) if not l["anchor"].strip()]
            gen = [l for l in r.get("links_internal", []) if l["anchor"].strip().lower() in generic]
            if empty or len(gen) >= 3:
                anchors.append(ex(r, f"{len(empty)} link(s) with no text, {len(gen)} 'click here'-style"))
        if anchors:
            add("anchor_text", anchors, f"{len(anchors)} page(s) have internal links with no text or generic text, which tells Google nothing about the page linked.")
        else:
            ok("anchor_text", "internal links have descriptive text")

        # ---- content: thin, duplicate, near-duplicate
        ran.update({"thin_content", "duplicate_content", "near_duplicate_content"})
        thin_recs_all = [r for r in textual
                         if r["word_count"] < 300 and r["ptype"] in ("homepage", "money", "article", "general")
                         and not (r["ptype"] == "money" and "contact" in r["final_url"].lower())]
        thin_recs_all.sort(key=lambda r: (r["ptype"] not in ("homepage", "money"), r["word_count"]))
        thin = [ex(r, f"{r['word_count']} words") for r in thin_recs_all]
        if thin:
            thin_recs = [r for r in textual if r["final_url"] in {t["url"] for t in thin}]
            money_thin = [r for r in thin_recs if r["ptype"] in ("homepage", "money")]
            sev = "high" if any(r["ptype"] == "homepage" for r in thin_recs) or len(money_thin) >= 3 else "medium"
            add("thin_content", thin, f"{len(thin)} indexable page(s) have under 300 words of main content"
                + (f", {len(money_thin)} of them the homepage or service, location or product pages" if money_thin else "") + ".",
                severity=sev, keep_order=True)
        else:
            ok("thin_content", f"{len(textual)} pages with text all have 300+ words")
        by_hash = defaultdict(list)
        for r in textual:
            h = (r.get("fingerprint") or {}).get("exact")
            if h:
                by_hash[h].append(r)
        clusters = [g for g in by_hash.values() if len(g) > 1]
        if clusters:
            items = [ex(r, f"same text as {len(g) - 1} other page(s)") for g in clusters for r in g]
            sev = "high" if any(r["key"] for g in clusters for r in g) else "medium"
            add("duplicate_content", items, f"{sum(len(g) for g in clusters)} indexable pages fall into {len(clusters)} group(s) with identical main text.", severity=sev,
                extra={"clusters": [[r["final_url"] for r in g][:5] for g in clusters[:10]]})
        else:
            ok("duplicate_content", "no two indexable pages have identical main text")
        sims = [(r, int(r["fingerprint"]["simhash"], 16)) for r in textual if (r.get("fingerprint") or {}).get("simhash")]
        exact_ids = {id(r) for g in clusters for r in g}
        pairs = []
        for i in range(len(sims)):
            for j in range(i + 1, len(sims)):
                if id(sims[i][0]) in exact_ids and id(sims[j][0]) in exact_ids:
                    continue
                d = hamming(sims[i][1], sims[j][1])
                if d <= 4:
                    pairs.append((sims[i][0], sims[j][0], d))
        if pairs:
            items = []
            for a, b, d in pairs:
                items.append(ex(a, f"near-copy of {b['final_url']}"))
                items.append(ex(b, f"near-copy of {a['final_url']}"))
            add("near_duplicate_content", items, f"{len(pairs)} pair(s) of pages are near copies of each other (for example {pairs[0][0]['final_url']} and {pairs[0][1]['final_url']}); often town or service pages with only the name swapped.",
                extra={"pairs": [[a["final_url"], b["final_url"]] for a, b, _d in pairs[:15]]})
        else:
            ok("near_duplicate_content", "no near-copy page pairs")

        # ---- content signals on articles (evidence-backed signals only)
        articles = [r for r in textual if r["ptype"] == "article" and r["word_count"] >= 300]
        if articles:
            ran.update({"content_no_dates", "content_no_author", "content_no_answer_capsules", "content_thin_evidence"})
            no_dates = [ex(r) for r in articles if not r["signals"]["visible_date"]]
            stale = [ex(r, f"newest date {r['signals']['newest_date']}") for r in articles if (r["signals"]["age_days"] or 0) > 540]
            no_author = [ex(r) for r in articles if not r["signals"]["author"]]
            no_caps = [ex(r, f"{r['signals']['question_headings']} question headings, 0 short answers") for r in articles
                       if r["signals"]["question_headings"] >= 2 and r["signals"]["answer_capsules"] == 0]
            weak = [ex(r, f"{r['word_count']} words, 0 statistics, 0 quotations, 0 outside sources") for r in articles
                    if r["signals"]["stats"] == 0 and r["signals"]["quotations"] == 0 and r["signals"]["cited_sources"] == 0]
            if no_dates:
                add("content_no_dates", no_dates, f"{len(no_dates)} of {len(articles)} articles show no publish or updated date a reader can see.")
            else:
                ok("content_no_dates", f"all {len(articles)} articles show a date")
            if stale:
                add("content_stale", stale, f"{len(stale)} article(s) were last dated more than 18 months ago.")
            if no_author:
                add("content_no_author", no_author, f"{len(no_author)} of {len(articles)} articles name no author.")
            else:
                ok("content_no_author", f"all {len(articles)} articles name an author")
            if no_caps:
                add("content_no_answer_capsules", no_caps, f"{len(no_caps)} article(s) ask questions in their headings but never answer one in a short paragraph right under it.")
            if weak:
                add("content_thin_evidence", weak, f"{len(weak)} of {len(articles)} articles carry no statistics, no quotations and no outside sources.")
            else:
                ok("content_thin_evidence", "articles carry numbers, quotations or sources")

        # ---- structured data and entity
        ran.update({"schema_parse_errors", "org_schema_missing"})
        perr = [ex(r, "; ".join(r["schema"]["parse_errors"][:2])) for r in content if r.get("schema", {}).get("parse_errors")]
        if perr:
            add("schema_parse_errors", perr, f"{len(perr)} page(s) have structured data that isn't valid JSON, so search engines ignore it.")
        else:
            ok("schema_parse_errors", "structured data parses")
        probs = [ex(r, "; ".join(r["schema"]["problems"][:2])) for r in content if r.get("schema", {}).get("problems")]
        if probs:
            add("schema_problems", probs, f"{len(probs)} page(s) have structured data missing basic properties (for example \"{probs[0]['detail']}\").")
        faq_invisible = []
        for r in content:
            qs = r.get("schema", {}).get("faq_questions") or []
            if qs and r["final_url"] not in shell_urls:
                visible = r["schema"].get("faq_visible", 0)
                if visible < len(qs) / 2:
                    faq_invisible.append(ex(r, f"{len(qs) - visible} of {len(qs)} FAQ questions in the markup don't appear in the page text, e.g. \"{clip(next((q for q in qs), ''), 70)}\""))
        if faq_invisible:
            add("faq_markup_not_visible", faq_invisible, f"{len(faq_invisible)} page(s) carry FAQ markup for questions that aren't in the page's HTML text (for example {faq_invisible[0]['url']}: {faq_invisible[0]['detail']}).",
                confidence="observed in the HTML; questions added by JavaScript would not show here")
        dead = [ex(r, "HowTo") for r in content if "HowTo" in r.get("schema", {}).get("types", [])]
        if dead:
            add("schema_dead_types", dead, f"{len(dead)} page(s) carry HowTo markup, which Google stopped showing as a rich result in 2023.")
        home_types = set((home or {}).get("schema", {}).get("types", []) + (home or {}).get("schema", {}).get("microdata_types", [])) if home and home.get("html") else set()
        if home and home.get("html"):
            if not (home_types & ORG_TYPES or any(t.endswith("Business") for t in home_types)):
                add("org_schema_missing", [ex(self.home_url, ", ".join(sorted(home_types)) or "no structured data")],
                    "The homepage has no Organization or LocalBusiness markup tying the business name to this site.")
            else:
                ok("org_schema_missing", "the homepage names the business in Organization or LocalBusiness markup")
        orgs = [(r, o) for r in content for o in r.get("schema", {}).get("orgs", [])]
        names = Counter((o["name"] or "").strip().lower() for _r, o in orgs if o.get("name"))
        phones = Counter()
        for r in content:
            for t in r.get("tel", []):
                phones[t] += 1
        for _r, o in orgs:
            if o.get("telephone"):
                phones[re.sub(r"\D", "", o["telephone"])[-10:]] += 1
        ent_items = []
        if len(names) > 1:
            ent_items.append(ex(self.home_url, "business names in markup: " + "; ".join(n for n, _c in names.most_common(4))))
        main_phones = [p for p, c in phones.most_common() if p]
        if len(main_phones) > 1:
            ent_items.append(ex(self.home_url, f"{len(main_phones)} different phone numbers across the site: " + ", ".join(main_phones[:4])))
        if ent_items:
            add("entity_inconsistent", ent_items, "The business is described inconsistently across pages: " + "; ".join(e["detail"] for e in ent_items) + ".", confidence="observed")
        if orgs and not any(o.get("same_as") for _r, o in orgs):
            add("sameas_missing", [ex(orgs[0][0], "Organization/LocalBusiness markup without sameAs")],
                "The business markup doesn't link to the business's official profiles (sameAs).")
        self_rev = [ex(r, "AggregateRating/Review on the business's own markup") for r, o in orgs if o.get("has_rating")]
        if self_rev:
            add("self_serving_reviews", self_rev, f"{len(self_rev)} page(s) put review stars in the business's own markup; Google doesn't show stars for reviews a business publishes about itself.")
        no_sd = [ex(r) for r in public if not r.get("schema", {}).get("types") and not r.get("schema", {}).get("microdata_types")]
        if no_sd and len(no_sd) == len(public) and public:
            add("no_structured_data", no_sd, f"None of the {len(public)} main pages (leaving out privacy, terms and login pages) carry structured data.")

        # ---- security and mixed content
        if self.home_url.startswith("https://"):
            ran.update({"mixed_content", "hsts_missing"})
            active = [ex(r, f"{m['tag']} {m['url']}") for r in content for m in r.get("mixed_content", [])[:1] if m["kind"] == "active"]
            passive = [ex(r, f"{m['tag']} {m['url']}") for r in content for m in r.get("mixed_content", [])[:1] if m["kind"] == "passive"]
            if active:
                add("mixed_content", active, f"{len(active)} https page(s) load scripts, styles or frames over http://, which browsers block.", severity="high")
            elif passive:
                add("mixed_content", passive, f"{len(passive)} https page(s) load images or media over http://.", severity="low")
            else:
                ok("mixed_content", "no http:// resources on https pages")
            if home and home.get("html") and not (home.get("headers") or {}).get("strict-transport-security"):
                add("hsts_missing", [ex(self.home_url)], "The homepage doesn't send a Strict-Transport-Security header.")

        # ---- speed
        ttfbs = [r["ttfb_ms"] for r in content if r.get("ttfb_ms") is not None]
        if ttfbs:
            ran.add("slow_server")
            slow = [ex(r, f"{r['ttfb_ms']} ms") for r in content if (r.get("ttfb_ms") or 0) > 1800]
            if slow and len(slow) >= max(2, len(content) * 0.2):
                ttfbs_sorted = sorted(ttfbs)
                add("slow_server", slow, f"The server took over 1.8 seconds to start answering on {len(slow)} page(s) (median {ttfbs_sorted[len(ttfbs_sorted) // 2]} ms from where this audit ran).", confidence="observed from one location")
            else:
                ok("slow_server", f"median server response {sorted(ttfbs)[len(ttfbs) // 2]} ms from where this audit ran")
        cwv_pages = [p for p in self.cwv.get("pages", []) if not p.get("error")]
        if cwv_pages:
            ran.add("cwv_poor")
            poor, ni, lab_slow = [], [], []
            for p in cwv_pages:
                field = p.get("field") or {}
                core = {k: v for k, v in field.items() if k in ("lcp_ms", "inp_ms", "cls")}
                if core:
                    bad = [f"{k} p75 {v['p75']}" for k, v in core.items() if v["rating"] == "poor"]
                    mid = [f"{k} p75 {v['p75']}" for k, v in core.items() if v["rating"] == "needs improvement"]
                    scope = p.get("field_scope") or "page"
                    if bad:
                        poor.append(ex(p["url"], ", ".join(bad) + f" ({scope} data)"))
                    elif mid:
                        ni.append(ex(p["url"], ", ".join(mid) + f" ({scope} data)"))
                else:
                    lab = p.get("lab") or {}
                    if (lab.get("lcp_ms") or 0) > 4000 or (lab.get("tbt_ms") or 0) > 600 or (lab.get("cls") or 0) > 0.25:
                        lab_slow.append(ex(p["url"], f"lab LCP {lab.get('lcp_ms')} ms, TBT {lab.get('tbt_ms')} ms, CLS {lab.get('cls')}"))
            if poor:
                add("cwv_poor", poor, f"Real visitors on phones get a poor experience on {len(poor)} measured page(s): {poor[0]['detail']}.",
                    severity="high" if any(e["url"] in key or same_page(e["url"], self.home_url) for e in poor) else "medium")
            else:
                ok("cwv_poor", "no measured page has poor field Core Web Vitals")
            if ni:
                add("cwv_needs_improvement", ni, f"{len(ni)} measured page(s) are in Google's 'needs improvement' band: {ni[0]['detail']}.")
            if lab_slow:
                add("lab_slow", lab_slow, f"No real-visitor data; a simulated phone load was slow on {len(lab_slow)} page(s): {lab_slow[0]['detail']}.", confidence="lab only")

        # ---- social and international
        ran.add("social_tags_missing")
        soc = [ex(r, "missing " + ", ".join(k for k in ("title", "description", "image") if not r["og"].get(k)))
               for r in public if r.get("key") and not all(r["og"].get(k) for k in ("title", "image"))]
        if soc:
            add("social_tags_missing", soc, f"{len(soc)} key page(s) lack Open Graph title or image, so shared links show a bare preview.")
        else:
            ok("social_tags_missing", "key pages carry Open Graph tags")
        hl_pages = [r for r in content if r.get("hreflang")]
        if hl_pages:
            ran.add("hreflang_issues")
            issues = []
            by_url = {r["final_url"]: r for r in hl_pages}
            for r in hl_pages:
                langs = {h["lang"] for h in r["hreflang"]}
                if "x-default" not in langs:
                    issues.append(ex(r, "no x-default"))
                if not any(same_page(h["url"], r["final_url"]) for h in r["hreflang"]):
                    issues.append(ex(r, "doesn't list itself"))
                for h in r["hreflang"]:
                    tgt = by_url.get(h["url"])
                    if tgt is not None and not any(same_page(x["url"], r["final_url"]) for x in tgt["hreflang"]):
                        issues.append(ex(r, f"{h['url']} doesn't link back"))
                        break
            if issues:
                add("hreflang_issues", issues, f"{len(issues)} hreflang problem(s), for example {issues[0]['url']}: {issues[0]['detail']}.")
            else:
                ok("hreflang_issues", "hreflang annotations are consistent")

        # ---- URL hygiene
        url_items = []
        for r in public:
            parts = urllib.parse.urlsplit(r["final_url"])
            why = []
            if parts.path != parts.path.lower():
                why.append("uppercase")
            if "_" in parts.path:
                why.append("underscores")
            if len(r["final_url"]) > 115:
                why.append(f"{len(r['final_url'])} characters")
            if why:
                url_items.append(ex(r, ", ".join(why)))
        if url_items:
            add("url_hygiene", url_items, f"{len(url_items)} indexable URL(s) use uppercase letters, underscores or run long.")

        self.checks_run = sorted(ran | {f["id"] for f in findings})
        findings.sort(key=lambda f: (-SEVERITY_ORDER[f["severity"]], -f["rank_score"], f["id"]))
        return findings, fine

    # --------------------------------------------------------------- run

    def run(self):
        url = self.args.url.strip()
        if not re.match(r"https?://", url, re.I):
            url = "https://" + url
        start_url = normalize_url(url)
        if not start_url:
            raise SystemExit(f"Not a usable URL: {self.args.url}")
        if host_of(start_url) in ("example.com", "www.example.com", "yourdomain.com", "www.yourdomain.com", "example.org"):
            self.notes.append("The target looks like a placeholder domain; findings describe that placeholder, not a real business.")
        parts = urllib.parse.urlsplit(start_url)
        origin = f"{parts.scheme}://{parts.netloc}"
        self.robots_by_host = {}
        self.log(f"robots.txt: {origin}/robots.txt")
        robots, rinfo = self.fetch_robots(origin)
        self.robots_by_host[host_of(origin)] = robots
        self.host = host_of(start_url)
        allowed, rule = robots.check(TOOL_TOKEN, start_url)[:2]
        home_res = None
        if allowed:
            home_res = self.fetcher.get(start_url)
        else:
            self.not_checked.append({"what": "every page", "why": f"robots.txt asks crawlers like this one to stay out (\"{rule}\"), and this audit honors it"})
        final = home_res["final_url"] if home_res and home_res["status"] else start_url
        if host_of(final) != host_of(start_url) or urllib.parse.urlsplit(final).scheme != parts.scheme:
            fparts = urllib.parse.urlsplit(final)
            origin = f"{fparts.scheme}://{fparts.netloc}"
            if host_of(final) not in self.robots_by_host:
                self.log(f"robots.txt: {origin}/robots.txt (the homepage redirects here)")
                robots, rinfo = self.fetch_robots(origin)
                self.robots_by_host[host_of(final)] = robots
            else:
                robots = self.robots_by_host[host_of(final)]
        self.origin = origin
        self.host = host_of(final)
        self.home_url = final
        delay = robots.crawl_delay(TOOL_TOKEN)
        if delay:
            self.fetcher.delay = max(self.fetcher.delay, min(delay, 10.0))
            self.concurrency = 1
            self.notes.append(f"robots.txt sets Crawl-delay {delay}; the crawl ran one request at a time, {self.fetcher.delay:.1f}s apart.")
        self.site["robots"] = rinfo
        self.site["start_url"] = start_url
        self.site["final_url"] = final
        self.site["server_hints"] = server_hints(home_res["headers"]) if home_res else []

        self.log("sitemaps")
        sm_info, sm_urls = self.read_sitemaps(origin, robots)
        self.site["sitemap"] = sm_info
        self.sitemap_urls = set(sm_urls)

        if home_res is not None:
            self.record_page(final, home_res if final == start_url else dict(home_res, chain=[]), 0, "home")
            if final != start_url:
                self.pages[start_url] = {
                    "url": start_url, "final_url": final, "status": home_res["status"], "depth": 0, "source": "start",
                    "chain": home_res["chain"], "ttfb_ms": home_res.get("first_ttfb_ms"), "total_ms": home_res.get("total_ms"),
                    "error": home_res.get("error"), "content_type": None, "bytes": 0, "truncated": False, "headers": {}, "html": False,
                }
            self.log(f"crawling up to {self.max_pages} pages on {self.host}")
            self.crawl(final, sm_urls)
            self.link_check()
        if self.args.rendered:
            try:
                raw = Path(self.args.rendered).read_text(encoding="utf-8")
                records = json.loads(raw) if raw.lstrip().startswith("[") else [json.loads(l) for l in raw.splitlines() if l.strip()]
                norm = []
                for item in records:
                    data = item.get("data", item)
                    meta = data.get("metadata") or {}
                    norm.append({"url": data.get("url") or meta.get("sourceURL") or meta.get("url"),
                                 "html": data.get("html") or data.get("rawHtml"), "source": "rendered file"})
                n = self.apply_rendered(norm)
                self.notes.append(f"Re-read {n} page(s) from rendered HTML supplied in {Path(self.args.rendered).name}.")
            except (OSError, ValueError) as err:
                self.not_checked.append({"what": "rendered HTML", "why": f"could not read {self.args.rendered}: {clip(str(err), 100)}"})
        if self.args.render == "firecrawl":
            n = self.render_with_firecrawl(self.args.render_limit)
            if n:
                self.notes.append(f"Re-read {n} page(s) from JavaScript-rendered HTML (Firecrawl).")

        self.log("site checks: host variants, soft 404, AI files")
        self.site["host_variants"] = self.check_variants(final) if home_res is not None else []
        self.site["soft_404"] = self.soft_404_probe(origin) if home_res is not None else None
        self.site["ai_files"] = self.check_ai_files(origin)
        sample_paths = ["/"] + [path_of(r["final_url"]) for r in list(self.pages.values())[:150] if r.get("html")]
        ai = {}
        for bot in AI_BOTS:
            pol = robots.policy(bot["token"], sample_paths)
            pol.update(role=bot["role"], vendor=bot["vendor"], blocking_costs=bot["blocking_costs"])
            ai[bot["token"]] = pol
        self.site["ai_crawlers"] = ai if rinfo.get("state") == "present" else {}
        if rinfo.get("state") != "present":
            self.site["ai_crawlers_note"] = ("No robots.txt rules, so every crawler is allowed by robots.txt."
                                             if rinfo.get("state") == "absent" else "robots.txt could not be read, so crawler rules are unknown.")
        if not self.args.no_bot_check and home_res is not None:
            self.log("edge check: the homepage as a browser and as each AI crawler")
            self.site["edge_check"] = self.edge_check(final)
        elif self.args.no_bot_check:
            self.not_checked.append({"what": "AI crawler access at the CDN", "why": "skipped (--no-bot-check)"})

        self.prepare()
        if home_res is not None:
            self.run_cwv(final, origin)
        findings, fine = self.analyze()
        self.site["js_rendering"] = {
            "shell_pages": sum(1 for r in self.content_pages() if r.get("js_shell") and not r.get("rendered")),
            "rendered_pages": sum(1 for r in self.pages.values() if r.get("rendered")),
        }
        self.site["content_signals"] = self.signal_summary()
        return findings, fine

    def signal_summary(self):
        arts = [r for r in self.content_pages() if r.get("ptype") == "article" and r["index_state"] == "indexable" and r["word_count"] >= 300]
        if not arts:
            return {"articles": 0}
        n = len(arts)
        ages = sorted(r["signals"]["age_days"] for r in arts if r["signals"]["age_days"] is not None)
        dens = sorted(r["signals"]["stats_per_100_words"] for r in arts)
        return {
            "articles": n,
            "with_visible_date": sum(1 for r in arts if r["signals"]["visible_date"]),
            "with_machine_date": sum(1 for r in arts if r["signals"]["published"] or r["signals"]["modified"] or r["signals"]["time_element"]),
            "median_age_days": ages[len(ages) // 2] if ages else None,
            "with_author": sum(1 for r in arts if r["signals"]["author"]),
            "median_stats_per_100_words": dens[len(dens) // 2],
            "with_quotations": sum(1 for r in arts if r["signals"]["quotations"]),
            "with_outside_sources": sum(1 for r in arts if r["signals"]["cited_sources"]),
            "with_question_headings": sum(1 for r in arts if r["signals"]["question_headings"]),
            "with_answer_capsules": sum(1 for r in arts if r["signals"]["answer_capsules"]),
        }


# ----------------------------------------------------------------------------- check registry

def _c(category, severity, title, fix, effort, escalate_on_key=False):
    return {"category": category, "severity": severity, "title": title, "fix": fix, "effort": effort,
            "escalate_on_key": escalate_on_key}


CHECKS = {
    # indexing and crawl access
    "homepage_unreachable": _c("indexing", "critical", "The homepage doesn't load for crawlers", "Find out why the server refuses or errors (hosting, firewall, an expired domain) and fix that first; nothing else matters until it loads.", "depends"),
    "tls_error": _c("indexing", "critical", "The HTTPS certificate fails", "Renew or reinstall the certificate (most hosts and CDNs issue one free) and make sure it covers both the www and bare domain.", "under an hour"),
    "not_https": _c("security", "critical", "The site isn't on HTTPS", "Turn on HTTPS at the host or CDN and redirect every http:// URL to its https:// version in one hop.", "an hour or two"),
    "host_variants": _c("indexing", "high", "Other versions of the domain don't redirect to the main one", "Pick one address (https, with or without www) and 301-redirect the other three versions to it in one hop.", "under an hour"),
    "robots_unreachable": _c("indexing", "critical", "robots.txt returns an error", "Make /robots.txt return 200 with plain text (or a clean 404). Server errors on robots.txt make Google pause crawling.", "under an hour"),
    "robots_is_html": _c("indexing", "medium", "robots.txt is a web page, not rules", "Serve a plain-text robots.txt (content-type text/plain) with your real rules and the sitemap line.", "minutes"),
    "robots_missing": _c("indexing", "low", "No robots.txt", "Optional. Add a robots.txt that allows crawling and lists the sitemap: 'User-agent: *', 'Allow: /', 'Sitemap: <url>'.", "minutes"),
    "robots_too_large": _c("indexing", "medium", "robots.txt is over Google's 500 KiB limit", "Consolidate rules (block folders, not single URLs) until the file is well under 500 KiB.", "an hour"),
    "robots_blocks_google": _c("indexing", "critical", "robots.txt blocks Google from the site", "Remove the Disallow rule that covers '/' for Googlebot or '*'. Check staging rules didn't ship to the live site.", "minutes"),
    "robots_blocks_pages": _c("indexing", "high", "robots.txt blocks pages that should be found", "Remove or narrow the Disallow rules that match these pages; block only admin, cart and search paths.", "minutes", escalate_on_key=True),
    "robots_blocks_resources": _c("indexing", "medium", "robots.txt blocks CSS or JavaScript Google needs", "Allow the folders that hold theme CSS and JavaScript so Google can render pages as visitors see them.", "minutes"),
    "noindex_key_pages": _c("indexing", "critical", "Money pages are marked noindex", "Remove noindex from these pages (an SEO plugin setting, a page setting, or an X-Robots-Tag header), then request indexing in Search Console.", "minutes"),
    "noindex_pages": _c("indexing", "medium", "Pages marked noindex", "Confirm each one is meant to stay out of Google; remove noindex from any that should rank.", "minutes"),
    "soft_404": _c("indexing", "medium", "Missing pages answer 200 instead of 404", "Make unknown URLs return a real 404 status (the page can still look friendly).", "an hour"),
    "js_rendered_content": _c("indexing", "high", "Pages build their text with JavaScript", "Serve the main text in the HTML (server-side rendering or pre-rendering). Google renders JavaScript later than HTML, and AI crawlers may read only the HTML they are sent.", "developer, days"),
    # sitemaps
    "sitemap_missing": _c("indexing", "medium", "No sitemap", "Generate an XML sitemap of indexable pages (most CMSs and SEO plugins do this), list it in robots.txt and submit it in Search Console.", "under an hour"),
    "sitemap_unparseable": _c("indexing", "high", "The sitemap can't be read", "Fix the sitemap so it is valid XML with a <urlset> or <sitemapindex> root; regenerate it from the CMS if needed.", "under an hour"),
    "sitemap_errors": _c("indexing", "low", "The sitemap has errors", "Regenerate the sitemap with https URLs on this host and real lastmod dates.", "under an hour"),
    "sitemap_not_in_robots": _c("indexing", "low", "robots.txt doesn't list the sitemap", "Add a 'Sitemap: <full sitemap URL>' line to robots.txt.", "minutes"),
    "noindex_in_sitemap": _c("indexing", "high", "The sitemap lists pages marked noindex", "Decide per page: remove noindex if it should rank, or drop it from the sitemap if it shouldn't. Mixed signals waste crawl and confuse reports.", "under an hour", escalate_on_key=True),
    "sitemap_non_200": _c("indexing", "medium", "The sitemap lists URLs that redirect or error", "List only final, working URLs; replace redirected entries with their destinations and drop dead ones.", "under an hour"),
    "sitemap_blocked_by_robots": _c("indexing", "high", "The sitemap lists URLs robots.txt blocks", "Unblock those URLs or remove them from the sitemap, whichever matches intent.", "minutes", escalate_on_key=True),
    "sitemap_canonicalized": _c("indexing", "medium", "The sitemap lists pages that point their canonical elsewhere", "List the canonical URL in the sitemap, not the duplicate.", "under an hour"),
    "indexable_not_in_sitemap": _c("indexing", "low", "Indexable pages missing from the sitemap", "Add these pages to the sitemap (or check why the CMS leaves them out).", "minutes"),
    # canonicals
    "canonical_conflict": _c("indexing", "high", "Pages declare conflicting canonicals", "Keep one canonical per page; remove the duplicate tag or header (often two plugins both adding one).", "under an hour", escalate_on_key=True),
    "canonical_to_bad_target": _c("indexing", "high", "Canonicals point at broken, redirected or noindex pages", "Point each canonical at the final, working, indexable URL (usually the page itself).", "under an hour", escalate_on_key=True),
    "canonical_off_site": _c("indexing", "high", "Canonicals point to another domain", "Unless the content is syndicated on purpose, set the canonical to this site's own URL; look for staging or old-domain leftovers.", "minutes"),
    "canonical_elsewhere": _c("indexing", "medium", "Pages ask Google to index a different page", "Check each one. If the page should rank on its own, make its canonical self-referencing.", "under an hour", escalate_on_key=True),
    "canonical_missing": _c("indexing", "low", "No canonical tag", "Add a self-referencing canonical to each indexable page (SEO plugins do this by default).", "minutes"),
    "canonical_relative": _c("indexing", "info", "Relative canonical URLs", "Use absolute canonical URLs (https://host/path).", "minutes"),
    "nofollow_key_pages": _c("indexing", "high", "Key pages tell search engines not to follow their links", "Remove nofollow from the meta robots tag or X-Robots-Tag on these pages; links on them are how Google finds the rest of the site.", "minutes"),
    "meta_refresh": _c("indexing", "medium", "Meta refresh redirects", "Replace meta refresh with a server-side 301 redirect.", "minutes"),
    # links
    "broken_internal_links": _c("links", "high", "Broken internal links", "Update or remove each broken link; if a page moved, 301-redirect the old URL to its replacement.", "an hour or two"),
    "server_errors": _c("links", "high", "Pages return server errors", "Check the server or application logs for these URLs and fix the error.", "depends", escalate_on_key=True),
    "redirect_loop": _c("links", "high", "Redirect loops", "Break the loop so each URL redirects once to a final 200 page.", "under an hour"),
    "redirect_chains": _c("links", "medium", "Redirect chains", "Point each old URL straight at its final destination in one hop.", "under an hour"),
    "internal_links_to_redirects": _c("links", "low", "Internal links point at redirecting URLs", "Update internal links to the final URLs (fix the menu and footer first; they repeat on every page).", "an hour"),
    "orphan_pages": _c("links", "medium", "Pages no other page links to", "Link each page from a relevant service, hub or menu page, or retire it if nobody needs it.", "an hour"),
    "deep_pages": _c("links", "low", "Pages buried more than 3 clicks deep", "Link important pages from the menu, the homepage or a hub page.", "an hour"),
    # on-page
    "title_missing": _c("on-page", "high", "Pages without a title", "Write a unique title for each page: the service or topic first, then the place or brand.", "minutes per page", escalate_on_key=True),
    "title_duplicate": _c("on-page", "medium", "Duplicate titles", "Give each page its own title that says what is different about it.", "minutes per page"),
    "title_length": _c("on-page", "low", "Titles too long or too short", "Keep titles roughly 30 to 60 characters with the important words first.", "minutes per page"),
    "description_missing": _c("on-page", "low", "No meta description", "Write a one-sentence description with the offer and a reason to click; it shapes the search snippet, not the ranking.", "minutes per page"),
    "description_duplicate": _c("on-page", "low", "Duplicate meta descriptions", "Write a description per page, or remove the template default so Google writes its own.", "minutes per page"),
    "h1_missing": _c("on-page", "medium", "No H1 heading", "Give each page one visible H1 that says what the page is about.", "minutes per page"),
    "h1_multiple": _c("on-page", "info", "More than one H1", "Fine for most sites; use one H1 where it's easy.", "minutes"),
    "heading_structure": _c("on-page", "info", "Empty or skipped headings", "Remove empty heading tags and keep heading levels in order.", "minutes"),
    "viewport_missing": _c("on-page", "high", "No mobile viewport", "Add <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"> to the page template.", "minutes", escalate_on_key=True),
    "lang_missing": _c("on-page", "info", "No language declared", "Add lang=\"en\" (or the right language) to the html tag.", "minutes"),
    "images_missing_alt": _c("on-page", "low", "Images without alt text", "Describe meaningful images in a few words; use alt=\"\" for decorative ones.", "an hour"),
    "images_missing_dimensions": _c("on-page", "low", "Images without width and height", "Set width and height (or CSS aspect-ratio) on images so the layout doesn't jump.", "an hour"),
    "images_legacy_formats": _c("on-page", "info", "No WebP or AVIF images", "Serve WebP or AVIF (most CDNs and image plugins convert automatically).", "under an hour"),
    "anchor_text": _c("on-page", "low", "Links with empty or generic text", "Use the destination's topic as link text ('water heater repair', not 'click here').", "an hour"),
    # content
    "thin_content": _c("content", "medium", "Pages with little text", "Add what a customer needs to decide (what's included, prices or ranges, the area served, proof) or merge thin pages into stronger ones.", "an hour per page"),
    "duplicate_content": _c("content", "medium", "Pages with identical text", "Merge the copies into one page and 301 the rest, or set canonicals; if each should rank, rewrite them.", "an hour per page"),
    "near_duplicate_content": _c("content", "medium", "Near-copy pages", "Make each page earn its place with facts specific to it (jobs done there, local details, photos), or merge them.", "an hour per page"),
    "content_no_dates": _c("content", "low", "Articles without a visible date", "Show 'Published' and 'Updated' dates near the headline and keep dateModified in the markup in step.", "minutes per page"),
    "content_stale": _c("content", "low", "Articles not updated in over 18 months", "Refresh the ones that still get traffic: new facts, current prices, then update the date.", "an hour per page"),
    "content_no_author": _c("content", "low", "Articles without an author", "Name a real author with a short bio and link to their profile.", "minutes per page"),
    "content_no_answer_capsules": _c("content", "low", "Questions without a short direct answer", "Under each question heading, answer it in one to three plain sentences before going into detail.", "minutes per page"),
    "content_thin_evidence": _c("content", "low", "Articles with no numbers, quotes or sources", "Add the specific numbers you know, a quote from someone who does the work, and links to the sources behind any claim.", "an hour per page"),
    # AI access
    "search_engine_blocked": _c("ai-access", "high", "robots.txt blocks Bing", "Remove the Disallow for Bingbot unless the business truly wants out of Bing and Copilot.", "minutes"),
    "ai_search_blocked": _c("ai-access", "high", "AI search crawlers are blocked", "If the business wants to be found in AI answers, allow OAI-SearchBot, Claude-SearchBot and PerplexityBot in robots.txt (training crawlers can stay blocked).", "minutes"),
    "ai_user_fetch_blocked": _c("ai-access", "medium", "AI assistants can't open the pages", "Allow ChatGPT-User, Claude-User and Perplexity-User so assistants can read a page a customer asks about.", "minutes"),
    "ai_training_blocked": _c("ai-access", "info", "AI training crawlers are opted out", "No change needed unless the owner wants to be in training data; it doesn't affect AI search.", "none"),
    "ai_blocked_at_edge": _c("ai-access", "high", "The CDN or firewall refuses AI crawlers", "In the CDN or firewall bot settings, allow the AI search and assistant crawlers (verified by their published IP ranges) while keeping training crawlers blocked if wanted.", "under an hour"),
    "ai_training_blocked_at_edge": _c("ai-access", "info", "The CDN refuses AI training crawlers", "No change needed unless the owner wants to be in training data.", "none"),
    "llms_txt_missing": _c("ai-access", "info", "No llms.txt", "Optional. A short llms.txt costs minutes; don't expect it to move rankings or citations.", "minutes"),
    # structured data and entity
    "schema_parse_errors": _c("structured-data", "medium", "Broken structured data", "Fix the JSON so it validates (Google's Rich Results Test shows the error line).", "under an hour"),
    "schema_problems": _c("structured-data", "low", "Structured data missing basic properties", "Fill the missing properties from facts on the page, or remove markup the page can't support.", "under an hour"),
    "faq_markup_not_visible": _c("structured-data", "medium", "FAQ markup for questions not on the page", "Only mark up questions and answers visitors can see; remove the rest.", "minutes"),
    "schema_dead_types": _c("structured-data", "info", "HowTo markup", "Harmless but earns nothing; leave it or remove it.", "minutes"),
    "org_schema_missing": _c("structured-data", "low", "No business markup on the homepage", "Add Organization (or LocalBusiness) JSON-LD with the exact business name, URL, logo, phone and address, and sameAs links to profiles that exist.", "under an hour"),
    "entity_inconsistent": _c("structured-data", "low", "Business name or phone differs across pages", "Use one spelling of the business name and one main phone number everywhere (call-tracking numbers excepted, if intended).", "under an hour"),
    "sameas_missing": _c("structured-data", "info", "Business markup without sameAs", "Add sameAs links to the business's real profiles (Google Business Profile, Facebook, LinkedIn, Yelp). Never list a profile that doesn't exist.", "minutes"),
    "self_serving_reviews": _c("structured-data", "info", "Review stars in the business's own markup", "Remove self-published rating markup; it earns no stars and can look like a fake rating.", "minutes"),
    "no_structured_data": _c("structured-data", "info", "No structured data anywhere", "Optional hygiene. Start with the business markup on the homepage; add other types only where the page content supports them.", "under an hour"),
    # security
    "mixed_content": _c("security", "high", "http:// resources on https pages", "Load every script, stylesheet, frame and image over https://.", "under an hour"),
    "hsts_missing": _c("security", "low", "No HSTS header", "Send Strict-Transport-Security once the whole site is on HTTPS.", "minutes"),
    # speed
    "slow_server": _c("speed", "medium", "Slow server response", "Turn on page caching or a CDN, or move off overloaded hosting.", "a few hours"),
    "cwv_poor": _c("speed", "medium", "Real visitors get slow or jumpy pages", "Work the listed opportunities: the main image (size, format, preload), render-blocking scripts, and layout shifts from images and embeds without set sizes.", "developer, a day or more"),
    "cwv_needs_improvement": _c("speed", "low", "Core Web Vitals need improvement", "Same levers as above, smaller gap.", "a few hours"),
    "lab_slow": _c("speed", "low", "A simulated phone load is slow", "Same levers; confirm with real-visitor data once the page has enough traffic.", "a few hours"),
    # social, international, URLs
    "social_tags_missing": _c("social", "low", "Key pages lack share previews", "Add og:title, og:description and og:image (1200x630) to key pages.", "minutes"),
    "hreflang_issues": _c("international", "medium", "hreflang errors", "Make every language version list all versions including itself, link back, and add x-default.", "an hour or two"),
    "url_hygiene": _c("url", "info", "Untidy URLs", "Use lowercase, hyphenated, short URLs for new pages; don't rename old ones just for this.", "none"),
}


# ----------------------------------------------------------------------------- re-audit diff

def compare(old, new, old_pages=None, new_pages=None):
    """What changed between two findings files (and page lists when both exist)."""
    o = {f["id"]: f for f in old.get("findings", [])}
    n = {f["id"]: f for f in new.get("findings", [])}
    out = {"previous_run": old.get("generated_at"), "new": [], "resolved": [], "changed": [], "site": [], "pages": {}}
    for fid in n:
        if fid not in o:
            out["new"].append({"id": fid, "severity": n[fid]["severity"], "title": n[fid]["title"], "count": n[fid]["count"]})
    for fid in o:
        if fid not in n:
            out["resolved"].append({"id": fid, "severity": o[fid]["severity"], "title": o[fid]["title"], "was": o[fid]["count"]})
    for fid in n:
        if fid in o and (n[fid]["count"] != o[fid]["count"] or n[fid]["severity"] != o[fid]["severity"]):
            out["changed"].append({"id": fid, "title": n[fid]["title"], "count": [o[fid]["count"], n[fid]["count"]],
                                   "severity": [o[fid]["severity"], n[fid]["severity"]]})
    os_, ns_ = old.get("site", {}), new.get("site", {})
    for token, pol in (ns_.get("ai_crawlers") or {}).items():
        before = (os_.get("ai_crawlers") or {}).get(token, {}).get("state")
        if before and before != pol.get("state"):
            out["site"].append(f"robots.txt for {token}: {before} -> {pol.get('state')}")
    ob = ((os_.get("edge_check") or {}).get("bots") or {})
    for token, res in ((ns_.get("edge_check") or {}).get("bots") or {}).items():
        if token in ob and ob[token].get("verdict") != res.get("verdict"):
            out["site"].append(f"edge check for {token}: {ob[token].get('verdict')} -> {res.get('verdict')}")
    for key_name, label in (("state", "robots.txt"),):
        a, b = (os_.get("robots") or {}).get(key_name), (ns_.get("robots") or {}).get(key_name)
        if a != b:
            out["site"].append(f"{label}: {a} -> {b}")
    a, b = (os_.get("sitemap") or {}).get("url_count"), (ns_.get("sitemap") or {}).get("url_count")
    if a != b:
        out["site"].append(f"sitemap URLs: {a} -> {b}")
    for name in ("llms.txt",):
        a = ((os_.get("ai_files") or {}).get(name) or {}).get("state")
        b = ((ns_.get("ai_files") or {}).get(name) or {}).get("state")
        if a != b:
            out["site"].append(f"{name}: {a} -> {b}")
    ocwv = {p["url"]: p for p in (old.get("cwv") or {}).get("pages", []) if not p.get("error")}
    for p in (new.get("cwv") or {}).get("pages", []):
        q = ocwv.get(p.get("url"))
        if not q or p.get("error"):
            continue
        for metric in ("lcp_ms", "inp_ms", "cls"):
            a = ((q.get("field") or {}).get(metric) or {}).get("p75")
            b = ((p.get("field") or {}).get(metric) or {}).get("p75")
            if a is not None and b is not None and a != b:
                out["site"].append(f"{p['url']} field {metric} p75: {a} -> {b}")
        if q.get("score") is not None and p.get("score") is not None and q["score"] != p["score"]:
            out["site"].append(f"{p['url']} lab performance score: {q['score']} -> {p['score']}")
    if old_pages is not None and new_pages is not None:
        both = set(old_pages) & set(new_pages)
        changes = []
        for url in sorted(both):
            a, b = old_pages[url], new_pages[url]
            for field in ("status", "title", "index_state", "canonical"):
                if a.get(field) != b.get(field):
                    changes.append({"url": url, "field": field, "was": a.get(field), "now": b.get(field)})
        out["pages"] = {
            "in_both": len(both), "only_before": len(set(old_pages) - set(new_pages)),
            "only_now": len(set(new_pages) - set(old_pages)), "changed": changes[:100],
            "note": "Each run crawls within its page limit, so pages seen in only one run may simply have been outside the other run's sample.",
        }
    return out


def load_pages(path):
    pages = {}
    try:
        with open(path, encoding="utf-8") as fh:
            for line in fh:
                if line.strip():
                    rec = json.loads(line)
                    pages[rec["url"]] = rec
    except (OSError, ValueError):
        return None
    return pages


# ----------------------------------------------------------------------------- output

PAGE_FIELDS = ("url", "final_url", "status", "depth", "source", "chain", "ttfb_ms", "error", "content_type", "html",
               "ptype", "key", "inbound", "index_state", "title", "description", "canonical", "robots_meta",
               "x_robots_tag", "googlebot_rule", "h1_count", "word_count", "body_words", "js_shell", "rendered",
               "links_internal_total", "links_external_total", "images_total", "tel", "signals", "fingerprint")


def page_record(rec):
    out = {k: rec.get(k) for k in PAGE_FIELDS if k in rec}
    sch = rec.get("schema") or {}
    if sch:
        out["schema_types"] = sch.get("types", []) + sch.get("microdata_types", [])
        out["schema_errors"] = sch.get("parse_errors", [])
        out["orgs"] = sch.get("orgs", [])
    out["headings"] = [h for h in (rec.get("headings") or []) if h["level"] <= 3][:20]
    out["internal_links"] = [l["url"] for l in (rec.get("links_internal") or [])][:200]
    return out


def site_key(url):
    host = host_of(url if "://" in url else "https://" + url)
    return host[4:] if host.startswith("www.") else host


def find_previous(out_dir, url):
    """The newest earlier findings file for the same site under ./campaigns (the new run's
    folder included, since it is read before anything is written)."""
    found = set(Path("./campaigns").glob("site-audit-*/findings.json"))
    if (Path(out_dir) / "findings.json").is_file():
        found.add(Path(out_dir) / "findings.json")
    same = []
    for path in found:
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        if site_key(data.get("final_url") or data.get("target") or "") == site_key(url):
            same.append(path)
    return max(same, key=lambda p: p.stat().st_mtime) if same else None


def main(argv=None):
    ap = argparse.ArgumentParser(description="Polite technical SEO and AI-readiness crawl. Writes findings.json and pages.jsonl.")
    ap.add_argument("url")
    ap.add_argument("--mode", choices=("full", "quick"), default="full")
    ap.add_argument("--max-pages", type=int, default=None, help=f"default {DEFAULT_MAX_PAGES} (quick: {QUICK_MAX_PAGES}); hard cap {HARD_CAP_PAGES}")
    ap.add_argument("--out", default=None, help="output folder (default ./campaigns/site-audit-<domain>-<date>)")
    ap.add_argument("--concurrency", type=int, default=4)
    ap.add_argument("--delay", type=float, default=0.25, help="minimum seconds between request starts")
    ap.add_argument("--timeout", type=float, default=20.0)
    ap.add_argument("--max-minutes", type=float, default=None)
    ap.add_argument("--no-psi", action="store_true", help="skip PageSpeed Insights")
    ap.add_argument("--psi-templates", type=int, default=3, help="key templates to test besides the homepage (full mode)")
    ap.add_argument("--psi-timeout", type=float, default=120.0)
    ap.add_argument("--no-bot-check", action="store_true", help="skip the browser vs AI crawler comparison")
    ap.add_argument("--compare", default=None, help="a previous findings.json, or 'auto' for the latest in ./campaigns")
    ap.add_argument("--rendered", default=None, help="JSON or JSONL of {url, html} (Firecrawl scrape output works) to re-read pages")
    ap.add_argument("--render", choices=("firecrawl",), default=None, help="re-read JavaScript-built pages through Firecrawl (needs FIRECRAWL_API_KEY)")
    ap.add_argument("--render-limit", type=int, default=25)
    ap.add_argument("--quiet", action="store_true")
    args = ap.parse_args(argv)
    if args.max_minutes is None:
        args.max_minutes = 4.0 if args.mode == "quick" else 15.0
    if args.mode == "quick":
        args.psi_templates = 0
    if args.max_pages and args.max_pages > HARD_CAP_PAGES:
        print(f"--max-pages capped at {HARD_CAP_PAGES}", file=sys.stderr)
    slug = re.sub(r"[^a-z0-9]+", "-", site_key(args.url)).strip("-") or "site"
    out_dir = Path(args.out or f"./campaigns/site-audit-{slug}-{today().isoformat()}")
    if not args.out:
        n = 2
        base = out_dir
        while (out_dir / "findings.json").is_file():  # keep earlier runs from the same day
            out_dir = Path(f"{base}-{n}")
            n += 1

    previous = previous_pages = None
    if args.compare:
        prev_path = find_previous(out_dir, args.url) if args.compare == "auto" else Path(args.compare)
        if prev_path and Path(prev_path).is_file():
            try:
                previous = json.loads(Path(prev_path).read_text(encoding="utf-8"))
                previous_pages = load_pages(Path(prev_path).parent / "pages.jsonl")
                previous["_path"] = str(prev_path)
            except (OSError, ValueError) as err:
                print(f"Could not read the previous findings ({err}); running without a comparison.", file=sys.stderr)
        else:
            print("No previous findings file found; running without a comparison.", file=sys.stderr)

    audit = Audit(args)
    findings, fine = audit.run()
    pages_out = {rec["url"]: page_record(rec) for rec in audit.pages.values()}
    statuses = Counter(str(r["status"]) for r in audit.pages.values())
    depth = Counter(str(r.get("depth")) for r in audit.pages.values() if r.get("html"))
    result = {
        "tool": f"site-audit crawl_audit.py {VERSION}",
        "generated_at": now_iso(),
        "mode": args.mode,
        "target": audit.site.get("start_url"),
        "final_url": audit.site.get("final_url"),
        "user_agent": TOOL_UA,
        "limits": {"max_pages": audit.max_pages, "concurrency": audit.concurrency, "delay_s": audit.fetcher.delay,
                   "max_minutes": args.max_minutes},
        "crawl": {
            "pages_fetched": len(audit.pages),
            "html_pages": sum(1 for r in audit.pages.values() if r.get("html")),
            "indexable_pages": sum(1 for r in audit.content_pages() if r.get("index_state") == "indexable"),
            "key_pages": sorted({r["final_url"] for r in audit.pages.values() if r.get("key") and r.get("html")})[:40],
            "statuses": dict(statuses),
            "depths": dict(depth),
            "truncated": audit.truncated,
            "frontier_left": getattr(audit, "unvisited_frontier", 0),
            "skipped_by_robots": len(audit.skipped_robots),
            "link_checks": len(audit.link_checks),
            "requests": audit.fetcher.requests,
            "duration_s": round(time.monotonic() - audit.started, 1),
        },
        "site": audit.site,
        "cwv": audit.cwv,
        "findings": findings,
        "checked_and_fine": fine,
        "not_checked": audit.not_checked,
        "checks_run": getattr(audit, "checks_run", []),
        "notes": audit.notes,
    }
    if previous is not None:
        result["changes"] = compare(previous, result, previous_pages, pages_out)
        result["changes"]["previous_file"] = previous.get("_path")
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "findings.json").write_text(json.dumps(result, indent=2, default=str), encoding="utf-8")
    with open(out_dir / "pages.jsonl", "w", encoding="utf-8") as fh:
        for rec in pages_out.values():
            fh.write(json.dumps(rec, default=str) + "\n")

    c = result["crawl"]
    print(f"Crawled {c['pages_fetched']} URLs ({c['html_pages']} HTML, {c['indexable_pages']} indexable) on {audit.host} "
          f"in {c['duration_s']}s with {c['requests']} requests{' (stopped at the page limit)' if c['truncated'] else ''}.")
    sev = Counter(f["severity"] for f in findings)
    print("Findings: " + ", ".join(f"{sev[s]} {s}" for s in ("critical", "high", "medium", "low", "info") if sev[s]) if findings else "Findings: none")
    for f in findings[:12]:
        print(f"  [{f['severity']}] {f['id']} x{f['count']}: {clip(f['observation'], 150)}")
    if audit.not_checked:
        print("Not checked: " + "; ".join(f"{n['what']} ({n['why']})" for n in audit.not_checked[:6]))
    if "changes" in result:
        ch = result["changes"]
        print(f"Since {ch.get('previous_run')}: {len(ch['new'])} new, {len(ch['resolved'])} resolved, {len(ch['changed'])} changed findings.")
    print(f"Wrote {out_dir / 'findings.json'} and {out_dir / 'pages.jsonl'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
