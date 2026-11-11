"""Level rewards: portrait frames (18x18 dots shown at 2x = 36px, the crown one 18x22),
the rune frame's glow layer, the banner crown and pennants.

    python3 art-src/gen_rewards.py mods/pixel-quest/art

Copyright (c) 2026 cubha. MIT License.
"""
import os, sys
from PIL import Image
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
INK = '#05060c'
def hx(c):
    c = c.lstrip('#'); return tuple(int(c[i:i+2], 16) for i in (0, 2, 4)) + (255,)
def save(grid, name, scale=2):
    h = len(grid); w = len(grid[0])
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    for y in range(h):
        for x in range(w):
            if grid[y][x]: im.putpixel((x, y), hx(grid[y][x]))
    im.resize((w*scale, h*scale), Image.NEAREST).save(os.path.join(OUT, name))

N = 18
def ring(light, dark, mid, win):
    g = [[None]*N for _ in range(N)]
    for y in range(N):
        for x in range(N):
            d = min(x, y, N-1-x, N-1-y)
            if d == 0: g[y][x] = INK
            elif d == 1: g[y][x] = light if (y == 1 and x < N-2) or (x == 1 and y < N-2) else dark
            elif d == 2: g[y][x] = mid
            else: g[y][x] = win
    for (x, y) in [(0,0),(N-1,0),(0,N-1),(N-1,N-1)]: g[y][x] = None   # rounded outer corner
    return g
def dot(g, pts, c):
    for x, y in pts: g[y][x] = c
C4 = [(1,1),(N-2,1),(1,N-2),(N-2,N-2)]
MIDS = [(N//2-1,1),(N//2,1),(N//2-1,N-2),(N//2,N-2),(1,N//2-1),(1,N//2),(N-2,N//2-1),(N-2,N//2)]

# 1 wood (the look today, Lv1)
g = ring('#6a4020', '#2e1a1e', '#4a2a14', '#5a3418'); save(g, 'pf-wood.png')
# 2 bronze: bevel + rivets
g = ring('#b8864a', '#5a3418', '#8a5a2a', '#5a3418'); dot(g, C4, '#f0c890'); save(g, 'pf-bronze.png')
# 3 silver: cool bevel, rivets, mid-edge studs
g = ring('#e8eef8', '#4a5068', '#a8b2c4', '#3a3f58'); dot(g, C4, '#ffffff'); dot(g, MIDS, '#ffffff'); save(g, 'pf-silver.png')
# 4 gold: gold ramp, red gems in the corners
g = ring('#f6d870', '#9a5a26', '#d49a3a', '#5a2e1e')
for cx, cy in [(1,1),(N-3,1),(1,N-3),(N-3,N-3)]:
    dot(g, [(cx,cy),(cx+1,cy),(cx,cy+1),(cx+1,cy+1)], '#c0392b'); g[cy][cx] = '#ffb0a0'
dot(g, MIDS, '#fff4c8'); save(g, 'pf-gold.png')
# 5 rune: dark stone, cyan runes (+ a glow layer that pulses)
g = ring('#4a5070', '#151a30', '#2a2f4a', '#151a30')
runes = [(4,1),(6,1),(11,1),(13,1),(4,N-2),(7,N-2),(10,N-2),(13,N-2),(1,5),(1,8),(1,12),(N-2,4),(N-2,9),(N-2,12)]
dot(g, runes, '#6ae0e8'); save(g, 'pf-rune.png')
glow = [[None]*N for _ in range(N)]
for x, y in runes:
    glow[y][x] = '#c8fcff'
    for dx, dy in [(1,0),(-1,0),(0,1),(0,-1)]:
        X, Y = x+dx, y+dy
        if 0 <= X < N and 0 <= Y < N and min(X, Y, N-1-X, N-1-Y) <= 2 and glow[Y][X] is None: glow[Y][X] = '#3fb8c8'
save(glow, 'pf-rune-glow.png')
# 6 crown: the gold frame with a crown sitting on its top edge (18x22)
crown = [".o...o...o.", "oYo.oYo.oYo", "oYYoYYYoYYo", "oYYYYrYYYYo", "oDDDDDDDDDo", "ooooooooooo"]
CP = {'o': INK, 'Y': '#f6d870', 'D': '#d49a3a', 'r': '#c0392b', '.': None}
gg = ring('#f6d870', '#9a5a26', '#d49a3a', '#5a2e1e'); dot(gg, MIDS[2:], '#fff4c8')
for cx, cy in [(1,N-3),(N-3,N-3)]:
    dot(gg, [(cx,cy),(cx+1,cy),(cx,cy+1),(cx+1,cy+1)], '#c0392b'); gg[cy][cx] = '#ffb0a0'
full = [[None]*N for _ in range(4)] + gg
for y, r in enumerate(crown):
    for x, ch in enumerate(r):
        if CP[ch]: full[y][x + 3] = CP[ch]
save(full, 'pf-crown.png')
# a standalone crown (banner) 11x6 -> 3x
save([[CP[c] for c in r] for r in crown], 'banner-crown.png', 4)
# pennant 8x16 (banner flags)
pen = ["oooooooo", "oGGGGGGo", "oRRRRRRo", "oRRRRRRo", "oRRGGRRo", "oRGYYGRo", "oRGYYGRo", "oRRGGRRo",
       "oRRRRRRo", "oRRRRRRo", "oDRRRRDo", "oGRRRRGo", "oRDRRDRo", "oRRooRRo", "oRo..oRo", "oo....oo"]
PP = {'o': INK, 'G': '#d49a3a', 'Y': '#f6d870', 'R': '#a8282a', 'D': '#6a1018', '.': None}
save([[PP[c] for c in r] for r in pen], 'pennant-red.png')
pen2 = [r.replace('R', 'B').replace('D', 'E') for r in pen]
PP.update({'B': '#2a4a9a', 'E': '#161c40'})
save([[PP[c] for c in r] for r in pen2], 'pennant-blue.png')
print('rewards ok')

# Small versions for lists (the adventure log): frames at 1x (18px), a short pennant, a small crown.
for k in ['wood', 'bronze', 'silver', 'gold', 'rune', 'crown']:
    Image.open(os.path.join(OUT, f'pf-{k}.png')).resize((18, 22 if k == 'crown' else 18), Image.NEAREST).save(os.path.join(OUT, f'pft-{k}.png'))
Image.open(os.path.join(OUT, 'pennant-red.png')).resize((8, 16), Image.NEAREST).save(os.path.join(OUT, 'pennant-s.png'))
save([[CP[c] for c in r] for r in crown], 'crown-s.png', 2)

# Pane-header frames: 30x30 at 1x (a 3px ring round the 24px face), same colors, for the
# 32px pane header where the 36px frame doesn't fit. The crown one has no crown on top.
def small(light, dark, mid, win, corner=None, studs=None, runes_=False, name=''):
    S = 30
    g = [[None]*S for _ in range(S)]
    for y in range(S):
        for x in range(S):
            d = min(x, y, S-1-x, S-1-y)
            g[y][x] = INK if d == 0 else (light if (y == 1 and x < S-2) or (x == 1 and y < S-2) else dark) if d == 1 else mid if d == 2 else win
    for (x, y) in [(0,0),(S-1,0),(0,S-1),(S-1,S-1)]: g[y][x] = None
    if corner:
        for x, y in [(1,1),(S-2,1),(1,S-2),(S-2,S-2)]: g[y][x] = corner
    if studs:
        for x, y in [(14,1),(15,1),(14,S-2),(15,S-2),(1,14),(1,15),(S-2,14),(S-2,15)]: g[y][x] = studs
    if runes_:
        for x, y in [(6,1),(10,1),(19,1),(23,1),(7,S-2),(12,S-2),(17,S-2),(22,S-2),(1,8),(1,14),(1,20),(S-2,7),(S-2,15),(S-2,21)]: g[y][x] = '#6ae0e8'
    save(g, name, 1)
small('#6a4020', '#2e1a1e', '#4a2a14', '#5a3418', name='pfs-wood.png')
small('#b8864a', '#5a3418', '#8a5a2a', '#5a3418', corner='#f0c890', name='pfs-bronze.png')
small('#e8eef8', '#4a5068', '#a8b2c4', '#3a3f58', corner='#ffffff', studs='#ffffff', name='pfs-silver.png')
small('#f6d870', '#9a5a26', '#d49a3a', '#5a2e1e', corner='#c0392b', studs='#fff4c8', name='pfs-gold.png')
small('#4a5070', '#151a30', '#2a2f4a', '#151a30', runes_=True, name='pfs-rune.png')
small('#f6d870', '#9a5a26', '#d49a3a', '#5a2e1e', corner='#c0392b', studs='#fff4c8', name='pfs-crown.png')
