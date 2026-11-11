// The theme's "are you sure" dialog, for closes started from the theme's own
// menus and buttons (a space, or a space's last tab). props { title, detail,
// command: { name, args } }: 확인 / Enter runs the command (with confirmed),
// 취소 / Esc closes. Closes started by keys still get Herdr's own dialog,
// which a theme can't replace. Copyright (c) 2026 cubha. MIT License.

import { div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { props, run, closeOverlay } from "herdr";
import { P, unit, root, frame, small, button, bandHead } from "../kit.js";

export default class Confirm {
  init(_p, cx) {
    this.handle = cx.focus_handle();
    this.handle.focus();
  }

  yes() {
    const p = props() ?? {};
    closeOverlay(p.overlay);
    if (p.command?.name) run(p.command.name, p.command.args ?? {});
  }

  render() {
    const u = unit();
    const p = props() ?? {};
    const body = v_flex().size_full().gap(u(8))
      .child(bandHead(u, "확인").mx(u(-10)).mt(u(-8)))
      .child(div().text_color(P.gt).child(p.title ?? "정말 할까요?"))
      .child(div().flex_1().min_h(0).child(small(u, p.detail ?? "", P.muted)))
      .child(h_flex().gap(u(8)).items_center().justify_end()
        .child(small(u, "Enter 확인 · Esc 취소", P.dim).mr(u(4)))
        .child(button(u, "cf-no", small(u, "취소", P.text), () => closeOverlay(p.overlay), { pad: [2, 10] }))
        .child(button(u, "cf-yes", small(u, p.yes ?? "닫기", P.g4), () => this.yes(), { pad: [2, 10], red: true })));
    return root(u, div().id("confirm").size_full().track_focus(this.handle)
      .on_key_down((e, cx) => {
        if (e.key === "enter") this.yes();
        else if (e.key === "escape") closeOverlay(p.overlay);
        else return;
        cx.stop_propagation();
      })
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .child(frame(u, "gold", body, { pad: [8, 10], floor: true, web: "br" }).size_full()));
  }
}
