"""Pixel Quest 3단계 시안 5차 — 석판(터미널 뒤 그림)을 구역마다 처음부터 그린다.

실제 석판 그림(art/look/tablet-dark-none.png + deco-dark-none-136.png의 이끼)을 바탕으로 삼고,
글자 줄이 놓이는 칸 밖에만 구역의 그림을 둔다:
  - 위 여백(10px = 5도트), 아래 여백(8px = 4도트): 글자 칸 밖이라 절대 글자 뒤가 아님
  - 오른쪽 아래 구석의 큰 그림 하나, 오른쪽 위 구석의 매달린 것: 줄이 아주 길 때만 글자 뒤
  - 왼쪽 아래(프롬프트가 놓이는 곳)는 비운다
모든 그림은 반 크기(도트 2px)에서 그린다. 글자는 GalmuriMono11 12px로 직접 얹는다.
"""
import math
import os
import random

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
ART = os.path.join(ROOT, 'mods/pixel-quest/art')
TERM = (282, 88, 1268, 772)
TW, TH = TERM[2] - TERM[0], TERM[3] - TERM[1]
W2, H2 = TW // 2, TH // 2
PAD_X, PAD_Y, PITCH, ROWS = 10, 11, 19, 35           # 글자 칸: 첫 줄 위 11px, 줄 간격 19px, 35줄
TOP_FREE, BOT_FREE = 5, 4                              # 글자 칸 밖 여백(도트)
FONT = ImageFont.truetype(os.path.join(ART, '../fonts/GalmuriMono11.ttf'), 12)


def source():
    """화면에 보이는 석판(이끼 포함)과 이끼 자리, 글자 칸 크기로 잘라서."""
    t = Image.open(os.path.join(ART, 'look/tablet-dark-none.png')).convert('RGBA')
    d = Image.open(os.path.join(ART, 'look/deco-dark-none-136.png')).convert('RGBA')
    c = Image.new('RGBA', d.size, (18, 23, 49, 255))
    c.alpha_composite(t.resize(d.size))
    plain = np.array(c.convert('RGB')).astype(np.float32)
    ox, oy = TERM[0] - 277, TERM[1] - 47
    moss = np.array(d)[..., 3][oy:oy + TH, ox:ox + TW] > 60
    return plain[oy:oy + TH, ox:ox + TW], moss


SRC, MOSS = source()
LUM = (0.3 * SRC[..., 0] + 0.59 * SRC[..., 1] + 0.11 * SRC[..., 2]) / 255
YY, XX = np.mgrid[0:TH, 0:TW].astype(np.float32)


def blur(m, r):
    m = m.astype(np.float32)
    for ax in (0, 1):
        acc = np.zeros_like(m)
        for dd in range(-r, r + 1):
            acc += np.roll(m, dd, ax)
        m = acc / (2 * r + 1)
    return m


SOFT = blur(LUM, 5)
CRACK = LUM < SOFT * 0.94                              # 석판의 금
MOSS2 = MOSS[::2, ::2]                                 # 도트 격자의 이끼 자리


def noise(seed, cell, h=H2, w=W2):
    r = np.random.default_rng(seed)
    g = r.uniform(0, 1, (h // cell + 3, w // cell + 3)).astype(np.float32)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    y, x = yy / cell, xx / cell
    y0, x0 = y.astype(int), x.astype(int)
    fy, fx = y - y0, x - x0
    return (g[y0, x0] * (1 - fx) + g[y0, x0 + 1] * fx) * (1 - fy) + (g[y0 + 1, x0] * (1 - fx) + g[y0 + 1, x0 + 1] * fx) * fy


class Dots:
    """도트(2px) 층. 색과 덮는 정도."""

    def __init__(self, w=W2, h=H2):
        self.w, self.h = w, h
        self.c = np.zeros((h, w, 3), np.float32)
        self.a = np.zeros((h, w), np.float32)

    def px(self, x, y, col, al=1.0):
        x, y = int(x), int(y)
        if 0 <= x < self.w and 0 <= y < self.h:
            self.c[y, x] = col
            self.a[y, x] = al

    def get(self, x, y):
        return self.a[int(y), int(x)] > 0 if 0 <= x < self.w and 0 <= y < self.h else False

    def paste(self, rows, pal, x, y, flip=False, al=1.0):
        for j, r in enumerate(rows):
            r = r[::-1] if flip else r
            for i, ch in enumerate(r):
                if ch in pal:
                    self.px(x + i, y + j, pal[ch], al)

    def art(self, name, x, y, dim=1.0):
        s = np.array(Image.open(os.path.join(ART, name + '.png')).convert('RGBA'))[::2, ::2]
        for j in range(s.shape[0]):
            for i in range(s.shape[1]):
                if s[j, i, 3] > 128:
                    self.px(x + i, y + j, tuple(float(v) * dim for v in s[j, i, :3]))

    def onto(self, a):
        al = self.a.repeat(2, 0).repeat(2, 1)[..., None]
        a[:] = a * (1 - al) + self.c.repeat(2, 0).repeat(2, 1) * al
        record(a, al[..., 0], self.c.repeat(2, 0).repeat(2, 1))


def glow(a, cx, cy, rad, col, k, sy=1.0):
    m = np.clip(1 - np.hypot(XX - cx, (YY - cy) * sy) / rad, 0, 1) ** 1.6 * k
    a += (np.array(col, np.float32) - a) * m[..., None]
    record(a, m, np.broadcast_to(np.array(col, np.float32), a.shape))


# ── 구현용 기록 장치 (art-src/gen_zones.py): 석판 재질이 끝난 뒤의 덧그림(장면)을 한 겹으로 모은다.
# 덧그림은 전부 "색을 덮는 정도만큼 덮기"라서, 순서대로 겹치면 하나의 반투명 층(색, 덮는 정도)이 된다.
REC = None


class Rec:
    def __init__(self, a):
        self.target, self.base = a, a.copy()                    # base: 그 순간의 석판 재질
        self.p = np.zeros(a.shape, np.float32)                  # 색 x 덮는 정도
        self.al = np.zeros(a.shape[:2], np.float32)

    def over(self, al, col):
        self.p = self.p * (1 - al[..., None]) + col * al[..., None]
        self.al = al + self.al * (1 - al)


def rec_start(a):
    global REC
    REC = Rec(a)


def rec_stop():
    global REC
    r, REC = REC, None
    return r


def record(a, al, col):
    if REC is not None and REC.target is a:
        REC.over(al.astype(np.float32), col.astype(np.float32))


def over(a, m, col):
    """a를 col로 m만큼 덮는다(기록됨)."""
    c = np.broadcast_to(np.array(col, np.float32), a.shape)
    a += (c - a) * m[..., None]
    record(a, m, c)


def slab(base, grow=None, crack=None, lo=0.6, hi=1.5):
    """원래 석판의 명암(빛·금)을 살려 구역 색으로. 이끼 자리는 grow 색으로."""
    ref = float(LUM[~MOSS].mean())
    k = np.clip(LUM / ref, lo, hi)[..., None]
    a = np.array(base, np.float32) * k
    if grow is not None:
        km = np.clip(LUM / float(LUM[MOSS].mean()), 0.8, 1.25)[..., None]
        a[MOSS] = (np.array(grow, np.float32) * km)[MOSS]
    else:                                                    # 얼룩도 금도 없는 구역(융단): 큰 명암만
        a = np.array(base, np.float32) * np.clip(blur(np.where(MOSS, ref, LUM), 9) / ref, lo, hi)[..., None]
    if crack is not None:
        crack(a)
    return np.clip(a, 0, 255)


def ground(seed, base=3, bumps=(), wob=1.0):
    """아래 바닥선(도트). 가운데는 base. bumps = [(가운데 x, 높이, 반폭)] 만큼 솟는다."""
    n = noise(seed, 9)[H2 // 2]
    top = np.zeros(W2, int)
    for x in range(W2):
        h = base + (n[x] - 0.5) * 2 * wob + sum(hh * math.exp(-((x - cx) / ww) ** 2) for cx, hh, ww in bumps)
        top[x] = H2 - max(1, int(round(h)))
    return top


def prism(d, cx, yb, w, h, lean, pal, tip=None, down=False):
    """결정 기둥 하나: 밑(yb)에서 h만큼, 폭 w. 꼭짓점은 왼쪽 1/3에 있고 위 깎인 면이 가장 밝다.
    몸은 왼쪽 모서리 빛(h) · 왼쪽 면(l) · 오른쪽 면(m) · 오른쪽 모서리 그늘(d). down=천장에서 아래로."""
    tip = tip or max(2, round(w * 0.9))
    ax = 0.35
    split = round(ax * (w - 1))
    for j in range(h):
        y = yb + j if down else yb - j
        if j >= h - tip:
            t = (h - 1 - j) / tip
            lo, hi = round((1 - t) * ax * (w - 1)), round((w - 1) - (1 - t) * (1 - ax) * (w - 1))
        else:
            lo, hi = 0, w - 1
        off = cx - w // 2 + round(lean * j / h)
        for i in range(lo, hi + 1):
            if j >= h - tip:
                c = pal['h'] if i <= split else pal['l']
            elif i == 0:
                c = pal['h']
            elif i == w - 1 and w > 3:
                c = pal['d']
            else:
                c = pal['l'] if i <= split else pal['m']
            d.px(off + i, y, c)


def boulder(d, cx, cy, rx, ry, pal):
    """둥근 바위. 왼쪽 위에 빛, 오른쪽 아래 그늘."""
    for y in range(cy - ry, cy + ry + 1):
        for x in range(cx - rx, cx + rx + 1):
            u, v = (x - cx) / (rx + 0.3), (y - cy) / (ry + 0.3)
            if u * u + v * v <= 1:
                e = u * 0.6 + v * 0.8
                d.px(x, y, pal['h'] if e < -0.55 else (pal['d'] if e > 0.45 else pal['m']))


def dim(pal, k, to):
    """그림을 석판 쪽으로 가라앉힌다(멀리 있는 것처럼)."""
    return {ch: tuple(c[i] * k + to[i] * (1 - k) for i in range(3)) for ch, c in pal.items()}


# ---------- 글자 ----------
def text(img, lines, fg, y0=PAD_Y):
    """lines: 줄마다 [(글, 색)] 또는 글. 색 None = 기본 글자색."""
    d = ImageDraw.Draw(img)
    d.fontmode = '1'
    for i, ln in enumerate(lines[:ROWS]):
        x = PAD_X
        for seg in ([(ln, None)] if isinstance(ln, str) else ln):
            s, c = seg[0], seg[1]
            if len(seg) > 2:                                # 배경 칸(커서·견본)
                d.rectangle([x, y0 + i * PITCH - 2, x + FONT.getlength(s) - 1, y0 + i * PITCH + 13], fill=seg[2])
            d.text((x, y0 + i * PITCH), s, font=FONT, fill=tuple(c or fg))
            x += FONT.getlength(s)


def ansi(th):
    return dict(zip(['k', 'r', 'g', 'y', 'b', 'm', 'c', 'w', 'K', 'R', 'G', 'Y', 'B', 'M', 'C', 'W'], th))


THEME = ['#0b0e1c', '#e0564f', '#5cc46a', '#f0c24a', '#5a8cf0', '#c77ad8', '#4fc4c4', '#c8c0b0', '#807aa4', '#ff8070', '#8ee07a', '#f6d870', '#8ab4ff', '#e8a0f0', '#7ee8e0', '#fff4c8']


def hx(s):
    return tuple(int(s[i:i + 2], 16) for i in (1, 3, 5))


def demo(fg, cur, dim):
    A = {k: hx(v) for k, v in ansi(THEME).items()}
    sw = [('   ', None, A[k]) for k in 'KRGYBMCW']
    return ['Windows PowerShell', 'Copyright (C) Microsoft Corporation. All rights reserved.', '',
            [('* ', A['y']), ('퀘스트 로그', A['Y']), ('  (pixel-quest 데모)', dim)], '',
            [('●', A['B']), ('던전 입구에 도착했습니다.', None)],
            [('√ ', A['g']), ('금테 프레임 9-slice 장착', None), (' · 모서리 보석 4개', dim)],
            [('√ ', A['g']), ('Galmuri 픽셀 폰트 장착', None), (' · 11 / 9 / Mono11', dim)],
            [('! ', A['y']), ('횃불이 흔들립니다', None), (' —배경과 분리됨', A['b'])],
            [('× ', A['r']), ('함정 발견', None), (' (재시도 1/3)', A['m'])], '',
            [('ANSI 16색', dim)],
            [('   ', None, A['K'])] + [x for i in range(1, 8) for x in ((' ', None), ('   ', None, hx(THEME[i])))],
            [('   ', None, hx(THEME[8]))] + [x for i in range(9, 16) for x in ((' ', None), ('   ', None, hx(THEME[i])))],
            [('    ', None)] + [(f'가A1 ', hx(THEME[i])) for i in range(1, 8)],
            [(f'가A1 ', hx(THEME[i])) for i in range(8, 16)], '',
            [('PS D:\\workspace\\herdr-pixel-quest> ', None), (' ', None, cur)]]


def talk(fg, cur, dim):
    A = {k: hx(v) for k, v in ansi(THEME).items()}
    g, r, y, b, m, c = A['g'], A['r'], A['y'], A['B'], A['m'], A['c']
    L = [
        [('> ', dim), ('로그인 폼 검증에 빈 값 테스트를 추가하고, 실패하는 게 있으면 고쳐줘', None)], '',
        [('● ', b), ('검증 코드를 먼저 읽어 보겠습니다.', None)], '',
        [('● ', g), ('Read', None), ('(src/auth/validate.ts)', dim)],
        [('  └  ', dim), ('42줄 읽음', dim)], '',
        [('● ', b), ('검증 함수는 세 개입니다. 이메일 형식, 비밀번호 길이, 빈 값 처리입니다. 빈 값 처리에만 테스트가 없고, 빈 문자열을 넣으면 통과로', None)],
        [('  나옵니다. 테스트를 먼저 추가한 뒤 함수를 고치겠습니다.', None)], '',
        [('● ', g), ('Update', None), ('(tests/validate.test.ts)', dim)],
        [('  └  ', dim), ('12줄 추가, 2줄 삭제', dim)],
        [('     18    it(\'빈 이메일은 거부한다\', () => {', dim)],
        [('     19 -    expect(validate(\'\')).toBe(true)', r)],
        [('     19 +    expect(validate(\'\')).toBe(false)', g)],
        [('     20 +    expect(errors()).toContain(\'이메일을 입력하세요\')', g)],
        [('     21    })', dim)], '',
        [('● ', g), ('Bash', None), ('(npm test -- validate)', dim)],
        [('  └  ', dim), ('FAIL', r), (' tests/validate.test.ts', None)],
        [('       √ ', g), ('올바른 이메일은 통과한다 (3 ms)', dim)],
        [('       × ', r), ('빈 이메일은 거부한다 (2 ms)', None)],
        [('       √ ', g), ('8자 미만 비밀번호는 거부한다 (1 ms)', dim)],
        [('     Tests: ', None), ('1 failed', r), (', ', None), ('2 passed', g), (', 3 total', None)], '',
        [('● ', b), ('예상대로 빈 값에서 실패합니다. ', None), ('validate()', c), ('가 길이를 보기 전에 정규식만 검사해서 생긴 문제입니다.', None)], '',
        [('● ', g), ('Update', None), ('(src/auth/validate.ts)', dim)],
        [('  └  ', dim), ('3줄 추가', dim)],
        [('     11 +  if (value.trim() === \'\') return fail(\'이메일을 입력하세요\')', g)], '',
        [('● ', g), ('Bash', None), ('(npm test -- validate)', dim)],
        [('  └  ', dim), ('PASS', g), (' tests/validate.test.ts  ', None), ('Tests: 3 passed, 3 total', g), ('   Time: 0.84 s   Ran all test suites matching /validate/i.   Coverage 96.4 %', dim)],
        [('● ', b), ('세 테스트 모두 통과했습니다. 빈 값 검사를 정규식 앞에 넣었고, 다른 호출부(가입 폼, 비밀번호 재설정)는 같은 함수를 쓰므로 함께 고쳐졌습니다.', None)],
        [('> ', dim), (' ', None, cur)],
    ]
    return L


def render(a, lines_fn, z):
    img = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    if lines_fn:
        text(img, lines_fn(z['fg'], z['cursor'], z['dim']), z['fg'])
    return img


def rl(c):
    v = [(x / 255 / 12.92) if x / 255 <= 0.03928 else ((x / 255 + 0.055) / 1.055) ** 2.4 for x in c]
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]


def contrast(c1, c2):
    a, b = sorted([rl(c1), rl(c2)], reverse=True)
    return (a + 0.05) / (b + 0.05)
