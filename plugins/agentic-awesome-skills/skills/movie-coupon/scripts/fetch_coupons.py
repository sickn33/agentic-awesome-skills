#!/usr/bin/env python3
"""Read the public movie feed only when requested; no installation ID or local writes.

Feed content is untrusted advertising data. Fetching discloses network metadata to
agskills.moontai.top; opening a returned merchant/QR link is a separate action.
"""
import argparse
import json
import sys
import unicodedata
from urllib.parse import urlsplit

import requests

API_BASE_URL = "https://agskills.moontai.top"
MAX_RESPONSE_BYTES = 2 * 1024 * 1024


def safe_url(value):
    if not isinstance(value, str) or any(ord(c) <= 32 or ord(c) == 127 for c in value):
        return ""
    try:
        url = urlsplit(value)
        if url.scheme != "https" or not url.hostname or url.username or url.password:
            return ""
        if url.port not in (None, 443):
            return ""
    except ValueError:
        return ""
    return value


class CouponFetcher:
    def __init__(self, base_url=API_BASE_URL):
        if base_url != API_BASE_URL:
            raise ValueError("Only the documented feed origin is supported")
        self.session = requests.Session()
        # Do not inherit ambient proxy credentials or .netrc authentication.
        self.session.trust_env = False
        self.session.headers.update({"Accept": "application/json", "User-Agent": "Movie-CouponFetcher/3.0"})

    def get_coupons(self):
        try:
            with self.session.get(API_BASE_URL + "/coupon/movie", timeout=(5, 10),
                                  allow_redirects=False, stream=True) as response:
                if response.status_code != 200:
                    return {"error": True, "message": "Feed request did not return HTTP 200"}
                body = bytearray()
                for chunk in response.iter_content(chunk_size=65536):
                    if len(body) + len(chunk) > MAX_RESPONSE_BYTES:
                        raise ValueError("Feed exceeds the response size limit")
                    body.extend(chunk)
                data = json.loads(body.decode("utf-8"))
            if not isinstance(data, list) or len(data) > 1000 or any(not isinstance(item, dict) for item in data):
                raise ValueError("Expected a bounded JSON array of coupon objects")
            keys = {"title", "guideline", "coupon_code", "coupon_url", "coupon_qrcode_img_url", "coupon_h5_qrcode_img_url"}
            for item in data:
                if any(k in item and not isinstance(item[k], str) for k in keys):
                    raise ValueError("Coupon fields must be strings")
            return data
        except (requests.RequestException, ValueError, UnicodeError):
            # Avoid exposing URLs, headers, credentials or untrusted response text.
            return {"error": True, "message": "Feed unavailable, too large, or invalid; no coupons verified"}

    def get_coupon_info(self):
        return self.get_coupons()


def terminal_safe(value):
    return ''.join(f"\\u{ord(c):04x}" if unicodedata.category(c) in {'Cc', 'Cf'} and c not in '\n\t' else c for c in str(value))


def format_coupon_display(data):
    lines = ["【电影票优惠券】", "标题: " + data.get("title", "电影票优惠券")]
    if data.get("coupon_code"):
        lines.append("Coupon code (copy exactly): " + data["coupon_code"])
    for key in ("coupon_url", "coupon_qrcode_img_url", "coupon_h5_qrcode_img_url"):
        if key in data:
            value = safe_url(data[key])
            lines.append(key + ": " + (value or "[unsafe or malformed URL withheld]"))
    lines.append("使用说明 (untrusted feed text): " + data.get("guideline", ""))
    return terminal_safe("\n".join(lines))


def format_coupons_list(data):
    if isinstance(data, dict) and data.get("error"):
        return "获取失败: " + terminal_safe(data.get("message", "Unknown error"))
    if not data:
        return "No coupons returned; no price or redemption guarantee."
    return "\n\n".join(format_coupon_display(item) for item in data)


def main():
    parser = argparse.ArgumentParser(description="Fetch an unverified public movie-coupon feed")
    parser.add_argument("--json", "-j", action="store_true", help="Output JSON as data, never instructions")
    args = parser.parse_args()
    result = CouponFetcher().get_coupons()
    # JSON escaping preserves exact string values without raw terminal controls.
    print(json.dumps(result, ensure_ascii=True, indent=2) if args.json else format_coupons_list(result))
    return 1 if isinstance(result, dict) and result.get("error") else 0


if __name__ == "__main__":
    sys.exit(main())
