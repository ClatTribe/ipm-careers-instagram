#!/usr/bin/env node
// Safety checks for a post/story/reel JSON:  node tools/check.mjs posts/2026-11-02.json
// Blocks: em/en dashes, competitor names, promises, too many hashtags, a VERIFY claim, missing caption,
// bad YouTube metadata (title over 100 chars, < or >, missing YouTube video file), and a feed caption
// that opens with the same 5 words as another post from the 7 days before it.
import { existsSync, readdirSync, readFileSync } from "node:fs";
const file = process.argv[2];
const j = JSON.parse(readFileSync(file, "utf8"));
const text = JSON.stringify(j);
const problems = [];
if (/[—–]/.test(text)) problems.push("em dash or en dash found (use a comma, colon or full stop)");
const rivals = ["2iim", "byju", "\\bims\\b", "career launcher", "hitbullseye", "endeavor", "t\\.i\\.m\\.e", "unacademy", "physicswallah", "\\bpw\\b", "toprankers"];
for (const r of rivals) if (new RegExp(r, "i").test(text)) problems.push(`competitor name: ${r}`);
if (/guarantee|pakka|100% (sure|selection)/i.test(text)) problems.push("promise word (guarantee / pakka)");
if (/\bIIM B UG\b(?!AT)/.test(text)) problems.push('write "IIM B UGAT", not "IIM B UG"');
for (const c of j.claims ?? []) if (/^VERIFY/i.test(c.source ?? "")) problems.push(`unconfirmed claim: "${c.text}" (source starts with VERIFY)`);
if (j.caption !== undefined) {
  if (!j.caption.trim()) problems.push("empty caption");
  if (j.caption.length > 2200) problems.push("caption longer than 2200 characters");
  if ((j.caption.match(/#\w+/g) ?? []).length > 5) problems.push("more than 5 hashtags");
}
// Feed posts: the caption must not open with the same 5 words as another post from the 7 days before it
if (j.caption && j.date && /(^|\/)posts\//.test(file)) {
  const open5 = (c) => c.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean).slice(0, 5).join(" ");
  const me = open5(j.caption);
  const day = (d) => Date.parse(`${d}T00:00:00Z`) / 86400000;
  const dir = new URL("../posts/", import.meta.url);
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    if (file.endsWith(`posts/${f}`)) continue;
    const o = JSON.parse(readFileSync(new URL(f, dir), "utf8"));
    const gap = day(j.date) - day(o.date ?? "");
    if (o.caption && gap > 0 && gap <= 7 && open5(o.caption) === me) problems.push(`caption opens like posts/${f} (${o.date}): "${me}..."; write a different first line`);
  }
}
if (j.youtube) {
  // YouTube Shorts metadata (tools/upload-youtube.mjs)
  const y = j.youtube;
  if (y.title !== undefined && (!y.title.trim() || y.title.length > 100)) problems.push("youtube title empty or longer than 100 characters");
  if ((y.description ?? "").length > 5000) problems.push("youtube description longer than 5000 characters");
  if (/[<>]/.test((y.title ?? "") + (y.description ?? ""))) problems.push("youtube title/description contains < or > (YouTube rejects them)");
  if ((y.tags ?? []).join(",").length > 500) problems.push("youtube tags longer than 500 characters");
  if (y.video && !existsSync(new URL(`../${y.video}`, import.meta.url))) problems.push(`youtube video missing: ${y.video}`);
  if (y.video && /story tomorrow|comment your/i.test(y.description ?? "")) problems.push("youtube reveal version should not ask for comments / point to tomorrow's Story");
}
if (problems.length) { console.log(`FAIL ${file}\n  - ` + problems.join("\n  - ")); process.exit(1); }
console.log(`OK   ${file}`);
