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

// invite links (invite-only sign-up): one usable, one already used
const JOIN_ACTIVE = "7K2M9QXA4TBC8D1EFGHJ5NPRSV";
const JOIN_USED = "8Z3N0RYB5VCD9E2FGHJK6PQSTW";

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
  // Food & nutrition (behind nutrition.page; the switch is on here) and the doctor's link: for families whose world
  // fixture has a food log
  { name: "nutrition", path: "/dashboard/nutrition", engine: "nutrition" },
  { name: "nutrition-week", path: "/dashboard/nutrition?view=week", engine: "nutrition" },
  { name: "nutrition-link", path: "/n/world-link", public: true, engine: "nutrition/report" },
  { name: "sign-in", path: "/auth/login", public: true },
  { name: "invitations", path: "/dashboard/invitations", has: ["set up on the web", "then meet Saheli on WhatsApp"], hasNot: ["start with Saheli on WhatsApp"] },
  // web first, then WhatsApp (founder 2026-10-13): the join page's one action is signing up on the web; the steps end on
  // saying hi to Saheli on WhatsApp, and nothing on it opens WhatsApp or types an invite code
  { name: "join", path: `/join/${JOIN_ACTIVE}`, public: true, noWhatsAppLink: true,
    has: ["Accept invite and sign up", "Create your account", "Set up with Saheli here", "Say hi to Saheli on WhatsApp"],
    hasNot: ["Send hi to Saheli on WhatsApp", "invite code typed in", "Or sign up on the dashboard"] },
  { name: "join-used", path: `/join/${JOIN_USED}`, public: true, noWhatsAppLink: true, has: ["has been used", "Join the waitlist"], hasNot: ["Accept invite and sign up"] },
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
  if (p === `/api/families/${fid}/features`) return { nutritionPage: true };
  const cm = p.match(new RegExp(`^/api/families/${fid}/subjects/([^/]+)/care-memory(?:/(.+))?$`));
  if (cm) {
    const answers = fam.engine[cm[1]] || fam.engine[cared[0]?.id] || {};
    const route = cm[2] || "overview";
    if (route === "emergency-link") return null;
    if (route === "voice") return { mode: "auto", means: "" };
    if (route === "nutrition/shares") return { shares: [] };
    if (route === "nutrition/foods") return { foods: [] };
    if (route in answers) return answers[route];
    return undefined;
  }
  if (new RegExp(`^/api/families/${fid}/subjects/[^/]+/reminders$`).test(p)) return { reminders: [] };
  if (new RegExp(`^/api/families/${fid}/subjects/[^/]+/reminders/day$`).test(p)) return { day: url.searchParams.get("day") || world.today, occurrences: [], reminders: [] };
  if (new RegExp(`^/api/families/${fid}/recipients/[^/]+/labs$`).test(p)) return { documents: [] };
  if (new RegExp(`^/api/families/${fid}/recipients/[^/]+/labs/highlights$`).test(p)) return { cards: [], all: [], reports: 0, latestDate: null, noticed: null, readings: [] };
  const at = (days) => new Date(Date.parse(`${world.today}T09:00:00+05:30`) + days * 86_400_000).toISOString();
  if (p === "/api/invites") {
    const row = (id, state, extra) => ({ inviteId: `0000000${id}-0000-4000-8000-00000000000${id}`, state, createdAt: at(-3 * id), expiresAt: at(14 - 3 * id),
      usedAt: null, usedByName: null, revokedAt: null, link: null, ...extra });
    return { quota: { limit: 5, used: 3, left: 2, nextSlotAt: null }, perWeek: 5, validDays: 14, invites: [
      row(1, "active", { link: `${BASE}/join/${JOIN_ACTIVE}` }),
      row(2, "used", { usedAt: at(-4), usedByName: "Asha Verma" }),
      row(3, "revoked", { revokedAt: at(-8) }),
      row(6, "expired", { expiresAt: at(-4) }),
    ] };
  }
  if (p.startsWith("/api/public/invite/")) {
    const t = p.split("/").pop();
    const active = t === JOIN_ACTIVE;
    return { state: active ? "active" : "used", kind: "user", inviterName: primary.name, expiresAt: at(11), saheliNumber: "+919999900000" };
  }
  if (p.startsWith("/api/public/nutrition/")) {
    const report = (fam.engine[cared[0]?.id] || {})["nutrition/report"];
    return report ? { person: { name: cared[0].name }, days: report.days, sharedAt: at(-1), expiresAt: at(6), report } : undefined;
  }
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
    for (const words of pg.has || []) if (!text.includes(words)) problems.push(`missing "${words}"`);
    for (const words of pg.hasNot || []) if (text.includes(words)) problems.push(`should not say "${words}"`);
    if (pg.noWhatsAppLink && (await page.locator('a[href*="wa.me"]').count())) problems.push("a WhatsApp link on a page that must not open WhatsApp");
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

// ── The end of the web onboarding (founder 2026-10-13: "send saheli hi should appear at end of onboarding"): a finished
// setup shows "Send hi to Saheli on WhatsApp", a wa.me link to Saheli's number with "hi" typed in (no invite code: the
// number was proven during the setup), the line that she will greet them there, and the way to the dashboard.
const SAHELI_NUMBER = "+919999900000";
const ONBOARDING_PERSON = {
  relation: "Mother", name: "Kusum Mehta", callThem: "Maa", addressAs: "Maa", gender: "female", age: 74, city: "Pune", livesWith: "spouse", language: "hi",
  dialect: null, reads: "both", phone: "+919000000201", codesFrom: "me", conditions: ["bp"], bpMachine: true, problems: [], allergies: { none: true, items: [] },
  medicines: [{ name: "Telma 40", dose: "1 tablet", times: ["08:00"], food: "after_food" }],
  day: { wake: "06:00", breakfast: "08:00", lunch: "13:00", tea: "17:00", dinner: "20:00", sleep: "22:00", activities: [] }, likes: ["bhajans"],
};
const onboardingState = () => {
  const done = ["you_name", "care_for", "help_with", "emergency", "you_whatsapp", "anything_else",
    ...["p_name", "p_call", "p_home", "p_age", "p_language", "p_reads", "p_day", "p_day_times", "p_likes", "p_conditions", "p_checks", "p_allergies",
      "p_medicines", "p_meds_confirm", "p_problems", "p_whatsapp", "p_codes"].map((k) => `${k}:0`)];
  const answers = { you: { name: "Priya Mehta", callMe: "Priya", phone: "+919000000202" }, careFor: "mother", persons: [ONBOARDING_PERSON],
    helpWith: ["medicines", "checkins"], followups: [] };
  const chat = [
    { id: "m1", from: "saheli", text: "Namaste! I'm **Saheli** 🙏 I look after parents on WhatsApp — medicines, check-ins, a little company every day." },
    { id: "m2", from: "saheli", text: "Here's everything I've noted. Shall I set it all up?" },
  ];
  const at = new Date().toISOString();
  return { required: true, status: "pending", name: "Priya Mehta", draft: { answers, step: "summary", chat, flow: { done, extra: [], nurse: "none", asked: "summary" } },
    verified: { self: { phone: "+919000000202", at }, "person:0": { phone: "+919000000201", at } }, myPhone: "+919000000202", saheliNumber: SAHELI_NUMBER };
};
const ONBOARDING_RESULT = {
  persons: [{ userId: "0b0a0000-0000-4000-8000-000000000201", name: "Kusum Mehta", addressAs: "Maa", language: "Hindi", reminders: [{ name: "Telma 40", times: ["08:00"] }],
    checkins: ["morning", "evening"], verified: true, welcomeSent: false, welcome: "waiting", problems: [] }],
  caregiver: { name: "Priya Mehta", phoneVerified: true },
};

/** Opens /onboarding at the summary, taps "Set everything up" and checks the completion screen. */
export async function onboardingDone(browser, width = 1440, shotPath = null) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 600 ? 860 : 1000 }, timezoneId: "Asia/Kolkata", locale: "en-IN", ...(shotPath ? { deviceScaleFactor: 2 } : {}) });
  await ctx.addCookies([{ name: "kavach_session", value: "world", url: BASE }]);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(`page error: ${e.message.slice(0, 160)}`));
  page.on("console", (m) => m.type() === "error" && !NOISE.test(m.text()) && errors.push(`console error: ${m.text().slice(0, 160)}`));
  await page.route(/^https?:\/\/[^/]+\/api\//, (r) => {
    const u = new URL(r.request().url());
    if (u.pathname === "/api/client-error") return r.fulfill({ status: 204 });
    if (u.pathname === "/api/auth/session") return r.fulfill({ json: { user: { name: "Priya Mehta", email: "priya@world.kavach.test" }, expires: "2099-01-01T00:00:00.000Z" } });
    if (u.pathname.startsWith("/api/auth/")) return r.fulfill({ json: {} });
    if (u.pathname === "/api/onboarding") return r.fulfill({ json: { success: true, data: onboardingState() } });
    if (u.pathname === "/api/onboarding/complete") return r.fulfill({ json: { success: true, data: ONBOARDING_RESULT } });
    return r.fulfill({ json: { success: true, data: {} } });
  });
  const problems = [];
  const check = (cond, what) => !cond && problems.push(`onboarding-done @${width}: ${what}`);
  try {
    await page.goto(`${BASE}/onboarding`, { waitUntil: "networkidle", timeout: 90000 });
    const go = page.getByRole("button", { name: /Set everything up/ });
    await go.waitFor({ timeout: 20000 });
    await go.click();
    const hi = page.getByRole("link", { name: /Send hi to Saheli on WhatsApp/ });
    const shown = await hi.waitFor({ timeout: 20000 }).then(() => true, () => false);
    check(shown, "no Send hi to Saheli on WhatsApp button at the end of setup");
    if (shown) {
      check((await hi.getAttribute("href")) === `https://wa.me/${SAHELI_NUMBER.slice(1)}?text=hi`, `the button goes to ${await hi.getAttribute("href")}`);
      check((await hi.getAttribute("target")) === "_blank", "the WhatsApp link should open in a new tab");
      const text = await page.evaluate(() => document.body.innerText || "");
      check(text.includes("Saheli will greet you there"), "no line saying Saheli will greet them there");
      check(!/KAVACH-/i.test(text), "an invite code on the completion screen");
      check(await page.getByRole("button", { name: /Open my dashboard/ }).isVisible(), "no way to the dashboard");
      await page.mouse.move(0, 0); // no hover on the button in the screenshot
      await page.waitForTimeout(600);
      if (shotPath) {
        await hi.scrollIntoViewIfNeeded();
        await page.screenshot({ path: shotPath });
      } else if (process.env.PAGES_SHOTS) await page.screenshot({ path: path.join(OUT, `onboarding-done-${width}.png`) });
    }
  } catch (e) {
    problems.push(`onboarding-done @${width}: did not load: ${String(e.message || e).slice(0, 160)}`);
  }
  for (const e of errors) problems.push(`onboarding-done @${width}: ${e}`);
  await ctx.close();
  return problems;
}

// ── One memory (trust plan A1): the person page's "What Saheli learned" card, the usuals card and "What Saheli remembers"
// read Saheli's care record in the engine (care-memory/*), never the retired Mongo profile or Instinct inbox; "Yes" on a
// proposal approves it and "Not true" puts a fact on the never-use list.
const LEARN_MAA = "1ea40000-0000-4000-8000-00000000a001";
const LEARN_SON = "1ea40000-0000-4000-8000-00000000a002";
const RETIRED_API = /\/saheli\/(profile|memories|memory\/|usuals|outreach|chat|caregiver\/chat|check-in)|\/daily-snapshot|\/saheli\/permissions/;
const learnFact = (id, domain, key, text, status, source) => ({
  id, domain, key, name: key.split(":")[1], value: {}, text, status, source, statedBy: null, confirmedBy: null, confidence: 1,
  validFrom: `${world.today}T09:00:00+05:30`, validTo: null, recordedAt: `${world.today}T09:00:00+05:30`, note: null, links: [],
});
export async function learnedCard(browser, width = 1440, shotPath = null) {
  const base = world.families[0];
  const answers = structuredClone(Object.values(base.engine)[0]);
  const facts = [
    learnFact("1ea40000-0000-4000-8000-0000000000f1", "allergy", "allergy:peanuts", "Allergic to peanuts", "active", "caregiver_said"),
    learnFact("1ea40000-0000-4000-8000-0000000000f2", "preference", "preference:ginger_tea", "Likes ginger tea in the evening", "active", "inferred"),
    learnFact("1ea40000-0000-4000-8000-0000000000f3", "preference", "preference:usual_amul_milk", "Usually orders Amul Taaza milk", "active", "inferred"),
  ];
  const pending = [learnFact("1ea40000-0000-4000-8000-0000000000f4", "condition", "condition:high_bp", "Has high blood pressure", "pending", "inferred")];
  answers.overview = { ...answers.overview, facts: [...facts, ...pending], pending, notes: [
    { subjectId: LEARN_MAA, slug: "life", title: "Life", body: "- 2026-10-01: Grew up in Varanasi by the ghats", version: 1, updatedAt: `${world.today}T09:00:00+05:30` },
    { subjectId: LEARN_MAA, slug: "diary", title: "Diary", body: `- ${world.today}: A calm day; she went to the temple.`, version: 1, updatedAt: `${world.today}T09:00:00+05:30` },
  ] };
  const fam = { ...base, familyId: "1ea40000-0000-4000-8000-00000000fa01", leakOrders: false, orders: [], engine: { [LEARN_MAA]: answers }, people: [
    { id: LEARN_MAA, backendRole: "CARE_RECIPIENT", careRecipient: true, first: "Kamla", surname: "Devi", name: "Kamla Devi", key: "maa", relation: "Mother", city: "Pune", phone: "+919000000301" },
    { id: LEARN_SON, backendRole: "PRIMARY_CAREGIVER", careRecipient: false, first: "Ravi", surname: "Kumar", name: "Ravi Kumar", key: "self", relation: "self", city: "Pune", phone: "+919000000302" },
  ] };
  const ctx = await browser.newContext({ viewport: { width, height: width < 600 ? 860 : 1000 }, timezoneId: "Asia/Kolkata", locale: "en-IN", ...(shotPath ? { deviceScaleFactor: 2 } : {}) });
  await ctx.addCookies([{ name: "kavach_session", value: "world", url: BASE }]);
  const page = await ctx.newPage();
  const errors = [];
  const writes = [];
  const retired = [];
  page.on("pageerror", (e) => errors.push(`page error: ${e.message.slice(0, 160)}`));
  page.on("console", (m) => m.type() === "error" && !NOISE.test(m.text()) && errors.push(`console error: ${m.text().slice(0, 160)}`));
  page.on("dialog", (d) => d.accept());
  const fid = fam.familyId;
  await page.route(/^https?:\/\/[^/]+\/api\//, (r) => {
    const u = new URL(r.request().url());
    if (RETIRED_API.test(u.pathname)) retired.push(u.pathname.replaceAll(fid, ":f"));
    if (u.pathname === "/api/client-error") return r.fulfill({ status: 204 });
    if (u.pathname === "/api/auth/session") return r.fulfill({ json: { user: { name: "Ravi Kumar", email: "self@world.kavach.test" }, expires: "2099-01-01T00:00:00.000Z" } });
    if (u.pathname.startsWith("/api/auth/") && u.pathname !== "/api/auth/me") return r.fulfill({ json: {} });
    if (r.request().method() !== "GET") {
      writes.push({ path: u.pathname.replaceAll(fid, ":f").replaceAll(LEARN_MAA, ":p"), body: r.request().postDataJSON?.() ?? null });
      return r.fulfill({ json: { success: true, data: { result: "ok" } } });
    }
    const p = u.pathname;
    if (p.endsWith("/saheli/companion")) return r.fulfill({ json: { success: true, data: { enabled: true, childName: "Saheli", relationshipLabel: "daughter", personaNotes: "",
      outreachSlots: ["morning"], outreachTopics: [], shareWithFamily: false, preferredChannel: "whatsapp", timezone: "Asia/Kolkata", quietHoursStart: "", quietHoursEnd: "",
      nudgeIntensity: "standard", preferredLanguage: "hindi", lastOutreachAt: null, lastWhatsAppInboundAt: null } } });
    if (p.endsWith("/saheli/companion/activity")) return r.fulfill({ json: { success: true, data: { nudges: [], escalations: [] } } });
    if (p.endsWith("/saheli/delegate")) return r.fulfill({ json: { success: true, data: { openTasks: [], followups: [], approvals: [], recent: [], whys: [],
      permissions: { groceries: true, food: true, medicines: true, rides: true, stores: [], spendSoftLimitInr: 1500, deliveryFollowUps: true,
        medicineStartCheck: true, resumeNudges: true, locked: [], summary: { can: [], asks: [] }, history: [], updatedAt: null } } } });
    const known = api(fam, u);
    if (known === undefined && process.env.PAGES_DEBUG) console.log(`learned-card fallback: ${p.replaceAll(fid, ":f")}`);
    return r.fulfill({ json: { success: true, data: known ?? fallbackFamilyPage(p) } });
  });
  const problems = [];
  const check = (cond, what) => !cond && problems.push(`learned-card @${width}: ${what}`);
  try {
    await page.goto(`${BASE}/dashboard/family/${LEARN_MAA}?recipient=${LEARN_MAA}`, { waitUntil: "networkidle", timeout: 90000 });
    const card = page.getByTestId("what-saheli-learned");
    await card.waitFor({ timeout: 20000 });
    await page.waitForTimeout(600);
    const text = await card.innerText();
    check(text.includes("What Saheli learned about"), "no learned card heading");
    check(text.includes("Allergic to peanuts") && text.includes("Likes ginger tea in the evening"), "the engine's facts are not on the card");
    check(!text.includes("Usually orders Amul Taaza milk"), "a usual order shows on the learned card too (it has its own card)");
    check(text.includes("Has high blood pressure") && /waiting for your yes/i.test(text), "the pending proposal is not shown for a yes");
    const usuals = await page.getByTestId("saheli-usuals").innerText().catch(() => "");
    check(usuals.includes("Usually orders Amul Taaza milk"), "the usual from the care record is not on the usuals card");
    if (width >= 1200) {
      const remembers = await page.getByTestId("saheli-remembers").innerText().catch(() => "");
      check(remembers.includes("Grew up in Varanasi by the ghats"), "What Saheli remembers does not show the care record's notes");
    }
    if (shotPath) {
      await card.scrollIntoViewIfNeeded();
      await card.screenshot({ path: shotPath });
      const rem = page.getByTestId("saheli-remembers");
      if (await rem.isVisible().catch(() => false)) await rem.screenshot({ path: shotPath.replace(/\.png$/, "-remembers.png") });
      await page.getByTestId("saheli-usuals").screenshot({ path: shotPath.replace(/\.png$/, "-usuals.png") }).catch(() => undefined);
    }
    else if (process.env.PAGES_SHOTS) await page.screenshot({ path: path.join(OUT, `learned-card-${width}.png`), fullPage: true });
    await card.getByRole("button", { name: /^Yes$/ }).click();
    await page.waitForTimeout(400);
    check(writes.some((w) => w.path.endsWith("/care-memory/facts/resolve") && w.body?.key === "condition:high_bp" && w.body?.approve === true), "Yes did not approve the proposal in the care record");
    await card.getByRole("button", { name: "Not true: Likes ginger tea in the evening" }).click();
    await page.waitForTimeout(400);
    check(writes.some((w) => w.path.endsWith("/care-memory/facts/stop") && w.body?.name === "ginger_tea" && w.body?.wrong === true), "Not true did not put the fact on the never-use list");
  } catch (e) {
    problems.push(`learned-card @${width}: did not load: ${String(e.message || e).slice(0, 160)}`);
  }
  check(!retired.length, `the retired memory endpoints were called: ${[...new Set(retired)].join(", ")}`);
  for (const e of errors) problems.push(`learned-card @${width}: ${e}`);
  await ctx.close();
  return problems;
}

/** The family person page's other cards (briefing, schedule, labs): empty answers are enough here. */
function fallbackFamilyPage(p) {
  if (/\/briefing$/.test(p)) return { recipientName: "Kamla", lastHeardAt: null, lastHeardLine: null, lastCheckInAt: null, todayItems: [], unconfirmedItems: [],
    scheduleStatuses: [], completedCount: 0, missedCount: 0, upcomingCount: 0, elapsedCount: 0, adherencePercent: null, dateKey: world.today };
  if (/\/care-schedule$/.test(p)) return { schedules: [], canManage: true };
  return {};
}

(async () => {
  if (process.env.PAGES_NO_RUN) return;
  fs.mkdirSync(OUT, { recursive: true });
  const fams = world.families.slice(0, FAMILIES);
  const jobs = [];
  // a page that reads an engine view the family's fixture doesn't have yet is left out for that family
  const hasView = (fam, route) => Object.values(fam.engine || {}).some((a) => a && route in a);
  for (const fam of fams) for (const pg of PAGES) for (const w of WIDTHS) if (!pg.engine || hasView(fam, pg.engine)) jobs.push({ fam, pg, w });
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
  if (!process.env.PAGES_ONLY || process.env.PAGES_ONLY.split(",").includes("learned-card")) {
    const learned = (await Promise.all(WIDTHS.map((w) => learnedCard(browser, w)))).flat();
    console.log(learned.length ? `learned card: ${learned.length} problems` : "learned card: the person page reads Saheli's care record (facts, proposals, usuals, notes)");
    failures.push(...learned);
  }
  if (!process.env.PAGES_ONLY || process.env.PAGES_ONLY.split(",").includes("onboarding-done")) {
    const end = (await Promise.all(WIDTHS.map((w) => onboardingDone(browser, w)))).flat();
    console.log(end.length ? `onboarding done: ${end.length} problems` : "onboarding done: the Send hi to Saheli button ends the web setup");
    failures.push(...end);
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
