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
  "2026-11-22": { days: 3, unit: "days left to <b>apply</b>", task: "Decide your campus and programme order. Our CHRIST campus map post has every BBA route." },
  "2026-11-23": { days: 2, unit: "days left to <b>apply</b>", task: "Fill the form today. Do not leave it for the last evening." },
  "2026-11-24": { days: 1, unit: "day left to <b>apply</b>", task: "Applied? Take a free CHRIST mock and see where you stand." },
  "2026-11-25": { days: "5 PM", unit: "today: <b>applications close</b>", task: "Submit before 5 PM, and only on christuniversity.in." },
};
const tTasks = ["Fundamental Accounting: revise the golden rules of debit and credit.", "Take one full CHRIST mock in 90 minutes. Count how many marks negatives cost you.",
  "GK: 15 minutes of this month's current affairs.", "One DI set with a timer. Tables and bar graphs first.", "Reasoning: one arrangement puzzle and one blood-relation set.",
  "English: one reading passage and 10 grammar questions.", "Review your last mock: which wrong answers should you have skipped?"];
const tDays = Math.round((Date.parse("2026-12-05") - Date.parse(date)) / 86400000);
const TS = { cta: "Try a free CHRIST mock", ctaSub: "10 full mocks, real pattern · ₹999 · ipmcareer.com" };
let ch = CHRIST[date] && { band: "APPLY BY 25 NOV · 5 PM", stage: 0, ...CHRIST[date] };
if (!ch && tDays >= 0 && tDays <= 9) {
  ch = { band: "ENTRANCE TEST · 5 DEC", stage: tDays <= 1 ? 2 : 1, days: tDays || "GO",
    unit: tDays === 0 ? "<b>Test day.</b> All the best." : tDays === 1 ? "day to the <b>test</b>" : "days to the <b>test</b>",
    taskLabel: tDays === 0 ? "ONE LAST TIP" : undefined,
    task: tDays === 0 ? "Skip what you cannot crack in time. Every wrong answer costs 0.25." : tDays === 1 ? "Admit cards came out last night (3 Dec, 11 PM). Check your slot and keep your ID ready."
      : tDays === 2 ? "Admit cards come out tonight at 11 PM on christuniversity.in. Light revision today." : tTasks[tDays % tTasks.length] };
}
if (ch) {
  fs.writeFileSync(`stories/auto/${date}-countdown.json`, JSON.stringify({ type: (fs.existsSync("data/story-style.txt") ? fs.readFileSync("data/story-style.txt", "utf8").trim() : "") || "road", ...ch, ...(tDays > 0 ? TS : {}) }, null, 1));
  made.push(`${date}-countdown`);
}

if (fs.existsSync(`out/white/${date}/slide-1.png`)) {
  fs.writeFileSync(`stories/auto/${date}-newpost.json`, JSON.stringify({ type: "newpost", image: `../out/white/${date}/slide-1.png` }, null, 1));
  made.push(`${date}-newpost`);
}
console.log(made.length ? `MADE ${made.join(", ")}` : "NO_STORY");
