// Pixel Quest loot: each finished quest may drop one of the shown zone's five items.
// Commons and rares stack and pay for gear with the gold (a set's pieces take its own
// zone's items); a legendary is never spent: the first is for the dex, another is gold.
// All five of a zone once: gold and a title. Lives in pq.eco.loot:
//   { found: { "<zone>-<i>": 1 } (the dex: kept at stock 0), stock: { id: n }, titles: [name] }
// No Herdr imports, so tests/loot.test.mjs runs it under node.
// Copyright (c) 2026 cubha. MIT License.

import { ZONES, zoneBy } from "./zones.js";
import { fmt } from "./economy.js";
import { quote, buyMany } from "./gear.js";

/** Rarity by place in a zone's five: three commons, a rare, a legendary. */
export const RAR = ["c", "c", "c", "r", "l"];
export const RAR_KO = { c: "흔함", r: "희귀", l: "전설" };
/** The rarity's color (names, frames): plain, blue, gold. */
export const RAR_COLOR = { c: "#d8d2c0", r: "#6ab0ff", l: "#ffc94a" };
const N = (pairs) => pairs.map(([key, name]) => ({ key, name }));
/** Each zone's five (key: the picture, art/loot/<key>.png, art-src/gen_loot.py). */
export const LOOT = {
  dungeon: N([["key", "녹슨 열쇠"], ["bone", "뼛조각"], ["torch", "꺼진 횃불"], ["map", "낡은 지도"], ["ring", "옛 왕의 인장 반지"]]),
  sunlit: N([["feather", "깃털"], ["petal", "마른 꽃잎"], ["glass", "유리 조각"], ["sundial", "해시계 조각"], ["sunjar", "햇빛 담은 병"]]),
  ice: N([["icicle", "고드름 조각"], ["flake", "눈 결정"], ["fish", "언 물고기"], ["frost", "서리 꽃"], ["flame", "얼지 않는 불꽃"]]),
  moss: N([["mossrock", "이끼 돌"], ["shroom", "빛버섯 갓"], ["vine", "덩굴 매듭"], ["statue", "깨진 석상 얼굴"], ["seed", "숲의 심장 씨앗"]]),
  lava: N([["obsidian", "흑요석 조각"], ["lavarock", "식은 용암 덩이"], ["charbone", "그을린 뼈"], ["fireore", "불꽃 광석"], ["scale", "용의 비늘"]]),
  crystal: N([["amethyst", "자수정 조각"], ["pickaxe", "부러진 곡괭이 날"], ["lantern", "광부의 등불"], ["twin", "쌍둥이 수정"], ["prism", "무지개 원석"]]),
  throne: N([["coin", "금화 한 닢"], ["necklace", "끊어진 목걸이"], ["chalice", "은잔"], ["scepter", "왕홀 조각"], ["crown", "왕의 보석 왕관"]]),
};
/** Every item: { id ("<zone>-<i>"), zone, i, key, name, rar }, zones in order. */
export const ITEMS = Object.entries(LOOT).flatMap(([zone, xs]) => xs.map((x, i) => ({ id: `${zone}-${i}`, zone, i, key: x.key, name: x.name, rar: RAR[i] })));
const BY_ID = new Map(ITEMS.map((x) => [x.id, x]));
export const itemOf = (id) => BY_ID.get(id) ?? null;

/** A piece's materials from its set's zone: commons (any of the three) and rares. */
export const RECIPE = { h: { c: 3, r: 0 }, w: { c: 4, r: 1 }, t: { c: 5, r: 2 } };
/** chance: a drop per quest; c, r: the rarity split (the rest legendary). */
export const DROP = { chance: 0.25, c: 0.6, r: 0.3 };
export const GOLD = { legendAgain: 100, zoneDone: 300 };
const zoneName = (z) => zoneBy(z)?.name ?? z;
export const titleOf = (zone) => `${zoneName(zone)} 수집가`;

/** pq.eco.loot as stored, filled in (unknown items and bad counts dropped). */
export function readLoot(eco) {
  const v = eco?.loot && typeof eco.loot === "object" ? eco.loot : {};
  const found = {}, stock = {};
  if (v.found && typeof v.found === "object") for (const k of Object.keys(v.found)) if (v.found[k] && BY_ID.has(k)) found[k] = 1;
  if (v.stock && typeof v.stock === "object") for (const k of Object.keys(v.stock)) {
    const n = Math.floor(Number(v.stock[k]) || 0);
    if (n > 0 && BY_ID.has(k)) stock[k] = n;
  }
  const titles = Array.isArray(v.titles) ? v.titles.filter((t) => typeof t === "string") : [];
  return { found, stock, titles };
}
const put = (eco, loot) => ({ ...eco, loot });

/** Items of a zone found at least once (0..5), and in all (0..35). */
export const foundIn = (eco, zone) => { const f = readLoot(eco).found; return (LOOT[zone] ?? []).filter((_, i) => f[`${zone}-${i}`]).length; };
export const dexCount = (eco) => Object.keys(readLoot(eco).found).length;
/** How many of a zone's commons (rar "c") or rares ("r") are in stock. */
export function stockOf(eco, zone, rar) {
  const s = readLoot(eco).stock;
  return (LOOT[zone] ?? []).reduce((a, _, i) => a + (RAR[i] === rar ? s[`${zone}-${i}`] ?? 0 : 0), 0);
}
/** The latest title, or null. */
export const titleNow = (eco) => { const t = readLoot(eco).titles; return t.length ? t[t.length - 1] : null; };

/** A finished quest's drop from zone. rand: three draws (drop, rarity, which one).
 *  got: null, or { id, zone, key, name, rar, first, count (in stock now), gold, title }. */
export function drop(eco, zone, rand = Math.random) {
  if (!LOOT[zone] || rand() >= DROP.chance) return { eco, got: null };
  const x = rand(), rar = x < DROP.c ? "c" : x < DROP.c + DROP.r ? "r" : "l";
  const idx = RAR.map((v, i) => (v === rar ? i : -1)).filter((i) => i >= 0);
  const i = idx[Math.min(idx.length - 1, Math.floor(rand() * idx.length))];
  const it = itemOf(`${zone}-${i}`), l = readLoot(eco);
  const first = !l.found[it.id];
  const found = { ...l.found, [it.id]: 1 }, stock = { ...l.stock };
  let gold = 0, title = null;
  if (rar === "l") { if (!first) gold += GOLD.legendAgain; }
  else stock[it.id] = (stock[it.id] ?? 0) + 1;
  let titles = l.titles;
  if (first && LOOT[zone].every((_, j) => found[`${zone}-${j}`])) {
    title = titleOf(zone);
    if (!titles.includes(title)) { titles = [...titles, title]; gold += GOLD.zoneDone; } else title = null;
  }
  const e = { ...put(eco, { found, stock, titles }), gold: (eco.gold ?? 0) + gold, earned: (eco.earned ?? 0) + gold };
  return { eco: e, got: { id: it.id, zone, key: it.key, name: it.name, rar, first, count: stock[it.id] ?? 0, gold, title } };
}

// ---- gear materials (gear.js quote / buyMany, with the loot on top) ----
/** What the picks to buy need from each set's zone: sets: [{ set, c: { have, need }, r: { have, need } }]
 *  (zone order), missing: [{ set, c, r }] still short, short: any missing. */
export function mats(eco, picks, at = {}) {
  const q = quote(eco, picks, at);
  const need = {};
  for (const r of q.buy) {
    if (!need[r.set]) need[r.set] = { c: 0, r: 0 };
    const n = need[r.set];
    n.c += RECIPE[r.slot].c; n.r += RECIPE[r.slot].r;
  }
  const sets = ZONES.map((z) => z.key).filter((s) => need[s]).map((set) => ({
    set, c: { have: stockOf(eco, set, "c"), need: need[set].c }, r: { have: stockOf(eco, set, "r"), need: need[set].r },
  }));
  const missing = sets.map((m) => ({ set: m.set, c: Math.max(0, m.c.need - m.c.have), r: Math.max(0, m.r.need - m.r.have) })).filter((m) => m.c || m.r);
  return { sets, missing, short: missing.length > 0 };
}

/** Takes n of a zone's rarity, from the biggest pile each time (ties: the earlier item). */
function spend(stock, zone, rar, n) {
  const ids = (LOOT[zone] ?? []).map((_, i) => `${zone}-${i}`).filter((_, i) => RAR[i] === rar);
  for (let k = 0; k < n; k++) {
    let best = null;
    for (const id of ids) if ((stock[id] ?? 0) > 0 && (!best || stock[id] > stock[best])) best = id;
    if (!best) break;
    stock[best] -= 1;
    if (!stock[best]) delete stock[best];
  }
}

/** Buys every buyable pick with gold and materials at once, or none (short of either). */
export function buyWithMats(eco, picks, at = {}) {
  const q = quote(eco, picks, at);
  if (!q.buy.length) return buyMany(eco, picks, at);
  const m = mats(eco, picks, at);
  if (m.short) {
    const say = m.missing.map((x) => [x.c ? `${zoneName(x.set)} 흔함 ${x.c}개` : "", x.r ? `${zoneName(x.set)} 희귀 ${x.r}개` : ""].filter(Boolean).join(" · ")).join(" · ");
    return { eco, ok: false, msg: `재료가 부족합니다 · ${say}` };
  }
  const r = buyMany(eco, picks, at);
  if (!r.ok) return r;
  const l = readLoot(eco), stock = { ...l.stock };
  let used = 0;
  for (const x of m.sets) { spend(stock, x.set, "c", x.c.need); spend(stock, x.set, "r", x.r.need); used += x.c.need + x.r.need; }
  const msg = r.msg.replace(/ · 인벤토리에 넣었습니다$/, "") + ` · 재료 ${fmt(used)}개 사용`;
  return { eco: put(r.eco, { ...l, stock }), ok: true, msg };
}

