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
import { settings } from "herdr";

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
};

const RAMPS = {
  gold: { tl: P.g3, br: P.g1, mid: P.g2 },
  bronze: { tl: P.b3, br: P.b1, mid: P.b2 },
  red: { tl: "#e0564f", br: "#8a1a1a", mid: "#c0392b" },
};

/** u(n): n screen px at zoom 1, in layout px (so art stays 1:1 on screen). */
export function unit() {
  const z = Number(settings()?.zoom) || 1;
  const u = (n) => n / z;
  u.z = z;
  return u;
}

/** A PNG from the art folder at its own size (w, h: file px). */
export function pic(u, name, w, h = w) {
  return image(`${ART}/${name}.png`).flex_none().w(u(w)).h(u(h));
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

/** The big stone floor behind a panel (480x1600 flagstones). */
export const FLOOR = ["floor", 480, 1600];

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
  if (o.floor || o.web) inner = inner.relative().overflow_hidden();
  if (o.floor) inner = inner.child(texture(u, ...FLOOR));
  if (o.web) inner = inner.child(web(u, o.web));
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
  return el;
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

/** Program -> one of the four portraits (stable per name). */
export const FACES = ["helm-gold", "hood-violet", "helm-steel", "hood-amber"];
export function face(u, key, size = 24) {
  let h = 0;
  for (const ch of String(key ?? "")) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return pic(u, `face-${FACES[h % FACES.length]}`, size);
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
  return frame(u, o.kind ?? "gold", body, { pad: o.pad ?? [6, 6], margin: 4, floor: o.floor, web: o.web }).flex_1().min_h(0);
}

/** A thin bronze outline that marks the selected row (no fill change). */
export function selected(u, el, on) {
  return on ? el.border(u(2)).border_color(P.b2).bg(P.raised) : el.border(u(2)).border_color("#00000000");
}
