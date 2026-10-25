#!/usr/bin/env bash
# Everything for one day on Instagram, in order:
#   bash tools/day.sh post  2026-11-02 [--no-upload]   feed post at 7:30 PM IST, then its "New post" Story at 7:45 PM
#   bash tools/day.sh story 2026-11-02 [--no-upload]   morning countdown Story (8:00 AM IST, until 14 Nov)
#   bash tools/day.sh reel  2026-11-02 [--no-upload]   Reel at 6:30 PM IST (Mon, Wed, Fri, Sat; video already in media/reels/)
# Exit codes: 0 done, 3 nothing planned today, 1 failure (read the log).
set -uo pipefail
export NODE_USE_ENV_PROXY=1 NODE_NO_WARNINGS=1
cd "$(dirname "$0")/.."
mkdir -p out
MODE="${1:?usage: tools/day.sh post|story|reel YYYY-MM-DD [--no-upload]}"; DATE="${2:?date}"; UPLOAD=1; [ "${3:-}" = "--no-upload" ] && UPLOAD=0
log() { echo "[$MODE $DATE] $*"; }
sheet() { python3 - "$@" <<'PY'
import sys
from PIL import Image
out, files = sys.argv[1], sys.argv[2:]
ims = [Image.open(f).convert("RGB") for f in files]
ims = [im.resize((360, int(360 * im.height / im.width))) for im in ims]
h = max(i.height for i in ims); S = Image.new("RGB", (len(ims) * 368 + 8, h + 16), "#999")
for k, im in enumerate(ims): S.paste(im, (8 + k * 368, 8))
S.save(out)
PY
}
if [ "$MODE" = "post" ]; then
  F="posts/$DATE.json"
  [ -f "$F" ] || { log "NO_POST: $F does not exist"; exit 3; }
  node tools/check.mjs "$F" || { log "FAIL: safety check"; exit 1; }
  node tools/render.mjs --theme=white "$F" | tee "out/$DATE-render.log"
  grep -q WARN "out/$DATE-render.log" && { log "FAIL: text too tall on a slide (see log)"; exit 1; }
  sheet "out/$DATE-post-sheet.png" $(ls out/white/$DATE/slide-*.png | sort -t- -k2 -n) && log "review sheet: out/$DATE-post-sheet.png"
  node tools/make-stories.mjs "$DATE" >/dev/null
  node tools/render-story.mjs "stories/auto/$DATE-newpost.json"
  [ "$UPLOAD" = "0" ] && { log "rendered only (--no-upload)"; exit 0; }
  node tools/upload-instagram.mjs post "$F" --publish-at "${DATE}T19:30:00+05:30" || exit 1
  node tools/share-links.mjs "$DATE" | tee "out/$DATE-share.txt" || log "WARN: could not make the download links"
  node tools/upload-instagram.mjs story "stories/auto/$DATE-newpost.json" --publish-at "${DATE}T19:45:00+05:30" || { log "PARTIAL: post live, Story failed"; exit 1; }
  log "DONE"
elif [ "$MODE" = "reel" ]; then
  F="reels/$DATE.json"
  [ -f "$F" ] || { log "NO_REEL: $F does not exist"; exit 3; }
  node tools/check.mjs "$F" || { log "FAIL: safety check"; exit 1; }
  V=$(node -e "console.log(require('./$F').video)")
  [ -f "$V" ] || { log "FAIL: video $V missing"; exit 1; }
  ffmpeg -hide_banner -loglevel error -y -i "$V" -vf "fps=1/3,scale=240:-1,tile=8x1" -frames:v 1 "out/$DATE-reel-sheet.png" 2>/dev/null && log "review sheet: out/$DATE-reel-sheet.png"
  [ "$UPLOAD" = "0" ] && { log "checked only (--no-upload)"; exit 0; }
  node tools/upload-instagram.mjs reel "$F" --publish-at "${DATE}T18:30:00+05:30" || exit 1
  node tools/share-reel.mjs "$DATE" | tee "out/$DATE-reel-share.txt" || log "WARN: could not make the download link"
  log "DONE"
elif [ "$MODE" = "story" ]; then
  out=$(node tools/make-stories.mjs "$DATE")
  [ -f "stories/auto/$DATE-countdown.json" ] || { log "NO_STORY: no countdown today"; exit 3; }
  node tools/check.mjs "stories/auto/$DATE-countdown.json" || exit 1
  node tools/render-story.mjs "stories/auto/$DATE-countdown.json"
  [ "$UPLOAD" = "0" ] && { log "rendered only (--no-upload)"; exit 0; }
  node tools/upload-instagram.mjs story "stories/auto/$DATE-countdown.json" --publish-at "${DATE}T08:00:00+05:30" || exit 1
  log "DONE"
fi
