// Pixel Quest's time of day and seasons: which tablet and decoration the work area
// shows, and the layout file that shows them. No Herdr imports, so
// tests/look.test.mjs runs it under node. The art comes from art-src/gen_look.py.
//
// The work area has two backgrounds on one box: `main-wrap` (the stone tablet,
// lit for the time of day) and `main` inside it (a see-through decoration for the
// season: moss, snow, vines...). Both fill the same box, so they crop alike; the
// decoration is drawn for five shapes of box so its corners stay in view.
// Copyright (c) 2026 cubha. MIT License.

const ART = "mods/pixel-quest/art";
const LOOK = `${ART}/look`;

/** dawn 5-7, day 7-17, dusk 17-21, night 21-5. */
export function phaseOf(h) {
  if (h >= 5 && h < 7) return "dawn";
  if (h >= 7 && h < 17) return "day";
  if (h >= 17 && h < 21) return "dusk";
  return "night";
}

/** Month (1-12) -> winter | spring | summer | autumn | halloween | xmas. */
export function seasonOf(m) {
  if (m === 12) return "xmas";
  if (m === 10) return "halloween";
  if (m <= 2) return "winter";
  if (m <= 5) return "spring";
  if (m <= 8) return "summer";
  return "autumn";
}

/** Width / height x 100 of the decoration art: the box shapes it is drawn for. */
export const BUCKETS = [85, 115, 136, 170, 210];
const USUAL = 136;

/** The bucket nearest to a box's shape. */
export function bucketOf(w, h) {
  if (!(w > 0) || !(h > 0)) return USUAL;
  const r = Math.log(w / h);
  return BUCKETS.reduce((best, b) => (Math.abs(Math.log(b / 100) - r) < Math.abs(Math.log(best / 100) - r) ? b : best), USUAL);
}

// The work column holds the tab bar (42), the season's ledge (8), the spacer under the
// work body (8), the sill (8) and the status bar (28); the work body pads 8 at the sides
// and between its children.
const BARS = 42 + 8 + 8 + 8 + 28, PAD = 8;

/** The work area's size from the window (vw, vh), the work column's width and the side panel. */
export function mainArea({ vh, workW, panel }) {
  const w = workW - PAD * 2 - (panel?.open ? panel.w + PAD : 0);
  return { w, h: vh - BARS };
}

// The season (snow caps, petals, leaves) lies on the work area's top edge, as the mockup
// has it: an 8px row of its own over the work body, where the body's top padding was.
const LEDGE = { id: "ledge", type: "block", content: { mod: "pixel-quest", props: { role: "ledge" } }, size: { px: 8 } };
const UNDER = { id: "ledge-under", type: "column", size: { px: 8 }, children: [] };

const find = (n, id) => (n && typeof n === "object" ? (n.id === id ? n : (n.children ?? []).map((c) => find(c, id)).find(Boolean)) : null);

/** The side panel: shown and how wide, a click (layouts/.state) over the file. */
export function panelState(file, state) {
  const p = find(file, "panel") ?? {};
  const c = state?.nodes?.panel ?? {};
  const hidden = c.hidden ?? p.hidden ?? false;
  return { open: !hidden, w: Number(c.size?.px ?? p.size?.px) || 368 };
}

/** The art for a look: { tablet, deco, wall } (wall: the light layout's outer wall, else null). */
export function lookArt({ theme, phase, season, bucket }) {
  const light = theme === "light";
  const dim = light && phase !== "day" && phase !== "none";
  return {
    tablet: `${LOOK}/tablet-${theme}-${phase}.png`,
    deco: `${LOOK}/deco-${theme}-${season}-${bucket}.png`,
    wall: light ? (dim ? `${LOOK}/bg-slate-${phase}.png` : `${ART}/bg-slate.png`) : null,
  };
}

/** What shows now: { phase, season } (each "none" while switched off). */
export function lookNow(d, { time = true, seasons = true } = {}) {
  return { phase: time ? phaseOf(d.getHours()) : "none", season: seasons ? seasonOf(d.getMonth() + 1) : "none" };
}

/**
 * The layout file's text with the look in it, or null when it isn't a Pixel Quest
 * layout. o: { art, fontSize?, panelColor? }. Moves an older file to the two-layer
 * shape (main inside main-wrap, the party drawer on main-wrap). Everything else stays
 * as written, the panel's hidden flag included (layout.set would drop it).
 * Returns the same text when nothing changes.
 */
export function layoutWith(text, { art, fontSize, panelColor } = {}) {
  let root;
  try { root = JSON.parse(text); } catch { return null; }
  const body = find(root, "work-body");
  if (!body || !Array.isArray(body.children)) return null;
  let wrap = find(root, "main-wrap");
  if (!wrap) {
    const i = body.children.findIndex((c) => c.id === "main");
    if (i < 0) return null;
    const main = body.children[i];
    wrap = { id: "main-wrap", type: "column", children: [main] };
    body.children[i] = wrap;
  }
  if (body.floating) { wrap.floating = body.floating; delete body.floating; }
  const work = find(root, "work");
  if (work && Array.isArray(work.children) && !find(root, "ledge")) {
    const at = work.children.indexOf(body);
    if (at >= 0) {
      work.children.splice(at, 1, { ...LEDGE }, body, { ...UNDER, children: [] });
      if (typeof body.padding === "number") body.padding = [0, body.padding];
    }
  }
  const main = find(wrap, "main");
  if (!main) return null;
  wrap.background = { image: art.tablet, fit: "cover" };
  main.background = { image: art.deco, fit: "cover" };
  if (art.wall) root.background = { image: art.wall, fit: "cover" };
  root.terminal_opacity = 0;
  // Notifications (Herdr's own and every notify()) in the theme, unless the file names another mod.
  if (root.toast == null) root.toast = "pixel-quest";
  if (fontSize) root.font_size = fontSize;
  const panel = find(root, "panel");
  if (panel && panelColor) panel.background = panelColor;
  const out = JSON.stringify(root, null, 2) + "\n";
  // Same look as before: hand back the very text, so nothing gets written.
  try { if (JSON.stringify(JSON.parse(text)) === JSON.stringify(root)) return text; } catch { /* written below */ }
  return out;
}

// Light look out of daylight: walls, floors and panels dim, a little blue at night.
const DIM = { dawn: [0.84, 0.81, 0.88], dusk: [0.86, 0.78, 0.76], night: [0.64, 0.68, 0.84] };

/** A surface color as the time of day shows it (light look only). */
export function dim(hex, theme, phase) {
  const f = theme === "light" ? DIM[phase] : null;
  if (!f) return hex;
  const h = hex.replace("#", "");
  return "#" + [0, 2, 4].map((i, k) => Math.round(parseInt(h.slice(i, i + 2), 16) * f[k]).toString(16).padStart(2, "0")).join("");
}
