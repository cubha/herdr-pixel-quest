// The seven zones: which layout is which, when each opens, their colors
// (mods/pixel-quest/zones.js). Run: node --test tests/
import test from "node:test";
import assert from "node:assert/strict";
import * as Z from "../mods/pixel-quest/zones.js";

const at = (o = {}) => ({ best: 1, medals: {}, zones: [], ...o });

test("seven zones in the settings' order, two from the start, and the reborn's sanctum", () => {
  assert.deepEqual(Z.ZONES.map((z) => z.key), ["dungeon", "sunlit", "ice", "moss", "lava", "crystal", "throne", "astral"]);
  assert.deepEqual(Z.ZONES.map((z) => z.name), ["던전", "햇빛 석실", "얼음 동굴", "이끼 유적", "용암 굴", "수정 광산", "왕좌의 방", "별의 성소"]);
});

test("a zone's layout: the dark and light ones keep their names, new ones are pixel-quest-<zone>", () => {
  assert.equal(Z.zoneOf("pixel-quest"), "dungeon");
  assert.equal(Z.zoneOf("pixel-quest-light"), "sunlit");
  assert.equal(Z.zoneOf("pixel-quest-ice"), "ice");
  assert.equal(Z.zoneOf("pixel-quest-throne"), "throne");
  assert.equal(Z.zoneOf("pixel-quest-nope"), null);
  assert.equal(Z.zoneOf("main"), null);
  assert.equal(Z.zoneOf(undefined), null);
  assert.equal(Z.layoutOf("lava"), "pixel-quest-lava");
  assert.equal(Z.layoutOf("dungeon"), "pixel-quest");
});

test("the look a zone draws with: dark, light, or its own key", () => {
  assert.equal(Z.lookTheme("pixel-quest"), "dark");
  assert.equal(Z.lookTheme("pixel-quest-light"), "light");
  assert.equal(Z.lookTheme("pixel-quest-moss"), "moss");
  assert.equal(Z.lookTheme("pixel-quest-whatever"), "dark");
});

test("the sanctum's look follows the stars: astral1..astral5, never under 1 or over 5", () => {
  assert.equal(Z.layoutOf("astral"), "pixel-quest-astral");
  assert.deepEqual([undefined, 0, 1, 2, 3, 4, 5, 6, 40, 2.9, "x"].map((s) => Z.lookTheme("pixel-quest-astral", s)),
    ["astral1", "astral1", "astral1", "astral2", "astral3", "astral4", "astral5", "astral5", "astral5", "astral2", "astral1"]);
  assert.equal(Z.artOf("astral", 3), "astral3");
  // The other zones have one look, whatever the stars.
  assert.equal(Z.artOf("ice", 3), "ice");
  assert.equal(Z.lookTheme("pixel-quest-moss", 4), "moss");
  assert.equal(Z.lookTheme("pixel-quest", 4), "dark");
  assert.equal(Z.lookTheme("pixel-quest-light", 4), "light");
});

test("opening: ice at best Lv.4, lava at Lv.12", () => {
  assert.equal(Z.isOpen("ice", at({ best: 3 })), false);
  assert.equal(Z.isOpen("ice", at({ best: 4 })), true);
  assert.equal(Z.isOpen("lava", at({ best: 11 })), false);
  assert.equal(Z.isOpen("lava", at({ best: 12 })), true);
});

test("opening: moss with the 7-day medal, throne with the Lv.20 medal (not the level itself)", () => {
  assert.equal(Z.isOpen("moss", at({ medals: { streak3: 1 } })), false);
  assert.equal(Z.isOpen("moss", at({ medals: { streak7: 1 } })), true);
  assert.equal(Z.isOpen("throne", at({ best: 20 })), false);
  assert.equal(Z.isOpen("throne", at({ medals: { legend: 1 } })), true);
});

test("opening: crystal once bought in the shop; dungeon and sunlit always", () => {
  assert.equal(Z.isOpen("crystal", at({ best: 30 })), false);
  assert.equal(Z.isOpen("crystal", at({ zones: ["crystal"] })), true);
  assert.equal(Z.isOpen("dungeon", at()), true);
  assert.equal(Z.isOpen("sunlit", at()), true);
  assert.equal(Z.isOpen("nope", at()), false);
});

test("how to open, as the settings card says it", () => {
  assert.deepEqual(Z.ZONES.map((z) => Z.howOpen(z.key)),
    ["처음부터", "처음부터", "Lv.4", '훈장 "일주일 출석"', "Lv.12", "상점 3,000 G", '훈장 "전설"', "첫 환생"]);
});

test("each new zone repaints the surfaces and the gold, keeps the meanings", () => {
  for (const k of ["ice", "moss", "lava", "crystal", "throne"]) {
    const p = Z.paletteOf(k);
    for (const c of ["ink", "wall", "chrome", "fill", "raised", "hover", "stone", "well", "g0", "g1", "g2", "g3", "g4", "b0", "b1", "b2", "b3", "gt", "gt2"]) {
      assert.match(p[c], /^#[0-9a-f]{6}$/, `${k}.${c}`);
    }
    for (const c of ["done", "warn", "blocked", "working", "text", "onb"]) assert.equal(p[c], undefined, `${k} keeps ${c}`);
  }
  assert.equal(Z.paletteOf("ice").g2, "#8cc0d8");
  assert.equal(Z.paletteOf("throne").fill, "#311b23");
  assert.deepEqual(Z.paletteOf("dungeon"), {});
  assert.deepEqual(Z.paletteOf("sunlit"), {});
});

test("the sanctum repaints the same surfaces and gold; its frames' gold (f1..f3) brightens with the stars", () => {
  const lum = (h) => [1, 3, 5].reduce((s, i) => s + parseInt(h.slice(i, i + 2), 16), 0);
  for (const stars of [0, 1, 2, 3, 4, 5, 9]) {
    const p = Z.paletteOf("astral", stars);
    for (const c of ["ink", "wall", "chrome", "fill", "raised", "hover", "stone", "well", "dim", "g0", "g1", "g2", "g3", "g4", "b0", "b1", "b2", "b3", "gt", "gt2", "f1", "f2", "f3"]) {
      assert.match(p[c], /^#[0-9a-f]{6}$/, `astral ${stars} ${c}`);
    }
    for (const c of ["done", "warn", "blocked", "working", "text", "onb"]) assert.equal(p[c], undefined, `astral keeps ${c}`);
    // Gold text and buttons keep the ramp at every stage: only the frames change.
    assert.equal(p.g2, "#d8ac4e");
    assert.equal(p.gt, "#ffe6a0");
  }
  const f2 = [1, 2, 3, 4, 5].map((s) => lum(Z.paletteOf("astral", s).f2));
  for (let i = 1; i < 5; i++) assert.ok(f2[i] > f2[i - 1], `f2 brighter at ${i + 1} stars`);
  assert.equal(Z.paletteOf("astral", 1).f2, "#a07f3a");
  assert.deepEqual(Z.paletteOf("astral", 0), Z.paletteOf("astral", 1));
  assert.deepEqual(Z.paletteOf("astral", 8), Z.paletteOf("astral", 5));
  // No other zone has a frame ramp of its own.
  for (const k of ["ice", "moss", "lava", "crystal", "throne"]) assert.equal(Z.paletteOf(k, 3).f2, undefined, k);
});

// ---- the files a zone needs (tools/gen-zone-files.mjs, art-src/gen_zones.py) ----
import { existsSync, readFileSync } from "node:fs";
import { BUCKETS, lookArt } from "../mods/pixel-quest/look.js";
const ROOT = new URL("../", import.meta.url).pathname;
const has = (p) => existsSync(ROOT + p);
const pngSize = (p) => { const b = readFileSync(ROOT + p); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };

test("each new zone ships a layout (in the mod, not layouts/) and a theme", () => {
  for (const k of Z.DRAWN) {
    const name = Z.layoutOf(k);
    assert.ok(has(`mods/pixel-quest/zones/${name}.json`), name);
    assert.ok(!has(`layouts/${name}.json`), `${name} must not be installed up front (it would skip the lock)`);
    const L = JSON.parse(readFileSync(ROOT + `mods/pixel-quest/zones/${name}.json`, "utf8"));
    assert.equal(L.theme, name);
    assert.ok(has(`themes/${name}.json`), `theme ${name}`);
    const imgs = JSON.stringify(L).match(/mods\/pixel-quest\/art\/[^"]+\.png/g);
    for (const p of imgs) assert.ok(has(p), p);
  }
});

// The five stage-3 zones: the clock and the calendar show in them. The sanctum has neither.
const TIMED = Z.DRAWN.filter((k) => k !== "astral");

test("each new zone has its tablet for every time of day and its scene for every season and box shape", () => {
  assert.deepEqual(TIMED, ["ice", "lava", "crystal", "throne", "moss"]);
  for (const k of TIMED) {
    for (const phase of ["dawn", "day", "dusk", "night", "none"]) {
      for (const season of ["winter", "xmas", "spring", "summer", "autumn", "halloween", "none"]) {
        for (const bucket of BUCKETS) {
          const a = lookArt({ theme: k, phase, season, bucket });
          assert.equal(a.wall, null);
          assert.ok(has(a.tablet), a.tablet);
          assert.ok(has(a.deco), a.deco);
        }
      }
    }
  }
});

test("each new zone has its own walls, floor and gold sprites; the dressing matches its table", () => {
  const sprites = ["floor", "strip", "sill", "knob-gold", "emblem", "wordmark", "orn-l", "orn-r", "chain", "torch", "torch-glow", "sconce", "sconce-b", "sconce-halo", "bg-work", "card"];
  for (const k of TIMED) for (const n of sprites) assert.ok(has(`mods/pixel-quest/art/zone/${k}/${n}.png`), `${k}/${n}`);
  for (const [k, D] of Object.entries(Z.DRESS)) {
    const d = (n) => `mods/pixel-quest/art/zone/${k}/dress-${n}.png`;
    assert.deepEqual(pngSize(d("top-l")), [800, D.top], `${k} top`);
    assert.deepEqual(pngSize(d("bottom-r")), [800, D.bottom], `${k} bottom`);
    for (const c of ["bl", "br"]) assert.deepEqual(pngSize(d(`corner-${c}`)), [D[c][1], D[c][2]], `${k} ${c}`);
    if (D.side) assert.deepEqual(pngSize(d("side-lt")), [D.side, 600 - D.top], `${k} side`);
  }
});

test("the reward table and the medals say which zones they open", async () => {
  const G = await import("../mods/pixel-quest/progress.js");
  const E = await import("../mods/pixel-quest/economy.js");
  // Every zone that opens by level shows at that level in the adventure log's 해금표.
  for (const z of Z.ZONES.filter((x) => x.open.level))
    assert.ok(G.rewardsAt(z.open.level).some((r) => r.kind === "zone" && r.key === z.key), z.key);
  // 왕좌의 방 comes with the 전설 medal, which Lv.20 gives.
  assert.ok(G.rewardsAt(20).some((r) => r.kind === "zone" && r.key === "throne"));
  for (const r of G.REWARDS.filter((x) => x.kind === "zone")) assert.ok(Z.zoneBy(r.key), r.key);
  const zoneOf = (id) => E.medalZone(E.MEDALS.find((m) => m.id === id))?.key ?? null;
  assert.equal(zoneOf("streak7"), "moss");
  assert.equal(zoneOf("legend"), "throne");
  assert.equal(zoneOf("first"), null);
});

// ---- the sanctum of stars: every file the code can ask for, at every star count ----
// (kit.js pic / frame / starFrame, roles/tabs.js, roles/settings.js, look.js lookArt)
test("the sanctum has every picture its five stages can ask for, in every box shape, and no more scenes than that", async () => {
  const { readdirSync } = await import("node:fs");
  const art = (p) => `mods/pixel-quest/art/${p}.png`;
  const shared = ["emblem", "wordmark", "orn-l", "orn-r", "chain", "torch", "torch-glow", "sconce", "sconce-b", "sconce-halo", "card"];
  for (const n of shared) assert.ok(has(art(`zone/astral/${n}`)), `astral/${n}`);
  assert.deepEqual(pngSize(art("zone/astral/card")), [128, 80]);
  for (const stars of [1, 2, 3, 4, 5]) {
    const dir = Z.artOf("astral", stars);
    const need = ["floor", "floor-b", "strip", "strip-top", "sill", "knob-gold", "bg-work", "lamps", "card-l"];
    if (stars >= Z.ASTRAL_FRAME.corner) need.push("corner-tl", "corner-tr", "corner-bl", "corner-br");
    if (stars >= Z.ASTRAL_FRAME.edgeH) need.push("edge-h");
    if (stars >= Z.ASTRAL_FRAME.edgeV) need.push("edge-v");
    for (const n of need) assert.ok(has(art(`zone/${dir}/${n}`)), `${dir}/${n}`);
    // Nothing in the folder the code never asks for.
    assert.deepEqual(readdirSync(ROOT + `mods/pixel-quest/art/zone/${dir}`).sort(), need.map((n) => `${n}.png`).sort(), dir);
    // The sizes the kit draws them at.
    const size = (n) => pngSize(art(`zone/${dir}/${n}`));
    assert.deepEqual(size("floor"), [480, 1600]);
    assert.deepEqual(size("floor-b"), [480, 1600]);
    assert.deepEqual(size("strip"), [2560, 48]);
    assert.deepEqual(size("strip-top"), [2560, 48]);
    assert.deepEqual(size("sill"), [2560, 8]);
    assert.deepEqual(size("knob-gold"), [16, 16]);
    assert.deepEqual(size("lamps"), [380, 48]);
    assert.deepEqual(size("card-l"), [192, 120]);
    if (stars >= 2) { assert.deepEqual(size("corner-br"), [108, 108]); assert.deepEqual(size("edge-h"), [2560, 8]); }
    if (stars >= 3) assert.deepEqual(size("edge-v"), [8, 1600]);
    // Whatever the clock, the calendar or the settings say: one tablet, one scene per box shape.
    for (const phase of ["dawn", "day", "dusk", "night", "none"]) {
      for (const season of ["winter", "xmas", "spring", "summer", "autumn", "halloween", "none"]) {
        for (const bucket of BUCKETS) {
          const a = lookArt({ theme: Z.lookTheme("pixel-quest-astral", stars), phase, season, bucket });
          assert.equal(a.tablet, "mods/pixel-quest/art/look/tablet-astral-none.png");
          assert.equal(a.deco, `mods/pixel-quest/art/look/deco-astral${stars}-none-${bucket}.png`);
          assert.equal(a.wall, `mods/pixel-quest/art/zone/astral${stars}/bg-work.png`);
          for (const p of Object.values(a)) assert.ok(has(p), p);
        }
      }
    }
    // The scene is as high as the others' and as wide as its box shape.
    for (const bucket of BUCKETS) assert.deepEqual(pngSize(`mods/pixel-quest/art/look/deco-astral${stars}-none-${bucket}.png`), [Math.round(732 * bucket / 200) * 2, 732]);
  }
  // 1 tablet + 5 stages x 5 box shapes, no season or time-of-day copies.
  const look = readdirSync(ROOT + "mods/pixel-quest/art/look").filter((f) => f.includes("astral"));
  assert.equal(look.length, 26, look.join(" "));
});

test("the sanctum's files weigh well under the 6 MB set for them", async () => {
  const { readdirSync, statSync } = await import("node:fs");
  const A = ROOT + "mods/pixel-quest/art/";
  let bytes = 0;
  for (const d of ["zone/astral", ...[1, 2, 3, 4, 5].map((s) => `zone/astral${s}`)]) for (const f of readdirSync(A + d)) bytes += statSync(`${A}${d}/${f}`).size;
  for (const f of readdirSync(A + "look").filter((x) => x.includes("astral"))) bytes += statSync(`${A}look/${f}`).size;
  assert.ok(bytes < 4.5e6, `${(bytes / 1e6).toFixed(2)} MB`);
});
