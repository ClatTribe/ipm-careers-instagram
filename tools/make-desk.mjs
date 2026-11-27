// Approved question-reel format (27 Nov 2026): exam-desk POV.  node tools/make-desk.mjs <date> [--frames 1,10,16]
// Spec reels/src/<date>-desk.json: {hook, src, q, opts?, rough[] (stop BEFORE the answer), gap, voice: {file, a, z}}.
// Output media/reels/<date>.mp4: voice reads the question, rough work writes itself with clock ticks, then the comments call.
import { readFileSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { launchBrowser } from "./browser.mjs";
const date = process.argv[2];
const fi = process.argv.indexOf("--frames");
const only = fi > 0 ? process.argv[fi + 1].split(",").map(Number) : null;
const S = JSON.parse(readFileSync(`reels/src/${date}-desk.json`, "utf8"));
S.gap ??= 1.0;
const FPS = 30, VO = 0.8, vlen = S.voice.z - S.voice.a;
const T = { rough: VO + vlen + 0.3 };
T.cta = T.rough + S.rough.length * S.gap + 0.4;
const total = T.cta + 2.3;
const tmp = `out/desk-${date}`;
if (!only) { rmSync(tmp, { recursive: true, force: true }); mkdirSync(`${tmp}/f`, { recursive: true }); }
const b = await launchBrowser();
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.goto("file://" + path.resolve("templates/reel-desk.html"));
await p.evaluate(() => document.fonts.ready);
await p.evaluate(([s, t]) => window.setup(s, t), [S, T]); await p.waitForTimeout(200);
const times = only ?? [...Array(Math.ceil(total * FPS)).keys()].map((i) => i / FPS);
let i = 0;
for (const t of times) {
  await p.evaluate((t) => window.render(t), t);
  await p.screenshot({ path: only ? `out/desk-${date}-t${t}.png` : `${tmp}/f/${String(i++).padStart(5, "0")}.jpg`, type: only ? "png" : "jpeg", quality: only ? undefined : 92 });
}
await b.close();
if (only) { console.log(`PREVIEW out/desk-${date}-t*.png (total ${total.toFixed(1)}s)`); process.exit(0); }
const ticks = S.rough.map((_, k) => T.rough + k * S.gap);
const parts = [`[1:a]atrim=${S.voice.a}:${S.voice.z},asetpts=PTS-STARTPTS,aformat=sample_rates=44100:channel_layouts=mono,adelay=${VO * 1000}[v]`];
ticks.forEach((tt, k) => parts.push(`sine=f=1250:d=0.07:sample_rate=44100,volume=0.35,adelay=${Math.round(tt * 1000)}[k${k}]`));
const ins = ["[v]", ...ticks.map((_, k) => `[k${k}]`)];
const fc = parts.join(";") + ";" + ins.join("") + `amix=inputs=${ins.length}:normalize=0:duration=longest,apad,atrim=0:${total.toFixed(2)},loudnorm=I=-14:TP=-1.5[a]`;
const out = `media/reels/${date}.mp4`;
execFileSync("ffmpeg", ["-v", "error", "-y", "-framerate", String(FPS), "-i", `${tmp}/f/%05d.jpg`, "-i", S.voice.file, "-filter_complex", fc,
  "-map", "0:v", "-map", "[a]", "-c:v", "libx264", "-crf", "20", "-preset", "medium", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-t", total.toFixed(2), "-movflags", "+faststart", out]);
rmSync(tmp, { recursive: true, force: true });
console.log(`MADE ${out} (${total.toFixed(1)}s)`);
