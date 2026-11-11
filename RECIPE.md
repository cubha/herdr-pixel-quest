# Pixel Quest

A dark pixel-art "abyss inventory" window for Herdr: a stone wall behind
gold-framed panels with gem knobs, a torch hanging over the tab bar, agents
shown as a party with portraits and status gems, a "퀘스트 완료" (quest
complete) banner when an agent finishes, and 8-bit alert sounds. All labels
are Korean; every picture is original pixel art.

![Pixel Quest](preview.png)

## What you see

- **Whole window** (1280×820 at zoom 1): background image `mods/pixel-quest/art/bg-work.png`
  (a low-contrast dungeon wall, `#0b0e1c`–`#1a2142`, `fit: cover`), divider 2px `#05060c`.
  Fonts: Galmuri11 for mods (12px; captions Galmuri9 10px), GalmuriMono11 12px for terminals.
- **Sidebar, left, 268px**:
  - Brand bar, 42px (as tall as the tab bar, so the panels' gold tops line up with the terminal's): a shield emblem (24×28), the "HERDR" wordmark (76×22), a `Lv.n` chip
    (bronze outline, gold text), then pixel buttons for search and folding the sidebar.
  - **스페이스** (spaces) panel: a gold frame (ink 2px, light `#f6d870`/dark `#9a5a26` bevel 2px,
    mid `#d49a3a` 2px, ink 2px, fill `#121731`) with 16×16 ruby knobs on its corners, then a bronze
    plaque (`#5a3418`, gold text `#f6d870`, small spear ornaments) and a `+` pixel button. Machine
    headers in Galmuri9. Each space row is 32px: a 16×16 crest (five colors, from the
    space's stored color), the name, and the branch on the right in `#7a7090`. The selected row has a
    2px bronze `#8a5a2a` outline on `#1a2142` and a pointing-hand cursor that nudges 2px left and right.
  - **파티 · n** (party) panel: the same frame. Group headers are "입력 필요 / 완료 / 작업 중 / 대기".
    Each agent row is a 44px card: a 24×24 portrait (one of sixteen: helm and hood in eight
    colorways each, chosen by the agent's space name, distinct while there are faces to go round;
    a click picks the next free one, kept in shared state `pixel-quest.faces`) in a brown box, the status gem on its corner, the name (gold when focused)
    with machine and age, and a status line under it (or a moving blue bar while working).
    A blocked agent's card has a red outline.
  - Footer, 32px: "설정" (settings) and "머신 추가" (add machine) as bronze pixel buttons, on the
    status bar's line; the panels' gold bottoms line up with the terminal's.
- **Tab bar, 42px**, `#0e1226` with a 2px ink bottom line: tabs are bevelled boxes with an ink
  number cell, then the name (an automatic number shows the program's name instead), and a gem when
  the tab isn't idle. The active tab is brown `#5a3418` with gold text. A torch (18×38)
  with a dithered glow (96×60, opacity loop 0.7–1, 1.6s) hangs in the middle. On the right: `+`,
  "소지품" (Files, chest icon), "변경" (Changes, scroll icon), and the window buttons (close is red).
- **Panes**: 8px gaps, no radius, border 2px ink, focus 2px `#d49a3a`. Header 32px: a status gem,
  a portrait, the name, the folder (Galmuri9, dim) and a status word. The focused pane's header is
  `#1a2142` with gold knobs at both ends. Hovering shows four 16px item-icon buttons: split right,
  split down, zoom and close.
- **Status bar, 28px**: the machine, "파티" and one 14px cell per agent in its status color,
  "! n 입력 필요" pulsing when someone is blocked, the branch, two usage gauges ("5H", "7D": ten 5px
  cells each in a bronze box, the percent and the time to reset; blue under 50%, orange to 79%, red
  from 80% with the last cell pulsing), "퀘스트 n", and the palette key in a bronze chip.
  Clicking the gauges opens the usage card: a 340×296 frameless popup with a gold frame and stone
  floor, a "사용량" plaque, then for 5시간 and 주간 a big percent, a 20-cell bar and "초기화까지 3시간 18분 · 11/11 13:30",
  and the last update time with a 닫기 button.
- **Side panel** (Files / Changes, hidden by default) inside a 2px gold border. Files is role
  `files`: a bronze header ("소지품", the folder), a search box (search icon, input on a sunk well,
  clear ×) and a 이름 / 내용 switch, then the tree with chevrons, folder/file icons and git marks.
  Typing lists name matches (with the folder dimmed beside) or content hits (file, `:line`, the line).
  A file opens as a read-only preview with line numbers. Changes is Herdr's own mod.
- **Light look** (`pixel-quest-light`): blue-grey slate wall and tablet, panels `#e4e8f0`, ink
  `#1f2638`, text `#1c2233`, gold text `#7a4a0c`; `kit.js` switches palette and the `-slate` textures
  when the shown theme's background is light.
- **Party drawer**: a floating block on the right edge of the work area, peeking 58px:
  gems and portraits on the edge side; hover slides out names and status words.

## How it behaves

- Status gems (18×18): **working** blue, two frames cross-fading every 0.7s; **blocked**
  red with a "!" mark, pulsing (opacity 0.45–1, 0.9s); **done** green with a star glint; **idle** an empty
  violet gem. Shape and color both change, so they read without color.
- Pixel buttons: bronze bevel; while pressed the bevel flips and the face moves 2px down-right.
- When an agent changes to **done** (Herdr's done: it finished while the person wasn't looking; seen while the layout runs), the status bar opens the
  quest banner: a 360×112 frameless window, gold frame, "퀘스트 완료!", the agent's space, "보상: 경험치 +1 · 누적
  퀘스트 n", four twinkling crystals. It closes after 4.5s; clicking it focuses that agent's pane.
  The quest count is shared state `pq.quests`; the brand's level is `1 + floor(quests / 5)`.
- `pixel-quest.quest` shows the banner once without counting; `pixel-quest.quest_reset` sets the count to 0.
- Space rows: click selects, drag reorders, right-click opens the menu. Agent rows: click focuses the pane;
  hover shows a pin button. Tabs: click selects, double-click renames, drag moves, right-click opens the menu, scroll switches.
- Menus opened from the spaces list and tab bar are frameless popups with a thin gold frame; the
  chosen item shows the cursor. Herdr's item names are shown in Korean.
- Narrower than 160px the sidebar becomes a rail: crests with a corner gem for spaces that need
  you, agent numbers with gems, icon-only footer buttons.

## Built from

- `layouts/pixel-quest.json`: cloned from Herdr's `main` (`layout.clone`), then root look
  (`theme: "pixel-quest"`, `font: "GalmuriMono11"`, `font_size: 12`, `ui_font: "Galmuri11"`,
  background image, `terminal_padding: [12, 10]`, `terminal_menu: "pixel-quest"`,
  `preview: "layouts/pixel-quest.png"`), every block's `content.mod` set to `pixel-quest` with
  `props.role`, the pane frame above, the gold-bordered `panel`, and a `floating` party block on `work-body`.
  Dungeon details: an 8px `sill` block (role `sill`) in the `work` column above `status`; the
  block `main` has `background: { "image": "mods/pixel-quest/art/tablet.png", "fit": "cover" }` (one
  cracked stone tablet at screen resolution, light from the top centre under the tab bar's torch), the
  pane frame's `background` is `#00000000`, and the root has `terminal_opacity: 0.3`. The `files`
  block is `{ "mod": "pixel-quest", "props": { "role": "files" } }`. One backdrop sits behind all panes, so
  split panes share one light instead of each getting its own. Measured: Herdr's opacity is not
  linear (0.82 barely showed, 0.5 matches the mockup); Herdr caches images by path, so a redrawn
  PNG needs a new file name before it shows.
- `themes/pixel-quest.json`: background `#121731`, foreground `#e8dcc0`, cursor `#f6d870`,
  16 ANSI colors tuned for that background (ANSI 8 `#807aa4`, contrast 3.1 at the brightest
  lit slab; the idle status color stays `#6a6488`), panel colors (accent `#d49a3a`; working/blocked/done/idle
  `#3f74e0`/`#c0392b`/`#3f9a4a`/`#6a6488`).
- `mods/pixel-quest/`: one mod in roles (like Herdr 98). Mods can't import from another mod's
  folder, so everything shares `kit.js` inside this folder: palette, `unit()` (art px ÷ zoom so PNGs
  stay 1:1), `pic`, `frame`, `thin`, `plaque`, `panel`, `gem`, `button`, `cursor`, `crest`, `face`, and for the dungeon details
  `texture` (a big PNG at its own size, cut by a `relative().overflow_hidden()` box), `FLOOR`,
  `web`, `chain`; `frame`/`panel` take `{ floor, web }`.
  Roles `spaces`, `agents`, `tabs`, `pane`, `chrome`, `status`, `menu`, `newmenu` are Herdr's shipped
  mods restyled (their data logic is unchanged), `files` is Herdr's files mod with search added;
  `quest`, `party`, `sill` and `usage` are new. Search: names from `git ls-files -co --exclude-standard`
  (else a bounded walk skipping .git and node_modules), content from `git grep -n -I -i -F --untracked`
  (else grep / Select-String), 350ms after typing stops, at most 300 hits; the box is gpui-base
  `InputState`/`Input`.
- Usage: `tools/pq-usage.js` saves `rate_limits.five_hour` / `seven_day` from Claude Code's status line
  input into `<app home>/pixel-quest-usage.json` (only when changed); `status` reads it with
  `readTextFile` every 20s. No per-model limits: Claude Code doesn't pass them to the status line.
- Herdr functions: `spaces`, `agents`, `terminals`, `panes`, `focused`, `run`, `openOverlay`,
  `closeOverlay`, `shared`/`setShared`, `nextCommand`, `placement`, `knownAgents`, `exec`/`hc` (the
  spaces role's git and machine checks, as in Herdr's own).
- Art: `art-src/gen_v3.py` (every PNG, drawn at 1x and doubled with nearest neighbour) and
  `art-src/gen_extras.py` (the preview, and the MP3s via ffmpeg).
- Dungeon details: `art-src/gen_dungeon.py` writes the floor, brick band, sill, lit slabs,
  sconce, chain, cobweb and moss PNGs. Big textures sit at their own size in a
  `relative().overflow_hidden()` box (`kit.js` `texture()`), so they are cut, never stretched.
- Portraits: `art-src/gen_faces.py`; tablet: `art-src/gen_tablet.py` (numpy).
- Fonts: Galmuri11, Galmuri11 Bold, Galmuri9, GalmuriMono11 TTFs in `mods/pixel-quest/fonts/` (OFL).

## Watch out

- Copy `themes/pixel-quest.json` too (not only `layouts/` and `mods/`), or the layout falls back
  to the default palette.
- Never show a PNG at a size other than its file size: GPUI filters images. Frames are bordered
  divs, not stretched images; only the corner knobs are pictures.
- `import "../other-mod/x.js"` is refused ("resolves outside the application directory").
- On the right edge, a peeking float shows the **right** side of its content: put the gems and
  portraits last in each row there.
- Herdr's welcome, palette, settings, toasts, confirm/prompt dialogs and the frame of floats and
  app-opened menus are Herdr's: they take the theme and fonts only.
- `herdr-app check` renders the mod without props; to check each role, copy the folder and
  force `props.role` in `main.js`.
- Herdr's JS `Date` ignores `toLocaleString` options: format dates by hand.
- A light theme needs its own well color for inputs: text on `P.ink` vanishes there (`P.well`).
- Galmuri is crisp at 12px (11) and 10px (9); other sizes blur. At Windows display scaling of
  125% or 150% the 2x art is resampled.

## Done when

- `herdr-app check mods/pixel-quest` passes, and with `role` forced to each of `pane spaces agents
  tabs chrome status menu newmenu quest party sill usage files` it still passes.
- `layout.switch {name: "pixel-quest"}` leaves `herdr-app status` with no errors and no `layout.error`.
- A `herdr-app shot` at zoom 1 shows: the gold knobs crisp (no blur), Galmuri in the sidebar and
  terminals, the torch over the tab bar, a cursor on the selected space.
- `herdr-app do pixel-quest.quest` shows the banner, and it is gone 5s later.
- Folding the sidebar (`layout.resize {id: "sidebar", px: 44}`) shows crests, not names.
