// The hero's panel on top of the sidebar's lists (layout block "hero"): the player's own
// portrait with a few quick controls. The band "캐릭터" folds it (shared pq.hero; the
// block's height follows through applyLook, look.js HERO_PX). Open: the portrait (a click
// opens the character window), level and rank, man / woman, the rank's arrows (open ranks
// only), and the three gear slots (a click wears the next owned piece, then none).
// Buying and the bag are in the window (roles/character.js). gear.js holds the rules.
// Copyright (c) 2026 cubha. MIT License.

import { div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { layout, shared, setShared } from "herdr";
import { P, unit, root, pic, small, button, eco, setEco, best, lvInfo, hero, heroPortrait, gearSlot, openHero, applyLook, texture, veil, FLOOR } from "../kit.js";
import { SLOTS, SLOT_KO, pieceName, rankName, setSex, stepRank, cycle } from "../gear.js";

const find = (n, id) => (n?.id === id ? n : (n?.children ?? []).map((c) => find(c, id)).find(Boolean));
const narrow = () => (find(layout(), "sidebar")?.size?.px ?? Infinity) < 160;
// Slot buttons: as wide as each piece's picture needs.
const SLOT_W = { h: 46, t: 66, w: 26 };

export default class Hero {
  init() { this.hint = null; }

  say(cx, msg) {
    this.hint = msg || null;
    cx.notify();
    if (msg) cx.timer?.after?.(2500, () => { if (this.hint === msg) { this.hint = null; cx.notify(); } });
  }

  render() {
    const u = unit();
    if (narrow()) {
      return root(u, div().size_full().flex().items_center().justify_center()
        .child(button(u, "hero-rail", pic(u, "ico-chest", 16), () => openHero(), { pad: [1, 2], tooltip: "캐릭터" })));
    }
    const on = shared("pq.hero") !== false;
    const band = h_flex().id("hero-band").flex_none().h(u(20)).border(u(2)).border_color(P.ink).cursor_pointer()
      .tooltip(on ? "캐릭터 패널 접기" : "캐릭터 패널 펴기")
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .on_click((_e, cx) => { setShared("pq.hero", !on); applyLook(); cx.notify(); })
      .child(div().flex().flex_1().border_r(u(2)).border_b(u(2)).border_color(P.b0)
        .child(h_flex().flex_1().border_t(u(2)).border_l(u(2)).border_color(P.b3).bg(P.b1).px(u(6)).gap(u(6)).items_center()
          .hover((s) => s.bg(P.b2))
          .child(pic(u, "ico-chest", 16))
          .child(div().text_color(P.g3).child("캐릭터"))
          .child(div().flex_1())
          .child(small(u, on ? "접기" : "펴기", P.onb))));
    if (!on) return root(u, v_flex().size_full().px(u(4)).py(u(4)).child(band));

    const h = hero();
    const act = (r, cx) => { if (r.ok) setEco(r.eco); this.say(cx, r.ok ? null : r.msg); };
    const sex = (k, label) => button(u, `hero-sex-${k}`, small(u, label, h.sex === k ? P.g3 : P.text),
      (_e, cx) => { setEco(setSex(eco(), k)); cx.notify(); }, { on: h.sex === k, pad: [1, 8] });
    const arrow = (dir, label) => button(u, `hero-rank-${dir < 0 ? "prev" : "next"}`, small(u, label, P.text),
      (_e, cx) => act(stepRank(eco(), dir, best()), cx), { pad: [1, 6], tooltip: dir < 0 ? "이전 등급" : "다음 등급" });
    const slots = h_flex().gap(u(4)).items_center().justify_center().children(SLOTS.map((l) => gearSlot(u, `hero-slot-${l}`, l, h.eq[l],
      (_e, cx) => { const r = cycle(eco(), l); if (r.ok) setEco(r.eco); this.say(cx, r.ok ? null : r.msg); },
      { w: SLOT_W[l], h: 46, tooltip: `${SLOT_KO[l]}: ${h.eq[l] ? pieceName(h.eq[l], l) : "없음"} · 누르면 가진 것 중 다음 것` })));
    const panel = v_flex().relative().overflow_hidden().flex_none().border(u(2)).border_color(P.b2).bg(P.fill).p(u(8)).gap(u(6)).items_center()
      .child(texture(u, ...FLOOR))
      .when(Boolean(veil()), (el) => el.child(veil()))
      .child(div().id("hero-portrait").relative().cursor_pointer().tooltip("캐릭터 창 열기 (가방 · 상점)")
        .on_mouse_down("left", (_ev, cx) => cx.stop_propagation())
        .on_click(() => openHero())
        .child(heroPortrait(u, h)))
      .child(div().relative().h(u(12)).child(this.hint ? small(u, this.hint, P.poor) : small(u, `Lv.${lvInfo().lv} · ${rankName(h.shown)}`, P.gt)))
      .child(h_flex().relative().gap(u(4)).items_center().justify_center().child(sex("m", "남")).child(sex("f", "여")))
      .child(h_flex().relative().gap(u(4)).items_center().justify_center()
        .child(arrow(-1, "◀"))
        .child(div().w(u(40)).flex().justify_center().child(small(u, rankName(h.shown), P.text)))
        .child(arrow(1, "▶")))
      .child(div().relative().child(slots));
    return root(u, v_flex().size_full().px(u(4)).py(u(4)).gap(u(6)).child(band).child(panel));
  }
}
