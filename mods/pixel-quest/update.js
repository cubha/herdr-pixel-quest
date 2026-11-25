// In-app update, the part that only decides (no Herdr calls, so tests run it under node):
// this build's version, version comparison, when to look again, what a GitHub release says,
// the patch notes as lines, and the program that installs a release.
// The window is roles/update.js; the look itself and the install run from roles/status.js.
// Copyright (c) 2026 cubha. MIT License.

/** This build. mod.json's "version" and the release tag (v<this>) say the same (tests check). */
export const VERSION = "1.1.5";
export const REPO = "cubha/herdr-pixel-quest";
/** Public, no sign-in: 60 requests an hour per address, and this asks four times a day. */
export const LATEST_URL = `https://api.github.com/repos/${REPO}/releases/latest`;
/** GitHub's API turns away a request with no User-Agent (403), and Herdr's fetch sends none. */
export const HEADERS = { Accept: "application/vnd.github+json", "User-Agent": "herdr-pixel-quest" };
export const EVERY = 6 * 3600 * 1000;      // look again this long after a look that worked
export const RETRY = 30 * 60 * 1000;       // ... and this long after one that failed
export const BUSY_FOR = 10 * 60 * 1000;    // an install older than this is taken for dead
export const LOOK_FOR = 2 * 60 * 1000;     // ... and so is a look that never came back
// Control characters and the marks that reorder text have no place in what gets drawn.
const plain = (t) => String(t ?? "").replace(/[\u0000-\u0008\u000b-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, "");

/** "v1.2.3" or "1.2.3" as [1, 2, 3]; anything else (a pre-release too) is null. */
export function parseVer(s) {
  const m = /^v?(\d{1,4})\.(\d{1,4})\.(\d{1,4})$/.exec(String(s ?? "").trim());
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

/** -1, 0 or 1; a version that can't be read counts as older than any that can. */
export function cmpVer(a, b) {
  const x = parseVer(a), y = parseVer(b);
  if (!x || !y) return x ? 1 : y ? -1 : 0;
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
  return 0;
}

/** Is `latest` a release newer than `current`? False for anything unreadable. */
export const isNewer = (latest, current = VERSION) => Boolean(parseVer(latest)) && cmpVer(latest, current) > 0;

/** The release tag of a version: "v1.2.3" (null when it isn't one). Only this goes to the installer. */
export const tagOf = (v) => (parseVer(v) ? `v${parseVer(v).join(".")}` : null);

/** Time to look again? `cache`: shared pq.update { at, ok }. */
export function due(cache, now, on = true) {
  if (!on) return false;
  const at = Number(cache?.at) || 0;
  if (at > now) return true;                                   // a clock set back
  return now - at >= (cache?.ok === false ? RETRY : EVERY);
}

/** What a releases/latest answer says, or null (a draft, a pre-release, no readable tag). */
export function fromRelease(json) {
  if (!json || json.draft || json.prerelease || !parseVer(json.tag_name)) return null;
  return { latest: parseVer(json.tag_name).join("."), notes: String(json.body ?? "").slice(0, 6000), name: String(json.name ?? "").slice(0, 80) };
}

/** The cache after a look: a good answer replaces what was known, a failed one keeps it. */
export function looked(cache, release, now) {
  const kept = { latest: cache?.latest ?? null, notes: cache?.notes ?? "", name: cache?.name ?? "" };
  return release ? { ...release, at: now, ok: true } : { ...kept, at: now, ok: false };
}

/** Where things stand: { state: "off" | "unknown" | "current" | "new", latest }. */
export function standing(cache, on = true, current = VERSION) {
  if (!on) return { state: "off", latest: null };
  if (!parseVer(cache?.latest)) return { state: "unknown", latest: null };
  return { state: isNewer(cache.latest, current) ? "new" : "current", latest: cache.latest };
}

/**
 * Patch notes (a release's markdown) as lines to draw: { kind: "head" | "item" | "text", text }.
 * Marks go, words stay; blank lines and the rule lines drop out.
 */
export function noteLines(body, max = 60) {
  const out = [];
  for (const raw of plain(body).replace(/\r/g, "").split("\n")) {
    const line = raw.trim();
    if (!line || /^[-*_]{3,}$/.test(line)) continue;
    const clean = (t) => t.replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/(\*\*|__|`)/g, "").trim();
    const head = /^#{1,6}\s+(.*)$/.exec(line), item = /^[-*+]\s+(.*)$/.exec(line);
    const text = clean(head ? head[1] : item ? item[1] : line);
    if (text) out.push({ kind: head ? "head" : item ? "item" : "text", text });
    if (out.length >= max) break;
  }
  return out;
}

/**
 * The program that installs release `tag`: the mod's own update.ps1 (Windows) or update.sh
 * (macOS, Linux). It downloads the release, runs `herdr-app check` on it and only then lets
 * the release's own installer replace the mod. Null when the tag isn't a release tag.
 */
export function installer(platform, home, tag) {
  const t = tagOf(tag);
  if (!t || !home) return null;
  const dir = `${String(home).replace(/[\\/]+$/, "")}/mods/pixel-quest`;
  return platform === "windows"
    ? { command: "powershell", args: ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", `${dir}/update.ps1`.replace(/\//g, "\\"), "-Tag", t] }
    : { command: "sh", args: [`${dir}/update.sh`, t] };
}

/** The last line of what the installer said, for the error toast. */
export function lastLine(r) {
  const lines = plain(`${r?.stdout ?? ""}\n${r?.stderr ?? ""}`.replace(/\t/g, " ")).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const said = lines.reverse().find((l) => l.startsWith("pixel-quest:")) ?? lines[0] ?? "";
  return said.replace(/^pixel-quest:\s*/, "").slice(0, 160);
}

/** After a start: show the notes? `seen`: the version whose notes were last shown (null: a first install). */
export function notesDue(seen, current = VERSION) {
  return Boolean(parseVer(seen)) && cmpVer(current, seen) > 0;
}
