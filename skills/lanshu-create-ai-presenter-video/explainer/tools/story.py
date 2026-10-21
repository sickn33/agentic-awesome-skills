#!/usr/bin/env python3
"""Build a topic's story.json from one script file: script.md → voice → word times → story.json.

Usage:
  python3 tools/story.py stories/<topic>            # MiniMax voice per line (cached) with word timestamps → story.json
  python3 tools/story.py stories/<topic> --dry      # no API: estimated times, silent narration (story.draft = true)
  python3 tools/story.py stories/<topic> --check    # parse script.md, print the plan and the estimated length
  python3 tools/story.py stories/<topic> --audio narration.wav
                                                    # a narration you voiced yourself (any TTS, or a recording):
                                                    # lines found at its pauses, word times estimated

script.md (see stories/kv-cache/script.md for a full example):

  ---
  title: KV cache
  subtitle: 用显存换速度，只算新的那一个
  voice: Chinese (Mandarin)_Reliable_Executive      # optional, these are the defaults
  speed: 1.1
  pronounce: 攒竹/(cuan2)(zhu2)                      # optional: readings for polyphones / terms (';' between)
  ---
  ## problem | 问题：越写越慢                         # a chapter: key | chip title
  大模型回答问题，是一个 token 一个 token 往外蹦的。    # one narration line per text line
  > beat note for the storyboard (not spoken)
  ## end                                              # the closing line (Kit.title performs it)
  emphasis: 显存 / 速度 / 新的那一个
  一句话：用显存换速度，只算新的那一个。
  ## recap                                            # the unvoiced one-frame recap
  center: KV cache
  tagline: 用显存换速度
  length: 4.7
  - 问题 | 每出一个 token 都要回看前面全部，重算越来越慢
  ## facts                                            # the only facts a film may put on screen
  ```json
  { ... }
  ```

Voice and word timing: MiniMax T2A (env MINIMAX_API_KEY, never printed; MINIMAX_BASE_URL for the China endpoint)
voices one line per call and returns each word's timestamps (subtitle_type "word"), so word times come from the voice
engine itself — no speech-recognition model is needed. It also returns how each line was read (audio/pronounce.txt).
Cache: audio/tts/<key>.mp3 + .json by (model, voice, speed, text) — edit one line and only that line is re-voiced.
Pauses: `<#0.5#>` inside a line is a pause of that many seconds in the voice (e.g. slow counts for a follow-along:
「一<#0.5#>二<#0.5#>三」); captions and the film see the line without the markers.
Own narration (--audio): lines are placed at the recording's pauses and words spread by their speaking weight —
good for captions, approximate (about 0.15 s) for word-timed beats; story.timing says "estimated".
"""
import argparse, array, hashlib, json, math, os, re, subprocess, sys, urllib.request

MODEL = "speech-2.8-hd"
VOICE = "Chinese (Mandarin)_Reliable_Executive"
SPEED = 1.1
LEAD, SHORT, LONG, TAIL = 0.4, 0.3, 0.55, 0.6      # silence: head, between lines, after a chapter, after the last line
CHAPTER_PAD = 0.2                                   # a chapter chip changes this long before its first line
RECAP = 4.7
RESERVED = {"end", "recap", "facts"}

cjk = lambda c: "一" <= c <= "鿿"
UNIT = re.compile(r"[A-Za-z]+|\d+(?:\.\d+)?[A-Za-z]*|[一-鿿]|[^\sA-Za-z\d一-鿿]")
FIELD = re.compile(r"^([a-z_]+):\s*(.*)$")
PAUSE = re.compile(r"<#(\d+(?:\.\d+)?)#>")   # MiniMax pause marker: <#seconds#>


def shown(raw):
    """a line as captions and the film show it: the pause markers removed"""
    return PAUSE.sub("", raw)


def pause_time(raw):
    return sum(float(x) for x in PAUSE.findall(raw))


def line_weight(raw):
    """estimated speaking time of a line: units by weight, a syllable held before a pause (a count) about 0.6 s,
    plus the pauses themselves"""
    chunks = PAUSE.split(raw)[::2]
    total = 0.0
    for k, chunk in enumerate(chunks):
        ws = [weight(u) for u in UNIT.findall(chunk)]
        if k + 1 < len(chunks) and ws:
            ws[-1] = max(ws[-1], 0.6)
        total += sum(ws)
    return total + pause_time(raw)


# ---------------------------------------------------------------- script.md
def parse(path):
    text = open(path, encoding="utf-8").read()
    meta, body = {}, text
    m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    if m:
        for ln in m.group(1).splitlines():
            ln = ln.split(" #")[0].strip()
            if ":" in ln:
                k, v = ln.split(":", 1)
                meta[k.strip()] = v.strip()
        body = text[m.end():]
    sections, cur, fence = [], None, None
    for raw in body.splitlines():
        ln = raw.rstrip()
        if fence is not None:
            if ln.strip().startswith("```"):
                cur["json"] = json.loads("\n".join(fence)); fence = None
            else:
                fence.append(raw)
            continue
        if ln.startswith("## "):
            key, _, title = ln[3:].partition("|")
            cur = {"key": key.strip(), "title": title.strip(), "lines": [], "fields": {}, "points": [], "notes": []}
            sections.append(cur); continue
        s = ln.split("  #")[0].strip() if not ln.lstrip().startswith("- ") else ln.strip()
        if not s or s.startswith("<!--") or cur is None:
            continue
        if s.startswith("```"):
            fence = []; continue
        if s.startswith(">"):
            cur["notes"].append(s[1:].strip()); continue
        if s.startswith("- "):
            t, _, x = s[2:].partition("|")
            if cur["key"] == "facts":
                k, _, v = s[2:].partition(":"); cur["fields"][k.strip()] = v.strip()
            else:
                cur["points"].append({"title": t.strip(), "text": x.strip()})
            continue
        f = FIELD.match(s)
        if f and cur["key"] in ("end", "recap"):
            cur["fields"][f.group(1)] = f.group(2).strip(); continue
        cur["lines"].append(s)
    chapters = [s for s in sections if s["key"] not in RESERVED]
    end = next((s for s in sections if s["key"] == "end"), None)
    recap = next((s for s in sections if s["key"] == "recap"), None)
    facts = next((s for s in sections if s["key"] == "facts"), None)
    if not chapters or not all(c["lines"] for c in chapters):
        sys.exit("script.md: every chapter needs at least one narration line")
    if end and len(end["lines"]) != 1:
        sys.exit("script.md: ## end holds exactly one narration line")
    return meta, chapters, end, recap, facts


# ---------------------------------------------------------------- voice
def sha(*parts):
    return hashlib.sha1("\x1f".join(map(str, parts)).encode()).hexdigest()[:16]


def probe(path):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]).decode())


def tts(text, voice, speed, out_mp3, out_json, pronounce=()):
    """one MiniMax call: the line's audio, plus its word timestamps and the text as it was read.
    pronounce: MiniMax pronunciation entries such as "攒竹/(cuan2)(zhu2)" for polyphones and terms"""
    key = os.environ.get("MINIMAX_API_KEY") or sys.exit("MINIMAX_API_KEY is not set")
    base = os.environ.get("MINIMAX_BASE_URL", "https://api.minimax.io")
    body = {"model": MODEL, "text": text, "stream": False, "subtitle_enable": True, "subtitle_type": "word",
            "voice_setting": {"voice_id": voice, "speed": speed, "vol": 1, "pitch": 0},
            "audio_setting": {"sample_rate": 44100, "bitrate": 128000, "format": "mp3", "channel": 1}}
    if pronounce:
        body["pronunciation_dict"] = {"tone": list(pronounce)}
    req = urllib.request.Request(base + "/v1/t2a_v2", data=json.dumps(body).encode(),
                                 headers={"Authorization": "Bearer " + key, "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as response:
        r = json.load(response)
    if r.get("base_resp", {}).get("status_code") not in (0, None):
        sys.exit(f"TTS failed for 「{text}」: {r.get('base_resp')}")
    url = r["data"].get("subtitle_file")
    if not url:
        sys.exit(f"MiniMax returned no word timestamps for 「{text}」 (subtitle_file missing)")
    with urllib.request.urlopen(url, timeout=60) as response:
        subs = json.load(response)
    for path, data in ((out_json, json.dumps(subs, ensure_ascii=False).encode()), (out_mp3, bytes.fromhex(r["data"]["audio"]))):
        with open(path + ".part", "wb") as cache:
            cache.write(data)
        os.replace(path + ".part", path)


def assemble(files, gaps, out_wav):
    silence = lambda d: f"anullsrc=r=48000:cl=mono:d={d}"
    inputs = ["-f", "lavfi", "-t", str(LEAD), "-i", silence(LEAD)]
    for f, g in zip(files, gaps):
        inputs += ["-i", f, "-f", "lavfi", "-t", str(g), "-i", silence(g)]
    count = 1 + 2 * len(files)
    filt = "".join(f"[{j}:a]aresample=48000,aformat=channel_layouts=mono[a{j}];" for j in range(count))
    filt += "".join(f"[a{j}]" for j in range(count)) + f"concat=n={count}:v=0:a=1[out]"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *inputs, "-filter_complex", filt, "-map", "[out]",
                    "-ar", "48000", "-ac", "1", out_wav], check=True)


def normalize(wav):
    """even out the narration before it becomes the film's clock: a true-peak-safe limiter, then two-pass loudnorm to
    -18 LUFS / -3 dBTP, so the final -16 LUFS delivery never has to fight speech peaks (timing is unchanged)"""
    pre = "alimiter=limit=0.5:level=false:latency=1"
    out = subprocess.run(["ffmpeg", "-hide_banner", "-i", wav, "-af", pre + ",loudnorm=I=-18:TP=-3:LRA=11:print_format=json",
                          "-f", "null", "-"], capture_output=True, text=True).stderr
    m = json.loads(out[out.rindex("{"): out.rindex("}") + 1])
    tmp = wav[:-4] + ".norm.wav"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-af",
                    pre + ",loudnorm=I=-18:TP=-3:LRA=11:linear=true:"
                    f"measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:"
                    f"measured_thresh={m['input_thresh']}:offset={m['target_offset']}",
                    "-ar", "48000", "-ac", "1", tmp], check=True)
    os.replace(tmp, wav)


# ---------------------------------------------------------------- word times
SPOKEN = re.compile(r"[A-Za-z\d一-鿿]")


def units_of(text):
    """the speakable units of a text: CJK characters, Latin words, numbers"""
    return [u.lower() for u in UNIT.findall(text) if SPOKEN.match(u)]


def words_from_engine(raw, subs, offset):
    """script units → times from the voice engine's word timestamps (character offsets into the line's text).
    A unit covered by several engine words takes the first; units that share one engine span (「0.5 MB」 read as
    「零点五兆字节」) spread over it in order."""
    tw = []
    for seg in subs:
        base = seg.get("text_begin", 0) or 0
        for w in seg.get("timestamped_words", []):
            b, e = w["word_begin"], w["word_end"]
            if base and b < base:
                b, e = b + base, e + base
            tw.append((b, e, w["time_begin"] / 1000.0))
    text = shown(raw)
    to_raw, k = [], 0                       # display index → raw index (the engine counts the markers too)
    for m in PAUSE.finditer(raw):
        to_raw += list(range(k, m.start())); k = m.end()
    to_raw += list(range(k, len(raw) + 1))
    spans = [(m.group(0), to_raw[m.start()], to_raw[m.end() - 1] + 1) for m in UNIT.finditer(text)]
    hits = [[k for k, (b, e, _) in enumerate(tw) if b < end and e > start] for _, start, end in spans]
    groups = {}
    for i, h in enumerate(hits):
        if h:
            groups.setdefault((h[0], h[-1]), []).append(i)
    times = [None] * len(spans)
    for (k0, k1), members in groups.items():
        m = k1 - k0 + 1
        for j, i in enumerate(members):
            times[i] = tw[min(k1, k0 + int(round(j * m / len(members))))][2]
    words, last = [], 0.0
    for (u, _, _), t in zip(spans, times):
        t = last if t is None else max(t, last)
        words.append([u, round(offset + t, 3)])
        last = t
    return words


def pauses(wav, frame=0.01, min_gap=0.12, below=60):
    """silent stretches [(gap_start, gap_end)] of a narration, from a plain energy envelope (stdlib only)"""
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", wav, "-f", "s16le", "-ac", "1", "-ar", "16000", "-"],
                         check=True, capture_output=True).stdout
    pcm = array.array("h"); pcm.frombytes(raw[: len(raw) // 2 * 2])
    if sys.byteorder == "big":
        pcm.byteswap()
    step = int(16000 * frame)
    db = []
    for k in range(0, len(pcm) - step + 1, step):
        seg = pcm[k:k + step]
        db.append(10 * math.log10(sum(x * x for x in seg) / step + 1e-9))
    lv = sorted(db) or [0.0]
    thr = max(lv[int(len(lv) * 0.05)] + 8, lv[int(len(lv) * 0.95)] - below)   # `below` dB under the loud end, above the noise floor
    speech = [d > thr for d in db]
    gaps, k = [], 0
    while k < len(speech):
        if speech[k]:
            k += 1; continue
        j = k
        while j < len(speech) and not speech[j]:
            j += 1
        if (j - k) * frame >= min_gap or k == 0 or j == len(speech):
            gaps.append((k * frame, j * frame))
        k = j
    return gaps


def place_lines(texts, gaps, total):
    """find each line in one long narration from its pauses alone: pick the pauses that make every line's length
    closest to its share of the speaking weight (dynamic programming; longer pauses are preferred as line breaks)"""
    n = len(texts)
    s0 = gaps[0][1] if gaps and gaps[0][0] <= 0.01 else 0.0
    s1 = gaps[-1][0] if gaps and gaps[-1][1] >= total - 0.01 else total
    inner = [(g0, g1) for g0, g1 in gaps if s0 < g0 and g1 < s1]
    w = [line_weight(t) + 0.2 for t in texts]
    span = s1 - s0
    want = [x / sum(w) * span for x in w]
    if n == 1 or len(inner) < n - 1:
        acc, out = s0, []
        for x in want:
            out.append((acc, acc + x)); acc += x
        return out, False
    INF = float("inf")
    m = len(inner)
    # cost[i][j]: best cost with line i ending at pause j (line n-1 ends at the speech end)
    cost = lambda dur, i: ((dur - want[i]) / want[i]) ** 2          # relative: long and short lines weigh alike
    bonus = lambda j: 2.0 * min(inner[j][1] - inner[j][0], 0.8)      # a longer pause is more likely a line break
    best = [[INF] * m for _ in range(n - 1)]
    back = [[-1] * m for _ in range(n - 1)]
    for j in range(m):
        best[0][j] = cost(inner[j][0] - s0, 0) - bonus(j)
    for i in range(1, n - 1):
        for j in range(i, m):
            for k in range(i - 1, j):
                c = best[i - 1][k] + cost(inner[j][0] - inner[k][1], i) - bonus(j)
                if c < best[i][j]:
                    best[i][j], back[i][j] = c, k
    last_cost = [best[n - 2][j] + cost(s1 - inner[j][1], n - 1) for j in range(m)]
    j = min(range(m), key=lambda k: last_cost[k])
    picks = [j]
    for i in range(n - 2, 0, -1):
        j = back[i][j]; picks.append(j)
    picks.reverse()
    out, start = [], s0
    for j in picks:
        out.append((start, inner[j][0])); start = inner[j][1]
    out.append((start, s1))
    return out, True


DRY_PACE = 0.85   # calibrated on 18 voiced lines (MiniMax, speed 1.1): the raw weights ran ~15 % long


def weight(u):
    """rough speaking time of one unit at speed ≈ 1.1, used by --dry, --audio and the --check estimate"""
    if cjk(u[0]): w = 0.21
    elif re.match(r"[A-Za-z]", u): w = 0.12 + 0.045 * len(u)
    elif re.match(r"\d", u): w = 0.16 * len(re.sub(r"\D", "", u)) + 0.05
    else: w = 0.12 if u in "，、：；" else 0.0
    return w * DRY_PACE


def spread(L):
    """units spread over [start, end] by speaking weight (no audio analysis)"""
    units = UNIT.findall(L["text"])
    ws = [weight(u) for u in units]
    total = sum(ws) or 1.0
    t, words = L["start"], []
    for u, x in zip(units, ws):
        words.append([u, round(t, 3)]); t += (L["end"] - L["start"]) * x / total
    return words


def dry_line(L):
    units = UNIT.findall(L["text"])
    ws, t, words = [weight(u) for u in units], L["start"], []
    for u, w in zip(units, ws):
        words.append([u, round(t, 3)]); t += w
    return words


# ---------------------------------------------------------------- build
def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("topic", help="story folder holding script.md (story.json and audio/ are written next to it)")
    ap.add_argument("--dry", action="store_true", help="silent draft with estimated times (no API)")
    ap.add_argument("--check", action="store_true", help="parse script.md and print the plan and the estimated length")
    ap.add_argument("--audio", help="use a narration you voiced or recorded yourself (audio or video file) instead of voicing the script")
    a = ap.parse_args()
    D = os.path.abspath(a.topic)
    meta, chapters, end, recap, facts = parse(os.path.join(D, "script.md"))
    voice, speed = meta.get("voice", VOICE), float(meta.get("speed", SPEED))
    # pronounce: 攒竹/(cuan2)(zhu2); 太阳/(tai4)(yang2)   — polyphones and terms, MiniMax pronunciation_dict format
    pronounce = tuple(x.strip() for x in re.split(r"[;；]", meta.get("pronounce", "")) if x.strip())
    texts, owner = [], []          # every narration line in order, and its chapter index (None for the end line)
    for ci, c in enumerate(chapters):
        for s in c["lines"]: texts.append(s); owner.append(ci)
    if end: texts.append(end["lines"][0]); owner.append(None)
    n = len(texts)
    gaps = [TAIL if i == n - 1 else (LONG if owner[i] != owner[i + 1] else SHORT) for i in range(n)]
    print(f"{meta.get('title', os.path.basename(D))}: {len(chapters)} chapters, {n - (1 if end else 0)} lines" + (" + the end line" if end else ""))
    for i, (s, o) in enumerate(zip(texts, owner)):
        print(f"  {i + 1:>2} [{chapters[o]['key'] if o is not None else 'end'}] {s}")
    est = LEAD + sum(line_weight(s) + 0.2 + g for s, g in zip(texts, gaps))
    rlen = float(recap["fields"].get("length", RECAP)) if recap else 0.0
    print(f"  estimated length ≈ {est:.0f} s narration" + (f" + {rlen:g} s recap = {est + rlen:.0f} s" if recap else "")
          + "  (预计时长，实际以配音为准)")
    if a.check:
        return
    if not a.dry:
        if not a.audio and not os.environ.get("MINIMAX_API_KEY"):
            sys.exit("voicing needs MINIMAX_API_KEY — or voice the script yourself and pass --audio, or use --dry\n"
                     "配音需要 MINIMAX_API_KEY；也可以自己配好音后用 --audio，或先用 --dry 出无声草稿")
        # a real run replaces any --dry draft: never leave a stale draft story.json next to real audio
        old = os.path.join(D, "story.json")
        if os.path.exists(old) and json.load(open(old)).get("draft"):
            os.remove(old)

    os.makedirs(os.path.join(D, "audio", "tts"), exist_ok=True)
    lines, t, timing = [], LEAD, "engine"
    if a.audio:
        src = os.path.abspath(a.audio)
        narr_wav = os.path.join(D, "audio", "narration.wav")
        if os.path.abspath(narr_wav) != src:
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-vn", "-ar", "48000", "-ac", "1", narr_wav], check=True)
            normalize(narr_wav)
        total = probe(narr_wav)
        bounds, found = place_lines(texts, pauses(narr_wav, min_gap=0.06, below=45), total)
        if not found:
            print("  ! the recording has too few pauses to find every line — lines were spread by length; "
                  "leave a short pause between sentences for exact placement", file=sys.stderr)
        for i, (s, (b0, b1)) in enumerate(zip(texts, bounds)):
            L = {"i": i + 1, "text": shown(s), "start": round(b0, 3), "end": round(b1, 3)}
            L["words"] = spread(L)
            lines.append(L)
        t, timing = total, "estimated"
        print("  word times are estimated from the recording's pauses (≈0.15 s); voice with MiniMax for exact ones")
    elif a.dry:
        for i, s in enumerate(texts):
            dur = line_weight(s) + 0.2
            lines.append({"i": i + 1, "text": shown(s), "start": round(t, 3), "end": round(t + dur, 3)})
            t += dur + gaps[i]
        for L in lines:
            L["words"] = dry_line(L)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-t", f"{t:.3f}", "-i",
                        "anullsrc=r=48000:cl=mono", os.path.join(D, "audio", "narration.wav")], check=True)
        timing = "draft"
    else:
        files, durs, subs = [], [], []
        for i, s in enumerate(texts):
            used = tuple(e for e in pronounce if e.split("/")[0] in s)   # only the entries this line needs
            stem = os.path.join(D, "audio", "tts", sha(MODEL, voice, speed, "words", s, *used))
            if not (os.path.exists(stem + ".mp3") and os.path.exists(stem + ".json")):
                print(f"  voice {i + 1}: {shown(s)}")
                tts(s, voice, speed, stem + ".mp3", stem + ".json", used)
            files.append(stem + ".mp3"); durs.append(round(probe(stem + ".mp3"), 3))
            subs.append(json.load(open(stem + ".json", encoding="utf-8")))
        assemble(files, gaps, os.path.join(D, "audio", "narration.wav"))
        normalize(os.path.join(D, "audio", "narration.wav"))
        for i, s in enumerate(texts):
            L = {"i": i + 1, "text": shown(s), "start": round(t, 3), "end": round(t + durs[i], 3)}
            if s != L["text"]:
                L["say"] = s                 # what was sent to the voice, pause markers included
            L["words"] = words_from_engine(s, subs[i], t)
            lines.append(L)
            t += durs[i] + gaps[i]
        with open(os.path.join(D, "audio", "pronounce.txt"), "w", encoding="utf-8") as f:   # how the engine read each line
            for L, sb in zip(lines, subs):
                read = "".join(seg.get("pronounce_text", "") for seg in sb)
                f.write(f"{L['i']:>2} script:  {L['text']}\n   read as: {read}\n")
        odd = [L["i"] for L in lines if re.search(r"[A-Za-z\d]", L["text"])]
        if odd:
            print(f"  check how numbers / Latin were read in lines {odd}: audio/pronounce.txt")
    narr = round(t, 3)
    for L, o in zip(lines, owner):
        L["chapter"] = chapters[o]["key"] if o is not None else "end"

    def first_start(ci):
        return next(L["start"] for L, o in zip(lines, owner) if o == ci)
    chap = []
    for ci, c in enumerate(chapters):
        s = 0.0 if ci == 0 else round(first_start(ci) - CHAPTER_PAD, 1)
        chap.append({"n": ci + 1, "key": c["key"], "title": c["title"] or c["key"], "start": s})
    for ci, c in enumerate(chap):
        nxt = chap[ci + 1]["start"] if ci + 1 < len(chap) else (round(lines[-1]["start"] - CHAPTER_PAD, 1) if end else round(narr, 1))
        c["end"] = nxt
    story = {"title": meta.get("title", os.path.basename(D)), "subtitle": meta.get("subtitle", ""),
             "duration": round(narr, 1), "narration": "audio/narration.wav",
             "voice": f"MiniMax {MODEL} · {voice} · speed {speed:g}", "timing": timing, "lines": lines, "chapters": chap}
    if a.audio:
        story["voice"] = f"external narration: {os.path.basename(a.audio)}"
    if a.dry:
        story["draft"] = True
        story["voice"] = "draft: estimated times, silent narration (run without --dry to voice it)"
    if end:
        emph = [x.strip() for x in re.split(r"[/、]", end["fields"].get("emphasis", "")) if x.strip()]
        story["end"] = {"line": n, "start": round(lines[-1]["start"], 1), "emphasis": emph}
    if recap:
        rs = round(narr, 1)
        re_ = round(rs + float(recap["fields"].get("length", RECAP)), 1)
        story["recap"] = {"start": rs, "end": re_, "center": recap["fields"].get("center", story["title"]),
                          "tagline": recap["fields"].get("tagline", story["subtitle"]),
                          "points": [{"n": k + 1, **p} for k, p in enumerate(recap["points"])]}
        story["duration"] = re_
    if facts:
        story["facts"] = facts.get("json") or facts["fields"]
    notes = {c["key"]: c["notes"] for c in chapters if c["notes"]}
    if notes:
        story["notes"] = notes
    json.dump(story, open(os.path.join(D, "story.json"), "w"), ensure_ascii=False, indent=1)
    print(f"story.json: {story['duration']} s (narration {narr} s){' — DRAFT' if a.dry else ''}")
    for c in chap:
        print(f"  ch{c['n']} {c['start']:>5}–{c['end']:<5} {c['title']}")
    for L in lines:
        print(f"  {L['i']:>2} {L['start']:>6}–{L['end']:<6} " + " ".join(f"{u}@{w:.2f}" for u, w in L["words"] if UNIT.match(u) and re.match(r"[A-Za-z\d一-鿿]", u))[:150])


if __name__ == "__main__":
    main()
