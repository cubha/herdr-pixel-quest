// Pixel Quest notifications: the layout's `"toast": "pixel-quest"` hands every
// notification (Herdr's own and every notify()) to this role, with props
// { title, body, level, icon, action, timeout, overlay } and no role. A small stone
// window: a red frame for errors, bronze for the rest, the level's gem on the left.
// Click: run its action (e.g. go to the agent) and dismiss it. Herdr closes it after
// its timeout. A "needs login" error gets a copy button for the login command.
// A medal's notification (status.js) shows the medal at its own size (24x28).
// Modified from Herdr's shipped `toast` mod (Apache-2.0, Herdr 0.1.15).
// Copyright (c) 2026 cubha. MIT License (see the repository's LICENSE).

import { div, image } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { props, closeOverlay, run } from "herdr";
import { P, unit, root, frame, small, gem, button } from "../kit.js";

// Level -> gem (the agents' status gems: red, blue, green, grey).
const GEM = { error: "blocked", warning: "working", success: "done", info: "idle" };

export default class Toast {
  render() {
    const u = unit();
    const p = props() ?? {};
    const login = /^([a-z0-9][a-z0-9_.-]{0,31}) needs login; run hc machine login \1$/.exec(p.body ?? "");
    const command = login ? `hc machine login ${login[1]}` : null;
    const title = login ? `${login[1]} 로그인 필요` : p.title ?? "";
    const text = login ? command : p.body ?? "";
    const medal = /\/medal-[a-z]+-[a-z]+\.png$/.test(p.icon ?? "");
    const mark = p.icon ? image(p.icon).w(u(medal ? 24 : 18)).h(u(medal ? 28 : 18)).flex_none() : gem(u, GEM[p.level] ?? "idle", "toast-gem");
    const lines = v_flex().flex_1().min_w(0).gap(u(2)).overflow_hidden()
      .child(div().truncate().text_color(p.level === "error" ? P.text : P.gt).child(title))
      .when(Boolean(text), (el) => el.child(small(u, text, P.muted).id("toast-body").truncate().tooltip(text)));
    const row = h_flex().size_full().gap(u(10)).items_center()
      .child(mark)
      .child(lines)
      .when(Boolean(login), (el) => el.child(button(u, "toast-copy", small(u, this.copied ? "복사됨" : "복사", P.text), (_e, cx) => {
        cx.write_to_clipboard(command); this.copied = true; cx.notify();
      }, { pad: [1, 6] })));
    const el = div().id("toast").size_full().cursor_pointer()
      .on_click(() => {
        if (p.action?.name) run(p.action.name, p.action.args ?? {});
        closeOverlay(p.overlay);
      })
      .child(frame(u, p.level === "error" ? "red" : "bronze", row, { pad: [4, 10], floor: true, margin: 0, thin: true }).size_full());
    return root(u, el);
  }
}
