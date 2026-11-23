"""The gear icons for the bag, the slots and the shop (mods/pixel-quest/art/hero/it-*.png).
  python3 art-src/gen_hero_icons.py <render dir> [set ...]
A render is one set's helmet, armor and whole weapon (small and large) redrawn by Gemini on a
128 x 128 grid of 8 px blocks (the set illustrations laid out by the mockup's icons/prep.py).
Each block is read as one px. Nothing is drawn here: the pictures are cut out as they are.
  it-<set>-h.png 38x38   it-<set>-t.png 58x38   it-<set>-w.png 18x38   it-<set>-wl.png 26x84
  it-<set>-<h|t|w>-x.png  the same shape in black (a locked zone's piece in the shop)
  ghost-<h|t|w|wl>.png       an empty slot's faint shape (the dungeon set's, white at 12%)
"""
import os, sys
import numpy as np
from PIL import Image

R = sys.argv[1]
O = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'mods', 'pixel-quest', 'art', 'hero')
SETS = sys.argv[2:] or ['dungeon', 'sunlit', 'ice', 'moss', 'lava', 'crystal', 'throne']
N = 128
FN = {'h': 'h', 't': 't', 'w': 'w', 'W': 'wl'}   # file names (no upper case: some disks ignore it)
CANVAS = {'h': (38, 38), 't': (58, 38), 'w': (18, 38), 'W': (26, 84)}
# where each picture was laid (cells): x0, y0, x1, y1
ZONE = {'h': (0, 0, 44, 42), 't': (44, 0, 106, 42), 'w': (106, 0, 128, 42), 'W': (0, 42, 104, 128)}


def read(path):
    a = np.asarray(Image.open(path).convert('RGB')).astype(int)
    p = a.shape[0] / N
    out = np.zeros((N, N, 3), int)
    for j in range(N):
        ya = int(round(j * p + p * 0.2)); yb = max(ya + 1, int(round(j * p + p * 0.8)))
        for i in range(N):
            xa = int(round(i * p + p * 0.2)); xb = max(xa + 1, int(round(i * p + p * 0.8)))
            out[j, i] = np.median(a[ya:yb, xa:xb].reshape(-1, 3), 0)
    return out


def quant(a, T=14):
    """Colors closer than T to a more common one become that one (flat tones, no speckle)."""
    flat = a.reshape(-1, 3)
    u, inv, cnt = np.unique(flat, axis=0, return_inverse=True, return_counts=True)
    reps, mp, w = [], np.zeros(len(u), int), np.array([2, 4, 3]) / 3.0
    for k in np.argsort(-cnt):
        if reps:
            d = np.sqrt((((np.array(reps) - u[k]) ** 2) * w).sum(1)); m = d.argmin()
            if d[m] < T:
                mp[k] = m; continue
        reps.append(u[k]); mp[k] = len(reps) - 1
    return np.array(reps)[mp[inv.reshape(-1)]].reshape(a.shape)


def flood_bg(a):
    """The navy ground: cells near the corner color, reached from the edge."""
    bg = np.median(np.concatenate([a[:3, :3].reshape(-1, 3), a[-3:, :3].reshape(-1, 3)]), 0)
    near = np.abs(a - bg).sum(-1) < 40
    seen = np.zeros((N, N), bool)
    st = [(y, x) for y in range(N) for x in (0, N - 1)] + [(y, x) for x in range(N) for y in (0, N - 1)]
    while st:
        y, x = st.pop()
        if not (0 <= y < N and 0 <= x < N) or seen[y, x] or not near[y, x]:
            continue
        seen[y, x] = True
        st += [(y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)]
    return seen


def biggest(m, keep=6):
    """Drops specks: components smaller than `keep` cells (and Gemini's corner mark with them)."""
    lab = np.zeros(m.shape, int); sizes = [0]
    for y, x in zip(*np.where(m)):
        if lab[y, x]:
            continue
        n = len(sizes); st = [(y, x)]; lab[y, x] = n; c = 0
        while st:
            a, b = st.pop(); c += 1
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    p, q = a + dy, b + dx
                    if 0 <= p < m.shape[0] and 0 <= q < m.shape[1] and m[p, q] and not lab[p, q]:
                        lab[p, q] = n; st.append((p, q))
        sizes.append(c)
    sz = np.array(sizes)
    return m & (sz[lab] >= max(keep, sz.max() // 12))


def put(rgba, key):
    cw, ch = CANVAS[key]
    h, w = rgba.shape[:2]
    if w > cw or h > ch:
        raise SystemExit(f'{key}: {w}x{h} does not fit {cw}x{ch}')
    cv = np.zeros((ch, cw, 4), 'uint8')
    oy, ox = (ch - h) // 2, (cw - w) // 2
    cv[oy:oy + h, ox:ox + w] = rgba
    return cv


os.makedirs(O, exist_ok=True)
for st in SETS:
    a = quant(read(os.path.join(R, st + '.png')))
    solid = ~flood_bg(a)
    for key, (x0, y0, x1, y1) in ZONE.items():
        m = np.zeros((N, N), bool); m[y0:y1, x0:x1] = solid[y0:y1, x0:x1]
        m = biggest(m)
        ys, xs = np.where(m)
        c = np.dstack([a, m * 255]).astype('uint8')[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        cv = put(c, key)
        Image.fromarray(cv, 'RGBA').save(os.path.join(O, f'it-{st}-{FN[key]}.png'), optimize=True)
        if key != 'W':
            x = cv.copy(); x[..., :3] = 0
            Image.fromarray(x, 'RGBA').save(os.path.join(O, f'it-{st}-{key}-x.png'), optimize=True)
        if st == 'dungeon':
            g = cv.copy(); g[..., :3] = 255; g[..., 3] = (g[..., 3] > 0) * 31
            Image.fromarray(g, 'RGBA').save(os.path.join(O, f'ghost-{FN[key]}.png'), optimize=True)
        print(st, key, c.shape[1], c.shape[0])
