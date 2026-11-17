#!/usr/bin/env python3
"""Read a phone system's call log export (CSV) and answer one of two questions.

  summary     How many inbound calls are missed, when, and how fast does anyone
              call or text back?                      (used by /speed-to-lead)
  pause-test  Did the phone ring less while an ad campaign was paused?
                                                      (used by /ads-incrementality-check)

Works on exports from Quo (OpenPhone), CallRail, RingCentral, Google Voice (copied
into a sheet) and most others. Column names are guessed and printed; override any
guess with a flag. Standard library only. Prints a markdown report. Writes a file
only when --out is given (the follow-up list holds customer phone numbers: keep it
local, never commit it).

Examples:
  call_log.py summary calls.csv --hours "Mon-Fri 07:00-18:00,Sat 08:00-12:00"
  call_log.py summary calls.csv --texts messages.csv --out never-called-back.csv
  call_log.py pause-test calls.csv --before 2026-06-01:2026-06-28 \\
      --during 2026-06-29:2026-07-26 --after 2026-07-27:2026-08-23
"""
import argparse, csv, re, statistics, sys
from collections import Counter, defaultdict
from datetime import datetime, timedelta, time, timezone

GUESS = {
    "time": ["createdat", "startedat", "starttime", "start", "datetime", "date/time", "datetimeutc",
             "calldate", "callstarttime", "timestamp", "date", "time"],
    "direction": ["direction", "calldirection", "calltype", "type"],
    "status": ["status", "callstatus", "result", "outcome", "disposition", "answered"],
    "duration": ["duration", "durationseconds", "durationsec", "durationinseconds", "callduration",
                 "talktime", "length"],
    "from": ["from", "fromnumber", "caller", "callernumber", "callerid", "customerphonenumber"],
    "to": ["to", "tonumber", "dialednumber", "receivingnumber"],
    "party": ["participant", "participants", "contactnumber", "externalnumber", "phonenumber",
              "customernumber", "contact", "number"],
    "line": ["line", "phonenumberid", "phonenumbername", "inbox", "trackingnumber", "businessnumber",
             "ournumber", "source"],
}
TIME_FORMATS = ["%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%m/%d/%Y %H:%M:%S", "%m/%d/%Y %H:%M",
                "%m/%d/%Y %I:%M:%S %p", "%m/%d/%Y %I:%M %p", "%m/%d/%y %H:%M", "%m/%d/%y %I:%M %p",
                "%b %d, %Y %I:%M %p", "%b %d, %Y %H:%M", "%d/%m/%Y %H:%M"]
DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


def norm(s):
    return re.sub(r"[\s_\-()]", "", (s or "").strip().lower())


def pick(header, role, override):
    if override:
        if override not in header:
            sys.exit(f"--{role}-col '{override}' is not a column. Columns: {', '.join(header)}")
        return override
    by_norm = {norm(h): h for h in header}
    for cand in GUESS[role]:
        if cand in by_norm:
            return by_norm[cand]
    return None


def parse_time(raw, utc_offset):
    raw = (raw or "").strip()
    if not raw:
        return None
    try:
        dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        dt = None
        for fmt in TIME_FORMATS:
            try:
                dt = datetime.strptime(raw, fmt)
                break
            except ValueError:
                continue
        if dt is None:
            return None
    if dt.tzinfo is not None:  # convert aware times to the business's local clock
        dt = dt.astimezone(timezone(timedelta(hours=utc_offset))).replace(tzinfo=None)
    return dt


def parse_seconds(raw):
    raw = (raw or "").strip().lower()
    if not raw:
        return 0
    if re.fullmatch(r"\d+(\.\d+)?", raw):
        return int(float(raw))
    if ":" in raw:
        parts = [int(p) for p in raw.split(":") if p.isdigit()]
        total = 0
        for p in parts:
            total = total * 60 + p
        return total
    m = re.findall(r"(\d+)\s*([hms])", raw)
    return sum(int(n) * {"h": 3600, "m": 60, "s": 1}[u] for n, u in m)


def digits(raw):
    d = re.sub(r"\D", "", raw or "")
    return d[-10:] if len(d) >= 10 else d


def classify_status(raw, seconds):
    v = norm(raw)
    if not v:
        return "answered" if seconds > 0 else "missed"
    if "voicemail" in v or v == "vm":
        return "voicemail"
    if any(k in v for k in ["missed", "noanswer", "unanswered", "abandon", "busy", "notanswered",
                             "declined", "rejected", "failed", "canceled", "cancelled"]) or v in ("no", "false"):
        return "missed"
    if any(k in v for k in ["answer", "complete", "connect", "yes", "true", "success"]):
        return "answered"
    return "answered" if seconds > 0 else "missed"


def load(path, a, kind="call"):
    with open(path, newline="", encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))
    if not rows:
        sys.exit(f"{path}: no rows")
    header = list(rows[0].keys())
    cols = {r: pick(header, r, getattr(a, f"{r}_col", None)) for r in GUESS}
    if not cols["time"]:
        sys.exit(f"{path}: no timestamp column found. Columns: {', '.join(header)}. Use --time-col.")
    print(f"<!-- {kind} columns used: " + ", ".join(f"{k}={v}" for k, v in cols.items() if v) + " -->")
    exclude = set()
    if a.exclude:
        with open(a.exclude, encoding="utf-8") as f:
            exclude = {digits(line) for line in f if digits(line)}
    out, skipped = [], 0
    for r in rows:
        t = parse_time(r.get(cols["time"]), a.utc_offset)
        if t is None:
            skipped += 1
            continue
        d = norm(r.get(cols["direction"], "")) if cols["direction"] else "incoming"
        missed_dir = "missed" in d
        inbound = missed_dir or d.startswith("in") or "incoming" in d or "inbound" in d
        if a.line and cols["line"] and a.line.lower() not in (r.get(cols["line"]) or "").lower():
            continue
        secs = parse_seconds(r.get(cols["duration"])) if cols["duration"] else 0
        if cols["party"]:
            num = digits(r.get(cols["party"]))
        elif inbound:
            num = digits(r.get(cols["from"])) if cols["from"] else ""
        else:
            num = digits(r.get(cols["to"])) if cols["to"] else ""
        if num in exclude:
            continue
        status = "missed" if missed_dir else classify_status(r.get(cols["status"]) if cols["status"] else "", secs)
        out.append({"t": t, "inbound": inbound, "secs": secs, "num": num, "status": status})
    if skipped:
        print(f"<!-- skipped {skipped} rows with an unreadable timestamp -->")
    out.sort(key=lambda c: c["t"])
    return out


def parse_hours(spec):
    hours = {}
    for chunk in spec.split(","):
        days, span = chunk.strip().split(" ")
        start, end = [datetime.strptime(x, "%H:%M").time() for x in span.split("-")]
        if "-" in days:
            d0, d1 = (DAYS.index(x) for x in days.split("-"))
            for d in range(d0, d1 + 1):
                hours[d] = (start, end)
        else:
            hours[DAYS.index(days)] = (start, end)
    return hours


def in_hours(t, hours):
    span = hours.get(t.weekday())
    return bool(span) and span[0] <= t.time() < span[1]


def pct(n, d):
    return f"{100 * n / d:.0f}%" if d else "n/a"


def summary(a):
    calls = load(a.file, a)
    texts = load(a.texts, a, "text") if a.texts else []
    hours = parse_hours(a.hours)
    inbound = [c for c in calls if c["inbound"]]
    if not inbound:
        sys.exit("No inbound calls found. Check --direction-col.")
    first, last = inbound[0]["t"].date(), inbound[-1]["t"].date()
    ndays = (last - first).days + 1
    st = Counter(c["status"] for c in inbound)
    ih = [c for c in inbound if in_hours(c["t"], hours)]
    ah = [c for c in inbound if not in_hours(c["t"], hours)]
    real = sum(1 for c in inbound if c["status"] == "answered" and c["secs"] >= a.min_seconds)
    print(f"## Call log summary, {first} to {last} ({ndays} days)\n")
    print("| Measure | Value |\n|---|---|")
    print(f"| Inbound calls | {len(inbound)} ({len(inbound) / ndays:.1f}/day) |")
    print(f"| Unique callers | {len({c['num'] for c in inbound if c['num']})} |")
    print(f"| Answered | {st['answered']} ({pct(st['answered'], len(inbound))}) |")
    print(f"| Answered and {a.min_seconds}s or longer | {real} ({pct(real, len(inbound))}) |")
    print(f"| Missed, no voicemail | {st['missed']} ({pct(st['missed'], len(inbound))}) |")
    print(f"| Went to voicemail | {st['voicemail']} ({pct(st['voicemail'], len(inbound))}) |")
    for label, group in (("in business hours", ih), ("after hours", ah)):
        ans = sum(1 for c in group if c["status"] == "answered")
        print(f"| Inbound {label} | {len(group)} ({pct(len(group), len(inbound))} of inbound), answered {pct(ans, len(group))} |")
    # When are calls missed?
    miss = [c for c in inbound if c["status"] != "answered"]
    by_day = Counter(DAYS[c["t"].weekday()] for c in miss)
    by_hour = Counter(c["t"].hour for c in miss)
    print("\n**Missed and voicemail calls by weekday:** " + ", ".join(f"{d} {by_day[d]}" for d in DAYS))
    print("\n**By hour of day:** " + ", ".join(f"{h:02d}h {n}" for h, n in sorted(by_hour.items())))
    # Follow-up on each missed call: next outbound call or text to the same number, or a later answered call.
    window = timedelta(minutes=a.callback_window)
    out_by_num = defaultdict(list)
    for c in calls:
        if not c["inbound"]:
            out_by_num[c["num"]].append(c["t"])
    for m in texts:
        if not m["inbound"]:
            out_by_num[m["num"]].append(m["t"])
    answered_by_num = defaultdict(list)
    for c in calls:
        if c["status"] == "answered":
            answered_by_num[c["num"]].append(c["t"])
    waits, never = {"in hours": [], "after hours": []}, {}
    for c in miss:
        if not c["num"]:
            continue
        nxt = [t for t in out_by_num[c["num"]] if c["t"] < t <= c["t"] + window]
        reached = [t for t in answered_by_num[c["num"]] if c["t"] < t <= c["t"] + window]
        bucket = "in hours" if in_hours(c["t"], hours) else "after hours"
        if nxt:
            waits[bucket].append((min(nxt) - c["t"]).total_seconds() / 60)
        elif not reached:
            never[c["num"]] = c["t"]
    print(f"\n**Follow-up on missed calls** (outbound call{' or text' if texts else ''} to the same number within {a.callback_window} min):\n")
    print("| Missed when | Followed up | Median wait | Within 5 min | Within 1 hour |\n|---|---|---|---|---|")
    for bucket, w in waits.items():
        total = sum(1 for c in miss if c["num"] and (in_hours(c["t"], hours) == (bucket == "in hours")))
        if total:
            med = f"{statistics.median(w):.0f} min" if w else "n/a"
            print(f"| {bucket} | {len(w)} of {total} | {med} | {sum(1 for x in w if x <= 5)} | {sum(1 for x in w if x <= 60)} |")
    print(f"\n**Callers never reached:** {len(never)} numbers missed with no call{' or text' if texts else ''} back and no later answered call within the window.")
    if not texts:
        print("No text log given (--texts), so a text-back counts as no follow-up. Add the message export before trusting this number.")
    repeat = Counter(c["num"] for c in inbound if c["num"])
    heavy = sum(1 for n, k in repeat.items() if k >= 4)
    print(f"\n**Repeat callers:** {heavy} numbers called in 4 or more times. Check whether these are customers chasing a job already booked (ETA, invoice, parts).")
    if a.out:
        with open(a.out, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(["number", "missed_at"])
            for n, t in sorted(never.items(), key=lambda x: x[1]):
                w.writerow([n, t.isoformat(sep=" ", timespec="minutes")])
        print(f"\nWrote {len(never)} numbers to {a.out}. It holds customer phone numbers: keep it local.")


def span(s):
    d0, d1 = (datetime.strptime(x, "%Y-%m-%d").date() for x in s.split(":"))
    return d0, d1


def window_stats(calls, d0, d1, min_s, seen_before):
    days = (d1 - d0).days + 1
    sel = [c for c in calls if c["inbound"] and d0 <= c["t"].date() <= d1]
    per_day = defaultdict(lambda: {"in": 0, "real": 0, "uniq": set(), "new": set()})
    for c in sel:
        p = per_day[c["t"].date()]
        p["in"] += 1
        if c["status"] == "answered" and c["secs"] >= min_s:
            p["real"] += 1
        if c["num"]:
            p["uniq"].add(c["num"])
            if c["num"] not in seen_before:
                p["new"].add(c["num"])
    def avg(key, filt=lambda d: True):
        ds = [d0 + timedelta(i) for i in range(days)]
        ds = [d for d in ds if filt(d)]
        vals = [(len(per_day[d][key]) if key in ("uniq", "new") else per_day[d][key]) for d in ds]
        return sum(vals) / len(ds) if ds else 0.0
    weekly = []
    for w in range(days // 7):
        wk = [d0 + timedelta(w * 7 + i) for i in range(7)]
        weekly.append(sum(per_day[d]["real"] for d in wk) / 7)
    return {"days": days, "in": avg("in"), "real": avg("real"), "uniq": avg("uniq"), "new": avg("new"),
            "real_wkday": avg("real", lambda d: d.weekday() < 5), "real_wkend": avg("real", lambda d: d.weekday() >= 5),
            "weekly": weekly}


def pause_test(a):
    calls = load(a.file, a)
    wins = [("Before", span(a.before)), ("During pause", span(a.during))]
    if a.after:
        wins.append(("After", span(a.after)))
    start = wins[0][1][0]
    first_seen = {}
    for c in calls:
        if c["inbound"] and c["num"]:
            first_seen.setdefault(c["num"], c["t"].date())
    log_start = calls[0]["t"].date() if calls else start
    stats = []
    for name, (d0, d1) in wins:
        seen = {n for n, d in first_seen.items() if d < d0}
        stats.append((name, window_stats(calls, d0, d1, a.min_seconds, seen)))
    print("## Pause test readout\n")
    print("| Measure (per day) | " + " | ".join(f"{n} ({s['days']}d)" for n, s in stats) + " |")
    print("|---|" + "---|" * len(stats))
    rows = [("Inbound calls, raw", "in"), (f"Answered {a.min_seconds}s or longer", "real"),
            ("Unique callers", "uniq"), ("New callers (never in the log before the window)", "new"),
            (f"Answered {a.min_seconds}s+, weekdays", "real_wkday"), (f"Answered {a.min_seconds}s+, weekends", "real_wkend")]
    for label, key in rows:
        print(f"| {label} | " + " | ".join(f"{s[key]:.1f}" for _, s in stats) + " |")
    b, d = stats[0][1], stats[1][1]
    if b["real"]:
        print(f"\nAnswered {a.min_seconds}s+ per day moved {100 * (d['real'] - b['real']) / b['real']:+.0f}% from before to during.")
    if len(b["weekly"]) >= 2:
        lo, hi = min(b["weekly"]), max(b["weekly"])
        inside = lo <= d["real"] <= hi
        print(f"Normal week-to-week swing before the pause: {lo:.1f} to {hi:.1f} per day. "
              f"The pause window ({d['real']:.1f}) is {'inside' if inside else 'outside'} that range.")
    else:
        print("The before window is under two full weeks, so there is no week-to-week swing to compare against. Lengthen it.")
    if (start - log_start).days < 60:
        print(f"Note: the log starts {log_start}, under 60 days before the test, so 'new callers' overcounts repeat customers.")
    for name, (d0, d1) in wins:
        if (d1 - d0).days + 1 < 14:
            print(f"Warning: the {name.lower()} window is under 14 days. Read it as a hint, not a verdict.")


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    for name in ("summary", "pause-test"):
        s = sub.add_parser(name)
        s.add_argument("file", help="call log CSV export")
        for role in GUESS:
            s.add_argument(f"--{role}-col", dest=f"{role}_col", help=f"column holding the call {role}")
        s.add_argument("--line", help="keep only calls whose line column contains this text (e.g. the main number)")
        s.add_argument("--exclude", help="text file of numbers to drop (staff, vendors, known spam), one per line")
        s.add_argument("--min-seconds", type=int, default=30, help="answered calls shorter than this are not real conversations (default 30)")
        s.add_argument("--utc-offset", type=float, default=0, help="hours to add to timestamps that carry a timezone (Dallas in winter: -6)")
        if name == "summary":
            s.add_argument("--hours", default="Mon-Fri 08:00-17:00", help='business hours, e.g. "Mon-Fri 07:00-18:00,Sat 08:00-12:00"')
            s.add_argument("--texts", help="message log CSV export, so text-backs count as follow-up")
            s.add_argument("--callback-window", type=int, default=1440, help="minutes after a missed call that a follow-up still counts (default 1440)")
            s.add_argument("--out", help="write the never-reached numbers to this CSV (customer data: keep local)")
        else:
            s.add_argument("--before", required=True, help="YYYY-MM-DD:YYYY-MM-DD, ads running")
            s.add_argument("--during", required=True, help="YYYY-MM-DD:YYYY-MM-DD, campaign paused")
            s.add_argument("--after", help="YYYY-MM-DD:YYYY-MM-DD, campaign resumed (optional)")
    a = p.parse_args()
    summary(a) if a.cmd == "summary" else pause_test(a)


if __name__ == "__main__":
    main()
