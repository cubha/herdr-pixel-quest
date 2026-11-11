# Pixel Quest for Herdr - offline installer (no git needed)
# Usage: right-click > Run with PowerShell, or:
#   powershell -ExecutionPolicy Bypass -File install.ps1 [-Sounds] [-Light]
# Copies the dark and light layouts and themes, and replaces mods\pixel-quest whole.
# -Sounds: 8-bit alert sounds in settings.json (backup kept). -Light: switch to the light look.
# Copyright (c) 2026 cubha. MIT License.
param([switch]$Sounds, [switch]$Light)
$ErrorActionPreference = 'Stop'
$src  = Split-Path -Parent $MyInvocation.MyCommand.Path
$home_ = if ($env:HERDR_APP_HOME) { $env:HERDR_APP_HOME } else { Join-Path $env:USERPROFILE '.config\herdr-app' }
foreach ($d in 'layouts','themes','mods') { New-Item -ItemType Directory -Force -Path (Join-Path $home_ $d) | Out-Null }
Copy-Item (Join-Path $src 'layouts\pixel-quest*.json'), (Join-Path $src 'layouts\pixel-quest*.png') (Join-Path $home_ 'layouts') -Force
Copy-Item (Join-Path $src 'themes\pixel-quest*.json') (Join-Path $home_ 'themes') -Force
$mod = Join-Path $home_ 'mods\pixel-quest'
if (Test-Path $mod) { Remove-Item $mod -Recurse -Force }
Copy-Item (Join-Path $src 'mods\pixel-quest') (Join-Path $home_ 'mods') -Recurse -Force
Write-Host "Copied to $home_"
if ($Sounds) {
  $sp = Join-Path $home_ 'settings.json'
  $s = $null
  if (Test-Path $sp) { $s = Get-Content $sp -Raw -Encoding UTF8 | ConvertFrom-Json }
  if (-not $s) { $s = New-Object psobject }
  $snd = [pscustomobject]@{ enabled = $true; done = 'mods/pixel-quest/sounds/quest-done.mp3'; blocked = 'mods/pixel-quest/sounds/quest-blocked.mp3' }
  $s | Add-Member -NotePropertyName sounds -NotePropertyValue $snd -Force
  # Keep the first backup: running this twice must not overwrite the original.
  if ((Test-Path $sp) -and -not (Test-Path "$sp.bak")) { Copy-Item $sp "$sp.bak" }
  [IO.File]::WriteAllText($sp, ($s | ConvertTo-Json -Depth 20), (New-Object Text.UTF8Encoding $false))
  Write-Host "8-bit sounds set in settings.json (backup: settings.json.bak)"
}
$exe = Join-Path $env:LOCALAPPDATA 'Programs\herdr-app\herdr-app.exe'
if (Test-Path $exe) {
  & $exe check $mod
  $ErrorActionPreference = 'Continue'
  $name = if ($Light) { 'pixel-quest-light' } else { 'pixel-quest' }
  & $exe do layout.switch --name $name 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) { Write-Host 'Done. Ctrl+Shift+L switches layouts.' }
  else { Write-Host "Done. Open Herdr, then Settings > Look > Layout > $name." }
} else {
  Write-Host 'Done. In Herdr: Settings > Look > Layout > pixel-quest.'
}
