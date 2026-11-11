// Theme dialogs' plain logic: what the rename window asks and runs, the key list's
// Korean words and groups, and the worktree window's small helpers. No Herdr
// imports, so tests/dialogs.test.mjs runs it under node. wtSlug, ago and tilde are
// modified from Herdr's shipped `worktree` mod (Apache-2.0, Herdr 0.1.14).

// ---- rename (role prompt) ----

const RENAME = {
  tab: { title: "탭 이름 바꾸기", hint: "비우면 탭 번호로 돌아갑니다", command: "tab.rename" },
  space: { title: "스페이스 이름 바꾸기", hint: "비우면 폴더 이름을 따릅니다", command: "space.rename" },
};

/** What the rename window shows and runs for a tab or a space ({id, name, named}); null
 *  without one. An unnamed one starts empty (its shown name as the placeholder), so Enter
 *  alone keeps it following its number / folder instead of pinning that as a name. */
export function renameSpec(kind, target) {
  const r = RENAME[kind];
  if (!r || !target?.id) return null;
  const name = target.name ?? "";
  return { title: r.title, value: target.named === false ? "" : name, placeholder: name || "이름", hint: r.hint, command: { name: r.command, args: { id: target.id } } };
}

/** The command's args with the typed name. Always has `name` ("" = Herdr's own name
 *  again): without it Herdr would open its own prompt instead. */
export function renameArgs(command, text) {
  return { ...(command?.args ?? {}), name: String(text ?? "").trim() };
}

// ---- key list (role help) ----

const DIR = { left: "왼쪽", right: "오른쪽", up: "위쪽", down: "아래쪽" };
const SPLIT = { left: "왼쪽으로", right: "오른쪽으로", up: "위로", down: "아래로" };
const WORDS = {
  "space.new": "새 스페이스", "space.next": "다음 스페이스", "space.prev": "이전 스페이스",
  "space.rename": "스페이스 이름 바꾸기", "space.close": "스페이스 닫기",
  "tab.new": "새 탭", "tab.next": "다음 탭", "tab.prev": "이전 탭", "tab.close": "탭 닫기", "tab.rename": "탭 이름 바꾸기",
  "pane.close": "칸 닫기", "pane.zoom": "칸 크게 보기",
  "agent.next": "다음 에이전트", "agent.prev": "이전 에이전트",
  "terminal.copy": "복사", "terminal.paste": "붙여넣기", "terminal.paste_image": "이미지 붙여넣기", "terminal.search": "터미널에서 찾기",
  "layout.switch": "다음 레이아웃", "layout.toggle:sidebar": "사이드바 접기·펴기",
  "app.zoom_in": "확대", "app.zoom_out": "축소", "app.zoom_reset": "확대 되돌리기",
  "app.help": "단축키 보기", "app.settings": "Herdr 기본 설정", "app.palette": "Herdr 기본 팔레트", "app.quit": "Herdr 끝내기",
  "mod.open:picker": "Herdr 기본 찾기",
  "window.close": "창 닫기", "window.minimize": "창 내리기", "window.maximize": "창 최대화",
  "pixel-quest.goto": "찾기", "pixel-quest.palette": "명령 팔레트", "pixel-quest.help": "단축키 보기",
  "pixel-quest.settings": "던전 설정", "pixel-quest.journal": "모험 일지", "pixel-quest.quest": "퀘스트 배너 시험",
  "pixel-quest.rename_tab": "탭 이름 바꾸기", "pixel-quest.rename_space": "스페이스 이름 바꾸기",
};
const SENDS = { "\u0017": "앞 단어 지우기", "\u001bb": "한 단어 왼쪽으로", "\u001bf": "한 단어 오른쪽으로" };

/** A keys.json action in Korean; unknown ones in Herdr's words ("foo.bar_baz" -> "foo bar baz"). */
export function keyLabel(action) {
  if (action.startsWith("send:")) {
    const s = action.slice(5);
    return SENDS[s] ?? `보내기 ${JSON.stringify(s)}`;
  }
  if (WORDS[action]) return WORDS[action];
  const [name, arg] = action.split(":");
  if (name === "space.select") return `스페이스 ${arg}`;
  if (name === "tab.select") return `탭 ${arg}`;
  if (name === "pane.go" && DIR[arg]) return `${DIR[arg]} 칸으로`;
  if (name === "pane.swap" && DIR[arg]) return `${DIR[arg]} 칸과 바꾸기`;
  if (name === "pane.split" && SPLIT[arg]) return `${SPLIT[arg]} 나누기`;
  if (WORDS[name]) return arg ? `${WORDS[name]} ${arg}` : WORDS[name];
  const words = name.replace(/[._]/g, " ");
  return arg ? `${words} ${arg}` : words;
}

const GROUPS = [
  ["스페이스", /^space\.|^pixel-quest\.rename_space$/],
  ["탭", /^tab\.|^pixel-quest\.rename_tab$/],
  ["칸", /^pane\./],
  ["에이전트", /^agent\./],
  ["터미널", /^terminal\.|^send:/],
  ["창·앱", /./],
];

/** keys() rows in Korean groups, in a fixed order, matching `filter` by key, action
 *  or Korean words; groups with nothing in them drop out. */
export function keyGroups(list, filter) {
  const f = String(filter ?? "").trim().toLowerCase();
  const all = list.filter((k) => !f || [k.keys, k.action, keyLabel(k.action)].some((s) => s.toLowerCase().includes(f)));
  const seen = new Set();
  return GROUPS.map(([name, re]) => [name, all.filter((k) => !seen.has(k) && re.test(k.action) && seen.add(k))])
    .filter(([, rows]) => rows.length > 0);
}

/** "ctrl-shift-p" as its keycaps: ["Ctrl", "Shift", "P"] (Mac symbols with `mac`). */
export function keyParts(k, mac = false) {
  const names = { ctrl: mac ? "⌃" : "Ctrl", cmd: "⌘", shift: mac ? "⇧" : "Shift", alt: mac ? "⌥" : "Alt", option: "⌥", pageup: "PgUp", pagedown: "PgDn", tab: "Tab", up: "↑", down: "↓", left: "←", right: "→", escape: "Esc", enter: "Enter", backspace: "Backspace", insert: "Ins" };
  const parts = k.endsWith("--") ? [...k.slice(0, -2).split("-"), "-"] : k.split("-");
  return parts.map((p) => names[p.toLowerCase()] ?? (p.length === 1 ? p.toUpperCase() : p.charAt(0).toUpperCase() + p.slice(1)));
}

// ---- worktree (role worktree) ----

/** The checkout folder for a branch, as Herdr names it (slashes and odd characters as dashes). */
export const wtSlug = (branch) => branch.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");

/** How long ago a unix time was, in Korean. */
export function ago(s, now = Date.now() / 1000) {
  const d = now - s;
  return d < 3600 ? `${Math.max(1, Math.round(d / 60))}분 전`
    : d < 86400 ? `${Math.round(d / 3600)}시간 전`
    : d < 86400 * 60 ? `${Math.round(d / 86400)}일 전`
    : `${Math.round(d / 86400 / 30)}달 전`;
}

/** Home as ~ (git says C:/Users/x where Windows says C:\Users\x). */
export function tilde(path, userHome) {
  const [p, h] = [path, userHome ?? ""].map((s) => s.replace(/\\/g, "/"));
  return h && p.startsWith(h) ? `~${p.slice(h.length)}` : path;
}
