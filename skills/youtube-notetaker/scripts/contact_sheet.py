#!/usr/bin/env python3
"""Build a labeled contact sheet of candidate slide frames for human curation.

Usage: contact_sheet.py <video.mp4> <scene_times.txt> <out.jpg> [--cols 5] [--thumb 360]

Reads timestamps (seconds, one per line), grabs a frame at each, lays them out in a
grid labeled "<index> | <mm:ss>". Read the output image, then write the timestamps you
want to KEEP (real content slides, not talking-head/transition frames) to a keep.txt,
one per line. The index labels make it easy to call out which to drop.
"""
import subprocess, sys, tempfile, os, argparse
from PIL import Image, ImageDraw, ImageFont

def grab(video, t, path, w=360):
    subprocess.run(["ffmpeg","-hide_banner","-loglevel","error","-ss",str(t),
                    "-i",video,"-frames:v","1","-vf",f"scale={w}:-1","-y",path], check=True)

def mmss(t):
    t=int(float(t)); return f"{t//60:02d}:{t%60:02d}"

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("video"); ap.add_argument("times"); ap.add_argument("out")
    ap.add_argument("--cols",type=int,default=5); ap.add_argument("--thumb",type=int,default=360)
    a=ap.parse_args()
    times=[l.strip() for l in open(a.times) if l.strip()]
    if not times: sys.exit("no timestamps")
    tmp=tempfile.mkdtemp()
    thumbs=[]
    for i,t in enumerate(times):
        p=os.path.join(tmp,f"f{i:03d}.jpg")
        try:
            grab(a.video,t,p,a.thumb); thumbs.append((i,t,p))
        except subprocess.CalledProcessError:
            pass
    if not thumbs: sys.exit("could not grab any frames")
    tw=a.thumb; th=int(tw*9/16); lab=22; pad=6
    cols=a.cols; rows=(len(thumbs)+cols-1)//cols
    cw=tw+pad*2; ch=th+lab+pad*2
    sheet=Image.new("RGB",(cols*cw,rows*ch),(20,20,20))
    d=ImageDraw.Draw(sheet)
    try: font=ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf",15)
    except Exception: font=ImageFont.load_default()
    for n,(idx,t,p) in enumerate(thumbs):
        r,c=divmod(n,cols); x=c*cw+pad; y=r*ch+pad
        im=Image.open(p).convert("RGB").resize((tw,th))
        sheet.paste(im,(x,y+lab))
        d.text((x+2,y+2),f"{idx} | {mmss(t)}  ({float(t):.1f}s)",fill=(255,210,90),font=font)
    sheet.save(a.out,quality=85)
    print(f"contact sheet: {a.out}  ({len(thumbs)} frames, {cols}x{rows})")
    print("Read it, then write the timestamps (seconds) to keep -> keep.txt (one per line).")

if __name__=="__main__": main()
