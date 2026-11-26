// Builds a whiteboard reel video from reels/src/<date>.json:
//   node tools/make-reel.mjs 2026-11-27           -> media/reels/<date>.mp4 (1080x1920, 30 fps, voice + pauses)
//   node tools/make-reel.mjs 2026-11-27 --frames 3,12,20   -> preview stills only (out/reel-<date>-t<sec>.png)
// The spec has: tag, sub, title, voice (mp3 path), beats [{t: second in the voice file where this beat starts, hold: extra silence before the NEXT beat}],
// els [{type: card|timer|opts|line|small|ans|follow, at: beat index, d: delay s, until: beat index, ...}]. Narration is made with ElevenLabs (Monika Sogam).
import { readFileSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { launchBrowser } from "./browser.mjs";
const date = process.argv[2];
const fi = process.argv.indexOf("--frames");
const only = fi > 0 ? process.argv[fi + 1].split(",").map(Number) : null;
const muxOnly = process.argv.includes("--mux"); // reuse frames already in out/reel-<date>/f
const spec = JSON.parse(readFileSync(`reels/src/${date}.json`, "utf8"));
const LEAD = spec.lead ?? 0.4, TAIL = spec.tail ?? 1.2, FPS = 30;
const dur = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", spec.voice]).toString());
// timeline: voice pieces between beat starts, each followed by its hold
const beats = []; let tl = LEAD; const pieces = [];
spec.beats.forEach((b, i) => {
  const a = b.t, z = i + 1 < spec.beats.length ? spec.beats[i + 1].t : dur;
  beats.push({ start: tl }); pieces.push({ a, z, hold: b.hold ?? 0 }); tl += (z - a) + (b.hold ?? 0);
});
const total = tl + TAIL;
const tmp = `out/reel-${date}`; mkdirSync("out", { recursive: true });
if (!only && !muxOnly) { rmSync(tmp, { recursive: true, force: true }); mkdirSync(`${tmp}/f`, { recursive: true }); }
if (!muxOnly) {
const b = await launchBrowser();
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.goto("file://" + path.resolve("templates/reel.html"));
await p.evaluate(() => document.fonts.ready);
await p.evaluate(([s, bt]) => window.setup(s, bt), [spec, beats]);
await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
const times = only ?? [...Array(Math.ceil(total * FPS)).keys()].map((i) => i / FPS);
let i = 0;
for (const t of times) {
  await p.evaluate((t) => window.render(t), t);
  const file = only ? `out/reel-${date}-t${t}.png` : `${tmp}/f/${String(i++).padStart(5, "0")}.png`;
  await p.screenshot({ path: file, type: "png" });
}
await b.close();
}
if (only) { console.log(`PREVIEW out/reel-${date}-t*.png  (total ${total.toFixed(1)}s, beats ${beats.map((x) => x.start.toFixed(2)).join(" ")})`); process.exit(0); }
// audio: lead silence + pieces with holds + tail
const SIL = (d, l) => `aevalsrc=0:d=${d}:s=44100:c=mono[${l}]`;
const parts = [`[1:a]aformat=sample_rates=44100:channel_layouts=mono,asplit=${pieces.length}${pieces.map((_, k) => `[i${k}]`).join('')}`, SIL(LEAD, 's0')]; const lbl = ["[s0]"];
pieces.forEach((pc, k) => {
  parts.push(`[i${k}]atrim=${pc.a}:${pc.z},asetpts=PTS-STARTPTS[v${k}]`); lbl.push(`[v${k}]`);
  if (pc.hold) { parts.push(SIL(pc.hold, `h${k}`)); lbl.push(`[h${k}]`); }
});
parts.push(SIL(TAIL, 't')); lbl.push("[t]");
const fc = parts.join(";") + ";" + lbl.join("") + `concat=n=${lbl.length}:v=0:a=1,loudnorm=I=-14:TP=-1.5[a]`;
const out = spec.video ?? `media/reels/${date}.mp4`;
execFileSync("ffmpeg", ["-v", "error", "-y", "-framerate", String(FPS), "-i", `${tmp}/f/%05d.png`, "-i", spec.voice, "-filter_complex", fc,
  "-map", "0:v", "-map", "[a]", "-c:v", "libx264", "-crf", "20", "-preset", "medium", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart", out]);
rmSync(tmp, { recursive: true, force: true });
console.log(`MADE ${out} (${total.toFixed(1)}s)`);
