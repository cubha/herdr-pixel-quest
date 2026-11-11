// "모험 일지": the adventure log, opened from the status bar's quest count or
// the brand's level badge. Level, title and the way to the next level, then
// three tabs: 해금표 (what each level gives), 꾸미기 (the party's portrait frame
// and the quest banner's decoration, locked ones say their level) and 최근
// 퀘스트 (pq.log). Copyright (c) 2026 cubha. MIT License.

import { div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { props, shared, setShared, closeOverlay } from "herdr";
import { P, unit, root, pic, frame, plaque, small, button, cells, lvInfo, best, rewardIcon, bannerIcon, frameKey } from "../kit.js";
import { REWARDS, FRAMES, BANNERS, MAX_LV, total, titleOf, pick } from "../progress.js";

const two = (n) => String(n).padStart(2, "0");
// By hand: this runtime's Date ignores locale options.
function when(at) {
  const d = new Date(at), now = new Date();
  const hm = `${two(d.getHours())}:${two(d.getMinutes())}`;
  if (d.toDateString() === now.toDateString()) return hm;
  const y = new Date(now); y.setDate(now.getDate() - 1);
  return d.toDateString() === y.toDateString() ? `어제 ${hm}` : `${d.getMonth() + 1}/${d.getDate()} ${hm}`;
}

export default class Journal {
  init() {
    this.tab = props()?.tab ?? "map";
    this.hint = null;
  }

  close() { closeOverlay(props()?.overlay); }

  // One unlockable look as a slot: kind frame | banner.
  slot(u, kind, it, lv, cur) {
    const locked = it.lv > lv, on = it.key === cur;
    const art = kind === "frame" ? (it.key === "crown" ? pic(u, "pf-crown", 36, 44) : pic(u, `pf-${it.key}`, 36)) : bannerIcon(u, it.key);
    let el = v_flex().id(`jn-${kind}-${it.key}`).relative().w(u(52)).h(u(66)).items_center().justify_end().gap(u(2)).pb(u(3))
      .border(u(2)).border_color(on ? P.g3 : P.ink).bg(locked ? P.raised : on ? P.b2 : P.b1)
      .on_hover((h, cx) => { this.hint = h ? (locked ? `${it.name} · Lv.${it.lv}에 해금 · ${Math.max(0, total(it.lv) - lvInfo().q)} 퀘스트 남음` : it.name) : null; cx.notify(); })
      .child(div().when(locked, (x) => x.opacity(0.3)).child(art))
      .child(small(u, locked ? `Lv.${it.lv}` : it.name, locked ? P.dim : P.onb));
    if (locked) return el.child(pic(u, "ico-key", 16).absolute().top(u(1)).right(u(1)));
    return el.cursor_pointer().hover((s) => s.border_color(P.g2))
      .on_click((_e, cx) => { setShared(kind === "frame" ? "pq.frame" : "pq.bannerStyle", it.key); cx.notify(); });
  }

  render() {
    const u = unit();
    const info = lvInfo();
    const lv = best();
    const next = REWARDS.filter((r) => r.lv === info.lv + 1).map((r) => r.text).join(", ");
    const head = v_flex().gap(u(4))
      .child(h_flex().items_center()
        .child(div().flex_1().text_color(P.gt).child(`Lv.${info.lv} · ${titleOf(info.lv)}`))
        .child(small(u, `퀘스트 ${info.q} · 다음 레벨까지 ${info.left}`, P.muted)))
      .child(cells(u, { pct: info.frac * 100, tone: P.g2 }, 20, 0, 12))
      .child(small(u, info.lv < MAX_LV ? `다음 보상: Lv.${info.lv + 1} ${next}` : "모든 보상을 얻었습니다. 레벨은 계속 오릅니다", P.dim));
    const tabs = h_flex().gap(u(4))
      .children([["map", "해금표"], ["deco", "꾸미기"], ["log", "최근 퀘스트"]].map(([k, label]) =>
        button(u, `jn-tab-${k}`, small(u, label, this.tab === k ? P.g3 : P.text), (_e, cx) => { this.tab = k; this.hint = null; cx.notify(); }, { on: this.tab === k, pad: [1, 8] })));

    let content;
    if (this.tab === "map") {
      const rows = [];
      for (let l = 1; l <= MAX_LV; l++) {
        const got = REWARDS.filter((r) => r.lv === l);
        const text = l === 1 ? "투구·두건 16종 · 나무 액자 · 기본 배너" : got.map((r) => r.text).join(" · ");
        const locked = l > lv, cur = l === info.lv;
        rows.push(h_flex().id(`jn-lv-${l}`).flex_none().min_h(u(30)).gap(u(6)).px(u(4)).items_center()
          .border(u(2)).border_color(cur ? P.g2 : "#00000000").when(cur, (x) => x.bg(P.hover))
          .child(div().w(u(36)).flex_none().child(small(u, `Lv.${l}`, locked ? P.dim : P.gt2)))
          .child(h_flex().w(u(52)).flex_none().gap(u(2)).items_center().when(locked, (x) => x.opacity(0.35))
            .children(l === 1 ? [pic(u, "face-helm-gold", 24), pic(u, "pft-wood", 18)] : got.map((r) => rewardIcon(u, r))))
          .child(div().flex_1().min_w(0).child(small(u, text, locked ? P.dim : P.text)))
          .when(locked, (x) => x.child(small(u, `${Math.max(0, total(l) - info.q)} 남음`, P.dim))));
      }
      content = v_flex().id("jn-map").flex_1().min_h(0).gap(u(2)).overflow_y_scrollbar().children(rows);
    } else if (this.tab === "deco") {
      const f = frameKey(), b = pick("banner", shared("pq.bannerStyle"), lv);
      content = v_flex().flex_1().min_h(0).gap(u(6))
        .child(small(u, "초상 액자 (파티 전체)", P.gt2))
        .child(h_flex().flex_wrap().gap(u(4)).children(FRAMES.map((it) => this.slot(u, "frame", it, lv, f))))
        .child(small(u, "퀘스트 완료 배너", P.gt2))
        .child(h_flex().flex_wrap().gap(u(4)).children(BANNERS.map((it) => this.slot(u, "banner", it, lv, b))));
    } else {
      const log = Array.isArray(shared("pq.log")) ? shared("pq.log") : [];
      content = v_flex().id("jn-log").flex_1().min_h(0).gap(u(2)).overflow_y_scrollbar()
        .when(log.length === 0, (x) => x.child(small(u, "아직 기록이 없습니다. 에이전트가 일을 끝내면 여기에 남습니다.", P.dim)))
        .children(log.map((e, i) => h_flex().id(`jn-q-${i}`).flex_none().gap(u(8)).items_center()
          .child(div().w(u(70)).flex_none().child(small(u, when(e.at), P.dim)))
          .child(div().flex_1().min_w(0).truncate().child(small(u, e.name, P.text)))));
    }
    const hint = this.hint ?? (this.tab === "deco" ? "잠긴 것에 마우스를 올리면 해금 레벨이 보입니다" : "퀘스트 = 에이전트가 일을 끝낸 횟수");
    const body = v_flex().size_full().gap(u(8))
      .child(plaque(u, "모험 일지"))
      .child(head)
      .child(tabs)
      .child(content)
      .child(h_flex().gap(u(8)).items_center()
        .child(div().flex_1().min_w(0).truncate().child(small(u, hint, P.muted)))
        .child(button(u, "jn-close", small(u, "닫기", P.text), () => this.close(), { pad: [1, 8] })));
    return root(u, div().id("journal").size_full().on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .child(frame(u, "gold", body, { pad: [8, 10], floor: true, web: "br" }).size_full()));
  }
}
