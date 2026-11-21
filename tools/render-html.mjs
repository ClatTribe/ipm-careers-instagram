#!/usr/bin/env node
// Renders one HTML card to a PNG.  node tools/render-html.mjs templates/cards/x.html out.png [width] [height] [query]
import path from "node:path";
import { launchBrowser } from "./browser.mjs";
const [file, out, w = "1080", h = "1350", q = ""] = process.argv.slice(2);
const b = await launchBrowser();
const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
await p.goto("file://" + path.resolve(file) + (q ? "?" + q : ""));
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(300);
await p.screenshot({ path: out });
await b.close();
console.log("RENDERED " + out);
