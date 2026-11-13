// Pixel Quest command palette. Modified from Herdr's own palette (frame/palette,
// Apache-2.0, Herdr 0.1.14): the same commands (commands(), layouts()) and the
// same keys (keys()), with Korean names (English still finds them), an item
// icon per group, the selection cursor, a gold frame on a stone floor. Empty:
// recent first, then 탭 · 칸 · 스페이스 · 레이아웃 · 터미널 · 에이전트 · 창 · 앱.
// Also the theme's own windows (던전 설정, 모험 일지) and Herdr's originals.
// Opened by `pixel-quest.palette` (keys.json, e.g. ctrl-shift-p).

import { div } from "gpui-kit";
import { v_flex, h_flex, InputState, Input } from "gpui-base";
import { commands, layouts, keys, run, props, closeOverlay, openOverlay, shared, window as win } from "herdr";
import { P, unit, root, pic, frame, small, cursor, bandHead, openSettings, openJournal, openGoto, openRename, openHelp, openShop } from "../kit.js";
import { keyParts as capsOf } from "../dialogs.js";
import { ZONES, layoutOf } from "../zones.js";

const SHOWN = 8, ROW_H = 28, HEAD_H = 22;
const GROUPS = ["최근", "탭", "칸", "스페이스", "레이아웃", "터미널", "에이전트", "창", "앱"];
const ICON = { 최근: "ico-scroll", 탭: "ico-chest", 칸: "ico-scroll", 스페이스: "ico-crystal", 레이아웃: "ico-potion", 터미널: "ico-key", 에이전트: "ico-chest-open", 창: "ico-crystal", 앱: "ico-potion" };

// [command, args, group, title, keywords]. Theme entries use "pq:<what>".
const DIR = { left: "왼쪽", right: "오른쪽", up: "위쪽", down: "아래쪽" };
const NAMED = [
  ["tab.new", {}, "탭", "새 탭", "new tab agent task"],
  ["pq:goto", {}, "탭", "찾기: 스페이스나 탭으로 이동…", "go to switch jump find picker search"],
  ["pq:rename_tab", {}, "탭", "탭 이름 바꾸기", "rename tab"],
  ["tab.close", {}, "탭", "탭 닫기", "close tab kill"],
  ["tab.next", {}, "탭", "다음 탭", "next tab"],
  ["tab.prev", {}, "탭", "이전 탭", "previous tab"],
  ["pane.split", { direction: "right" }, "칸", "오른쪽으로 나누기", "split right vertical"],
  ["pane.split", { direction: "down" }, "칸", "아래로 나누기", "split down horizontal"],
  ["pane.close", {}, "칸", "칸 닫기", "close pane kill"],
  ["pane.zoom", {}, "칸", "칸 크게 보기", "zoom pane maximize fullscreen"],
  ...["left", "right", "up", "down"].map((d) => ["pane.go", { direction: d }, "칸", `${DIR[d]} 칸으로`, `focus pane ${d} move go`]),
  ...["left", "right", "up", "down"].map((d) => ["pane.swap", { direction: d }, "칸", `${DIR[d]} 칸과 바꾸기`, `swap pane ${d}`]),
  ["space.new", {}, "스페이스", "새 스페이스", "new space workspace"],
  ["pq:rename_space", {}, "스페이스", "스페이스 이름 바꾸기", "rename space workspace"],
  ["space.close", {}, "스페이스", "스페이스 닫기", "close space workspace kill"],
  ["space.next", {}, "스페이스", "다음 스페이스", "next space workspace"],
  ["space.prev", {}, "스페이스", "이전 스페이스", "previous space workspace"],
  ["layout.switch", {}, "레이아웃", "다음 레이아웃", "next layout look switch"],
  ["layout.reset", {}, "레이아웃", "레이아웃 되돌리기", "reset layout default restore"],
  ["layout.clone", {}, "레이아웃", "레이아웃 복제", "duplicate clone copy customize"],
  ["terminal.open", {}, "터미널", "새 터미널", "new terminal shell"],
  ["terminal.copy", {}, "터미널", "복사", "copy clipboard"],
  ["terminal.paste", {}, "터미널", "붙여넣기", "paste clipboard"],
  ["terminal.paste_image", {}, "터미널", "이미지 붙여넣기", "paste image clipboard"],
  ["terminal.search", {}, "터미널", "터미널에서 찾기", "search find scrollback"],
  ["agent.next", {}, "에이전트", "다음 에이전트", "next agent"],
  ["agent.prev", {}, "에이전트", "이전 에이전트", "previous agent"],
  ["window.minimize", {}, "창", "창 내리기", "minimize window"],
  ["window.maximize", {}, "창", "창 최대화", "maximize window restore"],
  ["window.close", {}, "창", "창 닫기", "close window quit"],
  ["pq:settings", {}, "앱", "던전 설정", "settings preferences theme sound pixel quest"],
  ["pq:journal", {}, "앱", "모험 일지", "journal level quest unlock frame banner"],
  ["pq:shop", {}, "앱", "펫 상점", "pet shop gold buy dex collection"],
  ["pq:dex", {}, "앱", "펫 도감", "pet dex collection choose"],
  ["pq:medals", {}, "앱", "훈장 보기", "medals achievements badges"],
  ["pixel-quest.quest", {}, "앱", "퀘스트 배너 시험", "quest test banner"],
  ["pixel-quest.pet_try", {}, "앱", "펫 상황 시험", "pet test mood"],
  ["app.settings", {}, "앱", "Herdr 기본 설정", "herdr settings machine update keys"],
  ["app.palette", {}, "앱", "Herdr 기본 팔레트 열기", "herdr palette command"],
  ["pq:help", {}, "앱", "단축키 보기", "keys keybindings shortcuts help"],
  ["app.welcome", {}, "앱", "환영 화면", "welcome intro"],
  ["app.whats_new", {}, "앱", "새 소식", "what's new release changes"],
  ["app.zoom_in", {}, "앱", "확대", "zoom in bigger"],
  ["app.zoom_out", {}, "앱", "축소", "zoom out smaller"],
  ["app.zoom_reset", {}, "앱", "확대 되돌리기", "reset zoom"],
  ["app.check_updates", {}, "앱", "업데이트 확인", "check updates new version"],
  ["app.update", {}, "앱", "업데이트하고 다시 시작", "update restart"],
  ["app.update_core", {}, "앱", "herdr-core 업데이트", "update core"],
  ["app.feedback", {}, "앱", "의견 보내기", "feedback"],
  ["app.reset", {}, "앱", "기본 화면으로 되돌리기", "reset escape hatch broken restore"],
  ["app.quit", {}, "앱", "Herdr 끝내기", "quit exit"],
];
const LOOK_KO = { ...Object.fromEntries(ZONES.map((z) => [layoutOf(z.key), `구역: ${z.name}`])), main: "Herdr", terminals: "Terminals", win98: "Herdr 98" };

// Commands that act on something you point at, or open what this replaces.
const HIDDEN = new Set([
  "space.move", "tab.move", "space.select", "tab.select", "pane.focus", "terminal.keep",
  "tab.rename", "space.rename", "app.help", // the theme's own windows (pq:rename_*, pq:help)
  "terminal.park", "terminal.kill", "terminal.show", "agent.focus", "layout.set", "layout.toggle",
  "layout.show", "layout.hide", "layout.resize", "layout.select", "mod.open", "overlay.close",
  "tab.settle", "tab.unsettle", "terminal.scroll", "mod.clone", "app.palette", "app.hide", "app.hide_others", "app.show_all", "app.theme", "app.settings",
]);

function entries() {
  const known = new Set(commands().map((c) => c.name));
  const mac = win()?.platform === "macos";
  const list = NAMED.filter(([n]) => n.startsWith("pq:") || n.startsWith("pixel-quest.") || known.has(n))
    .filter(([n]) => !(mac && n.startsWith("window.")))
    .map(([name, args, group, title, words]) => ({ name, args, group, title, words }));
  for (const l of layouts()) {
    list.push({ name: "layout.switch", args: { name: l }, group: "레이아웃", title: `레이아웃: ${LOOK_KO[l] ?? l}`, words: `layout look ${l}` });
  }
  // Anything new in Herdr shows up too, under its own name.
  const named = new Set(NAMED.map(([n]) => n));
  for (const c of commands()) {
    if (named.has(c.name) || HIDDEN.has(c.name) || c.args.some((a) => a.required && a.name !== "name")) continue;
    const [noun, verb] = c.name.split(".");
    list.push({ name: c.name, args: {}, group: "앱", title: `${noun} ${String(verb).replace(/_/g, " ")}`, words: c.about });
  }
  return list.map((e) => ({ ...e, id: `${e.name}:${JSON.stringify(e.args)}` }));
}

// Theme entries still on Herdr's key until install.ps1 -Palette rebinds it.
const HERDR_KEY = { "pq:goto": "mod.open:picker", "pq:rename_tab": "tab.rename", "pq:rename_space": "space.rename", "pq:help": "app.help" };

// The key bound to an entry: `name` or `name:value` (theme entries: `pixel-quest.<what>`).
function keyOf(e, bound) {
  const v = Object.values(e.args)[0];
  const want = e.name.startsWith("pq:") ? `pixel-quest.${e.name.slice(3)}` : e.name.startsWith("pixel-quest.") ? e.name : v === undefined ? e.name : `${e.name}:${v}`;
  // 찾기 is Herdr's picker key until it is rebound to the theme's.
  const k = bound.find((b) => b.section === "global" && b.action === want)
    ?? (HERDR_KEY[e.name] ? bound.find((b) => b.section === "global" && b.action === HERDR_KEY[e.name]) : null);
  return k ? k.keys : null;
}

function keyParts(k) {
  return capsOf(k, win()?.platform === "macos");
}

// Fuzzy score of q in text with the matched positions; null: no match.
function fuzzy(q, text) {
  const t = text.toLowerCase();
  let score = 0, at = 0, runLen = 0;
  const hits = [];
  for (const ch of q) {
    const i = t.indexOf(ch, at);
    if (i < 0) return null;
    const start = i === 0 || /[\s:.\-_/(]/.test(t[i - 1]);
    runLen = i === at && hits.length ? runLen + 1 : 0;
    score += 1 + (start ? 6 : 0) + runLen * 3 - Math.min(i - at, 6) * 0.3;
    hits.push(i);
    at = i + 1;
  }
  return { score: score - text.length * 0.02, hits };
}

export default class Palette {
  init(_p, cx) {
    this.query = "";
    this.input = InputState.new({ placeholder: "무엇을 할까요? (예: 탭, 나누기, 확대)" });
    this.input.on("change", (_e, cx) => { this.query = this.input.value(); this.at = 0; this.scroll = 0; cx.notify(); });
    this.input.on("submit", () => this.go(this.rows()[this.at]?.e));
    this.input.focus();
    cx.timer.after(600, () => this.input.focus());
    this.at = 0;
    this.scroll = 0;
    try { this.recent = JSON.parse(localStorage.getItem("palette.recent") ?? "[]"); } catch { this.recent = []; }
    this.handle = cx.focus_handle();
  }

  close() { closeOverlay(props()?.overlay); }

  go(e) {
    if (!e) return;
    this.recent = [e.id, ...this.recent.filter((r) => r !== e.id)].slice(0, 20);
    localStorage.setItem("palette.recent", JSON.stringify(this.recent));
    this.close();
    if (e.name === "pq:settings") openSettings();
    else if (e.name === "pq:journal") openJournal();
    else if (e.name === "pq:shop") openShop();
    else if (e.name === "pq:dex") openShop("dex");
    else if (e.name === "pq:medals") openJournal("medals");
    else if (e.name === "pq:goto") openGoto();
    else if (e.name === "pq:rename_tab") openRename("tab");
    else if (e.name === "pq:rename_space") openRename("space");
    else if (e.name === "pq:help") openHelp();
    else run(e.name, e.name === "layout.clone" ? { name: shared("layout") ?? "main" } : e.args);
  }

  rows() {
    const all = entries();
    const q = this.query.trim().toLowerCase().replace(/\s+/g, "");
    if (!q) {
      const recent = this.recent.map((id) => all.find((e) => e.id === id)).filter(Boolean).slice(0, 5);
      const rest = GROUPS.slice(1).flatMap((g) => all.filter((e) => e.group === g && !recent.includes(e)));
      return [...recent.map((e) => ({ e, head: "최근" })), ...rest.map((e) => ({ e, head: e.group }))];
    }
    // Matches stay under their group's head (탭, 칸, …), best first inside a group.
    const rank = (e) => this.recent.indexOf(e.id);
    const hits = all
      .map((e) => {
        const title = fuzzy(q, e.title.replace(/\s+/g, " "));
        const more = fuzzy(q, `${e.group} ${e.title} ${e.name} ${e.words}`);
        const best = title ?? (more && { score: more.score - 4, hits: [] });
        return best && { e, score: best.score, hits: best.hits, head: e.group };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score || (rank(a.e) < 0 ? 99 : rank(a.e)) - (rank(b.e) < 0 ? 99 : rank(b.e)));
    return GROUPS.slice(1).flatMap((g) => hits.filter((h) => h.head === g));
  }

  // The title with the typed letters in gold, underlined.
  title(u, text, hits, on) {
    if (!hits?.length) return div().text_color(on ? P.gt : P.text).child(text);
    const parts = [];
    let cur = "", lit = false;
    [...text].forEach((ch, i) => {
      const h = hits.includes(i);
      if (h !== lit && cur) { parts.push([cur, lit]); cur = ""; }
      lit = h; cur += ch;
    });
    if (cur) parts.push([cur, lit]);
    return h_flex().children(parts.map(([s, h]) => div().text_color(h ? P.g3 : on ? P.gt : P.text)
      .when(h, (d) => d.border_b(u(2)).border_color(P.g2)).child(s.replace(/ /g, " "))));
  }

  render() {
    const u = unit();
    const rows = this.rows();
    const bound = keys();
    this.at = Math.min(this.at, Math.max(0, rows.length - 1));
    const LIST_H = u(SHOWN * ROW_H);
    const tops = [];
    let y = 0;
    rows.forEach((r, i) => {
      const head = i === 0 || r.head !== rows[i - 1].head;
      tops.push({ head, title: y, row: y + (head ? u(HEAD_H) : 0) });
      y += (head ? u(HEAD_H) : 0) + u(ROW_H);
    });
    const fixed = y > LIST_H;
    this.maxScroll = Math.max(0, y - LIST_H);
    const sel = tops[this.at];
    if (sel) {
      const from = sel.head ? sel.title : sel.row;
      if (from < this.scroll) this.scroll = from;
      if (sel.row + u(ROW_H) > this.scroll + LIST_H) this.scroll = sel.row + u(ROW_H) - LIST_H;
    }
    this.scroll = Math.max(0, Math.min(this.scroll, this.maxScroll));
    const chip = (k) => h_flex().gap(u(2)).children(keyParts(k).map((p) => div().px(u(3)).border(u(2)).border_color(P.b1).bg(P.raised).child(small(u, p, P.text))));
    // Rows are placed at model edges (not stacked) so rounding can't drift the selection away.
    const place = (el, start, end) => fixed
      ? el.absolute().left(0).right(0).top(start - this.scroll).bottom(LIST_H - (end - this.scroll))
      : el.relative().flex_none().h(end - start);
    const visible = (start, end) => !fixed || (end > this.scroll && start < this.scroll + LIST_H);
    const list = [];
    rows.forEach((r, i) => {
      const { head, title, row } = tops[i];
      if (head && visible(title, row)) {
        list.push(place(h_flex(), title, row).px(u(4)).gap(u(6)).items_center()
          .child(small(u, r.head, P.gt2)).child(div().flex_1().h(u(2)).bg(P.b1)));
      }
      if (!visible(row, row + u(ROW_H))) return;
      const on = i === this.at;
      const k = keyOf(r.e, bound);
      list.push(place(h_flex(), row, row + u(ROW_H)).id(`pp-${i}`).pl(u(20)).pr(u(6)).gap(u(8)).items_center().cursor_pointer()
        .border(u(2)).border_color(on ? P.b2 : "#00000000").when(on, (el) => el.bg(P.raised))
        .hover((s) => s.bg(P.hover))
        .on_click(() => this.go(r.e))
        .when(on, (el) => el.child(cursor(u).absolute().top(u(4)).left(u(0))))
        .child(pic(u, ICON[r.e.group] ?? "ico-scroll", 16))
        .child(div().flex_1().min_w(0).child(this.title(u, r.e.title, r.hits, on)))
        .when(Boolean(k), (el) => el.child(chip(k))));
    });
    const search = h_flex().h(u(26)).flex_none().px(u(6)).gap(u(6)).items_center().bg(P.well).border(u(2)).border_color(P.b2)
      .child(pic(u, "ico-key", 16))
      .child(Input.new(this.input).flex_1().h_full().text_size(u(12)).text_color(P.text).bg(P.well).border_0());
    const body = v_flex().id("palette").track_focus(this.handle).size_full().min_h(0).gap(u(6))
      .on_key_down((e, cx) => {
        const k = e.key;
        if (k === "escape") return this.close();
        if (k === "down") this.at = Math.min(this.at + 1, rows.length - 1);
        else if (k === "up") this.at = Math.max(this.at - 1, 0);
        else if (k === "pagedown") this.at = Math.min(this.at + SHOWN, rows.length - 1);
        else if (k === "pageup") this.at = Math.max(this.at - SHOWN, 0);
        else return;
        cx.stop_propagation();
        cx.notify();
      })
      .child(bandHead(u, "명령"))
      .child(search)
      .child(rows.length
        ? div().id("palette-rows").relative().flex_none().when(fixed, (el) => el.h(LIST_H).overflow_hidden())
          .on_scroll_wheel((e, cx) => {
            this.scroll = Math.max(0, Math.min(this.scroll - e.delta.y, this.maxScroll));
            while (this.at < rows.length - 1 && (tops[this.at].head ? tops[this.at].title : tops[this.at].row) < this.scroll) this.at++;
            while (this.at > 0 && tops[this.at].row + u(ROW_H) > this.scroll + LIST_H) this.at--;
            cx.notify();
          })
          .children(fixed ? list : [v_flex().children(list)])
        : div().p(u(10)).child(small(u, `"${this.query}"에 맞는 명령이 없습니다. 스페이스·탭은 찾기(Ctrl+Shift+K)에 있습니다.`, P.dim)))
      .child(div().flex_1())
      .child(h_flex().gap(u(10)).items_center()
        .child(small(u, "↑↓ 고르기", P.gt2)).child(small(u, "Enter 실행", P.gt2)).child(small(u, "Esc 닫기", P.gt2)));
    return root(u, div().size_full().on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .child(frame(u, "gold", body, { pad: [8, 10], floor: true, web: "br" }).size_full()));
  }
}
