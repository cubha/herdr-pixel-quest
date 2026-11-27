// Pixel Quest's hero: the player's own portrait (man or woman, five ranks by level) and
// the gear on it. Seven sets, one per zone, three pieces each (helmet, armor, weapon),
// bought piece by piece for gold once the zone is open, and worn in any mix. Looks
// only: nothing here locks a feature. Lives in pq.eco.hero:
//   { sex: "m" | "f", rank: key | null (null: the highest one open), own: { "<set>-<slot>": 1 }, eq: { h, t, w } }
// No Herdr imports, so tests/gear.test.mjs runs it under node.
// Copyright (c) 2026 cubha. MIT License.

import { ZONES, isOpen, howOpen, zoneBy } from "./zones.js";
import { fmt, josa, short, pay } from "./economy.js";

export const SETS = ZONES.map((z) => z.key);
/** A set's short name (the piece's name: "던전 투구"). */
export const SET_KO = { dungeon: "던전", sunlit: "햇살", ice: "얼음", moss: "이끼", lava: "용암", crystal: "수정", throne: "왕좌", astral: "성소" };
export const SLOTS = ["h", "t", "w"];
export const SLOT_KO = { h: "투구", t: "갑옷", w: "무기" };
/** Each zone's color: the strip under a piece and its name. */
export const SET_COLOR = { dungeon: "#9aa3b8", sunlit: "#e6cf8e", ice: "#8fd0ee", moss: "#6fbf7a", lava: "#ff8a3a", crystal: "#b48cf0", throne: "#e0b040", astral: "#7ae0c8" };
const BASE = { dungeon: 300, sunlit: 300, ice: 500, moss: 600, lava: 800, crystal: 1000, throne: 1500, astral: 800 };
const MUL = { h: 1, w: 1.5, t: 2 };
export const price = (set, slot) => Math.round(BASE[set] * MUL[slot]);
// The sanctum set (the rebirth's): star shards on top of the gold, no loot, and each piece
// upgrades twice (hero.up[slot]: 0..2) into a more splendid look.
const SHARD = { astral: { h: 6, w: 9, t: 12 } };
export const shardPrice = (set, slot) => SHARD[set]?.[slot] ?? 0;
export const GEAR_UP = [{ h: 6, w: 8, t: 10, gold: 500 }, { h: 8, w: 10, t: 12, gold: 800 }];
export const UP_SET = "astral";
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

export const emptyHero = () => ({ sex: "m", rank: null, own: {}, eq: { h: null, t: null, w: null }, up: { h: 0, t: 0, w: 0 } });
/** eco.hero as stored, filled in (an old or broken value never throws; a worn piece that isn't owned comes off). */
export function readHero(eco) {
  const v = eco?.hero && typeof eco.hero === "object" ? eco.hero : {};
  const own = {};
  if (v.own && typeof v.own === "object") for (const k of Object.keys(v.own)) { const [s, l] = k.split("-"); if (v.own[k] && valid(s, l)) own[k] = 1; }
  const eq = {};
  for (const l of SLOTS) { const s = v.eq?.[l]; eq[l] = s && own[`${s}-${l}`] ? s : null; }
  const up = {};
  for (const l of SLOTS) up[l] = own[`${UP_SET}-${l}`] ? Math.max(0, Math.min(GEAR_UP.length, Math.floor(Number(v.up?.[l]) || 0))) : 0;
  return { sex: v.sex === "f" ? "f" : "m", rank: RANKS.some((r) => r.key === v.rank) ? v.rank : null, own, eq, up };
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
  if (h.own[`${set}-${slot}`]) return { eco, ok: false, msg: `${name}: 이미 보유한 장비입니다` };
  const sh = shardPrice(set, slot);
  if (sh) { const s = short(eco, { shard: sh, gold: p }); if (s) return { eco, ok: false, msg: `${name}: ${s}` }; }
  if ((eco.gold ?? 0) < p) return { eco, ok: false, msg: `${name}: 골드가 ${fmt(p - (eco.gold ?? 0))} G 부족합니다` };
  return { eco: { ...pay(eco, { shard: sh, gold: p }), hero: { ...h, own: { ...h.own, [`${set}-${slot}`]: 1 } } }, ok: true, msg: `${josa(name, "을/를")} 구매했습니다 · 인벤토리에 넣었습니다` };
}

/** A sanctum piece's next upgrade (two in all): shards and gold. */
export function upgradeGear(eco, slot) {
  const h = readHero(eco);
  if (!SLOTS.includes(slot) || !h.own[`${UP_SET}-${slot}`]) return { eco, ok: false, msg: "보유하지 않은 장비입니다" };
  const name = pieceName(UP_SET, slot), up = h.up[slot];
  if (up >= GEAR_UP.length) return { eco, ok: false, msg: `${name}: 더 승급할 수 없습니다` };
  const c = { shard: GEAR_UP[up][slot], gold: GEAR_UP[up].gold };
  const s = short(eco, c);
  if (s) return { eco, ok: false, msg: `${name} 승급: ${s}` };
  return { eco: { ...pay(eco, c), hero: { ...h, up: { ...h.up, [slot]: up + 1 } } }, ok: true, msg: `${josa(name, "이/가")} ${up + 2}단계로 승급했습니다` };
}

/** Puts an owned piece on (whatever was in that slot goes back to the bag). */
export function equip(eco, set, slot) {
  const h = readHero(eco);
  if (!valid(set, slot) || !h.own[`${set}-${slot}`]) return { eco, ok: false, msg: "보유하지 않은 장비입니다" };
  return { eco: put(eco, { ...h, eq: { ...h.eq, [slot]: set } }), ok: true, msg: `${pieceName(set, slot)} 착용` };
}
/** Takes a slot's piece off, back into the bag. */
export function unequip(eco, slot) {
  const h = readHero(eco);
  const s = h.eq[slot];
  if (!s) return { eco, ok: false, msg: null };
  return { eco: put(eco, { ...h, eq: { ...h.eq, [slot]: null } }), ok: true, msg: `${josa(pieceName(s, slot), "을/를")} 해제했습니다` };
}
/** The sidebar's slot buttons: the next owned piece for the slot, then none, round and round. */
export function cycle(eco, slot) {
  const h = readHero(eco);
  if (!SLOTS.includes(slot)) return { eco, ok: false, msg: null };
  const opts = [null, ...SETS.filter((s) => h.own[`${s}-${slot}`])];
  if (opts.length === 1) return { eco, ok: false, msg: `보유한 ${josa(SLOT_KO[slot], "이/가")} 없습니다 · 상점에서 구매할 수 있습니다` };
  const next = opts[(opts.indexOf(h.eq[slot]) + 1) % opts.length];
  return { eco: put(eco, { ...h, eq: { ...h.eq, [slot]: next } }), ok: true, msg: next ? `${pieceName(next, slot)} 착용` : `${SLOT_KO[slot]} 없음` };
}

// ---- the shop's gear tab: a pick per slot, tried on and bought together ----
/** The picks ({ h, t, w }: a set or null each) as rows in slot order, each with its state:
 *  "worn", "own" (owned, not worn), "lock" (its zone isn't open: try on only) or "buy".
 *  buy: the rows to buy, total: their price, short: gold missing, wear: owned rows not worn. */
export function quote(eco, picks = {}, at = {}) {
  const h = readHero(eco);
  const rows = SLOTS.filter((l) => valid(picks?.[l], l)).map((slot) => {
    const set = picks[slot], own = Boolean(h.own[`${set}-${slot}`]);
    const state = own ? (h.eq[slot] === set ? "worn" : "own") : setOpen(set, at) ? "buy" : "lock";
    return { slot, set, name: pieceName(set, slot), price: price(set, slot), shard: shardPrice(set, slot), state };
  });
  const buy = rows.filter((r) => r.state === "buy");
  const total = buy.reduce((a, r) => a + r.price, 0), shards = buy.reduce((a, r) => a + r.shard, 0);
  return { rows, buy, total, shards, short: Math.max(0, total - (eco.gold ?? 0)), shardShort: Math.max(0, shards - (Number(eco.shards) || 0)), wear: rows.filter((r) => r.state === "own") };
}
/** Buys every buyable pick at once, or none of them (short of gold). They go into the bag. */
export function buyMany(eco, picks, at = {}) {
  const q = quote(eco, picks, at);
  if (!q.buy.length) return { eco, ok: false, msg: "구매할 장비가 없습니다" };
  if (q.short > 0 || q.shardShort > 0) return { eco, ok: false, msg: short(eco, { shard: q.shards, gold: q.total }) };
  const h = readHero(eco), own = { ...h.own };
  for (const r of q.buy) own[`${r.set}-${r.slot}`] = 1;
  const what = q.buy.length === 1 ? josa(q.buy[0].name, "을/를") : `${q.buy.length}개를`;
  return { eco: { ...pay(eco, { shard: q.shards, gold: q.total }), hero: { ...h, own } }, ok: true, msg: `${what} 구매했습니다 · 인벤토리에 넣었습니다` };
}
/** Puts on every owned pick not worn yet (the picks tried on, kept). */
export function equipMany(eco, picks) {
  const q = quote(eco, picks);
  if (!q.wear.length) return { eco, ok: false, msg: "착용할 장비가 없습니다" };
  const h = readHero(eco), eq = { ...h.eq };
  for (const r of q.wear) eq[r.slot] = r.set;
  return { eco: put(eco, { ...h, eq }), ok: true, msg: q.wear.length === 1 ? `${q.wear[0].name} 착용` : `${q.wear.length}개를 착용했습니다` };
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
export function layers(sex, rank, eq = {}, up = {}) {
  const ok = (l) => (eq[l] && SETS.includes(eq[l]) ? eq[l] : null);
  const h = ok("h"), t = ok("t"), w = ok("w");
  // The sanctum set: a drawing per upgrade; its helmet leaves the head as the dungeon's does.
  const g = (l, set) => (set === UP_SET ? `${set}${1 + Math.max(0, Math.min(GEAR_UP.length, Math.floor(Number(up?.[l]) || 0)))}` : set);
  const head = h === UP_SET ? "dungeon" : h || "x";
  const out = [`hero/bg-${sex}-${rank}`];
  if (w) out.push(`hero/gw-${sex}-${g("w", w)}`);
  if (!t) return h === UP_SET ? [...out, `hero/fg-${sex}-${rank}-${head}`, `hero/gh-${sex}-${g("h", h)}`] : [...out, `hero/fg-${sex}-${rank}-${head}`];
  out.push(`hero/hd-${sex}-${rank}-${head}`, `hero/ga-${sex}-${g("t", t)}`, `hero/ho-${sex}-${rank}-${head}`);
  if (h) out.push(`hero/gh-${sex}-${g("h", h)}`);
  return out;
}
/** A piece's icon (the bag, the slots, the shop): the sanctum set's by its upgrade. */
export const icon = (set, slot, up = {}, k = slot) => `hero/it-${set === UP_SET ? `${set}${1 + Math.max(0, Math.min(GEAR_UP.length, Math.floor(Number(up?.[slot]) || 0)))}` : set}-${k}`;
/** The portrait's size (120 x 131 cells, one px each, as the confirmed mockup has it). */
export const PORTRAIT = [120, 131];
