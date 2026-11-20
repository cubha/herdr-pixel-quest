#!/bin/sh
# Pixel Quest in-app update (macOS, Linux): what the update window's [업데이트] runs.
#   sh update.sh v1.2.3
# Downloads that release from GitHub into a temp folder, runs `herdr-app check` on the mod
# in it, and only when that passes lets the release's own install.sh replace this one
# (--update: settings.json, keys.json and the shown layout stay as they are).
# Anything that fails leaves the installed version alone. The last line it prints starts
# with "pixel-quest:" and is what the notification shows.
# Copyright (c) 2026 cubha. MIT License.
# All of it is in main(), so the shell has read the whole file before the mod folder is replaced.
main() {
  tag="$1"
  die() { echo "pixel-quest: $1"; exit 1; }
  # Digits and dots only, as one whole line (no newline, nothing else).
  case "$tag" in *[!v0-9.]*|"") die "not a release tag" ;; esac
  printf '%s' "$tag" | grep -Eq '^v[0-9]{1,4}\.[0-9]{1,4}\.[0-9]{1,4}$' || die "not a release tag: $tag"
  # A fresh private folder each time (0700), gone when this ends.
  work=$(mktemp -d "${TMPDIR:-/tmp}/pixel-quest-update.XXXXXX") || die "임시 폴더를 만들지 못했습니다"
  trap 'rm -rf "$work"' EXIT
  mkdir "$work/x" || die "임시 폴더를 만들지 못했습니다"
  url="https://github.com/cubha/herdr-pixel-quest/archive/refs/tags/$tag.tar.gz"
  if command -v curl >/dev/null 2>&1; then curl -fsSL --proto '=https' --proto-redir '=https' --tlsv1.2 --max-time 120 -o "$work/release.tar.gz" "$url"
  elif command -v wget >/dev/null 2>&1; then wget -q --https-only -T 120 -O "$work/release.tar.gz" "$url"
  else die "curl이나 wget이 필요합니다"; fi || die "내려받지 못했습니다 ($tag)"
  tar -xzf "$work/release.tar.gz" -C "$work/x" || die "압축을 풀지 못했습니다"
  # A release holds plain files only: a link in it could point anywhere.
  [ -z "$(find "$work/x" -type l | head -n 1)" ] || die "받은 파일이 올바르지 않습니다"
  top=$(find "$work/x" -mindepth 1 -maxdepth 1 -type d | head -n 1)
  [ -n "$top" ] && [ -f "$top/mods/pixel-quest/main.js" ] && [ -f "$top/install.sh" ] || die "받은 파일에 모드가 없습니다"
  app="${HERDR_APP:-$(command -v herdr-app 2>/dev/null)}"
  [ -n "$app" ] || { [ -x /Applications/Herdr.app/Contents/MacOS/herdr-app ] && app=/Applications/Herdr.app/Contents/MacOS/herdr-app; }
  [ -n "$app" ] || die "herdr-app을 찾지 못해 검사할 수 없습니다 (install.sh로 직접 설치해 주세요)"
  "$app" check "$top/mods/pixel-quest" >"$work/check.log" 2>&1 || die "새 버전이 검사를 통과하지 못했습니다"
  # Into the folder this script runs from (<home>/mods/pixel-quest), wherever Herdr keeps its home.
  here=$(cd "$(dirname "$0")/../.." && pwd) || die "설치 폴더를 찾지 못했습니다"
  HERDR_APP_HOME="$here" HERDR_APP="$app" sh "$top/install.sh" --update >"$work/install.log" 2>&1 || die "설치 스크립트가 실패했습니다"
  echo "pixel-quest: $tag installed"
}
main "$@"; exit $?
