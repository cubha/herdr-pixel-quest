// The portrait picker: six shapes in rows of eight, opened from an agent's
// portrait (props { key, face }). The current one rises in gold; one another
// agent shows is dimmed with a gold dot; a locked one is a silhouette with a
// key, and hovering says at which level it opens. A click sets it and closes;
// "자동" goes back to the automatic pick. Copyright (c) 2026 cubha. MIT License.

import { div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { agents, props, shared, setShared, closeOverlay } from "herdr";
import { P, unit, root, pic, frame, plaque, small, button, faceMap, best, PICKS } from "../kit.js";
import { SHAPES, ROWS, faceLevel, faceName, shapeName, total } from "../progress.js";

export default class Picker {
  init() { this.hover = null; }

  close() { closeOverlay(props()?.overlay); }

  set(face) {
    const key = props()?.key;
    if (!key) return;
    const picks = { ...(shared(PICKS) ?? {}) };
    if (face) picks[key] = face; else delete picks[key];
    setShared(PICKS, picks);
    this.close();
  }

  render() {
    const u = unit();
    const p = props() ?? {};
    const lv = best();
    const q = Number(shared("pq.quests")) || 0;
    // Who shows what now (the key's own agent excluded).
    const map = faceMap(agents());
    const others = new Map();
    for (const e of map.values()) if (e.key !== p.key) others.set(e.name, e.key.replace(/#\d+$/, ""));
    const cur = [...map.values()].find((e) => e.key === p.key)?.name ?? p.face;

    const tile = (face) => {
      const need = faceLevel(face), locked = need > lv, on = face === cur, who = others.get(face);
      const shape = face.split("-")[0];
      let el = div().id(`pk-${face}`).relative().flex_none().w(u(30)).h(u(30)).items_center().justify_center().flex()
        .border(u(2)).border_color(on ? P.g3 : P.ink).bg(locked ? P.raised : on ? P.b2 : P.b1)
        .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
        .on_hover((h, cx) => { if (h) this.hover = face; else if (this.hover === face) this.hover = null; cx.notify(); });
      if (locked) {
        return el.child(pic(u, `sil-${shape}`, 24)).child(pic(u, "ico-key", 16).absolute().bottom(u(-2)).right(u(-2)));
      }
      el = el.cursor_pointer().hover((s) => s.border_color(P.g2).bg(P.b2))
        .on_click((_e, cx) => { cx.stop_propagation(); this.set(face); })
        .child(pic(u, `face-${face}`, 24).when(Boolean(who) && !on, (x) => x.opacity(0.4)));
      if (on) el = el.mt(u(-2)).mb(u(2));
      if (who && !on) el = el.child(div().absolute().top(u(1)).right(u(1)).w(u(6)).h(u(6)).bg(P.g2).border(u(1)).border_color(P.ink));
      return el;
    };
    const rows = SHAPES.map((s) => {
      const open = ROWS[s].some((c) => faceLevel(`${s}-${c}`) <= lv);
      return h_flex().gap(u(4)).items_center()
        .child(div().w(u(40)).flex_none().child(small(u, shapeName(s), open ? P.gt2 : P.dim)))
        .children(ROWS[s].map((c) => tile(`${s}-${c}`)));
    });

    const h = this.hover;
    let hint;
    if (h && faceLevel(h) > lv) hint = `${faceName(h)} · Lv.${faceLevel(h)}에 해금 · ${Math.max(0, total(faceLevel(h)) - q)} 퀘스트 남음`;
    else if (h && others.has(h) && h !== cur) hint = `${faceName(h)} · ${others.get(h)}이(가) 쓰는 중`;
    else if (h) hint = h === cur ? `${faceName(h)} · 지금 초상` : faceName(h);
    else hint = cur ? `${faceName(cur)} · 지금 초상` : "";

    const body = v_flex().gap(u(8))
      .child(plaque(u, "초상 고르기"))
      .child(v_flex().gap(u(4)).children(rows))
      .child(h_flex().gap(u(8)).items_center()
        .child(div().flex_1().min_w(0).truncate().child(small(u, hint, P.muted)))
        .child(button(u, "pk-auto", small(u, "자동", P.text), () => this.set(null), { pad: [1, 8], tooltip: "직접 고른 초상을 지우고 스페이스 이름으로 정합니다" }))
        .child(button(u, "pk-close", small(u, "닫기", P.text), () => this.close(), { pad: [1, 8] })));
    return root(u, div().id("picker").size_full().on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .child(frame(u, "gold", body, { pad: [8, 10], floor: true }).size_full()));
  }
}
