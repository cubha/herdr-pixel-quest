// Level curve and unlocks (mods/pixel-quest/progress.js). Run: node --test tests/
import test from "node:test";
import assert from "node:assert/strict";
import * as G from "../mods/pixel-quest/progress.js";

test("quests needed per level grow: 5 + floor((n-1)^2/4)", () => {
  assert.deepEqual([1, 2, 3, 4, 5, 10, 19].map(G.need), [5, 5, 6, 7, 9, 25, 86]);
});

test("cumulative totals match the approved table", () => {
  assert.equal(G.total(1), 0);
  assert.deepEqual([2, 3, 4, 5, 10, 12, 20].map(G.total), [5, 10, 16, 23, 95, 150, 620]);
});

test("level from quest count; today's 17 stays Lv.4", () => {
  assert.equal(G.levelOf(0), 1);
  assert.equal(G.levelOf(4), 1);
  assert.equal(G.levelOf(5), 2);
  assert.equal(G.levelOf(17), 4);
  assert.equal(G.levelOf(620), 20);
  assert.equal(G.levelOf(10000) > 20, true);
});

test("progress inside a level", () => {
  const p = G.progress(17);
  assert.equal(p.lv, 4);
  assert.equal(p.from, 16);
  assert.equal(p.to, 23);
  assert.equal(p.left, 6);
  assert.ok(Math.abs(p.frac - 1 / 7) < 1e-9);
});

test("48 portraits in six rows of eight, helm and hood first", () => {
  assert.equal(G.FACES.length, 48);
  assert.equal(new Set(G.FACES).size, 48);
  assert.deepEqual(G.SHAPES, ["helm", "hood", "wizard", "skull", "king", "slime"]);
  assert.equal(G.FACES[0], "helm-gold");
  assert.ok(G.FACES.includes("slime-grey"));
});

test("portrait unlock levels follow the table", () => {
  assert.equal(G.faceLevel("helm-rose"), 1);
  assert.equal(G.faceLevel("hood-plum"), 1);
  assert.equal(G.faceLevel("wizard-azure"), 3);
  assert.equal(G.faceLevel("wizard-teal"), 7);
  assert.equal(G.faceLevel("slime-teal"), 5);
  assert.equal(G.faceLevel("slime-grey"), 11);
  assert.equal(G.faceLevel("skull-bone"), 9);
  assert.equal(G.faceLevel("skull-violet"), 13);
  assert.equal(G.faceLevel("king-gold"), 15);
  assert.equal(G.faceLevel("king-rose"), 17);
  assert.equal(G.unlockedFaces(1).length, 16);
  assert.equal(G.unlockedFaces(4).length, 20);
  assert.equal(G.unlockedFaces(17).length, 48);
});

test("frames, banners, titles and the badge unlock by level", () => {
  assert.deepEqual(G.FRAMES.map((f) => [f.key, f.lv]), [["wood", 1], ["bronze", 2], ["silver", 6], ["gold", 10], ["rune", 14], ["crown", 18]]);
  assert.deepEqual(G.BANNERS.map((b) => [b.key, b.lv]), [["basic", 1], ["flag", 4], ["torch", 8], ["gems", 12], ["crown", 16], ["legend", 20]]);
  assert.equal(G.unlocked("frame", "bronze", 1), false);
  assert.equal(G.unlocked("frame", "bronze", 2), true);
  assert.equal(G.unlocked("banner", "legend", 19), false);
  assert.deepEqual([1, 4, 5, 9, 10, 15, 20, 30].map(G.titleOf), ["견습", "견습", "모험가", "모험가", "기사", "영웅", "전설", "전설"]);
  assert.equal(G.goldBadge(18), false);
  assert.equal(G.goldBadge(19), true);
});

test("every level 2..20 gives something, none after", () => {
  for (let l = 2; l <= 20; l++) assert.ok(G.rewardsAt(l).length >= 1, `Lv.${l}`);
  assert.equal(G.rewardsAt(21).length, 0);
  assert.deepEqual(G.rewardsAt(5).map((r) => r.text), ["슬라임 4색", "칭호 \"모험가\""]);
});

test("a chosen frame or banner falls back when locked", () => {
  assert.equal(G.pick("frame", "gold", 4), "wood");
  assert.equal(G.pick("frame", "bronze", 4), "bronze");
  assert.equal(G.pick("banner", undefined, 4), "basic");
  assert.equal(G.pick("banner", "nonsense", 20), "basic");
});

test("best level never goes down", () => {
  assert.equal(G.bestAfter(undefined, 17), 4);
  assert.equal(G.bestAfter(4, 0), 4);
  assert.equal(G.bestAfter(4, 23), 5);
});

test("quest log keeps the newest 30", () => {
  let log = [];
  for (let i = 0; i < 35; i++) log = G.pushLog(log, { name: `q${i}`, at: i });
  assert.equal(log.length, 30);
  assert.equal(log[0].name, "q34");
  assert.equal(G.pushLog(null, { name: "a", at: 1 }).length, 1);
});

test("update day: the old level (1 per 5 quests) is a floor until the curve catches up", () => {
  assert.equal(G.oldLevel(27), 6);
  assert.equal(G.levelOf(27), 5);
  const p = G.progressAt(27, 6);
  assert.equal(p.lv, 6);
  assert.equal(p.to, G.total(7));
  assert.equal(p.left, G.total(7) - 27);
  assert.equal(p.frac, 0);
  assert.equal(G.progressAt(50, 6).lv, 7);
  assert.equal(G.progressAt(17, undefined).lv, 4);
  assert.deepEqual(G.progressAt(17, 1), G.progress(17));
});

test("level-up: frames and banners the new level opens can be put on at once", () => {
  assert.deepEqual(G.equipables(2, { frame: "wood", banner: "basic" }),
    [{ kind: "frame", key: "bronze", text: "청동 액자", shared: "pq.frame", on: false }]);
  assert.deepEqual(G.equipables(20, { frame: "crown", banner: "legend" }),
    [{ kind: "banner", key: "legend", text: "전설 배너", shared: "pq.bannerStyle", on: true }]);
  // Portraits, titles and the badge need no putting on.
  assert.deepEqual(G.equipables(3, {}), []);
  assert.deepEqual(G.equipables(19, {}), []);
});
