"""심연 인벤토리 v3 도트 에셋 (리뷰 반영: 색상이동 램프, 돌출 모서리, 모양으로 구분되는 상태보석, 문장)."""
import math, random, os, sys
from PIL import Image

OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
S = 2
INK = '#05060c'

def hx(c):
    c = c.lstrip('#'); return tuple(int(c[i:i+2], 16) for i in (0, 2, 4)) + (255,)

def save(img, name, scale=S):
    img.resize((img.width * scale, img.height * scale), Image.NEAREST).save(os.path.join(OUT, name))

def sprite(rows, pal, name, scale=S):
    w = max(len(r) for r in rows); h = len(rows)
    for r in rows:
        assert len(r) == w, (name, r, len(r), w)
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch != '.':
                im.putpixel((x, y), hx(pal[ch]))
    save(im, name, scale)
    return im

BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]
STONE = ['#06070f', '#0b0e1c', '#121731', '#1a2142', '#252e55', '#363a60', '#54485e', '#7a5e52']

GOLD = {'k': '#5a2e1e', 'd': '#9a5a26', 'M': '#d49a3a', 'H': '#f6d870', 'W': '#fff4c8'}
BRONZE = {'k': '#2e1a1e', 'd': '#5a3418', 'M': '#8a5a2a', 'H': '#b8864a', 'W': '#e0c08a'}
RED = {'k': '#4a0e10', 'd': '#8a1a1a', 'M': '#c0392b', 'H': '#e0564f', 'W': '#ffb0a0'}
RUBY = {'r': '#d0302a', 'R': '#ff9a8a', 'x': '#6a0f14'}
SAPH = {'r': '#3f74e0', 'R': '#a8c8ff', 'x': '#1a3a8a'}
TOPAZ = {'r': '#d49a3a', 'R': '#fff4c8', 'x': '#5a2e1e'}
FILL = '#121731'

# ---------- 벽 (저대비, 횃불 없음) ----------
def wall(W, H, seed, name):
    rnd = random.Random(seed)
    lv = [[0] * W for _ in range(H)]
    moss = set()
    for by in range(0, H, 8):
        off = (by // 8 % 2) * 8
        for bx in range(-off, W, 16):
            base = rnd.choice([1, 2, 2, 2, 2, 3])
            crack = rnd.random() < 0.08
            mossy = rnd.random() < 0.04
            c0 = rnd.randint(3, 11)
            for y in range(by, min(by + 8, H)):
                for x in range(max(bx, 0), min(bx + 16, W)):
                    ly, lx = y - by, x - bx
                    if ly == 7 or lx == 15:
                        l = 0
                    else:
                        l = base + (1 if ly == 0 else 0) - (1 if ly == 6 or lx == 14 else 0)
                        if rnd.random() < 0.05: l -= 1
                        if crack and lx - c0 == ly - 1 and 0 <= ly - 1 < 4: l = 0
                        if mossy and ly == 6 and rnd.random() < 0.6: moss.add((x, y))
                    lv[y][x] = max(0, l)
    img = Image.new('RGBA', (W, H))
    cx, cy = W / 2, H / 2
    for y in range(H):
        for x in range(W):
            t = (BAYER[y % 4][x % 4] + 0.5) / 16
            dark = max(0.0, math.hypot((x - cx) / cx, (y - cy) / cy) - 0.6)
            l = max(0, min(7, lv[y][x] - int(dark * 2.5 + t)))
            c = '#14261c' if (x, y) in moss and l >= 2 else STONE[l]
            img.putpixel((x, y), hx(c))
    save(img, name)

wall(640, 400, 11, 'bg-work.png')
wall(640, 520, 5, 'bg-kit.png')

# ---------- 횃불 + 디더 불빛 ----------
sprite(['....4....', '...434...', '...343...', '..23432..', '..23332..', '.1233321.', '.1223221.', '.1122211.',
        '..11111..', '...111...', 'ooooooooo', 'oSSSSSSSo', 'oSsssssSo', '.oSSSSSo.', '..oSSSo..', '...oSo...',
        '...oSo...', '...oSo...', '...ooo...'],
       {'1': '#7a2e0e', '2': '#d0561a', '3': '#ff9a2a', '4': '#ffd36b', 'o': INK, 'S': '#5a5f78', 's': '#2e3248'},
       'torch.png')
GW, GH = 48, 30
glow = Image.new('RGBA', (GW, GH), (0, 0, 0, 0))
for y in range(GH):
    for x in range(GW):
        d = math.hypot((x - GW / 2 + 0.5) / (GW / 2), (y - GH / 2 + 0.5) / (GH / 2))
        dens = max(0.0, 1 - d) ** 1.1
        t = (BAYER[y % 4][x % 4] + 0.5) / 16
        if dens * 1.6 > t + 0.55: glow.putpixel((x, y), hx('#7a5e52'))
        elif dens * 1.6 > t: glow.putpixel((x, y), hx('#54485e'))
save(glow, 'torch-glow.png')

# ---------- 9-slice 큰 프레임: 20x20 art, slice 8 (16px), 모서리 2 art 돌출 ----------
KNOB = ['..oooo..', '.oWHHHo.', 'oHHMMMdo', 'oHMRrMdo', 'oHMrxMdo', 'oHMMMddo', '.oddddo.', '..oooo..']
def frame(name, ramp, gem):
    N = 20
    im = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    for y in range(N):
        for x in range(N):
            d = min(x, y, N - 1 - x, N - 1 - y)
            tl = (x < y and x < N - 1 - y) or (y <= x and y < N - 1 - x)
            tl = (min(x, y) == d) if d < 6 else tl
            c = None
            if d == 2 or d == 5: c = INK
            elif d == 3: c = ramp['H'] if tl else ramp['d']
            elif d == 4: c = ramp['M']
            elif d >= 6: c = FILL
            if c: im.putpixel((x, y), hx(c))
    pal = dict(ramp); pal.update(gem); pal['o'] = INK
    for ox, oy, fx, fy in ((0, 0, False, False), (N - 8, 0, True, False), (0, N - 8, False, True), (N - 8, N - 8, True, True)):
        for y in range(8):
            for x in range(8):
                ch = KNOB[y][x]
                if ch == '.': continue
                X = ox + (7 - x if fx else x); Y = oy + (7 - y if fy else y)
                # 반전된 모서리에서는 빛 방향 유지: 하이라이트/그림자 재지정
                if fx or fy:
                    if ch in 'WH' and ((fx and x >= 4) or (fy and y >= 4)): ch = 'd'
                im.putpixel((X, Y), hx(pal[ch]))
    save(im, name)

frame('frame-gold.png', GOLD, RUBY)
frame('frame-bronze.png', BRONZE, SAPH)
frame('frame-red.png', RED, TOPAZ)

# ---------- 얇은 프레임: 10x10 art, slice 4 (8px) ----------
def thin(name, ramp, gem):
    N = 10
    im = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    for y in range(N):
        for x in range(N):
            d = min(x, y, N - 1 - x, N - 1 - y)
            tl = min(x, y) == d
            c = INK if d in (0, 2) else (ramp['H'] if tl else ramp['d']) if d == 1 else FILL
            im.putpixel((x, y), hx(c))
    for ox, oy in ((0, 0), (N - 3, 0), (0, N - 3), (N - 3, N - 3)):
        for y in range(3):
            for x in range(3):
                im.putpixel((ox + x, oy + y), hx(INK if (x != 1 or y != 1) else gem['R']))
    save(im, name)

thin('thin-gold.png', GOLD, RUBY)
thin('thin-bronze.png', BRONZE, SAPH)
thin('thin-red.png', {**RED, 'H': '#c0392b'}, TOPAZ)

# ---------- 워드마크 (새 금 램프) ----------
L = {
 'H': ['XX..XX', 'XX..XX', 'XX..XX', 'XXXXXX', 'XXXXXX', 'XX..XX', 'XX..XX', 'XX..XX'],
 'E': ['XXXXXX', 'XXXXXX', 'XX....', 'XXXXX.', 'XXXXX.', 'XX....', 'XXXXXX', 'XXXXXX'],
 'R': ['XXXXX.', 'XXXXXX', 'XX..XX', 'XXXXXX', 'XXXXX.', 'XX.XX.', 'XX..XX', 'XX..XX'],
 'D': ['XXXXX.', 'XXXXXX', 'XX..XX', 'XX..XX', 'XX..XX', 'XX..XX', 'XXXXXX', 'XXXXX.'],
}
word = 'HERDR'; W = len(word) * 7 + 3; H = 11
wm = Image.new('RGBA', (W, H), (0, 0, 0, 0))
GR = ['#fff4c8', '#f6d870', '#f6d870', '#d49a3a', '#d49a3a', '#d49a3a', '#9a5a26', '#9a5a26']
mask = {(1 + i * 7 + x, 1 + y) for i, ch in enumerate(word) for y, row in enumerate(L[ch]) for x, c in enumerate(row) if c == 'X'}
for (x, y) in mask:
    for dx in (-1, 0, 1, 2):
        for dy in (-1, 0, 1, 2):
            p = (x + dx, y + dy)
            if p not in mask and 0 <= p[0] < W and 0 <= p[1] < H: wm.putpixel(p, hx(INK))
for (x, y) in mask: wm.putpixel((x, y), hx(GR[y - 1]))
save(wm, 'wordmark.png')

# ---------- 상태 보석 9x9 (모양으로도 구분) ----------
GEMS = {
 'working': (['.........', '....o....', '...oHo...', '..oHLbo..', '.oHLbbdo.', '..obbdo..', '...odo...', '....o....', '.........'],
             {'H': '#e8f0ff', 'L': '#8fb6ff', 'b': '#3f74e0', 'd': '#1a3a8a'}),
 'blocked': (['....o....', '...oWo...', '..obWbo..', '.obbWbdo.', 'obbbbbddo', '.obbWbdo.', '..obddo..', '...odo...', '....o....'],
             {'W': '#ffffff', 'b': '#e0302a', 'd': '#7a0f14'}),
 'done':    (['......oSo', '.......o.', '...o.....', '..oHo....', '.oHLbo...', 'oHLbbdo..', '.obbdo...', '..odo....', '...o.....'],
             {'S': '#fff4c8', 'H': '#e0ffd0', 'L': '#9de48a', 'b': '#3f9a4a', 'd': '#1a4a24'}),
 'idle':    (['.........', '....o....', '...oIo...', '..oI.io..', '.oI...io.', '..oi.io..', '...oio...', '....o....', '.........'],
             {'I': '#a8a4c0', 'i': '#6a6488'}),
}
for nm, (rows, pal) in GEMS.items():
    pal = dict(pal); pal['o'] = INK
    sprite(rows, pal, f'gem-{nm}.png')
# 작업중 반짝임 2프레임째 (Herdr에서 opacity 교차용)
sprite(['....W....', '....o....', '...oHo...', '..oHLbo..', 'WoHLbbdoW', '..obbdo..', '...odo...', '....o....', '....W....'],
       {'o': INK, 'W': '#ffffff', 'H': '#e8f0ff', 'L': '#8fb6ff', 'b': '#3f74e0', 'd': '#1a3a8a'}, 'gem-working-b.png')

# ---------- 아이템 아이콘 8x8 ----------
WD = {'o': INK, 'W': '#b8864a', 'w': '#8a5a2a', 'd': '#5a3418', 'g': '#d49a3a', 'G': '#f6d870', 'k': '#fff4c8', 'y': '#ffd36b', 'Y': '#fff4c8', 'D': '#1a0f08'}
sprite(['.oooooo.', 'oWWWWWWo', 'owwwwwwo', 'oggGgggo', 'owwkkwwo', 'owwggwwo', 'oddddddo', '.oooooo.'], WD, 'ico-chest.png')
sprite(['oooooooo', 'oWWWWWWo', 'oooooooo', '.oyYyyo.', 'oggGgggo', 'owwkkwwo', 'oddddddo', '.oooooo.'], WD, 'ico-chest-open.png')
sprite(['oooooooo', 'oPPPPPPo', '.opsspo.', '.oppppo.', '.opsspo.', '.oppppo.', 'oPPPPPPo', 'oooooooo'],
       {'o': INK, 'P': '#c8a868', 'p': '#f2e2b8', 's': '#8a6a3a'}, 'ico-scroll.png')
sprite(['...oo...', '..oCco..', '.oCccdo.', '.occcdo.', '.occddo.', '.ocdddo.', '..oddo..', '...oo...'],
       {'o': INK, 'C': '#e0ffff', 'c': '#7fe3e3', 'd': '#1f8a8a'}, 'ico-crystal.png')
sprite(['...kk...', '..oooo..', '...oo...', '..oGGo..', '.olLllo.', 'olLllllo', 'ollllldo', '.oooooo.'],
       {'o': INK, 'k': '#a8662e', 'G': '#cfd8ff', 'l': '#b57be0', 'L': '#f0d8ff', 'd': '#6a3a90'}, 'ico-potion.png')
sprite(['.ooo....', 'oGWGo...', 'oGoGo...', 'oGGgo...', '.oGgoooo', '..oggggo', '...ogogo', '....o.o.'],
       {'o': INK, 'g': '#d49a3a', 'G': '#f6d870', 'W': '#fff4c8'}, 'ico-key.png')
sprite(['..o.....', '.oGo....', '.oGGo...', '.oGgGo..', '.oGggo..', '.oGgo...', '.oGo....', '..o.....'],
       {'o': INK, 'G': '#f6d870', 'g': '#d49a3a'}, 'cursor.png')

# ---------- 문장(스페이스용) 8x8 ----------
SHIELD = ['oooooooo', 'oAAAAAAo', 'oAAAAAAo', 'oAAAAAAo', 'oAAAAAAo', '.oAAAAo.', '..oAAo..', '...oo...']
CHARGES = {
 'cross':   [(3, 1), (4, 1), (3, 2), (4, 2), (1, 3), (2, 3), (3, 3), (4, 3), (5, 3), (6, 3), (3, 4), (4, 4), (3, 5), (4, 5)],
 'chevron': [(1, 4), (2, 3), (3, 2), (4, 2), (5, 3), (6, 4), (2, 4), (5, 4)],
 'pale':    [(3, 1), (4, 1), (3, 2), (4, 2), (3, 3), (4, 3), (3, 4), (4, 4), (3, 5), (4, 5), (3, 6), (4, 6)],
 'bend':    [(1, 1), (2, 1), (2, 2), (3, 2), (3, 3), (4, 3), (4, 4), (5, 4), (5, 5)],
 'star':    [(3, 2), (4, 2), (2, 3), (3, 3), (4, 3), (5, 3), (3, 4), (4, 4), (2, 5), (5, 5)],
}
CRESTS = [('teal', '#1f6a62', '#7fe3d0', 'cross'), ('olive', '#5a6a1a', '#d0e070', 'chevron'),
          ('rose', '#8a2a50', '#ff9ac0', 'pale'), ('umber', '#6a3a1a', '#e8b878', 'bend'), ('slate', '#3a4a7a', '#b8c8f0', 'star')]
for nm, field, charge, kind in CRESTS:
    im = sprite(SHIELD, {'o': INK, 'A': field}, f'crest-{nm}.png', scale=1)
    for (x, y) in CHARGES[kind]:
        im.putpixel((x, y), hx(charge))
    im.putpixel((1, 1), hx(charge)) if kind != 'bend' else None
    save(im, f'crest-{nm}.png')

# ---------- 초상 12x12 (4톤, 실루엣 개선) ----------
HELM = ['....oooo....', '..ooHHSSoo..', '.oHHSSSSSdo.', '.oHSSSSSSdo.', 'oHSSSSSSSSdo', 'oHSooooooSdo',
        'oHSSSSooSSdo', 'oHSSSSooSSdo', '.oSSSSSSSdo.', 'odoSSSSSSodo', '.oddddddddo.', '..oooooooo..']
HOOD = ['..oo........', '.oHHo.......', '.oHhHoo.....', '..ohHHHoo...', '..oHhhhhHo..', '.oHhoooohho.',
        '.oHofeefoho.', '.oHoffffoho.', 'oHhhoooohhdo', 'oHhhhhhhhddo', 'ohhhhhhhhddo', 'oooooooooooo']
for nm, rows, pal in [
    ('helm-steel', HELM, {'H': '#e8eef8', 'S': '#a8b4cc', 'd': '#4a4a78'}),
    ('helm-gold', HELM, {'H': '#fff4c8', 'S': '#d49a3a', 'd': '#7a3a1e'}),
    ('hood-amber', HOOD, {'H': '#ffd08a', 'h': '#e0782e', 'd': '#7a2e2a', 'f': '#1a1028', 'e': '#ffe08a'}),
    ('hood-violet', HOOD, {'H': '#e0c0ff', 'h': '#8a4ac0', 'd': '#3a1e5a', 'f': '#1a1028', 'e': '#7fe3e3'}),
]:
    pal = dict(pal); pal['o'] = INK
    sprite(rows, pal, f'face-{nm}.png')

# ---------- 제목 장식 16x8 (덩굴+보석) ----------
# (v3.1: 열쇠처럼 읽히던 고리를 없애고 보석 + 가늘어지는 금 대로 다시 그림)
orn = ['................', '.o..............', 'oRo.............', 'oRroooooooooo...',
       'oxroGGGGGGgggoo.', '.oo.ooooooooo...', '................', '................']
op = {'o': INK, 'G': '#f6d870', 'g': '#d49a3a', 'R': '#ff9a8a', 'r': '#d0302a', 'x': '#6a0f14'}
sprite(orn, op, 'orn-r.png')
sprite([r[::-1] for r in orn], op, 'orn-l.png')
# 모서리 리벳(헤더 mod용) 8x8 = KNOB
sprite(KNOB, {**GOLD, **RUBY, 'o': INK}, 'knob-gold.png')
# 방패 엠블럼 (새 램프)
sprite(['oooooooooooo', 'oHHHHHHHHHMo', 'oHbbbbbbbbdo', 'oHbBBbbbbbdo', 'oHbBbbrrbbdo', 'oHbbbrRrbbdo',
        'oHbbbrrrbbdo', 'oHbbbbrbbbdo', '.oHbbbbbbdo.', '.oHbbbbbbdo.', '..oHbbbbdo..', '...oHMdo....',
        '....oMdo....', '.....oo.....'],
       {'o': INK, 'H': '#f6d870', 'M': '#d49a3a', 'd': '#9a5a26', 'b': '#1a2a6a', 'B': '#3a5ab8', 'r': '#d0302a', 'R': '#ffb0a0'},
       'emblem.png')
print('ok', len(os.listdir(OUT)))
