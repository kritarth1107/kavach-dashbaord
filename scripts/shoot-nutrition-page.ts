/**
 * Screenshots of the Food & nutrition page and the doctor's link for the founder's approval (plan §N18 Q10, "Food diary").
 * The real page and providers on a running dashboard (`next dev` or `next start`); every /api call is answered from
 * scripts/fixtures/nutrition-engine.json.gz: the engine's own answers (report.view / report.doctor) for an invented
 * family, made by kawach-ai-engine scripts/nutrition_dash_fixture.py. The clock is pinned to 14 Oct 2026, 20:45 IST
 * (07:20 for the empty morning).
 *
 *   NUTRITION_BASE=http://localhost:3177 NUTRITION_OUT=/path/to/dir npx tsx scripts/shoot-nutrition-page.ts
 *   NUTRITION_ONLY=desktop-light,mobile-light picks shots.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { chromium, type Page } from "playwright";

const BASE = process.env.NUTRITION_BASE || "http://localhost:3177";
const OUT = process.env.NUTRITION_OUT || path.join(__dirname, "out", "nutrition");
const TODAY = "2026-10-14";
const FAMILY_ID = "0f00d000-0000-4000-8000-0000000000f1";
const ELDER_ID = "0f00d000-0000-4000-8000-00000000e001";
const SELF_ID = "0f00d000-0000-4000-8000-00000000c001";
const PEOPLE = [
  { userId: ELDER_ID, name: "Sushila Mehra", role: "CARE_RECIPIENT", status: "JOINED", relationship: "Mother" },
  { userId: SELF_ID, name: "Rohan Mehra", role: "PRIMARY_CAREGIVER", status: "JOINED", relationship: "Son" },
];
const ENGINE: Record<string, unknown> = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname, "fixtures", "nutrition-engine.json.gz"))).toString());
type Who = "elder" | "self";

type Shot = { name: string; who: Who; width: number; dark?: boolean; view?: "day" | "week" | "month"; day?: string; time?: string; empty?: boolean; menu?: boolean; link?: boolean; where?: "header" | "drawer" | "picker" };
const ALL: Shot[] = [
  { name: "01-day-elder-desktop-light", who: "elder", width: 1440 },
  { name: "02-day-elder-desktop-dark", who: "elder", width: 1440, dark: true },
  { name: "03-day-elder-mobile-light", who: "elder", width: 390 },
  { name: "04-week-self-desktop-light", who: "self", width: 1440, view: "week" },
  { name: "05-empty-day-elder-desktop-light", who: "elder", width: 1440, time: "07:20", empty: true },
  { name: "06-day-self-desktop-light", who: "self", width: 1440 },
  { name: "07-month-elder-desktop-light", who: "elder", width: 1440, view: "month" },
  { name: "08-day-elder-edit-menu-desktop-light", who: "elder", width: 1440, menu: true },
  { name: "09-week-self-mobile-light", who: "self", width: 390, view: "week" },
  { name: "10-empty-day-elder-mobile-light", who: "elder", width: 390, time: "07:20", empty: true },
  { name: "11-doctor-link-elder-desktop-light", who: "elder", width: 1440, link: true },
  { name: "12-doctor-link-elder-mobile-light", who: "elder", width: 390, link: true },
  { name: "13-where-self-desktop", who: "self", width: 1440, where: "header" },
  { name: "14-where-self-mobile", who: "self", width: 390, where: "header" },
  { name: "15-where-drawer-desktop", who: "elder", width: 1440, where: "drawer" },
  { name: "16-where-drawer-mobile", who: "elder", width: 390, where: "drawer" },
  { name: "17-where-self-picker-desktop", who: "self", width: 1440, where: "picker" },
  { name: "18-where-self-picker-mobile", who: "self", width: 390, where: "picker" },
];
const SHOTS = ALL.filter((s) => !process.env.NUTRITION_ONLY || process.env.NUTRITION_ONLY.split(",").some((k) => s.name.includes(k)));

const ok = (data: unknown) => ({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data }) });

/** The engine's answer for this person, day and range (the nearest day the fixture has). */
function view(who: Who, day: string | null, days: number, empty: boolean) {
  const d = day ?? TODAY;
  const range = [1, 7, 30].includes(days) ? days : 1;
  const name = empty && d === TODAY ? `${who}-morning-empty-${TODAY}-${range}` : `${who}-evening-${["2026-10-13", "2026-10-11"].includes(d) ? d : TODAY}-${range}`;
  return ENGINE[name];
}

async function shoot(browser: Awaited<ReturnType<typeof chromium.launch>>, s: Shot) {
  const ctx = await browser.newContext({
    viewport: { width: s.width, height: s.width < 600 ? 844 : 1000 },
    deviceScaleFactor: s.width < 600 ? 3 : 2,
    colorScheme: s.dark ? "dark" : "light",
    timezoneId: "Asia/Kolkata",
    locale: "en-IN",
  });
  await ctx.addCookies([{ name: "kavach_session", value: "mockup", url: BASE }]);
  await ctx.addInitScript(([k, v]) => window.localStorage.setItem(k, v), [`kavach:person:${FAMILY_ID}`, s.who === "elder" ? ELDER_ID : SELF_ID]);
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date(`${TODAY}T${s.time ?? "20:45"}:00+05:30`));
  const errors: string[] = [];
  const unanswered = new Set<string>();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && !/favicon|DevTools|404/.test(m.text()) && errors.push(m.text().slice(0, 200)));

  const fam = { familyId: FAMILY_ID, name: "Mehra family", initial: "M", role: "PRIMARY_CAREGIVER", roleLabel: "Primary caregiver", roleBadge: "", switcherRoleBadge: "", memberCount: 2, isActive: true, isPrimary: true, status: "ACTIVE" };
  const switcher = { activeFamilyId: FAMILY_ID, primaryFamilyId: FAMILY_ID, activeFamily: fam, families: [fam] };
  await page.route(/^https?:\/\/[^/]+\/api\//, async (r) => {
    const u = new URL(r.request().url());
    const p = u.pathname;
    if (p === "/api/auth/session") return r.fulfill({ json: { user: { name: "Rohan Mehra", email: "rohan@mehra.example" }, expires: "2099-01-01T00:00:00.000Z" } });
    if (p === "/api/auth/me") return r.fulfill(ok({ user: { userId: SELF_ID, fullName: "Rohan Mehra", onboardingRequired: false, onboardingSkipped: false, avatarUrl: null }, pendingInvitations: [], ...switcher }));
    if (p.startsWith("/api/auth/")) return r.fulfill({ json: {} });
    if (p === "/api/client-error") return r.fulfill({ status: 204 });
    if (p === "/api/families/switcher") return r.fulfill(ok(switcher));
    if (p === `/api/families/${FAMILY_ID}/members`) return r.fulfill(ok({ members: PEOPLE }));
    if (p === `/api/families/${FAMILY_ID}/notifications`) return r.fulfill(ok({ notifications: [], unreadCount: 2 }));
    if (p === `/api/families/${FAMILY_ID}/features`) return r.fulfill(ok({ nutritionPage: true }));
    if (p.startsWith("/api/public/nutrition/")) {
      return r.fulfill(ok({ person: { name: "Sushila Mehra" }, days: 14, sharedAt: `${TODAY}T20:30:00+05:30`, expiresAt: "2026-10-21T20:30:00+05:30", report: ENGINE["elder-report-14"] }));
    }
    const n = p.match(/\/subjects\/([^/]+)\/care-memory\/nutrition(?:\/(.+))?$/);
    if (n && r.request().method() === "GET") {
      const who: Who = n[1] === ELDER_ID ? "elder" : "self";
      if (!n[2]) return r.fulfill(ok(view(who, u.searchParams.get("day"), Number(u.searchParams.get("days") || 1), Boolean(s.empty))));
      if (n[2] === "shares") {
        const share = { id: "6710f00d0000000000000001", url: `${BASE}/n/fixture-token-0000000000000000`, days: 14, label: "Dr. Iyer", createdAt: `${TODAY}T18:02:00+05:30`,
          expiresAt: "2026-10-21T18:02:00+05:30", revokedAt: null, opens: 2, lastOpenedAt: `${TODAY}T19:10:00+05:30`, active: true };
        return r.fulfill(ok({ shares: who === "elder" ? [share] : [] }));
      }
      if (n[2] === "foods") return r.fulfill(ok({ foods: [] }));
      if (n[2] === "report") return r.fulfill(ok(ENGINE[`${who}-report-${u.searchParams.get("days") || 7}`]));
    }
    if (r.request().method() !== "GET") return r.fulfill(ok({}));
    unanswered.add(p);
    return r.fulfill({ status: 404, json: { success: false, message: "not in the mockup" } });
  });

  if (s.link) {
    await page.goto(`${BASE}/n/fixture-token-0000000000000000`, { waitUntil: "networkidle", timeout: 180_000 });
    await page.getByText(/Food and nutrition report/i).first().waitFor({ timeout: 60_000 });
  } else {
    const q = new URLSearchParams({ recipient: s.who === "elder" ? ELDER_ID : SELF_ID });
    if (s.view && s.view !== "day") q.set("view", s.view);
    if (s.day) q.set("day", s.day);
    await page.goto(`${BASE}/dashboard/nutrition?${q}`, { waitUntil: "networkidle", timeout: 180_000 });
    const panel = page.getByRole("heading", { name: /diary$|The week at a glance|The last 30 days/i }).or(page.getByText(/diary$|The week at a glance|The last 30 days/i));
    const shown = await panel.filter({ visible: true }).first().waitFor({ timeout: 60_000 }).then(() => true, () => false);
    if (!shown) {
      await page.screenshot({ path: path.join(OUT, `food-diary-${s.name}-FAILED.png`), fullPage: true });
      errors.push(`the page did not show: ${(await page.evaluate(() => document.body.innerText)).slice(0, 300).replace(/\s+/g, " ")}`);
      await ctx.close();
      return { file: "", errors };
    }
  }
  // the dev server's own badge is not part of the page
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.waitForTimeout(700);
  if (s.where === "drawer") {
    await page.getByRole("button", { name: "Menu" }).click();
    await page.getByRole("dialog", { name: "Menu" }).getByRole("link", { name: "Food diary" }).waitFor();
  }
  if (s.where === "picker") {
    await page.getByRole("button", { name: "Self care. Switch person" }).click();
    await page.getByRole("listbox").getByText("Self care", { exact: true }).waitFor();
  }
  if (s.where) {
    await page.getByRole("link", { name: "Food diary" }).first().waitFor();
    const file = path.join(OUT, `food-diary-${s.name}.png`);
    await page.screenshot({ path: file });
    await ctx.close();
    for (const p of unanswered) errors.push(`unanswered ${p}`);
    return { file, errors };
  }
  if (s.menu) {
    await page.getByRole("button", { name: /Change lunch/ }).first().click();
    await page.waitForTimeout(200);
  }
  await fullHeight(page, s);
  const file = path.join(OUT, `food-diary-${s.name}.png`);
  await page.screenshot({ path: file, fullPage: s.link });
  await ctx.close();
  for (const p of unanswered) errors.push(`unanswered ${p}`);
  return { file, errors };
}

/** The shell scrolls inside <main>; grow the window to the content so the whole page is in one picture. */
async function fullHeight(page: Page, s: Shot) {
  const h = await page.evaluate(() => {
    const main = document.querySelector("main");
    if (!main) return document.body.scrollHeight;
    return main.getBoundingClientRect().top + main.scrollHeight;
  });
  await page.setViewportSize({ width: s.width, height: Math.ceil(h) + (s.width < 600 ? 0 : 8) });
  await page.waitForTimeout(400);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  let bad = 0;
  for (const s of SHOTS) {
    const { file, errors } = await shoot(browser, s);
    console.log(`${errors.length ? "✗" : "✓"} ${file}`);
    for (const e of errors) console.log(`    ${e}`);
    bad += errors.length;
  }
  await browser.close();
  process.exit(bad ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
