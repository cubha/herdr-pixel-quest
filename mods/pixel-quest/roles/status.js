// Pixel Quest status bar. Modified from Herdr's shipped `workspace-status` mod
// (Apache-2.0, Herdr 0.1.14): machine, a party health bar (one cell per agent,
// in its status color), "! n 입력 필요", the branch, the palette key, and two
// mana gauges for Claude's 5-hour / 7-day usage (tools/pq-usage.js saves them).
//
// It also keeps the quest log: when an agent turns done, the quest count goes
// up, the quest goes on the log (pq.log) and the "퀘스트 완료" banner opens over
// the window (role "quest", in the chosen decoration); when that makes a new
// level, the level-up banner opens instead. Levels and unlocks: progress.js.
// Herdr itself plays the done sound (settings.json `sounds.done`), so the
// banner stays silent. Key commands (keys.json "<key>": "pixel-quest.<cmd>"):
// quest (try the banner), quest_reset, palette, settings, journal.

import { div, svg } from "gpui-kit";
import { h_flex } from "gpui-base";
import { spaces, agents, run, window, keys, shared, setShared, openOverlay, closeOverlay, nextCommand, readTextFile, appHome } from "herdr";
import { P, unit, root, small, button, pic, texture, cells, usageWindow, span, USAGE_FILE, watchUsage, lvInfo, best, openJournal, openPalette, openSettings, openGoto, openRename, openHelp, keepTermFont } from "../kit.js";
import { oldLevel, levelOf, progressAt, pushLog, pick } from "../progress.js";

const COLOR = { working: P.working, blocked: P.blocked, done: P.done, idle: P.idle };

export default class Status {
  init(_p, cx) {
    keepTermFont();
    // Claude usage: pixel-quest-usage.json in the app folder (tools/pq-usage.js writes it).
    this.usage = null;
    const load = (cx) => cx.spawn(async (cx) => {
      try {
        const text = await readTextFile(`${appHome()}/${USAGE_FILE}`);
        const next = text ? JSON.parse(text) : null;
        if (JSON.stringify(next) !== JSON.stringify(this.usage)) this.usage = next;
      } catch { /* keep the last reading */ }
      cx.notify();   // also moves the countdowns on
    });
    watchUsage(cx, load);
    // Update day: keep the level the first release showed (one per five quests)
    // as a floor, and start the unlocks from it. Nobody's level goes down.
    if (shared("pq.best") == null) {
      const q = Number(shared("pq.quests")) || 0;
      if (oldLevel(q) > levelOf(q)) setShared("pq.floor", oldLevel(q));
      setShared("pq.best", Math.max(oldLevel(q), levelOf(q)));
    }
    // Only status changes seen while this runs count: no fanfare for the past.
    this.last = new Map(agents().map((a) => [a.address, a.status]));
    // `pixel-quest.quest` (a key or `herdr-app do`) shows the banner once, to try it.
    cx.spawn(async (cx) => {
      for (;;) {
        const c = await nextCommand();
        if (c === "quest") this.fanfare({ space_name: "시험 퀘스트", address: "demo" }, false);
        else if (c === "quest_reset") { setShared("pq.quests", 0); setShared("pq.floor", null); }
        else if (c === "palette") openPalette();
        else if (c === "goto") openGoto();
        else if (c === "settings") openSettings();
        else if (c === "journal") openJournal();
        else if (c === "rename_tab") openRename("tab");
        else if (c === "rename_space") openRename("space");
        else if (c === "help") openHelp();
        cx.notify();
      }
    });
  }

  // The palette key as actually bound, not a hardcoded one.
  hint() {
    const mac = window()?.platform === "macos";
    const mod = { cmd: mac ? "⌘" : "Ctrl+", ctrl: mac ? "⌃" : "Ctrl+", shift: mac ? "⇧" : "Shift+", alt: mac ? "⌥" : "Alt+", option: mac ? "⌥" : "Alt+" };
    const b = keys().find((k) => k.section === "global" && k.action === "pixel-quest.palette")
      ?? keys().find((k) => k.section === "global" && k.action === "app.palette");
    const parts = b && b.keys.endsWith("--") ? [...b.keys.slice(0, -2).split("-"), "-"] : b?.keys.split("-");
    return parts && parts.map((p) => mod[p.toLowerCase()] ?? p.toUpperCase()).join("");
  }

  watch(list) {
    for (const a of list) {
      const was = this.last.get(a.address);
      if (a.status === "done" && was && was !== "done" && was !== "idle") this.fanfare(a);
      this.last.set(a.address, a.status);
    }
  }

  fanfare(a, count = true) {
    const before = lvInfo().lv;
    const n = (Number(shared("pq.quests")) || 0) + (count ? 1 : 0);
    const title = a.space_name || a.program?.name || "agent";
    if (count) {
      setShared("pq.quests", n);
      setShared("pq.log", pushLog(shared("pq.log"), { name: title, at: Date.now() }));
      setShared("pq.best", Math.max(Number(shared("pq.best")) || 1, progressAt(n, shared("pq.floor")).lv));
    }
    const after = progressAt(n, shared("pq.floor")).lv;
    const up = count && after > before;
    if (shared("pq.banner") === false && !up) return;
    const prev = shared("pq.banner.open");
    if (prev) closeOverlay(prev);
    const style = pick("banner", shared("pq.bannerStyle"), best());
    const id = openOverlay({
      mod: "pixel-quest", kind: "window", key: "pq-quest", frame: "none", width: 360, height: 112,
      props: { role: "quest", title, agent: a.address, pane: a.pane, quests: n, style, levelUp: up ? after : null },
    });
    setShared("pq.banner.open", id);
  }

  // One usage window as a mana gauge: label, ten cells, percent, time to reset.
  gauge(u, id, label, long, w) {
    const r = usageWindow(w);
    return h_flex().id(id).gap(u(4)).items_center()
      .tooltip(r.over ? `${long} 한도: 기록 없음` : `${long} 한도 ${Math.round(r.pct)}% 사용 · ${r.at} 초기화`)
      .child(small(u, label, P.gt2))
      .child(cells(u, r))
      .child(small(u, r.over ? "--" : `${Math.round(r.pct)}%`, r.over ? P.dim : P.text))
      .when(r.left != null, (el) => el.child(small(u, span(r.left), P.dim)));
  }

  render() {
    const u = unit();
    const list = agents();
    this.watch(list);
    const space = spaces().find((s) => s.active);
    const needs = list.filter((a) => a.status === "blocked").length;
    const key = this.hint();
    const cell = (a) => div().w(u(14)).h_full().bg(COLOR[a.status] ?? P.idle).border_r(u(2)).border_color(P.ink);
    // Text sits on dark stone plates so the brick band doesn't eat its contrast.
    const plate = () => h_flex().h(u(20)).px(u(6)).gap(u(12)).items_center().bg(P.chrome).border(u(2)).border_color(P.ink);
    const moss = (side, at) => pic(u, "moss", 22, 6).absolute().top(0)[side](u(at));
    const left = plate()
      .child(div().text_color(P.muted).child(space?.machine ?? "이 컴퓨터"))
      .child(h_flex().gap(u(6)).items_center()
        .child(small(u, "파티", P.gt2))
        .child(h_flex().h(u(12)).border(u(2)).border_color(P.ink).bg(P.ink).children(list.slice(0, 12).map(cell)))
        .when(list.length === 0, (el) => el.child(small(u, "없음"))))
      .when(needs > 0, (el) => el.child(small(u, `! ${needs} 입력 필요`, P.blocked).loop("opacity", { from: 0.5, to: 1, period: 900 })))
      .when(Boolean(space?.branch), (el) => el.child(small(u, space.branch, P.muted)));
    const use = this.usage;
    // Click: the usage card above the bar (a popup at the pointer).
    const mana = shared("pq.gauges") !== false && use && (use.five_hour || use.seven_day) ? plate().id("usage").cursor_pointer()
      .hover((s) => s.border_color(P.g2))
      .on_click(() => openOverlay({ mod: "pixel-quest", kind: "popup", frame: "none", width: 340, height: 296, props: { role: "usage" } }))
      .child(this.gauge(u, "use-5h", "5H", "5시간", use.five_hour))
      .child(this.gauge(u, "use-7d", "7D", "7일", use.seven_day)) : null;
    const lv = lvInfo();
    const right = plate()
      .child(h_flex().id("quests").gap(u(6)).items_center().cursor_pointer()
        .tooltip(`퀘스트 = 에이전트가 일을 끝낸 횟수 · Lv.${lv.lv} · 다음 레벨까지 ${lv.left}`)
        .on_click(() => openJournal())
        .child(small(u, `퀘스트 ${lv.q}`, P.gt2))
        .child(cells(u, { pct: lv.frac * 100, tone: P.g2 }, 10, 4, 10)))
      .child(h_flex().id("palette").gap(u(6)).items_center().cursor_pointer().on_click(() => openPalette())
        .when(Boolean(key), (el) => el.child(div().border(u(2)).border_color(P.b1).bg(P.raised).px(u(4)).child(small(u, key, P.text))))
        .child(small(u, "명령", P.dim)));
    return root(u, h_flex().size_full().relative().overflow_hidden().px(u(10)).gap(u(12)).items_center().bg(P.chrome).border_t(u(2)).border_color(P.ink)
      .child(texture(u, "strip", 2560, 48))
      .child(left)
      .child(div().flex_1())
      .when(Boolean(mana), (el) => el.child(mana))
      .child(right)
      .child(moss("left", 250)).child(moss("left", 560)).child(moss("right", 260)));
  }
}
