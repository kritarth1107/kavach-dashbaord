/**
 * The Memory page mounts with real-shaped data and every change kind the engine sends, and one broken panel never
 * blanks the page (founder 2026-10-12: the page showed "This page couldn't load").
 * It mounts the real providers and page; only the network is faked.
 * MEMORY_FIXTURE=/path/to.json replays captured responses ({overview, learning, health, skills, history}) instead.
 * Usage: npx tsx scripts/test-memory-page.tsx
 */
import { dom } from "./test-dom-setup";
import assert from "node:assert/strict";
import fs from "node:fs";
import { Component, act, createElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { PathnameContext, SearchParamsContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";

const g = globalThis as typeof globalThis & Record<string, unknown>;
g.localStorage = dom.window.localStorage;
g.navigator ??= dom.window.navigator;
g.requestAnimationFrame = (cb: (t: number) => void) => setTimeout(() => cb(Date.now()), 0) as unknown as number;
g.cancelAnimationFrame = (id: number) => clearTimeout(id);
g.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
g.SVGElement = dom.window.SVGElement;
g.KeyboardEvent = dom.window.KeyboardEvent;
g.MouseEvent = dom.window.MouseEvent;
g.FocusEvent = dom.window.FocusEvent;
class Observer {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
g.IntersectionObserver = Observer as unknown as typeof IntersectionObserver;
g.ResizeObserver = Observer as unknown as typeof ResizeObserver;
dom.window.matchMedia = ((q: string) => ({ matches: false, media: q, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false })) as never;
dom.window.HTMLElement.prototype.scrollIntoView = function () {};

const FID = "fam-test";
const ELDER = "elder-test";
const CG = "cg-test";
const now = new Date().toISOString();

/** Every change kind the engine's memory history sends (app/care/versions.py KINDS), one of each. */
function change(id: number, kind: string, extra: Record<string, unknown> = {}) {
  return {
    id, kind, op: "write", status: kind === "note" ? null : "active", version: 1, subjectId: ELDER, target: `${kind}:x`, label: `${kind} label`,
    summary: `${kind} summary`, by: "Saheli", where: "WhatsApp", at: now, actorId: "saheli", canUndo: true, canRestore: true, reason: "", ...extra,
  };
}

function synthetic() {
  const fact = (id: string, domain: string, text: string) => ({
    id, domain, key: `${domain}:${id}`, name: id, value: { name: id }, text, status: "active", source: "elder_said", statedBy: ELDER,
    confirmedBy: null, confidence: 0.9, validFrom: now, validTo: null, recordedAt: now, note: null,
    links: domain === "family" ? [{ relation: "related_to", to: "x", label: "Grandson", text: "related to Grandson", phrase: "related to", status: "active", source: "elder_said" }] : [],
  });
  return {
    overview: {
      day: now.slice(0, 10), doses: [], domains: {}, pending: [], loops: [], events: [], tasks: [],
      facts: [fact("lang", "language", "Speaks Hindi with a light Marwari touch"), fact("son", "family", "Son lives in Pune"), fact("walk", "routine", "Walks at 6 am"),
              fact("bp", "condition", "High blood pressure"), fact("prof", "profile", "Retired teacher")],
      notes: [{ subjectId: ELDER, slug: "food", title: "Food", body: "- 2026-10-11: likes poha\n- dislikes karela", version: 2, updatedAt: now },
              { subjectId: "family", slug: "family", title: "Family", body: "- Diwali at home", version: 1, updatedAt: now }],
    },
    learning: { events: [{ id: 1, kind: "fact_created", at: now, day: now.slice(0, 10), summary: "Walks at 6 am", actorId: ELDER, payload: {} }] },
    health: { issues: [{ kind: "no_time", key: "notime:x", problem: "Metformin: no time saved", ask: "What time is Metformin taken?" }], profileCard: "Name: Test\nSpeaks: Hindi", forgotten: [] },
    skills: { skills: [], store: [{ id: 1, scope: "store", subjectId: null, service: "blinkit", title: "cart path", body: "", steps: [], source: "agent", status: "active", uses: 3, successes: 2, failures: 1, successRate: 0.66, lastUsedAt: now, createdAt: now, updatedAt: now, updatedBy: "agent", version: 1 }] },
    portrait: {
      person: { name: "Test Elder", age: "72", callAs: null, language: null, livesWith: null, city: "Jodhpur", address: null, mobility: null },
      mood: { now: { score: 4, word: "calm", summary: "Happy after a call", at: now, source: "chat" },
              days: [{ day: "2026-10-12", score: 2, word: "worried", summary: "Knee pain", at: now, source: "chat" }, { day: "2026-10-13", score: 4, word: "calm", summary: "", at: now, source: "chat" }] },
      stats: { known: 5, learnedWeek: 2, pending: 1 },
      learned: [
        { id: "l1", key: "routine:walk", domain: "routine", text: "Walks at 6 am", status: "active", source: "elder_said", statedBy: "Test Elder", at: now,
          said: { text: "Subah chhe baje ghoomne jaati hoon", at: now, voice: true, heard: false } },
        { id: "l3", key: "family:son", domain: "family", text: "Son lives in Pune", status: "active", source: "inferred", statedBy: null, at: now,
          said: { text: "send this image to mom", at: now, voice: false, heard: true } },
        { id: "l2", key: "medicine:amlodipine", domain: "medicine", text: "Wants to stop Amlodipine", status: "pending", source: "elder_said", statedBy: "Test Elder", at: now, said: null },
      ],
      people: [{ id: CG, name: "Test Caregiver", relation: "primary caregiver", kind: "member" }, { name: "Ramesh", relation: "neighbour", kind: "contact", key: "contact:ramesh" }],
      day: [], enjoys: [{ key: "preference:likes", text: "Enjoys bhajans", domain: "preference" }], avoid: ['Never call them "aunty"'], week: [], knownSince: now,
    },
    history: {
      changes: [
        change(9, "link", { label: "Metformin for diabetes", summary: "linked: for diabetes", body: "Metformin is for diabetes" }),
        change(8, "fact", { body: "Walks at 6 am", value: { name: "walk" } }),
        change(7, "note", { added: ["- 2026-10-11: likes poha"], removed: [], more: 0, deleted: false }),
        change(6, "skill", { body: "Short replies" }),
        change(5, "style", { body: "Warm, short" }),
        change(4, "something_new", { body: "a kind the dashboard has never seen" }),
      ],
    },
  };
}

const live = process.env.MEMORY_FIXTURE ? JSON.parse(fs.readFileSync(process.env.MEMORY_FIXTURE, "utf8")) : null;
let data = live ?? synthetic();
// live data carries real ids: answer for whichever person the page asks about
const ok = (body: unknown) => new Response(JSON.stringify({ success: true, data: body }), { status: 200, headers: { "Content-Type": "application/json" } });
const unknownUrls: string[] = [];

function family() {
  const f = { familyId: FID, name: "Test family", initial: "T", role: "PRIMARY_CAREGIVER", roleLabel: "Primary caregiver", roleBadge: "", switcherRoleBadge: "", memberCount: 2, isActive: true, isPrimary: true, status: "ACTIVE" };
  return { activeFamilyId: FID, primaryFamilyId: FID, activeFamily: f, families: [f] };
}

const reports: string[] = [];
g.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = new URL(String(input), "http://localhost");
  const p = url.pathname;
  if (p === "/api/auth/me") return ok({ user: { userId: CG, fullName: "Test Caregiver", onboardingRequired: false, onboardingSkipped: false }, pendingInvitations: [], ...family() });
  if (p === "/api/families/switcher") return ok(family());
  if (p === `/api/families/${FID}/members`)
    return ok({ members: [
      { userId: ELDER, name: "Test Elder", role: "CARE_RECIPIENT", status: "JOINED", relationship: "Mother" },
      { userId: CG, name: "Test Caregiver", role: "PRIMARY_CAREGIVER", status: "JOINED", relationship: "Son" },
    ] });
  if (p === `/api/families/${FID}/notifications`) return ok({ notifications: [], unreadCount: 0 });
  const cm = p.match(/^\/api\/families\/[^/]+\/subjects\/[^/]+\/care-memory\/(.+)$/);
  if (cm) {
    const route = cm[1];
    if (route === "overview") return ok(data.overview);
    if (route === "events") return ok(data.learning);
    if (route === "memory-health") return ok(data.health);
    if (route === "skills") return ok(data.skills);
    if (route === "memory-history") return ok(data.history);
    if (route === "voice") return ok({ mode: "auto", means: "" });
    if (route === "portrait" && data.portrait) return ok(data.portrait);
  }
  if (p === "/api/client-error") {
    reports.push(String((init as RequestInit | undefined)?.body ?? ""));
    return new Response(null, { status: 204 });
  }
  unknownUrls.push(p);
  return new Response(JSON.stringify({ success: false, message: "not in the test" }), { status: 404 });
}) as typeof fetch;

const caught: Array<{ error: Error; stack: string }> = [];
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    caught.push({ error, stack: info.componentStack ?? "" });
  }
  render() {
    return this.state.failed ? createElement("p", null, "PAGE CRASHED") : this.props.children;
  }
}

const router = { push() {}, replace() {}, refresh() {}, prefetch() {}, back() {}, forward() {}, hmrRefresh() {} };

async function settle(rounds = 25) {
  for (let i = 0; i < rounds; i++) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
  }
}

async function mount(): Promise<{ text: string; crashed: string | null; unmount: () => void }> {
  caught.length = 0;
  const { FamilyProvider } = await import("../components/dashboard/family-context");
  const { PersonProvider } = await import("../components/care-os/person-context");
  const { MemoryPage } = await import("../components/care-os/memory-page");
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(
      createElement(
        AppRouterContext.Provider,
        { value: router as never },
        createElement(
          PathnameContext.Provider,
          { value: "/dashboard/saheli/memory" },
          createElement(
            SearchParamsContext.Provider,
            { value: new URLSearchParams({ recipient: ELDER }) as never },
            createElement(Boundary, null, createElement(FamilyProvider, null, createElement(PersonProvider, null, createElement(MemoryPage)))),
          ),
        ),
      ),
    );
  });
  await settle();
  const crashed = caught.length ? `${caught[0].error.message}\n${caught[0].stack.split("\n").slice(0, 8).join("\n")}` : null;
  return { text: host.textContent ?? "", crashed, unmount: () => { root.unmount(); host.remove(); } };
}

(async () => {
  const origError = console.error;
  console.error = () => undefined; // React logs every caught error; the checks below say what matters
  try {
    if (live) {
      const page = await mount();
      assert.equal(page.crashed, null, `the page must not crash:\n${page.crashed}`);
      console.log("memory page: mounted without a crash (live fixture)");
      page.unmount();
      return;
    }

    // 1. every change kind the engine sends, and one it may send later, renders (a "link" change blanked the page)
    let page = await mount();
    assert.equal(page.crashed, null, `the page must not crash:\n${page.crashed}`);
    assert.ok(page.text.includes("Recent changes"), "the recent changes panel shows");
    assert.ok(page.text.includes("Metformin for diabetes"), "a link change shows in recent changes");
    assert.ok(page.text.includes("something_new summary"), "a kind the dashboard does not know still shows");
    assert.ok(page.text.includes("Walks at 6 am"), "the care record facts show");
    // the order agents' shared store steps are no family's: never on a family's page, even when an old API sends them
    // (founder 2026-10-13: a new account read "Blinkit browse 7/8 worked" as orders it had never placed)
    assert.ok(!page.text.includes("What the order agents learned") && !page.text.includes("worked"), "no shared store steps");
    page.unmount();
    console.log("  ✓ link changes and unknown change kinds render; no shared store steps");

    // 1b. the Story (design approved 2026-10-13): their own words, mood, what was learned with an approve, their people
    page = await mount();
    for (const bit of ["Subah chhe baje ghoomne jaati hoon", "Said in a voice note", "Calm", "Learned from the chats", "Approve", "Ramesh", "Enjoys bhajans", 'Never call them "aunty"', "Heard in the chat"]) {
      assert.ok(page.text.includes(bit), `the story shows: ${bit}`);
    }
    // words the re-read picked never become the big quote (live 2026-10-13 a loose pick headed the page)
    assert.ok(page.text.indexOf("Subah chhe baje ghoomne jaati hoon") < page.text.indexOf("send this image to mom"), "the quote is their own message");
    page.unmount();
    console.log("  ✓ the story shows their words, mood, learned items with approve, people, likes and avoid");

    // 2. a panel whose data breaks it shows a note in its place; the rest of the page keeps working, and we are told
    data = synthetic();
    (data.health as Record<string, unknown>).profileCard = 42; // v.profileCard.split(...) throws
    reports.length = 0;
    page = await mount();
    assert.equal(page.crashed, null, `one panel must not take the page down:\n${page.crashed}`);
    assert.ok(page.text.includes("Saheli's card couldn't load"), "the broken panel says so");
    assert.ok(page.text.includes("Recent changes") && page.text.includes("Walks at 6 am"), "the other panels still show");
    assert.ok(reports.some((r) => r.includes("panel:Saheli's card")), "the crash is reported to the server");
    page.unmount();
    console.log("  ✓ a broken panel is contained and reported");
  } finally {
    console.error = origError;
  }
  if (unknownUrls.length) console.log("unanswered requests:", [...new Set(unknownUrls)].join(", "));
  console.log("memory page: all checks passed");
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
