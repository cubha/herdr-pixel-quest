"""The rebirth's small art (mods/pixel-quest/art): the star shard, the star frame, the moon
cape spirit (three upgrade stages, up and asleep, both ways) and the sanctum set's icons.
  python3 art-src/gen_star.py <make/out dir> <confirmed pet dir> [make/render dir]
Nothing is drawn here. The pictures are Gemini's, read on their grid by the mockup's tools
(.claude/plan/next/reborn/make: rd.py, petread.py) and copied under their art names:
  shard.png 16x16                      the star shop's money (make/out/shard-1.png, 1 px cells)
  pf-star.png 36x46, pft-star.png 18x23, pfs-star.png 30x30   the star frame (make/out/fstar-v0.png, 18x23 cells)
  pet-star-<1|2|3>-<a|s>[-r].png, pet-star-1-s-x.png           (confirmed pet5-<n>-a.png; make/out/pet-star-<n>-s.png)
  hero/it-astral<1|2|3>-<h|t|w|wl>[-x].png                     (make/render/ico<n>.png, like gen_hero_icons.py)
"""
import os, sys
import numpy as np
from PIL import Image
SRC, PET = sys.argv[1], sys.argv[2]
REN = sys.argv[3] if len(sys.argv) > 3 else None
ART = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'mods', 'pixel-quest', 'art')
def up(im, k): return im.resize((im.width * k, im.height * k), Image.NEAREST)
def put(im, name): im.save(os.path.join(ART, name), optimize=True); return im

# the shard
put(Image.open(os.path.join(SRC, 'shard-1.png')).convert('RGBA'), 'shard.png')

# the frame: 18 x 23 cells (a 5-row ornament over an 18 x 18 ring)
fr = Image.open(os.path.join(SRC, 'fstar-v0.png')).convert('RGBA')
assert fr.size == (18, 23), fr.size
put(up(fr, 2), 'pf-star.png'); put(fr, 'pft-star.png')
# the pane header's 30 x 30 ring with no ornament: the 18-cell ring's own colors, each side
# stretched along its length and kept three px deep (the other small frames are 3 px rings)
ring = np.asarray(fr)[5:]                     # 18 x 18
S = 30; small = np.zeros((S, S, 4), 'uint8')
for y in range(S):
    for x in range(S):
        d = min(x, y, S - 1 - x, S - 1 - y)
        if d > 2: small[y, x] = ring[9, 9]; continue
        sx = min(17, x * 18 // S); sy = min(17, y * 18 // S)
        # keep the depth: the source cell at the same depth from the nearest edge
        if d == x: sx = d
        if d == S - 1 - x: sx = 17 - d
        if d == y: sy = d
        if d == S - 1 - y: sy = 17 - d
        if sx in (8, 9): sx = 6                 # (not the ornament's stem, which crosses the top edge)
        small[y, x] = ring[sy, sx]
put(Image.fromarray(small), 'pfs-star.png')

# the spirit: up (the confirmed sprites, 2x px already) and asleep (cells -> 2x), both ways
sizes = {}
for n in (1, 2, 3):
    a = Image.open(os.path.join(PET, f'pet5-{n}-a.png')).convert('RGBA')
    p = os.path.join(SRC, f'pet-star-{n}-s.png')
    if not os.path.exists(p): print('no sleeping picture yet for stage', n); continue
    s = up(Image.open(p).convert('RGBA'), 2)
    for kind, im in (('a', a), ('s', s)):
        put(im, f'pet-star-{n}-{kind}.png'); put(im.transpose(Image.FLIP_LEFT_RIGHT), f'pet-star-{n}-{kind}-r.png')
        sizes[f'{n}-{kind}'] = im.size
    if n == 1:
        x = np.asarray(s).copy(); x[..., :3] = 0; put(Image.fromarray(x), 'pet-star-1-s-x.png')
print('pet sizes', sizes)
