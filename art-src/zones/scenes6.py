"""6차: 용암 굴과 왕좌의 방을 한 장면으로 다시 그린다 (zones5.ZONES가 이 둘을 가져다 쓴다).

- 용암 굴: 석판 = 식어 갈라진 현무암 판(판 사이 금이 아래로 갈수록 달아오름), 아래 = 용암 못,
  오른쪽 아래 = 주상절리 기둥 사이로 떨어지는 용암 폭포, 오른쪽 위 = 매달린 기둥과 용암 방울.
- 왕좌의 방: 오른쪽 아래 = 단 위의 왕좌(방석에 왕관), 그 옆에 열린 상자에서 쏟아져 단을 타고 내린 금화.
  물건마다 같은 금색 단계·같은 빛 방향(왼쪽 위)·같은 외곽선을 쓰고 서로 겹쳐 놓는다.
"""
import math
import random

import numpy as np

import tab5 as T5

from tab5 import CRACK, H2, MOSS, TH, TW, W2, XX, YY, Dots, glow, noise, slab

R = W2 - 1
FLOOR = 6                                                    # 마지막 줄 글자 아래로 비는 도트(14px 중 12px)


def mix(a, b, t):
    return tuple(a[i] * (1 - t) + b[i] * t for i in range(3))


def outline(s, col):
    """층의 그림 둘레(상하좌우)에 외곽선 한 도트."""
    f = s.a > 0
    n = np.zeros_like(f)
    n[1:] |= f[:-1]; n[:-1] |= f[1:]; n[:, 1:] |= f[:, :-1]; n[:, :-1] |= f[:, 1:]
    e = n & ~f
    s.c[e] = col
    s.a[e] = 1.0


def merge(d, s):
    m = s.a > 0
    d.c[m] = s.c[m]
    d.a[m] = s.a[m]


def glint(d, x, y, col=(255, 246, 206)):
    for dx, dy in [(0, 0), (-1, 0), (1, 0), (0, -1), (0, 1)]:
        d.px(x + dx, y + dy, col)


# ───────────────────────── 용암 굴 ─────────────────────────
def voronoi(seed, cell):
    rng = np.random.default_rng(seed)
    gy, gx = H2 // cell + 3, W2 // cell + 3
    yy, xx = np.mgrid[0:H2, 0:W2].astype(np.float32)
    d1 = np.full((H2, W2), 1e9, np.float32)
    d2 = d1.copy()
    ident = np.zeros((H2, W2), int)
    k = 0
    for j in range(gy):
        for i in range(gx):
            py, px_ = (j - 1 + rng.uniform(0.12, 0.88)) * cell, (i - 1 + rng.uniform(0.12, 0.88)) * cell
            dd = np.hypot((yy - py) * 1.15, xx - px_)
            near = dd < d1
            d2 = np.where(near, d1, np.minimum(d2, dd))
            ident = np.where(near, k, ident)
            d1 = np.where(near, dd, d1)
            k += 1
    return d2 - d1, ident, rng.uniform(0, 1, k).astype(np.float32)


ROCK = {'t': (112, 90, 84), 'h': (90, 70, 66), 'l': (68, 52, 51), 'm': (52, 40, 41), 'd': (34, 25, 28), 'o': (16, 11, 13)}
HOT = [(255, 232, 140), (255, 198, 86), (246, 150, 48), (222, 104, 34), (180, 66, 26), (136, 46, 22), (100, 36, 22)]


def column(d, x0, w, h, pal, heat=1.0, yb=H2, seed=0):
    """주상절리 기둥 하나: 위에서 살짝 내려다본 윗면(두 줄), 왼쪽 모서리 빛, 오른쪽 그늘, 드문 마디.
    아래는 용암 빛을 받는다."""
    r = random.Random(seed * 31 + x0)
    yt = yb - h
    joints = {}
    y = yt + r.randrange(6, 12)
    while y < yb - 3:
        joints[y] = r.randrange(1, max(2, w - 3))
        y += r.randrange(9, 16)
    for y in range(yt, yb):
        for i in range(w):
            c = pal['h'] if i == 0 else (pal['d'] if i == w - 1 else (pal['l'] if i <= (w - 1) * 0.45 else pal['m']))
            if y == yt:
                if i in (0, w - 1):
                    continue
                c = pal['t']
            elif y == yt + 1:
                c = pal['t'] if i < w - 1 else pal['h']
            elif y == yt + 2 and 0 < i < w - 1:
                c = pal['d'] if i > (w - 1) * 0.45 else pal['m']   # 윗면 아래 그늘 줄
            elif y in joints and joints[y] <= i < joints[y] + 3 and i < w - 1:
                c = pal['d']
            t = max(0.0, 1 - (yb - 1 - y) / 11) ** 1.5 * heat
            d.px(x0 + i, y, mix(c, (226, 104, 36), t * 0.5))


def hang(d, x0, w, h, pal, heat=1.0):
    """천장에 매달린 기둥: 아랫면이 아래 용암 빛을 받는다."""
    for y in range(1, 1 + h):
        for i in range(w):
            c = pal['h'] if i == 0 else (pal['d'] if i == w - 1 else (pal['l'] if i <= (w - 1) * 0.45 else pal['m']))
            if y == h:
                c = mix(pal['l'], (236, 120, 40), 0.55 * heat) if 0 < i < w - 1 else pal['m']
            elif y == h - 1 and 0 < i < w - 1:
                c = mix(c, (200, 84, 30), 0.22 * heat)
            d.px(x0 + i, y, c)


def lava():
    base = (34, 26, 29)
    edge, ident, jit = voronoi(17, 26)
    a = slab(base, grow=(46, 34, 33))                         # 원래 석판의 큰 명암과 얼룩(조금 밝은 식은 껍질)
    plate = (1 + (jit[ident] - 0.5) * 0.16).repeat(2, 0).repeat(2, 1)[:TH, :TW]
    a *= plate[..., None]                                     # 판마다 조금씩 다른 밝기
    yy, xx = np.mgrid[0:H2, 0:W2].astype(np.float32)
    heat = np.clip(1 - (H2 - 1 - yy) / (H2 * 0.5), 0, 1)       # 아래로 갈수록
    heat = np.maximum(heat, np.clip(1 - np.hypot(xx - (R - 24), yy - (H2 - 12)) / 190, 0, 1))
    heat = np.maximum(heat, np.clip(1 - np.hypot(xx - (R - 20), yy) / 80, 0, 1) * 0.6) ** 1.25
    d = Dots()
    vein = edge < 1.15
    cold, warm = np.array((50, 33, 33), np.float32), np.array((118, 48, 22), np.float32)
    vc = cold + (warm - cold) * heat[..., None]
    d.c[vein] = vc[vein]
    d.a[vein] = (0.35 + 0.65 * heat)[vein]
    d.onto(a)
    m = CRACK & ~MOSS                                         # 원래 석판의 금도 같은 규칙으로 달아오른다
    hpx = heat.repeat(2, 0).repeat(2, 1)[:TH, :TW, None]
    a[m] = (np.array((52, 31, 29), np.float32) * (1 - hpx) + np.array((110, 46, 22), np.float32) * hpx)[m]
    T5.rec_start(a)                                           # (구현) 여기까지 석판 재질 — 아래는 장면

    d = Dots()
    r = random.Random(5)
    back = {k: mix(v, base, 0.5) for k, v in ROCK.items()}
    # 천장: 짧게 매달린 기둥(여백 안) + 오른쪽 위 구석의 긴 무리
    for x in range(W2):
        d.px(x, 0, ROCK['m'])
    x = 4
    while x < W2 - 76:
        n = r.choice([2, 2, 3, 3, 4])
        hang(d, x, r.choice([3, 4]), n, back if r.random() < 0.4 else ROCK, 0.25)
        x += r.choice([8, 11, 15, 19, 26, 33])
    for x, w, h in [(R - 70, 4, 4), (R - 62, 5, 9), (R - 50, 4, 6), (R - 38, 5, 13), (R - 26, 4, 8), (R - 12, 5, 12)]:
        hang(d, x, w, h, back, 0.5)                            # 뒤줄
    for x, w, h in [(R - 66, 4, 6), (R - 56, 6, 12), (R - 45, 5, 8), (R - 33, 6, 18), (R - 21, 5, 11), (R - 16, 6, 23), (R - 5, 6, 15)]:
        hang(d, x, w, h, ROCK, 1.0)
    for x, y0, n in [(R - 31, 19, 5), (R - 13, 24, 7)]:        # 기둥 끝에서 늘어져 떨어지는 용암 방울
        for j in range(n):
            d.px(x, y0 + j, HOT[2] if j < n - 2 else HOT[1])
        d.px(x, y0 + n + 3, HOT[1]); d.px(x, y0 + n + 4, HOT[2])
        d.px(x, y0 + n + 9, HOT[3])

    # 아래: 용암 못 (글자 칸 밖 6도트)
    n1 = noise(8, 9)[H2 // 3]
    n2 = noise(9, 5)[H2 // 2]
    for x in range(W2):
        for j in range(FLOOR):
            c = HOT[j + 1]
            if j in (1, 2, 3) and noise_stripe(x, j):
                c = HOT[j]                                     # 흐르는 결
            d.px(x, H2 - FLOOR + j, c)
        if n1[x] > 0.62:                                       # 떠 있는 식은 껍질
            d.px(x, H2 - FLOOR, (74, 56, 53))
            d.px(x, H2 - FLOOR + 1, (44, 33, 34))
            if n1[x] > 0.7:
                d.px(x, H2 - FLOOR - 1, (58, 44, 43))
        elif n2[x] > 0.8:
            d.px(x, H2 - FLOOR, HOT[0])                        # 끓는 자리

    # 오른쪽 아래: 주상절리와 용암 폭포
    fx = R - 43                                                # 폭포 왼쪽 끝
    for x0, w, h in [(R - 74, 6, 21), (R - 67, 7, 29), (R - 59, 6, 25), (R - 52, 7, 35), (R - 44, 8, 31), (R - 35, 7, 40), (R - 27, 6, 34),
                     (R - 20, 7, 44), (R - 12, 6, 38), (R - 5, 6, 47)]:
        column(d, x0, w, h, back, 0.6, seed=1)                 # 뒤 절벽
    for i in range(0, 13):                                     # 뒤 기둥 윗면을 타고 온 용암이 틈으로 넘친다
        d.px(fx + 5 + i, H2 - 32 - (i // 5), HOT[2] if i < 9 else HOT[4])
        d.px(fx + 5 + i, H2 - 31 - (i // 5), HOT[4] if i < 9 else HOT[5])
    front = [(R - 96, 5, 4), (R - 89, 6, 8), (R - 82, 6, 6), (R - 75, 7, 12), (R - 67, 6, 9), (R - 60, 7, 17), (R - 52, 7, 13),
             (R - 37, 7, 20), (R - 29, 6, 15), (R - 22, 7, 26), (R - 14, 7, 21), (R - 6, 7, 31)]
    streak = [r.randrange(0, 9) for _ in range(6)]
    for y in range(H2 - 33, H2 - FLOOR + 1):                   # 폭포: 좁게 시작해 넓어지고 세로로 결이 진다
        k = y - (H2 - 33)
        lo, hi = (2, 4) if k < 2 else ((1, 4) if k < 6 else (0, 5))
        for i in range(lo, hi + 1):
            if i in (0, 5) and (y * 7 + i * 3) % 5 == 0:
                continue                                       # 가장자리가 들쭉날쭉
            c = (HOT[3], HOT[1], HOT[0], HOT[1], HOT[2], HOT[3])[i]
            if 0 < i < 5 and (y + streak[i]) % 9 < 3:
                c = HOT[2] if i in (1, 2, 3) else HOT[3]        # 식어 가는 줄기
            d.px(fx + i, y, c)
    for x0, w, h in front:
        column(d, x0, w, h, ROCK, 1.0, seed=2)
    for x0, w, h in front:                                     # 기둥 틈으로 배어 나온 용암
        if r.random() < 0.6:
            n = r.randrange(3, 7)
            for j in range(n):
                d.px(x0 + w - 1, H2 - FLOOR - j, HOT[2] if j < 2 else (HOT[4] if j < n - 1 else HOT[5]))
    for i, hgt in zip(range(-5, 11), [0, 1, 1, 2, 1, 2, 3, 3, 3, 3, 2, 2, 1, 2, 1, 0]):   # 떨어진 자리: 끓어오른 밝은 물결
        for j in range(hgt):
            d.px(fx + i, H2 - FLOOR - j + 1, HOT[0] if j == hgt - 1 and hgt > 1 else HOT[1])
        d.px(fx + i, H2 - FLOOR + 2, HOT[1])
    for dx, dy in [(-4, -3), (-7, -1), (9, -3), (12, -1), (-2, -5), (7, -6), (2, -4)]:
        d.px(fx + dx, H2 - FLOOR + dy, HOT[1] if dy > -5 else HOT[2])
    for x_, y_, k in [(fx - 8, H2 - 16, 2), (fx + 12, H2 - 37, 3), (fx - 3, H2 - 41, 3), (R - 62, H2 - 30, 3), (R - 86, H2 - 14, 2), (R - 18, H2 - 52, 4),
                      (fx + 3, H2 - 47, 4), (R - 104, H2 - 9, 3)]:
        d.px(x_, y_, HOT[k])                                   # 불티
    d.onto(a)
    m = np.clip(1 - (TH - YY) / 150, 0, 1) ** 2.2 * 0.26       # 아래에서 올라오는 빛
    T5.over(a, m, (214, 84, 30))
    glow(a, (fx + 3) * 2, TH - 44, 150, (255, 150, 50), 0.16)
    glow(a, TW - 50, 24, 90, (236, 110, 40), 0.07)
    return np.clip(a, 0, 255), dict(name='용암 굴', fg=(244, 230, 212), cursor=(255, 176, 64), dim=(172, 150, 136), base=base, deco=(68, 52, 51))


def noise_stripe(x, j):
    return math.sin(x * 0.21 + j * 2.1) + math.sin(x * 0.083 + j * 0.7) > 1.05


# ───────────────────────── 왕좌의 방 ─────────────────────────
O = (30, 10, 16)                                               # 외곽선(검붉은 갈색): 장면의 모든 물건에 같은 것
GD = {'H': (255, 236, 160), 'G': (246, 208, 110), 'g': (206, 158, 60), 'k': (152, 108, 38), 'D': (104, 70, 26)}
VEL = {'V': (182, 56, 64), 'v': (136, 34, 46), 'w': (92, 22, 36), 'x': (60, 14, 26)}
WOOD = {'a': (156, 98, 50), 'b': (122, 74, 38), 'c': (86, 50, 28), 'e': (54, 28, 20)}
SAPH, SAPL = (150, 196, 255), (70, 118, 214)


def chair(s, cx, yb):
    """왕좌(정면). cx = 가운데, yb = 발이 닿는 바닥 줄. 높이 31, 폭 23."""
    G, g, k, D = GD['G'], GD['g'], GD['k'], GD['D']
    x0, x1 = cx - 7, cx + 7
    sy, ty = yb - 9, yb - 28                                   # 방석 윗줄, 등받이 윗줄
    for y in range(ty, sy):                                    # 등받이: 금 테 두 겹 + 벨벳
        for x in range(x0, x1 + 1):
            i = x - x0
            if i == 0 or y == ty:
                c = G
            elif i == 1 or y == ty + 1:
                c = g
            elif i == 14:
                c = D
            elif i == 13:
                c = k
            elif i == 2:
                c = VEL['V']
            elif i == 12 or y == ty + 2:
                c = VEL['w']
            else:
                c = VEL['v']
                if (y - ty) % 4 == 1 and (i + ((y - ty) // 4) * 2) % 4 == 1:
                    c = VEL['x']                               # 누빔 자국
                elif (y - ty) % 4 == 0 and (i + ((y - ty) // 4) * 2) % 4 == 0:
                    c = VEL['V']
            s.px(x, y, c)
    for x in range(x0 + 2, x1 - 1):                            # 머리 장식(아치)
        s.px(x, ty - 1, G if x < cx + 3 else g)
    for x in range(x0 + 4, x1 - 3):
        s.px(x, ty - 2, G if x < cx + 2 else g)
    for x in range(cx - 1, cx + 2):
        s.px(x, ty - 3, G)
    for dx, dy, c in [(0, -2, SAPH), (-1, -1, SAPH), (0, -1, SAPL), (1, -1, SAPL), (0, 0, SAPL)]:
        s.px(cx + dx, ty + dy, c)                              # 가운데 보석
    for px_, sh in ((x0 - 1, (G, g, k)), (x1 + 1, (g, k, D))):  # 양쪽 기둥과 꼭대기 구슬
        for y in range(ty - 1, sy):
            s.px(px_, y, sh[1] if px_ < cx else sh[2])
        for dx in (-1, 0, 1):
            for dy in (-4, -3, -2):
                if abs(dx) + abs(dy + 3) < 2 or (dx, dy) == (0, -2):
                    s.px(px_ + dx, ty + dy, sh[0] if dx < 0 or dy == -4 else (sh[1] if dx == 0 else sh[2]))
    for side in (-1, 1):                                       # 팔걸이와 받침
        ax0 = x0 - 4 if side < 0 else x1 - 1
        for i in range(6):
            for j, c in enumerate((G, g, k) if side < 0 else (G, g, D)):
                if (i == (0 if side < 0 else 5)) and j != 1:
                    continue                                   # 앞 끝은 둥글게
                s.px(ax0 + i, sy - 5 + j, c)
        for y in range(sy - 2, yb):
            s.px(ax0 + (1 if side < 0 else 3), y, g if side < 0 else k)
            s.px(ax0 + (2 if side < 0 else 4), y, k if side < 0 else D)
    for x in range(x0 - 1, x1 + 2):                            # 방석
        for j, c in enumerate((VEL['V'], VEL['v'], VEL['w'])):
            s.px(x, sy + j, VEL['w'] if x == x1 + 1 and j else c)
    for x in range(x0 - 2, x1 + 3):                            # 앞판
        for j, c in enumerate((G, g, k)):
            s.px(x, sy + 3 + j, D if x >= x1 + 1 and j else c)
    s.px(cx, sy + 4, SAPH); s.px(cx - 4, sy + 4, k); s.px(cx + 4, sy + 4, k)
    for y in range(sy + 6, yb):                                # 다리 사이 그늘과 발
        for x in range(x0, x1 + 1):
            s.px(x, y, (34, 12, 20))
    for xl in (x0 - 2, x1 - 1):
        for i in range(4):
            for y in range(sy + 6, yb):
                s.px(xl + i, y, (G, g, k, D)[i] if xl < cx else (g, k, k, D)[i])
    return sy


def chest(s, x, y):
    """열린 보물 상자. (x, y) = 몸통 왼쪽 위. 몸통 17×9, 뚜껑은 뒤로 젖혀져 위에."""
    G, g, k, D = GD['G'], GD['g'], GD['k'], GD['D']
    for j in range(7):                                         # 뚜껑 안쪽
        for i in range(1, 16):
            if j == 0 and i in (1, 15):
                continue
            c = (GD['G'] if j == 0 else g) if j == 0 or i in (1, 15) else (WOOD['c'] if j > 1 else WOOD['e'])
            if i in (4, 12) and j > 0:
                c = D                                          # 뚜껑의 금 띠
            s.px(x + i, y - 8 + j, c)
    for j in range(9):                                         # 몸통
        for i in range(17):
            if j == 0:
                c = G if i < 12 else g
            elif i in (0, 1, 15, 16) or j == 8:
                c = (g if i < 2 else k) if j < 8 else D
            else:
                c = WOOD['a'] if i < 5 else (WOOD['b'] if i < 12 else WOOD['c'])
                if j in (3, 6):
                    c = WOOD['c'] if i < 12 else WOOD['e']     # 널 사이
            s.px(x + i, y + j, c)
    for dx, dy, c in [(7, 2, G), (8, 2, g), (9, 2, k), (7, 3, g), (8, 3, O), (9, 3, k), (7, 4, g), (8, 4, k), (9, 4, D)]:
        s.px(x + dx, y + dy, c)                                # 자물쇠


COIN = [['H', 'G', 'G', 'g'], ['g', 'k', 'k', 'D']]


def pile(s, top, x0, x1, yb, rnd, shade=0):
    """금화 더미: 납작한 금화(4×2)를 어긋나게 쌓고, 군데군데 세워진 금화와 틈."""
    for x in range(x0, x1):
        for y in range(top[x], yb):
            s.px(x, y, GD['k'])
    y = yb - 2
    row = 0
    while y >= min(top[x0:x1]) - 1:
        x = x0 - rnd.randrange(0, 4)
        while x < x1:
            kind = rnd.random()
            w = 4 if kind < 0.8 else 2
            for j in range(2):
                for i in range(w):
                    xx, yy_ = x + i, y + j
                    if not (x0 <= xx < x1) or yy_ < top[xx] or yy_ >= yb:
                        continue
                    ch = COIN[j][i] if w == 4 else ('G', 'D')[i]
                    dep = yy_ - top[xx]
                    c = GD[ch]
                    f = 1.0 - min(0.34, max(0, dep - 3) * 0.035) - shade
                    s.px(xx, yy_, tuple(v * f for v in c))
            x += w + (1 if rnd.random() < 0.18 else 0)
        y -= 2
        row += 1
    for x in range(x0, x1):                                    # 윗면: 금화 가장자리가 빛을 받는다
        if top[x] < yb:
            s.px(x, top[x], GD['H'] if (x * 5 + top[x]) % 4 else GD['G'])


COIN5 = ['.HHG.', 'GGGgk', '.kDD.']
BAR = ['..HHHHHH.', '.HGGGGGgk', 'GggggggkD', 'kkkkkkkD.']
CROWN = ['.H....H....H.', '.G...HGG...G.', '.GG..GGg..Gg.', '.GGG.GGg.Ggk.', '.GGGGGGGggkk.', '.GcGGrGGgcgk.', '.kkkkkkkkkDD.']
SACK = ['..cCp.c..', '.aBBBBBa.', '..eBbbe..', '.BBbbbbe.', 'BBBbbbbee', 'BBbbbbbee', 'bBbbbbeee', '.beeeeee.']
CUT = ['.hhl.', 'hhlld', '.lld.', '..d..']
GEMS = {'c': {'h': (206, 248, 252), 'l': (104, 210, 230), 'd': (40, 136, 168)}, 'p': {'h': (224, 204, 255), 'l': (158, 118, 240), 'd': (92, 58, 172)},
        'r': {'h': (255, 170, 176), 'l': (214, 58, 76), 'd': (134, 26, 48)}, 'g': {'h': (180, 246, 200), 'l': (64, 184, 120), 'd': (28, 112, 78)}}


def coin(s, x, y, f=1.0, hide=None):
    for j_, row in enumerate(COIN5):
        for i_, ch in enumerate(row):
            if ch != '.' and not (hide is not None and y + j_ < hide[min(W2 - 1, max(0, x + i_))]):
                s.px(x + i_, y + j_, tuple(v * f for v in GD[ch]))


def stamp(s, rows, pal, x, y, flip=False, edge=(64, 36, 18)):
    """물건 하나를 제 외곽선과 함께 얹는다(금화 위에서도 윤곽이 보이게)."""
    t = Dots()
    t.paste(rows, pal, x, y, flip=flip)
    outline(t, edge)
    merge(s, t)


DIA = ['.hhhll.', 'hhhllld', '.hllld.', '..ldd..', '...d...']
BAR_T = ['.....HH.', '...HHGGk', '.HHGGggk', 'HGGggkkD', 'GggkkD..', 'kkD.....']
SACK_L = ['...BBBb...', '.aBBBbbbe.', 'aBBbbbbbec', 'BBbbbbbeeC', '.bbbeeee.p']
CUP_L = ['Hk....GG', 'GgkggGGg', 'GgkggGgk', 'gk....gk']
RING = ['.cC.', 'HGGg', 'G..k', 'gkkD']
TIARA = ['H..H..H', 'G.HGG.G', 'GGGGggk', 'kcGrgck']
SACKP = {'B': (158, 90, 54), 'b': (120, 62, 40), 'e': (80, 40, 30), 'a': (190, 120, 70)}
BEADS = {'b': ((120, 184, 240), (196, 228, 255)), 'p': ((236, 110, 190), (255, 190, 226)), 'g': ((96, 200, 130), (190, 244, 204)), 'w': ((214, 206, 196), (255, 250, 240))}
LOW = FLOOR                                                   # 왼쪽·가운데 바닥의 보물은 이 높이(마지막 줄 글자 아래 빈 칸)를 넘지 않는다


COINL = [['H', 'G', 'G', 'g'], ['G', 'g', 'k', 'D']]


def soft(s, rows, pal, x, y, flip=False, sh=(112, 74, 28)):
    """물건을 금화 더미에 '놓는다': 검은 테 대신 오른쪽·아래에만 금빛 그늘 한 도트."""
    t = Dots()
    t.paste(rows, pal, x, y, flip=flip)
    f = t.a > 0
    e = np.zeros_like(f)
    e[1:] |= f[:-1]; e[:, 1:] |= f[:, :-1]
    e &= ~f
    s.c[e] = sh; s.a[e] = 1.0
    merge(s, t)


RAMP = [(96, 62, 24), (150, 104, 36), (204, 154, 56), (244, 204, 104), (255, 236, 160)]     # 금 덩어리의 다섯 단계(어두움 → 밝음)


def tilt(s, rows, pal, x, y, edge):
    """물건을 살짝 기울여(시계 방향) 얹는다. 두 번의 밀기라 구멍이 생기지 않는다."""
    t = Dots()
    n = len(rows)
    for j, r in enumerate(rows):
        for i, ch in enumerate(r):
            if ch in pal:
                t.px(x + i + int(round((n - 1 - j) * 0.3)), y + j + int(round(i * 0.3)), pal[ch])
    outline(t, edge)
    merge(s, t)


def hoard(s, x0, x1, rnd):
    """보물 더미(12차): 전체 덩어리의 윤곽과 명암을 먼저 잡고, 그 위에 '금화'라는 단서만 군데군데 얹는다.
    덩어리 = 울퉁불퉁한 윤곽 + 왼쪽 위에서 오는 빛으로 나눈 다섯 단계 금색(얼룩처럼 뭉쳐서). 금화 = 불규칙하게 놓인 타원 테(위는 밝게, 아래는 그늘)."""
    nz = noise(5, 4)[10]
    nz2 = noise(9, 7)[20]
    xl = 4
    hgt = np.zeros(W2)
    for x in range(xl, x1):
        h = 0.0
        if x >= x0 - 6:
            h = 19 * math.exp(-(abs(x - (R - 82)) / 16.0) ** 2.2) + 8 * math.exp(-((x - (R - 104)) / 12.0) ** 2) + 11 * math.exp(-((x - (R - 50)) / 13.0) ** 2)
            h += (nz[x] - 0.5) * 1.8
        dl = max(0.0, (R - 112) - x)
        sk = 7.6 * math.exp(-dl / 20.0) + 2.4 * math.exp(-((dl - 44) / 9.0) ** 2) + (nz2[x] - 0.5) * 1.2          # 큰 더미의 자락
        lf = 6.4 * math.exp(-((x - 22) / 13.0) ** 2) + 5.9 * math.exp(-((x - 58) / 12.0) ** 2) + 4.4 * math.exp(-((x - 92) / 10.0) ** 2) \
            + 2.6 * math.exp(-((x - 116) / 7.0) ** 2) + (nz2[(x * 3) % W2] - 0.5) * 0.9         # 왼쪽 아래 더미
        lf = min(lf, (x - xl) * 1.5 + 3)
        hgt[x] = max(h, sk if sk >= 1.5 else 0, lf if lf >= 1.5 else 0)
    x = xl
    while x < x1:                                              # 윤곽: 금화 가장자리가 불규칙하게 튀어나온다
        w = rnd.choice([2, 3, 3, 4])
        if rnd.random() < 0.45:
            for i in range(w):
                if x + i < x1 and hgt[x + i] >= 2:
                    hgt[x + i] += 1
        x += w + rnd.choice([1, 2, 3, 5])
    top = np.full(W2, H2, int)
    for x in range(xl, x1):
        v = int(round(hgt[x]))
        if x < x0:
            v = min(v, LOW)
        top[x] = H2 - max(0, v)

    # ── 덩어리의 명암(단계 번호)
    big = noise(31, 5)
    fine = noise(47, 2)
    idx = np.zeros((H2, W2), int)
    mass = np.zeros((H2, W2), bool)
    for x in range(xl, x1):
        sl = int(top[min(x1 - 1, x + 3)]) - int(top[max(xl, x - 3)])        # +면 오른쪽으로 내려가는 면(그늘)
        sl = max(-3, min(3, sl))
        for y in range(top[x], H2):
            dep = y - top[x]
            b = 3.25 - 0.2 * min(dep, 11) - 0.26 * sl + (big[y, x] - 0.5) * 1.2 + (fine[y, x] - 0.5) * 0.4
            if y == H2 - 1:
                b -= 0.6
            i = int(round(b))
            if dep == 0:
                i = max(i, 3 if sl > 0 else 4)                 # 윗면은 빛을 받는다
            idx[y, x] = max(0 if dep > 3 else 1, min(4, i))
            mass[y, x] = True

    # ── 금화라는 단서: 타원 테. 격자가 아니라 서로 거리를 두고 흩는다. 겉에 가까울수록 많다.
    def hints(rnd, xa, xb):
     placed = []
     ys, xs = np.nonzero(mass[:, xa:xb])
     xs = xs + xa
     for _ in range(int(len(xs) * 3)):
         k_ = rnd.randrange(len(xs))
         cx_, cy_ = int(xs[k_]), int(ys[k_])
         dep = cy_ - top[cx_]
         if rnd.random() > (0.95 if dep < 6 else 0.6):
             continue
         if any(abs(cx_ - px_) < 5 and abs(cy_ - py_) < 3 and not (abs(cx_ - px_) == 4 and abs(cy_ - py_) == 2) for px_, py_ in placed):
             continue
         kind = rnd.random()
         if kind < 0.6:                                         # 누운 금화: 위 테는 밝게, 아래 테는 그늘
             lit, shd = [(0, 0), (1, 0), (2, 0), (-1, 1)], [(-1, 2), (0, 2), (1, 2), (2, 2), (3, 1)]
         elif kind < 0.85:                                      # 작게 보이는 금화
             lit, shd = [(0, 0), (1, 0)], [(1, 1), (2, 1)]
         else:                                                  # 세워진 금화
             lit, shd = [(0, 0), (0, 1), (0, 2)], [(1, 0), (1, 1), (1, 2)]
         pts = lit + shd
         if not all(0 <= cy_ + dy < H2 and xa <= cx_ + dx < xb and mass[cy_ + dy, cx_ + dx] for dx, dy in pts):
             continue
         base = max(1, idx[cy_ + 1, cx_])
         for dx, dy in lit:
             idx[cy_ + dy, cx_ + dx] = min(4, base + 1)
         for dx, dy in shd:
             idx[cy_ + dy, cx_ + dx] = max(0, base - (2 if kind < 0.6 and base > 1 else 1))
         if kind < 0.6:
             idx[cy_ + 1, cx_] = idx[cy_ + 1, cx_ + 1] = min(4, base + (1 if base < 3 else 0)); idx[cy_ + 1, cx_ + 2] = base
         placed.append((cx_, cy_))

    hints(rnd, xl, x1)
    # ── 왼쪽 아래 더미만 더 높이 다시 쌓는다(오른쪽 더미는 위에서 만든 그대로). 같은 방식: 윤곽 → 명암 → 금화 단서.
    LX = 150
    rl = random.Random(23)
    hl = np.zeros(W2)
    for x in range(xl, LX):
        v = 10.5 * math.exp(-((x - 40) / 17.0) ** 2) + 6.8 * math.exp(-((x - 13) / 10.0) ** 2) + 7.4 * math.exp(-((x - 74) / 15.0) ** 2) \
            + 4.8 * math.exp(-((x - 104) / 12.0) ** 2) + 2.6 * math.exp(-((x - 128) / 8.0) ** 2) + (nz2[(x * 3) % W2] - 0.5) * 1.0
        hl[x] = min(v, (x - xl) * 1.5 + 4) if v >= 1.5 else 0
    x = xl
    while x < LX:
        w = rl.choice([2, 3, 3, 4])
        if rl.random() < 0.45:
            for i in range(w):
                if x + i < LX and hl[x + i] >= 2:
                    hl[x + i] += 1
        x += w + rl.choice([1, 2, 3, 5])
    for x in range(xl, LX):
        top[x] = H2 - max(0, int(round(hl[x])))
    mass[:, xl:LX] = False
    for x in range(xl, LX):
        sl = max(-3, min(3, int(top[min(LX - 1, x + 3)]) - int(top[max(xl, x - 3)])))
        for y in range(top[x], H2):
            dep = y - top[x]
            b = 3.25 - 0.2 * min(dep, 11) - 0.26 * sl + (big[y, (x + 211) % W2] - 0.5) * 1.2 + (fine[y, x] - 0.5) * 0.4
            if y == H2 - 1:
                b -= 0.6
            i = int(round(b))
            if dep == 0:
                i = max(i, 3 if sl > 0 else 4)
            idx[y, x] = max(0 if dep > 3 else 1, min(4, i))
            mass[y, x] = True
    hints(rl, xl, LX)

    def lay(front=None):
        for x in range(xl, x1):
            for y in range(top[x] if front is None else max(top[x], front[x]), H2):
                s.px(x, y, RAMP[idx[y, x]])

    def beads(xa, n, kind, dy=2, sag=1.6, per=4.5):
        col = BEADS[kind]
        for t in range(n):                                     # 구슬 목걸이: 덩어리 면을 따라 늘어진다
            x = xa + t
            if not (xl <= x < x1) or top[x] >= H2:
                continue
            y = min(int(round(top[x] + dy + sag * math.sin(t / per))), H2 - 2)
            if not (cx0 - 1 <= x <= cx0 + 17 and y <= cy0 + 6):
                s.px(x, y, col[t % 2])
                s.px(x, y + 1, RAMP[1])

    cx0, cy0 = R - 58, H2 - 15                                 # 상자 몸통 왼쪽 위
    bright = dict(GD, G=(255, 226, 128), g=(232, 184, 76))
    lay()
    chest(s, cx0, cy0)                                         # 상자는 더미에 반쯤 묻힌다
    lid = np.full(W2, H2, int)
    for x in range(cx0 + 2, cx0 + 15):
        lid[x] = cy0 - 1 - int(round(2.6 * math.sin(math.pi * (x - cx0 - 1) / 14)))
    for x in range(cx0 + 2, cx0 + 15):                         # 상자에 볼록하게 찬 금: 같은 덩어리 방식
        for y in range(lid[x], cy0):
            d_ = y - lid[x]
            s.px(x, y, RAMP[4 if d_ == 0 and x < cx0 + 9 else (3 if d_ < 2 else (2 if (x + y) % 3 else 1))])
    for x in range(cx0, cx0 + 17):
        s.px(x, cy0, GD['G'] if x < cx0 + 12 else GD['g'])
    stamp(s, SACK, dict(SACKP, c=GEMS['c']['l'], C=GEMS['c']['h'], p=GEMS['p']['l']), R - 113, H2 - 14)   # 보석이 든 자루
    kx, ky = R - 92, int(top[R - 84]) - 7                      # 왕관: 꼭대기 금화에 비스듬히 박혀 있다
    tilt(s, CROWN, dict(GD, G=(255, 222, 120), g=(226, 176, 70), c=GEMS['c']['l'], r=GEMS['r']['l']), kx, ky, O)
    front = np.full(W2, H2, int)                               # 앞쪽 금이 물건 밑동을 덮는 선(들쭉날쭉)
    for x in range(xl, x1):
        front[x] = H2 - 9 + int(round((nz[(x * 2) % W2] - 0.5) * 3))
    for i in range(-2, 17):                                    # 왕관 밑동 두세 줄은 금화에 묻힌다
        x = kx + i
        front[x] = min(front[x], ky + 6 + int(round(i * 0.3)) + (1 if (i * 7) % 5 < 2 else 0))
    lay(front)
    for x in range(kx - 2, kx + 17):                           # 묻힌 자리의 금화 테
        y = max(front[x], top[x])
        if y < H2 and mass[y, x] and s.a[y - 1, x] > 0:
            s.px(x, y, RAMP[4 if x % 3 else 3])
    for bx, by, fl in [(R - 72, 9, False), (R - 100, 7, True), (R - 42, 5, False), (R - 134, 2, False)]:           # 금괴: 반쯤 묻힘
        y = top[bx + 4] + by
        soft(s, BAR, bright, bx, y, flip=fl)
        for i in range(9):                                     # 밑동은 덩어리에 잠긴다
            if (i * 5 + bx) % 7 < 4 and y + 3 < H2:
                s.px(bx + i, y + 3, RAMP[idx[y + 3, bx + i]])
    beads(R - 106, 42, 'b', dy=6, sag=2.6)
    beads(R - 62, 22, 'p', dy=5, sag=2.6)
    beads(R - 132, 22, 'g', dy=2, sag=1.2, per=4.0)
    for gx, dy, kind in [(R - 76, 9, 'c'), (R - 95, 5, 'p'), (R - 86, 13, 'c'), (R - 106, 3, 'r'), (R - 47, 3, 'c'), (R - 39, 8, 'p'), (R - 60, 2, 'r'),
                         (R - 124, 2, 'g'), (R - 146, 1, 'p')]:
        y = top[gx + 2] + dy
        if y + 4 < H2:
            soft(s, CUT, GEMS[kind], gx, y)                    # 깎은 보석
    soft(s, DIA, GEMS['r'], R - 68, top[R - 65] + 11)          # 큰 보석 하나

    # ── 왼쪽 아래 더미의 물건: 덩어리에 묻혀 있다.
    for bx, by, fl in [(24, 6, False), (60, 4, True)]:
        y = top[bx + 4] + by
        soft(s, BAR, bright, bx, y, flip=fl)
        for i in range(9):
            if (i * 5 + bx) % 7 < 4 and y + 3 < H2:
                s.px(bx + i, y + 3, RAMP[idx[y + 3, bx + i]])
    beads(18, 44, 'b', dy=4, sag=1.8, per=5.0)
    beads(72, 34, 'p', dy=2, sag=1.2, per=4.0)
    for gx, dy, kind in [(36, 2, 'c'), (47, 7, 'r'), (12, 2, 'p'), (74, 2, 'g'), (98, 1, 'c')]:
        y = top[gx + 2] + dy
        if y + 4 < H2:
            soft(s, CUT, GEMS[kind], gx, y)
    ends = [x for x in range(xl + 1, x1 - 1) if (top[x] < H2) != (top[x + 1] < H2)]             # 더미 끝에서 굴러 나온 금화
    for e in ends:
        if x0 - 80 < e or e < 100:
            continue
        d_ = -1 if top[e] >= H2 else 1
        for dist in (4, 15):
            x = e + d_ * dist - 2
            if all(top[min(W2 - 1, max(0, x + k_))] >= H2 for k_ in (-1, 0, 3, 4)):
                for i, c in enumerate((4, 3, 3, 2)):
                    s.px(x + i, H2 - 2, RAMP[c]); s.px(x + i, H2 - 1, RAMP[max(0, c - 2)])
    return top, cx0


def gem(d, x, y, hi, lo):
    d.px(x, y, hi); d.px(x + 1, y, lo); d.px(x, y + 1, lo); d.px(x + 1, y + 1, tuple(v * 0.55 for v in lo))
    for dx, dy in [(-1, 0), (-1, 1), (2, 0), (2, 1), (0, -1), (1, -1), (0, 2), (1, 2)]:
        d.px(x + dx, y + dy, O)


def throne():
    base = (50, 21, 31)
    a = slab(base, grow=None)
    d = Dots()
    rnd = random.Random(7)
    for j, cy in enumerate(range(12, H2 - 8, 12)):             # 융단의 마름모 무늬
        for cx in range(10 + (j % 2) * 8, W2 - 4, 16):
            for k in range(-3, 4):
                d.px(cx + k, cy - (3 - abs(k)), (60, 27, 37))
                d.px(cx + k, cy + (3 - abs(k)), (60, 27, 37))
            d.px(cx, cy, (66, 31, 40))
    d.onto(a)                                                # (구현) 여기까지 석판 재질 — 아래는 장면
    T5.rec_start(a)
    d = Dots()
    gl, gh = (122, 86, 34), (178, 132, 52)
    for x in range(2, W2 - 2):                                 # 금 상감 테 (여백 안)
        d.px(x, H2 - 3, gl)
    for y in range(2, H2 - 2):
        d.px(2, y, gl); d.px(W2 - 3, y, gl)
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            d.px(2 + dx, H2 - 3 + dy, gh)
    red, fold, hi = (112, 28, 40), (82, 20, 32), (140, 40, 50)
    P = 16
    for x in range(W2):                                        # 위: 붉은 드림 장식(여백 5도트 안)
        dep = 2 + int(round(2.4 * math.sin(math.pi * (x % P) / P)))
        for y in range(dep):
            d.px(x, y, fold if x % P == 0 else (hi if x % P == 5 and y < dep - 1 else red))
        d.px(x, dep, gh if x % P else gl)
        if x % P == 0:
            d.px(x, dep + 1, gh)
    for y in range(5, 78):                                     # 오른쪽 벽을 따라 묶어 내린 휘장
        w = 9 if y < 52 else (5 if y < 58 else 8 - (y - 58) // 4)
        if w < 1:
            break
        for i in range(w):
            d.px(W2 - 3 - w + i + (1 if 52 <= y < 58 else 0), y, fold if i in (2, 6) else (hi if i == 4 else red))
        if y in (53, 56):
            for i in range(6):
                d.px(W2 - 9 + i, y, gh)

    # ── 오른쪽 아래: 단 위의 왕좌와 보물 (한 층에 그려 외곽선을 한 번에 두른다)
    s = Dots()
    cx = R - 24                                                # 왕좌 가운데
    s1, s2 = H2 - 3, H2 - 6                                    # 단 두 칸의 윗줄
    stone = {'t': (150, 108, 118), 'f': (96, 58, 72), 'd': (66, 36, 50)}
    for x0, yt in ((R - 60, s1), (R - 46, s2)):                # 단: 윗면 밝은 줄 + 금 띠 + 앞면
        for x in range(x0, W2 - 3):
            for y in range(yt, H2):
                c = stone['t'] if y == yt else (GD['k'] if y == yt + 1 else (stone['f'] if x < cx + 14 else stone['d']))
                if x == x0:
                    c = stone['t']
                s.px(x, y, c)
    for x in range(cx - 6, cx + 7):                            # 단을 타고 내려오는 붉은 융단
        for y in range(s2, H2):
            edge = x in (cx - 6, cx + 6)
            c = GD['g'] if edge else (VEL['V'] if y in (s1, s2) else VEL['v'])
            s.px(x, y, c)
    sy = chair(s, cx, s2)
    top, cx0 = hoard(s, R - 124, cx - 9, rnd)                  # 왕좌 옆 보물 더미 (왕관은 더미 꼭대기에 얹힘)
    outline(s, O)
    merge(d, s)
    glint(d, R - 80, top[R - 84] - 9)
    glint(d, cx0 + 6, H2 - 21)
    glint(d, R - 101, top[R - 101] + 3)
    for gx_ in (40, 76, R - 140):                         # 바닥 보물의 반짝임
        glint(d, gx_ + 2, top[gx_ + 2] + 1, (255, 250, 224))
    d.onto(a)
    glow(a, TW - 110, TH - 30, 120, (246, 196, 96), 0.11)
    glow(a, cx * 2, TH - 60, 70, (246, 196, 96), 0.06)
    glow(a, 90, TH - 8, 120, (246, 196, 96), 0.08, sy=2.2)       # 왼쪽 아래 더미의 금빛
    return a, dict(name='왕좌의 방', fg=(244, 232, 208), cursor=(255, 226, 122), dim=(160, 132, 128), base=base, deco=(152, 108, 38))
