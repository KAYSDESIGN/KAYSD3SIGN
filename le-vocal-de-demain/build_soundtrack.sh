#!/usr/bin/env bash
# Assemble la bande-son de l'épisode 1 (60 s) dans public/soundtrack.wav.
# Bruitages : public/sfx (LaSonotheque.fr). Les sons absents (bourdonnement,
# tonalité, bips, néon, grésillement) sont synthétisés.
set -euo pipefail
cd "$(dirname "$0")/public"
SR=48000

# Place un extrait : src, début dans le fichier, durée, instant dans la vidéo, filtres en plus
part() {
  local end ms
  end=$(awk "BEGIN{printf \"%.3f\", $2+$3}")
  ms=$(awk "BEGIN{printf \"%d\", $4*1000}")
  echo "atrim=$2:$end,asetpts=PTS-STARTPTS,aresample=$SR,aformat=channel_layouts=stereo${5:+,$5},adelay=$ms|$ms"
}

ffmpeg -v error -y \
  -i sfx/vibreur.mp3 -i sfx/horloge.wav -i sfx/coups.wav -i sfx/ampoule.wav -i sfx/pas.wav \
  -f lavfi -i "anoisesrc=c=pink:r=$SR:a=1:d=8" \
  -f lavfi -i "aevalsrc='0.6*sin(2*PI*48*t)+0.3*sin(2*PI*96*t)+0.15*sin(2*PI*61*t)':s=$SR:d=8" \
  -f lavfi -i "aevalsrc='sin(2*PI*440*t)*lt(mod(t,2.7),1.5)':s=$SR:d=4.2" \
  -f lavfi -i "aevalsrc='sin(2*PI*425*t)*lt(mod(t,0.3),0.15)':s=$SR:d=0.6" \
  -f lavfi -i "aevalsrc='(0.5*sin(2*PI*100*t)+0.3*sin(2*PI*200*t)+0.2*sin(2*PI*300*t))*(0.85+0.15*sin(2*PI*7*t))':s=$SR:d=3.05" \
  -i sfx/coeur.wav -i sfx/respiration.wav \
  -filter_complex "
  [0]$(part 0 0 3.2 0.3 volume=0.9)[vib1];
  [0]$(part 0 2.0 1.2 47.5 volume=0.9)[vib2];
  [1]aloop=loop=1:size=432000,$(part 1 0 10.15 4.2 volume=0.55)[clock];
  [5]highpass=f=1200,lowpass=f=5000,tremolo=f=11:d=0.6,$(part 5 0 8 4 'volume=0.035,afade=t=in:d=0.4,afade=t=out:st=7.6:d=0.4')[gres];
  [2]$(part 2 0.15 1.2 15.95 volume=1.0)[knock];
  [6]lowpass=f=200,$(part 6 0 8 16.2 'volume=0.22,afade=t=in:d=1.2,afade=t=out:st=7.3:d=0.5')[drone];
  [7]$(part 7 0 4.2 24.3 'volume=0.12,lowpass=f=3000')[tone];
  [2]$(part 2 5.45 1.25 29.2 'asetrate=38400,aresample=48000,lowpass=f=2500,volume=1.6')[heavy];
  [8]$(part 8 0 0.6 31.2 volume=0.12)[bip];
  [4]$(part 4 0 4.8 32.1 'lowpass=f=1800,volume=0.55,afade=t=out:st=4.3:d=0.5')[steps];
  [9]$(part 9 0 3.05 37.0 'volume=0.06,afade=t=in:d=0.3')[neon];
  [3]$(part 3 0 1.4 40.0 volume=0.7)[blink];
  [10]$(part 10 0 6.5 46.5 'volume=0.55,afade=t=in:d=0.5')[heart];
  [11]$(part 11 0 8 4.2 'volume=0.5,afade=t=in:d=3,afade=t=out:st=7.5:d=0.3')[breath1];
  [11]$(part 11 0.8 1.6 32.0 'volume=0.35,afade=t=out:st=1.3:d=0.3')[breath2];
  [2]$(part 2 2.28 0.6 59.0 'lowpass=f=1500,volume=0.25')[toc];
  [vib1][vib2][clock][gres][knock][drone][tone][heavy][bip][steps][neon][blink][heart][breath1][breath2][toc]amix=inputs=16:normalize=0:duration=longest,
  apad=whole_dur=60,atrim=0:60,alimiter=limit=0.89
  " -ar $SR -c:a pcm_s16le soundtrack.wav
echo "OK -> public/soundtrack.wav"
