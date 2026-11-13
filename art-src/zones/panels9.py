"""9차: 패널 안쪽을 구역의 재질과 사물로. (얼음·수정·왕좌. 용암·이끼는 8차 floors6 그대로)

패널 한 칸 = ① 바닥(벽돌이 아니라 그 구역의 재질) ② 윗선(틀 윗변에 매달린 것) ③ 아랫선(바닥에 쌓인 것)
④ 귀퉁이 사물(거미줄 자리). 글자는 이 그림들 위에 놓이므로, 밝은 것은 여백(틀에서 6px)과 귀퉁이에만 두고
글자 뒤로 지나가는 바닥 무늬는 밝기 차를 작게 한다. 도트는 2px.
"""
import math
import random

import numpy as np

import scenes6 as s6
from floors6 import HH, HW, hnoise
from tab5 import Dots, prism


def env(x, w, near):
    """귀퉁이에서 1, 안쪽으로 갈수록 0."""
    return math.exp(-min(x, w - 1 - x) / near)


def smooth(rnd, n, k=3):
    v = [rnd.random() for _ in range(n + k)]
    return [sum(v[i:i + k]) / k for i in range(n)]


def spike(d, x, y0, n, wd, pal, down=True):
    """뿌리 폭 wd에서 끝 1도트로 가늘어지는 것(고드름·종유석). 왼쪽 모서리가 밝다."""
    for j in range(n):
        wj = max(1, int(round(wd * (1 - j / n) + 0.3)))
        off = x + (wd - wj) // 2
        for i in range(wj):
            if wj == 1:
                c = pal['h'] if j == n - 1 and n > 2 else pal['l']
            else:
                c = pal['h'] if i == 0 else (pal['m'] if i == wj - 1 else pal['l'])
            d.px(off + i, y0 + j if down else y0 - j, c)


def walk(mask, rnd, x, y, ang, n, wob=0.22, kink=0.08):
    """꺾이며 뻗는 금 한 줄. 지나간 자리를 돌려준다."""
    pts = []
    for _ in range(n):
        xi, yi = int(round(x)), int(round(y))
        if 0 <= xi < mask.shape[1] and 0 <= yi < mask.shape[0]:
            mask[yi, xi] = True
        pts.append((x, y, ang))
        ang += rnd.uniform(-wob, wob) + (rnd.choice([-0.7, 0.7]) if rnd.random() < kink else 0)
        x += math.cos(ang)
        y += math.sin(ang)
    return pts


def grow(m):
    n = m.copy()
    n[1:] |= m[:-1]; n[:-1] |= m[1:]; n[:, 1:] |= m[:, :-1]; n[:, :-1] |= m[:, 1:]
    return n


# ───────────────────────── 얼음 동굴: 빙판 ─────────────────────────
def floor_ice(seed=7):
    """빙판: 줄눈이 없다. 비스듬한 반사 띠, 흰 금과 그 둘레의 성에, 갇힌 공기 방울."""
    rnd = random.Random(seed)
    yy, xx = np.mgrid[0:HH, 0:HW]
    t = np.zeros((HH, HW, 3), np.float32)
    t[:] = (14, 31, 47)
    t += (hnoise(seed, 52)[..., None] - 0.5) * np.array((5, 9, 11), np.float32)   # 얼음 밑 물의 깊이
    d, p = xx + yy, xx - yy
    c = 8
    while c < HW + HH:                                                # 반사 띠(45°): 넓은 띠 하나와 가는 줄 하나
        wd = rnd.choice([2, 3, 3, 5])
        q = -HH - rnd.randrange(60)
        while q < HW:
            ln = rnd.randrange(44, 150)
            if rnd.random() < 0.6:
                t[(d >= c) & (d < c + wd) & (p >= q) & (p < q + ln)] += (6, 11, 14)
                t[(d == c + wd + 2) & (p >= q + 8) & (p < q + ln - 12)] += (13, 21, 25)
            q += ln + rnd.randrange(16, 70)
        c += rnd.randrange(24, 60)
    main, twig = np.zeros((HH, HW), bool), np.zeros((HH, HW), bool)
    for _ in range(46):                                               # 금: 큰 줄기에서 잔가지가 갈라진다
        pts = walk(main, rnd, rnd.randrange(HW), rnd.randrange(HH), rnd.choice([-1, 1]) * rnd.uniform(0.5, 1.3) + rnd.choice([0, math.pi]), rnd.randrange(36, 110))
        for x, y, ang in pts[6::rnd.randrange(9, 17)]:
            walk(twig, rnd, x, y, ang + rnd.choice([-1, 1]) * rnd.uniform(0.6, 1.1), rnd.randrange(6, 22), wob=0.3)
    twig &= ~main
    halo = grow(main) & ~main & ~twig
    t[np.roll(main, 1, 0) & ~main & ~twig] += (-4, -7, -8)            # 금 아래 그늘: 얼음의 두께
    t[halo & ((xx + yy) % 2 == 0)] += (9, 15, 17)                      # 금 둘레의 성에
    t[twig] += (17, 27, 31)
    t[main] += (32, 48, 54)
    for _ in range(150):                                              # 갇힌 공기 방울 (몇 개씩 모여 있다)
        bx, by = rnd.randrange(4, HW - 4), rnd.randrange(4, HH - 4)
        for _ in range(rnd.randrange(1, 5)):
            x, y = bx + rnd.randrange(-4, 5), by + rnd.randrange(-4, 5)
            if not (2 <= x < HW - 3 and 2 <= y < HH - 3):
                continue
            if rnd.random() < 0.35:
                for dx, dy, k in [(1, 0, 1.0), (0, 1, 1.0), (2, 1, 0.4), (1, 2, 0.4)]:
                    t[y + dy, x + dx] += np.array((13, 21, 24), np.float32) * k
            else:
                t[y, x] += (13, 21, 24)
                t[y + 1, x] += (-3, -5, -6)
    n = hnoise(seed + 9, 24)
    t[(n > 0.72) & ((xx + yy) % 2 == 0)] += (8, 14, 17)               # 성에가 뿌옇게 낀 자리
    t[n > 0.82] += (4, 7, 9)
    for _ in range(95):                                               # 성에꽃(눈 결정)
        x, y = rnd.randrange(6, HW - 6), rnd.randrange(6, HH - 6)
        rows = FLAKE if rnd.random() < 0.45 else FLAKE_S
        o = len(rows) // 2
        for j, r in enumerate(rows):
            for i, ch in enumerate(r):
                if ch != '.':
                    t[y - o + j, x - o + i] += np.array((30, 44, 50), np.float32) * (1.0 if ch == '#' else 0.5)
    return np.clip(t, 0, 255)


FLAKE = ['...#...', '.+.#.+.', '..+#+..', '###.###', '..+#+..', '.+.#.+.', '...#...']
FLAKE_S = ['..#..', '#.#.#', '.#.#.', '#.#.#', '..#..']
ICE = {'h': (200, 230, 246), 'l': (122, 174, 206), 'm': (74, 124, 160), 'd': (46, 88, 124)}
ICE_DIM = {'h': (150, 196, 222), 'l': (86, 136, 172), 'm': (54, 98, 134), 'd': (36, 70, 102)}
ICE_O = (9, 22, 35)


def snow(d, w, h, rnd, base=1, corner=4.5, near=6.0, lift=None):
    """아랫변에 쌓인 눈. lift[x] = 그 자리에서 더 높이(귀퉁이 사물의 밑동)."""
    nz = smooth(rnd, w, 4)
    for x in range(w):
        hg = base + int(round(corner * env(x, w, near) + 1.3 * nz[x] - 0.4)) + (lift[x] if lift else 0)
        for j in range(hg):
            y = h - 1 - j
            c = (224, 238, 248) if j == hg - 1 else ((168, 198, 220) if j == hg - 2 or (x + y) % 2 else (118, 154, 186))
            d.px(x, y, c)


def dress_ice(d, w, h, corner, rnd):
    for x in range(w):                                                # 윗변의 얼음 껍질
        d.px(x, 0, (178, 216, 238))
        if rnd.random() < 0.55:
            d.px(x, 1, (104, 156, 192))
    x = 0
    while x < w:                                                      # 고드름: 귀퉁이에서 길고 가운데는 짧다
        e = env(x, w, 5.5)
        if e > 0.22:
            wd = rnd.choice([3, 4]) if e > 0.5 else rnd.choice([2, 2, 3])
            lm = 3 + int(round(19 * e))
            n = max(2, lm - rnd.randrange(0, 1 + lm // 3))
            gap = rnd.randrange(0, 2)
        else:
            wd, n, gap = rnd.choice([1, 2, 2]), rnd.choice([2, 2, 3, 4]), rnd.randrange(1, 4)
        spike(d, x, 1, n, wd, ICE)
        x += wd + gap
    for side in (0, 1):                                               # 성에: 틀 안쪽 가장자리를 따라 끼었다 끊겼다 한다
        nz = smooth(rnd, h, 7)
        for y in range(2, h - 2):
            reach = (nz[y] - 0.42) * 9 + 3.0 * env(y, h, 6.0)
            for i in range(4):
                x = i if side == 0 else w - 1 - i
                if i < reach and not d.get(x, y) and (i == 0 or (x + y) % 2 == 0):
                    d.px(x, y, (146, 190, 218) if i == 0 else ((104, 152, 188) if i < 2 else (70, 114, 150)))
    lift = [0] * w
    if corner:
        t = Dots(34, 30)
        for cx, pw, ph, lean in [(13, 4, 10, 2), (6, 6, 23, -1), (2, 3, 11, -2), (18, 4, 8, 3), (23, 3, 6, 3), (10, 3, 6, 1), (28, 3, 4, 2)]:   # 얼음 결정 무더기
            prism(t, cx, 29, pw, ph, lean, ICE if ph > 9 else ICE_DIM)
        s6.outline(t, ICE_O)
        put(d, t, corner, w, h, 1, 0)
        for i in range(34):
            x = 1 + i if corner == 'bl' else w - 2 - i
            lift[x] = max(0, int(round(4.2 * math.exp(-(i / 22.0) ** 2) + (i * 7 % 3) * 0.5)))
    snow(d, w, h, rnd, lift=lift)
    return []


def put(d, t, corner, w, h, mx, my, k=1.0):
    """귀퉁이 그림(왼쪽 아래 기준으로 그린 것)을 놓는다. 오른쪽이면 뒤집는다."""
    c, a = (t.c, t.a) if corner[1] == 'l' else (t.c[:, ::-1], t.a[:, ::-1])
    x0 = mx if corner[1] == 'l' else w - mx - t.w
    y0 = h - my - t.h
    for j in range(t.h):
        for i in range(t.w):
            if a[j, i] > 0:
                d.px(x0 + i, y0 + j, tuple(c[j, i] * k))


# ───────────────────────── 수정 광산: 캐다 만 암벽 ─────────────────────────
AME = {'h': (210, 186, 250), 'l': (146, 114, 218), 'm': (98, 70, 164), 'd': (62, 42, 114)}
AME_DIM = {'h': (164, 138, 220), 'l': (112, 84, 180), 'm': (76, 54, 132), 'd': (50, 34, 94)}
PINK = {'h': (240, 196, 228), 'l': (194, 120, 174), 'm': (134, 72, 120), 'd': (86, 44, 80)}
ROCKP = {'h': (102, 84, 150), 'l': (68, 54, 108), 'm': (48, 37, 82), 'd': (32, 23, 58)}
MINE_O = (15, 9, 29)


def floor_crystal(seed=7):
    """암벽: 물결치는 지층, 곡괭이 자국, 비스듬히 지나가는 자수정 광맥."""
    rnd = random.Random(seed)
    yy, xx = np.mgrid[0:HH, 0:HW]
    t = np.zeros((HH, HW, 3), np.float32)
    t[:] = (27, 20, 48)
    t += (hnoise(seed, 46)[..., None] - 0.5) * np.array((5, 4, 8), np.float32)
    f = yy / 9.0 + hnoise(seed + 1, 38) * 2.8 + hnoise(seed + 2, 11) * 0.5        # 지층
    band = np.floor(f).astype(int)
    t += (((band * 7) % 3 - 1) * 1.6)[..., None] * np.array((1, 0.8, 1.5), np.float32)
    line = (band != np.roll(band, 1, 0)) & (hnoise(seed + 3, 10) > 0.34)
    line[0] = False
    t[line] += (-7, -5, -10)
    t[np.roll(line, 1, 0) & ~line] += (5, 4, 8)                       # 층의 턱에 받는 빛
    for _ in range(230):                                              # 곡괭이 자국: 나란한 짧은 빗금 두세 줄
        x, y = rnd.randrange(6, HW - 12), rnd.randrange(4, HH - 8)
        ln, sx = rnd.randrange(3, 6), rnd.choice([-1, 1])
        for s in range(rnd.randrange(2, 4)):
            for k in range(ln):
                px, py = x + s * 3 + sx * k, y + k
                if 1 <= px < HW - 1 and py < HH:
                    t[py, px] += (-7, -5, -10)
                    t[py, px + 1] += (5, 4, 9)
    for i in range(13):                                               # 광맥
        pal = [AME, AME, AME, PINK][i % 4]
        m = np.zeros((HH, HW), bool)
        pts = walk(m, rnd, rnd.randrange(HW), rnd.randrange(HH), rnd.choice([-1, 1]) * rnd.uniform(0.35, 0.9) + rnd.choice([0, math.pi]), rnd.randrange(60, 150), wob=0.16, kink=0.04)
        t[m] = (56, 39, 100)
        t[np.roll(m, 1, 0) & ~m] += (-5, -4, -8)
        k = 0
        while k < len(pts):                                           # 광맥을 따라 돋은 작은 결정
            x, y = int(round(pts[k][0])), int(round(pts[k][1]))
            if 2 <= x < HW - 2 and 2 <= y < HH - 2:
                big = rnd.random() < 0.3
                dots = [(0, -1, 'l'), (0, 0, 'm'), (1, 0, 'd')] if not big else [(0, -2, 'h'), (-1, -1, 'l'), (0, -1, 'l'), (0, 0, 'm'), (1, -1, 'm'), (1, 0, 'd')]
                for dx, dy, ch in dots:
                    t[y + dy, x + dx] = tuple(v * 0.72 for v in pal[ch])
            k += rnd.randrange(4, 11)
    for _ in range(120):                                              # 돌 부스러기
        x, y = rnd.randrange(2, HW - 4), rnd.randrange(2, HH - 3)
        t[y, x:x + rnd.choice([2, 2, 3])] += (7, 6, 11)
        t[y + 1, x:x + 2] += (-6, -4, -9)
    # 바위가 벗겨져 결정 면이 드러난 자리: 길쭉하고 각진 면들이 모여 있고, 면마다 밝기가 다르다
    rng = np.random.default_rng(seed + 20)
    cw, chh = 8, 15
    d1 = np.full((HH, HW), 1e9, np.float32)
    d2 = d1.copy()
    ident = np.zeros((HH, HW), int)
    k = 0
    fx, fy = xx.astype(np.float32), yy.astype(np.float32)
    for j in range(-1, HH // chh + 2):
        for i in range(-1, HW // cw + 2):
            px, py = (i + rng.uniform(0.1, 0.9)) * cw, (j + rng.uniform(0.1, 0.9)) * chh
            dd = np.abs(fx - px + (fy - py) * 0.22) + np.abs(fy - py) * 0.42
            near = dd < d1
            d2 = np.where(near, d1, np.minimum(d2, dd))
            ident = np.where(near, k, ident)
            d1 = np.where(near, dd, d1)
            k += 1
    patch = (hnoise(seed + 5, 36) * 0.7 + hnoise(seed + 6, 13) * 0.3) > 0.61
    pinkish = hnoise(seed + 8, 90) > 0.62
    lv = rng.uniform(0.0, 1.0, k)[ident]
    vio = np.array((30, 21, 58), np.float32) + lv[..., None] * np.array((18, 13, 31), np.float32)
    pnk = np.array((40, 21, 46), np.float32) + lv[..., None] * np.array((26, 13, 26), np.float32)
    fac = np.where(pinkish[..., None], pnk, vio)
    left = (np.roll(ident, 1, 1) != ident)
    upp = (np.roll(ident, 1, 0) != ident) & ~left
    fac[left] += (20, 16, 34)                                         # 면의 왼쪽 모서리가 빛을 받는다
    fac[upp] += (9, 7, 15)
    fac[np.roll(left, -1, 1) & ~left] *= 0.8                          # 오른쪽 모서리 그늘
    t[patch] = fac[patch]
    rim = grow(patch) & ~patch
    t[rim] = (14, 9, 27)                                              # 결정을 문 바위 틈
    t[grow(rim) & ~rim & ~patch] += (5, 4, 8)
    spark = patch & left & (rng.uniform(0, 1, (HH, HW)) < 0.013)
    ys, xs = np.nonzero(spark)
    for y, x in zip(ys, xs):                                          # 반짝임
        if 1 <= y < HH - 1 and 1 <= x < HW - 1:
            c = (176, 140, 192) if pinkish[y, x] else (150, 128, 208)
            t[y, x] = c
            for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                t[y + dy, x + dx] = t[y + dy, x + dx] * 0.5 + np.array(c, np.float32) * 0.3
    return np.clip(t, 0, 255)


def rnd_np(seed, h, w):
    return np.random.default_rng(seed + 77).uniform(0, 1, (h, w))


def pickaxe(t, ox, oy):
    """기대 세운 곡괭이: 머리가 왼쪽 위, 자루가 오른쪽 아래로."""
    wl, wd = (184, 126, 70), (126, 80, 44)
    sh, sm, sd = (206, 214, 228), (140, 152, 174), (86, 96, 120)
    for i in range(5, 18):
        t.px(ox + i, oy + i, wl)
        t.px(ox + i + 1, oy + i, wd)
    arc = [(0, 10), (0, 9), (1, 8), (1, 7), (2, 6), (2, 5), (3, 4), (4, 3), (5, 2), (6, 2), (7, 1), (8, 1), (9, 0), (10, 0)]
    for x, y in arc:
        t.px(ox + x, oy + y, sh if x >= y else sm)
    for x, y in [(3, 6), (3, 5), (4, 4), (5, 3), (6, 3), (4, 5), (5, 4)]:
        t.px(ox + x, oy + y, sd if (x, y) in [(4, 5), (5, 4)] else sm)
    for x, y in [(5, 5), (6, 5), (5, 6)]:                             # 자루를 물린 쇠 테
        t.px(ox + x, oy + y, sd)


LANTERN = ['..III..', '.I...I.', '.iIIIi.', 'iYyyyOi', 'iyYyOOi', 'iyyOOoi', 'iIIIIIi', '.iiiii.']
LPAL = {'I': (132, 126, 150), 'i': (74, 68, 92), 'Y': (255, 240, 170), 'y': (255, 208, 104), 'O': (240, 156, 60), 'o': (192, 106, 42)}


def cart(t, x, y):
    """수정을 실은 광차. (x, y) = 몸통 왼쪽 위. 몸통 15×6, 바퀴와 선로가 아래에."""
    iron, ironl, ironh = (62, 58, 80), (104, 98, 126), (156, 150, 178)
    for cx, pw, ph, lean, pal in [(x + 4, 3, 4, -1, AME), (x + 8, 4, 5, 1, AME), (x + 12, 3, 3, 2, PINK), (x + 6, 2, 3, 0, AME_DIM)]:
        prism(t, cx, y, pw, ph, lean, pal)
    for j in range(6):
        ins = j // 3
        for i in range(ins, 15 - ins):
            if j == 0:
                c = ironh if i < 10 else ironl
            elif i in (ins, 14 - ins):
                c = ironl if i == ins else iron
            else:
                c = (150, 98, 56) if (i % 4) == 1 else ((128, 80, 46) if i < 9 else (98, 60, 38))
                if j == 3:
                    c = ironl if i < 9 else iron
            t.px(x + i, y + j, c)
    for wx in (x + 2, x + 10):                                        # 바퀴
        for dx, dy in [(1, 0), (0, 1), (1, 1), (2, 1), (1, 2)]:
            t.px(wx + dx, y + 6 + dy, ironl if (dx, dy) == (1, 1) else iron)
    for i in range(-3, 19):                                           # 선로와 침목
        t.px(x + i, y + 9, (118, 112, 138))
        if i % 4 == 0:
            t.px(x + i, y + 10, (104, 64, 38)); t.px(x + i + 1, y + 10, (78, 46, 30))


def dress_crystal(d, w, h, corner, rnd):
    for x in range(w):                                                # 천장의 돌
        d.px(x, 0, (80, 64, 122))
        if rnd.random() < 0.6:
            d.px(x, 1, (54, 41, 90))
    x = 0
    while x < w:                                                      # 종유석과 그 사이에 매달린 결정
        e = env(x, w, 5.5)
        if e > 0.22:
            lm = 3 + int(round(17 * e))
            n = max(3, lm - rnd.randrange(0, 1 + lm // 3))
            wd = rnd.choice([3, 4]) if e > 0.5 else rnd.choice([2, 3])
            gap = rnd.randrange(0, 2)
        else:
            n, wd, gap = rnd.choice([2, 2, 3, 4]), rnd.choice([2, 2, 3]), rnd.randrange(1, 5)
        if rnd.random() < 0.3 and n >= 3:
            prism(d, x + wd // 2, 1, max(2, wd), n + 1, rnd.choice([-1, 0, 1]), rnd.choice([AME, AME, PINK]), down=True)
        else:
            spike(d, x, 1, n, wd, ROCKP)
        x += wd + gap
    glows = []
    if corner == 'bl':
        t = Dots(38, 30)
        for cx, pw, ph, lean, pal in [(13, 4, 10, 2, AME_DIM), (6, 6, 23, -1, AME), (2, 3, 11, -2, PINK), (22, 3, 6, 3, AME_DIM), (27, 3, 5, 2, AME)]:
            prism(t, cx, 29, pw, ph, lean, pal)
        s6.outline(t, MINE_O)
        p = Dots(38, 30)
        pickaxe(p, 3, 11)
        s6.outline(p, MINE_O)
        s6.merge(t, p)
        put(d, t, corner, w, h, 1, 0)
    elif corner == 'br':
        t = Dots(40, 22)
        cart(t, 18, 10)
        s6.outline(t, MINE_O)
        g = Dots(40, 22)
        g.paste(LANTERN, LPAL, 4, 13)                                 # 바닥에 내려놓은 등불
        prism(g, 13, 21, 3, 6, 1, AME_DIM)
        s6.outline(g, MINE_O)
        s6.merge(t, g)
        put(d, t, 'bl', w, h, w - 41, 0)
        glows.append((w - 41 + 7, h - 6, 22, (255, 190, 96), 0.22))
    nz = smooth(rnd, w, 3)
    for x in range(w):                                                # 바닥의 돌 부스러기와 돋은 결정
        e = env(x, w, 5.0)
        hg = int(round(1.3 * nz[x] + 2.2 * e + 0.3))
        for j in range(hg):
            if not d.get(x, h - 1 - j):
                d.px(x, h - 1 - j, ROCKP['h'] if j == hg - 1 else ROCKP['m'])
    x = 6
    while x < w - 6:
        e = env(x, w, 8.0)
        if not d.get(x, h - 5) and not d.get(x - 2, h - 5) and not d.get(x + 2, h - 5):
            prism(d, x, h - 1, rnd.choice([2, 3, 3]), 3 + int(round(5 * e + rnd.random() * 2.2)), rnd.choice([-1, 0, 1]), rnd.choice([AME, AME_DIM, AME_DIM, PINK]))
        x += rnd.randrange(6, 16)
    return glows


# ───────────────────────── 왕좌의 방: 붉은 융단 ─────────────────────────
FLEUR = ['...#...', '..###..', '#.###.#', '##.#.##', '.#####.', '..###..', '.#.#.#.']
KNOT = ['.#.', '#.#', '.#.']


def floor_throne(seed=7):
    """융단: 마름모 격자에 같은 붉은 실로 짠 백합 무늬, 격자가 만나는 곳에 금실 매듭."""
    rnd = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:HH, 0:HW]
    t = np.zeros((HH, HW, 3), np.float32)
    t[:] = (50, 15, 27)
    t += (hnoise(seed, 60)[..., None] - 0.5) * np.array((7, 3, 4), np.float32)
    t += (((xx + yy) % 2) * 2 - 1)[..., None] * np.array((1.4, 0.6, 0.8), np.float32)     # 짜임
    t += rnd.uniform(-1.2, 1.2, (HH, HW, 1)).astype(np.float32)
    P = 24
    u, v = (xx + yy) % P, (xx - yy) % P
    t[(u == 0) | (v == 0)] += (9, 3, 4)
    t[(u == 2) | (v == 2) | (u == P - 2) | (v == P - 2)] += (-5, -2, -3)
    for cy in range(0, HH, 12):
        for cx in range(0, HW, 12):
            if (cx // 12 + cy // 12) % 2:                             # 마름모 한가운데: 백합 / 작은 마름모를 번갈아
                rows = FLEUR if (cx // 12) % 4 in (1, 2) else ['...#...', '..#.#..', '.#.#.#.', '..#.#..', '...#...']
                oy = cy - len(rows) // 2
                for j, r in enumerate(rows):
                    for i, ch in enumerate(r):
                        y, x = oy + j, cx - 3 + i
                        if ch == '#' and 0 <= y < HH and 0 <= x < HW:
                            t[y, x] += (11, 4, 5)
            else:                                                     # 격자가 만나는 곳: 금실 매듭
                for j, r in enumerate(KNOT):
                    for i, ch in enumerate(r):
                        y, x = cy - 1 + j, cx - 1 + i
                        if ch == '#' and 0 <= y < HH and 0 <= x < HW:
                            t[y, x] = (88, 54, 34) if ch == '#' else t[y, x]
    return np.clip(t, 0, 255)


GOLD = (156, 114, 50)
CASKET = ['..GGGGGGG..', '.GeeeeeeeG.', '.GeeeeeeeG.', '.kkkkkkkkk.', 'HGGGGGGGGgk', 'gaabbHbbcck', 'gaabbGbbcck', 'gaabbbbbcck', 'kkkkkkkkkkD']
GOBLET = ['HGGGGgk', 'HGGGGgk', '.GGGgk.', '..Ggk..', '...g...', '...g...', '..Ggk..', '.GGggk.']


def dress_throne(d, w, h, corner, rnd):
    red, fold, hi, trim = (126, 32, 46), (86, 20, 34), (158, 48, 60), (192, 146, 62)
    P = 10
    dep = []
    for x in range(w):                                                # 휘장: 금 봉에 건 붉은 천, 귀퉁이에서 깊게 늘어진다
        sw = 9.0 * env(x, w, 4.6)
        dep.append(1 + int(round(1.2 * math.sin(math.pi * (x % P) / P) + sw)))
    for x in range(w):
        d.px(x, 0, (206, 160, 70) if x % 4 else (236, 196, 100))
        for y in range(1, 1 + dep[x]):
            c = fold if (x % P == 0 or (dep[x] > 5 and x % 3 == 0)) else (hi if (x % P == 4 and y < dep[x]) else red)
            d.px(x, y, c)
        d.px(x, 1 + dep[x], trim)
        if x % P == 0 and 4 < x < w - 5:
            d.px(x, 2 + dep[x], (232, 188, 92))                       # 술
    for sx in (1, w - 2):                                             # 귀퉁이의 술 한 가닥
        y0 = 2 + dep[sx]
        for j in range(4):
            d.px(sx, y0 + j, trim)
        for j in range(3):
            d.px(sx, y0 + 4 + j, (236, 190, 92))
            d.px(sx + (1 if sx == 1 else -1), y0 + 4 + j, (176, 128, 54) if j else (236, 190, 92))
    for sx, s2 in ((1, 2), (w - 2, w - 3)):                           # 융단의 금실 테두리
        for y in range(2 + dep[sx] + 8, h - 3):
            d.px(sx, y, GOLD)
            if y % 2:
                d.px(s2, y, (104, 72, 36))
    for x in range(1, w - 1):
        d.px(x, h - 4, GOLD)
        if x % 2:
            d.px(x, h - 5, (104, 72, 36))
        d.px(x, h - 3, (28, 8, 15))
        if x % 2 == 0:                                                # 융단 끝의 술
            d.px(x, h - 2, (204, 168, 112))
            d.px(x, h - 1, (150, 116, 76))
    for cx in (1, w - 2):
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                if 0 <= cx + dx < w:
                    d.px(cx + dx, h - 4 + dy, (226, 180, 84) if dx == 0 and dy == 0 else GOLD)
    if not corner:
        return []
    gd = dict(s6.GD, a=s6.WOOD['a'], b=s6.WOOD['b'], c=s6.WOOD['c'], e=(40, 12, 22))
    W, H = 40, 26
    t = Dots(W, H)
    top = [H] * W
    for x in range(W):                                                # 금화 둔덕: 귀퉁이 쪽이 높다
        hgt = 7.0 * math.exp(-((x - 6) / 9.0) ** 2) + 3.5 * math.exp(-((x - 24) / 8.0) ** 2) - max(0, x - 33) * 0.6
        top[x] = H - max(0, int(round(hgt)))
    for x in range(W):
        for y in range(top[x] + 1, H):
            t.px(x, y, (84, 52, 20))

    def coins(ya, yb, gap=0.08, xa=0):
        for y in range(ya, yb, 2):
            x = xa - rnd.randrange(0, 4)
            while x < W - 3:
                if y + 1 >= top[max(0, min(W - 1, x + 2))] and y + 2 < H and rnd.random() > gap:
                    s6.coin(t, x, y, 1.0 - min(0.24, max(0, y - top[max(0, min(W - 1, x + 2))] - 2) * 0.03))
                x += rnd.choice([4, 5, 5, 6])
    coins(min(top) - 1, H - 8)
    if corner == 'bl':
        t.paste(CASKET, gd, 1, H - 15)                                # 둔덕에 반쯤 묻힌 열린 보석함
        s6.coin(t, 3, H - 14); s6.coin(t, 6, H - 13)
        t.paste(s6.CUT, s6.GEMS['c'], 7, H - 16)
    else:
        t.paste(GOBLET, gd, 3, top[6] - 7)                            # 둔덕 위의 금잔
    coins(H - 8, H - 5, gap=0.14, xa=14 if corner == 'bl' else 12)
    coins(H - 5, H - 2, gap=0.14)                                     # 앞쪽 금화가 상자·잔의 밑동을 덮는다
    s6.outline(t, s6.O)
    g = Dots(W, H)
    if corner == 'bl':
        for k in range(26):                                           # 상자에서 흘러 둔덕을 타고 내려온 진주 목걸이
            x = 10 + k
            y = int(round(H - 12 + 7 * (1 - math.exp(-k / 6.0)) + 1.2 * math.sin(k / 3.0)))
            if x < W and y < H - 1:
                g.px(x, y, (240, 244, 252) if k % 2 == 0 else (160, 182, 226))
        gems = [(22, top[22] + 1, 'r'), (30, top[30] + 1, 'c'), (17, H - 8, 'p')]
        bars = [(26, H - 6, False)]
    else:
        gems = [(13, top[13], 'c'), (24, top[24], 'g'), (31, H - 6, 'p'), (19, H - 6, 'r')]
        bars = [(10, H - 6, False)]
        for k in range(18):                                           # 잔에 걸쳐 늘어진 목걸이
            x = 8 + k
            y = int(round(top[6] - 5 + 8 * (1 - math.exp(-k / 5.0)) + 1.2 * math.sin(k / 2.6)))
            if x < W and y < H - 1:
                g.px(x, y, (255, 196, 226) if k % 2 == 0 else (224, 110, 180))
    s6.merge(t, g)
    for bx, by, fl in bars:
        b_ = Dots(W, H)
        b_.paste(s6.BAR, dict(s6.GD, G=(255, 226, 128), g=(232, 184, 76)), bx, by, flip=fl)
        s6.outline(b_, (64, 36, 18))
        s6.merge(t, b_)
    for gx, gy_, kind in gems:
        b_ = Dots(W, H)
        b_.paste(s6.CUT, s6.GEMS[kind], gx, min(gy_, H - 5))
        s6.outline(b_, (64, 36, 18))
        s6.merge(t, b_)
    for x, y in [(36, H - 3), (39, H - 3)]:
        s6.coin(t, x - 4, y)
    put(d, t, corner, w, h, 1, 4)
    cx = 12 if corner == 'bl' else w - 13
    return [(cx, h - 12, 24, (246, 196, 96), 0.1)]


FLOORS = {'ice': floor_ice, 'crystal': floor_crystal, 'throne': floor_throne}
DRESS = {'ice': dress_ice, 'crystal': dress_crystal, 'throne': dress_throne}
_cache = {}


def art(key, w, h, corner=None, seed=1, off=(0, 0)):
    """패널 한 칸의 그림(도트 크기): 바닥과, 그 위의 것(색·덮는 정도), 빛 번짐."""
    if key not in _cache:
        _cache[key] = FLOORS[key]()
    fl = _cache[key][off[1]:off[1] + h, off[0]:off[0] + w].copy()
    d = Dots(w, h)
    glows = DRESS[key](d, w, h, corner, random.Random(seed))
    return fl, d, glows


def lay(a, key, rect, mask, shade=None, corner=None, seed=1, off=(0, 0)):
    """화면 a의 rect(안쪽 칸, 픽셀)에서 mask인 자리에만 패널 그림을 깐다."""
    x0, y0, x1, y1 = rect
    w, h = (x1 - x0) // 2, (y1 - y0) // 2
    fl, d, glows = art(key, w, h, corner, seed, off)
    tex = fl.repeat(2, 0).repeat(2, 1)
    if shade is not None:
        tex = tex * shade[y0:y0 + 2 * h, x0:x0 + 2 * w, None]
    yy, xx = np.mgrid[0:2 * h, 0:2 * w].astype(np.float32)
    for gx, gy, rad, col, k in glows:
        g = np.clip(1 - np.hypot(xx - gx * 2, yy - gy * 2) / (rad * 2), 0, 1) ** 2 * k
        tex = tex + (np.array(col, np.float32) - tex) * g[..., None]
    al = d.a.repeat(2, 0).repeat(2, 1)[..., None]
    tex = tex * (1 - al) + d.c.repeat(2, 0).repeat(2, 1) * al
    sub = a[y0:y0 + 2 * h, x0:x0 + 2 * w]
    m = mask[y0:y0 + 2 * h, x0:x0 + 2 * w]
    sub[m] = np.clip(tex, 0, 255)[m]


if __name__ == '__main__':
    import sys
    from PIL import Image
    for k in sys.argv[1:] or FLOORS:
        w, h = 123, 171
        a = np.zeros((h * 2, w * 4 + 8, 3), np.float32)
        lay(a, k, (0, 0, w * 2, h * 2), np.ones(a.shape[:2], bool), corner='bl', seed=3)
        lay(a, k, (w * 2 + 8, 0, w * 4 + 8, h * 2), np.ones(a.shape[:2], bool), corner='br', seed=4, off=(150, 40))
        im = Image.fromarray(a.astype(np.uint8))
        im.resize((im.width * 2, im.height * 2), Image.NEAREST).save(f'p9-{k}.png')   # a preview in the current folder
