"""Swap real space / agent names in a Herdr screenshot for demo names.

    python3 tools/redact.py <fonts-dir> <in.png> <out.png> <rules.json>

rules.json: [{"box": [x0, y0, x1, y1], "text": "my-api", "font": "Galmuri11.ttf",
              "size": 12, "align": "left" | "right"}, ...]
Each box is cleared to its own background (its most common color) and the
new text is drawn where the old text's ink started (right-aligned boxes keep
the old right edge), in the old text's color, without anti-aliasing, so it
reads like the app's own pixel text. Copyright (c) 2026 cubha. MIT License.
"""
import json
import sys
from collections import Counter

from PIL import Image, ImageDraw, ImageFont

fonts, src, dst, rules = sys.argv[1:5]
im = Image.open(src).convert('RGB')
d = ImageDraw.Draw(im)
d.fontmode = '1'


def far(a, b):
    return sum(abs(x - y) for x, y in zip(a, b)) > 90


for r in json.load(open(rules, encoding='utf8')):
    x0, y0, x1, y1 = r['box']
    px = [(x, y, im.getpixel((x, y))) for y in range(y0, y1) for x in range(x0, x1)]
    bg = Counter(c for _, _, c in px).most_common(1)[0][0]
    ink = [(x, y, c) for x, y, c in px if far(c, bg)]
    color = tuple(r['color']) if 'color' in r else (
        Counter(c for _, _, c in ink).most_common(1)[0][0] if ink else (232, 220, 192))
    ix0 = min((x for x, _, _ in ink), default=x0)
    ix1 = max((x for x, _, _ in ink), default=x1)
    iy0 = min((y for _, y, _ in ink), default=y0)
    d.rectangle([x0, y0, x1 - 1, y1 - 1], fill=bg)
    font = ImageFont.truetype(f"{fonts}/{r.get('font', 'Galmuri11.ttf')}", r.get('size', 12))
    bx0, by0, bx1, _ = d.textbbox((0, 0), r['text'], font=font)
    top = r.get('top', iy0) - by0
    left = (ix1 + 1 - (bx1 - bx0) - bx0) if r.get('align') == 'right' else ix0 - bx0
    d.text((left, top), r['text'], font=font, fill=color)
im.save(dst)
print('ok', dst)
