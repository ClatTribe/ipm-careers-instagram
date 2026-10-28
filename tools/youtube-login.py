#!/usr/bin/env python3
"""
One-time YouTube login for the IPM Careers Shorts uploader. Run it on the owner's Mac.

  cd ".../IPM Careers Command  Centre/youtube_engine"
  python3 /tmp/youtube-login.py

It reads credentials/credentials.json (the existing Google project), opens Google's login page,
and after you click Allow it writes ~/Desktop/ipm-youtube-keys.txt with the three values for the
cloud environment settings:
  IPM_YOUTUBE_CLIENT_ID, IPM_YOUTUBE_CLIENT_SECRET, IPM_YOUTUBE_REFRESH_TOKEN
It asks only for: upload videos + read the channel (to confirm it is @IPMCareers).
It does not change any file of the comment engine. Standard library only; uses the Mac's curl.
"""
import http.server, json, os, secrets, subprocess, sys, urllib.parse, webbrowser

GMAIL = "gmail" in sys.argv[1:]  # python3 youtube-login.py gmail  -> key that can only SEND email (for the daily post email)
SCOPES = ("https://www.googleapis.com/auth/gmail.send" if GMAIL else
          "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly")
PORT = 0  # 0 = let the Mac pick any free port (Desktop clients accept any loopback port)

path = next((p for p in ["credentials/credentials.json", "credentials.json"] if os.path.exists(p)), None)
if not path:
    sys.exit("Could not find credentials/credentials.json. Run this from inside the youtube_engine folder.")
raw = json.load(open(path))
kind = "installed" if "installed" in raw else "web" if "web" in raw else None
if not kind:
    sys.exit("credentials.json is not a Google OAuth client file.")
c = raw[kind]
if kind == "web":
    ok = [u for u in c.get("redirect_uris", []) if u.startswith("http://localhost")]
    if not ok:
        sys.exit("This is a 'Web' client without a localhost redirect. Tell Claude: 'web client, no localhost'.")
    redirect = ok[0]
    PORT = urllib.parse.urlparse(redirect).port or 80

got = {}
class H(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        if "code" in q or "error" in q:
            got.update({k: v[0] for k, v in q.items()})
        self.send_response(200); self.send_header("Content-Type", "text/html"); self.end_headers()
        self.wfile.write(b"<h2>Done. You can close this tab and go back to Terminal.</h2>")
    def log_message(self, *a): pass

try:
    srv = http.server.HTTPServer(("127.0.0.1", PORT), H)
except OSError:
    sys.exit(f"Port {PORT} is busy on this Mac. Close other apps or restart the Mac, then run it again.")
if kind == "installed":
    redirect = f"http://127.0.0.1:{srv.server_address[1]}/"

state = secrets.token_urlsafe(16)
url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode({
    "client_id": c["client_id"], "redirect_uri": redirect, "response_type": "code", "scope": SCOPES,
    "access_type": "offline", "prompt": "consent", "state": state, "include_granted_scopes": "false"})

print("\nOpening Google login in your browser...")
print("1. Pick the Google account that manages the IPM Careers YouTube channel.")
print("2. If asked to choose a channel, pick IPM Careers.")
print("3. 'Google hasn't verified this app': click Advanced, then 'Go to IPM Careers YouTube Engine'.")
print("4. Tick every box and click Allow / Continue.\n")
print("(If the browser does not open, copy this link into it:)\n" + url + "\n")
webbrowser.open(url)
while "code" not in got and "error" not in got:
    srv.handle_request()
if "error" in got:
    sys.exit("Google said: " + got["error"] + ". Nothing was saved. Tell Claude what you saw.")
if got.get("state") != state:
    sys.exit("Security check failed (state mismatch). Nothing was saved. Run it again.")

def curl(args):
    out = subprocess.run(["curl", "-s"] + args, capture_output=True, text=True).stdout
    return json.loads(out or "{}")

tok = curl(["https://oauth2.googleapis.com/token",
            "-d", urllib.parse.urlencode({"code": got["code"], "client_id": c["client_id"], "client_secret": c["client_secret"],
                                          "redirect_uri": redirect, "grant_type": "authorization_code"})])
if "refresh_token" not in tok:
    sys.exit("Google did not return a key: " + str(tok.get("error_description") or tok.get("error") or tok) + "\nTell Claude this message.")

if GMAIL:
    out = os.path.expanduser("~/Desktop/ipm-gmail-key.txt")
    with open(out, "w") as f:
        f.write(f"IPM_GMAIL_REFRESH_TOKEN={tok['refresh_token']}\n")
    os.chmod(out, 0o600)
    print("SAVED: ipm-gmail-key.txt is on your Desktop (1 line).")
    print("This key can only SEND email from the account you just picked. It cannot read your mail.")
    sys.exit(0)

ch = curl(["-H", "Authorization: Bearer " + tok["access_token"],
           "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true"])
items = ch.get("items") or []
name = items[0]["snippet"].get("title") if items else None
handle = items[0]["snippet"].get("customUrl") if items else None

out = os.path.expanduser("~/Desktop/ipm-youtube-keys.txt")
with open(out, "w") as f:
    f.write(f"IPM_YOUTUBE_CLIENT_ID={c['client_id']}\n")
    f.write(f"IPM_YOUTUBE_CLIENT_SECRET={c['client_secret']}\n")
    f.write(f"IPM_YOUTUBE_REFRESH_TOKEN={tok['refresh_token']}\n")
os.chmod(out, 0o600)
print("SAVED: ipm-youtube-keys.txt is on your Desktop.")
print(f"Channel this key uploads to: {name or 'UNKNOWN'} {handle or ''}")
if not name or "ipm" not in (name + (handle or "")).lower():
    print("WARNING: this does not look like the IPM Careers channel. Tell Claude before using the file.")
