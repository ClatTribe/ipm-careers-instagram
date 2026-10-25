# IPM Careers Instagram: daily posts and Stories (automatic)

| What | When (IST) | How |
|---|---|---|
| Feed post (white theme) | 7:30 PM daily | `posts/<date>.json`, rendered by `templates/post.html` |
| "New post" Story | 7:45 PM daily | made automatically from the day's post |
| IIM B UGAT countdown Story | 8:00 AM, until 14 Nov | made automatically (`tools/make-stories.mjs`) |

A Claude scheduled task follows `RUNBOOK.md` every day: render, safety check, look at the slides, post, report.
Reels (whiteboard shorts) are added to Instagram later from the `ipm-question-shorts` project.

## Things you can change without code
- **A topic:** `calendar.md`. If that date already has `posts/<date>.json`, edit or delete that file too.
- **The words of a post:** open `posts/<date>.json` and change the text in quotes. Rules: `WRITING-RULES.md`.
- **Pause posting:** switch off the "IPM Careers Instagram" scheduled tasks in the Claude app.

## Preview on a computer
```
npm install
node tools/render.mjs --theme=white posts/2026-11-02.json      # slides in out/white/2026-11-02/
bash tools/day.sh post 2026-11-02 --no-upload                   # everything except posting
```

## Settings the cloud environment needs
- Environment variables: `IPM_INSTAGRAM_ACCESS_TOKEN`, `IPM_INSTAGRAM_BUSINESS_ACCOUNT_ID`, `IPM_INSTAGRAM_USERNAME`
  (plus the shared `CLOUDINARY_*`, already there). The uploader refuses to post to any other account.
- Allowed domain: `graph.instagram.com` (only for an Instagram Login token starting with IGAA; a Facebook
  System User token uses `graph.facebook.com`, already allowed, and never expires).

## Renewing the Instagram key (every ~2 months)

**Planned:** once posts, Stories, Reels and YouTube are all running, switch to a never-expiring Facebook Page key
(like EduAbroad). That needs the IPM Careers Instagram linked to an IPM Careers Facebook Page.
The key lasts 60 days. The current one expires on the date in `token-expiry.txt`; from 10 days before, the daily
email warns you. To renew: developers.facebook.com → your app → Instagram → API setup with Instagram login →
Generate token for @ipmcareers → paste it into `IPM_INSTAGRAM_ACCESS_TOKEN` in the environment settings, and
change the date in `token-expiry.txt` to 60 days later.
