#!/usr/bin/env bash
# MOTOFORGE reconstruction pipeline (any bike with a dimensioned reference model and a photoqc spec).
#   tools/recon3d/run.sh <generation> <out_dir> <left.glb> [<right.glb>]
# 1) align + fuse sides + split components + accessories → <out_dir>/<generation>.glb
# 2) render the 6 MOTOFORGE angles from that single geometry → <out_dir>/renders
# 3) automatic QC of the renders (tools/photoqc) → <out_dir>/qc.md (mechanical review: reviews/<generation>-recon.json)
set -euo pipefail
GEN=$1; OUT=$2; LEFT=$3; RIGHT=${4:-}
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
BLENDER=${BLENDER:-/opt/blender-4.2.3-linux-x64/blender}
REF="$ROOT/web/public/models/${GEN#honda.}.glb"; REF=${REF/cb125r.jc91/cb125r-jc91}
mkdir -p "$OUT"
ARGS=(--ref "$REF" --recon "$LEFT" --out "$OUT/$GEN.glb" --report "$OUT/assemble.json" --renders "$OUT/renders")
[ -n "$RIGHT" ] && ARGS+=(--recon "$RIGHT" --sides left,right)
"$BLENDER" -b -P "$ROOT/tools/recon3d/assemble.py" -- "${ARGS[@]}" | grep -E '^\[(align|report)\]'
REVIEW="$ROOT/tools/photoqc/reviews/$GEN-recon.json"
python3 "$ROOT/tools/photoqc/qc.py" "$OUT/renders" "$ROOT/tools/photoqc/specs/$GEN.json" \
  $( [ -f "$REVIEW" ] && echo --review "$REVIEW" ) --out "$OUT/qc.json" --md "$OUT/qc.md"
echo "→ $OUT/$GEN.glb : à importer dans l'app (Menu → Modèle 3D reconstruit) une fois la revue mécanique « ok »."
