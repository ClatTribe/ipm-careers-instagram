// Renders Stories to PNG (1080 x 1920):  node tools/render-story.mjs stories/<file>.json ...
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const exe = fs.readdirSync("/opt/pw-browsers").find((d) => d.startsWith("chromium-"));
const browser = await chromium.launch(exe ? { executablePath: `/opt/pw-browsers/${exe}/chrome-linux/chrome` } : {});
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto("file://" + path.join(ROOT, "templates/story.html"));
fs.mkdirSync(path.join(ROOT, "out/stories"), { recursive: true });
for (const file of process.argv.slice(2)) {
  await page.evaluate((s) => window.render(s), JSON.parse(fs.readFileSync(file, "utf8")));
  await page.evaluate(() => Promise.all([document.fonts.ready, ...[...document.images].map((im) => im.complete || new Promise((r) => (im.onload = im.onerror = r)))]));
  const out = path.join(ROOT, "out/stories", path.basename(file, ".json") + ".png");
  await page.screenshot({ path: out });
  console.log("RENDERED", path.relative(ROOT, out));
}
await browser.close();
