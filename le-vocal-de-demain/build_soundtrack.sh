#!/usr/bin/env bash
# Assemble la bande-son de l'épisode 1 (60 s) dans public/soundtrack.wav.
# Calée sur l'image : vibrations du clip 1 (0,9 s / 2,2 s), sursaut de Noé
# dans le clip 5 (~26,9 s), approche du judas dans le clip 6 (32,4–34 s),
# néon qui clignote dans le clip 7 (~40 s), écran allumé dans le clip 8 (47,5 s).
# Bruitages : public/sfx (LaSonotheque.fr). Dialogues : public/sfx/dialogues.mp3.
# Sons synthétisés : grésillement, bourdonnement, tonalité, bips, néon.
set -euo pipefail
cd "$(dirname "$0")/public"
SR=48000

# part <début dans le fichier> <durée> <instant dans la vidéo> [filtres]
part() {
  local end ms
  end=$(awk "BEGIN{printf \"%.3f\", $1+$2}")
  ms=$(awk "BEGIN{printf \"%d\", $3*1000}")
  echo "atrim=$1:$end,asetpts=PTS-STARTPTS,aresample=$SR,aformat=channel_layouts=stereo${4:+,$4},adelay=$ms|$ms"
}

PHONE="highpass=f=320,lowpass=f=3400,acompressor=threshold=0.1:ratio=4,volume=1.6"
DOOR="lowpass=f=1400,aecho=0.8:0.6:25|45:0.25|0.15,volume=1.4"
LEA_PHONE="highpass=f=320,lowpass=f=3400,volume=1.3"

# Entrées : 0 vibreur, 1 horloge, 2 coups, 3 ampoule, 4 pas, 5 cœur, 6 respiration, 7 dialogues,
#           8 bruit rose, 9 bourdonnement, 10 tonalité, 11 bips, 12 néon
ffmpeg -v error -y \
  -i sfx/vibreur.mp3 -i sfx/horloge.wav -i sfx/coups.wav -i sfx/ampoule.wav -i sfx/pas.wav \
  -i sfx/coeur.wav -i sfx/respiration.wav -i sfx/dialogues.mp3 \
  -f lavfi -i "anoisesrc=c=pink:r=$SR:a=1:d=8" \
  -f lavfi -i "aevalsrc='0.6*sin(2*PI*48*t)+0.3*sin(2*PI*96*t)+0.15*sin(2*PI*61*t)':s=$SR:d=9" \
  -f lavfi -i "aevalsrc='sin(2*PI*440*t)':s=$SR:d=1.2" \
  -f lavfi -i "aevalsrc='sin(2*PI*425*t)*lt(mod(t,0.25),0.12)':s=$SR:d=0.5" \
  -f lavfi -i "aevalsrc='(0.5*sin(2*PI*100*t)+0.3*sin(2*PI*200*t)+0.2*sin(2*PI*300*t))*(0.85+0.15*sin(2*PI*7*t))':s=$SR:d=3.05" \
  -filter_complex "
  [0]asplit=3[v0][v1][v2];
  [v0]$(part 0 1.05 0.85 'volume=0.9,afade=t=out:st=0.9:d=0.15')[vibA];
  [v1]$(part 2.0 0.8 2.15 'volume=0.9,afade=t=out:st=0.65:d=0.15')[vibB];
  [v2]$(part 2.0 1.15 47.5 volume=0.8)[vibC];

  [1]aloop=loop=1:size=432000,$(part 0 10.15 4.2 volume=0.4)[clock];
  [8]highpass=f=1200,lowpass=f=5000,tremolo=f=11:d=0.6,$(part 0 8 4 'volume=0.03,afade=t=in:d=0.4,afade=t=out:st=7.6:d=0.4')[gres];
  [6]asplit=2[b0][b1];
  [b0]$(part 0 8 4.2 'volume=0.3,afade=t=in:d=3,afade=t=out:st=7.5:d=0.3')[breathA];
  [b1]$(part 0.8 0.9 34.1 'volume=0.35,afade=t=out:st=0.7:d=0.2')[breathB];

  [7]asplit=8[d0][d1][d2][d3][d4][d5][d6][d7];
  [d0]$(part 4.20 6.85 4.6 "$PHONE")[vocal];
  [d1]$(part 17.45 3.60 18.0 "$DOOR")[leaDoor];
  [d2]$(part 25.62 0.70 25.0 'volume=1.2')[noeA];
  [d3]$(part 27.00 1.05 25.8 'volume=1.2')[noeB];
  [d4]$(part 28.00 0.55 27.4 "$LEA_PHONE")[leaA];
  [d5]$(part 29.05 2.70 28.0 "$LEA_PHONE")[leaB];
  [d6]$(part 29.88 0.40 31.12 "$LEA_PHONE")[duoPhone];
  [d7]$(part 17.48 0.60 31.12 "$DOOR")[duoDoor];

  [2]asplit=3[k0][k1][k2];
  [k0]$(part 0.15 1.2 15.95 volume=1.0)[knock];
  [k1]$(part 5.45 1.25 26.3 'asetrate=38400,aresample=48000,lowpass=f=2500,volume=1.4')[heavy];
  [k2]$(part 2.28 0.6 59.0 'lowpass=f=1500,volume=0.25')[toc];
  [9]lowpass=f=200,$(part 0 8.3 16.2 'volume=0.18,afade=t=in:d=1.2,afade=t=out:st=7.8:d=0.5')[drone];
  [10]$(part 0 1.2 24.0 'volume=0.1,lowpass=f=3000,afade=t=out:st=1.1:d=0.1')[tone];
  [11]$(part 0 0.5 31.62 volume=0.1)[bip];
  [4]$(part 0.3 1.9 32.35 'lowpass=f=1800,volume=0.5,afade=t=out:st=1.6:d=0.3')[steps];
  [12]$(part 0 3.05 37.0 'volume=0.06,afade=t=in:d=0.3')[neon];
  [3]$(part 0 1.4 40.0 volume=0.7)[blink];
  [5]$(part 0 6.5 46.5 'volume=0.55,afade=t=in:d=0.5')[heart];

  [vibA][vibB][vibC][clock][gres][breathA][breathB][vocal][leaDoor][noeA][noeB][leaA][leaB][duoPhone][duoDoor][knock][heavy][toc][drone][tone][bip][steps][neon][blink][heart]amix=inputs=25:normalize=0:duration=longest,
  apad=whole_dur=60,atrim=0:60,alimiter=limit=0.89
  " -ar $SR -c:a pcm_s16le soundtrack.wav
echo "OK -> public/soundtrack.wav"
