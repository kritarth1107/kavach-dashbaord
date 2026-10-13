/**
 * Screenshots of the Food & nutrition page for the founder's approval (plan §N18 Q10, "Food diary").
 * The real page and providers on a running `next dev`; every /api call is answered from the invented family in
 * scripts/fixtures/nutrition-sample.ts. The clock is pinned to 14 Oct 2026, 20:45 IST (07:20 for the empty day).
 *
 *   NUTRITION_BASE=http://localhost:3177 NUTRITION_OUT=/path/to/dir NUTRITION_PHOTOS=/dir/with/jpgs npx tsx scripts/shoot-nutrition-page.ts
 *
 * NUTRITION_PHOTOS holds the meal photos the fixture points at (poha.jpg, lunch.jpg, khichdi.jpg, eggs.jpg); without
 * it the thumbnails are left out. NUTRITION_ONLY=desktop-light,mobile-light picks shots.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium, type Page } from "playwright";
import { ELDER_ID, FAMILY_ID, PEOPLE, SELF_ID, nutritionFixture, type Who } from "./fixtures/nutrition-sample";

const BASE = process.env.NUTRITION_BASE || "http://localhost:3177";
const OUT = process.env.NUTRITION_OUT || path.join(__dirname, "out", "nutrition");
const PHOTOS = process.env.NUTRITION_PHOTOS || "";
const TODAY = "2026-10-14";

type Shot = { name: string; who: Who; width: number; dark?: boolean; view?: "day" | "week" | "month"; day?: string; time?: string; empty?: boolean; menu?: boolean };
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
];
const SHOTS = ALL.filter((s) => !process.env.NUTRITION_ONLY || process.env.NUTRITION_ONLY.split(",").some((k) => s.name.includes(k)));

const ok = (data: unknown) => ({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data }) });

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
    const photo = p.match(/\/care-memory\/nutrition\/photos\/([\w.-]+)$/);
    if (photo) {
      const file = PHOTOS && path.join(PHOTOS, photo[1]);
      return file && fs.existsSync(file) ? r.fulfill({ status: 200, contentType: "image/jpeg", body: fs.readFileSync(file) }) : r.fulfill({ status: 404 });
    }
    const n = p.match(/\/subjects\/([^/]+)\/care-memory\/nutrition$/);
    if (n && r.request().method() === "GET") {
      const who: Who = n[1] === ELDER_ID ? "elder" : "self";
      const range = Number(u.searchParams.get("days") || 1) as 1 | 7 | 30;
      const view = nutritionFixture(who, { today: TODAY, day: u.searchParams.get("day"), range, emptyToday: s.empty });
      // without the photo files, leave the thumbnails out rather than show broken images
      if (!PHOTOS) view.days.forEach((d) => d.meals.forEach((m) => (m.photoUrl = null)));
      return r.fulfill(ok(view));
    }
    if (r.request().method() !== "GET") return r.fulfill(ok({}));
    return r.fulfill({ status: 404, json: { success: false, message: "not in the mockup" } });
  });

  const q = new URLSearchParams({ recipient: s.who === "elder" ? ELDER_ID : SELF_ID });
  if (s.view && s.view !== "day") q.set("view", s.view);
  if (s.day) q.set("day", s.day);
  await page.goto(`${BASE}/dashboard/nutrition?${q}`, { waitUntil: "networkidle", timeout: 180_000 });
  await page.getByText(/diary|week at a glance|The month/i).first().waitFor({ timeout: 60_000 });
  // the dev server's own badge is not part of the page
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.waitForTimeout(700);
  if (s.menu) {
    await page.getByRole("button", { name: /Change lunch/ }).click();
    await page.waitForTimeout(200);
  }
  await fullHeight(page, s);
  const file = path.join(OUT, `${s.name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  await ctx.close();
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
