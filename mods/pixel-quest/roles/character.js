// "캐릭터": the hero's window, two tabs.
// 인벤토리: the gear slots around the portrait (weapon on the left, helmet and armor on
// the right; an empty one shows a faint shape), man / woman and the rank's portrait (open
// ranks only), then the bag: a 20 x 6 grid where each owned piece not worn takes the cells
// of its size. A click on a bag piece wears it, a click on a slot puts it back. Hovering a
// piece lights the slot it goes to and names it on the strip under the bag.
// 상점: 장비 (seven sets, piece by piece, once the set's zone is open), 펫 (the eight for
// gold and the four medal ones; an owned one can come along) and 구역 (the zone for gold).
// A click picks; the right side shows it (gear: tried on the portrait) with its price and
// [사기]. No selling back. Rules: gear.js (pq.eco.hero), economy.js (gold, pets, zones).
// Opened from the sidebar's hero panel, the pet, the gold on the status bar, the palette
// and `pixel-quest.shop`. Copyright (c) 2026 cubha. MIT License.

import { div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { props, closeOverlay } from "herdr";
import { P, unit, root, pic, frame, plaque, small, button, eco, setEco, coin, announce, best, hero, heroPortrait, gearIcon, gearSlot, HERO_BG } from "../kit.js";
import { PETS, GROW, buy, choose, howTo, fmt, petArt, stageOf, buyZone, ZONE_PRICE } from "../economy.js";
import { zoneBy } from "../zones.js";
import { SETS, SLOT_KO, SET_COLOR, RANKS, BAG, PORTRAIT, price, pieceName, rankOpen, setRank, setSex, setOpen, setHow, zoneName, buyGear, equip, unequip, pack } from "../gear.js";

const OWN = "#7fd66b";     // "가짐" on bronze
const PIECE = "#3a2416";   // a piece's cell (bag, shop)

export default class Character {
  init() {
    const p = props() ?? {};
    this.tab = p.tab === "shop" ? "shop" : "bag";
    this.sub = ["gear", "pet", "zone"].includes(p.sub) ? p.sub : "gear";
    this.hint = null;
    this.info = null;   // the piece under the pointer: { set, slot, on (worn) }
    this.sel = null;    // the shop's pick: { k: "gear", set, slot } | { k: "pet", key } | { k: "zone", key }
  }

  close() { closeOverlay(props()?.overlay); }

  at() { const e = eco(); return { best: best(), medals: e.medals, zones: e.zones }; }

  hover(info) {
    return (on, cx) => {
      if (on) this.info = info;
      else if (this.info && this.info.set === info.set && this.info.slot === info.slot && Boolean(this.info.on) === Boolean(info.on)) this.info = null;
      cx.notify();
    };
  }

  // ---- 인벤토리 ----
  bag(u, h) {
    const act = (r, cx) => { if (r.ok) setEco(r.eco); if (r.msg) this.hint = r.msg; this.info = null; cx.notify(); };
    const aim = (l) => Boolean(this.info) && !this.info.on && this.info.slot === l;
    const slot = (l, w, ht, large) => v_flex().gap(u(1)).items_center()
      .child(small(u, SLOT_KO[l], P.gt2))
      .child(gearSlot(u, `ch-slot-${l}`, l, h.eq[l], (_e, cx) => act(unequip(eco(), l), cx),
        { w, h: ht, large, aim: aim(l), onHover: h.eq[l] ? this.hover({ set: h.eq[l], slot: l, on: true }) : null }));
    const top = h_flex().gap(u(14)).items_center().justify_center()
      .child(slot("w", 48, 92, true))
      .child(heroPortrait(u, h))
      .child(v_flex().gap(u(5)).child(slot("h", 68, 48)).child(slot("t", 68, 48)));
    const sex = (k, label) => button(u, `ch-sex-${k}`, small(u, label, h.sex === k ? P.g3 : P.text),
      (_e, cx) => { setEco(setSex(eco(), k)); cx.notify(); }, { on: h.sex === k, pad: [1, 8] });
    const lv = best();
    const ranks = RANKS.map((r) => {
      const open = rankOpen(r.key, lv), on = h.shown === r.key;
      return button(u, `ch-rank-${r.key}`, small(u, open ? r.name : `${r.name} Lv.${r.lv}`, on ? P.g3 : open ? P.text : P.dim),
        (_e, cx) => act(setRank(eco(), r.key, best()), cx), { on, pad: [1, open ? 8 : 4] }).when(!open, (el) => el.opacity(0.55));
    });
    const C = BAG.cell, W = BAG.cols * C, H = BAG.rows * C;
    const lines = [];
    for (let i = 1; i < BAG.cols; i++) lines.push(div().absolute().top(0).left(u(i * C)).w(u(1)).h(u(H)).bg(P.ink));
    for (let j = 1; j < BAG.rows; j++) lines.push(div().absolute().left(0).top(u(j * C)).h(u(1)).w(u(W)).bg(P.ink));
    const items = pack(eco()).map((it) => div().id(`ch-bag-${it.set}-${it.slot}`).absolute().left(u(it.x * C)).top(u(it.y * C)).w(u(it.w * C)).h(u(it.h * C))
      .flex().items_center().justify_center().bg(PIECE).border(u(1)).border_color(P.b2).cursor_pointer()
      .hover((s) => s.border_color(P.g3).bg(P.b1))
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .on_hover(this.hover({ set: it.set, slot: it.slot }))
      .on_click((_e, cx) => { cx.stop_propagation(); act(equip(eco(), it.set, it.slot), cx); })
      .child(gearIcon(u, it.set, it.slot))
      .child(div().absolute().left(0).right(0).bottom(0).h(u(2)).bg(SET_COLOR[it.set])));
    const grid = div().id("ch-bag").relative().flex_none().w(u(W)).h(u(H)).bg(P.chrome).children(lines).children(items);
    const i = this.info;
    const strip = h_flex().id("ch-info").flex_none().h(u(44)).px(u(6)).gap(u(8)).items_center().bg(P.chrome).border(u(2)).border_color(P.ink)
      .children(i ? [
        div().w(u(60)).flex().flex_none().items_center().justify_center().child(gearIcon(u, i.set, i.slot)),
        v_flex().min_w(0)
          .child(div().text_color(SET_COLOR[i.set]).child(pieceName(i.set, i.slot)))
          .child(small(u, `${SLOT_KO[i.slot]} · ${zoneName(i.set)} 세트 · ${i.on ? "착용 중 · 누르면 가방으로" : `누르면 ${SLOT_KO[i.slot]} 칸에 착용`}`, P.muted)),
      ] : [small(u, "물건에 마우스를 올리면 여기에 이름과 할 수 있는 일이 보입니다", P.dim)]);
    return v_flex().flex_1().min_h(0).gap(u(6))
      .child(top)
      .child(h_flex().gap(u(4)).items_center().justify_center().child(sex("m", "남자")).child(sex("f", "여자")).child(div().w(u(8))).children(ranks))
      .child(h_flex().justify_center().child(div().flex_none().border(u(2)).border_color(P.ink).child(grid)))
      .child(strip);
  }

  // ---- 상점 ----
  pick(u, id, on, o, art, tag, act, w = 60) {
    return v_flex().id(id).flex_none().w(u(w)).h(u(60)).items_center().pb(u(2))
      .border(u(2)).border_color(on ? P.g3 : P.ink).bg(on ? P.b2 : o.lock ? P.raised : o.own ? P.b1 : PIECE)
      .cursor_pointer().hover((s) => s.border_color(P.g2))
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .on_click((_e, cx) => { cx.stop_propagation(); act(cx); })
      .child(div().flex().flex_1().min_h(0).items_center().justify_center().when(Boolean(o.lock), (el) => el.opacity(0.4)).child(art))
      .child(tag);
  }

  tag(u, own, lock, poor, p, ownText = "가짐") {
    if (lock) return small(u, "잠김", P.dim);
    if (own) return small(u, ownText, OWN);
    return h_flex().gap(u(2)).items_center().child(coin(u)).child(small(u, fmt(p), poor ? P.poor : P.onb));
  }

  selected() {
    const x = this.sel, e = eco();
    if (!x) return null;
    if (x.k === "gear") {
      const h = hero();
      return { name: pieceName(x.set, x.slot), color: SET_COLOR[x.set], sub: `${SLOT_KO[x.slot]} · ${zoneName(x.set)} 세트`, price: price(x.set, x.slot),
        own: Boolean(h.own[`${x.set}-${x.slot}`]), lock: !setOpen(x.set, this.at()), why: setHow(x.set) };
    }
    if (x.k === "pet") {
      const p = PETS.find((q) => q.key === x.key), own = e.pets[p.key];
      const bond = own?.bond ?? 0, st = stageOf(bond);
      return { name: p.name, color: P.gt, pet: p, along: e.pet === p.key, price: p.price, own: Boolean(own), lock: !own && !p.price, why: howTo(p),
        sub: own ? `친밀도 ${bond} · ${st}단계${st < 3 ? ` (다음까지 ${GROW[st - 1] - bond})` : ""}` : "펫 · 상태 줄에 데리고 다닙니다" };
    }
    return { name: zoneBy(x.key)?.name ?? x.key, color: SET_COLOR[x.key] ?? P.gt, sub: `구역 · 열면 ${zoneBy(x.key)?.name ?? ""} 세트 장비가 팔립니다`,
      price: ZONE_PRICE[x.key], own: e.zones.includes(x.key), lock: false };
  }

  buySelected(cx) {
    const x = this.sel;
    if (!x) return;
    let r;
    if (x.k === "gear") r = buyGear(eco(), x.set, x.slot, this.at());
    else if (x.k === "pet") { r = buy(eco(), x.key, { now: new Date(), best: best() }); if (r.ok) announce(r.got); }
    else r = buyZone(eco(), x.key);
    if (r.ok) setEco(r.eco);
    this.hint = r.msg;
    cx.notify();
  }

  shop(u, h) {
    const e = eco(), at = this.at(), s = this.sel;
    const sub = (k, label) => button(u, `ch-sub-${k}`, small(u, label, this.sub === k ? P.g3 : P.text),
      (_e, cx) => { this.sub = k; this.sel = null; this.hint = null; cx.notify(); }, { on: this.sub === k, pad: [1, 8] });
    let list;
    if (this.sub === "gear") {
      list = v_flex().id("ch-gear-list").flex_1().min_h(0).gap(u(4)).overflow_y_scrollbar().children(SETS.map((set) => {
        const open = setOpen(set, at);
        return h_flex().flex_none().gap(u(6)).items_center()
          .child(v_flex().w(u(66)).flex_none().min_w(0)
            .child(div().truncate().text_color(open ? SET_COLOR[set] : P.dim).child(zoneName(set)))
            .child(small(u, open ? "열림" : setHow(set), P.dim)))
          .children([["h", 48], ["w", 50], ["t", 62]].map(([slot, w]) => {
            const own = Boolean(h.own[`${set}-${slot}`]), p = price(set, slot), on = s?.k === "gear" && s.set === set && s.slot === slot;
            return this.pick(u, `ch-pick-${set}-${slot}`, on, { own, lock: !open }, gearIcon(u, set, slot, { shade: !open }),
              this.tag(u, own, !open, e.gold < p, p), (cx) => { this.sel = { k: "gear", set, slot }; this.hint = null; cx.notify(); }, w);
          }));
      }));
    } else if (this.sub === "pet") {
      list = h_flex().id("ch-pet-list").flex_1().min_h(0).flex_wrap().content_start().gap(u(4)).overflow_y_scrollbar().children(PETS.map((p) => {
        const own = e.pets[p.key], on = s?.k === "pet" && s.key === p.key, along = e.pet === p.key;
        const art = own ? petArt(p.key, own.bond ?? 0, false, false) : p.price ? petArt(p.key, 0, false, false) : { name: `pet-${p.key}-1-s-x`, w: 24, h: 20 };
        const tag = !own && !p.price ? small(u, "훈장", P.dim) : this.tag(u, Boolean(own), false, e.gold < p.price, p.price, along ? "함께" : "가짐");
        return this.pick(u, `ch-pick-pet-${p.key}`, on, { own: Boolean(own), lock: !own && !p.price }, pic(u, art.name, art.w, art.h), tag,
          (cx) => { this.sel = { k: "pet", key: p.key }; this.hint = null; cx.notify(); });
      }));
    } else {
      list = h_flex().id("ch-zone-list").flex_1().min_h(0).flex_wrap().content_start().gap(u(4)).children(Object.entries(ZONE_PRICE).map(([key, p]) => {
        const own = e.zones.includes(key), on = s?.k === "zone" && s.key === key;
        return this.pick(u, `ch-pick-zone-${key}`, on, { own }, pic(u, "ico-crystal", 16), this.tag(u, own, false, e.gold < p, p, "열림"),
          (cx) => { this.sel = { k: "zone", key }; this.hint = null; cx.notify(); });
      }));
    }
    const x = this.selected();
    const box = (child) => div().flex_none().border(u(2)).border_color(P.ink).child(div().border(u(1)).border_color(P.g2)
      .child(div().w(u(PORTRAIT[0])).h(u(PORTRAIT[1])).bg(HERO_BG).flex().items_center().justify_center().child(child)));
    let view;
    if (s?.k === "pet") {
      const own = e.pets[s.key];
      const art = own ? petArt(s.key, own.bond ?? 0, false, false) : x.pet.price ? petArt(s.key, 0, false, false) : { name: `pet-${s.key}-1-s-x`, w: 24, h: 20 };
      view = box(div().when(!own && !x.pet.price, (el) => el.opacity(0.4)).child(pic(u, art.name, art.w, art.h)));
    } else if (s?.k === "zone") view = box(pic(u, `zone/${s.key}/emblem`, 24, 28));
    else view = heroPortrait(u, h, s?.k === "gear" ? { ...h.eq, [s.slot]: s.set } : h.eq);
    const line = (el) => h_flex().w_full().justify_center().min_w(0).child(el);
    let detail = v_flex().flex_1().min_w(0).gap(u(4)).items_center().child(view);
    if (!x) detail = detail.child(line(small(u, "물건을 누르면 여기에서", P.dim))).child(line(small(u, "입어 본 모습과 값이 보입니다", P.dim)));
    else {
      const poor = !x.own && !x.lock && e.gold < x.price;
      const state = x.lock ? small(u, `${x.pet ? "얻는 방법" : "여는 조건"}: ${x.why}`, P.dim)
        : x.own ? small(u, x.pet ? (x.along ? "함께 다니는 중" : "가지고 있습니다") : s.k === "zone" ? "열려 있습니다" : "가지고 있습니다", OWN)
        : h_flex().gap(u(3)).items_center().child(coin(u)).child(small(u, `${fmt(x.price)} G${poor ? ` · ${fmt(x.price - e.gold)} 모자람` : ""}`, poor ? P.poor : P.gt));
      const off = x.lock || poor || (x.own && !(x.pet && !x.along));
      const label = x.lock ? "잠김" : x.own ? (x.pet ? (x.along ? "함께하는 중" : "데려가기") : s.k === "zone" ? "열림" : "가짐") : "사기";
      const go = (_e, cx) => {
        if (x.pet && x.own) { const r = choose(eco(), x.pet.key); if (r.ok) setEco(r.eco); this.hint = r.msg; cx.notify(); return; }
        if (x.lock) { this.hint = x.pet ? `얻는 방법: ${x.why}` : `먼저 구역을 열어야 합니다 · ${x.why}`; cx.notify(); return; }
        this.buySelected(cx);
      };
      detail = detail
        .child(line(div().truncate().text_color(x.color).child(x.name)))
        .child(line(small(u, x.sub, P.muted)))
        .child(line(state))
        .child(button(u, "ch-buy", small(u, label, off ? P.dim : P.text), go, { pad: [1, 12] }).when(off, (el) => el.opacity(0.55)));
    }
    return v_flex().flex_1().min_h(0).gap(u(6))
      .child(h_flex().gap(u(4)).items_center().child(sub("gear", "장비")).child(sub("pet", `펫 ${Object.keys(e.pets).length} / ${PETS.length}`)).child(sub("zone", "구역")))
      .child(h_flex().flex_1().min_h(0).gap(u(8)).items_start()
        .child(v_flex().w(u(256)).flex_none().h_full().min_h(0).child(list))
        .child(detail));
  }

  render() {
    const u = unit();
    const e = eco(), h = hero();
    const tab = (k, label) => button(u, `ch-tab-${k}`, small(u, label, this.tab === k ? P.g3 : P.text),
      (_ev, cx) => { this.tab = k; this.hint = null; this.info = null; cx.notify(); }, { on: this.tab === k, pad: [1, 8] });
    const hint = this.hint ?? (this.tab === "bag" ? "가방의 장비를 누르면 끼웁니다 · 장비 칸을 누르면 가방으로 돌아갑니다" : "물건을 누르면 오른쪽에서 입어 보고, \"사기\"로 삽니다");
    const body = v_flex().size_full().gap(u(6))
      .child(plaque(u, h_flex().gap(u(6)).items_center().child(pic(u, "ico-chest-open", 16)).child("캐릭터")))
      .child(h_flex().gap(u(4)).items_center()
        .child(tab("bag", "인벤토리"))
        .child(tab("shop", "상점"))
        .child(div().flex_1())
        .child(h_flex().id("ch-gold").gap(u(4)).items_center().child(coin(u)).child(div().text_color(P.gt).child(`${fmt(e.gold)} G`))))
      .child(this.tab === "bag" ? this.bag(u, h) : this.shop(u, h))
      .child(h_flex().flex_none().gap(u(8)).items_center()
        .child(div().flex_1().min_w(0).truncate().child(small(u, hint, this.hint ? P.done : P.muted)))
        .when(this.tab === "shop" && this.sub === "pet" && e.pet != null, (el) => el.child(button(u, "ch-alone", small(u, "혼자 다니기", P.text), (_ev, cx) => {
          setEco(choose(eco(), null).eco); this.hint = "펫 없이 다닙니다"; cx.notify();
        }, { pad: [1, 8] })))
        .child(button(u, "ch-close", small(u, "닫기", P.text), () => this.close(), { pad: [1, 8] })));
    return root(u, div().id("character").size_full().on_mouse_down("left", (_ev, cx) => cx.stop_propagation())
      .child(frame(u, "gold", body, { pad: [8, 10], floor: true, web: "br" }).size_full()));
  }
}
