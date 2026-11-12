"""Pixel Quest stage 2 art: the twelve pets (three growth stages, up and
crouched, facing left and right), the gold coin, the seventeen medals, the
"!" and "Z" marks and the low battery. 2x pixels like the portraits.

    python3 art-src/gen_pets.py mods/pixel-quest/art

Pets: pet-<key>-<stage>-<a|s>[-r].png. a = up (awake, walking), s = crouched
(asleep, drained), -r = facing right. Stage 1 is 12x10 art px, stage 2 14x12,
stage 3 16x14. Stage 1 crouches are drawn by hand; the grown ones come from the
grown up picture: eyes shut (the lowest eye row becomes a line, the others body)
and the body pressed down a few rows. From the confirmed mockup
(.claude/plan/next/stage2/confirmed/gen_stage2.py). Silhouettes for what is not
owned yet: pet-<key>-1-s-x.png and medal-lock.png (all black).

Copyright (c) 2026 cubha. MIT License.
"""
import os, sys
from PIL import Image, ImageDraw
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
INK = '#05060c'
def hx(c):
    c = c.lstrip('#'); return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4)) + (255,)
def image(rows, pal, name):
    w = max(len(r) for r in rows)
    im = Image.new('RGBA', (w, len(rows)), (0, 0, 0, 0))
    for y, r in enumerate(rows):
        assert len(r) == w, (name, y, len(r), w)
        for x, ch in enumerate(r):
            if ch != '.': im.putpixel((x, y), hx(pal[ch]))
    return im
def save(im, name, scale=2):
    im.resize((im.width * scale, im.height * scale), Image.NEAREST).save(os.path.join(OUT, name))
def sprite(rows, pal, name, scale=2):
    im = image(rows, pal, name); save(im, name, scale); return im

# ---- pets: 12x10 grid. a = awake, s = asleep. o ink, H light, S mid, d shadow, e eye, w white, x extra
PETS = {
 'slime': dict(pal={'H': '#d8fff0', 'S': '#3fc8a0', 'd': '#187858', 'e': INK, 'w': '#ffffff'},
  a=['............',
     '............',
     '....oooo....',
     '..ooHHSSoo..',
     '.oHHSSSSSSo.',
     '.oHSeSSeSSo.',
     'oHSSeSSeSSdo',
     'oSSSSSSSSSdo',
     'oSSSSSSSSddo',
     '.oooooooooo.'],
  s=['............',
     '............',
     '............',
     '............',
     '...oooooo...',
     '.ooHHSSSSoo.',
     'oHHSSSSSSSdo',
     'oSSooSSooSdo',
     'oSSSSSSSSddo',
     '.oooooooooo.']),
 'bat': dict(pal={'H': '#c8b0f0', 'S': '#7a52b8', 'd': '#3a2468', 'e': '#ffe08a', 'w': '#ffffff'},
  a=['............',
     '.o..o..o..o.',
     'oSo.oSSo.oSo',
     'oSSooSSooSSo',
     'oSSSoHSoSSSo',
     'oSdSSeSeSdSo',
     'odoSSSSSSodo',
     'o..oSwwSo..o',
     '....oSSo....',
     '.....oo.....'],
  s=['............',
     '............',
     '....o..o....',
     '...oSooSo...',
     '..ooHSSSoo..',
     '.oSoSSSSoSo.',
     '.oSdooooSSo.',
     '.oSddSSddSo.',
     '..oodSSdoo..',
     '....oooo....']),
 'cat': dict(pal={'H': '#fff0d0', 'S': '#e8a850', 'd': '#a05a20', 'e': '#3fc86a', 'w': '#ffffff', 'p': '#ff9aa8'},
  a=['.o....o.....',
     'oSo..oSo....',
     'oSSooSSo..oo',
     'oHSSSSSo.oSo',
     'oSeSSeSo.oSo',
     'oSSSpSSo.oSo',
     '.oSSSSSoooSo',
     '.oHSSSSSSSdo',
     '.oSdSSSdSSdo',
     '.ooooooooooo'],
  s=['............',
     '............',
     '............',
     '.o....o.....',
     'oSo..oSo....',
     'oSSooSSooo..',
     'oHSSSSSSSSo.',
     'oSooSooSSSdo',
     'oSSSpSSdSSdo',
     '.ooooooooooo']),
 'dragon': dict(pal={'H': '#ffd0b0', 'S': '#e0563a', 'd': '#8a1e1e', 'e': '#fff4c8', 'w': '#f6d870', 'p': '#f6d870'},
  a=['..o...o.....',
     '.opo.opo....',
     '.oSSoSSo....',
     'oHSSSSSSo...',
     'oSeSSSeSo.o.',
     'oSSSSSSSooSo',
     '.oSwwwSooSSo',
     '.oSwwwSSSSdo',
     '.oSdoSSdoddo',
     '.ooo.ooo.oo.'],
  s=['............',
     '............',
     '............',
     '..o...o.....',
     '.opo.opo....',
     '.oSSoSSooo..',
     'oHSSSSSSSSo.',
     'oSooSooSSSSo',
     'oSSSSSSwwSdo',
     '.oooooooooo.']),
 'ghost': dict(pal={'H': '#ffffff', 'S': '#d8e4f8', 'd': '#8a9ac8', 'e': INK, 'w': '#ffffff', 'p': '#ff9aa8'},
  a=['....oooo....',
     '..ooHHSSoo..',
     '.oHHSSSSSSo.',
     '.oHSeSSeSSo.',
     '.oHSeSSeSdo.',
     '.oSSSppSSdo.',
     '.oSSSSSSSdo.',
     '.oSSSSSSSdo.',
     '.oSdoSSoSdo.',
     '..oo.oo.oo..'],
  s=['............',
     '............',
     '....oooo....',
     '..ooHHSSoo..',
     '.oHHSSSSSSo.',
     '.oHooSSooSo.',
     '.oSSSSSSSdo.',
     '.oSSSSSSSdo.',
     '.oSdoSSoSdo.',
     '..oo.oo.oo..']),
 'mushroom': dict(pal={'H': '#b8fff0', 'S': '#3fb8c8', 'd': '#1a6080', 'e': INK, 'w': '#f0ead8', 'p': '#c8c0a8'},
  a=['....oooo....',
     '..ooSHHSoo..',
     '.oSHHSSSHSo.',
     'oSSSSSHHSSdo',
     'oSHHSSSSSSdo',
     '.oooooooooo.',
     '...owwwwo...',
     '...oewwepo..',
     '...owwwwpo..',
     '....oooooo..'],
  s=['............',
     '............',
     '....oooo....',
     '..ooSHHSoo..',
     '.oSHHSSSHSo.',
     'oSSSSSHHSSdo',
     'oSHHSSSSSSdo',
     '.oooooooooo.',
     '...oowwoopo.',
     '....oooooo..']),
 'mimic': dict(pal={'H': '#f0c890', 'S': '#a8682e', 'd': '#5a3418', 'e': '#ff6a5a', 'w': '#ffffff', 'p': '#f6d870', 't': '#c0392b'},
  a=['.oooooooooo.',
     'oHSSSppSSSdo',
     'oSSSSppSSSdo',
     'oSeSSSSSeSdo',
     'owowowowowoo',
     'ottttttttttо'.replace('о', 'o'),
     'oowowowowowo',
     'oHSSSppSSSdo',
     'oSSSSSSSSSdo',
     '.oooooooooo.'],
  s=['............',
     '............',
     '............',
     '.oooooooooo.',
     'oHSSSppSSSdo',
     'oSSSSppSSSdo',
     'oooooppooooo',
     'oHSSSppSSSdo',
     'oSSSSSSSSSdo',
     '.oooooooooo.']),
 'ember': dict(pal={'H': '#fff4c8', 'S': '#f6a03a', 'd': '#c0392b', 'e': INK, 'w': '#ffffff'},
  a=['.....o......',
     '....oSo..o..',
     '....oSSooSo.',
     '...oSHSSSSo.',
     '..oSSHHSSSo.',
     '.oSSHHHHSSdo',
     '.oSHeHHeHSdo',
     '.oSHHHHHHSdo',
     '..odSHHSddo.',
     '...oooooo...'],
  s=['............',
     '............',
     '............',
     '.....o......',
     '....oSo.....',
     '...oSHSoo...',
     '..oSHHHSSo..',
     '.oSHooHooSo.',
     '.odSHHHHSdo.',
     '..oooooooo..']),
 # achievement-only
 'owl': dict(pal={'H': '#e8dcc0', 'S': '#8a6a4a', 'd': '#4a3424', 'e': '#f6d870', 'w': '#fff4c8', 'p': '#d49a3a'},
  a=['.oo......oo.',
     'oSSoooooоSSo'.replace('о', 'o'),
     'oSHHSSSSHHSo',
     'oHeeHSSHeeHo',
     'oHeoHppHoeHo',
     'oSHHSppSHHSo',
     'oSSwSwSwSSdo',
     'oSwSwSwSwSdo',
     '.oSSSSSSSdo.',
     '..opo..opo..'],
  s=['............',
     '.oo......oo.',
     'oSSooooooSSo',
     'oSHHSSSSHHSo',
     'oHooHSSHooHo',
     'oSHHSppSHHSo',
     'oSSwSwSwSSdo',
     'oSwSwSwSwSdo',
     '.oSSSSSSSdo.',
     '..oooooooo..']),
 'goldslime': dict(pal={'H': '#fff4c8', 'S': '#f6d870', 'd': '#d49a3a', 'e': INK, 'w': '#ffffff'},
  a=['.....ww.....',
     '....owwo....',
     '....oooo....',
     '..ooHHSSoo..',
     '.oHHSSSSSSo.',
     '.oHSeSSeSSo.',
     'oHSSeSSeSSdo',
     'oSSSSSSSSSdo',
     'oSSSSSSSSddo',
     '.oooooooooo.'],
  s=['............',
     '............',
     '............',
     '.....ww.....',
     '...oooooo...',
     '.ooHHSSSSoo.',
     'oHHSSSSSSSdo',
     'oSSooSSooSdo',
     'oSSSSSSSSddo',
     '.oooooooooo.']),
 'rooster': dict(pal={'H': '#ffffff', 'S': '#f0ead8', 'd': '#b8a88a', 'e': INK, 'w': '#ffffff', 'p': '#f6a03a', 't': '#e0564f'},
  a=['...oto......',
     '..ottto.....',
     '..oHSSo...oo',
     '.poSeSo..oSo',
     'ppoSSSo.oSSo',
     '.otSSSoooSSo',
     '..oHSSSSSSdo',
     '..oSSSSSSdo.',
     '...oodoodo..',
     '....opo.opo.'],
  s=['............',
     '............',
     '............',
     '...oto......',
     '..ottto...oo',
     '..oHSSoooSSo',
     '.poSooSSSSSo',
     '.otSSSSSSSdo',
     '..oSSSSSSdo.',
     '...oooooooo.']),
 'crownkit': dict(pal={'H': '#e8e4f0', 'S': '#4a4668', 'd': '#1a1830', 'e': '#f6d870', 'w': '#ffffff', 'p': '#f6d870'},
  a=['.p.p.p......',
     '.ppppp......',
     'oSoooSo.....',
     'oSSSSSSo..oo',
     'oHSSSSSo.oSo',
     'oSeSSeSo.oSo',
     '.oSSSSSoooSo',
     '.oHSSSSSSSdo',
     '.oSdSSSdSSdo',
     '.ooooooooooo'],
  s=['............',
     '............',
     '............',
     '.p.p.p......',
     '.ppppp......',
     'oSoooSoooo..',
     'oHSSSSSSSSo.',
     'oSooSooSSSdo',
     'oSSSSSSdSSdo',
     '.ooooooooooo']),
}

# ---- coin 8x8, zz 5x5
sprite(['..oooo..', '.oHHSSo.', 'oHSSdSSo', 'oHSdSSSo', 'oSSdSSdo', 'oSSSdSdo', '.oSSddo.', '..oooo..'],
       {'o': INK, 'H': '#fff4c8', 'S': '#f6d870', 'd': '#d49a3a'}, 'coin.png')
sprite(['zzzz.', '..z..', '.z...', 'zzzz.'], {'z': '#b8c8f0'}, 'zz.png')

# ---- medals 12x14: ribbon + disc with a 5x5 glyph. tier = bronze / silver / gold
DISC = ['..rr....rr..',
        '..rRr..rRr..',
        '...rRrrRr...',
        '....oooo....',
        '..ooHHSSoo..',
        '.oHSSSSSSdo.',
        '.oHSSSSSSdo.',
        'oHSSSSSSSSdo',
        'oHSSSSSSSSdo',
        'oSSSSSSSSSdo',
        '.oSSSSSSSdo.',
        '.oSSSSSSddo.',
        '..ooddddoo..',
        '....oooo....']
TIER = {'bronze': ('#f0c890', '#a8682e', '#4a2414'), 'silver': ('#ffffff', '#a8b4cc', '#4a4a78'), 'gold': ('#fff4c8', '#f6d870', '#9a5a26')}
RIB = {'bronze': ('#3f86e0', '#8ab8ff'), 'silver': ('#c0392b', '#ff8a7a'), 'gold': ('#8a4ac0', '#d0a0ff')}
GLYPH = {
 'star':  ['..g..', '.ggg.', 'ggggg', '.ggg.', 'g...g'],
 'sun':   ['g.g.g', '.ggg.', 'ggggg', '.ggg.', 'g.g.g'],
 'moon':  ['.ggg.', 'gg...', 'gg...', 'gg..g', '.ggg.'],
 'four':  ['gg.gg', 'gg.gg', '.....', 'gg.gg', 'gg.gg'],
 'flame': ['..g..', '.gg..', '.ggg.', 'ggggg', '.ggg.'],
 'crown': ['.....', 'g.g.g', 'ggggg', 'ggggg', '.....'],
 'sword': ['....g', '...g.', 'g.g..', '.g...', 'g.g..'],
 'leaf':  ['..ggg', '.gggg', 'gggg.', 'ggg..', 'g....'],
 'paw':   ['.g.g.', 'g.g.g', '.....', '.ggg.', '.ggg.'],
 'dawn':  ['.....', '..g..', '.ggg.', 'ggggg', '.....'],
}
def medal(tier, glyph, name):
    H, S, d = TIER[tier]; r, R = RIB[tier]
    rows = [list(x) for x in DISC]
    for y, row in enumerate(GLYPH[glyph]):
        for x, ch in enumerate(row):
            if ch == 'g': rows[6 + y][4 + x - 0] = 'g'
    rows = [''.join(x) for x in rows]
    sprite(rows, {'o': INK, 'H': H, 'S': S, 'd': d, 'r': r, 'R': R, 'g': d}, name)
save(image(DISC, {c: '#000000' for c in 'oHSdrR'}, 'lock'), 'medal-lock.png')
for t, g in [('bronze','sword'),('silver','sword'),('gold','sword'),('bronze','sun'),('silver','sun'),('bronze','flame'),('silver','flame'),('gold','flame'),
             ('silver','moon'),('bronze','dawn'),('silver','four'),('silver','crown'),('gold','crown'),('gold','leaf'),('silver','paw'),('gold','paw'),('gold','star')]:
    medal(t, g, f'medal-{t}-{g}.png')


GROW = {
 'slime': (['..............','.....oooo.....','...ooHHSSoo...','..oHHSSSSSSo..','.oHHSSSSSSSSo.','.oHSSeSSSeSSo.','oHSSSeSSSeSSdo','oHSSSSSSSSSSdo','oSSSSSdddSSSdo','oSSSSSSSSSSddo','oSSSSSSSSSdddo','.oooooooooooo.'],
           ['.......gg.......','......oggo......','.....oooooo.....','...ooHHHSSSoo...','..oHHHSSSSSSSo..','.oHHSSSSSSSSSSo.','.oHSSSeSSSSeSSo.','oHHSSSeSSSSeSSdo','oHSSSSSSSSSSSSdo','oHSSSSSddddSSSdo','oSSSSSSSSSSSSddo','oSSSSSSSSSSSdddo','oSSSSSSSSSSddddo','.oooooooooooooo.']),
 'cat': (['.o.....o......','oSo...oSo.....','oSSoooSSo...oo','oHSSSSSSo..oSo','oSeSSSeSo..oSo','oSSSpSSSo..oSo','orrrrrrro.oSSo','.orrrrrooooSdo','.oHSSSSSSSSSdo','.oSSSSSSSSSSdo','.oSdSSSSdSSSdo','.ooooooooooooo'],
         ['.o......o.......','oSo....oSo......','oSSooooSSo..o.o.','oHSSSSSSSo.oSoSo','oSSeSSSeSo.oSoSo','oSSSSpSSSo.oSoSo','oSSSdddSSo.oSoSo','orrrrgrrro.oSSSo','.orrrrrrooooSSdo','.oHSSSSSSSSSSSdo','.oSSSSSSSSSSSSdo','.oSSSSSSSSSSSSdo','.oSdSSSSSdSSSSdo','.ooooooooooooooo']),
 'dragon': (['..o....o......','.opo..opo.....','.oSSooSSo..o..','oHSSSSSSSooWo.','oSeSSSSeSoWWWo','oSSSSSSSSoWWo.','.oSSwwwSSSoo.o','.oSwwwwwSSSooo','.oSwwwwwSSSSdo','.oSSwwwSSSSddo','.oSdoSSSdoddo.','.ooo.oooo.oo..'],
            ['..o.....o.......','.opo...opo..oo..','.oSSo.oSSo.oWWo.','.oSSSoSSSooWWWWo','oHSSSSSSSSoWWWWo','oSeSSSSSeSoWWWo.','oSSSSSSSSSooWo..','.oSSSSSSSSSoo...','.oSSwwwwSSSSo.o.','.oSwwwwwwSSSooSo','.oSwwwwwwSSSSSdo','.oSSwwwwSSSSSddo','.oSdoSSSSdoSddo.','.ooo.oooo.oooo..']),
 'mushroom': (['.....oooo.....','...ooSHHSoo...','..oSHHSSSHSo..','.oSSSSSHHSSSo.','oSHHSSSSSSHSdo','oSHSSSHHSSSSdo','.oooooooooooo.','....owwwwo....','....oewwepo...','....owwwwpo.oo','....owwwwpooSo','.....oooooo.oo'],
              ['......oooo......','....ooSHHSoo....','...oSHHSSSHSo...','..oSSSSSHHSSSo..','.oSHHSSSSSSHSSo.','oSSHSSSHHSSSSSdo','oSHHSSSSSSSHHSdo','.oooooooooooooo.','.oo..owwwwo..oo.','oSSo.oewwepooHSo','oooo.owwwwpooooo','.wo..owwwwpo.wo.','.oo..owwwwpo.oo.','......oooooo....']),
}

GROW.update({
 'bat': (['..............', '.o...o..o...o.', 'oSo..oSSo..oSo', 'oSSo.oSSo.oSSo', 'oSSSooHSoooSSo', 'oSdSSeSSeSSdSo', 'odoSSSSSSSSodo',
          'o.odSSwwSSdo.o', 'o..oSSwwSSo..o', '....oSSSSo....', '.....oSSo.....', '......oo......'],
         ['................', '.o....o..o....o.', 'oSo..oSooSo..oSo', 'oSSo.oSSSSo.oSSo', 'oSSSooHSSSSooSSo', 'oSSSSSHSSSSSSSSo', 'oSdSSSeSSSeSSdSo',
          'oddoSSSSSSSSoddo', 'od.odSSSSSSdo.do', 'o..oSSwSSwSSo..o', 'o..oSSSSSSSSo..o', '....oSSSSSSo....', '.....oSSSSo.....', '......oooo......']),
 'ghost': (['.....oooo.....', '...ooHHSSoo...', '..oHHSSSSSSo..', '.oHHSSSSSSSSo.', '.oHSeSSSSeSSo.', '.oHSeSSSSeSdo.', '.oSSSSppSSSdo.',
            '.oSSSSSSSSSdo.', '.oSSSSSSSSSdo.', '.oSSSSSSSSSdo.', '.oSdoSSoSSodo.', '..oo.oo.oo.o..'],
           ['......oooo......', '....ooHHSSoo....', '...oHHSSSSSSo...', '..oHHSSSSSSSSo..', '.oHHSSSSSSSSSSo.', '.oHSSeSSSSeSSSo.', '.oHSSeSSSSeSSdo.',
            '.oSSSSSppSSSSdo.', '.oSSSSSSSSSSSdo.', '.oSSSSSSSSSSSdo.', '.oSSSSSSSSSSSdo.', '.oSSSSSSSSSSSdo.', '.oSdoSSoSSoSSdo.', '..oo.oo.oo.oo...']),
 'ember': (['......o.......', '.....oSo...o..', '.....oSSo.oSo.', '....oSHSSooSo.', '...oSSHHSSSSo.', '..oSSHHHHSSSo.', '.oSSHHHHHHSSdo',
            '.oSHHeHHeHHSdo', '.oSHHHHHHHHSdo', '.odSHHHHHHSddo', '..odSSHHSSddo.', '...oooooooo...'],
           ['.......o........', '......oSo....o..', '......oSSo..oSo.', '.....oSHSSooSSo.', '....oSSHHSSSSSo.', '...oSSHHHHSSSSo.', '..oSSHHwwHHSSSo.',
            '.oSSHHwwwwHHSSdo', '.oSHHHeHHeHHHSdo', '.oSHHHHHHHHHHSdo', '.oSHHHHHHHHHHSdo', '.odSHHHHHHHHSddo', '..oddSHHHHSdddo.', '...oooooooooo...']),
 'mimic': (['..............', '.oooooooooooo.', 'oHSSSSppSSSSdo', 'oSSSSSppSSSSdo', 'oSeSSSSSSSeSdo', 'owowowowowowoo', 'otttttttttttto',
            'otttttttttttto', 'oowowowowowowo', 'oHSSSSppSSSSdo', 'oSSSSSSSSSSSdo', '.oooooooooooo.'],
           ['................', '.oooooooooooooo.', 'oHHSSSSppSSSSSdo', 'oHSSSSSppSSSSSdo', 'oSSeSSSSSSSSeSdo', 'oSSSSSSSSSSSSSdo', 'owowowowowowowoo',
            'otttttttttttttto', 'otttttttttttttto', 'oowowowowowowowo', 'oHSSSSSppSSSSSdo', 'oSSSSSSppSSSSSdo', 'odSSSSSSSSSSSddo', '.oooooooooooooo.']),
 'owl': (['.oo........oo.', 'oSSooooooooSSo', 'oSHHHSSSSHHHSo', 'oHeeeHSSHeeeHo', 'oHeoeHppHeoeHo', 'oSHHHSppSHHHSo', 'oSSwSwSwSwSSdo',
          'oSwSwSwSwSwSdo', 'oSSwSwSwSwSSdo', '.oSSSSSSSSSdo.', '..oSSSSSSSdo..', '..opo....opo..'],
         ['.oo..........oo.', 'oSSooooooooooSSo', 'oSHHHHSSSSHHHHSo', 'oHHeeeHSSHeeeHHo', 'oHeeoeHppHeoeeHo', 'oHHeeeHppHeeeHHo', 'oSHHHHSppSHHHHSo',
          'oSSwSwSwSwSwSSdo', 'oSwSwSwSwSwSwSdo', 'oSSwSwSwSwSwSSdo', 'oSwSwSwSwSwSwSdo', '.oSSSSSSSSSSSdo.', '..oSSSSSSSSSdo..', '..oppo....oppo..']),
 'rooster': (['....oto.......', '...ottto......', '...oHSSo....oo', '..poSeSo...oSo', '.ppoSSSo..oSSo', '..otSSSSo.oSSo', '...oHSSSooSSSo',
              '...oHSSSSSSSdo', '...oSSSSSSSSdo', '....oSSSSSSdo.', '.....oodoodo..', '......opo.opo.'],
             ['....oto.........', '...ottto.....oo.', '...oHSSSo...oSSo', '..poSSeSo..oSSSo', '.ppoSSSSo..oSSSo', '..otSSSSSo.oSSSo', '..ottSSSSSooSSSo',
              '...oHSSSSSSSSSdo', '...oHSSSSSSSSSdo', '...oSSSSSSSSSSdo', '....oSSSSSSSSdo.', '.....ooSdoSdoo..', '......opo..opo..', '......ooo..ooo..']),
})
# The golden slime grows like the slime, the crowned cat like the cat with its crown on.
GROW['goldslime'] = (['......ww......'] + GROW['slime'][0][1:], ['.......ww.......'] + GROW['slime'][1][1:])
def crowned(rows, r0, r1):
    rows = [r.replace('p', 'n').replace('r', 'R') for r in rows]
    return [r0, r1] + rows[2:]
GROW['crownkit'] = (crowned(GROW['cat'][0], '.o.p.p.o......', 'oSopppoSo.....'),
                    crowned(GROW['cat'][1], '.o.p..p.o.......', 'oSoppppoSo......'))
EXTRA = {'slime': {'g': '#ff9aa8'}, 'cat': {'r': '#e0564f', 'g': '#f6d870'}, 'dragon': {'W': '#f6a03a'}, 'mushroom': {},
         'bat': {}, 'ghost': {}, 'ember': {}, 'mimic': {}, 'owl': {}, 'rooster': {},
         'goldslime': {}, 'crownkit': {'n': '#ff9aa8', 'R': '#8a4ac0', 'g': '#f6d870'}}

def crouch(rows, drop):
    """A grown pet asleep: eyes shut, pressed down `drop` rows (kept as tall)."""
    rows = list(rows)
    eyes = [y for y, r in enumerate(rows) if 'e' in r]
    out = []
    for y, r in enumerate(rows):
        c = list(r)
        if y in eyes:
            last = y == eyes[-1]
            for x in range(len(c)):
                if c[x] == 'o' and 0 < x < len(c) - 1 and c[x - 1] == 'e' and c[x + 1] == 'e': c[x] = 'e'
            for x in range(len(c)):
                if c[x] != 'e': continue
                if last: c[x] = 'o'
                else:
                    k = x - 1
                    while k >= 0 and c[k] in 'eo': k -= 1
                    c[x] = c[k] if k >= 0 and c[k] != '.' else 'S'
        out.append(''.join(c))
    # press down: drop body rows between the eyes and the last two rows, evenly
    lo, hi = (eyes[-1] + 1 if eyes else len(out) // 2), len(out) - 2
    span = list(range(lo, hi))
    cut = set(span[i * len(span) // drop + len(span) // (2 * drop)] for i in range(drop)) if span and drop else set()
    kept = [r for y, r in enumerate(out) if y not in cut]
    return ['.' * len(rows[0])] * (len(rows) - len(kept)) + kept

def shut(rows):
    """The mimic asleep: a shut chest (teeth and tongue gone, a seam with the latch)."""
    w = len(rows[0])
    body = [r.replace('e', 'S') for r in rows if 't' not in r and not r.startswith(('ow', 'oow'))]
    seam = 'o' * (w // 2 - 1) + 'pp' + 'o' * (w - w // 2 - 1)
    at = next(i for i, r in enumerate(body) if i > 1 and 'pp' in r and i >= len(body) // 2)
    out = body[:at] + [seam] + body[at:]
    return ['.' * w] * (len(rows) - len(out)) + out

def pet(key, stage, kind, rows, pal):
    im = image(rows, pal, key)
    save(im, f'pet-{key}-{stage}-{kind}.png')
    save(im.transpose(Image.FLIP_LEFT_RIGHT), f'pet-{key}-{stage}-{kind}-r.png')

for k, p in PETS.items():
    pal = {'o': INK, **p['pal'], **EXTRA[k]}
    if k == 'goldslime': pal['g'] = '#ffffff'
    pet(k, 1, 'a', p['a'], pal); pet(k, 1, 's', p['s'], pal)
    # the dex's "not yet" silhouette (shown at 40%, like brightness(0) in the mockup)
    save(image(p['s'], {c: '#000000' for c in pal}, k), f'pet-{k}-1-s-x.png')
    s2, s3 = GROW[k]
    pet(k, 2, 'a', s2, pal); pet(k, 2, 's', shut(s2) if k == 'mimic' else crouch(s2, 2), pal)
    pet(k, 3, 'a', s3, pal); pet(k, 3, 's', shut(s3) if k == 'mimic' else crouch(s3, 3), pal)

sprite(['ooooo', 'owrwo', 'owrwo', 'owrwo', 'owwwo', 'owrwo', 'ooooo', '..o..'], {'o': INK, 'w': '#fff4c8', 'r': '#e0564f'}, 'bang.png')

# low battery: the shell stays, the red cell and the bolt blink on top (two files)
from PIL import ImageDraw
def batt():
    W, H = 18, 12
    shell = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(shell)
    d.rectangle((0, 1, 14, 10), fill=hx(INK)); d.rectangle((1, 2, 13, 9), fill=hx('#e8dcc0')); d.rectangle((2, 3, 12, 8), fill=hx('#1a2142'))
    d.rectangle((14, 4, 16, 7), fill=hx(INK)); d.rectangle((14, 5, 15, 6), fill=hx('#e8dcc0'))
    d.point((1, 2), fill=hx('#fff4c8'))
    top = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(top)
    d.rectangle((3, 4, 4, 7), fill=hx('#e0564f')); d.point((3, 4), fill=hx('#ff9a8a'))
    bolt = ['....yyy', '...yyy.', '..yyy..', '.yyyyyy', '...yyy.', '..yyy..', '.yyy...', 'yy.....']
    px = [(6 + x, 2 + y) for y, r in enumerate(bolt) for x, ch in enumerate(r) if ch == 'y']
    for (x, y) in px:
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                if 0 <= x + dx < W and 0 <= y + dy < H: top.putpixel((x + dx, y + dy), hx(INK))
    for (x, y) in px: top.putpixel((x, y), hx('#f6d870'))
    for (x, y) in [(10, 2), (9, 3), (8, 4), (7, 5)]: top.putpixel((x, y), hx('#fff4c8'))
    for n, im in (('batt-shell.png', shell), ('batt-bolt.png', top)):
        im.resize((W * 2, H * 2), Image.NEAREST).save(os.path.join(OUT, n))
batt()
print(sum(1 for f in os.listdir(OUT) if f.startswith(('pet-', 'medal-', 'coin', 'bang', 'zz', 'batt-'))))
