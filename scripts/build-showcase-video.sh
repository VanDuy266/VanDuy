#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Montage of official product photographs already bundled with the store, not road footage.
showcase_tmp=$(mktemp -d)
trap 'rm -rf "$showcase_tmp"' EXIT
showcase_inputs=(assets/yadea-orla-2024.png assets/yadea-osta-2026-new.png assets/yadea-icute-h-new.png)
for showcase_index in 0 1 2; do
 ffmpeg -hide_banner -loglevel error -y -loop 1 -i "${showcase_inputs[$showcase_index]}" \
  -f lavfi -i 'color=c=0xeaf1fa:s=1280x720:r=24' \
  -filter_complex '[0:v]scale=1000:590:force_original_aspect_ratio=decrease,format=rgba[vehicle];[1:v][vehicle]overlay=(W-w)/2:(H-h)/2:shortest=1,format=yuv420p,fade=t=in:st=0:d=0.25,fade=t=out:st=3.15:d=0.35[out]' \
  -map '[out]' -t 3.5 -r 24 -c:v libx264 -threads 2 -filter_complex_threads 1 -preset medium -crf 23 -pix_fmt yuv420p -an "$showcase_tmp/clip-$showcase_index.mp4"
 printf "file '%s/clip-%s.mp4'\n" "$showcase_tmp" "$showcase_index" >> "$showcase_tmp/clips.txt"
done
ffmpeg -hide_banner -loglevel error -y -f concat -safe 0 -i "$showcase_tmp/clips.txt" -c copy -movflags +faststart assets/duc-tu-design-showcase.mp4
