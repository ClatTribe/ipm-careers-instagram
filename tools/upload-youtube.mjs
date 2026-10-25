#!/usr/bin/env node
/**
 * Uploads a reel to the IPM Careers YouTube channel as a Short.
 *
 *   node tools/upload-youtube.mjs reels/2026-10-26.json [--publish-at 2026-10-26T18:30:00+05:30] [--dry-run]
 *   node tools/upload-youtube.mjs --check                      log in and print the channel (uploads nothing)
 *   node tools/upload-youtube.mjs reels/<date>.json --private  setup test: upload and keep it private
 *
 * With --publish-at in the future, the video is uploaded as private and YouTube makes it public at
 * exactly that time. Otherwise it goes public immediately.
 *
 * Title and description come from the reel JSON: an optional "youtube": {title, description, tags}
 * block, else the first line of the Instagram caption and the caption itself.
 *
 * Needs IPM_YOUTUBE_CLIENT_ID, IPM_YOUTUBE_CLIENT_SECRET, IPM_YOUTUBE_REFRESH_TOKEN
 * (made once with tools/youtube-login.py; scopes youtube.upload + youtube.readonly).
 * Refuses to upload unless the token belongs to IPM_YOUTUBE_CHANNEL_HANDLE (default @ipmcareers).
 *
 * Note: Google keeps videos uploaded by an UNAUDITED API project private (even if we ask for public)
 * until the project passes Google's audit. The script warns when that happens.
 */
import { existsSync, readFileSync, statSync } from "node:fs";

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const CHECK = process.argv.includes("--check");
const DRY = process.argv.includes("--dry-run");
const PRIVATE = process.argv.includes("--private");
const publishAt = arg("--publish-at");
const CHANNEL = (process.env.IPM_YOUTUBE_CHANNEL_HANDLE || "@ipmcareers").toLowerCase();
const jsonPath = process.argv[2];

if (!CHECK && !(jsonPath ?? "").endsWith(".json")) {
  console.error("usage: node tools/upload-youtube.mjs reels/<date>.json [--publish-at ISO] [--private] [--dry-run] | --check");
  process.exit(2);
}
const missing = ["IPM_YOUTUBE_CLIENT_ID", "IPM_YOUTUBE_CLIENT_SECRET", "IPM_YOUTUBE_REFRESH_TOKEN"].filter((k) => !process.env[k]);

let body, file;
if (!CHECK) {
  const reel = JSON.parse(readFileSync(jsonPath, "utf8"));
  file = reel.video;
  const yt = reel.youtube ?? {};
  const caption = reel.caption ?? "";
  const hashtags = [...caption.matchAll(/#(\w+)/g)].map((m) => m[1]);
  const firstLine = caption.split("\n").find((l) => l.trim()) ?? reel.id;
  const title = (yt.title ?? firstLine).replace(/\s+/g, " ").trim().slice(0, 100);
  const desc = yt.description ?? caption;
  const description = (desc.includes("#Shorts") ? desc : `${desc}\n\n#Shorts`).slice(0, 5000);
  const future = publishAt && new Date(publishAt).getTime() > Date.now() + 5 * 60 * 1000;
  body = {
    snippet: { title, description, tags: (yt.tags ?? hashtags).slice(0, 15), categoryId: "27", defaultLanguage: "en", defaultAudioLanguage: "en" },
    status: {
      privacyStatus: future || PRIVATE ? "private" : "public",
      ...(future && !PRIVATE ? { publishAt: new Date(publishAt).toISOString() } : {}),
      selfDeclaredMadeForKids: false,
    },
  };
}

if (DRY) {
  console.log(`DRY RUN youtube ${jsonPath}`);
  console.log(`  file:        ${file} ${existsSync(file) ? `(${(statSync(file).size / 1e6).toFixed(1)} MB)` : "(MISSING)"}`);
  console.log(`  title:       ${body.snippet.title}`);
  console.log(`  tags:        ${body.snippet.tags.join(", ")}`);
  console.log(`  visibility:  ${body.status.privacyStatus}${body.status.publishAt ? ` until ${body.status.publishAt}` : ""}`);
  console.log(`  env missing: ${missing.length ? missing.join(", ") : "none"}`);
  process.exit(missing.length || !existsSync(file) ? 1 : 0);
}
if (missing.length) {
  console.error(`FAIL youtube: missing env ${missing.join(", ")}`);
  process.exit(1);
}
if (!CHECK && !existsSync(file)) {
  console.error(`FAIL youtube: video not found: ${file}`);
  process.exit(1);
}

async function token() {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.IPM_YOUTUBE_CLIENT_ID,
      client_secret: process.env.IPM_YOUTUBE_CLIENT_SECRET,
      refresh_token: process.env.IPM_YOUTUBE_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`login failed: ${data.error_description ?? data.error ?? res.status}. The key may be revoked; redo tools/youtube-login.py.`);
  return data.access_token;
}

async function channelOf(access) {
  const res = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", { headers: { Authorization: `Bearer ${access}` } });
  const data = await res.json();
  if (!res.ok) throw new Error(`channel lookup failed (${res.status}): ${data.error?.message ?? ""}`);
  const c = data.items?.[0]?.snippet;
  return c ? { title: c.title, handle: (c.customUrl ?? "").toLowerCase() } : { title: "(no channel)", handle: "" };
}

async function main() {
  const access = await token();
  const ch = await channelOf(access);
  if (CHECK) {
    console.log(`${ch.handle === CHANNEL ? "OK  " : "FAIL"} youtube key belongs to "${ch.title}" ${ch.handle}${ch.handle === CHANNEL ? "" : `  (NOT ${CHANNEL})`}`);
    process.exit(ch.handle === CHANNEL ? 0 : 1);
  }
  if (ch.handle !== CHANNEL) throw new Error(`key belongs to "${ch.title}" ${ch.handle}, not ${CHANNEL}; nothing uploaded`);

  const video = readFileSync(file);
  const init = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": "video/mp4",
      "X-Upload-Content-Length": String(video.length),
    },
    body: JSON.stringify(body),
  });
  if (!init.ok) throw new Error(`upload start failed (${init.status}): ${await init.text()}`);
  const url = init.headers.get("location");
  if (!url) throw new Error("YouTube did not return an upload URL");

  const put = await fetch(url, { method: "PUT", headers: { "Content-Type": "video/mp4", "Content-Length": String(video.length) }, body: video });
  const result = await put.json();
  if (!put.ok || !result.id) throw new Error(`upload failed (${put.status}): ${JSON.stringify(result.error ?? result)}`);

  const status = result.status ?? {};
  console.log(`DONE youtube https://youtube.com/shorts/${result.id}`);
  console.log(`     privacy=${status.privacyStatus}${status.publishAt ? ` goes public at ${status.publishAt}` : ""}`);
  if (!PRIVATE && status.privacyStatus !== "public" && !status.publishAt) {
    console.log("WARN youtube video is not public: the Google project may need Google's API audit (see README).");
  }
}

main().catch((e) => {
  console.error("FAIL youtube", e.message);
  process.exit(1);
});
