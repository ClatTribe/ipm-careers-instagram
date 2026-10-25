// Prints the reel's caption, answer and a download link for the video (for the owner's daily email / YouTube).
//   node tools/share-reel.mjs 2026-10-25
import { readFileSync } from "node:fs";
import { hostVideo } from "./ig-lib.mjs";
const date = process.argv[2];
const reel = JSON.parse(readFileSync(`reels/${date}.json`, "utf8"));
const { url } = await hostVideo(reel.video, `ipm-share/${date}`);
console.log(`CAPTION:\n${reel.caption}\n\nANSWER (for a pinned comment):\n${reel.answer ?? "none"}\n\nVIDEO (download link, kept for 14 days):\n${url}`);
