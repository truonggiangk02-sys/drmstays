# Deploys the current main to the staging Worker. Run from the project folder:
#   scripts\deploy-staging.cmd
# Set -SkipPull to deploy what is already on this computer, -Install after dependencies changed,
# -Migrate whenever a new file appeared in drizzle/ (run it BEFORE the new code goes live).
param([switch]$SkipPull, [switch]$Install, [switch]$Migrate)
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)

# Not secrets: ids and names only. The admin password and Staydesk secret already live on Cloudflare.
$env:D1_DATABASE_ID = 'ae1342bf-37c0-4167-971a-bf71c2eaa290'
$env:D1_DATABASE_NAME = 'drmstays-staging-db'
$env:WORKER_NAME = 'drmstays-staging'
$env:R2_BUCKET_NAME = 'drmstays-media'
$env:STAYDESK_CATALOG_URL = 'https://staydesk-nine.vercel.app'
# Staging's own address (canonical/hreflang/JSON-LD need it) and the flag that keeps it out of search engines.
$env:SITE_URL = 'https://drmstays-staging.truonggiangk02.workers.dev'
$env:STAGING = '1'

function Step($label, $script) {
  Write-Host "`n==> $label" -ForegroundColor Cyan
  & $script
  if ($LASTEXITCODE -ne 0) { Write-Host "Stopped: '$label' failed." -ForegroundColor Red; exit 1 }
}

if (-not $SkipPull) { Step 'git pull github main' { git pull github main } }
if ($Install) { Step 'install dependencies' { corepack pnpm install } }
Step 'build' { node scripts/run-framework.mjs build }
Step 'write deploy config' { node scripts/deploy-config.mjs }
if ($Migrate) { Step 'apply database migrations' { npx.cmd wrangler d1 migrations apply DB --remote --config dist/server/wrangler.deploy.json } }
Step 'deploy to Cloudflare' { npx.cmd wrangler deploy --config dist/server/wrangler.deploy.json }
Write-Host "`nDone: https://drmstays-staging.truonggiangk02.workers.dev" -ForegroundColor Green
