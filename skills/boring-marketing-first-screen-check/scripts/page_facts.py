#!/usr/bin/env python3
"""
page_facts.py: read a local business page the way the first-screen-check skill needs it.

Facts only, no score. It fetches the page with a phone user agent and prints:
redirect hops, status, size, title, H1, the opening words in reading order,
tap-to-call links, phone numbers in the text, where promise words and the rating
first appear (as a word position), forms and their visible fields, JSON-LD
(types, ratings, prices, addresses, phones), the first images and their weight,
and widgets that tend to cover the first screen. With --compare it also says how
much of each other page's text is the same as the first page once town names are
removed (for spotting copied town pages).

Usage:
  page_facts.py URL [--promise "24/7" --promise "same-day"] [--compare URL2 ...]
                    [--town Plano --town Frisco]

Python 3 standard library only. Exit 0 on success, 1 if the page could not be read.
"""

import argparse
import difflib
import json
import ipaddress
import socket
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from html.parser import HTMLParser

UA = ("Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 "
      "(KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1")
DEFAULT_PROMISES = ["24/7", "24 hours", "24-hour", "same day", "same-day", "today",
                    "emergency", "free estimate", "free quote", "no trip charge",
                    "upfront pric", "financing", "% off", "$"]
WIDGETS = {
    "chat": ["intercom", "drift.com", "tawk.to", "livechat", "podium", "birdeye",
             "tidio", "zendesk", "hs-scripts", "leadconnector", "smith.ai", "ngage"],
    "cookie banner": ["cookiebot", "onetrust", "cookieyes", "termly", "iubenda"],
    "popup": ["optinmonster", "sumo.com", "privy", "elementor-popup", "popupmaker",
              "justuno", "wisepops", "klaviyo"],
}
PHONE_RE = re.compile(r"(?:\+?1[\s.-]?)?\(?\b([2-9]\d{2})\)?[\s.-]?(\d{3})[\s.-]?(\d{4})\b")


def public_origin(url):
    parsed = urllib.parse.urlsplit(url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError("expected a public HTTP(S) URL without credentials")
    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    addresses = socket.getaddrinfo(parsed.hostname, port, type=socket.SOCK_STREAM)
    if any(not ipaddress.ip_address(address[4][0]).is_global for address in addresses):
        raise ValueError("URL resolves to a non-public address")
    return parsed.scheme, parsed.hostname, port


class Recorder(urllib.request.HTTPRedirectHandler):
    def __init__(self, origin=None):
        self.hops = []
        self.origin = origin

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        origin = public_origin(newurl)
        if self.origin and origin != self.origin:
            raise ValueError("image redirected outside the audited origin")
        self.hops.append((code, req.full_url, newurl))
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def fetch(url, method="GET", timeout=25, origin=None):
    if public_origin(url) != origin and origin is not None:
        raise ValueError("image is outside the audited origin")
    rec = Recorder(origin)
    opener = urllib.request.build_opener(rec)
    req = urllib.request.Request(url, method=method, headers={"User-Agent": UA,
                                 "Accept-Language": "en-US,en;q=0.9"})
    try:
        with opener.open(req, timeout=timeout) as r:
            body = r.read(2 * 1024 * 1024) if method == "GET" else b""
            return r.status, r.geturl(), dict(r.headers), body, rec.hops
    except urllib.error.HTTPError as e:
        return e.code, e.geturl() or url, dict(e.headers or {}), e.read(2 * 1024 * 1024) or b"", rec.hops


class Page(HTMLParser):
    SKIP = {"script", "style", "noscript", "template", "svg", "nav"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.words, self.skip, self.in_h1, self.in_title = [], 0, False, False
        self.h1, self.title, self.tels, self.imgs, self.forms = [], "", [], [], []
        self.jsonld, self._ld, self._in_ld, self.viewport = [], "", False, False
        self.h1_pos = None

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "script" and (a.get("type") or "").lower() == "application/ld+json":
            self._in_ld, self._ld = True, ""
        if tag in self.SKIP:
            self.skip += 1
        if tag == "h1":
            self.in_h1 = True
            self.h1.append("")
            if self.h1_pos is None:
                self.h1_pos = len(self.words)
        if tag == "title":
            self.in_title = True
        if tag == "meta" and (a.get("name") or "").lower() == "viewport":
            self.viewport = True
        if tag == "a" and (a.get("href") or "").lower().startswith("tel:"):
            self.tels.append((a["href"], len(self.words)))
        if tag == "img":
            src = a.get("src") or a.get("data-src") or ""
            if src and not src.startswith("data:"):
                self.imgs.append((src, len(self.words)))
        if tag == "link" and (a.get("rel") or "").lower() == "preload" and a.get("as") == "image":
            if a.get("href"):
                self.imgs.append((a["href"], -1))
        if tag == "form":
            self.forms.append(0)
        if tag in ("input", "select", "textarea") and self.forms:
            if (a.get("type") or "text").lower() not in ("hidden", "submit", "button", "image"):
                self.forms[-1] += 1

    def handle_endtag(self, tag):
        if tag == "script" and self._in_ld:
            self.jsonld.append(self._ld)
            self._in_ld = False
        if tag in self.SKIP and self.skip:
            self.skip -= 1
        if tag == "h1":
            self.in_h1 = False
        if tag == "title":
            self.in_title = False

    def handle_data(self, data):
        if self._in_ld:
            self._ld += data
            return
        if self.in_title:
            self.title += data
            return
        if self.skip:
            return
        if self.in_h1 and self.h1:
            self.h1[-1] += data
        self.words.extend(data.split())


def image_kb(url, origin):
    _, _, headers, _, _ = fetch(url, method="HEAD", timeout=15, origin=origin)
    size = headers.get("Content-Length") or headers.get("content-length")
    return f"{int(size) // 1024} KB" if size else "size unavailable"



def first_pos(words, phrase):
    text = " ".join(words).lower()
    i = text.find(phrase.lower())
    return None if i < 0 else len(text[:i].split())


def walk(node, out):
    if isinstance(node, dict):
        t = node.get("@type")
        if t:
            out["types"].extend(t if isinstance(t, list) else [t])
        ar = node.get("aggregateRating")
        if isinstance(ar, dict):
            out["ratings"].append(f"{ar.get('ratingValue')} from {ar.get('reviewCount') or ar.get('ratingCount')}")
        for k in ("priceRange", "telephone", "streetAddress", "addressLocality"):
            if isinstance(node.get(k), str):
                out[k].append(node[k])
        if node.get("@type") == "Answer" and "$" in str(node.get("text", "")):
            out["prices_in_faq"].append(re.sub(r"<[^>]+>", "", str(node["text"]))[:160])
        for v in node.values():
            walk(v, out)
    elif isinstance(node, list):
        for v in node:
            walk(v, out)


def visible_words(url):
    status, final, _, body, hops = fetch(url)
    p = Page()
    p.feed(body.decode("utf-8", "replace"))
    return status, final, hops, p.words


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("url")
    ap.add_argument("--promise", action="append", default=[])
    ap.add_argument("--compare", action="append", default=[])
    ap.add_argument("--town", action="append", default=[])
    args = ap.parse_args(argv)

    try:
        status, final, headers, body, hops = fetch(args.url)
    except Exception as e:  # network failure, bad TLS, timeout
        print(f"Could not read {args.url}: {e}")
        return 1

    print(f"# Page facts: {args.url}\n")
    for code, src, dst in hops:
        print(f"- redirect {code}: {src} -> {dst}")
    print(f"- final: {status} {final} ({len(body) // 1024} KB of HTML)")
    p = Page()
    p.feed(body.decode("utf-8", "replace"))
    print(f"- title: {p.title.strip()[:120]}")
    print(f"- H1 (starts at word {p.h1_pos}): {' | '.join(h.strip() for h in p.h1 if h.strip())[:200] or 'NONE'}")
    print(f"- viewport meta: {'yes' if p.viewport else 'NO'}")
    print(f"- visible words, menus left out: {len(p.words)}")
    print(f"- opening words in reading order: {' '.join(p.words[:90])}\n")

    print("## Calling")
    if p.tels:
        for href, pos in p.tels[:6]:
            print(f"- tel link {href} at word {pos}")
    else:
        print("- NO tel: links in the HTML (check the rendered page; some sites add them with JavaScript)")
    nums = sorted({"".join(m.groups()) for m in PHONE_RE.finditer(" ".join(p.words))})
    print(f"- distinct phone numbers in the text: {len(nums)} {nums[:6]}")

    print("\n## Promise and proof (word position of first mention; None = not in the HTML)")
    for phrase in dict.fromkeys(args.promise + DEFAULT_PROMISES):
        pos = first_pos(p.words, phrase)
        if pos is not None or phrase in args.promise:
            print(f"- '{phrase}': {pos}")
    for phrase in ["reviews", "stars", "rating", "licensed", "insured", "guarantee", "years"]:
        print(f"- '{phrase}': {first_pos(p.words, phrase)}")

    print("\n## Forms")
    print(f"- {len(p.forms)} form(s); visible fields per form: {p.forms[:5]}")

    print("\n## Structured data (JSON-LD)")
    out = {k: [] for k in ("types", "ratings", "priceRange", "telephone", "streetAddress",
                           "addressLocality", "prices_in_faq")}
    bad = 0
    for raw in p.jsonld:
        try:
            walk(json.loads(raw), out)
        except ValueError:
            bad += 1
    for k, v in out.items():
        if v:
            print(f"- {k}: {sorted(set(v))[:8]}")
    if bad:
        print(f"- {bad} JSON-LD block(s) did not parse")
    if not p.jsonld:
        print("- none")

    print("\n## First images (weight from the server's Content-Length)")
    origin = public_origin(final)
    seen = 0
    for src, pos in p.imgs:
        if seen >= 5:
            break
        absu = urllib.parse.urljoin(final, src)
        try:
            size = image_kb(absu, origin)
        except Exception:
            size = "could not check"
        where = "preloaded" if pos < 0 else f"word {pos}"
        print(f"- {absu[:140]} ({where}): {size}")
        seen += 1

    html = body.decode("utf-8", "replace").lower()
    found = [f"{kind}: {sig}" for kind, sigs in WIDGETS.items() for sig in sigs if sig in html]
    print(f"\n## Widgets that can cover the first screen\n- {found or 'none detected in the HTML'}")

    if args.compare:
        towns = [t.lower() for t in args.town]
        def clean(words):
            return [w.lower() for w in words if w.lower().strip(",.") not in towns]
        base = clean(p.words)
        print("\n## Town page sameness (share of text identical to the first page, town names removed)")
        for u in args.compare:
            try:
                s, final_u, hops_u, words = visible_words(u)
                if hops_u:
                    print(f"- {u}: redirects to {final_u} ({s}), not a page of its own")
                    continue
                ratio = difflib.SequenceMatcher(None, base, clean(words), autojunk=False).ratio()
                print(f"- {u}: {s}, {round(ratio * 100)}% the same")
            except Exception as e:
                print(f"- {u}: could not read ({e})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
