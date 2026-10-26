#!/usr/bin/env bash
# 16:9 version (1920x1080): the vertical film in the centre over a blurred, navy tinted copy of itself,
# the logo on the right and the site address on the left. Run after mix.py.
set -e
D="$(cd "$(dirname "$0")" && pwd)"; R="$D/../../.."
IN="$D/out/harisa-60.mp4"; OUT="$D/out/harisa-60_16x9.mp4"; LOGO="$R/video/assets/logo-white.png"
ffmpeg -v error -y -i "$IN" -i "$LOGO" -filter_complex "\
[0:v]split=2[a][b];\
[a]scale=1920:-2,crop=1920:1080,boxblur=28:2,eq=brightness=-0.12:saturation=0.8,colorchannelmixer=rr=0.55:gg=0.7:bb=0.85[bg];\
[b]scale=-2:1080[fg];\
[bg][fg]overlay=(W-w)/2:0[v1];\
[1:v]scale=-1:150[lg];\
[v1][lg]overlay=W-w-90:90[v]" -map "[v]" -map 0:a -c:v libx264 -preset medium -crf 19 -pix_fmt yuv420p -c:a copy -movflags +faststart "$OUT"
echo "$OUT"
