// Renders a "route map" carousel (templates/route-map/route-map.html + a data JSON) to PNG slides.
//   node tools/render-route-map.mjs templates/route-map/route-map.json out/white/<name>
import fs from "node:fs";
import path from "node:path";
import { launchBrowser } from "./browser.mjs";

const [dataFile, outDir] = process.argv.slice(2);
if (!dataFile || !outDir) { console.error("usage: node tools/render-route-map.mjs <data.json> <outDir>"); process.exit(2); }
const data = JSON.parse(fs.readFileSync(dataFile, "utf8"));
const html = path.resolve("templates/route-map/route-map.html");
const n = data.lines.length + 2;
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
const b = await launchBrowser();
const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
await p.addInitScript((d) => { window.ROUTE = d; }, data);
for (let s = 1; s <= n; s++) {
  await p.goto(`file://${html}?s=${s}`, { waitUntil: "networkidle" });
  await p.waitForTimeout(900);
  await p.screenshot({ path: `${outDir}/slide-${s}.png` });
}
await b.close();
console.log(`RENDERED ${outDir} (${n} slides)`);
