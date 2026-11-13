"""Pixel Quest zones (roadmap stage 3): the art of the five new zones.

    python3 art-src/gen_zones.py [zone ...]          (default: ice moss lava crystal throne)

The pictures are the confirmed mockup's (stage 3, version 13), drawn by its own
generators in art-src/zones/ (copies of the mockup's, with a recorder that splits the
tablet into the stone and the scene drawn over it). Nothing is redrawn at other sizes:
the scene is drawn once at the mockup's size and cut into the work area's five box
shapes (look.js BUCKETS), its corners pinned to the box's corners.

Per zone, into mods/pixel-quest/art:
  look/tablet-<zone>-<phase>.png          the stone behind the terminal, by time of day
  look/deco-<zone>-<season>-<bucket>.png  the zone's scene (+ the season's things)
  zone/<zone>/bg-work.png strip.png sill.png floor.png   walls, wall bands, ledge, panel floor
  zone/<zone>/dress-*.png                 a panel's edges and corner things (ice, crystal, throne)
  zone/<zone>/cap.png crest-*.png         things on the gold frames' top edges
  zone/<zone>/<sprite>.png                gold sprites in the zone's metal, flames in its fire
  zone/<zone>/card.png                    the settings card (128x80)
Copyright (c) 2026 cubha. MIT License.
"""
import json
import os
import random
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'zones'))
ROOT = os.path.abspath(os.path.join(HERE, '..'))
ART = os.path.join(ROOT, 'mods/pixel-quest/art')
LOOK = os.path.join(ART, 'look')

_argv, sys.argv = sys.argv, sys.argv[:1]          # gen_look reads its output folder from argv
import gen_look as GL                              # noqa: E402
sys.argv = _argv

import chrome4 as c4                               # noqa: E402
import floors6                                     # noqa: E402
import gen_zone_mock as GZ                         # noqa: E402
import panels9                                     # noqa: E402
import tab5                                        # noqa: E402
import zones5                                      # noqa: E402

ZONES = ['ice', 'moss', 'lava', 'crystal', 'throne']
BUCKETS = GL.BUCKETS
PHASES = GL.PHASES
SEASONS = GL.SEASONS
TW, TH = tab5.TW, tab5.TH                          # the mockup's terminal area (986 x 684)
OX, OY = 5, 41                                     # where it sits in the 994 x 732 tablet
TABW, TABH = 994, 732


def save(a, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    Image.fromarray(a).save(path, optimize=True)


def rgba(c, al):
    return np.dstack([np.clip(c, 0, 255), np.clip(al * 255, 0, 255)]).round().astype(np.uint8)


# ───────────── the tablet: the mockup's stone, and the scene drawn over it ─────────────
def split(key):
    """(stone TH x TW x 3, scene color, scene cover) from the mockup's generator."""
    tab, z = zones5.ZONES[key]()
    r = tab5.rec_stop()
    col = r.p / np.maximum(r.al, 1e-6)[..., None]
    back = np.clip(r.base * (1 - r.al[..., None]) + r.p, 0, 255)
    assert np.abs(back - np.clip(tab, 0, 255)).max() < 0.01, key
    return np.clip(r.base, 0, 255), col, r.al, z


def tablet(stone):
    """The stone as the 994 x 732 tablet: the mockup's area, its edges mirrored outward."""
    a = np.pad(stone, ((OY, TABH - OY - TH), (OX, TABW - OX - TW), (0, 0)), mode='reflect')
    return a.astype(np.float32)


def lit(a, phase):
    """The dark look's time of day (gen_look.tablet, dark): light shafts, the torch, night."""
    a = a.copy()
    H, W = a.shape[:2]
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    cx = W / 2
    L, R = cx - 121, cx + 125
    dither = 0.86 + 0.14 * ((xx // 2 + yy // 2) % 2)

    def add(m, col, k):
        a[:] = np.clip(a + (m * k * dither)[..., None] * np.array(col, np.float32), 0, 255)

    def torch(k, rad=360):
        add(np.clip(1 - np.hypot(xx - cx, (yy - 3) * 1.1) / rad, 0, 1) ** 1.7 / dither, (255, 150, 60), k)
    sb = GL.shaft_band
    if phase == 'dawn':
        add(sb(yy, xx, L, 0.62), (255, 150, 150), 0.085)
        add(sb(yy, xx, R, 0.62, reach=420), (255, 150, 150), 0.05)
    elif phase == 'day':
        add(sb(yy, xx, L, -0.10, reach=760), (255, 236, 190), 0.105)
        add(sb(yy, xx, R, 0.10, reach=760), (255, 236, 190), 0.105)
    elif phase == 'dusk':
        add(sb(yy, xx, R, -0.66), (255, 120, 40), 0.115)
        add(sb(yy, xx, L, -0.66, reach=420), (255, 120, 40), 0.06)
        torch(0.05)
    elif phase == 'night':
        d = np.clip(np.hypot((xx - cx) / 640, (yy - 13) / 720), 0, 1)
        a *= (1 - 0.38 * d)[..., None]
        add(sb(yy, xx, L, 0.22, reach=560, w0=18, spread=0.13), (110, 150, 255), 0.075)
        torch(0.17)
    return np.clip(a, 0, 255).astype(np.uint8)


# Where the scene may be cut or stretched: away from the left pile (throne, < 300) and
# the right corner scenes (the last ~230 px).
LO, HI = 320, TW - 230


def colcost(col, al, i, j):
    return float(np.abs(al[:, i] - al[:, j]).mean() + (np.abs(col[:, i] - col[:, j]).sum(-1) * np.maximum(al[:, i], al[:, j])).mean() / 255)


def columns(col, al, wt):
    """Source column for each of wt target columns: left part as is, right part pinned to
    the right edge, the middle cut (narrower) or a quiet stretch of it repeated (wider),
    the joins put where the two columns look most alike."""
    if wt == TW:
        return np.arange(TW)
    if wt < TW:
        drop = TW - wt
        best = min(range(LO, HI - drop), key=lambda s: colcost(col, al, s - 1, s + drop))
        x = np.arange(wt)
        return np.where(x < best, x, x + drop)
    extra = wt - TW
    periods = sorted({extra // n for n in range(1, extra + 1) if extra % n == 0 and extra // n <= HI - LO and extra // n >= min(extra, 48)})
    a, p = min(((a, p) for p in periods for a in range(LO, HI - p)), key=lambda t: colcost(col, al, t[0], t[0] + t[1]))
    b = a + p
    x = np.arange(wt)
    return np.where(x < b, x, np.where(x < b + extra, a + (x - b) % p, x - extra))


def season_layer(season, bucket):
    """The season's things over the work area (gen_look.deco, dark), without the dungeon's
    own moss: a zone's stone has no moss spots to recolor."""
    got = {}
    keep_save, keep_washed = GL.save, GL.washed

    def washed(theme, w=994, h=GL.HB, moss_on=False):
        face, moss = keep_washed(theme, w, h, moss_on)
        return face, np.zeros_like(moss)
    GL.save = lambda im, name: got.setdefault('im', im)
    GL.washed = washed
    try:
        GL.deco('dark', season, bucket)
    finally:
        GL.save, GL.washed = keep_save, keep_washed
    return np.array(got['im']).astype(np.float32)


def over(dst, src):
    """dst, src: H x W x 4 float (0-255). src over dst."""
    sa, da = src[..., 3:] / 255, dst[..., 3:] / 255
    oa = sa + da * (1 - sa)
    oc = (src[..., :3] * sa + dst[..., :3] * da * (1 - sa)) / np.maximum(oa, 1e-6)
    return np.dstack([oc, oa * 255])


def deco(col, al, season, bucket):
    W = int(round(GL.HB * bucket / 100 / 2)) * 2
    wt = W - (TABW - TW)                                       # the terminal area in this box shape
    src = columns(col, al, wt)
    out = np.zeros((GL.HB, W, 4), np.float32)
    out[OY:OY + TH, OX:OX + wt, :3] = col[:, src]
    out[OY:OY + TH, OX:OX + wt, 3] = al[:, src] * 255
    if season != 'none':
        # The season's things settle on the scene (gen_look.deco SCENE/GROUND): the scene's
        # cover, and per column the top of its lower part (the floor where nothing stands).
        sc = out[..., 3] > 128
        lo = sc.copy()
        lo[:int(GL.HB * 0.45)] = False
        GL.SCENE, GL.GROUND = sc, np.where(lo.any(0), lo.argmax(0), GL.HB - 8)
        try:
            out = over(out, season_layer(season, bucket))
        finally:
            GL.SCENE = GL.GROUND = None
    return np.clip(out, 0, 255).round().astype(np.uint8)


# ───────────── walls, wall bands, the ledge, panel floors ─────────────
def shade_of(path, r):
    a = np.array(Image.open(path).convert('RGB')).astype(np.float32)
    return c4.box_blur(c4.lum(a), r)


def wall(key, path, h, w):
    """A brick texture (bg-work, strip) in the zone's blocks, its big light kept (chrome4.build lay)."""
    tex = c4.up(c4.ZONES[key]['wall'](3))                     # 820 x 1280
    reps = (-(-h // tex.shape[0]), -(-w // tex.shape[1]), 1)
    tex = np.tile(tex, reps)[:h, :w]
    k = np.clip(shade_of(path, 7)[:h, :w] / 0.096, 0.75, 1.9)
    return np.clip(tex * k[..., None], 0, 255).astype(np.uint8)


def sill(key):
    a = np.array(Image.open(os.path.join(ART, 'sill.png')).convert('RGB')).astype(np.float32)
    return np.clip(np.array(GZ.SILL[key], np.float32) * (c4.lum(a) / 0.25)[..., None], 0, 255).astype(np.uint8)


def floor(key):
    """The panel floor (480 x 1600): the zone's floor (panels9 / floors6), two pieces of
    the 1280 x 820 floor stacked, the old floor's large light kept."""
    src = panels9.FLOORS[key]() if key in panels9.FLOORS else floors6.FLOORS[key]()
    t = c4.up(src)
    a = np.concatenate([t[:820, :480], t[:780, 480:960]], 0)
    k = np.clip(shade_of(os.path.join(ART, 'floor.png'), 40) / 0.119, 0.7, 1.45)
    return np.clip(a * k[..., None], 0, 255).astype(np.uint8)


# A panel's dressing (panels9): drawn once on a big panel, cut into its edges.
DW, DH = 800, 600                                              # dots: 1600 x 1200 px


def dress(key, corner, seed):
    d = tab5.Dots(DW, DH)
    glows = panels9.DRESS[key](d, DW, DH, corner, random.Random(seed))
    c = d.c.repeat(2, 0).repeat(2, 1)
    al = d.a.repeat(2, 0).repeat(2, 1)
    H, W = al.shape
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    gl_c = np.zeros((H, W, 3), np.float32)
    gl_a = np.zeros((H, W), np.float32)
    for gx, gy, rad, col, k in glows:                          # corner light under the things
        g = np.clip(1 - np.hypot(xx - gx * 2, yy - gy * 2) / (rad * 2), 0, 1) ** 2 * k
        gl_c = gl_c * gl_a[..., None] * (1 - g[..., None]) + np.array(col, np.float32) * g[..., None]
        gl_a = g + gl_a * (1 - g)
        gl_c = gl_c / np.maximum(gl_a, 1e-6)[..., None]
    base = np.dstack([gl_c, gl_a * 255])
    return over(base, np.dstack([c, al * 255]))


def dress_parts(key):
    """Edges: top / bottom bands (left and right halves), left / right sides (top and bottom
    halves), and the two bottom corner things, each cut where the dressing ends."""
    plain = dress(key, None, 5)
    A = plain[..., 3]
    H, W = A.shape

    def reach(v):
        nz = np.nonzero(v > 2)[0]
        return int(nz.max()) + 1 if len(nz) else 0
    sdep = max(reach(A[H // 4:3 * H // 4, :W // 2].max(0)), reach(A[H // 4:3 * H // 4, ::-1][:, :W // 2].max(0)))
    tdep = reach(A[:H // 2, sdep:W - sdep].max(1))              # the corners hang deepest
    bdep = reach(A[::-1][:H // 2, sdep:W - sdep].max(1))
    meta = {'top': tdep, 'bottom': bdep, 'side': sdep}
    out = {
        'top-l': plain[:tdep, :W // 2], 'top-r': plain[:tdep, W // 2:],
        'bottom-l': plain[H - bdep:, :W // 2], 'bottom-r': plain[H - bdep:, W // 2:],
        'side-lt': plain[tdep:H // 2, :sdep], 'side-lb': plain[H // 2:H - bdep, :sdep],
        'side-rt': plain[tdep:H // 2, W - sdep:], 'side-rb': plain[H // 2:H - bdep, W - sdep:],
    }
    # The corner thing stands on the bottom band: its bottom half comes with the thing
    # (bottom-l-c / bottom-r-c, the same run), its upper part is the corner piece.
    for corner, half in (('bl', slice(0, W // 2)), ('br', slice(W // 2, W))):
        c = dress(key, corner, 5)
        out[f'bottom-{corner[1]}-c'] = c[H - bdep:, half]
        diff = np.zeros(A.shape, bool)
        diff[:H - bdep, half] = np.abs(c - plain).max(-1)[:H - bdep, half] > 1
        ys, xs = np.nonzero(diff)
        if not len(ys):
            continue
        y0, x0, x1 = ys.min(), xs.min(), xs.max() + 1
        piece = c[y0:H - bdep, x0:x1].copy()
        piece[..., 3] *= diff[y0:H - bdep, x0:x1]
        out[f'corner-{corner}'] = piece
        meta[corner] = [int(x0 if corner == 'bl' else W - x1), int(x1 - x0), int(H - bdep - y0)]
    return out, meta


# ───────────── gold sprites, flames, frame tops ─────────────
FLAMED = {'torch', 'torch-glow', 'sconce', 'sconce-b', 'sconce-halo', 'look/sconce-off'}
SPRITES = ['knob-gold', 'emblem', 'wordmark', 'orn-l', 'orn-r', 'chain', 'torch', 'torch-glow', 'sconce', 'sconce-b', 'sconce-halo']


def recolor(key, name):
    """chrome4.build: gold on the zone's ramp, navy stone in the zone's hue, flames in its fire."""
    z = c4.ZONES[key]
    im = np.array(Image.open(os.path.join(ART, name + '.png')).convert('RGBA')).astype(np.float32)
    a, al = im[..., :3].copy(), im[..., 3]
    hh, ss, vv = c4.hsv(a)
    navy = (hh > 195) & (hh < 285) & (ss > 0.12) & (vv < 0.40)
    hu, sa, va = z['rest']
    a[navy] = c4.rgb(np.full_like(hh, hu), np.clip(ss * sa, 0, 1), np.clip(vv * va, 0, 1))[navy]
    fl = ((hh < 62) | (hh > 340)) & (ss > 0.35) if name in FLAMED else np.zeros_like(navy)
    gold = (hh > 14) & (hh < 74) & (ss > 0.30) & ~fl
    red = ((hh < 14) | (hh > 344)) & (ss > 0.45) & (vv > 0.3)
    if name in ('orn-l', 'orn-r'):                             # 명패의 붉은 핀: 금속 단계로 (chrome4 PLATES)
        gold |= red
    c4.ramp(a, gold, z['ramp'])
    if name == 'knob-gold' and GZ.GEM[key]:                    # 틀 모서리 보석: 구역의 보석색 (gen_zone GEM)
        a[red] = np.clip(np.array(GZ.GEM[key], np.float32) * (0.55 + vv[red, None] * 0.6), 0, 255)
    if z['flame'] is not None and fl.any():
        a[fl] = c4.rgb(np.full_like(hh, z['flame']) + (1 - vv) * 14, np.clip(ss * 0.9, 0, 1), np.clip(vv * 1.05, 0, 1))[fl]
    return np.dstack([np.clip(a, 0, 255), al]).astype(np.uint8)


CAPS = {'ice': ((206, 226, 240), (244, 250, 255), 0.6), 'moss': ((44, 92, 52), (84, 140, 72), 0.4)}


def cap(key):
    """Snow or moss on a gold frame's top edge (gen_zone_mock.cap): a 2560 x 8 band, the
    mounds standing on its bottom row."""
    body, rim, cover = CAPS[key]
    a = np.zeros((8, 2560, 3), np.float32)
    m = np.zeros((8, 2560, 3), np.float32) - 1
    GZ.cap(m, 8, 10, 2550, body, rim, 11, cover)
    al = (m[..., 0] >= 0).astype(np.float32)
    a[al > 0] = m[al > 0]
    return rgba(a, al)


def shard(key):
    """Crystal: the shard grown on a frame's top corners (gen_zone_mock), left one; the right
    one is its mirror in the other color."""
    v = {'h': (198, 174, 244), 'l': (136, 104, 208), 'm': (92, 64, 154), 'd': (56, 38, 104)}
    k = {'h': (240, 196, 226), 'l': (196, 118, 174), 'm': (132, 70, 118), 'd': (82, 40, 76)}
    out = {}
    for tag, pal, flip in (('l', v, False), ('r', k, True)):
        rows = c4.SHARD_S
        h, w = len(rows), len(rows[0])
        a = np.zeros((h * 2, w * 2, 4), np.uint8)
        for j, r in enumerate(rows):
            r = r[::-1] if flip else r
            for i, ch in enumerate(r):
                if ch in pal:
                    a[j * 2:j * 2 + 2, i * 2:i * 2 + 2] = (*pal[ch], 255)
        out[tag] = a
    return out


def card(key):
    """The settings card: the mockup's whole screen, small."""
    a, _ = GZ.screen(key, tab5.talk)
    tab5.rec_stop()
    return np.array(Image.fromarray(a).convert('RGB').resize((128, 80), Image.LANCZOS))


def zone(key):
    Z = os.path.join(ART, 'zone', key)
    stone, col, al, z = split(key)
    base = tablet(stone)
    for ph in PHASES:
        save(lit(base, ph), os.path.join(LOOK, f'tablet-{key}-{ph}.png'))
    for se in SEASONS:
        for b in BUCKETS:
            save(deco(col, al, se, b), os.path.join(LOOK, f'deco-{key}-{se}-{b}.png'))
    save(wall(key, os.path.join(ART, 'bg-work.png'), 800, 1280), os.path.join(Z, 'bg-work.png'))
    save(wall(key, os.path.join(ART, 'strip.png'), 48, 2560), os.path.join(Z, 'strip.png'))
    save(sill(key), os.path.join(Z, 'sill.png'))
    save(floor(key), os.path.join(Z, 'floor.png'))
    if key in panels9.DRESS:
        parts, meta = dress_parts(key)
        print('DRESS', key, json.dumps(meta))                  # zones.js DRESS
        for n, piece in parts.items():
            if piece.size == 0:
                continue
            save(np.clip(piece, 0, 255).round().astype(np.uint8), os.path.join(Z, f'dress-{n}.png'))
    for n in SPRITES:
        save(recolor(key, n), os.path.join(Z, f'{n}.png'))
    if key in CAPS:
        save(cap(key), os.path.join(Z, 'cap.png'))
    if key == 'crystal':
        for t, a in shard(key).items():
            save(a, os.path.join(Z, f'shard-{t}.png'))
    save(card(key), os.path.join(Z, 'card.png'))
    print(key, 'ok', len(os.listdir(Z)), 'files in zone/' + key)


if __name__ == '__main__':
    for k in sys.argv[1:] or ZONES:
        zone(k)
