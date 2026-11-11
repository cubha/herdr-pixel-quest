"""Rest effects for agents that aren't working, in the battle slot (12x12 dots, 2x = 24px):
a campfire (idle: a second flame frame fades over the first, embers rise) and a reward chest
(done: the open chest fades over the shut one, a glint over the open lid) and a
"!" bubble (blocked: it bobs).

    python3 art-src/gen_rest.py mods/pixel-quest/art

Copyright (c) 2026 cubha. MIT License.
"""
import os, sys
from PIL import Image
OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
def hx(c): c=c.lstrip('#'); return tuple(int(c[i:i+2],16) for i in (0,2,4))+(255,)
def sprite(rows,pal,name):
    w=len(rows[0]); assert all(len(r)==w for r in rows),name
    im=Image.new('RGBA',(w,len(rows)),(0,0,0,0))
    for y,r in enumerate(rows):
        for x,ch in enumerate(r):
            if ch!='.': im.putpixel((x,y),hx(pal[ch]))
    im.resize((w*2,len(rows)*2),Image.NEAREST).save(os.path.join(OUT,name+'.png')); return im
FIRE={'k':'#05060c','W':'#fffbe8','Y':'#fff0a0','y':'#f6c840','o':'#f08a2a','r':'#d8422a',
      'b':'#9a5a2a','B':'#5a3418','s':'#9aa0b8','d':'#5a6080'}
BASE=['.Bbk.rr.kbB.',
      '..BbkookbB..',
      '...BbBBbB...',
      '..bBkddkBb..',
      'sdbBsdsdBbds']
sprite(['.....y......',
        '.....yy..y..',
        '....yYy.....',
        '...ryYYyr...',
        '..rryWWYyr..',
        '..royWWYor..',
        '.rooyWWyoor.']+BASE,FIRE,'camp-a')
sprite(['......y.....',
        '..y..yy.....',
        '.....yYy....',
        '...ryYYyr...',
        '..ryYWWyrr..',
        '..roYWWyor..',
        '.rooyWWyoor.']+BASE,FIRE,'camp-b')
sprite(['Y'],FIRE,'ember')
CH={'k':'#05060c','b':'#a0642c','B':'#6a3c18','G':'#f6d870','g':'#b8862e','Y':'#fff4c8','W':'#ffffff','y':'#f6c840','d':'#3a2410'}
sprite(['............',
        '............',
        '............',
        '.kkkkkkkkkk.',
        'kBbbbbbbbbBk',
        'kbbbbGGbbbbk',
        'kkkkkGGkkkkk',
        'kbbbbgYbbbbk',
        'kbbbbGGbbbbk',
        'kBbbbbbbbbBk',
        'kBBBBBBBBBBk',
        '.kkkkkkkkkk.'],CH,'chest-shut')
sprite(['..kkkkkkkk..',
        '.kBddddddBk.',
        '.kbbbGGbbbk.',
        'kkkkkkkkkkkk',
        'kWYyGYyGyYWk',
        'kYyGYWyGYyGk',
        'kkkkkkkkkkkk',
        'kbbbbgYbbbbk',
        'kbbbbGGbbbbk',
        'kBbbbbbbbbBk',
        'kBBBBBBBBBBk',
        '.kkkkkkkkkk.'],CH,'chest-open')
print('rest ok')
# Needs you (blocked): a "!" bubble that bobs.
CALL={'k':'#05060c','W':'#fffbe8','w':'#d8d4e8','R':'#e0402e','r':'#9a2418','G':'#f6d870','g':'#b8862e','b':'#a0642c','B':'#6a3c18','P':'#efe0b8','p':'#c8b088'}
sprite(['.kkkkkkkkk..',
        'kWWWWWWWWWk.',
        'kWWWWRRWWWk.',
        'kWWWWRRWWWk.',
        'kWWWWRRWWWk.',
        'kWWWWRRWWWk.',
        'kWWWWWWWWWk.',
        'kWWWWRRWWWk.',
        'kwWWWRRWWwk.',
        '.kkwkkkkkk..',
        '..kwk.......',
        '..kk........'],CALL,'call-bubble')
