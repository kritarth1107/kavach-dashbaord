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
  { name: "spending", path: "/dashboard/spending" },
  { name: "tasks", path: "/dashboard/tasks" },
  { name: "approvals", path: "/dashboard/approvals" },
  { name: "billing", path: "/dashboard/billing" },
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
  if (p === `/api/families/${fid}/approvals/pending` || p === `/api/families/${fid}/orders/history`) {
    const who = url.searchParams.get("subjectUserId");
    // leakOrders: answer with every person's orders whatever was asked (the page must still show only the one asked for)
    return { orders: (fam.orders || []).filter((o) => fam.leakOrders || !who || o.subject_user_id === who) };
  }
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

// ── Every page is about the person picked in the switcher (founder 2026-10-13: on his mother's profile, Orders & rides
// showed his own orders and rides). Two people with different orders; switching person shows only theirs. Maa's
// answers also carry one of his orders, as the engine sent before the fix: the page must still leave it out.
const SCOPE_MAA = "5c09e000-0000-4000-8000-00000000a001";
const SCOPE_SON = "5c09e000-0000-4000-8000-00000000a002";
function scopeFamily(base = world.families[0], { leak = true, oldEngine = false } = {}) {
  const at = new Date(Date.now() - 2 * 3600_000).toISOString();
  const task = (id, subjectId, goal, kind, service, serviceLabel, total) => ({
    id, ...(oldEngine ? {} : { subjectId }), service, serviceLabel, kind, goal, details: {}, status: "done", phase: "place", inputNeeded: null,
    cancelRequested: false, result: kind === "ride" ? { booked: true, total } : { placed: true, total }, history: [], requestedBy: SCOPE_SON,
    hasLiveView: false, createdAt: at, updatedAt: at, audit: [],
  });
  const maaOrder = task("5c09e000-0000-4000-8000-0000000000b1", SCOPE_MAA, "Sugar and atta for Maa", "order", "instamart", "Instamart", "₹240");
  const sonOrder = task("5c09e000-0000-4000-8000-0000000000b2", SCOPE_SON, "Protein bars for Ravi", "order", "zepto", "Zepto", "₹300");
  const sonRide = task("5c09e000-0000-4000-8000-0000000000b3", SCOPE_SON, "Cab to the office", "ride", "uber", "Uber", "₹250");
  const spend = (items) => ({ month: at.slice(0, 7), total: items.reduce((n, t) => n + Number(t.result.total.slice(1)), 0), count: items.length,
    byService: Object.fromEntries(items.map((t) => [t.service, Number(t.result.total.slice(1))])), byPerson: {},
    byKind: Object.fromEntries(items.map((t) => [t.kind, Number(t.result.total.slice(1))])),
    items: items.map((t) => ({ at: t.createdAt, service: t.service, kind: t.kind, goal: t.goal, subjectId: t.subjectId ?? SCOPE_MAA, total: Number(t.result.total.slice(1)) })) });
  const answers = Object.values(base.engine)[0];
  const forPerson = (tasks, spent) => ({
    ...structuredClone(answers),
    overview: { ...structuredClone(answers.overview), tasks },
    home: { ...structuredClone(answers.home), tasks, needsYou: [] },
    spending: spend(spent),
  });
  // the old engine answered every person's page with the whole family's orders
  const family = [sonRide, sonOrder, maaOrder];
  return {
    id: "person-scope", household: "caregiver + mother", leakOrders: leak, language: "en", familyId: "5c09e000-0000-4000-8000-0000000000f1", shapes: [], places: [],
    people: [
      { id: SCOPE_MAA, backendRole: "CARE_RECIPIENT", careRecipient: true, first: "Kamla", surname: "Devi", name: "Kamla Devi", key: "maa", relation: "Mother", city: "Pune", phone: "+919000000201" },
      { id: SCOPE_SON, backendRole: "PRIMARY_CAREGIVER", careRecipient: false, first: "Ravi", surname: "Kumar", name: "Ravi Kumar", key: "self", relation: "self", city: "Pune", phone: "+919000000202" },
    ],
    engine: {
      [SCOPE_MAA]: forPerson(oldEngine ? family : leak ? [maaOrder, sonOrder] : [maaOrder], oldEngine ? family : [maaOrder]),
      [SCOPE_SON]: forPerson(oldEngine ? family : [sonRide, sonOrder], oldEngine ? family : [sonOrder, sonRide]),
    },
    orders: [
      { order_id: "o-maa", status: "awaiting_approval", partner: "zepto", partner_label: "Zepto", total_paise: 24000, items: [{ name: "Sugar for Maa", quantity: 1, unitPricePaise: 24000 }], subject_user_id: SCOPE_MAA, created_at: at },
      { order_id: "o-son", status: "awaiting_approval", partner: "zepto", partner_label: "Zepto", total_paise: 30000, items: [{ name: "Protein bars for Ravi", quantity: 1, unitPricePaise: 30000 }], subject_user_id: SCOPE_SON, created_at: at },
    ],
  };
}

/** Opens a page of the scope family; returns the page, every person an engine read was asked for, and page errors. */
async function scopePage(browser, fam, pathAndQuery, { stored } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: "Asia/Kolkata", locale: "en-IN" });
  await ctx.addCookies([{ name: "kavach_session", value: "world", url: BASE }]);
  if (stored) await ctx.addInitScript(([k, v]) => window.localStorage.setItem(k, v), [`kavach:person:${fam.familyId}`, stored]);
  const page = await ctx.newPage();
  const asked = [];
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message.slice(0, 160)));
  await page.route(/^https?:\/\/[^/]+\/api\//, (r) => {
    const u = new URL(r.request().url());
    if (u.pathname === "/api/client-error") return r.fulfill({ status: 204 });
    if (u.pathname === "/api/auth/session") return r.fulfill({ json: { user: { name: "Ravi Kumar", email: "self@world.kavach.test" }, expires: "2099-01-01T00:00:00.000Z" } });
    if (u.pathname.startsWith("/api/auth/") && u.pathname !== "/api/auth/me") return r.fulfill({ json: {} });
    const m = u.pathname.match(/\/subjects\/([^/]+)\/care-memory\/(overview|home|spending|work|boundaries)$/);
    if (m) asked.push(`${m[2]}:${m[1]}`);
    if (r.request().method() !== "GET") return r.fulfill({ json: { success: true, data: {} } });
    const data = api(fam, u);
    return data === undefined ? r.fulfill({ status: 404, json: { success: false } }) : r.fulfill({ json: { success: true, data } });
  });
  await page.goto(`${BASE}${pathAndQuery}`, { waitUntil: "networkidle", timeout: 90000 });
  return { ctx, page, asked, errors };
}

// PAGES_SCOPE_ENGINE=old answers as the engine did before the fix (every page: the whole family's orders, no person on
// them) and new as it does now; the default adds one leaked order to Maa's answers to prove the page's own guard.
async function personScope(browser) {
  const mode = process.env.PAGES_SCOPE_ENGINE || "leak";
  const fam = scopeFamily(world.families[0], { leak: mode === "leak", oldEngine: mode === "old" });
  const shot = (page, name) => (process.env.PAGES_SHOTS ? page.screenshot({ path: path.join(OUT, `person-scope-${name}.png`), fullPage: true }) : null);
  const problems = [];
  const check = (cond, what) => !cond && problems.push(what);
  const text = (page) => page.evaluate(() => document.body.innerText || "");
  const show = async (page, words) => page.getByText(words).first().waitFor({ timeout: 20000 }).then(() => true, () => false);

  // 1. Orders & rides on his mother's profile: her order only, never his order or his ride
  let v = await scopePage(browser, fam, `/dashboard/saheli/tasks?recipient=${SCOPE_MAA}`);
  check(await show(v.page, "Sugar and atta for Maa"), "orders (Maa): her order is not shown");
  let t = await text(v.page);
  check(!t.includes("Protein bars for Ravi"), "orders (Maa): HIS order shows on her page");
  check(!t.includes("Cab to the office"), "orders (Maa): HIS ride shows on her page");
  check(/Maa.s\s+Orders & rides/.test(t), "orders (Maa): the heading is not hers");
  await shot(v.page, "orders-maa");
  // 2. switch to his own self care in the person switcher: only his
  await v.page.getByRole("button", { name: /Switch person/ }).first().click();
  await v.page.getByRole("option", { name: /Ravi Kumar/ }).first().click();
  check(await show(v.page, "Cab to the office"), "orders (switched to self): his ride is not shown");
  await v.page.waitForTimeout(600);
  t = await text(v.page);
  check(t.includes("Protein bars for Ravi"), "orders (switched to self): his order is not shown");
  check(!t.includes("Sugar and atta for Maa"), "orders (switched to self): HER order shows on his page");
  check(/Your\s+Orders & rides/.test(t), "orders (switched to self): the heading is not his");
  check(!v.errors.length, `orders: page error ${v.errors[0]}`);
  await shot(v.page, "orders-self");
  await v.ctx.close();

  // 3. arriving without ?recipient= after picking himself earlier: the data is asked for him only, never first for her
  v = await scopePage(browser, fam, "/dashboard/saheli/tasks", { stored: SCOPE_SON });
  check(await show(v.page, "Cab to the office"), "orders (saved choice: self): his ride is not shown");
  await v.page.waitForTimeout(600);
  t = await text(v.page);
  check(!t.includes("Sugar and atta for Maa"), "orders (saved choice: self): HER order shows");
  check(!v.asked.includes(`overview:${SCOPE_MAA}`), `orders (saved choice: self): her orders were fetched for his page (${v.asked.join(", ")})`);
  await v.ctx.close();

  // 4. Home on her profile: her errands only
  v = await scopePage(browser, fam, `/dashboard?recipient=${SCOPE_MAA}`);
  check(await show(v.page, "Sugar and atta for Maa"), "home (Maa): her order is not in Orders & rides");
  t = await text(v.page);
  check(!t.includes("Protein bars for Ravi"), "home (Maa): HIS order shows on her Home");
  await shot(v.page, "home-maa");
  await v.ctx.close();

  // 5. Spending: hers, then his after the switch; the request is for the person on screen
  v = await scopePage(browser, fam, `/dashboard/spending?recipient=${SCOPE_MAA}`);
  check(await show(v.page, "Sugar and atta for Maa"), "spending (Maa): her order is not listed");
  t = await text(v.page);
  check(/Maa.s\s+Spending/.test(t) && !t.includes("By person"), "spending (Maa): not her own spending page");
  check(!t.includes("Protein bars for Ravi") && !v.asked.includes(`spending:${SCOPE_SON}`), "spending (Maa): his spending shows");
  await shot(v.page, "spending-maa");
  await v.page.getByRole("button", { name: /Switch person/ }).first().click();
  await v.page.getByRole("option", { name: /Ravi Kumar/ }).first().click();
  check(await show(v.page, "Protein bars for Ravi"), "spending (switched to self): his order is not listed");
  t = await text(v.page);
  check(!t.includes("Sugar and atta for Maa"), "spending (switched to self): HER order shows");
  await v.ctx.close();

  // 6. Approvals (older order flow): only the selected person's
  v = await scopePage(browser, fam, `/dashboard/approvals?recipient=${SCOPE_MAA}`);
  check(await show(v.page, "Sugar for Maa"), "approvals (Maa): her order is not listed");
  t = await text(v.page);
  check(!t.includes("Protein bars for Ravi"), "approvals (Maa): HIS order shows on her page");
  await shot(v.page, "approvals-maa");
  await v.ctx.close();
  return problems;
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
  if (!process.env.PAGES_ONLY || process.env.PAGES_ONLY.split(",").includes("person-scope")) {
    const scope = await personScope(browser);
    console.log(scope.length ? `person scope: ${scope.length} problems` : "person scope: every page showed only the selected person's");
    for (const pr of scope) failures.push(`person-scope: ${pr}`);
  }
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
