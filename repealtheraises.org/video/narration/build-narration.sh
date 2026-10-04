#!/usr/bin/env bash
# Build the narration track for animation.html from script.txt (one line per scene).
#
# Requires: ffmpeg/ffprobe and edge-tts (pip install edge-tts; uses Microsoft's
# online neural voices, no API key). Swap in a human recording by replacing
# scene-N.mp3 files and re-running with SKIP_TTS=1.
#
# Output: ../the-raises-that-never-stop-narration.mp3 plus the SCENES array
# (scene durations in seconds) to paste into animation.html.
set -euo pipefail
cd "$(dirname "$0")"

VOICE="${VOICE:-en-US-AndrewNeural}"
RATE="${RATE:--5%}"
LEAD="${LEAD:-0.7}"   # silence before each line (lets the scene settle)
TAIL="${TAIL:-1.3}"   # silence after each line (reading/dwell time)
END_HOLD="${END_HOLD:-2.5}"  # extra hold on the final frame
OUT=../the-raises-that-never-stop-narration.mp3
TTS="${TTS:-edge-tts}"

i=0
: > concat.txt
durs=()
while IFS= read -r line; do
    [ -z "$line" ] && continue
    i=$((i + 1))
    if [ -z "${SKIP_TTS:-}" ]; then
        "$TTS" --voice "$VOICE" --rate="$RATE" --text "$line" --write-media "scene-$i.mp3"
    fi
    voice=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "scene-$i.mp3")
    tail="$TAIL"; [ "$i" -eq 5 ] && tail=$(echo "$TAIL + $END_HOLD" | bc)
    ffmpeg -v error -y -f lavfi -t "$LEAD" -i anullsrc=r=24000:cl=mono -i "scene-$i.mp3" \
        -f lavfi -t "$tail" -i anullsrc=r=24000:cl=mono \
        -filter_complex "[1:a]aresample=24000,aformat=channel_layouts=mono[v];[0:a][v][2:a]concat=n=3:v=0:a=1" \
        -c:a pcm_s16le "seg-$i.wav"
    durs+=("$(ffprobe -v error -show_entries format=duration -of csv=p=0 "seg-$i.wav")")
    echo "file 'seg-$i.wav'" >> concat.txt
    echo "scene $i: voice ${voice}s, segment ${durs[-1]}s"
done < script.txt

ffmpeg -v error -y -f concat -safe 0 -i concat.txt -af loudnorm=I=-16:TP=-1.5:LRA=11 -ar 44100 -ac 1 -c:a libmp3lame -b:a 96k "$OUT"
rm -f seg-*.wav concat.txt

printf 'var SCENES = ['; printf '%.2f, ' "${durs[@]}" | sed 's/, $//'; printf '];\n'
echo "total: $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT")s -> $OUT"
