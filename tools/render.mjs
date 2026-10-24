// Renders posts to PNG slides (1080 x 1350).
//   node tools/render.mjs posts/2026-11-02.json [more.json ...]
// Output: out/<post name>/slide-1.png, slide-2.png ...
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const theme = (process.argv.find((a) => a.startsWith("--theme=")) || "").slice(8); // web | logo | (empty = cream)
const files = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (!files.length) { console.error("usage: node tools/render.mjs posts/<file>.json ..."); process.exit(2); }
const exe = fs.readdirSync("/opt/pw-browsers").find((d) => d.startsWith("chromium-"));
const browser = await chromium.launch(exe ? { executablePath: `/opt/pw-browsers/${exe}/chrome-linux/chrome` } : {});
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
await page.goto("file://" + path.join(ROOT, "templates/post.html"));
await page.evaluate(() => document.fonts.ready);
for (const file of files) {
  const post = JSON.parse(fs.readFileSync(file, "utf8"));
  const out = path.join(ROOT, "out", theme || "cream", path.basename(file, ".json"));
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  const n = await page.evaluate((p) => window.slideCount(p), post);
  for (let i = 0; i < n; i++) {
    await page.evaluate(([p, k, t]) => window.renderSlide(p, k, t), [post, i, theme]);
    await page.evaluate(() => Promise.all([...document.images].map((im) => im.complete || new Promise((r) => (im.onload = im.onerror = r)))));
    await page.evaluate(() => document.fonts.ready);
    // overflow check: nothing may stick out of the slide body
    const over = await page.evaluate(() => {
      const b = document.querySelector(".body");
      return b.scrollHeight > b.clientHeight + 2 || b.scrollWidth > b.clientWidth + 2;
    });
    if (over) console.log(`WARN  ${file} slide ${i + 1}: content is too tall, shorten the text`);
    await page.screenshot({ path: path.join(out, `slide-${i + 1}.png`) });
  }
  console.log(`RENDERED out/${theme || "cream"}/${path.basename(out)} (${n} slide${n > 1 ? "s" : ""})`);
}
await browser.close();
