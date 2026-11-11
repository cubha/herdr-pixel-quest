"""Party portraits: the two silhouettes (helm, hood) of gen_v3.py in 8 colorways each.

The first four (helm-gold, helm-steel, hood-amber, hood-violet) are pixel-identical
to gen_v3.py's. Only colors change; the shapes stay the original 12x12 sprites.

    python3 art-src/gen_faces.py mods/pixel-quest/art

Copyright (c) 2026 cubha. MIT License.
"""
import os, sys
from PIL import Image

OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
INK = '#05060c'
F = '#1a1028'  # the dark inside a hood


def hx(c):
    c = c.lstrip('#'); return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


def sprite(rows, pal, name, scale=2):
    im = Image.new('RGBA', (len(rows[0]), len(rows)), (0, 0, 0, 0))
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch != '.':
                im.putpixel((x, y), hx(pal[ch]))
    im.resize((im.width * scale, im.height * scale), Image.NEAREST).save(os.path.join(OUT, name))


HELM = ['....oooo....', '..ooHHSSoo..', '.oHHSSSSSdo.', '.oHSSSSSSdo.', 'oHSSSSSSSSdo', 'oHSooooooSdo',
        'oHSSSSooSSdo', 'oHSSSSooSSdo', '.oSSSSSSSdo.', 'odoSSSSSSodo', '.oddddddddo.', '..oooooooo..']
HOOD = ['..oo........', '.oHHo.......', '.oHhHoo.....', '..ohHHHoo...', '..oHhhhhHo..', '.oHhoooohho.',
        '.oHofeefoho.', '.oHoffffoho.', 'oHhhoooohhdo', 'oHhhhhhhhddo', 'ohhhhhhhhddo', 'oooooooooooo']

# helm: H highlight, S plate, d shadow
HELMS = {
    'gold':     ('#fff4c8', '#d49a3a', '#7a3a1e'),
    'steel':    ('#e8eef8', '#a8b4cc', '#4a4a78'),
    'bronze':   ('#f0c890', '#a8682e', '#4a2414'),
    'jade':     ('#d8ffe8', '#3fa878', '#14503a'),
    'crimson':  ('#ffc8c0', '#c0392b', '#5a1018'),
    'azure':    ('#d8ecff', '#3f86e0', '#1a2e7a'),
    'obsidian': ('#a8a4c0', '#4a4668', '#1a1830'),
    'rose':     ('#ffe0f0', '#e07aa8', '#7a2a50'),
}
# hood: H highlight, h cloth, d shadow, e eyes
HOODS = {
    'amber':  ('#ffd08a', '#e0782e', '#7a2e2a', '#ffe08a'),
    'violet': ('#e0c0ff', '#8a4ac0', '#3a1e5a', '#7fe3e3'),
    'teal':   ('#b8fff0', '#2a9a8a', '#10403a', '#ffe08a'),
    'forest': ('#d0f0a0', '#5a8a2a', '#243a12', '#ff9a8a'),
    'scarlet': ('#ffb0a0', '#c0302a', '#4a0e10', '#fff4c8'),
    'navy':   ('#b8c8f0', '#3a4a8a', '#161c40', '#f6d870'),
    'ash':    ('#e8e4f0', '#8a8498', '#3a3648', '#ff6a5a'),
    'plum':   ('#ffc8e8', '#9a3a7a', '#3e1032', '#9de48a'),
}

for nm, (H, S, d) in HELMS.items():
    sprite(HELM, {'o': INK, 'H': H, 'S': S, 'd': d}, f'face-helm-{nm}.png')
for nm, (H, h, d, e) in HOODS.items():
    sprite(HOOD, {'o': INK, 'H': H, 'h': h, 'd': d, 'f': F, 'e': e}, f'face-hood-{nm}.png')
print(len(HELMS) + len(HOODS), 'portraits')
