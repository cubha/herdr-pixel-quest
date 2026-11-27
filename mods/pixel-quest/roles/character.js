// "캐릭터": the hero's window, three tabs.
// 인벤토리: the gear slots around the portrait (weapon on the left, helmet and armor on
// the right; an empty one shows a faint shape), man / woman and the rank's portrait (open
// ranks only), then the bag: a 20 x 6 grid where each owned piece not worn takes the cells
// of its size. A click on a bag piece wears it, a click on a slot puts it back. Hovering a
// piece lights the slot it goes to and names it on the strip under the bag.
// The portrait's magnifier (its lower right corner, here and on the shop's try-on) shows
// the portrait alone at 3x in the window (360 x 393, whole px so the dots stay sharp);
// a click on it or [돌아가기] goes back (Esc closes the window: Herdr closes the top dialog).
// 전리품: the loot dex (loot.js), seven zones of five; a count on each item in stock, the
// unfound ones as a shape; a click names it on the strip.
// 상점: 장비 (seven sets, piece by piece, once the set's zone is open), 펫 (the eight for
// gold and the four medal ones; an owned one can come along) and 구역 (the zone for gold).
// 별 (the star shop, reborn.js): the rebirth itself, then what star shards and gold buy: the
// moon cape spirit and its two upgrades, the sanctum set's pieces and theirs, the star frame
// and the star sounds. One pick; the right side shows it (an upgrade as it will look), its
// price in shards and gold, and the button. A rebirth asks twice.
// 장비: a pick per slot (another piece of that slot replaces it, the same one again drops
// it), all tried on the portrait together; the right side lists the picks and buys every
// buyable one at once ([구매], all or none, gold and the set's zone's loot together), wears the owned ones ([착용]) or drops them
// ([선택 비우기]). A locked zone's piece is tried on only. 펫 · 구역: one pick, [구매].
// No selling back. Rules: gear.js (pq.eco.hero, quote / equipMany), loot.js (buyWithMats), economy.js.
// Opened from the sidebar's hero panel, the pet, the gold on the status bar, the palette
// and `pixel-quest.shop`. Copyright (c) 2026 cubha. MIT License.

import { div, svg } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { props, closeOverlay } from "herdr";
import { P, unit, root, pic, frame, plaque, small, button, eco, setEco, coin, announce, best, hero, heroPortrait, gearIcon, gearSlot, HERO_BG, lvInfo, zoneNow, reb, shard, expText, doReborn, framePic } from "../kit.js";
import { PETS, PETS_STAR, PET_UP, GROW, buy, choose, howTo, fmt, petArt, petStage, stageOf, buyZone, ZONE_PRICE, upgradePet, short } from "../economy.js";
import { MAX_STARS, REBORN_SHARDS, FRAME_COST, mult, canReborn, hasFrame, buyFrame, overLeft } from "../reborn.js";
import { soundBy, soundOpen, buySound } from "../sounds.js";
import { zoneBy } from "../zones.js";
import { UP_SET, GEAR_UP, shardPrice, buyGear, upgradeGear, SETS, SLOTS, SLOT_KO, SET_COLOR, RANKS, BAG, PORTRAIT, price, pieceName, rankOpen, rankName, setRank, setSex, setOpen, setHow, zoneName, equip, unequip, pack, quote, equipMany } from "../gear.js";
import { LOOT, RAR_KO, RAR_COLOR, readLoot, foundIn, dexCount, titleNow, itemOf, mats, buyWithMats } from "../loot.js";

const OWN = "#7fd66b";     // "보유" on bronze
const PIECE = "#3a2416";   // a piece's cell (bag, shop)

export default class Character {
  init() {
    const p = props() ?? {};
    this.tab = ["shop", "loot"].includes(p.tab) ? p.tab : "bag";
    this.sub = ["gear", "pet", "zone", "star"].includes(p.sub) ? p.sub : "gear";
    this.arm = false;   // the rebirth button, pressed once
    this.hint = null;
    this.info = null;   // the piece under the pointer: { set, slot, on (worn) }
    this.sel = null;    // the pet / zone tab's pick: { k: "pet", key } | { k: "zone", key }
    this.picks = { h: null, t: null, w: null };   // the gear tab's picks, a set per slot
    this.zoom = null;   // the big portrait: "bag" (as worn) | "shop" (the picks tried on)
    this.lootSel = null; // the loot tab's item (id) on the strip
  }

  close() { closeOverlay(props()?.overlay); }

  at() { const e = eco(); return { best: best(), medals: e.medals, zones: e.zones, stars: reb().stars }; }

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
      .child(this.lens(u, h, h.eq, "bag"))
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
          .child(small(u, `${SLOT_KO[i.slot]} · ${zoneName(i.set)} 세트 · ${i.on ? "착용 중 · 누르면 해제" : `누르면 ${SLOT_KO[i.slot]} 칸에 착용`}`, P.muted)),
      ] : [small(u, "아이템에 마우스를 올리면 정보가 보입니다", P.dim)]);
    return v_flex().flex_1().min_h(0).gap(u(6))
      .child(top)
      .child(h_flex().gap(u(4)).items_center().justify_center().child(sex("m", "남자")).child(sex("f", "여자")).child(div().w(u(8))).children(ranks))
      .child(h_flex().justify_center().child(div().flex_none().border(u(2)).border_color(P.ink).child(grid)))
      .child(strip);
  }

  // ---- the portrait, big ----
  /** The portrait with the magnifier in its lower right corner (from: which view it opens from). */
  lens(u, h, eq, from) {
    return div().relative().flex_none().child(heroPortrait(u, h, eq))
      .child(div().id(`ch-zoom-${from}`).absolute().right(u(4)).bottom(u(4)).w(u(18)).h(u(18)).flex().items_center().justify_center()
        .bg(P.chrome).border(u(1)).border_color(P.g2).cursor_pointer().tooltip("초상화 크게 보기")
        .hover((st) => st.border_color(P.g3).bg(P.raised))
        .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
        .on_click((_e, cx) => { cx.stop_propagation(); this.zoom = from; cx.notify(); })
        .child(svg("mods/pixel-quest/icons/magnifier.svg").size(u(12)).text_color(P.g3)));
  }

  /** The portrait alone at 3x, what is worn (or tried on in the shop); a click goes back. */
  zoomView(u, h) {
    const tried = { ...h.eq };
    if (this.zoom === "shop") for (const r of quote(eco(), this.picks, this.at()).rows) tried[r.slot] = r.set;
    const title = titleNow(eco());
    const back = button(u, "ch-unzoom", small(u, "돌아가기", P.text), (_e, cx) => { this.zoom = null; cx.notify(); }, { pad: [1, 8] });
    const note = [title, this.zoom === "shop" ? "입어 보는 중" : null].filter(Boolean).join(" · ");
    return v_flex().size_full().gap(u(4))
      .child(plaque(u, `초상화 · Lv.${lvInfo().lv} ${rankName(h.shown)}`, h_flex().gap(u(6)).items_center()
        .when(Boolean(note), (el) => el.child(small(u, note, P.gt2)))
        .child(back)))
      .child(div().id("ch-big").flex().flex_1().min_h(0).items_center().justify_center().cursor_pointer()
        .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
        .on_click((_e, cx) => { cx.stop_propagation(); this.zoom = null; cx.notify(); })
        .child(heroPortrait(u, h, tried, [PORTRAIT[0] * 3, PORTRAIT[1] * 3])));
  }

  // ---- 전리품 ----
  loot(u) {
    const e = eco(), l = readLoot(e), at = this.at(), here = zoneNow();
    const cell = (zone, i) => {
      const id = `${zone}-${i}`, it = itemOf(id), got = Boolean(l.found[id]), n = l.stock[id] ?? 0, on = this.lootSel === id;
      return div().id(`ch-loot-${id}`).relative().flex().flex_none().w(u(34)).h(u(34)).items_center().justify_center()
        .bg(got ? PIECE : P.raised).border(u(2)).border_color(on ? P.g3 : got ? RAR_COLOR[it.rar] : P.ink).cursor_pointer()
        .hover((st) => st.border_color(P.g2))
        .tooltip(got ? `${it.name} · ${RAR_KO[it.rar]}` : `아직 못 찾음 · ${RAR_KO[it.rar]}`)
        .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
        .on_click((_e, cx) => { cx.stop_propagation(); this.lootSel = on ? null : id; cx.notify(); })
        .child(pic(u, `loot/${it.key}${got ? "" : "-x"}`, 28))
        .when(!got, (el) => el.child(div().absolute().left(0).right(0).bottom(0).h(u(2)).bg(RAR_COLOR[it.rar])))
        .when(got && it.rar !== "l", (el) => el.child(div().absolute().right(u(0)).bottom(u(-1)).px(u(1)).bg(P.ink)
          .child(small(u, String(n), n ? P.text : P.dim))));
    };
    const rows = Object.keys(LOOT).map((zone) => {
      const open = setOpen(zone, at), n = foundIn(e, zone);
      const sub = open ? `${n} / 5${zone === here ? " · 지금 구역" : ""}` : `잠김 · ${setHow(zone)}`;
      return h_flex().id(`ch-lrow-${zone}`).flex_none().gap(u(4)).items_center().px(u(4)).py(u(1)).border(u(1))
        .border_color(zone === here ? P.g2 : "#00000000").when(zone === here, (el) => el.bg(P.raised)).when(!open, (el) => el.opacity(0.6).tooltip(`여는 조건: ${setHow(zone)}`))
        .child(v_flex().w(u(150)).flex_none().min_w(0)
          .child(div().truncate().text_color(open ? SET_COLOR[zone] : P.dim).child(zoneName(zone)))
          .child(div().truncate().child(small(u, sub, zone === here ? P.gt2 : P.dim))))
        .children(LOOT[zone].map((_, i) => cell(zone, i)))
        .when(n === 5, (el) => el.child(small(u, "완성", P.gt)));
    });
    const x = this.lootSel ? itemOf(this.lootSel) : null;
    let info = [small(u, "전리품을 누르면 정보가 보입니다 · 숫자는 보유 개수", P.dim)];
    if (x) {
      const got = Boolean(l.found[x.id]);
      const use = x.rar === "l" ? "재료로 쓰지 않음 · 또 얻으면 +100 G" : `${zoneName(x.zone)} 세트 장비 재료 · 보유 ${l.stock[x.id] ?? 0}개`;
      info = [
        div().w(u(36)).flex().flex_none().items_center().justify_center().when(!got, (el) => el.opacity(0.5)).child(pic(u, `loot/${x.key}${got ? "" : "-x"}`, 28)),
        v_flex().min_w(0)
          .child(div().truncate().text_color(got ? RAR_COLOR[x.rar] : P.dim).child(got ? x.name : "아직 못 찾음"))
          .child(div().truncate().child(small(u, `${zoneName(x.zone)} · ${RAR_KO[x.rar]} · ${use}`, P.muted))),
      ];
    }
    return v_flex().flex_1().min_h(0).gap(u(4))
      .child(h_flex().justify_between().items_center()
        .child(small(u, `도감 ${dexCount(e)} / 35`, P.gt2))
        .child(small(u, titleNow(e) ? `칭호 · ${titleNow(e)}` : "구역 5종을 모으면 칭호", P.muted)))
      .child(v_flex().id("ch-loot-list").flex_1().min_h(0).gap(u(2)).overflow_y_scrollbar().children(rows))
      .child(h_flex().id("ch-loot-info").flex_none().h(u(40)).px(u(6)).gap(u(6)).items_center().bg(P.chrome).border(u(2)).border_color(P.ink).children(info));
  }

  // ---- 상점 ----
  pick(u, id, on, o, art, tag, act, w = 60, check = false) {
    return v_flex().id(id).relative().flex_none().w(u(w)).h(u(60)).items_center().pb(u(2))
      .border(u(2)).border_color(on ? P.g3 : P.ink).bg(on ? P.b2 : o.lock ? P.raised : o.own ? P.b1 : PIECE)
      .cursor_pointer().hover((s) => s.border_color(P.g2))
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .on_click((_e, cx) => { cx.stop_propagation(); act(cx); })
      .child(div().flex().flex_1().min_h(0).items_center().justify_center().when(Boolean(o.lock), (el) => el.opacity(0.4)).child(art))
      .child(tag)
      .when(check, (el) => el.child(div().absolute().top(u(-2)).right(u(-2)).w(u(12)).h(u(12)).flex().items_center().justify_center()
        .bg(P.g3).border(u(1)).border_color(P.ink).child(svg("mods/pixel-quest/icons/check.svg").size(u(9)).text_color(P.ink))));
  }

  tag(u, own, lock, poor, p, ownText = "보유") {
    if (lock) return small(u, "잠김", P.dim);
    if (own) return small(u, ownText, OWN);
    return h_flex().gap(u(2)).items_center().child(coin(u)).child(small(u, fmt(p), poor ? P.poor : P.onb));
  }

  selected() {
    const x = this.sel, e = eco();
    if (!x) return null;
    if (x.k === "pet") {
      const p = PETS.find((q) => q.key === x.key), own = e.pets[p.key];
      const bond = own?.bond ?? 0, st = stageOf(bond);
      return { name: p.name, color: P.gt, pet: p, along: e.pet === p.key, price: p.price, own: Boolean(own), lock: !own && !p.price, why: howTo(p),
        sub: own ? `친밀도 ${bond} · ${st}단계${st < 3 ? ` (다음까지 ${GROW[st - 1] - bond})` : ""}` : "펫 · 상태 줄에 데리고 다닙니다" };
    }
    return { name: zoneBy(x.key)?.name ?? x.key, color: SET_COLOR[x.key] ?? P.gt, sub: `구역 · 열면 ${zoneBy(x.key)?.name ?? ""} 세트 장비를 구매할 수 있습니다`,
      price: ZONE_PRICE[x.key], own: e.zones.includes(x.key), lock: false };
  }

  buySelected(cx) {
    const x = this.sel;
    if (!x) return;
    let r;
    if (x.k === "pet") { r = buy(eco(), x.key, { now: new Date(), best: best() }); if (r.ok) announce(r.got); }
    else r = buyZone(eco(), x.key);
    if (r.ok) setEco(r.eco);
    this.hint = r.msg;
    cx.notify();
  }

  shop(u, h) {
    const e = eco(), at = this.at(), s = this.sel;
    const sub = (k, label) => button(u, `ch-sub-${k}`, small(u, label, this.sub === k ? P.g3 : P.text),
      (_e, cx) => { this.sub = k; this.sel = null; this.hint = null; this.arm = false; cx.notify(); }, { on: this.sub === k, pad: [1, 8] });
    if (this.sub === "star") return this.star(u, h, e, sub);
    let list;
    if (this.sub === "gear") {
      list = v_flex().id("ch-gear-list").flex_1().min_h(0).gap(u(4)).overflow_y_scrollbar().children(SETS.map((set) => {
        const open = setOpen(set, at);
        return h_flex().flex_none().gap(u(6)).items_center()
          .child(v_flex().w(u(66)).flex_none().min_w(0)
            .child(div().truncate().text_color(open ? SET_COLOR[set] : P.dim).child(zoneName(set)))
            .child(small(u, open ? "열림" : setHow(set), P.dim)))
          .children([["h", 48], ["w", 50], ["t", 62]].map(([slot, w]) => {
            const own = Boolean(h.own[`${set}-${slot}`]), p = price(set, slot), on = this.picks[slot] === set;
            return this.pick(u, `ch-pick-${set}-${slot}`, on, { own, lock: !open }, gearIcon(u, set, slot, { shade: !open }),
              this.tag(u, own, !open, e.gold < p, p), (cx) => { this.picks = { ...this.picks, [slot]: on ? null : set }; this.hint = null; cx.notify(); }, w, on);
          }));
      }));
    } else if (this.sub === "pet") {
      list = h_flex().id("ch-pet-list").flex_1().min_h(0).flex_wrap().content_start().gap(u(4)).overflow_y_scrollbar().children(PETS.map((p) => {
        const own = e.pets[p.key], on = s?.k === "pet" && s.key === p.key, along = e.pet === p.key;
        const art = own ? petArt(p.key, own, false, false) : p.price ? petArt(p.key, 0, false, false) : { name: `pet-${p.key}-1-s-x`, w: 24, h: 20 };
        const tag = !own && !p.price ? small(u, "훈장", P.dim) : this.tag(u, Boolean(own), false, e.gold < p.price, p.price, along ? "동행" : "보유");
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
    if (this.sub === "gear") return this.shopFrame(u, e, sub, list, this.gearDetail(u, h, e, at));
    const x = this.selected();
    const box = (child) => div().flex_none().border(u(2)).border_color(P.ink).child(div().border(u(1)).border_color(P.g2)
      .child(div().w(u(PORTRAIT[0])).h(u(PORTRAIT[1])).bg(HERO_BG).flex().items_center().justify_center().child(child)));
    let view;
    if (s?.k === "pet") {
      const own = e.pets[s.key];
      const art = own ? petArt(s.key, own, false, false) : x.pet.price ? petArt(s.key, 0, false, false) : { name: `pet-${s.key}-1-s-x`, w: 24, h: 20 };
      view = box(div().when(!own && !x.pet.price, (el) => el.opacity(0.4)).child(pic(u, art.name, art.w, art.h)));
    } else if (s?.k === "zone") view = box(pic(u, `zone/${s.key}/emblem`, 24, 28));
    else view = heroPortrait(u, h);
    const line = (el) => h_flex().w_full().justify_center().min_w(0).child(el);
    let detail = v_flex().flex_1().min_w(0).gap(u(4)).items_center().child(view);
    if (!x) detail = detail.child(line(small(u, "아이템을 누르면 여기에", P.dim))).child(line(small(u, "정보와 가격이 보입니다", P.dim)));
    else {
      const poor = !x.own && !x.lock && e.gold < x.price;
      const state = x.lock ? small(u, `${x.pet ? "얻는 방법" : "여는 조건"}: ${x.why}`, P.dim)
        : x.own ? small(u, x.pet ? (x.along ? "동행 중" : "보유 중") : s.k === "zone" ? "열려 있습니다" : "보유 중", OWN)
        : h_flex().gap(u(3)).items_center().child(coin(u)).child(small(u, `${fmt(x.price)} G${poor ? ` · ${fmt(x.price - e.gold)} G 부족` : ""}`, poor ? P.poor : P.gt));
      const off = x.lock || poor || (x.own && !(x.pet && !x.along));
      const label = x.lock ? "잠김" : x.own ? (x.pet ? (x.along ? "동행 중" : "데려가기") : s.k === "zone" ? "열림" : "보유") : "구매";
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
    return this.shopFrame(u, e, sub, list, detail);
  }

  // ---- 상점 · 별조각 ----
  /** The star shop's items as they stand: { key, name, color, sub, art (the tile), view (the
   *  detail's picture), cost ({ shard, gold } or null: nothing more to pay), label, off, tag, go }. */
  starItems(u, h, e) {
    const rb = reb(), open = rb.stars > 0;
    const say = (r, cx) => { if (r.ok) setEco(r.eco); this.hint = r.msg; cx.notify(); };
    const box = (child) => div().flex_none().border(u(2)).border_color(P.ink).child(div().border(u(1)).border_color(P.g2)
      .child(div().w(u(PORTRAIT[0])).h(u(PORTRAIT[1])).bg(HERO_BG).flex().items_center().justify_center().child(child)));
    const STAR = "#bff5ea";
    const items = [];
    // the moon cape spirit: bought, then upgraded twice
    const pet = PETS_STAR, own = e.pets[pet.key], st = own ? petStage(pet.key, own) : 1, maxed = st > PET_UP.length;
    const pa = (stage, k = 1) => { const a = petArt(pet.key, { up: stage - 1 }, false, false); return pic(u, k > 1 ? `${a.name}-x${k}` : a.name, a.w * k, a.h * k); };
    items.push({
      key: "pet", name: pet.name, color: STAR, art: pa(st), view: box(pa(own && !maxed ? st + 1 : st, 2)),
      sub: !own ? "상태 줄에서 함께 다닙니다." : maxed ? "최고 단계입니다." : `${st + 1}단계로 승급합니다.\n(위 그림: 승급 뒤 모습)`,
      note: own ? (e.pet === pet.key ? "함께 다니는 중입니다." : "") : "승급하면 모습이 바뀝니다.",
      cost: !own ? { shard: pet.shard, gold: pet.price } : maxed ? null : PET_UP[st - 1], label: !own ? "구매" : maxed ? "최고 단계" : "승급", off: maxed,
      tag: own ? small(u, `${st}단계`, OWN) : null, along: own && e.pet !== pet.key,
      go: (cx) => { if (!own) { const r = buy(eco(), pet.key, { now: new Date(), best: best() }); if (r.ok) announce(r.got); say(r, cx); } else say(upgradePet(eco()), cx); },
    });
    // the sanctum set's pieces: bought (also from the 장비 tab, tried on), then upgraded twice
    for (const l of ["h", "w", "t"]) {
      const has = Boolean(h.own[`${UP_SET}-${l}`]), up = h.up[l], maxed = up >= GEAR_UP.length, next = has && !maxed ? up + 1 : up;
      const tried = { ...h, up: { ...h.up, [l]: next } };
      items.push({
        key: `gear-${l}`, name: pieceName(UP_SET, l), color: SET_COLOR[UP_SET], art: gearIcon(u, UP_SET, l, { up: { [l]: up } }),
        view: heroPortrait(u, tried, { ...h.eq, [l]: UP_SET }),
        sub: !has ? `별의 성소 세트 ${SLOT_KO[l]}입니다.` : maxed ? "최고 단계입니다." : `${up + 2}단계로 승급합니다.\n(위 그림: 승급 뒤 모습)`,
        note: has ? (h.eq[l] === UP_SET ? "착용 중입니다." : "인벤토리에 있습니다.") : "",
        cost: !has ? { shard: shardPrice(UP_SET, l), gold: price(UP_SET, l) } : maxed ? null : { shard: GEAR_UP[up][l], gold: GEAR_UP[up].gold },
        label: !has ? "구매" : maxed ? "최고 단계" : "승급", off: maxed, tag: has ? small(u, `${up + 1}단계`, OWN) : null, w: l === "t" ? 62 : l === "w" ? 50 : 48,
        go: (cx) => say(has ? upgradeGear(eco(), l) : buyGear(eco(), UP_SET, l, this.at()), cx),
      });
    }
    const fr = hasFrame(e);
    items.push({
      key: "frame", name: "별 액자", color: STAR, art: div().flex_none().child(pic(u, "pft-star", 18, 23)),
      view: box(div().relative().w(u(36)).h(u(46)).child(framePic(u, "star").absolute().top(0).left(0)).child(pic(u, "face-helm-gold", 24).absolute().top(u(16)).left(u(6)))),
      sub: "파티 전체의 초상 액자입니다.", note: fr ? "모험 일지의 꾸미기에서\n고를 수 있습니다." : "",
      cost: fr ? null : FRAME_COST, label: fr ? "보유" : "구매", off: fr, tag: fr ? small(u, "보유", OWN) : null, go: (cx) => say(buyFrame(eco()), cx),
    });
    const snd = soundBy("star"), so = soundOpen(e, "star");
    items.push({
      key: "sound", name: `효과음 "${snd.name}"`, color: STAR, art: pic(u, "ico-scroll", 16), view: box(pic(u, "ico-scroll-x3", 48)),
      sub: `알림 소리 세트입니다.\n(${snd.desc})`, note: so ? "설정의 알림에서\n고를 수 있습니다." : "",
      cost: so ? null : { shard: snd.open.shard, gold: snd.open.gold }, label: so ? "보유" : "구매", off: so, tag: so ? small(u, "보유", OWN) : null, go: (cx) => say(buySound(eco(), "star"), cx),
    });
    // before the first rebirth everything but the rebirth is shut
    return items.map((x) => (open ? x : { ...x, lock: true, off: true, label: "잠김", note: "첫 환생 뒤에 열립니다." }));
  }

  star(u, h, e, sub) {
    const rb = reb(), items = this.starItems(u, h, e);
    const cur = items.find((x) => x.key === this.sel?.key) ?? null;
    const priceTag = (x) => h_flex().gap(u(2)).items_center().child(shard(u)).child(small(u, String(x.cost.shard), rb.shards < x.cost.shard ? P.poor : P.onb));
    const tiles = items.map((x) => this.pick(u, `ch-pick-star-${x.key}`, cur?.key === x.key, { own: !x.cost, lock: x.lock }, x.art,
      x.lock ? small(u, "잠김", P.dim) : x.tag ?? (x.cost ? priceTag(x) : small(u, "보유", OWN)),
      (cx) => { this.sel = { k: "star", key: x.key }; this.hint = null; cx.notify(); }, x.w ?? 60));
    const head = v_flex().id("ch-star-head").flex_none().px(u(6)).py(u(3)).gap(u(1)).bg(P.chrome).border(u(2)).border_color(P.ink)
      .child(h_flex().gap(u(6)).items_center()
        .child(div().text_color(P.g3).child(rb.stars ? "★".repeat(rb.stars) + "☆".repeat(MAX_STARS - rb.stars) : "☆".repeat(MAX_STARS)))
        .child(div().flex_1())
        .child(shard(u)).child(div().text_color(P.gt).child(`${fmt(rb.shards)}개`)))
      .child(small(u, rb.stars ? `성급 ★${rb.stars}` : "환생하면 열립니다. (모험 일지의 환생 탭)", P.muted));
    const list = v_flex().flex_1().min_h(0).gap(u(6))
      .child(head)
      .child(h_flex().id("ch-star-list").flex_1().min_h(0).flex_wrap().content_start().gap(u(4)).overflow_y_scrollbar().children(tiles));
    const line = (el) => h_flex().w_full().justify_center().min_w(0).child(el);
    // the detail column is narrow: a line per " · " part, none cut short
    const rows = (text, color) => String(text).split("\n").filter(Boolean).map((t) => line(small(u, t, color)));
    let detail = v_flex().flex_1().min_w(0).gap(u(4)).items_center().child(cur ? cur.view : heroPortrait(u, h));
    if (!cur) detail = detail.child(line(small(u, "아이템을 누르면 여기에", P.dim))).child(line(small(u, "모습과 가격이 보입니다", P.dim)));
    else {
      const miss = cur.cost ? short(e, cur.cost) : null;
      const off = cur.off || Boolean(miss);
      const cost = cur.cost ? h_flex().gap(u(3)).items_center()
        .child(shard(u)).child(small(u, `${cur.cost.shard}개`, rb.shards < cur.cost.shard ? P.poor : P.gt))
        .child(div().w(u(4)))
        .child(coin(u)).child(small(u, `${fmt(cur.cost.gold)} G`, e.gold < cur.cost.gold ? P.poor : P.gt)) : null;
      detail = detail
        .child(line(div().truncate().text_color(cur.color).child(cur.name)))
        .children(rows(cur.sub, P.muted))
        .children(rows(miss && !cur.off ? miss.replace(", ", ",\n") : cur.note, miss && !cur.off ? P.poor : P.dim))
        .when(Boolean(cost), (el) => el.child(line(cost)))
        .child(h_flex().gap(u(4)).justify_center()
          .child(button(u, "ch-star-go", small(u, cur.label, off ? P.dim : P.g3), (_e, cx) => { if (off) { this.hint = miss ?? cur.note; cx.notify(); return; } cur.go(cx); }, { pad: [1, 12] }).when(off, (el) => el.opacity(0.55)))
          .when(Boolean(cur.along), (el) => el.child(button(u, "ch-star-along", small(u, "데려가기", P.text), (_e, cx) => { const r = choose(eco(), PETS_STAR.key); if (r.ok) setEco(r.eco); this.hint = r.msg; cx.notify(); }, { pad: [1, 8] }))));
    }
    return this.shopFrame(u, e, sub, list, detail);
  }

  shopFrame(u, e, sub, list, detail) {
    return v_flex().flex_1().min_h(0).gap(u(6))
      .child(h_flex().gap(u(4)).items_center().child(sub("gear", "장비")).child(sub("pet", `펫 ${PETS.filter((p) => e.pets[p.key]).length} / ${PETS.length}`)).child(sub("zone", "구역")).child(sub("star", "별조각"))
        .when(this.sub === "gear", (el) => el.child(div().flex_1()).child(small(u, `고른 부위 ${SLOTS.filter((l) => this.picks[l]).length} / 3`, P.muted))))
      .child(h_flex().flex_1().min_h(0).gap(u(8)).items_start()
        .child(v_flex().w(u(256)).flex_none().h_full().min_h(0).child(list))
        .child(detail));
  }

  // The gear tab's right side: every pick tried on, a line per slot, the sum, the buttons.
  gearDetail(u, h, e, at) {
    const q = quote(e, this.picks, at);
    const tried = { ...h.eq };
    for (const r of q.rows) tried[r.slot] = r.set;
    const done = (r, cx) => { if (r.ok) setEco(r.eco); this.hint = r.msg; cx.notify(); };
    const STATE = { buy: (r) => [`${r.shard ? `별조각 ${r.shard} · ` : ""}${fmt(r.price)} G`, q.short > 0 || (r.shard && q.shardShort > 0) ? P.poor : P.gt], own: () => ["보유", OWN], worn: () => ["착용 중", OWN], lock: () => ["잠김", P.dim] };
    const lines = SLOTS.map((l) => {
      const r = q.rows.find((x) => x.slot === l);
      const line = h_flex().id(`ch-line-${l}`).w_full().h(u(20)).px(u(4)).gap(u(4)).items_center().bg(P.chrome).border(u(1)).border_color(P.ink);
      if (!r) return line.child(small(u, `${SLOT_KO[l]} · 착용 장비 그대로`, P.dim));
      const [text, color] = STATE[r.state](r);
      const row = line.when(r.state === "lock", (el) => el.tooltip(`여는 조건: ${setHow(r.set)}`))
        .child(div().w(u(26)).flex().flex_none().items_center().justify_center().child(gearIcon(u, r.set, r.slot, { scale: 0.42 })))
        .child(div().flex_none().child(small(u, r.name, SET_COLOR[r.set])))
        .child(div().flex_1().min_w(0).flex().justify_end().child(div().min_w(0).truncate().child(small(u, text, color))))
        .child(div().id(`ch-drop-${l}`).flex().flex_none().items_center().justify_center().w(u(12)).h(u(12)).cursor_pointer().tooltip("선택 해제")
          .hover((s) => s.bg(P.b1))
          .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
          .on_click((_e, cx) => { cx.stop_propagation(); this.picks = { ...this.picks, [l]: null }; this.hint = null; cx.notify(); })
          .child(svg("mods/pixel-quest/icons/x.svg").size(u(9)).text_color(P.dim)));
      // A locked piece: how its zone opens, under the row (too long for the row itself).
      return r.state !== "lock" ? row : v_flex().w_full().child(row)
        .child(div().w_full().pl(u(34)).truncate().child(small(u, setHow(r.set), P.dim)));
    });
    const any = q.rows.length > 0;
    const locked = q.rows.some((r) => r.state === "lock");
    const total = h_flex().w_full().justify_between().items_center()
      .child(div().flex_1().min_w(0).truncate().child(small(u, `${q.buy.length}개 구매${locked ? " · 잠김 제외" : ""}`, P.muted)))
      .child(h_flex().gap(u(3)).items_center().child(coin(u)).child(small(u, `${fmt(q.total)} G`, q.short > 0 ? P.poor : P.gt)));
    // The loot the picks to buy take from each set's zone (loot.js RECIPE): have / need.
    const m = mats(e, this.picks, at);
    const gold = h_flex().id("ch-mats-gold").w_full().gap(u(6)).items_center()
      .child(div().flex_1().child(small(u, "골드", P.gt2)))
      .child(small(u, `${fmt(e.gold)}/${fmt(q.total)}`, q.short > 0 ? P.poor : OWN));
    const stars = h_flex().id("ch-mats-shard").w_full().gap(u(6)).items_center()
      .child(div().flex_1().child(small(u, "별조각", P.gt2)))
      .child(small(u, `${fmt(reb().shards)}/${fmt(q.shards)}`, q.shardShort > 0 ? P.poor : OWN));
    const need = v_flex().w_full().child(gold).when(q.shards > 0, (el) => el.child(stars)).children(m.sets.map((x) => {
      const part = (rar, c) => c.need ? small(u, `${RAR_KO[rar]} ${c.have}/${c.need}`, c.have >= c.need ? OWN : P.poor) : null;
      return h_flex().id(`ch-mats-${x.set}`).w_full().gap(u(6)).items_center()
        .child(div().flex_1().min_w(0).truncate().child(small(u, zoneName(x.set), SET_COLOR[x.set])))
        .children([part("c", x.c), part("r", x.r)].filter(Boolean));
    }));
    const buyOff = !q.buy.length || q.short > 0 || q.shardShort > 0 || m.short;
    const buyLabel = !q.buy.length ? "구매" : q.short > 0 ? `${fmt(q.short)} G 부족` : q.shardShort > 0 ? `별조각 ${q.shardShort}개 부족` : m.short ? "재료 부족" : `구매 · ${q.buy.length}개 · ${fmt(q.total)} G + 재료`;
    const btn = (id, label, off, go) => button(u, id, small(u, label, off ? P.dim : id === "ch-buy" ? P.g3 : P.text), go, { pad: [1, 8] }).when(off, (el) => el.opacity(0.55));
    return v_flex().flex_1().min_w(0).gap(u(4)).items_center()
      .child(this.lens(u, h, tried, "shop"))
      .when(!any, (el) => el.child(v_flex().items_center().child(small(u, "아이템을 누르면", P.dim)).child(small(u, "착용 모습과 가격이 보입니다", P.dim))))
      .children(lines)
      .when(q.buy.length > 0, (el) => el.child(need))
      .child(total)
      .child(btn("ch-buy", buyLabel, buyOff, (_e, cx) => done(buyWithMats(eco(), this.picks, this.at()), cx)))
      .child(h_flex().gap(u(4)).justify_center()
        .child(btn("ch-wear", q.wear.length ? `착용 · ${q.wear.length}개` : "착용", !q.wear.length, (_e, cx) => done(equipMany(eco(), this.picks), cx)))
        .child(btn("ch-clear", "선택 비우기", !any, (_e, cx) => { this.picks = { h: null, t: null, w: null }; this.hint = null; cx.notify(); })));
  }

  render() {
    const u = unit();
    const e = eco(), h = hero();
    const tab = (k, label) => button(u, `ch-tab-${k}`, small(u, label, this.tab === k ? P.g3 : P.text),
      (_ev, cx) => { this.tab = k; this.hint = null; this.info = null; cx.notify(); }, { on: this.tab === k, pad: [1, 8] });
    // 3x is 393 + 6 px of border: the window fits it with the frame's padding trimmed.
    if (this.zoom) return this.shell(u, this.zoomView(u, h), [4, 10]);
    const hint = this.hint ?? (this.tab === "bag" ? "인벤토리의 장비를 누르면 착용합니다 · 장비 칸을 누르면 해제합니다"
      : this.tab === "loot" ? `퀘스트를 끝내면 지금 구역(${zoneName(zoneNow())})의 전리품이 떨어집니다`
      : this.sub === "gear" ? "장비 = 골드 + 그 세트 구역의 전리품 (성소 세트 = 골드 + 별조각)"
      : this.sub === "star" ? "별조각은 환생할 때와 Lv.20 이후 경험치 40마다 받습니다."
      : "아이템을 누르면 오른쪽에 정보와 가격이 보입니다");
    const body = v_flex().size_full().gap(u(6))
      .child(plaque(u, h_flex().gap(u(6)).items_center().child(pic(u, "ico-chest-open", 16)).child("캐릭터")))
      .child(h_flex().gap(u(4)).items_center()
        .child(tab("bag", "인벤토리"))
        .child(tab("loot", "전리품"))
        .child(tab("shop", "상점"))
        .child(div().flex_1())
        .child(h_flex().id("ch-gold").gap(u(4)).items_center().child(coin(u)).child(div().text_color(P.gt).child(`${fmt(e.gold)} G`))))
      .child(this.tab === "bag" ? this.bag(u, h) : this.tab === "loot" ? this.loot(u) : this.shop(u, h))
      .child(h_flex().flex_none().gap(u(8)).items_center()
        .child(div().flex_1().min_w(0).truncate().child(small(u, hint, this.hint ? P.done : P.muted)))
        .when(this.tab === "shop" && this.sub === "pet" && e.pet != null, (el) => el.child(button(u, "ch-alone", small(u, "펫 없이 다니기", P.text), (_ev, cx) => {
          setEco(choose(eco(), null).eco); this.hint = "펫 없이 다닙니다"; cx.notify();
        }, { pad: [1, 8] })))
        .child(button(u, "ch-close", small(u, "닫기", P.text), () => this.close(), { pad: [1, 8] })));
    return this.shell(u, body);
  }

  // The window's frame.
  shell(u, body, pad = [8, 10]) {
    const el = div().id("character").size_full().on_mouse_down("left", (_ev, cx) => cx.stop_propagation());
    return root(u, el.child(frame(u, "gold", body, { pad, floor: true, web: "br" }).size_full()));
  }
}
