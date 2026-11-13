// Gold, medals, the pet shop and the pet's moods (mods/pixel-quest/economy.js).
// Run: node --test tests/
import test from "node:test";
import assert from "node:assert/strict";
import * as E from "../mods/pixel-quest/economy.js";

const at = (y, m, d, h = 12) => new Date(y, m - 1, d, h, 0);
const NOV12 = at(2026, 11, 12, 14);

test("gold amounts and a thousands comma", () => {
  assert.deepEqual(E.GOLD, { quest: 10, level: 50, bronze: 100, silver: 300, gold: 1000 });
  assert.deepEqual([0, 300, 1400, 15600, 1234567].map(E.fmt), ["0", "300", "1,400", "15,600", "1,234,567"]);
});

test("twelve pets: eight for gold (15,600 in all), four from medals", () => {
  assert.equal(E.PETS.length, 12);
  const shop = E.PETS.filter((p) => p.price);
  assert.deepEqual(shop.map((p) => [p.key, p.price]), [["slime", 300], ["mushroom", 500], ["bat", 800], ["cat", 1200], ["ghost", 1800], ["ember", 2500], ["mimic", 3500], ["dragon", 5000]]);
  assert.equal(shop.reduce((s, p) => s + p.price, 0), 15600);
  assert.deepEqual(E.PETS.filter((p) => !p.price).map((p) => [p.key, p.medal]), [["goldslime", "veteran"], ["owl", "owl"], ["rooster", "rooster"], ["crownkit", "legend"]]);
});

test("seventeen medals in the mockup's order with their tiers and art", () => {
  assert.equal(E.MEDALS.length, 17);
  assert.deepEqual(E.MEDALS.map((m) => m.art), ["bronze-sword", "silver-sword", "gold-sword", "bronze-sun", "silver-sun", "bronze-flame", "silver-flame", "gold-flame",
    "silver-moon", "bronze-dawn", "silver-four", "silver-crown", "gold-crown", "gold-leaf", "silver-paw", "gold-paw", "gold-star"]);
  assert.equal(E.MEDALS[0].name, "첫 걸음");
  assert.equal(E.MEDALS.find((m) => m.id === "owl").name, "올빼미");
  assert.equal(E.medalGold(E.MEDALS.find((m) => m.id === "legend")), 1000);
});

test("day keys, seasons and the streak (one quest a day counts, a missed day breaks it)", () => {
  assert.equal(E.dayKey(at(2026, 1, 5)), "2026-01-05");
  assert.deepEqual([12, 1, 2, 3, 5, 6, 8, 9, 10, 11].map(E.seasonOf), ["winter", "winter", "winter", "spring", "spring", "summer", "summer", "autumn", "autumn", "autumn"]);
  const days = { "2026-11-10": 3, "2026-11-11": 10, "2026-11-12": 1 };
  assert.equal(E.streak(days, NOV12), 3);
  assert.equal(E.streak({ "2026-11-10": 3, "2026-11-11": 2 }, NOV12), 2);   // none yet today: up to yesterday
  assert.equal(E.streak({ "2026-11-09": 3, "2026-11-11": 2, "2026-11-12": 1 }, NOV12), 2);
  assert.equal(E.streak({}, NOV12), 0);
  assert.equal(E.streak({ "2026-02-28": 1, "2026-03-01": 1 }, at(2026, 3, 1)), 2);
});

test("days keep the last sixty", () => {
  let d = {};
  for (let i = 0; i < 70; i++) d = E.addDay(d, E.dayKey(new Date(2026, 0, 1 + i)));
  assert.equal(Object.keys(d).length, 60);
  assert.equal(d["2026-01-01"], undefined);
  assert.equal(d[E.dayKey(new Date(2026, 0, 70))], 1);
  assert.equal(E.addDay({ "2026-11-12": 4 }, "2026-11-12")["2026-11-12"], 5);
});

test("update day: 90 quests at best Lv.9 start with 1,400 G and the first medal", () => {
  const { eco, got } = E.start(90, 9, NOV12);
  assert.equal(eco.gold, 1400);
  assert.equal(eco.earned, 1400);
  assert.equal(eco.total, 90);
  assert.equal(eco.lvPaid, 9);
  assert.deepEqual(got.map((m) => m.id), ["first"]);
  assert.ok(eco.medals.first);
  assert.deepEqual(eco.days, {});
  assert.equal(eco.pet, null);
  // A new player: nothing to pay out.
  assert.equal(E.start(0, 1, NOV12).eco.gold, 0);
  assert.deepEqual(E.start(0, 1, NOV12).got, []);
});

test("a quest: +10 G, the day and season counted, the pet's bond up, lifetime count up", () => {
  let { eco } = E.start(90, 9, NOV12);
  eco = E.choose(E.buy(eco, "slime").eco, "slime").eco;
  const r = E.onQuest(eco, { now: NOV12, best: 9, working: 1 });
  assert.equal(r.gained, 10);
  assert.equal(r.eco.gold, 1400 - 300 + 10);
  assert.equal(r.eco.earned, 1410);
  assert.equal(r.eco.total, 91);
  assert.equal(r.eco.days["2026-11-12"], 1);
  assert.deepEqual(r.eco.qseasons, ["autumn"]);
  assert.equal(r.eco.pets.slime.bond, 1);
  // No pet along: nobody's bond moves.
  const s = E.onQuest(E.choose(r.eco, null).eco, { now: NOV12, best: 9, working: 1 });
  assert.equal(s.eco.pets.slime.bond, 1);
});

test("level-up gold follows the best level only, so a reset never pays twice", () => {
  let { eco } = E.start(90, 9, NOV12);
  const r = E.onQuest(eco, { now: NOV12, best: 10, working: 1 });
  assert.equal(r.gained, 10 + 50 + 300);            // quest, level, 기사 서임 (silver)
  assert.ok(r.got.some((m) => m.id === "knight"));
  assert.equal(r.eco.lvPaid, 10);
  const again = E.onQuest(r.eco, { now: NOV12, best: 10, working: 1 });
  assert.equal(again.gained, 10);
  const two = E.onQuest(E.start(5, 3, NOV12).eco, { now: NOV12, best: 5, working: 0 });
  assert.equal(two.gained, 10 + 100);
});

test("medals from the quest's moment: today 10 and 30, the hour, the 100th on the lifetime count", () => {
  let eco = E.start(95, 9, NOV12).eco;
  const got = [];
  for (let i = 0; i < 10; i++) {
    const r = E.onQuest(eco, { now: NOV12, best: 9, working: 1 });
    eco = r.eco; got.push(...r.got.map((m) => m.id));
  }
  assert.ok(got.includes("busy"));
  assert.ok(got.includes("veteran"));
  assert.ok(eco.pets.goldslime, "the golden slime comes with 백전노장");
  assert.equal(got.filter((m) => m === "busy").length, 1);
  const owl = E.onQuest(eco, { now: at(2026, 11, 13, 2), best: 9, working: 1 });
  assert.deepEqual(owl.got.map((m) => m.id), ["owl"]);
  assert.ok(owl.eco.pets.owl);
  const dawn = E.onQuest(owl.eco, { now: at(2026, 11, 13, 6), best: 9, working: 1 });
  assert.deepEqual(dawn.got.map((m) => m.id), ["rooster"]);
  assert.equal(E.onQuest(owl.eco, { now: at(2026, 11, 13, 7), best: 9, working: 1 }).got.length, 0);
});

test("the full party: four agents working at once, and the most seen so far", () => {
  let { eco } = E.start(10, 2, NOV12);
  let r = E.onParty(eco, 2, { now: NOV12, best: 2 });
  assert.equal(r.eco.partyMax, 2);
  assert.equal(r.got.length, 0);
  assert.equal(E.onParty(r.eco, 1, { now: NOV12, best: 2 }).eco.partyMax, 2);
  r = E.onParty(r.eco, 4, { now: NOV12, best: 2 });
  assert.deepEqual(r.got.map((m) => m.id), ["party"]);
  assert.equal(r.eco.gold, 10 * 10 + 50 + 100 + 300);
});

test("streak medals and the four seasons", () => {
  let { eco } = E.start(10, 2, NOV12);
  eco = { ...eco, days: { "2026-11-10": 1, "2026-11-11": 1 }, qseasons: ["spring", "summer", "winter"] };
  const r = E.onQuest(eco, { now: NOV12, best: 2, working: 1 });
  assert.deepEqual(r.got.map((m) => m.id).sort(), ["seasons", "streak3"]);
});

test("the shop: buy at once with enough gold, the shortfall otherwise, no second copy, medal pets not for sale", () => {
  const { eco } = E.start(90, 9, NOV12);
  const a = E.buy(eco, "cat");
  assert.equal(a.ok, true);
  assert.equal(a.eco.gold, 200);
  assert.deepEqual(a.eco.pets.cat, { bond: 0 });
  assert.equal(a.eco.pet, "cat", "the first pet comes along at once");
  const b = E.buy(a.eco, "dragon");
  assert.equal(b.ok, false);
  assert.equal(b.eco, a.eco);
  assert.equal(b.msg, "새끼 용: 4,800 G가 모자랍니다");
  assert.equal(E.buy(a.eco, "cat").msg, "고양이: 이미 가진 펫입니다");
  assert.equal(E.buy(a.eco, "owl").ok, false);
  assert.equal(E.buy(a.eco, "nope").ok, false);
  const c = E.buy(a.eco, "slime");
  assert.equal(c.eco.pet, "cat", "a later buy does not swap the pet along");
});

test("five pets: the tamer medal and its own gold, chained", () => {
  let eco = { ...E.start(0, 1, NOV12).eco, gold: 20000 };
  const got = [];
  for (const k of ["slime", "mushroom", "bat", "cat", "ghost"]) { const r = E.buy(eco, k); eco = r.eco; got.push(...r.got.map((m) => m.id)); }
  assert.deepEqual(got, ["tamer"]);
  assert.equal(eco.gold, 20000 - 300 - 500 - 800 - 1200 - 1800 + 300);
});

test("choosing the pet along: only owned ones, or none", () => {
  const eco = E.buy(E.start(90, 9, NOV12).eco, "slime").eco;
  assert.equal(E.choose(eco, "cat").ok, false);
  assert.equal(E.choose(eco, "cat").msg, "얻는 방법: 상점에서 1,200 G");
  assert.equal(E.choose(eco, "owl").msg, "얻는 방법: 훈장 \"올빼미\"");
  assert.equal(E.choose(eco, null).eco.pet, null);
  assert.equal(E.choose(E.choose(eco, null).eco, "slime").eco.pet, "slime");
});

test("growth stages at 50 and 200 bond, and the art for each look", () => {
  assert.deepEqual([0, 49, 50, 199, 200, 999].map(E.stageOf), [1, 1, 2, 2, 3, 3]);
  assert.deepEqual(E.petArt("slime", 0, false, false), { name: "pet-slime-1-a", w: 24, h: 20 });
  assert.deepEqual(E.petArt("cat", 60, true, true), { name: "pet-cat-2-s-r", w: 28, h: 24 });
  assert.deepEqual(E.petArt("dragon", 300, false, true), { name: "pet-dragon-3-a-r", w: 32, h: 28 });
});

test("the pet's mood: waiting beats a finished quest beats drained beats working beats rest", () => {
  const m = (o) => E.moodOf({ blocked: false, hop: false, tired: false, working: false, ...o });
  assert.equal(m({}), "sleep");
  assert.equal(m({ working: true }), "walk");
  assert.equal(m({ working: true, tired: true }), "tired");
  assert.equal(m({ tired: true, hop: true }), "hop");
  assert.equal(m({ hop: true, blocked: true }), "alert");
});

test("drained at 80% of an unexpired window", () => {
  const now = 1000;
  assert.equal(E.drained({ five_hour: { used_percentage: 82, resets_at: 2000 } }, now)?.label, "5시간");
  assert.equal(E.drained({ five_hour: { used_percentage: 82, resets_at: 2000 } }, now)?.pct, 82);
  assert.equal(E.drained({ five_hour: { used_percentage: 82, resets_at: 900 } }, now), null);
  assert.equal(E.drained({ five_hour: { used_percentage: 40, resets_at: 2000 }, seven_day: { used_percentage: 91, resets_at: 9000 } }, now)?.label, "7일");
  assert.equal(E.drained(null, now), null);
});

test("where the pet goes next: out to 45% of the lane and home, a slow crawl near home when drained", () => {
  const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };
  const out = E.nextSpot("walk", 0, seq(0.5, 0.8));
  assert.ok(Math.abs(out.x - 0.36) < 1e-9);
  assert.equal(out.ms, Math.round(36 * 50 + 400));
  assert.equal(out.easing, "linear");
  assert.equal(E.nextSpot("walk", 0.3, seq(0.1)).x, 0);
  const t = E.nextSpot("tired", 0.1, seq(0.9, 0.5));
  assert.ok(Math.abs(t.x - 0.135) < 1e-9);
  assert.equal(t.ms, 2800);
  assert.equal(t.easing, "ease-in-out");
  assert.ok(E.nextSpot("tired", 0.15, seq(0.9, 1)).x <= 0.16);
  assert.ok(E.nextSpot("tired", 0.01, seq(0.1, 1)).x >= 0);
  const home = E.nextSpot("sleep", 0.4, seq(0.5));
  assert.equal(home.x, 0);
  assert.equal(E.nextSpot("sleep", 0, seq(0.5)), null);
});

test("medal progress lines like the mockup", () => {
  const { eco } = E.start(90, 9, NOV12);
  const e = { ...eco, days: { "2026-11-12": 7 }, partyMax: 2, qseasons: ["autumn"] };
  const ctx = { now: NOV12, best: 9 };
  const p = (id) => E.progressOf(E.MEDALS.find((m) => m.id === id), e, ctx).text;
  assert.equal(p("first"), "받음");
  assert.equal(p("veteran"), "90 / 100");
  assert.equal(p("thousand"), "90 / 1,000");
  assert.equal(p("busy"), "오늘 7 / 10");
  assert.equal(p("streak3"), "1 / 3일");
  assert.equal(p("party"), "지금까지 최대 2명");
  assert.equal(p("knight"), "지금 Lv.9");
  assert.equal(p("seasons"), "가을 1 / 4");
  assert.equal(p("tamer"), "0 / 5");
  assert.equal(p("all"), "1 / 16");
  assert.equal(p("owl"), "");
});

test("the bubble: today, the streak and the nearest medal; waiting and drained say that first", () => {
  const { eco } = E.start(90, 9, NOV12);
  const e = { ...eco, days: { "2026-11-12": 7 } };
  const ctx = { now: NOV12, best: 9 };
  assert.equal(E.bubble(e, ctx, { mood: "sleep" }), "오늘 퀘스트 7개 · 연속 1일 · 훈장 \"부지런한 하루\"까지 3개");
  assert.equal(E.bubble(e, ctx, { mood: "hop" }), "퀘스트 완료! +10 G · 오늘 7개째");
  assert.equal(E.bubble(e, ctx, { mood: "alert", who: "notes-app" }), "notes-app이 입력을 기다립니다 · 누르면 이동");
  assert.equal(E.bubble(e, ctx, { mood: "alert", who: "모험" }), "모험이 입력을 기다립니다 · 누르면 이동");
  assert.equal(E.bubble(e, ctx, { mood: "alert", who: "파티" }), "파티가 입력을 기다립니다 · 누르면 이동");
  assert.equal(E.bubble(e, ctx, { mood: "tired", drain: { label: "5시간", pct: 82 } }), "방전! 5시간 사용량 82% · 누르면 사용량 카드");
});

test("a medal's pet comes along when none is (like the first pet bought)", () => {
  const { eco } = E.start(120, 10, NOV12);
  assert.ok(eco.pets.goldslime);
  assert.equal(eco.pet, "goldslime");
  const withCat = { ...E.start(0, 1, NOV12).eco, gold: 5000 };
  const b = E.buy(withCat, "cat").eco;
  const r = E.onQuest({ ...b, total: 99 }, { now: NOV12, best: 1, working: 0 });
  assert.ok(r.eco.pets.goldslime);
  assert.equal(r.eco.pet, "cat");
});

// ---- zones bought in the shop (stage 3: 수정 광산, 3,000 G) ----
test("a zone for gold: crystal costs 3,000 G, once", () => {
  const e = { ...E.read({}), gold: 3200 };
  const r = E.buyZone(e, "crystal");
  assert.equal(r.ok, true);
  assert.equal(r.eco.gold, 200);
  assert.deepEqual(r.eco.zones, ["crystal"]);
  const again = E.buyZone(r.eco, "crystal");
  assert.equal(again.ok, false);
  assert.equal(again.eco.gold, 200);
});

test("a zone for gold: short of gold says by how much, other zones are not for sale", () => {
  const poor = E.buyZone({ ...E.read({}), gold: 2500 }, "crystal");
  assert.equal(poor.ok, false);
  assert.equal(poor.eco.gold, 2500);
  assert.match(poor.msg, /500 G가 모자랍니다/);
  assert.equal(E.buyZone({ ...E.read({}), gold: 9999 }, "ice").ok, false);
  assert.equal(E.ZONE_PRICE.crystal, 3000);
});

test("zones bought: read fills a missing or broken list", () => {
  assert.deepEqual(E.read({}).zones, []);
  assert.deepEqual(E.read({ zones: "x" }).zones, []);
  assert.deepEqual(E.read({ zones: ["crystal"] }).zones, ["crystal"]);
});
