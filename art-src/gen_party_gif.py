"""README animation: the party slot in its four states (done, working, blocked, idle),
drawn from the mod's own art with the same there-and-back loops as kit.battle().

    python3 art-src/gen_party_gif.py mods/pixel-quest docs/screens/party-effects.gif

Copyright (c) 2026 cubha. MIT License.
"""
import math, sys
from PIL import Image, ImageDraw, ImageFont
MOD, OUT = sys.argv[1:3]
A = lambda n: Image.open(f'{MOD}/art/{n}.png').convert('RGBA')
font = ImageFont.truetype(f'{MOD}/fonts/Galmuri11.ttf', 12)
ROWS = [('완료', '#6fd38a', 'hood-teal', 'done', 'notes-app'), ('작업 중', '#7fa8ff', 'wizard-violet', 'working', 'game-jam'),
        ('입력 필요', '#e8935a', 'helm-crimson', 'blocked', 'my-api'), ('대기', '#9b98b8', 'slime-green', 'idle', 'blog')]
W, RH, FPS, SEC = 250, 46, 20, 2.8
floor = A('floor').crop((0, 0, W, RH * len(ROWS) + 12))
def wave(t, period, ease=False):
    """0..1..0 over 2*period ms, like Herdr's loop (linear, or eased)."""
    x = (t * 1000 / period) % 2
    x = x if x <= 1 else 2 - x
    return (1 - math.cos(math.pi * x)) / 2 if ease else x
def put(img, art, x, y, alpha=1.0):
    if alpha <= 0: return
    a = art.copy(); a.putalpha(a.getchannel('A').point(lambda v: int(v * alpha))); img.alpha_composite(a, (int(x), int(y)))
frames = []
for i in range(int(FPS * SEC)):
    t = i / FPS
    im = floor.copy(); d = ImageDraw.Draw(im); d.fontmode = '1'
    for r, (label, tone, face, st, name) in enumerate(ROWS):
        y = 8 + r * RH; sx = 54
        put(im, A('pf-wood'), 8, y); put(im, A(f'face-{face}'), 14, y + 6); put(im, A(f'gem-{st}'), 36, y - 4)
        if st == 'working':
            w = wave(t, 560); put(im, A('sword-l'), sx + 4 * w, y + 10); put(im, A('sword-r'), sx + 8 - 4 * w, y + 10)
            put(im, A('spark'), sx + 4, y + 6, wave(t, 560, True))
        elif st == 'done':
            w = wave(t, 1200, True); put(im, A('chest-shut'), sx, y + 6); put(im, A('chest-open'), sx, y + 6, w)
            put(im, A('spark'), sx + 12, y, wave(t, 600, True))
        elif st == 'blocked':
            put(im, A('call-bubble'), sx, y + 6 + 4 * wave(t, 380, True))
        else:
            w = wave(t, 450); put(im, A('camp-a'), sx, y + 6); put(im, A('camp-b'), sx, y + 6, w)
            for ex, p in ((6, 1100), (17, 1400)):
                e = wave(t, p); put(im, A('ember'), sx + ex, y + 6 + 14 - 14 * e, 1 - e)
        d.text((sx + 32, y + 4), name, font=font, fill='#e8dcc0')
        d.text((sx + 32, y + 20), label, font=font, fill=tone)
    frames.append(im.resize((W * 2, im.height * 2), Image.NEAREST).convert('RGB').quantize(128, dither=Image.Dither.NONE))
frames[0].save(OUT, save_all=True, append_images=frames[1:], duration=int(1000 / FPS), loop=0, optimize=True)
print('ok', OUT)
