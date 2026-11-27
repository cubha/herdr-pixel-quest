// "모험 일지": the adventure log, opened from the status bar's quest count or
// the brand's level badge. Level, title and the way to the next level, then
// five tabs: 환생 (the stars, the rebirth and what it pays; shown first while a rebirth is
// open, shut with a line saying why below Lv.20; [환생하기] asks once more before it runs, and
// [환생 안내] is the two-page guide the Lv.20 banner also opens), 해금표 (what each level gives), 꾸미기 (the party's portrait frame
// and the quest banner's decoration, locked ones say their level), 훈장 (the 17
// medals: earned in color, the rest as dark silhouettes; hover or click shows the
// condition, how far along and the reward) and 최근 퀘스트 (pq.log). Copyright (c) 2026 cubha. MIT License.

import { div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { props, shared, setShared, closeOverlay } from "herdr";
import { P, unit, root, pic, frame, plaque, small, button, cells, lvInfo, best, rewardIcon, bannerIcon, frameKey, framePic, eco, medalIcon, reb, expText, shard, doReborn } from "../kit.js";
import { MEDALS, progressOf, medalGold, medalPet, medalZone, fmt } from "../economy.js";
import { REWARDS, FRAMES, BANNERS, MAX_LV, total, titleOf, pick } from "../progress.js";
import { overLeft, OVER, FULL, MAX_STARS, REBORN_SHARDS, mult, canReborn, rebornShards } from "../reborn.js";

const STAR = "#bff5ea";

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
    // A rebirth is open: its tab first.
    this.tab = props()?.tab ?? (canReborn(eco(), lvInfo().lv) ? "reborn" : "map");
    this.hint = null;
    this.guide = props()?.guide ? 0 : null; // the guide's page, when it is shown
    this.ask = false; // [환생하기] pressed: the question before it runs
  }

  // Five stars, n of them lit.
  stars(u, n) {
    return h_flex().gap(u(4)).text_size(u(24)).line_height(`${u(26)}px`)
      .children(Array.from({ length: MAX_STARS }, (_, i) => div().text_color(i < n ? P.g3 : P.stone).child("★")));
  }

  // The guide (two pages): what a rebirth does, then what it opens (pictures and names only).
  guidePage(u) {
    const row = (icon, text) => h_flex().gap(u(6)).items_center().child(div().w(u(16)).flex_none().flex().justify_center().child(icon)).child(div().flex_1().min_w(0).child(text));
    if (this.guide === 0) {
      return v_flex().flex_1().min_h(0).gap(u(10))
        .child(v_flex().flex_none().items_center().gap(u(2)).py(u(10)).bg(P.chrome).border(u(2)).border_color(P.ink)
          .child(this.stars(u, 0)).child(div().text_color(P.muted).child("↓")).child(this.stars(u, 1)))
        .child(div().child("환생하면 레벨이 1로 초기화되고, 성급이 올라갑니다."))
        .child(v_flex().gap(u(4))
          .child(row(div().text_color(P.g3).child("×"), `경험치를 ${mult(1)}배로 받습니다.`))
          .child(row(shard(u), `별조각 ${REBORN_SHARDS}개를 받습니다.`))
          .child(row(div().text_color(P.done).child("✓"), "골드, 아이템, 펫, 훈장, 해금은 그대로 남습니다.")));
    }
    const tile = (id, w, art, name) => v_flex().id(`jn-new-${id}`).w(u(w)).flex_none().items_center().gap(u(4)).py(u(6)).bg(P.chrome).border(u(2)).border_color(P.ink)
      .child(h_flex().h(u(46)).items_end().justify_center().gap(u(4)).children(art)).child(small(u, name, P.text));
    return v_flex().flex_1().min_h(0).gap(u(8))
      .child(div().child("환생하면 새로 만날 수 있습니다."))
      .child(h_flex().flex_wrap().gap(u(6))
        .child(tile("pet", 124, [pic(u, "pet-star-1-a", 24, 20), pic(u, "pet-star-2-a", 28, 24), pic(u, "pet-star-3-a", 40, 28)], "달 망토 정령"))
        .child(tile("set", 204, [pic(u, "hero/it-astral1-h", 38), pic(u, "hero/it-astral1-t", 58, 38), pic(u, "hero/it-astral1-w", 18, 38)], "성소 세트"))
        .child(tile("frame", 124, [framePic(u, "star")], "별 액자"))
        .child(tile("sound", 204, [pic(u, "ico-scroll", 16)], "효과음 \"별의 종\"")))
      .child(v_flex().flex_none().items_center().gap(u(4)).py(u(6)).bg(P.chrome).border(u(2)).border_color(P.ink)
        .child(pic(u, "zone/astral/card", 128, 80)).child(small(u, "구역 \"별의 성소\"", P.text)));
  }

  // 환생: the stars now, the rebirth (or why not yet), what it pays.
  rebornTab(u, info) {
    const e = eco(), rb = reb(), n = rb.stars + 1, full = rb.stars >= MAX_STARS, can = canReborn(e, info.lv);
    const got = can ? rebornShards(info.q) : REBORN_SHARDS, rest = got > REBORN_SHARDS ? (info.q - FULL) % OVER : 0;
    const row = (icon, text) => h_flex().gap(u(6)).items_center().child(div().w(u(16)).flex_none().flex().justify_center().child(icon)).child(div().flex_1().min_w(0).child(text));
    const shut = (...lines) => v_flex().flex_none().items_center().gap(u(2)).py(u(8)).px(u(6)).bg(P.ink).border(u(2)).border_color(P.stone).children(lines);
    const now = v_flex().flex_none().items_center().gap(u(2)).py(u(6)).bg(P.chrome).border(u(2)).border_color(P.ink)
      .child(this.stars(u, rb.stars))
      .child(small(u, `현재 성급: ★${rb.stars} (받는 경험치: ${mult(rb.stars)}배)`, P.muted));
    const over = overLeft(info.q);
    const act = full
      ? shut(div().text_color(P.done).child("성급을 모두 올렸습니다."),
        small(u, `Lv.${MAX_LV} 이후에는 경험치 ${OVER}마다 별조각을 1개 받습니다.`, P.muted),
        small(u, over != null ? `(다음 별조각까지 남은 경험치: ${expText(over)})` : `(Lv.${MAX_LV}까지 남은 경험치: ${expText(FULL - info.q)})`, P.muted))
      : can
        ? v_flex().flex_none().items_center().gap(u(4))
          .child(button(u, "jn-reborn", div().text_color(P.g3).child("환생하기").loop("opacity", { from: 0.55, to: 1, period: 1000 }),
            (_e, cx) => { this.ask = true; cx.notify(); }, { on: true, pad: [4, 18] }))
          .child(small(u, `레벨이 1로 초기화되고, 성급이 올라갑니다. (★${rb.stars} → ★${n})`, P.muted))
        : shut(div().text_color(P.text).child(`환생은 Lv.${MAX_LV}부터 가능합니다.`),
          small(u, `(Lv.${MAX_LV}까지 남은 경험치: ${expText(FULL - info.q)})`, P.muted));
    let el = v_flex().id("jn-reborn-tab").flex_1().min_h(0).gap(u(8)).child(now).child(act);
    if (!full) el = el.child(v_flex().flex_none().gap(u(4)).px(u(8)).py(u(6)).bg(P.chrome).border(u(2)).border_color(P.ink).when(!can, (x) => x.opacity(0.45))
      .child(small(u, "환생하면 받는 것", P.muted))
      .child(row(div().text_color(P.g3).child("★"), `성급이 ★${n}로 올라갑니다.`))
      .child(row(div().text_color(P.g3).child("×"), `경험치를 ${mult(n)}배로 받습니다.`))
      .child(row(shard(u), h_flex().gap(u(6)).items_center().child(div().child(`별조각 ${got}개를 받습니다.`)).when(rest > 0, (x) => x.child(small(u, `(남은 경험치 ${expText(rest)} 포함)`, P.dim)))))
      .when(rb.stars === 0, (x) => x.child(row(div().text_color(STAR).child("✦"), "별조각 상점과 구역 \"별의 성소\"가 열립니다."))));
    return el;
  }

  // The question before a rebirth: what is lost, what comes, [취소] [환생]. It lies over the
  // log, dimmed behind it (nothing here stops a click going through, so the log's own
  // buttons stand still while it is up: `this.ask`).
  askBox(u, info) {
    const got = rebornShards(info.q);
    const box = v_flex().gap(u(8))
      .child(h_flex().gap(u(6)).items_center().child(pic(u, "gem-blocked", 18)).child(div().text_color(P.blocked).child("레벨이 1로 초기화됩니다.")))
      .child(small(u, `환생하시겠습니까? (Lv.${info.lv} → Lv.1)`, P.muted))
      .child(h_flex().gap(u(6)).items_center().px(u(8)).py(u(6)).bg(P.chrome).border(u(2)).border_color(P.ink).child(shard(u)).child(div().child(`별조각 ${got}개를 받습니다.`)))
      .child(h_flex().gap(u(6)).items_center()
        .child(div().flex_1())
        .child(button(u, "jn-ask-no", small(u, "취소", P.text), (_e, cx) => { this.ask = false; cx.notify(); }, { pad: [2, 10] }))
        .child(button(u, "jn-ask-yes", small(u, "환생", P.g3), (_e, cx) => { this.ask = false; const r = doReborn(); this.hint = r.msg; cx.notify(); }, { on: true, pad: [2, 10] })));
    return frame(u, "gold", box, { pad: [10, 12] }).w(u(260));
  }

  close() { closeOverlay(props()?.overlay); }

  // One unlockable look as a slot: kind frame | banner.
  slot(u, kind, it, lv, cur) {
    // (a shop frame: open once bought in the star shop)
    const locked = it.shop ? !(eco().frames ?? []).includes(it.key) : it.lv > lv, on = it.key === cur;
    const art = kind === "frame" ? framePic(u, it.key) : bannerIcon(u, it.key);
    const how = it.shop ? "별조각 상점에서 구매합니다." : `Lv.${it.lv}에 해금 · ${expText(Math.max(0, total(it.lv) - lvInfo().q))} 퀘스트 남음`;
    let el = v_flex().id(`jn-${kind}-${it.key}`).relative().w(u(52)).h(u(66)).items_center().justify_end().gap(u(2)).pb(u(3))
      .border(u(2)).border_color(on ? P.g3 : P.ink).bg(locked ? P.raised : on ? P.b2 : P.b1)
      .on_hover((h, cx) => { this.hint = h ? (locked ? `${it.name} · ${how}` : it.name) : null; cx.notify(); })
      .child(div().when(locked, (x) => x.opacity(0.3)).child(art))
      .child(small(u, locked ? (it.shop ? "별조각" : `Lv.${it.lv}`) : it.name, locked ? P.dim : P.onb));
    if (locked) return el.child(pic(u, "ico-key", 16).absolute().top(u(1)).right(u(1)));
    return el.cursor_pointer().hover((s) => s.border_color(P.g2))
      .on_click((_e, cx) => { setShared(kind === "frame" ? "pq.frame" : "pq.bannerStyle", it.key); cx.notify(); });
  }

  render() {
    const u = unit();
    const info = lvInfo();
    const lv = best();
    const top = info.lv >= MAX_LV; // from here EXP also earns star shards
    const next = REWARDS.filter((r) => r.lv === info.lv + 1).map((r) => r.text).join(", ");
    const head = v_flex().gap(u(4))
      .child(h_flex().items_center()
        .child(div().flex_1().text_color(P.gt).child(`${reb().stars ? `★${reb().stars} ` : ""}Lv.${info.lv} · ${titleOf(info.lv)}`))
        .child(small(u, `${reb().stars ? "경험치" : "퀘스트"} ${expText(info.q)} · 다음 레벨까지 ${expText(info.left)}${top ? ` · 별조각까지 ${expText(overLeft(info.q))}` : ""}`, P.muted)))
      .child(cells(u, { pct: info.frac * 100, tone: P.g2 }, 20, 0, 12))
      .child(small(u, info.lv < MAX_LV ? `다음 보상: Lv.${info.lv + 1} ${next}` : `모든 보상을 얻었습니다 · 레벨은 계속 오르고, 경험치 ${OVER}마다 별조각 1개`, P.dim));
    const tabs = h_flex().gap(u(4))
      .children([["reborn", canReborn(eco(), info.lv) ? "★ 환생" : "환생"], ["map", "해금표"], ["deco", "꾸미기"], ["medals", "훈장"], ["log", "최근 퀘스트"]].map(([k, label]) =>
        button(u, `jn-tab-${k}`, small(u, label, this.tab === k ? P.g3 : P.text), (_e, cx) => { if (this.ask) return; this.tab = k; this.hint = null; cx.notify(); }, { on: this.tab === k, pad: [1, 6] })));

    let content;
    if (this.tab === "reborn") content = this.rebornTab(u, info);
    else if (this.tab === "map") {
      const rows = [];
      for (let l = 1; l <= MAX_LV; l++) {
        const got = REWARDS.filter((r) => r.lv === l);
        const text = l === 1 ? "투구·두건 16종 · 나무 액자 · 기본 배너" : got.map((r) => r.text).join(" · ");
        const locked = l > lv, cur = l === info.lv;
        rows.push(h_flex().id(`jn-lv-${l}`).flex_none().min_h(u(30)).gap(u(6)).px(u(4)).items_center()
          .border(u(2)).border_color(cur ? P.g2 : "#00000000").when(cur, (x) => x.bg(P.hover))
          .child(div().w(u(36)).flex_none().child(small(u, `Lv.${l}`, locked ? P.dim : P.gt2)))
          .child(h_flex().w(u(72)).flex_none().gap(u(2)).items_center().when(locked, (x) => x.opacity(0.35))
            .children(l === 1 ? [pic(u, "face-helm-gold", 24), pic(u, "pft-wood", 18)] : got.map((r) => rewardIcon(u, r))))
          .child(div().flex_1().min_w(0).child(small(u, text, locked ? P.dim : P.text)))
          .when(locked, (x) => x.child(small(u, `${expText(Math.max(0, total(l) - info.q))} 남음`, P.dim))));
      }
      content = v_flex().id("jn-map").flex_1().min_h(0).gap(u(2)).overflow_y_scrollbar().children(rows);
    } else if (this.tab === "deco") {
      const f = frameKey(), b = pick("banner", shared("pq.bannerStyle"), lv);
      content = v_flex().flex_1().min_h(0).gap(u(6))
        .child(small(u, "초상 액자 (파티 전체)", P.gt2))
        .child(h_flex().flex_wrap().gap(u(4)).children(FRAMES.map((it) => this.slot(u, "frame", it, lv, f))))
        .child(small(u, "퀘스트 완료 배너", P.gt2))
        .child(h_flex().flex_wrap().gap(u(4)).children(BANNERS.map((it) => this.slot(u, "banner", it, lv, b))));
    } else if (this.tab === "medals") {
      const e = eco(), ctx = { now: new Date(), best: lv };
      const n = MEDALS.filter((m) => e.medals[m.id]).length;
      const line = (m) => {
        const pr = progressOf(m, e, ctx), pet = medalPet(m), zone = medalZone(m);
        return [m.name, m.cond, pr.text, `+${fmt(medalGold(m))} G`, pet ? `펫 ${pet.name}` : "", zone ? `구역 ${zone.name}` : ""].filter(Boolean).join(" · ");
      };
      const cell = (m) => {
        const got = Boolean(e.medals[m.id]), sel = this.medal === m.id;
        return v_flex().id(`jn-m-${m.id}`).w(u(40)).h(u(42)).items_center().justify_center().cursor_pointer()
          .border(u(2)).border_color(sel ? P.g3 : P.ink).bg(got ? P.b1 : P.raised).hover((x) => x.border_color(P.g2))
          .on_hover((h, cx) => { this.hint = h ? line(m) : null; cx.notify(); })
          .on_click((_e, cx) => { this.medal = m.id; cx.notify(); })
          .child(medalIcon(u, m, got));
      };
      const pickd = MEDALS.find((m) => m.id === this.medal);
      this.picked = pickd ? line(pickd) : null;
      content = v_flex().flex_1().min_h(0).gap(u(6))
        .child(small(u, `훈장 ${n} / ${MEDALS.length}`, P.gt2))
        .child(h_flex().id("jn-medals").flex_wrap().gap(u(4)).children(MEDALS.map(cell)));
    } else {
      const log = Array.isArray(shared("pq.log")) ? shared("pq.log") : [];
      content = v_flex().id("jn-log").flex_1().min_h(0).gap(u(2)).overflow_y_scrollbar()
        .when(log.length === 0, (x) => x.child(small(u, "아직 기록이 없습니다. 에이전트가 일을 끝내면 여기에 남습니다.", P.dim)))
        .children(log.map((e, i) => h_flex().id(`jn-q-${i}`).flex_none().gap(u(8)).items_center()
          .child(div().w(u(70)).flex_none().child(small(u, when(e.at), P.dim)))
          .child(div().flex_1().min_w(0).truncate().child(small(u, e.name, P.text)))));
    }
    const hint = this.hint ?? (this.tab === "reborn" ? "" : this.tab === "deco" ? "잠긴 것에 마우스를 올리면 해금 레벨이 보입니다"
      : this.tab === "medals" ? (this.picked ?? "훈장에 마우스를 올리면 조건과 보상이 보입니다") : "퀘스트 = 에이전트가 일을 끝낸 횟수");
    let body;
    if (this.guide != null) {
      const last = this.guide === 1;
      body = v_flex().size_full().gap(u(8))
        .child(plaque(u, "환생"))
        .child(this.guidePage(u))
        .child(h_flex().flex_none().justify_center().gap(u(4)).children([0, 1].map((i) => div().size(u(6)).bg(i === this.guide ? P.g3 : P.stone))))
        .child(h_flex().gap(u(8)).items_center()
          .child(button(u, "jn-guide-prev", small(u, "이전", this.guide ? P.text : P.dim), (_e, cx) => { this.guide = 0; cx.notify(); }, { pad: [1, 8] }).when(!this.guide, (x) => x.opacity(0.45)))
          .child(div().flex_1())
          .child(button(u, "jn-guide-next", small(u, last ? "환생 탭 열기" : "다음", P.g3),
            (_e, cx) => { if (last) { this.guide = null; this.tab = "reborn"; } else this.guide = 1; cx.notify(); }, { on: true, pad: [1, 8] })));
    } else {
      body = v_flex().size_full().gap(u(8))
        .child(plaque(u, "모험 일지"))
        .child(head)
        .child(tabs)
        .child(content)
        .child(h_flex().gap(u(8)).items_center()
          .child(div().flex_1().min_w(0).truncate().child(small(u, hint, P.muted)))
          .when(this.tab === "reborn" && !this.hint, (x) => x.child(button(u, "jn-guide", small(u, "환생 안내", P.text), (_e, cx) => { if (this.ask) return; this.guide = 0; cx.notify(); }, { pad: [1, 8] })))
          .child(button(u, "jn-close", small(u, "닫기", P.text), () => { if (!this.ask) this.close(); }, { pad: [1, 8] })));
    }
    return root(u, div().id("journal").relative().size_full().on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .child(frame(u, "gold", body, { pad: [8, 10], floor: true, web: "br" }).size_full())
      .when(this.ask && this.guide == null, (el) => el.child(div().id("jn-veil").absolute().top(u(6)).left(u(6)).right(u(6)).bottom(u(6)).bg("#05060cb8")
        .flex().items_center().justify_center().child(this.askBox(u, info)))));
  }
}
