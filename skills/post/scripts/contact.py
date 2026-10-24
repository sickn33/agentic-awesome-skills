#!/usr/bin/env python3
"""Contact sheet of rendered frames, in order, for review.
usage: contact.py out.jpg frame1.png frame2.png ... [--cols 3] [--scale 0.28]"""
import sys
from PIL import Image
args=sys.argv[1:]; cols=3; scale=0.28
if '--cols' in args: i=args.index('--cols'); cols=int(args[i+1]); del args[i:i+2]
if '--scale' in args: i=args.index('--scale'); scale=float(args[i+1]); del args[i:i+2]
out, files = args[0], args[1:]
ims=[Image.open(f).convert('RGB') for f in files]
w,h=ims[0].size; g=20; rows=(len(ims)+cols-1)//cols
s=Image.new('RGB',(cols*(w+g)+g, rows*(h+g)+g),'#555')
for k,im in enumerate(ims): s.paste(im,(g+(k%cols)*(w+g), g+(k//cols)*(h+g)))
s.resize((int(s.width*scale),int(s.height*scale))).save(out,quality=88)
print(out)
