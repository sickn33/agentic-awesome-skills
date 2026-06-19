#!/usr/bin/env python3
"""Extract curated slide frames at full quality and install them into the library _media dir.

Usage: extract_slides.py <YTID> <video.mp4> <keep.txt>

keep.txt: one timestamp (seconds) per line, the frames you chose from the contact sheet.
Frames are extracted at 1280px wide, JPEG, numbered in time order, and copied to
  $VIDEO_LIBRARY_DIR/_media/<YTID>-slide-NN.jpg   (default ~/video-deepdives/_media)

Prints a slides scaffold (idx,t,mmss,img) you can paste into slides.json and then fill
in title + note for each. idx here is just the sequence number; ordering is by time.

The img URL is served by serve.py at /api/video-deepdives/_media/<file>.
"""
import subprocess, sys, os, json

LIB = os.path.expanduser(os.environ.get("VIDEO_LIBRARY_DIR", "~/video-deepdives"))
MEDIA = os.path.join(LIB, "_media")
IMG_PREFIX = "/api/video-deepdives/_media"  # served by serve.py

def mmss(t):
    t=int(round(float(t))); return f"{t//60:02d}:{t%60:02d}"

def main():
    if len(sys.argv)!=4: sys.exit("usage: extract_slides.py <YTID> <video.mp4> <keep.txt>")
    ytid,video,keep=sys.argv[1],sys.argv[2],sys.argv[3]
    times=sorted({float(l.strip()) for l in open(keep) if l.strip()})
    if not times: sys.exit("keep.txt is empty")
    os.makedirs(MEDIA,exist_ok=True)
    scaffold=[]
    for i,t in enumerate(times,1):
        fn=f"{ytid}-slide-{i:02d}.jpg"
        out=os.path.join(MEDIA,fn)
        subprocess.run(["ffmpeg","-hide_banner","-loglevel","error","-ss",f"{t}",
                        "-i",video,"-frames:v","1","-vf","scale=1280:-1","-q:v","3","-y",out],check=True)
        scaffold.append({"idx":i,"t":round(t,1),"mmss":mmss(t),"title":"","note":"",
                         "img":f"{IMG_PREFIX}/{fn}"})
        print(f"  wrote {fn}  @ {mmss(t)}",file=sys.stderr)
    print(f"\nInstalled {len(scaffold)} slides to {MEDIA}",file=sys.stderr)
    print("--- slides.json scaffold on stdout; redirect to a file, then fill in title + note ---",file=sys.stderr)
    print(json.dumps(scaffold,indent=2))

if __name__=="__main__": main()
