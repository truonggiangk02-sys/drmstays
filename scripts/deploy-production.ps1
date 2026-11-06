# Deploys the real site (drmstays.vn). First time: create the resources and set the secrets as described in
# docs/DEPLOY.md (section "Production"), then run:   scripts\deploy-production.cmd -D1Id <database_id>
# Add -Migrate whenever a new file appeared in drizzle/. It asks you to type DEPLOY before anything goes live.
param([Parameter(Mandatory = $true)][string]$D1Id, [switch]$SkipPull, [switch]$Install, [switch]$Migrate)
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)

# Not secrets: names and ids only. The admin password, Staydesk secret and Telegram token are Cloudflare secrets.
$env:D1_DATABASE_ID = $D1Id
$env:D1_DATABASE_NAME = 'drmstays-db'
$env:WORKER_NAME = 'drmstays'
$env:R2_BUCKET_NAME = 'drmstays-prod-media'
$env:STAYDESK_CATALOG_URL = 'https://staydesk-nine.vercel.app'
$env:SITE_URL = 'https://drmstays.vn'
# Only domains already Active in this Cloudflare account can be attached. When drmstays.com is added there,
# append ',drmstays.com,www.drmstays.com' to both lines.
$env:CUSTOM_DOMAINS = 'drmstays.vn,www.drmstays.vn'
$env:REDIRECT_HOSTS = 'www.drmstays.vn'
Remove-Item Env:PREVIEW_DEMO -ErrorAction SilentlyContinue

function Step($label, $script) {
  Write-Host "`n==> $label" -ForegroundColor Cyan
  & $script
  if ($LASTEXITCODE -ne 0) { Write-Host "Stopped: '$label' failed." -ForegroundColor Red; exit 1 }
}

if ((Read-Host "Deploy to PRODUCTION https://drmstays.vn ? Type DEPLOY to continue") -ne 'DEPLOY') { Write-Host 'Cancelled.'; exit 1 }
if (-not $SkipPull) { Step 'git pull github main' { git pull github main } }
if ($Install) { Step 'install dependencies' { corepack pnpm install } }
Step 'build' { node scripts/run-framework.mjs build }
Step 'write deploy config' { node scripts/deploy-config.mjs }
if ($Migrate) { Step 'apply database migrations' { npx.cmd wrangler d1 migrations apply DB --remote --config dist/server/wrangler.deploy.json } }
Step 'deploy to Cloudflare' { npx.cmd wrangler deploy --config dist/server/wrangler.deploy.json }
Write-Host "`nDone: https://drmstays.vn" -ForegroundColor Green
