// The seven zones: which layout is which, when each opens, their colors
// (mods/pixel-quest/zones.js). Run: node --test tests/
import test from "node:test";
import assert from "node:assert/strict";
import * as Z from "../mods/pixel-quest/zones.js";

const at = (o = {}) => ({ best: 1, medals: {}, zones: [], ...o });

test("seven zones in the settings' order, two from the start", () => {
  assert.deepEqual(Z.ZONES.map((z) => z.key), ["dungeon", "sunlit", "ice", "moss", "lava", "crystal", "throne"]);
  assert.deepEqual(Z.ZONES.map((z) => z.name), ["던전", "햇빛 석실", "얼음 동굴", "이끼 유적", "용암 굴", "수정 광산", "왕좌의 방"]);
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
    ["처음부터", "처음부터", "Lv.4", '훈장 "일주일 출석"', "Lv.12", "상점 3,000 G", '훈장 "전설"']);
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

test("each new zone has its tablet for every time of day and its scene for every season and box shape", () => {
  for (const k of Z.DRAWN) {
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
  for (const k of Z.DRAWN) for (const n of sprites) assert.ok(has(`mods/pixel-quest/art/zone/${k}/${n}.png`), `${k}/${n}`);
  for (const [k, D] of Object.entries(Z.DRESS)) {
    const d = (n) => `mods/pixel-quest/art/zone/${k}/dress-${n}.png`;
    assert.deepEqual(pngSize(d("top-l")), [800, D.top], `${k} top`);
    assert.deepEqual(pngSize(d("bottom-r")), [800, D.bottom], `${k} bottom`);
    for (const c of ["bl", "br"]) assert.deepEqual(pngSize(d(`corner-${c}`)), [D[c][1], D[c][2]], `${k} ${c}`);
    if (D.side) assert.deepEqual(pngSize(d("side-lt")), [D.side, 600 - D.top], `${k} side`);
  }
});
