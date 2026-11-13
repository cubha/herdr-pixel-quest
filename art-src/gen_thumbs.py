"""Layout thumbnails (128x80) and the settings window's cards (192x120), from layouts/*.png.

    python3 art-src/gen_thumbs.py mods/pixel-quest/art

Copyright (c) 2026 cubha. MIT License.
"""
import os, sys
from PIL import Image
OUT = sys.argv[1]
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
for name, out in [('pixel-quest', 'look-dark'), ('pixel-quest-light', 'look-light')]:
    im = Image.open(os.path.join(ROOT, 'layouts', f'{name}.png')).convert('RGB')
    im.resize((128, 80), Image.LANCZOS).save(os.path.join(OUT, f'{out}.png'))
    im.resize((192, 120), Image.LANCZOS).save(os.path.join(OUT, f'{out}-l.png'))   # the settings card
print('thumbs ok')
