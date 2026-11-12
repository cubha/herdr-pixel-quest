// The theme's rename window, in place of Herdr's `prompt` for renames started
// from the theme (tab double-click, the tab and space menus, the palette, and
// `pixel-quest.rename_tab` / `rename_space` keys). props { title, value, hint,
// command: { name, args } } (dialogs.js renameSpec): Enter / 저장 runs the
// command with the typed name ("" = Herdr's own name again), Esc / 취소 closes.
// Modified from Herdr's shipped `prompt` mod (Apache-2.0, Herdr 0.1.14).

import { div } from "gpui-kit";
import { h_flex, v_flex, InputState, Input } from "gpui-base";
import { props, run, closeOverlay } from "herdr";
import { P, unit, root, frame, small, button, bandHead, pic } from "../kit.js";
import { renameArgs } from "../dialogs.js";

export default class Prompt {
  init(_p, cx) {
    const value = props()?.value ?? "";
    // Herdr's input draws no placeholder here, so the window draws its own while the
    // field is empty (render), behind a see-through input.
    this.input = InputState.new({ value });
    this.empty = !value;
    this.input.on("change", (_e, cx) => { const e = !this.input.value(); if (e !== this.empty) { this.empty = e; cx.notify(); } });
    if (value) this.input.set_selected_range({ start: 0, end: value.length });
    this.input.on("submit", () => this.save());
    this.input.focus();
    cx.timer.after(600, () => this.input.focus());
    this.handle = cx.focus_handle();
  }

  close() { closeOverlay(props()?.overlay); }

  save() {
    const p = props() ?? {};
    this.close();
    if (p.command?.name) run(p.command.name, renameArgs(p.command, this.input.value()));
  }

  render() {
    const u = unit();
    const p = props() ?? {};
    const field = h_flex().h(u(26)).flex_none().px(u(6)).gap(u(6)).items_center().bg(P.well).border(u(2)).border_color(P.b2)
      .child(pic(u, "ico-scroll", 16))
      .child(div().relative().flex_1().h_full().min_w(0)
        .when(this.empty, (el) => el.child(h_flex().absolute().inset_0().items_center().pl(u(2))
          .child(div().text_size(u(12)).text_color(P.dim).child(p.placeholder ?? "이름"))))
        .child(Input.new(this.input).size_full().text_size(u(12)).text_color(P.text).bg("#00000000").border_0()));
    const body = v_flex().size_full().gap(u(6))
      .child(bandHead(u, p.title ?? "이름 바꾸기").mx(u(-10)).mt(u(-8)))
      .child(field)
      .child(small(u, p.hint ?? "", P.muted))
      .child(div().flex_1())
      .child(h_flex().gap(u(8)).items_center().justify_end()
        .child(small(u, "Enter 저장 · Esc 취소", P.dim).mr(u(4)))
        .child(button(u, "pm-no", small(u, "취소", P.text), () => this.close(), { pad: [2, 10] }))
        .child(button(u, "pm-yes", small(u, "저장", P.g4), () => this.save(), { pad: [2, 10], on: true })));
    return root(u, div().id("prompt").size_full().track_focus(this.handle)
      .on_key_down((e, cx) => {
        if (e.key !== "escape") return;
        this.close();
        cx.stop_propagation();
      })
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .child(frame(u, "gold", body, { pad: [8, 10], floor: true, web: "br" }).size_full()));
  }
}
