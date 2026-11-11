"""Pixel Quest dungeon details: stone floors, brick bands, sconces, chains, cobwebs, moss.
(The stone tablet behind the terminals is art-src/gen_tablet.py.)

    python3 art-src/gen_dungeon.py <out-folder>

Writes into <out> (normally mods/pixel-quest/art):
  floor.png       480x1600  flagstones behind the sidebar panels (clipped, never stretched)
  strip.png       2560x48   brick band behind the tab bar and the status bar
  sill.png        2560x8    stone ledge under the work area
  floor-slate.png, strip-slate.png, sill-slate.png  the same in daylight blue-grey slate
  bg-slate.png    1280x800  the light layout's outer wall
  sconce.png, sconce-b.png  16x16 wall sconce, two flame frames
  sconce-halo.png 36x28     round halo behind a sconce's flame
  chain.png       4x8       one chain segment (hangs between the two panels)
  web-tl/tr/bl/br.png 24x20 cobweb for each inner corner of a panel
  moss.png        22x6      moss tuft on the status bar's edge

Everything is drawn at art resolution and doubled (1 art px = 2 screen px).
The textures are seeded, so a rerun writes the same pixels.

Copyright (c) 2026 cubha. MIT License.
"""
import math
import os
import random
import sys

from PIL import Image

OUT = sys.argv[1] if len(sys.argv) > 1 else '.'
os.makedirs(OUT, exist_ok=True)

INK = (5, 6, 12)


def cl(c):
    return tuple(max(0, min(255, int(round(v)))) for v in c)


def add(c, d):
    return cl([v + d for v in c])


def mix(a, b, t):
    return cl([a[i] * (1 - t) + b[i] * t for i in range(3)])


def x2(im):
    return im.resize((im.width * 2, im.height * 2), Image.NEAREST)


def save(im, name):
    x2(im).save(os.path.join(OUT, name))


def flagstones(w, h, seed, base, spread, mortar):
    """Irregular flagstone rows, low contrast, with a few hairline cracks."""
    r = random.Random(seed)
    im = Image.new('RGB', (w, h), mortar)
    px = im.load()
    y = 0
    while y < h:
        rh = r.randint(9, 14)
        x = -r.randint(0, 12)
        while x < w:
            sw = r.randint(14, 26)
            c = add(base, r.choice(spread))
            for yy in range(y, min(h, y + rh - 1)):
                for xx in range(max(0, x), min(w, x + sw - 1)):
                    col = c
                    if yy == y or xx == x:
                        col = add(c, 4)
                    elif yy == y + rh - 2 or xx == x + sw - 2:
                        col = add(c, -3)
                    elif r.random() < 0.035:
                        col = add(c, r.choice((-4, 4)))
                    px[xx, yy] = col
            if r.random() < 0.12:
                cx, cy = x + r.randint(3, max(4, sw - 5)), y + 2
                for _ in range(r.randint(3, rh - 3)):
                    if 0 <= cx < w and cy < h:
                        px[cx, cy] = add(c, -6)
                    cy += 1
                    cx += r.choice((-1, 0, 0, 1))
            x += sw
        y += rh
    return im


def bricks(w, h, seed, base, spread, mortar, bw=16, bh=6, hi=8, lo=-5):
    """Running-bond bricks: a lit top row and a shaded bottom row per brick."""
    r = random.Random(seed)
    im = Image.new('RGB', (w, h), mortar)
    px = im.load()
    for row in range(h // bh + 1):
        off = 0 if row % 2 == 0 else bw // 2
        for col in range(-1, w // bw + 2):
            x0, y0 = col * bw - off, row * bh
            c = add(base, r.choice(spread))
            for yy in range(y0, min(h, y0 + bh - 1)):
                for xx in range(max(0, x0), min(w, x0 + bw - 1)):
                    v = c
                    if yy == y0:
                        v = add(c, hi)
                    elif yy == y0 + bh - 2:
                        v = add(c, lo)
                    elif r.random() < 0.05:
                        v = add(c, r.choice((-3, 3)))
                    px[xx, yy] = v
    return im


def sprite(rows, pal):
    h, w = len(rows), max(len(r) for r in rows)
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    px = im.load()
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch in pal:
                px[x, y] = pal[ch]
    return im


# Floors and bands: base colours sit a step or two off the panel fill (#121731)
# so text keeps its contrast.
save(flagstones(240, 800, 7, (19, 24, 51), (-2, -1, 0, 1, 2, 3), (11, 14, 30)), 'floor.png')
save(bricks(1280, 24, 11, (21, 26, 54), (-2, 0, 2, 4), INK, hi=9, lo=-4), 'strip.png')
save(bricks(1280, 4, 3, (58, 56, 84), (-4, 0, 4), INK, bw=12, bh=4, hi=16, lo=-10), 'sill.png')

# Light (daylight blue-grey slate) versions of the floor, the brick band, the sill
# and the outer wall, for the pixel-quest-light layout.
save(flagstones(240, 800, 7, (208, 214, 226), (-3, -1, 0, 1, 2, 3), (164, 172, 190)), 'floor-slate.png')
save(bricks(1280, 24, 11, (170, 178, 196), (-4, 0, 3, 6), (92, 100, 120), hi=12, lo=-10), 'strip-slate.png')
save(bricks(1280, 4, 3, (128, 136, 156), (-4, 0, 4), (62, 70, 90), bw=12, bh=4, hi=18, lo=-14), 'sill-slate.png')
save(bricks(640, 400, 5, (160, 168, 186), (-8, -4, 0, 4, 8), (104, 112, 132), hi=12, lo=-10), 'bg-slate.png')

# Wall sconce: an iron cup on a bracket, two flame frames.
CUP = ['.bbbbbb.', '..bBBb..', '...bb...', '...bb...']
SC_PAL = {'y': (240, 160, 50, 255), 'Y': (255, 230, 120, 255), 'O': (255, 250, 210, 255),
          'o': (200, 90, 30, 255), 'b': (90, 58, 30, 255), 'B': (140, 96, 50, 255)}
save(sprite(['...yy...', '..yYYy..', '..yYOy..', '...oo...'] + CUP, SC_PAL), 'sconce.png')
save(sprite(['....y...', '..yYy...', '..yYOyy.', '...oo...'] + CUP, SC_PAL), 'sconce-b.png')

# Light pool: a small round halo around the flame, dithered at its rim.
GW, GH = 18, 14
g = Image.new('RGBA', (GW, GH), (0, 0, 0, 0))
gp = g.load()
for y in range(GH):
    for x in range(GW):
        d = math.hypot((x - GW / 2 + 0.5) / (GW / 2), (y - 5.5) / (GH / 2))
        if d < 0.6:
            gp[x, y] = (230, 140, 60, 70)
        elif d < 1 and (x + y) % 2 == 0:
            gp[x, y] = (230, 140, 60, 45)
save(g, 'sconce-halo.png')

save(sprite(['k.', 'kk', '.k', 'kk'], {'k': (138, 132, 150, 255)}), 'chain.png')
WEB = x2(sprite([
    'aaaaaaaaaaaa',
    'ab..b...b...',
    'a.b.b..b....',
    'a..bbbb.....',
    'abbb..b.....',
    'a.b..b......',
    'a..bb.......',
    'a.b.........',
    'ab..........',
    'a...........',
], {'a': (120, 116, 150, 150), 'b': (150, 146, 180, 120)}))
for corner, flip in (('tl', None), ('tr', Image.FLIP_LEFT_RIGHT),
                     ('bl', Image.FLIP_TOP_BOTTOM), ('br', Image.ROTATE_180)):
    (WEB if flip is None else WEB.transpose(flip)).save(os.path.join(OUT, f'web-{corner}.png'))
save(sprite(['..g...g.g..', '.gGg.gGgGg.', 'gGGGgGGGGGg'],
            {'g': (52, 92, 58, 255), 'G': (74, 128, 70, 255)}), 'moss.png')
print('wrote dungeon art to', OUT)
