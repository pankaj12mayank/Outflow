# Kill stale Node/Next on 3000/3001, wipe .next, start dev on port 3000.
$ErrorActionPreference = "SilentlyContinue"
Get-NetTCPConnection -LocalPort 3000,3001 -State Listen | ForEach-Object {
  Stop-Process -Id $_.OwningProcess -Force
}
Start-Sleep -Seconds 1
Set-Location $PSScriptRoot\..
if (Test-Path .next) { Remove-Item -Recurse -Force .next }
$env:PORT = "3000"
npm run dev
