// Pixel Quest status bar. Modified from Herdr's shipped `workspace-status` mod
// (Apache-2.0, Herdr 0.1.14): machine, a party health bar (one cell per agent,
// in its status color), "! n 입력 필요", the branch, and the palette key.
//
// It also keeps the quest log: when an agent turns done, the "퀘스트 완료"
// banner opens over the window (role "quest") and the quest count goes up;
// every five quests the brand's level goes up. Herdr itself plays the done
// sound (settings.json `sounds.done`), so the banner stays silent.

import { div, svg } from "gpui-kit";
import { h_flex } from "gpui-base";
import { spaces, agents, run, window, keys, shared, setShared, openOverlay, closeOverlay, nextCommand } from "herdr";
import { P, unit, root, small, button } from "../kit.js";

const COLOR = { working: P.working, blocked: P.blocked, done: P.done, idle: P.idle };

export default class Status {
  init(_p, cx) {
    // Only status changes seen while this runs count: no fanfare for the past.
    this.last = new Map(agents().map((a) => [a.address, a.status]));
    // `pixel-quest.quest` (a key or `herdr-app do`) shows the banner once, to try it.
    cx.spawn(async (cx) => {
      for (;;) {
        const c = await nextCommand();
        if (c === "quest") this.fanfare({ space_name: "시험 퀘스트", address: "demo" }, false);
        else if (c === "quest_reset") setShared("pq.quests", 0);
        cx.notify();
      }
    });
  }

  // The palette key as actually bound, not a hardcoded one.
  hint() {
    const mac = window()?.platform === "macos";
    const mod = { cmd: mac ? "⌘" : "Ctrl+", ctrl: mac ? "⌃" : "Ctrl+", shift: mac ? "⇧" : "Shift+", alt: mac ? "⌥" : "Alt+", option: mac ? "⌥" : "Alt+" };
    const b = keys().find((k) => k.section === "global" && k.action === "app.palette");
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
    const n = (shared("pq.quests") ?? 0) + (count ? 1 : 0);
    if (count) setShared("pq.quests", n);
    if (shared("pq.banner") === false) return;
    const prev = shared("pq.banner.open");
    if (prev) closeOverlay(prev);
    const id = openOverlay({
      mod: "pixel-quest", kind: "window", key: "pq-quest", frame: "none", width: 360, height: 112,
      props: { role: "quest", title: a.space_name || a.program?.name || "agent", agent: a.address, pane: a.pane, quests: n },
    });
    setShared("pq.banner.open", id);
  }

  render() {
    const u = unit();
    const list = agents();
    this.watch(list);
    const space = spaces().find((s) => s.active);
    const needs = list.filter((a) => a.status === "blocked").length;
    const key = this.hint();
    const cell = (a) => div().w(u(14)).h_full().bg(COLOR[a.status] ?? P.idle).border_r(u(2)).border_color(P.ink);
    return root(u, h_flex().size_full().px(u(10)).gap(u(12)).items_center().bg(P.chrome).border_t(u(2)).border_color(P.ink)
      .child(div().text_color(P.muted).child(space?.machine ?? "이 컴퓨터"))
      .child(h_flex().gap(u(6)).items_center()
        .child(small(u, "파티", P.g2))
        .child(h_flex().h(u(12)).border(u(2)).border_color(P.ink).bg(P.ink).children(list.slice(0, 12).map(cell)))
        .when(list.length === 0, (el) => el.child(small(u, "없음"))))
      .when(needs > 0, (el) => el.child(small(u, `! ${needs} 입력 필요`, P.blocked).loop("opacity", { from: 0.5, to: 1, period: 900 })))
      .when(Boolean(space?.branch), (el) => el.child(small(u, space.branch, P.muted)))
      .child(div().flex_1())
      .child(small(u, `퀘스트 ${shared("pq.quests") ?? 0}`, P.g2))
      .child(h_flex().id("palette").gap(u(6)).items_center().cursor_pointer().on_click(() => run("app.palette"))
        .when(Boolean(key), (el) => el.child(div().border(u(2)).border_color(P.b1).bg(P.raised).px(u(4)).child(small(u, key, P.text))))
        .child(small(u, "명령", P.dim))));
  }
}
