# Making a reel (whiteboard style, voiced)

Everything lives in this repo now (the old ipm-short folders were lost on a machine reset).

1. Write the narration, one beat per paragraph. Generate it with ElevenLabs, voice **Monika Sogam** (`2zRM7PkgwBPiau2jvVXc`), model eleven_v4, 1 take. Save as `media/reels/voice/<date>.mp3`.
2. Get word timings (ElevenLabs Scribe transcription) and write `reels/src/<date>.json`:
   `beats[].t` = second in the voice file where each beat starts (a little before its first word), `hold` = silent seconds added after a beat (use it for the "pause and try it" countdown),
   `els[]` = what appears on screen and at which beat (`card`, `timer`, `opts`, `line`, `small`, `ans`, `follow`). Colour tags inside html: `<pu>` purple, `<g>` green, `<r>` red, `<hl>` highlight. Never use `<p>`.
3. Preview stills: `node tools/make-reel.mjs <date> --frames 2,10,20`  (out/reel-<date>-t*.png)
4. Render: `node tools/make-reel.mjs <date>` -> `media/reels/<date>.mp4` (add `--mux` to redo only the audio).
5. Write `reels/<date>.json` (caption, answer for the pinned comment, claims with sources, youtube title/description/tags), then
   `node tools/check.mjs reels/<date>.json` and `bash tools/day.sh reel <date> --no-upload`.
6. Commit and push. The reel routine (Mon/Wed/Fri/Sat 6:21 PM) uploads it to YouTube for 6:30 PM; Instagram is posted by hand from the 7:07 AM email.
