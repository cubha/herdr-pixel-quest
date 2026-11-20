#!/bin/sh
# Pixel Quest for Herdr - installer for macOS and Linux (no git needed)
# Usage: sh install.sh [--sounds] [--light] [--update]
# Copies the dark and light layouts and themes, and replaces mods/pixel-quest whole.
# --sounds: 8-bit alert sounds in settings.json (backup kept; needs python3 or node).
# --light: switch to the light look.
# --update: what the in-app update runs. The mod is brought up to date file by file (only
#   files that differ are written, main.js last, files that are gone removed), since Herdr
#   is running it; the shown layout is left as it is.
# The theme's palette / go-to / rename keys: see "선택 기능" in the README (keys.json by hand).
# Copyright (c) 2026 cubha. MIT License.
main() {
  set -eu
  sounds=0; light=0; update=0
  for a in "$@"; do
    case "$a" in
      --sounds) sounds=1 ;; --light) light=1 ;; --update) update=1 ;;
      *) echo "unknown option: $a (use --sounds, --light, --update)"; exit 2 ;;
    esac
  done
  src=$(cd "$(dirname "$0")" && pwd)
  home="${HERDR_APP_HOME:-$HOME/.config/herdr-app}"
  mkdir -p "$home/layouts" "$home/themes" "$home/mods"
  cp "$src"/layouts/pixel-quest*.json "$src"/layouts/pixel-quest*.png "$home/layouts/"
  cp "$src"/themes/pixel-quest*.json "$home/themes/"
  from="$src/mods/pixel-quest"; mod="$home/mods/pixel-quest"
  if [ "$update" = 1 ] && [ -d "$mod" ]; then
    # Herdr reloads the mod on every save: write only what differs, scripts after everything
    # else and main.js last, so the reload that counts sees the whole new version.
    put() {
      rel=${1#"$from"/}
      cmp -s "$1" "$mod/$rel" 2>/dev/null && return 0
      mkdir -p "$(dirname "$mod/$rel")"
      cp "$1" "$mod/$rel"
    }
    find "$from" -type f ! -name '*.js' | while IFS= read -r f; do put "$f"; done
    find "$from" -type f -name '*.js' ! -path "$from/main.js" | while IFS= read -r f; do put "$f"; done
    put "$from/main.js"
    # (Herdr writes its own jsconfig.json and .d.ts files into the folder: those stay.)
    find "$mod" -type f ! -name jsconfig.json ! -name '*.d.ts' | while IFS= read -r f; do
      [ -e "$from/${f#"$mod"/}" ] || rm -f "$f"
    done
  else
    rm -rf "$mod"
    cp -R "$from" "$home/mods/"
  fi
  echo "Copied to $home"
  if [ "$sounds" = 1 ]; then
    sp="$home/settings.json"
    [ -f "$sp" ] && [ ! -f "$sp.bak" ] && cp "$sp" "$sp.bak"
    if command -v python3 >/dev/null 2>&1; then
      python3 - "$sp" <<'PY'
import json, os, sys
p = sys.argv[1]
try:
    s = json.load(open(p, encoding="utf-8")) if os.path.exists(p) else {}
except ValueError:
    sys.exit("settings.json is not valid JSON: left as is")
s["sounds"] = {"enabled": True, "done": "mods/pixel-quest/sounds/quest-done.mp3", "blocked": "mods/pixel-quest/sounds/quest-blocked.mp3"}
json.dump(s, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
PY
      echo "8-bit sounds set in settings.json (backup: settings.json.bak)"
    elif command -v node >/dev/null 2>&1; then
      node -e 'const fs=require("fs"),p=process.argv[1];let s={};if(fs.existsSync(p))s=JSON.parse(fs.readFileSync(p,"utf8"));s.sounds={enabled:true,done:"mods/pixel-quest/sounds/quest-done.mp3",blocked:"mods/pixel-quest/sounds/quest-blocked.mp3"};fs.writeFileSync(p,JSON.stringify(s,null,2));' "$sp"
      echo "8-bit sounds set in settings.json (backup: settings.json.bak)"
    else
      echo "--sounds needs python3 or node: see the README (효과음) to set it by hand"
    fi
  fi
  app="${HERDR_APP:-$(command -v herdr-app 2>/dev/null || true)}"
  if [ -z "$app" ] && [ -x /Applications/Herdr.app/Contents/MacOS/herdr-app ]; then app=/Applications/Herdr.app/Contents/MacOS/herdr-app; fi
  if [ -n "$app" ]; then
    "$app" check "$mod"
    if [ "$update" = 1 ]; then echo "Updated."; return 0; fi
    name=pixel-quest; [ "$light" = 1 ] && name=pixel-quest-light
    if "$app" do layout.switch --name "$name" >/dev/null 2>&1; then echo "Done. The layout key switches layouts."
    else echo "Done. Open Herdr, then Settings > Look > Layout > $name."; fi
  elif [ "$update" = 1 ]; then echo "Updated."
  else echo "Done. In Herdr: Settings > Look > Layout > pixel-quest (herdr-app was not found, so the mod was not checked)."
  fi
}
main "$@"; exit
