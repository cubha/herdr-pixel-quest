// Pixel Quest changes panel. Modified from Herdr's shipped `changes` mod
// (Apache-2.0, Herdr 0.1.14): the same git status, diff and commit, drawn
// like the file panel ("소지품"): a bronze header, a stone floor under the
// list, pixel rows and buttons, Korean labels.

import { div } from "gpui-kit";
import { v_flex, h_flex, InputState, Input, Scrollbar, v_virtual_list } from "gpui-base";
import { spaces, panes, focused, exec, readTextFile, watchFolder, settings } from "herdr";
import { P, unit, root, small, button, texture, FLOOR, web } from "../kit.js";

function location() {
  const space = spaces().find((s) => s.active), f = focused();
  const pane = f?.pane ? panes().find(p => p.pane === f.pane) : null;
  const on = f?.pane === null ? (f.terminal?.includes("/") ? f.terminal.split("/")[0] : null) : space?.machine ?? null;
  return { cwd: pane?.cwd || f?.cwd || space?.folder, on };
}
const key = () => JSON.stringify(location());
// Reads write nothing under .git (no index refresh or lock, no fsmonitor cookie):
// the folder watch would see it, and every refresh would start the next one.
const READ = ["--no-optional-locks", "-c", "core.fsmonitor=false", "-c", "diff.autoRefreshIndex=false"];
const countLines = (text) => text ? text.split("\n").length - Number(text.endsWith("\n")) : 0;

// Numbers each diff line once, so a frame only draws the rows on screen.
function diffRows(lines) {
  let old = 0, next = 0;
  return lines.map((line) => {
    const match = /^@@ -(\d+)(?:,\d+)? \+(\d+)/.exec(line);
    if (match) { old = +match[1]; next = +match[2]; return { kind: "@", text: line }; }
    const kind = line[0];
    if (kind === "-") return { kind, number: old++, text: line.slice(1) || " " };
    if (kind === "+") return { kind, number: next++, text: line.slice(1) || " " };
    if (kind === " ") { old++; return { kind, number: next++, text: line.slice(1) || " " }; }
    return { kind: "", text: line };
  });
}

export default class Changes {
  init(_props, cx) {
    this.files = []; this.rows = []; this.diffWidth = 0; this.message = ""; this.handle = cx.focus_handle();
    this.input = InputState.new({ placeholder: "커밋 메시지" });
    this.input.on("change", (_e, cx) => {
      const hadMessage = Boolean(this.message.trim());
      this.message = this.input.value();
      if (hadMessage !== Boolean(this.message.trim())) cx.notify();
    });
    this.input.on("submit", (_e, cx) => this.commit(cx));
    this.input.on("focus", (_e, cx) => { this.typing = true; cx.notify(); });
    this.input.on("blur", (_e, cx) => { this.typing = false; cx.notify(); });
    this.refresh(cx);
    cx.timer.every(10000, (cx) => this.refresh(cx));
  }

  watch(root, cx) {
    if (this.on || this.watched === root) return;
    this.watched = root;
    cx.spawn(async (cx) => {
      try {
        while (this.watched === root) {
          await watchFolder(root);
          if (this.watched === root) this.refresh(cx);
        }
      } catch { this.watched = null; }
    });
  }

  refresh(cx) {
    if (this.loading || this.busy) return;
    const { cwd, on } = location(), context = key();
    if (context !== this.context) {
      this.context = context; this.root = null; this.files = []; this.open = null;
      this.setLines([]); this.message = ""; this.input.set_value(""); this.error = null; this.note = null; this.watched = null; this.closed = false; this.limited = false;
    }
    if (!cwd) return;
    this.loading = true;
    cx.spawn(async (cx) => {
      try {
        const top = await exec("git", ["rev-parse", "--show-toplevel"], { cwd, on });
        if (key() !== context) return;
        if (top.code !== 0) { this.root = null; this.files = []; this.setLines([]); this.open = null; this.error = "git 저장소가 아닙니다"; return; }
        const root = top.stdout.trim(), git = (args) => exec("git", [...READ, ...args], { cwd: root, on });
        const status = await git(["status", "--porcelain=v1", "-z", "--no-renames", "--untracked-files=all"]);
        if (status.code !== 0) throw new Error(status.stderr);
        const head = await git(["rev-parse", "--verify", "HEAD"]);
        const stats = {};
        const results = head.code === 0 ? [await git(["diff", "HEAD", "--numstat", "-z", "--no-renames"])] : [await git(["diff", "--cached", "--numstat", "-z", "--no-renames"]), await git(["diff", "--numstat", "-z", "--no-renames"])];
        for (const result of results) {
          if (result.code !== 0) throw new Error(result.stderr);
          for (const entry of result.stdout.split("\0")) {
            const [a, d, ...parts] = entry.split("\t");
            if (!parts.length) continue;
            const path = parts.join("\t"), old = stats[path] ?? { add: 0, del: 0 };
            stats[path] = { add: old.add + (Number(a) || 0), del: old.del + (Number(d) || 0), binary: a === "-" };
          }
        }
        const files = [];
        const entries = status.stdout.split("\0").filter(Boolean);
        for (const entry of entries.slice(0, 1000)) {
          const xy = entry.slice(0, 2), path = entry.slice(3), fresh = xy === "??";
          const conflict = xy.includes("U") || xy === "AA" || xy === "DD";
          const s = conflict ? "U" : xy.includes("D") ? "D" : fresh || xy.includes("A") ? "A" : "M";
          const stat = stats[path] ?? { add: 0, del: 0 };
          files.push({ path, status: s, fresh, ...stat });
        }
        if (key() !== context) return;
        this.root = root; this.on = on; this.hasHead = head.code === 0; this.files = files; this.limited = entries.length > 1000; this.error = null;
        this.watch(root, cx);
        if (this.open && !files.some((f) => f.path === this.open)) { this.open = null; this.setLines([]); }
        // The first file's diff shows until you pick another.
        if (!this.open && !this.closed && files.length) this.open = files[0].path;
        if (this.open) {
          try { await this.load(this.open, context); }
          catch { if (key() === context) this.setLines(["이 변경은 미리 볼 수 없습니다(너무 크거나 읽을 수 없음)"]); }
        }
      } catch (e) { if (key() === context) this.error = String(e); }
      finally { this.loading = false; cx.notify(); }
    });
  }

  async load(path, context) {
    const file = this.files.find((f) => f.path === path), root = this.root, on = this.on;
    if (!file) return;
    let lines;
    if (file.fresh || (!this.hasHead && file.status === "A")) {
      const text = await readTextFile(`${root}/${path}`, { on }).catch(() => null);
      if (text === null) lines = ["이 파일은 미리 볼 수 없습니다(바이너리·너무 큼·읽을 수 없음)"];
      else if (text.includes("\0")) lines = ["바이너리 파일 · 글자 비교 없음"];
      else {
        file.add = countLines(text);
        lines = [`@@ -0,0 +1,${file.add} @@`, ...text.slice(0, 400000).replace(/\n$/, "").split("\n").slice(0, 1500).map(l => `+${l}`)];
      }
    } else {
      const r = await exec("git", [...READ, "diff", ...(this.hasHead ? ["HEAD"] : []), "--no-ext-diff", "--no-textconv", "--no-color", "--", path], { cwd: root, on });
      if (r.code !== 0) throw new Error(r.stderr);
      const all = r.stdout.replace(/\n$/, "").split("\n"), first = all.findIndex((l) => l.startsWith("@@"));
      lines = first < 0 ? [file.binary ? "바이너리 파일이 바뀜" : "글자 비교 없음"] : all.slice(first);
    }
    if (key() === context && this.open === path) this.setLines(lines.slice(0, 1500).map(line => line.length > 4000 ? line.slice(0, 4000) + "… (줄 잘림)" : line));
  }

  setLines(lines) {
    this.rows = diffRows(lines);
    this.diffWidth = Math.max(300, ...lines.map(line => line.length * 7 + 50));
  }

  pick(path, cx) {
    this.open = this.open === path ? null : path; this.setLines([]); this.note = null;
    this.closed = !this.open;
    const context = this.context;
    if (this.open) cx.spawn(async (cx) => {
      try { await this.load(path, context); }
      catch (e) { if (key() === context && this.open === path) this.note = `이 변경은 미리 볼 수 없습니다: ${e}`; }
      cx.notify();
    });
    cx.notify();
  }

  commit(cx) {
    if (!this.message.trim() || !this.root || this.busy || this.loading || this.context !== key()) return;
    const root = this.root, on = this.on, context = this.context, message = this.message.trim();
    this.busy = true; this.note = null;
    cx.spawn(async (cx) => {
      try {
        for (const args of [["add", "-A"], ["commit", "-m", message]]) {
          const r = await exec("git", args, { cwd: root, on });
          if (r.code !== 0) throw new Error((r.stderr || r.stdout).trim());
        }
        if (key() === context) { this.message = ""; this.input.set_value(""); }
      } catch (e) { if (key() === context) this.note = `커밋 실패: ${e}`; }
      finally { this.busy = false; this.refresh(cx); cx.notify(); }
    });
    cx.notify();
  }

  diffRow({ kind, number, text }, u) {
    if (kind === "@") return div().w_full().px(u(12)).h(u(20)).flex_none().truncate().bg(P.raised).text_color(P.dim).child(text);
    return h_flex().w_full().h(u(20)).flex_none().gap(u(10)).when(kind === "+", (e) => e.bg(P.done + "30")).when(kind === "-", (e) => e.bg(P.blocked + "30"))
      .child(div().w(u(30)).flex_none().text_right().text_color(P.dim).child(number === undefined ? "" : String(number)))
      .child(div().flex_1().min_w(0).truncate().child(text));
  }

  render(cx) {
    if (key() !== this.context) this.refresh(cx);
    const u = unit();
    const add = this.files.reduce((n, f) => n + f.add, 0), del = this.files.reduce((n, f) => n + f.del, 0);
    const enabled = Boolean(this.message.trim() && this.root && !this.busy && !this.loading);
    const tone = (s) => (s === "A" ? P.done : s === "D" || s === "U" ? P.blocked : P.warn);
    const head = h_flex().h(u(28)).flex_none().px(u(6)).gap(u(6)).items_center().bg(P.b1).border_b(u(2)).border_color(P.ink)
      .child(div().flex_none().text_color(P.g3).child("변경"))
      .child(div().border(u(2)).border_color(P.b2).px(u(4)).child(small(u, `${this.files.length}개`, P.onb)))
      .child(div().flex_1())
      .child(small(u, `+${add}`, P.done)).child(small(u, `−${del}`, P.blocked));
    const list = div().flex_1().min_h(u(44)).max_h(u(this.files.length * 28 + 12)).relative().overflow_hidden().border_b(u(2)).border_color(P.ink)
      .child(texture(u, ...FLOOR))
      .child(v_flex().id("changes-list").absolute().inset_0().overflow_y_scroll().p(u(4)).children(this.files.map((f) => {
        const parts = f.path.split("/"), name = parts.pop(), on = this.open === f.path;
        return h_flex().id(`change-${f.path}`).h(u(28)).flex_none().px(u(6)).gap(u(8)).items_center().cursor_pointer()
          .border(u(2)).border_color(on ? P.b2 : "#00000000").when(on, (e) => e.bg(P.raised)).hover((s) => s.bg(P.hover))
          .on_click((_e, cx) => this.pick(f.path, cx))
          .child(div().w(u(14)).child(small(u, f.status, tone(f.status))))
          .child(h_flex().flex_1().min_w(0).child(div().truncate().child(small(u, parts.length ? parts.join("/") + "/" : "", P.dim))).child(div().max_w(u(260)).min_w(0).truncate().text_color(on ? P.gt : P.text).child(name)))
          .when(f.add > 0, (e) => e.child(small(u, `+${f.add}`, P.done))).when(f.del > 0, (e) => e.child(small(u, `−${f.del}`, P.blocked)));
      })).when(!this.files.length, (e) => e.child(small(u, this.error || (this.loading ? "변경을 읽는 중…" : this.root ? "커밋하지 않은 변경 없음" : "폴더 없음")).p(u(8)))))
      .child(Scrollbar.vertical("changes-list").absolute().inset_0())
      .child(web(u, "br"));
    return root(u, v_flex().id("changes").size_full().min_h(0).overflow_hidden().bg(P.fill).border(u(2)).border_color(P.ink).track_focus(this.handle)
      .on_key_down((e, cx) => {
        if (e.key === "escape" && this.typing) { this.typing = false; this.handle.focus(); cx.stop_propagation(); cx.notify(); }
      })
      .child(head)
      .child(list)
      .when(this.limited, el => el.child(small(u, "바뀐 파일 1,000개까지만 보여 줍니다").px(u(12)).py(u(4))))
      .child(div().flex_1().min_h(0).relative().bg(P.well).font_family(settings().font_family ?? "GalmuriMono11").text_size(u(11))
        .child(div().id("changes-diff-x").size_full().overflow_x_scrollbar()
          .child(div().w_full().min_w(this.diffWidth).h_full().child(v_virtual_list("changes-diff", this.rows.length, u(20), (i) => String(i),
            (range) => this.rows.slice(range.start, range.end).map((row) => this.diffRow(row, u))).size_full())))
        .child(Scrollbar.vertical("changes-diff").viewport_from_layout().absolute().inset_0())
        .when(!this.open && this.files.length > 0, (e) => e.child(small(u, "파일을 고르면 바뀐 내용이 보입니다").absolute().top(u(6)).px(u(12)))))
      .when(Boolean(this.note), (e) => e.child(small(u, this.note, P.blocked).px(u(10)).pb(u(8))))
      .child(h_flex().flex_none().p(u(6)).gap(u(6)).items_center().bg(P.b1).border_t(u(2)).border_color(P.ink)
        .child(div().id("commit-message").flex_1().min_w(0).h(u(24)).px(u(6)).flex().items_center().bg(P.well).border(u(2)).border_color(this.typing ? P.g2 : P.b2).cursor_text()
          .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
          .child(Input.new(this.input).h_full().text_size(u(12)).text_color(P.text).bg(P.well).border_0()))
        .child(button(u, "commit", small(u, this.busy ? "커밋 중…" : "커밋", enabled ? P.text : P.dim), (_e, cx) => this.commit(cx), { pad: [2, 10] }))));
  }
}
