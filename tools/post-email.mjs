#!/usr/bin/env node
// Prints the email for a post (for the owner's manual YouTube upload): caption + 14-day download links.
//   node tools/post-email.mjs posts/2026-11-22.json [slidesDir]
// Slides default to out/white/<name>/slide-*.png (render first: bash tools/day.sh post <date> --no-upload).
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { shareLinks } from "./ig-lib.mjs";
const file = process.argv[2];
const name = path.basename(file, ".json");
const dir = process.argv[3] || `out/white/${name}`;
const files = readdirSync(dir).filter((f) => /^slide-\d+\.png$/.test(f)).sort((a, b) => parseInt(a.slice(6)) - parseInt(b.slice(6))).map((f) => `${dir}/${f}`);
const post = JSON.parse(readFileSync(file, "utf8"));
const links = await shareLinks(files, name);
console.log(JSON.stringify({ subject: `IPM Careers daily post: ${post.date || name}`, caption: post.caption, links }, null, 1));
