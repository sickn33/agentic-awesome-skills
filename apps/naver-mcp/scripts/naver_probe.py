#!/usr/bin/env python3
"""
Step 0 probe: does Naver actually answer from a datacenter edge?

Runs from a GitHub Actions runner (outside the Claude Code egress proxy) and
exercises every fallback path the MCP server will rely on, so the default path
is chosen from measured behaviour rather than assumption.

stdlib only - no pip install on the runner.
"""

import gzip
import io
import json
import re
import ssl
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import zlib

MOBILE_UA = (
    "Mozilla/5.0 (Linux; Android 14; SM-S928N) AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/126.0.6478.122 Mobile Safari/537.36"
)

BASE_HEADERS = {
    "User-Agent": MOBILE_UA,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip, deflate",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Cache-Control": "no-cache",
}

# Signatures that mean "Naver rejected us", as opposed to "we failed to parse".
BLOCK_SIGNS = (
    "많은 요청이 있습니다",
    "비정상적인 접근",
    "자동입력 방지",
    "captcha",
    "이용이 제한",
    "접근이 차단",
    "error.naver.com",
    "일시적으로 제한",
)

TIMEOUT = 25
results = []


def _decompress(raw, encoding):
    if not raw:
        return b""
    try:
        if encoding == "gzip":
            return gzip.GzipFile(fileobj=io.BytesIO(raw)).read()
        if encoding == "deflate":
            try:
                return zlib.decompress(raw)
            except zlib.error:
                return zlib.decompress(raw, -zlib.MAX_WBITS)
    except OSError:
        # Server lied about the encoding; fall through to raw bytes.
        pass
    return raw


def fetch(url, referer=None, extra=None, timeout=TIMEOUT):
    """Return (status, text, err). status is an int, or None on transport error."""
    headers = dict(BASE_HEADERS)
    if referer:
        headers["Referer"] = referer
        headers["Sec-Fetch-Site"] = "same-origin"
    if extra:
        headers.update(extra)

    req = urllib.request.Request(url, headers=headers)
    ctx = ssl.create_default_context()
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
            raw = resp.read()
            body = _decompress(raw, (resp.headers.get("Content-Encoding") or "").lower())
            charset = "utf-8"
            ctype = resp.headers.get("Content-Type") or ""
            m = re.search(r"charset=([\w-]+)", ctype, re.I)
            if m:
                charset = m.group(1)
            text = body.decode(charset, errors="replace")
            return resp.status, text, None
    except urllib.error.HTTPError as e:
        raw = e.read() if hasattr(e, "read") else b""
        body = _decompress(raw, (e.headers.get("Content-Encoding") or "").lower() if e.headers else "")
        return e.code, body.decode("utf-8", errors="replace"), None
    except Exception as e:  # noqa: BLE001 - probe reports every failure class
        return None, "", f"{type(e).__name__}: {e}"


def classify(status, text, err):
    """Distinguish 'blocked' from 'parse failure' from 'transport error'."""
    if err:
        return "TRANSPORT_ERROR", err
    if status in (403, 429):
        return "BLOCKED", f"HTTP {status}"
    if status and status >= 500:
        return "SERVER_ERROR", f"HTTP {status}"
    low = text.lower()
    for sign in BLOCK_SIGNS:
        if sign.lower() in low:
            return "BLOCKED", f"block signature: {sign!r}"
    if status != 200:
        return "HTTP_ERROR", f"HTTP {status}"
    if len(text) < 500:
        return "EMPTY", f"body only {len(text)} bytes"
    return "OK", f"HTTP 200, {len(text)} bytes"


TAG_RE = re.compile(r"<[^>]+>")
SCRIPT_RE = re.compile(r"<(script|style)[^>]*>.*?</\1>", re.S | re.I)
BR_RE = re.compile(r"<br\s*/?>|</p>|</div>", re.I)


def html_to_text(html):
    html = SCRIPT_RE.sub(" ", html)
    html = BR_RE.sub("\n", html)
    txt = TAG_RE.sub(" ", html)
    txt = urllib.parse.unquote(txt) if "%" in txt and False else txt
    for a, b in (("&nbsp;", " "), ("&amp;", "&"), ("&lt;", "<"),
                 ("&gt;", ">"), ("&quot;", '"'), ("&#39;", "'")):
        txt = txt.replace(a, b)
    lines = [re.sub(r"[ \t​]+", " ", ln).strip() for ln in txt.split("\n")]
    return "\n".join(ln for ln in lines if ln)


CONTAINER_PATTERNS = [
    ("se-main-container", r'<div[^>]*class="[^"]*se-main-container[^"]*"[^>]*>(.*?)</div>\s*(?:<div[^>]*class="[^"]*se-lastLine|<!-- </div> // \.se-main-container)'),
    ("se-main-container-greedy", r'<div[^>]*class="[^"]*se-main-container[^"]*"[^>]*>(.*)'),
    ("postViewArea", r'<div[^>]*id="postViewArea"[^>]*>(.*?)</div>\s*</div>'),
    ("post-view", r'<div[^>]*class="[^"]*post-view[^"]*"[^>]*>(.*)'),
    ("__content", r'<div[^>]*id="__content"[^>]*>(.*)'),
]


def extract_body(html):
    """Return (strategy, text) using SmartEditor ONE first, legacy layouts as fallback."""
    for name, pat in CONTAINER_PATTERNS:
        m = re.search(pat, html, re.S | re.I)
        if m:
            text = html_to_text(m.group(1))
            if len(text) > 80:
                return name, text
    # Last resort: whole document minus chrome.
    text = html_to_text(html)
    return ("whole-document", text) if len(text) > 200 else ("none", "")


def record(step, path, url, status, text, err, extra=None):
    kind, detail = classify(status, text, err)
    row = {
        "step": step,
        "path": path,
        "url": url,
        "result": kind,
        "detail": detail,
        "bytes": len(text),
    }
    if extra:
        row.update(extra)
    results.append(row)
    flag = "PASS" if kind == "OK" else "FAIL"
    print(f"[{flag}] {step} :: {path}")
    print(f"       url    : {url}")
    print(f"       result : {kind} ({detail})")
    if extra:
        for k, v in extra.items():
            v_s = str(v)
            print(f"       {k:<7}: {v_s[:300]}")
    print()
    return kind == "OK", text


# ---------------------------------------------------------------- step 1
def probe_blog_search():
    print("=" * 72)
    print("STEP 1  blog search  (m.search.naver.com)")
    print("=" * 72)
    q = urllib.parse.quote("제주도 맛집")
    url = f"https://m.search.naver.com/search.naver?ssc=tab.m_blog.all&sm=mtb_jum&query={q}&start=1"
    status, text, err = fetch(url, referer="https://m.search.naver.com/")
    links = re.findall(r"https?://(?:m\.)?blog\.naver\.com/([A-Za-z0-9_-]+)/(\d{6,})", text)
    ok, _ = record("blog_search", "m.search.naver.com", url, status, text, err,
                   {"found": len(links), "sample": links[:3]})
    return links


# ---------------------------------------------------------------- step 2
def probe_blog_read(blog_id, log_no):
    print("=" * 72)
    print(f"STEP 2  blog read - 4 fallback paths  (target {blog_id}/{log_no})")
    print("=" * 72)
    order = []

    # Path 1: Cloudflare/edge direct -> mobile
    u1 = f"https://m.blog.naver.com/{blog_id}/{log_no}"
    s, t, e = fetch(u1, referer="https://m.search.naver.com/")
    strat, body = extract_body(t) if t else ("none", "")
    ok, _ = record("blog_read", "1) direct m.blog", u1, s, t, e,
                   {"extract": strat, "chars": len(body), "head": body[:180].replace("\n", " / ")})
    order.append(("direct-mobile", ok and len(body) > 200))

    # Path 2: r.jina.ai reader prefix (no key)
    u2 = f"https://r.jina.ai/https://m.blog.naver.com/{blog_id}/{log_no}"
    s, t, e = fetch(u2, timeout=45)
    ok2 = (s == 200 and len(t) > 300)
    record("blog_read", "2) r.jina.ai", u2, s, t, e,
           {"chars": len(t), "head": t[:180].replace("\n", " / ")})
    order.append(("jina", ok2))

    # Path 3: PC PostView.naver
    u3 = (f"https://blog.naver.com/PostView.naver?blogId={blog_id}"
          f"&logNo={log_no}&redirect=Dlog&widgetTypeCall=true&directAccess=false")
    s, t, e = fetch(u3, referer=f"https://blog.naver.com/{blog_id}")
    strat3, body3 = extract_body(t) if t else ("none", "")
    ok3 = (s == 200 and len(body3) > 200)
    record("blog_read", "3) PC PostView.naver", u3, s, t, e,
           {"extract": strat3, "chars": len(body3), "head": body3[:180].replace("\n", " / ")})
    order.append(("pc-postview", ok3))

    # Path 4: blog RSS
    u4 = f"https://rss.blog.naver.com/{blog_id}.xml"
    s, t, e = fetch(u4)
    items = len(re.findall(r"<item>", t, re.I))
    ok4 = (s == 200 and items > 0)
    record("blog_read", "4) RSS", u4, s, t, e, {"items": items})
    order.append(("rss", ok4))

    return order


# ---------------------------------------------------------------- step 3
def probe_news():
    print("=" * 72)
    print("STEP 3  news search + read")
    print("=" * 72)
    q = urllib.parse.quote("금리")
    url = f"https://m.search.naver.com/search.naver?ssc=tab.m_news.all&where=m_news&query={q}"
    s, t, e = fetch(url, referer="https://m.search.naver.com/")
    arts = re.findall(r"https?://n\.news\.naver\.com/(?:mnews/)?article/(\d{3})/(\d{10})", t)
    record("news_search", "m.search.naver.com", url, s, t, e,
           {"found": len(arts), "sample": arts[:3]})

    if arts:
        oid, aid = arts[0]
        u = f"https://n.news.naver.com/mnews/article/{oid}/{aid}"
        s, t, e = fetch(u, referer="https://m.search.naver.com/")
        m = re.search(r'<article[^>]*id="dic_area"[^>]*>(.*?)</article>', t, re.S) or \
            re.search(r'<div[^>]*id="dic_area"[^>]*>(.*?)</div>', t, re.S) or \
            re.search(r'<div[^>]*id="newsct_article"[^>]*>(.*?)</div>', t, re.S)
        body = html_to_text(m.group(1)) if m else ""
        record("news_read", "n.news.naver.com", u, s, t, e,
               {"chars": len(body), "head": body[:180].replace("\n", " / ")})


# ---------------------------------------------------------------- step 4
def probe_cafe_and_place():
    print("=" * 72)
    print("STEP 4  cafe search + place reviews")
    print("=" * 72)
    q = urllib.parse.quote("캠핑 후기")
    url = f"https://m.search.naver.com/search.naver?ssc=tab.m_cafe.all&where=m_cafe&query={q}"
    s, t, e = fetch(url, referer="https://m.search.naver.com/")
    hits = re.findall(r"cafe\.naver\.com/([A-Za-z0-9_-]+)", t)
    record("cafe_search", "m.search.naver.com", url, s, t, e,
           {"found": len(hits), "sample": list(dict.fromkeys(hits))[:3]})

    q2 = urllib.parse.quote("성수동 카페")
    url2 = f"https://m.search.naver.com/search.naver?query={q2}"
    s, t, e = fetch(url2, referer="https://m.search.naver.com/")
    places = re.findall(r"place\.naver\.com/(?:restaurant|place)/(\d+)", t) or \
             re.findall(r"pcmap\.place\.naver\.com/[a-z]+/(\d+)", t)
    record("place_search", "m.search.naver.com", url2, s, t, e,
           {"found": len(places), "sample": places[:3]})


def main():
    print(f"probe start  ua={MOBILE_UA[:60]}...\n")

    links = probe_blog_search()
    time.sleep(1.2)

    if links:
        blog_id, log_no = links[0]
    else:
        # Search failed; still exercise the read paths against a known-stable post
        # so we learn whether reading is blocked independently of search.
        print("!! search returned no post links - falling back to a fixed target\n")
        blog_id, log_no = "naverschool", "223317107017"

    order = probe_blog_read(blog_id, log_no)
    time.sleep(1.2)
    probe_news()
    time.sleep(1.2)
    probe_cafe_and_place()

    print("=" * 72)
    print("SUMMARY")
    print("=" * 72)
    print(f"{'step':<14}{'path':<24}{'result':<16}{'detail'}")
    print("-" * 72)
    for r in results:
        print(f"{r['step']:<14}{r['path']:<24}{r['result']:<16}{r['detail'][:34]}")

    working = [name for name, ok in order if ok]
    print()
    print(f"working blog-read paths (in preference order): {working or 'NONE'}")

    with open("probe-results.json", "w", encoding="utf-8") as f:
        json.dump({"rows": results, "blog_read_order": order,
                   "target": f"{blog_id}/{log_no}"}, f, ensure_ascii=False, indent=2)

    # Step 0 gate: the whole project is pointless if nothing reads a blog body.
    if not working:
        print("\nSTEP-0 GATE: FAILED - no blog-read path returned usable content.")
        sys.exit(1)
    print("\nSTEP-0 GATE: PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
