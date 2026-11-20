#!/usr/bin/env bash
# Réencode un rendu Remotion pour les éditeurs mobiles (CapCut…) :
# pas d'images B, image clé chaque seconde, timestamps à 0, audio coupé à la durée vidéo.
set -euo pipefail
in="$1"; out="${2:-${1%.mp4}-capcut.mp4}"
dur=$(ffprobe -v error -select_streams v -show_entries stream=duration -of csv=p=0 "$in")
ffmpeg -v error -y -i "$in" \
  -c:v libx264 -profile:v high -level 4.1 -pix_fmt yuv420p -color_range tv \
  -preset slow -crf 17 -bf 0 -g 30 -keyint_min 30 -sc_threshold 0 -fps_mode cfr -r 30 \
  -c:a aac -b:a 192k -ar 48000 -ac 2 -af "atrim=0:$dur" -t "$dur" \
  -movflags +faststart "$out"
echo "OK -> $out"
