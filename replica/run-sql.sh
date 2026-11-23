#!/usr/bin/env bash
# Exécute un fichier SQL sur le projet Supabase via le Management API.
# Usage : SUPABASE_PROJECT_REF=xxxx replica/run-sql.sh fichier.sql
# Le jeton est injecté par l'environnement (ou mets SUPABASE_ACCESS_TOKEN pour un usage local).
set -euo pipefail
ref="${SUPABASE_PROJECT_REF:?SUPABASE_PROJECT_REF manquant}"
auth=()
if [ -n "${SUPABASE_ACCESS_TOKEN:-}" ]; then auth=(-H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"); fi
python3 -c "import json,sys; print(json.dumps({'query': open(sys.argv[1]).read()}))" "$1" |
  curl -sS --max-time 120 -X POST "${auth[@]}" -H "Content-Type: application/json" --data-binary @- \
    "https://api.supabase.com/v1/projects/$ref/database/query"
echo
