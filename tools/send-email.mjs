#!/usr/bin/env node
/**
 * Sends the owner a plain-text email through Gmail (the daily post email).
 *
 *   node tools/send-email.mjs "Subject" body.txt [--to someone@example.com]
 *
 * Needs IPM_GMAIL_REFRESH_TOKEN (made once with: python3 tools/youtube-login.py gmail, scope gmail.send only)
 * plus IPM_YOUTUBE_CLIENT_ID / IPM_YOUTUBE_CLIENT_SECRET (same Google project). Default recipient: IPM_EMAIL_TO
 * or ipmcareeronline@gmail.com. Exits 0 with a SKIP line when the Gmail key is not set, so posting never fails on it.
 */
import { readFileSync } from "node:fs";

const [subject, bodyFile] = process.argv.slice(2);
const i = process.argv.indexOf("--to");
const to = i > 0 ? process.argv[i + 1] : process.env.IPM_EMAIL_TO || "ipmcareeronline@gmail.com";
if (!subject || !bodyFile) {
  console.error('usage: node tools/send-email.mjs "Subject" body.txt [--to address]');
  process.exit(2);
}
if (!process.env.IPM_GMAIL_REFRESH_TOKEN) {
  console.log("SKIP email: IPM_GMAIL_REFRESH_TOKEN is not set");
  process.exit(0);
}

const tok = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    client_id: process.env.IPM_YOUTUBE_CLIENT_ID,
    client_secret: process.env.IPM_YOUTUBE_CLIENT_SECRET,
    refresh_token: process.env.IPM_GMAIL_REFRESH_TOKEN,
    grant_type: "refresh_token",
  }),
}).then((r) => r.json());
if (!tok.access_token) {
  console.error(`FAIL email login: ${tok.error_description ?? tok.error ?? "no access token"}`);
  process.exit(1);
}

const b64 = (s) => Buffer.from(s, "utf8").toString("base64");
const raw = [
  `To: ${to}`,
  `Subject: =?UTF-8?B?${b64(subject)}?=`,
  "MIME-Version: 1.0",
  "Content-Type: text/plain; charset=UTF-8",
  "Content-Transfer-Encoding: base64",
  "",
  b64(readFileSync(bodyFile, "utf8")),
].join("\r\n");
const res = await fetch("https://www.googleapis.com/gmail/v1/users/me/messages/send", {
  method: "POST",
  headers: { Authorization: `Bearer ${tok.access_token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ raw: Buffer.from(raw).toString("base64url") }),
});
const out = await res.json();
if (!res.ok) {
  console.error(`FAIL email: ${out.error?.message ?? res.status}`);
  process.exit(1);
}
console.log(`DONE email to ${to} (id ${out.id})`);
