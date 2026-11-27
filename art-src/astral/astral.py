"""별의 성소(구역 astral)의 그림: 밤하늘·은하·빛의 나무·모래 언덕, 성수(STAGE 1..5)만큼 자란다.

확정 시안(환생 테마)의 생성기 그대로다. 구현용으로 바꾼 곳은 둘뿐:
  - astral(w2): 터미널 장면을 다른 폭(도트)으로도 그린다. 은하·별똥별·먼 언덕의 가로 자리와
    별의 수만 폭에 맞추고, 나무는 오른쪽 끝에 붙는다. w2 = W2(시안의 폭)이면 시안과 한 픽셀도 다르지 않다.
  - 시안 저장부(__main__)는 뺐다. 파일은 art-src/gen_astral.py가 만든다.
Copyright (c) 2026 cubha. MIT License.
"""
import math, os, random, sys
import numpy as np
from PIL import Image
import chrome4 as c4, floors6, tab5, zones5, scenes6 as s6, gen_zone_mock as gz
from tab5 import Dots, H2, W2, TH, TW, prism
TEAL = {'h': (190, 250, 240), 'l': (96, 214, 200), 'm': (44, 150, 150), 'd': (22, 88, 100)}
O = (6, 8, 18)
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], np.float32) / 16 + 1 / 32


def quant(v, cols, h, w):
    """0..1 값을 색 단계로. 단계 사이는 격자 무늬(4×4)로 섞는다."""
    cols = np.array(cols, np.float32)
    n = len(cols) - 1
    yy, xx = np.mgrid[0:h, 0:w]
    q = np.clip(v, 0, 1) * n
    i = np.floor(q).astype(int)
    i = np.clip(i + ((q - i) > BAYER[yy % 4, xx % 4]), 0, n)
    return cols[i]


def band(h, w, seed, x0, y0, x1, y1, width, cell=26):
    """(x0,y0)에서 (x1,y1)로 흐르는 은하 띠의 세기. 가운데에 어두운 먼지 골."""
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    dx, dy = x1 - x0, y1 - y0
    L = math.hypot(dx, dy)
    dist = ((xx - x0) * dy - (yy - y0) * dx) / L
    n = tab5.noise(seed, cell, h, w)
    n2 = tab5.noise(seed + 1, cell // 3, h, w)
    wv = width * (0.75 + 0.6 * tab5.noise(seed + 2, cell * 3, h, w))
    b = np.exp(-(dist / wv) ** 2) * (0.35 + 0.9 * n) * (0.8 + 0.4 * n2)
    lane = np.exp(-((dist + wv * 0.18) / (wv * 0.22)) ** 2) * (n2 > 0.42)
    return np.clip(b - lane * 0.45, 0, 1), dist / wv


def stars(d, rnd, dens, h, w, cols, k):
    for _ in range(k):
        x, y = rnd.randrange(w), rnd.randrange(h)
        if rnd.random() < dens[y, x]:
            d.px(x, y, rnd.choice(cols))


def wall(seed):
    """바깥: 벽돌 없이 깊은 밤하늘. 성수가 오르면 성운이 짙어지고 오로라가 드리운다."""
    h, w = c4.HH, c4.HW
    S = STAGE
    k = (S - 1) / 4
    b, _ = band(h, w, seed + 20, -40, h * 0.9, w + 40, h * 0.1, 70, 30)
    t = quant(b * (0.6 + 0.5 * k), [(6, 8, 20), (9, 12, 28), (13, 16, 38), (19, 20, 50), (26, 26, 62), (34, 30, 78)], h, w)
    n1, n2, n3 = tab5.noise(seed + 40, 36, h, w), tab5.noise(seed + 41, 44, h, w), tab5.noise(seed + 42, 28, h, w)
    t = t + np.clip(n1 - 0.42, 0, 1)[..., None] * np.array((92, 22, 120), np.float32) * k + np.clip(n2 - 0.46, 0, 1)[..., None] * np.array((8, 84, 96), np.float32) * k
    if S >= 4:
        t = t + np.clip(n3 - 0.56, 0, 1)[..., None] * np.array((110, 70, 10), np.float32) * (0.5 if S == 4 else 1.0)
    if S >= 2:                                                         # 오로라: 위아래 벽에 드리운 빛 장막
        yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
        wav = tab5.noise(seed + 60, 18, h, w)[h // 2][None, :] * 0.7 + tab5.noise(seed + 61, 6, h, w)[h // 3][None, :] * 0.3
        hue = tab5.noise(seed + 62, 70, h, w)[h // 4][None, :]
        A = [0, 0.35, 0.6, 0.85, 1.1][S - 1]
        for y0, sgn, reach in ((0, 1, 22 + 2 * S), (h - 1, -1, 10 + S)):
            fall = np.clip(1 - (yy - y0) * sgn / (reach * (0.5 + wav)), 0, 1) ** 1.6
            strand = 0.55 + 0.45 * np.cos(xx * 1.9 + wav * 9)
            v = fall * strand * A
            cols = [(40, 200, 170), (70, 130, 230)] if S < 3 else [(40, 200, 170), (70, 130, 230), (170, 90, 230)] if S < 5 else [(40, 200, 170), (70, 130, 230), (170, 90, 230), (240, 110, 170)]
            ci = np.clip(hue * 1.3 - 0.15, 0, 0.999) * (len(cols) - 1)
            c0 = np.array(cols, np.float32)[np.floor(ci).astype(int)]
            c1 = np.array(cols, np.float32)[np.minimum(np.floor(ci).astype(int) + 1, len(cols) - 1)]
            col = c0 + (c1 - c0) * (ci - np.floor(ci))[..., None]
            lv = (np.floor(v * 5 + BAYER[(yy % 4).astype(int), (xx % 4).astype(int)]) / 5)
            t = t + np.broadcast_to(col, t.shape) * lv[..., None] * 0.34
    rnd = random.Random(seed)
    for _ in range(2200 + 900 * (S - 1)):
        x, y = rnd.randrange(w), rnd.randrange(h)
        if rnd.random() < 0.25 + b[y, x]:
            q = rnd.random()
            t[y, x] = (200, 214, 240) if q < 0.03 + 0.02 * S else (96, 196, 190) if q < 0.14 else (150, 126, 70) if q < 0.2 else (58, 72, 112)
    return t


GX0 = 327                                                              # 윗벽 은하 다섯의 첫 자리(도트). 횃불이 있던 가운데


def cross(t, x, y, col, dimc, big=False):
    h, w = t.shape[:2]
    if not (2 < x < w - 3 and 2 < y < h - 3): return
    t[y, x] = col
    for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
        t[y + dy, x + dx] = dimc
    if big:
        for dx, dy in [(-2, 0), (2, 0), (0, -2), (0, 2)]:
            t[y + dy, x + dx] = tuple(v * 0.55 for v in dimc)


def floor(seed=7):
    """사이드 패널: 성수가 오르면 터미널의 은하 띠가 패널까지 흘러들고 색이 는다. 글자 밑이라 밝기는 묶어 둔다."""
    h, w = floors6.HH, floors6.HW
    S = STAGE
    k = (S - 1) / 4
    b1, _ = band(h, w, seed + 3, -10, 392, 150, 314, 15 + 3 * S, 22)   # 터미널 띠에서 이어지는 줄기(아래 패널)
    b2, _ = band(h, w, seed + 9, -10, 176, 150, 66, 13 + 3 * S, 22)   # 위 패널을 지나는 둘째 줄기
    b = np.clip(b1 * [0.25, 0.9, 1.05, 1.2, 1.35][S - 1] + b2 * [0.1, 0.3, 0.95, 1.15, 1.35][S - 1], 0, 1.2)
    t = quant(b * 0.9, [(9, 12, 27), (12, 16, 36), (17, 20, 48), (24, 26, 62), (32, 32, 80), (42, 40, 100), (54, 50, 122)], h, w)
    t = t + np.array((5, 3, 10), np.float32) * k                                  # 바탕 전체가 남색에서 보랏빛으로
    n1, n2, n3 = tab5.noise(seed + 50, 30, h, w), tab5.noise(seed + 51, 26, h, w), tab5.noise(seed + 52, 22, h, w)
    bb = np.clip(b, 0, 1)[..., None]
    if S >= 2: t = t + np.clip(n1 - 0.45, 0, 1)[..., None] * bb * np.array((150, 30, 110), np.float32) * min(1, k * 1.6)      # 장밋빛
    if S >= 3: t = t + np.clip(n2 - 0.45, 0, 1)[..., None] * bb * np.array((0, 130, 120), np.float32) * k * 1.2             # 청록
    if S >= 4: t = t + np.clip(n3 - 0.5, 0, 1)[..., None] * bb * np.array((150, 100, 10), np.float32) * (0.7 if S == 4 else 1.1)   # 금빛 먼지
    DIMT = lambda tn: [tuple(v * 1.15 for v in c) for c in TONE[tn][:6]] + [tuple(v * 0.8 for v in TONE[tn][6])]
    for i, (gx, gy, gr) in enumerate([(98, 356, 20), (40, 104, 17), (104, 190, 16), (36, 268, 15)]):
        if S >= i + 2:
            t = t + quant(spiral(h, w, gx, gy, gr, -0.4 + 0.3 * i, 0.45, seed=i + 7) ** 0.75, DIMT(TN[i + 1]), h, w)
    rnd = random.Random(seed)
    for _ in range(1100 + 500 * (S - 1)):
        x, y = rnd.randrange(w), rnd.randrange(h)
        if rnd.random() < 0.25 + b[y, x]:
            t[y, x] = rnd.choice([(44, 56, 92), (52, 70, 108), (40, 88, 96), (84, 96, 136)])
    for j in range([0, 5, 11, 18, 26][S - 1]):                         # 십자 별: 띠 위에 모인다
        for _ in range(30):
            x, y = rnd.randrange(4, w - 4), rnd.randrange(4, h - 4)
            if rnd.random() < b[y, x]: break
        g = GC[rnd.randrange(min(S, 5))]
        cross(t, x, y, (236, 240, 250), tuple(v * 0.5 for v in g), big=S >= 4 and j % 3 == 0)
    return t


TIPS = []
TONE = {'b': [(0, 0, 0), (9, 11, 26), (18, 22, 48), (30, 36, 72), (46, 56, 100), (84, 100, 150), (190, 204, 236)],
        'v': [(0, 0, 0), (12, 8, 24), (24, 15, 44), (38, 24, 66), (56, 38, 92), (96, 76, 136), (206, 190, 232)],
        'r': [(0, 0, 0), (16, 7, 16), (32, 13, 30), (52, 20, 46), (80, 32, 66), (140, 70, 108), (244, 196, 214)],
        'g': [(0, 0, 0), (14, 10, 8), (28, 20, 14), (46, 34, 20), (72, 54, 28), (130, 102, 52), (250, 232, 180)],
        't': [(0, 0, 0), (5, 14, 16), (9, 28, 30), (14, 46, 46), (22, 70, 66), (48, 128, 112), (176, 246, 220)]}
TN = 'brtgv'
GC = [(120, 170, 255), (255, 130, 180), (96, 232, 200), (255, 206, 110), (190, 130, 255)]   # 은하 다섯 색(보석·불빛용)


def tree(d, rnd, x, y, ang, length, lvl, pal):
    """빛의 나무 가지. 위로 뻗다 갈라지고, 갈라질수록 어두워진다."""
    px, py = float(x), float(y)
    for k in range(int(length)):
        ang += rnd.uniform(-0.16, 0.16)
        ang = min(-0.12, max(-math.pi + 0.12, ang))             # 가지는 아래로 처지지 않는다
        px += math.cos(ang); py += math.sin(ang) * 0.92
        f = lvl + k / max(1.0, length) * 0.9
        c = pal[min(len(pal) - 1, int(f))]
        d.px(round(px), round(py), c)
        if lvl < 1 and k < length * 0.7:
            d.px(round(px) + 1, round(py), pal[min(len(pal) - 1, int(f) + 1)])
    if not (lvl < len(pal) - 1.2 and length > 7):
        TIPS.append((round(px), round(py), lvl))
    if lvl < len(pal) - 1.2 and length > 7:
        n = 2 if rnd.random() < 0.75 else 3
        for i in range(n):
            spread = rnd.uniform(0.28, 0.62) * (1 if i % 2 else -1) * (1 + 0.12 * lvl)
            tree(d, rnd, px, py, ang + spread, length * rnd.uniform(0.62, 0.86), lvl + rnd.uniform(0.75, 1.1), pal)


STAGE = 1
GAL = [(430, 74, 27, -0.46, 0.5, 'b'), (346, 122, 24, -0.2, 0.42, 'r'), (258, 150, 22, -0.75, 0.38, 't'), (166, 208, 22, -0.3, 0.4, 'g'), (72, 244, 24, -0.6, 0.44, 'v')]   # 은하 띠를 따라 놓는다


def link(d, p0, p1, r0, r1, on, bend=10):
    """두 자리를 잇는 길. 켜진 길은 촘촘한 빛 점, 잠든 길은 드문 어두운 점."""
    (x0, y0), (x1, y1) = p0, p1
    L = math.hypot(x1 - x0, y1 - y0)
    nx, ny = -(y1 - y0) / L, (x1 - x0) / L
    for k in range(int(L)):
        if k < r0 or k > L - r1: continue
        f = k / L
        x = x0 + (x1 - x0) * f + nx * math.sin(f * math.pi) * bend
        y = y0 + (y1 - y0) * f + ny * math.sin(f * math.pi) * bend
        if on:
            if k % 2 == 0: d.px(round(x), round(y), (150, 226, 222) if k % 12 == 0 else (64, 124, 146) if k % 4 == 0 else (40, 78, 108))
        elif k % 5 == 0:
            d.px(round(x), round(y), (58, 70, 110))


def dormant(d, gx, gy, gr, tl, sq):
    """아직 켜지지 않은 은하 자리: 어두운 핵과 점선 고리."""
    for k in range(0, 360, 15):
        u, v = math.cos(math.radians(k)) * gr * 0.6, math.sin(math.radians(k)) * gr * 0.6 * sq
        d.px(round(gx + u * math.cos(tl) - v * math.sin(tl)), round(gy + u * math.sin(tl) + v * math.cos(tl)), (84, 100, 146))
    d.px(gx, gy, (128, 144, 188))
    for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
        d.px(gx + dx, gy + dy, (60, 74, 114))


def spiral(h, w, cx, cy, r, tilt, squash, twist=2.6, seed=0):
    """나선 은하 하나의 세기(0..1). 기울고 눌린 원반에 팔 둘, 가운데 핵."""
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    dx, dy = xx - cx, yy - cy
    u = dx * math.cos(tilt) + dy * math.sin(tilt)
    v = (-dx * math.sin(tilt) + dy * math.cos(tilt)) / squash
    rr = np.hypot(u, v) / r
    th = np.arctan2(v, u)
    arm = (np.cos(2 * (th - twist * np.log(rr + 0.06))) + 1) / 2
    n = tab5.noise(40 + seed, 5, h, w)
    disk = np.exp(-rr * 2.4) * (0.25 + 0.95 * arm ** 2) * (0.7 + 0.6 * n)
    core = np.exp(-(rr / 0.16) ** 2)
    return np.clip(disk * 1.5 + core, 0, 1) * (rr < 1.25)


def dunes(seed, base, amp, cell, bumps=(), W2=W2):
    n = tab5.noise(seed, cell, H2, W2)[H2 // 3]
    n2 = tab5.noise(seed + 1, cell // 3, H2, W2)[H2 // 2]
    return np.array([H2 - max(2, int(round(base + (n[x] - 0.5) * 2 * amp + (n2[x] - 0.5) * 2 + sum(hh * math.exp(-((x - cx) / ww) ** 2) for cx, hh, ww in bumps)))) for x in range(W2)])


def glow(a, cx, cy, rad, col, k):
    """tab5.glow, 그림의 크기대로."""
    yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]]
    m = np.clip(1 - np.hypot(xx - cx, yy - cy) / rad, 0, 1) ** 1.6 * k
    a += (np.array(col, np.float32) - a) * m[..., None]


def astral(w2=None):
    S = STAGE
    W2 = w2 or tab5.W2                                                 # (구현) 장면의 폭(도트)
    kx = W2 / tab5.W2
    X = lambda v: int(round(v * kx))
    R = W2 - 1
    GAL = [(X(g[0]),) + g[1:] for g in globals()['GAL']]
    noise = lambda seed, cell: tab5.noise(seed, cell, H2, W2)
    base = (12, 15, 34)
    yy, xx = np.mgrid[0:H2, 0:W2].astype(np.float32)
    # 하늘: 위는 깊은 남색, 지평선 쪽은 청록 기운
    g = (yy / H2) ** 1.7
    sky = np.clip(g * 0.55 + (noise(2, 60) - 0.5) * 0.18, 0, 1)
    a = quant(sky, [(9, 11, 27), (11, 14, 33), (13, 18, 40), (15, 24, 48), (17, 31, 56), (20, 40, 64)], H2, W2)
    # 은하 띠: 왼쪽 아래에서 오른쪽 위로
    b, off = band(H2, W2, 11, -30, H2 * 0.86, W2 + 30, H2 * 0.06, 52)
    gal = quant(b, [(0, 0, 0), (8, 7, 20), (15, 12, 34), (22, 19, 48), (29, 28, 62), (36, 40, 76)], H2, W2)
    warm = (noise(13, 34) > 0.6) & (b > 0.45)                    # 띠 속의 보랏빛 덩어리
    gal[warm] = gal[warm] * np.array((1.25, 0.9, 1.1), np.float32)
    a = a + gal * 0.88
    # 은하 다섯 자리는 처음부터 정해져 있고, 성수만큼 켜진다 (나무 위에서 왼쪽 위로 휘는 길)
    for i in range(S):
        gx, gy, gr, tl, sq, tn = GAL[i]
        a = a + quant(spiral(H2, W2, gx, gy, gr, tl, sq, seed=i + 1) ** 0.8, TONE[tn], H2, W2)
    d = Dots(W2, H2)
    r = random.Random(5)
    stars(d, r, 0.10 + b * 0.9, H2, W2, [(50, 64, 100), (60, 78, 116), (42, 90, 98), (78, 70, 112)], X(9000))   # 잔별
    stars(d, r, 0.03 + b * 0.5, H2, W2, [(108, 124, 166), (84, 150, 156), (146, 130, 92)], X(450))             # 밝은 별
    for _ in range(X(26)):                                              # 큰 별(십자): 띠 위에, 오른쪽 위에 더 많이
        x, y = r.randrange(6, W2 - 6), r.randrange(6, H2 - 40)
        if b[y, x] > 0.5 or (x > W2 * 0.72 and y < 60):
            col, dimc = r.choice([((255, 246, 214), (150, 132, 92)), ((214, 250, 246), (70, 140, 146))])
            d.px(x, y, col)
            for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                d.px(x + dx, y + dy, dimc)
    # 빛의 나무: 오른쪽 아래 언덕에서 솟아 하늘로 갈라진다
    far = dunes(4, 15, 4, 46, [(R - 150, 6, 60), (X(120), 5, 80)], W2)
    near = dunes(8, 7, 3.5, 60, [(R - 46, 9, 44), (X(60), 4, 50), (W2 * 0.5, 3, 40)], W2)
    tx = R - 46
    pal = [(236, 255, 250), (150, 236, 226), (72, 160, 168), (42, 100, 124), (30, 66, 98), (24, 46, 76)]
    TIPS.clear()
    t = Dots(W2, H2)
    tr = random.Random(21)
    TRH = [13, 16, 19, 22, 25][S - 1]
    TW3 = [(1, 1, 0), (1, 1, 0), (2, 1, 0), (2, 1, 1), (2, 2, 1)][S - 1]
    for k in range(0, TRH):                                            # 줄기: 아래는 굵고 위로 가늘게 (성수가 오르면 크고 굵게)
        y = near[tx] - k
        wdt = TW3[0] if k < TRH * 0.28 else TW3[1] if k < TRH * 0.68 else TW3[2]
        for i in range(-wdt, wdt + 1):
            t.px(tx + i, y, pal[0] if abs(i) < max(1, wdt - 1) else pal[1])
        if k % 5 == 2 and k > 6:
            t.px(tx - wdt - 1, y, pal[2]); t.px(tx + wdt + 1, y - 1, pal[2])
    top_y = near[tx] - TRH
    BR = [(-1.57, 40, 0.0), (-2.15, 46, 0.5), (-0.95, 40, 0.6), (-2.6, 50, 1.0), (-0.5, 34, 1.1), (-1.9, 36, 0.8), (-1.25, 36, 0.8)]
    BR += [(-2.38, 40, 0.9), (-0.72, 36, 0.9), (-1.72, 34, 0.6), (-1.4, 38, 0.5), (-2.8, 44, 1.3), (-0.34, 30, 1.3), (-2.0, 42, 0.4), (-1.1, 40, 0.5)]
    BR = BR[:[3, 5, 7, 9, 11][S - 1]]
    grow = [0.32, 0.38, 0.44, 0.5, 0.56][S - 1]
    for ang, ln, lv in BR:
        tree(t, tr, tx, top_y + 2, ang, ln * grow, lv, pal)
    lf = random.Random(33)
    if S >= 3:                                                         # 가지 끝에 빛 잎이 돋는다
        for (x, y, lv) in TIPS:
            if y < top_y + 6:
                for _ in range([0, 0, 2, 4, 6][S - 1]):
                    dx, dy = lf.randrange(-2, 3), lf.randrange(-2, 2)
                    t.px(x + dx, y + dy, pal[3] if lf.random() < 0.6 else pal[2] if lf.random() < (0.8 if S < 5 else 0.5) else pal[1])
    for i, (x, y, lv) in enumerate(TIPS):                              # 가지 끝에 맺힌 별 (셋에 하나)
        if i % [3, 1, 1, 1, 1][S - 1] == 0 and y < top_y:
            t.px(x, y, (255, 246, 214) if i % 2 else (214, 250, 246))
            if i % 9 == 0:
                for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                    t.px(x + dx, y + dy, (150, 132, 92))
    for sx, ln, lv in [(tx - 74, 8, 2.2), (tx - 118, 7, 2.6), (tx - 160, 10, 2.0), (X(150), 8, 2.6), (X(62), 9, 2.4), (tx - 96, 12, 1.6), (X(238), 8, 2.4), (tx + 34, 9, 1.8)][:[0, 0, 2, 5, 8][S - 1]]:
        tree(t, tr, sx, near[sx], -1.57, ln, lv, pal)                  # 언덕에 돋은 어린 나무
    if S >= 4:                                                         # 나무 둘레에 떠도는 빛 알갱이
        for _ in range(24 if S == 4 else 50):
            ang, rad = lf.uniform(0, 6.28), lf.uniform(10, 26 + 7 * S)
            t.px(tx + math.cos(ang) * rad, top_y - 10 + math.sin(ang) * rad * 0.7, lf.choice([pal[2], pal[3], (150, 132, 92)]))
    # 은하 길: 나무 꼭대기 → 첫 은하 → … → 다섯째. 켜진 은하 사이만 빛난다
    crown = min([(y, x) for x, y, lv in TIPS if abs(x - tx) < 40] + [(top_y, tx)])
    link(t, (crown[1], crown[0] - 3), GAL[0][:2], 0, GAL[0][2] * 0.55, True, -8)
    for i in range(4):
        link(t, GAL[i][:2], GAL[i + 1][:2], GAL[i][2] * 0.55, GAL[i + 1][2] * 0.55, i + 1 < S, 8 if i % 2 else -8)
    for i in range(S, 5):
        dormant(t, *GAL[i][:5])
    if S >= 5:                                                         # 다 켜지면 별똥별
        for k in range(16):
            t.px(X(366) - k * 2, 150 + k, [(255, 250, 230), (200, 236, 236), (120, 180, 196), (60, 110, 140), (36, 66, 100)][min(4, k // 3)])
            if k < 4: t.px(X(366) - k * 2 - 1, 150 + k, (200, 236, 236))
    for k in range(1, 4 + S):                                           # 뿌리: 모래 위로 번지는 빛줄기
        for sgn in (-1, 1):
            t.px(tx + sgn * (3 + k * 2), near[tx + sgn * (3 + k * 2)] - (1 if k < 3 else 0), pal[min(5, 1 + k // 2)])
    s6.merge(d, t)
    # 모래 언덕: 먼 언덕(어둡게) + 가까운 언덕(별빛 받은 능선)
    for x in range(W2):
        lit = math.exp(-((x - tx) / (38.0 + 7 * (S - 1))) ** 2)
        for y in range(far[x], H2):
            if y < near[x]:
                d.px(x, y, (62, 78, 116) if y == far[x] else (30, 40, 72) if (x + y) % 2 or y - far[x] < 3 else (25, 33, 62))
        for y in range(near[x], H2):
            dep = y - near[x]
            if dep == 0:
                c = (78 + 160 * lit, 96 + 150 * lit, 138 + 108 * lit)
            elif dep < 2 + 3 * lit:
                c = (56 + 64 * lit, 70 + 90 * lit, 108 + 74 * lit)
            else:
                c = (44, 56, 92) if (x + y * 2) % 4 else (52, 66, 104)
            d.px(x, y, c)
        if r.random() < 0.05:                                          # 모래에 박힌 별가루
            d.px(x, r.randrange(near[x] + 2, H2 + 1) - 1, (120, 210, 204))
    p = Dots(W2, H2)                                                   # 나무 곁의 별조각
    for x, w, h, lean, pl in [(tx - 20, 4, 9, -1, TEAL), (tx - 14, 3, 5, 1, tab5.dim(TEAL, 0.6, base)), (tx + 17, 4, 8, 1, TEAL), (tx - 31, 3, 4, -1, tab5.dim(TEAL, 0.6, base)), (tx + 27, 3, 5, 1, tab5.dim(TEAL, 0.7, base)),
                              (tx - 44, 4, 7, 1, TEAL), (tx - 52, 3, 4, -1, tab5.dim(TEAL, 0.6, base)), (tx + 38, 4, 10, -1, TEAL), (tx - 66, 5, 11, -1, TEAL), (tx - 90, 3, 6, 1, tab5.dim(TEAL, 0.7, base)),
                              (tx - 128, 4, 8, 1, TEAL), (tx - 136, 3, 4, -1, tab5.dim(TEAL, 0.6, base)), (X(190), 4, 7, -1, tab5.dim(TEAL, 0.8, base)), (X(96), 3, 5, 1, tab5.dim(TEAL, 0.7, base))][:[5, 7, 10, 12, 14][S - 1]]:
        prism(p, x, near[x] + 1, w, h, lean, pl)
    s6.outline(p, O)
    s6.merge(d, p)
    full = np.clip(a, 0, 255).repeat(2, 0).repeat(2, 1)
    full = np.pad(full, ((0, TH - full.shape[0]), (0, 0), (0, 0)), mode='edge')
    d.onto(full)
    glow(full, tx * 2, near[tx] * 2 - 8, 60 + 9 * (S - 1), (110, 230, 220), 0.30 + 0.03 * (S - 1))   # 나무 밑동의 빛
    glow(full, tx * 2, top_y * 2, 64 + 11 * (S - 1), (70, 170, 190), 0.12 + 0.02 * (S - 1))           # 가지 둘레
    glow(full, full.shape[1] - 150, 70, 220, (70, 64, 124), 0.07)                 # 은하 밝은 쪽
    return full, dict(name='별의 성소', fg=(226, 234, 246), cursor=(255, 226, 140), dim=(124, 138, 170), base=base, deco=(26, 33, 62))


LX = [319, 353, 387, 421, 455]                                         # 별불 등 다섯 자리(도트)
GOLD = [(255, 230, 160), (216, 172, 78), (138, 100, 38), (58, 42, 16)]


def lantern(a, cx, col, on, S, i):
    """별불 등: 횃불의 금 받침에 불꽃 대신 별불이 뜨고, 은하처럼 고리가 돈다. 성수만큼 켜진다."""
    col = np.array(col, np.float32)
    def px(x, y, c):
        if y >= 0: a[y * 2:y * 2 + 2, x * 2:x * 2 + 2] = c
    g = GOLD if on else [tuple(v * 0.5 + 8 for v in c) for c in GOLD]
    for dx in range(-3, 4): px(cx + dx, 15, g[0] if abs(dx) < 3 else g[1])           # 받침 접시
    for dx in range(-2, 3): px(cx + dx, 16, g[1] if dx < 1 else g[2])
    for dx in range(-1, 2): px(cx + dx, 17, g[2])
    px(cx, 18, g[1]); px(cx, 19, g[2])
    for dx in range(-2, 3): px(cx + dx, 20, g[1] if abs(dx) < 2 else g[2])
    px(cx - 4, 14, g[1]); px(cx + 4, 14, g[1]); px(cx - 4, 13, g[0]); px(cx + 4, 13, g[0])   # 별불을 받치는 갈고리
    fy = 8
    if not on:                                                         # 잠든 등: 식은 불씨와 흐린 고리
        px(cx, fy + 1, (70, 84, 126)); px(cx, fy, (48, 58, 94))
        for dx in (-5, -3, 3, 5): px(cx + dx, fy + (1 if abs(dx) == 3 else 0) * (1 if dx > 0 else -1), (46, 56, 90))
        return
    big = 1 if S >= 4 else 0
    c4.glow(a, cx * 2 + 1, fy * 2 + 2, 26 + 4 * S, tuple(col), 0.30 + 0.04 * S, 1.0)
    for k in range(-6, 7):                                             # 고리 뒤쪽 반(별불 뒤)
        px(cx + k, fy - 1 - round(k * 0.34), col * 0.45)
    shape = {-4 - big: 0, -3 - big: 0, -3: 0, -2: 1, -1: 1, 0: 2 + big, 1: 1, 2: 1, 3: 0}        # 위로 긴 네 갈래 별불
    for dy, hw in shape.items():
        for dx in range(-hw, hw + 1):
            d = abs(dx) + abs(dy) * 0.5
            px(cx + dx, fy + dy, (255, 252, 240) if d < 1.1 else col * 0.6 + 100 if d < 2.1 else col)
    for k in range(-6, 7):                                             # 고리 앞쪽 반
        if abs(k) > 1: px(cx + k, fy + 1 - round(k * 0.34), col * 0.5 + 120 if k % 2 == 0 else col)
    px(cx - 7, fy + 3, (255, 252, 240)); px(cx + 7, fy - 2, col * 0.7)   # 고리를 도는 알갱이
    r = random.Random(40 + i)
    for _ in range(S):                                                 # 위로 날리는 불티
        px(cx + r.randrange(-4, 5), r.randrange(0, 4), col * r.uniform(0.5, 1.0))


def adorn(a):
    """터미널 밖 꾸밈: 금테 보석·금테 별 상감·돌 턱의 별빛·거미줄 지우기. 성수가 오르면 는다."""
    S = STAGE
    a = a.astype(np.float32)
    hh, ss, vv = c4.hsv(a)
    tex = c4.up(floor())
    web = c4.rect_mask([(15, 372, 44, 402), (233, 428, 264, 456)]) & (ss < 0.3) & (vv > 0.16) & (vv < 0.62)
    a[web] = tex[web]                                                  # 던전의 거미줄은 걷어낸다
    wt = c4.up(wall(3))                                                # 던전의 횃불을 걷어내고 그 자리에 은하 다섯을 건다
    x0, x1, y1 = 600, 950, 46
    f = np.clip(np.minimum(np.arange(x0, x1) - x0, x1 - 1 - np.arange(x0, x1)) / 40.0, 0, 1)[None, :, None]
    a[0:y1, x0:x1] = a[0:y1, x0:x1] * (1 - f) + wt[0:y1, x0:x1] * 1.15 * f
    for i in range(5):
        lantern(a, LX[i], GC[i], i < S, S, i)
    k = 0
    for fx0, fy0, fx1, fy1 in gz.FRAMES[:2]:                           # 모서리 보석: 켜진 은하의 색으로
        for cx, cy in [(fx0, fy0), (fx1, fy0), (fx0, fy1), (fx1, fy1)]:
            box = np.zeros(hh.shape, bool)
            box[max(0, cy - 12):cy + 12, max(0, cx - 12):cx + 12] = True
            sel = box & (hh > 150) & (hh < 195) & (ss > 0.4) & (vv > 0.3)
            a[sel] = np.clip(np.array(GC[k % S], np.float32) * (vv[sel, None] / 0.89), 0, 255)
            if S >= 3:
                c4.glow(a, cx + 2, cy + 2, 16 + 3 * S, GC[k % S], 0.10 + 0.03 * S, 1.0)
            k += 1
    # 금테: 성수가 오르면 밝아지고, ★3부터 은하 색 윤기가 테를 따라 흐른다
    hh, ss, vv = c4.hsv(a)
    bandm = np.zeros(hh.shape, bool)
    for fx0, fy0, fx1, fy1 in gz.FRAMES:
        o = np.zeros(hh.shape, bool); o[max(0, fy0 - 9):fy1 + 10, max(0, fx0 - 9):fx1 + 10] = True
        o[fy0 + 10:fy1 - 9, fx0 + 10:fx1 - 9] = False
        bandm |= o
    gold = bandm & (hh > 22) & (hh < 62) & (ss > 0.28) & (vv > 0.3)
    a[gold] *= [0.74, 0.86, 0.96, 1.04, 1.1][S - 1]
    sh = [0, 0, 0.22, 0.36, 0.5][S - 1]
    if sh:
        cs = np.array(GC[:S] + GC[:1], np.float32)
        ph = ((c4.XX + c4.YY * 0.6) / 150.0) % len(GC[:S])
        i0 = np.floor(ph).astype(int)
        col = cs[i0] + (cs[i0 + 1] - cs[i0]) * (ph - i0)[..., None]
        wv = (0.5 + 0.5 * np.sin((c4.XX - c4.YY) / 38.0)) ** 2          # 윤기는 군데군데 맺힌다
        m = (sh * wv)[gold][:, None]
        a[gold] = a[gold] * (1 - m) + col[gold] * (vv[gold][:, None] * 1.15) * m
    # 모서리에서 테를 따라 번지는 별빛
    Lr = [0, 14, 24, 36, 50][S - 1]
    kk = 0
    for fx0, fy0, fx1, fy1 in gz.FRAMES:
        for cx, cy, sx, sy in [(fx0, fy0, 1, 1), (fx1, fy0, -1, 1), (fx0, fy1, 1, -1), (fx1, fy1, -1, -1)]:
            g = np.array(GC[kk % S], np.float32); kk += 1
            for q in range(0, Lr, 2):
                f = 1 - q / Lr
                c = (np.array((255, 252, 240), np.float32) * f + g * (1 - f)) if f > 0.5 else g * (0.35 + 1.3 * f)
                for (x, y) in ((cx + sx * (q + 4), cy), (cx, cy + sy * (q + 4))):
                    if 0 <= y < a.shape[0] - 2 and 0 <= x < a.shape[1] - 2:
                        a[y:y + 2, x:x + 2] = np.maximum(a[y:y + 2, x:x + 2], c)
            if S >= 3:
                for q in range(2, 4 + 2 * S, 2):                       # 대각 빛살
                    for dx, dy in ((sx, sy), (-sx, -sy), (sx, -sy), (-sx, sy)):
                        x, y = cx + dx * q, cy + dy * q
                        if 0 <= y < a.shape[0] - 2 and 0 <= x < a.shape[1] - 2:
                            a[y:y + 2, x:x + 2] = np.maximum(a[y:y + 2, x:x + 2], g * (1.0 - q / (6 + 2 * S)))
            if S >= 2:
                c4.glow(a, cx, cy, 14 + 6 * S, tuple(g), 0.10 + 0.05 * S, 1.0)
    r = random.Random(9)
    step = [0, 230, 180, 140, 104][S - 1]
    if step:                                                           # 금테에 박힌 별
        for fx0, fy0, fx1, fy1 in gz.FRAMES:
            for y in (fy0, fy1):
                x = fx0 + 30 + r.randrange(60)
                while x < fx1 - 30:                                    # 간격과 크기를 들쭉날쭉하게
                    a[y:y + 4, x:x + 2] = (255, 252, 236)
                    if r.random() < 0.3 + 0.1 * S:
                        a[y + 1:y + 3, x - 2:x + 4] = (255, 252, 236)
                        if S >= 4 and r.random() < 0.5:
                            a[y - 2:y, x:x + 2] = (150, 226, 222); a[y + 4:y + 6, x:x + 2] = (150, 226, 222)
                    x += step + r.randrange(-step // 3, step // 2)
    sill = (c4.YY >= 783) & (c4.YY < 790) & (c4.XX > 280) & (c4.XX < 1270)
    for x in range(292, 1262, 12):                                     # 석판 아래 턱: 은하 색 불빛이 성수만큼 켜진다
        j = (x // 12) % 5
        if j < S and r.random() < 0.08 + 0.13 * S:
            a[785:787, x:x + 2] = GC[j]
            c4.glow(a, x + 1, 786, 8, GC[j], 0.35, 1.0)
    return np.clip(a, 0, 255).astype(np.uint8)


KEY = 'astral'
c4.ZONES[KEY] = dict(name='별의 성소', wall=wall, tab=(12, 15, 34), floor=(10, 13, 29), grow=(18, 22, 46),
                     ramp=['#3a2a10', '#8a6426', '#d8ac4e', '#ffe6a0', '#fffbe6'], flame=174,
                     rest=(226, 0.8, 0.9), fg=(226, 234, 246), cursor=(255, 226, 140))
zones5.ZONES[KEY] = astral
floors6.FLOORS[KEY] = floor
gz.SILL[KEY] = (64, 80, 124)
gz.GEM[KEY] = (96, 226, 210)
