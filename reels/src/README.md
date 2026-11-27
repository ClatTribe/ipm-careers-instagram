# Reels

## APPROVED FORMAT (owner, 27 Nov 2026): exam-desk POV, tools/make-desk.mjs
Practice sheet on a wooden desk, "60 seconds. No calculator.", moving clock hand, a pencil that follows the rough work.
The voice (ElevenLabs Monika Sogam, ONLY the question) reads it, the rough work writes itself and stops BEFORE the answer, then "Finish it in the comments 👇 / Answer pinned in the comments".
Spec `reels/src/<date>-desk.json`: {hook, src, q, opts[4], rough[] (stop before the answer), voice: {file, a, z}}. Preview with `--frames`, render without.
Any change to this look, or any new format, is shown to the owner as ONE sample first. Never batch-produce an unapproved format.
The 15-second dark "challenge" template was REJECTED (27 Nov); its drafts are in reels/drafts and must not be used.

## Default since 27 Nov 2026: the 15-second challenge (tools/make-challenge.mjs)
The long whiteboard reels got the lowest views on the channel (median 144 vs 1,287 for 6 to 13 sec memes), so question reels are now 15 to 18 seconds:
hook + big question from the first frame, the voice reads only the question, 5-second ticking countdown, "Comment your answer" end card. The solution goes in the pinned comment, never in the video.
1. Voice: ElevenLabs Monika Sogam (`2zRM7PkgwBPiau2jvVXc`), eleven_v4, 1 take, ONLY the question (no intro, no solution). Save `media/reels/voice/<date>.mp3`.
2. Spec `reels/src/<date>-challenge.json`: {sub, hook (max 2 short lines), tag, q (html, `<span class="hl">` for yellow) or opts [A-D], qsize, secs: 5, voice: {file, a, z}}.
3. `node tools/make-challenge.mjs <date> --frames 0,5,12` to preview, then without --frames to render `media/reels/<date>.mp4`.
4. `reels/<date>.json`: short caption ending "You get 5 seconds. Comment your answer, solution is pinned 👇", the answer (pinned comment), claims, a SHORT YouTube title (under 70 characters, ending "#ipmat #shorts").
Topics: IPMAT PYQ, quant trick, LR. Spot-the-error is paused (owner, 27 Nov). Check every answer by brute force or worked steps.

## Old format: whiteboard reel with full solution (tools/make-reel.mjs), kept for reference

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
