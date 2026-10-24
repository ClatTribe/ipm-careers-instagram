// Prints the day's caption and download links for its slides (for the owner's daily email).
//   node tools/share-links.mjs 2026-11-02
import { readdirSync, readFileSync } from "node:fs";
import { cleanupShares, shareLinks } from "./ig-lib.mjs";
const date = process.argv[2];
const dir = `out/white/${date}`;
const files = readdirSync(dir).filter((f) => /^slide-\d+\.png$/.test(f)).sort((a, b) => parseInt(a.slice(6)) - parseInt(b.slice(6))).map((f) => `${dir}/${f}`);
const post = JSON.parse(readFileSync(`posts/${date}.json`, "utf8"));
const links = await shareLinks(files, date);
await cleanupShares(14).catch(() => 0);
console.log("CAPTION:\n" + post.caption + "\n\nSLIDES (download links, kept for 14 days):\n" + links.map((l, i) => `Slide ${i + 1}: ${l}`).join("\n"));
