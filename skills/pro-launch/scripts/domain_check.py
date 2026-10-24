#!/usr/bin/env python3
"""Check name x TLD availability signals + App Store same-name collisions. Free, no signup.

  python3 domain_check.py chupy fizzpic --tlds com,app,ai --prefixes get,try --appstore us,jp,kr

On macOS, python.org builds can fail SSL verification: run with /usr/bin/python3.
Signals (never final: confirm in the registrar's checkout page before telling anyone it is free):
  .com/.net : Verisign RDAP. 404 = not registered; 200 = taken.            (reliable)
  other TLD : rdap.org bootstrap redirect. 404 = not registered, 200 = taken, anything else = '?' (verify by hand)
  appstore  : iTunes Search API, counts apps whose name starts with the candidate in each storefront.
Premium-priced / reserved names show up as 'free' here but cost a lot: the registrar page is the truth.
Bulk scan (100k+ names): resolve NS via the TLD's root servers over UDP first (~1000/s), then RDAP only the NXDOMAIN hits
(NXDOMAIN != free: registered domains without NS also return it).
"""
import argparse, json, urllib.error, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor


def rdap(domain):
    tld = domain.rsplit(".", 1)[1]
    url = (f"https://rdap.verisign.com/{tld}/v1/domain/{domain}" if tld in ("com", "net")
           else f"https://rdap.org/domain/{domain}")
    try:
        urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "domain-check"}), timeout=15)
        return domain, "taken"
    except urllib.error.HTTPError as e:
        return domain, "free?" if e.code == 404 else f"?{e.code}"
    except Exception:
        return domain, "?net"


def appstore(name, country):
    q = urllib.parse.urlencode({"term": name, "entity": "software", "limit": 10, "country": country})
    try:
        res = json.load(urllib.request.urlopen(f"https://itunes.apple.com/search?{q}", timeout=15))["results"]
    except Exception:
        return "?"
    n = [r["trackName"] for r in res if r["trackName"].lower().replace(" ", "").startswith(name.lower())]
    return f"{len(n)} same-name" + (f" ({n[0][:24]})" if n else "")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("names", nargs="+")
    ap.add_argument("--tlds", default="com,app,ai,co,io")
    ap.add_argument("--prefixes", default="", help="comma list tried on .com only: get,try,use,hello")
    ap.add_argument("--suffixes", default="", help="comma list tried on .com only: app,hq,studio,club")
    ap.add_argument("--appstore", default="", help="storefronts, e.g. us,jp,kr,cn,vn")
    a = ap.parse_args()
    for name in a.names:
        cands = [f"{name}.{t}" for t in a.tlds.split(",") if t]
        cands += [f"{p}{name}.com" for p in a.prefixes.split(",") if p]
        cands += [f"{name}{s}.com" for s in a.suffixes.split(",") if s]
        with ThreadPoolExecutor(8) as ex:
            rows = list(ex.map(rdap, cands))
        print(f"\n== {name}")
        for d, s in rows:
            print(f"  {d:<28}{s}")
        for c in filter(None, a.appstore.split(",")):
            print(f"  appstore[{c}]".ljust(30) + appstore(name, c))


if __name__ == "__main__":
    main()
