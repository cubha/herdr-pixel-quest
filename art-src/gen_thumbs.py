"""Layout thumbnails for the settings window (128x80), from layouts/*.png.

    python3 art-src/gen_thumbs.py mods/pixel-quest/art

Copyright (c) 2026 cubha. MIT License.
"""
import os, sys
from PIL import Image
OUT = sys.argv[1]
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
for name, out in [('pixel-quest', 'look-dark'), ('pixel-quest-light', 'look-light')]:
    Image.open(os.path.join(ROOT, 'layouts', f'{name}.png')).convert('RGB').resize((128, 80), Image.LANCZOS).save(os.path.join(OUT, f'{out}.png'))
print('thumbs ok')
