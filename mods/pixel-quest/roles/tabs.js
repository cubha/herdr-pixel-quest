// Pixel Quest tab bar. Modified from Herdr's shipped `tabs` mod (Apache-2.0,
// Herdr 0.1.14): numbered inventory tabs, status gems, a torch in the middle,
// "소지품" (Files) and "변경" (Changes) as bronze buttons, pixel window buttons.

import { View, div, svg, image } from "gpui-kit";
import { P, unit, root as pxRoot, pic, gem, button as pxButton, texture, closeTab, openRename, look, applyLook, veil } from "../kit.js";
import { h_flex } from "gpui-base";
import { spaces, panes, run, openOverlay, theme, window, shared, layout, settings } from "herdr";

function find(node, id) {
  if (node?.id === id) return node;
  for (const child of node?.children ?? []) {
    const found = find(child, id);
    if (found) return found;
  }
  return null;
}

export default class Tabs {
  init() {
    this.pressed = null;
    this.panels = JSON.parse(localStorage.getItem("panels") ?? "{}");
  }

  // The side panel is remembered per space: switching shows that space's choice
  // (closed if it never had one), and opening or closing it records it.
  syncPanel(space, panel, body, enabled) {
    if (!space || !panel) return;
    const now = panel.hidden ? null : body?.active ?? null;
    if (space.id !== this.space) {
      const first = this.space === undefined;
      this.space = space.id; this.pending = null;
      if (!(first && !(space.id in this.panels))) {
        const stored = this.panels[space.id] ?? null, want = enabled.includes(stored) ? stored : null;
        if (want !== now) {
          this.pending = { want, until: Date.now() + 1000 };
          if (want) { run("layout.select", { stack: "panel-body", child: want }); run("layout.show", { id: "panel" }); }
          else run("layout.hide", { id: "panel" });
          return;
        }
      }
    }
    // Until the restore lands (or something else won), the old state isn't a choice.
    if (this.pending) {
      if (this.pending.want !== now && Date.now() < this.pending.until) return;
      this.pending = null;
    }
    if (this.panels[space.id] === now) return;
    this.panels[space.id] = now;
    localStorage.setItem("panels", JSON.stringify(this.panels));
  }

  render() {
    const t = theme();
    const u = unit();
    const space = spaces().find(p => p.active);
    const shown = space?.tabs ?? [];
    const stop = (_e, cx) => cx.stop_propagation();
    const ico = (path, size = 12, color = P.g3) => svg(path).size(u(size)).text_color(color);
    const button = (id, content, action, o = {}) => pxButton(u, id, content, action, { pad: [3, 5], ...o });
    const item = (c, i) => {
      const program = panes().find(p => p.tab === c.id && p.program?.agent)?.program ?? panes().find(p => p.tab === c.id)?.program;
      const name = /^(tb)?\d+$/.test(c.name) ? program?.name ?? "터미널" : c.name;
      const on = c.active;
      const r = on ? [P.b3, P.b1, P.b2] : [P.stone, P.ink, P.raised];
      return div().id(`tab-${c.id}`).flex_none().flex().flex_col().border(u(2)).border_color(P.ink)
        .child(div().flex().flex_col().border_r(u(2)).border_color(r[1])
          .child(h_flex().h(u(26)).pr(u(8)).gap(u(6)).items_center().border_t(u(2)).border_l(u(2)).border_color(r[0])
            .bg(on ? P.b1 : P.fill).text_color(on ? P.g3 : P.muted)
            .hover(s => s.bg(on ? P.b1 : P.hover))
            .child(div().h_full().px(u(5)).flex().items_center().bg(P.ink).text_color(on ? P.g3 : P.dim).child(String(i + 1)))
            .child(div().max_w(u(170)).truncate().child(c.zoomed ? `${name} ◆` : name))
            .when(c.status && c.status !== "idle", el => el.child(gem(u, c.status, `tab-gem-${c.id}`)))
            .when(on, el => el.child(div().id(`close-${c.id}`).flex_none().text_color(P.g2).hover(s => s.text_color(P.g4)).on_mouse_down("left", stop)
              .on_click((_e, cx) => { cx.stop_propagation(); closeTab(space, c.id); }).child(ico("mods/pixel-quest/icons/close.svg", 10, P.g2))))))
        .on_mouse_down("left", (e, cx) => { cx.stop_propagation(); this.pressed = i; if (e.click_count === 2) openRename("tab", c.id); })
        .on_mouse_up("left", () => {
          const from = this.pressed; this.pressed = null;
          if (from !== null && from !== i) run("tab.move", { id: shown[from].id, index: space.tabs.findIndex(x => x.id === c.id) + 1 });
          else run("tab.select", { id: c.id });
        })
        .on_mouse_down("right", (_e, cx) => { cx.stop_propagation(); openOverlay({ mod: "pixel-quest", kind: "popup", frame: "none", width: 200, props: { role: "menu", frameless: true, tab: "tab", target: { id: c.id, space: space.id } } }); });
    };
    const root = layout(), sidebar = find(root, "sidebar"), w = window();
    // Old saved rails and a dragged-narrow sidebar can be smaller than the window buttons.
    const lightsPadding = w?.platform === "macos" && w.titlebar === "none" && !w.fullscreen && root?.traffic_lights
      ? Math.max(10, (root.traffic_lights[0] + 64) / settings().zoom - (sidebar?.hidden ? 0 : sidebar?.size?.px ?? 0))
      : 10;
    const panel = find(root, "panel"), body = find(root, "panel-body");
    const enabled = shared("workspace.panels") ?? ["files", "changes"];
    this.syncPanel(space, panel, body, enabled);
    const panelButton = (id, label, art) => {
      const on = panel && !panel.hidden && body?.active === id;
      return button(`panel-${id}`, h_flex().gap(u(5)).items_center().child(pic(u, art, 16)).child(div().text_color(on ? P.gt : P.text).child(label)),
        (_e, cx) => {
          if (on) run("layout.hide", { id: "panel" });
          else { run("layout.select", { stack: "panel-body", child: id }); run("layout.show", { id: "panel" }); }
          // The work area changes shape: the season's decoration follows (look.js buckets).
          cx?.timer?.after(500, () => applyLook());
        }, { on, pad: [2, 6] });
    };
    const winIcon = (n) => ico(`mods/pixel-quest/icons/${n}.svg`, 12, P.text);
    // Time of day and season (look.js): windows show the sky, the sconces are out by day
    // and pool their light at dusk and night (candlelight on the dimmed light bricks),
    // the flames go green for Halloween, wreaths hang at Christmas.
    const lk = look(), ph = lk.phase, timed = ph !== "none", lit = ph === "dawn" || ph === "dusk" || ph === "night";
    const g = lk.season === "halloween" ? "-green" : "";
    const art = (n) => (g ? `look/${n}${g}` : n);
    const skin = P.light ? "light" : "dark";
    const pool = P.light ? { dawn: 0.55, dusk: 0.7, night: 1 }[ph] : { dawn: 0.35, dusk: 0.45, night: 0.9 }[ph];
    // A wall sconce with its light pool; the second flame frame flickers in.
    const sconce = (side, left, period) => ph === "day"
      ? [pic(u, "look/sconce-off", 16).absolute().top(u(20)).left(u(left))]
      : [
        ...(lit ? [P.light
          ? pic(u, "look/glow-candle", 156, 48).absolute().top(u(4)).left(u(left - 70)).opacity(pool)
          : pic(u, "look/glow-warm", 88, 48).absolute().top(u(4)).left(u(left - 36)).opacity(pool)] : []),
        pic(u, art("sconce-halo"), 36, 28).absolute().top(u(14)).left(u(left - 10)).loop("opacity", { from: 0.6, to: 1, period: period * 2 }),
        div().id(`sconce-${side}`).absolute().top(u(20)).left(u(left)).w(u(16)).h(u(16))
          .child(pic(u, art("sconce"), 16).absolute().top(0).left(0))
          .child(pic(u, art("sconce-b"), 16).absolute().top(0).left(0).loop("opacity", { from: 0, to: 1, period })),
      ];
    const windows = timed ? [
      pic(u, `look/win-${skin}-${ph}`, 28, 34).absolute().top(u(20)).left(u(55)),
      pic(u, `look/win-${skin}-${ph}-r`, 28, 34).absolute().top(u(20)).left(u(301)),
    ] : [];
    const wreaths = lk.season === "xmas" ? [
      pic(u, "look/wreath", 24).absolute().top(u(24)).left(u(13)),
      pic(u, "look/wreath", 24).absolute().top(u(24)).left(u(349)),
    ] : [];
    const torchPool = lit ? [P.light
      ? pic(u, "look/glow-candle-torch", 260, 48).absolute().top(u(4)).left(u(60)).opacity(pool)
      : pic(u, "look/glow-torch", 180, 48).absolute().top(u(4)).left(u(100)).opacity(pool * 0.9)] : [];
    return pxRoot(u, h_flex().size_full().min_w(0).relative().overflow_hidden().px(u(10)).pl(lightsPadding).gap(u(4)).items_center().bg(P.chrome).border_b(u(2)).border_color(P.ink)
      // Brick band behind everything, cut to the bar.
      .child(texture(u, "strip", 2560, 48))
      .when(Boolean(veil()), (el) => el.child(veil()))
      .on_mouse_up("left", () => { this.pressed = null; })
      .on_scroll_wheel(e => { if (Math.abs(e.delta.y) >= 1) run(e.delta.y > 0 ? "tab.prev" : "tab.next"); })
      // The torch hangs in the middle of the bar, its glow dithered behind it.
      .child(div().absolute().top(u(-14)).left(u(0)).right(u(0)).flex().justify_center()
        // ... flanked by two wall sconces.
        .child(div().relative().w(u(380)).h(u(60))
          .children(torchPool)
          .children(windows)
          .children(wreaths)
          .children(sconce("l", 116, 520))
          .children(sconce("r", 248, 650))
          .child(pic(u, art("torch-glow"), 96, 60).absolute().top(0).left(u(142)).loop("opacity", { from: 0.7, to: 1, period: 1600 }))
          .child(pic(u, art("torch"), 18, 38).absolute().top(u(12)).left(u(181)))))
      .child(h_flex().id("tab-scroll").flex_1().min_w(0).h_full().items_center().gap(u(4)).overflow_x_scrollbar().children(shown.map(item)))
      .child(button("tab-new", div().text_color(P.gt).child("+"), () => openOverlay({ mod: "pixel-quest", kind: "popup", width: 250, height: 534, props: { role: "newmenu" }, frame: "none" }), { tooltip: "새 탭" }))
      .when(enabled.includes("files"), el => el.child(panelButton("files", "소지품", "ico-chest")))
      .when(enabled.includes("changes"), el => el.child(panelButton("changes", "변경", "ico-scroll")))
      .when(w?.buttons, el => el.child(button("minimize", w.platform === "windows" ? winIcon("win-min") : "−", () => run("window.minimize")))
        .child(button("maximize", w.platform === "windows" ? winIcon(w.maximized ? "win-restore" : "win-max") : "□", () => run("window.maximize")))
        .child(pxButton(u, "close-window", winIcon(w.platform === "windows" ? "win-close" : "close"), () => run("window.close"), { pad: [3, 5], red: true }))));
  }
}
