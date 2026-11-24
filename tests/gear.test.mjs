// The hero's portrait and gear (mods/pixel-quest/gear.js).
// Run: node --test tests/
import test from "node:test";
import assert from "node:assert/strict";
import * as G from "../mods/pixel-quest/gear.js";
import { empty } from "../mods/pixel-quest/economy.js";

const rich = (gold = 100000) => ({ ...empty(), gold });
const ALL = { best: 20, medals: { streak7: 1, legend: 1 }, zones: ["crystal"] };

test("seven sets, three slots, prices by zone and piece (22,500 G in all)", () => {
  assert.deepEqual(G.SETS, ["dungeon", "sunlit", "ice", "moss", "lava", "crystal", "throne"]);
  assert.deepEqual([G.price("dungeon", "h"), G.price("dungeon", "w"), G.price("dungeon", "t")], [300, 450, 600]);
  assert.deepEqual([G.price("throne", "h"), G.price("throne", "w"), G.price("throne", "t")], [1500, 2250, 3000]);
  let sum = 0;
  for (const s of G.SETS) for (const l of G.SLOTS) sum += G.price(s, l);
  assert.equal(sum, 22500);
  assert.equal(G.pieceName("lava", "w"), "용암 무기");
});

test("ranks open by the best level; the shown one falls back to the highest open", () => {
  assert.deepEqual(G.RANKS.map((r) => [r.key, r.lv]), [["squire", 1], ["adventurer", 5], ["knight", 10], ["hero", 15], ["legend", 20]]);
  assert.equal(G.topRank(1), "squire");
  assert.equal(G.topRank(12), "knight");
  assert.equal(G.rankNow(empty(), 12), "knight");
  const r = G.setRank(empty(), "adventurer", 12);
  assert.ok(r.ok);
  assert.equal(G.rankNow(r.eco, 12), "adventurer");
  const no = G.setRank(empty(), "legend", 12);
  assert.equal(no.ok, false);
  assert.match(no.msg, /Lv\.20/);
  assert.equal(G.stepRank(r.eco, 1, 12).eco.hero.rank, "knight");
  assert.equal(G.stepRank(G.stepRank(r.eco, 1, 12).eco, 1, 12).ok, false);
  assert.equal(G.stepRank(G.setRank(empty(), "squire", 12).eco, -1, 12).ok, false);
  // a chosen rank that is no longer open (never happens with pq.best, but a broken value must not throw)
  assert.equal(G.rankNow({ hero: { rank: "legend" } }, 3), "squire");
});

test("buying: the zone first, then gold; once only", () => {
  const shut = G.buyGear(rich(), "ice", "h", { best: 1 });
  assert.equal(shut.ok, false);
  assert.match(shut.msg, /구역/);
  const poor = G.buyGear(rich(100), "dungeon", "h", { best: 1 });
  assert.equal(poor.ok, false);
  assert.match(poor.msg, /200 G/);
  const ok = G.buyGear(rich(1000), "dungeon", "t", { best: 1 });
  assert.ok(ok.ok);
  assert.equal(ok.eco.gold, 400);
  assert.deepEqual(ok.eco.hero.own, { "dungeon-t": 1 });
  assert.deepEqual(ok.eco.hero.eq, { h: null, t: null, w: null });
  assert.equal(G.buyGear(ok.eco, "dungeon", "t", { best: 1 }).ok, false);
  assert.equal(G.buyGear(rich(), "nowhere", "h", ALL).ok, false);
  assert.ok(G.buyGear(rich(), "crystal", "w", ALL).ok);
  assert.equal(G.buyGear(rich(), "crystal", "w", { best: 20 }).ok, false);
  assert.ok(G.buyGear(rich(), "moss", "w", ALL).ok);
  assert.ok(G.buyGear(rich(), "throne", "w", ALL).ok);
});

test("wearing: any mix of sets, off again, the sidebar's cycle", () => {
  let e = rich();
  for (const [s, l] of [["dungeon", "h"], ["ice", "t"], ["lava", "w"], ["ice", "h"]]) e = G.buyGear(e, s, l, ALL).eco;
  assert.equal(G.equip(e, "moss", "h").ok, false);
  e = G.equip(e, "dungeon", "h").eco; e = G.equip(e, "ice", "t").eco; e = G.equip(e, "lava", "w").eco;
  assert.deepEqual(e.hero.eq, { h: "dungeon", t: "ice", w: "lava" });
  // with armor: gear is one drawing per set (no rank in its name), the person is the rank's
  assert.deepEqual(G.layers("m", "knight", e.hero.eq), ["hero/bg-m-knight", "hero/gw-m-lava", "hero/hd-m-knight-dungeon", "hero/ga-m-ice", "hero/ho-m-knight-dungeon", "hero/gh-m-dungeon"]);
  assert.deepEqual(G.layers("f", "squire", {}), ["hero/bg-f-squire", "hero/fg-f-squire-x"]);
  assert.deepEqual(G.layers("f", "legend", { h: "moss", t: "moss", w: "moss" }), ["hero/bg-f-legend", "hero/gw-f-moss", "hero/hd-f-legend-moss", "hero/ga-f-moss", "hero/ho-f-legend-moss", "hero/gh-f-moss"]);
  assert.deepEqual(G.layers("f", "hero", { t: "moss", w: "ice" }), ["hero/bg-f-hero", "hero/gw-f-ice", "hero/hd-f-hero-x", "hero/ga-f-moss", "hero/ho-f-hero-x"]);
  assert.deepEqual(G.layers("f", "hero", { t: "moss" }), ["hero/bg-f-hero", "hero/hd-f-hero-x", "hero/ga-f-moss", "hero/ho-f-hero-x"]);
  // the gear layers are the same files at every rank
  const gearOf = (r) => G.layers("m", r, e.hero.eq).filter((n) => /\/g[awh]-/.test(n));
  assert.deepEqual(gearOf("squire"), gearOf("legend"));
  // without armor: the same weapon file, under the figure in its own clothes
  assert.deepEqual(G.layers("m", "hero", { w: "ice" }), ["hero/bg-m-hero", "hero/gw-m-ice", "hero/fg-m-hero-x"]);
  assert.deepEqual(G.layers("m", "knight", { h: "ice", w: "lava" }), ["hero/bg-m-knight", "hero/gw-m-lava", "hero/fg-m-knight-ice"]);
  const off = G.unequip(e, "t");
  assert.equal(off.eco.hero.eq.t, null);
  assert.equal(G.unequip(off.eco, "t").ok, false);
  // helmet: dungeon -> ice -> none -> dungeon
  let c = G.cycle(e, "h"); assert.equal(c.eco.hero.eq.h, "ice");
  c = G.cycle(c.eco, "h"); assert.equal(c.eco.hero.eq.h, null);
  c = G.cycle(c.eco, "h"); assert.equal(c.eco.hero.eq.h, "dungeon");
  assert.equal(G.cycle(rich(), "w").ok, false);
});

test("the bag holds what is owned and not worn, each piece on its own cells", () => {
  let e = rich();
  for (const s of G.SETS) for (const l of G.SLOTS) e = G.buyGear(e, s, l, ALL).eco;
  let bag = G.pack(e);
  assert.equal(bag.length, 21);
  const seen = new Set();
  for (const it of bag) {
    assert.deepEqual([it.w, it.h], G.SIZE[it.slot]);
    assert.ok(it.x + it.w <= G.BAG.cols && it.y + it.h <= G.BAG.rows);
    for (let j = 0; j < it.h; j++) for (let i = 0; i < it.w; i++) {
      const k = `${it.x + i},${it.y + j}`;
      assert.ok(!seen.has(k), `overlap at ${k}`);
      seen.add(k);
    }
  }
  e = G.equip(e, "ice", "t").eco;
  bag = G.pack(e);
  assert.equal(bag.length, 20);
  assert.ok(!bag.some((it) => it.set === "ice" && it.slot === "t"));
  assert.deepEqual(G.pack(empty()), []);
});

test("a stored value that is old or broken is read without throwing", () => {
  assert.deepEqual(G.readHero({}), G.emptyHero());
  assert.deepEqual(G.readHero({ hero: "x" }), G.emptyHero());
  const h = G.readHero({ hero: { sex: "f", rank: "nope", own: { "ice-h": 1, "bad-key": 1, "ice-z": 1 }, eq: { h: "ice", t: "lava", w: 3 } } });
  assert.deepEqual(h, { sex: "f", rank: null, own: { "ice-h": 1 }, eq: { h: "ice", t: null, w: null } });
  assert.equal(G.setSex(empty(), "f").hero.sex, "f");
});

// The shop's gear tab: a pick per slot ({ h, t, w }), tried on together, bought together.
const OPEN4 = { best: 15, medals: {}, zones: [] };   // dungeon, sunlit, ice, lava open; moss, crystal, throne not
const owning = (gold, own, eq = {}) => ({ ...rich(gold), hero: { sex: "m", rank: null, own, eq: { h: null, t: null, w: null, ...eq } } });

test("quote: each pick's state, what can be bought and what can be worn", () => {
  const eco = owning(5000, { "dungeon-t": 1, "sunlit-h": 1 }, { t: "dungeon" });
  const q = G.quote(eco, { h: "ice", t: "lava", w: "moss" }, OPEN4);
  assert.deepEqual(q.rows.map((r) => [r.slot, r.set, r.state]), [["h", "ice", "buy"], ["t", "lava", "buy"], ["w", "moss", "lock"]]);
  assert.equal(q.total, 500 + 1600);
  assert.deepEqual(q.buy.map((r) => r.slot), ["h", "t"]);
  assert.equal(q.short, 0);
  assert.deepEqual(q.wear, []);
  const q2 = G.quote(eco, { h: "sunlit", t: "dungeon" }, OPEN4);
  assert.deepEqual(q2.rows.map((r) => r.state), ["own", "worn"]);
  assert.deepEqual(q2.wear.map((r) => r.slot), ["h"]);
  assert.equal(q2.total, 0);
  assert.equal(G.quote(owning(100, {}), { h: "ice" }, OPEN4).short, 400);
  assert.deepEqual(G.quote(eco, { h: "nope", x: "ice" }, OPEN4).rows, []);
});

test("buyMany: every buyable pick or none; locked and owned ones are left out", () => {
  const eco = owning(5000, { "dungeon-t": 1 }, { t: "dungeon" });
  const r = G.buyMany(eco, { h: "ice", t: "lava", w: "moss" }, OPEN4);
  assert.equal(r.ok, true);
  assert.equal(r.eco.gold, 5000 - 2100);
  assert.deepEqual(Object.keys(G.readHero(r.eco).own).sort(), ["dungeon-t", "ice-h", "lava-t"]);
  assert.deepEqual(G.readHero(r.eco).eq, { h: null, t: "dungeon", w: null });   // bought, not worn
  assert.equal(r.msg, "2개를 구매했습니다 · 인벤토리에 넣었습니다");
  const one = G.buyMany(eco, { h: "ice" }, OPEN4);
  assert.equal(one.msg, "얼음 투구를 구매했습니다 · 인벤토리에 넣었습니다");
  const poor = G.buyMany(owning(1000, {}), { h: "ice", t: "lava" }, OPEN4);
  assert.equal(poor.ok, false);
  assert.equal(poor.eco.gold, 1000);
  assert.deepEqual(G.readHero(poor.eco).own, {});
  assert.equal(poor.msg, "골드가 1,100 G 부족합니다");
  const none = G.buyMany(eco, { t: "dungeon", w: "moss" }, OPEN4);
  assert.equal(none.ok, false);
  assert.equal(none.msg, "구매할 장비가 없습니다");
});

test("equipMany: puts on every owned pick not worn yet", () => {
  const eco = owning(0, { "dungeon-t": 1, "ice-h": 1, "lava-t": 1 }, { t: "dungeon" });
  const r = G.equipMany(eco, { h: "ice", t: "lava", w: "moss" });
  assert.equal(r.ok, true);
  assert.deepEqual(G.readHero(r.eco).eq, { h: "ice", t: "lava", w: null });
  assert.equal(r.msg, "2개를 착용했습니다");
  assert.equal(G.equipMany(eco, { h: "ice" }).msg, "얼음 투구 착용");
  const none = G.equipMany(eco, { t: "dungeon", w: "moss" });
  assert.equal(none.ok, false);
  assert.equal(none.eco, eco);
});

test("every portrait layer has its 2x and 3x file (Herdr stretches images smoothly; art-src/gen_hero_scaled.py)", async () => {
  const { existsSync } = await import("node:fs");
  const art = new URL("../mods/pixel-quest/art/", import.meta.url);
  const eqs = [{}];
  for (const s of G.SETS) eqs.push({ h: s }, { t: s }, { w: s }, { h: s, t: s, w: s });
  const names = new Set();
  for (const sex of ["m", "f"]) for (const r of G.RANKS.map((x) => x.key ?? x)) for (const eq of eqs) for (const n of G.layers(sex, r, eq)) names.add(n);
  for (const n of names) for (const d of ["", "x2/", "x3/"]) {
    const f = new URL(`${n.replace("hero/", `hero/${d}`)}.png`, art);
    assert.ok(existsSync(f), `missing ${f.pathname}`);
  }
  assert.ok(names.size > 200);
});
