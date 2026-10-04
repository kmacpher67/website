# Animation audio and pacing review

Reviewed October 4, 2026. Analysis only; no page, animation, or audio assets changed.

Scope: technical production, readability, accessibility, and neutral educational presentation. This review does not develop campaign persuasion, vote-directed narration, or music intended to influence a voting choice.

## Evidence and limits

Reviewed the local HTML, fetched the live HTML, probed the local MP4, and inspected one exported frame. The live animation source matches the local version apart from hosting-injected content. This is a source/timing review with a sampled frame, not a full browser playback or audience study. Political claims and ballot effects have not been independently verified.

- Page: https://repealtheraises.org/animation.html
- Source: `repealtheraises.org/animation.html`
- Export: `repealtheraises.org/video/the-raises-that-never-stop.mp4`
- Existing user reference: `repealtheraises.org/video/addaudio-to-animation.md` (left unchanged).
- HTML animation: five equal three-second scenes, 15 seconds total.
- MP4: 16 seconds, H.264, 1280 × 720, no audio stream.
- Page includes captions, transcript, pause/replay and chapter controls; visual playback starts automatically unless reduced motion is requested.

## Is it too quick?

For speaking all the existing captions, yes. Caption word counts are 15, 19, 18, 18, and 18: 88 words total. Speaking them within their three-second scenes requires 300–380 words per minute, averaging 352. These counts treat numbers as single written words; spoken numbers may take longer.

For a neutral educational voiceover, use 130–160 words per minute as an initial production assumption, then time a real read. At that range, 88 words take about 33–41 seconds before extra pauses. A 15-second slot accommodates roughly 33–40 words before pauses. These are planning calculations, not a universal accessibility threshold or a recommendation to rewrite campaign messaging.

Transitions generally last 0.3–0.5 seconds; later elements appear after delays of up to 1.75 seconds, with some animations finishing near 2.5 seconds. A three-second scene can therefore leave little settled viewing time. Calendar changes occur every 0.4 seconds. The key readability issue is dwell time plus simultaneous visual and text demands. Slower fades alone will not fix that and could reduce settled reading time further.

Avoid choosing the runtime first for educational narration. Measure the approved recording, budget for pronunciation and pauses, and let each scene remain visible until its information can be understood. Validate on a small phone screen with first-time viewers. Do not assume a longer runtime automatically improves comprehension.

## What would adding audio take?

Two separate deliverables exist: synchronized audio for the interactive SVG page, and audio embedded in the shareable MP4. Changing one does not update the other.

Required inputs: an approved, source-checked narration script; a recorded human voice or a speech-generation service; optional licensed music and effects; a timed recording; captions/transcript; and a cue sheet mapping media time to scenes. AI-generated assets are optional. A human narrator plus an audio editor can produce the media; a coding assistant can help integrate supplied assets and verify playback. Audio generation requires an available audio tool/service or external recording workflow; this session has not generated any audio.

For neutral instructional delivery, prefer clear diction, natural pauses, and consistent volume. Use a restrained instrumental bed only if it does not interfere with speech. Start with voice alone, then compare. Avoid vocals beneath narration; audition on phone speakers as well as headphones. Mix by listening and measuring levels, not by assuming `volume = 0.15` produces a consistent result across unrelated files. Effects should be optional and never mask speech.

For the downloadable video, a mixed audio track embedded in the MP4 is straightforward. For the interactive page, one mixed track reduces synchronization complexity; separate voice/music tracks allow independent controls but increase coordination work. Neither choice requires four predefined audio elements.

## Challenges and desired state

- Browsers can block audible autoplay. Use an explicit sound-enabled play action and handle playback failures. Existing silent visual autoplay creates a risk of audio starting midway through the story. Reference: [MDN autoplay guidance](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay).
- Pause, resume, replay, chapter navigation, loading, and background-tab behavior must share a coherent timeline. Independent timers can drift. Current chapter jumps restart CSS animations; audio seeking must account for that.
- Narration must fit the scene it describes. A voice track cannot simply be laid over this export at ordinary speed without timing changes or a different script.
- Retain a useful silent experience, synchronized captions for speech, a readable transcript, keyboard controls, and reduced-motion handling. Determine whether meaningful visual information also needs description. Reference: [W3C accessible media guidance](https://www.w3.org/WAI/media/av/).
- Maintain music/voice rights records, consistent filenames, pronunciation notes, and matching page/video versions. Update duration metadata and transcript when the actual media changes.
- Factual claims, chart quantities, public-hearing references, and descriptions of ballot effects require primary-source review before educational narration presents them as established facts. Existing source assertions are not verification.

The desired educational state is understandable on a first viewing, intelligible on ordinary speakers, usable without sound, and fully controlled by the visitor. Education plus animation can be useful when motion explains a concept. Completion rate alone is insufficient: evaluate whether viewers can accurately explain the information, whether captions remain readable, and whether controls work. This review does not propose tactics for increasing political persuasion.

## Assessment of the existing audio reference

The existing note usefully recognizes user-initiated sound and scene-linked cues. It does not specify a narrator asset or solve the word-count/runtime mismatch. Its full-volume impacts, applause, and mandatory four-track structure are not a technical requirement. It also omits synchronized pause/resume/seek, failed playback handling, captions for the recording, and MP4 audio export. Treat it as a brainstorming reference, not an implementation specification.

## Copy/paste brief for a new session

```text
Work in /home/kenmac/personal/website. Read applicable repository instructions and repealtheraises.org/video/audio-accessibility-review.md.

Help with technical audio production and accessibility for repealtheraises.org/animation.html and its MP4 export. Do not develop vote-directed persuasion or optimize campaign wording, emotional music, or conversion tactics. Use supplied authorized assets for technical media work, or prepare a neutral, source-verified educational alternative if a new script is needed.

Inspect the current page and MP4 before editing. The reviewed version had five three-second scenes, 88 caption words, and a 16-second silent MP4. Recheck these because files may have changed. Leave unrelated working-tree changes untouched.

First inventory available narration, licensed music, captions, source evidence, and audio-generation tools. If an asset or tool is missing, identify exactly what is needed; do not claim to have generated audio. Create a reviewable asset list and timing/caption cue sheet. Time the actual spoken recording before deciding the scene durations. Distinguish a technical prototype from publishable media when facts or rights remain unresolved.

When implementation is authorized, integrate explicit sound-enabled playback, mute, synchronized pause/resume/replay/chapter seeking, and graceful loading/playback failure behavior. Preserve keyboard access, reduced-motion handling, silent readability, transcript, and synchronized captions. Use a shared media timeline; avoid independent timers for audio cues.

Produce the page audio and an MP4 with embedded audio as separate verified deliverables. Confirm voice intelligibility, speech/scene alignment, caption timing, start/end behavior, and mobile controls. Check representative desktop and mobile browsers where available, and disclose checks that could not be run. Update duration metadata and media references to match the output.

Commit only files created or changed for this task. Report assets, validation results, limitations, and commit ID. Do not deploy or publish unless requested.
```
