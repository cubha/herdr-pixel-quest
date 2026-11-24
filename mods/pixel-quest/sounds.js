// Pixel Quest's alert sound sets, picked in the settings' 알림 tab: Herdr's own, the
// 8-bit quest sounds, three for gold, one with a medal, one with the full loot dex.
// Each has a done and a needs-input sound (sounds/, art-src/gen_sounds.py); the pick
// goes into Herdr's settings.json (sounds.done / sounds.blocked), which plays them.
// Bought sets live in pq.eco.sounds: [key]. No Herdr imports (tests/sounds.test.mjs).
// Copyright (c) 2026 cubha. MIT License.

import { fmt, josa, medalOf } from "./economy.js";
import { dexCount, ITEMS } from "./loot.js";

const DIR = "mods/pixel-quest/sounds";
export const SOUND_SETS = [
  { key: "herdr", name: "Herdr 기본", desc: "Herdr의 소리", open: {} },
  { key: "q8", name: "8비트 퀘스트", desc: "처음부터 쓰던 소리", open: {} },
  { key: "box", name: "오르골", desc: "잔잔한 종소리", open: { gold: 500 } },
  { key: "arcade", name: "아케이드", desc: "빠른 삑삑 소리", open: { gold: 800 } },
  { key: "slime", name: "슬라임", desc: "통통 튀는 소리", open: { gold: 1200 } },
  { key: "horn", name: "용사의 나팔", desc: "짧은 팡파르", open: { medal: "knight" } },
  { key: "chest", name: "보물 상자", desc: "뚜껑 소리와 금화", open: { dex: ITEMS.length } },
];
export const soundBy = (key) => SOUND_SETS.find((s) => s.key === key) ?? null;

/** The file a set plays for kind ("done" | "blocked"); null for Herdr's own. */
export function soundFile(key, kind) {
  if (key === "herdr" || !soundBy(key)) return null;
  return key === "q8" ? `${DIR}/quest-${kind}.mp3` : `${DIR}/${key}-${kind}.mp3`;
}

/** The set settings.json plays now: by its done file; no file is Herdr's own; a file of
 *  someone's own is null. */
export function soundNow(data) {
  const f = data?.sounds?.done;
  if (!f) return "herdr";
  return SOUND_SETS.find((s) => s.key !== "herdr" && soundFile(s.key, "done") === f)?.key ?? null;
}

const bought = (eco) => (Array.isArray(eco?.sounds) ? eco.sounds : []);
/** Can the set be picked? */
export function soundOpen(eco, key) {
  const s = soundBy(key);
  if (!s) return false;
  const o = s.open;
  if (o.gold) return bought(eco).includes(key);
  if (o.medal) return Boolean(eco?.medals?.[o.medal]);
  if (o.dex) return dexCount(eco) >= o.dex;
  return true;
}

/** How a set opens, as its row says it. */
export function howOpenSound(key) {
  const o = soundBy(key)?.open ?? {};
  if (o.gold) return `${fmt(o.gold)} G`;
  if (o.medal) return `훈장 "${medalOf(o.medal)?.name ?? o.medal}"`;
  if (o.dex) return `전리품 도감 ${o.dex}종`;
  return "처음부터";
}

/** Opens a gold set (no selling back). */
export function buySound(eco, key) {
  const s = soundBy(key);
  if (!s || !s.open.gold) return { eco, ok: false, msg: "골드로 여는 세트가 아닙니다" };
  if (soundOpen(eco, key)) return { eco, ok: false, msg: `${s.name}: 이미 열린 세트입니다` };
  const g = eco.gold ?? 0;
  if (g < s.open.gold) return { eco, ok: false, msg: `${s.name}: 골드가 ${fmt(s.open.gold - g)} G 부족합니다` };
  return { eco: { ...eco, gold: g - s.open.gold, sounds: [...bought(eco), key] }, ok: true, msg: `${josa(s.name, "이/가")} 열렸습니다 · [고르기]로 바꿀 수 있습니다` };
}

/** settings.json with the set picked (data: the parsed file; the rest is kept). */
export function pickSound(data, eco, key) {
  const s = soundBy(key);
  if (!s) return { data, ok: false, msg: "없는 세트입니다" };
  if (!soundOpen(eco, key)) return { data, ok: false, msg: `${s.name}: 여는 조건 ${howOpenSound(key)}` };
  const sounds = { ...(data?.sounds ?? {}), enabled: data?.sounds?.enabled ?? true };
  if (key === "herdr") { delete sounds.done; delete sounds.blocked; }
  else { sounds.done = soundFile(key, "done"); sounds.blocked = soundFile(key, "blocked"); }
  return { data: { ...data, sounds }, ok: true, msg: `${s.name} 소리로 바꿨습니다` };
}
