#!/usr/bin/env node
// Prints the email for a post: caption + 14-day download links (Instagram 4:5 in links, YouTube square in ytLinks).
//   node tools/post-email.mjs posts/2026-11-22.json [slidesDir]
// Slides default to out/white/<name>/slide-*.png (render first: bash tools/day.sh post <date> --no-upload).
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { shareLinks } from "./ig-lib.mjs";
import { execFileSync } from "node:child_process";
const file = process.argv[2];
const name = path.basename(file, ".json");
const dir = process.argv[3] || `out/white/${name}`;
const files = readdirSync(dir).filter((f) => /^slide-\d+\.png$/.test(f)).sort((a, b) => parseInt(a.slice(6)) - parseInt(b.slice(6))).map((f) => `${dir}/${f}`);
const post = JSON.parse(readFileSync(file, "utf8"));
const links = await shareLinks(files, name);
// YouTube community posts are square: padded copies so nothing gets cut
const sq = execFileSync("python3", ["tools/yt-square.py", `out/yt/${name}`, ...files], { encoding: "utf8" }).trim().split("\n");
const ytLinks = await shareLinks(sq, `${name}-yt`);
console.log(JSON.stringify({ subject: `IPM Careers daily post: ${post.date || name}`, caption: post.caption, links, ytLinks }, null, 1));
