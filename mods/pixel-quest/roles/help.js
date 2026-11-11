// The theme's key list, in place of Herdr's `help` (app.help) when opened from
// the theme (the tab menu's 단축키, the palette, `pixel-quest.help`): every
// keys.json binding in Korean, grouped, filtered by typing. Edit keys.json to
// change them. Modified from Herdr's shipped `help` mod (Apache-2.0, Herdr 0.1.14).

import { div } from "gpui-kit";
import { h_flex, v_flex, InputState, Input, Scrollbar } from "gpui-base";
import { keys, props, closeOverlay, window as win } from "herdr";
import { P, unit, root, frame, small, bandHead, pic } from "../kit.js";
import { keyGroups, keyLabel, keyParts } from "../dialogs.js";

export default class Help {
  init(_p, cx) {
    this.filter = "";
    this.input = InputState.new({ placeholder: "키나 기능으로 찾기…" });
    this.input.on("change", (_e, cx) => { this.filter = this.input.value(); cx.notify(); });
    this.input.focus();
    cx.timer.after(600, () => this.input.focus());
    this.handle = cx.focus_handle();
  }

  close() { closeOverlay(props()?.overlay); }

  render() {
    const u = unit();
    const mac = win()?.platform === "macos";
    const groups = keyGroups(keys() ?? [], this.filter);
    const cap = (t) => div().flex_none().px(u(4)).bg(P.raised).border(u(2)).border_color(P.b1)
      .child(small(u, t, P.gt));
    const row = (k) => h_flex().h(u(24)).flex_none().px(u(4)).gap(u(8)).items_center()
      .child(h_flex().w(u(170)).flex_none().gap(u(3)).items_center()
        .children(keyParts(k.keys, mac).map(cap))
        .when(k.section !== "global", (el) => el.child(small(u, "터미널", P.dim))))
      .child(div().flex_1().min_w(0).truncate().text_color(P.text).child(keyLabel(k.action)));
    const head = (name) => h_flex().flex_none().pt(u(6)).pb(u(2)).gap(u(6)).items_center()
      .child(small(u, name, P.gt2))
      .child(div().flex_1().h(u(2)).bg(P.b1));
    const search = h_flex().h(u(26)).flex_none().px(u(6)).gap(u(6)).items_center().bg(P.well).border(u(2)).border_color(P.b2)
      .child(pic(u, "ico-key", 16))
      .child(Input.new(this.input).flex_1().h_full().text_size(u(12)).text_color(P.text).bg(P.well).border_0());
    const list = div().relative().flex_1().min_h(0)
      .child(v_flex().id("help-rows").size_full().overflow_y_scroll().pr(u(8))
        .children(groups.flatMap(([name, rows]) => [head(name), ...rows.map(row)]))
        .when(groups.length === 0, (el) => el.child(div().p(u(8)).child(small(u, "맞는 단축키가 없습니다", P.muted)))))
      .child(Scrollbar.vertical("help-rows").absolute().inset_0());
    const body = v_flex().size_full().min_h(0).gap(u(6))
      .child(bandHead(u, "단축키").mx(u(-10)).mt(u(-8)))
      .child(search)
      .child(list)
      .child(h_flex().gap(u(10)).items_center()
        .child(div().flex_1().min_w(0).truncate().child(small(u, "바꾸려면 keys.json을 고치세요", P.dim)))
        .child(small(u, "Esc 닫기", P.gt2)));
    return root(u, div().id("help").size_full().track_focus(this.handle)
      .on_key_down((e, cx) => {
        if (e.key !== "escape") return;
        this.close();
        cx.stop_propagation();
      })
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .child(frame(u, "gold", body, { pad: [8, 10], floor: true, web: "br" }).size_full()));
  }
}
