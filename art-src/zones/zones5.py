"""5차 시안: 구역별 석판 그림. 각 함수는 (석판 배열, 구역 정보)를 돌려준다.

자리 규칙(tab5.py): 위 여백 5도트·아래 여백 4도트 안의 것은 글자 칸 밖. 큰 그림은 오른쪽 아래 구석 하나,
매달린 것은 오른쪽 위 구석. 왼쪽 아래(프롬프트 자리)는 바닥선만.
"""
import math
import random

import numpy as np

import tab5 as T5

from tab5 import BOT_FREE, CRACK, H2, LUM, MOSS, MOSS2, TH, TOP_FREE, TW, W2, XX, YY, Dots, boulder, dim, glow, ground, noise, prism, slab

R = W2 - 1


def fill_ground(d, top, body, rim, low=None, spark=None, seed=1):
    r = random.Random(seed)
    for x in range(W2):
        for y in range(top[x], H2):
            dep = y - top[x]
            d.px(x, y, rim if dep == 0 else (low if low and dep > 4 + (x * 7 % 3) else body))
        if spark and r.random() < spark[1] and H2 - top[x] > 2:
            d.px(x, r.randrange(top[x] + 1, H2), spark[0])


def top_rim(m):
    """얼룩의 윗가장자리(위가 비어 있는 도트)."""
    return m & ~np.roll(m, 1, 0)


def icicle(d, x, y, n, w, lt, hi):
    for j in range(n):
        ww = max(1, round(w * (1 - j / n) ** 0.8))
        x0 = x + (w - ww) // 2
        for i in range(ww):
            d.px(x0 + i, y + j, hi if (i == 0 and ww > 1) or (ww == 1 and j < n - 1) else lt)


def cluster(d, top, items, pals, sink=1):
    """결정 무리. items = [(x, 폭, 높이, 기울기, 색 번호)] 뒤에서 앞 순서."""
    for x, w, h, lean, p in items:
        prism(d, x, top[min(R, max(0, x))] + sink, w, h, lean, pals[p])


# ───────────────────────── 얼음 동굴 ─────────────────────────
def ice():
    base = (20, 38, 56)

    def crack(a):                                            # 얼음의 금은 희게 뜬다
        m = CRACK & ~MOSS
        a[m] = a[m] + (16, 24, 28)
    a = slab(base, grow=(38, 62, 86), crack=crack)
    d = Dots()
    r = random.Random(11)
    ys, xs = np.nonzero(top_rim(MOSS2))                      # 성에 얼룩 윗가장자리에 맺힌 서리
    for y, x in zip(ys, xs):
        d.px(x, y, (66, 96, 124))
    d.onto(a)                                                # (구현) 여기까지 석판 재질 — 아래는 장면
    T5.rec_start(a)
    d = Dots()
    lt, hi = (100, 138, 176), (172, 204, 230)
    for x in range(W2):                                      # 천장의 얼음 턱
        d.px(x, 0, (58, 90, 122))
    x = 3
    while x < W2 - 72:                                       # 짧은 고드름: 글자 칸 위 여백 안
        n = r.choice([2, 2, 3, 3, 4, TOP_FREE - 1])
        icicle(d, x, 1, n, 2 if n < 4 else 3, lt, hi)
        if r.random() < 0.35:
            icicle(d, x + 3, 1, max(2, n - 2), 2, lt, hi)
        x += r.choice([5, 7, 9, 12, 15, 21, 26])
    for x, n, w in [(R - 68, 4, 2), (R - 62, 7, 3), (R - 56, 5, 2), (R - 50, 11, 4), (R - 43, 6, 2), (R - 38, 9, 3), (R - 32, 16, 4),
                    (R - 26, 8, 3), (R - 21, 12, 3), (R - 16, 22, 5), (R - 9, 13, 4), (R - 4, 7, 3)]:
        icicle(d, x, 1, n, w, lt, hi)                        # 오른쪽 위 구석: 굵은 고드름 무리
    top = ground(2, base=3, bumps=[(R - 8, 15, 30), (R - 58, 7, 16), (R - 98, 3, 12)], wob=0.7)
    fill_ground(d, top, (80, 104, 138), (134, 162, 194), low=(66, 88, 122), spark=((172, 198, 224), 0.04), seed=3)
    pv = {'h': (182, 212, 236), 'l': (114, 154, 194), 'm': (74, 110, 150), 'd': (48, 76, 110)}
    pb = dim(pv, 0.62, base)                                 # 뒤에 선 것은 흐리게
    cluster(d, top, [(R - 43, 6, 14, -3, 1), (R - 12, 7, 18, 3, 1), (R - 30, 9, 26, -1, 0), (R - 20, 7, 17, 4, 0), (R - 39, 5, 9, -3, 0),
                     (R - 7, 5, 10, 2, 0), (R - 62, 5, 9, -2, 1), (R - 57, 6, 12, 1, 0), (R - 51, 4, 6, 2, 0)], [pv, pb])
    for x in range(R - 70, W2):                              # 송이 발치를 눈이 덮는다
        d.px(x, top[x], (134, 162, 194))
        d.px(x, top[x] + 1, (80, 104, 138))
    d.onto(a)
    glow(a, TW - 56, TH - 46, 100, (120, 170, 220), 0.10)
    return a, dict(name='얼음 동굴', fg=(220, 236, 246), cursor=(184, 236, 250), dim=(126, 150, 176), base=base, deco=(80, 104, 138))


# ───────────────────────── 용암 굴 ─────────────────────────
def lava():
    base = (38, 29, 30)

    def crack(a):                                            # 금이 아래로 갈수록 달아오른다
        m = CRACK & ~MOSS
        t = np.clip((YY - TH * 0.25) / (TH * 0.75), 0, 1)[..., None]
        a[m] = (np.array((56, 31, 26), np.float32) * (1 - t) + np.array((100, 44, 22), np.float32) * t)[m]
    a = slab(base, grow=(54, 35, 30), crack=crack)
    d = Dots()
    r = random.Random(5)
    rock = {'h': (92, 72, 66), 'm': (58, 45, 44), 'd': (34, 26, 28)}
    for x in range(W2):
        d.px(x, 0, (58, 45, 44))
    x = 4
    while x < W2 - 70:                                       # 짧은 종유석
        n = r.choice([2, 2, 3, 3, 4])
        icicle(d, x, 1, n, 3 if n > 2 else 2, rock['m'], rock['h'])
        x += r.choice([7, 9, 13, 17, 24, 31])
    for x, n, w in [(R - 64, 4, 3), (R - 57, 8, 4), (R - 49, 5, 3), (R - 43, 12, 5), (R - 35, 7, 3), (R - 29, 15, 5), (R - 21, 9, 4), (R - 14, 19, 6), (R - 6, 10, 4)]:
        icicle(d, x, 1, n, w, rock['m'], rock['h'])
        d.px(x + w // 2, n, (150, 66, 26))                    # 아래 용암 빛을 받은 끝
    # 바닥: 용암이 흐르고 식은 껍질이 떠 있다 (4도트 안)
    n1 = noise(8, 7)[H2 // 3]
    for x in range(W2):
        crust = n1[x] > 0.44
        for j, c in enumerate([(206, 104, 34), (150, 56, 24), (104, 38, 22)]):
            y = H2 - 3 + j
            d.px(x, y, ((78, 60, 54) if j == 0 else (46, 36, 36)) if crust else c)
    top = ground(6, base=0, bumps=[(R - 10, 19, 26), (R - 50, 9, 14)], wob=0.0)
    for cx, cy, rx, ry in [(R - 6, H2 - 9, 9, 8), (R - 24, H2 - 6, 8, 6), (R - 14, H2 - 17, 7, 5), (R - 40, H2 - 4, 7, 4), (R - 54, H2 - 5, 6, 5), (R - 32, H2 - 12, 5, 4), (R - 66, H2 - 3, 4, 3)]:
        boulder(d, cx, cy, rx, ry, rock)                      # 오른쪽 구석: 현무암 더미
    for pts in [[(R - 20, H2 - 14), (R - 19, H2 - 12), (R - 19, H2 - 10), (R - 17, H2 - 8), (R - 16, H2 - 6), (R - 16, H2 - 4)],
                [(R - 37, H2 - 9), (R - 36, H2 - 7), (R - 34, H2 - 5), (R - 33, H2 - 4)], [(R - 2, H2 - 16), (R - 3, H2 - 14), (R - 3, H2 - 12)],
                [(R - 47, H2 - 6), (R - 47, H2 - 4)]]:
        for i, (px_, py_) in enumerate(pts):                  # 바위 틈을 타고 내리는 용암
            d.px(px_, py_, (236, 138, 44) if i >= len(pts) - 2 else (186, 74, 26))
    for x_, y_ in [(R - 28, H2 - 24), (R - 45, H2 - 15), (R - 12, H2 - 30), (R - 20, H2 - 38)]:
        d.px(x_, y_, (206, 96, 34))                           # 불티
    d.onto(a)
    m = np.clip(1 - (TH - YY) / 60, 0, 1) ** 2 * 0.10         # 아래에서 올라오는 빛
    a += (np.array((230, 110, 40), np.float32) - a) * m[..., None]
    glow(a, TW - 50, TH - 20, 120, (236, 120, 40), 0.14)
    return a, dict(name='용암 굴', fg=(240, 226, 208), cursor=(255, 176, 64), dim=(150, 128, 116), base=base, deco=(58, 45, 44))


# ───────────────────────── 수정 광산 ─────────────────────────
PICK = ['.iiiiii...', 'iI..w.iii.', 'i...w...ii', '...w.....i', '...w......', '..w.......', '..w.......', '.w........', '.w........']


def crystal():
    base = (34, 27, 58)
    a = slab(base, grow=(50, 38, 86))
    d = Dots()
    r = random.Random(9)
    ys, xs = np.nonzero(top_rim(MOSS2))                      # 수정 가루가 앉은 자리
    for y, x in zip(ys, xs):
        d.px(x, y, (74, 58, 122))
    ys, xs = np.nonzero(MOSS2)
    for i in r.sample(range(len(ys)), 60):                    # 가루 속 반짝이 (글자가 드문 오른쪽에만)
        if xs[i] > W2 * 0.62:
            d.px(xs[i], ys[i], (128, 106, 190))
    d.onto(a)                                                # (구현) 여기까지 석판 재질 — 아래는 장면
    T5.rec_start(a)
    d = Dots()
    v = {'h': (198, 174, 244), 'l': (136, 104, 208), 'm': (92, 64, 154), 'd': (56, 38, 104)}
    k = {'h': (240, 196, 226), 'l': (196, 118, 174), 'm': (132, 70, 118), 'd': (82, 40, 76)}
    c = {'h': (190, 230, 240), 'l': (104, 176, 200), 'm': (60, 116, 146), 'd': (36, 72, 98)}
    vb = dim(v, 0.6, base)
    for x in range(W2):
        d.px(x, 0, (58, 46, 96))
    x = 6
    while x < W2 - 70:                                       # 천장에 박힌 작은 결정
        if r.random() < 0.7:
            prism(d, x, 1, 2, r.choice([2, 3, 3, 4]), 0, vb if r.random() < 0.6 else v, tip=2, down=True)
        x += r.choice([11, 15, 19, 27, 34])
    for x, w, h, lean, p in [(R - 62, 4, 6, 1, vb), (R - 53, 5, 11, -1, v), (R - 45, 4, 7, 1, vb), (R - 36, 7, 17, -2, v), (R - 27, 4, 9, 1, k),
                             (R - 19, 7, 21, 1, v), (R - 10, 5, 12, -1, vb), (R - 4, 4, 8, 1, v)]:
        prism(d, x, 1, w, h, lean, p, down=True)              # 오른쪽 위 구석: 매달린 결정
    top = ground(4, base=3, bumps=[(R - 12, 12, 30), (R - 62, 5, 14)], wob=0.8)
    fill_ground(d, top, (52, 41, 88), (88, 72, 136), low=(42, 33, 72), spark=((132, 110, 196), 0.03), seed=6)
    d.paste(PICK, {'i': (118, 118, 142), 'I': (164, 164, 188), 'w': (112, 78, 50)}, R - 66, top[R - 62] - 8)   # 곡괭이
    cluster(d, top, [(R - 45, 6, 13, -3, 3), (R - 14, 7, 18, 3, 3), (R - 31, 10, 28, -1, 0), (R - 20, 7, 19, 4, 0), (R - 40, 5, 11, -3, 1),
                     (R - 7, 6, 12, 2, 2), (R - 50, 4, 7, -1, 0), (R - 2, 4, 7, 1, 0)], [v, k, c, vb])
    for x in range(R - 54, W2):
        d.px(x, top[x], (88, 72, 136))
        d.px(x, top[x] + 1, (52, 41, 88))
    for x_, y_ in [(R - 34, top[R - 31] - 24), (R - 22, top[R - 20] - 16)]:   # 반짝임
        for dx, dy in [(0, 0), (-1, 0), (1, 0), (0, -1), (0, 1)]:
            d.px(x_ + dx, y_ + dy, (236, 226, 252))
    d.onto(a)
    glow(a, TW - 56, TH - 44, 110, (156, 112, 230), 0.13)
    glow(a, TW - 50, 20, 80, (156, 112, 230), 0.07)
    return a, dict(name='수정 광산', fg=(234, 226, 246), cursor=(228, 192, 255), dim=(140, 128, 170), base=base, deco=(52, 41, 88))


# ───────────────────────── 왕좌의 방 ─────────────────────────
CUP = ['hgggd', 'hgggd', '.hgd.', '..g..', '..g..', '.hgd.']


def coin_heap(d, top, x0, x1):
    coin = [[(204, 162, 68), (148, 106, 36), (148, 106, 36), (82, 54, 20)], [(148, 106, 36), (110, 76, 26), (110, 76, 26), (82, 54, 20)]]
    for x in range(x0, x1):
        for y in range(top[x], H2):
            ry = H2 - 1 - y
            d.px(x, y, (224, 184, 84) if y == top[x] else coin[1 - ry % 2][(x + ry // 2 * 2) % 4])


def throne():
    base = (50, 21, 31)
    a = slab(base, grow=None)
    d = Dots()
    r = random.Random(3)
    for j, cy in enumerate(range(12, H2 - 6, 12)):             # 융단의 마름모 무늬
        for cx in range(10 + (j % 2) * 8, W2 - 4, 16):
            for k in range(-3, 4):
                d.px(cx + k, cy - (3 - abs(k)), (60, 27, 37))
                d.px(cx + k, cy + (3 - abs(k)), (60, 27, 37))
            d.px(cx, cy, (66, 31, 40))
    gl, gh = (122, 86, 34), (178, 132, 52)
    for x in range(2, W2 - 2):                                  # 금 상감 테 (여백 안)
        d.px(x, H2 - 3, gl)
    for y in range(2, H2 - 2):
        d.px(2, y, gl); d.px(W2 - 3, y, gl)
    for cx, cy in [(2, H2 - 3), (W2 - 3, H2 - 3)]:
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                d.px(cx + dx, cy + dy, gh)
    red, fold, hi = (112, 28, 40), (82, 20, 32), (140, 40, 50)
    P = 16
    for x in range(W2):                                         # 위: 붉은 드림 장식(여백 5도트 안)
        t = (x % P) / P
        dep = 2 + int(round(2.4 * math.sin(math.pi * t)))
        for y in range(dep):
            d.px(x, y, fold if x % P == 0 else (hi if x % P == 5 and y < dep - 1 else red))
        d.px(x, dep, gh if x % P else gl)
        if x % P == 0:
            d.px(x, dep + 1, gh)                                # 술
    # 오른쪽 벽을 따라 묶어 내린 휘장
    for y in range(5, 78):
        w = 9 if y < 52 else (5 if y < 58 else 8 - (y - 58) // 4)
        if w < 1:
            break
        for i in range(w):
            c = fold if i in (2, 6) else (hi if i == 4 else red)
            d.px(W2 - 3 - w + i + (1 if 52 <= y < 58 else 0), y, c)
        if 52 <= y < 58 and y in (53, 56):
            for i in range(6):
                d.px(W2 - 9 + i, y, gh)                         # 금 끈
    # 오른쪽 아래 구석: 보물 더미
    top = ground(3, base=0, bumps=[(R - 8, 27, 30), (R - 58, 10, 18)], wob=0.5)
    coin_heap(d, top, R - 104, W2 - 3)
    gems = [(170, 46, 58), (64, 98, 178), (56, 150, 102)]
    for x_, dy in [(R - 76, 2), (R - 62, 3), (R - 44, 4), (R - 27, 6), (R - 12, 9), (R - 34, 12), (R - 6, 4), (R - 20, 15), (R - 50, 8), (R - 9, 19)]:
        y_, c = top[x_] + dy, gems[x_ % 3]
        if y_ < H2 - 2:
            d.px(x_, y_, tuple(min(255, v + 70) for v in c)); d.px(x_ + 1, y_, c); d.px(x_, y_ + 1, c); d.px(x_ + 1, y_ + 1, tuple(v * 0.6 for v in c))
    d.art('chest-open', R - 30, top[R - 24] - 10, 0.92)
    d.art('crown-s', R - 60, top[R - 55] - 5, 0.92)
    d.art('coin', R - 78, top[R - 74] - 6, 0.9)
    d.art('coin', R - 44, top[R - 40] - 6, 0.9)
    d.art('banner-crown', R - 100, 9, 0.0) if False else None
    d.paste(CUP, {'h': (226, 186, 90), 'g': (170, 124, 42), 'd': (112, 78, 26)}, R - 12, top[R - 10] - 5)
    for x_ in [14, 61, 118, 190, 247, 305, 352, R - 96, R - 108]:   # 바닥에 흘린 금화 몇 닢
        for i, c in enumerate([(204, 162, 68), (148, 106, 36), (110, 76, 26)]):
            d.px(x_ + i, H2 - 1, c)
    for x_, y_ in [(R - 24, top[R - 24] - 12), (R - 55, top[R - 55] - 7), (R - 6, top[R - 6] - 8)]:
        for dx, dy in [(0, 0), (-1, 0), (1, 0), (0, -1), (0, 1)]:
            d.px(x_ + dx, y_ + dy, (255, 244, 200))
    d.onto(a)
    glow(a, TW - 56, TH - 36, 100, (240, 190, 90), 0.10)
    return a, dict(name='왕좌의 방', fg=(244, 232, 208), cursor=(255, 226, 122), dim=(160, 132, 128), base=base, deco=(148, 106, 36))


# ───────────────────────── 이끼 유적 ─────────────────────────
COLUMN = ['....g.......', '..ggh..gg...', '.gghllmlgd..', '.hllmllmmd..', '.hllmllmmd..', '.hllmllmmd..', '.hllmllmmd.g', '.hllmllmmd..', '.hllmllmmd..', '.hllmllmmd..', '.hllmllmmd..', 'hhlllllmmmd.', 'hllllllmmmdd', 'hlllllmmmmdd']
SLABP = ['.hhhhhhg.', 'hllllmmmd', 'hlllmmmdd']
MUSH = ['.ccc.', 'cscsc', 'ccccc', '..t..', '..t..']
FERN = ['..f...f..', '.f.f.f.f.', '..ff.ff..', '.f.fff.f.', '...fFf...', '....F....']


def vine(d, x, y, n, r, leaf, stem, bloom=None):
    for j in range(n):
        x += r.choice([-1, 0, 0, 0, 1])
        d.px(x, y + j, stem)
        if j % 3 == 1:
            s = r.choice([-1, 1])
            c = r.choice(leaf)
            for dx, dy in [(1, 0), (2, 0), (1, 1), (2, -1)]:
                d.px(x + s * dx, y + j + dy, c)
            if bloom and r.random() < 0.25:
                d.px(x - s, y + j, bloom)


def moss():
    base = (27, 37, 34)
    a = slab(base, grow=(38, 82, 48))
    d = Dots()
    r = random.Random(41)
    ys, xs = np.nonzero(top_rim(MOSS2))                      # 이끼 윗가장자리가 빛을 받는다
    for y, x in zip(ys, xs):
        d.px(x, y, (58, 110, 60))
    ys, xs = np.nonzero(MOSS2)
    for i in r.sample(range(len(ys)), 44):                    # 이끼에 핀 작은 꽃 (글자가 드문 오른쪽에만)
        if xs[i] > W2 * 0.62:
            d.px(xs[i], ys[i], r.choice([(214, 190, 208), (224, 208, 120)]))
    d.onto(a)                                                # (구현) 여기까지 석판 재질 — 아래는 장면
    T5.rec_start(a)
    d = Dots()
    leaf, stem = [(34, 84, 50), (48, 112, 62), (68, 134, 72)], (28, 66, 42)
    for x in range(W2):                                      # 천장의 이끼 띠
        d.px(x, 0, (38, 82, 48))
        if (x * 13) % 7 < 3:
            d.px(x, 1, (48, 100, 56))
    x = 5
    while x < W2 - 80:                                       # 짧게 늘어진 덩굴 (여백 안)
        vine(d, x, 1, r.choice([2, 3, 3, 4]), r, leaf, stem)
        x += r.choice([9, 13, 17, 23, 30])
    for x, n in [(R - 74, 8), (R - 66, 16), (R - 58, 11), (R - 50, 26), (R - 43, 14), (R - 35, 34), (R - 27, 20), (R - 19, 42), (R - 12, 28), (R - 5, 18)]:
        vine(d, x, 1, n, r, leaf, stem, (214, 190, 208))      # 오른쪽 위 구석: 길게 내려온 덩굴
    top = ground(4, base=2, bumps=[(R - 10, 13, 30), (R - 60, 5, 14)], wob=0.6)
    fill_ground(d, top, (36, 76, 46), (62, 116, 62), low=(30, 62, 40), seed=4)
    for x in range(0, W2, 1):                                 # 풀잎: 윗선이 들쭉날쭉
        if (x * 7 + 3) % 5 in (0, 2):
            d.px(x, top[x] - 1, (62, 116, 62))
        if (x * 11) % 17 == 0:
            d.px(x, top[x] - 2, (80, 138, 72))
    st = {'h': (120, 128, 118), 'l': (92, 100, 94), 'm': (68, 76, 74), 'd': (46, 54, 54), 'g': (58, 110, 60)}
    d.paste(COLUMN, st, R - 36, top[R - 30] - 12)              # 부러진 기둥 밑동
    d.paste(SLABP, st, R - 58, top[R - 54] - 1)               # 쓰러진 돌
    d.paste(SLABP, st, R - 14, top[R - 10] - 2, flip=True)
    fp = {'f': (48, 112, 62), 'F': (34, 84, 50)}
    d.paste(FERN, fp, R - 46, top[R - 42] - 5)
    d.paste(FERN, fp, R - 22, top[R - 18] - 5)
    mp = {'c': (158, 64, 58), 's': (226, 214, 196), 't': (176, 168, 148)}
    for x_ in (R - 64, R - 8, R - 70):
        d.paste(MUSH, mp, x_, top[x_ + 2] - 4)
    for x_ in range(R - 80, W2, 1):
        if (x_ * 5) % 11 == 0:
            d.px(x_, top[x_] - 1, r.choice([(214, 190, 208), (224, 208, 120)]))
    d.onto(a)
    for x_, y_ in [(TW - 150, TH - 70), (TW - 96, TH - 96), (TW - 44, TH - 84)]:   # 반딧불
        glow(a, x_, y_, 12, (200, 250, 150), 0.30)
        fm = np.zeros(a.shape[:2], np.float32); fm[y_ - 1:y_ + 1, x_ - 1:x_ + 1] = 1
        T5.over(a, fm, (214, 250, 160))
    glow(a, TW - 60, TH - 30, 90, (120, 220, 140), 0.07)
    return a, dict(name='이끼 유적', fg=(226, 232, 208), cursor=(216, 214, 128), dim=(128, 144, 126), base=base, deco=(36, 76, 46))


ZONES = {'ice': ice, 'lava': lava, 'crystal': crystal, 'throne': throne, 'moss': moss}

import scenes6  # noqa: E402  6차: 용암 굴·왕좌의 방은 한 장면으로 다시 그린 것을 쓴다 (옛 것은 위 lava/throne, zones5_v5.py)

ZONES.update(lava=scenes6.lava, throne=scenes6.throne)
