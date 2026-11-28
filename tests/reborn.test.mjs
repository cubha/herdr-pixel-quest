// Rebirth: stars, the EXP rate, star shards and the star shop (mods/pixel-quest/reborn.js).
// Run: node --test tests/
import test from "node:test";
import assert from "node:assert/strict";
import * as R from "../mods/pixel-quest/reborn.js";
import * as E from "../mods/pixel-quest/economy.js";
import * as G from "../mods/pixel-quest/gear.js";
import * as S from "../mods/pixel-quest/sounds.js";
import * as Z from "../mods/pixel-quest/zones.js";
import * as P from "../mods/pixel-quest/progress.js";

const eco = (o = {}) => ({ ...E.empty(), ...o });

test("the EXP rate by stars: 1, 1.5, 2, 2.5, 3 and no more", () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 9].map(R.mult), [1, 1.5, 2, 2.5, 3, 3, 3]);
  assert.equal(R.FULL, 620);
  // quests a run takes at each star count, as the plan has them
  assert.deepEqual([0, 1, 2, 3, 4].map((s) => Math.ceil(R.FULL / R.mult(s))), [620, 414, 310, 248, 207]);
});

test("a broken or old value reads as no stars, no shards", () => {
  assert.deepEqual(R.readReborn(undefined), { stars: 0, shards: 0, shardLv: 1, over: 0 });
  assert.deepEqual(R.readReborn({ stars: 9, shards: -3, shardLv: "x", over: 2.7 }), { stars: 5, shards: 0, shardLv: 1, over: 2 });
});

test("before the first rebirth a run's levels pay no shards; overflow EXP does, one per 40", () => {
  let r = R.settle(eco(), 619);
  assert.equal(r.eco.shards ?? 0, 0); assert.equal(r.got, 0);
  r = R.settle(eco(), 620 + 39);
  assert.equal(r.got, 0);
  r = R.settle(eco(), 620 + 40);
  assert.equal(r.eco.shards, 1); assert.equal(r.eco.over, 1); assert.equal(r.got, 1);
  // paid once: the same EXP again gives nothing, more EXP gives the difference
  assert.equal(R.settle(r.eco, 620 + 79).got, 0);
  assert.equal(R.settle(r.eco, 620 + 200).eco.shards, 5);
  // update day: overflow from before is paid in one go
  assert.equal(R.settle(eco(), 620 + 400).eco.shards, 10);
});

test("after a rebirth the run pays 20 shards by level: 5, 10, 13 two each, 15 four, 17-19 two each, 20 four", () => {
  let e = eco({ stars: 1, shards: 10 });
  const at = (lv) => P.total(lv);
  e = R.settle(e, at(4)).eco; assert.equal(e.shards, 10);
  e = R.settle(e, at(5)).eco; assert.equal(e.shards, 12);
  e = R.settle(e, at(5) + 1).eco; assert.equal(e.shards, 12);
  e = R.settle(e, at(14)).eco; assert.equal(e.shards, 16);       // 10 and 13 on the way
  e = R.settle(e, at(15)).eco; assert.equal(e.shards, 20);
  e = R.settle(e, at(20)).eco; assert.equal(e.shards, 30);
  assert.equal(e.shardLv, 20);
  assert.equal(Object.values(R.LV_SHARDS).reduce((a, b) => a + b, 0), 20);
});

test("rebirth: at Lv.20 of the run, up to five stars; ten shards; the run starts over", () => {
  assert.equal(R.canReborn(eco(), 19), false);
  assert.equal(R.canReborn(eco(), 20), true);
  assert.equal(R.canReborn(eco({ stars: 5 }), 20), false);
  assert.equal(R.reborn(eco(), 19).ok, false);
  const r = R.reborn(eco({ gold: 70, lvPaid: 20, medals: { legend: 1 }, over: 3, shards: 3, shardLv: 20 }), 20);
  assert.equal(r.ok, true);
  assert.deepEqual([r.eco.stars, r.eco.shards, r.eco.over, r.eco.shardLv, r.eco.lvPaid], [1, 13, 0, 1, 1]);
  assert.equal(r.eco.gold, 70); assert.deepEqual(r.eco.medals, { legend: 1 });   // nothing else is lost
  // overflow EXP on its way to the next shard is rounded up into one (nothing is lost with the run)
  assert.equal(R.rebornShards(R.FULL), 10);
  assert.equal(R.rebornShards(R.FULL + 30), 11);
  assert.equal(R.rebornShards(R.FULL + 80), 10);
  const k = R.reborn(eco(), 21, R.FULL + 110); // two whole shards unpaid yet, and 30 more
  assert.equal(k.eco.shards, 2 + 11);
  assert.equal(k.got, 11);
  assert.equal(R.reborn(eco({ stars: 5 }), 20).ok, false);
  // shards by the time each star is reached with no overflow: 10, 40, 70, 100, 130
  let e = eco(); const seen = [];
  for (let s = 0; s < 5; s++) { e = R.settle(e, R.FULL).eco; e = R.reborn(e, 20).eco; seen.push(e.shards); }
  assert.deepEqual(seen, [10, 40, 70, 100, 130]);
});

test("level-up gold is paid again in each run (by the run's level, not the best ever)", () => {
  let e = eco({ lvPaid: 20, stars: 1, medals: Object.fromEntries(E.MEDALS.map((m) => [m.id, 1])) });
  e = R.reborn(e, 20).eco;
  const r = E.onQuest(e, { now: new Date(2026, 10, 27, 12), best: 20, lv: 2 });
  assert.equal(r.gained, 20 + 50);
  assert.equal(r.eco.lvPaid, 2);
});

test("the star shop's prices: 122 shards and 11,600 G in all", () => {
  const all = R.priceList();
  assert.equal(all.reduce((a, c) => a + c.shard, 0), 122);
  assert.equal(all.reduce((a, c) => a + c.gold, 0), 11600);
});

test("the sanctum zone opens with the first star and grows by itself", () => {
  assert.equal(Z.zoneBy("astral").name, "별의 성소");
  assert.equal(Z.isOpen("astral", { best: 20 }), false);
  assert.equal(Z.isOpen("astral", { stars: 1 }), true);
  assert.equal(Z.howOpen("astral"), "첫 환생");
});

test("the moon cape spirit: shards and gold, after a rebirth; it grows by upgrades, not by bond", () => {
  assert.equal(E.PETS.length, 12);
  assert.equal(E.petOf("star").name, "달 망토 정령");
  assert.equal(E.buy(eco({ gold: 9999, shards: 99 }), "star").ok, false);            // no star yet
  assert.equal(E.buy(eco({ gold: 9999, shards: 7, stars: 1 }), "star").ok, false);   // short of shards
  let r = E.buy(eco({ gold: 2000, shards: 8, stars: 1 }), "star");
  assert.equal(r.ok, true); assert.equal(r.eco.gold, 500); assert.equal(r.eco.shards, 0);
  let e = { ...r.eco, gold: 5000, shards: 30, pets: { star: { bond: 999 } } };
  assert.equal(E.petArt("star", e.pets.star, false, false).name, "pet-star-1-a");
  r = E.upgradePet(e); assert.equal(r.ok, true); assert.deepEqual([r.eco.shards, r.eco.gold, r.eco.pets.star.up], [20, 4200, 1]);
  r = E.upgradePet(r.eco); assert.deepEqual([r.eco.shards, r.eco.gold, r.eco.pets.star.up], [5, 3000, 2]);
  assert.deepEqual(E.petArt("star", r.eco.pets.star, false, true), { name: "pet-star-3-a-r", w: 40, h: 28 });
  assert.equal(E.petArt("star", r.eco.pets.star, true, false).name, "pet-star-3-s");
  assert.equal(E.upgradePet(r.eco).ok, false);
  // the dex medal still counts the twelve
  const twelve = Object.fromEntries(E.PETS.slice(0, 11).map((p) => [p.key, { bond: 0 }]));
  assert.equal(E.progressOf(E.medalOf("dex"), eco({ pets: { ...twelve, star: { bond: 0 } } }), { now: new Date() }).have, 11);
});

test("the sanctum set: shards and gold, no loot; each piece upgrades twice", () => {
  assert.ok(G.SETS.includes("astral"));
  assert.deepEqual(["h", "w", "t"].map((l) => [G.price("astral", l), G.shardPrice("astral", l)]), [[800, 6], [1200, 9], [1600, 12]]);
  assert.equal(G.shardPrice("dungeon", "h"), 0);
  const at = { stars: 1 };
  assert.equal(G.buyGear(eco({ gold: 9999, shards: 99 }), "astral", "h", {}).ok, false);
  assert.equal(G.buyGear(eco({ gold: 9999, shards: 5, stars: 1 }), "astral", "h", at).ok, false);
  let r = G.buyGear(eco({ gold: 1000, shards: 6, stars: 1 }), "astral", "h", at);
  assert.equal(r.ok, true); assert.deepEqual([r.eco.gold, r.eco.shards], [200, 0]);
  let e = { ...r.eco, gold: 5000, shards: 20 };
  assert.equal(G.upgradeGear(e, "t").ok, false);     // not owned
  r = G.upgradeGear(e, "h"); assert.deepEqual([r.ok, r.eco.shards, r.eco.gold, G.readHero(r.eco).up.h], [true, 14, 4500, 1]);
  r = G.upgradeGear(r.eco, "h"); assert.deepEqual([r.eco.shards, r.eco.gold, G.readHero(r.eco).up.h], [6, 3700, 2]);
  assert.equal(G.upgradeGear(r.eco, "h").ok, false);
  // picked together with gold pieces: the quote carries the shards
  const q = G.quote(eco({ gold: 9999, shards: 3, stars: 1 }), { h: "astral", w: "dungeon" }, at);
  assert.deepEqual([q.total, q.shards, q.shardShort], [800 + 450, 6, 3]);
  assert.equal(G.buyMany(eco({ gold: 9999, shards: 3, stars: 1 }), { h: "astral" }, at).ok, false);
});

test("the sanctum set's pictures follow each piece's upgrade; its helmet wears like the dungeon's", () => {
  assert.deepEqual(G.layers("m", "knight", { h: "astral", t: "astral", w: "astral" }, { h: 0, t: 1, w: 2 }),
    ["hero/bg-m-knight", "hero/gw-m-astral3", "hero/hd-m-knight-dungeon", "hero/ga-m-astral2", "hero/ho-m-knight-dungeon", "hero/gh-m-astral1"]);
  assert.deepEqual(G.layers("f", "squire", { h: "astral" }), ["hero/bg-f-squire", "hero/fg-f-squire-dungeon", "hero/gh-f-astral1"]);
  assert.deepEqual(G.layers("m", "knight", { h: "ice", t: "ice", w: "ice" }),
    ["hero/bg-m-knight", "hero/gw-m-ice", "hero/hd-m-knight-ice", "hero/ga-m-ice", "hero/ho-m-knight-ice", "hero/gh-m-ice"]);
  assert.equal(G.icon("astral", "h", { h: 2 }), "hero/it-astral3-h");
  assert.equal(G.icon("lava", "t"), "hero/it-lava-t");
});

test("the star frame and the star sounds: four shards and 300 G each", () => {
  assert.equal(P.unlocked("frame", "star", 20), false);
  assert.equal(P.unlocked("frame", "star", 1, ["star"]), true);
  assert.equal(P.pick("frame", "star", 20, []), "wood");
  let r = R.buyFrame(eco({ gold: 300, shards: 4 }));
  assert.equal(r.ok, false);                                   // no star yet
  r = R.buyFrame(eco({ gold: 300, shards: 4, stars: 1 }));
  assert.deepEqual([r.ok, r.eco.gold, r.eco.shards, r.eco.frames], [true, 0, 0, ["star"]]);
  assert.equal(R.buyFrame(r.eco).ok, false);
  assert.equal(S.howOpenSound("star"), "별조각 4개 · 300 G");
  assert.equal(S.buySound(eco({ gold: 300, shards: 3, stars: 1 }), "star").ok, false);
  r = S.buySound(eco({ gold: 300, shards: 4, stars: 1 }), "star");
  assert.deepEqual([r.ok, r.eco.shards, r.eco.gold, S.soundOpen(r.eco, "star")], [true, 0, 0, true]);
});

test("every picture the rebirth asks for is there, at the size the code draws it", async () => {
  const { existsSync, readFileSync } = await import("node:fs");
  const art = new URL("../mods/pixel-quest/art/", import.meta.url);
  const size = (f) => { const b = readFileSync(new URL(f, art)); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
  for (const up of [0, 1, 2]) for (const crouch of [false, true]) for (const right of [false, true]) {
    const a = E.petArt("star", { up }, crouch, right);
    assert.ok(existsSync(new URL(`${a.name}.png`, art)), `missing ${a.name}`);
    assert.deepEqual(size(`${a.name}.png`), [a.w, a.h], a.name);
  }
  for (const [f, wh] of [["shard.png", [16, 16]], ["pf-star.png", [36, 46]], ["pft-star.png", [18, 23]], ["pfs-star.png", [30, 30]], ["pet-star-1-s-x.png", [32, 22]]]) assert.deepEqual(size(f), wh, f);
  for (const st of [0, 1, 2]) for (const [l, wh] of [["h", [38, 38]], ["t", [58, 38]], ["w", [18, 38]]]) {
    assert.deepEqual(size(`${G.icon("astral", l, { [l]: st })}.png`), wh);
    assert.ok(existsSync(new URL(`${G.icon("astral", l, { [l]: st })}-x.png`, art)));
  }
  for (const st of [0, 1, 2]) assert.deepEqual(size(`${G.icon("astral", "w", { w: st }, "wl")}.png`), [26, 84]);
  for (const k of ["done", "blocked"]) assert.ok(existsSync(new URL(`../${S.soundFile("star", k)}`, import.meta.url)), k);
});
