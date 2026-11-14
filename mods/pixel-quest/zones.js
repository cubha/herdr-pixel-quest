// Pixel Quest's zones: the dungeon (the dark look), the sunlit chamber (the light
// look) and five more, each a set of walls, floors, tablet, gold and terminal colors
// that come together (one layout + one theme + one set of art). Zones are looks
// only: a locked one shows how it opens, no feature waits on one. No Herdr imports,
// so tests/zones.test.mjs runs it under node.
// Copyright (c) 2026 cubha. MIT License.

// open: best level, a medal (economy.js MEDALS id), or bought in the shop (gold).
export const ZONES = [
  { key: "dungeon", name: "던전", layout: "pixel-quest", open: {} },
  { key: "sunlit", name: "햇빛 석실", layout: "pixel-quest-light", open: {} },
  { key: "ice", name: "얼음 동굴", open: { level: 4 } },
  { key: "moss", name: "이끼 유적", open: { medal: "streak7", medalName: "일주일 출석" } },
  { key: "lava", name: "용암 굴", open: { level: 12 } },
  { key: "crystal", name: "수정 광산", open: { gold: 3000 } },
  { key: "throne", name: "왕좌의 방", open: { medal: "legend", medalName: "전설" } },
];
export const zoneBy = (key) => ZONES.find((z) => z.key === key) ?? null;

/** The layout a zone shows in (the new zones: pixel-quest-<zone>). */
export const layoutOf = (key) => zoneBy(key)?.layout ?? (zoneBy(key) ? `pixel-quest-${key}` : null);

/** The zone a layout belongs to, or null (not a Pixel Quest layout, or unknown). */
export function zoneOf(name) {
  const n = String(name ?? "");
  return ZONES.find((z) => layoutOf(z.key) === n)?.key ?? null;
}

/** The look's name in the art's file names: dark, light, or the zone's own key. */
export function lookTheme(name) {
  const k = zoneOf(name);
  return k === "sunlit" ? "light" : k && k !== "dungeon" ? k : "dark";
}

const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/** Open now? at: { best, medals (id -> when), zones (keys bought) }. */
export function isOpen(key, at = {}) {
  const z = zoneBy(key);
  if (!z) return false;
  const o = z.open;
  if (o.level) return (Number(at.best) || 1) >= o.level;
  if (o.medal) return Boolean(at.medals?.[o.medal]);
  if (o.gold) return Array.isArray(at.zones) && at.zones.includes(key);
  return true;
}

/** How a zone opens, as its settings card says it. */
export function howOpen(key) {
  const o = zoneBy(key)?.open ?? {};
  if (o.level) return `Lv.${o.level}`;
  if (o.medal) return `훈장 "${o.medalName}"`;
  if (o.gold) return `상점 ${fmt(o.gold)} G`;
  return "처음부터";
}

// Each zone's surfaces and gold, from the confirmed mockup (stage 3, v13): the dark
// look's navy stone turned to the zone's hue, its gold and bronze laid on the zone's
// ramp, the dim text (times, hints) in the zone's own gray (the mockup's terminal dim,
// tools/gen-zone-files.mjs TERM). Text, the meaning colors and the bronze plates' text
// stay as they are.
const PALETTES = {
  ice: {
    ink: "#060a0d", wall: "#0d181f", chrome: "#11202a", fill: "#162936", raised: "#1f3949", hover: "#2b4a5e", stone: "#3e596a", well: "#060a0d", dim: "#7e96b0",
    g0: "#16303f", g1: "#3c6c88", g2: "#8cc0d8", g3: "#d8f2fa", g4: "#ffffff", b0: "#16303f", b1: "#183444", b2: "#386681", b3: "#72a5be", gt: "#d8f2fa", gt2: "#8cc0d8",
  },
  lava: {
    ink: "#0a0808", wall: "#181313", chrome: "#201a19", fill: "#2a2220", raised: "#382e2c", hover: "#483c3a", stone: "#524745", well: "#0a0808", dim: "#ac9688",
    g0: "#1c1010", g1: "#4c3028", g2: "#94603c", g3: "#f4802a", g4: "#ffd478", b0: "#1c1010", b1: "#1f1212", b2: "#472d26", b3: "#7d5136", gt: "#f4802a", gt2: "#94603c",
  },
  crystal: {
    ink: "#09060d", wall: "#150e1d", chrome: "#1c1228", fill: "#251833", raised: "#322245", hover: "#422e59", stone: "#513f65", well: "#09060d", dim: "#8c80aa",
    g0: "#2a1440", g1: "#6a3a9a", g2: "#b07ae0", g3: "#e4c0ff", g4: "#fff0ff", b0: "#2a1440", b1: "#2e1646", b2: "#643691", b3: "#9965c9", gt: "#e4c0ff", gt2: "#b07ae0",
  },
  throne: {
    ink: "#0c0709", wall: "#1c1014", chrome: "#26151b", fill: "#311b23", raised: "#422630", hover: "#553340", stone: "#60434d", well: "#0c0709", dim: "#a08480",
    g0: "#6a3210", g1: "#b8741c", g2: "#f0b83a", g3: "#ffe680", g4: "#fffbe0", b0: "#6a3210", b1: "#6f3611", b2: "#b16e1b", b3: "#dea230", gt: "#ffe680", gt2: "#f0b83a",
  },
  moss: {
    ink: "#080c0a", wall: "#131c17", chrome: "#19261f", fill: "#203128", raised: "#2c4237", hover: "#3b5548", stone: "#496054", well: "#080c0a", dim: "#80907e",
    g0: "#22260e", g1: "#56581e", g2: "#9a963c", g3: "#d6d47c", g4: "#f6f6c8", b0: "#22260e", b1: "#25290f", b2: "#51531c", b3: "#848232", gt: "#d6d47c", gt2: "#9a963c",
  },
};

/** What a zone changes in the drawing kit's palette (the dungeon and sunlit: nothing). */
export const paletteOf = (key) => ({ ...(PALETTES[key] ?? {}) });

/** The zones with art of their own (everything but the dungeon and the sunlit chamber). */
export const DRAWN = Object.keys(PALETTES);

// A panel's dressing (art zone/<zone>/dress-*.png, art-src/gen_zones.py): how deep the
// top and bottom bands and the side strips reach (px), and each bottom corner thing as
// [offset from its side, width, height]. Lava and moss keep the cobweb instead.
export const DRESS = {
  ice: { top: 24, bottom: 8, side: 8, bl: [2, 62, 40], br: [2, 62, 40] },
  crystal: { top: 42, bottom: 12, side: 0, bl: [2, 50, 36], br: [14, 97, 43] },
  throne: { top: 18, bottom: 10, side: 6, bl: [0, 82, 61], br: [0, 82, 61] },
};
