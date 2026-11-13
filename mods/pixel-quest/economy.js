// Pixel Quest economy: gold, medals, the pet shop and the pet's moods.
// Plain data and arithmetic (no Herdr imports) so tests/economy.test.mjs can run it
// under node. Everything lives in one shared value, `pq.eco`:
//   { gold, earned, total, lvPaid, days, medals, pets, pet, qseasons, partyMax, zones }
// total: quests ever (a quest reset leaves it), lvPaid: the best level already paid
// for (level-up gold follows pq.best, so a reset never pays twice), days: quests per
// day (YYYY-MM-DD, the last 60), medals: id -> when, pets: key -> { bond }, pet: the
// one along, qseasons: seasons with a quest in them, partyMax: most agents working
// at once, zones: the zones bought in the shop (zones.js). Gold, medals, pets and zones are looks only: nothing here locks a feature.
// Copyright (c) 2026 cubha. MIT License.

import { ZONES } from "./zones.js";

export const GOLD = { quest: 10, level: 50, bronze: 100, silver: 300, gold: 1000 };

/** Thousands with commas (this runtime's toLocaleString may ignore the locale). */
export const fmt = (n) => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

// price 0: not for sale, comes with the medal.
export const PETS = [
  { key: "slime", name: "슬라임", price: 300 },
  { key: "mushroom", name: "빛버섯", price: 500 },
  { key: "bat", name: "박쥐", price: 800 },
  { key: "cat", name: "고양이", price: 1200 },
  { key: "ghost", name: "유령", price: 1800 },
  { key: "ember", name: "불씨 정령", price: 2500 },
  { key: "mimic", name: "미믹", price: 3500 },
  { key: "dragon", name: "새끼 용", price: 5000 },
  { key: "goldslime", name: "황금 슬라임", price: 0, medal: "veteran" },
  { key: "owl", name: "부엉이", price: 0, medal: "owl" },
  { key: "rooster", name: "수탉", price: 0, medal: "rooster" },
  { key: "crownkit", name: "왕관 고양이", price: 0, medal: "legend" },
];
export const petOf = (key) => PETS.find((p) => p.key === key);

// unit: what the remaining count is in (개 = quests, for the bubble's nearest medal).
export const MEDALS = [
  { id: "first", art: "bronze-sword", name: "첫 걸음", cond: "첫 퀘스트 완료" },
  { id: "veteran", art: "silver-sword", name: "백전노장", cond: "100번째 퀘스트" },
  { id: "thousand", art: "gold-sword", name: "천 번의 모험", cond: "1,000번째 퀘스트" },
  { id: "busy", art: "bronze-sun", name: "부지런한 하루", cond: "하루에 10개" },
  { id: "blaze", art: "silver-sun", name: "불타는 하루", cond: "하루에 30개" },
  { id: "streak3", art: "bronze-flame", name: "사흘 출석", cond: "3일 연속" },
  { id: "streak7", art: "silver-flame", name: "일주일 출석", cond: "7일 연속" },
  { id: "streak30", art: "gold-flame", name: "한 달 출석", cond: "30일 연속" },
  { id: "owl", art: "silver-moon", name: "올빼미", cond: "0시~4시에 퀘스트 완료" },
  { id: "rooster", art: "bronze-dawn", name: "새벽닭", cond: "5시~7시에 퀘스트 완료" },
  { id: "party", art: "silver-four", name: "풀 파티", cond: "에이전트 4명이 동시에 작업" },
  { id: "knight", art: "silver-crown", name: "기사 서임", cond: "Lv.10 도달" },
  { id: "legend", art: "gold-crown", name: "전설", cond: "Lv.20 도달" },
  { id: "seasons", art: "gold-leaf", name: "사계절 순례", cond: "봄·여름·가을·겨울에 각각 퀘스트" },
  { id: "tamer", art: "silver-paw", name: "조련사", cond: "펫 5마리" },
  { id: "dex", art: "gold-paw", name: "도감 완성", cond: "펫 12마리 전부" },
  { id: "all", art: "gold-star", name: "모든 훈장", cond: "다른 훈장 16개 전부" },
];
export const medalOf = (id) => MEDALS.find((m) => m.id === id);
export const tierOf = (m) => m.art.split("-")[0];
export const medalGold = (m) => GOLD[tierOf(m)];
/** The zone a medal opens (zones.js), or null. */
export const medalZone = (m) => ZONES.find((z) => z.open?.medal === m.id) ?? null;
/** The pet a medal brings, if any. */
export const medalPet = (m) => PETS.find((p) => p.medal === m.id) ?? null;

// ---- days and seasons ----
const two = (n) => String(n).padStart(2, "0");
export const dayKey = (d) => `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
export const seasonOf = (month) => (month >= 3 && month <= 5 ? "spring" : month >= 6 && month <= 8 ? "summer" : month >= 9 && month <= 11 ? "autumn" : "winter");
export const SEASON_KO = { spring: "봄", summer: "여름", autumn: "가을", winter: "겨울" };

/** One more quest on day key, keeping the last `keep` days. */
export function addDay(days, key, keep = 60) {
  const d = { ...(days ?? {}) };
  d[key] = (d[key] ?? 0) + 1;
  const keys = Object.keys(d).sort();
  for (const k of keys.slice(0, Math.max(0, keys.length - keep))) delete d[k];
  return d;
}

/** Days in a row with a quest, ending today (or yesterday while today has none yet). */
export function streak(days, now) {
  const d = days ?? {};
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!d[dayKey(day)]) day.setDate(day.getDate() - 1);
  let n = 0;
  while (d[dayKey(day)]) { n++; day.setDate(day.getDate() - 1); }
  return n;
}

// ---- the state ----
export const empty = () => ({ gold: 0, earned: 0, total: 0, lvPaid: 1, days: {}, medals: {}, pets: {}, pet: null, qseasons: [], partyMax: 0, zones: [] });
/** pq.eco as stored, filled in (an old or broken value never throws). */
export function read(v) {
  const e = { ...empty(), ...(v && typeof v === "object" ? v : {}) };
  for (const k of ["days", "medals", "pets"]) if (!e[k] || typeof e[k] !== "object" || Array.isArray(e[k])) e[k] = {};
  if (!Array.isArray(e.qseasons)) e.qseasons = [];
  if (!Array.isArray(e.zones)) e.zones = [];
  return e;
}
const owned = (eco) => Object.keys(eco.pets).length;
const today = (eco, now) => eco.days[dayKey(now)] ?? 0;

// have / need for the counted medals; hour medals are met at the quest's moment.
function count(m, eco, ctx) {
  const now = ctx.now, best = ctx.best ?? 1;
  switch (m.id) {
    case "first": return [eco.total, 1];
    case "veteran": return [eco.total, 100];
    case "thousand": return [eco.total, 1000];
    case "busy": return [today(eco, now), 10];
    case "blaze": return [today(eco, now), 30];
    case "streak3": return [streak(eco.days, now), 3];
    case "streak7": return [streak(eco.days, now), 7];
    case "streak30": return [streak(eco.days, now), 30];
    case "party": return [eco.partyMax, 4];
    case "knight": return [best, 10];
    case "legend": return [best, 20];
    case "seasons": return [new Set(eco.qseasons).size, 4];
    case "tamer": return [owned(eco), 5];
    case "dex": return [owned(eco), 12];
    case "all": return [MEDALS.filter((x) => x.id !== "all" && eco.medals[x.id]).length, 16];
    default: return null;
  }
}
const met = (m, eco, ctx) => {
  if (m.id === "owl") return ctx.hour != null && ctx.hour < 5;
  if (m.id === "rooster") return ctx.hour != null && ctx.hour >= 5 && ctx.hour < 7;
  const c = count(m, eco, ctx);
  return c[0] >= c[1];
};

/** How far a medal is: { done, have, need, text } (text as the adventure log shows it). */
export function progressOf(m, eco, ctx) {
  const done = Boolean(eco.medals[m.id]);
  const c = count(m, eco, ctx);
  const [have, need] = c ?? [0, 0];
  if (done) return { done, have, need, text: "받음" };
  let text = "";
  if (["first", "veteran", "thousand", "tamer", "dex", "all"].includes(m.id)) text = `${fmt(have)} / ${fmt(need)}`;
  else if (m.id === "busy" || m.id === "blaze") text = `오늘 ${have} / ${need}`;
  else if (m.id.startsWith("streak")) text = `${have} / ${need}일`;
  else if (m.id === "party") text = `지금까지 최대 ${have}명`;
  else if (m.id === "knight" || m.id === "legend") text = `지금 Lv.${have}`;
  else if (m.id === "seasons") text = `${["spring", "summer", "autumn", "winter"].filter((s) => eco.qseasons.includes(s)).map((s) => SEASON_KO[s]).join("·")} ${have} / 4`.trim();
  return { done, have, need, text };
}

/** Gives every medal now met (gold, and a medal's pet, which comes along if none is),
 *  over and over until nothing new: a pet can complete 조련사, the 16th medal 모든 훈장. */
export function award(eco, ctx) {
  let e = eco;
  const got = [];
  for (let again = true; again;) {
    again = false;
    for (const m of MEDALS) {
      if (e.medals[m.id] || !met(m, e, ctx)) continue;
      const g = medalGold(m), pet = medalPet(m);
      e = { ...e, medals: { ...e.medals, [m.id]: ctx.now.getTime() }, gold: e.gold + g, earned: e.earned + g };
      if (pet && !e.pets[pet.key]) e = { ...e, pets: { ...e.pets, [pet.key]: { bond: 0 } }, pet: e.pet ?? pet.key };
      got.push(m);
      again = true;
    }
  }
  return { eco: e, got };
}

/** Update day: gold for the quests and levels already done, then the medals already met. */
export function start(quests, best, now) {
  const q = Math.max(0, Number(quests) || 0), b = Math.max(1, Number(best) || 1);
  const g = q * GOLD.quest + (b - 1) * GOLD.level;
  return award({ ...empty(), gold: g, earned: g, total: q, lvPaid: b }, { now, best: b });
}

/** A finished quest. ctx: { now, best (after this quest), working }. Returns the new
 *  state, the medals it brought and all the gold it made. */
export function onQuest(eco, ctx) {
  const now = ctx.now, best = Math.max(1, ctx.best ?? 1);
  const lv = Math.max(0, best - eco.lvPaid);
  const g = GOLD.quest + lv * GOLD.level;
  const season = seasonOf(now.getMonth() + 1);
  let e = {
    ...eco,
    gold: eco.gold + g, earned: eco.earned + g, total: eco.total + 1, lvPaid: Math.max(eco.lvPaid, best),
    days: addDay(eco.days, dayKey(now)),
    qseasons: eco.qseasons.includes(season) ? eco.qseasons : [...eco.qseasons, season],
    partyMax: Math.max(eco.partyMax, ctx.working ?? 0),
  };
  if (e.pet && e.pets[e.pet]) e = { ...e, pets: { ...e.pets, [e.pet]: { ...e.pets[e.pet], bond: (e.pets[e.pet].bond ?? 0) + 1 } } };
  const r = award(e, { now, best, hour: now.getHours() });
  return { eco: r.eco, got: r.got, gained: r.eco.gold - eco.gold };
}

/** Agents working right now (the full-party medal). Same state back when nothing moves. */
export function onParty(eco, working, ctx) {
  if (working <= eco.partyMax) return { eco, got: [] };
  return award({ ...eco, partyMax: working }, ctx);
}

/** Buys a shop pet at once (no confirmation, no selling back). The first pet comes along. */
export function buy(eco, key, ctx = { now: new Date() }) {
  const p = petOf(key);
  if (!p || !p.price) return { eco, ok: false, got: [], msg: p ? `${p.name}: 상점에서 팔지 않습니다` : "없는 펫입니다" };
  if (eco.pets[key]) return { eco, ok: false, got: [], msg: `${p.name}: 이미 가진 펫입니다` };
  if (eco.gold < p.price) return { eco, ok: false, got: [], msg: `${p.name}: ${fmt(p.price - eco.gold)} G가 모자랍니다` };
  const e = { ...eco, gold: eco.gold - p.price, pets: { ...eco.pets, [key]: { bond: 0 } }, pet: eco.pet ?? key };
  const r = award(e, { best: 1, ...ctx });
  return { eco: r.eco, ok: true, got: r.got, msg: `${p.name}을(를) 샀습니다. 도감에서 데려갈 수 있습니다` };
}

// Zones for sale (the rest open by level or medal): price and name from zones.js, one place.
export const ZONE_PRICE = Object.fromEntries(ZONES.filter((z) => z.open.gold).map((z) => [z.key, z.open.gold]));
const ZONE_KO = Object.fromEntries(ZONES.map((z) => [z.key, z.name]));

/** Buys a zone at once (no selling back). It shows from the settings' 모양 tab. */
export function buyZone(eco, key) {
  const price = ZONE_PRICE[key], name = ZONE_KO[key];
  if (!price) return { eco, ok: false, msg: "상점에서 팔지 않는 구역입니다" };
  const have = Array.isArray(eco.zones) ? eco.zones : [];
  if (have.includes(key)) return { eco, ok: false, msg: `${name}: 이미 열린 구역입니다` };
  if (eco.gold < price) return { eco, ok: false, msg: `${name}: ${fmt(price - eco.gold)} G가 모자랍니다` };
  return { eco: { ...eco, gold: eco.gold - price, zones: [...have, key] }, ok: true, msg: `${name}이(가) 열렸습니다. 설정 · 모양에서 고를 수 있습니다` };
}

/** How to get a pet, as the dex says it. */
export const howTo = (p) => (p.price ? `상점에서 ${fmt(p.price)} G` : `훈장 "${medalOf(p.medal).name}"`);

/** The pet along (an owned one), or none (null). */
export function choose(eco, key) {
  if (key == null) return { eco: { ...eco, pet: null }, ok: true, msg: "펫 없이 다닙니다" };
  const p = petOf(key);
  if (!p) return { eco, ok: false, msg: "없는 펫입니다" };
  if (!eco.pets[key]) return { eco, ok: false, msg: `얻는 방법: ${howTo(p)}` };
  return { eco: { ...eco, pet: key }, ok: true, msg: `${p.name}와(과) 함께 다닙니다` };
}

// ---- the pet on the status bar ----
export const GROW = [50, 200];
export const stageOf = (bond) => ((bond ?? 0) >= GROW[1] ? 3 : (bond ?? 0) >= GROW[0] ? 2 : 1);
export const SIZE = { 1: [24, 20], 2: [28, 24], 3: [32, 28] };
/** The picture for a pet: stage by bond, crouched (asleep, drained) or up, facing right. */
export function petArt(key, bond, crouch, right) {
  const s = stageOf(bond);
  return { name: `pet-${key}-${s}-${crouch ? "s" : "a"}${right ? "-r" : ""}`, w: SIZE[s][0], h: SIZE[s][1] };
}

/** One mood at a time: waiting > a quest just done > drained > working > rest. */
// The speech bubble over the pet: it speaks up by itself, as things stand. A new wait for
// input, low battery or a quest just done says so at once; waiting and low battery say it
// again every 45 s while they last; otherwise the day's summary comes every 10 minutes.
// Each time it stays 6 s. (Hover keeps the same words as a tooltip, any time.)
export const TALK = { show: 6000, urgent: 45000, idle: 600000 };
/** The next talk state from t ({ mood, at }: the mood last seen and when the bubble last
 *  opened) at now: { mood, at, show } (show: open the bubble now). */
export function talkNext(t, mood, now) {
  const urgent = mood === "alert" || mood === "tired";
  if (mood !== t.mood) return (urgent || mood === "hop") ? { mood, at: now, show: true } : { mood, at: t.at, show: false };
  if (mood === "hop") return { ...t, show: false };
  return now - t.at >= (urgent ? TALK.urgent : TALK.idle) ? { mood, at: now, show: true } : { ...t, show: false };
}

export function moodOf({ blocked, hop, tired, working }) {
  return blocked ? "alert" : hop ? "hop" : tired ? "tired" : working ? "walk" : "sleep";
}

/** The fuller usage window at 80% or more, unless it has already reset. */
export function drained(usage, nowSec) {
  let worst = null;
  for (const [k, label] of [["five_hour", "5시간"], ["seven_day", "7일"]]) {
    const w = usage?.[k];
    if (!w || (w.resets_at && w.resets_at <= nowSec)) continue;
    const pct = Number(w.used_percentage) || 0;
    if (pct >= 80 && (!worst || pct > worst.pct)) worst = { label, pct: Math.round(pct) };
  }
  return worst;
}

/** Where the pet heads next, as a share of the lane from home (0) out: { x, ms, easing },
 *  or null to stay. Working: out to 45% (home three times in ten). Drained: a crawl of
 *  2-5% within 16% of home. Otherwise back home. */
export function nextSpot(mood, x, rand = Math.random) {
  if (mood === "walk") {
    const to = rand() < 0.3 ? 0 : rand() * 0.45;
    return { x: to, ms: Math.round(Math.abs(to - x) * 100 * 50 + 400), easing: "linear" };
  }
  if (mood === "tired") {
    const dir = rand() < 0.5 ? -1 : 1;
    const to = Math.max(0, Math.min(0.16, x + dir * (0.02 + rand() * 0.03)));
    return { x: to, ms: 2800, easing: "ease-in-out" };
  }
  if (x === 0) return null;
  return { x: 0, ms: Math.round(x * 100 * 50 + 400), easing: "linear" };
}

// 이 / 가 after a name: by the last syllable's final consonant (anything else: 이).
const subj = (w) => {
  const c = String(w).charCodeAt(String(w).length - 1);
  return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 === 0 ? "가" : "이";
};

/** The nearest medal still counted in quests: { m, left }. */
export function nearest(eco, ctx) {
  let best = null;
  for (const m of MEDALS) {
    if (eco.medals[m.id] || !["first", "veteran", "thousand", "busy", "blaze"].includes(m.id)) continue;
    const [have, need] = count(m, eco, ctx);
    const left = need - have;
    if (left > 0 && (!best || left < best.left)) best = { m, left };
  }
  return best;
}

/** The pet's speech bubble. o: { mood, who (the waiting agent), drain ({ label, pct }) }. */
export function bubble(eco, ctx, o = {}) {
  const t = today(eco, ctx.now);
  if (o.mood === "alert") return `${o.who}${subj(o.who)} 입력을 기다립니다 · 누르면 이동`;
  if (o.mood === "tired" && o.drain) return `방전! ${o.drain.label} 사용량 ${o.drain.pct}% · 누르면 사용량 카드`;
  if (o.mood === "hop") return `퀘스트 완료! +${GOLD.quest} G · 오늘 ${t}개째`;
  const n = nearest(eco, ctx);
  return `오늘 퀘스트 ${t}개 · 연속 ${streak(eco.days, ctx.now)}일` + (n ? ` · 훈장 "${n.m.name}"까지 ${n.left}개` : "");
}
