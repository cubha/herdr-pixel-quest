"""Shrinks the mod's files without changing a pixel or a glyph: PNGs re-saved at the
smallest of truecolor and an exact palette (only when every pixel reads back the same),
fonts re-saved by fontTools (same outlines, metrics, cmap and layout tables; only the
glyph data is packed tighter). Run after the art generators:
    python3 tools/lighten.py            # mods/pixel-quest/art and fonts
Needs Pillow and fontTools.
Copyright (c) 2026 cubha. MIT License.
"""
import io
import os
import sys

from PIL import Image

MOD = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "mods", "pixel-quest")


def png(path):
    raw = open(path, "rb").read()
    im = Image.open(io.BytesIO(raw))
    im.load()
    rgba = im.convert("RGBA")
    px = list(rgba.getdata())
    outs = []
    b = io.BytesIO()
    (rgba if im.mode in ("RGBA", "LA", "P") else im.convert("RGB")).save(b, "PNG", optimize=True)
    outs.append(b.getvalue())
    cols = rgba.getcolors(256)
    if cols:
        colors = [c for _, c in cols]
        idx = {c: i for i, c in enumerate(colors)}
        pal = Image.new("P", rgba.size)
        pal.putdata([idx[c] for c in px])
        pal.putpalette([v for c in colors for v in c[:3]])
        alpha = bytes(c[3] for c in colors)
        b = io.BytesIO()
        if any(a != 255 for a in alpha):
            pal.save(b, "PNG", optimize=True, transparency=alpha)
        else:
            pal.save(b, "PNG", optimize=True)
        outs.append(b.getvalue())
    best = min(outs, key=len)
    if len(best) >= len(raw) or list(Image.open(io.BytesIO(best)).convert("RGBA").getdata()) != px:
        return len(raw), len(raw)
    open(path, "wb").write(best)
    return len(raw), len(best)


def font(path):
    from fontTools.ttLib import TTFont
    before = os.path.getsize(path)
    t = TTFont(path)
    for tag in t.keys():
        t[tag]
    tmp = path + ".tmp"
    t.save(tmp)
    a, b = TTFont(path), TTFont(tmp)
    ga, gb = a["glyf"], b["glyf"]

    def shape(gl, g):
        x = gl[g]
        if not x.numberOfContours:
            return None
        c, e, fl = x.getCoordinates(gl)
        return list(c), list(e), [f & 1 for f in fl]

    same = (a.getGlyphOrder() == b.getGlyphOrder()
            and all(shape(ga, g) == shape(gb, g) for g in a.getGlyphOrder())
            and a["hmtx"].metrics == b["hmtx"].metrics
            and all(x.cmap == y.cmap for x, y in zip(a["cmap"].tables, b["cmap"].tables)))
    after = os.path.getsize(tmp)
    if same and after < before:
        os.replace(tmp, path)
        return before, after
    os.remove(tmp)
    return before, before


def main():
    tot = [0, 0]
    for dp, _, fn in os.walk(os.path.join(MOD, "art")):
        for f in fn:
            if f.endswith(".png"):
                a, b = png(os.path.join(dp, f))
                tot[0] += a
                tot[1] += b
    print(f"art: {tot[0] // 1024} K -> {tot[1] // 1024} K")
    fonts = os.path.join(MOD, "fonts")
    for f in sorted(os.listdir(fonts)):
        if f.endswith(".ttf"):
            a, b = font(os.path.join(fonts, f))
            print(f"{f}: {a // 1024} K -> {b // 1024} K")


if __name__ == "__main__":
    sys.exit(main())
