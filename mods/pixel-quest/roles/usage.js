// The usage card: opens from the status bar's gauges (a popup at the pointer).
// Each window (5 hours, 7 days) as a long mana bar with the percent, the time
// left and when it resets, and when Claude Code last reported.
// Copyright (c) 2026 cubha. MIT.

import { div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { readTextFile, appHome, closeOverlay, props } from "herdr";
import { P, unit, root, frame, plaque, small, cells, usageWindow, span, USAGE_FILE, button } from "../kit.js";

export default class Usage {
  init(_p, cx) {
    this.usage = undefined;
    const load = (cx) => cx.spawn(async (cx) => {
      try { const t = await readTextFile(`${appHome()}/${USAGE_FILE}`); this.usage = t ? JSON.parse(t) : null; }
      catch { this.usage = this.usage ?? null; }
      cx.notify();
    });
    load(cx);
    cx.timer.every(10000, load);
  }

  row(u, title, sub, w) {
    const r = usageWindow(w);
    return v_flex().gap(u(4))
      .child(h_flex().items_center().gap(u(8))
        .child(div().text_color(P.gt).child(title))
        .child(small(u, sub, P.dim))
        .child(div().flex_1())
        .child(div().text_size(u(16)).line_height(`${u(18)}px`).text_color(r.over ? P.dim : r.pct >= 80 ? P.blocked : P.text)
          .child(r.over ? "--" : `${Math.round(r.pct)}%`)))
      .child(cells(u, r, 20, 0, 16))
      .child(small(u, r.over ? "기록 없음 · 이 창이 초기화됐거나 아직 응답이 없습니다" : `초기화까지 ${span(r.left, true)} · ${r.at}`, r.over ? P.dim : P.muted));
  }

  render() {
    const u = unit();
    const use = this.usage;
    const t = use?.updated_at ? new Date(use.updated_at) : null;
    const two = (n) => String(n).padStart(2, "0");
    const body = v_flex().gap(u(10))
      .child(plaque(u, "사용량"))
      .when(use === undefined, (el) => el.child(small(u, "불러오는 중…")))
      .when(use === null, (el) => el.child(v_flex().gap(u(4))
        .child(div().text_color(P.text).child("아직 기록이 없습니다"))
        .child(small(u, "tools/pq-usage.js를 상태줄에 연결하면 Claude 응답 때마다 채워집니다.", P.muted))))
      .when(Boolean(use), (el) => el
        .child(this.row(u, "5시간", "세션 한도", use.five_hour))
        .child(div().h(u(2)).bg(P.b1))
        .child(this.row(u, "주간", "7일 한도", use.seven_day))
        .child(h_flex().items_center()
          .child(small(u, t ? `마지막 갱신 ${t.getMonth() + 1}/${t.getDate()} ${two(t.getHours())}:${two(t.getMinutes())}` : "", P.dim))
          .child(div().flex_1())
          .child(button(u, "usage-close", small(u, "닫기", P.text), () => closeOverlay(props()?.overlay), { pad: [1, 8] }))));
    return root(u, div().size_full().child(frame(u, "gold", body, { pad: [10, 12], floor: true }).size_full()));
  }
}
