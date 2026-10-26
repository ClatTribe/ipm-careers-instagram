# RUNBOOK: IPM Careers Instagram (what the scheduled Claude session does)

You are running unattended. Posting is automatic, so when in doubt, skip and say why. Never push to this repository.
Never print a token or key.

| Task | Time (IST) | Command |
|---|---|---|
| Daily feed post + "New post" Story | starts 19:21, posts 19:30, Story right after | `bash tools/day.sh post $DATE` |
| Countdown Story (until 14 Nov), plus an answer Story right after it on days with `stories/$DATE-answer.json` | starts 07:51, posts 08:00 | `bash tools/day.sh story $DATE` |
| Reel (Mon, Wed, Fri, Sat) on Instagram + YouTube Shorts | starts 18:21, posts 18:30 | `bash tools/day.sh reel $DATE` |

**Run the upload command in the FOREGROUND** (Bash tool, `timeout: 600000`) and stay in the same turn until it prints DONE, PARTIAL or FAIL.
Never start it in the background and never end your turn while it waits for the posting time: an idle session is shut down after
about 30 minutes and the upload dies with it. The schedule starts each run only a few minutes before posting time, so the wait is short.

## 1. Set up
```bash
DATE=$(TZ=Asia/Kolkata date +%F)
git clone --depth 1 https://github.com/ClatTribe/ipm-careers-instagram.git ~/ipm && cd ~/ipm
npm ci --no-audit --no-fund
export NODE_USE_ENV_PROXY=1 NODE_NO_WARNINGS=1
pip3 install -q pillow 2>/dev/null || true
```
If `DATE` is before **2026-10-25**, stop and reply "Before start date".

## 2. Render and check (no upload yet)
```bash
bash tools/day.sh post "$DATE" --no-upload      # or: story
```
- **Exit 3:** nothing planned today. For `reel`, post nothing and report it (reels are made ahead with narration; never write one yourself). For `post`, write `posts/$DATE.json` only if the calendar (`calendar.md`) has a topic
  for today; copy a post of the same format from `posts/`. Rules: `WRITING-RULES.md`. Then run step 2 again.
  If you are not sure about any fact, skip the day and say so.
- **Exit 1:** read the log. `media is not ready` (9007/2207027) is already retried by the uploader; if it still fails, report it and do not retry by hand.
- **Otherwise on exit 1:** read the log. Usually a line is too long; shorten it and retry once. Otherwise stop and report.

## 3. Look before posting
Open `out/$DATE-post-sheet.png` (or `out/stories/$DATE-*.png`, or `out/$DATE-reel-sheet.png`). Check: no text cut off or overlapping, no typos,
no em dashes, the logo looks normal, numbers and answers are right, screenshots show no real student names or scores.
If anything is wrong, fix the JSON and redo step 2 (at most 2 retries); if still wrong, skip and report.

## 4. Post
```bash
node tools/upload-instagram.mjs post posts/$DATE.json --dry-run     # checks keys and that the account is @$IPM_INSTAGRAM_USERNAME
bash tools/day.sh post "$DATE"                                       # FOREGROUND (timeout 600000): waits until 19:30 IST, then posts the Story right after
```
The uploader refuses to post unless the token belongs to the IPM Careers account.

## 5. Final report
**Post** (becomes the owner's evening email and phone notification). The owner re-uploads each post to YouTube by hand, so the report must contain, in this order:
0. First line, exactly: `IPM Careers daily post` (the owner's Gmail filter forwards emails using this line).
1. Date, format, topic, and the Instagram link (or the error).
2. The full caption and the download links, copied exactly from `out/$DATE-share.txt`.
3. Anything the owner must do (for example "Instagram token has 8 days left", "posts/2026-11-17.json missing").

**Reel** (phone notification only, no email): whether it went live, the Instagram link, the YouTube Shorts link (from the `DONE youtube` line; it goes public at 18:30 by itself), and the answer for a pinned comment (for reels with no answer in the video, say "pin this after 24 hours, not now"). If the log says `YOUTUBE_SKIPPED` or `PARTIAL ... YouTube failed`, say so in one line with the error. Keep it short.

## Never show keys
Do not call the Instagram, Cloudinary or YouTube APIs by hand (curl or ad-hoc scripts) and never print a URL or JSON that contains `access_token`, a secret or a refresh token. Use only the tools in `tools/`. If you must debug, pipe output through `sed -E 's/access_token=[^& "]+/access_token=HIDDEN/g'`.
