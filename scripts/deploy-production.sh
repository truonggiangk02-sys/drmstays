#!/usr/bin/env bash
# Mac/Linux version of deploy-production.ps1. Run from anywhere:
#   scripts/deploy-production.sh --d1-id <database_id> [--migrate] [--skip-pull] [--install]
set -euo pipefail
cd "$(dirname "$0")/.."

D1_ID=""; MIGRATE=0; SKIP_PULL=0; INSTALL=0
while [ $# -gt 0 ]; do
  case "$1" in
    --d1-id) D1_ID="$2"; shift 2 ;;
    --migrate) MIGRATE=1; shift ;;
    --skip-pull) SKIP_PULL=1; shift ;;
    --install) INSTALL=1; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done
[ -n "$D1_ID" ] || { echo "Missing --d1-id <database_id>"; exit 1; }

# Not secrets: names and ids only. The admin password, Staydesk secret and Telegram token are Cloudflare secrets.
export D1_DATABASE_ID="$D1_ID" D1_DATABASE_NAME=drmstays-db WORKER_NAME=drmstays R2_BUCKET_NAME=drmstays-prod-media
export STAYDESK_CATALOG_URL=https://staydesk-nine.vercel.app SITE_URL=https://drmstays.vn
# Only domains already Active in this Cloudflare account can be attached. When drmstays.com is added there,
# append ",drmstays.com,www.drmstays.com" to both lines.
export CUSTOM_DOMAINS=drmstays.vn,www.drmstays.vn REDIRECT_HOSTS=www.drmstays.vn
unset PREVIEW_DEMO

read -r -p "Deploy to PRODUCTION https://drmstays.vn ? Type DEPLOY to continue: " answer
[ "$answer" = "DEPLOY" ] || { echo "Cancelled."; exit 1; }

if [ "$SKIP_PULL" = 0 ]; then
  REMOTE=$(git remote -v | awk '/truonggiangk02-sys\/drmstays/ {print $1; exit}')
  echo; echo "==> git pull ${REMOTE:-origin} main"; git pull "${REMOTE:-origin}" main
fi
if [ "$INSTALL" = 1 ]; then echo; echo "==> install dependencies"; npx pnpm@11.19.0 install; fi
echo; echo "==> build"; node scripts/run-framework.mjs build
echo; echo "==> write deploy config"; node scripts/deploy-config.mjs
if [ "$MIGRATE" = 1 ]; then echo; echo "==> apply database migrations"; npx wrangler d1 migrations apply DB --remote --config dist/server/wrangler.deploy.json; fi
echo; echo "==> deploy to Cloudflare"; npx wrangler deploy --config dist/server/wrangler.deploy.json
echo; echo "Done: https://drmstays.vn"
