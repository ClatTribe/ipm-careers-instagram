#!/usr/bin/env node
/**
 * Publishes to the IPM Careers Instagram account.
 *   node tools/upload-instagram.mjs post  posts/2026-11-02.json  [--publish-at ISO] [--dry-run]   (slides in out/white/<name>/)
 *   node tools/upload-instagram.mjs story stories/2026-11-04.json [--publish-at ISO] [--dry-run]   (image in out/stories/<name>.png)
 *   node tools/upload-instagram.mjs reel  reels/<id>.json        [--publish-at ISO] [--dry-run]   (video in out/reels/<id>.mp4)
 * Instagram's API cannot schedule, so with --publish-at the script prepares everything and waits.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { checkAccount, graph, hostAsJpeg, hostVideo, IG_ID, publish, removeHosted, REQUIRED_ENV, tokenDaysLeft, waitReady, waitUntil } from "./ig-lib.mjs";

const [kind, file] = process.argv.slice(2);
const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : undefined; };
const DRY = process.argv.includes("--dry-run");
const publishAt = arg("--publish-at");
if (!["post", "story", "reel"].includes(kind) || !file?.endsWith(".json")) {
  console.error("usage: node tools/upload-instagram.mjs post|story|reel <file>.json [--publish-at ISO] [--dry-run]");
  process.exit(2);
}
const item = JSON.parse(readFileSync(file, "utf8"));
const name = path.basename(file, ".json");
const media =
  kind === "post"
    ? (() => { const d = path.join("out/white", name); return existsSync(d) ? readdirSync(d).filter((f) => /^slide-\d+\.png$/.test(f)).sort((a, b) => parseInt(a.slice(6)) - parseInt(b.slice(6))).map((f) => path.join(d, f)) : []; })()
    : [kind === "story" ? path.join("out/stories", name + ".png") : path.join("out/reels", (item.id ?? name) + ".mp4")].filter(existsSync);
const caption = (item.caption ?? "").slice(0, 2200);
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);

if (DRY) {
  console.log(`DRY RUN instagram ${kind} ${file}`);
  console.log(`  media:       ${media.length ? media.length + " file(s)" : "NONE (render it first)"}`);
  if (kind !== "story") console.log(`  caption:     ${caption.split("\n")[0]} ...`);
  console.log(`  publish:     ${publishAt ?? "immediately"}`);
  console.log(`  env missing: ${missing.length ? missing.join(", ") : "none"}`);
  if (!missing.length) {
    try { console.log(`  account:     @${await checkAccount()} (matches)`); } catch (e) { console.log(`  account:     FAIL ${e.message}`); process.exit(1); }
    const days = tokenDaysLeft();
    if (days !== null) console.log(`  token:       about ${days} days left${days <= 10 ? "  << WARN: make a new key (README)" : ""}`);
  }
  process.exit(missing.length || !media.length ? 1 : 0);
}
if (missing.length) { console.error(`FAIL missing env: ${missing.join(", ")}`); process.exit(1); }
if (!media.length || media.length > 10) { console.error(`FAIL need 1 to 10 media files, found ${media.length}`); process.exit(1); }

const hosted = [];
try {
  console.log(`     account @${await checkAccount()}`);
  let creationId;
  if (kind === "reel") {
    hosted.push(await hostVideo(media[0], "ipm-reels"));
    ({ id: creationId } = await graph(`${IG_ID}/media`, { media_type: "REELS", video_url: hosted[0].url, caption, share_to_feed: "true" }));
  } else {
    for (const m of media) hosted.push(await hostAsJpeg(m, kind === "story" ? "ipm-stories" : "ipm-posts"));
    if (kind === "story") ({ id: creationId } = await graph(`${IG_ID}/media`, { media_type: "STORIES", image_url: hosted[0].url }));
    else if (hosted.length === 1) ({ id: creationId } = await graph(`${IG_ID}/media`, { image_url: hosted[0].url, caption }));
    else {
      const children = [];
      for (const h of hosted) { const { id } = await graph(`${IG_ID}/media`, { image_url: h.url, is_carousel_item: "true" }); await waitReady(id); children.push(id); }
      ({ id: creationId } = await graph(`${IG_ID}/media`, { media_type: "CAROUSEL", children: children.join(","), caption }));
    }
  }
  await waitReady(creationId, kind === "reel" ? 120 : 60);
  await waitUntil(publishAt);
  const link = await publish(creationId);
  console.log(`DONE instagram ${kind}: ${link}`);
  const days = tokenDaysLeft();
  if (days !== null && days <= 10) console.log(`WARN the Instagram key expires in about ${days} days: make a new one and paste it into IPM_INSTAGRAM_ACCESS_TOKEN (README), then update token-expiry.txt`);
} catch (e) {
  console.error(`FAIL instagram ${kind}: ${e.message}`);
  process.exitCode = 1;
} finally {
  for (const h of hosted) await removeHosted(h);
}
