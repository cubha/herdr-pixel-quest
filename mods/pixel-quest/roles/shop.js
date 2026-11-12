// "펫 상점": one window, two tabs. 상점 sells the eight shop pets for gold (a click
// buys at once, no selling back; short of gold the cell says by how much). 도감
// shows all twelve: owned ones at their growth stage with three pips, to pick the one
// that walks the status bar (or none: 혼자 다니기); the rest as silhouettes with the way
// to get them (four come only with a medal). Opened from the pet, the gold on the status
// bar, the palette and `pixel-quest.shop`. Gold, pets and bond: economy.js (pq.eco).
// Copyright (c) 2026 cubha. MIT License.

import { div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { props, closeOverlay } from "herdr";
import { P, unit, root, pic, frame, plaque, small, button, eco, setEco, coin, announce, best } from "../kit.js";
import { PETS, GROW, buy, choose, howTo, fmt, petArt, stageOf } from "../economy.js";

export default class Shop {
  init() {
    this.tab = props()?.tab === "dex" ? "dex" : "shop";
    this.hint = null;
  }

  close() { closeOverlay(props()?.overlay); }

  cell(u, id, p, art, lines, o, act) {
    return v_flex().id(id).relative().w(u(96)).h(u(78)).items_center().justify_end().gap(u(2)).pb(u(4)).flex_none()
      .border(u(2)).border_color(o.on ? P.g3 : P.ink).bg(o.lock ? P.raised : o.own ? P.b2 : P.b1)
      .cursor_pointer().hover((s) => s.border_color(P.g2)).on_click(act)
      .when(Boolean(o.tag), (el) => el.child(div().absolute().top(u(2)).left(u(3)).child(small(u, o.tag, P.g3))))
      .child(div().h(u(30)).flex().items_end().when(Boolean(o.lock), (el) => el.opacity(0.4)).child(pic(u, art.name, art.w, art.h)))
      .children(lines);
  }

  render() {
    const u = unit();
    const e = eco();
    const owned = Object.keys(e.pets).length;
    let grid;
    if (this.tab === "shop") {
      grid = PETS.filter((p) => p.price).map((p) => {
        const own = Boolean(e.pets[p.key]), poor = !own && e.gold < p.price;
        const price = own ? small(u, "가짐", P.onb)
          : poor ? small(u, `${fmt(p.price - e.gold)} 모자람`, P.poor)
          : h_flex().gap(u(3)).items_center().child(coin(u)).child(small(u, fmt(p.price), P.onb));
        return this.cell(u, `shop-${p.key}`, p, petArt(p.key, 0, false, false), [small(u, p.name, poor ? P.poor : P.onb), price], { own }, (_ev, cx) => {
          // Read again at the click: the status bar may have paid a quest since this drew.
          const r = buy(eco(), p.key, { now: new Date(), best: best() });
          if (r.ok) { setEco(r.eco); announce(r.got); }
          this.hint = r.msg; cx.notify();
        });
      });
    } else {
      grid = PETS.map((p) => {
        const own = e.pets[p.key], on = e.pet === p.key;
        const bond = own?.bond ?? 0, st = stageOf(bond);
        const pips = h_flex().gap(u(2)).children([1, 2, 3].map((i) => div().w(u(6)).h(u(6)).border(u(1)).border_color(P.ink).bg(i <= st ? P.g3 : P.ink)));
        const lines = own
          ? [small(u, p.name, P.onb), h_flex().gap(u(4)).items_center().child(pips).child(small(u, on ? "함께하는 중" : "데려가기", on ? P.g3 : P.onb))]
          : [small(u, "???", P.dim), small(u, howTo(p).replace("상점에서 ", "상점 "), P.dim)];
        const art = own ? petArt(p.key, bond, false, false) : { name: `pet-${p.key}-1-s-x`, w: 24, h: 20 };
        return this.cell(u, `dex-${p.key}`, p, art, lines, { own: Boolean(own), on, lock: !own, tag: p.price ? null : "업적" }, (_ev, cx) => {
          const r = choose(eco(), p.key);
          if (r.ok) setEco(r.eco);
          this.hint = r.ok ? `${p.name} · 친밀도 ${bond} · ${st}단계${st < 3 ? ` (다음 단계까지 ${GROW[st - 1] - bond})` : ""}` : r.msg;
          cx.notify();
        });
      });
    }
    const tab = (k, label) => button(u, `shop-tab-${k}`, small(u, label, this.tab === k ? P.g3 : P.text), (_ev, cx) => { this.tab = k; this.hint = null; cx.notify(); }, { on: this.tab === k, pad: [1, 8] });
    const hint = this.hint ?? (this.tab === "shop" ? "펫을 누르면 바로 삽니다" : "가진 펫을 누르면 상태 줄에 데리고 다닙니다");
    const body = v_flex().size_full().gap(u(8))
      .child(plaque(u, h_flex().gap(u(6)).items_center().child(pic(u, "ico-chest-open", 16)).child("펫 상점")))
      .child(h_flex().gap(u(4)).items_center()
        .child(tab("shop", "상점"))
        .child(tab("dex", `도감 ${owned} / ${PETS.length}`))
        .child(div().flex_1())
        .child(h_flex().id("shop-gold").gap(u(4)).items_center().child(coin(u)).child(div().text_color(P.gt).child(`${fmt(e.gold)} G`))))
      .child(h_flex().id("shop-grid").flex_1().min_h(0).flex_wrap().content_start().gap(u(4)).overflow_y_scrollbar().children(grid))
      .child(h_flex().gap(u(8)).items_center()
        .child(div().flex_1().min_w(0).truncate().child(small(u, hint, this.hint ? P.done : P.muted)))
        .when(this.tab === "dex", (el) => el.child(button(u, "shop-alone", small(u, "혼자 다니기", P.text), (_ev, cx) => {
          setEco(choose(eco(), null).eco); this.hint = "펫 없이 다닙니다"; cx.notify();
        }, { on: e.pet == null, pad: [1, 8] })))
        .child(button(u, "shop-close", small(u, "닫기", P.text), () => this.close(), { pad: [1, 8] })));
    return root(u, div().id("shop").size_full().on_mouse_down("left", (_ev, cx) => cx.stop_propagation())
      .child(frame(u, "gold", body, { pad: [8, 10], floor: true, web: "br" }).size_full()));
  }
}
