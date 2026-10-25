# RUNBOOK: IPM Careers Instagram (what the scheduled Claude session does)

You are running unattended. Posting is automatic, so when in doubt, skip and say why. Never push to this repository.
Never print a token or key.

| Task | Time (IST) | Command |
|---|---|---|
| Daily feed post + "New post" Story | starts 18:55, posts 19:30, Story 19:45 | `bash tools/day.sh post $DATE` |
| Countdown Story (until 14 Nov), plus an answer Story at 10:00 on days with `stories/$DATE-answer.json` | starts 07:40, posts 08:00 (and 10:00) | `bash tools/day.sh story $DATE` |
| Reel (Mon, Wed, Fri, Sat) | starts 17:53, posts 18:30 | `bash tools/day.sh reel $DATE` |

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
- **Exit 1:** read the log. Usually a line is too long; shorten it and retry once. Otherwise stop and report.

## 3. Look before posting
Open `out/$DATE-post-sheet.png` (or `out/stories/$DATE-*.png`, or `out/$DATE-reel-sheet.png`). Check: no text cut off or overlapping, no typos,
no em dashes, the logo looks normal, numbers and answers are right, screenshots show no real student names or scores.
If anything is wrong, fix the JSON and redo step 2 (at most 2 retries); if still wrong, skip and report.

## 4. Post
```bash
node tools/upload-instagram.mjs post posts/$DATE.json --dry-run     # checks keys and that the account is @$IPM_INSTAGRAM_USERNAME
bash tools/day.sh post "$DATE"                                       # waits until 19:30 IST, then 19:45 for the Story
```
The uploader refuses to post unless the token belongs to the IPM Careers account.

## 5. Final report
**Post** (becomes the owner's evening email and phone notification). The owner re-uploads each post to YouTube by hand, so the report must contain, in this order:
0. First line, exactly: `IPM Careers daily post` (the owner's Gmail filter forwards emails using this line).
1. Date, format, topic, and the Instagram link (or the error).
2. The full caption and the download links, copied exactly from `out/$DATE-share.txt`.
3. Anything the owner must do (for example "Instagram token has 8 days left", "posts/2026-11-17.json missing").

**Reel** (phone notification only, no email; reels go to YouTube through a separate automation): whether it went live, the Instagram link, and the answer for a pinned comment. Keep it short.
