// Alert sound sets: what opens them, buying, the files (mods/pixel-quest/sounds.js).
// Run: node --test tests/
import test from "node:test";
import assert from "node:assert/strict";
import * as S from "../mods/pixel-quest/sounds.js";
import { empty } from "../mods/pixel-quest/economy.js";
import { ITEMS } from "../mods/pixel-quest/loot.js";

test("seven sets in the mockup's order (two open, three for gold, a medal one, a dex one) and the star shop's", () => {
  assert.deepEqual(S.SOUND_SETS.map((s) => s.key), ["herdr", "q8", "box", "arcade", "slime", "horn", "chest", "star"]);
  assert.deepEqual(S.SOUND_SETS.map((s) => s.name), ["Herdr 기본", "8비트 퀘스트", "오르골", "아케이드", "슬라임", "용사의 나팔", "보물 상자", "별의 종"]);
  assert.deepEqual(["box", "arcade", "slime"].map((k) => S.soundBy(k).open.gold), [500, 800, 1200]);
  assert.equal(S.soundBy("horn").open.medal, "knight");
  assert.equal(S.soundBy("chest").open.dex, 35);
});

test("files: Herdr's own has none; 8-bit keeps today's files; the rest <key>-done / -blocked.mp3", () => {
  assert.equal(S.soundFile("herdr", "done"), null);
  assert.equal(S.soundFile("q8", "done"), "mods/pixel-quest/sounds/quest-done.mp3");
  assert.equal(S.soundFile("q8", "blocked"), "mods/pixel-quest/sounds/quest-blocked.mp3");
  assert.equal(S.soundFile("slime", "blocked"), "mods/pixel-quest/sounds/slime-blocked.mp3");
  assert.equal(S.soundFile("nope", "done"), null);
});

test("which set settings.json plays: by the done file; none set is Herdr's own; unknown files too", () => {
  assert.equal(S.soundNow({}), "herdr");
  assert.equal(S.soundNow({ sounds: { enabled: true } }), "herdr");
  assert.equal(S.soundNow({ sounds: { done: "mods/pixel-quest/sounds/quest-done.mp3" } }), "q8");
  assert.equal(S.soundNow({ sounds: { done: "mods/pixel-quest/sounds/horn-done.mp3" } }), "horn");
  assert.equal(S.soundNow({ sounds: { done: "C:/my/own.wav" } }), null);
});

test("open: the free two always; gold ones once bought; the horn with 기사 서임; the chest with all 35", () => {
  const e = empty();
  assert.ok(S.soundOpen(e, "herdr") && S.soundOpen(e, "q8"));
  assert.equal(S.soundOpen(e, "box"), false);
  assert.ok(S.soundOpen({ ...e, sounds: ["box"] }, "box"));
  assert.equal(S.soundOpen(e, "horn"), false);
  assert.ok(S.soundOpen({ ...e, medals: { knight: 1 } }, "horn"));
  assert.equal(S.soundOpen(e, "chest"), false);
  const all = Object.fromEntries(ITEMS.map((x) => [x.id, 1]));
  assert.ok(S.soundOpen({ ...e, loot: { found: all, stock: {}, titles: [] } }, "chest"));
  assert.equal(S.soundOpen(e, "nope"), false);
});

test("how each opens, as the row says it", () => {
  assert.equal(S.howOpenSound("box"), "500 G");
  assert.equal(S.howOpenSound("slime"), "1,200 G");
  assert.equal(S.howOpenSound("horn"), '훈장 "기사 서임"');
  assert.equal(S.howOpenSound("chest"), "전리품 도감 35종");
  assert.equal(S.howOpenSound("q8"), "처음부터");
});

test("buySound: gold ones only, once, with enough gold", () => {
  const r = S.buySound({ ...empty(), gold: 900 }, "arcade");
  assert.ok(r.ok, r.msg);
  assert.equal(r.eco.gold, 100);
  assert.deepEqual(r.eco.sounds, ["arcade"]);
  assert.match(r.msg, /아케이드/);
  assert.equal(S.buySound(r.eco, "arcade").ok, false);
  const poor = S.buySound({ ...empty(), gold: 100 }, "box");
  assert.equal(poor.ok, false);
  assert.match(poor.msg, /400 G 부족/);
  assert.equal(S.buySound({ ...empty(), gold: 9999 }, "horn").ok, false);
  assert.equal(S.buySound({ ...empty(), gold: 9999 }, "q8").ok, false);
  // a broken stored list reads as none bought
  assert.equal(S.soundOpen({ ...empty(), sounds: "box" }, "box"), false);
});

test("pick: writes the two files into settings.json's sounds, or removes them for Herdr's own; a locked set is refused", () => {
  const d = { sounds: { enabled: false, other: 1 }, theme: "x" };
  const r = S.pickSound(d, { ...empty(), sounds: ["box"] }, "box");
  assert.ok(r.ok);
  assert.deepEqual(r.data, { sounds: { enabled: false, other: 1, done: "mods/pixel-quest/sounds/box-done.mp3", blocked: "mods/pixel-quest/sounds/box-blocked.mp3" }, theme: "x" });
  const h = S.pickSound(r.data, empty(), "herdr");
  assert.deepEqual(h.data, { sounds: { enabled: false, other: 1 }, theme: "x" });
  assert.equal(S.pickSound({}, empty(), "q8").data.sounds.enabled, true);
  const no = S.pickSound(d, empty(), "slime");
  assert.equal(no.ok, false);
  assert.match(no.msg, /1,200 G/);
});
