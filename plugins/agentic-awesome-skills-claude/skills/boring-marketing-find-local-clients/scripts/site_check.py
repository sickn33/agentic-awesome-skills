#!/usr/bin/env python3
"""First-pass site check for a list of local businesses. Stdlib only, no key.

Fetches each homepage the way a phone browser asks for it and reports what a
ranking needs from the HTML: does it load, on HTTPS, with a mobile viewport, a
tappable phone link near the top, and (optionally) the promise an ad makes.

It reads HTML, not pixels. "Near the top" means the first tel: link sits inside
<header> or within the first ~600 characters of visible text. That is a proxy
for the first screen; confirm the shortlist by eye at 390px wide.

Usage:
    python3 site_check.py businesses.csv > sites.csv     # uses a site/website/url column
    python3 site_check.py https://example.com other.com   # or URLs directly
    python3 site_check.py businesses.csv --promise "24/7" --promise "same day"

Output columns: input, final_url, status, https, seconds, viewport, tel_links,
tel_near_top, number_text_near_top, promise_near_top, flags, title.
Flags: ssl_error, timeout, dns_error, http_error, bad_url, parked, js_only, no_site.

Exit codes: 0 ok, 1 bad args.
"""

import argparse
import csv
import http.client
import re
import socket
import ssl
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser

UA = ("Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 "
      "(KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1")
TOP_CHARS = 600
PROMISE_CHARS = 800
PHONE_RE = re.compile(r"\(?\b\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4}\b")
PARKED_RE = re.compile(r"domain (is )?for sale|buy this domain|this domain (may be|is) for sale|parked free|domain parking", re.I)
URL_COLUMNS = ("site", "website", "url", "domain", "web")


class PageReader(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.skip = 0
        self.header = 0
        self.text = []
        self.text_len = 0
        self.title = ""
        self.in_title = False
        self.viewport = False
        self.tel_links = 0
        self.first_tel_offset = None
        self.first_tel_in_header = False
        self.scripts = 0

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in ("script", "style", "noscript", "template", "svg"):
            self.skip += 1
            if tag == "script":
                self.scripts += 1
        elif tag == "header":
            self.header += 1
        elif tag == "title":
            self.in_title = True
        elif tag == "meta" and (a.get("name") or "").lower() == "viewport":
            self.viewport = True
        elif tag == "a" and (a.get("href") or "").strip().lower().startswith("tel:"):
            self.tel_links += 1
            if self.first_tel_offset is None:
                self.first_tel_offset = self.text_len
                self.first_tel_in_header = self.header > 0

    def handle_endtag(self, tag):
        if tag in ("script", "style", "noscript", "template", "svg") and self.skip:
            self.skip -= 1
        elif tag == "header" and self.header:
            self.header -= 1
        elif tag == "title":
            self.in_title = False

    def handle_data(self, data):
        if self.in_title:
            self.title += data.strip()
            return
        if self.skip:
            return
        chunk = " ".join(data.split())
        if chunk:
            self.text.append(chunk)
            self.text_len += len(chunk) + 1

    def visible(self):
        return " ".join(self.text)


def normalize(url):
    url = (url or "").strip()
    if not url:
        return ""
    if not re.match(r"^https?://", url, re.I):
        url = "https://" + url
    return url


def check(url, promises):
    row = {"input": url, "final_url": "", "status": "", "https": "", "seconds": "",
           "viewport": "", "tel_links": "", "tel_near_top": "", "number_text_near_top": "",
           "promise_near_top": "", "flags": "", "title": ""}
    target = normalize(url)
    if not target:
        row["flags"] = "no_site"
        return row
    flags = []
    start = time.time()
    try:
        req = urllib.request.Request(target, headers={"User-Agent": UA, "Accept": "text/html"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = resp.read(1_500_000).decode(resp.headers.get_content_charset() or "utf-8", "replace")
            row["status"] = resp.status
            row["final_url"] = resp.geturl()
    except urllib.error.HTTPError as e:
        row["status"] = e.code
        row["flags"] = "http_error"
        row["seconds"] = round(time.time() - start, 1)
        return row
    except urllib.error.URLError as e:
        reason = e.reason
        if isinstance(reason, ssl.SSLError) or "CERTIFICATE" in str(reason).upper():
            flags.append("ssl_error")
        elif isinstance(reason, socket.gaierror):
            flags.append("dns_error")
        elif isinstance(reason, (socket.timeout, TimeoutError)):
            flags.append("timeout")
        else:
            flags.append("http_error")
        row["flags"] = ";".join(flags)
        row["seconds"] = round(time.time() - start, 1)
        return row
    except (socket.timeout, TimeoutError):
        row["flags"] = "timeout"
        row["seconds"] = round(time.time() - start, 1)
        return row
    except (ValueError, http.client.HTTPException, OSError):
        # A malformed value in the site column (text with spaces, "ftp://", a
        # dropped connection mid-read) must not stop the rest of the batch.
        row["flags"] = "bad_url"
        row["seconds"] = round(time.time() - start, 1)
        return row

    row["seconds"] = round(time.time() - start, 1)
    row["https"] = row["final_url"].lower().startswith("https://")
    page = PageReader()
    try:
        page.feed(body)
    except Exception:  # malformed HTML should not stop the batch
        pass
    text = page.visible()
    row["title"] = page.title[:120]
    row["viewport"] = page.viewport
    row["tel_links"] = page.tel_links
    row["tel_near_top"] = bool(page.first_tel_offset is not None and
                               (page.first_tel_in_header or page.first_tel_offset <= TOP_CHARS))
    row["number_text_near_top"] = bool(PHONE_RE.search(text[:TOP_CHARS]))
    if promises:
        top = text[:PROMISE_CHARS].lower()
        row["promise_near_top"] = "; ".join(f"{p}:{'yes' if p.lower() in top else 'no'}" for p in promises)
    if PARKED_RE.search(text[:3000]):
        flags.append("parked")
    if len(text) < 200 and page.scripts >= 3:
        flags.append("js_only")
    row["flags"] = ";".join(flags)
    return row


def read_urls(paths):
    urls = []
    for item in paths:
        if item.lower().endswith(".csv"):
            with open(item, newline="", encoding="utf-8-sig") as f:
                reader = csv.DictReader(f)
                cols = {c.lower().strip(): c for c in (reader.fieldnames or [])}
                col = next((cols[c] for c in URL_COLUMNS if c in cols), None)
                if not col:
                    print(f"{item}: no site/website/url column found", file=sys.stderr)
                    sys.exit(1)
                urls.extend(r.get(col, "") for r in reader)
        else:
            urls.append(item)
    return urls


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("inputs", nargs="+", help="a CSV with a site column, or URLs")
    p.add_argument("--promise", action="append", default=[], help='phrase to look for near the top, e.g. "24/7" (repeatable)')
    p.add_argument("--workers", type=int, default=6)
    args = p.parse_args(argv)

    urls = read_urls(args.inputs)
    with ThreadPoolExecutor(max_workers=max(1, min(12, args.workers))) as pool:
        rows = list(pool.map(lambda u: check(u, args.promise), urls))

    w = csv.DictWriter(sys.stdout, fieldnames=list(rows[0].keys()) if rows else ["input"])
    w.writeheader()
    for r in rows:
        w.writerow(r)
    broken = sum(1 for r in rows if r["flags"] and r["flags"] != "js_only")
    no_tel = sum(1 for r in rows if r["tel_near_top"] is False)
    print(f"{len(rows)} sites checked; {broken} broken or missing; {no_tel} with no tel: link near the top (confirm by eye).",
          file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
