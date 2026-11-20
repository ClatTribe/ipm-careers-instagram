#!/usr/bin/env bash
# Checks CHRIST's official "Selection Process 2027" dates page against the saved copy in data/christ-dates.txt.
#   bash tools/check-christ-dates.sh            exit 0 = no change, 3 = CHANGED (prints the diff), 1 = could not read the page
#   bash tools/check-christ-dates.sh --save     overwrite the saved copy with today's page (after a change has been handled)
set -uo pipefail
cd "$(dirname "$0")/.."
URL="https://christuniversity.in/admission/ugpg-selection-process-dates-2027"
TMP=$(mktemp -d)
curl -sS -m 60 -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130 Safari/537.36" -o "$TMP/page.html" "$URL" || { echo "FAIL could not download $URL"; exit 1; }
python3 -I - "$TMP/page.html" > "$TMP/now.txt" <<'PY'
import html, re, sys
s = open(sys.argv[1], encoding="utf-8", errors="ignore").read()
s = re.sub(r"(?is)<(script|style|noscript).*?</\1>", " ", s)
lines = [l.strip() for l in html.unescape(re.sub(r"<[^>]+>", "\n", s)).split("\n") if l.strip()]
try:
    a = next(i for i, l in enumerate(lines) if "IMPORTANT DATES" in l.upper())
    b = next(i for i in range(a, len(lines)) if lines[i] == "Campus" and lines[i + 1] == "Academics")
except StopIteration:
    sys.exit("FAIL the dates table was not found on the page (layout changed?)")
print("\n".join(lines[a:b]))
PY
[ -s "$TMP/now.txt" ] || { echo "FAIL the dates table was not found on the page"; exit 1; }
if [ "${1:-}" = "--save" ]; then cp "$TMP/now.txt" data/christ-dates.txt; echo "SAVED data/christ-dates.txt"; exit 0; fi
if diff -u data/christ-dates.txt "$TMP/now.txt" > "$TMP/diff.txt"; then
  echo "NO CHANGE on $URL"; exit 0
fi
echo "CHANGED: $URL"; cat "$TMP/diff.txt"; exit 3
