// Theme dialogs' plain logic (mods/pixel-quest/dialogs.js). Run: node --test tests/
import test from "node:test";
import assert from "node:assert/strict";
import * as D from "../mods/pixel-quest/dialogs.js";

test("rename spec for a tab: Korean title, current name, number hint, tab.rename", () => {
  const s = D.renameSpec("tab", { id: "t3", name: "fix login" });
  assert.equal(s.title, "탭 이름 바꾸기");
  assert.equal(s.value, "fix login");
  assert.match(s.hint, /번호/);
  assert.deepEqual(s.command, { name: "tab.rename", args: { id: "t3" } });
});

test("rename spec for a space: folder hint, space.rename", () => {
  const s = D.renameSpec("space", { id: "w1", name: "my-api" });
  assert.equal(s.title, "스페이스 이름 바꾸기");
  assert.equal(s.value, "my-api");
  assert.match(s.hint, /폴더/);
  assert.deepEqual(s.command, { name: "space.rename", args: { id: "w1" } });
});

test("an unnamed tab or space starts empty, its shown name as the placeholder", () => {
  const t = D.renameSpec("tab", { id: "t1", name: "2", named: false });
  assert.equal(t.value, "");
  assert.equal(t.placeholder, "2");
  const s = D.renameSpec("space", { id: "w1", name: "my-api", named: true });
  assert.equal(s.value, "my-api");
  assert.equal(s.placeholder, "my-api");
});

test("rename spec without a target is null (nothing to rename)", () => {
  assert.equal(D.renameSpec("tab", null), null);
  assert.equal(D.renameSpec("space", undefined), null);
});

test("rename args always carry name, trimmed; empty means Herdr's own name again", () => {
  const c = { name: "space.rename", args: { id: "w1" } };
  assert.deepEqual(D.renameArgs(c, "  notes  "), { id: "w1", name: "notes" });
  assert.deepEqual(D.renameArgs(c, "   "), { id: "w1", name: "" });
  assert.deepEqual(D.renameArgs(c, ""), { id: "w1", name: "" });
  assert.deepEqual(D.renameArgs({ name: "tab.rename" }, "x"), { name: "x" });
});

test("key labels in Korean for Herdr and theme actions", () => {
  assert.equal(D.keyLabel("space.select:3"), "스페이스 3");
  assert.equal(D.keyLabel("tab.select:2"), "탭 2");
  assert.equal(D.keyLabel("pane.go:left"), "왼쪽 칸으로");
  assert.equal(D.keyLabel("pane.swap:down"), "아래쪽 칸과 바꾸기");
  assert.equal(D.keyLabel("pane.split:right"), "오른쪽으로 나누기");
  assert.equal(D.keyLabel("tab.new"), "새 탭");
  assert.equal(D.keyLabel("pixel-quest.goto"), "찾기");
  assert.equal(D.keyLabel("pixel-quest.palette"), "명령 팔레트");
  assert.equal(D.keyLabel("pixel-quest.rename_space"), "스페이스 이름 바꾸기");
  assert.equal(D.keyLabel("send:\u0017"), "앞 단어 지우기");
});

test("unknown actions fall back to Herdr's words", () => {
  assert.equal(D.keyLabel("foo.bar_baz"), "foo bar baz");
  assert.equal(D.keyLabel("foo.bar:7"), "foo bar 7");
  assert.equal(D.keyLabel("send:abc"), '보내기 "abc"');
});

const KEYS = [
  { keys: "alt-1", action: "space.select:1", section: "global" },
  { keys: "ctrl-1", action: "tab.select:1", section: "global" },
  { keys: "f2", action: "pixel-quest.rename_tab", section: "global" },
  { keys: "shift-f2", action: "pixel-quest.rename_space", section: "global" },
  { keys: "alt-h", action: "pane.go:left", section: "global" },
  { keys: "alt-down", action: "agent.next", section: "global" },
  { keys: "ctrl-shift-c", action: "terminal.copy", section: "terminal" },
  { keys: "ctrl-backspace", action: "send:\u0017", section: "terminal" },
  { keys: "ctrl-shift-p", action: "pixel-quest.palette", section: "global" },
];

test("key groups: Korean names in a fixed order, theme rename keys under 탭/스페이스", () => {
  const g = D.keyGroups(KEYS, "");
  assert.deepEqual(g.map(([n]) => n), ["스페이스", "탭", "칸", "에이전트", "터미널", "창·앱"]);
  assert.deepEqual(g[0][1].map((k) => k.keys), ["alt-1", "shift-f2"]);
  assert.deepEqual(g[1][1].map((k) => k.keys), ["ctrl-1", "f2"]);
  assert.deepEqual(g[4][1].map((k) => k.keys), ["ctrl-shift-c", "ctrl-backspace"]);
  assert.deepEqual(g[5][1].map((k) => k.keys), ["ctrl-shift-p"]);
});

test("key groups filter by key, action or Korean label; empty groups drop out", () => {
  assert.deepEqual(D.keyGroups(KEYS, "팔레트").map(([n, r]) => [n, r.length]), [["창·앱", 1]]);
  assert.deepEqual(D.keyGroups(KEYS, "ALT-H").map(([n]) => n), ["칸"]);
  assert.deepEqual(D.keyGroups(KEYS, "agent").map(([n]) => n), ["에이전트"]);
  assert.deepEqual(D.keyGroups(KEYS, "없는말"), []);
});

test("key parts read as people write them", () => {
  assert.deepEqual(D.keyParts("ctrl-shift-p"), ["Ctrl", "Shift", "P"]);
  assert.deepEqual(D.keyParts("ctrl--"), ["Ctrl", "-"]);
  assert.deepEqual(D.keyParts("shift-f2"), ["Shift", "F2"]);
  assert.deepEqual(D.keyParts("alt-pagedown"), ["Alt", "PgDn"]);
  assert.deepEqual(D.keyParts("ctrl-shift-p", true), ["⌃", "⇧", "P"]);
});

test("worktree folder slug, as Herdr makes it", () => {
  assert.equal(D.wtSlug("feature/login"), "feature-login");
  assert.equal(D.wtSlug("--weird name!!"), "weird-name");
  assert.equal(D.wtSlug("v1.2_fix"), "v1.2_fix");
});

test("ago in Korean", () => {
  const now = 1_000_000_000;
  assert.equal(D.ago(now - 30, now), "1분 전");
  assert.equal(D.ago(now - 600, now), "10분 전");
  assert.equal(D.ago(now - 7200, now), "2시간 전");
  assert.equal(D.ago(now - 86400 * 3, now), "3일 전");
  assert.equal(D.ago(now - 86400 * 90, now), "3달 전");
});

test("home shown as ~ whatever the slashes", () => {
  assert.equal(D.tilde("C:/Users/x/.herdr/worktrees", "C:\\Users\\x"), "~/.herdr/worktrees");
  assert.equal(D.tilde("/home/x/a", "/home/x"), "~/a");
  assert.equal(D.tilde("/srv/a", "/home/x"), "/srv/a");
});
