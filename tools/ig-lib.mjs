/**
 * Shared helpers for posting to the IPM Careers Instagram account (feed posts, carousels, Stories, Reels).
 * Instagram fetches media from a public URL, so each file is hosted on Cloudinary for a few minutes
 * (images as JPEG) and deleted again once Instagram has it.
 *
 * Environment variables (IPM_ prefix keeps them apart from EduAbroad's keys in the same environment):
 *   IPM_INSTAGRAM_ACCESS_TOKEN, IPM_INSTAGRAM_BUSINESS_ACCOUNT_ID, IPM_INSTAGRAM_USERNAME (e.g. ipmcareers)
 *   IPM_INSTAGRAM_PAGE_TOKEN (optional, never-expiring System User key; used when it works, see checkAccount)
 *   CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET (shared)
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

let TOKEN = process.env.IPM_INSTAGRAM_ACCESS_TOKEN ?? "";
export let IG_ID = process.env.IPM_INSTAGRAM_BUSINESS_ACCOUNT_ID ?? "";
// "IGAA..." = Instagram Login token (graph.instagram.com); otherwise a Facebook Page / System User token
export let GRAPH = TOKEN.startsWith("IGAA") ? "https://graph.instagram.com/v21.0" : "https://graph.facebook.com/v21.0";
// Never-expiring System User key (optional). checkAccount() switches to it when it works for the right
// account, and falls back to IPM_INSTAGRAM_ACCESS_TOKEN otherwise (so adding it can never break posting).
const PAGE_TOKEN = process.env.IPM_INSTAGRAM_PAGE_TOKEN ?? "";
const PAGE_IG_ID = process.env.IPM_INSTAGRAM_PAGE_ACCOUNT_ID || "17841439684789656";
const CLD = { cloud: process.env.CLOUDINARY_CLOUD_NAME, key: process.env.CLOUDINARY_API_KEY, secret: process.env.CLOUDINARY_API_SECRET };

export const REQUIRED_ENV = ["IPM_INSTAGRAM_ACCESS_TOKEN", "IPM_INSTAGRAM_BUSINESS_ACCOUNT_ID", "IPM_INSTAGRAM_USERNAME", "CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"];
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function graph(p, params = {}, method = "POST") {
  const qs = new URLSearchParams({ ...params, access_token: TOKEN });
  const res = await fetch(`${GRAPH}/${p}${method === "GET" ? `?${qs}` : ""}`, method === "GET" ? {} : { method, body: qs });
  const data = await res.json();
  if (!res.ok || data.error) {
    const e = data.error ?? {};
    const extra = [e.code && `code ${e.code}`, e.error_subcode && `subcode ${e.error_subcode}`, e.error_user_title, e.error_user_msg].filter(Boolean).join("; ");
    throw new Error(`${p}: ${e.message ?? res.status}${extra ? ` (${extra})` : ""}`);
  }
  return data;
}

/** Safety check: refuse to post unless the token belongs to the IPM Careers account. */
export async function checkAccount() {
  const want = (process.env.IPM_INSTAGRAM_USERNAME ?? "").replace(/^@/, "").toLowerCase();
  if (PAGE_TOKEN && TOKEN !== PAGE_TOKEN) {
    try {
      const qs = new URLSearchParams({ fields: "username", access_token: PAGE_TOKEN });
      const r = await (await fetch(`https://graph.facebook.com/v21.0/${PAGE_IG_ID}?${qs}`)).json();
      if (want && r.username?.toLowerCase() === want) {
        TOKEN = PAGE_TOKEN; IG_ID = PAGE_IG_ID; GRAPH = "https://graph.facebook.com/v21.0";
        console.log("     key: never-expiring System User key");
      } else console.log(`     WARN new key not usable (${r.error?.message ?? `account @${r.username}`}); using the old key`);
    } catch (e) { console.log(`     WARN new key check failed (${e.message}); using the old key`); }
  }
  const me = await graph(IG_ID, { fields: "username" }, "GET");
  if (!want || me.username?.toLowerCase() !== want)
    throw new Error(`token is for @${me.username}, expected @${want || "(IPM_INSTAGRAM_USERNAME not set)"}; not posting`);
  return me.username;
}

/**
 * Days left on the Instagram key. Instagram Login keys last 60 days and renewing one gives a NEW key
 * (which would have to be pasted into the settings again), so we do not renew here; we count down
 * from the expiry date written in token-expiry.txt when the key was added.
 */
export function tokenDaysLeft() {
  if (!TOKEN.startsWith("IGAA")) return null; // System User keys do not expire
  try {
    const exp = readFileSync(new URL("../token-expiry.txt", import.meta.url), "utf8").trim();
    return Math.floor((Date.parse(exp) - Date.now()) / 86400000);
  } catch { return null; }
}

const cldSign = (params) =>
  createHash("sha1").update(Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join("&") + CLD.secret).digest("hex");

async function cldUpload(file, folder, kind, extra = {}) {
  const params = { folder, timestamp: Math.floor(Date.now() / 1000), ...extra };
  const form = new FormData();
  form.append("file", new Blob([readFileSync(file)]), path.basename(file));
  for (const [k, v] of Object.entries(params)) form.append(k, String(v));
  form.append("api_key", CLD.key);
  form.append("signature", cldSign(params));
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLD.cloud}/${kind}/upload`, { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok || !data.secure_url) throw new Error(`hosting failed (${res.status}): ${data.error?.message ?? JSON.stringify(data)}`);
  return { url: data.secure_url, publicId: data.public_id, kind };
}
export const hostAsJpeg = (file, folder) => cldUpload(file, folder, "image", { format: "jpg" });
export const hostVideo = (file, folder) => cldUpload(file, folder, "video");

export async function removeHosted({ publicId, kind = "image" }) {
  const params = { public_id: publicId, timestamp: Math.floor(Date.now() / 1000) };
  const form = new URLSearchParams({ ...params, api_key: CLD.key, signature: cldSign(params) });
  await fetch(`https://api.cloudinary.com/v1_1/${CLD.cloud}/${kind}/destroy`, { method: "POST", body: form }).catch(() => {});
}

export async function waitReady(containerId, tries = 60) {
  for (let i = 0; i < tries; i++) {
    const { status_code: status } = await graph(containerId, { fields: "status_code" }, "GET");
    if (status === "FINISHED") return;
    if (status === "ERROR" || status === "EXPIRED") throw new Error(`Instagram could not process the media (status ${status})`);
    await sleep(5000);
  }
  throw new Error("Instagram took too long to process the media");
}

/** Waits until `publishAt` (ISO time), if it is in the future. */
export async function waitUntil(publishAt) {
  if (!publishAt) return;
  const wait = new Date(publishAt).getTime() - Date.now();
  if (wait > 0) {
    console.log(`     ready; waiting ${Math.round(wait / 60000)} min until ${publishAt}`);
    await sleep(wait);
  }
}

/** Publishes a prepared container; returns the permalink (Stories have none, so the media id). */
export async function publish(creationId) {
  // Instagram sometimes reports a container FINISHED a little before it can be published
  // (error 9007 / 2207027 "media is not ready"). Wait and retry; a failed publish posts nothing.
  let mediaId;
  for (let i = 1; ; i++) {
    try {
      ({ id: mediaId } = await graph(`${IG_ID}/media_publish`, { creation_id: creationId }));
      break;
    } catch (e) {
      if (!/2207027|9007/.test(e.message) || i >= 8) throw e;
      console.log(`     Instagram not ready yet (try ${i}); waiting 20 s`);
      await sleep(20000);
    }
  }
  const { permalink } = await graph(mediaId, { fields: "permalink" }, "GET").catch(() => ({}));
  return permalink ?? `media ${mediaId}`;
}

/** Keeps a copy of the day's slides online (for the owner's email, to re-upload on YouTube) and returns the links. */
export async function shareLinks(files, date) {
  const links = [];
  for (const f of files) links.push((await hostAsJpeg(f, `ipm-share/${date}`)).url);
  return links;
}

/** Deletes shared copies older than `days` days (Cloudinary admin API). */
export async function cleanupShares(days = 14) {
  const auth = "Basic " + Buffer.from(`${CLD.key}:${CLD.secret}`).toString("base64");
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLD.cloud}/resources/image/upload?prefix=ipm-share/&max_results=500`, { headers: { Authorization: auth } });
  if (!res.ok) return 0;
  const { resources = [] } = await res.json();
  const old = resources.filter((r) => Date.now() - Date.parse(r.created_at) > days * 86400000);
  for (const r of old) await removeHosted({ publicId: r.public_id });
  return old.length;
}
