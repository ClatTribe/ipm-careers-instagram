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
if (days >= 1 && days <= 21 && date < "2026-11-15") {
  fs.writeFileSync(`stories/auto/${date}-countdown.json`, JSON.stringify({ type: "countdown", kicker: "IIM B UGAT · 15 NOV", days, title: days === 1 ? "day to go." : "days to go.",
    task: days === 1 ? "Pack your admit card and ID tonight. Then sleep." : days === 2 ? "Light revision only. Sleep on time tonight." : tasks[days % tasks.length], reply: "Writing IIM B UGAT? Reply with your target." }, null, 1));
  made.push(`${date}-countdown`);
}
// CHRIST University (BBA): apply-by countdown 22 to 25 Nov, then test countdown 26 Nov to 5 Dec.
// Dates from christuniversity.in/admission/ugpg-selection-process-dates-2027 (checked daily by tools/check-christ-dates.sh).
const CHRIST = {
  "2026-11-22": { days: 3, title: "days left to apply.", task: "Decide your campus and programme order. Our CHRIST campus map post has every BBA route." },
  "2026-11-23": { days: 2, title: "days left to apply.", task: "Fill the form today. Do not leave it for the last evening." },
  "2026-11-24": { days: 1, title: "day left to apply.", task: "Applied? Take a free CHRIST mock and see where you stand." },
  "2026-11-25": { days: "5 PM", title: "today: applications close.", task: "Submit before 5 PM, and only on christuniversity.in." },
};
const tTasks = ["Fundamental Accounting: revise the golden rules of debit and credit.", "Take one full CHRIST mock in 90 minutes. Count how many marks negatives cost you.",
  "GK: 15 minutes of this month's current affairs.", "One DI set with a timer. Tables and bar graphs first.", "Reasoning: one arrangement puzzle and one blood-relation set.",
  "English: one reading passage and 10 grammar questions.", "Review your last mock: which wrong answers should you have skipped?"];
const tDays = Math.round((Date.parse("2026-12-05") - Date.parse(date)) / 86400000);
const TS = "Free CHRIST mock + 10-mock test series: ipmcareer.com";
let ch = CHRIST[date] && { kicker: "CHRIST · APPLY BY 25 NOV, 5 PM", reply: "Applied already? Reply with your campus.", ...CHRIST[date] };
if (!ch && tDays >= 0 && tDays <= 9) {
  ch = { kicker: "CHRIST ENTRANCE TEST · 5 DEC", days: tDays || "GO", title: tDays === 0 ? "Test day. All the best." : tDays === 1 ? "day to the test." : "days to the test.",
    task: tDays === 0 ? "Skip what you cannot crack in time. Every wrong answer costs 0.25." : tDays === 1 ? "Admit cards came out last night (3 Dec, 11 PM). Check your slot and keep your ID ready."
      : tDays === 2 ? "Admit cards come out tonight at 11 PM on christuniversity.in. Light revision today." : tTasks[tDays % tTasks.length],
    reply: tDays === 0 ? "Tell us how it went tonight." : "Writing CHRIST? Reply with your target campus." };
}
if (ch) {
  fs.writeFileSync(`stories/auto/${date}-countdown.json`, JSON.stringify({ type: "countdown", ...ch, ...(tDays > 0 ? { cta: TS } : {}) }, null, 1));
  made.push(`${date}-countdown`);
}

if (fs.existsSync(`out/white/${date}/slide-1.png`)) {
  fs.writeFileSync(`stories/auto/${date}-newpost.json`, JSON.stringify({ type: "newpost", image: `../out/white/${date}/slide-1.png` }, null, 1));
  made.push(`${date}-newpost`);
}
console.log(made.length ? `MADE ${made.join(", ")}` : "NO_STORY");
