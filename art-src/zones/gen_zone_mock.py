"""Pixel Quest 3단계 시안 5차.

    python3 .claude/plan/next/stage3/gen_zone.py [zone ...]

- 석판(터미널 뒤)은 zones5.py가 실제 석판 그림 파일에서 구역마다 처음부터 그린다. 글자도 직접 얹는다(tab5.py).
- 그 밖(벽·패널·금테)은 chrome4.py(4차 방식: preview.png의 돌 자리를 구역 재질로)에서 가져온다.
- 화면 둘: 빈 화면(demo)과 대화가 꽉 찬 화면(talk). 옛 판: gen_zone_v3.py, gen_zone_v4.py.
"""
import os
import random
import sys

import numpy as np
from PIL import Image

import chrome4 as c4
import floors6
import panels9
import tab5
import zones5

OUT = os.path.join(os.path.dirname(__file__), 'out')
T = tab5.TERM
DRAWER = (1204, 266, 1274, 560)
FRAMES = [(10, 52, 264, 404), (10, 424, 264, 776), (278, 52, 1272, 776)]
SILL = {'ice': (112, 146, 178), 'lava': (78, 62, 58), 'crystal': (92, 74, 140), 'throne': (126, 60, 70), 'moss': (74, 90, 82)}
STATUS = [(282, 796, 516, 818), (726, 796, 1244, 818), (8, 788, 264, 820)]
GEM = {'ice': (150, 226, 246), 'lava': (255, 150, 50), 'crystal': (226, 120, 230), 'throne': None, 'moss': (96, 200, 120)}


def cap(a, y, x0, x1, body, rim, seed, cover):
    """금테 윗변에 얹힌 것(눈·이끼): 2px 도트 둔덕. 금테 바로 위 검은 띠에 그린다."""
    r = random.Random(seed)
    x = x0
    while x < x1:
        w = r.randrange(4, 14) * 2
        if r.random() < cover:
            a[y - 2:y, x:min(x1, x + w)] = body
            if w > 8:
                a[y - 4:y - 2, x + 2:min(x1, x + w - 2)] = rim
        x += w + r.randrange(1, 6) * 2


def screen(key, lines):
    a, m = c4.build(key, chrome_only=True)
    tab, z = zones5.ZONES[key]()
    L0 = c4.lum(c4.BASE)                                        # 패널 바닥: 구역의 판석 무늬를 깐다(큰 명암은 옛 그림에서)
    stone = m['stone'].astype(np.float32)
    shade = c4.box_blur(L0 * stone, 40) / (c4.box_blur(stone, 40) + 1e-4)   # 넓게 흐려 옛 판석 자국이 비치지 않게
    floorm = m['swap'] & c4.rect_mask(c4.PANELS) & ~m['ui']
    sk = np.clip(shade / 0.119, 0.7, 1.45)
    if key in panels9.FLOORS:                                   # 9차: 바닥 재질 + 윗선·아랫선·귀퉁이 사물 (글자·명패는 그 위에 그대로)
        force = c4.rect_mask([(15, 380, 40, 400), (237, 430, 262, 436), (247, 430, 262, 452)])   # 거미줄 자리
        fm = floorm | (force & ~m['ui'])
        panels9.lay(a, key, (14, 56, 262, 400), fm, sk, corner='bl', seed=3)
        panels9.lay(a, key, (14, 430, 262, 774), fm, sk, corner='br', seed=4, off=(150, 40))
    else:
        tex = c4.up(floors6.FLOORS[key]()) * sk[..., None]
        a[floorm] = np.clip(tex, 0, 255)[floorm]
    img = np.array(tab5.render(tab, lines, z)).astype(np.float32)
    x0, y0, x1, y1 = T
    old = c4.BASE[y0:y1, x0:x1]
    keepd = np.zeros(old.shape[:2], bool)                      # 서랍(파티) 자리: 석판이 아닌 픽셀은 그대로
    dy0, dy1, dx0 = DRAWER[1] - y0, DRAWER[3] - y0, DRAWER[0] - x0
    keepd[dy0:dy1, dx0:] = np.abs(old[dy0:dy1, dx0:] - tab5.SRC[dy0:dy1, dx0:] * 0 - tab5_shown()[dy0:dy1, dx0:]).sum(-1) > 30
    new = a[y0:y1, x0:x1]
    new[~keepd] = img[~keepd]
    a[y0:y1, x0:x1] = new
    hh, ss, vv = m['hh'], m['ss'], m['vv']
    sill = (c4.YY >= 783) & (c4.YY < 790) & (vv > 0.25) & (vv < 0.46) & (hh > 225) & (hh < 265) & (ss < 0.42)
    a[sill] = np.clip(np.array(SILL[key], np.float32) * (L0 / 0.25)[..., None], 0, 255)[sill]   # 석판 아래 돌 턱은 턱으로 남긴다
    for sx0, sy0, sx1, sy1 in STATUS:                           # 상태 줄 작은 글자: 바탕과 금색만 바꾸고 글자 픽셀은 그대로
        o = c4.BASE[sy0:sy1, sx0:sx1]
        h_, s_ = hh[sy0:sy1, sx0:sx1], ss[sy0:sy1, sx0:sx1]
        bg = (o.sum(-1) < 40) | ((h_ > 85) & (h_ < 160) & (s_ > 0.25) & (key != 'moss'))
        for c in [(14, 18, 38), (14, 18, 44), (25, 30, 58), (21, 26, 54), (34, 39, 67), (30, 35, 63)]:
            bg |= np.abs(o - c).sum(-1) < 22
        gold = (hh[sy0:sy1, sx0:sx1] > 14) & (hh[sy0:sy1, sx0:sx1] < 74) & (ss[sy0:sy1, sx0:sx1] > 0.5) & (vv[sy0:sy1, sx0:sx1] > 0.45)
        cur = a[sy0:sy1, sx0:sx1]
        cur[~bg] = o[~bg]
    if GEM[key]:                                               # 금테 모서리 보석을 구역의 것으로
        red = ((hh < 14) | (hh > 344)) & (ss > 0.45) & (vv > 0.3)
        box = np.zeros_like(red)
        for fx0, fy0, fx1, fy1 in FRAMES:
            for cx, cy in [(fx0, fy0), (fx1, fy0), (fx0, fy1), (fx1, fy1)]:
                box[max(0, cy - 12):cy + 12, max(0, cx - 12):cx + 12] = True
        g = np.array(GEM[key], np.float32)
        sel = red & box
        a[sel] = np.clip(g * (0.55 + vv[sel, None] * 0.6), 0, 255)
    w = c4.Dots()                                              # 벽·금테 위의 것 (돌 자리에만)
    if key == 'throne':
        for x in (214, 232, 250, 440, 456, 472):                # 윗벽의 붉은 깃발
            w.art('pennant-red', x, 1, 0.9)
        for fx0, fy0, fx1, fy1 in FRAMES:                       # 금테 위 왕관
            w.art('crown-s', (fx0 + fx1) // 4 - 5, fy0 // 2 - 6, 1.0)
    if key == 'crystal':
        v = {'h': (198, 174, 244), 'l': (136, 104, 208), 'm': (92, 64, 154), 'd': (56, 38, 104)}
        k = {'h': (240, 196, 226), 'l': (196, 118, 174), 'm': (132, 70, 118), 'd': (82, 40, 76)}
        for i, (fx0, fy0, fx1, fy1) in enumerate(FRAMES):       # 금테 모서리에 자란 결정
            w.paste(c4.SHARD_S, v, fx0 // 2 + 4, fy0 // 2 - 5)
            w.paste(c4.SHARD_S, k if i else v, fx1 // 2 - 10, fy0 // 2 - 5, flip=True)
    w.onto(a, (m['stone'] & ~m['ui'] & ~c4.rect_mask([(276, 54, 1272, 776)])).astype(np.float32))
    if key == 'ice':
        for i, (fx0, fy0, fx1, fy1) in enumerate(FRAMES):
            cap(a, fy0, fx0 + 10, fx1 - 10, (206, 226, 240), (244, 250, 255), 11 + i, 0.6)
    if key == 'moss':
        for i, (fx0, fy0, fx1, fy1) in enumerate(FRAMES):
            cap(a, fy0, fx0 + 10, fx1 - 10, (44, 92, 52), (84, 140, 72), 21 + i, 0.4)
    return np.clip(a, 0, 255).astype(np.uint8), z


_shown = None


def tab5_shown():
    """원래 화면의 석판(이끼 포함): 서랍 둘레에서 석판 픽셀을 가려내는 데 쓴다."""
    global _shown
    if _shown is None:
        t = Image.open(os.path.join(tab5.ART, 'look/tablet-dark-none.png')).convert('RGBA')
        d = Image.open(os.path.join(tab5.ART, 'look/deco-dark-none-136.png')).convert('RGBA')
        c = Image.new('RGBA', d.size, (18, 23, 49, 255))
        c.alpha_composite(t.resize(d.size))
        c.alpha_composite(d)
        ox, oy = T[0] - 277, T[1] - 47
        _shown = np.array(c.convert('RGB')).astype(np.float32)[oy:oy + tab5.TH, ox:ox + tab5.TW]
    return _shown


CROPS = [('side', (0, 0, 420, 250), 2), ('br', (960, 640, 1280, 820), 3), ('tr', (960, 0, 1280, 170), 3), ('bl', (270, 640, 640, 820), 3), ('panel', (0, 44, 270, 410), 3), ('party', (0, 416, 270, 790), 3)]


def save(a, name, crops=True):
    im = Image.fromarray(a)
    im.save(os.path.join(OUT, f'{name}.png'))
    if crops:
        for tag, box, k in CROPS:
            c = im.crop(box)
            c.resize((c.width * k, c.height * k), Image.NEAREST).save(os.path.join(OUT, f'{name}-{tag}.png'))
        im.resize((320, 205), Image.LANCZOS).save(os.path.join(OUT, f'{name}-thumb.png'))


def legibility(tab, z):
    """대화가 꽉 찬 화면에서 글자 픽셀마다 바로 그 자리 바탕과의 명도 대비를 잰다."""
    blank = Image.new('RGB', (tab5.TW, tab5.TH), (0, 0, 0))
    tab5.text(blank, tab5.talk(z['fg'], z['cursor'], z['dim']), z['fg'])
    t = np.array(blank).astype(np.float32)
    m = t.sum(-1) > 0

    def rl(c):
        c = c / 255
        v = np.where(c <= 0.03928, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
        return 0.2126 * v[..., 0] + 0.7152 * v[..., 1] + 0.0722 * v[..., 2]
    a, b = rl(t[m]), rl(np.clip(tab, 0, 255)[m])
    cr = (np.maximum(a, b) + 0.05) / (np.minimum(a, b) + 0.05)
    return float(np.median(cr)), float((cr < 4.5).mean() * 100), float((cr < 3).mean() * 100), float(cr.min())


def guide(a):
    """글자 칸과 그림 자리를 표시한 안내 그림."""
    g = a.astype(np.float32)
    x0, y0, x1, y1 = T
    ty0, ty1 = y0 + tab5.PAD_Y - 2, y0 + tab5.PAD_Y + tab5.ROWS * tab5.PITCH - 4
    g[ty0:ty1, x0 + 8:x1 - 8] = g[ty0:ty1, x0 + 8:x1 - 8] * 0.72 + np.array((90, 200, 255), np.float32) * 0.28
    for bx0, by0, bx1, by1 in [(x1 - 180, y1 - 76, x1, y1), (x1 - 150, y0, x1, y0 + 96)]:
        for yy in (by0, by1 - 2):
            g[yy:yy + 2, bx0:bx1] = (255, 230, 90)
        for xx in (bx0, bx1 - 2):
            g[by0:by1, xx:xx + 2] = (255, 230, 90)
    return np.clip(g, 0, 255).astype(np.uint8)


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    save(c4.BASE.astype(np.uint8), 'dungeon')
    for k in (sys.argv[1:] or zones5.ZONES):
        a, z = screen(k, tab5.talk)
        save(a, k)
        save(screen(k, tab5.demo)[0], k + '-empty', crops=False)
        tab = zones5.ZONES[k]()[0]
        print(k, '글자:석판 %.1f | 대화 화면 글자 픽셀: 중앙값 %.1f, 4.5 미만 %.2f%%, 3 미만 %.2f%%, 최저 %.1f' % ((tab5.contrast(z['fg'], z['base']),) + legibility(tab, z)))
        ui = floors6.retile(os.path.join(tab5.ROOT, 'docs/screens/banners.png'), k, [(20, 16, 378, 130), (390, 16, 750, 130), (20, 140, 378, 252), (390, 140, 750, 252),
                                                                                         (20, 262, 378, 374), (390, 262, 750, 374), (20, 384, 378, 498)], c4.ZONES[k]['ramp'])
        Image.fromarray(ui).save(os.path.join(OUT, f'{k}-ui.png'))
        if k == 'ice':
            Image.fromarray(guide(a)).save(os.path.join(OUT, 'guide.png'))
    print('dungeon | 대화 화면 글자 픽셀: 중앙값 %.1f, 4.5 미만 %.2f%%, 3 미만 %.2f%%, 최저 %.1f' % legibility(tab5_shown(), dict(fg=(232, 220, 192), cursor=(246, 216, 112), dim=(128, 122, 164))))
