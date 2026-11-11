// Pixel Quest progress: the level curve and what each level unlocks.
// Plain data and arithmetic (no Herdr imports) so tests/progress.test.mjs can
// run it under node. Only looks are locked; every feature works from Lv.1.
//
// A quest is an agent finishing a piece of work (working/blocked -> done,
// counted by roles/status.js). From Lv.n the next level takes
// 5 + floor((n-1)^2 / 4) quests: 5 at first, 25 around Lv.10, 86 at Lv.19.
// Unlocks follow the best level ever reached (`pq.best`), so resetting the
// count never locks anything again. Copyright (c) 2026 cubha. MIT License.

/** Quests from Lv.n to Lv.n+1. */
export const need = (n) => 5 + Math.floor(((n - 1) * (n - 1)) / 4);

/** Quests needed in all to reach Lv.n (Lv.1 = 0). */
export function total(n) {
  let t = 0;
  for (let k = 1; k < n; k++) t += need(k);
  return t;
}

/** The level a quest count reaches. */
export function levelOf(q) {
  let l = 1;
  while (total(l + 1) <= (q ?? 0)) l++;
  return l;
}

/** Where q sits inside its level: { lv, q, from, to, left, frac }. */
export function progress(q) {
  q = Math.max(0, q ?? 0);
  const lv = levelOf(q), from = total(lv), to = total(lv + 1);
  return { lv, q, from, to, left: to - q, frac: (q - from) / (to - from) };
}

/** The level the first release showed: one up every five quests. */
export const oldLevel = (q) => 1 + Math.floor((q ?? 0) / 5);

/** Like progress(q), but never below floor (`pq.floor`: the old level kept on update
 *  day, so nobody's level drops; the curve takes over once it gets there). */
export function progressAt(q, floor) {
  q = Math.max(0, q ?? 0);
  const lv = Math.max(levelOf(q), Number(floor) || 1);
  const from = total(lv), to = total(lv + 1);
  return { lv, q, from, to, left: to - q, frac: Math.max(0, Math.min(1, (q - from) / (to - from))) };
}

/** The highest level reached: never lower than before. */
export function bestAfter(best, q) {
  return Math.max(Number(best) || 1, levelOf(q));
}

// ---- portraits: six shapes, eight colorways each (art-src/gen_faces.py) ----
export const SHAPES = ["helm", "hood", "wizard", "skull", "king", "slime"];
export const ROWS = {
  helm: ["gold", "steel", "bronze", "jade", "crimson", "azure", "obsidian", "rose"],
  hood: ["amber", "violet", "teal", "forest", "scarlet", "navy", "ash", "plum"],
  wizard: ["azure", "crimson", "forest", "violet", "obsidian", "ash", "gold", "teal"],
  skull: ["bone", "ash", "jade", "crimson", "gold", "obsidian", "frost", "violet"],
  king: ["gold", "silver", "bronze", "jade", "ruby", "sapphire", "obsidian", "rose"],
  slime: ["teal", "green", "blue", "pink", "purple", "orange", "red", "grey"],
};
/** Every portrait, picker order (row by row). */
export const FACES = SHAPES.flatMap((s) => ROWS[s].map((c) => `${s}-${c}`));
/** The sixteen of the first release, in their old auto order: auto picks start
 *  here (hash mod 16), so agents keep the portrait they had before the update. */
export const BASE = [
  "helm-gold", "hood-violet", "helm-steel", "hood-amber", "helm-jade", "hood-teal", "helm-crimson", "hood-navy",
  "helm-azure", "hood-forest", "helm-rose", "hood-scarlet", "helm-bronze", "hood-plum", "helm-obsidian", "hood-ash",
];

const SHAPE_KO = { helm: "투구", hood: "두건", wizard: "마법사", skull: "해골", king: "왕", slime: "슬라임" };
const COLOR_KO = {
  gold: "금", steel: "강철", bronze: "청동", jade: "비취", crimson: "진홍", azure: "하늘", obsidian: "흑요석", rose: "장미",
  amber: "호박", violet: "보라", teal: "청록", forest: "숲", scarlet: "주홍", navy: "남색", ash: "잿빛", plum: "자두",
  bone: "뼈", frost: "서리", silver: "은", ruby: "루비", sapphire: "사파이어",
  green: "초록", blue: "파랑", pink: "분홍", purple: "보라", orange: "주황", red: "빨강", grey: "회색",
};
export const shapeName = (s) => SHAPE_KO[s] ?? s;
/** "hood-teal" -> "청록 두건". */
export function faceName(face) {
  const [s, c] = String(face).split("-");
  return `${COLOR_KO[c] ?? c} ${shapeName(s)}`;
}

// ---- looks ----
export const FRAMES = [
  { key: "wood", name: "나무", lv: 1 }, { key: "bronze", name: "청동", lv: 2 }, { key: "silver", name: "은", lv: 6 },
  { key: "gold", name: "금", lv: 10 }, { key: "rune", name: "룬", lv: 14 }, { key: "crown", name: "왕관", lv: 18 },
];
export const BANNERS = [
  { key: "basic", name: "기본", lv: 1 }, { key: "flag", name: "깃발", lv: 4 }, { key: "torch", name: "횃불", lv: 8 },
  { key: "gems", name: "보석 비", lv: 12 }, { key: "crown", name: "왕관", lv: 16 }, { key: "legend", name: "전설", lv: 20 },
];
const TITLES = [[1, "견습"], [5, "모험가"], [10, "기사"], [15, "영웅"], [20, "전설"]];
export const titleOf = (lv) => TITLES.filter(([l]) => lv >= l).pop()[1];
export const BADGE_LV = 19;
export const goldBadge = (lv) => lv >= BADGE_LV;

// What each level gives. faces: four colorways of a shape (from: first index).
export const REWARDS = [
  { lv: 2, kind: "frame", key: "bronze", text: "청동 액자" },
  { lv: 3, kind: "faces", shape: "wizard", from: 0, text: "마법사 4색" },
  { lv: 4, kind: "banner", key: "flag", text: "깃발 배너" },
  { lv: 5, kind: "faces", shape: "slime", from: 0, text: "슬라임 4색" },
  { lv: 5, kind: "title", key: "모험가", text: "칭호 \"모험가\"" },
  { lv: 6, kind: "frame", key: "silver", text: "은 액자" },
  { lv: 7, kind: "faces", shape: "wizard", from: 4, text: "마법사 나머지 4색" },
  { lv: 8, kind: "banner", key: "torch", text: "횃불 배너" },
  { lv: 9, kind: "faces", shape: "skull", from: 0, text: "해골 4색" },
  { lv: 10, kind: "frame", key: "gold", text: "금 액자" },
  { lv: 10, kind: "title", key: "기사", text: "칭호 \"기사\"" },
  { lv: 11, kind: "faces", shape: "slime", from: 4, text: "슬라임 나머지 4색" },
  { lv: 12, kind: "banner", key: "gems", text: "보석 비 배너" },
  { lv: 13, kind: "faces", shape: "skull", from: 4, text: "해골 나머지 4색" },
  { lv: 14, kind: "frame", key: "rune", text: "룬 액자" },
  { lv: 15, kind: "faces", shape: "king", from: 0, text: "왕 4색" },
  { lv: 15, kind: "title", key: "영웅", text: "칭호 \"영웅\"" },
  { lv: 16, kind: "banner", key: "crown", text: "왕관 배너" },
  { lv: 17, kind: "faces", shape: "king", from: 4, text: "왕 나머지 4색" },
  { lv: 18, kind: "frame", key: "crown", text: "왕관 액자" },
  { lv: 19, kind: "badge", key: "gold", text: "금장 Lv 배지" },
  { lv: 20, kind: "banner", key: "legend", text: "전설 배너" },
  { lv: 20, kind: "title", key: "전설", text: "칭호 \"전설\"" },
];
export const MAX_LV = 20;
export const rewardsAt = (lv) => REWARDS.filter((r) => r.lv === lv);

/** The level a portrait opens at (helm and hood: from the start). */
export function faceLevel(face) {
  const [s, c] = String(face).split("-");
  if (s === "helm" || s === "hood") return 1;
  const i = ROWS[s]?.indexOf(c) ?? -1;
  if (i < 0) return Infinity;
  const r = REWARDS.find((x) => x.kind === "faces" && x.shape === s && i >= x.from && i < x.from + 4);
  return r ? r.lv : Infinity;
}
export const unlockedFaces = (lv) => FACES.filter((f) => faceLevel(f) <= lv);
/** Auto-pick pool at a level: the first sixteen in their old order, then the opened ones. */
export const autoPool = (lv) => [...BASE, ...FACES.filter((f) => !BASE.includes(f) && faceLevel(f) <= lv)];

const LOOKS = { frame: FRAMES, banner: BANNERS };
/** Whether a frame or banner is open at lv. */
export function unlocked(kind, key, lv) {
  const it = LOOKS[kind]?.find((x) => x.key === key);
  return Boolean(it) && it.lv <= lv;
}
/** The chosen frame/banner if open at lv, else the first one. */
export const pick = (kind, key, lv) => (unlocked(kind, key, lv) ? key : LOOKS[kind][0].key);

/** Adds a finished quest ({ name, at }) on top of the log, keeping 30. */
export const pushLog = (log, entry, max = 30) => [entry, ...(Array.isArray(log) ? log : [])].slice(0, max);
