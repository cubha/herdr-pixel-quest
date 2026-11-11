"""Party portraits: six silhouettes in 8 colorways each (48). Helm and hood come from
gen_v3.py; wizard, horned skull, king and slime were added in the same 12x12 style.

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

# ---- the four later shapes: the colorway is H highlight / S mid / d shadow ----
# wizard: hat = colorway, k skin, e eye, w beard light, g beard shadow
WIZARD = ['......oo....',
          '.....oHSo...',
          '....oHSdo...',
          '....oHSSdo..',
          '...oHSSSdo..',
          '..oHSSSSSdo.',
          'oHHSSSSSSSdo',
          '.ookekkekoo.',
          '.owwkkkkwgo.',
          '..owwwwwgo..',
          '...owwwgo...',
          '....oooo....']
# horned skull: bone = colorway, n horn, N horn shadow, f socket
SKULL = ['oo........oo',
         'onn......Nno',
         'onNo....oNno',
         '.oNnooooonNo',
         '..ooHHHSSoo.',
         '.oHHSSSSSSdo',
         '.oHffSSffSdo',
         '.oHffSSffSdo',
         '.oSSSSfSSSdo',
         '..oSSSSSSdo.',
         '..oSoSoSodo.',
         '...ooooooo..']
# king: crown = colorway, r gem, k skin, e eye, w beard, g beard shadow
KING = ['o....oo....o',
        'oHo.oHSo.oSo',
        'oHSoHSSdoSdo',
        'oHSSSrrSSSdo',
        'oddddddddddo',
        '.okkkkkkkko.',
        '.okekkkkeko.',
        '.okkkkkkkko.',
        '.owwkkkkwgo.',
        '.owwwwwwwgo.',
        '..owwwwwgo..',
        '...oooooo...']
# slime: body = colorway, W shine, f eye
SLIME = ['............',
         '............',
         '....oooo....',
         '..ooHHSSoo..',
         '.oHWHSSSSdo.',
         '.oHHSSSSSdo.',
         'oHSffSSffSdo',
         'oSSffSSffSdo',
         'oSSSSSSSSSdo',
         'oSSSSSSSSddo',
         '.oddddddddo.',
         '..oooooooo..']

# name, Korean label, (H, S, d)
WIZARD_C = [('azure','하늘','#8fb6ff','#3f5ab0','#1a2462'),('crimson','진홍','#ff9a8a','#c0302a','#5a1018'),
          ('forest','숲','#b8e890','#4a8a2a','#1e3a12'),('violet','보라','#e0c0ff','#7a3ab0','#2e1250'),
          ('obsidian','흑요석','#8a8498','#3a3648','#14121e'),('ash','잿빛','#ffffff','#c8c4d8','#6a6688'),
          ('gold','금','#fff4c8','#d49a3a','#7a3a1e'),('teal','청록','#b8fff0','#2a9a8a','#10403a')]
SKULL_C = [('bone','뼈','#fff4dc','#e0d0a8','#8a7a58'),('ash','잿빛','#e8e4f0','#a8a4b8','#5a5668'),
         ('jade','비취','#d8ffe8','#7ad8a8','#2a6a4a'),('crimson','진홍','#ffc8c0','#d0645a','#6a1a1a'),
         ('gold','금','#fff4c8','#e8b84a','#8a4a1e'),('obsidian','흑요석','#8a8498','#4a4658','#1a1828'),
         ('frost','서리','#f0faff','#a8d8f0','#3a6a8a'),('violet','보라','#f0d8ff','#b88ae0','#4a2a6a')]
KING_C = [('gold','금','#fff4c8','#d49a3a','#7a3a1e'),('silver','은','#ffffff','#b8c4d8','#4a4a78'),
        ('bronze','청동','#f0c890','#a8682e','#4a2414'),('jade','비취','#d8ffe8','#3fa878','#14503a'),
        ('ruby','루비','#ffc8c0','#c0392b','#5a1018'),('sapphire','사파이어','#d8ecff','#3f74e0','#1a2e7a'),
        ('obsidian','흑요석','#a8a4c0','#4a4668','#1a1830'),('rose','장미','#ffe0f0','#e07aa8','#7a2a50')]
SLIME_C = [('teal','청록','#b8fff0','#2a9a8a','#10403a'),('green','초록','#d0f0a0','#5aa83a','#244a12'),
         ('blue','파랑','#c8e0ff','#3f74e0','#1a2e7a'),('pink','분홍','#ffe0f0','#e07aa8','#7a2a50'),
         ('purple','보라','#e8c8ff','#8a4ac0','#3a1e5a'),('orange','주황','#ffe0a8','#e0782e','#7a2e12'),
         ('red','빨강','#ffb0a0','#c0302a','#4a0e10'),('grey','회색','#e8e4f0','#8a8498','#3a3648')]

FIXED = {'k': '#f0b888', 'e': INK, 'w': '#e8eef8', 'g': '#a8b4cc', 'n': '#8a8498', 'N': '#4a4658',
         'f': F, 'r': '#e0302a', 'W': '#ffffff'}
n = 0
for shape, rows, ways in [('wizard', WIZARD, WIZARD_C), ('skull', SKULL, SKULL_C), ('king', KING, KING_C), ('slime', SLIME, SLIME_C)]:
    for nm, _ko, H, S, d in ways:
        sprite(rows, {**FIXED, 'o': INK, 'H': H, 'S': S, 'd': d}, f'face-{shape}-{nm}.png')
        n += 1
print(len(HELMS) + len(HOODS) + n, 'portraits')

# Locked portraits in the picker: each later shape as a half-transparent black silhouette.
for shape, rows in [('wizard', WIZARD), ('skull', SKULL), ('king', KING), ('slime', SLIME)]:
    im = Image.new('RGBA', (12, 12), (0, 0, 0, 0))
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch != '.':
                im.putpixel((x, y), (0, 0, 0, 128))
    im.resize((24, 24), Image.NEAREST).save(os.path.join(OUT, f'sil-{shape}.png'))
