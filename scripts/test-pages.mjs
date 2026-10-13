// Plan B1.6: every dashboard page for real-shaped families, in CI. Playwright loads each page for families of the
// synthetic world (scripts/fixtures/world-ui.json.gz, exported from kawach-ai-engine eval/world), every /api call answered
// from that family's data, at desktop (1440) and phone (390) widths.
//
// Fails on: a page error, a hydration error, a console error, an /api call nobody answered, an error screen, an empty
// page. Screenshots go to scripts/out/pages/ (a CI artifact).
//
//   PAGES_BASE=http://localhost:3123 node scripts/test-pages.mjs        (a running `next start` or `next dev`)
//   PAGES_FAMILIES=40 PAGES_WIDTHS=1440,390 PAGES_ONLY=home,care ...
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const here = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.PAGES_BASE || "http://localhost:3123";
const FAMILIES = Number(process.env.PAGES_FAMILIES || 12);
const WIDTHS = (process.env.PAGES_WIDTHS || "1440,390").split(",").map(Number);
const PARALLEL = Number(process.env.PAGES_PARALLEL || 4);
const OUT = path.join(here, "out", "pages");
const world = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(here, "fixtures", "world-ui.json.gz"))).toString());

const PAGES = [
  { name: "home", path: "/dashboard" },
  { name: "day", path: "/dashboard/saheli" },
  { name: "care", path: "/dashboard/saheli/care" },
  { name: "records", path: "/dashboard/record" },
  { name: "orders", path: "/dashboard/saheli/tasks" },
  { name: "story", path: "/dashboard/saheli/memory" },
  { name: "emergency", path: "/dashboard/emergency" },
  { name: "family", path: "/dashboard/family" },
  { name: "care-team", path: "/dashboard/care-team" },
  { name: "report", path: "/dashboard/report" },
  { name: "wellbeing", path: "/dashboard/wellbeing" },
  { name: "settings", path: "/dashboard/settings" },
  { name: "notifications", path: "/dashboard/notifications" },
  { name: "limits", path: "/dashboard/limits" },
  { name: "emergency-link", path: "/e/world-link", public: true },
  { name: "sign-in", path: "/auth/login", public: true },
].filter((p) => !process.env.PAGES_ONLY || process.env.PAGES_ONLY.split(",").includes(p.name));

const ERROR_SCREEN = /Application error|Something went wrong|This page couldn.t load|Unhandled Runtime Error/i;
const HYDRATION = /hydrat|did not match|server rendered HTML/i;
// console noise that is not the page's fault (dev-only notices, the browser refusing a mocked image)
const NOISE = /Download the React DevTools|\[Fast Refresh\]|\[HMR\]|favicon|Failed to load resource: the server responded with a status of 404 \(Not Found\)/i;

function api(fam, url) {
  const p = url.pathname;
  const primary = fam.people.find((x) => x.backendRole === "PRIMARY_CAREGIVER") || fam.people[0];
  const cared = fam.people.filter((x) => x.careRecipient);
  const fid = fam.familyId;
  const famRow = { familyId: fid, name: `${primary.surname || primary.first} family`, initial: (primary.surname || primary.first || "F")[0], role: "PRIMARY_CAREGIVER",
    roleLabel: "Primary caregiver", roleBadge: "", switcherRoleBadge: "", memberCount: fam.people.length, isActive: true, isPrimary: true, status: "ACTIVE" };
  const switcher = { activeFamilyId: fid, primaryFamilyId: fid, activeFamily: famRow, families: [famRow] };
  const user = { userId: primary.id, fullName: primary.name, firstName: primary.first, email: `${primary.key}@world.kavach.test`, onboardingRequired: false,
    onboardingSkipped: false, avatarUrl: null };
  if (p === "/api/auth/me") return { user, pendingInvitations: [], ...switcher };
  if (p === "/api/users/me") return { user };
  if (p === "/api/users/me/sessions") return { sessions: [] };
  if (p === "/api/families/switcher") return switcher;
  if (p === "/api/families") return { families: [famRow] };
  if (p === `/api/families/${fid}/members`) {
    return { members: fam.people.map((x) => ({ userId: x.id, name: x.name, role: x.backendRole, status: "JOINED", relationship: x.relation, location: x.city,
      phone: x.phone ? x.phone.replace(/^\+\d{2}/, "") : null, phoneCountryCode: x.phone ? x.phone.slice(0, 3) : null, avatarUrl: null })) };
  }
  if (p === `/api/families/${fid}/notifications`) return { notifications: [], unreadCount: 0 };
  if (p === `/api/families/${fid}/integrations`) return { whatsapp: { kavachNumber: "+919999900000" } };
  if (p === `/api/families/${fid}`) return { family: famRow };
  const cm = p.match(new RegExp(`^/api/families/${fid}/subjects/([^/]+)/care-memory(?:/(.+))?$`));
  if (cm) {
    const answers = fam.engine[cm[1]] || fam.engine[cared[0]?.id] || {};
    const route = cm[2] || "overview";
    if (route === "emergency-link") return null;
    if (route === "voice") return { mode: "auto", means: "" };
    if (route in answers) return answers[route];
    return undefined;
  }
  if (/\/daily-snapshot$/.test(p)) return { snapshot: null };
  if (new RegExp(`^/api/families/${fid}/subjects/[^/]+/reminders$`).test(p)) return { reminders: [] };
  if (new RegExp(`^/api/families/${fid}/subjects/[^/]+/reminders/day$`).test(p)) return { day: url.searchParams.get("day") || world.today, occurrences: [], reminders: [] };
  if (new RegExp(`^/api/families/${fid}/recipients/[^/]+/labs$`).test(p)) return { documents: [] };
  if (new RegExp(`^/api/families/${fid}/recipients/[^/]+/labs/highlights$`).test(p)) return { cards: [], all: [], reports: 0, latestDate: null, noticed: null, readings: [] };
  if (p.startsWith("/api/public/emergency/")) {
    const card = (fam.engine[cared[0]?.id] || {}).emergency;
    return card ? { person: { name: cared[0].name, photo: null, phone: cared[0].phone }, caregivers: [{ name: primary.name, phone: primary.phone, primary: true }], card, updatedAt: `${world.today}T09:00:00+05:30` } : undefined;
  }
  return undefined;
}

async function visit(ctx, fam, pg, width) {
  const page = await ctx.newPage();
  const problems = [];
  const missing = new Set();
  // production React reports a hydration mismatch as minified error #418/#423/#425 (proven by planting one, 2026-10-13)
  page.on("pageerror", (e) => problems.push(`${/Minified React error #(418|423|425)/.test(e.message) ? "hydration" : "page error"}: ${e.message.slice(0, 200)}`));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const t = m.text();
    if (HYDRATION.test(t)) problems.push(`hydration: ${t.slice(0, 200)}`);
    else if (!NOISE.test(t)) problems.push(`console error: ${t.slice(0, 200)}`);
  });
  await page.route(/^https?:\/\/[^/]+\/api\//, (r) => {
    const u = new URL(r.request().url());
    if (u.pathname === "/api/client-error") {
      problems.push(`client error report: ${(r.request().postData() || "").slice(0, 200)}`);
      return r.fulfill({ status: 204 });
    }
    if (u.pathname === "/api/auth/session") {
      // NextAuth's own session endpoint (raw, not the backend's envelope)
      const me = fam.people.find((x) => x.backendRole === "PRIMARY_CAREGIVER") || fam.people[0];
      return r.fulfill({ json: { user: { name: me.name, email: `${me.key}@world.kavach.test` }, expires: "2099-01-01T00:00:00.000Z" } });
    }
    if (u.pathname.startsWith("/api/auth/") && u.pathname !== "/api/auth/me") return r.fulfill({ json: {} });
    if (r.request().method() !== "GET") return r.fulfill({ json: { success: true, data: {} } });
    const data = api(fam, u);
    if (data === undefined) {
      missing.add(u.pathname.replaceAll(fam.familyId, ":familyId").replace(/\/(subjects|recipients)\/[^/]+/, "/$1/:id"));
      return r.fulfill({ status: 404, json: { success: false, message: "not in the world fixture" } });
    }
    return r.fulfill({ json: { success: true, data } });
  });
  const cared = fam.people.find((x) => x.careRecipient) || fam.people[0];
  const url = `${BASE}${pg.path}${pg.public ? "" : `?recipient=${cared.id}`}`;
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 90000 });
    await page.waitForTimeout(800);
    const text = await page.evaluate(() => document.body.innerText || "");
    if (ERROR_SCREEN.test(text)) problems.push(`error screen: ${text.match(ERROR_SCREEN)[0]}`);
    if (text.trim().length < 40) problems.push("empty page");
    const shot = path.join(OUT, `${fam.id}-${pg.name}-${width}.png`);
    if (problems.length || process.env.PAGES_SHOTS) await page.screenshot({ path: shot, fullPage: true });
  } catch (e) {
    problems.push(`did not load: ${String(e.message || e).slice(0, 160)}`);
  }
  await page.close();
  return { problems, missing: [...missing] };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const fams = world.families.slice(0, FAMILIES);
  const jobs = [];
  for (const fam of fams) for (const pg of PAGES) for (const w of WIDTHS) jobs.push({ fam, pg, w });
  console.log(`${jobs.length} page loads: ${fams.length} families x ${PAGES.length} pages x ${WIDTHS.length} widths, ${PARALLEL} at a time`);
  const browser = await chromium.launch();
  const failures = [];
  const missingAll = new Map();
  let done = 0;
  const t0 = Date.now();
  async function worker() {
    while (jobs.length) {
      const { fam, pg, w } = jobs.shift();
      // the browser in India, the server in UTC (as on Cloud Run): a time rendered on both sides must not differ
      const ctx = await browser.newContext({ viewport: { width: w, height: 1000 }, timezoneId: "Asia/Kolkata", locale: "en-IN" });
      await ctx.addCookies([{ name: "kavach_session", value: "world", url: BASE }]);
      const res = await visit(ctx, fam, pg, w);
      await ctx.close();
      done++;
      for (const m of res.missing) missingAll.set(m, (missingAll.get(m) || 0) + 1);
      if (res.problems.length) failures.push(`${fam.id} (${fam.household}, ${fam.language}) ${pg.name} @${w}: ${[...new Set(res.problems)].slice(0, 3).join(" | ")}`);
      if (done % 50 === 0) console.log(`  ${done} loaded, ${failures.length} with problems, ${Math.round((Date.now() - t0) / 1000)}s`);
    }
  }
  await Promise.all(Array.from({ length: PARALLEL }, worker));
  await browser.close();
  console.log(`${done} pages in ${Math.round((Date.now() - t0) / 1000)}s`);
  if (missingAll.size) {
    console.log(`/api calls nobody answered (${missingAll.size}):`);
    for (const [m, n] of [...missingAll].sort((a, b) => b[1] - a[1])) console.log(`  ${n}x ${m}`);
  }
  for (const f of failures.slice(0, 60)) console.log("FAIL " + f);
  const strictMissing = process.env.PAGES_STRICT_API !== "0";
  const failed = failures.length > 0 || (strictMissing && missingAll.size > 0);
  console.log(failed ? `${failures.length} pages with problems${strictMissing && missingAll.size ? `, ${missingAll.size} unanswered API paths` : ""}` : "every page loaded cleanly");
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
