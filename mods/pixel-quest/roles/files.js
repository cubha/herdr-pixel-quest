// Pixel Quest file panel. Modified from Herdr's shipped `files` mod
// (Apache-2.0, Herdr 0.1.14): restyled as an inventory list, and a search box
// with two modes: 이름 (file names in the folder, git's list when it is a repo)
// and 내용 (text inside files, git grep / grep / Select-String).
// Click a result to preview it; a content hit shows its line number.

import { div, svg } from "gpui-kit";
import { v_flex, h_flex, Editor, EditorState, InputState, Input } from "gpui-base";
import { spaces, panes, focused, exec, readTextFile, watchFolder, theme, settings, window } from "herdr";
import { P, unit, root, small, button, frame, texture, FLOOR } from "../kit.js";

const ICON = (n) => `mods/pixel-quest/icons/${n}.svg`;
const MAX_FILES = 20000, MAX_HITS = 300, SHOW = 200;

// Text for a PowerShell command line as base64 of its UTF-8 bytes, decoded inside the
// script: no quote in a folder name or a search word can end the string early.
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function b64(text) {
  const bytes = [];
  for (const ch of String(text)) {
    const c = ch.codePointAt(0);
    if (c < 0x80) bytes.push(c);
    else if (c < 0x800) bytes.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else bytes.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (i + 1 < bytes.length ? B64[(n >> 6) & 63] : "=") + (i + 2 < bytes.length ? B64[n & 63] : "=");
  }
  return out;
}
const psText = (text) => `([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${b64(text)}')))`;

function location() {
  const space = spaces().find(s => s.active), f = focused();
  const pane = f?.pane ? panes().find(p => p.pane === f.pane) : null;
  const on = f?.pane === null ? (f.terminal?.includes("/") ? f.terminal.split("/")[0] : null) : space?.machine ?? null;
  return { cwd: pane?.cwd || f?.cwd || space?.folder, on, space: space?.id };
}
const key = () => JSON.stringify(location());
const LANG = { ts: "js", tsx: "js", mts: "js", cts: "js", jsx: "js", mjs: "js", toml: "yaml", jsonc: "json", svelte: "html", vue: "html" };
const PER_FOLDER = 500, TOTAL = 5000;

async function directory(path, on) {
  const windowsDirectory = async () => {
    // Windows PowerShell otherwise uses the console code page; exec decodes UTF-8.
    // Links keep directory attributes even when dangling; check their target.
    // Other reparse points (OneDrive's folders) have no LinkType and are folders.
    // PowerShell reads curly single quotes as quotes too, so they're doubled like '.
    const r = await exec("powershell", ["-NoProfile", "-Command", "[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); & { param($p) @(Get-ChildItem -LiteralPath $p -Force -ErrorAction Stop | Where-Object Name -ne '.git' | Select-Object -First 501 | ForEach-Object { @{ name=$_.Name; dir=($_.PSIsContainer -and (-not ($_.Attributes -band [IO.FileAttributes]::ReparsePoint) -or -not $_.LinkType -or ($_.Target -and [IO.Directory]::Exists(([IO.Path]::Combine([IO.Path]::GetDirectoryName($_.FullName), $_.Target[0])))))) } }) | ConvertTo-Json -Compress } '" + path.replace(/['‘’‚‛]/g, "$&$&") + "'"], { on });
    if (r.code !== 0) throw new Error(r.stderr || "Cannot list this folder");
    const result = JSON.parse(r.stdout || "[]");
    return Array.isArray(result) ? result : [result];
  };
  if (!on && window()?.platform === "windows") return windowsDirectory();
  const script = 'n=0; for p in "$1"/* "$1"/.[!.]* "$1"/..?*; do [ -e "$p" ] || [ -L "$p" ] || continue; name=${p##*/}; [ "$name" = .git ] && continue; if [ -d "$p" ]; then kind=d; else kind=f; fi; printf "%s\\0%s\\0" "$kind" "$name"; n=$((n+1)); [ "$n" -gt 500 ] && break; done; test -d "$1"';
  let r;
  try { r = await exec("sh", ["-c", script, "files", path], { on }); }
  catch (e) {
    if (on && String(e).includes("cannot start sh: program not found")) return windowsDirectory();
    throw e;
  }
  if (r.code !== 0) throw new Error(r.stderr || "Cannot list this folder");
  const fields = r.stdout.split("\0"), out = [];
  for (let i = 0; i + 1 < fields.length; i += 2) out.push({ name: fields[i + 1], dir: fields[i] === "d" });
  return out;
}


// Every file under root, relative paths with "/". Git's list (tracked + untracked,
// ignored left out) in a repo, else a bounded walk that skips .git and node_modules.
async function allFiles(root, on) {
  const git = await exec("git", ["-c", "core.quotepath=off", "-c", "core.fsmonitor=false", "ls-files", "-z", "-co", "--exclude-standard"], { cwd: root, on, timeout: 20000 }).catch(() => null);
  if (git?.code === 0) return git.stdout.split("\0").filter(Boolean).slice(0, MAX_FILES);
  if (!on && window()?.platform === "windows") {
    const r = await exec("powershell", ["-NoProfile", "-Command", "[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); $p = " + psText(root) + "; $n=$p.TrimEnd('\\').Length+1; Get-ChildItem -LiteralPath $p -Recurse -File -Force -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch '\\\\(\\.git|node_modules)\\\\' } | Select-Object -First " + MAX_FILES + " | ForEach-Object { $_.FullName.Substring($n).Replace('\\','/') }"], { on, timeout: 30000 });
    return r.stdout.split(/\r?\n/).filter(Boolean);
  }
  const r = await exec("sh", ["-c", 'cd "$1" && find . \\( -name .git -o -name node_modules \\) -prune -o -type f -print | head -n ' + MAX_FILES, "files", root], { on, timeout: 30000 });
  return r.stdout.split("\n").filter(Boolean).map((p) => p.replace(/^\.\//, ""));
}

// Lines containing q (any case): [{ path, line, text }].
async function grepText(root, on, q) {
  const parse = (out) => out.split(/\r?\n/).filter(Boolean).slice(0, MAX_HITS).map((l) => {
    const m = l.match(/^(.*?)[:\0](\d+)[:\0](.*)$/);
    return m ? { path: m[1].replace(/\\/g, "/").replace(/^\.\//, ""), line: Number(m[2]), text: m[3].trim().slice(0, 200) } : null;
  }).filter(Boolean);
  const git = await exec("git", ["-c", "core.quotepath=off", "-c", "core.fsmonitor=false", "grep", "-n", "-I", "-i", "-F", "-z", "--untracked", "--max-count=20", "-e", q], { cwd: root, on, timeout: 20000 }).catch(() => null);
  if (git && (git.code === 0 || git.code === 1)) return parse(git.stdout);
  if (!on && window()?.platform === "windows") {
    const r = await exec("powershell", ["-NoProfile", "-Command", "[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); $p = " + psText(root) + "; $q = " + psText(q) + "; $n=$p.TrimEnd('\\').Length+1; Get-ChildItem -LiteralPath $p -Recurse -File -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch '\\\\(\\.git|node_modules)\\\\' -and $_.Length -lt 2MB } | Select-String -SimpleMatch -Pattern $q -ErrorAction SilentlyContinue | Select-Object -First " + MAX_HITS + " | ForEach-Object { $_.Path.Substring($n) + ':' + $_.LineNumber + ':' + $_.Line }"], { on, timeout: 30000 });
    return parse(r.stdout);
  }
  const r = await exec("sh", ["-c", 'cd "$1" && grep -rnIiF --exclude-dir=.git --exclude-dir=node_modules -m 20 -e "$2" . | head -n ' + MAX_HITS, "files", root, q], { on, timeout: 30000 });
  return parse(r.stdout);
}

// Name matches, best first: name starts with q, name contains q, path contains q,
// then the letters of q in order anywhere in the path.
function rank(files, q) {
  const s = q.toLowerCase(), out = [];
  for (const p of files) {
    const lp = p.toLowerCase(), name = lp.slice(lp.lastIndexOf("/") + 1);
    let score = name.startsWith(s) ? 0 : name.includes(s) ? 1 : lp.includes(s) ? 2 : -1;
    if (score < 0) {
      let i = 0;
      for (const ch of lp) if (ch === s[i]) i++;
      if (i < s.length) continue;
      score = 3;
    }
    out.push([score, p.length, p]);
    if (out.length > 5000) break;
  }
  return out.sort((a, b) => a[0] - b[0] || a[1] - b[1]).slice(0, SHOW).map((x) => x[2]);
}

export default class Files {
  init(_props, cx) {
    this.mode = "name"; this.query = ""; this.hits = null; this.list = null; this.searching = false; this.line = null;
    this.input = InputState.new({ placeholder: "파일 찾기" });
    this.input.on("change", (_e, cx) => { this.query = this.input.value().trim(); this.search(cx); });
    this.saved = new Map();
    this.entries = new Map(); this.folders = new Set(); this.pending = new Set(); this.marks = {};
    this.refresh(cx);
    cx.timer.every(10000, cx => this.refresh(cx));
  }

  watch(root, cx) {
    if (this.on || this.watched === root) return;
    this.watched = root;
    const context = this.context;
    cx.spawn(async cx => {
      try { while (this.context === context) { await watchFolder(root); if (this.current(context)) this.refresh(cx); } }
      catch { if (this.context === context) this.watched = null; }
    });
  }

  current(context) {
    return this.context === context && key() === context.key;
  }

  async loadFolder(path, context) {
    const { on, cwd: root } = context;
    const entries = await directory(path ? `${root}/${path}` : root, on);
    if (!this.current(context) || (path && !this.folders.has(path))) return;
    const used = [...this.entries.entries()].filter(([p]) => p !== path).reduce((n, [, e]) => n + e.length, 0);
    this.entries.set(path, entries.slice(0, Math.max(0, Math.min(PER_FOLDER, TOTAL - used))).sort((a, b) => Number(b.dir) - Number(a.dir) || a.name.localeCompare(b.name)));
    if (entries.length > PER_FOLDER || used + entries.length > TOTAL) this.limited = true;
  }

  refresh(cx) {
    const { cwd, on } = location(), next = key();
    if (next !== this.context?.key) {
      if (this.context) this.saved.set(this.context.key, { folders: this.folders, file: this.file });
      const saved = this.saved.get(next);
      this.context = { key: next, cwd, on }; this.root = cwd; this.on = on; this.entries = new Map(); this.folders = new Set(saved?.folders);
      this.pending = new Set(); this.marks = {}; this.show(null); this.watched = null; this.error = null; this.limited = false;
      this.loading = false; this.list = null; this.hits = null;
      if (saved?.file) this.show(saved.file, cx);
    }
    if (!cwd || this.loading) return;
    const context = this.context;
    this.loading = true;
    this.limited = false;
    cx.spawn(async cx => {
      try {
        for (const path of ["", ...this.folders]) {
          if (!this.current(context)) return;
          await this.loadFolder(path, context);
        }
        const top = await exec("git", ["rev-parse", "--show-toplevel"], { cwd, on }).catch(() => null);
        const marks = {};
        if (top?.code === 0) {
          // Writes nothing under .git (index lock, fsmonitor cookie): the folder watch would refresh again.
          const status = await exec("git", ["--no-optional-locks", "-c", "core.fsmonitor=false", "status", "--porcelain=v1", "-z", "--no-renames", "--untracked-files=all"], { cwd, on }).catch(() => null);
          if (status?.code === 0) for (const entry of status.stdout.split("\0").filter(Boolean).slice(0, TOTAL)) {
            const xy = entry.slice(0, 2);
            marks[`${top.stdout.trim()}/${entry.slice(3)}`] = xy === "??" || xy.includes("A") ? "A" : xy.includes("U") ? "U" : xy.includes("D") ? "D" : "M";
          }
        }
        if (!this.current(context)) return;
        this.marks = marks; this.error = null; this.watch(cwd, cx);
      } catch (e) { if (this.current(context)) this.error = String(e); }
      finally { if (this.context === context) this.loading = false; cx.notify(); }
    });
  }

  toggle(path, cx) {
    if (this.folders.has(path)) {
      for (const folder of [...this.folders]) if (folder === path || folder.startsWith(path + "/")) {
        this.folders.delete(folder);
        this.entries.delete(folder);
      }
    } else {
      this.folders.add(path);
      if (!this.entries.has(path) && !this.pending.has(path)) {
        const context = this.context;
        this.pending.add(path);
        cx.spawn(async cx => {
          try { await this.loadFolder(path, context); }
          catch (e) { if (this.current(context)) this.error = String(e); }
          finally { if (this.context === context) this.pending.delete(path); cx.notify(); }
        });
      }
    }
    cx.notify();
  }

  show(path, cx, line = null) {
    this.code?.release(); this.code = null; this.file = path; this.fileError = null; this.line = line;
    if (!path || !cx) return;
    const context = this.context, root = this.root, on = this.on;
    cx.spawn(async cx => {
      try {
        const text = await readTextFile(`${root}/${path}`, { on });
        if (this.file !== path || !this.current(context)) return;
        if (text === null) { this.fileError = "이 파일은 더 이상 없습니다"; return; }
        if (text.includes("\0")) { this.fileError = "바이너리 파일 · 미리보기 없음"; return; }
        const t = theme(), ext = path.includes(".") ? path.split(".").pop() : "txt";
        this.code = EditorState.new({ language: LANG[ext] ?? ext, readonly: true, line_numbers: true,
          value: text.length > 400000 ? text.slice(0, 400000) + "\n… (파일이 길어 잘림)" : text,
          font_family: settings().font_family, font_size: 12,
          syntax: { keyword: t.ansi5, string: t.ansi2, comment: t.dim, function: t.ansi4, type: t.ansi3, number: t.ansi1, constant: t.ansi6 } });
      } catch { if (this.file === path && this.current(context)) this.fileError = "미리볼 수 없는 파일입니다 (바이너리·너무 큼·읽기 불가)"; }
      finally { cx.notify(); }
    });
  }

  // Name mode lists the folder once (per folder shown) and filters in memory;
  // content mode asks grep a moment after typing stops.
  search(cx) {
    const q = this.query, context = this.context, seq = (this.seq = (this.seq ?? 0) + 1);
    if (!q || !context?.cwd) { this.hits = null; this.searching = false; cx.notify(); return; }
    if (this.mode === "name" && this.list) { this.hits = rank(this.list, q).map((p) => ({ path: p })); cx.notify(); return; }
    if (this.mode === "text" && q.length < 2) { this.hits = []; cx.notify(); return; }
    this.searching = true; cx.notify();
    cx.timer.after(this.mode === "text" ? 350 : 0, (cx) => {
      if (seq !== this.seq) return;
      cx.spawn(async (cx) => {
        try {
          if (this.mode === "name") {
            if (!this.list) this.list = await allFiles(context.cwd, context.on);
            if (seq === this.seq && this.current(context)) this.hits = rank(this.list, this.query).map((p) => ({ path: p }));
          } else {
            const hits = await grepText(context.cwd, context.on, q);
            if (seq === this.seq && this.current(context)) this.hits = hits;
          }
        } catch (e) { if (seq === this.seq) { this.hits = []; this.error = String(e); } }
        finally { if (seq === this.seq) { this.searching = false; cx.notify(); } }
      });
    });
  }

  setMode(mode, cx) {
    if (this.mode === mode) return;
    this.mode = mode; this.hits = null;
    this.search(cx);
  }

  rows(prefix, depth, out, u) {
    if (out.length >= TOTAL || depth > 40) return out;
    for (const entry of this.entries.get(prefix) ?? []) {
      if (out.length >= TOTAL) break;
      const path = prefix ? `${prefix}/${entry.name}` : entry.name, open = this.folders.has(path), mark = this.marks[`${this.root}/${path}`];
      out.push(this.item(u, `file-${path}`, depth, entry.dir, open, entry.name, null, mark,
        (_e, cx) => entry.dir ? this.toggle(path, cx) : this.show(path, cx)));
      if (entry.dir && open) this.rows(path, depth + 1, out, u);
    }
    return out;
  }

  // One list row: chevron (folders), icon, name, a dim second part, a git mark.
  item(u, id, depth, dir, open, name, sub, mark, click) {
    return h_flex().id(id).h(u(24)).flex_none().pl(u(4 + depth * 14)).pr(u(6)).gap(u(6)).items_center().cursor_pointer()
      .hover((s) => s.bg(P.hover))
      .on_click(click)
      .child(dir ? svg(ICON(`chevron-${open ? "down" : "right"}`)).size(u(11)).flex_none().text_color(P.gt2) : div().w(u(11)).flex_none())
      .child(svg(ICON(dir ? "folder" : "file-text")).size(u(13)).flex_none().text_color(dir ? P.gt2 : P.muted))
      .child(div().flex_none().max_w_full().truncate().text_color(P.text).child(name))
      .when(Boolean(sub), (el) => el.child(div().flex_1().min_w(0).truncate().child(small(u, sub, P.dim))))
      .when(!sub, (el) => el.child(div().flex_1()))
      .when(Boolean(mark), (el) => el.child(small(u, mark, mark === "A" ? P.done : mark === "D" || mark === "U" ? P.blocked : P.warn)));
  }

  results(u) {
    if (this.searching && !this.hits) return [small(u, this.mode === "name" ? "파일 목록을 읽는 중…" : "찾는 중…").p(u(6))];
    const hits = this.hits ?? [];
    if (this.mode === "text" && this.query.length < 2) return [small(u, "두 글자 이상 입력하세요").p(u(6))];
    if (!hits.length) return [small(u, "찾은 것이 없습니다").p(u(6))];
    const split = (p) => { const i = p.lastIndexOf("/"); return [p.slice(i + 1), i > 0 ? p.slice(0, i) : ""]; };
    if (this.mode === "name") return hits.map(({ path }) => {
      const [name, dir] = split(path);
      return this.item(u, `hit-${path}`, 0, false, false, name, dir, this.marks[`${this.root}/${path}`], (_e, cx) => this.show(path, cx));
    });
    return hits.map((h, i) => {
      const [name, dir] = split(h.path);
      return v_flex().id(`hit-${i}`).flex_none().px(u(6)).py(u(3)).cursor_pointer().hover((s) => s.bg(P.hover))
        .on_click((_e, cx) => this.show(h.path, cx, h.line))
        .child(h_flex().gap(u(6)).items_center()
          .child(svg(ICON("file-text")).size(u(12)).flex_none().text_color(P.muted))
          .child(div().flex_none().truncate().text_color(P.text).child(name))
          .child(small(u, `:${h.line}`, P.gt2))
          .child(div().flex_1().min_w(0).truncate().child(small(u, dir, P.dim))))
        .child(div().pl(u(18)).truncate().child(small(u, h.text, P.muted)));
    });
  }

  render(cx) {
    if (key() !== this.context?.key) this.refresh(cx);
    const u = unit();
    const tab = (id, label, mode) => div().id(id).flex_1().h(u(20)).flex().items_center().justify_center().cursor_pointer()
      .bg(this.mode === mode ? P.raised : P.well).text_color(this.mode === mode ? P.gt : P.dim)
      .when(this.mode === mode, (el) => el.border(u(2)).border_color(P.b2))
      .hover((s) => s.text_color(P.text))
      .on_click((_e, cx) => this.setMode(mode, cx))
      .child(small(u, label, this.mode === mode ? P.gt : P.dim));
    const head = h_flex().h(u(28)).flex_none().px(u(6)).gap(u(6)).items_center().bg(P.b1).border_b(u(2)).border_color(P.ink)
      .when(Boolean(this.file), (el) => el.child(button(u, "files-back", svg(ICON("chevron-left")).size(u(11)).text_color(P.gt), (_e, cx) => { this.show(null); cx.notify(); }, { pad: [1, 3], tooltip: "목록으로" })))
      .child(div().flex_none().text_color(P.g3).child(this.file ? "미리보기" : "소지품"))
      .child(div().flex_1().min_w(0).truncate().text_right().child(small(u, this.file ? `${this.file}${this.line ? `  · ${this.line}줄` : ""}` : this.root?.split(/[\\/]/).pop() ?? "", P.onb)));
    const searchBox = v_flex().flex_none().gap(u(4)).p(u(6)).border_b(u(2)).border_color(P.ink)
      .child(h_flex().h(u(24)).px(u(6)).gap(u(6)).items_center().bg(P.well).border(u(2)).border_color(P.b2)
        .child(svg(ICON("search")).size(u(12)).flex_none().text_color(P.gt2))
        .child(Input.new(this.input).flex_1().h_full().text_size(u(12)).text_color(P.text).bg(P.well).border_0())
        .when(Boolean(this.query), (el) => el.child(div().id("files-clear").cursor_pointer().on_click((_e, cx) => { this.input.set_value(""); this.query = ""; this.hits = null; cx.notify(); })
          .child(svg(ICON("x")).size(u(11)).text_color(P.dim)))))
      .child(h_flex().gap(u(2)).p(u(2)).bg(P.well).border(u(2)).border_color(P.ink).child(tab("files-by-name", "이름", "name")).child(tab("files-by-text", "내용", "text")));
    const list = v_flex().id("files-tree").flex_1().min_h(0).overflow_y_scrollbar().p(u(4));
    const tree = this.query ? list.children(this.results(u))
      : list.children(this.rows("", 0, [], u))
        .when(Boolean(this.error) || !this.entries.get("")?.length, (el) => el.child(small(u, this.error || (this.loading ? "파일을 읽는 중…" : this.root ? "파일 없음" : "폴더 없음")).p(u(8))))
        .when(this.limited, (el) => el.child(small(u, "폴더당 500개, 전체 5,000개까지만 보여 줍니다").p(u(8))));
    // Stone floor under the panel (the header and search box have their own fill).
    return root(u, v_flex().id("files").relative().size_full().min_h(0).overflow_hidden().bg(P.fill).border(u(2)).border_color(P.ink)
      .child(texture(u, ...FLOOR))
      .child(head)
      .when(!this.file, (el) => el.child(searchBox).child(tree))
      .when(Boolean(this.file), (el) => el.child(this.code ? Editor.new(this.code).flex_1().min_h(0) : small(u, this.fileError || "파일을 여는 중…").p(u(12)))));
  }
}
