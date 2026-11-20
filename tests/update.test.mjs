// In-app update: version comparison, when to look, what a release says, the installer's
// command (mods/pixel-quest/update.js). Run: node --test tests/
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as U from "../mods/pixel-quest/update.js";

test("this build's version is a release version, and mod.json says the same", () => {
  assert.ok(U.parseVer(U.VERSION));
  const mod = JSON.parse(readFileSync(new URL("../mods/pixel-quest/mod.json", import.meta.url), "utf8"));
  assert.equal(mod.version, U.VERSION);
});

test("the request names itself: GitHub's API refuses one without a User-Agent", () => {
  assert.ok(U.HEADERS["User-Agent"]);
  assert.ok(U.LATEST_URL.startsWith("https://api.github.com/repos/cubha/herdr-pixel-quest/"));
});

test("versions: v or no v, three numbers, nothing else", () => {
  assert.deepEqual(U.parseVer("v1.2.3"), [1, 2, 3]);
  assert.deepEqual(U.parseVer(" 10.0.12 "), [10, 0, 12]);
  for (const bad of ["1.2", "v1.2.3-beta", "1.2.3.4", "latest", "", null, undefined, "v1.2.x", "1.2.3; rm -rf /", "12345.0.0"]) assert.equal(U.parseVer(bad), null, String(bad));
});

test("comparison is by number, not by text", () => {
  assert.equal(U.cmpVer("1.0.0", "1.0.0"), 0);
  assert.equal(U.cmpVer("v1.0.10", "1.0.9"), 1);
  assert.equal(U.cmpVer("1.9.9", "2.0.0"), -1);
  assert.equal(U.cmpVer("1.10.0", "1.9.0"), 1);
  assert.equal(U.cmpVer("junk", "1.0.0"), -1);
  assert.equal(U.cmpVer("1.0.0", "junk"), 1);
});

test("newer only when the release is readable and above this build", () => {
  assert.equal(U.isNewer("v1.0.1", "1.0.0"), true);
  assert.equal(U.isNewer("1.0.0", "1.0.0"), false);
  assert.equal(U.isNewer("0.9.9", "1.0.0"), false);
  assert.equal(U.isNewer("v2.0.0-rc1", "1.0.0"), false);
  assert.equal(U.isNewer(null, "1.0.0"), false);
});

test("looks again six hours after a good look, half an hour after a failed one, never when off", () => {
  const now = 1e12;
  assert.equal(U.due(null, now), true);
  assert.equal(U.due({ at: now - U.EVERY + 1000, ok: true }, now), false);
  assert.equal(U.due({ at: now - U.EVERY, ok: true }, now), true);
  assert.equal(U.due({ at: now - U.RETRY + 1000, ok: false }, now), false);
  assert.equal(U.due({ at: now - U.RETRY, ok: false }, now), true);
  assert.equal(U.due({ at: now + 5000, ok: true }, now), true);     // the clock went back
  assert.equal(U.due(null, now, false), false);
  assert.ok(3600000 / U.EVERY * 60 <= 60);                          // well under GitHub's 60 an hour
});

test("a release answer: tag, notes, no drafts or pre-releases", () => {
  assert.deepEqual(U.fromRelease({ tag_name: "v1.2.0", body: "## 새 기능\n- 하나", name: "v1.2.0" }), { latest: "1.2.0", notes: "## 새 기능\n- 하나", name: "v1.2.0" });
  assert.equal(U.fromRelease({ tag_name: "v1.2.0", draft: true }), null);
  assert.equal(U.fromRelease({ tag_name: "v1.2.0", prerelease: true }), null);
  assert.equal(U.fromRelease({ tag_name: "nightly" }), null);
  assert.equal(U.fromRelease({ message: "Not Found" }), null);
  assert.equal(U.fromRelease(null), null);
  assert.equal(U.fromRelease({ tag_name: "v1.0.0", body: "x".repeat(9000) }).notes.length, 6000);
});

test("a failed look keeps what was known", () => {
  const known = { latest: "1.1.0", notes: "n", name: "v1.1.0", at: 5, ok: true };
  assert.deepEqual(U.looked(known, null, 99), { latest: "1.1.0", notes: "n", name: "v1.1.0", at: 99, ok: false });
  assert.deepEqual(U.looked(known, { latest: "1.2.0", notes: "m", name: "" }, 99), { latest: "1.2.0", notes: "m", name: "", at: 99, ok: true });
  assert.deepEqual(U.looked(null, null, 7), { latest: null, notes: "", name: "", at: 7, ok: false });
});

test("standing: off, unknown, current, new", () => {
  assert.equal(U.standing({ latest: "9.0.0" }, false, "1.0.0").state, "off");
  assert.equal(U.standing(null, true, "1.0.0").state, "unknown");
  assert.equal(U.standing({ latest: null }, true, "1.0.0").state, "unknown");
  assert.equal(U.standing({ latest: "1.0.0" }, true, "1.0.0").state, "current");
  assert.equal(U.standing({ latest: "0.9.0" }, true, "1.0.0").state, "current");
  assert.deepEqual(U.standing({ latest: "1.0.1" }, true, "1.0.0"), { state: "new", latest: "1.0.1" });
});

test("patch notes as lines: heads, items, text; marks and pictures go", () => {
  const body = "## 새 기능\r\n\r\n- **앱 안 업데이트.** 버튼 한 번\n* [링크](https://x.y) 글\n---\n그냥 `글`\n![그림](https://a/b.png)\n";
  assert.deepEqual(U.noteLines(body), [
    { kind: "head", text: "새 기능" },
    { kind: "item", text: "앱 안 업데이트. 버튼 한 번" },
    { kind: "item", text: "링크 글" },
    { kind: "text", text: "그냥 글" },
  ]);
  assert.deepEqual(U.noteLines(null), []);
  assert.equal(U.noteLines(Array(100).fill("- a").join("\n")).length, 60);
});

test("the installer: the mod's own script with only a checked tag", () => {
  const w = U.installer("windows", "C:\\Users\\me\\.config\\herdr-app", "1.2.3");
  assert.equal(w.command, "powershell");
  assert.deepEqual(w.args.slice(-4), ["-File", "C:\\Users\\me\\.config\\herdr-app\\mods\\pixel-quest\\update.ps1", "-Tag", "v1.2.3"]);
  assert.ok(w.args.includes("-NonInteractive"));
  assert.deepEqual(U.installer("macos", "/Users/me/.config/herdr-app/", "v1.2.3"), { command: "sh", args: ["/Users/me/.config/herdr-app/mods/pixel-quest/update.sh", "v1.2.3"] });
  assert.equal(U.installer("linux", "/h", "1.2.3").command, "sh");
  for (const bad of ["1.2.3; calc", "v1.2.3 & del", "../x", "", null]) assert.equal(U.installer("windows", "C:\\h", bad), null, String(bad));
  assert.equal(U.installer("linux", "", "1.2.3"), null);
});

test("nothing that reorders or controls text gets drawn", () => {
  assert.deepEqual(U.noteLines("- a\u202eb\u0007c"), [{ kind: "item", text: "abc" }]);
  assert.equal(U.lastLine({ stdout: "pixel-quest: x\u2066y\n", stderr: "" }), "xy");
});

test("the error line: the script's own last word", () => {
  assert.equal(U.lastLine({ stdout: "x\r\npixel-quest: 내려받지 못했습니다 (v1.2.3)\r\n", stderr: "" }), "내려받지 못했습니다 (v1.2.3)");
  assert.equal(U.lastLine({ stdout: "", stderr: "boom\n" }), "boom");
  assert.equal(U.lastLine(null), "");
});

test("patch notes after an update: once, never on a first install or a downgrade", () => {
  assert.equal(U.notesDue(null, "1.0.0"), false);
  assert.equal(U.notesDue("1.0.0", "1.0.0"), false);
  assert.equal(U.notesDue("0.9.0", "1.0.0"), true);
  assert.equal(U.notesDue("1.1.0", "1.0.0"), false);
});

test("the updater scripts take nothing but a release tag", () => {
  const ps = readFileSync(new URL("../mods/pixel-quest/update.ps1", import.meta.url), "utf8");
  const sh = readFileSync(new URL("../mods/pixel-quest/update.sh", import.meta.url), "utf8");
  assert.ok(ps.includes("'^v[0-9]{1,4}\\.[0-9]{1,4}\\.[0-9]{1,4}\\z'"));
  assert.match(sh, /\^v\[0-9\]\{1,4\}/);
  assert.equal(ps.charCodeAt(0), 0xfeff);                // Windows PowerShell reads Korean only with a BOM
  for (const text of [ps, sh]) assert.ok(text.includes(`github.com/${U.REPO}/archive/refs/tags/`));
});
