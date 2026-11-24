// Loot: drops, stacking, the dex and gear materials (mods/pixel-quest/loot.js).
// Run: node --test tests/
import test from "node:test";
import assert from "node:assert/strict";
import * as L from "../mods/pixel-quest/loot.js";
import { empty } from "../mods/pixel-quest/economy.js";

// rand() that answers the given numbers in turn.
const seq = (...xs) => { let i = 0; return () => xs[i++ % xs.length]; };
const OPEN4 = { best: 12, medals: {}, zones: [] };   // dungeon, sunlit, ice, lava open
const withStock = (stock, gold = 100000) => ({ ...empty(), gold, loot: { found: Object.fromEntries(Object.keys(stock).map((k) => [k, 1])), stock, titles: [] } });

test("35 items: seven zones of five (common x3, rare, legendary), names as the mockup", () => {
  assert.equal(L.ITEMS.length, 35);
  assert.deepEqual(L.RAR, ["c", "c", "c", "r", "l"]);
  assert.deepEqual(Object.keys(L.LOOT), ["dungeon", "sunlit", "ice", "moss", "lava", "crystal", "throne"]);
  assert.deepEqual(L.LOOT.dungeon.map((x) => x.name), ["녹슨 열쇠", "뼛조각", "꺼진 횃불", "낡은 지도", "옛 왕의 인장 반지"]);
  assert.deepEqual(L.LOOT.throne.map((x) => x.name), ["금화 한 닢", "끊어진 목걸이", "은잔", "왕홀 조각", "왕의 보석 왕관"]);
  assert.equal(new Set(L.ITEMS.map((x) => x.key)).size, 35);
  const it = L.itemOf("ice-3");
  assert.deepEqual([it.zone, it.name, it.rar, it.key], ["ice", "서리 꽃", "r", "frost"]);
  assert.equal(L.itemOf("nope-1"), null);
});

test("a broken or missing loot value reads as empty and never throws", () => {
  assert.deepEqual(L.readLoot(empty()), { found: {}, stock: {}, titles: [] });
  assert.deepEqual(L.readLoot({ loot: "x" }), { found: {}, stock: {}, titles: [] });
  const r = L.readLoot({ loot: { found: { "dungeon-0": 1, "bad-9": 1 }, stock: { "dungeon-0": 2, "dungeon-1": -3, "x": 5 }, titles: ["던전 수집가", 7] } });
  assert.deepEqual(r, { found: { "dungeon-0": 1 }, stock: { "dungeon-0": 2 }, titles: ["던전 수집가"] });
});

test("drop chance 25%, then rarity 60 / 30 / 10", () => {
  assert.equal(L.drop(empty(), "dungeon", seq(0.25)).got, null);          // no drop at 25% and over
  assert.equal(L.drop(empty(), "dungeon", seq(0.1, 0.59, 0)).got.rar, "c");
  assert.equal(L.drop(empty(), "dungeon", seq(0.1, 0.6, 0)).got.rar, "r");
  assert.equal(L.drop(empty(), "dungeon", seq(0.1, 0.89, 0)).got.rar, "r");
  assert.equal(L.drop(empty(), "dungeon", seq(0.1, 0.9, 0)).got.rar, "l");
  // which common: the third number picks among the three
  assert.equal(L.drop(empty(), "dungeon", seq(0.1, 0, 0.99)).got.name, "꺼진 횃불");
  assert.equal(L.drop(empty(), "dungeon", seq(0.1, 0, 0.34)).got.name, "뼛조각");
  // only the zone asked for, and nothing for an unknown zone
  assert.equal(L.drop(empty(), "lava", seq(0.1, 0.95, 0)).got.name, "용의 비늘");
  assert.equal(L.drop(empty(), "nowhere", seq(0.1, 0, 0)).got, null);
});

test("commons and rares stack; the first one goes in the dex", () => {
  const a = L.drop(empty(), "dungeon", seq(0.1, 0, 0));
  assert.deepEqual([a.got.first, a.got.count, a.got.gold], [true, 1, 0]);
  const b = L.drop(a.eco, "dungeon", seq(0.1, 0, 0));
  assert.deepEqual([b.got.first, b.got.count, b.got.gold], [false, 2, 0]);
  assert.equal(L.readLoot(b.eco).stock["dungeon-0"], 2);
  assert.equal(L.dexCount(b.eco), 1);
  assert.equal(b.eco.gold, 0);
});

test("a legendary is never a material: the first is for the dex, another is +100 G", () => {
  const a = L.drop(empty(), "dungeon", seq(0.1, 0.95, 0));
  assert.deepEqual([a.got.first, a.got.count, a.got.gold], [true, 0, 0]);
  assert.equal(L.readLoot(a.eco).stock["dungeon-4"], undefined);
  const b = L.drop(a.eco, "dungeon", seq(0.1, 0.95, 0));
  assert.deepEqual([b.got.first, b.got.gold], [false, 100]);
  assert.equal(b.eco.gold, 100);
  assert.equal(b.eco.earned, 100);
});

test("all five of a zone once: +300 G and the title '<zone> 수집가', only once", () => {
  let e = { ...empty(), loot: { found: { "ice-0": 1, "ice-1": 1, "ice-2": 1, "ice-3": 1 }, stock: {}, titles: [] } };
  const r = L.drop(e, "ice", seq(0.1, 0.95, 0));
  assert.equal(r.got.title, "얼음 동굴 수집가");
  assert.equal(r.got.gold, 300);
  assert.equal(r.eco.gold, 300);
  assert.deepEqual(L.readLoot(r.eco).titles, ["얼음 동굴 수집가"]);
  assert.equal(L.titleNow(r.eco), "얼음 동굴 수집가");
  const again = L.drop(r.eco, "ice", seq(0.1, 0, 0));
  assert.equal(again.got.title, null);
  assert.deepEqual(L.readLoot(again.eco).titles, ["얼음 동굴 수집가"]);
  assert.equal(L.titleNow(empty()), null);
});

test("the dex keeps an item after its stock is spent to 0", () => {
  const e = withStock({ "dungeon-0": 3 });
  const r = L.buyWithMats(e, { h: "dungeon" }, OPEN4);
  assert.ok(r.ok, r.msg);
  assert.equal(L.readLoot(r.eco).stock["dungeon-0"] ?? 0, 0);
  assert.equal(L.readLoot(r.eco).found["dungeon-0"], 1);
  assert.equal(L.dexCount(r.eco), 1);
});

test("recipe: helmet 3 commons, weapon 4 + 1 rare, armor 5 + 2 rares; gold price unchanged", () => {
  assert.deepEqual(L.RECIPE, { h: { c: 3, r: 0 }, w: { c: 4, r: 1 }, t: { c: 5, r: 2 } });
  const e = withStock({ "lava-0": 6, "lava-1": 2, "lava-3": 1, "ice-1": 3 });
  const m = L.mats(e, { h: "ice", w: "lava", t: "lava" }, OPEN4);
  // lava weapon + armor together: 9 commons and 3 rares from lava; the ice helmet 3 commons
  assert.deepEqual(m.sets, [
    { set: "ice", c: { have: 3, need: 3 }, r: { have: 0, need: 0 } },
    { set: "lava", c: { have: 8, need: 9 }, r: { have: 1, need: 3 } },
  ]);
  assert.equal(m.short, true);
  assert.deepEqual(m.missing, [{ set: "lava", c: 1, r: 2 }]);
});

test("mats only counts the pieces to buy: owned, worn and locked picks need none", () => {
  const e = { ...withStock({}), hero: { sex: "m", rank: null, own: { "dungeon-h": 1 }, eq: { h: null, t: null, w: null } } };
  const m = L.mats(e, { h: "dungeon", t: "moss" }, OPEN4);   // owned helmet, moss locked
  assert.deepEqual(m.sets, []);
  assert.equal(m.short, false);
});

test("buyWithMats: gold and materials together, most-stocked item first, all or none", () => {
  const e = withStock({ "dungeon-0": 2, "dungeon-1": 4, "dungeon-2": 1, "dungeon-3": 3 }, 2000);
  const r = L.buyWithMats(e, { h: "dungeon", w: "dungeon" }, OPEN4);
  assert.ok(r.ok, r.msg);
  assert.equal(r.eco.gold, 2000 - 300 - 450);
  assert.ok(r.eco.hero.own["dungeon-h"] && r.eco.hero.own["dungeon-w"]);
  // 7 commons: from the biggest pile each time (ties: the earlier one) -> 뼛조각 4, 열쇠 2, 횃불 1
  const s = L.readLoot(r.eco).stock;
  assert.deepEqual([s["dungeon-0"] ?? 0, s["dungeon-1"] ?? 0, s["dungeon-2"] ?? 0, s["dungeon-3"]], [0, 0, 0, 2]);
  assert.match(r.msg, /구매했습니다/);
  assert.match(r.msg, /재료 8개/);
});

test("buyWithMats refuses when materials are short, and leaves everything as it was", () => {
  const e = withStock({ "dungeon-0": 2 }, 5000);
  const r = L.buyWithMats(e, { h: "dungeon" }, OPEN4);
  assert.equal(r.ok, false);
  assert.equal(r.eco, e);
  assert.match(r.msg, /재료가 부족합니다/);
  assert.match(r.msg, /던전 흔함 1개/);
});

test("buyWithMats passes gold and nothing-to-buy refusals through from the gear rules", () => {
  const poor = L.buyWithMats(withStock({ "dungeon-0": 9 }, 100), { h: "dungeon" }, OPEN4);
  assert.equal(poor.ok, false);
  assert.match(poor.msg, /골드가 200 G 부족합니다/);
  const none = L.buyWithMats(withStock({}), { t: "moss" }, OPEN4);
  assert.equal(none.ok, false);
  assert.match(none.msg, /구매할 장비가 없습니다/);
});

test("stock by rarity per zone", () => {
  const e = withStock({ "sunlit-0": 2, "sunlit-2": 1, "sunlit-3": 4 });
  assert.equal(L.stockOf(e, "sunlit", "c"), 3);
  assert.equal(L.stockOf(e, "sunlit", "r"), 4);
  assert.equal(L.stockOf(e, "dungeon", "c"), 0);
});
