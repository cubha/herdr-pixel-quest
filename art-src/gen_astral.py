"""Pixel Quest: the art of the sanctum of stars (zone astral), in its five growth stages.

    python3 art-src/gen_astral.py [stage ...]          (default: 1 2 3 4 5)

The pictures are the confirmed mockup's (the rebirth theme), drawn by its own generator
(art-src/astral/astral.py, a copy with the scene's width as a parameter) on the stage-3
generators in art-src/zones/. The zone has no time of day and no seasons, so there is one
scene per stage and box shape. Unlike the five stage-3 zones the scene is drawn again at
each box shape (look.js BUCKETS): its galaxy band runs corner to corner and cannot be cut.

Into mods/pixel-quest/art (N = the stage, 1..5):
  look/tablet-astral-none.png            the plain night behind the scene (one for all stages)
  look/deco-astralN-none-<bucket>.png    the whole scene, opaque
  zone/astralN/bg-work.png               the outer night (nebula, aurora), one px per dot (640 x 400:
                                         it only shows in the gaps between the frames)
  zone/astralN/strip-top.png strip.png   the top wall (aurora hanging) / the other wall bands (the
                                         night's bottom 28 px, as the status bar shows it)
  zone/astralN/floor.png floor-b.png     the panel floor: the mockup's upper / lower panel
  zone/astralN/sill.png                  the ledge under the tablet, its lights lit by stage
  zone/astralN/knob-gold.png             a frame's corner gem in the first galaxy's color
  zone/astralN/lamps.png                 the five star lamps of the top wall, N of them lit
  zone/astralN/corner-<tl|tr|bl|br>.png  starlight spreading from a frame's corner (stage 2+)
  zone/astralN/edge-h.png edge-v.png     stars set in a frame's edge (2+), galaxy sheen (3+)
  zone/astralN/card-l.png                the settings card (192x120)
  zone/astral/<sprite>.png card.png      gold sprites (the same at every stage), the layout preview
Walls and floors are cut to 256 colors per file (no dithering) to keep the files small;
the scenes keep every color.
Copyright (c) 2026 cubha. MIT License.
"""
import os
import random
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, 'astral'))

_argv, sys.argv = sys.argv, sys.argv[:1]          # gen_zones (gen_look) reads argv
import gen_zones as GZS                            # noqa: E402
sys.argv = _argv
import astral as A                                 # noqa: E402  (after gen_zones: it needs art-src/zones on the path)

c4, GZ, tab5 = GZS.c4, GZS.GZ, GZS.tab5
ART, LOOK = GZS.ART, GZS.LOOK
KEY = A.KEY
HB = 732
TABW = 994
OX, OY = GZS.OX, GZS.OY                            # the terminal area in the tablet's box
GC = A.GC
FRAME = (10, 52, 264, 404)                         # the mockup's first frame: x0, y0 = its first gold line
GOLD_K = [0.74, 0.86, 0.96, 1.04, 1.1]             # a frame's gold by stage (astral.adorn; zones.js ASTRAL_GOLD)
RAMP = [c4.hexc(c) for c in c4.ZONES[KEY]['ramp']]
INK, NIGHT = (6, 7, 11), (13, 16, 25)              # zones.js PALETTES.astral ink, wall


def save(a, path, n=96, far=16):
    """PNG. An opaque picture with more than 256 colors is cut to 256, no dithering: n for
    the night's many near shades, the rest for what those miss by more than `far` (the stars
    and lights, which a single cut would dim away). See-through pictures stay as they are."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    a = np.clip(a, 0, 255).round().astype(np.uint8)
    im = Image.fromarray(a)
    if a.shape[2] == 3 and im.getcolors(256) is None:
        q = im.quantize(n, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
        idx, pal = np.array(q), list(q.getpalette()[:n * 3])
        bad = np.abs(np.array(q.convert('RGB')).astype(int) - a).max(-1) > far
        if bad.any():
            q2 = Image.fromarray(a[bad][None]).quantize(256 - n, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
            idx[bad] = np.array(q2)[0] + n
            pal += list(q2.getpalette()[:(256 - n) * 3])
        im = Image.fromarray(idx.astype(np.uint8), 'P')
        im.putpalette(pal)
    im.save(path, optimize=True)


def lerp_glow(a, cx, cy, rad, col, k):
    """chrome4.glow on a picture of any size; returns how much it covered."""
    yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]]
    m = np.clip(1 - np.hypot(xx - cx, yy - cy) / rad, 0, 1) ** 1.6 * k
    a += (np.array(col, np.float32) - a) * m[..., None]
    return m


# ───────────── the scene ─────────────
def scene(bucket):
    """The whole work area (732 high) for a box shape: the scene on the terminal area, its
    edges mirrored outward. Shape 136 is the mockup's own picture."""
    W = int(round(HB * bucket / 100 / 2)) * 2
    wt = W - (TABW - tab5.TW)
    full = A.astral(None if bucket == 136 else (wt + 1) // 2)[0][:, :wt]
    full = np.pad(full, ((0, 0), (0, wt - full.shape[1]), (0, 0)), mode='edge')
    return np.pad(full, ((OY, HB - OY - tab5.TH), (OX, W - OX - wt), (0, 0)), mode='reflect')


# ───────────── walls, floors, the ledge ─────────────
def strip(rows):
    """A wall band (2560 x 48) from 48 rows of the night: mirrored at 1280 so it has no seam,
    the old band's large light kept (gen_zones.wall)."""
    t = np.concatenate([rows, rows[:, ::-1]], 1)
    k = np.clip(GZS.shade_of(os.path.join(ART, 'strip.png'), 7)[:48, :2560] / 0.096, 0.75, 1.9)
    return t * k[..., None]


def floors():
    """The mockup's floor as each sidebar panel shows it: from the upper panel's corner
    (14, 56) and the lower panel's (14, 430), mirrored on below the mockup's screen."""
    tex = c4.up(A.floor())
    k = np.clip(GZS.shade_of(os.path.join(ART, 'floor.png'), 40) / 0.119, 0.7, 1.45)[..., None]
    cut = lambda y: np.pad(tex[y:, 14:494], ((0, 1600 - (tex.shape[0] - y)), (0, 0), (0, 0)), mode='reflect') * k
    return cut(56), cut(430)


def sill(S):
    """The ledge with its galaxy lights (astral.adorn): every 12 px a place, lit by stage."""
    a = GZS.sill(KEY).astype(np.float32)
    r = random.Random(9)
    for x in range(12, a.shape[1] - 12, 12):
        j = (x // 12) % 5
        if j < S and r.random() < 0.08 + 0.13 * S:
            a[2:4, x:x + 2] = GC[j]
            lerp_glow(a, x + 1, 3, 8, GC[j], 0.35)
    return a


# ───────────── gold: the knob, the lamps, a frame's corners and edges ─────────────
def knob(S, k=0):
    """A frame's corner knob: the gem in a lit galaxy's color, the gold at the stage's brightness."""
    a = GZS.recolor(KEY, 'knob-gold').astype(np.float32)
    hh, ss, vv = c4.hsv(a[..., :3])
    gem = (hh > 150) & (hh < 195) & (ss > 0.4) & (vv > 0.3)
    a[gem, :3] = np.clip(np.array(GC[k % S], np.float32) * (vv[gem, None] / 0.89), 0, 255)
    gold = (hh > 22) & (hh < 62) & (ss > 0.28) & (vv > 0.3)
    a[gold, :3] *= GOLD_K[S - 1]
    return a


def lamps(S):
    """The five star lamps (astral.lantern), cut from the mockup's screen: drawn on black and
    on white, which gives each pixel's color and how much it covers."""
    lo, hi = np.zeros((c4.H, c4.W, 3), np.float32), np.full((c4.H, c4.W, 3), 255, np.float32)
    for a in (lo, hi):
        for i in range(5):
            A.lantern(a, A.LX[i], GC[i], i < S, S, i)
    al = np.clip(1 - (hi - lo).mean(-1) / 255, 0, 1)
    col = lo / np.maximum(al, 1e-6)[..., None]
    return GZS.rgba(col, al)[0:48, 585:965]               # the tab bar's middle 380 px (roles/tabs.js)


CO, CS = 44, 108                                           # a corner picture: the frame's corner at (44, 44), 108 px square


def corner(S, k):
    """Starlight from a frame's top-left corner (astral.adorn), drawn over a frame like the
    kit's (ink 2, gold 2, gold 2, ink 2 from 4 px in) so the lights sit on its lines."""
    g = np.array(GC[k % S], np.float32)
    f3, f2 = RAMP[3] * GOLD_K[S - 1], RAMP[2] * GOLD_K[S - 1]
    a = np.zeros((CS, CS, 3), np.float32) + np.array(NIGHT, np.float32)
    for off, col in ((4, INK), (6, f3), (8, f2), (10, INK)):
        a[CO + off:CO + off + 2, CO + off:] = col
        a[CO + off:, CO + off:CO + off + 2] = col
    kn = knob(S, k)
    on = kn[..., 3] > 0
    a[CO:CO + 16, CO:CO + 16][on] = kn[..., :3][on]
    base = a.copy()
    hit = np.zeros((CS, CS), bool)
    hit[CO:CO + 16, CO:CO + 16] = on
    clear = np.ones((CS, CS), np.float32)                  # what the glows leave of the frame below
    cx = cy = CO + 6

    def glow(x, y, rad, kk):
        nonlocal clear
        clear = clear * (1 - lerp_glow(a, x, y, rad, tuple(g), kk))

    def dot(x, y, c):
        new = np.maximum(a[y:y + 2, x:x + 2], c)
        hit[y:y + 2, x:x + 2] |= (new != a[y:y + 2, x:x + 2]).any(-1)
        a[y:y + 2, x:x + 2] = new
    if S >= 3:
        glow(cx + 2, cy + 2, 16 + 3 * S, 0.10 + 0.03 * S)
    Lr = [0, 14, 24, 36, 50][S - 1]
    for q in range(0, Lr, 2):
        f = 1 - q / Lr
        c = (np.array((255, 252, 240), np.float32) * f + g * (1 - f)) if f > 0.5 else g * (0.35 + 1.3 * f)
        dot(cx + q + 4, cy, c)
        dot(cx, cy + q + 4, c)
    if S >= 3:
        for q in range(2, 4 + 2 * S, 2):                   # diagonal rays
            for dx, dy in ((1, 1), (-1, -1), (1, -1), (-1, 1)):
                dot(cx + dx * q, cy + dy * q, g * (1.0 - q / (6 + 2 * S)))
    glow(cx, cy, 14 + 6 * S, 0.10 + 0.05 * S)
    al = np.where(hit, 1.0, 1 - clear)
    col = np.where(hit[..., None], a, (a - base * clear[..., None]) / np.maximum(1 - clear, 1e-6)[..., None])
    return GZS.rgba(col, al)


def edges(S):
    """(edge-h 2560 x 8, edge-v 8 x 1600 or None): rows / columns 2..5 lie on a frame's gold.
    Stars set in the gold along the top and bottom edges (stage 2+), the galaxies' colors
    flowing along every edge (stage 3+)."""
    f3, f2 = RAMP[3] * GOLD_K[S - 1], RAMP[2] * GOLD_K[S - 1]
    sh = [0, 0, 0.22, 0.36, 0.5][S - 1]
    cs = np.array(GC[:S] + GC[:1], np.float32)

    def sheen(X, Y):
        """Color and cover along an edge (astral.adorn), for the gold's two lines."""
        ph = ((X + Y * 0.6) / 150.0) % S
        i0 = np.floor(ph).astype(int)
        col = cs[i0] + (cs[i0 + 1] - cs[i0]) * (ph - i0)[..., None]
        m = sh * (0.5 + 0.5 * np.sin((X - Y) / 38.0)) ** 2
        return [np.dstack([np.clip(col * (v.max() / 255 * 1.15), 0, 255), m * 255])[0] for v in (f3, f3, f2, f2)]
    h = np.zeros((8, 2560, 4), np.float32)
    v = np.zeros((1600, 8, 4), np.float32)
    if sh:
        h[2:6] = sheen(FRAME[0] + np.arange(2560, dtype=np.float32)[None], np.float32(FRAME[1]))
        v[:, 2:6] = np.stack(sheen(np.float32(FRAME[0]), FRAME[1] + np.arange(1600, dtype=np.float32)[None]), 1)
    r = random.Random(9)
    step = [0, 230, 180, 140, 104][S - 1]
    white, teal = (255, 252, 236, 255), (150, 226, 222, 255)
    x = 30 + r.randrange(60)
    while step and x < 2560 - 30:                          # uneven gaps and sizes
        h[2:6, x:x + 2] = white
        if r.random() < 0.3 + 0.1 * S:
            h[3:5, x - 2:x + 4] = white
            if S >= 4 and r.random() < 0.5:
                h[0:2, x:x + 2] = teal
                h[6:8, x:x + 2] = teal
        x += step + r.randrange(-step // 3, step // 2)
    return h, (v if sh else None)


def card(S, size):
    """The mockup's whole screen at this stage, small."""
    a, _ = GZ.screen(KEY, tab5.talk)
    tab5.rec_stop()
    return np.array(Image.fromarray(A.adorn(a)).convert('RGB').resize(size, Image.LANCZOS))


def shared():
    Z = os.path.join(ART, 'zone', KEY)
    for n in GZS.SPRITES:
        if n != 'knob-gold':
            GZS.save(GZS.recolor(KEY, n), os.path.join(Z, f'{n}.png'))
    A.STAGE = 1
    GZS.save(card(1, (128, 80)), os.path.join(Z, 'card.png'))
    save(np.zeros((16, 16, 3)) + np.array(c4.ZONES[KEY]['tab']), os.path.join(LOOK, f'tablet-{KEY}-none.png'))


def stage(S):
    A.STAGE = S
    name = f'{KEY}{S}'
    Z = os.path.join(ART, 'zone', name)
    for b in GZS.BUCKETS:
        GZS.save(np.clip(scene(b), 0, 255).astype(np.uint8), os.path.join(LOOK, f'deco-{name}-none-{b}.png'))   # as the mockup saves it, every color kept (a cut rings the tree's glow)
    save(GZS.wall(KEY, os.path.join(ART, 'bg-work.png'), 800, 1280)[::2, ::2], os.path.join(Z, 'bg-work.png'))
    night = c4.up(A.wall(3))
    save(strip(night[:48]), os.path.join(Z, 'strip-top.png'))
    # The other bands show a strip's top rows: the status bar (28 px) is the night's bottom edge.
    save(strip(np.pad(night[-28:], ((0, 20), (0, 0), (0, 0)), mode='reflect')), os.path.join(Z, 'strip.png'))
    up, low = floors()
    save(up, os.path.join(Z, 'floor.png'))
    save(low, os.path.join(Z, 'floor-b.png'))
    save(sill(S), os.path.join(Z, 'sill.png'))
    save(knob(S), os.path.join(Z, 'knob-gold.png'))
    save(lamps(S), os.path.join(Z, 'lamps.png'))
    if S >= 2:
        for k, (tag, flip) in enumerate((('tl', lambda a: a), ('tr', lambda a: a[:, ::-1]), ('bl', lambda a: a[::-1]), ('br', lambda a: a[::-1, ::-1]))):
            save(flip(corner(S, k)), os.path.join(Z, f'corner-{tag}.png'))
        h, v = edges(S)
        save(h, os.path.join(Z, 'edge-h.png'))
        if v is not None:
            save(v, os.path.join(Z, 'edge-v.png'))
    GZS.save(card(S, GZS.CARD_L), os.path.join(Z, 'card-l.png'))
    size = sum(os.path.getsize(os.path.join(Z, f)) for f in os.listdir(Z)) + sum(os.path.getsize(os.path.join(LOOK, f'deco-{name}-none-{b}.png')) for b in GZS.BUCKETS)
    print(name, 'ok', len(os.listdir(Z)), 'files in zone/' + name, '%.2f MB with its scenes' % (size / 1e6))


if __name__ == '__main__':
    stages = [int(v) for v in sys.argv[1:]] or [1, 2, 3, 4, 5]
    shared()
    for s in stages:
        stage(s)
