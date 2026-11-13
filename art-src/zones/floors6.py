"""구역별 패널 바닥(floor-<구역>.png 자리): 사이드 패널·알림·팝업·완료 배너가 모두 이 한 장을 깐다.

원래 바닥(art-src/gen_dungeon.py flagstones: 반 크기 도트, 줄 높이 10~13, 폭 14~26, 줄눈 1도트, 아주 낮은 대비)의
짜임을 지키고, 구역마다 돌의 모양과 줄눈에 그 구역의 것을 넣는다. 글자 뒤에 놓이므로 밝기 차는 작게.
"""
import math
import random

import numpy as np

HW, HH = 640, 410


def hnoise(seed, cell, h=HH, w=HW):
    r = np.random.default_rng(seed)
    g = r.uniform(0, 1, (h // cell + 3, w // cell + 3)).astype(np.float32)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    y, x = yy / cell, xx / cell
    y0, x0 = y.astype(int), x.astype(int)
    fy, fx = y - y0, x - x0
    return (g[y0, x0] * (1 - fx) + g[y0, x0 + 1] * fx) * (1 - fy) + (g[y0 + 1, x0] * (1 - fx) + g[y0 + 1, x0 + 1] * fx) * fy


def flags(seed, tones, mortar, each=None, rows=(10, 11, 12, 13), wmin=14, wmax=27):
    """판석 깔기. each(t, rnd, x0, y0, x1, y1, 색 번호)로 돌마다 손본다."""
    rnd = random.Random(seed)
    t = np.zeros((HH + 16, HW + 8, 3), np.float32)
    t[:] = mortar
    y = 0
    while y < HH:
        rh = rnd.choice(rows)
        x = -rnd.randrange(wmax)
        while x < HW:
            w = rnd.randrange(wmin, wmax)
            i = rnd.randrange(len(tones))
            x0, x1, y1 = max(0, x), min(HW, x + w - 1), min(HH, y + rh - 1)
            if x1 - x0 >= 3 and y1 > y:
                t[y:y1, x0:x1] = tones[i]
                if each:
                    each(t, rnd, x0, y, x1, y1, i)
            x += w
        y += rh
    return t[:HH, :HW]


def add(c, d):
    return tuple(c[k] + d[k] for k in range(3))


# 얼음: 얼어붙은 판석. 윗모서리 성에, 비스듬한 반사, 가는 금, 줄눈에 낀 눈.
def floor_ice(seed=7):
    tones = [(15, 32, 48), (17, 36, 53), (19, 40, 58), (21, 44, 63)]
    n = hnoise(seed + 1, 14)

    def each(t, rnd, x0, y, x1, y1, i):
        t[y, x0:x1] = add(tones[i], (9, 15, 19))                 # 윗모서리 성에
        if rnd.random() < 0.5:
            t[y + 1, x0:x0 + rnd.randrange(2, 7)] = add(tones[i], (6, 10, 13))
        if rnd.random() < 0.22 and x1 - x0 >= 12:                # 비스듬한 반사 두 줄
            sx = rnd.randrange(x0 + 6, x1 - 4)
            for k in range(min(5, y1 - y - 3)):
                t[y + 2 + k, sx - k] = add(tones[i], (16, 26, 32))
                if sx - k + 2 < x1:
                    t[y + 2 + k, sx - k + 2] = add(tones[i], (7, 12, 15))
        if rnd.random() < 0.14 and x1 - x0 >= 10:                # 가는 금
            cx, cy = rnd.randrange(x0 + 3, x1 - 3), y + 2
            for k in range(y1 - y - 3):
                cx += rnd.choice([-1, 0, 0, 1])
                if x0 < cx < x1 - 1:
                    t[cy + k, cx] = add(tones[i], (12, 20, 25))
    t = flags(seed, tones, (8, 19, 30), each)
    mort = np.abs(t - np.array((8, 19, 30))).sum(-1) < 1
    t[mort & (n > 0.6)] = (34, 58, 80)                            # 줄눈에 낀 눈
    return t


# 용암: 식어 갈라진 현무암 판(석판과 같은 짜임). 판 사이 금 가운데 일부가 달아올라 있다.
def floor_lava(seed=7):
    rng = np.random.default_rng(seed)
    cell = 17
    gy, gx = HH // cell + 3, HW // cell + 3
    yy, xx = np.mgrid[0:HH, 0:HW].astype(np.float32)
    d1 = np.full((HH, HW), 1e9, np.float32)
    d2 = d1.copy()
    ident = np.zeros((HH, HW), int)
    k = 0
    for j in range(gy):
        for i in range(gx):
            py, px = (j - 1 + rng.uniform(0.15, 0.85)) * cell, (i - 1 + rng.uniform(0.15, 0.85)) * cell
            dd = np.hypot((yy - py) * 1.25, xx - px)
            near = dd < d1
            d2 = np.where(near, d1, np.minimum(d2, dd))
            ident = np.where(near, k, ident)
            d1 = np.where(near, dd, d1)
            k += 1
    tones = np.array([(29, 23, 25), (33, 26, 27), (37, 29, 29), (41, 32, 31)], np.float32)
    t = tones[rng.integers(0, 4, k)[ident]]
    up = np.roll(ident, 1, 0) != ident                             # 판 윗모서리가 조금 밝다
    t[up] += (7, 5, 5)
    vein = (d2 - d1) < 1.1
    heat = hnoise(seed + 3, 40) * 0.7 + hnoise(seed + 4, 13) * 0.3
    t[vein] = (15, 10, 11)
    t[vein & (heat > 0.58)] = (58, 28, 22)
    t[vein & (heat > 0.66)] = (96, 42, 22)
    return t


# 수정: 모서리를 쳐 낸 보라 돌. 돌마다 비스듬한 면이 하나, 드물게 박힌 결정 조각.
def floor_crystal(seed=7):
    tones = [(26, 19, 46), (30, 22, 53), (34, 25, 60), (38, 28, 66)]
    kinds = [((176, 150, 226), (118, 88, 188), (70, 48, 122))] * 3 + [((214, 160, 200), (160, 96, 146), (96, 50, 86)), ((150, 204, 220), (84, 150, 176), (40, 90, 114))]
    mortar = (13, 8, 26)

    def each(t, rnd, x0, y, x1, y1, i):
        t[y, x0] = t[y1 - 1, x1 - 1] = mortar                    # 쳐 낸 모서리
        if rnd.random() < 0.5:
            t[y, x1 - 1] = t[y1 - 1, x0] = mortar
        t[y, x0 + 1:x1 - 1] = add(tones[i], (8, 6, 13))
        w, h = x1 - x0, y1 - y
        if rnd.random() < 0.6 and w >= 10:                       # 비스듬한 면: 한쪽이 한 단 밝다
            sx = rnd.randrange(x0 + w // 3, x1 - 3)
            lean = rnd.choice([-1, 1])
            for k in range(1, h):
                ex = sx + lean * (k // 2)
                if x0 < ex < x1:
                    t[y + k, ex:x1] = add(tones[i], (5, 4, 9)) if lean > 0 else t[y + k, ex:x1]
                    t[y + k, ex] = add(tones[i], (12, 9, 20))
        if rnd.random() < 0.09 and w >= 9 and h >= 8:            # 박힌 결정
            hc, lc, mc = rnd.choice(kinds)
            cx, cy = rnd.randrange(x0 + 2, x1 - 4), y + rnd.randrange(2, h - 5)
            for dx, dy, c in [(1, 0, hc), (0, 1, hc), (1, 1, lc), (2, 1, mc), (0, 2, lc), (1, 2, lc), (2, 2, mc), (1, 3, mc)]:
                t[cy + dy, cx + dx] = c
    return flags(seed, tones, mortar, each)


# 왕좌: 대리석 판. 가는 금 줄눈, 줄눈이 만나는 곳의 금 징, 판 가운데 마름모(석판 융단과 같은 무늬).
def floor_throne(seed=7):
    tones = [(44, 16, 26), (49, 18, 29), (54, 21, 32)]
    S = 20
    t = np.zeros((HH, HW, 3), np.float32)
    rnd = random.Random(seed)
    for ty in range(0, HH, S):
        for tx in range(-(ty // S % 2) * (S // 2), HW, S):
            i = rnd.randrange(3)
            x0, x1, y1 = max(0, tx), min(HW, tx + S - 1), min(HH, ty + S - 1)
            if x1 <= x0:
                continue
            t[ty:y1, x0:x1] = tones[i]
            t[ty, x0:x1] = add(tones[i], (8, 4, 5))
            cx, cy = tx + S // 2 - 1, ty + S // 2 - 1
            for k in range(-4, 5):                                # 마름모 상감
                for sy in (-1, 1):
                    px, py = cx + k, cy + sy * (4 - abs(k))
                    if 0 <= px < HW and 0 <= py < HH and x0 <= px < x1:
                        t[py, px] = add(tones[i], (11, 6, 7))
            if rnd.random() < 0.3:                                # 대리석 결
                vx, vy = rnd.randrange(x0, x1), ty + 2
                for k in range(rnd.randrange(5, 12)):
                    vx += rnd.choice([0, 1, 1])
                    if x0 <= vx < x1 and vy + k < y1:
                        t[vy + k, vx] = add(tones[i], (-7, -3, -4))
    mort = t.sum(-1) == 0
    t[mort] = (60, 38, 24)                                        # 금 줄눈(어둡게)
    cross = mort & np.roll(mort, 1, 0) & np.roll(mort, 1, 1)
    yy, xx = np.nonzero(mort)
    for y, x in zip(yy, xx):
        if y % S == S - 1 and (x + (y // S % 2) * (S // 2)) % S == S - 1:
            t[y, x] = (150, 110, 46)                              # 금 징
    return t


# 이끼: 오래된 판석. 줄눈과 돌 모서리를 이끼가 덮고, 금 간 돌과 빠진 귀퉁이.
def floor_moss(seed=7):
    tones = [(20, 28, 31), (23, 32, 34), (26, 36, 37), (29, 40, 40)]
    mortar = (9, 13, 15)
    n = hnoise(seed + 40, 16) * 0.65 + hnoise(seed + 41, 5) * 0.35

    def each(t, rnd, x0, y, x1, y1, i):
        t[y, x0:x1] = add(tones[i], (6, 7, 6))
        if rnd.random() < 0.25:
            t[y1 - 1, x1 - 1] = t[y1 - 1, x1 - 2] = t[y1 - 2, x1 - 1] = mortar   # 빠진 귀퉁이
        if rnd.random() < 0.16 and x1 - x0 >= 10:                # 금
            cx, cy = rnd.randrange(x0 + 3, x1 - 3), y + 1
            for k in range(y1 - y - 2):
                cx += rnd.choice([-1, 0, 1])
                if x0 < cx < x1 - 1:
                    t[cy + k, cx] = add(tones[i], (-8, -9, -9))
    t = flags(seed, tones, mortar, each)
    mort = np.abs(t - np.array(mortar)).sum(-1) < 1
    near = mort.copy()
    for ax in (0, 1):
        for s in (-1, 1, -2, 2):
            near |= np.roll(mort, s, ax)
    yy, xx = np.mgrid[0:HH, 0:HW]
    t[mort & (n > 0.50)] = (30, 62, 40)                           # 줄눈의 이끼
    edge = near & ~mort & (n > 0.58)
    t[edge & ((yy + xx) % 2 == 0)] = (34, 70, 44)                 # 돌 가장자리로 번진 이끼
    t[near & (n > 0.68)] = (38, 80, 48)
    t[near & (n > 0.74) & ((yy + xx) % 2 == 0)] = (54, 104, 58)
    return t


FLOORS = {'ice': floor_ice, 'lava': floor_lava, 'crystal': floor_crystal, 'throne': floor_throne, 'moss': floor_moss}


def retile(path, key, boxes, ramp):
    """실제 화면 캡처에서 틀 안쪽 바닥(남색 돌)만 구역 바닥으로, 금색은 구역의 금속 단계로."""
    import chrome4 as c4
    from PIL import Image
    a = np.array(Image.open(path).convert('RGB')).astype(np.float32)
    hh, ss, vv = c4.hsv(a)
    box = np.zeros(a.shape[:2], bool)
    for x0, y0, x1, y1 in boxes:
        box[y0:y1, x0:x1] = True
    navy = (hh > 195) & (hh < 285) & (ss > 0.12) & (vv < 0.36) & (vv > 0.06) & box
    tex = c4.up(FLOORS[key]())[:a.shape[0], :a.shape[1]]
    L = c4.lum(a)
    k = np.clip(c4.box_blur(L * navy, 9) / (c4.box_blur(navy.astype(np.float32), 9) + 1e-4) / 0.105, 0.8, 1.5)
    import panels9
    gold = (hh > 14) & (hh < 74) & (ss > 0.30) & (vv > 0.2) & box
    if key in panels9.FLOORS:                                     # 9차: 틀마다 바닥 재질과 윗선·아랫선
        for i, (x0, y0, x1, y1) in enumerate(boxes):
            g, nv = gold[y0:y1, x0:x1], navy[y0:y1, x0:x1]
            cols, rows = np.nonzero(g.mean(0) > 0.45)[0], np.nonzero(g.mean(1) > 0.45)[0]
            w_, h_ = x1 - x0, y1 - y0
            ix0, ix1 = cols[cols < w_ // 2].max() + 1, cols[cols > w_ // 2].min()
            iy0, iy1 = rows[rows < h_ // 2].max() + 1, rows[rows > h_ // 2].min()
            while nv[iy0 + 8:iy1 - 8, ix0].mean() < 0.5: ix0 += 1     # 금테 안쪽의 검은 줄을 건너뛴다
            while nv[iy0 + 8:iy1 - 8, ix1 - 1].mean() < 0.5: ix1 -= 1
            while nv[iy0, ix0 + 8:ix1 - 8].mean() < 0.4: iy0 += 1
            while nv[iy1 - 1, ix0 + 8:ix1 - 8].mean() < 0.4: iy1 -= 1
            inner = np.zeros_like(navy)
            inner[y0 + iy0:y0 + iy1, x0 + ix0:x0 + ix1] = True
            panels9.lay(a, key, (x0 + ix0, y0 + iy0, x0 + ix1, y0 + iy1), navy & inner, k, corner=None, seed=10 + i, off=(i * 70 % 300, i * 37 % 150))
    else:
        a[navy] = np.clip(tex * k[..., None], 0, 255)[navy]
    c4.ramp(a, gold, ramp)
    return np.clip(a, 0, 255).astype(np.uint8)
