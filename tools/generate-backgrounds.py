from PIL import Image, ImageDraw
import random
from pathlib import Path
out=Path(__file__).resolve().parents[1]/'assets/bg'
out.mkdir(parents=True,exist_ok=True)
for mode in ['grass','forest','cave','volcano','strange-dimension']:
 r=random.Random(81); im=Image.new('RGB',(480,270));d=ImageDraw.Draw(im)
 palettes={'grass':('#8bb9bd','#5b9596','#57724c','#6c8551','#8f9c61'),'forest':('#3e6571','#2c5152','#263e36','#3c6143','#587149'),'cave':('#293047','#353b55','#3a3d50','#4a4c61','#60607a'),'volcano':('#5b3546','#743e44','#49373d','#5b4243','#785448'),'strange-dimension':('#282940','#383455','#3c354d','#4e4563','#635979')}
 sky,hill,ground,patch,light=palettes[mode]
 d.rectangle((0,0,480,145),fill=sky)
 for y in range(0,142,6):
  if y%18==0:d.rectangle((0,y,480,y+2),fill=hill)
 if mode in ['grass','forest']:
  d.rectangle((0,130,480,270),fill=ground)
  for x in range(-20,500,45):
   h=r.randint(35,80); d.polygon([(x,145),(x+15,100-h),(x+45,145)],fill=hill)
  for x in range(-20,500,32):
   h=r.randint(25,50) if mode=='grass' else r.randint(70,120)
   d.rectangle((x+12,140-h,x+18,160),fill='#394c3d');d.polygon([(x-7,146-h),(x+15,102-h),(x+36,146-h)],fill='#345844');d.polygon([(x-4,128-h),(x+15,92-h),(x+32,128-h)],fill='#41694b')
  if mode=='grass':
   d.rectangle((0,73,480,78),fill='#b3cebb');d.rectangle((50,45,115,50),fill='#b3cebb');d.rectangle((270,32,335,38),fill='#b3cebb')
 elif mode=='cave':
  d.rectangle((0,130,480,270),fill=ground)
  for x in range(0,500,32):
   h=r.randint(25,90);d.polygon([(x,0),(x+20,0),(x+12,h)],fill=hill)
  for x in [18,85,390,447]:
   d.polygon([(x,180),(x+7,110),(x+22,135),(x+27,180)],fill='#668599');d.line((x+7,115,x+12,175),fill='#94b4b3',width=3)
 elif mode=='volcano':
  d.polygon([(10,150),(120,35),(144,35),(248,155)],fill='#3e3442');d.polygon([(115,40),(132,65),(149,40)],fill='#e79759');d.rectangle((0,145,480,270),fill=ground)
  d.polygon([(0,210),(100,200),(155,220),(260,208),(355,240),(480,232),(480,247),(340,254),(245,224),(152,237),(90,215),(0,225)],fill='#be6447')
  for i in range(30):
   x=r.randrange(480);y=r.randrange(160);d.rectangle((x,y,x+2,y+2),fill='#eea365')
 else:
  d.rectangle((0,145,480,270),fill=ground)
  for i in range(65):
   x=r.randrange(480);y=r.randrange(140);d.rectangle((x,y,x+1,y+1),fill='#afa2b0')
  for x,y in [(40,100),(300,50),(415,110)]:d.polygon([(x,y),(x+40,y-10),(x+65,y),(x+50,y+14),(x+15,y+14)],fill=hill)
  d.ellipse((160,18,240,95),outline='#877591',width=3);d.ellipse((169,25,233,89),outline='#655875',width=2)
 for i in range(250):
  x=r.randrange(480);y=r.randrange(152,270);d.rectangle((x,y,x+r.randrange(2,8),y+1),fill=patch)
 # Terraced battle platforms, embedded in the landscape.
 for box in [(275,137,433,167),(18,212,222,252)]:
  d.ellipse(box,fill=hill);d.ellipse((box[0]+5,box[1]+2,box[2]-5,box[3]-5),fill=patch);d.arc((box[0]+10,box[1]+4,box[2]-10,box[3]-6),0,160,fill=light,width=2)
 im.resize((960,540),Image.Resampling.NEAREST).save(out/(mode+'.png'))
print('Generated five 960×540 pixel backgrounds.')
