"""The hero's portrait layers (mods/pixel-quest/art/hero), from the confirmed dot portraits.
  python3 art-src/gen_hero.py <dot dir> <weapon dir>
    dot dir: the folder with out7/ out6/ out8/ out3/ (and their F twins), 120x131 cells each
    weapon dir: stage4/wdot (rough-<set>-<M|F>.png read from the confirmed weapon mockups, render/ Gemini's
      clean redraws of those on 144 cells of 8 px)
Gear is the same at every rank: it comes from the one piece made on the knight (out6, out8 for the
helmets with the face-side line), never from a rank's own picture. Only the person differs by rank.
  base-<m|f>-<rank>.png           the rank's portrait
  bg-<m|f>-<rank>.png             its ground alone (the figure cleared): what armor starts from
  gw-<m|f>-<set>.png              the weapon: one whole drawing, under everything (it is carried on the back)
  ga-<m|f>-<set>.png              the armor
  gh-<m|f>-<set>.png              the helmet
  hd-<m|f>-<rank>-<set|x>.png     the rank's head and bare neck, as that helmet leaves it (x: no helmet)
  ho-<m|f>-<rank>-<set|x>.png     the part of it that lies over armor (hair on the shoulders)
  fg-<m|f>-<rank>-<set|x>.png     without armor: the figure in its own clothes, with that helmet on (x: none),
                                  the ground see-through
gear.js layers(): bg, gw, then with armor hd, ga, ho, gh; without fg.
Every file is one px per cell (the confirmed mockup shows the portrait at 120 x 131).
"""
import os
import sys

import numpy as np
from PIL import Image

D = sys.argv[1]
WD = sys.argv[2]
O = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'mods', 'pixel-quest', 'art', 'hero')
SETS = ['dungeon', 'sunlit', 'ice', 'moss', 'lava', 'crystal', 'throne']
RANKS = ['squire', 'adventurer', 'knight', 'hero', 'legend']
os.makedirs(O, exist_ok=True)
ld = lambda f: np.asarray(Image.open(f).convert('RGBA')).astype(int)


def comps(m):
    """8-connected components of a mask: (labels, sizes)."""
    H, W = m.shape
    lab = np.zeros((H, W), int)
    sizes = [0]
    for y, x in zip(*np.where(m)):
        if lab[y, x]:
            continue
        n = len(sizes)
        st = [(y, x)]
        lab[y, x] = n
        c = 0
        while st:
            a, b = st.pop()
            c += 1
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    p, q = a + dy, b + dx
                    if 0 <= p < H and 0 <= q < W and m[p, q] and not lab[p, q]:
                        lab[p, q] = n
                        st.append((p, q))
        sizes.append(c)
    return lab, np.array(sizes)


def save(a, name):
    im = Image.fromarray(a.astype('uint8'), 'RGBA')
    im.save(os.path.join(O, name + '.png'), optimize=True)


def over(dst, ov):
    m = ov[..., 3] > 0
    dst[m] = ov[m]


def grow(m, k):
    for _ in range(k):
        g = m.copy()
        g[1:] |= m[:-1]; g[:-1] |= m[1:]; g[:, 1:] |= m[:, :-1]; g[:, :-1] |= m[:, 1:]
        m = g
    return m


def grow8(m):
    g = grow(m, 1)
    g[1:, 1:] |= m[:-1, :-1]; g[1:, :-1] |= m[:-1, 1:]; g[:-1, 1:] |= m[1:, :-1]; g[:-1, :-1] |= m[1:, 1:]
    return g


def grow8(m):
    g = grow(m, 1)
    g[1:, 1:] |= m[:-1, :-1]; g[1:, :-1] |= m[:-1, 1:]; g[:-1, 1:] |= m[1:, :-1]; g[:-1, :-1] |= m[1:, 1:]
    return g


def cut(S, m):
    o = S.copy()
    o[..., 3] = m * 255
    o[~m] = 0
    return o


def whole_weapon(path):
    """The weapon alone from a render: 120x131 RGBA (the biggest thing that is not magenta)."""
    a = np.asarray(Image.open(path).convert('RGB')).astype(int)
    p = a.shape[0] / 144
    g = np.zeros((131, 120, 4), int)
    for j in range(131):
        ya = int(round(j * p + p * .25)); yb = max(ya + 1, int(round(j * p + p * .75)))
        for i in range(120):
            xa = int(round(i * p + p * .25)); xb = max(xa + 1, int(round(i * p + p * .75)))
            g[j, i, :3] = np.median(a[ya:yb, xa:xb].reshape(-1, 3), 0)
    c = g[..., :3]
    m = ~((c[..., 0] > 170) & (c[..., 2] > 170) & (c[..., 1] < 120))
    lab, sz = comps(m)
    m &= lab == sz.argmax()
    g[..., 3] = m * 255
    g[~m] = 0
    return g


REPORT = []


def weapon(st, X):
    """A set's weapon, whole: the confirmed weapon mockup read on the portrait's grid (rough-*), or
    Gemini's clean redraw of that (render/*) when it kept the weapon in place (most of each lies on
    the other); else the rough read stands."""
    a = np.asarray(Image.open(os.path.join(WD, f'rough-{st}-{X}.png')).convert('RGB')).astype(int)
    m = ~((a[..., 0] > 170) & (a[..., 2] > 170) & (a[..., 1] < 120))
    lab, sz = comps(m)
    m &= lab == sz.argmax()
    rough = np.zeros((131, 120, 4), int); rough[m, :3] = a[m]; rough[m, 3] = 255
    f = os.path.join(WD, 'render', f'{st}-{X}.png')
    if os.path.exists(f):
        g = whole_weapon(f)
        gm = g[..., 3] > 0
        iou = (gm & m).sum() / max(1, (gm | m).sum())
        REPORT.append(f'weapon {st} {X}: clean redraw overlap {iou:.2f} -> {"used" if iou >= .75 else "REJECTED, rough read used"}')
        if iou >= .75:
            return g
    else:
        REPORT.append(f'weapon {st} {X}: rough read (no clean redraw)')
    return rough


def ground(S):
    """The portrait's navy ground in a picture: near the corner color, reached from the edge."""
    c = S[..., :3]
    near = np.abs(c - c[1, 1]).sum(-1) < 40
    seen = np.zeros(near.shape, bool)
    H, W = near.shape
    st = [(y, x) for y in range(H) for x in (0, W - 1)] + [(y, x) for x in range(W) for y in (0, H - 1)]
    while st:
        y, x = st.pop()
        if not (0 <= y < H and 0 <= x < W) or seen[y, x] or not near[y, x]:
            continue
        seen[y, x] = True
        st += [(y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)]
    return seen


CLEANED = [0]


def clean(P, B):
    """A worn picture without the crumbs of what the piece took away: a clump of up to 12 cells
    standing apart from the figure, every cell of it a cell of the bare portrait's figure (hair,
    cloak), goes to the ground. Effects the bare portrait itself draws apart (embers) stay, and so
    does anything the piece adds (sparkles, a weapon's tip)."""
    gB = ground(B)
    labB, szB = comps(~gB)
    mainB = labB == szB.argmax()
    lab, sz = comps(~ground(P))
    main = sz.argmax()
    u, c = np.unique(B[gB][:, :3], axis=0, return_counts=True)
    out = P.copy()
    for k in range(1, len(sz)):
        if k == main or sz[k] > 12:
            continue
        m = lab == k
        if (m & mainB).sum() == m.sum():
            out[m, :3] = u[c.argmax()]
            CLEANED[0] += int(m.sum())
    return out


n = 0
same = lambda a, b: np.abs(a[..., :3] - b[..., :3]).sum(-1) == 0
STAT = dict(forced=0, crumbs=0)


def span(m):
    """Cells between a mask's first and last cell in each row: the helmet's inside."""
    r = np.zeros_like(m)
    for y in range(m.shape[0]):
        xs = np.where(m[y])[0]
        if len(xs):
            r[y, xs.min():xs.max() + 1] = True
    # and the chin under it: a few rows below the helmet's last rows, as wide as they are
    ys = np.where(m.any(1))[0]
    if len(ys):
        xs = np.where(m[ys.max() - 3:ys.max() + 1].any(0))[0]
        r[ys.max() + 1:ys.max() + 7, xs.min():xs.max() + 1] = True
    return r


def vote(samples, need):
    """Per cell the color most samples agree on. samples: list of (rgb array, mask). -> rgb, mask"""
    H, W = samples[0][1].shape
    out = np.zeros((H, W, 3), int); ok = np.zeros((H, W), bool)
    any_ = np.zeros((H, W), bool)
    for _, m in samples:
        any_ |= m
    for y, x in zip(*np.where(any_)):
        v = [tuple(c[y, x]) for c, m in samples if m[y, x]]
        b = max(set(v), key=v.count)
        if v.count(b) >= need and v.count(b) * 2 >= len(v):
            out[y, x] = b; ok[y, x] = True
    return out, ok


def rgba(c, m):
    o = np.zeros(m.shape + (4,), int)
    o[m, :3] = c[m][:, :3]; o[m, 3] = 255
    return o


for X, sx in (('', 'm'), ('F', 'f')):
    base = {r: ld(f'{D}/out7{X}/base-{r}-M.png') for r in RANKS}
    G = {r: ground(base[r]) for r in RANKS}
    navy = {}
    for r in RANKS:
        u, c = np.unique(base[r][G[r]][:, :3], axis=0, return_counts=True)
        navy[r] = u[c.argmax()]
        bg = base[r].copy(); bg[~G[r], :3] = navy[r]
        # fringe cells of the figure the flood took for ground show as lone specks beside armor: flatten them
        lab, sz = comps(np.abs(bg[..., :3] - navy[r]).sum(-1) > 0)
        for k in range(1, len(sz)):
            if sz[k] <= 8:
                bg[lab == k, :3] = navy[r]
        save(bg, f'bg-{sx}-{r}')
    isg = lambda P, r: np.abs(P[..., :3] - navy[r]).sum(-1) < 40
    # the pieces, and every confirmed picture with its gear cells set to the piece
    P = {}
    for st in SETS:
        P[st] = {sl: ld(f'{D}/out6{X}/{st}-knight-piece-{sl}.png') for sl in 'htw'}
        f8 = f'{D}/out8{X}/{st}-knight-piece-h.png'
        if os.path.exists(f8):
            P[st]['h'] = ld(f8)
    S = {}
    for r in RANKS:
        for st in SETS:
            for k in ('h', 't', 'w', 'htw'):
                S[r, st, k] = clean(ld(f'{D}/out7{X}/{st}-{r}-{k}.png'), base[r])
    # a piece cell follows the confirmed pictures: the color most of them show there, and no cell at all
    # where most of them leave the person as he is (a line the piece has and the pictures do not)
    for st in SETS:
        for sl in 'htw':
            p = P[st][sl]; drop = col = 0
            for y, x in zip(*np.where(p[..., 3] > 0)):
                v = [tuple(S[r, st, k][y, x, :3]) for r in RANKS for k in (sl, 'htw')
                     if tuple(S[r, st, k][y, x, :3]) != tuple(base[r][y, x, :3])]
                if sl != 'w' and len(v) <= 4:
                    p[y, x] = 0; drop += 1
                    continue
                if sl != 'w' and v.count(tuple(p[y, x, :3])) < 3 and max(v.count(c) for c in set(v)) < 3:
                    p[y, x] = 0; drop += 1    # the pictures show the person there, each rank its own
                    continue
                if v:
                    c = max(set(v), key=v.count)
                    if v.count(c) >= 3 and c != tuple(p[y, x, :3]):
                        p[y, x, :3] = c; col += 1
            if sl == 't':
                # Shoulders: the piece was cut from a picture where head, hair and weapon stood in front of
                # the armor, so pauldron tops are missing (spikes, a trim) or filled flat black. The confirmed
                # armor mockup, read on the piece's own place (wdot/suit-*), gives those cells back: what it
                # has beyond the piece where the knight's armor picture shows open ground, and what lies
                # under a black patch of the piece.
                f = os.path.join(WD, f'suit-{st}-{'F' if X else 'M'}.png')
                if os.path.exists(f) and os.environ.get('PQ_SUIT_PATCH'):   # off: tried 2026-11-22, the mockup read does not sit on the piece well enough (female sets worst) and the patches came out smeared
                    su = ld(f); sm = ~((su[..., 0] > 170) & (su[..., 2] > 170) & (su[..., 1] < 120))
                    m = p[..., 3] > 0
                    Kt = S['knight', st, 't']
                    add = sm & ~m & isg(Kt, 'knight')
                    lab, sz = comps(add)
                    near = grow8(m)
                    na = 0
                    for k in range(1, len(sz)):
                        c = lab == k
                        if sz[k] >= 3 and (c & near).any():
                            p[c] = su[c]; p[c, 3] = 255; na += int(sz[k])
                    blk = m & (p[..., :3].sum(-1) < 40)
                    core = blk & ~grow(~blk, 1)          # a patch, not a line: cells with black on all four sides
                    lab, sz = comps(core)
                    nb = 0
                    for k in range(1, len(sz)):
                        c = lab == k
                        if sz[k] >= 3 and (c & sm).sum() >= sz[k] * .7 and np.median(su[c & sm][:, :3].sum(-1)) > 110:
                            cc = grow(c, 1) & blk & sm & ~grow(~m, 1)   # the patch with a cell around it, the piece's own edge line kept
                            p[cc, :3] = su[cc][:, :3]; nb += int(cc.sum())
                    REPORT.append(f'{sx} {st} armor from the mockup: {na} cells added, {nb} black cells redrawn')
            # Details the cut left garbled (a crown on a pauldron): the cells taken off the confirmed armor
            # mockup laid over the piece, on the piece's grid and in the piece's colors (wdot/crown.py ->
            # wdot/fix-*.png, listed in wdot/handfix.json). Never drawn by hand.
            hf = os.path.join(WD, 'handfix.json')
            if os.path.exists(hf):
                import json
                for fx in json.load(open(hf)).get('grid', {}).get(f'{sx}-{st}-{sl}', []):
                    g = np.roll(ld(os.path.join(WD, fx['file'])), (fx['dy'], fx['dx']), (0, 1))
                    p[g[..., 3] == 255] = g[g[..., 3] == 255]
                    p[g[..., 3] == 1] = 0
            ol = 0
            if sl != 'w':
                # Every edge of a piece gets its dark line: in a mix it lies on another set's armor or on
                # the bare neck, not on what it was drawn against. Only where the knight's whole-set
                # picture has skin beside it (the face in the helmet, the neck in the collar) the line
                # stays as drawn.
                K = S['knight', st, 'htw'][..., :3]
                skinK = (K.sum(-1) > 300) & (K[..., 0] - K[..., 2] > 60)
                m = p[..., 3] > 0
                out_ = ~m & ~skinK
                side = np.zeros_like(m)
                side[1:] |= out_[:-1]; side[:-1] |= out_[1:]; side[:, 1:] |= out_[:, :-1]; side[:, :-1] |= out_[:, 1:]
                # one-cell notches in the edge (three sides in the piece) close with the line; in a mix the
                # neck or another armor would show through them as dots
                for _ in range(2):
                    cnt = np.zeros(m.shape, int)
                    cnt[1:] += m[:-1]; cnt[:-1] += m[1:]; cnt[:, 1:] += m[:, :-1]; cnt[:, :-1] += m[:, 1:]
                    notch = ~m & ~skinK & (cnt >= 3)
                    notch[-1] = False
                    p[notch] = (0, 0, 0, 255); m = p[..., 3] > 0; ol += int(notch.sum())
                out_ = ~m & ~skinK
                side = np.zeros_like(m)
                side[1:] |= out_[:-1]; side[:-1] |= out_[1:]; side[:, 1:] |= out_[:, :-1]; side[:, :-1] |= out_[:, 1:]
                fix = m & side & (p[..., :3].sum(-1) >= 110)
                fix[-1] = False                      # the picture's bottom row is a cut, not an edge
                p[fix, :3] = 0; ol += int(fix.sum())
            REPORT.append(f'{sx} {st} piece {sl}: {int((p[..., 3] > 0).sum())} cells, dropped {drop}, recolored {col}, outlined {ol}')
    for r in RANKS:
        for st in SETS:
            for k in 'hw':
                a = S[r, st, k]
                m = (P[st][k][..., 3] > 0) & ~same(a, base[r]) & ~same(a, P[st][k])
                a[m, :3] = P[st][k][m][:, :3]; STAT['forced'] += int(m.sum())
    pa = {st: P[st]['t'][..., 3] > 0 for st in SETS}
    HEAD, OVER, NECK, GW = {}, {}, {}, {}
    for r in RANKS:
        B = base[r]
        unch = sum((same(S[r, st, 't'], B) & ~G[r]).astype(int) for st in SETS)
        cov = sum((pa[st] & ~same(S[r, st, 't'], B)).astype(int) for st in SETS)
        core = (unch >= 4) | ((unch >= 1) & (unch + cov >= 6))
        # thin strands read differently from picture to picture: a cell any armor picture keeps, in a
        # color the head has, joined to the head, is head too
        pal, pc = np.unique(B[core][:, :3], axis=0, return_counts=True)
        pal = {tuple(c) for c, k in zip(pal, pc) if k >= 3}
        inpal = np.zeros(core.shape, bool)
        for y, x in zip(*np.where(~G[r] & ~core & (unch >= 1))):
            inpal[y, x] = tuple(B[y, x, :3]) in pal
        lab, sz = comps(core | inpal)
        head = lab == sz.argmax()
        # holes: bits of the figure cut off from the clothes by the head are head
        lab, sz = comps(~G[r] & ~head)
        if len(sz) > 1:
            main = sz.argmax()
            for k in range(1, len(sz)):
                m = lab == k
                if k != main and sz[k] <= 40 and np.mean([tuple(c) in pal for c in B[m][:, :3]]) >= .6:
                    head |= m
        HEAD[r] = head
        cover = sum(pa[st].astype(int) for st in SETS)
        OVER[r] = head & ~((cover > 0) & (cov * 2 > cover))
        # the bare neck the clothes hid: skin next to the head in the armor pictures, from the set that
        # bares the most of it first (one source reads alike; the others fill what it covers)
        c = B[..., :3]
        cand = []
        for st in SETS:
            a = S[r, st, 't']; c = a[..., :3]
            skin = (c[..., 0] > c[..., 1]) & (c[..., 1] >= c[..., 2]) & (c[..., 0] - c[..., 2] > 25)
            m = ~same(a, B) & ~pa[st] & ~isg(a, r) & ~head & skin
            for _ in range(3):   # and the dark cells along it (the jaw's shadow, the line)
                m |= ~same(a, B) & ~pa[st] & ~isg(a, r) & ~head & (c.sum(-1) < 150) & grow(m | head, 1)
            lab, sz = comps(m | head)
            m &= lab == lab[np.where(head)][0]
            cand.append((int(m.sum()), st, m))
        cand.sort(key=lambda t: -t[0])
        nk = np.zeros_like(B)
        for _, st, m in reversed(cand):
            nk[m] = S[r, st, 't'][m]; nk[m, 3] = 255
        NECK[r] = nk
        REPORT.append(f'{sx} {r}: head {int(head.sum())} (core {int(core.sum())}), neck {int((nk[..., 3] > 0).sum())} from {[(t[1], t[0]) for t in cand]}')
    for st in SETS:
        # the weapon whole: the piece, then what the knight's whole-set picture shows of it over armor, then the render
        r = 'knight'; B = base[r]; T = S[r, st, 'htw']
        L = B.copy()
        for k in 'th':
            m = ~same(S[r, st, k], B); L[m] = S[r, st, k][m]
        d = ~same(T, L) & ~isg(T, r)
        wr = (P[st]['w'][..., 3] > 0) | (~same(S[r, st, 'w'], B))
        gm = f'{D}/out3{X}/gm-{st}-{r}-w.npy'
        if os.path.exists(gm):
            wr |= np.load(gm) >= 0.5
        wr = grow(wr, 3)
        gw = weapon(st, 'F' if X else 'M')
        # The weapon is that one drawing, whole, laid under everything (it sits on the back). GW keeps
        # only where the confirmed pictures show the weapon, for telling it from the person below.
        reg = np.zeros_like(B); over(reg, cut(T, d & wr)); over(reg, P[st]['w'])
        GW[st] = reg
        save(gw, f'gw-{sx}-{st}'); save(P[st]['t'], f'ga-{sx}-{st}'); save(P[st]['h'], f'gh-{sx}-{st}')
        n += 3
    for r in RANKS:
        B = base[r]
        for a in [None] + SETS:
            if a is None:
                col = B.copy(); kept = HEAD[r].copy()
            else:
                Sh, T = S[r, a, 'h'], S[r, a, 'htw']
                ph = P[a]['h'][..., 3] > 0
                ins = span(ph)
                cB = B[..., :3]
                skinB = (cB.sum(-1) > 300) & (cB[..., 0] - cB[..., 2] > 60)
                # inside the helmet: what its two pictures agree on (the face, the brow where hair went);
                # else the bare head where the helmet-only picture keeps it, or where it is skin (the jaw
                # behind this set's own gorget: another armor may leave it in sight)
                agree = HEAD[r] & ins & ~ph & same(Sh, T) & ~isg(Sh, r)
                cT = T[..., :3]
                seenT = ((cT[..., 0] > cT[..., 1]) & (cT[..., 1] >= cT[..., 2]) & (cT[..., 0] - cT[..., 2] > 25)) | (P[a]['t'][..., 3] > 0)
                bare = HEAD[r] & ins & ~ph & ~agree & (same(Sh, B) | skinB) & seenT
                # outside it hair stays or goes a lock at a time: a lock most of which both pictures keep
                # (its own weapon may hide it in one) stays whole, as the bare portrait draws it
                nk = (NECK[r][..., 3] > 0) & ~HEAD[r]
                c = T[..., :3]
                skinT = (c[..., 0] > c[..., 1]) & (c[..., 1] >= c[..., 2]) & (c[..., 0] - c[..., 2] > 25)
                k0 = (HEAD[r] & same(Sh, B)) | (nk & (skinT | (P[a]['t'][..., 3] > 0)))
                loose = (HEAD[r] | nk) & ~ins & ~ph
                lab, sz = comps(loose)
                outside = np.zeros_like(loose)
                for k in range(1, len(sz)):
                    m = lab == k
                    if (m & k0).sum() >= 25 and (m & k0).sum() * 2 >= sz[k]:
                        # whole but for a part the pictures take away in one piece (hair up the helmet's side):
                        # what they keep, and the lock's cells within three of it (gaps, strand ends)
                        g = m & k0
                        for _ in range(3):
                            g = grow8(g) & m
                        outside |= g & (HEAD[r] | k0)   # cells read off the armor pictures only as those show them
                    else:
                        STAT['crumbs'] += int((m & k0).sum())
                kept = agree | bare | (outside & HEAD[r])
                col = Sh.copy(); col[bare | outside] = B[bare | outside]
            hd = NECK[r].copy()
            if a is not None:
                hd[~ins & ~outside] = 0
                hd[ins & ~seenT] = 0      # nor a neck its whole-set picture shows as ground (an ear beside a narrow helmet)
                # inside the helmet, where neither head nor neck is known, the whole-set picture is the person
                m = ins & ~ph & ~kept & (hd[..., 3] == 0) & ~(P[a]['t'][..., 3] > 0) & ~isg(T, r) & ~((GW[a][..., 3] > 0) & same(T, GW[a]))
                hd[m] = T[m]
            over(hd, rgba(col, kept))
            if a is not None:
                # what shows of the person beside and under the helmet is whole: no crumbs of a few
                # cells, no pinholes
                vis = (hd[..., 3] > 0) & ~ph
                lab, sz = comps(vis)
                for k in range(1, len(sz)):
                    if sz[k] < 6:
                        hd[lab == k] = 0; STAT['crumbs'] += int(sz[k])
                # Beside and under the helmet's cheek pieces the skin is in the helmet's shadow: three cells
                # of it go dark. A gap of a cell or two between the helmet and a high collar would else
                # show as a broken strip of skin, and so would an ear beside a narrow helmet. Not in the
                # face opening, nor straight under it (the chin), nor on hair locks.
                ys = np.where(ph.any(1))[0]; ybot = ys.max()
                free = ins & ~ph; free[ybot + 1:] = False
                lab, sz = comps(free)
                face = np.zeros_like(free)
                if len(sz) > 1:
                    hit = np.bincount(lab[agree], minlength=len(sz)); hit[0] = 0
                    face = lab == hit.argmax()
                xs = np.where(face[max(0, ybot - 2):ybot + 1].any(0))[0]
                if len(xs):
                    face[ybot + 1:ybot + 13, xs.min():xs.max() + 1] = True
                shade = (hd[..., 3] > 0) & ~ph & ~face & ~(outside & HEAD[r]) & grow8(grow8(grow8(ph)))
                hd[shade, :3] = 0
                # and what little skin is left out there in bits (under a dozen cells) goes dark with it
                rest = (hd[..., 3] > 0) & ~ph & ~face & ~(outside & HEAD[r]) & (hd[..., :3].sum(-1) > 0)
                lab, sz = comps(rest)
                for k in range(1, len(sz)):
                    if sz[k] < 12:
                        hd[lab == k, :3] = 0
                # over armor go only the face in the opening and the hair locks: not jaw skin from behind a cheek piece
                kept &= face | (outside & HEAD[r])
                STAT['shade'] = STAT.get('shade', 0) + int(shade.sum())
                vis = (hd[..., 3] > 0)
                for _ in range(2):
                    cnt = np.zeros(vis.shape, int)
                    cnt[1:] += vis[:-1]; cnt[:-1] += vis[1:]; cnt[:, 1:] += vis[:, :-1]; cnt[:, :-1] += vis[:, 1:]
                    for y, x in zip(*np.where(~vis & ~ph & ins & (cnt >= 3))):
                        nb = [hd[y + dy, x + dx, :3] for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0))
                              if 0 <= y + dy < 131 and 0 <= x + dx < 120 and vis[y + dy, x + dx]]
                        hd[y, x, :3] = np.median(nb, 0); hd[y, x, 3] = 255
                    vis = hd[..., 3] > 0
            # without armor: the figure in its own clothes (with that helmet on), the ground see-through
            F = B if a is None else Sh
            fg = ~ground(F) & ~(isg(F, r) & ~same(F, B))
            if a is not None:
                # its own weapon is not in the helmet-only picture, but the hair a helmet clears may leave
                # ground the flood does not reach (a pocket by the helmet): cleared cells are ground
                fg &= ~(G[r] & isg(F, r))
            out = rgba(F, fg)
            if a is not None:
                # the helmet itself is the one piece (the same at every rank): a dark helmet (lava) is
                # near the ground's navy, so the flood would else punch holes through the rank's own drawing
                hm = P[a]['h'][..., 3] > 0
                out[hm] = P[a]['h'][hm]
            save(out, f'fg-{sx}-{r}-{a or "x"}')
            n += 1
            save(hd, f'hd-{sx}-{r}-{a or "x"}')
            save(rgba(col, kept & OVER[r]), f'ho-{sx}-{r}-{a or "x"}')
            n += 2
print(n, 'layers;', STAT)
print('\n'.join(REPORT))
