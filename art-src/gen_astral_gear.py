"""The sanctum set's portrait layers (the rebirth's gear, three upgrade stages), from the
confirmed wear pieces (.claude/plan/next/reborn/wear/out/s<stage>-<sex>-<h|t|w>.png, Gemini's
drawings read on the portrait's 120 x 131 grid). Nothing is drawn here: the pieces are copied
under their art names. Run gen_hero_scaled.py after it.
  python3 art-src/gen_astral_gear.py <wear out dir>
  gh|ga|gw-<sex>-astral<stage>.png
"""
import os, sys
from PIL import Image
SRC = sys.argv[1]
D = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'mods', 'pixel-quest', 'art', 'hero')
NAME = {'h': 'gh', 't': 'ga', 'w': 'gw'}
n = 0
for st in (1, 2, 3):
    for sex in 'mf':
        for slot in 'htw':
            im = Image.open(os.path.join(SRC, f's{st}-{sex}-{slot}.png')).convert('RGBA')
            assert im.size == (120, 131), im.size
            im.save(os.path.join(D, f'{NAME[slot]}-{sex}-astral{st}.png'), optimize=True); n += 1
print(n, 'files')
