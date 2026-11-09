# Pixel Quest demo screen: the theme's 16 ANSI colors and a short quest log,
# for previews. Run in a Herdr terminal: powershell -NoExit -ExecutionPolicy Bypass -File tools/demo.ps1
# Copyright (c) 2026 cubha. MIT License.
$e = [char]27
Write-Host "$e[93m* 퀘스트 로그$e[0m  $e[90m(pixel-quest 데모)$e[0m"
Write-Host ""
Write-Host "$e[94m●$e[0m 던전 입구에 도착했습니다."
Write-Host "$e[92m✓$e[0m 금테 프레임 9-slice 장착 $e[90m· 모서리 보석 4개$e[0m"
Write-Host "$e[92m✓$e[0m Galmuri 픽셀 폰트 장착 $e[90m· 11 / 9 / Mono11$e[0m"
Write-Host "$e[33m!$e[0m 횃불이 흔들립니다 $e[90m— 배경과 분리됨$e[0m"
Write-Host "$e[91m✗$e[0m 함정 발견 $e[90m(재시도 1/3)$e[0m"
Write-Host ""
Write-Host "$e[90mANSI 16색$e[0m"
$row = ""; foreach ($c in 40..47) { $row += "$e[${c}m    $e[0m " }; Write-Host $row
$row = ""; foreach ($c in 100..107) { $row += "$e[${c}m    $e[0m " }; Write-Host $row
$row = ""; foreach ($c in 30..37) { $row += "$e[${c}m가A1 $e[0m" }; Write-Host $row
$row = ""; foreach ($c in 90..97) { $row += "$e[${c}m가A1 $e[0m" }; Write-Host $row
Write-Host ""
