"""심연 인벤토리 v2 도트 에셋 생성기 (오리지널 도트, 2x nearest 업스케일)."""
import math, random, os, sys
from PIL import Image

OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
S = 2  # art pixel -> screen px

def hx(c):
    c = c.lstrip('#'); return tuple(int(c[i:i+2], 16) for i in (0, 2, 4)) + (255,)

def save(img, name, scale=S):
    img.resize((img.width * scale, img.height * scale), Image.NEAREST).save(os.path.join(OUT, name))

def sprite(rows, pal, name, scale=S):
    w = max(len(r) for r in rows); h = len(rows)
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    for y, r in enumerate(rows):
        for x, ch in enumerate(r.ljust(w, '.')):
            if ch != '.':
                im.putpixel((x, y), hx(pal[ch]))
    save(im, name, scale)
    return im

BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]
INK = '#05060c'
STONE = ['#06070f', '#0b0e1c', '#121731', '#1a2142', '#252e55', '#363a60', '#54485e', '#7a5e52']
FLAME = ['#7a2e0e', '#d0561a', '#ff9a2a', '#ffd36b', '#fff3c0']

# ---------- 던전 벽 ----------
def wall(W, H, torches, pillars=(), seed=7, name='bg.png'):
    rnd = random.Random(seed)
    lv = [[0] * W for _ in range(H)]
    moss = set()
    BH, BW = 8, 16
    for by in range(0, H, BH):
        off = (by // BH % 2) * 8
        for bx in range(-off, W, BW):
            base = rnd.choice([1, 2, 2, 2, 2, 3, 3])
            crack = rnd.random() < 0.10
            mossy = rnd.random() < 0.07
            cx0, cy0 = rnd.randint(3, 11), rnd.randint(1, 3)
            for y in range(by, min(by + BH, H)):
                for x in range(max(bx, 0), min(bx + BW, W)):
                    ly, lx = y - by, x - bx
                    if ly == BH - 1 or lx == BW - 1:
                        l = 0
                    else:
                        l = base
                        if ly == 0 or lx == 0: l += 1
                        if ly == BH - 2 or lx == BW - 2: l -= 1
                        if rnd.random() < 0.07: l += rnd.choice([-1, 1])
                        if crack and (lx - cx0) == (ly - cy0) and 0 <= ly - cy0 < 4: l = 1
                        if mossy and ly == BH - 2 and rnd.random() < 0.7: moss.add((x, y))
                        if mossy and ly == BH - 3 and rnd.random() < 0.3: moss.add((x, y))
                    lv[y][x] = l
    # 기둥: 큰 블록
    for px0, pw in pillars:
        for y in range(H):
            for x in range(px0, min(px0 + pw, W)):
                lx, ly = x - px0, y % 24
                if lx in (0, pw - 1) or ly == 23:
                    l = 0
                else:
                    l = 3
                    if lx == 1 or ly == 0: l = 4
                    if lx == pw - 2 or ly == 22: l = 2
                    if lx == 2 and ly % 6 == 3: l = 5
                lv[y][x] = l
                moss.discard((x, y))
    img = Image.new('RGBA', (W, H))
    cx, cy = W / 2, H / 2
    for y in range(H):
        for x in range(W):
            t = (BAYER[y % 4][x % 4] + 0.5) / 16
            light = 0.0
            for tx, ty, r in torches:
                d = math.hypot((x - tx) * 0.9, (y - ty) * 1.1)
                light += max(0.0, 1 - d / r) ** 1.6
            dark = max(0.0, math.hypot((x - cx) / cx, (y - cy) / cy) - 0.55)
            l = lv[y][x] + int(light * 5.0 + t) - int(dark * 3.0 + t)
            l = max(0, min(7, l))
            if (x, y) in moss and l >= 2:
                c = hx(['#14261c', '#1f3a2a', '#2f5a3a', '#3f7a44'][min(3, l - 2)])
            else:
                c = hx(STONE[l])
            img.putpixel((x, y), c)
    # 횃불
    for tx, ty, r in torches:
        sconce = ['.ooooooo.', 'oSSSSSSSo', 'oSsssssSo', '.oSSSSSo.', '..oSSSo..', '...oSo...', '...oSo...', '...oSo...', '...ooo...']
        flame = ['....4....', '...434...', '...343...', '..23432..', '..23332..', '.1233321.', '.1223221.', '.1122211.', '..11111..', '...111...']
        fx, fy = int(tx) - 4, int(ty) - 10
        for yy, row in enumerate(flame):
            for xx, ch in enumerate(row):
                if ch != '.': img.putpixel((fx + xx, fy + yy), hx(FLAME[int(ch)]))
        sx, sy = int(tx) - 4, int(ty)
        for yy, row in enumerate(sconce):
            for xx, ch in enumerate(row):
                if ch == 'o': img.putpixel((sx + xx, sy + yy), hx(INK))
                elif ch == 'S': img.putpixel((sx + xx, sy + yy), hx('#5a5f78'))
                elif ch == 's': img.putpixel((sx + xx, sy + yy), hx('#2e3248'))
    save(img, name)

# 작업 화면 배경 640x400 (=1280x800). 횃불은 상단 바 영역(y<24 art)에 보이게.
wall(640, 400, torches=[(362, 11, 110), (482, 11, 100)], seed=11, name='bg-work.png')
# 부품 시트 배경 640x520, 기둥 포함
wall(640, 520, torches=[(160, 24, 130), (480, 24, 130), (320, 270, 120), (60, 470, 90), (580, 470, 90)],
     pillars=[(0, 10), (630, 10)], seed=5, name='bg-kit.png')

# ---------- 9-slice 프레임 (16x16 art, slice 6 art = 12px) ----------
def frame(name, ramp, gem, fill):
    # ramp: [dark, mid-dark, mid, light]
    N = 16
    im = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    def put(x, y, c): im.putpixel((x, y), hx(c))
    for y in range(N):
        for x in range(N):
            d = min(x, y, N - 1 - x, N - 1 - y)
            tl = (x <= y and x < N - 1 - y) or (y < x and y < N - 1 - x)  # 위·왼쪽 면
            if d == 0: c = INK
            elif d == 1: c = ramp[3] if tl else ramp[1]
            elif d == 2: c = ramp[2]
            elif d == 3: c = ramp[1] if tl else ramp[0]
            elif d == 4: c = INK
            else: c = fill
            put(x, y, c)
    # 모서리 장식(리벳+보석)
    for ox, oy in ((0, 0), (N - 6, 0), (0, N - 6), (N - 6, N - 6)):
        for y in range(6):
            for x in range(6):
                X, Y = ox + x, oy + y
                if x in (0, 5) or y in (0, 5): put(X, Y, INK)
                elif x == 1 or y == 1: put(X, Y, ramp[3])
                elif x == 4 or y == 4: put(X, Y, ramp[0])
                else: put(X, Y, ramp[2])
        put(ox + 2, oy + 2, gem[1]); put(ox + 3, oy + 2, gem[0])
        put(ox + 2, oy + 3, gem[0]); put(ox + 3, oy + 3, gem[2])
    save(im, name)

FILL = '#141830'
frame('frame-gold.png', ['#6b4e22', '#a87c2e', '#c9a24a', '#f2d68a'], ['#d0302a', '#ff9a8a', '#6a0f14'], FILL)
frame('frame-bronze.png', ['#3a2410', '#5a3a18', '#7a5426', '#a8763a'], ['#3a6ad0', '#a8c8ff', '#14285a'], FILL)
frame('frame-red.png', ['#4a0e10', '#8a1a1a', '#c0392b', '#ff7a6e'], ['#e8b84a', '#fff1c4', '#6b4e22'], '#22101a')

# ---------- 워드마크 HERDR ----------
L = {
 'H': ['XX..XX', 'XX..XX', 'XX..XX', 'XXXXXX', 'XXXXXX', 'XX..XX', 'XX..XX', 'XX..XX'],
 'E': ['XXXXXX', 'XXXXXX', 'XX....', 'XXXXX.', 'XXXXX.', 'XX....', 'XXXXXX', 'XXXXXX'],
 'R': ['XXXXX.', 'XXXXXX', 'XX..XX', 'XXXXXX', 'XXXXX.', 'XX.XX.', 'XX..XX', 'XX..XX'],
 'D': ['XXXXX.', 'XXXXXX', 'XX..XX', 'XX..XX', 'XX..XX', 'XX..XX', 'XXXXXX', 'XXXXX.'],
}
word = 'HERDR'
W = len(word) * 7 + 3; H = 8 + 3
wm = Image.new('RGBA', (W, H), (0, 0, 0, 0))
GR = ['#fff4c8', '#fff4c8', '#f2d68a', '#f2d68a', '#c9a24a', '#c9a24a', '#a87c2e', '#a87c2e']
mask = set()
for i, ch in enumerate(word):
    for y, row in enumerate(L[ch]):
        for x, c in enumerate(row):
            if c == 'X': mask.add((1 + i * 7 + x, 1 + y))
for (x, y) in mask:  # 그림자 + 외곽선
    for dx, dy in ((1, 1), (2, 2), (1, 2), (2, 1)):
        if (x + dx, y + dy) not in mask: wm.putpixel((x + dx, y + dy), hx(INK))
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            p = (x + dx, y + dy)
            if p not in mask and 0 <= p[0] < W and 0 <= p[1] < H: wm.putpixel(p, hx(INK))
for (x, y) in mask: wm.putpixel((x, y), hx(GR[y - 1]))
save(wm, 'wordmark.png')

# ---------- 스프라이트 ----------
GEM = ['...o...', '..oho..', '.ohlbo.', 'ohlbbdo', '.obbdo.', '..odo..', '...o...']
for nm, (h, l, b, d) in {
    'working': ('#e8f0ff', '#8fb6ff', '#3f74e0', '#1a3a8a'),
    'blocked': ('#ffe0dc', '#ff8a7a', '#e0302a', '#7a0f14'),
    'done':    ('#fff6d0', '#ffe08a', '#e8a82a', '#7a5212'),
    'idle':    ('#e6e6ee', '#a8a8b8', '#6e6e80', '#3a3a48'),
}.items():
    sprite(GEM, {'o': INK, 'h': h, 'l': l, 'b': b, 'd': d}, f'gem-{nm}.png')

W_ = {'o': INK, 'W': '#b8763a', 'w': '#8a5426', 'd': '#4a2a12', 'g': '#e8b84a', 'k': '#fff4c8', 'y': '#ffd36b', 'D': '#1a0f08'}
sprite(['.oooooo.', 'oWWWWWWo', 'owwwwwwo', 'oggggggo', 'owwkkwwo', 'owwggwwo', 'oddddddo', '.oooooo.'], W_, 'ico-chest.png')
sprite(['.oooooo.', 'oDyDyyDo', 'oDDDDDDo', 'oggggggo', 'owwkkwwo', 'owwggwwo', 'oddddddo', '.oooooo.'], W_, 'ico-chest-open.png')
sprite(['oooooooo', 'oPPPPPPo', '.opsspo.', '.oppppo.', '.opsspo.', '.oppppo.', 'oPPPPPPo', 'oooooooo'],
       {'o': INK, 'P': '#c8a868', 'p': '#f2e2b8', 's': '#8a6a3a'}, 'ico-scroll.png')
sprite(['...oo...', '..oCco..', '.oCccdo.', '.occcdo.', '.occddo.', '.ocdddo.', '..oddo..', '...oo...'],
       {'o': INK, 'C': '#e0ffff', 'c': '#7fe3e3', 'd': '#1f8a8a'}, 'ico-crystal.png')
sprite(['...kk...', '..oooo..', '...oo...', '..oGGo..', '.olLllo.', 'olLllllo', 'ollllldo', '.oooooo.'],
       {'o': INK, 'k': '#a8662e', 'G': '#cfd8ff', 'l': '#b57be0', 'L': '#f0d8ff', 'd': '#6a3a90'}, 'ico-potion.png')
sprite(['.ooo....', 'oghgo...', 'ogogo...', 'oghgo...', '.oggoooo', '..oggggo', '...ogogo', '....o.o.'],
       {'o': INK, 'g': '#e8b84a', 'h': '#fff4c8'}, 'ico-key.png')
# 방패 엠블럼 12x14
sprite(['oooooooooooo', 'oGGGGGGGGGGo', 'oGbbbbbbbbgo', 'oGbBBbbbbbgo', 'oGbBbbrrbbgo', 'oGbbbrRrbbgo',
        'oGbbbrrrbbgo', 'oGbbbbrbbbgo', '.oGbbbbbbgo.', '.oGbbbbbbgo.', '..oGbbbbgo..', '...oGggoo...',
        '....oggo....', '.....oo.....'],
       {'o': INK, 'G': '#f2d68a', 'g': '#a87c2e', 'b': '#1a2a6a', 'B': '#3a5ab8', 'r': '#d0302a', 'R': '#ffb0a0'},
       'emblem.png')
# 초상: 후드(마법사)·투구(기사) 12x12
HOOD = ['.....oo.....', '....oHHo....', '...oHhhho...', '..oHhhhhho..', '..oHhoooho..', '.oHhoffffoo.',
        '.oHhofeefoo.', '.oHhoffffoo.', '.oHhhooooho.', 'oHhhhhhhhhho', 'ohhhhhhhhhho', 'oooooooooooo']
HELM = ['.....pp.....', '....pppp....', '....oooo....', '..ooSSssoo..', '.oSSsssssdo.', '.oSsssssssdo',
        '.osvvvvvvvdo', '.ossssssssdo', '.osvsvsvsvdo', '.ossssssssdo', '..oddddddoo.', '...oooooo...']
for nm, rows, pal in [
    ('hood-amber', HOOD, {'o': INK, 'H': '#ffb86a', 'h': '#c0662a', 'f': '#1a1028', 'e': '#ffe08a'}),
    ('hood-violet', HOOD, {'o': INK, 'H': '#c99bff', 'h': '#6a3a90', 'f': '#1a1028', 'e': '#7fe3e3'}),
    ('helm-steel', HELM, {'o': INK, 'p': '#e0302a', 'S': '#ffffff', 's': '#b8c2d8', 'd': '#5a6480', 'v': INK}),
    ('helm-gold', HELM, {'o': INK, 'p': '#3f74e0', 'S': '#fff4c8', 's': '#e8b84a', 'd': '#8a5a1a', 'v': INK}),
]:
    sprite(rows, pal, f'face-{nm}.png')
# 제목 장식(왼쪽) 12x7 → 오른쪽은 좌우반전
orn = ['oo..........', 'ogo..oo.....', 'oGgoogGo....', '.oGGGGGGoo..', 'oGgoogGo....', 'ogo..oo.....', 'oo..........']
pal = {'o': INK, 'g': '#a87c2e', 'G': '#f2d68a'}
sprite(orn, pal, 'orn-l.png')
sprite([r[::-1] for r in orn], pal, 'orn-r.png')
print('ok', sorted(os.listdir(OUT)))
