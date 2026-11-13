// The five new zones' layout and theme files, from the dark ones (roadmap stage 3).
//   node tools/gen-zone-files.mjs
// layouts/pixel-quest.json  -> mods/pixel-quest/zones/pixel-quest-<zone>.json (the settings
//   window copies it into layouts/ the first time the zone is picked, open)
// themes/pixel-quest.json   -> themes/pixel-quest-<zone>.json (terminal colors)
// The terminal's text, cursor, dim text and background are the confirmed mockup's
// (art-src/zones: zones5 / scenes6 zone dicts), the 16 colors stay the dungeon's (their
// meaning: red errors, green success) but for the dim gray (8), which takes the zone's.
// Copyright (c) 2026 cubha. MIT License.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DRAWN, paletteOf, layoutOf } from "../mods/pixel-quest/zones.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const hex = (c) => "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
const TERM = {
  ice: { fg: [220, 236, 246], cursor: [184, 236, 250], dim: [126, 150, 176], base: [20, 38, 56] },
  lava: { fg: [244, 230, 212], cursor: [255, 176, 64], dim: [172, 150, 136], base: [34, 26, 29] },
  crystal: { fg: [234, 226, 246], cursor: [228, 192, 255], dim: [140, 128, 170], base: [34, 27, 58] },
  throne: { fg: [244, 232, 208], cursor: [255, 226, 122], dim: [160, 132, 128], base: [50, 21, 31] },
  moss: { fg: [226, 232, 208], cursor: [216, 214, 128], dim: [128, 144, 126], base: [27, 37, 34] },
};
// The UI colors the dark theme has beyond the palette, in each zone's hue (chrome4 rest).
const MORE = {
  ice: { selected: "#2c4758", popover: "#1a3140", input: "#505f67" },
  lava: { selected: "#443938", popover: "#312827", input: "#504a49" },
  crystal: { selected: "#402f54", popover: "#2c1d3d", input: "#584f63" },
  throne: { selected: "#50333d", popover: "#3a212a", input: "#5e4f54" },
  moss: { selected: "#395044", popover: "#263a30", input: "#525e58" },
};

const darkLayout = JSON.parse(readFileSync(join(ROOT, "layouts/pixel-quest.json"), "utf8"));
const darkTheme = JSON.parse(readFileSync(join(ROOT, "themes/pixel-quest.json"), "utf8"));
const find = (n, id) => (n && typeof n === "object" ? (n.id === id ? n : (n.children ?? []).map((c) => find(c, id)).find(Boolean)) : null);
const ART = "mods/pixel-quest/art";
const ZONE_FILES = 1;   // bump when the layout files change

mkdirSync(join(ROOT, "mods/pixel-quest/zones"), { recursive: true });
for (const z of DRAWN) {
  const p = paletteOf(z), t = TERM[z], name = layoutOf(z);
  const L = structuredClone(darkLayout);
  delete L.cloned_from;
  // The settings window replaces an installed copy whose version differs (art paths changed).
  L.pq_zone = ZONE_FILES;
  L.theme = name;
  L.preview = `${ART}/zone/${z}/card.png`;
  L.background = { image: `${ART}/zone/${z}/bg-work.png`, fit: "cover" };
  L.divider = { ...L.divider, color: p.ink };
  find(L, "main-wrap").background = { image: `${ART}/look/tablet-${z}-none.png`, fit: "cover" };
  const main = find(L, "main");
  main.background = { image: `${ART}/look/deco-${z}-none-136.png`, fit: "cover" };
  main.content.pane.border = { ...main.content.pane.border, color: p.ink };
  main.content.pane.focus = { ...main.content.pane.focus, color: p.g2 };
  const panel = find(L, "panel");
  panel.border = { ...panel.border, color: p.g2 };
  panel.background = p.fill;
  writeFileSync(join(ROOT, `mods/pixel-quest/zones/${name}.json`), JSON.stringify(L, null, 2) + "\n");

  const T = structuredClone(darkTheme);
  T.background = hex(t.base);
  T.foreground = hex(t.fg);
  T.cursor = hex(t.cursor);
  T.selection = MORE[z].selected;
  T.ansi = [...darkTheme.ansi];
  T.ansi[8] = hex(t.dim);
  Object.assign(T.colors, {
    background: hex(t.base), canvas: p.wall, chrome: p.chrome, surface: p.fill, popover: MORE[z].popover, raised: p.raised,
    hover: p.hover, selected: MORE[z].selected, border: p.stone, input: MORE[z].input, foreground: hex(t.fg), dim: hex(t.dim),
    accent: p.g2, solid: p.g2, ring: p.g3,
  });
  writeFileSync(join(ROOT, `themes/${name}.json`), JSON.stringify(T, null, 2) + "\n");
  console.log(name);
}
