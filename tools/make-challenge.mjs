// 15-second challenge reel:  node tools/make-challenge.mjs <date> [--frames 1,8,14]
// Spec reels/src/<date>-challenge.json: {sub, hook, tag, q | opts, secs (countdown), voice: {file, a, z} (the part of the narration that reads the question)}.
// Output media/reels/<date>.mp4: voice reads the question, ticking countdown, "comment your answer" end card. The solution goes in the pinned comment.
import { readFileSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { launchBrowser } from "./browser.mjs";
const date = process.argv[2];
const fi = process.argv.indexOf("--frames");
const only = fi > 0 ? process.argv[fi + 1].split(",").map(Number) : null;
const S = JSON.parse(readFileSync(`reels/src/${date}-challenge.json`, "utf8"));
const FPS = 30, LEAD = 0.5, GAP = 0.4, CTA = 2.6;
const vlen = S.voice.z - S.voice.a;
const T = { voice: LEAD, count: LEAD + vlen + GAP };
const total = T.count + S.secs + CTA;
const tmp = `out/chal-${date}`;
if (!only) { rmSync(tmp, { recursive: true, force: true }); mkdirSync(`${tmp}/f`, { recursive: true }); }
const b = await launchBrowser();
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.goto("file://" + path.resolve("templates/reel-challenge.html"));
await p.evaluate(() => document.fonts.ready);
await p.evaluate(([s, t]) => window.setup(s, t), [S, T]); await p.waitForTimeout(200);
const times = only ?? [...Array(Math.ceil(total * FPS)).keys()].map((i) => i / FPS);
let i = 0;
for (const t of times) {
  await p.evaluate((t) => window.render(t), t);
  await p.screenshot({ path: only ? `out/chal-${date}-t${t}.png` : `${tmp}/f/${String(i++).padStart(5, "0")}.png` });
}
await b.close();
if (only) { console.log(`PREVIEW out/chal-${date}-t*.png (total ${total.toFixed(1)}s)`); process.exit(0); }
// audio: voice clip + one tick per second of the countdown + a soft ding at the end
const ticks = [...Array(S.secs).keys()].map((k) => T.count + k);
const parts = [`[1:a]atrim=${S.voice.a}:${S.voice.z},asetpts=PTS-STARTPTS,aformat=sample_rates=44100:channel_layouts=mono,adelay=${Math.round(LEAD * 1000)}[v]`];
ticks.forEach((tt, k) => parts.push(`sine=f=1250:d=0.07:sample_rate=44100,volume=0.35,afade=t=out:st=0.04:d=0.03,adelay=${Math.round(tt * 1000)}[k${k}]`));
parts.push(`sine=f=880:d=0.5:sample_rate=44100,volume=0.3,afade=t=out:st=0.1:d=0.4,adelay=${Math.round((T.count + S.secs) * 1000)}[d]`);
const ins = ["[v]", ...ticks.map((_, k) => `[k${k}]`), "[d]"];
const fc = parts.join(";") + ";" + ins.join("") + `amix=inputs=${ins.length}:normalize=0:duration=longest,apad,atrim=0:${total.toFixed(2)},loudnorm=I=-14:TP=-1.5[a]`;
const out = `media/reels/${date}.mp4`;
execFileSync("ffmpeg", ["-v", "error", "-y", "-framerate", String(FPS), "-i", `${tmp}/f/%05d.png`, "-i", S.voice.file, "-filter_complex", fc,
  "-map", "0:v", "-map", "[a]", "-c:v", "libx264", "-crf", "20", "-preset", "medium", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-t", total.toFixed(2), "-movflags", "+faststart", out]);
rmSync(tmp, { recursive: true, force: true });
console.log(`MADE ${out} (${total.toFixed(1)}s)`);
