#!/usr/bin/env bash
# Mac/Linux version of deploy-staging.ps1. Run from anywhere:
#   scripts/deploy-staging.sh [--skip-pull] [--install] [--migrate]
# --skip-pull deploys what is already on this computer (use it after checking out another branch),
# --install after dependencies changed, --migrate whenever a new file appeared in drizzle/.
set -euo pipefail
cd "$(dirname "$0")/.."

SKIP_PULL=0; INSTALL=0; MIGRATE=0
while [ $# -gt 0 ]; do
  case "$1" in
    --skip-pull) SKIP_PULL=1; shift ;;
    --install) INSTALL=1; shift ;;
    --migrate) MIGRATE=1; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# Not secrets: ids and names only. The admin password and Staydesk secret already live on Cloudflare.
export D1_DATABASE_ID=ae1342bf-37c0-4167-971a-bf71c2eaa290 D1_DATABASE_NAME=drmstays-staging-db
export WORKER_NAME=drmstays-staging R2_BUCKET_NAME=drmstays-media
export STAYDESK_CATALOG_URL=https://staydesk-nine.vercel.app
# Staging's own address (canonical/hreflang/JSON-LD need it) and the flag that keeps it out of search engines.
export SITE_URL=https://drmstays-staging.truonggiangk02.workers.dev STAGING=1

if [ "$SKIP_PULL" = 0 ]; then
  REMOTE=$(git remote -v | awk '/truonggiangk02-sys\/drmstays/ {print $1; exit}')
  echo; echo "==> git pull ${REMOTE:-origin} main"; git pull "${REMOTE:-origin}" main
fi
if [ "$INSTALL" = 1 ]; then echo; echo "==> install dependencies"; npx pnpm@11.19.0 install; fi
echo; echo "==> build"; node scripts/run-framework.mjs build
echo; echo "==> write deploy config"; node scripts/deploy-config.mjs
if [ "$MIGRATE" = 1 ]; then echo; echo "==> apply database migrations"; npx wrangler d1 migrations apply DB --remote --config dist/server/wrangler.deploy.json; fi
echo; echo "==> deploy to Cloudflare"; npx wrangler deploy --config dist/server/wrangler.deploy.json
echo; echo "Done: https://drmstays-staging.truonggiangk02.workers.dev"
