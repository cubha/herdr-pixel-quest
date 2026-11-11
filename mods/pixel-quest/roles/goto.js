// Pixel Quest "찾기": go to a tab, space or agent. Modified from Herdr's shipped
// `picker` mod (Apache-2.0, Herdr 0.1.14): the same rows and keys (spaces that
// need you first, quiet spaces folded under "조용한 스페이스", type to filter,
// ↑/↓ and Enter to go, Ctrl+D closes a tab, Esc leaves, then new tab / new space
// on each machine), drawn in the theme: gold frame on a stone floor, a brick
// band head, the space's crest, status gems, the cursor, Korean words.
// Opened by the sidebar's search button and `pixel-quest.goto`.

import { div } from "gpui-kit";
import { v_flex, h_flex, InputState, Input } from "gpui-base";
import { agents, spaces, terminals, run, hc, props, closeOverlay, shared, setShared } from "herdr";
import { P, unit, root, pic, frame, small, cursor, bandHead, crest, gem } from "../kit.js";

// Space colors as Herdr keeps them (shared "space.colors"), so the crest matches the sidebar.
const PROJECT_COLORS = ["ansi6", "ansi3", "ansi4", "ansi5", "ansi2", "ansi1"];
function spaceColors() {
  const ids = new Set(spaces().map((p) => p.id));
  const kept = Object.fromEntries(Object.entries(shared("space.colors") ?? {}).filter(([id]) => ids.has(id)));
  let changed = Object.keys(kept).length !== Object.keys(shared("space.colors") ?? {}).length;
  for (const p of spaces()) {
    if (kept[p.id] || p.name === "~") continue;
    const uses = (c) => Object.values(kept).filter((v) => v === c).length;
    kept[p.id] = PROJECT_COLORS.reduce((best, c) => (uses(c) < uses(best) ? c : best));
    changed = true;
  }
  if (changed) setShared("space.colors", kept);
  return kept;
}
const crestOf = (w) => Math.max(0, PROJECT_COLORS.indexOf(spaceColors()[w.id] ?? PROJECT_COLORS[0]));

const SHOWN_H = 300;
const H = { head: 24, earlier: 28, new: 28, ctx: 28, space: 28 };

export default class Goto {
  init(_p, cx) {
    this.filter = "";
    this.input = InputState.new({ placeholder: "탭, 스페이스, 에이전트 이름…" });
    this.input.on("change", (_e, cx) => { this.filter = this.input.value(); this.at = 0; cx.notify(); });
    this.input.on("submit", () => this.go(this.pickable()[this.at]));
    this.input.focus();
    cx.timer.after(600, () => this.input.focus());
    this.at = null;
    this.scroll = 0;
    this.showEarlier = false;
    this.machines = [];
    this.handle = cx.focus_handle();
    cx.spawn(async (cx) => {
      try {
        const r = await hc(["machine", "ls", "--json"]);
        if (r.code === 0) this.machines = (JSON.parse(r.stdout).machines ?? []).filter((m) => m.state === "connected" && !m.temporary).map((m) => m.name);
      } catch {}
      cx.notify();
    });
  }

  close() { closeOverlay(props()?.overlay); }

  rows() {
    const f = this.filter.toLowerCase();
    const all = agents();
    const live = terminals().filter((x) => x.state === "live");
    const teamOf = (addrs) => {
      let n = 0;
      const walk = (a) => live.filter((x) => x.parent === a).forEach((k) => (n++, walk(k.address)));
      addrs.forEach(walk);
      return n;
    };
    const groups = spaces().map((w) => {
      const ctxs = w.tabs
        .map((ctx) => {
          const mine = all.filter((a) => a.tab === ctx.id);
          return { w, ctx, mine, team: teamOf(mine.map((a) => a.address)) };
        })
        .filter((c) => !f || [w.name, c.ctx.name, ...c.mine.map((a) => a.program?.name ?? "")].join(" ").toLowerCase().includes(f));
      return { w, ctxs };
    });
    const busy = groups.filter((p) => p.w.status && p.ctxs.length);
    const quiet = groups.filter((p) => !p.w.status && p.ctxs.length);
    busy.sort((a, b) => (b.w.status === "blocked") - (a.w.status === "blocked"));
    const out = [];
    const add = (p) => {
      out.push({ kind: "head", w: p.w });
      for (const c of p.ctxs) out.push({ kind: "ctx", ...c });
    };
    busy.forEach(add);
    if (quiet.length) {
      out.push({ kind: "earlier", count: quiet.length });
      if (this.showEarlier || f) quiet.forEach(add);
    }
    out.push({ kind: "new" });
    out.push({ kind: "space", machine: null });
    for (const m of this.machines) out.push({ kind: "space", machine: m });
    return out;
  }

  pickable(rows = this.rows()) { return rows.filter((r) => r.kind === "ctx" || r.kind === "new" || r.kind === "space"); }

  go(r) {
    if (!r) return;
    this.close();
    if (r.kind === "ctx") run("tab.select", { id: r.ctx.id });
    else if (r.kind === "new") run("tab.new");
    else if (r.kind === "space") run("space.new", { machine: r.machine ?? "" });
  }

  render() {
    const u = unit();
    const rows = this.rows();
    const pickable = this.pickable(rows);
    // Opens on where you are.
    if (this.at === null) this.at = Math.max(0, pickable.findIndex((r) => r.kind === "ctx" && r.w.active && r.ctx.active));
    this.at = Math.max(0, Math.min(this.at, pickable.length - 1));
    const sel = pickable[this.at];
    // Rows at fixed model edges; scrolling only as far as keeps the selection in view.
    const LIST_H = u(SHOWN_H);
    const tops = [];
    let y = 0;
    rows.forEach((r) => { tops.push(y); y += u(H[r.kind] ?? 28); });
    const total = y;
    const fixed = total > LIST_H;
    const maxScroll = Math.max(0, total - LIST_H);
    this.scroll = Math.max(0, Math.min(this.scroll, maxScroll));
    const hOf = (r) => u(H[r.kind] ?? 28);
    const si = rows.indexOf(sel);
    if (si >= 0) {
      if (tops[si] < this.scroll) this.scroll = tops[si];
      if (tops[si] + hOf(sel) > this.scroll + LIST_H) this.scroll = tops[si] + hOf(sel) - LIST_H;
    }
    const place = (el, i) => fixed
      ? el.absolute().left(0).right(0).top(tops[i] - this.scroll).bottom(LIST_H - (tops[i] + hOf(rows[i]) - this.scroll))
      : el.relative().flex_none().h(hOf(rows[i]));
    const visible = (i) => !fixed || (tops[i] + hOf(rows[i]) > this.scroll && tops[i] < this.scroll + LIST_H);
    // A pickable row: cursor and bronze edge when chosen.
    const item = (el, r, id) => {
      const on = r === sel;
      return el.id(id).pl(u(20)).pr(u(6)).gap(u(8)).items_center().cursor_pointer()
        .border(u(2)).border_color(on ? P.b2 : "#00000000").when(on, (x) => x.bg(P.raised))
        .hover((s) => s.bg(P.hover))
        .on_click(() => this.go(r))
        .when(on, (x) => x.child(cursor(u).absolute().top(u(4)).left(u(0))));
    };
    const row = (r) => {
      if (r.kind === "head") {
        return h_flex().px(u(4)).pt(u(4)).gap(u(6)).items_center()
          .child(crest(u, crestOf(r.w)))
          .child(small(u, r.w.name, P.gt2))
          .child(div().flex_1().h(u(2)).bg(P.b1));
      }
      if (r.kind === "earlier") {
        return h_flex().id("gt-earlier").px(u(4)).gap(u(6)).items_center().cursor_pointer()
          .on_click((_e, cx) => { this.showEarlier = !this.showEarlier; cx.notify(); })
          .child(small(u, `조용한 스페이스 ${r.count}개 ${this.showEarlier || this.filter ? "▴" : "▾"}`, P.muted))
          .child(div().flex_1().h(u(2)).bg(P.b1));
      }
      if (r.kind === "new" || r.kind === "space") {
        const label = r.kind === "new" ? "새 탭" : r.machine ? `${r.machine}에 새 스페이스` : "새 스페이스";
        return item(h_flex(), r, r.kind === "new" ? "gt-new" : `gt-space-${r.machine ?? "here"}`)
          .child(pic(u, r.kind === "new" ? "ico-chest" : "ico-crystal", 16))
          .child(div().flex_1().text_color(P.muted).child(label));
      }
      const who = r.mine.map((a) => a.program?.name ?? "agent").join(" · ");
      const here = r.w.active && r.ctx.active;
      const st = r.ctx.status;
      return item(h_flex(), r, `gt-${r.ctx.id}`)
        .child(st ? gem(u, st, `gtg-${r.ctx.id}`) : div().w(u(18)).flex_none())
        .child(div().flex_1().min_w(0).truncate().text_color(here ? P.gt : P.text).child(r.ctx.name))
        .when(st === "blocked", (x) => x.child(small(u, "입력 필요", P.blocked)))
        .when(st === "done", (x) => x.child(small(u, "완료", P.done)))
        .child(small(u, who + (r.team ? `  +${r.team}` : ""), P.dim));
    };
    const list = rows.map((r, i) => (visible(i) ? place(row(r), i) : null)).filter(Boolean);
    const search = h_flex().h(u(26)).flex_none().px(u(6)).gap(u(6)).items_center().bg(P.well).border(u(2)).border_color(P.b2)
      .child(pic(u, "ico-key", 16))
      .child(Input.new(this.input).flex_1().h_full().text_size(u(12)).text_color(P.text).bg(P.well).border_0());
    const body = v_flex().id("goto").track_focus(this.handle).size_full().min_h(0).gap(u(6))
      .on_key_down((e, cx) => {
        const k = e.key;
        if (k === "escape") return this.close();
        if (k === "down") this.at = (this.at + 1) % pickable.length;
        else if (k === "up") this.at = (this.at + pickable.length - 1) % pickable.length;
        else if (k === "d" && e.modifiers.control) {
          if (sel?.kind === "ctx") { this.close(); run("tab.close", { id: sel.ctx.id }); }
        } else return;
        cx.stop_propagation();
        cx.notify();
      })
      .child(bandHead(u, "찾기"))
      .child(search)
      .child(div().id("goto-rows").relative().flex_none().when(fixed, (el) => el.h(LIST_H).overflow_hidden())
        .on_scroll_wheel((e, cx) => {
          this.scroll = Math.max(0, Math.min(this.scroll - e.delta.y, maxScroll));
          // The selection follows the wheel, so the next frame doesn't scroll back to it.
          while (this.at < pickable.length - 1 && tops[rows.indexOf(pickable[this.at])] < this.scroll) this.at++;
          while (this.at > 0 && tops[rows.indexOf(pickable[this.at])] + hOf(pickable[this.at]) > this.scroll + LIST_H) this.at--;
          cx.notify();
        })
        .children(fixed ? list : [v_flex().children(list)]))
      .child(div().flex_1())
      .child(h_flex().gap(u(10)).items_center()
        .child(small(u, "↑↓ 고르기", P.gt2)).child(small(u, "Enter 이동", P.gt2)).child(small(u, "Ctrl+D 탭 닫기", P.gt2)).child(small(u, "Esc 닫기", P.gt2)));
    return root(u, div().size_full().on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .child(frame(u, "gold", body, { pad: [8, 10], floor: true, web: "br" }).size_full()));
  }
}
