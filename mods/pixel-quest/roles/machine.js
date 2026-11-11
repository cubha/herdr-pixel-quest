// The theme's "머신 추가", in place of Herdr's `machine-add` when opened from the
// sidebar: the hosts in ~/.ssh/config to pick from (or type one), each added with
// one click (`hc machine add`); when the machine needs answers first, it says
// what to run in a terminal. The ssh and hc work is Herdr's, unchanged; the
// window is drawn in the theme, in Korean.
// Modified from Herdr's shipped `machine-add` mod (Apache-2.0, Herdr 0.1.14).

import { div, svg } from "gpui-kit";
import { v_flex, h_flex, InputState, Input, TextView } from "gpui-base";
import { hc, exec, home, readTextFile, props, closeOverlay } from "herdr";
import { P, unit, root, frame, small, bandHead, pic, button } from "../kit.js";

const ICON = (name) => `mods/pixel-quest/icons/${name}.svg`;

// An Include's files, as ssh finds them: ~ is home, a relative path is
// under ~/.ssh, and a pattern matches files (through sh; none where there's no sh).
async function includeFiles(value) {
  const paths = (value.match(/"[^"]*"|\S+/g) ?? [])
    .map((p) => p.replace(/^"|"$/g, ""))
    .map((p) => (p.startsWith("~/") ? `${home()}/${p.slice(2)}` : p.startsWith("/") || /^[a-z]:[\\/]/i.test(p) ? p : `${home()}/.ssh/${p}`));
  const files = [];
  for (const p of paths) {
    if (!/[*?[]/.test(p)) {
      files.push(p);
      continue;
    }
    const r = await exec("sh", ["-c", 'for f in $1; do [ -f "$f" ] && printf "%s\\n" "$f"; done', "sh", p]).catch(() => null);
    files.push(...(r?.stdout ?? "").split("\n").filter(Boolean));
  }
  return files;
}

// Host entries people can pick: named ones, not patterns, from the file
// and the files it includes (ssh stops 16 deep).
async function parseConfig(text, hosts = [], depth = 0) {
  let cur = null;
  for (const raw of (text ?? "").split("\n")) {
    const m = raw.trim().match(/^([^\s#=]+)\s*=?\s*(.*)$/);
    if (!m) continue;
    const [key, value] = [m[1].toLowerCase(), m[2].trim()];
    if (key === "host" || key === "match") {
      const names = key === "host" ? value.split(/\s+/).filter((h) => h && !/[*?!]/.test(h) && !hosts.some((x) => x.alias === h || x.aliases.includes(h))) : [];
      cur = names.length ? { alias: names[0], aliases: names.slice(1), hostname: null, user: null } : null;
      if (cur) hosts.push(cur);
    } else if (key === "include" && depth < 16) {
      for (const f of await includeFiles(value)) await parseConfig(await readTextFile(f).catch(() => null), hosts, depth + 1);
    } else if (cur && key === "hostname") cur.hostname = value;
    else if (cur && key === "user") cur.user = value;
  }
  return hosts;
}

export default class Machine {
  init(_p, cx) {
    this.hosts = null;
    this.added = [];
    this.state = {}; // target -> "adding" | error text
    this.pending = new Set();
    this.refreshing = false;
    this.typed = "";
    this.input = InputState.new({ placeholder: "user@host" });
    this.input.on("change", (_e, cx) => { this.typed = this.input.value(); cx.notify(); });
    this.input.on("submit", (_e, cx) => this.add(this.typed, cx));
    this.inputFocused = true;
    this.input.on("focus", (_e, cx) => { this.inputFocused = true; cx.notify(); });
    this.input.on("blur", (_e, cx) => { this.inputFocused = false; cx.notify(); });
    this.input.focus();
    cx.timer.after(600, () => this.input.focus());
    this.macs = {}; // target -> { name, core } for an added Mac
    this.opened = {};
    this.handle = cx.focus_handle();
    cx.spawn(async (cx) => {
      this.hosts = await parseConfig(await readTextFile(`${home()}/.ssh/config`).catch(() => null));
      await this.refresh();
      cx.notify();
    });
    cx.timer.every(3000, (cx) => {
      if (!this.pending.size || this.refreshing) return;
      this.refreshing = true;
      cx.spawn(async (cx) => {
        try {
          await this.refresh();
          cx.notify();
        } finally {
          this.refreshing = false;
        }
      });
    });
  }

  async refresh() {
    const r = await hc(["machine", "ls", "--json"]).catch(() => null);
    try {
      this.added = r?.code === 0 ? (JSON.parse(r.stdout).machines ?? []).filter((m) => !m.temporary) : [];
    } catch {
      this.added = [];
    }
    for (const target of this.pending) {
      if (!this.isAdded(target)) continue;
      this.pending.delete(target);
      delete this.state[target];
      if (this.typed.trim() === target) {
        this.input.set_value("");
        this.typed = "";
      }
      await this.checkMac(target);
    }
  }

  isAdded(target) {
    return this.added.some((m) => m.target === target || m.name === target || m.host === target);
  }

  add(target, cx) {
    target = target.trim();
    if (!target || this.state[target] === "adding") return;
    this.pending.delete(target);
    this.state[target] = "adding";
    cx.notify();
    cx.spawn(async (cx) => {
      const r = await hc(["machine", "add", target, "--json"]).catch((e) => ({ code: 1, stderr: String(e), stdout: "" }));
      let why = null;
      try {
        why = r.code === 0 ? null : (JSON.parse(r.stdout || r.stderr).error ?? { message: (r.stderr || r.stdout).trim() });
      } catch {
        why = { message: (r.stderr || r.stdout || "응답이 없습니다").trim() };
      }
      if (!why) {
        delete this.state[target];
        this.input.set_value("");
        this.typed = "";
        await this.refresh();
        await this.checkMac(target);
      } else if (["hc_missing", "incompatible", "login_needed", "auth_failed", "host_key"].includes(why.kind) || /password|passphrase|host key|permission denied|login/i.test(why.message ?? "")) {
        const quoted = /^[a-z0-9_@%+=:,./-]+$/i.test(target) ? target : "'" + target.replace(/'/g, "'\\''") + "'";
        this.pending.add(target);
        this.state[target] = `${target}은(는) 여기서 바로 추가할 수 없습니다: 답할 것이 있습니다(비밀번호, 새 호스트 키, 또는 그쪽에 herdr-core 설치). 터미널에서 \`hc machine add ${quoted}\`를 실행하세요. 옵션은 \`hc machine --help\`.`;
      } else this.state[target] = why.message || "추가하지 못했습니다";
      await this.refresh();
      cx.notify();
    });
  }

  // macOS asks on its own screen before anything reads Desktop, Documents
  // or Downloads, and the asking program waits: say so once, with the way
  // to allow it for good.
  async checkMac(target) {
    const m = this.added.find((x) => x.target === target || x.name === target);
    if (!m) return;
    const r = await exec("sh", ["-c", 'uname; command -v herdr-core || echo "$HOME/.local/bin/herdr-core"'], { on: m.name }).catch(() => null);
    const [os, core] = (r?.stdout ?? "").trim().split("\n");
    if (os === "Darwin") this.macs[target] = { name: m.name, core: core ?? "~/.local/bin/herdr-core" };
  }

  macCard(u, target) {
    const mac = this.macs[target];
    return v_flex().mx(u(4)).mb(u(6)).p(u(8)).gap(u(6)).bg(P.raised).border(u(2)).border_color(P.blocked)
      .child(div().text_color(P.gt).child(`${mac.name}은(는) Mac입니다: 폴더 접근을 한 번 허용하세요`))
      .child(small(u, "macOS는 에이전트가 데스크탑·문서·다운로드를 읽기 전에 Mac 화면에서 묻고, 누가 답할 때까지 기다립니다. 그쪽에서 herdr-core에 전체 디스크 접근 권한을 주면 다시 묻지 않습니다: 목록에서 +를 눌러 이 파일을 고르세요.", P.muted))
      .child(div().px(u(6)).py(u(2)).bg(P.well).border(u(2)).border_color(P.b1).child(small(u, mac.core, P.text)))
      .child(h_flex().gap(u(8)).items_center()
        .child(button(u, `ma-mac-${target}`, small(u, `${mac.name}에서 설정 열기`, P.g4), (_e, cx) => {
          exec("open", ["x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles"], { on: mac.name }).catch(() => null);
          this.opened[target] = true;
          cx.notify();
        }, { pad: [2, 8], on: true }))
        .when(Boolean(this.opened[target]), (el) => el.child(small(u, "Mac 화면에 열렸습니다.", P.dim))));
  }

  close() {
    closeOverlay(props()?.overlay);
  }

  key(e, cx) {
    if (e.key === "escape") { this.close(); cx.stop_propagation(); }
  }

  message(u, target) {
    const text = String(this.state[target]).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return div().text_size(u(11)).text_color(P.blocked).child(TextView.html(`ma-message-${target}`, `<span>${text}</span>`).selectable(true));
  }

  row(u, target, label, sub) {
    const st = this.state[target];
    const done = this.isAdded(target);
    const right = done
      ? h_flex().gap(u(4)).items_center().child(svg(ICON("circle-check")).size(u(12)).text_color(P.done)).child(small(u, "추가됨", P.done))
      : st === "adding"
        ? h_flex().gap(u(4)).items_center().child(svg(ICON("spinner")).size(u(12)).text_color(P.gt).spin(900)).child(small(u, "연결 중", P.muted))
        : button(u, `ma-add-${target}`, small(u, "추가", P.text), (_e, cx) => this.add(target, cx), { pad: [1, 8] });
    const idle = !done && !st;
    return v_flex().flex_none()
      .child(h_flex().id(`ma-row-${target}`).h(u(32)).px(u(6)).gap(u(8)).items_center()
        .hover((s) => s.bg(P.hover))
        .when(idle, (el) => el.cursor_pointer().on_click((_e, cx) => this.add(target, cx)))
        .child(pic(u, "ico-crystal", 16))
        .child(div().flex_none().text_color(done ? P.gt : P.text).child(label))
        .child(div().flex_1().min_w(0).truncate().child(small(u, sub ?? "", P.dim)))
        .child(right))
      .when(typeof st === "string" && st !== "adding", (el) => el.child(div().px(u(30)).pb(u(6)).child(this.message(u, target))))
      .when(Boolean(this.macs[target]), (el) => el.child(this.macCard(u, target)));
  }

  render() {
    const u = unit();
    const hosts = this.hosts ?? [];
    const head = (text) => h_flex().flex_none().pt(u(4)).gap(u(6)).items_center()
      .child(small(u, text, P.gt2))
      .child(div().flex_1().h(u(2)).bg(P.b1));
    const typed = this.typed.trim();
    const body = v_flex().size_full().min_h(0).gap(u(6))
      .child(bandHead(u, "머신 추가").mx(u(-10)).mt(u(-8)))
      .child(small(u, "VPS, Mac mini, 집의 서버: Herdr가 ssh로 닿고, 노트북이 잠들어도 거기 에이전트는 계속 일합니다.", P.muted))
      .child(head(hosts.length ? "ssh config의 호스트" : "ssh config에 호스트가 없습니다"))
      .child(v_flex().id("ma-hosts").flex_1().min_h(0).overflow_y_scroll()
        .children(this.hosts === null
          ? [div().px(u(6)).py(u(6)).child(small(u, "~/.ssh/config 읽는 중…", P.dim))]
          : hosts.map((h) => this.row(u, h.alias, h.alias, [h.user, h.hostname].filter(Boolean).join("@") || (h.aliases.length ? `또는 ${h.aliases.join(", ")}` : "")))))
      .child(head("또는 ssh로 닿는 주소를 직접"))
      .child(h_flex().flex_none().gap(u(8)).items_center()
        .child(h_flex().flex_1().h(u(26)).px(u(6)).gap(u(6)).items_center().bg(P.well).border(u(2)).border_color(this.inputFocused ? P.b2 : P.b1)
          .child(pic(u, "ico-key", 16))
          .child(Input.new(this.input).flex_1().h_full().text_size(u(12)).text_color(P.text).bg(P.well).border_0()))
        .child(button(u, "ma-add-typed", small(u, "추가", typed ? P.g4 : P.dim), (_e, cx) => this.add(this.typed, cx), { pad: [2, 10], on: Boolean(typed) })))
      .when(Boolean(typed && this.state[typed]), (el) => el.child(this.message(u, typed)))
      .child(h_flex().flex_none().justify_end().child(small(u, "Enter 추가   Esc 닫기", P.gt2)));
    return root(u, div().id("machine-add").size_full().track_focus(this.handle)
      .on_key_down((e, cx) => this.key(e, cx))
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .child(frame(u, "gold", body, { pad: [8, 10], floor: true, web: "br" }).size_full()));
  }
}
