// Pixel Quest drawing kit: the "abyss inventory" palette, pixel units, gold
// frames, status gems and pixel buttons. Shared by every pq-* mod.
//
// Pixels: the art is drawn at 1 art px = 2 screen px and shipped already
// doubled, so every PNG is shown at exactly its file size divided by zoom.
// Never stretch a PNG: GPUI filters images, so any other size blurs.
//
// Copyright (c) 2026 cubha. MIT License (see the repository's LICENSE).

import { div, image } from "gpui-kit";
import { h_flex } from "gpui-base";
import { settings, theme, shared, setShared, openOverlay, run, watchFolder, appHome, spaces, focused, readTextFile, writeTextFile, window as hwin } from "herdr";
import { FACES, BASE, ROWS, autoPool, faceLevel, bestAfter, progressAt, pick } from "./progress.js";
import { renameSpec } from "./dialogs.js";
import { lookNow, lookArt, layoutWith, panelState, mainArea, bucketOf, dim } from "./look.js";

export const ART = "mods/pixel-quest/art";
export const SND = "mods/pixel-quest/sounds";

export const FONT = "Galmuri11";
export const SMALL = "Galmuri9";
export const MONO = "GalmuriMono11";

export const P = {
  ink: "#05060c",
  wall: "#0b0e1c",
  chrome: "#0e1226",
  fill: "#121731",
  raised: "#1a2142",
  hover: "#252e55",
  stone: "#363a60",
  text: "#e8dcc0",
  muted: "#b8a88a",
  dim: "#7a7090",
  // gold ramp: dark -> light
  g0: "#5a2e1e", g1: "#9a5a26", g2: "#d49a3a", g3: "#f6d870", g4: "#fff4c8",
  // bronze ramp
  b0: "#2e1a1e", b1: "#5a3418", b2: "#8a5a2a", b3: "#b8864a",
  // meanings (gold is decoration and selection only)
  done: "#3f9a4a", warn: "#ff9a2a", blocked: "#c0392b", working: "#3f74e0", idle: "#6a6488",
  // gold text on panel surfaces (bright gold on dark, deep gold on parchment)
  gt: "#f6d870", gt2: "#d49a3a",
  // wells (inputs, tab tracks) sunk into a panel, and text on bronze plates
  well: "#05060c", onb: "#e8dcc0",
  light: false,
};

// The daylight palette for the pixel-quest-light layout: blue-grey slate
// walls, pale stone panels, navy ink. Gold and bronze ramps stay (frames, plaques).
const DARK = { ...P };
const LIGHT = {
  ...P,
  ink: "#1f2638", wall: "#a9b2c4", chrome: "#c3cad8", fill: "#e4e8f0", raised: "#d6dce8",
  hover: "#eef1f7", stone: "#8a94aa", text: "#1c2233", muted: "#3e4760", dim: "#5f6880",
  gt: "#7a4a0c", gt2: "#8a5a1a", idle: "#7a8296", well: "#f6f8fb",
  light: true,
};

/** Art with a daylight version (`<name>-slate.png`) used in the light look. */
const LIGHT_ART = new Set(["floor", "strip", "sill"]);

/** Light when the shown theme's terminal background is light. */
function isLight() {
  const hex = String(theme()?.background ?? "").replace("#", "");
  if (hex.length < 6) return false;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b > 140;
}

const RAMPS = {
  gold: { tl: P.g3, br: P.g1, mid: P.g2 },
  bronze: { tl: P.b3, br: P.b1, mid: P.b2 },
  red: { tl: "#e0564f", br: "#8a1a1a", mid: "#c0392b" },
};

// Light surfaces that dim out of daylight (look.js dim), and the time of day / season
// the shown look is in (shared pq.look, written by applyLook).
const DIMMED = ["wall", "chrome", "fill", "raised", "hover", "stone", "well"];
export const look = () => shared("pq.look") ?? { theme: "dark", phase: "none", season: "none" };

/** u(n): n screen px at zoom 1, in layout px (so art stays 1:1 on screen).
 *  o.dim false: keep the daylight surfaces (the pane header, the party drawer). */
export function unit(o = {}) {
  // Every render starts here, so this is where the palette follows the theme.
  const light = isLight();
  Object.assign(P, light ? LIGHT : DARK);
  const lk = look();
  P.phase = light && o.dim !== false ? lk.phase : "none";
  if (light && o.dim !== false) for (const k of DIMMED) P[k] = dim(LIGHT[k], "light", lk.phase);
  const z = Number(settings()?.zoom) || 1;
  const u = (n) => n / z;
  u.z = z;
  return u;
}

/** A PNG from the art folder at its own size (w, h: file px). */
export function pic(u, name, w, h = w) {
  const file = P.light && LIGHT_ART.has(name) ? `${name}-slate` : name;
  return image(`${ART}/${file}.png`).flex_none().w(u(w)).h(u(h));
}

/** The root of every pq mod: pixel font, 12px, parchment text. */
export function root(u, el, o = {}) {
  return el.font_family(o.font ?? FONT).text_size(u(o.size ?? 12)).line_height(`${u(o.line ?? 16)}px`).text_color(o.color ?? P.text);
}

/**
 * A texture laid behind a clipping box's content, at its own size from the
 * top-left corner. The box must be relative().overflow_hidden(): the texture
 * is cut to the box, never stretched (stretching blurs pixel art).
 */
export function texture(u, name, w, h) {
  return pic(u, name, w, h).absolute().top(0).left(0);
}

// The light look out of daylight: a see-through veil over the stone textures (one
// color per time of day, look.js DIM as out = in x (1 - a) + c x a), so no second set
// of big textures has to be loaded (Herdr keeps every image it has drawn).
const VEIL = { dawn: "#20004c30", dusk: "#5511003d", night: "#0017725c" };
/** The veil for the shown time of day, or nothing (dark look, daylight). */
export function veil() {
  const c = P.light ? VEIL[P.phase] : null;
  return c ? div().absolute().top(0).left(0).right(0).bottom(0).bg(c) : null;
}

/** The big stone floor behind a panel (480x1600 flagstones). */
export const FLOOR = ["floor", 480, 1600];

/** A brick-band header for menus and small windows: the strip texture behind a gold caption. */
export function bandHead(u, title) {
  return h_flex().flex_none().relative().overflow_hidden().h(u(20)).px(u(8)).items_center().border_b(u(2)).border_color(P.ink)
    .child(texture(u, "strip", 2560, 48))
    .when(Boolean(veil()), (el) => el.child(veil()))
    .child(div().relative().bg(P.chrome).border(u(2)).border_color(P.ink).px(u(6))
      .child(div().font_family(SMALL).text_size(u(10)).line_height(`${u(12)}px`).text_color(P.gt).child(title)));
}

/** A cobweb for one inner corner of a box: corner is tl | tr | bl | br. */
export function web(u, corner) {
  const v = corner[0] === "t" ? "top" : "bottom";
  const h = corner[1] === "l" ? "left" : "right";
  return pic(u, `web-${corner}`, 24, 20).absolute()[v](0)[h](0);
}

/** One chain segment (4x8): two hang between the sidebar's panels. */
export function chain(u) {
  return pic(u, "chain", 4, 8);
}

/** Small caption text (Galmuri9 10px). */
export function small(u, text, color = P.dim) {
  return div().font_family(SMALL).text_size(u(10)).line_height(`${u(12)}px`).text_color(color).child(text);
}

/** Status -> gem art. Working twinkles between two frames, blocked pulses. */
export function gem(u, status, id) {
  const s = status === "working" || status === "blocked" || status === "done" ? status : "idle";
  if (s === "working") {
    return div().id(id ?? "gem").relative().flex_none().w(u(18)).h(u(18))
      .child(pic(u, "gem-working", 18).absolute().top(0).left(0))
      .child(pic(u, "gem-working-b", 18).absolute().top(0).left(0).loop("opacity", { from: 0, to: 1, period: 700 }));
  }
  const el = pic(u, `gem-${s}`, 18);
  return s === "blocked" ? el.loop("opacity", { from: 0.45, to: 1, period: 900 }) : el;
}

/** Two-tone pixel bevel layer (top+left / right+bottom), 2px each. */
function layer(u, tl, br, child) {
  return div().flex().flex_col().flex_1().min_w(0).min_h(0)
    .border_r(u(2)).border_b(u(2)).border_color(br)
    .child(div().flex().flex_col().flex_1().min_w(0).min_h(0).border_t(u(2)).border_l(u(2)).border_color(tl).child(child));
}

/**
 * The inventory window frame: ink / light-dark bevel / mid / ink, with gem
 * knobs on the corners. kind: gold | bronze | red.
 * o: { bg, pad, knobs, floor (stone floor behind the content), web (tl|tr|bl|br) }.
 */
export function frame(u, kind, content, o = {}) {
  const r = RAMPS[kind] ?? RAMPS.gold;
  const pad = Array.isArray(o.pad) ? o.pad : [o.pad ?? 0, o.pad ?? 0];
  let inner = div().flex().flex_col().flex_1().min_w(0).min_h(0).bg(o.bg ?? P.fill)
    .pt(u(pad[0])).pb(u(pad[0])).pl(u(pad[1])).pr(u(pad[1]));
  // A stone floor (and a cobweb) under the content, cut to the window.
  if (o.floor || o.web || o.edge) inner = inner.relative().overflow_hidden();
  // The floor is 480px wide: a second copy covers windows wider than that.
  if (o.floor) inner = inner.child(texture(u, ...FLOOR)).child(pic(u, FLOOR[0], FLOOR[1], FLOOR[2]).absolute().top(0).left(u(FLOOR[1])))
    .when(Boolean(veil()), (el) => el.child(veil()));
  if (o.web) inner = inner.child(web(u, o.web));
  // The season on a sidebar panel's floor (snow, petals, leaves) and on its top edge.
  const se = o.edge ? look().season : "none";
  const th = P.light ? "light" : "dark";
  if (PILES.has(se)) inner = inner.child(pic(u, `look/pile-${th}-${se}`, 242, 28).absolute().bottom(0).left(u(3)));
  inner = inner.child(content);
  const body = div().flex().flex_col().flex_1().min_w(0).min_h(0).border(u(2)).border_color(P.ink)
    .child(layer(u, r.tl, r.br,
      div().flex().flex_col().flex_1().min_w(0).min_h(0).border(u(2)).border_color(r.mid)
        .child(div().flex().flex_col().flex_1().min_w(0).min_h(0).border(u(2)).border_color(P.ink).child(inner))));
  let el = div().relative().flex().flex_col().p(u(o.margin ?? 4)).child(body);
  if (o.knobs !== false && kind === "gold") {
    const k = (v, h) => pic(u, "knob-gold", 16).absolute()[v](0)[h](0);
    el = el.child(k("top", "left")).child(k("top", "right")).child(k("bottom", "left")).child(k("bottom", "right"));
  }
  if (CAPS.has(se)) el = el.child(seasonCap(u, se));
  return el;
}

const PILES = new Set(["winter", "xmas", "spring", "autumn"]);
const CAPS = new Set(["winter", "xmas", "spring", "summer", "autumn", "halloween"]);
/** What the season lays on a top edge (8px: snow caps, petals, leaves), cut to the box. */
export function seasonCap(u, se = look().season) {
  if (!CAPS.has(se)) return div();
  return div().absolute().top(0).left(0).right(0).h(u(8)).overflow_hidden()
    .child(pic(u, `look/cap-${P.light ? "light" : "dark"}-${se}`, 2560, 8).absolute().top(0).left(0));
}

/** A thin 2-layer frame for rows and chips: ink, then light/dark bevel. */
export function thin(u, kind, content, o = {}) {
  const r = RAMPS[kind] ?? RAMPS.bronze;
  return div().flex().flex_col().border(u(2)).border_color(P.ink)
    .child(layer(u, r.tl, r.br, div().flex().flex_col().flex_1().bg(o.bg ?? P.fill).child(content)));
}

/**
 * A pixel button: raised bronze bevel that sinks while pressed (the content
 * moves down-right by 2px and the bevel flips). o: { on, tooltip, w, h, pad }.
 */
export function button(u, id, content, onClick, o = {}) {
  const r = o.red ? RAMPS.red : o.on ? RAMPS.gold : RAMPS.bronze;
  const bg = o.red ? "#8a1a1a" : o.on ? P.g0 : P.raised;
  const hv = o.red ? "#c0392b" : o.on ? P.g1 : P.hover;
  const pad = o.pad ?? [2, 6];
  const face = h_flex().id(`${id}~f`).flex_1().items_center().justify_center().gap(u(4))
    .bg(bg)
    .pt(u(pad[0])).pb(u(pad[0])).pl(u(pad[1])).pr(u(pad[1]))
    .hover((s) => s.bg(hv))
    .active((s) => s.pt(u(pad[0] + 2)).pb(u(Math.max(0, pad[0] - 2))).pl(u(pad[1] + 2)).pr(u(Math.max(0, pad[1] - 2))))
    .child(content);
  const b2 = div().id(`${id}~t`).flex().flex_col().flex_1().border_t(u(2)).border_l(u(2)).border_color(r.tl)
    .active((s) => s.border_color(r.br)).child(face);
  let b = div().id(`${id}~b`).flex().flex_col().border_r(u(2)).border_b(u(2)).border_color(r.br)
    .active((s) => s.border_color(r.tl)).child(b2);
  b = div().id(id).flex().flex_col().flex_none().border(u(2)).border_color(P.ink).cursor_pointer().child(b)
    .on_mouse_down("left", (_e, cx) => cx.stop_propagation());
  if (o.w) b = b.w(u(o.w));
  if (o.h) b = b.h(u(o.h));
  if (o.tooltip) b = b.tooltip(o.tooltip);
  if (onClick) b = b.on_click((e, cx) => { cx.stop_propagation(); onClick(e, cx); });
  return b;
}

/** The selection cursor: a pointing hand that nudges toward the row. */
export function cursor(u) {
  return pic(u, "cursor", 16).loop("left", { from: 0, to: u(-2), period: 600 });
}

/** Dithered 2px seam: ink and stone alternating, for headers and dividers. */
export function seam(u, color = P.b1) {
  return div().flex_none().h(u(2)).w_full().bg(color);
}

/** Space crest by index (five colors, repeating). */
export const CRESTS = ["teal", "olive", "rose", "umber", "slate"];
export function crest(u, i) {
  return pic(u, `crest-${CRESTS[((i % 5) + 5) % 5]}`, 16);
}

// ---- portraits, frames, levels (the numbers live in progress.js) ----
export { FACES } from "./progress.js";
const hash = (s) => { let h = 0; for (const ch of String(s ?? "")) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };

/** Quests so far, and the best level ever reached (unlocks follow this one). */
export const quests = () => Number(shared("pq.quests")) || 0;
/** Level, quests and the way to the next level (pq.floor: the old level kept on update day). */
export const lvInfo = () => progressAt(quests(), shared("pq.floor"));
export const best = () => Math.max(bestAfter(shared("pq.best"), quests()), lvInfo().lv);

/** Opens the adventure log (levels, unlocks, looks, recent quests). */
export function openJournal(tab = "map") {
  openOverlay({ mod: "pixel-quest", kind: "dialog", frame: "none", width: 380, height: 520, props: { role: "journal", tab } });
}

/** The theme's settings window and command palette (roles settings / palette). */
export function openSettings() {
  openOverlay({ mod: "pixel-quest", kind: "dialog", frame: "none", width: 560, height: 470, props: { role: "settings" } });
}
/** The theme's "찾기" (go to a tab, space or agent), in place of Herdr's picker. */
export function openGoto() {
  openOverlay({ mod: "pixel-quest", kind: "dialog", frame: "none", width: 520, height: 420, props: { role: "goto" } });
}

export function openPalette() {
  openOverlay({ mod: "pixel-quest", kind: "dialog", frame: "none", width: 520, height: 400, props: { role: "palette" } });
}

// ---- the look: time of day and seasons on the work area (look.js) ----
// The layout file is written directly (never layout.set: layout() leaves out the
// panel's hidden flag and layout.set clears the clicks in layouts/.state). Only the
// shown Pixel Quest layout, only when something changed.
const box = { vw: 0, vh: 0, workW: 0 };
let busy = false, again = false;

/** The status bar reports the window and the work column (render / on_size_change). */
export function lookBox(next) {
  const changed = Object.keys(next).some((k) => next[k] && Math.round(next[k]) !== Math.round(box[k] ?? 0));
  Object.assign(box, next);
  return changed;
}

/** Writes the look (time, season, box shape, font size) into the shown layout file. */
export async function applyLook() {
  if (busy) { again = true; return; }
  busy = true;
  try {
    const name = String(shared("layout") ?? "");
    if (!name.startsWith("pixel-quest")) return;
    const theme = name.includes("light") ? "light" : "dark";
    const now = lookNow(new Date(), { time: shared("pq.time") !== false, seasons: shared("pq.seasons") !== false });
    // pixel-quest.look_phase / look_season: try another time or season (shared pq.lookTest).
    const test = shared("pq.lookTest") ?? {};
    if (test.phase) now.phase = test.phase;
    if (test.season) now.season = test.season;
    const path = `${appHome()}/layouts/${name}.json`;
    const text = await readTextFile(path);
    if (!text) return;
    let state = null;
    try { state = JSON.parse((await readTextFile(`${appHome()}/layouts/.state/${name}.json`)) ?? "null"); } catch { state = null; }
    let file = null;
    try { file = JSON.parse(text); } catch { return; }
    const area = box.workW ? mainArea({ vw: box.vw, vh: box.vh, workW: box.workW, panel: panelState(file, state) }) : { w: 0, h: 0 };
    // Two windows share the file: only the active one says which shape to draw for,
    // the other keeps the file's (no flip-flop between differently sized windows).
    const kept = Number(/deco-[a-z]+-[a-z]+-(\d+)\.png/.exec(text)?.[1]);
    const bucket = hwin()?.active === false && kept ? kept : bucketOf(area.w, area.h);
    const art = lookArt({ theme, ...now, bucket });
    const prev = shared("pq.look");
    if (!prev || prev.theme !== theme || prev.phase !== now.phase || prev.season !== now.season) setShared("pq.look", { theme, ...now });
    const panelColor = theme === "light" ? dim(LIGHT.fill, "light", now.phase) : undefined;
    const next = layoutWith(text, { art, fontSize: Number(shared("pq.font_size")) || undefined, panelColor });
    if (next && next !== text) await writeTextFile(path, next, text);
  } catch { /* a stale read (someone else wrote the file): the next tick tries again */ } finally {
    busy = false;
    if (again) { again = false; applyLook(); }
  }
}

const CYCLE = { phase: ["dawn", "day", "dusk", "night"], season: ["winter", "xmas", "spring", "summer", "autumn", "halloween"] };
/** Shows the next time of day or season to try it (after the last one: the real one again). */
export function tryLook(kind) {
  const test = { ...(shared("pq.lookTest") ?? {}) };
  const list = CYCLE[kind];
  const i = list.indexOf(test[kind]);
  test[kind] = i < list.length - 1 ? list[i + 1] : undefined;
  setShared("pq.lookTest", test.phase || test.season ? test : null);
  applyLook();
  return test[kind] ?? "지금";
}

/** The terminal font size. The layout sets its own (12), which beats settings.json, so it
 *  goes into the shown layout file (applyLook); the choice (shared pq.font_size) follows to
 *  the other look when that one shows. */
export function setTermFont(n) {
  if (!Number.isFinite(Number(n))) return null;
  const size = Math.max(9, Math.min(20, Math.round(n)));
  setShared("pq.font_size", size);
  applyLook();
  return size;
}

/** Renames a tab or a space (id; none: the one shown) in the theme's window (role prompt),
 *  in place of Herdr's own. */
export function openRename(kind, id) {
  const all = spaces();
  const f = focused();
  const space = kind === "space" ? all.find((s) => s.id === (id ?? f?.space)) : null;
  const tab = kind === "tab" ? all.flatMap((s) => s.tabs ?? []).find((t) => t.id === (id ?? f?.tab)) : null;
  const spec = renameSpec(kind, space ?? tab);
  // Nothing to aim at (no focus): Herdr's own command decides.
  if (!spec) return run(kind === "tab" ? "tab.rename" : "space.rename", id ? { id } : {});
  openOverlay({ mod: "pixel-quest", kind: "dialog", frame: "none", width: 380, height: 170, props: { role: "prompt", ...spec } });
}
/** The key list (role help), in place of Herdr's app.help. */
export function openHelp() {
  openOverlay({ mod: "pixel-quest", kind: "dialog", frame: "none", width: 520, height: 480, props: { role: "help" } });
}
/** The worktree window (role worktree): props { space, folder?, action: new | open | remove }. */
export function openWorktree(p) {
  const open = p?.action === "open";
  openOverlay({ mod: "pixel-quest", kind: "dialog", frame: "none", width: open ? 560 : 460, height: open ? 480 : 250, props: { role: "worktree", ...p } });
}
/** Add a machine (role machine), in place of Herdr's machine-add. */
export function openMachine() {
  openOverlay({ mod: "pixel-quest", kind: "dialog", frame: "none", width: 540, height: 400, props: { role: "machine" } });
}

/** Closes a space, asking first in the theme's dialog (role confirm). */
export function closeSpace(space) {
  if (!space) return;
  openOverlay({ mod: "pixel-quest", kind: "dialog", frame: "none", width: 340, height: 150, props: {
    role: "confirm", title: "스페이스를 닫을까요?", detail: `"${space.name}"의 탭과 터미널이 모두 끝납니다.`,
    command: { name: "space.close", args: { id: space.id, confirmed: true } } } });
}
/** Closes a tab; its space's last tab closes the space, so that one asks first. */
export function closeTab(space, tabId) {
  if (space && space.tabs?.length === 1) {
    openOverlay({ mod: "pixel-quest", kind: "dialog", frame: "none", width: 340, height: 150, props: {
      role: "confirm", title: "마지막 탭을 닫을까요?", detail: `"${space.name}"의 마지막 탭이라 스페이스도 함께 닫힙니다.`,
      command: { name: "tab.close", args: { id: tabId, confirmed: true } } } });
  } else run("tab.close", { id: tabId });
}

/** The icon for an unlock (lists in the adventure log, the level-up banner). */
export function rewardIcon(u, r) {
  if (r.kind === "faces") return pic(u, `face-${r.shape}-${ROWS[r.shape][r.from]}`, 24);
  if (r.kind === "frame") return r.key === "crown" ? pic(u, "pft-crown", 18, 22) : pic(u, `pft-${r.key}`, 18);
  if (r.kind === "banner") return bannerIcon(u, r.key);
  if (r.kind === "title") return pic(u, "ico-scroll", 16);
  return pic(u, "knob-gold", 16);
}
export function bannerIcon(u, key) {
  if (key === "flag") return pic(u, "pennant-s", 8, 16);
  if (key === "torch") return pic(u, "sconce", 16);
  if (key === "gems") return pic(u, "gem-done", 18);
  if (key === "crown" || key === "legend") return pic(u, "crown-s", 22, 12);
  return pic(u, "ico-chest-open", 16);
}

/** A portrait by any stable key (programs that aren't agents: shells, editors). */
export function face(u, key, size = 24) {
  return pic(u, `face-${BASE[hash(key) % BASE.length]}`, size);
}

// Agents get a portrait by where they work, not by program (they are mostly the
// same program): the space's name, and the order within the space when it has
// more than one. A click opens the picker (role "picker"); the choice is kept in
// shared state (persisted, and every copy of the mod re-renders when it changes).
export const PICKS = "pixel-quest.faces";
export function faceKeys(list) {
  const seen = new Map(), keys = new Map();
  for (const a of list) {
    const base = a.space_name || a.space || a.address;
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    keys.set(a.address, n ? `${base}#${n + 1}` : base);
  }
  return keys;
}

/** address -> { key, name, picked } for every agent: picks first, then a hash slot,
 *  distinct while there are portraits to go round. Automatic ones come from the
 *  sixteen first (so nobody's changes when a level opens more), then opened ones. */
export function faceMap(list) {
  const keys = faceKeys(list);
  const picks = shared(PICKS) ?? {};
  const lv = best();
  const pool = autoPool(lv);
  const out = new Map(), used = new Set();
  for (const [addr, key] of keys) {
    const p = picks[key];
    if (FACES.includes(p) && faceLevel(p) <= lv) { out.set(addr, { key, name: p, picked: true }); used.add(p); }
  }
  for (const [addr, key] of [...keys].sort((x, y) => (x[1] < y[1] ? -1 : 1))) {
    if (out.has(addr)) continue;
    let i = hash(key) % BASE.length;
    for (let k = 0; k < pool.length && used.has(pool[i]); k++) i = (i + 1) % pool.length;
    out.set(addr, { key, name: pool[i], picked: false });
    used.add(pool[i]);
  }
  return out;
}

/** An agent's portrait from a faceMap() entry (falls back to the program key). */
export function agentFace(u, entry, fallback, size = 24) {
  return entry ? pic(u, `face-${entry.name}`, size) : face(u, fallback, size);
}

/** The party's frame (pq.frame), or wood while the chosen one is locked. */
export const frameKey = () => pick("frame", shared("pq.frame"), best());

/** A portrait in the party's frame: 36x36 (the crown frame rises 8px above). */
export function portrait(u, faceEl) {
  const f = frameKey();
  return div().relative().flex_none().w(u(36)).h(u(36))
    .child(f === "crown" ? pic(u, "pf-crown", 36, 44).absolute().bottom(0).left(0) : pic(u, `pf-${f}`, 36).absolute().top(0).left(0))
    .when(f === "rune", (el) => el.child(pic(u, "pf-rune-glow", 36).absolute().top(0).left(0).loop("opacity", { from: 0.2, to: 1, period: 1400 })))
    .child(faceEl.absolute().top(u(6)).left(u(6)));
}

/** The same frame, small (30x30), for the 32px pane header. */
export function portraitSmall(u, faceEl) {
  return div().relative().flex_none().w(u(30)).h(u(30))
    .child(pic(u, `pfs-${frameKey()}`, 30).absolute().top(0).left(0))
    .child(faceEl.absolute().top(u(3)).left(u(3)));
}

/** Opens the portrait picker for an agent (a popup at the pointer). */
export function openPicker(entry) {
  if (!entry) return;
  openOverlay({ mod: "pixel-quest", kind: "popup", frame: "none", width: 392, height: 352, props: { role: "picker", key: entry.key, face: entry.name } });
}

/** The party slot beside a portrait, 24px in every row so names line up, its art
 *  by status: working = two swords meet and spark, done = a reward chest opens and
 *  shuts with a glint, blocked = a "!" bubble bobs, idle = a campfire flickers with
 *  rising embers. Herdr's loops go there and back: the second frame fades in and
 *  out over the first, which stays solid (two half-faded frames would look washed out).
 *  Empty with shared pq.battle = false (the party effects switch). */
export function battle(u, status) {
  const box = div().relative().flex_none().w(u(24)).h(u(24));
  if (shared("pq.battle") === false) return box;
  const fade = (art, from, to, period, easing) => pic(u, art, 24).absolute().top(0).left(0).loop("opacity", { from, to, period, easing });
  if (status === "working") return box
    .child(pic(u, "sword-l", 16).absolute().top(u(4)).loop("left", { from: 0, to: u(4), period: 560 }))
    .child(pic(u, "sword-r", 16).absolute().top(u(4)).loop("left", { from: u(8), to: u(4), period: 560 }))
    .child(pic(u, "spark", 16).absolute().top(0).left(u(4)).loop("opacity", { from: 0, to: 1, period: 560, easing: "ease-in" }));
  if (status === "done") return box
    .child(pic(u, "chest-shut", 24).absolute().top(0).left(0))
    .child(fade("chest-open", 0, 1, 1200, "ease-in-out"))
    .child(pic(u, "spark", 16).absolute().top(u(-6)).left(u(12)).loop("opacity", { from: 0, to: 1, period: 600, easing: "ease-in" }));
  if (status === "blocked") return box
    .child(pic(u, "call-bubble", 24).absolute().left(0).loop("top", { from: 0, to: u(4), period: 380, easing: "ease-in-out" }));
  // An ember: the holder rises, the dot inside fades.
  const ember = (left, period) => div().absolute().left(u(left)).w(u(2)).h(u(2)).loop("top", { from: u(14), to: 0, period })
    .child(pic(u, "ember", 2).loop("opacity", { from: 1, to: 0, period }));
  return box
    .child(pic(u, "camp-a", 24).absolute().top(0).left(0))
    .child(fade("camp-b", 0, 1, 450))
    .child(ember(6, 1100)).child(ember(17, 1400));
}

/** A bronze name plaque for a panel: ornaments around gold text, an optional control. */
export function plaque(u, text, right) {
  const label = h_flex().flex_1().min_w(0).justify_center().items_center().gap(u(6))
    .child(pic(u, "orn-l", 32, 16))
    .child(div().flex_none().text_color(P.g3).child(text))
    .child(pic(u, "orn-r", 32, 16));
  return h_flex().flex_none().gap(u(4)).items_center()
    .child(div().flex_1().min_w(0).flex().flex_col().border(u(2)).border_color(P.ink)
      .child(layer(u, P.b3, P.b0, h_flex().h(u(20)).bg(P.b1).items_center().child(label))))
    .when(Boolean(right), (el) => el.child(right));
}

/** A whole sidebar/side panel: gold frame with knobs, a plaque, then content. */
export function panel(u, title, right, content, o = {}) {
  const body = div().flex().flex_col().flex_1().min_h(0).gap(u(6))
    .when(Boolean(title), (el) => el.child(plaque(u, title, right)))
    .child(content);
  return frame(u, o.kind ?? "gold", body, { pad: o.pad ?? [6, 6], margin: 4, floor: o.floor, web: o.web, edge: o.edge }).flex_1().min_h(0);
}

/** A thin bronze outline that marks the selected row (no fill change). */
export function selected(u, el, on) {
  return on ? el.border(u(2)).border_color(P.b2).bg(P.raised) : el.border(u(2)).border_color("#00000000");
}

// ---- Claude usage (tools/pq-usage.js saves it in the app folder) ----
export const USAGE_FILE = "pixel-quest-usage.json";
/** Calls load at once, whenever the usage file changes (folder watch), and every
 *  `every` ms as a fallback (the countdowns move on too). */
export function watchUsage(cx, load, every = 15000) {
  load(cx);
  cx.timer.every(every, load);
  cx.spawn(async (cx) => {
    for (;;) {
      let batch;
      try { batch = await watchFolder(appHome()); } catch { return; }
      if (batch.some((p) => p.replace(/\\/g, "/").endsWith(USAGE_FILE) || p.replace(/\\/g, "/").replace(/\/$/, "") === appHome().replace(/\\/g, "/"))) load(cx);
    }
  });
}
/** One window's reading: { pct, over, left (s to reset), at ("11/11 13:30"), tone }. */
export function usageWindow(w) {
  const now = Date.now() / 1000;
  const over = !w || (w.resets_at && w.resets_at <= now);
  const pct = over ? 0 : Math.max(0, Math.min(100, w.used_percentage));
  const left = over || !w.resets_at ? null : w.resets_at - now;
  // By hand: this runtime's Date ignores locale options.
  const d = new Date((w?.resets_at ?? 0) * 1000), two = (n) => String(n).padStart(2, "0");
  const at = left == null ? "" : `${d.getMonth() + 1}/${d.getDate()} ${two(d.getHours())}:${two(d.getMinutes())}`;
  const tone = over ? P.idle : pct >= 80 ? P.blocked : pct >= 50 ? P.warn : P.working;
  return { pct, over, left, at, tone };
}
/** Seconds as "3h38" / "2일4h" / "12m"; long: "3시간 38분". */
export function span(s, long = false) {
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  if (long) return [d && `${d}일`, h && `${h}시간`, (m || (!d && !h)) && `${Math.max(1, m)}분`].filter(Boolean).join(" ");
  return d ? `${d}일${h}h` : h ? `${h}h${String(m).padStart(2, "0")}` : `${Math.max(1, m)}m`;
}
/** A row of mana cells (10% each when n = 10), lit up to pct in tone. */
export function cells(u, r, n = 10, cw = 5, ch = 12) {
  const lit = Math.round((r.pct / 100) * n);
  // cw 0: the cells share the row's width (a bar that fills its box).
  return h_flex().h(u(ch)).gap(u(1)).p(u(1)).bg(P.b1).border(u(2)).border_color(P.ink).when(!cw, (el) => el.w_full())
    .children([...Array(n)].map((_, i) => (cw ? div().w(u(cw)) : div().flex_1()).h_full().bg(i < lit ? r.tone : P.ink)
      .when(i === lit - 1 && r.pct >= 80, (el) => el.loop("opacity", { from: 0.55, to: 1, period: 900 }))));
}
