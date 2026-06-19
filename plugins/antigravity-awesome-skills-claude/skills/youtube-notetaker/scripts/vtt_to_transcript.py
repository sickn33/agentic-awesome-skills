#!/usr/bin/env python3
"""Convert a YouTube .vtt (manual or auto-captions) into clean [HH:MM:SS] transcript lines.

Usage: vtt_to_transcript.py <input.vtt> <output.txt>

Handles the rolling-duplicate problem in auto-captions: each cue repeats the tail of the
previous cue, so we keep only newly-added words per cue and emit one line per cue start
time. Strips inline <00:00:00.000> word-timing tags and HTML tags.
"""
import sys, re, html

TS=re.compile(r'(\d{2}):(\d{2}):(\d{2})\.\d{3}\s*-->\s*(\d{2}):(\d{2}):(\d{2})')
INLINE=re.compile(r'<[^>]+>')

def hhmmss(h,m,s): return f"[{int(h):02d}:{int(m):02d}:{int(s):02d}]"

def clean(text):
    text=INLINE.sub('',text)
    text=html.unescape(text)
    return re.sub(r'\s+',' ',text).strip()

def main():
    if len(sys.argv)!=3: sys.exit("usage: vtt_to_transcript.py <in.vtt> <out.txt>")
    raw=open(sys.argv[1],encoding='utf-8',errors='replace').read().splitlines()
    cues=[]  # (start_label, text)
    i=0; cur=None
    while i<len(raw):
        m=TS.search(raw[i])
        if m:
            if cur: cues.append(cur)
            cur=[hhmmss(*m.groups()[:3]),[]]
            i+=1
            while i<len(raw) and not TS.search(raw[i]) and raw[i].strip()!='':
                if raw[i].strip() and not raw[i].strip().isdigit():
                    cur[1].append(clean(raw[i]))
                i+=1
        else:
            i+=1
    if cur: cues.append(cur)

    # De-duplicate rolling captions: keep only the suffix not already seen.
    out=[]; seen_words=[]
    for label,parts in cues:
        text=clean(' '.join(parts))
        if not text: continue
        words=text.split()
        # find longest overlap of seen tail with this cue's head
        overlap=0; maxk=min(len(words),len(seen_words))
        for k in range(maxk,0,-1):
            if seen_words[-k:]==words[:k]: overlap=k; break
        new=words[overlap:]
        if new:
            out.append(f"{label} {' '.join(new)}")
        seen_words=(seen_words+new)[-40:]  # bounded window
    with open(sys.argv[2],'w',encoding='utf-8') as f:
        f.write('\n'.join(out)+'\n')
    print(f"wrote {len(out)} transcript lines -> {sys.argv[2]}")

if __name__=="__main__": main()
