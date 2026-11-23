// Pixel Quest's hero: the player's own portrait (man or woman, five ranks by level) and
// the gear on it. Seven sets, one per zone, three pieces each (helmet, armor, weapon),
// bought piece by piece for gold once the zone is open, and worn in any mix. Looks
// only: nothing here locks a feature. Lives in pq.eco.hero:
//   { sex: "m" | "f", rank: key | null (null: the highest one open), own: { "<set>-<slot>": 1 }, eq: { h, t, w } }
// No Herdr imports, so tests/gear.test.mjs runs it under node.
// Copyright (c) 2026 cubha. MIT License.

import { ZONES, isOpen, howOpen, zoneBy } from "./zones.js";
import { fmt } from "./economy.js";

export const SETS = ZONES.map((z) => z.key);
/** A set's short name (the piece's name: "던전 투구"). */
export const SET_KO = { dungeon: "던전", sunlit: "햇살", ice: "얼음", moss: "이끼", lava: "용암", crystal: "수정", throne: "왕좌" };
export const SLOTS = ["h", "t", "w"];
export const SLOT_KO = { h: "투구", t: "갑옷", w: "무기" };
/** Each zone's color: the strip under a piece and its name. */
export const SET_COLOR = { dungeon: "#9aa3b8", sunlit: "#e6cf8e", ice: "#8fd0ee", moss: "#6fbf7a", lava: "#ff8a3a", crystal: "#b48cf0", throne: "#e0b040" };
const BASE = { dungeon: 300, sunlit: 300, ice: 500, moss: 600, lava: 800, crystal: 1000, throne: 1500 };
const MUL = { h: 1, w: 1.5, t: 2 };
export const price = (set, slot) => Math.round(BASE[set] * MUL[slot]);
export const pieceName = (set, slot) => `${SET_KO[set]} ${SLOT_KO[slot]}`;
const valid = (set, slot) => SETS.includes(set) && SLOTS.includes(slot);

// Ranks follow the titles (progress.js TITLES): the portrait of each opens at its level.
export const RANKS = [
  { key: "squire", name: "견습", lv: 1 }, { key: "adventurer", name: "모험가", lv: 5 }, { key: "knight", name: "기사", lv: 10 },
  { key: "hero", name: "영웅", lv: 15 }, { key: "legend", name: "전설", lv: 20 },
];
export const rankOpen = (key, best) => { const r = RANKS.find((x) => x.key === key); return Boolean(r) && (Number(best) || 1) >= r.lv; };
/** The highest rank open at a level. */
export const topRank = (best) => RANKS.filter((r) => Math.max(1, Number(best) || 1) >= r.lv).pop().key;

export const emptyHero = () => ({ sex: "m", rank: null, own: {}, eq: { h: null, t: null, w: null } });
/** eco.hero as stored, filled in (an old or broken value never throws; a worn piece that isn't owned comes off). */
export function readHero(eco) {
  const v = eco?.hero && typeof eco.hero === "object" ? eco.hero : {};
  const own = {};
  if (v.own && typeof v.own === "object") for (const k of Object.keys(v.own)) { const [s, l] = k.split("-"); if (v.own[k] && valid(s, l)) own[k] = 1; }
  const eq = {};
  for (const l of SLOTS) { const s = v.eq?.[l]; eq[l] = s && own[`${s}-${l}`] ? s : null; }
  return { sex: v.sex === "f" ? "f" : "m", rank: RANKS.some((r) => r.key === v.rank) ? v.rank : null, own, eq };
}
const put = (eco, hero) => ({ ...eco, hero });

/** The rank shown: the chosen one while open, else the highest open. */
export function rankNow(eco, best) {
  const h = readHero(eco);
  return h.rank && rankOpen(h.rank, best) ? h.rank : topRank(best);
}
export const rankName = (key) => RANKS.find((r) => r.key === key)?.name ?? "";

export function setSex(eco, sex) { return put(eco, { ...readHero(eco), sex: sex === "f" ? "f" : "m" }); }

/** Picks a rank's portrait (an open one). */
export function setRank(eco, key, best) {
  const r = RANKS.find((x) => x.key === key);
  if (!r) return { eco, ok: false, msg: "없는 등급입니다" };
  if (!rankOpen(key, best)) return { eco, ok: false, msg: `${r.name} 초상화는 Lv.${r.lv}에 열립니다` };
  return { eco: put(eco, { ...readHero(eco), rank: key }), ok: true, msg: `${r.name} 초상화` };
}
/** The next (dir 1) or previous (-1) rank, as the sidebar's arrows step. */
export function stepRank(eco, dir, best) {
  const i = RANKS.findIndex((r) => r.key === rankNow(eco, best)) + (dir < 0 ? -1 : 1);
  if (i < 0 || i >= RANKS.length) return { eco, ok: false, msg: null };
  return setRank(eco, RANKS[i].key, best);
}

/** Is a set's zone open? at: { best, medals, zones } (zones.js isOpen). */
export const setOpen = (set, at) => isOpen(set, at);
export const setHow = (set) => howOpen(set);
export const zoneName = (set) => zoneBy(set)?.name ?? set;

/** Buys one piece (no selling back). It goes into the bag. */
export function buyGear(eco, set, slot, at = {}) {
  if (!valid(set, slot)) return { eco, ok: false, msg: "없는 장비입니다" };
  const h = readHero(eco), name = pieceName(set, slot), p = price(set, slot);
  if (!setOpen(set, at)) return { eco, ok: false, msg: `먼저 구역을 열어야 합니다 · ${zoneName(set)}: ${setHow(set)}` };
  if (h.own[`${set}-${slot}`]) return { eco, ok: false, msg: `${name}: 이미 가지고 있습니다` };
  if ((eco.gold ?? 0) < p) return { eco, ok: false, msg: `${name}: ${fmt(p - (eco.gold ?? 0))} G가 모자랍니다` };
  return { eco: { ...eco, gold: eco.gold - p, hero: { ...h, own: { ...h.own, [`${set}-${slot}`]: 1 } } }, ok: true, msg: `${name}을(를) 샀습니다 · 가방에 들어갔습니다` };
}

/** Puts an owned piece on (whatever was in that slot goes back to the bag). */
export function equip(eco, set, slot) {
  const h = readHero(eco);
  if (!valid(set, slot) || !h.own[`${set}-${slot}`]) return { eco, ok: false, msg: "가지고 있지 않은 장비입니다" };
  return { eco: put(eco, { ...h, eq: { ...h.eq, [slot]: set } }), ok: true, msg: `${pieceName(set, slot)} 착용` };
}
/** Takes a slot's piece off, back into the bag. */
export function unequip(eco, slot) {
  const h = readHero(eco);
  const s = h.eq[slot];
  if (!s) return { eco, ok: false, msg: null };
  return { eco: put(eco, { ...h, eq: { ...h.eq, [slot]: null } }), ok: true, msg: `${pieceName(s, slot)}을(를) 가방에 넣었습니다` };
}
/** The sidebar's slot buttons: the next owned piece for the slot, then none, round and round. */
export function cycle(eco, slot) {
  const h = readHero(eco);
  if (!SLOTS.includes(slot)) return { eco, ok: false, msg: null };
  const opts = [null, ...SETS.filter((s) => h.own[`${s}-${slot}`])];
  if (opts.length === 1) return { eco, ok: false, msg: `가진 ${SLOT_KO[slot]}이(가) 없습니다 · 상점에서 살 수 있습니다` };
  const next = opts[(opts.indexOf(h.eq[slot]) + 1) % opts.length];
  return { eco: put(eco, { ...h, eq: { ...h.eq, [slot]: next } }), ok: true, msg: next ? `${pieceName(next, slot)} 착용` : `${SLOT_KO[slot]} 없음` };
}

// ---- the bag: a grid where a piece takes the cells of its size ----
export const BAG = { cols: 20, rows: 6, cell: 20 };
/** Cells a piece takes: [w, h]. */
export const SIZE = { h: [2, 2], w: [1, 2], t: [3, 2] };
/** Owned pieces not worn, laid first-fit (armor, helmets, weapons; sets in zone order):
 *  [{ set, slot, x, y, w, h }]. */
export function pack(eco) {
  const h = readHero(eco);
  const g = Array.from({ length: BAG.rows }, () => Array(BAG.cols).fill(false));
  const place = (w, hh) => {
    for (let y = 0; y + hh <= BAG.rows; y++) for (let x = 0; x + w <= BAG.cols; x++) {
      let ok = true;
      for (let j = 0; j < hh && ok; j++) for (let i = 0; i < w; i++) if (g[y + j][x + i]) { ok = false; break; }
      if (!ok) continue;
      for (let j = 0; j < hh; j++) for (let i = 0; i < w; i++) g[y + j][x + i] = true;
      return [x, y];
    }
    return null;
  };
  const out = [];
  for (const slot of ["t", "h", "w"]) for (const set of SETS) {
    if (!h.own[`${set}-${slot}`] || h.eq[slot] === set) continue;
    const p = place(SIZE[slot][0], SIZE[slot][1]);
    if (p) out.push({ set, slot, x: p[0], y: p[1], w: SIZE[slot][0], h: SIZE[slot][1] });
  }
  return out;
}

// ---- pictures (art/hero, art-src/gen_hero.py) ----
/** The portrait's layers, bottom first. Gear is one drawing per set, the same at every rank
 *  and in every mix; only the person differs by rank.
 *  The rank's ground, then the weapon whole (it is carried on the back, so everything else
 *  goes over it). With armor: the rank's head and bare neck as the helmet leaves them, the
 *  armor, the hair that lies over armor, the helmet. Without armor: the figure in the rank's
 *  own clothes, with that helmet on. */
export function layers(sex, rank, eq = {}) {
  const ok = (l) => (eq[l] && SETS.includes(eq[l]) ? eq[l] : null);
  const h = ok("h"), t = ok("t"), w = ok("w");
  const out = [`hero/bg-${sex}-${rank}`];
  if (w) out.push(`hero/gw-${sex}-${w}`);
  if (!t) return [...out, `hero/fg-${sex}-${rank}-${h || "x"}`];
  out.push(`hero/hd-${sex}-${rank}-${h || "x"}`, `hero/ga-${sex}-${t}`, `hero/ho-${sex}-${rank}-${h || "x"}`);
  if (h) out.push(`hero/gh-${sex}-${h}`);
  return out;
}
/** The portrait's size (120 x 131 cells, one px each, as the confirmed mockup has it). */
export const PORTRAIT = [120, 131];
