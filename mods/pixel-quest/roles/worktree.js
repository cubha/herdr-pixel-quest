// The theme's worktree window, in place of Herdr's `worktree` dialog when opened
// from the theme (the space menu's 새 워크트리 / 워크트리 열기 / 워크트리 지우기 and
// the + menu): props { space, folder?, action: "new" | "open" | "remove" } or
// { folder, machine }, optional { branch, tab, argv }. The git work is Herdr's,
// unchanged; the window is drawn in the theme, in Korean.
// Modified from Herdr's shipped `worktree` mod (Apache-2.0, Herdr 0.1.14).

import { div } from "gpui-kit";
import { v_flex, h_flex, InputState, Input, Scrollbar } from "gpui-base";
import { run, props, closeOverlay, spaces, panes, exec, home } from "herdr";
import { P, unit, root, frame, small, bandHead, pic, cursor, button } from "../kit.js";
import { wtSlug, ago, tilde } from "../dialogs.js";

// Where a space is now: its first terminal's live folder, else where it was made.
function place(s, all = panes()) {
  if (!s) return null;
  const tabs = new Set((s.tabs ?? []).map((c) => c.id));
  return all.find((p) => tabs.has(p.tab) && p.cwd)?.cwd || s.folder || null;
}

// Checkouts go to <ROOT>/<repo>/<branch, slashes as dashes>.
const ROOT = (home) => `${home}/.herdr/worktrees`;
// Every checkout of a repo (`git worktree list`), the main one first, then
// the most recently committed: { path, branch, main, at }.
async function checkouts(repo, on) {
  const list = await git(repo.main, ["worktree", "list", "--porcelain"], on);
  if (!list.ok) return [];
  const refs = await git(repo.main, ["for-each-ref", "--format=%(refname:short)%09%(committerdate:unix)", "refs/heads"], on);
  const when = new Map(refs.out.split("\n").map((l) => l.split("\t")).map(([b, at]) => [b, Number(at) || 0]));
  const out = [];
  for (const block of list.out.split(/\n\n+/)) {
    const lines = block.split("\n");
    const path = lines.find((l) => l.startsWith("worktree "))?.slice(9);
    if (!path || lines.some((l) => l === "bare" || l.startsWith("prunable"))) continue;
    const branch = lines.find((l) => l.startsWith("branch "))?.slice(7).replace(/^refs\/heads\//, "") ?? null;
    out.push({ path, branch, main: out.length === 0, at: branch ? (when.get(branch) ?? 0) : 0 });
  }
  return out.sort((a, b) => b.main - a.main || b.at - a.at);
}

// The space showing a checkout: its first terminal is in it (the deepest checkout wins).
function spaceOf(path, all, on, spaceList, paneList) {
  const inside = (p, dir) => p === dir || p.startsWith(dir + "/");
  return spaceList.find((s) => (s.machine ?? null) === (on ?? null) && (() => {
    const at = place(s, paneList)?.replace(/\\/g, "/");
    if (!at || !inside(at, path)) return false;
    return !all.some((c) => c.path !== path && c.path.length > path.length && inside(at, c.path));
  })());
}

async function git(cwd, args, on, timeout) {
  const r = await exec("git", args, { cwd, on, ...(timeout === undefined ? {} : { timeout }) });
  return { ok: r.code === 0, out: (r.stdout ?? "").trim(), err: (r.stderr ?? r.stdout ?? "").trim() };
}

// The submodule repos git keeps for a checkout (nested ones too, checked out
// or not): { name, dir, pinned }. `config` is the args that read its
// .gitmodules; `pinned` is the commit its parent records ("" if none).
async function modules(gitDir, config, on, out = [], parent = "") {
  const keys = await git(gitDir, ["--git-dir", gitDir, "config", ...config, "-z", "--get-regexp", "^submodule\\..*\\.path$"], on);
  if (!keys.ok) return out; // no .gitmodules, or no submodules in it
  // -z: "key\nvalue" records ended by NUL, so names and paths may hold spaces.
  for (const record of keys.out.split("\0").filter(Boolean)) {
    const at = record.indexOf("\n");
    const name = record.slice("submodule.".length, at - ".path".length);
    const dir = `${gitDir}/modules/${name}`;
    if (!(await git(gitDir, ["--git-dir", dir, "rev-parse", "--git-dir"], on)).ok) continue; // never checked out
    const pinned = await git(gitDir, ["--git-dir", gitDir, "rev-parse", `HEAD:${record.slice(at + 1)}`], on);
    // Names are only unique within their parent: nested ones carry its name.
    out.push({ name: parent + name, dir, pinned: pinned.ok ? pinned.out : "" });
    if ((await git(gitDir, ["--git-dir", dir, "cat-file", "-e", "HEAD:.gitmodules"], on)).ok) await modules(dir, ["--blob", "HEAD:.gitmodules"], on, out, `${parent + name}/`);
  }
  return out;
}

// The worktree's submodules, and the names of those with commits that exist
// nowhere else: not on a remote, and not the commit the parent pins (git
// fetches that by hash, so it is often on no remote branch here).
async function submodules(top, on) {
  const gitDir = await git(top, ["rev-parse", "--absolute-git-dir"], on);
  if (!gitDir.ok) throw new Error(gitDir.err || "git rev-parse failed.");
  const mods = await modules(gitDir.out, ["--file", `${top}/.gitmodules`], on);
  const unpushed = [];
  for (const m of mods) {
    const local = await git(gitDir.out, ["--git-dir", m.dir, "rev-list", "-n1", "--all", "--not", "--remotes", ...(m.pinned ? [m.pinned] : [])], on);
    if (!local.ok) throw new Error(local.err || `Couldn't check submodule ${m.name}.`);
    if (local.out) unpushed.push(m.name);
  }
  return { mods, unpushed };
}

// The repo a folder belongs to: its main checkout and name, and whether
// the folder is itself a linked worktree. null outside git.
async function repoOf(folder, on) {
  const top = await git(folder, ["rev-parse", "--show-toplevel"], on);
  const common = await git(folder, ["rev-parse", "--path-format=absolute", "--git-common-dir"], on);
  if (!top.ok || !common.ok) return null;
  const main = common.out.endsWith("/.git") ? common.out.slice(0, -5) : common.out;
  return { top: top.out, main, name: main.split("/").pop(), linked: main !== top.out };
}

export default class Worktree {
  init(_p, cx) {
    this.on = this.space()?.machine;
    this.userHome = this.on ? null : home();
    this.opening = props()?.action === "open";
    this.text = props()?.branch ?? "";
    this.list = undefined; // open: the checkouts, once read
    this.at = 0;
    this.input = InputState.new({ value: this.text, placeholder: this.opening ? "브랜치나 폴더로 찾기…" : "브랜치 이름" });
    this.input.on("change", (_e, cx) => { this.text = this.input.value(); this.error = ""; this.at = 0; cx.notify(); });
    this.input.on("submit", (_e, cx) => this.go(cx));
    this.inputFocused = true;
    this.input.on("focus", (_e, cx) => { this.inputFocused = true; cx.notify(); });
    this.input.on("blur", (_e, cx) => { this.inputFocused = false; cx.notify(); });
    if (props()?.action !== "remove") {
      this.input.focus();
      cx.timer.after(600, () => this.input.focus());
    }
    this.busy = false;
    this.error = "";
    this.repo = undefined; // undefined: looking, null: not in git
    this.dirty = false;
    this.unpushed = [];
    this.handle = cx.focus_handle();
    if (props()?.action === "remove") this.handle.focus();
    cx.spawn(async (cx) => {
      try {
        if (this.on) {
          let result;
          try { result = await exec("sh", ["-c", 'printf %s "$HOME"'], { on: this.on }); } catch {}
          if (!result || result.code !== 0 || !result.stdout.trim()) result = await exec("powershell.exe", ["-NoProfile", "-Command", "[Console]::Write($HOME)"], { on: this.on });
          if (result.code !== 0 || !result.stdout.trim()) throw new Error("원격 머신의 홈 폴더를 찾지 못했습니다.");
          this.userHome = result.stdout.trim().replace(/\\/g, "/");
        }
        this.folder = props()?.folder || place(this.space()) || this.userHome;
        // The repo is set last: Enter does nothing until the warnings it consents to are known.
        const repo = await repoOf(this.folder, this.on);
        if (repo && props()?.action === "remove") {
          this.dirty = (await git(repo.top, ["--no-optional-locks", "-c", "core.fsmonitor=false", "status", "--porcelain"], this.on)).out !== "";
          this.unpushed = (await submodules(repo.top, this.on)).unpushed;
        }
        if (repo && this.opening) this.list = await checkouts(repo, this.on);
        this.repo = repo;
        cx.notify();
        if (props()?.branch) await this.work(cx);
      } catch (error) { this.repo = null; this.error = String(error); cx.notify(); }
    });
  }

  space() {
    const p = props() ?? {};
    return spaces().find((s) => s.id === p.space) ?? (p.folder ? { folder: p.folder, machine: p.machine ?? null, name: "" } : undefined);
  }

  close() {
    closeOverlay(props()?.overlay);
  }

  go(cx) {
    if (this.busy || !this.repo) return;
    cx.spawn(async (cx) => this.work(cx));
  }

  async work(cx) {
    if (this.busy || !this.repo) return;
    this.busy = true;
    this.error = "";
    cx.notify();
    try { this.error = props()?.action === "remove" ? await this.remove() : await this.create(); }
    catch (error) { this.error = String(error); }
    this.busy = false;
    if (!this.error) this.close();
    cx.notify();
  }

  async create() {
    const branch = this.text.trim();
    if (!branch) return "브랜치 이름을 적어 주세요.";
    const path = `${ROOT(this.userHome)}/${this.repo.name}/${wtSlug(branch)}`;
    const exists = (await git(this.repo.main, ["show-ref", "--verify", "--quiet", `refs/heads/${branch}`], this.on)).ok;
    const add = exists ? ["worktree", "add", path, branch] : ["worktree", "add", "-b", branch, path, "HEAD"];
    const r = await git(this.repo.top, add, this.on, 600_000);
    if (!r.ok) return r.err || "git worktree add failed.";
    const p = props() ?? {};
    // Leave spaces unnamed so they follow the checkout folder and nest under the repo.
    run("space.new", { folder: path, machine: this.on, tab: p.tab, argv: p.argv });
    return "";
  }

  shown() {
    const f = this.text.trim().toLowerCase();
    return (this.list ?? []).filter((c) => !f || `${c.branch ?? ""} ${c.path}`.toLowerCase().includes(f));
  }

  open(c) {
    if (!c) return;
    this.close();
    const s = spaceOf(c.path, this.list, this.on, spaces(), panes());
    if (s) run("space.select", { id: s.id });
    else run("space.new", { folder: c.path, machine: this.on });
  }

  async remove() {
    const s = this.space();
    const status = await git(this.repo.top, ["--no-optional-locks", "-c", "core.fsmonitor=false", "status", "--porcelain"], this.on);
    if (!status.ok) return status.err || "git status failed.";
    // git refuses a worktree with submodules unless forced, because their
    // history goes with it. The popup already showed what's at risk; only
    // risk that appeared since it opened gets one more warning.
    const { mods, unpushed } = await submodules(this.repo.top, this.on);
    const changed = (status.out && !this.dirty) || unpushed.some((name) => !this.unpushed.includes(name));
    this.dirty ||= status.out !== "";
    this.unpushed = [...new Set([...this.unpushed, ...unpushed])];
    if (changed) return "창을 연 뒤에 바뀌었습니다. Enter를 한 번 더 누르면 그래도 지웁니다.";
    // Terminals first: a shell sitting in the folder keeps it busy on Windows.
    if (!s?.id) return "지울 스페이스가 없습니다.";
    run("space.close", { id: s.id, confirmed: true });
    const force = this.dirty || mods.length > 0;
    const r = await git(this.repo.main, ["worktree", "remove", ...(force ? ["--force"] : []), this.repo.top], this.on, 600_000);
    return r.ok ? "" : r.err || "git worktree remove failed.";
  }

  key(e, cx) {
    if (e.key === "escape") return this.close();
    if (this.opening) {
      const n = this.shown().length;
      if (e.key === "enter") this.open(this.shown()[this.at]);
      else if ((e.key === "down" || e.key === "up") && n) this.at = (this.at + (e.key === "down" ? 1 : n - 1)) % n;
      else return;
      cx.stop_propagation();
      return cx.notify();
    }
    if (e.key === "enter" && props()?.action === "remove") return this.go(cx);
  }

  // The window: gold frame on the stone floor, a band head, the body, a key line.
  shell(u, title, body, keysLine) {
    return root(u, div().id("worktree").size_full().track_focus(this.handle)
      .on_key_down((e, cx) => this.key(e, cx))
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .child(frame(u, "gold", v_flex().size_full().min_h(0).gap(u(6))
        .child(bandHead(u, title).mx(u(-10)).mt(u(-8)))
        .child(body)
        .child(h_flex().flex_none().gap(u(6)).items_center().justify_end()
          .when(this.busy, (el) => el.child(div().text_color(P.gt).frames(["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"], 90).child("⠋")))
          .child(small(u, keysLine, P.gt2))),
      { pad: [8, 10], floor: true, web: "br" }).size_full()));
  }

  field(u, icon) {
    return h_flex().h(u(26)).flex_none().px(u(6)).gap(u(6)).items_center().bg(P.well).border(u(2)).border_color(this.inputFocused ? P.b2 : P.b1)
      .child(pic(u, icon, 16))
      .child(Input.new(this.input).flex_1().h_full().text_size(u(12)).text_color(P.text).bg(P.well).border_0());
  }

  renderOpen(u) {
    const r = this.repo;
    const rows = this.shown();
    const all = this.list ?? [];
    const spaceList = spaces();
    const paneList = panes();
    const row = (c, i) => {
      const on = i === this.at;
      const there = spaceOf(c.path, all, this.on, spaceList, paneList);
      return v_flex().id(`wt-${i}`).relative().flex_none().h(u(40)).pl(u(20)).pr(u(6)).justify_center().cursor_pointer()
        .border(u(2)).border_color(on ? P.b2 : "#00000000").when(on, (x) => x.bg(P.raised))
        .hover((s) => s.bg(P.hover))
        .on_click(() => this.open(c))
        .when(on, (x) => x.child(cursor(u).absolute().top(u(10)).left(u(0))))
        .child(h_flex().gap(u(8)).items_center()
          .child(div().flex_1().min_w(0).truncate().text_color(on ? P.gt : P.text).child(c.branch ?? "(브랜치 없음)"))
          .when(c.main, (el) => el.child(small(u, "본 저장소", P.dim)))
          .when(Boolean(there), (el) => el.child(small(u, "열려 있음", P.done)))
          .when(!there && c.at > 0, (el) => el.child(small(u, ago(c.at), P.dim))))
        .child(div().truncate().child(small(u, tilde(c.path, this.userHome ?? ""), P.muted)));
    };
    const count = rows.length === all.length ? `${all.length}개` : `${rows.length}/${all.length}개`;
    const body = v_flex().flex_1().min_h(0).gap(u(6))
      .child(h_flex().flex_none().gap(u(6)).items_center()
        .child(div().flex_1().min_w(0).truncate().text_color(P.gt).child(r ? `${r.name}의 워크트리` : "워크트리"))
        .child(small(u, r && this.list ? count : "", P.dim)))
      .when(r === undefined || (r && this.list === undefined), (el) => el.child(small(u, "찾는 중…", P.muted)))
      .when(r === null, (el) => el.child(small(u, `${this.folder ? tilde(this.folder, this.userHome ?? "") : "이 폴더"}는 git 저장소가 아닙니다.`, P.muted)))
      .when(Boolean(r && this.list), (el) => el
        .child(this.field(u, "ico-key"))
        .child(div().relative().flex_1().min_h(0)
          .child(v_flex().id("wt-list").size_full().overflow_y_scroll().pr(u(8))
            .children(rows.map(row))
            .when(rows.length === 0, (el) => el.child(div().p(u(8)).child(small(u, "맞는 워크트리가 없습니다", P.muted)))))
          .child(Scrollbar.vertical("wt-list").absolute().inset_0())));
    return this.shell(u, "워크트리 열기", body, "↑↓ 고르기   Enter 열기   Esc 닫기");
  }

  render() {
    const u = unit();
    if (this.opening) return this.renderOpen(u);
    const remove = props()?.action === "remove";
    const s = this.space();
    const r = this.repo;
    const title = remove ? "워크트리 지우기" : "새 워크트리";
    const what = remove ? `"${s?.name ?? ""}" 워크트리를 지울까요?` : r ? `${r.name}에 새 워크트리` : "새 워크트리";
    const detail =
      r === undefined
        ? "찾는 중…"
        : r === null
          ? `${this.folder ? tilde(this.folder, this.userHome) : "이 폴더"}는 git 저장소가 아닙니다.`
          : remove
            ? !r.linked
              ? "저장소의 본 체크아웃이라 워크트리가 아닙니다."
              : `스페이스를 닫고 ${tilde(r.top, this.userHome)} 폴더를 지웁니다. 브랜치는 남습니다.`
            : `${tilde(ROOT(this.userHome), this.userHome)}/${r.name}/ 아래에 체크아웃하고 새 스페이스로 엽니다. 있는 브랜치는 그대로, 없는 브랜치는 지금 위치에서 만듭니다.`;
    const blocked = !r || (remove && !r.linked);
    const body = v_flex().flex_1().min_h(0).gap(u(6))
      .child(div().text_color(P.gt).child(what))
      .child(small(u, detail, P.muted))
      .when(remove && this.dirty, (el) => el.child(small(u, "커밋하지 않은 변경이 있습니다: 함께 사라집니다.", P.blocked)))
      .when(remove && this.unpushed.length > 0, (el) => el.child(small(u, `하위 모듈 ${this.unpushed.join(", ")}에 어디에도 올리지 않은 커밋이 있습니다: 함께 사라집니다.`, P.blocked)))
      .when(!remove && !blocked, (el) => el.child(this.field(u, "ico-scroll")))
      .when(Boolean(this.error), (el) => el.child(small(u, this.error, P.blocked)))
      .child(div().flex_1())
      .when(!blocked, (el) => el.child(h_flex().flex_none().gap(u(8)).justify_end()
        .child(button(u, "wt-no", small(u, "취소", P.text), () => this.close(), { pad: [2, 10] }))
        .child(remove
          ? button(u, "wt-yes", small(u, "지우기", P.g4), (_e, cx) => this.go(cx), { pad: [2, 10], red: true })
          : button(u, "wt-yes", small(u, "만들기", P.g4), (_e, cx) => this.go(cx), { pad: [2, 10], on: true }))));
    const keysLine = this.busy ? "작업 중…" : blocked ? "Esc 닫기" : remove ? "Enter 지우기   Esc 취소" : "Enter 만들기   Esc 취소";
    return this.shell(u, title, body, keysLine);
  }
}
