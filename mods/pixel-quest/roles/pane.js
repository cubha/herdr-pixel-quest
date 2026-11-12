// Pixel Quest pane header. Modified from Herdr's shipped `pane` mod
// (Apache-2.0, Herdr 0.1.14): restyled as an inventory-window title bar with
// a status gem, pixel buttons and gold knobs on the focused pane.
//
// Shows the agent's portrait (click: another one), the agent's name or the terminal's title,
// the folder and the agent's status gem; buttons split, zoom and close this
// pane. Props from the app: { pane, terminal }. Click: focus the pane.

import { View, div } from "gpui-kit";
import { h_flex } from "gpui-base";
import { panes, props, run, home, agents } from "herdr";
import { P, unit, root, pic, gem, button, small, face, faceMap, agentFace, openPicker, battle, portraitSmall } from "../kit.js";

function folder(cwd) {
  if (!cwd) return "";
  const h = home();
  return cwd === h ? "~" : cwd.startsWith(h + "/") ? "~" + cwd.slice(h.length) : cwd;
}

const LABEL = { working: "작업 중", blocked: "입력 필요", done: "완료" };
const COLOR = { working: P.working, blocked: P.blocked, done: P.done };

export default class Pane {
  init() { this.hovered = false; }

  me() {
    return panes().find((p) => p.pane === props()?.pane);
  }

  // An agent's portrait follows its space (the same one the agents list and the
  // party show) and a click opens the picker; other programs keep one by name.
  portrait(u, p, name) {
    const all = agents();
    const a = all.find((x) => x.pane === p.pane);
    if (!a) return face(u, p.program?.name ?? name, 24).w(u(24)).h(u(24));
    const faces = faceMap(all);
    return div().id(`pane-face-${p.pane}`).flex_none().cursor_pointer()
      .tooltip("초상 고르기")
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .on_click((_e, cx) => { cx.stop_propagation(); openPicker(faces.get(a.address)); })
      .child(portraitSmall(u, agentFace(u, faces.get(a.address), name, 24)));
  }

  render() {
    // The header keeps its daylight colors when the light look dims (the mockup's call).
    const u = unit({ dim: false });
    const p = this.me();
    if (!p) return div();
    const name = ((p.program?.agent || p.program?.shell) && p.program.name) || p.title || p.program?.name || "shell";
    const st = p.status;
    const pane = p.pane;
    const on = Boolean(p.focused);
    const icon = (n) => pic(u, `ico-${n}`, 16);
    const btn = (id, n, tip, command, args) => button(u, `${id}-${pane}`, icon(n), () => run(command, args), { pad: [1, 2], tooltip: tip });
    return root(u, h_flex()
      .id(`pane-head-${pane}`)
      .size_full()
      .relative()
      .pl(u(on ? 18 : 8))
      .pr(u(on ? 18 : 8))
      .gap(u(8))
      .items_center()
      .bg(on ? P.raised : P.chrome)
      .border_b(u(2))
      .border_color(on ? P.g1 : P.ink)
      .on_hover((hovered, cx) => { this.hovered = hovered; cx.notify(); })
      .on_click(() => run("pane.focus", { pane }))
      .when(on, (el) => el
        .child(pic(u, "knob-gold", 16).absolute().top(u(5)).left(u(1)))
        .child(pic(u, "knob-gold", 16).absolute().top(u(5)).right(u(1))))
      .child(gem(u, st, `gem-${pane}`))
      .child(this.portrait(u, p, name))
      .when(Boolean(agents().find((x) => x.pane === pane)), (el) => el.child(battle(u, st)))
      .child(div().flex_none().truncate().max_w(u(260)).text_color(on ? P.gt : P.text).child(name))
      .child(div().flex_1().min_w(0).truncate().child(small(u, folder(p.cwd), P.dim)))
      .when(Boolean(LABEL[st]), (el) => el.child(small(u, LABEL[st], COLOR[st]).flex_none()))
      .when(this.hovered, (el) => el
        .child(btn("ph-r", "scroll", "오른쪽으로 나누기", "pane.split", { direction: "right", pane }))
        .child(btn("ph-d", "chest", "아래로 나누기", "pane.split", { direction: "down", pane }))
        .child(btn("ph-z", p.zoomed ? "chest-open" : "crystal", p.zoomed ? "원래 크기" : "크게 보기", "pane.zoom", { pane }))
        .child(btn("ph-x", "potion", "닫기", "pane.close", { pane }))));
  }
}
