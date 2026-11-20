# Pixel Quest in-app update (Windows): what the update window's [업데이트] runs.
#   powershell -ExecutionPolicy Bypass -File update.ps1 -Tag v1.2.3
# Downloads that release from GitHub into a temp folder, runs `herdr-app check` on the mod
# in it, and only when that passes lets the release's own install.ps1 replace this one
# (-Update: settings.json, keys.json and the shown layout stay as they are).
# Anything that fails leaves the installed version alone. The last line it prints starts
# with "pixel-quest:" and is what the notification shows.
# Copyright (c) 2026 cubha. MIT License.
param([Parameter(Mandatory = $true)][string]$Tag)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = New-Object Text.UTF8Encoding $false
try {
  if ($Tag -notmatch '^v[0-9]{1,4}\.[0-9]{1,4}\.[0-9]{1,4}\z') { throw "not a release tag: $Tag" }
  [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
  $work = Join-Path ([IO.Path]::GetTempPath()) 'pixel-quest-update'
  if (Test-Path $work) { Remove-Item $work -Recurse -Force }
  New-Item -ItemType Directory -Force -Path $work | Out-Null
  $zip = Join-Path $work 'release.zip'
  $url = "https://github.com/cubha/herdr-pixel-quest/archive/refs/tags/$Tag.zip"
  try { Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing -TimeoutSec 120 }
  catch { throw "내려받지 못했습니다 ($Tag)" }
  try { Expand-Archive -LiteralPath $zip -DestinationPath (Join-Path $work 'x') -Force }
  catch { throw '압축을 풀지 못했습니다' }
  $top = Get-ChildItem (Join-Path $work 'x') -Directory | Select-Object -First 1
  # A release holds plain files only: a link in it could point anywhere.
  if (Get-ChildItem (Join-Path $work 'x') -Recurse -Force | Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint } | Select-Object -First 1) { throw '받은 파일이 올바르지 않습니다' }
  $mod = if ($top) { Join-Path $top.FullName 'mods\pixel-quest' } else { $null }
  $inst = if ($top) { Join-Path $top.FullName 'install.ps1' } else { $null }
  if (-not $mod -or -not (Test-Path (Join-Path $mod 'main.js')) -or -not (Test-Path $inst)) { throw '받은 파일에 모드가 없습니다' }
  $exe = Join-Path $env:LOCALAPPDATA 'Programs\herdr-app\herdr-app.exe'
  if (-not (Test-Path $exe)) { throw 'herdr-app.exe를 찾지 못해 검사할 수 없습니다 (install.ps1로 직접 설치해 주세요)' }
  # herdr-app.exe is a window program: PowerShell only waits for it (and learns how it ended) this way.
  $run = { param($file, $list, $log) (Start-Process -FilePath $file -ArgumentList $list -NoNewWindow -Wait -PassThru -RedirectStandardOutput (Join-Path $work "$log.log") -RedirectStandardError (Join-Path $work "$log.err.log")).ExitCode }
  if ((& $run $exe @('check', "`"$mod`"") 'check') -ne 0) { throw '새 버전이 검사를 통과하지 못했습니다' }
  # Into the folder this script runs from (<home>\mods\pixel-quest), wherever Herdr keeps its home.
  $env:HERDR_APP_HOME = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
  if ((& $run 'powershell' @('-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', "`"$inst`"", '-Update') 'install') -ne 0) { throw '설치 스크립트가 실패했습니다' }
  Write-Output "pixel-quest: $Tag installed"
  exit 0
} catch {
  Write-Output "pixel-quest: $($_.Exception.Message)"
  exit 1
} finally {
  if ($work -and (Test-Path $work)) { Remove-Item $work -Recurse -Force -ErrorAction SilentlyContinue }
}
