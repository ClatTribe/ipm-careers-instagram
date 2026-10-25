// Writes the day's Story files from the calendar rules (no writing needed):
//   node tools/make-stories.mjs 2026-11-02     -> stories/auto/<date>-countdown.json (until 14 Nov), <date>-newpost.json
import fs from "node:fs";
const date = process.argv[2];
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { console.error("usage: node tools/make-stories.mjs YYYY-MM-DD"); process.exit(2); }
fs.mkdirSync("stories/auto", { recursive: true });
const made = [];
const EXAM = "2026-11-15";
const days = Math.round((Date.parse(EXAM) - Date.parse(date)) / 86400000);
const tasks = ["Take one DI and LR set today. Time it.", "Redo three questions you got wrong this week.", "Read one long article and write its main idea in one line.",
  "Sit the 2025 paper as a full mock. No pauses.", "Revise percentages and ratios: 20 quick questions.", "Solve one LR puzzle without looking at the answer.", "Review your last mock: why did each wrong answer go wrong?"];
if (days >= 1 && days <= 21) {
  fs.writeFileSync(`stories/auto/${date}-countdown.json`, JSON.stringify({ type: "countdown", kicker: "IIM B UGAT · 15 NOV", days, title: days === 1 ? "day to go." : "days to go.",
    task: days === 1 ? "Pack your admit card and ID tonight. Then sleep." : days === 2 ? "Light revision only. Sleep on time tonight." : tasks[days % tasks.length], reply: "Writing IIM B UGAT? Reply with your target." }, null, 1));
  made.push(`${date}-countdown`);
}
if (fs.existsSync(`out/white/${date}/slide-1.png`)) {
  fs.writeFileSync(`stories/auto/${date}-newpost.json`, JSON.stringify({ type: "newpost", image: `../out/white/${date}/slide-1.png` }, null, 1));
  made.push(`${date}-newpost`);
}
console.log(made.length ? `MADE ${made.join(", ")}` : "NO_STORY");
