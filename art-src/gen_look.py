"""Pixel Quest time of day and seasons: the art behind mods/pixel-quest/look.js.

    python3 art-src/gen_look.py [out-folder]     (default mods/pixel-quest/art/look)

The approved mockup (v3, 2026-11-11) was painted over screenshots; this draws the same
things as the layers Herdr shows:

  tablet-<theme>-<phase>.png         the stone tablet behind the terminals (main-wrap),
                                     moss left out, lit for the time of day. Herdr draws
                                     terminals over it with terminal_opacity 0, so the
                                     theme background the 0.3 opacity used to lay over it
                                     is baked in here (measured: 0.494 x art + 0.5 x bg).
  deco-<theme>-<season>-<bucket>.png the see-through layer on main: moss (recolored by
                                     season) and the season's things, one per box shape
                                     (bucket = width/height x 100) so corners stay in view.
  win-<theme>-<phase>[-r].png        the tab bar's windows (sky, sun, moon)
  cap-<theme>-<season>.png           what lies on the sidebar panels' and pane header's top edge
  pile-<theme>-<season>.png          what lies on the sidebar panels' floor
  bg-slate-<phase>.png               the light look's outer wall, dimmed (the mod's own
                                     stone textures get a see-through veil instead)
  sconce-off.png, glow-warm.png, glow-candle.png, torch*-green.png ...

phase: dawn day dusk night none   season: winter xmas spring summer autumn halloween none
Seeded: a rerun writes the same pixels. Needs numpy and Pillow.
Copyright (c) 2026 cubha. MIT License.
"""
import math
import os
import random
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from gen_tablet import slab, DARK as TAB_DARK, LIGHT as TAB_LIGHT  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
ART = os.path.join(ROOT, 'mods/pixel-quest/art')
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ART, 'look')
os.makedirs(OUT, exist_ok=True)

BUCKETS = [85, 115, 136, 170, 210]          # look.js BUCKETS
PHASES = ['dawn', 'day', 'dusk', 'night', 'none']
SEASONS = ['winter', 'xmas', 'spring', 'summer', 'autumn', 'halloween', 'none']
BG = {'dark': (18, 23, 49), 'light': (228, 232, 240)}     # themes/*.json background
WASH = 0.494
DIM = {'dawn': (0.84, 0.81, 0.88), 'dusk': (0.86, 0.78, 0.76), 'night': (0.64, 0.68, 0.84)}   # look.js DIM
HB = 732                                    # decoration height (the tablet's)
HEAD = 39                                   # just under the pane header (32 + borders)

# The mockup's colors per theme (confirmed/gen_v2.py C).
C = {
    'light': dict(snow=(240, 244, 252), snow_hi=(150, 166, 198), frozen=(186, 202, 228), ice=((120, 150, 205), (70, 100, 160)),
                  spring=(120, 176, 110), summer=(84, 160, 90), autumn=(196, 128, 70), hallow=(150, 120, 180),
                  flowers=[(226, 110, 150), (236, 180, 60), (150, 110, 210), (240, 150, 182)], blossom=((226, 110, 150), (248, 170, 196)),
                  web=(120, 126, 146), wire=(60, 66, 84), leafk=1.0, prop=1.0, glowk=1.7),
    'dark': dict(snow=(88, 102, 138), snow_hi=(126, 142, 180), frozen=(70, 84, 120), ice=((176, 204, 240), (112, 140, 196)),
                 spring=(66, 136, 66), summer=(52, 132, 62), autumn=(150, 78, 30), hallow=(74, 44, 96),
                 flowers=[(255, 204, 222), (240, 150, 182), (255, 240, 170), (236, 236, 255)], blossom=((240, 150, 182), (255, 204, 222)),
                 web=(120, 122, 150), wire=(20, 22, 34), leafk=0.72, prop=0.88, glowk=1.0),
}
LEAF = [(30, 84, 50), (48, 118, 64), (74, 146, 76)]
AUT = [(196, 70, 36), (226, 126, 32), (236, 180, 60), (150, 56, 30), (120, 80, 40)]


def save(im, name):
    im.save(os.path.join(OUT, name), optimize=True)


def vnoise(seed, h, w, cell):
    r = np.random.default_rng(seed)
    g = r.uniform(0, 1, (h // cell + 3, w // cell + 3)).astype(np.float32)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    y, x = yy / cell, xx / cell
    y0, x0 = y.astype(int), x.astype(int)
    fy, fx = y - y0, x - x0
    fy, fx = fy * fy * (3 - 2 * fy), fx * fx * (3 - 2 * fx)
    return (g[y0, x0] * (1 - fx) + g[y0, x0 + 1] * fx) * (1 - fy) + (g[y0 + 1, x0] * (1 - fx) + g[y0 + 1, x0 + 1] * fx) * fy


# The mockup (gen_v2.py) drew on a 1280 x 820 screen whose work area starts at (278, 47).
MOCK_W, MOCK_H, MOCK_X, MOCK_Y, MOCK_TW = 1280, 820, 278, 47, 996
MOSS_DROP = 51                              # the mockup's slab top (screen y 98) under the work area's (47)


def screen_noise(seed, h, w, cell):
    """vnoise as the mockup drew it on screen, cut out for a decoration h x w.

    The left half reads the screen from the work area's left edge, the right half from
    its right edge (as on the usual 136 box), blended over the middle 80px, so both
    corners grow the mockup's moss on every box shape."""
    r = np.random.default_rng(seed)
    gh, gw = MOCK_H // cell + 3, MOCK_W // cell + 3
    g = r.uniform(0, 1, (gh, gw)).astype(np.float32)
    extra = np.random.default_rng(seed + 1000).uniform(0, 1, (gh + 40, gw + 40)).astype(np.float32)
    extra[:gh, :gw] = g
    g = extra

    def at(yy, xx):
        y, x = np.clip(yy / cell, 0, g.shape[0] - 2.001), np.clip(xx / cell, 0, g.shape[1] - 2.001)
        y0, x0 = y.astype(int), x.astype(int)
        fy, fx = y - y0, x - x0
        fy, fx = fy * fy * (3 - 2 * fy), fx * fx * (3 - 2 * fx)
        return (g[y0, x0] * (1 - fx) + g[y0, x0 + 1] * fx) * (1 - fy) + (g[y0 + 1, x0] * (1 - fx) + g[y0 + 1, x0 + 1] * fx) * fy

    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    left = at(yy + MOCK_Y, xx + MOCK_X)
    right = at(yy + MOCK_Y, xx - w + MOCK_TW + MOCK_X)
    k = np.clip((xx - (w / 2 - 40)) / 80, 0, 1)
    return left * (1 - k) + right * k


def sprite(rows, pal, scale=2):
    h, w = len(rows), max(len(r) for r in rows)
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch in pal:
                im.putpixel((x, y), tuple(pal[ch]) + (255,))
    return np.array(im.resize((w * scale, h * scale), Image.NEAREST)).astype(np.float32)


class Layer:
    """A see-through layer painted like the mockup painted its screenshot: every
    operation lays a color at some coverage over what is there (straight alpha)."""

    def __init__(self, w, h):
        self.w, self.h = w, h
        self.rgb = np.zeros((h, w, 3), np.float32)
        self.a = np.zeros((h, w), np.float32)
        self.yy, self.xx = np.mgrid[0:h, 0:w].astype(np.float32)

    def over(self, m, col):
        """Lays col (a color or an h x w x 3 array) at coverage m (0..1, h x w)."""
        m = np.clip(np.asarray(m, np.float32), 0, 1)
        a2 = m + self.a * (1 - m)
        c = np.broadcast_to(np.asarray(col, np.float32), self.rgb.shape)
        num = c * m[..., None] + self.rgb * (self.a * (1 - m))[..., None]
        self.rgb = np.where(a2[..., None] > 0, num / np.maximum(a2, 1e-6)[..., None], self.rgb)
        self.a = a2

    def px(self, x, y, col, s=2):
        x, y = int(x) // 2 * 2 if s == 2 else int(x), int(y)
        if x < 0 or y < 0 or x + s > self.w or y + s > self.h:
            return
        self.rgb[y:y + s, x:x + s] = col
        self.a[y:y + s, x:x + s] = 1

    def paste(self, spr, x, y, flip=False, dim=1.0):
        if flip:
            spr = spr[:, ::-1]
        h, w = spr.shape[:2]
        x, y = int(x), int(y)
        x0, y0, x1, y1 = max(0, x), max(0, y), min(self.w, x + w), min(self.h, y + h)
        if x1 <= x0 or y1 <= y0:
            return
        s = spr[y0 - y:y1 - y, x0 - x:x1 - x]
        m = np.zeros((self.h, self.w), np.float32)
        m[y0:y1, x0:x1] = s[..., 3] / 255
        c = np.zeros((self.h, self.w, 3), np.float32)
        c[y0:y1, x0:x1] = s[..., :3] * dim
        self.over(m, c)

    def glow(self, cx, cy, rad, col, k, light, power=1.5):
        """The mockup's glow: added light on dark, tinted toward the color on light."""
        d = np.hypot(self.xx - cx, self.yy - cy) / rad
        m = np.clip(1 - d, 0, 1) ** power
        self.over(m * min(1.0, k * (1.7 if light else 1.15)), col)

    def image(self):
        out = np.dstack([np.clip(self.rgb, 0, 255), np.clip(self.a * 255, 0, 255)]).astype(np.uint8)
        return Image.fromarray(out, 'RGBA')


# ───────────── the tablet, by time of day ─────────────
def washed(theme, w=994, h=HB, moss_on=False):
    face, moss = slab(TAB_LIGHT if theme == 'light' else TAB_DARK, w, h, moss_on)
    return face * WASH + 0.5 * np.array(BG[theme], np.float32), moss


# Windows sit 121 / 125 px either side of the torch; the tablet's centre is under the torch.
def shaft_band(yy, xx, cx_win, slope, reach=640, w0=22, spread=0.20):
    d = yy - 3                               # the mockup measured from screen y 50 = tablet y 3
    half = w0 / 2 + spread * d
    u = (xx - (cx_win + slope * d)) / np.maximum(half, 1)
    band = np.clip(1 - np.abs(u), 0, 1) ** 0.6 * (1 - 0.55 * np.exp(-(u / 0.10) ** 2))
    return band * np.clip(1 - d / reach, 0, 1) ** 1.3 * (d > 0)


def tablet(theme, phase):
    a, _ = washed(theme)
    H, W = a.shape[:2]
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    cx = W / 2
    L, R = cx - 121, cx + 125
    if theme == 'dark':
        dither = 0.86 + 0.14 * ((xx // 2 + yy // 2) % 2)
        def add(m, col, k):
            a[:] = np.clip(a + (m * k * dither)[..., None] * np.array(col, np.float32), 0, 255)
        def torch(k, rad=360):
            add(np.clip(1 - np.hypot(xx - cx, (yy - 3) * 1.1) / rad, 0, 1) ** 1.7 / dither, (255, 150, 60), k)
        if phase == 'dawn':
            add(shaft_band(yy, xx, L, 0.62), (255, 150, 150), 0.085)
            add(shaft_band(yy, xx, R, 0.62, reach=420), (255, 150, 150), 0.05)
        elif phase == 'day':
            add(shaft_band(yy, xx, L, -0.10, reach=760), (255, 236, 190), 0.105)
            add(shaft_band(yy, xx, R, 0.10, reach=760), (255, 236, 190), 0.105)
        elif phase == 'dusk':
            add(shaft_band(yy, xx, R, -0.66), (255, 120, 40), 0.115)
            add(shaft_band(yy, xx, L, -0.66, reach=420), (255, 120, 40), 0.06)
            torch(0.05)
        elif phase == 'night':
            d = np.clip(np.hypot((xx - cx) / 640, (yy - 13) / 720), 0, 1)
            a *= (1 - 0.38 * d)[..., None]
            add(shaft_band(yy, xx, L, 0.22, reach=560, w0=18, spread=0.13), (110, 150, 255), 0.075)
            torch(0.17)
    else:
        base = a.copy()
        def relight(m, tint):
            m = np.clip(m, 0, 1)[..., None]
            a[:] = a * (1 - m) + np.clip(base * np.array(tint, np.float32), 0, 255) * m
        if phase == 'day':
            for wx, sl in ((L, -0.10), (R, 0.10)):
                a[:] = np.clip(a + (shaft_band(yy, xx, wx, sl, reach=760) * 0.06)[..., None] * np.array((255, 250, 225), np.float32), 0, 255)
        elif phase in DIM:
            warm = {'dawn': 0.55, 'dusk': 0.7, 'night': 1.0}[phase]
            a *= np.array(DIM[phase], np.float32)
            if phase == 'dawn':
                relight(shaft_band(yy, xx, L, 0.62) * 0.8, (1.0, 0.88, 0.90))
                relight(shaft_band(yy, xx, R, 0.62, reach=420) * 0.5, (1.0, 0.88, 0.90))
            elif phase == 'dusk':
                relight(shaft_band(yy, xx, R, -0.66) * 0.9, (1.0, 0.84, 0.70))
                relight(shaft_band(yy, xx, L, -0.66, reach=420) * 0.5, (1.0, 0.84, 0.70))
            else:
                relight(shaft_band(yy, xx, L, 0.22, reach=560, w0=18, spread=0.13) * 0.55, (0.80, 0.86, 1.0))
            relight(np.clip(1 - np.hypot(xx - cx, (yy - 3) * 1.05) / 470, 0, 1) ** 1.5 * warm * 0.95, (1.0, 0.90, 0.70))
    save(Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)), f'tablet-{theme}-{phase}.png')


# ───────────── the decoration layer, by season and box shape ─────────────
# A zone's scene under the season's things (gen_zones.py sets these while it draws a zone's
# decorations, None otherwise): SCENE = the scene's cover (H x W bool), GROUND = per column,
# the top of the scene's lower part (or the floor). The season's things then settle on the
# zone's things instead of burying them, and the props stand on flat ground.
SCENE = None
GROUND = None


def deco(theme, season, bucket):
    light = theme == 'light'
    c = C[theme]
    H = HB
    W = int(round(H * bucket / 100 / 2)) * 2
    ly = Layer(W, H)
    yy, xx = ly.yy, ly.xx
    face, moss = washed(theme, W, H, moss_on=True)
    # In the mockup the slab began under the pane header and its foot ran past the work
    # area: its moss sat MOSS_DROP lower, the bottom of it out of sight. Same here.
    face, moss = np.roll(face, MOSS_DROP, axis=0), np.roll(moss, MOSS_DROP, axis=0)
    moss[:MOSS_DROP] = False
    n1, n2, n3 = vnoise(1, H, W, 90), vnoise(2, H, W, 26), vnoise(3, H, W, 7)
    L, R, T, B = 4, W - 4, HEAD + 2, H - 8
    mid = W / 2
    SC = SCENE if SCENE is not None else np.zeros((H, W), bool)
    G = np.minimum(GROUND, B) if GROUND is not None else np.full(W, B)

    def spot(x0, x1):
        """A sprite's place: the nearest x to x0 where the ground under it is flat, and how
        far the ground rose there (0 on the bare floor)."""
        if SCENE is None:
            return int(x0), 0
        w = int(x1 - x0)
        for d in range(0, W, 2):
            for x in (int(x0) + d, int(x0) - d):
                if 0 <= x and x + w <= W:
                    g = G[x + w // 4:x + w - w // 4]
                    if g.max() - g.min() <= 4:
                        return x, int(g.min()) - B
        return int(x0), 0

    def settle(h_floor, hc, k):
        """Where the season's stuff lies over a zone's scene: as deep as on the bare floor
        where nothing stands, a cap on the zone's things, its top line smoothed so it fills
        the gaps between them but never banks far above its own ground."""
        depth = np.minimum(hc + np.maximum(0, h_floor - (B - G)) * k, 90)
        top = G - depth
        top = np.convolve(np.pad(top, 15, mode='edge'), np.ones(31) / 31, mode='valid')
        top = np.minimum(np.maximum(top, G - depth - 12), G - 2)[None, :]
        return (yy >= top) & (yy < G[None, :]) & (xx >= L) & (xx < R) & ~SC, top

    def caps(cols, k=2, seed=5, dens=1.0):
        """The season's stuff on every upward face of a zone's things, k px deep."""
        if SCENE is None:
            return
        up = SC & ~np.roll(SC, 2, 0)
        lay = np.zeros((H, W), bool)
        for d in range(2, k + 2, 2):
            lay |= np.roll(up, -d, 0)
        lay &= ~SC
        rr = np.random.default_rng(seed)
        idx = rr.integers(0, len(cols), (H // 2 + 1, W // 2 + 1)).repeat(2, 0).repeat(2, 1)[:H, :W]
        keep = (rr.random((H // 2 + 1, W // 2 + 1)) < dens).repeat(2, 0).repeat(2, 1)[:H, :W]
        ly.over((lay & keep).astype(np.float32), np.array(cols, np.float32)[idx])

    def moss_layer(col=None, k=0.85, grow=0.0):
        m = moss.astype(np.float32)
        ly.over(m, face)                                  # the tablet's own moss
        if col is None:
            return m
        if grow and SCENE is None:
            s1, s2 = screen_noise(1, H, W, 90), screen_noise(2, H, W, 26)   # the mockup's own blobs
            g = np.clip((s1 * 0.7 + s2 * 0.3 - (1 - grow)) * 6, 0, 1) * (yy > 513) * 0.8
            m = np.clip(m + g, 0, 1)
        shade = (0.75 + 0.5 * n3)[..., None]
        ly.over(m * k, np.array(col, np.float32) * shade)
        return m

    def drift(base_h=10, corner_h=64):
        xr = xx - L
        wd = R - L
        h = base_h + corner_h * (np.exp(-(xr / (wd * 0.22)) ** 2) + np.exp(-((wd - xr) / (wd * 0.18)) ** 2)) + (n2 - 0.5) * base_h * 1.6
        if SCENE is None:
            top = B - h
            inside = (yy >= top) & (yy < B) & (xx >= L) & (xx < R)
        else:
            inside, top = settle(h[0], 6, 0.6)
        k = 0.9 if light else 1.0                         # dark snow is solid: no wall showing through
        ly.over(inside * k, c['snow'])
        ly.over((inside & (yy < top + 3)) * k, c['snow_hi'])
        ly.over((inside & (n3 > 0.72)) * 0.25, c['snow_hi'])

    def icicles(seed=4, n=46, maxlen=20):
        r = random.Random(seed)
        n = int(n * (R - L) / 986)
        for _ in range(n):
            x = r.randrange(L, R - 8, 2)
            ln = r.choice([6, 8, 8, 10, 12, 14, maxlen])
            wd = 6 if ln > 12 else 4
            for j in range(0, ln, 2):
                ww = max(2, wd - (j * wd // ln) // 2 * 2)
                for i in range(0, ww, 2):
                    ly.px(x + (wd - ww) // 2 + i, HEAD + j, c['ice'][0] if i == 0 else c['ice'][1])

    def vine(x, y, length, seed, cols=LEAF, stem=(28, 70, 44), bloom=None):
        r = random.Random(seed)
        cx = x
        for j in range(0, length, 2):
            cx += r.choice([-2, 0, 0, 0, 2])
            ly.px(cx, y + j, stem)
            if j % 6 == 0:
                side = r.choice([-1, 1])
                col = r.choice(cols)
                for (dx, dy) in [(2, 0), (4, 0), (2, 2), (4, -2)]:
                    ly.px(cx + side * dx, y + j + dy, col)
                if bloom and r.random() < 0.3:
                    ly.px(cx - side * 2, y + j, r.choice(bloom))

    def ivy(spans, seed, **kw):
        r = random.Random(seed)
        for (x0, x1, lmin, lmax, n) in spans:
            for _ in range(n):
                vine(r.randrange(int(x0), int(x1), 2), HEAD, r.randrange(lmin, lmax, 2), r.random(), **kw)

    def scatter(n, seed, rect, cols, mask=None, heap=True, shapes=None):
        r = random.Random(seed)
        x0, y0, x1, y1 = rect
        shapes = shapes or [[(0, 0), (2, 0), (0, 2)], [(0, 0), (2, 0), (2, 2)], [(0, 0), (2, 0)], [(0, 0), (0, 2), (2, 2), (2, 0)]]
        for _ in range(n):
            t = r.random() ** 2.2 if heap else r.random()
            y = y1 - 4 - t * (y1 - y0)
            e = r.random()
            x = x0 + (e ** 2 if r.random() < 0.5 else 1 - e ** 2) * (x1 - x0 - 6) if heap else r.uniform(x0, x1 - 6)
            col = r.choice(cols)
            for dx, dy in r.choice(shapes):
                X, Y = int(x) // 2 * 2 + dx, int(y) // 2 * 2 + dy
                if mask is not None and not (0 <= X < W and 0 <= Y < H and mask[Y, X]):
                    continue
                ly.px(X, Y, col)

    def pile(cols, base_h=4, corner_h=44, seed=9):
        r = np.random.default_rng(seed)
        wd = R - L
        xr = xx - L
        h = base_h + corner_h * (np.exp(-(xr / (wd * 0.16)) ** 2) + np.exp(-((wd - xr) / (wd * 0.14)) ** 2)) + (n2 - 0.5) * 14
        if SCENE is None:
            inside = (yy >= B - h) & (yy < B) & (xx >= L) & (xx < R)
        else:
            inside, _ = settle(h[0], 4, 0.5)
        idx = r.integers(0, len(cols), (H // 4 + 1, W // 4 + 1))
        idx = np.repeat(np.repeat(idx, 4, 0), 4, 1)[:H, :W]
        idx = np.where((yy // 4) % 2 == 0, np.roll(idx, 2, 1), idx)
        tex = np.array(cols, np.float32)[idx.astype(int)]
        tex = np.where((r.random((H, W)) < 0.10)[..., None], tex * 0.6, tex)
        ly.over(inside.astype(np.float32), tex)

    def branch():
        r = random.Random(11)
        pts = []
        x, y = R - 2.0, HEAD + 10.0
        for i in range(190):
            x -= 2
            y += 0.34 + 0.5 * math.sin(i / 11)
            ly.px(x, y, (92, 60, 46))
            ly.px(x, y + 2, (64, 42, 34))
            if i < 90:
                ly.px(x, y - 2, (110, 74, 56))
            pts.append((x, y))
            if i % 16 == 8:
                tx, ty = x, y
                for _ in range(r.randint(8, 16)):
                    tx -= 2
                    ty += r.choice([2, 2, 0]) * r.choice([1, 1, -1])
                    ly.px(tx, ty, (92, 60, 46))
                    pts.append((tx, ty))
        c1, c2 = c['blossom']
        for (bx, by) in pts[::2]:
            if r.random() < 0.8:
                ox, oy = r.choice([-6, -4, -2, 0, 2, 4, 6]), r.choice([-8, -6, -4, -2, 2, 4, 6])
                for dx, dy, col in [(0, 0, c2), (2, 0, c1), (-2, 0, c1), (0, 2, c1), (0, -2, c1)]:
                    ly.px(bx + ox + dx, by + oy + dy, col)

    def cobweb(cx, cy, rad):
        for k in range(7):
            ang = math.radians(4 + k * 13.5)
            for t in range(0, rad, 2):
                ly.px(cx - t * math.cos(ang), cy + t * math.sin(ang), c['web'])
        for ring in range(22, rad, 22):
            for k in range(6):
                a0, a1 = math.radians(4 + k * 13.5), math.radians(4 + (k + 1) * 13.5)
                for s in range(12):
                    t = s / 11
                    ang = a0 + (a1 - a0) * t
                    rr = ring * (1 - 0.13 * math.sin(math.pi * t))
                    ly.px(cx - rr * math.cos(ang), cy + rr * math.sin(ang), c['web'])

    def lights(y):
        cols = [(255, 90, 90), (255, 214, 90), (110, 220, 130), (110, 170, 255)]
        span, i = 124, 0
        for sx in range(L + 6, R - 26, span):
            for t in range(0, span, 2):
                sag = 14 * math.sin(math.pi * t / span)
                ly.px(sx + t, y + sag, c['wire'])
                if t % 20 == 10:
                    col = cols[i % 4]; i += 1
                    bx, by = sx + t, y + sag + 2
                    ly.glow(bx + 2, by + 3, 13, col, 0.30, light)
                    for dx, dy in [(0, 0), (0, 2), (-2, 2), (2, 2), (0, 4)]:
                        ly.px(bx + dx, by + dy, col)

    if season == 'none':
        moss_layer()
    elif season in ('winter', 'xmas'):
        moss_layer(c['frozen'], 0.9)
        drift()
        caps([c['snow'], c['snow'], c['snow_hi']], k=4, seed=7)
        icicles()
        if season == 'xmas':
            lights(HEAD + 14)
            tx, rise = spot(R - 72, R - 30)
            ly.paste(TREE, tx, B - 78 + rise, dim=c['prop'])
    elif season == 'spring':
        m = moss_layer(c['spring'], 0.6, grow=0.30)
        scatter(420 * W // 994, 21, (L, 493, R, B), c['flowers'], mask=m > 0.35, heap=False,
                shapes=[[(0, 0), (2, 0), (0, 2), (-2, 0), (0, -2)], [(0, 0), (2, 0), (0, 2), (2, 2)], [(0, 0)]])
        branch()
        pile([(190, 120, 146), (214, 160, 180), (170, 100, 130)], base_h=3, corner_h=10)
        caps([(190, 120, 146), (214, 160, 180), (170, 100, 130)], k=2, seed=8, dens=0.55)
    elif season == 'summer':
        moss_layer(c['summer'], 0.7, grow=0.30)
        ivy([(L, L + 66, 20, 70, 4), (L + 66, R - 296, 8, 34, max(1, int(16 * (R - L - 362) / 624))),
             (R - 296, R - 66, 50, 172, 14), (R - 66, R - 2, 20, 150, 4)], 41)
        for sx in (22, W - 152, W - 82):              # glowing mushrooms in the moss (lit, still)
            for dx in (0, 14, 30):
                cx, cy = sx + dx, 695 - (dx % 9) + spot(sx + dx - 2, sx + dx + 2)[1]
                ly.glow(cx, cy, 16, (110, 220, 160) if light else (120, 255, 170), 0.32, light)
                ly.px(cx - 2, cy - 2, (170, 255, 200)); ly.px(cx, cy - 2, (170, 255, 200)); ly.px(cx - 1, cy, (90, 150, 120))
    elif season == 'autumn':
        moss_layer(c['autumn'], 0.8, grow=0.10)
        dark = [tuple(int(v * c['leafk']) for v in col) for col in AUT]
        pile(dark)
        caps(dark + AUT, k=2, seed=9, dens=0.7)
        scatter(70 * W // 994, 61, (L, 643, R, B), AUT, mask=None if SCENE is None else ~SC)
        ivy([(R - 296, R - 66, 50, 172, 12), (L, L + 56, 16, 60, 3)], 62,
            cols=[(160, 58, 30), (190, 104, 28), (200, 150, 50)], stem=(70, 44, 30))
    elif season == 'halloween':
        moss_layer(c['hallow'], 0.75)
        if not light:
            ly.over(np.clip(1 - np.hypot(xx - mid, (yy - 3) * 1.1) / 330, 0, 1) ** 1.7 * 0.08, (60, 255, 120))
        cobweb(R - 4, T + 2, 170)
        for (x, y, fl) in [(22, 681, False), (74, 691, True), (W - 142, 687, False)]:
            x, rise = spot(x, x + 44)
            y += rise
            ly.glow(x + 22, y + 18, 70, (255, 196, 120) if light else (255, 150, 40), 0.20, light, power=1.6)
            ly.paste(PUMPKIN, x, y, flip=fl, dim=c['prop'])
        for x in (mid - 215, mid - 175, mid + 125):
            ly.paste(BATHANG, x, HEAD)
    save(ly.image(), f'deco-{theme}-{season}-{bucket}.png')


def pumpkin(w=22, h=17):
    rows = []
    for j in range(h):
        row = ''
        for i in range(w):
            u, v = (i - w / 2 + 0.5) / (w / 2), (j - h / 2 - 1) / (h / 2 - 1)
            d = u * u + v * v
            if j < 2 and abs(i - w / 2) < 1.5:
                row += 't'
            elif d < 1:
                rib = abs(((i + 1) % 5) - 2) == 2
                row += 'k' if d > 0.80 else ('o' if rib else 'O')
            else:
                row += '.'
        rows.append(row)
    g = [list(r) for r in rows]
    for (x, y) in [(6, 7), (7, 7), (7, 6), (14, 7), (15, 7), (14, 6), (10, 9), (11, 9)] + [(i, 12) for i in range(6, 16)] + [(i, 11) for i in (6, 9, 12, 15)] + [(i, 13) for i in (8, 11, 14)]:
        g[y][x] = 'y'
    return sprite([''.join(r) for r in g], {'t': (64, 100, 40), 'k': (120, 52, 14), 'o': (176, 82, 18), 'O': (226, 126, 32), 'y': (255, 226, 110)})


def tree(h=30):
    rows = [['.'] * 21 for _ in range(h)]
    r = random.Random(5)
    for j in range(2, h - 4):
        tier = (j - 2) % 8
        half = 2 + tier + (j - 2) // 8 * 2
        for i in range(10 - half, 11 + half):
            if 0 <= i < 21:
                rows[j][i] = 'G' if (i + j) % 3 == 0 else 'g'
        if tier == 7:
            for i in range(10 - half, 11 + half, 3):
                if 0 <= i < 21:
                    rows[j][i] = r.choice('rby')
    rows[0][10] = rows[1][10] = 'y'; rows[1][9] = rows[1][11] = 'y'
    for j in range(h - 4, h):
        rows[j][9] = rows[j][10] = rows[j][11] = 't'
    return sprite([''.join(x) for x in rows], {'g': (26, 88, 52), 'G': (52, 128, 68), 'r': (226, 64, 64), 'b': (96, 156, 244), 'y': (255, 220, 90), 't': (96, 62, 38)})


PUMPKIN = pumpkin()
TREE = tree()
BATHANG = sprite(['..k...k..', '.kkk.kkk.', 'kkkkkkkkk', 'kkkkkkkkk', 'kkkKKKkkk', '.kkrKrkk.', '.kkKKKkk.', '..kkKkk..', '...k.k...'],
                 {'k': (58, 44, 78), 'K': (84, 66, 108), 'r': (240, 80, 80)})
WREATH = sprite(['....gGGg....', '..gGgggGGg..', '.gGg.rr.gGg.', '.gg......gg.', 'gGr......gGr', 'gg........gg',
                 'Gg........gG', 'ggr......rgg', '.gG..RR..Gg.', '.gGgRrrRgGg.', '..ggGRRGgg..', '....R..R....'],
                {'g': (34, 110, 60), 'G': (70, 160, 80), 'r': (220, 50, 50), 'R': (180, 30, 40)})


# ───────────── the tab bar, the sidebar panels' edges and floors ─────────────
WIN_SHAPE = ['....ssssss....', '..ssSSSSSSss..', '.sSaaaaaaaaSs.', '.saaaaaaaaaas.', 'sSaaaaaaaaaaSs'] + ['saaaaaaaaaaaas'] * 10 + ['sSSSSSSSSSSSSs', 'ssssssssssssss']
SKY = {
    'dawn': dict(top=(92, 96, 170), bot=(255, 170, 150), sun=(255, 226, 170), sun_at=(7, 12), stars=1),
    'day': dict(top=(88, 160, 240), bot=(170, 214, 255), sun=(255, 236, 120), sun_at=(9, 5), cloud=1),
    'dusk': dict(top=(90, 60, 130), bot=(255, 130, 60), sun=(255, 200, 90), sun_at=(5, 12)),
    'night': dict(top=(10, 14, 40), bot=(26, 34, 80), moon=1, stars=3),
}
MOON = {(3, 4), (4, 3), (2, 5), (2, 6), (2, 7), (3, 8), (4, 9), (5, 9), (3, 5), (3, 6), (3, 7), (4, 8), (5, 3)}


def window(theme, phase, mirror):
    stone, hi, bar = ((92, 100, 120), (128, 136, 156), (50, 56, 74)) if theme == 'light' else ((64, 70, 104), (96, 102, 140), (10, 12, 24))
    s = SKY[phase]
    hh, ww = len(WIN_SHAPE), len(WIN_SHAPE[0])
    im = Image.new('RGBA', (ww, hh), (0, 0, 0, 0))
    r = random.Random(phase)
    for j, row in enumerate(WIN_SHAPE):
        for i, ch in enumerate(row):
            if ch == '.':
                continue
            if ch in 'sS':
                col = stone if ch == 's' else hi
            else:
                t = (j - 2) / 12
                col = tuple(int(s['top'][k] * (1 - t) + s['bot'][k] * t) for k in range(3))
                if s.get('sun') and math.hypot(i - s['sun_at'][0], j - s['sun_at'][1]) < 2.2:
                    col = s['sun']
                if s.get('cloud') and j in (9, 10) and 2 <= i <= 6 - (j - 9):
                    col = (240, 246, 255)
                if s.get('moon') and (i, j) in MOON:
                    col = (236, 240, 255)
            im.putpixel((ww - 1 - i if mirror else i, j), col + (255,))
    for _ in range(s.get('stars', 0)):
        x, y = r.randint(3, 10), r.randint(3, 8)
        im.putpixel((ww - 1 - x if mirror else x, y), (255, 250, 220, 255) if phase == 'night' else (255, 236, 220, 255))
    for j in range(2, 15):
        im.putpixel((6, j), bar + (255,))      # the mullion (mockup: x + 13 screen px)
    for i in range(1, 13):
        im.putpixel((i, 8), bar + (255,))
    im = im.resize((ww * 2, hh * 2), Image.NEAREST)
    save(im, f'win-{theme}-{phase}{"-r" if mirror else ""}.png')


def cap(theme, season):
    """What lies on a frame's top edge, 2560 x 8: snow caps or the season's leaves."""
    w, h = 2560, 8
    a = np.zeros((h, w, 4), np.uint8)
    r = random.Random(3 if season in ('winter', 'xmas') else 7)
    if season in ('winter', 'xmas'):
        x = 0
        while x < w:
            hgt, run = r.choice([4, 6, 6, 8]), r.choice([6, 8, 10, 14])
            if theme == 'light':
                hgt = min(hgt, 6)
                a[h - hgt - 2:h - hgt, x:x + run] = (120, 136, 170, 255)
            a[h - hgt:h, x:x + run] = (240, 246, 255, 255)
            a[h - 2:h, x:x + run] = (190, 208, 236, 255)
            x += run
    else:
        cols, every = {'spring': ([(240, 150, 182), (255, 204, 222), (92, 176, 88)], 26),
                       'summer': ([(52, 132, 62), (92, 176, 88), (34, 96, 56)], 18),
                       'autumn': (AUT[:3], 30),
                       'halloween': ([(74, 44, 96), (120, 122, 150)], 60)}[season]
        for _ in range(w // every):
            x = r.randrange(0, w - 8, 2)
            a[h - 4:h, x:x + 4] = r.choice(cols) + (255,)
            a[h - 2:h, x + 4:x + 6] = r.choice(cols) + (255,)
            if r.random() < 0.4:
                a[h - 6:h - 4, x + 2:x + 4] = r.choice(cols) + (255,)
    save(Image.fromarray(a, 'RGBA'), f'cap-{theme}-{season}.png')


def pile_strip(theme, season):
    """What lies on a sidebar panel's floor (242 x 28, the panel's inside)."""
    c = C[theme]
    W, H = 242, 28
    ly = Layer(W, H)
    yy, xx = ly.yy, ly.xx
    n2, n3 = vnoise(12, H, W, 26), vnoise(13, H, W, 7)

    def heap(base_h, corner_h, f1=0.22, f2=0.18):
        return base_h + corner_h * (np.exp(-(xx / (W * f1)) ** 2) + np.exp(-((W - xx) / (W * f2)) ** 2)) + (n2 - 0.5) * base_h * 1.6
    if season in ('winter', 'xmas'):
        top = H - heap(4, 16)
        inside = yy >= top
        ly.over(inside * 0.9, c['snow'])
        ly.over((inside & (yy < top + 3)) * 0.9, c['snow_hi'])
        ly.over((inside & (n3 > 0.72)) * 0.25, c['snow_hi'])
    else:
        cols = {'spring': [(190, 120, 146), (214, 160, 180)],
                'autumn': [tuple(int(v * c['leafk']) for v in col) for col in AUT]}[season]
        base_h, corner_h = (2, 6) if season == 'spring' else (2, 14)
        rr = np.random.default_rng(9)
        h = base_h + corner_h * (np.exp(-(xx / (W * 0.16)) ** 2) + np.exp(-((W - xx) / (W * 0.14)) ** 2)) + (n2 - 0.5) * 14
        inside = yy >= H - h
        idx = rr.integers(0, len(cols), (H // 4 + 1, W // 4 + 1))
        idx = np.repeat(np.repeat(idx, 4, 0), 4, 1)[:H, :W]
        tex = np.array(cols, np.float32)[idx.astype(int)]
        tex = np.where((rr.random((H, W)) < 0.10)[..., None], tex * 0.6, tex)
        ly.over(inside.astype(np.float32), tex)
    save(ly.image(), f'pile-{theme}-{season}.png')


def tint(name, out, fn):
    im = np.array(Image.open(os.path.join(ART, name)).convert('RGBA')).astype(np.float32)
    rgb = im[..., :3]
    warm = (rgb[..., 0] > rgb[..., 2] + 30) & (rgb[..., 0] > 90) & (im[..., 3] > 0)
    im[..., :3] = np.where(warm[..., None], fn(rgb), rgb)
    save(Image.fromarray(np.clip(im, 0, 255).astype(np.uint8), 'RGBA'), out)


def green(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    return np.stack([g * 0.55, r, b + g * 0.35], -1)


def radial(w, h, col, alpha, power=1.5, out=None):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.hypot((xx - w / 2 + 0.5) / (w / 2), (yy - h / 2 + 0.5) / (h / 2))
    a = (np.clip(1 - d, 0, 1) ** power * alpha * 255).astype(np.uint8)
    im = np.dstack([np.full((h, w), c, np.uint8) for c in col] + [a])
    save(Image.fromarray(im, 'RGBA'), out)


def dim_surface(name, phase):
    im = np.array(Image.open(os.path.join(ART, name)).convert('RGB')).astype(np.float32)
    save(Image.fromarray(np.clip(im * np.array(DIM[phase], np.float32), 0, 255).astype(np.uint8)),
         name.replace('.png', f'-{phase}.png'))


if __name__ == '__main__':
    only = os.environ.get('ONLY', '')
    for theme in ('dark', 'light'):
        if not only or 'tablet' in only:
            for ph in PHASES:
                tablet(theme, ph)
        if not only or 'deco' in only:
            for se in SEASONS:
                for b in BUCKETS:
                    deco(theme, se, b)
        if not only or 'small' in only:
            for ph in ('dawn', 'day', 'dusk', 'night'):
                window(theme, ph, False)
                window(theme, ph, True)
            for se in ('winter', 'xmas', 'spring', 'summer', 'autumn', 'halloween'):
                cap(theme, se)
            for se in ('winter', 'xmas', 'spring', 'autumn'):
                pile_strip(theme, se)
    if not only or 'small' in only:
        for ph in DIM:
            for n in ('bg-slate.png',):   # the outer wall (a layout background); panels get kit.js veil()
                dim_surface(n, ph)
        # Day: the sconces are out, a wisp of smoke over the cup.
        save(Image.fromarray(np.array(Image.fromarray(sprite(['........', '....s...', '...S....', '....s...', '.bbbbbb.', '..bBBb..', '...bb...', '...bb...'],
             {'s': (88, 92, 118), 'S': (110, 114, 140), 'b': (90, 58, 30), 'B': (140, 96, 50)}, 2).astype(np.uint8), 'RGBA')), 'RGBA'), 'sconce-off.png')
        radial(88, 48, (255, 170, 70), 0.55, out='glow-warm.png')            # dark: the sconces' pool at dusk and night
        radial(180, 48, (255, 160, 70), 0.45, out='glow-torch.png')
        # Light: candlelight on the dimmed bricks, thin and warm so the bricks show through
        # (the mockup brought the dimmed stone back toward its daylight color, tinted warm).
        radial(156, 48, (255, 214, 160), 0.42, power=1.4, out='glow-candle.png')
        radial(260, 48, (255, 214, 160), 0.42, power=1.4, out='glow-candle-torch.png')
        for n in ('torch.png', 'torch-glow.png', 'sconce.png', 'sconce-b.png', 'sconce-halo.png'):
            tint(n, n.replace('.png', '-green.png'), green)
        save(Image.fromarray(WREATH.astype(np.uint8), 'RGBA'), 'wreath.png')
    print('look art in', OUT, len(os.listdir(OUT)))
