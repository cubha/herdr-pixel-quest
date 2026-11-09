// "퀘스트 완료": the banner the status bar opens when an agent finishes.
// A gold-framed plaque with twinkling crystals; it leaves by itself after a
// few seconds. Click: go to that agent's pane. Copyright (c) 2026 cubha. MIT.

import { div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { props, closeOverlay, run, setShared } from "herdr";
import { P, unit, root, pic, frame, small } from "../kit.js";

export default class Quest {
  init(_p, cx) {
    cx.timer.after(4500, () => {
      closeOverlay(props()?.overlay);
      setShared("pq.banner.open", null);
    });
  }

  render() {
    const u = unit();
    const p = props() ?? {};
    // Sparkles: the same crystal at four spots, out of step so they twinkle.
    const spark = (top, left, period) => pic(u, "ico-crystal", 16).absolute().top(u(top)).left(u(left)).loop("opacity", { from: 0, to: 1, period });
    const close = () => { closeOverlay(p.overlay); setShared("pq.banner.open", null); };
    const body = v_flex().relative().size_full().items_center().justify_center().gap(u(4))
      .child(h_flex().gap(u(8)).items_center()
        .child(pic(u, "ico-chest-open", 16))
        .child(div().text_color(P.g3).child("퀘스트 완료!"))
        .child(pic(u, "ico-chest-open", 16)))
      .child(div().max_w(u(300)).truncate().text_color(P.text).child(p.title ?? ""))
      .child(small(u, `보상: 경험치 +1 · 누적 퀘스트 ${p.quests ?? 1}`, P.done))
      .child(spark(6, 14, 500)).child(spark(48, 30, 700)).child(spark(8, 300, 620)).child(spark(50, 286, 820));
    return root(u, div().id("quest").size_full().cursor_pointer()
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .on_click(() => { if (p.pane) run("pane.focus", { pane: p.pane }); close(); })
      .child(frame(u, "gold", body, { pad: [4, 8] }).size_full()));
  }
}
