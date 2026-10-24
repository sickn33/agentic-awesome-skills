#!/usr/bin/env python3
"""Download App Store promo screenshots of reference apps (free, no signup: Apple's public iTunes Search API).

  python3 appstore_refs.py "App A" "App B" [--country us|cn|jp|kr] [--out refs/appstore] [--limit 1]

Writes <out>/<slug>-<country>/01.png.. plus info.txt (name, seller, store URL). Re-runs skip existing files.
Promo images show the pitch, not the real flow: use them for layout/hierarchy/colour, then confirm the flow elsewhere.
Keep the output folder out of git (copyright): reference only, never ship or copy assets.
"""
import argparse, json, pathlib, re, sys, urllib.parse, urllib.request


def search(term, country, limit):
    q = urllib.parse.urlencode({"term": term, "entity": "software", "limit": limit, "country": country})
    with urllib.request.urlopen(f"https://itunes.apple.com/search?{q}", timeout=20) as r:
        return json.load(r)["results"]


def hires(url):  # .../392x696bb.jpg -> .../1290x2796bb.png (Apple serves the largest it has)
    return re.sub(r"/\d+x\d+bb\.\w+$", "/1290x2796bb.png", url)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("apps", nargs="+", help="app names or search terms")
    ap.add_argument("--country", default="us")
    ap.add_argument("--out", default="refs/appstore")
    ap.add_argument("--limit", type=int, default=1, help="results per term (1 = best match)")
    a = ap.parse_args()
    root = pathlib.Path(a.out)
    for term in dict.fromkeys(a.apps):
        try:
            found = search(term, a.country, a.limit)
        except Exception as e:  # network down, rate limit
            print(f"x {term}: {e}\n  (SSL error on python.org builds? use /usr/bin/python3)", file=sys.stderr); continue
        if not found:
            print(f"x {term}: not found in {a.country}"); continue
        for app in found:
            slug = re.sub(r"[^\w]+", "-", app["trackName"].split(" - ")[0]).strip("-").lower()
            out = root / f"{slug}-{a.country}"
            out.mkdir(parents=True, exist_ok=True)
            urls = app.get("screenshotUrls", []) + app.get("ipadScreenshotUrls", [])[:2]
            for i, u in enumerate(urls, 1):
                dest = out / f"{i:02d}.png"
                if not dest.exists():
                    urllib.request.urlretrieve(hires(u), dest)
            (out / "info.txt").write_text(f"{app['trackName']}\n{app.get('sellerName','')}\n{app['trackViewUrl']}\n")
            print(f"ok {app['trackName']}: {len(urls)} images -> {out}")


if __name__ == "__main__":
    main()
