#!/usr/bin/env bash
# Pixel Quest checks: unit tests, layout/theme JSON, and `herdr-app check` of the
# mod once per role (each role is forced in a scratch copy, since check renders
# with no props). Needs node; the herdr-app check step needs Herdr on Windows
# (WSL) and is skipped elsewhere. Usage: bash verify.sh [--full|--ts-only]
set -uo pipefail
cd "$(dirname "$0")"
fail=0
step() { printf '\n== %s\n' "$1"; }

step "unit tests"
node --test tests/*.test.mjs 2>&1 | grep -E '^# (pass|fail)|^not ok' ; [ "${PIPESTATUS[0]}" -eq 0 ] || fail=1

step "json"
for f in layouts/*.json themes/*.json mods/pixel-quest/mod.json; do
  node -e "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'))" "$f" || { echo "bad json: $f"; fail=1; }
done

step "syntax"
for f in mods/pixel-quest/*.js mods/pixel-quest/roles/*.js; do
  node --input-type=module --check < "$f" 2>/dev/null || { node --input-type=module --check < "$f"; echo "syntax: $f"; fail=1; }
done

[ "${1:-}" = "--ts-only" ] && { [ $fail -eq 0 ] && echo "PASS (quick)" || echo FAIL; exit $fail; }

X="${HERDR_APP:-$(ls /mnt/c/Users/*/AppData/Local/Programs/herdr-app/herdr-app.exe 2>/dev/null | head -1)}"
if [ -x "$X" ] && command -v wslpath >/dev/null; then
  step "herdr-app check per role"
  roles=$(sed -n 's/^const ROLES = {\(.*\)};/\1/p' mods/pixel-quest/main.js | grep -oE '[a-z]+:' | tr -d ':')
  tmp=.check; rm -rf "$tmp"; mkdir -p "$tmp"
  for r in $roles; do
    d="$tmp/$r"; cp -r mods/pixel-quest "$d"
    sed -i "s/const pr = props() ?? p ?? {};/const pr = { role: \"$r\", ...(props() ?? p ?? {}) };/" "$d/main.js"
    out=$(cd /mnt/c && timeout 60 "$X" check "$(wslpath -w "$OLDPWD/$d")" 2>&1); code=$?
    if [ $code -eq 0 ]; then echo "ok   $r"; else echo "FAIL $r"; echo "$out" | tail -5; fail=1; fi
  done
  rm -rf "$tmp"
else
  echo "(herdr-app not found: role check skipped)"
fi

[ $fail -eq 0 ] && echo -e "\nPASS" || echo -e "\nFAIL"
exit $fail
