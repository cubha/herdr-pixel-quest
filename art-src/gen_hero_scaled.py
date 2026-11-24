"""The hero's portrait layers (art/hero/*.png, 120 x 131, one px per cell) at 2x and 3x,
each cell a block of whole px (nearest), in art/hero/x2 and x3. Herdr draws an image at its
own size and stretches it smoothly, so a portrait shown bigger needs its own file to stay
sharp (kit.js heroPortrait picks it). Run after gen_hero.py."""
import os
from PIL import Image
D = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'mods', 'pixel-quest', 'art', 'hero')
if __name__ == '__main__':
    n = 0
    for k in (2, 3):
        out = os.path.join(D, f'x{k}'); os.makedirs(out, exist_ok=True)
        for f in sorted(os.listdir(D)):
            if not f.endswith('.png'): continue
            im = Image.open(os.path.join(D, f))
            if im.size != (120, 131): continue        # gear icons are shown at their own size
            im.resize((120 * k, 131 * k), Image.NEAREST).save(os.path.join(out, f), optimize=True); n += 1
    print(n, 'files')
