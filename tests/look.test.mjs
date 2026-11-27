// Time of day, seasons and the layout file the look writes (mods/pixel-quest/look.js).
// Run: node --test tests/
import test from "node:test";
import assert from "node:assert/strict";
import * as L from "../mods/pixel-quest/look.js";

test("phase of the hour: dawn 5-7, day 7-17, dusk 17-21, night 21-5", () => {
  const at = (h) => L.phaseOf(h);
  assert.deepEqual([4, 5, 6, 7, 12, 16, 17, 20, 21, 23, 0].map(at),
    ["night", "dawn", "dawn", "day", "day", "day", "dusk", "dusk", "night", "night", "night"]);
});

test("season of the month: winter 1-2, spring 3-5, summer 6-8, autumn 9 and 11, halloween 10, xmas 12", () => {
  assert.deepEqual([1, 2, 3, 5, 6, 8, 9, 10, 11, 12].map(L.seasonOf),
    ["winter", "winter", "spring", "spring", "summer", "summer", "autumn", "halloween", "autumn", "xmas"]);
});

test("aspect buckets: nearest of the five, bad sizes fall back to the usual one", () => {
  assert.equal(L.bucketOf(978, 716), 136);      // sidebar open, panel shut
  assert.equal(L.bucketOf(602, 716), 85);       // panel open
  assert.equal(L.bucketOf(1202, 716), 170);     // sidebar folded
  assert.equal(L.bucketOf(830, 716), 115);
  assert.equal(L.bucketOf(1600, 716), 210);
  assert.equal(L.bucketOf(0, 0), 136);
  assert.equal(L.bucketOf(NaN, 700), 136);
});

test("the work area from the window, the work column and the side panel", () => {
  assert.deepEqual(L.mainArea({ vw: 1280, vh: 820, workW: 1010, panel: { open: false, w: 368 } }), { w: 994, h: 726 });
  assert.deepEqual(L.mainArea({ vw: 1280, vh: 820, workW: 1010, panel: { open: true, w: 368 } }), { w: 618, h: 726 });
});

test("panel state: a click in .state beats the file", () => {
  const file = { id: "root", children: [{ id: "work", children: [{ id: "work-body", children: [{ id: "panel", hidden: true, size: { px: 368 } }] }] }] };
  assert.deepEqual(L.panelState(file, null), { open: false, w: 368 });
  assert.deepEqual(L.panelState(file, { nodes: { panel: { hidden: false } } }), { open: true, w: 368 });
  assert.deepEqual(L.panelState(file, { nodes: { panel: { hidden: false, size: { px: 420 } } } }), { open: true, w: 420 });
});

test("art for a look: tablet by phase, decoration by season and bucket, off = none", () => {
  const a = L.lookArt({ theme: "dark", phase: "night", season: "winter", bucket: 136 });
  assert.equal(a.tablet, "mods/pixel-quest/art/look/tablet-dark-night.png");
  assert.equal(a.deco, "mods/pixel-quest/art/look/deco-dark-winter-136.png");
  assert.equal(a.wall, null);
  const b = L.lookArt({ theme: "light", phase: "dusk", season: "autumn", bucket: 85 });
  assert.equal(b.tablet, "mods/pixel-quest/art/look/tablet-light-dusk.png");
  assert.equal(b.wall, "mods/pixel-quest/art/look/bg-slate-dusk.png");
  assert.equal(L.lookArt({ theme: "light", phase: "day", season: "none", bucket: 136 }).wall, "mods/pixel-quest/art/bg-slate.png");
});

test("the look's surroundings: time off is the plain tablet, seasons off the plain decoration", () => {
  const now = new Date(2026, 9, 31, 22, 0);   // 10/31 22:00
  assert.deepEqual(L.lookNow(now, { time: true, seasons: true }), { phase: "night", season: "halloween" });
  assert.deepEqual(L.lookNow(now, { time: false, seasons: false }), { phase: "none", season: "none" });
});

const LAYOUT = {
  id: "root", type: "row", terminal_opacity: 0.3, font_size: 12, background: { image: "mods/pixel-quest/art/bg-work.png", fit: "cover" },
  children: [
    { id: "sidebar", type: "column", children: [] },
    { id: "work", type: "column", children: [
      { id: "tabs", type: "block" },
      { id: "work-body", type: "row", padding: 8, gap: 8, floating: [{ id: "party", edge: "right", peek: 58 }], children: [
        { id: "main", type: "block", content: { tab: "active" }, background: { image: "mods/pixel-quest/art/tablet.png", fit: "cover" } },
        { id: "panel", type: "column", hidden: true, size: { px: 368 }, background: "#121731" },
      ] },
    ] },
  ],
};
const find = (n, id) => (n?.id === id ? n : (n?.children ?? []).map((c) => find(c, id)).find(Boolean));

test("an old layout file is moved to the two-layer shape: tablet behind, decoration in front, drawer on the work area", () => {
  const art = L.lookArt({ theme: "dark", phase: "day", season: "spring", bucket: 136 });
  const out = JSON.parse(L.layoutWith(JSON.stringify(LAYOUT), { art }));
  const wrap = find(out, "main-wrap");
  assert.equal(wrap.type, "column");
  assert.equal(wrap.background.image, art.tablet);
  assert.equal(wrap.children[0].id, "main");
  assert.equal(find(out, "main").background.image, art.deco);
  assert.deepEqual(find(out, "main").content, { tab: "active" });
  assert.equal(find(out, "work-body").floating, undefined);
  assert.equal(find(out, "main-wrap").floating[0].id, "party");
  assert.equal(out.terminal_opacity, 0);
  // Everything else stays, the panel's hidden flag first of all.
  assert.equal(find(out, "panel").hidden, true);
  assert.equal(out.font_size, 12);
});

test("the season's ledge: an 8px row above the work area, a spacer below, the work body padded only at the sides", () => {
  const art = L.lookArt({ theme: "dark", phase: "day", season: "winter", bucket: 136 });
  const out = JSON.parse(L.layoutWith(JSON.stringify(LAYOUT), { art }));
  const work = find(out, "work");
  assert.deepEqual(work.children.map((c) => c.id), ["tabs", "ledge", "work-body", "ledge-under"]);
  assert.deepEqual(find(out, "ledge").content, { mod: "pixel-quest", props: { role: "ledge" } });
  assert.deepEqual(find(out, "ledge").size, { px: 8 });
  assert.deepEqual(find(out, "ledge-under").size, { px: 8 });
  assert.deepEqual(find(out, "work-body").padding, [0, 8]);
  // Notifications in the theme too, unless the file already names another mod.
  assert.equal(out.toast, "pixel-quest");
  assert.equal(JSON.parse(L.layoutWith(JSON.stringify({ ...LAYOUT, toast: "my-toast" }), { art })).toast, "my-toast");
  // Already moved: the same text again.
  const once = L.layoutWith(JSON.stringify(LAYOUT), { art });
  assert.equal(L.layoutWith(once, { art }), once);
});

test("the layout text: font size and the light wall, unchanged text when nothing moves", () => {
  const art = L.lookArt({ theme: "light", phase: "night", season: "xmas", bucket: 85 });
  const once = L.layoutWith(JSON.stringify(LAYOUT), { art, fontSize: 14, panelColor: "#9da7c0" });
  const o = JSON.parse(once);
  assert.equal(o.font_size, 14);
  assert.equal(o.background.image, art.wall);
  assert.equal(find(o, "panel").background, "#9da7c0");
  assert.equal(L.layoutWith(once, { art, fontSize: 14, panelColor: "#9da7c0" }), once);
});

test("a layout that isn't one of ours, or isn't JSON, is left alone", () => {
  const art = L.lookArt({ theme: "dark", phase: "day", season: "none", bucket: 136 });
  assert.equal(L.layoutWith("{not json", { art }), null);
  assert.equal(L.layoutWith(JSON.stringify({ id: "root", children: [] }), { art }), null);
});

test("light dimming: day and dark stay, dusk and night darken the surfaces", () => {
  assert.equal(L.dim("#e4e8f0", "light", "day"), "#e4e8f0");
  assert.equal(L.dim("#e4e8f0", "dark", "night"), "#e4e8f0");
  assert.equal(L.dim("#e4e8f0", "light", "night"), "#929eca");
  assert.equal(L.dim("#e4e8f0", "light", "none"), "#e4e8f0");
});

test("the status bar takes in the spacer and the sill (8 + 8 + 28 = 44) so the pet's marks fit above its head", () => {
  const withBar = JSON.parse(JSON.stringify(LAYOUT));
  find(withBar, "work").children.push(
    { id: "sill", type: "block", content: { mod: "pixel-quest", props: { role: "sill" } }, size: { px: 8 } },
    { id: "status", type: "block", content: { mod: "pixel-quest", props: { role: "status" } }, size: { px: 28 } });
  const art = L.lookArt({ theme: "dark", phase: "day", season: "none", bucket: 136 });
  const once = L.layoutWith(JSON.stringify(withBar), { art });
  const out = JSON.parse(once);
  assert.deepEqual(find(out, "work").children.map((c) => c.id), ["tabs", "ledge", "work-body", "status"]);
  assert.deepEqual(find(out, "status").size, { px: 44 });
  assert.deepEqual(find(out, "status").content, { mod: "pixel-quest", props: { role: "status" } });
  assert.equal(L.layoutWith(once, { art }), once);
});

test("a season pinned in the settings beats the calendar; 자동 (null) follows it", () => {
  const oct = new Date(2026, 9, 31, 23, 0);
  assert.equal(L.lookNow(oct, { season: "spring" }).season, "spring");
  assert.equal(L.lookNow(oct, { season: "winter" }).season, "winter");
  assert.equal(L.lookNow(oct, { season: null }).season, "halloween");
  assert.equal(L.lookNow(oct, { season: "xmas" }).season, "halloween");   // only the four can be pinned
  assert.equal(L.lookNow(oct, { seasons: false, season: "summer" }).season, "none");
});

test("the hero's panel: an older layout gets the block, its height follows the fold", () => {
  const withLists = { ...LAYOUT, children: [{ id: "sidebar", type: "column", size: { px: 268 }, children: [{ id: "sidebar-lists", type: "column", children: [{ id: "spaces", type: "block" }, { id: "agents", type: "block" }] }] }, ...(LAYOUT.children ?? [])] };
  const art = L.lookArt({ theme: "dark", phase: "none", season: "none", bucket: 136 });
  const out = JSON.parse(L.layoutWith(JSON.stringify(withLists), { art, heroPx: L.heroPx(true, 268) }));
  const lists = out.children[0].children[0];
  assert.deepEqual(lists.children.map((c) => c.id), ["hero", "spaces", "agents"]);
  assert.deepEqual(lists.children[0].size, { px: L.HERO_PX.open });
  assert.deepEqual(lists.children[0].content, { mod: "pixel-quest", props: { role: "hero" } });
  const shut = JSON.parse(L.layoutWith(JSON.stringify(out), { art, heroPx: L.heroPx(false, 268) }));
  assert.equal(shut.children[0].children[0].children.length, 3);
  assert.deepEqual(shut.children[0].children[0].children[0].size, { px: L.HERO_PX.shut });
  assert.equal(L.heroPx(true, 44), L.HERO_PX.shut);
  assert.equal(L.sidebarW(withLists, { nodes: { sidebar: { size: { px: 44 } } } }), 44);
  assert.equal(L.sidebarW(withLists, null), 268);
});

test("the hero's panel has three states in pq.hero: open, big and folded (from either)", () => {
  assert.equal(L.heroMode(undefined), "open");
  assert.equal(L.heroMode(true), "open");
  assert.equal(L.heroMode(false), "shut");
  assert.equal(L.heroMode("big"), "big");
  assert.equal(L.heroMode("big-shut"), "shut");
  assert.equal(L.heroMode("junk"), "open");
  // the zoom icon: open <-> big
  assert.equal(L.heroToggleBig(true), "big");
  assert.equal(L.heroToggleBig(undefined), "big");
  assert.equal(L.heroToggleBig("big"), true);
  // the fold icon: unfolding goes back to the state it was folded from
  assert.equal(L.heroToggleFold(true), false);
  assert.equal(L.heroToggleFold(false), true);
  assert.equal(L.heroToggleFold("big"), "big-shut");
  assert.equal(L.heroToggleFold("big-shut"), "big");
});

test("the big panel: the portrait at a whole multiple that fits the sidebar, the block's height fitted to it", () => {
  const b = L.heroBig(268);                     // inside: 268 - root 8 - panel border 4 - padding 4 - portrait frame 6 = 246
  assert.deepEqual([b.k, b.w, b.h], [2, 240, 262]);   // whole px per cell (Herdr stretches images smoothly)
  assert.equal(b.px, L.HERO_PX.open);              // 2x: 262 + 50 is under the open height, so the open height (the lists below don't move)
  assert.equal(L.heroBig(322).px, L.HERO_PX.open); // still 2x: no empty band under the portrait however wide
  assert.equal(L.heroBig(400).px, 393 + 50);       // 3x: root 8, band 20, gap 6, border 4, padding 4, frame 6, 2 to spare
  assert.equal(L.canBig(261), false);              // 261 - 22 = 239: under 2x
  assert.equal(L.canBig(262), true);
  assert.deepEqual([L.heroBig(900).k, L.heroBig(900).w], [3, 360]);   // a wide sidebar stops at 3x
  assert.deepEqual([L.heroBig(250).k, L.heroBig(250).w], [1, 120]);   // under 2x: 1x
  assert.equal(L.heroPx("big", 268), b.px);
  assert.equal(L.heroPx("big-shut", 268), L.HERO_PX.shut);
  assert.equal(L.heroPx("big", 120), L.HERO_PX.shut);   // down to its rail
  assert.equal(L.heroPx("big", 250), L.HERO_PX.open);   // under 2x: shown open
  assert.equal(L.heroPx(true, 268), L.HERO_PX.open);
  assert.equal(L.heroPx(undefined, 268), L.HERO_PX.open);
});

test("the sanctum of stars is outside the clock and the calendar: one scene per stage and box shape", () => {
  for (const t of ["astral1", "astral3", "astral5"]) assert.equal(L.timeless(t), true, t);
  for (const t of ["dark", "light", "ice", "moss", "astral", "astral0", "astral6", undefined]) assert.equal(L.timeless(t), false, String(t));
  const a = L.lookArt({ theme: "astral3", phase: "night", season: "xmas", bucket: 170 });
  assert.deepEqual(a, {
    tablet: "mods/pixel-quest/art/look/tablet-astral-none.png",
    deco: "mods/pixel-quest/art/look/deco-astral3-none-170.png",
    wall: "mods/pixel-quest/art/zone/astral3/bg-work.png",
  });
  // The other zones still follow the phase and the season, and have no wall of their own.
  assert.deepEqual(L.lookArt({ theme: "ice", phase: "night", season: "xmas", bucket: 170 }), {
    tablet: "mods/pixel-quest/art/look/tablet-ice-night.png", deco: "mods/pixel-quest/art/look/deco-ice-xmas-170.png", wall: null,
  });
});

test("the sanctum's layout text: the stage's scene, outer night and focused pane's gold; the same text when the stage stays", () => {
  const file = JSON.stringify({ id: "root", type: "row", background: { image: "mods/pixel-quest/art/zone/astral1/bg-work.png", fit: "cover" }, children: [
    { id: "work", type: "column", children: [{ id: "work-body", type: "row", children: [{ id: "main-wrap", type: "column", children: [
      { id: "main", type: "block", content: { tab: "active", pane: { border: { width: 2, color: "#06070b" }, focus: { width: 2, color: "#d8ac4e" } } } }] }] }] }] });
  const at = (theme, focus) => L.layoutWith(file, { art: L.lookArt({ theme, phase: "none", season: "none", bucket: 136 }), focus });
  const one = JSON.parse(at("astral4", "#e1b351"));
  const find = (n, id) => (n.id === id ? n : (n.children ?? []).map((c) => find(c, id)).find(Boolean));
  assert.equal(one.background.image, "mods/pixel-quest/art/zone/astral4/bg-work.png");
  assert.equal(find(one, "main-wrap").background.image, "mods/pixel-quest/art/look/tablet-astral-none.png");
  assert.equal(find(one, "main").background.image, "mods/pixel-quest/art/look/deco-astral4-none-136.png");
  assert.equal(find(one, "main").content.pane.focus.color, "#e1b351");
  assert.equal(find(one, "main").content.pane.border.color, "#06070b");
  const text = at("astral4", "#e1b351");
  assert.equal(L.layoutWith(text, { art: L.lookArt({ theme: "astral4", phase: "none", season: "none", bucket: 136 }), focus: "#e1b351" }), text);
  // Without a focus color (every other zone) the pane's border is left as written.
  assert.equal(find(JSON.parse(L.layoutWith(file, { art: L.lookArt({ theme: "ice", phase: "none", season: "none", bucket: 136 }) })), "main").content.pane.focus.color, "#d8ac4e");
});
