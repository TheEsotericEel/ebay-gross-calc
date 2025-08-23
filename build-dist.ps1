Remove-Item -Recurse -Force dist -ErrorAction Ignore
$cfg = @{
  compilerOptions = @{
    target="ES2022"; module="ES2022"; moduleResolution="Bundler"
    rootDir="."; outDir="dist"; allowJs=$true; checkJs=$false; skipLibCheck=$true
    types=@("chrome")
  }
  include = @("src/**/*","content/**/*")
} | ConvertTo-Json -Depth 5
Set-Content tsconfig.build.json $cfg -Encoding UTF8
(Get-Content src\sw.ts) -replace 'from "./ebay"(;|")','from "./ebay.js"$1' | Set-Content src\sw.ts
npx tsc -p tsconfig.build.json
New-Item -ItemType Directory dist\public -Force | Out-Null
Copy-Item manifest.json dist\ -Force
Copy-Item public\popup.html,public\options.html dist\public\ -Force
Get-ChildItem -Recurse dist
