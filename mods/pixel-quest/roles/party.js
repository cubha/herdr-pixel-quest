// The party drawer: a floating block on the right edge (layout `floating`,
// `peek`). Only the gems and portraits peek out; hover slides the names in.
// Click a member to go to its pane. Copyright (c) 2026 cubha. MIT.

import { div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { agents, run, placement } from "herdr";
import { P, unit, root, gem, small, faceMap, agentFace } from "../kit.js";

const WORD = { blocked: "입력 필요", done: "완료", working: "작업 중", idle: "대기" };
const RANK = { blocked: 4, done: 3, working: 2, idle: 1 };

export default class Party {
  render() {
    const u = unit();
    const all = agents();
    const faces = faceMap(all);
    const list = [...all].sort((a, b) => (RANK[b.status] ?? 0) - (RANK[a.status] ?? 0)).slice(0, 8);
    if (!list.length) return div();
    const pl = placement();
    const right = pl?.edge !== "left";
    const row = (a) => {
      const pic = h_flex().flex_none().gap(u(4)).items_center()
        .child(gem(u, a.status, `party-gem-${a.address}`))
        .child(div().border(u(2)).border_color(P.ink).bg(P.b1).child(agentFace(u, faces.get(a.address), a.program?.name ?? a.address, 24)));
      const text = v_flex().w(u(150)).min_w(0)
        .child(div().truncate().text_color(a.focused ? P.gt : P.text).child(a.space_name || a.program?.name || a.address))
        .child(small(u, WORD[a.status] ?? "", { blocked: P.blocked, done: P.done, working: P.working }[a.status] ?? P.dim));
      return h_flex().id(`party-${a.address}`).h(u(36)).px(u(6)).gap(u(8)).items_center().cursor_pointer()
        .hover((s) => s.bg(P.hover))
        .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
        .on_click(() => run("pane.focus", { pane: a.pane }))
        .children(right ? [text, pic] : [pic, text]);
    };
    return root(u, v_flex().bg(P.fill).py(u(4)).gap(u(2))
      .child(h_flex().px(u(6)).h(u(16)).when(right, (el) => el.justify_end()).child(small(u, `파티 ${list.length}`, P.gt2)))
      .children(list.map(row)));
  }
}
