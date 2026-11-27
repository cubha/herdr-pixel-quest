"""Pixel Quest alert sound sets (sounds.js) (a done and a needs-input sound each), original motifs.
22.05 kHz 8-bit mono WAV. Notes: (midi or None, seconds). Voices: sq (square, duty), tri, bell."""
import os, wave, math, random
import subprocess, tempfile
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEST = os.path.join(ROOT, 'mods', 'pixel-quest', 'sounds')
OUT = tempfile.mkdtemp()
SR = 22050
def hz(m): return 440.0 * 2 ** ((m - 69) / 12)
def tone(f0, dur, voice='sq', duty=0.5, vol=0.5, f1=None, decay=None, vib=0.0):
    n = int(SR * dur); out = []; ph = 0.0
    for i in range(n):
        t = i / n
        f = f0 + ((f1 - f0) * t if f1 else 0)
        if vib: f *= 1 + vib * math.sin(2 * math.pi * 14 * i / SR)
        ph = (ph + f / SR) % 1.0
        if voice == 'sq': s = 1.0 if ph < duty else -1.0
        elif voice == 'tri': s = 4 * abs(ph - 0.5) - 1
        elif voice == 'bell': s = 0.7 * math.sin(2 * math.pi * ph) + 0.3 * math.sin(2 * math.pi * ph * 3.01 )
        else: s = random.uniform(-1, 1)
        a = min(1.0, i / (SR * 0.004))                       # 4 ms attack
        if decay: a *= math.exp(-decay * i / SR)
        a *= min(1.0, (n - i) / (SR * 0.01))                 # 10 ms release
        out.append(s * a * vol)
    return out
def rest(d): return [0.0] * int(SR * d)
def seq(notes, **kw):
    out = []
    for m, d in notes: out += rest(d) if m is None else tone(hz(m), d, **kw)
    return out
def mix(a, b):
    n = max(len(a), len(b)); a = a + [0.0] * (n - len(a)); b = b + [0.0] * (n - len(b))
    return [x + y for x, y in zip(a, b)]
def save(name, s):
    s = s + rest(0.05); peak = max(1e-6, max(abs(x) for x in s)); k = min(1.0, 0.9 / peak)
    # 4-bit-ish crunch keeps the 8-bit feel
    data = bytes(int(127.5 + 127.5 * max(-1, min(1, round(x * k * 12) / 12))) for x in s)
    with wave.open(os.path.join(OUT, name + '.wav'), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(1); w.setframerate(SR); w.writeframes(data)
random.seed(4)
SETS = {}
# 오르골 (music box): soft bells
SETS['box'] = (
    mix(seq([(84, .14), (88, .14), (91, .14), (96, .5)], voice='bell', vol=.6, decay=5), rest(.14) + seq([(76, .14), (79, .14), (84, .5)], voice='bell', vol=.3, decay=5)),
    seq([(88, .16), (84, .22), (None, .08), (88, .16), (84, .3)], voice='bell', vol=.6, decay=6))
# 아케이드 (arcade): quick pulse run and a coin-up blip
SETS['arcade'] = (
    seq([(79, .05), (84, .05), (88, .05), (91, .05), (96, .05), (91, .05), (96, .05), (100, .22)], voice='sq', duty=.25, vol=.45),
    seq([(57, .09), (None, .04), (57, .09), (None, .04), (52, .2)], voice='sq', duty=.125, vol=.5))
# 용사의 나팔 (herald's horn): a short call
SETS['horn'] = (
    mix(seq([(67, .1), (None, .02), (67, .1), (None, .02), (67, .1), (72, .16), (76, .16), (79, .42)], voice='sq', duty=.5, vol=.4, vib=.004),
        seq([(None, .34), (60, .16), (64, .16), (67, .42)], voice='tri', vol=.4)),
    seq([(72, .2), (67, .3), (None, .1), (72, .2), (67, .36)], voice='sq', duty=.5, vol=.4, vib=.004))
# 슬라임 (slime): boings
SETS['slime'] = (
    tone(hz(60), .11, 'tri', vol=.7, f1=hz(72)) + rest(.03) + tone(hz(64), .11, 'tri', vol=.7, f1=hz(76)) + rest(.03) + tone(hz(67), .3, 'tri', vol=.7, f1=hz(86), decay=3),
    tone(hz(69), .2, 'tri', vol=.7, f1=hz(55)) + rest(.08) + tone(hz(69), .28, 'tri', vol=.7, f1=hz(52)))
# 보물 상자 (treasure chest): lid thunk, then coins
SETS['chest'] = (
    tone(110, .06, 'noise', vol=.5, decay=30) + seq([(95, .05), (100, .05), (95, .05), (100, .05), (103, .05), (107, .32)], voice='sq', duty=.25, vol=.4, decay=3),
    tone(200, .04, 'noise', vol=.5, decay=40) + rest(.05) + tone(200, .04, 'noise', vol=.5, decay=40) + rest(.05) + seq([(64, .12), (63, .3)], voice='sq', duty=.25, vol=.45))
# 별의 종 (star bells, the star shop's): a high bell run with its own faint echo a fifth up, like glints
SETS['star'] = (
    mix(seq([(88, .1), (91, .1), (95, .1), (100, .12), (103, .5)], voice='bell', vol=.55, decay=4),
        rest(.16) + seq([(95, .1), (98, .1), (102, .1), (107, .12), (110, .4)], voice='bell', vol=.22, decay=6)),
    mix(seq([(95, .2), (91, .26), (None, .1), (95, .2), (90, .4)], voice='bell', vol=.55, decay=5),
        rest(.1) + seq([(102, .2), (98, .26)], voice='bell', vol=.18, decay=7)))
if __name__ == '__main__':
    # WAV first (8-bit, 22 kHz), then mp3 like the 8-bit quest set (ffmpeg on PATH).
    # (python3 art-src/gen_sounds.py [set ...]: only those sets; none = all)
    import sys
    for k, (done, blocked) in SETS.items():
        if sys.argv[1:] and k not in sys.argv[1:]: continue
        for kind, snd in (('done', done), ('blocked', blocked)):
            save(f'{k}-{kind}', snd)
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', os.path.join(OUT, f'{k}-{kind}.wav'),
                            '-ac', '1', '-ar', '22050', '-b:a', '64k', os.path.join(DEST, f'{k}-{kind}.mp3')], check=True)
    print({f: os.path.getsize(os.path.join(DEST, f)) for f in sorted(os.listdir(DEST))})
