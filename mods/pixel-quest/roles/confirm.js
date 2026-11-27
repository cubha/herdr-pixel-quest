// The theme's "are you sure" dialog, for closes started from the theme's own
// menus and buttons (a space, or a space's last tab, a machine). props { title, detail,
// command: { name, args } | hc: [args], yes?, done? }: 확인 / Enter runs the command
// (with confirmed), or `hc <args>` and stays open until it answers (its error shown here),
// 취소 / Esc closes. Closes started by keys still get Herdr's own dialog,
// which a theme can't replace. Copyright (c) 2026 cubha. MIT License.

import { div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { props, run, closeOverlay, hc, notify } from "herdr";
import { P, unit, root, frame, small, button, bandHead } from "../kit.js";

export default class Confirm {
  init(_p, cx) {
    this.handle = cx.focus_handle();
    this.handle.focus();
  }

  yes(cx) {
    const p = props() ?? {};
    if (p.hc) {
      if (this.busy) return;
      this.busy = true;
      this.error = null;
      cx?.notify();
      cx?.spawn(async (cx) => {
        let r;
        try { r = await hc([...p.hc, "--json"]); } catch (e) { r = { code: 1, stderr: String(e), stdout: "" }; }
        if (r.code === 0) {
          closeOverlay(p.overlay);
          if (p.done) notify({ title: p.done, level: "success" });
          return;
        }
        let msg;
        try { msg = JSON.parse(r.stdout || r.stderr).error?.message; } catch {}
        this.error = msg || (r.stderr || r.stdout || "실패했습니다").trim();
        this.busy = false;
        cx.notify();
      });
      return;
    }
    closeOverlay(p.overlay);
    if (p.command?.name) run(p.command.name, p.command.args ?? {});
  }

  render() {
    const u = unit();
    const p = props() ?? {};
    const body = v_flex().size_full().gap(u(8))
      .child(bandHead(u, "확인").mx(u(-10)).mt(u(-8)))
      .child(div().text_color(P.gt).child(p.title ?? "계속할까요?"))
      .child(div().flex_1().min_h(0).child(small(u, this.error ?? p.detail ?? "", this.error ? P.blocked : P.muted)))
      .child(h_flex().gap(u(8)).items_center().justify_end()
        .child(small(u, "Enter 확인 · Esc 취소", P.dim).mr(u(4)))
        .child(button(u, "cf-no", small(u, "취소", P.text), () => closeOverlay(p.overlay), { pad: [2, 10] }))
        .child(button(u, "cf-yes", small(u, this.busy ? "…" : p.yes ?? "닫기", P.g4), (_e, cx) => this.yes(cx), { pad: [2, 10], red: true })));
    return root(u, div().id("confirm").size_full().track_focus(this.handle)
      .on_key_down((e, cx) => {
        if (e.key === "enter") this.yes(cx);
        else if (e.key === "escape") closeOverlay(p.overlay);
        else return;
        cx.stop_propagation();
      })
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .child(frame(u, "gold", body, { pad: [8, 10], floor: true, web: "br" }).size_full()));
  }
}
