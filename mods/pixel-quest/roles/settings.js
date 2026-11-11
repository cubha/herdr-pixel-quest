// "설정": the theme's settings window, opened by the sidebar footer's 설정
// button (and `pixel-quest.settings`). Three tabs:
//   모양        the dark / light layout (layout.switch), screen zoom
//               (app.zoom_in/out) and the terminal font size (the layout's, kit setTermFont)
//   알림        alert sounds on/off, 8-bit or Herdr's own, try each
//   퀘스트·파티  the quest banner, the quest count reset, the party effects,
//               the usage gauges, portraits back to automatic
// Herdr's own settings (machines, updates, keys) open from the bottom button.
// Resets ask twice: the first press only arms the button.
// Copyright (c) 2026 cubha. MIT License.

import { div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { props, run, shared, setShared, closeOverlay, settings, layouts, readTextFile, writeTextFile, appHome, playSound } from "herdr";
import { P, unit, root, pic, frame, plaque, small, button, texture, lvInfo, PICKS, setTermFont } from "../kit.js";
import { titleOf } from "../progress.js";

const SOUNDS = { done: "mods/pixel-quest/sounds/quest-done.mp3", blocked: "mods/pixel-quest/sounds/quest-blocked.mp3" };
const LOOKS = [["pixel-quest", "심연(다크)", "look-dark"], ["pixel-quest-light", "슬레이트(라이트)", "look-light"]];
const TABS = [["look", "모양", "ico-crystal"], ["sound", "알림", "ico-potion"], ["quest", "퀘스트·파티", "ico-key"]];

export default class Settings {
  init(_p, cx) {
    this.tab = "look";
    this.armed = null;
    this.file = null;   // settings.json as read (the write only lands if it is unchanged)
    this.note = "";
    this.load(cx);
  }

  close() { closeOverlay(props()?.overlay); }

  path() { return `${appHome()}/settings.json`; }

  load(cx) {
    cx.spawn(async (cx) => {
      try { this.file = await readTextFile(this.path()); } catch { this.file = null; }
      cx.notify();
    });
  }

  json() {
    try { return this.file ? JSON.parse(this.file) : {}; } catch { return null; }
  }

  // Changes settings.json (keeping everything else), then reads it back.
  // One write at a time; nothing before the file was read (a write from an empty
  // snapshot would drop the other settings).
  edit(cx, change, done) {
    if (this.writing) return;
    if (this.file == null) { this.note = "설정 파일을 읽는 중입니다. 잠시 뒤 다시 눌러 주세요"; this.load(cx); cx.notify(); return; }
    const data = this.json();
    if (!data) { this.note = "settings.json을 읽지 못했습니다"; cx.notify(); return; }
    change(data);
    const text = JSON.stringify(data, null, 2) + "\n";
    const before = this.file;
    this.writing = true;
    cx.spawn(async (cx) => {
      try { await writeTextFile(this.path(), text, before); this.file = text; this.note = done; }
      catch { this.note = "다른 곳에서 바뀌었습니다. 다시 눌러 주세요"; this.load(cx); }
      finally { this.writing = false; cx.notify(); }
    });
  }

  // A reset that asks twice.
  twice(u, id, label, act) {
    const armed = this.armed === id;
    return button(u, id, small(u, armed ? `한 번 더 누르면 ${label}` : label, armed ? P.g3 : P.text), (_e, cx) => {
      if (!armed) { this.armed = id; cx.notify(); return; }
      this.armed = null; act(); cx.notify();
    }, { pad: [1, 8], red: armed });
  }

  // An on/off switch in pixels: a well with a knob that sits left or right.
  toggle(u, id, on, flip) {
    return h_flex().id(id).flex_none().w(u(34)).h(u(16)).p(u(2)).cursor_pointer().border(u(2)).border_color(P.ink)
      .bg(on ? P.done : P.well).when(on, (el) => el.justify_end())
      .on_click((_e, cx) => { flip(cx); cx.notify(); })
      .child(div().w(u(10)).h_full().bg(on ? P.g3 : P.stone).border(u(1)).border_color(P.ink));
  }

  row(u, title, hint, control) {
    return h_flex().flex_none().gap(u(8)).items_center().px(u(8)).py(u(4)).bg(P.raised).border(u(2)).border_color(P.ink)
      .child(v_flex().flex_1().min_w(0)
        .child(div().text_color(P.text).child(title))
        .when(Boolean(hint), (el) => el.child(small(u, hint, P.dim))))
      .child(control);
  }

  stepper(u, id, value, minus, plus) {
    return h_flex().gap(u(6)).items_center()
      .child(button(u, `${id}-m`, small(u, "−", P.text), minus, { pad: [1, 6] }))
      .child(div().w(u(40)).flex().justify_center().text_color(P.text).child(value))
      .child(button(u, `${id}-p`, small(u, "+", P.text), plus, { pad: [1, 6] }));
  }

  look(u) {
    const shown = shared("layout");
    const names = layouts();
    const card = ([name, label, art]) => {
      const on = shown === name, have = names.includes(name);
      return v_flex().id(`set-${name}`).flex_none().gap(u(2)).p(u(4)).border(u(2)).border_color(on ? P.g3 : P.ink).bg(on ? P.hover : P.raised)
        .when(have, (el) => el.cursor_pointer().hover((s) => s.border_color(P.g2)).on_click(() => run("layout.switch", { name })))
        .child(pic(u, art, 128, 80))
        .child(h_flex().items_center().child(div().flex_1().text_color(on ? P.gt : P.text).child(label)).when(on, (el) => el.child(div().text_color(P.gt).child("✓"))));
    };
    const zoom = Number(settings()?.zoom) || 1;
    const font = Number(settings()?.font_size) || 12;
    const setFont = (cx, n) => { this.note = `터미널 글꼴 크기 ${setTermFont(n)}`; cx.notify(); };
    return v_flex().gap(u(6))
      .child(small(u, "레이아웃", P.gt2))
      .child(h_flex().gap(u(8)).children(LOOKS.map(card)))
      .child(small(u, "크기", P.gt2))
      .child(this.row(u, "화면 크기", "Ctrl + / Ctrl - 와 같음",
        this.stepper(u, "zoom", `${Math.round(zoom * 100)}%`, () => run("app.zoom_out"), () => run("app.zoom_in"))))
      .child(this.row(u, "터미널 글꼴 크기", "Galmuri는 12에서 가장 또렷함",
        this.stepper(u, "font", String(font), (_e, cx) => setFont(cx, font - 1), (_e, cx) => setFont(cx, font + 1))));
  }

  sound(u) {
    const data = this.json() ?? {};
    const s = data.sounds ?? {};
    const on = s.enabled !== false;
    const ours = s.done === SOUNDS.done;
    const pickKind = (cx, eight) => this.edit(cx, (d) => {
      d.sounds = { ...(d.sounds ?? {}), enabled: d.sounds?.enabled ?? true };
      if (eight) Object.assign(d.sounds, SOUNDS);
      else { delete d.sounds.done; delete d.sounds.blocked; }
    }, eight ? "8비트 퀘스트 소리로 바꿨습니다" : "Herdr 기본 소리로 바꿨습니다");
    const seg = (id, label, active, act) => button(u, id, small(u, label, active ? P.g3 : P.text), act, { on: active, pad: [1, 8] });
    const tryIt = (id, kind) => button(u, id, small(u, "▶ 들어보기", P.text), () => playSound(ours ? SOUNDS[kind] : kind), { pad: [1, 8] });
    return v_flex().gap(u(6))
      .child(small(u, "알림음", P.gt2))
      .child(this.row(u, "알림음 켜기", "에이전트가 끝나거나 입력이 필요할 때",
        this.toggle(u, "snd-on", on, (cx) => this.edit(cx, (d) => { d.sounds = { ...(d.sounds ?? {}), enabled: !on }; }, on ? "알림음을 껐습니다" : "알림음을 켰습니다"))))
      .child(small(u, "소리 종류", P.gt2))
      .child(h_flex().gap(u(4))
        .child(seg("snd-8bit", "8비트 퀘스트", ours, (_e, cx) => pickKind(cx, true)))
        .child(seg("snd-herdr", "Herdr 기본", !ours, (_e, cx) => pickKind(cx, false))))
      .child(this.row(u, "완료", ours ? "상승 아르페지오" : "Herdr 기본 완료음", tryIt("try-done", "done")))
      .child(this.row(u, "입력 필요", ours ? "두 번 부르는 경고음" : "Herdr 기본 경고음", tryIt("try-blocked", "blocked")));
  }

  quest(u) {
    const info = lvInfo();
    const picks = Object.keys(shared(PICKS) ?? {}).length;
    const flag = (key) => shared(key) !== false;
    return v_flex().gap(u(6))
      .child(small(u, "퀘스트", P.gt2))
      .child(this.row(u, "퀘스트 완료 배너", "작업이 끝나면 4.5초 동안", this.toggle(u, "q-banner", flag("pq.banner"), () => setShared("pq.banner", !flag("pq.banner")))))
      .child(this.row(u, `완료한 퀘스트 ${info.q} · Lv.${info.lv} ${titleOf(info.lv)}`, "초기화해도 이미 얻은 초상·액자·배너는 남습니다",
        this.twice(u, "q-reset", "초기화", () => { setShared("pq.quests", 0); setShared("pq.floor", null); this.note = "퀘스트 수를 0으로 되돌렸습니다"; })))
      .child(small(u, "파티", P.gt2))
      .child(this.row(u, "파티 연출", "초상 옆: 작업 중 칼날 · 대기 모닥불 · 완료 보상상자 · 입력 필요 말풍선", this.toggle(u, "q-battle", flag("pq.battle"), () => setShared("pq.battle", !flag("pq.battle")))))
      .child(this.row(u, "사용량 게이지", "상태바 5H · 7D", this.toggle(u, "q-gauges", flag("pq.gauges"), () => setShared("pq.gauges", !flag("pq.gauges")))))
      .child(this.row(u, "초상 자동 배정으로 되돌리기", `직접 고른 초상 ${picks}개`,
        this.twice(u, "f-reset", "되돌리기", () => { setShared(PICKS, {}); this.note = "초상을 모두 자동 배정으로 되돌렸습니다"; })));
  }

  render() {
    const u = unit();
    const nav = v_flex().w(u(110)).flex_none().gap(u(4))
      .children(TABS.map(([k, label, art]) => h_flex().id(`set-tab-${k}`).gap(u(6)).px(u(6)).py(u(4)).items_center().cursor_pointer()
        .border(u(2)).border_color(this.tab === k ? P.b2 : "#00000000").when(this.tab === k, (el) => el.bg(P.raised))
        .hover((s) => s.bg(P.hover))
        .on_click((_e, cx) => { this.tab = k; this.armed = null; this.note = ""; cx.notify(); })
        .child(pic(u, art, 16))
        .child(div().text_color(this.tab === k ? P.gt : P.text).child(label))));
    const page = this.tab === "look" ? this.look(u) : this.tab === "sound" ? this.sound(u) : this.quest(u);
    const body = v_flex().size_full().gap(u(8))
      .child(div().relative().overflow_hidden().h(u(30)).flex_none().flex().items_center().justify_center()
        .child(texture(u, "strip", 2560, 48))
        .child(plaque(u, "설정").w(u(150))))
      .child(h_flex().flex_1().min_h(0).gap(u(10)).items_start()
        .child(nav)
        .child(v_flex().id("set-page").flex_1().min_w(0).h_full().overflow_y_scrollbar().child(page)))
      .child(h_flex().gap(u(8)).items_center()
        .child(div().flex_1().min_w(0).truncate().child(small(u, this.note || "머신·업데이트·단축키 등", this.note ? P.done : P.muted)))
        .child(button(u, "set-herdr", small(u, "Herdr 기본 설정 열기", P.text), () => { this.close(); run("app.settings"); }, { pad: [1, 8] }))
        .child(button(u, "set-close", small(u, "닫기", P.text), () => this.close(), { pad: [1, 8] })));
    return root(u, div().id("settings").size_full().on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .child(frame(u, "gold", body, { pad: [8, 10], floor: true, web: "br" }).size_full()));
  }
}
