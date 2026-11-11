"""Battle effect for working agents: two swords that meet and a spark (8x8 dots, 2x = 16px).

    python3 art-src/gen_battle.py mods/pixel-quest/art

Copyright (c) 2026 cubha. MIT License.
"""
import os, sys
from PIL import Image
OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
INK='#05060c'
def hx(c): c=c.lstrip('#'); return tuple(int(c[i:i+2],16) for i in (0,2,4))+(255,)
def sprite(rows,pal,name):
    w=len(rows[0]); assert all(len(r)==w for r in rows),name
    im=Image.new('RGBA',(w,len(rows)),(0,0,0,0))
    for y,r in enumerate(rows):
        for x,ch in enumerate(r):
            if ch!='.': im.putpixel((x,y),hx(pal[ch]))
    im.resize((w*2,len(rows)*2),Image.NEAREST).save(os.path.join(OUT,name+'.png')); return im
STEEL={'o':INK,'W':'#ffffff','s':'#c8d0e0','d':'#6a7090','g':'#d49a3a','G':'#f6d870','b':'#5a3418'}
# sword pointing up-right (blade to the top right), 8x8
SW=['......oo',
    '.....oWo',
    '....oWso',
    '.o.oWso.',
    '.ooWso..',
    '..oGo...',
    '.oboo...',
    'oboo....']
sprite(SW,STEEL,'sword-r')
sprite([r[::-1] for r in SW],STEEL,'sword-l')
SP={'W':'#ffffff','Y':'#fff4c8','y':'#f6d870','o':'#e0782e'}
sprite(['...W....','...Y....','.y.Y.y..','..YWY...','WYWWWYW.','..YWY...','.y.Y.y..','...Y....'],SP,'spark')
print('battle ok')
