#!/usr/bin/env bash
# Exporte la version web et la publie sur Cloudflare Workers.
# Usage (depuis mobile/) : HC_WORKER=hotcouple-xxxx CLOUDFLARE_ACCOUNT_ID=... CLOUDFLARE_API_TOKEN=... deploy/deploy-web.sh
set -euo pipefail
name="${HC_WORKER:?HC_WORKER manquant (nom du Worker)}"
tmp="$(mktemp -d)"
CI=1 npx expo export --platform web --output-dir "$tmp/web"
python3 deploy/build-worker.py "$tmp/web" "$tmp/worker" "$name"
(cd "$tmp/worker" && WRANGLER_SEND_METRICS=false npx -y wrangler@4 deploy)
