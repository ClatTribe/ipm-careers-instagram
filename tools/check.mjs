#!/usr/bin/env node
// Safety checks for a post/story/reel JSON:  node tools/check.mjs posts/2026-11-02.json
// Blocks: em/en dashes, competitor names, promises, too many hashtags, a VERIFY claim, missing caption.
import { readFileSync } from "node:fs";
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
if (problems.length) { console.log(`FAIL ${file}\n  - ` + problems.join("\n  - ")); process.exit(1); }
console.log(`OK   ${file}`);
