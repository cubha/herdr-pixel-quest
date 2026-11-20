# Pixel Quest for Herdr - offline installer (no git needed)
# Usage: right-click > Run with PowerShell, or:
#   powershell -ExecutionPolicy Bypass -File install.ps1 [-Sounds] [-Light] [-Palette]
# -Update: what the in-app update runs. The mod is brought up to date file by file (only
#   files that differ are written, main.js last, files that are gone removed), since Herdr
#   is running it; the shown layout is left as it is.
# Copies the dark and light layouts and themes, and replaces mods\pixel-quest whole.
# -Sounds: 8-bit alert sounds in settings.json (backup kept). -Light: switch to the light look.
# -Palette: Ctrl+Shift+P, Ctrl+Shift+K, F2, Shift+F2 and Ctrl+? open the theme's palette,
#   go-to, rename and key-list windows (keys.json, backup kept; undo: set them back to
#   app.palette / mod.open:picker / tab.rename / space.rename / app.help).
# Copyright (c) 2026 cubha. MIT License.
param([switch]$Sounds, [switch]$Light, [switch]$Palette, [switch]$Update)
$ErrorActionPreference = 'Stop'
$src  = Split-Path -Parent $MyInvocation.MyCommand.Path
$home_ = if ($env:HERDR_APP_HOME) { $env:HERDR_APP_HOME } else { Join-Path $env:USERPROFILE '.config\herdr-app' }
foreach ($d in 'layouts','themes','mods') { New-Item -ItemType Directory -Force -Path (Join-Path $home_ $d) | Out-Null }
Copy-Item (Join-Path $src 'layouts\pixel-quest*.json'), (Join-Path $src 'layouts\pixel-quest*.png') (Join-Path $home_ 'layouts') -Force
Copy-Item (Join-Path $src 'themes\pixel-quest*.json') (Join-Path $home_ 'themes') -Force
$mod = Join-Path $home_ 'mods\pixel-quest'
$from = Join-Path $src 'mods\pixel-quest'
if ($Update -and (Test-Path $mod)) {
  # Herdr reloads the mod on every save: write only what differs, scripts after everything
  # else and main.js last, so the reload that counts sees the whole new version.
  $same = { param($a, $b) (Test-Path $b) -and ((Get-FileHash $a -Algorithm SHA256).Hash -eq (Get-FileHash $b -Algorithm SHA256).Hash) }
  $files = Get-ChildItem $from -Recurse -File | Sort-Object @{ Expression = { if ($_.Name -eq 'main.js') { 2 } elseif ($_.Extension -eq '.js') { 1 } else { 0 } } }, FullName
  foreach ($f in $files) {
    $rel = $f.FullName.Substring($from.Length + 1)
    $to = Join-Path $mod $rel
    if (-not (& $same $f.FullName $to)) {
      New-Item -ItemType Directory -Force -Path (Split-Path -Parent $to) | Out-Null
      Copy-Item -LiteralPath $f.FullName -Destination $to -Force
    }
  }
  # (Herdr writes its own jsconfig.json and .d.ts files into the folder: those stay.)
  Get-ChildItem $mod -Recurse -File | Where-Object { $_.Name -ne 'jsconfig.json' -and $_.Name -notlike '*.d.ts' -and -not (Test-Path -LiteralPath (Join-Path $from $_.FullName.Substring($mod.Length + 1))) } | Remove-Item -Force
} else {
  if (Test-Path $mod) { Remove-Item $mod -Recurse -Force }
  Copy-Item $from (Join-Path $home_ 'mods') -Recurse -Force
}
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
if ($Palette) {
  $kp = Join-Path $home_ 'keys.json'
  if (Test-Path $kp) {
    $text = Get-Content $kp -Raw -Encoding UTF8
    $orig = $text
    # Each key only when it still has Herdr's own action.
    $swaps = @(
      @('ctrl-shift-p', 'app\.palette', 'pixel-quest.palette', 'Ctrl+Shift+P: theme command palette'),
      @('ctrl-shift-k', 'mod\.open:picker', 'pixel-quest.goto', 'Ctrl+Shift+K: theme go-to window'),
      @('f2', 'tab\.rename', 'pixel-quest.rename_tab', 'F2: theme rename-tab window'),
      @('shift-f2', 'space\.rename', 'pixel-quest.rename_space', 'Shift+F2: theme rename-space window'),
      @('ctrl-?', 'app\.help', 'pixel-quest.help', 'Ctrl+?: theme key list'),
      @('ctrl-shift-/', 'app\.help', 'pixel-quest.help', 'Ctrl+Shift+/: theme key list'),
      @('ctrl-shift-?', 'app\.help', 'pixel-quest.help', 'Ctrl+Shift+?: theme key list')
    )
    foreach ($w in $swaps) {
      $pat = '"' + [regex]::Escape($w[0]) + '"(\s*):(\s*)"' + $w[1] + '"'
      if ($text -match $pat) { $text = $text -replace $pat, ('"' + $w[0] + '"$1:$2"' + $w[2] + '"'); Write-Host $w[3] }
      else { Write-Host ("keys.json: {0} is not Herdr's default; left as is" -f $w[0]) }
    }
    if ($text -ne $orig) {
      if (-not (Test-Path "$kp.bak")) { Copy-Item $kp "$kp.bak" }
      [IO.File]::WriteAllText($kp, $text, (New-Object Text.UTF8Encoding $false))
      Write-Host 'keys.json changed (backup: keys.json.bak)'
    }
  } else { Write-Host 'keys.json not found yet: start Herdr once, then run with -Palette again' }
}
$exe = Join-Path $env:LOCALAPPDATA 'Programs\herdr-app\herdr-app.exe'
if (Test-Path $exe) {
  # herdr-app.exe is a window program: PowerShell only waits for it (and learns how it ended) this way.
  $checked = (Start-Process -FilePath $exe -ArgumentList @('check', "`"$mod`"") -NoNewWindow -Wait -PassThru).ExitCode
  if ($Update) { if ($checked -ne 0) { exit 1 }; Write-Host 'Updated.'; exit 0 }
  if ($checked -ne 0) { Write-Host 'herdr-app check failed: see the message above.' }
  $ErrorActionPreference = 'Continue'
  $name = if ($Light) { 'pixel-quest-light' } else { 'pixel-quest' }
  & $exe do layout.switch --name $name 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) { Write-Host 'Done. Ctrl+Shift+L switches layouts.' }
  else { Write-Host "Done. Open Herdr, then Settings > Look > Layout > $name." }
} elseif ($Update) {
  Write-Host 'Updated.'
} else {
  Write-Host 'Done. In Herdr: Settings > Look > Layout > pixel-quest.'
}
