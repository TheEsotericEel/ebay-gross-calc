# build.ps1 — clean, compile, copy, auto-bump manifest version

# 1) Clean
Remove-Item -Recurse -Force dist -ErrorAction Ignore

# 2) Compile
npx tsc -p tsconfig.sw.json
npx tsc -p tsconfig.content.json

# 3) Copy static
Copy-Item manifest.json dist\ -Force
Copy-Item public\popup.html dist\popup.html -Force
Copy-Item public\popup.js dist\popup.js -Force
Copy-Item public\options.html dist\options.html -Force
Copy-Item public\options.js dist\options.js -Force
Copy-Item public\*.css dist\ -Force

# 4) Auto-bump version in dist\manifest.json
$mfPath = "dist\manifest.json"
$mf = Get-Content $mfPath -Raw | ConvertFrom-Json
$now = Get-Date
# Safe Chrome numeric scheme: 0.1.(YY*1000 + DOY).HHmm  — each part <= 65535
$build = (($now.Year - 2000) * 1000) + $now.DayOfYear      # e.g. 25*1000+237 = 25237
$patch = [int]$now.ToString("HHmm")                       # e.g. 1934
$mf.version = "0.1.$build.$patch"
$mf | ConvertTo-Json -Depth 10 | Set-Content $mfPath -Encoding UTF8
Write-Host "Version set to $($mf.version)"

# 5) Done
Write-Host "Build complete. Reload the unpacked extension in chrome://extensions."
