Remove-Item -Recurse -Force dist -ErrorAction Ignore
npx tsc -p tsconfig.sw.json
npx tsc -p tsconfig.content.json
New-Item -ItemType Directory -Force dist\content | Out-Null
Copy-Item manifest.json dist\
Copy-Item public\popup.html dist\popup.html
Copy-Item public\options.html dist\options.html
Copy-Item src\content\content.css dist\content\content.css -ErrorAction Ignore
Get-ChildItem dist\sw.js, dist\popup.html, dist\options.html, dist\content\content.js | Format-Table Name,Length
