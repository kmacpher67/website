# Narration for "The Raises That Never Stop"

The animation on `animation.html` now runs about 50 seconds (up from 15) with an
optional voiceover. One line of narration plays per scene.

## Files

- `script.txt`: the narration, one line per scene (5 lines). This is the source of truth.
- `scene-1.mp3` … `scene-5.mp3`: the raw text-to-speech clips for each line.
- `build-narration.sh`: rebuilds the full track and prints the scene durations.
- `../the-raises-that-never-stop-narration.mp3`: the full track (lead-in and tail silence
  around each line, loudness-normalized to -16 LUFS). The page plays this file.
- `../the-raises-that-never-stop.mp4`: a 1280×720 export with the narration muxed in and
  captions burned in.

## Current timing

| Scene | Voice | Scene length |
|---|---|---|
| 1. Who do your politicians work for? | 6.0s | 8.02s |
| 2. Automatic raises. Twice a year. Forever. | 9.8s | 11.77s |
| 3. No vote. No voice. | 7.2s | 9.22s |
| 4. Vote YES to take back control. | 6.3s | 8.34s |
| 5. Vote YES Nov 3 | 7.9s | 12.42s (includes a 2.5s end hold) |

Each scene gets 0.7s of silence before its line and 1.3s after, so viewers can read the
caption and the motion can finish. The CSS animation delays were also slowed by about 1.6x.

## How the page uses it

- Visuals still autoplay silently, because browsers block audible autoplay.
- Viewers turn narration on with "🔊 Tap for sound" on the picture or the Sound button.
  Turning it on restarts the current scene, so its line is heard from the start.
- While sound is on, the audio's `currentTime` drives the timeline, so pause, resume,
  chapter jumps and replay stay in sync with the voice.
- Captions on the page match the spoken words exactly.

## Changing the words or the voice

1. Edit `script.txt`.
2. Run `./build-narration.sh`. It needs `pip install edge-tts` (free Microsoft neural
   voices, no key needed) plus ffmpeg. You can override these settings:
   `VOICE=en-US-ChristopherNeural RATE=-10% ./build-narration.sh`.
3. Paste the printed `var SCENES = [...]` into `animation.html`. Then update `CAPTIONS`,
   the transcript list, the JSON-LD `transcript`/`duration`, and `sitemap.xml` `video:duration`.
4. Re-export the MP4 (see below).

To use a human voice instead, record each line as `scene-N.mp3` (one clean take per line,
no music), then run `SKIP_TTS=1 ./build-narration.sh`. A human read usually lands better
locally, but the AI voice works fine as a placeholder.

## Re-exporting the MP4

Record `animation.html?video` at 1280×720 for the length of the track. The export used a
Playwright `record_video` context in headless Chromium. Trim the recording to
`window.__startedAt`, then mux:

```
ffmpeg -ss <offset> -i recording.webm -i the-raises-that-never-stop-narration.mp3 \
  -map 0:v -map 1:a -t 49.8 -c:v libx264 -crf 20 -pix_fmt yuv420p -r 30 \
  -c:a aac -b:a 128k -movflags +faststart the-raises-that-never-stop.mp4
```

## Optional next steps

- Background music: add a quiet instrumental bed only if it's royalty-free or licensed.
  Mix it about 20 dB under the voice and duck it while lines are spoken. Mix it into the
  track with ffmpeg rather than adding more `<audio>` elements.
- Stamp and impact sound effects: these are optional. If you add them, bake them into the
  same single track so they can't drift.
