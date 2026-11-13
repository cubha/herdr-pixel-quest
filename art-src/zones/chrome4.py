"""Pixel Quest 3단계 시안 4차: 집의 그림 방식 그대로(2px 도트·단색 면·낮은 대비) 구역을 그린다.

    python3 .claude/plan/next/stage3/gen_zone.py [zone ...]

3차(gen_zone_v3.py)는 1px 잡음과 선으로 그려 원래 그림과 격자가 달랐고 장식이 글자 뒤에 너무 많았다.
4차 규칙:
  - 모든 무늬·장식은 반 크기(도트 2px)에서 그려 두 배로 키운다.
  - 석판·패널 바닥은 원래 그림의 명암(금·빛·벽돌 줄)을 그대로 두고 구역의 색과 옅은 무늬만 얹는다.
  - 석판 장식은 지금 쓰는 겨울 장식(art-src/gen_look.py drift·icicles)의 자리·높이·밝기를 넘지 않는다.
  - 벽(글자가 없는 곳)만 구역의 재질 블록으로 새로 그린다.
"""
import math
import os
import random

import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
OUT = os.path.join(os.path.dirname(__file__), 'out')
BASE = np.array(Image.open(os.path.join(ROOT, 'preview.png')).convert('RGB')).astype(np.float32)
H, W = BASE.shape[:2]
HH, HW = H // 2, W // 2
TERM = (282, 88, 1268, 772)
PANE = (276, 50, 1272, 778)
PANELS = [(12, 50, 262, 404), (12, 424, 262, 776)]
KEEP = [(36, 130, 62, 390), (36, 490, 112, 770), (1204, 266, 1274, 560), (324, 54, 350, 82)]
PLATES = [(126, 8, 200, 34), (280, 6, 406, 38), (1020, 6, 1172, 38), (20, 62, 220, 94), (20, 434, 220, 468), (1040, 794, 1242, 820)]
FLAME = (690, 0, 860, 44)
UI = [(12, 6, 264, 38), (278, 6, 408, 40), (992, 6, 1274, 38), (8, 788, 264, 820), (282, 796, 516, 818), (726, 796, 1244, 818), (20, 62, 248, 94), (20, 434, 248, 468)]
CURSOR = (498, 416, 514, 442)
YY, XX = np.mgrid[0:H, 0:W]
GOLD = ['#5a2e1e', '#9a5a26', '#d49a3a', '#f6d870', '#fff4c8']


def rect_mask(rs):
    m = np.zeros((H, W), bool)
    for x0, y0, x1, y1 in rs:
        m[y0:y1, x0:x1] = True
    return m


def hsv(a):
    r, g, b = a[..., 0] / 255, a[..., 1] / 255, a[..., 2] / 255
    mx, mn = np.max(a, -1) / 255, np.min(a, -1) / 255
    d = mx - mn
    h = np.zeros_like(mx)
    nz = d > 1e-6
    rm, gm, bm = nz & (mx == r), nz & (mx == g) & (mx != r), nz & (mx == b) & (mx != r) & (mx != g)
    h[rm] = ((g - b)[rm] / d[rm]) % 6
    h[gm] = (b - r)[gm] / d[gm] + 2
    h[bm] = (r - g)[bm] / d[bm] + 4
    return h * 60, np.where(mx > 0, d / np.maximum(mx, 1e-6), 0), mx


def rgb(h, s, v):
    h = (h % 360) / 60
    i = np.floor(h).astype(int) % 6
    f = h - np.floor(h)
    p, q, t = v * (1 - s), v * (1 - s * f), v * (1 - s * (1 - f))
    out = np.zeros(h.shape + (3,), np.float32)
    for k, (r, g, b) in enumerate([(v, t, p), (q, v, p), (p, v, t), (p, q, v), (t, p, v), (v, p, q)]):
        m = i == k
        out[m] = np.stack([r[m], g[m], b[m]], -1)
    return out * 255


def lum(a):
    return (0.3 * a[..., 0] + 0.59 * a[..., 1] + 0.11 * a[..., 2]) / 255


def hexc(s):
    return np.array([int(s[i:i + 2], 16) for i in (1, 3, 5)], np.float32)


def ramp(a, m, stops):
    xs = [float(lum(hexc(c)[None, None])[0, 0]) for c in GOLD]
    L = lum(a)
    for k in range(3):
        a[..., k][m] = np.interp(L[m], xs, [hexc(c)[k] for c in stops])


def box_blur(m, r, n=1):
    m = m.astype(np.float32)
    for _ in range(n):
        for ax in (0, 1):
            acc = np.zeros_like(m)
            for d in range(-r, r + 1):
                acc += np.roll(m, d, ax)
            m = acc / (2 * r + 1)
    return m


def hnoise(seed, cell):
    """반 크기 값 잡음(0..1)."""
    r = np.random.default_rng(seed)
    g = r.uniform(0, 1, (HH // cell + 3, HW // cell + 3)).astype(np.float32)
    yy, xx = np.mgrid[0:HH, 0:HW].astype(np.float32)
    y, x = yy / cell, xx / cell
    y0, x0 = y.astype(int), x.astype(int)
    fy, fx = y - y0, x - x0
    return (g[y0, x0] * (1 - fx) + g[y0, x0 + 1] * fx) * (1 - fy) + (g[y0 + 1, x0] * (1 - fx) + g[y0 + 1, x0 + 1] * fx) * fy


def up(im):
    """반 크기 그림 -> 화면 크기(도트 2px)."""
    a = np.array(im.convert('RGB') if isinstance(im, Image.Image) else im)
    return a.repeat(2, 0).repeat(2, 1).astype(np.float32)


HX0, HY0, HX1, HY1 = [v // 2 for v in TERM]
ART = os.path.join(ROOT, 'mods/pixel-quest/art')


class Dots:
    """반 크기 장식 층. onto()가 두 배로 키워 돌 자리(only)에만 얹는다."""

    def __init__(self):
        self.c = np.zeros((HH, HW, 3), np.float32)
        self.a = np.zeros((HH, HW), np.float32)

    def px(self, x, y, col, al=1.0):
        x, y = int(x), int(y)
        if 0 <= x < HW and 0 <= y < HH:
            self.c[y, x] = col
            self.a[y, x] = al

    def paste(self, rows, pal, x, y, flip=False, dim=1.0):
        for j, r in enumerate(rows):
            r = r[::-1] if flip else r
            for i, ch in enumerate(r):
                if ch in pal:
                    self.px(x + i, y + j, tuple(v * dim for v in pal[ch]))

    def art(self, name, x, y, dim=1.0):
        s = np.array(Image.open(os.path.join(ART, name + '.png')).convert('RGBA'))[::2, ::2]
        for j in range(s.shape[0]):
            for i in range(s.shape[1]):
                if s[j, i, 3] > 128:
                    self.px(x + i, y + j, tuple(float(v) * dim for v in s[j, i, :3]))
        return s.shape[1], s.shape[0]

    def onto(self, a, only):
        al = self.a.repeat(2, 0).repeat(2, 1) * only
        a[:] = a * (1 - al[..., None]) + self.c.repeat(2, 0).repeat(2, 1) * al[..., None]


# ---------- 벽: 구역의 재질 블록 (던전 벽돌과 같은 짜임: 단색 블록, 가끔 체크 무늬 한 톤) ----------
def bricks(seed, rh, wmin, wmax, tones, mortar, dith=0.3, each=None):
    rnd = random.Random(seed)
    t = np.zeros((HH, HW, 3), np.float32)
    t[:] = mortar
    for y in range(0, HH, rh):
        x = -rnd.randrange(wmax)
        while x < HW:
            w = rnd.randrange(wmin, wmax)
            i = rnd.randrange(len(tones))
            x0, x1, y1 = max(0, x), min(HW, x + w - 1), min(HH, y + rh - 1)
            if x1 - x0 >= 3:
                t[y:y1, x0:x1] = tones[i]
                if rnd.random() < dith:
                    yy, xx = np.mgrid[y:y1, x0:x1]
                    t[y:y1, x0:x1][(yy + xx) % 2 == 0] = tones[min(len(tones) - 1, i + 1)]
                if each:
                    each(t, rnd, x0, y, x1, y1, i)
            x += w
    return t


def wall_ice(seed):
    tones = [(18, 44, 62), (22, 54, 76), (26, 64, 88), (32, 76, 102)]

    def each(t, rnd, x0, y, x1, y1, i):
        if rnd.random() < 0.65:                                 # 윗모서리에 맺힌 빛
            t[y, x0:x1] = np.array(tones[i]) + (16, 26, 30)
        if rnd.random() < 0.11 and x1 - x0 >= 9:                 # 비스듬한 반사 한 줄
            sx = rnd.randrange(x0 + 2, x1 - 6)
            for k in range(min(4, y1 - y - 2)):
                t[y + 1 + k, sx + 3 - k] = (84, 138, 168)
                t[y + 1 + k, sx + 5 - k] = (46, 88, 114)
    return bricks(seed, 8, 11, 20, tones, (8, 22, 34), 0.2, each)


def wall_lava(seed):
    tones = [(30, 25, 27), (38, 31, 32), (46, 37, 36), (54, 43, 40)]

    def each(t, rnd, x0, y, x1, y1, i):
        t[y, x0:x1] = np.array(tones[i]) + (10, 8, 7)
        if rnd.random() < 0.13 and y1 < HH and x1 - x0 >= 8:      # 블록 아래 틈으로 비치는 용암
            t[y1, x0:x1] = (170, 62, 20)
            q = (x1 - x0) // 3
            t[y1, x0 + q:x1 - q] = (240, 140, 44)
            t[y1 - 1, x0:x1] = (74, 40, 30)
    return bricks(seed, 8, 9, 18, tones, (13, 8, 8), 0.3, each)


def wall_crystal(seed):
    tones = [(30, 21, 52), (38, 27, 66), (47, 34, 80), (56, 42, 94)]
    kinds = [((214, 190, 250), (150, 112, 220), (88, 58, 146))] * 3 + [((250, 206, 236), (214, 128, 188), (124, 60, 104)), ((204, 242, 250), (104, 190, 214), (44, 104, 132))]

    def each(t, rnd, x0, y, x1, y1, i):
        t[y, x0] = t[y1 - 1, x1 - 1] = (13, 8, 26)              # 모서리를 쳐 낸 각진 돌
        if rnd.random() < 0.5:
            t[y, x1 - 1] = (13, 8, 26)
        t[y, x0 + 1:x1 - 1] = np.array(tones[i]) + (10, 8, 16)
        if rnd.random() < 0.12 and x1 - x0 >= 8 and y1 - y >= 6:  # 박힌 결정
            h, l, m = rnd.choice(kinds)
            cx, cy = rnd.randrange(x0 + 2, x1 - 4), y + 1
            for dx, dy, c in [(1, 0, h), (0, 1, h), (1, 1, l), (2, 1, m), (0, 2, h), (1, 2, l), (2, 2, m), (1, 3, m)]:
                t[cy + dy, cx + dx] = c
    return bricks(seed, 8, 10, 19, tones, (13, 8, 26), 0.3, each)


def wall_throne(seed):
    tones = [(50, 15, 27), (57, 18, 30), (64, 21, 33)]

    def each(t, rnd, x0, y, x1, y1, i):
        t[y, x0:x1] = np.array(tones[i]) + (12, 6, 6)
        if x1 < HW:
            t[y1 - 1 if y1 < HH else y1 - 1, x1] = (196, 150, 56)  # 금 줄눈이 만나는 곳의 징
    return bricks(seed, 10, 20, 30, tones, (98, 66, 24), 0.0, each)


def wall_moss(seed):
    tones = [(22, 30, 36), (27, 37, 41), (33, 44, 46), (39, 51, 51)]
    n = hnoise(seed + 40, 9) * 0.7 + hnoise(seed + 41, 3) * 0.3

    def each(t, rnd, x0, y, x1, y1, i):
        yy, xx = np.mgrid[y:y1, x0:x1]
        blk, nn = t[y:y1, x0:x1], n[y:y1, x0:x1]
        blk[(nn > 0.56) & ((yy + xx) % 2 == 0)] = (38, 80, 48)
        blk[nn > 0.66] = (38, 80, 48)
        blk[(nn > 0.66) & ((yy + xx) % 2 == 0)] = (58, 108, 58)
    return bricks(seed, 8, 11, 20, tones, (8, 12, 14), 0.3, each)


# ---------- 석판 위 옅은 무늬 (원래 금과 같은 세기) ----------
def pat_ice(d, rnd):
    for _ in range(18):                                         # 얼음 속 반사 줄: 두세 줄씩
        x, y, n = rnd.randrange(HX0 + 8, HX1 - 20), rnd.randrange(HY0 + 20, HY1 - 8), rnd.randrange(5, 12)
        for k in range(n):
            d.px(x + k, y - k, (36, 60, 82))
        for k in range(n - 3):
            d.px(x + k + 3, y - k, (27, 47, 67))


def pat_crystal(d, rnd):
    for _ in range(11):                                         # 암석의 결
        x, y, n, s = rnd.randrange(HX0, HX1 - 60), rnd.randrange(HY0 + 10, HY1 - 10), rnd.randrange(24, 60), rnd.choice([-1, 1])
        for k in range(n):
            d.px(x + k, y + s * (k // 2), (46, 36, 76))
    for _ in range(16):
        d.px(rnd.randrange(HX0 + 4, HX1 - 4), rnd.randrange(HY0 + 4, HY1 - 4), (112, 94, 170))


def pat_throne(d, rnd):
    for j, cy in enumerate(range(HY0 + 8, HY1, 12)):            # 융단의 마름모 무늬
        for cx in range(HX0 + 8 + (j % 2) * 8, HX1, 16):
            for k in range(-3, 4):
                d.px(cx + k, cy - (3 - abs(k)), (62, 28, 38))
                d.px(cx + k, cy + (3 - abs(k)), (62, 28, 38))
    x0, y0, x1, y1 = HX0 + 2, HY0 + 2, HX1 - 3, HY1 - 3          # 금 상감 테 (글자 여백 안쪽)
    for x in range(x0, x1 + 1):
        d.px(x, y0, (124, 88, 34)); d.px(x, y1, (124, 88, 34))
    for y in range(y0, y1 + 1):
        d.px(x0, y, (124, 88, 34)); d.px(x1, y, (124, 88, 34))
    for cx, cy in [(x0, y0), (x1, y0), (x0, y1), (x1, y1)]:
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                d.px(cx + dx, cy + dy, (176, 130, 50))


# ---------- 장식: 겨울 장식의 더미·고드름과 같은 꼴 ----------
def drift(d, cols, rim, base=4, corner=26, seed=2, block=2, speck=None, flat=0.0):
    """석판 아래 더미. 가운데는 낮고(base) 두 구석에서만 오른다. 땅 높이를 돌려준다."""
    n = (hnoise(seed, 13)[HH // 2] - 0.5) * base * 1.6
    r = np.random.default_rng(seed)
    wd = HX1 - HX0
    top = np.zeros(HW, int)
    idx = r.integers(0, len(cols), (HH // block + 2, HW // block + 2))
    for x in range(HX0, HX1):
        xr = x - HX0
        h = base + corner * (math.exp(-(xr / (wd * 0.20)) ** 2) + math.exp(-((wd - xr) / (wd * 0.16)) ** 2)) + n[x] * (1 - flat)
        t = HY1 - max(1, int(round(h)))
        top[x] = t
        for y in range(t, HY1):
            d.px(x, y, rim if y == t else cols[idx[y // block, (x + (y // block % 2) * (block // 2)) // block]])
    if speck:
        rr = random.Random(seed)
        for _ in range(speck[1]):
            x = rr.randrange(HX0 + 2, HX1 - 2)
            if HY1 - top[x] > 3:
                d.px(x, rr.randrange(top[x] + 2, HY1), rr.choice(speck[0]))
    return top


def hang(d, y, x0, x1, cols, seed, lens, gap):
    """천장에 매달린 것: 위가 넓고 아래로 좁아진다 (gen_look icicles와 같은 꼴)."""
    r = random.Random(seed)
    x = x0 + r.randrange(*gap)
    while x < x1 - 3:
        ln = r.choice(lens)
        wd = 3 if ln > 5 else 2
        for j in range(ln):
            ww = max(1, wd - j * wd // ln)
            for i in range(ww):
                d.px(x + (wd - ww) // 2 + i, y + j, cols[0] if i == 0 else cols[1])
        x += r.randrange(*gap)


def cap(d, y, x0, x1, body, rim, seed, cover=0.6):
    """금테 위에 얹힌 것(눈·이끼): 낮은 둔덕."""
    r = random.Random(seed)
    x = x0
    while x < x1:
        w = r.randrange(3, 11)
        if r.random() < cover:
            for i in range(w):
                if x + i >= x1:
                    break
                d.px(x + i, y, body)
                if 0 < i < w - 1 and w > 4:
                    d.px(x + i, y - 1, rim)
        x += w + r.randrange(1, 5)


def vine(d, x, y, n, r, leaf, stem, bloom=None):
    for j in range(n):
        x += r.choice([-1, 0, 0, 0, 1])
        d.px(x, y + j, stem)
        if j % 3 == 0:
            s = r.choice([-1, 1])
            c = r.choice(leaf)
            for dx, dy in [(1, 0), (2, 0), (1, 1), (2, -1)]:
                d.px(x + s * dx, y + j + dy, c)
            if bloom and r.random() < 0.3:
                d.px(x - s, y + j, r.choice(bloom))


def glow(a, cx, cy, rad, col, k, mask):
    m = np.clip(1 - np.hypot(XX - cx, YY - cy) / rad, 0, 1) ** 1.6 * k * mask
    a += (np.array(col, np.float32) - a) * m[..., None]


SHARD = ['....h.......', '....hl......', '...hllm..h..', '...hllm.hl..', '.h.hllm.hlm.', '.hlhllmhllm.', 'hllhllmhllmd', 'hlmmllmmlmmd']
SHARD_L = ['......h.........', '......hl........', '.....hllm.......', '.....hllm...h...', '..h..hllm..hl...', '..hl.hllm..hlm..', '.hllmhllm.hllm..', '.hllmhllmmhllm.h', 'hhllmhllmmhllmhl', 'hlllmmllmmhllmlm', 'hllmmmllmmmlmmmd']
SHARD_S = ['..h...', '..hl..', '.hhlm.', '.hllm.', 'hllmmd']
ROCK = ['..hhh...', '.hmmmd..', 'hmmmmmd.', 'hmmmmmmd']
ROCK_S = ['.hh..', 'hmmd.', 'hmmmd']
MUSH = ['.ccc.', 'cscsc', 'ccccc', '..t..', '..t..']
CUP = ['hgggd', 'hgggd', '.hgd.', '..g..', '..g..', '.hgd.']
FRAMES = [(10, 52, 264, 404), (10, 424, 264, 776), (278, 52, 1272, 776)]

ZONES = {
    'ice': dict(name='얼음 동굴', wall=wall_ice, tab=(22, 40, 58), floor=(16, 34, 50), grow=(50, 78, 102), pat=pat_ice,
                ramp=['#16303f', '#3c6c88', '#8cc0d8', '#d8f2fa', '#ffffff'], flame=192,
                rest=(203, 0.95, 1.1), fg=(220, 236, 246), cursor=(184, 236, 250)),
    'lava': dict(name='용암 굴', wall=wall_lava, tab=(40, 31, 31), floor=(33, 26, 27), grow=(60, 38, 31), crack=(92, 40, 20),
                 ramp=['#1c1010', '#4c3028', '#94603c', '#f4802a', '#ffd478'], flame=None,
                 rest=(8, 0.35, 0.85), fg=(240, 226, 208), cursor=(255, 176, 64)),
    'crystal': dict(name='수정 광산', wall=wall_crystal, tab=(36, 28, 60), floor=(30, 22, 52), grow=(60, 44, 100), pat=pat_crystal,
                    ramp=['#2a1440', '#6a3a9a', '#b07ae0', '#e4c0ff', '#fff0ff'], flame=292,
                    rest=(268, 0.85, 1.05), fg=(234, 226, 246), cursor=(228, 192, 255)),
    'throne': dict(name='왕좌의 방', wall=wall_throne, tab=(52, 22, 32), floor=(44, 17, 27), grow=(70, 30, 40), pat=pat_throne,
                   ramp=['#6a3210', '#b8741c', '#f0b83a', '#ffe680', '#fffbe0'], flame=46,
                   rest=(338, 0.7, 1.0), fg=(244, 232, 208), cursor=(255, 226, 122)),
    'moss': dict(name='이끼 유적', wall=wall_moss, tab=(28, 38, 34), floor=(22, 32, 30), grow=(42, 88, 52),
                 ramp=['#22260e', '#56581e', '#9a963c', '#d6d47c', '#f6f6c8'], flame=None,
                 rest=(150, 0.55, 1.0), fg=(226, 232, 208), cursor=(216, 214, 128)),
}


def build(key, chrome_only=False):
    z = ZONES[key]
    a = BASE.copy()
    hh, ss, vv = hsv(a)
    L0 = lum(BASE)
    keep, term, panels, pane = rect_mask(KEEP), rect_mask([TERM]), rect_mask(PANELS), rect_mask([PANE])
    navy = (hh > 195) & (hh < 285) & (ss > 0.12) & (vv < 0.40)
    ink = vv < 0.10
    moss0 = (BASE[..., 1] - BASE[..., 0] > 6) & term & (L0 < 0.31)
    stone = navy | ink | moss0
    stone &= ~keep | ((hh > 212) & (hh < 252) & (ss > 0.3) & (vv < 0.4))
    tuft = (hh > 85) & (hh < 160) & (ss > 0.25) & (YY > 780)
    if key == 'moss':
        tuft &= False
    guard = (box_blur((~stone & ~tuft).astype(np.float32), 1) > 0.01) & ~rect_mask([FLAME])
    swap = stone & ~(ink & guard)
    drawer = rect_mask([KEEP[2]])
    den = box_blur(stone.astype(np.float32), 7) + 1e-4
    shade = box_blur(L0 * stone, 7) / den
    b0 = np.stack([box_blur(BASE[..., c] * stone, 7) / den for c in range(3)], -1)
    edge = ~swap & (box_blur(swap.astype(np.float32), 2) > 0.01) & (lum(BASE) < 0.8) & ~keep

    def lay(mask, tex, ref, lo, hi, region):
        """새 무늬를 깔되 큰 명암(횃불 빛)은 옛 그림에서."""
        t = np.clip(tex * np.clip(shade / ref, lo, hi)[..., None], 0, 255)
        a[mask] = t[mask]
        e = edge & region
        a[e] = np.clip(BASE - b0 + t, 0, 255)[e]

    def relight(mask, col, ref, lo, hi, region):
        """옛 그림의 명암(금·벽돌 줄·빛)을 그대로 두고 색만 구역의 것으로."""
        col = np.array(col, np.float32)
        a[mask] = np.clip(col * np.clip(L0 / ref, lo, hi)[..., None], 0, 255)[mask]
        e = edge & region
        a[e] = np.clip(BASE - b0 + col * np.clip(shade / ref, lo, hi)[..., None], 0, 255)[e]

    ui = rect_mask(UI)
    wallm = swap & ~pane & ~panels & ~ui
    floorm = swap & panels & ~ui
    tabm = swap & term & ~drawer
    lay(wallm | (tuft & ~pane), up(z['wall'](3)), 0.096, 0.75, 1.9, ~pane & ~panels & ~ui)
    relight(floorm, z['floor'], 0.119, 0.6, 1.5, panels & ~ui)
    relight(tabm & ~moss0, z['tab'], 0.149, 0.55, 1.5, term & ~drawer)
    a[tabm & moss0] = np.clip(np.array(z['grow'], np.float32) * np.clip(L0 / 0.14, 0.75, 1.35)[..., None], 0, 255)[tabm & moss0]
    if 'crack' in z:                                             # 원래 있던 금이 달아오른다
        cr = tabm & ~moss0 & (L0 < shade * 0.9)
        a[cr] = z['crack']
    rest = swap & ~wallm & ~floorm & ~tabm
    hu, sa, va = z['rest']
    a[rest] = rgb(np.full_like(hh, hu), np.clip(ss * sa, 0, 1), np.clip(vv * va, 0, 1))[rest]
    fg = (np.abs(BASE - np.array([232, 220, 192])).sum(-1) < 42) & term
    a[fg] = z['fg']
    a[rect_mask([CURSOR]) & (ss > 0.3) & (hh > 30) & (hh < 60)] = z['cursor']
    gold = (hh > 14) & (hh < 74) & (ss > 0.30) & ~keep & ~term
    gold |= rect_mask(PLATES) & ((hh < 15) | (hh > 344)) & (ss > 0.45)
    fl = rect_mask([FLAME]) & ((hh < 62) | (hh > 340)) & (ss > 0.35)
    ramp(a, gold & ~fl, z['ramp'])
    if z['flame'] is not None:
        a[fl] = rgb(np.full_like(hh, z['flame']) + (1 - vv) * 14, np.clip(ss * 0.9, 0, 1), np.clip(vv * 1.05, 0, 1))[fl]
    if chrome_only:
        return a, dict(stone=stone, swap=swap, ui=ui, hh=hh, ss=ss, vv=vv, wallm=wallm, keep=keep)

    onlyt = tabm.astype(np.float32)                               # 석판: 글자 자리는 덮지 않는다
    onlyw = (stone & ~ui & ~term & ~rect_mask([(276, 54, 1272, 88)])).astype(np.float32)   # 바깥: 돌 자리와 금테 위 검은 띠
    rnd = random.Random(7)
    p, d, w = Dots(), Dots(), Dots()                              # 무늬, 석판 장식, 바깥 장식
    if 'pat' in z:
        z['pat'](p, rnd)
        p.onto(a, onlyt * ~moss0)
    info = {}

    def tops(fn):                                                 # 금테 윗변마다
        for i, (x0, y0, x1, y1) in enumerate(FRAMES):
            fn(i, x0 // 2 + 3, y0 // 2 - 1, x1 // 2 - 3)

    if key == 'ice':
        ic = ((122, 162, 198), (176, 208, 232))
        top = drift(d, [(86, 112, 148), (94, 122, 158), (80, 104, 140)], (150, 178, 208), seed=2, block=3)
        hang(d, HY0, HX0 + 2, HX1 - 2, ic, 4, [3, 4, 4, 5, 6, 7], (6, 28))
        pal = {'h': (176, 208, 232), 'l': (122, 162, 198), 'm': (84, 120, 160), 'd': (52, 82, 116)}
        d.paste(SHARD_L, pal, HX0 + 6, top[HX0 + 14] - 9)
        d.paste(SHARD_S, pal, HX0 + 26, top[HX0 + 29] - 3, flip=True)
        d.paste(SHARD_L, pal, HX1 - 24, top[HX1 - 16] - 9, flip=True)
        d.paste(SHARD, pal, HX1 - 40, top[HX1 - 34] - 6)
        d.paste(SHARD_S, pal, HX1 - 50, top[HX1 - 47] - 3, flip=True)
        tops(lambda i, x0, y, x1: cap(w, y, x0, x1, (206, 226, 240), (244, 250, 255), 11 + i, 0.7))
        info['deco'] = [(94, 122, 158), (150, 178, 208)]
    if key == 'lava':
        top = drift(d, [(50, 38, 38), (58, 44, 42), (44, 34, 35)], (92, 70, 62), seed=5, block=3, speck=([(196, 80, 22), (236, 132, 40)], 70))
        hang(d, HY0, HX0 + 2, HX1 - 2, ((62, 48, 46), (86, 68, 62)), 6, [3, 4, 5, 5, 6, 7], (10, 34))
        pal = {'h': (98, 76, 68), 'm': (58, 44, 42), 'd': (34, 26, 27)}
        for x, s, f in [(HX0 + 12, ROCK, False), (HX0 + 34, ROCK_S, True), (HX1 - 22, ROCK, True), (HX1 - 44, ROCK_S, False), (HX0 + 150, ROCK_S, False)]:
            d.paste(s, pal, x, top[x + 3] - len(s) + 1, flip=f)
        for x in (HX0 + 26, HX1 - 32):                           # 구석에 고인 용암
            for i in range(9):
                d.px(x + i, HY1 - 1, (236, 132, 40)); d.px(x + i, HY1 - 2, (196, 80, 22) if i in (0, 8) else (250, 176, 70))
        info['deco'] = [(58, 44, 42), (92, 70, 62)]
    if key == 'crystal':
        top = drift(d, [(54, 42, 88), (62, 48, 98), (48, 36, 78)], (98, 80, 146), seed=6, block=3, speck=([(150, 126, 210)], 26))
        hang(d, HY0, HX0 + 2, HX1 - 2, ((112, 84, 176), (164, 138, 222)), 9, [3, 4, 5, 6, 7], (14, 44))
        v = {'h': (190, 166, 238), 'l': (134, 102, 204), 'm': (92, 64, 152), 'd': (58, 38, 104)}
        k = {'h': (236, 190, 222), 'l': (192, 116, 170), 'm': (132, 70, 116), 'd': (84, 40, 76)}
        c = {'h': (184, 226, 238), 'l': (104, 174, 198), 'm': (60, 116, 144), 'd': (36, 74, 98)}
        d.paste(SHARD_L, v, HX0 + 6, top[HX0 + 14] - 9)
        d.paste(SHARD_S, k, HX0 + 26, top[HX0 + 29] - 3, flip=True)
        d.paste(SHARD, c, HX0 + 36, top[HX0 + 42] - 6)
        d.paste(SHARD_L, v, HX1 - 24, top[HX1 - 16] - 9, flip=True)
        d.paste(SHARD, k, HX1 - 40, top[HX1 - 34] - 6)
        d.paste(SHARD_S, c, HX1 - 50, top[HX1 - 47] - 3, flip=True)
        def crowns(i, x0, y, x1):                                 # 금테 모서리에 자란 결정
            w.paste(SHARD_S, v, x0, y - 4)
            w.paste(SHARD_S, k if i else c, x1 - 6, y - 4, flip=True)
        tops(crowns)
        info['deco'] = [(62, 48, 98), (190, 166, 238)]
    if key == 'throne':
        gems = [(168, 44, 56), (64, 96, 176), (56, 148, 100)]
        top = drift(d, [(150, 108, 36)], (224, 184, 84), seed=3, block=2)
        coin = [[(206, 164, 70), (150, 108, 36), (150, 108, 36), (84, 56, 20)], [(150, 108, 36), (112, 78, 26), (112, 78, 26), (84, 56, 20)]]
        for x in range(HX0, HX1):                                 # 더미를 동전 낱낱으로
            for y in range(top[x] + 1, HY1):
                ry = HY1 - 1 - y
                d.px(x, y, coin[1 - ry % 2][(x + ry // 2 * 2) % 4])
        rg = random.Random(3)
        for _ in range(16):                                       # 금화 사이의 보석
            x = rg.randrange(HX0 + 3, HX1 - 4)
            if HY1 - top[x] > 5:
                y, c = rg.randrange(top[x] + 2, HY1 - 2), rg.choice(gems)
                d.px(x, y, tuple(min(255, v + 70) for v in c)); d.px(x + 1, y, c); d.px(x, y + 1, c); d.px(x + 1, y + 1, tuple(v * 0.6 for v in c))
        d.art('chest-open', HX0 + 10, top[HX0 + 16] - 11, 0.85)
        d.art('crown-s', HX0 + 28, top[HX0 + 33] - 5, 0.85)
        d.art('crown-s', HX1 - 26, top[HX1 - 20] - 5, 0.85)
        g = {'h': (226, 186, 90), 'g': (170, 124, 42), 'd': (112, 78, 26)}
        d.paste(CUP, g, HX1 - 42, top[HX1 - 40] - 5)
        for x in (214, 232, 250, 440, 456, 472):             # 윗벽에 드리운 깃발
            w.art('pennant-red', x, 1, 0.9)
        tops(lambda i, x0, y, x1: w.art('crown-s', (x0 + x1) // 2 - 5, y - 5, 1.0))
        info['deco'] = [(150, 108, 36), (212, 168, 70)]
    if key == 'moss':
        leaf, stem = [(34, 84, 50), (48, 112, 62), (70, 138, 74)], (28, 66, 42)
        top = drift(d, [(38, 82, 48), (44, 92, 52), (34, 72, 44)], (84, 140, 72), seed=4, block=3, speck=([(226, 200, 220), (236, 220, 124)], 40))
        r = random.Random(41)
        for x0, x1, lo, hi, n in [(HX0 + 2, HX0 + 34, 3, 9, 3), (HX0 + 34, HX1 - 150, 3, 10, 9), (HX1 - 150, HX1 - 34, 14, 60, 9), (HX1 - 34, HX1 - 2, 8, 44, 4)]:
            for _ in range(n):
                vine(d, r.randrange(x0, x1), HY0, r.randrange(lo, hi), r, leaf, stem, [(226, 200, 220)])
        m = {'c': (150, 60, 56), 's': (226, 214, 196), 't': (176, 168, 148)}
        for x in (HX0 + 12, HX0 + 20, HX1 - 20, HX1 - 46):
            d.paste(MUSH, m, x, top[x + 2] - 4)
        tops(lambda i, x0, y, x1: cap(w, y, x0, x1, (44, 92, 52), (84, 140, 72), 21 + i, 0.45))
        info['deco'] = [(44, 92, 52), (84, 140, 72)]
    d.onto(a, onlyt)
    w.onto(a, onlyw)
    if key == 'lava':
        for x in (HX0 + 30, HX1 - 28):
            glow(a, x * 2, TERM[3] - 2, 110, (236, 120, 40), 0.20, onlyt)
    if key == 'crystal':
        glow(a, TERM[0] + 34, TERM[3] - 16, 70, (150, 112, 220), 0.14, onlyt)
        glow(a, TERM[2] - 36, TERM[3] - 16, 80, (150, 112, 220), 0.14, onlyt)
    if key == 'moss':
        glow(a, TERM[0] + 34, TERM[3] - 12, 46, (120, 255, 170), 0.10, onlyt)
    info['tab'], info['fg'] = z['tab'], z['fg']
    return np.clip(a, 0, 255).astype(np.uint8), info


def rl(c):
    v = [(x / 255 / 12.92) if x / 255 <= 0.03928 else ((x / 255 + 0.055) / 1.055) ** 2.4 for x in c]
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]


def contrast(c1, c2):
    a, b = sorted([rl(c1), rl(c2)], reverse=True)
    return (a + 0.05) / (b + 0.05)


CROPS = [('top', (270, 0, 1010, 300), 2), ('side', (0, 40, 270, 480), 2), ('cl', (276, 600, 596, 780), 3), ('cr', (952, 600, 1272, 780), 3)]


def save(a, name):
    im = Image.fromarray(a)
    im.save(os.path.join(OUT, f'{name}.png'))
    for tag, box, k in CROPS:
        c = im.crop(box)
        c.resize((c.width * k, c.height * k), Image.NEAREST).save(os.path.join(OUT, f'{name}-{tag}.png'))
    im.resize((320, 205), Image.LANCZOS).save(os.path.join(OUT, f'{name}-thumb.png'))


if __name__ == '__main__':
    import sys
    save(BASE.astype(np.uint8), 'dungeon')
    for k in (sys.argv[1:] or ZONES):
        a, info = build(k)
        save(a, k)
        print(k, '글자:석판 %.1f' % contrast(info['fg'], info['tab']), '글자:더미 %.1f' % contrast(info['fg'], info['deco'][0]), '글자:더미 윗선 %.1f' % contrast(info['fg'], info['deco'][1]))
    print('던전 글자:석판 %.1f, 글자:겨울 눈 %.1f' % (contrast((232, 220, 192), (36, 36, 55)), contrast((232, 220, 192), (100, 120, 160))))
