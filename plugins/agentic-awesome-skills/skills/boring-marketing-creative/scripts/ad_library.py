#!/usr/bin/env python3
"""Pull live US ads from the Meta Ad Library for a brand or category.

Reads the public Ad Library results page through the Firecrawl API, parses each ad card
(Library ID, start date, advertiser, text, call to action, image and video links),
downloads the images and video posters, and writes index.json plus a board.html you can
open in a browser. Python standard library only.

    python3 ad_library.py "coffee subscription"
    python3 ad_library.py "Death Wish Coffee" --advertiser "Death Wish Coffee" --limit 20
    python3 ad_library.py "plumber dallas" --out ./campaigns/spring/research/ads

Needs FIRECRAWL_API_KEY in the environment (free tier, about 1 credit per page read).
Without it, the script prints the Ad Library URL to open by hand. The key is never
printed or written to disk.

Exit codes: 0 done (or no key, URL printed), 1 the pull failed, 2 bad arguments.
"""
import argparse
import datetime as dt
import html
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

FIRECRAWL_URL = "https://api.firecrawl.dev/v2/scrape"
LIBRARY = "https://www.facebook.com/ads/library/"
SORT = "sort_data[mode]=total_impressions&sort_data[direction]=desc"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)"


# ---------------------------------------------------------------------------
# URLs
# ---------------------------------------------------------------------------
def search_url(term, country="US"):
    """The keyword search, active ads only, sorted by impressions (the form that worked)."""
    q = urllib.parse.quote(term.strip())
    return (f"{LIBRARY}?active_status=active&ad_type=all&country={country}&q={q}"
            f"&search_type=keyword_unordered&media_type=all&{SORT}")


def page_url(page_id, country="US"):
    """All active ads from one advertiser's page."""
    return (f"{LIBRARY}?active_status=active&ad_type=all&country={country}"
            f"&view_all_page_id={page_id}&search_type=page&media_type=all&{SORT}")


def ad_url(library_id):
    return f"{LIBRARY}?id={library_id}"


def slugify(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-") or "ads"


# ---------------------------------------------------------------------------
# Parsing: the embedded JSON in the raw HTML (richest: video links, posters)
# ---------------------------------------------------------------------------
_SCRIPT = re.compile(r'<script type="application/json"[^>]*>(.*?)</script>', re.S)


def _walk(node, out):
    if isinstance(node, dict):
        if "ad_archive_id" in node and "snapshot" in node:
            out.append(node)
            return
        for value in node.values():
            _walk(value, out)
    elif isinstance(node, list):
        for value in node:
            _walk(value, out)


def _clean(text):
    text = (text or "").strip()
    return "" if "{{" in text else text


def _date_from_epoch(value):
    if not value:
        return None
    return dt.datetime.fromtimestamp(int(value), tz=dt.timezone.utc).date()


def parse_raw_html(raw):
    """Ads from the JSON blobs the Ad Library page embeds, in page (impressions) order."""
    found = []
    for match in _SCRIPT.finditer(raw or ""):
        blob = match.group(1)
        if "ad_archive_id" not in blob:
            continue
        try:
            _walk(json.loads(blob), found)
        except ValueError:
            continue
    ads, seen = [], set()
    for item in found:
        lid = str(item.get("ad_archive_id"))
        if lid in seen:
            continue
        seen.add(lid)
        snap = item.get("snapshot") or {}
        cards = snap.get("cards") or []
        first = cards[0] if cards else {}
        body = snap.get("body")
        body = body.get("text") if isinstance(body, dict) else body
        videos = list(snap.get("videos") or []) + [c for c in cards if c.get("video_hd_url") or c.get("video_sd_url")]
        images = [i.get("original_image_url") or i.get("resized_image_url") for i in snap.get("images") or []]
        card_images = [c.get("original_image_url") or c.get("resized_image_url") for c in cards]
        fmt = snap.get("display_format") or ""
        # DCO and DPA cards are versions of one ad, not a carousel.
        if videos:
            media = "video"
        elif fmt in ("CAROUSEL", "MULTI_IMAGES"):
            media = "carousel"
        else:
            media = "image"
        ads.append({
            "library_id": lid,
            "advertiser": snap.get("page_name") or item.get("page_name") or "",
            "page_id": str(snap.get("page_id") or item.get("page_id") or ""),
            "page_url": snap.get("page_profile_uri") or "",
            "started": _date_from_epoch(item.get("start_date")),
            "active": item.get("is_active", True),
            "media_type": media,
            "display_format": fmt,
            "multiple_versions": fmt in ("DCO", "DPA") or len(cards) > 1,
            "same_creative_ads": item.get("collation_count"),
            "platforms": item.get("publisher_platform") or [],
            "primary_text": _clean(body) or _clean(first.get("body")),
            "headline": _clean(snap.get("title")) or _clean(first.get("title")),
            "cta": snap.get("cta_text") or first.get("cta_text") or "",
            "link_url": snap.get("link_url") or first.get("link_url") or "",
            "image_urls": [u for u in (images or card_images) if u][:10],
            "video_urls": [v.get("video_hd_url") or v.get("video_sd_url") for v in videos][:5],
            "poster_urls": [v.get("video_preview_image_url") for v in videos if v.get("video_preview_image_url")][:5],
            "source": "json",
        })
    return ads


# ---------------------------------------------------------------------------
# Parsing: the markdown view (fallback; has no video links)
# ---------------------------------------------------------------------------
_MONTHS = {m: i for i, m in enumerate(
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], 1)}
_STARTED = re.compile(r"Started running on ([A-Z][a-z]{2})[a-z]* (\d{1,2}), (\d{4})")
_ADVERTISER = re.compile(
    r"\n(?:\[([^\]\n]+)\]\((https://www\.(?:facebook|instagram)\.com/[^)\s]*)\) with )?"
    r"\[([^\]\n]+)\]\((https://www\.(?:facebook|instagram)\.com/[^)\s]*)\)\s*\n+\*\*Sponsored\*\*")
_CREATIVE_IMG = re.compile(r"\[!\[[^\]]*\]\((https://[^)\s]+)\)")
# A link whose text may hold an image and escaped line breaks: [![](img)\\ ... CTA](url)
_LINK_BLOCK = re.compile(r"\[((?:!\[[^\]]*\]\([^)\s]*\)|[^\[\]])*)\]\((https?://[^)\s]+)\)")


def _md_unescape(text):
    return text.replace("\\_", "_").replace("\\*", "*").replace("\\[", "[").replace("\\]", "]")


def parse_markdown(md):
    """Ads from Firecrawl's markdown of the results page, in page order."""
    md = md or ""
    starts = [m.start() for m in re.finditer(r"(?m)^Library ID: \d+", md)]
    ads = []
    for n, start in enumerate(starts):
        end = starts[n + 1] if n + 1 < len(starts) else len(md)
        seg = md[start:end]
        before = md[max(0, start - 60):start]
        lid = re.match(r"Library ID: (\d+)", seg).group(1)
        started = None
        m = _STARTED.search(seg)
        if m and m.group(1) in _MONTHS:
            started = dt.date(int(m.group(3)), _MONTHS[m.group(1)], int(m.group(2)))
        same = re.search(r"(\d+) ads use this creative and text", seg)
        adv = _ADVERTISER.search(seg)
        advertiser, page, via = "", "", ""
        if adv:
            advertiser, page = _md_unescape(adv.group(3)), adv.group(4)
            via = _md_unescape(adv.group(1) or "")
        body_start = seg.find("**Sponsored**")
        body_start = body_start + len("**Sponsored**") if body_start >= 0 else 0
        stops = [i for i in (seg.find("[![", body_start), seg.find("Sorry, we're having trouble", body_start),
                             seg.find("\n[", body_start)) if i >= 0]
        body = seg[body_start:min(stops)] if stops else seg[body_start:]
        body = _md_unescape(re.sub(r"\n{3,}", "\n\n", body.replace("​", "")).strip())
        is_video = "trouble playing this video" in seg
        images = _CREATIVE_IMG.findall(seg[body_start:])
        headline, cta, link = "", "", ""
        for block in _LINK_BLOCK.finditer(seg[body_start:]):
            url = block.group(2)
            if "facebook.com/help" in url or "facebook.com/ads/library" in url and not cta:
                link = link or ("" if "facebook.com/help" in url else url)
                continue
            text = re.sub(r"!\[[^\]]*\]\([^)\s]*\)", "", block.group(1))
            lines = [x.strip(" \\") for x in re.split(r"\\*\n", text)]
            lines = [x for x in lines if x]
            link = link or url
            if lines:
                cta = _md_unescape(lines[-1])
                headline = _md_unescape(lines[-2]) if len(lines) > 1 else ""
                link = url
                break
        if is_video:
            media = "video"
        elif len(images) > 1:
            media = "carousel"
        else:
            media = "image"
        ads.append({
            "library_id": lid,
            "advertiser": advertiser,
            "via": via,
            "page_id": "",
            "page_url": page,
            "started": started,
            "active": "Inactive" not in before,
            "media_type": media,
            "display_format": "",
            "multiple_versions": "multiple versions" in seg,
            "same_creative_ads": int(same.group(1)) if same else None,
            "platforms": [],
            "primary_text": body,
            "headline": headline,
            "cta": cta,
            "link_url": link,
            "image_urls": images[:10],
            "video_urls": [],
            "poster_urls": [],
            "source": "markdown",
        })
    return ads


def parse_page(data):
    """Prefer the embedded JSON; fall back to markdown. `data` holds rawHtml and/or markdown."""
    ads = parse_raw_html(data.get("rawHtml") or data.get("html") or "")
    if ads:
        return ads
    return parse_markdown(data.get("markdown") or "")


# ---------------------------------------------------------------------------
# Filtering and records
# ---------------------------------------------------------------------------
def _norm(text):
    return re.sub(r"[^a-z0-9]+", "", (text or "").lower())


def filter_advertiser(ads, advertiser):
    """Keep one advertiser's ads: exact name or page id first, then a name that contains it."""
    if not advertiser:
        return ads
    want = _norm(advertiser)
    exact = [a for a in ads if _norm(a["advertiser"]) == want or a.get("page_id") == advertiser.strip()]
    if exact:
        return exact
    return [a for a in ads if want and want in _norm(a["advertiser"])]


def finish(ads, as_of):
    out = []
    for rank, ad in enumerate(ads, 1):
        rec = dict(ad)
        started = rec.get("started")
        rec["days_running"] = (as_of - started).days if started else None
        rec["started"] = started.isoformat() if started else None
        rec["impression_rank"] = rank
        rec["ad_library_url"] = ad_url(rec["library_id"])
        out.append(rec)
    return out


# ---------------------------------------------------------------------------
# Network
# ---------------------------------------------------------------------------
class PullError(Exception):
    pass


def firecrawl_scrape(url, key, wait_ms=6000, timeout=180):
    body = json.dumps({"url": url, "formats": ["markdown", "rawHtml"], "waitFor": wait_ms,
                       "onlyMainContent": False, "timeout": 120000}).encode()
    # Some APIs refuse urllib's default agent with a 403, so always send one.
    req = urllib.request.Request(FIRECRAWL_URL, data=body, method="POST", headers={
        "Authorization": "Bearer " + key, "Content-Type": "application/json", "User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as err:
        detail = err.read().decode("utf-8", "replace")[:300]
        raise PullError(f"Firecrawl returned HTTP {err.code}: {detail}") from None
    except (urllib.error.URLError, TimeoutError, ValueError) as err:
        raise PullError(f"Firecrawl request failed: {err}") from None
    if not payload.get("success", True) and not payload.get("data"):
        raise PullError(f"Firecrawl error: {str(payload.get('error') or payload)[:300]}")
    return payload.get("data") or payload


def download(url, dest, timeout=60):
    if not url:
        return False
    if os.path.exists(dest) and os.path.getsize(dest) > 1000:
        return True
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp, open(dest, "wb") as fh:
            fh.write(resp.read())
        return os.path.getsize(dest) > 0
    except (urllib.error.URLError, TimeoutError, OSError):
        if os.path.exists(dest):
            os.remove(dest)
        return False


def fetch_media(records, out_dir, videos=False):
    media = os.path.join(out_dir, "media")
    os.makedirs(media, exist_ok=True)
    failed = 0
    for rec in records:
        files = {}
        lid = rec["library_id"]
        if rec["media_type"] == "video":
            poster = (rec["poster_urls"] or rec["image_urls"] or [None])[0]
            if poster and download(poster, os.path.join(media, f"{lid}_poster.jpg")):
                files["poster"] = f"media/{lid}_poster.jpg"
            elif poster:
                failed += 1
            if videos and rec["video_urls"]:
                if download(rec["video_urls"][0], os.path.join(media, f"{lid}.mp4"), timeout=180):
                    files["video"] = f"media/{lid}.mp4"
                else:
                    failed += 1
        else:
            # Carousel cards, or the versions of a dynamic creative ad.
            extra = "cards" if rec["media_type"] == "carousel" else "versions"
            for n, url in enumerate(rec["image_urls"][:5]):
                name = f"{lid}.jpg" if n == 0 else f"{lid}_{extra[:-1]}{n + 1}.jpg"
                if not download(url, os.path.join(media, name)):
                    failed += 1
                elif n == 0:
                    files["image"] = f"media/{name}"
                else:
                    files.setdefault(extra, []).append(f"media/{name}")
        rec["files"] = files
    return failed


# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------
def write_board(path, meta, records):
    esc = html.escape
    rows = sorted(records, key=lambda r: -(r["days_running"] or -1))
    cards = []
    for r in rows:
        files = r.get("files") or {}
        thumb = files.get("image") or files.get("poster") or (r["image_urls"] or r["poster_urls"] or [""])[0]
        media = f'<img src="{esc(thumb)}" alt="" loading="lazy">' if thumb else '<div class="nomedia">no preview</div>'
        days = "?" if r["days_running"] is None else r["days_running"]
        text = esc((r["primary_text"] or "")[:220])
        cards.append(
            f'<article><a href="{esc(r["ad_library_url"])}" target="_blank" rel="noopener">{media}</a>'
            f'<div class="meta"><b>{esc(r["advertiser"] or "unknown")}</b>'
            f'<span>{days} days · {esc(r["media_type"])} · #{r["impression_rank"]}</span></div>'
            f'<p class="head">{esc(r["headline"] or "")}</p><p>{text}</p>'
            f'<p class="cta">{esc(r["cta"] or "")}</p></article>')
    page = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Ad board: {esc(meta["query"])}</title>
<style>
:root{{--bg:#f6f5f2;--card:#fff;--ink:#1c1c1c;--muted:#666;--line:#e3e0da}}
@media (prefers-color-scheme:dark){{:root{{--bg:#151515;--card:#1f1f1f;--ink:#eee;--muted:#aaa;--line:#333}}}}
body{{margin:0;background:var(--bg);color:var(--ink);font:14px/1.45 system-ui,sans-serif}}
header{{padding:20px 16px 8px}} h1{{font-size:20px;margin:0 0 4px}} header p{{margin:0;color:var(--muted)}}
main{{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;padding:16px}}
article{{background:var(--card);border:1px solid var(--line);border-radius:10px;overflow:hidden}}
article img{{width:100%;aspect-ratio:4/5;object-fit:cover;display:block;background:var(--line)}}
.nomedia{{aspect-ratio:4/5;display:grid;place-items:center;color:var(--muted);background:var(--line)}}
.meta{{display:flex;justify-content:space-between;gap:8px;padding:8px 10px 0}} .meta span{{color:var(--muted);white-space:nowrap}}
article p{{margin:4px 10px;font-size:13px}} .head{{font-weight:600}} .cta{{color:var(--muted);margin-bottom:10px}}
</style></head><body>
<header><h1>{esc(meta["query"])}{(" · " + esc(meta["advertiser"])) if meta.get("advertiser") else ""}</h1>
<p>{len(records)} live ads, pulled {esc(meta["pulled"])}, oldest first. The number after the format is the ad's place in Meta's impressions sort. Click an ad to open it in the Ad Library.</p></header>
<main>
{chr(10).join(cards)}
</main></body></html>
"""
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(page)


def write_outputs(out_dir, meta, records):
    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, "index.json"), "w", encoding="utf-8") as fh:
        json.dump(dict(meta, count=len(records), ads=records), fh, indent=1, ensure_ascii=False)
    write_board(os.path.join(out_dir, "board.html"), meta, records)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def load_file(path):
    """A saved Firecrawl response (.json), a saved markdown view (.md) or the raw page (.html)."""
    with open(path, encoding="utf-8") as fh:
        text = fh.read()
    if path.endswith(".json"):
        data = json.loads(text)
        return data.get("data", data)
    if path.endswith((".html", ".htm")):
        return {"rawHtml": text}
    return {"markdown": text}


def main(argv=None, fetch=firecrawl_scrape):
    ap = argparse.ArgumentParser(description="Pull live US ads from the Meta Ad Library.")
    ap.add_argument("term", help="brand or category to search, e.g. 'coffee subscription'")
    ap.add_argument("--advertiser", help="keep only this advertiser's ads (page name or page id)")
    ap.add_argument("--limit", type=int, default=30, help="most ads to keep (default 30)")
    ap.add_argument("--out", help="output folder (default ./ad-library/<term>)")
    ap.add_argument("--country", default="US", help="two-letter country code (default US)")
    ap.add_argument("--wait", type=int, default=6000, help="ms to let the page load (default 6000)")
    ap.add_argument("--no-page-pull", action="store_true",
                    help="with --advertiser, skip the second read of that advertiser's own page")
    ap.add_argument("--videos", action="store_true", help="also download video files (large)")
    ap.add_argument("--no-download", action="store_true", help="write index.json and board.html only")
    ap.add_argument("--from-file", help="parse a saved page (.json, .md or .html) instead of fetching")
    ap.add_argument("--as-of", help="date to count days running from (YYYY-MM-DD, default today)")
    args = ap.parse_args(argv)
    if args.limit < 1:
        ap.error("--limit must be at least 1")
    as_of = dt.date.fromisoformat(args.as_of) if args.as_of else dt.date.today()
    url = search_url(args.term, args.country)
    out_dir = args.out or os.path.join("ad-library", slugify(args.advertiser or args.term))

    pages = []
    if args.from_file:
        pages.append(load_file(args.from_file))
    else:
        key = os.environ.get("FIRECRAWL_API_KEY", "").strip()
        if not key:
            print("No FIRECRAWL_API_KEY set, so nothing was pulled. Open this in a browser instead:")
            print(url)
            print("Read each card's 'Started running on' date. Ads live a month or more are the ones worth studying.")
            return 0
        try:
            pages.append(fetch(url, key, args.wait))
        except PullError as err:
            print(f"Pull failed: {err}\nOpen the page by hand instead: {url}")
            return 1
    ads = parse_page(pages[0])
    if not ads and "captcha_required\":true" in (pages[0].get("rawHtml") or ""):
        print(f"The Ad Library asked for a captcha. Try again in a few minutes, or open: {url}")
        return 1
    kept = filter_advertiser(ads, args.advertiser)

    # One advertiser: also read their own page, which lists only their ads.
    page_ids = {a["page_id"] for a in kept if a.get("page_id")}
    if args.advertiser and not args.from_file and not args.no_page_pull and len(page_ids) == 1 and len(kept) < args.limit:
        pid = page_ids.pop()
        try:
            more = parse_page(fetch(page_url(pid, args.country), os.environ["FIRECRAWL_API_KEY"].strip(), args.wait))
            seen = {a["library_id"] for a in kept}
            kept += [a for a in more if a["library_id"] not in seen and a.get("page_id") in ("", pid)]
            url = page_url(pid, args.country)
        except PullError as err:
            print(f"Second read of the advertiser page failed, keeping the search results: {err}")

    kept = [a for a in kept if a.get("active", True)][: args.limit]
    records = finish(kept, as_of)
    meta = {"query": args.term, "advertiser": args.advertiser or "", "country": args.country,
            "url": url, "pulled": as_of.isoformat(), "parsed_from": records[0]["source"] if records else ""}
    failed = 0
    if records and not args.no_download:
        failed = fetch_media(records, out_dir, videos=args.videos)
    write_outputs(out_dir, meta, records)

    if not records:
        names = sorted({a["advertiser"] for a in ads if a["advertiser"]})[:8]
        print(f"No ads kept. The page held {len(ads)} ads"
              + (f" from: {', '.join(names)}." if names else ".")
              + " Check the --advertiser spelling, or open: " + url)
        return 0
    oldest = sorted(records, key=lambda r: -(r["days_running"] or -1))[:5]
    print(f"{len(records)} live ads kept from {len(ads)} on the page ({meta['parsed_from']} parse).")
    for r in oldest:
        print(f"  {r['days_running']} days  {r['advertiser']}  {r['media_type']}  {r['ad_library_url']}")
    if failed:
        print(f"{failed} media files did not download (links expire within hours; rerun to refresh).")
    print(f"Board: {os.path.join(out_dir, 'board.html')}")
    print(f"Index: {os.path.join(out_dir, 'index.json')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
