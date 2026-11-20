// "업데이트": the theme's update window (kit openUpdate). With a new release out it shows
// that version's patch notes and [업데이트]; the button hands the work to the status bar
// (`pixel-quest.update_run`: it outlives this window) and closes. Opened with notes: true,
// or with nothing new, it shows this version's patch notes ("패치 노트", once after an
// update and from the palette). Enter: update, Esc: close.
// Copyright (c) 2026 cubha. MIT License.

import { div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { props, run, shared, closeOverlay } from "herdr";
import { P, unit, root, frame, plaque, small, button, pic, updateState } from "../kit.js";
import { VERSION, REPO, BUSY_FOR, noteLines } from "../update.js";

export default class Update {
  init(_p, cx) {
    this.handle = cx.focus_handle();
    this.handle.focus();
  }

  close() { closeOverlay(props()?.overlay); }

  go() {
    this.close();
    run("pixel-quest.update_run");
  }

  render() {
    const u = unit();
    const st = updateState(), cache = shared("pq.update") ?? {};
    const offer = st.state === "new" && !props()?.notes;
    const busy = Date.now() - (Number(shared("pq.update.busy")) || 0) < BUSY_FOR;
    // The notes on hand are the newest release's: this version's only when it is the newest.
    const lines = offer || cache.latest === VERSION ? noteLines(cache.notes) : [];
    const head = offer ? `새 버전 v${st.latest}` : `지금 버전 v${VERSION}`;
    const sub = offer ? `지금 v${VERSION} · 레벨·골드·훈장·펫과 고른 설정은 그대로 남습니다`
      : st.state === "new" ? `새 버전 v${st.latest}이 나와 있습니다` : st.state === "off" ? "업데이트 확인이 꺼져 있습니다 (던전 설정 · 모양)" : "최신 버전입니다";
    const line = (l, i) => l.kind === "head" ? div().id(`un-${i}`).flex_none().pt(u(4)).text_color(P.gt2).child(l.text)
      : h_flex().id(`un-${i}`).flex_none().gap(u(6)).items_start()
        .when(l.kind === "item", (el) => el.child(div().flex_none().text_color(P.g2).child("·")))
        .child(div().flex_1().min_w(0).text_color(P.text).child(l.text));
    const notes = v_flex().id("update-notes").flex_1().min_h(0).gap(u(3)).p(u(8)).bg(P.raised).border(u(2)).border_color(P.ink).overflow_y_scrollbar()
      .when(lines.length === 0, (el) => el.child(small(u, `패치 노트는 github.com/${REPO}/releases 에 있습니다`, P.dim)))
      .children(lines.map(line));
    const body = v_flex().size_full().gap(u(8))
      .child(plaque(u, h_flex().gap(u(6)).items_center().child(pic(u, "ico-crystal", 16)).child(offer ? "업데이트" : "패치 노트")))
      .child(v_flex().gap(u(2)).child(div().text_color(P.gt).child(head)).child(small(u, sub, P.muted)))
      .child(notes)
      .child(h_flex().gap(u(8)).items_center()
        .child(div().flex_1().min_w(0).truncate().child(small(u, offer ? (busy ? "업데이트하는 중입니다…" : "받아서 검사한 뒤 바꿉니다 · 실패하면 지금 버전 그대로") : "", P.dim)))
        .child(button(u, "upd-close", small(u, offer ? "나중에" : "닫기", P.text), () => this.close(), { pad: [2, 10] }))
        .when(offer && !busy, (el) => el.child(button(u, "upd-go", small(u, "업데이트", P.g4), () => this.go(), { pad: [2, 10], on: true }))));
    return root(u, div().id("update").size_full().track_focus(this.handle)
      .on_key_down((e, cx) => {
        if (e.key === "enter" && offer && !busy) this.go();
        else if (e.key === "escape") this.close();
        else return;
        cx.stop_propagation();
      })
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .child(frame(u, "gold", body, { pad: [8, 10], floor: true, web: "br" }).size_full()));
  }
}
