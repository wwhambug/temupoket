"""Read original PNGs and generate vector clipping paths for residual checkerboard.
Original bitmaps are never modified. Flood-fill excludes only border-connected
transparent or pale neutral pixels, preserving enclosed eyes/teeth/highlights.
"""
from PIL import Image
from pathlib import Path
from collections import deque
import json
root=Path(__file__).resolve().parents[1]
clips={}
for p in list((root/'assets/enemies').glob('*.png'))+list((root/'assets/players').glob('*.png')):
 im=Image.open(p).convert('RGBA');w,h=im.size
 # Vector silhouette sampled at 320 px; aligned to the original pixel grid.
 thumb=im.resize((320,round(320*h/w)),Image.Resampling.NEAREST);tw,th=thumb.size;pix=thumb.load()
 def background(x,y):
  r,g,b,a=pix[x,y];return a<30 or (min(r,g,b)>205 and max(r,g,b)-min(r,g,b)<12)
 outside=set();q=deque()
 for x in range(tw):
  for y in [0,th-1]:
   if background(x,y):outside.add((x,y));q.append((x,y))
 for y in range(th):
  for x in [0,tw-1]:
   if background(x,y) and (x,y) not in outside:outside.add((x,y));q.append((x,y))
 while q:
  x,y=q.popleft()
  for nx,ny in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)]:
   if 0<=nx<tw and 0<=ny<th and (nx,ny) not in outside and background(nx,ny):outside.add((nx,ny));q.append((nx,ny))
 rows=[]
 for y in range(th):
  x=0
  while x<tw:
   if (x,y) in outside:x+=1;continue
   start=x
   while x<tw and (x,y) not in outside:x+=1
   rows.append(f'M{start/tw:.5f},{y/th:.5f}h{(x-start)/tw:.5f}v{1/th:.5f}h{-(x-start)/tw:.5f}z')
 clips[p.stem]=''.join(rows)
(root/'js/sprite-clips.js').write_text("'use strict';\nTP.spriteClips = "+json.dumps(clips)+";\n")
print('Vector clips generated for',len(clips),'original sprites')
