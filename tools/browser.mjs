// Starts Chromium for rendering, wherever this machine keeps it.
// Tries Playwright's own browser first, then any Chrome under /opt/pw-browsers (folder names change between images).
import fs from "node:fs";
import { chromium } from "playwright";

export async function launchBrowser() {
  try {
    return await chromium.launch();
  } catch (first) {
    const root = "/opt/pw-browsers";
    const found = [];
    for (const d of fs.existsSync(root) ? fs.readdirSync(root) : []) {
      for (const sub of ["chrome-linux/chrome", "chrome-linux64/chrome", "chrome-linux/headless_shell", "chrome-headless-shell-linux64/chrome-headless-shell"]) {
        if (fs.existsSync(`${root}/${d}/${sub}`)) found.push(`${root}/${d}/${sub}`);
      }
    }
    for (const exe of found) {
      try {
        return await chromium.launch({ executablePath: exe });
      } catch {}
    }
    throw new Error(`no working Chromium found (tried Playwright default and ${found.join(", ") || "nothing under /opt/pw-browsers"}): ${first.message}`);
  }
}
