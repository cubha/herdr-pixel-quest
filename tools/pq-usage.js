#!/usr/bin/env node
// Pixel Quest usage bridge: hands Claude Code's 5-hour / 7-day rate-limit usage
// to the theme's status bar gauges.
//
// Claude Code passes `rate_limits` to its status line command on stdin (claude.ai
// Pro/Max, after the session's first response). This saves that part to
// `pixel-quest-usage.json` in Herdr's app folder, where the status bar reads it.
// Nothing is sent anywhere; no token is read.
//
// Use it as a wrapper around your status line in ~/.claude/settings.json:
//   "statusLine": { "type": "command",
//     "command": "node /path/to/pq-usage.js -- node ~/.claude/hooks/statusline.js" }
// or alone, when you have no status line of your own (prints nothing):
//   "command": "node /path/to/pq-usage.js"
// Or from your own Node status line script: require("./pq-usage.js").save(input).
//
// Where the file goes: $PQ_USAGE_FILE, else $HERDR_APP_HOME/pixel-quest-usage.json,
// else ~/.config/herdr-app/pixel-quest-usage.json. Claude Code in WSL with Herdr
// on Windows: set PQ_USAGE_FILE=/mnt/c/Users/<you>/.config/herdr-app/pixel-quest-usage.json
//
// Copyright (c) 2026 cubha. MIT License.

const fs = require("fs");
const os = require("os");
const path = require("path");

function target() {
  if (process.env.PQ_USAGE_FILE) return process.env.PQ_USAGE_FILE;
  const home = process.env.HERDR_APP_HOME || path.join(os.homedir(), ".config", "herdr-app");
  return path.join(home, "pixel-quest-usage.json");
}

/** Saves `input.rate_limits` (the windows present) when it changed. Never throws. */
function save(input, file = target()) {
  try {
    const rl = input && input.rate_limits;
    if (!rl) return false;
    const pick = (w) => (w && typeof w.used_percentage === "number"
      ? { used_percentage: w.used_percentage, resets_at: w.resets_at ?? null } : undefined);
    const data = { five_hour: pick(rl.five_hour), seven_day: pick(rl.seven_day) };
    if (!data.five_hour && !data.seven_day) return false;
    const body = JSON.stringify(data);
    let old = null;
    try { old = JSON.parse(fs.readFileSync(file, "utf8")); } catch {}
    if (old && JSON.stringify({ five_hour: old.five_hour, seven_day: old.seven_day }) === body) return false;
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify({ ...data, updated_at: Date.now() }));
    fs.renameSync(tmp, file);
    return true;
  } catch {
    return false;
  }
}

module.exports = { save, target };

if (require.main === module) {
  const raw = fs.readFileSync(0, "utf8");
  let input = {};
  try { input = JSON.parse(raw || "{}"); } catch {}
  save(input);
  const i = process.argv.indexOf("--");
  if (i > 0 && process.argv.length > i + 1) {
    const { spawnSync } = require("child_process");
    // One word after "--" is a whole command line for the shell ("node a.js --x");
    // several are argv as your shell already split them, run as given.
    const [cmd, ...args] = process.argv.slice(i + 1);
    const r = args.length ? spawnSync(cmd, args, { input: raw, encoding: "utf8" })
      : spawnSync(cmd, { input: raw, shell: true, encoding: "utf8" });
    process.stdout.write(r.stdout || "");
    process.exitCode = r.status ?? 0;
  }
}
