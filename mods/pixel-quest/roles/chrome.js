// Pixel Quest brand bar and sidebar footer. Modified from Herdr's shipped
// `workspace-chrome` mod (Apache-2.0, Herdr 0.1.14): wordmark and shield,
// pixel buttons, "설정" / "머신 추가" as bronze buttons.

import { View, div, image, svg } from "gpui-kit";
import { P, unit, root, pic, button, small, lvInfo, best, openJournal, openSettings } from "../kit.js";
import { titleOf, goldBadge } from "../progress.js";
import { h_flex, v_flex } from "gpui-base";
import { theme, run, props, window, shared, setShared, updates, layout, spaces, agents } from "herdr";


function find(node, id) {
  if (node?.id === id) return node;
  for (const child of node?.children ?? []) {
    const found = find(child, id);
    if (found) return found;
  }
  return null;
}

// The sidebar's rail goes by its width, not a flag: dragging its edge narrows it too.
const narrow = () => (find(layout(), "sidebar")?.size?.px ?? Infinity) < 160;

// To the rail (on macOS wide enough for the traffic lights), or back to the width it had.
function toggleSidebar() {
  const width = find(layout(), "sidebar")?.size?.px;
  if (!narrow()) setShared("sidebar.width", width);
  // Mods edited before the rail went by width still read the flag.
  setShared("sidebar.collapsed", !narrow());
  run("layout.resize", { id: "sidebar", px: narrow() ? (shared("sidebar.width") ?? 268) : window()?.platform === "macos" ? 76 : 44 });
}

export default class WorkspaceChrome {
  // The level and title (progress.js); gold from Lv.19. Click: the adventure log.
  badge(u) {
    const lv = lvInfo().lv, gold = goldBadge(best());
    return div().id("lv-badge").flex_none().border(u(2)).border_color(gold ? P.g3 : P.b1).bg(gold ? P.g0 : P.chrome).px(u(4)).cursor_pointer()
      .hover((s) => s.border_color(P.g2))
      .tooltip("모험 일지")
      .on_click(() => openJournal())
      .child(small(u, `Lv.${lv} ${titleOf(lv)}`, gold ? P.g3 : P.gt).when(gold, (el) => el.loop("opacity", { from: 0.6, to: 1, period: 1200 })));
  }

  render() {
    const u = unit();
    const collapsed = narrow();
    const icon = (name) => svg(`mods/pixel-quest/icons/${name}.svg`).size(u(12)).text_color(P.gt);
    if (props()?.footer) {
      const ready = div().size(u(6)).bg(P.g3);
      const item = (id, name, label, action) => button(u, id,
        h_flex().gap(u(6)).items_center().child(icon(name)).when(!collapsed, (el) => el.child(div().text_color(P.text).child(label))),
        action, { pad: [3, collapsed ? 4 : 8], tooltip: label });
      return root(u, (collapsed ? v_flex() : h_flex()).size_full().px(u(8)).py(u(3)).gap(u(6)).items_center()
        .child(item("settings", "settings", "설정", () => openSettings()).when(!collapsed, (el) => el.flex_1())
          .when(Boolean(updates().app.ready), (el) => el.relative().child(ready.absolute().top(u(2)).right(u(2)))))
        .child(item("machine", "plus", "머신 추가", () => run("mod.open", { name: "machine-add" })).when(!collapsed, (el) => el.flex_1())));
    }
    return root(u, h_flex().size_full().pl(u(collapsed ? 6 : 14)).pr(u(10)).gap(u(6)).items_center()
      .when(window()?.platform === "macos" && !window()?.fullscreen && !collapsed, (el) => el.pl(u(76)))
      .when(!collapsed, (el) => el.child(pic(u, "emblem", 24, 28)))
      .when(!collapsed, (el) => el.child(h_flex().flex_1().gap(u(8)).items_center()
        .child(pic(u, "wordmark", 76, 22))
        .child(this.badge(u))))
      .when(!collapsed, (el) => el.child(button(u, "search", icon("search"), () => run("mod.open", { name: "picker" }), { pad: [3, 4], tooltip: "찾기" })))
      .when(!(collapsed && window()?.platform === "macos"), (el) => el.child(button(u, "sidebar-toggle", icon("sidebar"), toggleSidebar, { pad: [3, 4], tooltip: "사이드바 접기" }))));
  }
}
