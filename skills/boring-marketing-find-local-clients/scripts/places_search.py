#!/usr/bin/env python3
"""Pull a cell of local businesses from the Google Places API (New). Stdlib only.

Optional helper for find-local-clients. Runs one or more Text Search phrasings,
follows up to --max-pages pages each (20 results a page, 60 max per phrasing),
merges duplicates by place ID, and writes CSV to stdout.

The field mask asks for rating, review count, website and phone, which bill at
the Text Search Enterprise tier. Check references/free-sources-facts.md for the
current free monthly cap before a big run. Needs a Google Cloud project with
billing turned on and the Places API (New) enabled.

Usage:
    GOOGLE_PLACES_API_KEY=... python3 places_search.py "plumber in Dallas, TX" \
        "emergency plumber Dallas, TX" [--max-pages 3] > places.csv

Terms: keep the place IDs (storable indefinitely); treat the other fields as a
snapshot for this run, and credit Google Maps wherever the data is shown.

Exit codes: 0 ok, 1 bad args or missing key, 2 every request failed.
"""

import argparse
import csv
import json
import os
import sys
import time
import urllib.error
import urllib.request

ENDPOINT = "https://places.googleapis.com/v1/places:searchText"
FIELDS = [
    "places.id",
    "places.displayName",
    "places.formattedAddress",
    "places.nationalPhoneNumber",
    "places.websiteUri",
    "places.rating",
    "places.userRatingCount",
    "places.businessStatus",
    "places.googleMapsUri",
    "places.primaryType",
    "nextPageToken",
]
COLUMNS = [
    "place_id", "name", "address", "phone", "website", "rating",
    "review_count", "business_status", "maps_url", "primary_type", "queries",
]


def search_page(key, query, page_token=None):
    body = {"textQuery": query, "pageSize": 20}
    if page_token:
        body["pageToken"] = page_token
    req = urllib.request.Request(
        ENDPOINT,
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "X-Goog-Api-Key": key,
            "X-Goog-FieldMask": ",".join(FIELDS),
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("queries", nargs="+", help='search phrasings, e.g. "plumber in Dallas, TX"')
    p.add_argument("--max-pages", type=int, default=3, help="pages per phrasing (1-3, default 3)")
    args = p.parse_args(argv)

    key = os.environ.get("GOOGLE_PLACES_API_KEY", "").strip()
    if not key:
        print("GOOGLE_PLACES_API_KEY is not set. This helper is optional; the free path "
              "in SKILL.md works without it.", file=sys.stderr)
        return 1
    max_pages = max(1, min(3, args.max_pages))

    places = {}
    requests_made = 0
    failures = 0
    for query in args.queries:
        token = None
        for page in range(max_pages):
            try:
                data = search_page(key, query, token)
                requests_made += 1
            except urllib.error.HTTPError as e:
                failures += 1
                detail = e.read().decode("utf-8", "replace")[:300]
                print(f"[{query}] page {page + 1}: HTTP {e.code} {detail}", file=sys.stderr)
                break
            except (urllib.error.URLError, TimeoutError) as e:
                failures += 1
                print(f"[{query}] page {page + 1}: {e}", file=sys.stderr)
                break
            for pl in data.get("places", []):
                pid = pl.get("id")
                if not pid:
                    continue
                row = places.setdefault(pid, {
                    "place_id": pid,
                    "name": (pl.get("displayName") or {}).get("text", ""),
                    "address": pl.get("formattedAddress", ""),
                    "phone": pl.get("nationalPhoneNumber", ""),
                    "website": pl.get("websiteUri", ""),
                    "rating": pl.get("rating", ""),
                    "review_count": pl.get("userRatingCount", ""),
                    "business_status": pl.get("businessStatus", ""),
                    "maps_url": pl.get("googleMapsUri", ""),
                    "primary_type": pl.get("primaryType", ""),
                    "queries": [],
                })
                if query not in row["queries"]:
                    row["queries"].append(query)
            token = data.get("nextPageToken")
            if not token:
                break
            time.sleep(2)  # give the next-page token a moment to become valid

    if requests_made == 0 and failures:
        return 2

    w = csv.DictWriter(sys.stdout, fieldnames=COLUMNS)
    w.writeheader()
    for row in sorted(places.values(), key=lambda r: -(r["review_count"] or 0)):
        out = dict(row)
        out["queries"] = " | ".join(row["queries"])
        w.writerow(out)
    print(f"{len(places)} places from {requests_made} requests "
          f"(Text Search Enterprise). Source: Google Maps.", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
