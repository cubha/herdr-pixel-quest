// Pixel Quest rebirth: at Lv.20 a run can start over under one more star (five at most).
// Only the run's level goes; unlocks and medals follow the best level ever. Each star makes
// quests worth more EXP, and star shards pay for the star shop (with gold): ten at a rebirth,
// twenty along each later run's levels, and one for every 40 EXP past Lv.20 at any time.
// Lives in pq.eco: stars, shards, shardLv (the run's levels already paid shards for),
// over (overflow shards already paid in this run), frames (bought frames). The run's EXP is
// pq.quests. No Herdr imports, so tests/reborn.test.mjs runs it under node.
// Copyright (c) 2026 cubha. MIT License.

import { total, levelOf, MAX_LV } from "./progress.js";
import { PETS_STAR, PET_UP, short, pay, costText } from "./economy.js";
import { price, shardPrice, GEAR_UP, SLOTS } from "./gear.js";
import { soundBy } from "./sounds.js";

export const MAX_STARS = 5;
const MULT = [1, 1.5, 2, 2.5, 3, 3];
/** EXP a quest is worth under that many stars. */
export const mult = (stars) => MULT[Math.max(0, Math.min(MAX_STARS, Math.floor(Number(stars) || 0)))];
/** EXP a run takes to Lv.20. */
export const FULL = total(MAX_LV);
export const REBORN_SHARDS = 10;
/** Shards along a run's levels (from the first rebirth on). */
export const LV_SHARDS = { 5: 2, 10: 2, 13: 2, 15: 4, 17: 2, 18: 2, 19: 2, 20: 4 };
/** EXP past Lv.20 per shard. */
export const OVER = 40;

const int = (v, lo, hi = Infinity) => Math.max(lo, Math.min(hi, Math.floor(Number(v) || 0)));
/** The rebirth part of pq.eco, filled in (an old or broken value never throws). */
export function readReborn(eco) {
  return { stars: int(eco?.stars, 0, MAX_STARS), shards: int(eco?.shards, 0), shardLv: int(eco?.shardLv, 1, MAX_LV) || 1, over: int(eco?.over, 0) };
}

/** Pays the shards a run's EXP has earned and not been paid yet (every quest, and once at
 *  start for what came before). Returns { eco, got }; the same state back when nothing is due. */
export function settle(eco, exp) {
  const r = readReborn(eco), x = Math.max(0, Number(exp) || 0);
  let got = 0, shardLv = r.shardLv;
  if (r.stars > 0) {
    const lv = Math.min(MAX_LV, levelOf(x));
    for (let l = r.shardLv + 1; l <= lv; l++) got += LV_SHARDS[l] ?? 0;
    shardLv = Math.max(r.shardLv, lv);
  }
  const over = Math.max(r.over, Math.floor(Math.max(0, x - FULL) / OVER));
  got += over - r.over;
  if (!got && shardLv === r.shardLv) return { eco, got: 0 };
  return { eco: { ...eco, shards: r.shards + got, shardLv, over }, got };
}

/** EXP still to go to the next overflow shard (null below Lv.20). */
export const overLeft = (exp) => (exp >= FULL ? OVER - ((exp - FULL) % OVER) : null);

export const canReborn = (eco, lv) => (Number(lv) || 1) >= MAX_LV && readReborn(eco).stars < MAX_STARS;
/** The shards a rebirth pays at this EXP: ten, and one more for overflow EXP on its way to
 *  the next shard (what is left of it would be lost with the run, so it is rounded up). */
export const rebornShards = (exp) => REBORN_SHARDS + ((Number(exp) || 0) > FULL && (exp - FULL) % OVER > 0 ? 1 : 0);
/** One more star, the shards, and the run starts over (the caller sets pq.quests to 0).
 *  exp: the run's EXP (settled first, so nothing earned goes unpaid). */
export function reborn(eco, lv, exp = 0) {
  const r = readReborn(eco);
  if (r.stars >= MAX_STARS) return { eco, ok: false, msg: "성급을 모두 올렸습니다." };
  if ((Number(lv) || 1) < MAX_LV) return { eco, ok: false, msg: `환생은 Lv.${MAX_LV}부터 가능합니다.` };
  const paid = settle(eco, exp).eco, got = rebornShards(exp);
  return { eco: { ...paid, stars: r.stars + 1, shards: readReborn(paid).shards + got, shardLv: 1, over: 0, lvPaid: 1 }, ok: true, got,
    msg: `★${r.stars + 1}로 환생했습니다. 별조각 ${got}개를 받았습니다.` };
}

// ---- the star frame ----
export const FRAME_COST = { shard: 4, gold: 300 };
export const hasFrame = (eco, key = "star") => Array.isArray(eco?.frames) && eco.frames.includes(key);
export function buyFrame(eco) {
  if (!readReborn(eco).stars) return { eco, ok: false, msg: "별 액자는 첫 환생 뒤에 구매할 수 있습니다" };
  if (hasFrame(eco)) return { eco, ok: false, msg: "별 액자: 이미 보유한 액자입니다" };
  const s = short(eco, FRAME_COST);
  if (s) return { eco, ok: false, msg: `별 액자: ${s}` };
  return { eco: { ...pay(eco, FRAME_COST), frames: [...(Array.isArray(eco.frames) ? eco.frames : []), "star"] }, ok: true, msg: "별 액자를 구매했습니다 · 모험 일지에서 고를 수 있습니다" };
}

/** Everything the star shop sells, in its order: [{ id, name, shard, gold }]. */
export function priceList() {
  const SLOT = { h: "투구", w: "무기", t: "갑옷" }, order = ["h", "w", "t"].filter((l) => SLOTS.includes(l));
  const snd = soundBy("star").open;
  return [
    { id: "pet", name: PETS_STAR.name, shard: PETS_STAR.shard, gold: PETS_STAR.price },
    ...order.map((l) => ({ id: `gear-${l}`, name: `성소 ${SLOT[l]}`, shard: shardPrice("astral", l), gold: price("astral", l) })),
    { id: "sound", name: "별 효과음", shard: snd.shard, gold: snd.gold },
    { id: "frame", name: "별 액자", ...FRAME_COST },
    ...PET_UP.map((c, i) => ({ id: `pet-up${i + 1}`, name: `정령 승급 ${i + 1}차`, ...c })),
    ...GEAR_UP.flatMap((c, i) => order.map((l) => ({ id: `gear-${l}-up${i + 1}`, name: `성소 ${SLOT[l]} 승급 ${i + 1}차`, shard: c[l], gold: c.gold }))),
  ];
}
export { costText };
