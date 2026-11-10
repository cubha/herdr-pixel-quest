"""Pixel Quest extras: the layout preview picture and the 8-bit alert sounds.

    python3 art-src/gen_extras.py <out-folder>

Writes <out>/pixel-quest.png (the settings screen's layout preview, 320x200),
<out>/quest-done.mp3 and <out>/quest-blocked.mp3 (square-wave chiptunes; the
MP3s need ffmpeg with libmp3lame on PATH; the WAVs are kept next to them).

Copyright (c) 2026 cubha. MIT License.
"""
import math
import os
import struct
import subprocess
import sys
import wave

from PIL import Image, ImageDraw

OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)

INK = '#05060c'
WALL = ['#0b0e1c', '#121731', '#1a2142']
FILL = '#121731'
G = ['#5a2e1e', '#9a5a26', '#d49a3a', '#f6d870', '#fff4c8']
B = ['#2e1a1e', '#5a3418', '#8a5a2a', '#b8864a']
CHROME = '#0e1226'


def hx(c):
    return tuple(int(c[i:i + 2], 16) for i in (1, 3, 5))


# ---------- layout preview: drawn at 160x100, doubled ----------
def preview(path):
    W, H = 160, 100
    im = Image.new('RGB', (W, H), WALL[0])
    d = ImageDraw.Draw(im)
    # wall bricks, low contrast
    for y in range(0, H, 4):
        off = (y // 4 % 2) * 4
        for x in range(-off, W, 8):
            d.rectangle([x, y, x + 6, y + 2], fill=WALL[1])

    def frame(x0, y0, x1, y1, ramp, knobs):
        d.rectangle([x0, y0, x1, y1], outline=INK)
        d.line([x0 + 1, y0 + 1, x1 - 1, y0 + 1], fill=ramp[3])
        d.line([x0 + 1, y0 + 1, x0 + 1, y1 - 1], fill=ramp[3])
        d.line([x0 + 1, y1 - 1, x1 - 1, y1 - 1], fill=ramp[1])
        d.line([x1 - 1, y0 + 1, x1 - 1, y1 - 1], fill=ramp[1])
        d.rectangle([x0 + 2, y0 + 2, x1 - 2, y1 - 2], fill=FILL, outline=INK)
        if knobs:
            for kx, ky in ((x0, y0), (x1 - 2, y0), (x0, y1 - 2), (x1 - 2, y1 - 2)):
                d.rectangle([kx, ky, kx + 2, ky + 2], fill=G[2], outline=INK)
                d.point((kx + 1, ky + 1), fill='#d0302a')

    def plaque(x0, y, x1):
        d.rectangle([x0, y, x1, y + 4], fill=B[1], outline=INK)
        d.line([x0 + 4, y + 2, x1 - 4, y + 2], fill=G[3])

    # tab bar and the torch
    d.rectangle([0, 0, W - 1, 8], fill=CHROME)
    d.line([0, 9, W - 1, 9], fill=INK)
    d.rectangle([3, 2, 13, 6], fill=G[1], outline=INK)
    d.rectangle([42, 2, 58, 6], fill=B[1], outline=INK)
    d.rectangle([60, 2, 74, 6], fill=FILL, outline=INK)
    for i, c in enumerate([G[4], G[3], G[2]]):
        d.point((101, 1 + i), fill=c)
    d.rectangle([140, 2, 145, 6], fill=B[1], outline=INK)
    d.rectangle([147, 2, 152, 6], fill=B[1], outline=INK)
    d.rectangle([154, 2, 158, 6], fill='#8a1a1a', outline=INK)
    # sidebar: spaces and party panels
    frame(2, 11, 40, 52, G, True)
    plaque(6, 14, 36)
    for i, c in enumerate(['#4fc4c4', '#8ee07a', '#e8a0f0', '#c8a070']):
        y = 22 + i * 7
        if i == 0:
            d.rectangle([5, y - 1, 37, y + 4], outline=B[2])
        d.rectangle([8, y, 11, y + 3], fill=c, outline=INK)
        d.line([14, y + 2, 30 - i * 2, y + 2], fill='#e8dcc0' if i == 0 else '#b8a88a')
    frame(2, 54, 40, 90, G, True)
    plaque(6, 57, 36)
    for i, c in enumerate(['#c0392b', '#3f74e0', '#3f9a4a']):
        y = 65 + i * 8
        d.rectangle([6, y, 11, y + 5], fill=B[1], outline=INK)
        d.point((12, y), fill=c)
        d.line([14, y + 1, 32, y + 1], fill='#e8dcc0')
        d.line([14, y + 4, 26, y + 4], fill=c)
    d.rectangle([3, 92, 20, 97], fill='#1a2142', outline=INK)
    d.rectangle([22, 92, 39, 97], fill='#1a2142', outline=INK)
    # panes: focused gold, the other bronze
    d.rectangle([44, 12, 155, 52], fill=FILL, outline=G[2])
    d.rectangle([45, 13, 154, 18], fill='#1a2142')
    d.line([45, 19, 154, 19], fill=G[1])
    d.rectangle([47, 14, 50, 17], fill='#3f74e0', outline=INK)
    d.line([53, 15, 80, 15], fill=G[3])
    for i, (w, c) in enumerate([(60, '#f6d870'), (40, '#e8dcc0'), (72, '#8ee07a'), (30, '#e0564f')]):
        d.line([48, 24 + i * 5, 48 + w, 24 + i * 5], fill=c)
    d.rectangle([44, 55, 155, 92], fill=FILL, outline=INK)
    d.rectangle([45, 56, 154, 61], fill=CHROME)
    d.line([45, 62, 154, 62], fill=INK)
    for i, (w, c) in enumerate([(50, '#8ee07a'), (64, '#c8c0b0'), (24, '#f6d870')]):
        d.line([48, 67 + i * 5, 48 + w, 67 + i * 5], fill=c)
    for i, c in enumerate(['#e0564f', '#5cc46a', '#f0c24a', '#5a8cf0', '#c77ad8', '#4fc4c4']):
        d.rectangle([48 + i * 5, 84, 51 + i * 5, 86], fill=c)
    # status bar
    d.rectangle([42, 94, W - 1, H - 1], fill=CHROME)
    d.line([42, 94, W - 1, 94], fill=INK)
    for i, c in enumerate(['#c0392b', '#3f74e0', '#3f9a4a']):
        d.rectangle([60 + i * 5, 96, 63 + i * 5, 98], fill=c)
    # dungeon details (see gen_dungeon.py): brick bands, stone floors, chains,
    # sconces, the sill and the terminal area's lit slabs
    px = im.load()
    chrome, fill = hx(CHROME), hx(FILL)
    for y0, y1 in ((0, 8), (95, H - 1)):
        for y in range(y0, y1 + 1):
            for x in range(W):
                if px[x, y] != chrome:
                    continue
                row = (y - y0) // 3
                if (y - y0) % 3 == 2 or (x + row * 4) % 8 == 7:
                    px[x, y] = hx(INK)
                elif (y - y0) % 3 == 0:
                    px[x, y] = (30, 37, 72)
    for x0, x1, y0, y1 in ((4, 38, 13, 50), (4, 38, 56, 88)):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if px[x, y] == fill and ((y - y0) % 6 == 5 or (x + (y - y0) // 6 * 5) % 11 == 10):
                    px[x, y] = (12, 16, 34)
    for x0, y0, x1, y1 in ((45, 20, 154, 51), (45, 63, 154, 91)):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if px[x, y] == fill:
                    t = max(0.0, 1 - math.hypot((x - (x0 + x1) / 2) / 70, (y - y0) / 30))
                    t = round(t * 4) / 4 * 0.45
                    px[x, y] = tuple(int(a * (1 - t) + b * t) for a, b in zip(fill, (75, 52, 48)))
    for x in (12, 30):
        px[x, 53] = (138, 132, 150)
    for x in (88, 114):
        px[x, 2], px[x, 3] = hx(G[3]), hx(G[1])
    for x in range(44, 156):
        px[x, 93] = (58, 56, 84)
    im.resize((W * 2, H * 2), Image.NEAREST).save(path)


# ---------- 8-bit sounds ----------
RATE = 22050
NOTE = {n: 440 * 2 ** ((i - 9) / 12) for i, n in enumerate('C C# D D# E F F# G G# A A# B'.split())}


def freq(name):
    """'E5' -> Hz."""
    pitch, octave = name[:-1], int(name[-1])
    return NOTE[pitch] * 2 ** (octave - 4)


def square(f, dur, vol=0.32, duty=0.5, decay=6.0):
    n = int(RATE * dur)
    out = []
    for i in range(n):
        t = i / RATE
        phase = (t * f) % 1.0
        env = math.exp(-decay * t) * min(1.0, i / 60)  # tiny attack: no click
        out.append((vol if phase < duty else -vol) * env)
    return out


def song(notes):
    data = []
    for name, dur, duty in notes:
        data += [0.0] * int(RATE * dur) if name == '-' else square(freq(name), dur, duty=duty)
    data += [0.0] * int(RATE * 0.08)
    return data


def write(path, samples):
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(b''.join(struct.pack('<h', int(max(-1, min(1, s)) * 32767)) for s in samples))


def mp3(wav, out):
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-codec:a', 'libmp3lame', '-b:a', '96k', out], check=True)


preview(os.path.join(OUT, 'pixel-quest.png'))
# Quest complete: a rising arpeggio and a held top note.
done = song([('C5', 0.07, 0.5), ('E5', 0.07, 0.5), ('G5', 0.07, 0.5), ('C6', 0.07, 0.5),
             ('-', 0.03, 0.5), ('G5', 0.07, 0.25), ('C6', 0.32, 0.25)])
# Needs you: two short calls, a falling fourth, twice.
blocked = song([('A5', 0.09, 0.125), ('E5', 0.12, 0.125), ('-', 0.06, 0.5),
                ('A5', 0.09, 0.125), ('E5', 0.16, 0.125)])
for name, data in (('quest-done', done), ('quest-blocked', blocked)):
    wav = os.path.join(OUT, f'{name}.wav')
    write(wav, data)
    mp3(wav, os.path.join(OUT, f'{name}.mp3'))
print('ok', sorted(os.listdir(OUT)))
