# Outflo — One-click deploy helper (Windows)
# Prepares secrets + env files, then deploys via Vercel/Render CLI if installed.
# Usage:  cd D:\Py_Projects\Outflo
#         .\deploy\one-click-deploy.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
Set-Location $Root

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  OUTFLO — One-Click Deploy Setup" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

function New-Secret([int]$bytes = 32) {
    $b = New-Object byte[] $bytes
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
    return [Convert]::ToBase64String($b).Replace("+","").Replace("/","").Substring(0, [Math]::Min(48, $bytes * 2))
}

$secretKey = New-Secret
$soJwt = New-Secret
$soPassword = "Outflo@" + (Get-Random -Maximum 9999).ToString("0000")

Write-Host "[1/6] Generated production secrets" -ForegroundColor Green

$mongoUrl = Read-Host "MongoDB Atlas URI (mongodb+srv://...)"
if (-not $mongoUrl) { Write-Host "MongoDB URL required. Get free cluster at https://cloud.mongodb.com" -ForegroundColor Red; exit 1 }

$aiProvider = Read-Host "AI provider [openai/anthropic/ollama] (default: openai)"
if (-not $aiProvider) { $aiProvider = "openai" }

$openaiKey = ""
$anthropicKey = ""
$aiModel = "gpt-4o-mini"
if ($aiProvider -eq "openai") {
    $openaiKey = Read-Host "OpenAI API key (sk-...)"
    $m = Read-Host "Model (default: gpt-4o-mini)"
    if ($m) { $aiModel = $m }
} elseif ($aiProvider -eq "anthropic") {
    $anthropicKey = Read-Host "Anthropic API key"
    $aiModel = "claude-3-5-haiku-20241022"
}

$vercelUrl = Read-Host "Vercel app URL after deploy (e.g. https://outflo.vercel.app) [press Enter to skip]"
if (-not $vercelUrl) { $vercelUrl = "https://YOUR-APP.vercel.app" }

$renderEnv = @"
MONGO_URL=$mongoUrl
MONGO_DATABASE=outflo
SECRET_KEY=$secretKey
DEBUG=false
APP_ENV=production
APP_URL=$vercelUrl
CORS_ORIGINS=["$vercelUrl"]
SYSTEM_OWNER_EMAIL=admin@outflo.com
SYSTEM_OWNER_PASSWORD=$soPassword
SYSTEM_OWNER_JWT_SECRET=$soJwt
AI_PROVIDER=$aiProvider
AI_DEFAULT_MODEL=$aiModel
OPENAI_API_KEY=$openaiKey
ANTHROPIC_API_KEY=$anthropicKey
"@

$vercelEnv = @"
NEXT_PUBLIC_API_URL=https://outflo-api.onrender.com
NEXT_PUBLIC_APP_URL=$vercelUrl
"@

$outDir = Join-Path $Root "deploy\generated"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$renderEnv | Out-File -Encoding utf8 (Join-Path $outDir "render.env")
$vercelEnv | Out-File -Encoding utf8 (Join-Path $outDir "vercel.env")

Write-Host "[2/6] Wrote deploy\generated\render.env and vercel.env" -ForegroundColor Green
Write-Host "      System Owner password: $soPassword" -ForegroundColor Yellow
Write-Host "      SAVE THIS PASSWORD — shown once!" -ForegroundColor Yellow

Write-Host ""
Write-Host "[3/6] Checking CLIs..." -ForegroundColor Cyan
$hasVercel = Get-Command vercel -ErrorAction SilentlyContinue
$hasRender = Get-Command render -ErrorAction SilentlyContinue

if (-not $hasVercel) {
    Write-Host "  Vercel CLI not found. Install: npm i -g vercel" -ForegroundColor Yellow
}
if (-not $hasRender) {
    Write-Host "  Render CLI not found. Install: https://render.com/docs/cli" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[4/6] Manual deploy (no Docker):" -ForegroundColor Cyan
Write-Host "  A) Render.com -> New Web Service -> repo, Root: apps/backend"
Write-Host "     Paste env from deploy\generated\render.env"
Write-Host "  B) Vercel.com -> Import repo, Root: apps/frontend"
Write-Host "     Add env from deploy\generated\vercel.env"
Write-Host "  C) Update render.env APP_URL + CORS with real Vercel URL, redeploy Render"
Write-Host ""
Write-Host "  Full guide: docs\DEPLOY_VERCEL_RENDER.md"
Write-Host ""

if ($hasRender) {
    $doRender = Read-Host "Deploy backend with Render CLI now? [y/N]"
    if ($doRender -eq "y") {
        Set-Location (Join-Path $Root "apps\backend")
        Write-Host "  Run: render deploy (follow prompts, link blueprint render.yaml)" -ForegroundColor Gray
        render deploy 2>$null
        Set-Location $Root
    }
}

if ($hasVercel) {
    $doVercel = Read-Host "Deploy frontend with Vercel CLI now? [y/N]"
    if ($doVercel -eq "y") {
        Set-Location (Join-Path $Root "apps\frontend")
        vercel --prod
        Set-Location $Root
    }
}

Write-Host ""
Write-Host "[5/6] After deploy, test:" -ForegroundColor Cyan
Write-Host "  $vercelUrl/system-owner/login"
Write-Host "  $vercelUrl/system-owner/setup"
Write-Host ""

Write-Host "[6/6] Done. Open deploy\generated\ for env files." -ForegroundColor Green
Write-Host ""
