#!/usr/bin/env bash
# Usage: ci_fetch_artifact.sh <signed_download_url> <out_dir>
set -euo pipefail
mkdir -p "$2"
curl -sL "$1" -o "$2/a.zip"
unzip -o -q "$2/a.zip" -d "$2"
grep -hE "error:" "$2"/build.log "$2"/test.log 2>/dev/null | sed 's|/Users/runner/work/KAYSD3SIGN/KAYSD3SIGN/||' | sort -u | head -80 || true
