"use client";
/**
 * Orders & rides, reimagined (founder 2026-10-13): the store's own logo, one compact row per order with its status,
 * details on tap, no live browser view and no long lists. What needs a decision comes first with its action inline.
 * The store comparison card follows Order Engineer's rules (stores looked up together share details.compare).
 */

import { CaretRight, Car, CheckCircle, Circle, Clock, ShoppingBag, SpinnerGap, X } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { cancelTask, forPerson, taskInput, type CareTask } from "@/lib/care-memory-api";
import { cn } from "@/lib/utils";
import { AccessGate, useRecipientSelection } from "@/components/dashboard/activity/activity-shared";
import { Banner, useAction, useCareOverview } from "@/components/dashboard/saheli/saheli-shared";
import { PageHeading, SideDrawer } from "./care-kit";
import { callName, possessive, usePerson } from "./person-context";
import { ServiceLogo } from "./service-logo";
import { Panel, PanelTitle, PillTabs, SmallButton, Tag } from "./ui";

const IST = "Asia/Kolkata";
const LIVE = new Set(["queued", "running", "needs_input", "awaiting_confirm"]);
type Tone = "ok" | "danger" | "accent" | "light" | "warn" | "dark";
const STATUS: Record<string, { label: string; tone: Tone }> = {
  queued: { label: "Starting", tone: "light" },
  running: { label: "Working", tone: "light" },
  needs_input: { label: "Needs you", tone: "accent" },
  awaiting_confirm: { label: "Needs you", tone: "accent" },
  scheduled: { label: "Set for later", tone: "dark" },
  done: { label: "Done", tone: "ok" },
  failed: { label: "Didn't go through", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "light" },
};
/** A status added later in the engine shows as its own word (an unknown key once crashed a page). */
const statusOf = (s: string) => STATUS[s] ?? { label: s.replace(/_/g, " "), tone: "light" as Tone };

const when = (iso: string) => {
  const d = new Date(iso);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: IST });
  const day = d.toLocaleDateString("en-CA", { timeZone: IST });
  const t = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: IST });
  return day === today ? `Today ${t}` : `${d.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: IST })}, ${t}`;
};
const rupees = (s?: string) => {
  const n = Number(String(s ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** What happened to a cancel asked after it was placed or booked (details.cancel_ask.state). */
const CANCEL: Record<string, { label: string; tone: Tone }> = {
  pending: { label: "Cancel asked", tone: "warn" },
  cancelling: { label: "Cancelling on the store", tone: "warn" },
  fee: { label: "Cancel fee needs a yes", tone: "accent" },
  cancelled: { label: "Cancelled on the store", tone: "light" },
  cancelled_in_app: { label: "Cancelled in the app", tone: "light" },
  refused: { label: "Store refused the cancel", tone: "danger" },
  kept: { label: "Kept", tone: "light" },
  told_carers: { label: "Caregivers told", tone: "light" },
  unclear: { label: "Cancel unclear", tone: "warn" },
};
/** The badges a task needs beyond its status: placed before a yes, a cancel under way. */
function flags(t: CareTask): Array<{ label: string; tone: Tone }> {
  const out: Array<{ label: string; tone: Tone }> = [];
  if (t.result?.by_mistake) out.push({ label: t.kind === "ride" ? "Booked before a yes, cancelling" : "Placed before a yes, cancelling", tone: "danger" });
  const c = t.details?.cancel_ask?.state;
  if (c && c !== "not_placed" && CANCEL[c] && !(c === "cancelled" && t.status === "cancelled")) out.push(CANCEL[c]);
  return out;
}
const hhmm = (iso?: string) => (iso ? when(iso) : null);
/** "Booked Thu 10:00, up to ₹900" for a task set for later. */
function laterLine(t: CareTask): string | null {
  const lt = t.details?.later;
  if (!lt) return null;
  const at = hhmm(lt.book_at || lt.at);
  return [at ? `${t.kind === "ride" ? "Books" : "Orders"} ${at}` : null, lt.max ? `up to ₹${Math.round(lt.max)}` : lt.no_max ? "no limit set" : null].filter(Boolean).join(", ") || null;
}

/** Where a running order is: looked up, logged in, cart or fares ready, placed. */
const STEPS: Record<CareTask["kind"], string[]> = { order: ["Found", "Logged in", "Cart ready", "Placed"], ride: ["Fares", "Logged in", "Ride picked", "Booked"] };
const stepOf = (t: CareTask) => (t.status === "done" || t.phase === "check" ? 4 : t.phase === "place" ? 3 : t.phase === "prepare" ? 2 : t.phase === "otp" ? 1 : 0);

/** Stores looked up together (no store named) until one is picked; the dropped ones after a pick are hidden. */
function compareGroups(tasks: CareTask[]): { comparing: CareTask[][]; hidden: Set<string> } {
  const byId = new Map<string, CareTask[]>();
  for (const t of tasks) if (t.details.compare) byId.set(t.details.compare, [...(byId.get(t.details.compare) ?? []), t]);
  const comparing: CareTask[][] = [];
  const hidden = new Set<string>();
  for (const group of byId.values()) {
    const live = group.filter((t) => LIVE.has(t.status));
    const picked = group.find((t) => t.phase !== "browse" && t.status !== "failed");
    if (live.length && !picked && live.every((t) => t.phase === "browse" || t.status === "queued")) comparing.push(group);
    else if (picked) group.filter((t) => t.id !== picked.id && t.status === "cancelled").forEach((t) => hidden.add(t.id));
  }
  return { comparing, hidden };
}

type Run = (id: string, fn: () => Promise<unknown>, ok?: string) => Promise<boolean>;

export function OrdersPage() {
  const sel = useRecipientSelection();
  // the person picked in the switcher (URL, else the saved choice): the heading and the data are always the same person
  const { familyId, selectedId, selected } = usePerson();
  const { data, error, loading, reload } = useCareOverview(familyId, selectedId, undefined, 10_000);
  const { busy, banner, run } = useAction();
  const [kind, setKind] = useState<"all" | "order" | "ride">("all");
  const [open, setOpen] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  // only what was placed for this person, never the rest of the family's (founder 2026-10-13)
  const all = useMemo(() => forPerson(data?.tasks ?? [], selectedId), [data, selectedId]);
  const tasks = kind === "all" ? all : all.filter((t) => t.kind === kind);
  const { comparing, hidden } = compareGroups(tasks);
  const inCard = new Set(comparing.flat().map((t) => t.id));
  const needs = tasks.filter((t) => LIVE.has(t.status) && t.inputNeeded && !inCard.has(t.id));
  const working = tasks.filter((t) => LIVE.has(t.status) && !t.inputNeeded && !inCard.has(t.id));
  const later = tasks.filter((t) => t.status === "scheduled" && !inCard.has(t.id));
  const past = tasks.filter((t) => !LIVE.has(t.status) && t.status !== "scheduled" && !inCard.has(t.id) && !hidden.has(t.id));
  const monthKey = new Date().toLocaleDateString("en-CA", { timeZone: IST }).slice(0, 7);
  const spent = all
    .filter((t) => t.status === "done" && t.kind === "order" && new Date(t.createdAt).toLocaleDateString("en-CA", { timeZone: IST }).startsWith(monthKey))
    .reduce((s, t) => s + (rupees(t.result.total) ?? 0), 0);
  const detail = all.find((t) => t.id === open) ?? null;
  const shownPast = showAll ? past : past.slice(0, 6);

  return (
    <AccessGate familyId={sel.familyId} loading={sel.loading} isCaregiver={sel.isCaregiver} isRecipient={sel.isRecipient} recipients={sel.recipients} error={sel.error}>
      <div className="space-y-4">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <PageHeading top={possessive(selected)} bottom="Orders & rides" />
            <p className="mt-3 max-w-xl text-[13.5px] text-[var(--c-ink-2)]">
              {selected?.self ? "Only what was placed for you" : `Only what was placed for ${callName(selected) || "them"}`}, not the rest of the family&apos;s. Saheli uses the
              family&apos;s own accounts, cash on delivery only. Nothing is placed or booked without a yes.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {needs.length + comparing.length > 0 && <Stat label="need you" value={needs.length + comparing.length} tone="accent" />}
            {working.length > 0 && <Stat label="in progress" value={working.length} />}
            {later.length > 0 && <Stat label="set for later" value={later.length} />}
            {spent > 0 && <Stat label="ordered this month" value={`₹${Math.round(spent).toLocaleString("en-IN")}`} />}
          </div>
        </header>
        <Banner banner={banner} />

        {loading && !data ? (
          <div className="space-y-3" aria-busy="true" aria-label="Loading">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[76px] animate-pulse rounded-[20px] bg-[var(--c-card)]" />
            ))}
          </div>
        ) : error && !data ? (
          <Panel className="py-12 text-center">
            <p className="text-[15px] font-medium">Couldn&apos;t load orders and rides</p>
            <p className="mt-1 text-[13px] text-[var(--c-ink-2)]">{error}</p>
          </Panel>
        ) : all.length === 0 ? (
          <Panel className="flex flex-col items-center gap-3 py-14 text-center">
            <div className="flex -space-x-2">
              {["blinkit", "instamart", "apollo", "uber"].map((s) => (
                <ServiceLogo key={s} service={s} size={40} className="ring-2 ring-[var(--c-card)]" />
              ))}
            </div>
            <p className="text-[16px] font-medium">No orders or rides {selected?.self ? "for you" : `for ${callName(selected) || "them"}`} yet</p>
            <p className="max-w-sm text-[13px] text-[var(--c-ink-2)]">
              Ask Saheli on WhatsApp, e.g. &ldquo;order 1 kg atta&rdquo; or &ldquo;book a cab to the hospital at 10&rdquo;. Each one shows here with its status.
            </p>
          </Panel>
        ) : (
          <>
            <PillTabs
              tabs={[
                { id: "all", label: `All · ${all.length}` },
                { id: "order", label: `Orders · ${all.filter((t) => t.kind === "order").length}` },
                { id: "ride", label: `Rides · ${all.filter((t) => t.kind === "ride").length}` },
              ]}
              value={kind}
              onChange={setKind}
            />

            {(needs.length > 0 || comparing.length > 0) && (
              <section className="space-y-3" aria-labelledby="t-needs">
                <h2 id="t-needs" className="flex items-center gap-2.5 text-[14px] font-medium">
                  <span className="h-[14px] w-[14px] rounded-[4px] bg-[var(--c-accent)]" aria-hidden />
                  Needs you
                </h2>
                {comparing.map((g) => (
                  <CompareCard key={g[0].details.compare} tasks={g} busy={busy} familyId={familyId!} subjectId={selectedId!} run={run} reload={reload} />
                ))}
                {needs.map((t) => (
                  <ActionCard key={t.id} task={t} busy={busy} familyId={familyId!} subjectId={selectedId!} run={run} reload={reload} onOpen={() => setOpen(t.id)} />
                ))}
              </section>
            )}

            {working.length > 0 && (
              <Panel>
                <PanelTitle title="In progress" right={<span className="text-[12px] text-[var(--c-ink-2)]">updates by itself</span>} />
                <ul className="mt-3 space-y-2">
                  {working.map((t) => (
                    <li key={t.id}>
                      <Row task={t} onOpen={() => setOpen(t.id)} live />
                    </li>
                  ))}
                </ul>
              </Panel>
            )}

            {later.length > 0 && (
              <Panel>
                <PanelTitle title="Set for later" right={<span className="text-[12px] text-[var(--c-ink-2)]">booked at the time, details sent then</span>} />
                <ul className="mt-3 space-y-2">
                  {later.map((t) => (
                    <li key={t.id}>
                      <Row task={t} onOpen={() => setOpen(t.id)} />
                    </li>
                  ))}
                </ul>
              </Panel>
            )}

            {past.length > 0 && (
              <Panel>
                <PanelTitle title="Earlier" right={<span className="text-[12px] text-[var(--c-ink-2)]">{past.length}</span>} />
                <ul className="mt-3 space-y-2">
                  {shownPast.map((t) => (
                    <li key={t.id}>
                      <Row task={t} onOpen={() => setOpen(t.id)} />
                    </li>
                  ))}
                </ul>
                {past.length > 6 && (
                  <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-3 text-[12.5px] text-[var(--c-ink-2)] underline underline-offset-2">
                    {showAll ? "Show fewer" : `Show all ${past.length}`}
                  </button>
                )}
              </Panel>
            )}
          </>
        )}
      </div>

      <TaskDrawer task={detail} onClose={() => setOpen(null)} busy={busy} familyId={familyId} subjectId={selectedId} run={run} reload={reload} />
    </AccessGate>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: "accent" }) {
  return (
    <span className={cn("inline-flex h-10 items-center gap-2 rounded-full px-4 text-[12.5px]", tone ? "bg-[var(--c-accent-soft)] text-[var(--c-accent-soft-ink)]" : "bg-[var(--c-card)] text-[var(--c-ink-2)]")}>
      <span className="c-num text-[16px] font-medium text-[var(--c-ink)]">{value}</span>
      {label}
    </span>
  );
}

function Steps({ task: t }: { task: CareTask }) {
  const at = stepOf(t);
  return (
    <span className="flex items-center gap-1" aria-label={`Step ${Math.min(at + 1, 4)} of 4`}>
      {STEPS[t.kind].map((s, i) => (
        <span key={s} title={s} className={cn("h-1.5 w-5 rounded-full", i < at ? "bg-[var(--c-solid)]" : i === at ? "bg-[var(--c-accent)]" : "bg-[var(--c-line)]")} />
      ))}
      <span className="ml-1.5 text-[11.5px] text-[var(--c-ink-2)]">
        {t.phase === "check" ? "Checking the store" : t.status === "done" ? STEPS[t.kind][3] : STEPS[t.kind][Math.min(at, 3)]}
      </span>
    </span>
  );
}

/** One compact row: logo, what, store and when, amount, status. Tap for the details. */
function Row({ task: t, onOpen, live }: { task: CareTask; onOpen: () => void; live?: boolean }) {
  const s = statusOf(t.status);
  const total = t.result.total;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-[16px] bg-[var(--c-frame)] px-3.5 py-3 text-left outline-none transition-shadow hover:shadow-[inset_0_0_0_1px_var(--c-line)] focus-visible:ring-2 focus-visible:ring-[var(--c-accent)]"
    >
      <ServiceLogo service={t.service} label={t.serviceLabel} size={38} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-medium">{t.goal}</span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11.5px] text-[var(--c-ink-2)]">
          <span>{t.serviceLabel}</span>
          <span aria-hidden>·</span>
          <span>{when(t.createdAt)}</span>
          {t.status === "failed" && t.result.problem && <span className="truncate text-[var(--c-danger-ink)]">· {t.result.problem}</span>}
          {t.status === "scheduled" && laterLine(t) && <span>· {laterLine(t)}</span>}
        </span>
        {flags(t).length > 0 && (
          <span className="mt-1.5 flex flex-wrap gap-1.5">
            {flags(t).map((f) => (
              <Tag key={f.label} tone={f.tone}>
                {f.label}
              </Tag>
            ))}
          </span>
        )}
        {live && (
          <span className="mt-1.5 block">
            <Steps task={t} />
          </span>
        )}
      </span>
      {total && <span className="c-num hidden shrink-0 text-[14px] font-medium sm:block">{total}</span>}
      <span className="flex shrink-0 items-center gap-1.5">
        {live && <SpinnerGap size={14} className="animate-spin text-[var(--c-ink-3)]" aria-hidden />}
        <Tag tone={s.tone}>{(t.cancelRequested || t.phase === "cancel") && LIVE.has(t.status) ? "Cancelling" : t.phase === "check" && LIVE.has(t.status) ? "Checking the store" : s.label}</Tag>
        <CaretRight size={14} className="text-[var(--c-ink-3)]" aria-hidden />
      </span>
    </button>
  );
}

/** A task waiting for someone: what it is and the one decision, inline. */
function ActionCard({
  task: t,
  busy,
  familyId,
  subjectId,
  run,
  reload,
  onOpen,
}: {
  task: CareTask;
  busy: string | null;
  familyId: string;
  subjectId: string;
  run: Run;
  reload: () => void;
  onOpen: () => void;
}) {
  const r = t.result ?? {};
  const items = r.items ?? t.details.items ?? [];
  return (
    <section className="rounded-[22px] bg-[var(--c-accent-wash)] p-4 shadow-[inset_0_0_0_1px_var(--c-accent-soft)] sm:p-5">
      <div className="flex items-start gap-3">
        <ServiceLogo service={t.service} label={t.serviceLabel} size={42} />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium leading-snug">{t.goal}</p>
          <p className="mt-0.5 text-[12px] text-[var(--c-ink-2)]">
            {t.serviceLabel} · {when(t.createdAt)}
            {t.kind === "ride" && t.details.pickup ? ` · ${t.details.pickup} → ${t.details.drop ?? ""}` : ""}
          </p>
        </div>
        <button type="button" onClick={onOpen} className="shrink-0 text-[12px] text-[var(--c-ink-2)] underline-offset-2 hover:underline">
          Details
        </button>
      </div>
      {flags(t).length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {flags(t).map((f) => (
            <Tag key={f.label} tone={f.tone}>
              {f.label}
            </Tag>
          ))}
        </div>
      )}
      {t.kind === "order" && items.length > 0 && (
        <p className="mt-3 line-clamp-2 text-[12.5px] text-[var(--c-ink-2)]">
          {items
            .slice(0, 4)
            .map((i) => `${i.qty ?? 1} × ${i.name}${i.available === false ? " (unavailable)" : ""}`)
            .join(" · ")}
          {items.length > 4 ? ` · +${items.length - 4} more` : ""}
        </p>
      )}
      <div className="mt-3">
        <Decision task={t} busy={busy} familyId={familyId} subjectId={subjectId} run={run} reload={reload} />
      </div>
    </section>
  );
}

/** The decision a task waits for (the same actions as on WhatsApp). */
function Decision({ task: t, busy, familyId, subjectId, run, reload }: { task: CareTask; busy: string | null; familyId: string; subjectId: string; run: Run; reload: () => void }) {
  const [otp, setOtp] = useState("");
  const r = t.result ?? {};
  const act = (id: string, fn: () => Promise<unknown>, ok: string) => run(`${t.id}:${id}`, fn, ok).then(reload);
  const isBusy = (id: string) => busy === `${t.id}:${id}`;
  if (t.inputNeeded === "go")
    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12.5px] text-[var(--c-ink-2)]">
          Nothing is {t.kind === "ride" ? "booked" : "ordered"} yet. Going ahead logs in on {t.serviceLabel}: a code comes to the phone of the person who asked.
        </p>
        <div className="flex shrink-0 gap-2">
          <SmallButton dark disabled={isBusy("go")} onClick={() => act("go", () => taskInput(familyId, subjectId, t.id, "go", "yes"), "Going ahead. Logging in.")}>
            Go ahead
          </SmallButton>
          <SmallButton disabled={isBusy("go")} onClick={() => act("go", () => taskInput(familyId, subjectId, t.id, "go", "no"), "Dropped. Nothing was ordered.")}>
            Not now
          </SmallButton>
        </div>
      </div>
    );
  if (t.inputNeeded === "otp")
    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12.5px] text-[var(--c-ink-2)]">
          {t.serviceLabel} sent a login code{r.otp_sent_to ? ` to ${r.otp_sent_to}` : ""}. Type it here or send it to Saheli on WhatsApp.
        </p>
        <div className="flex shrink-0 gap-2">
          <input
            className="h-8 w-28 rounded-full border border-[var(--c-line)] bg-[var(--c-frame)] px-3 text-[13px] tracking-[0.2em] outline-none focus:border-[var(--c-ink-3)]"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={8}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            aria-label="Login code"
          />
          <SmallButton dark disabled={otp.length < 4 || isBusy("otp")} onClick={() => act("otp", () => taskInput(familyId, subjectId, t.id, "otp", otp), "Code sent. Continuing.").then(() => setOtp(""))}>
            Send code
          </SmallButton>
        </div>
      </div>
    );
  if (t.inputNeeded === "choice" && r.options?.length)
    return (
      <ul className="grid gap-2 sm:grid-cols-2">
        {r.options.map((o, i) => (
          <li key={i} className="flex items-center justify-between gap-2 rounded-[14px] bg-[var(--c-frame)] px-3 py-2">
            <span className="text-[13px]">
              <span className="font-medium">{o.type}</span> <span className="c-num">{o.fare}</span>
              {o.eta && <span className="text-[var(--c-ink-2)]"> · {o.eta}</span>}
            </span>
            <SmallButton dark disabled={isBusy("choice")} onClick={() => act("choice", () => taskInput(familyId, subjectId, t.id, "choice", `${o.type} ${o.fare}`), `Booking ${o.type}.`)}>
              Book
            </SmallButton>
          </li>
        ))}
        {r.surge && <li className="text-[12px] text-[var(--c-warn-ink)] sm:col-span-2">Surge pricing is on.</li>}
      </ul>
    );
  if (t.inputNeeded === "fee")
    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12.5px] text-[var(--c-ink-2)]">Cancelling now costs {r.cancel_fee}.</p>
        <div className="flex shrink-0 gap-2">
          <SmallButton disabled={isBusy("fee")} className="text-[var(--c-danger-ink)]" onClick={() => act("fee", () => taskInput(familyId, subjectId, t.id, "fee", "yes"), "Cancelling with the fee.")}>
            Cancel anyway
          </SmallButton>
          <SmallButton dark disabled={isBusy("fee")} onClick={() => act("fee", () => taskInput(familyId, subjectId, t.id, "fee", "no"), "Kept the order.")}>
            Keep it
          </SmallButton>
        </div>
      </div>
    );
  if (t.inputNeeded === "confirm")
    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12.5px] text-[var(--c-ink-2)]">
          {r.total ? (
            <>
              <span className="c-num text-[16px] font-medium text-[var(--c-ink)]">{r.total}</span> cash on delivery{r.fees ? ` (fees ${r.fees})` : ""}
              {r.eta ? ` · arrives in about ${r.eta}` : ""}
            </>
          ) : (
            "Ready to place."
          )}
        </p>
        <div className="flex shrink-0 gap-2">
          <SmallButton dark disabled={isBusy("confirm")} onClick={() => act("confirm", () => taskInput(familyId, subjectId, t.id, "confirm", "yes"), "Confirmed. Placing it now.")}>
            Confirm
          </SmallButton>
          <SmallButton disabled={isBusy("confirm")} onClick={() => act("confirm", () => taskInput(familyId, subjectId, t.id, "confirm", "no"), "Declined. Nothing was placed.")}>
            Decline
          </SmallButton>
        </div>
      </div>
    );
  if (t.inputNeeded === "approve") {
    const ap = t.details?.approval_needed;
    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12.5px] text-[var(--c-ink-2)]">
          Needs a family approver&apos;s yes{ap?.reasons?.length ? `: ${ap.reasons.join("; ")}` : ""}. Nothing is placed until then.
        </p>
        <div className="flex shrink-0 gap-2">
          <SmallButton dark disabled={isBusy("approve")} onClick={() => act("approve", () => taskInput(familyId, subjectId, t.id, "approve", "yes"), "Approved. Going ahead.")}>
            Approve
          </SmallButton>
          <SmallButton disabled={isBusy("approve")} onClick={() => act("approve", () => taskInput(familyId, subjectId, t.id, "approve", "no"), "Declined. Nothing was placed.")}>
            Decline
          </SmallButton>
        </div>
      </div>
    );
  }
  if (t.inputNeeded === "later")
    return (
      <p className="text-[12.5px] text-[var(--c-ink-2)]">
        Set for {hhmm(t.details?.later?.at) || "later"}: Saheli asked on WhatsApp for the most to pay, so she can {t.kind === "ride" ? "book" : "order"} it at the time
        without asking again. Answer her there.
      </p>
    );
  if (t.inputNeeded === "fare")
    return (
      <p className="text-[12.5px] text-[var(--c-ink-2)]">
        It now costs {t.details?.later?.asked?.amount || "more"}, above the ₹{Math.round(t.details?.later?.max || 0)} agreed. Saheli asked on WhatsApp whether to go ahead.
      </p>
    );
  if (t.inputNeeded === "swap")
    return <p className="text-[12.5px] text-[var(--c-ink-2)]">The store doesn&apos;t have one item; Saheli asked on WhatsApp which of its other options to take.</p>;
  return <p className="text-[12.5px] text-[var(--c-ink-2)]">Waiting for an answer on WhatsApp.</p>;
}

/** Stores looked up together: the options cheapest first, one tap picks a store (Order Engineer's compare flow). */
function CompareCard({ tasks, busy, familyId, subjectId, run, reload }: { tasks: CareTask[]; busy: string | null; familyId: string; subjectId: string; run: Run; reload: () => void }) {
  const first = tasks[0];
  const looking = tasks.filter((t) => t.status === "queued" || t.status === "running");
  const open = tasks.filter((t) => t.status === "awaiting_confirm" && t.inputNeeded === "go");
  const options = open
    .flatMap((t) => (t.result.items ?? []).filter((i) => i.name && i.available !== false).map((item) => ({ task: t, item })))
    .sort((a, b) => (rupees(a.item.price) ?? Infinity) - (rupees(b.item.price) ?? Infinity));
  const loginOnly = open.filter((t) => !(t.result.items ?? []).some((i) => i.name && i.available !== false));
  const others = tasks.filter((t) => !looking.includes(t) && !open.includes(t));
  const login = open.find((t) => t.details.login && t.details.login !== "none")?.details.login;
  const act = (id: string, fn: () => Promise<unknown>, ok: string) => run(`${first.details.compare}:${id}`, fn, ok).then(reload);
  const anyBusy = typeof busy === "string" && busy.startsWith(`${first.details.compare}:`);
  return (
    <section className="rounded-[22px] bg-[var(--c-accent-wash)] p-4 shadow-[inset_0_0_0_1px_var(--c-accent-soft)] sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex shrink-0 -space-x-2">
          {tasks.slice(0, 3).map((t) => (
            <ServiceLogo key={t.id} service={t.service} label={t.serviceLabel} size={34} className="ring-2 ring-[var(--c-accent-wash)]" />
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium leading-snug">{first.goal}</p>
          <p className="mt-0.5 text-[12px] text-[var(--c-ink-2)]">
            Compared on {tasks.map((t) => t.serviceLabel).join(", ")} · {when(first.createdAt)} · nothing ordered yet
          </p>
        </div>
        <Tag tone={looking.length ? "light" : "accent"}>{looking.length ? "Looking" : "Pick one"}</Tag>
      </div>
      {options.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {options.map(({ task: t, item }, n) => (
            <li key={`${t.id}:${item.name}`} className="flex flex-wrap items-center gap-3 rounded-[14px] bg-[var(--c-frame)] px-3 py-2.5">
              <ServiceLogo service={t.service} label={t.serviceLabel} size={28} />
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium">
                  {item.name}
                  {n === 0 && options.length > 1 && (
                    <span className="ml-2 align-middle">
                      <Tag>Lowest price</Tag>
                    </span>
                  )}
                </span>
                <span className="block text-[11.5px] text-[var(--c-ink-2)]">
                  {t.serviceLabel}
                  {t.result.eta ? ` · about ${t.result.eta}` : ""}
                </span>
              </span>
              <span className="c-num text-[14px] font-medium">{item.price ?? ""}</span>
              <SmallButton dark disabled={anyBusy} onClick={() => act("go", () => taskInput(familyId, subjectId, t.id, "go", item.name), `Getting it from ${t.serviceLabel}. Logging in.`)}>
                Get this
              </SmallButton>
            </li>
          ))}
        </ul>
      )}
      {(looking.length > 0 || loginOnly.length > 0 || others.length > 0) && (
        <ul className="mt-3 space-y-1.5 text-[12px] text-[var(--c-ink-2)]">
          {looking.map((t) => (
            <li key={t.id} className="flex items-center gap-2">
              <SpinnerGap size={13} className="animate-spin" aria-hidden /> {t.serviceLabel}: still looking
            </li>
          ))}
          {loginOnly.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-2">
              {t.serviceLabel} shows prices only after a login.
              <SmallButton disabled={anyBusy} onClick={() => act("go", () => taskInput(familyId, subjectId, t.id, "go", "yes"), `Logging in on ${t.serviceLabel} to look.`)}>
                Look after login
              </SmallButton>
            </li>
          ))}
          {others.map((t) => (
            <li key={t.id} className="text-[var(--c-ink-3)]">
              {t.details.compare_note ? t.details.compare_note.split(/; |\. /)[0] : `${t.serviceLabel}: ${t.result.problem || "not available"}`}
            </li>
          ))}
        </ul>
      )}
      {open.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--c-line)] pt-3">
          <p className="text-[11.5px] text-[var(--c-ink-3)]">
            Picking one logs in on that store{login ? `: a code comes to the phone ending ${login}` : ""}. Nothing is placed without a confirm.
          </p>
          <SmallButton disabled={anyBusy} onClick={() => act("none", () => taskInput(familyId, subjectId, open[0].id, "go", "no"), "Dropped on every store. Nothing was ordered.")}>
            None of these
          </SmallButton>
        </div>
      )}
    </section>
  );
}

/** Everything about one order or ride: items, total, ids, the steps it went through, and cancel while it runs. */
function TaskDrawer({
  task: t,
  onClose,
  busy,
  familyId,
  subjectId,
  run,
  reload,
}: {
  task: CareTask | null;
  onClose: () => void;
  busy: string | null;
  familyId: string | null;
  subjectId: string | null;
  run: Run;
  reload: () => void;
}) {
  const r = t?.result ?? {};
  const items = r.items ?? t?.details.items ?? [];
  const live = !!t && LIVE.has(t.status);
  return (
    <SideDrawer
      open={!!t}
      onClose={onClose}
      top={t?.serviceLabel ?? ""}
      bottom={t?.kind === "ride" ? "Ride" : "Order"}
      label={t ? `${t.serviceLabel}: ${t.goal}` : "Order"}
      footer={
        (live || t?.status === "scheduled") && t && familyId && subjectId && !t.cancelRequested ? (
          <SmallButton
            icon={X}
            className="text-[var(--c-danger-ink)]"
            disabled={busy === `${t.id}:cancel`}
            onClick={() => {
              if (!window.confirm(`Cancel this ${t.kind}?`)) return;
              void run(`${t.id}:cancel`, () => cancelTask(familyId, subjectId, t.id), "Cancel requested.").then(reload);
            }}
          >
            Cancel {t.kind}
          </SmallButton>
        ) : undefined
      }
    >
      {t && (
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <ServiceLogo service={t.service} label={t.serviceLabel} size={48} />
            <div className="min-w-0">
              <p className="text-[16px] font-medium leading-snug">{t.goal}</p>
              <p className="mt-1 text-[12px] text-[var(--c-ink-2)]">Asked {when(t.createdAt)}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Tag tone={statusOf(t.status).tone}>{statusOf(t.status).label}</Tag>
                {flags(t).map((f) => (
                  <Tag key={f.label} tone={f.tone}>
                    {f.label}
                  </Tag>
                ))}
                {live && <Steps task={t} />}
              </div>
              {laterLine(t) && <p className="mt-2 text-[12.5px] text-[var(--c-ink-2)]">{laterLine(t)}</p>}
            </div>
          </div>

          {t.kind === "ride" && (t.details.pickup || t.details.drop) && (
            <div className="rounded-[16px] bg-[var(--c-card)] p-3.5 text-[13px]">
              <p className="flex items-start gap-2">
                <Circle size={12} weight="fill" className="mt-1 shrink-0 text-[var(--c-solid)]" aria-hidden />
                {t.details.pickup}
              </p>
              <p className="mt-2 flex items-start gap-2">
                <Circle size={12} weight="fill" className="mt-1 shrink-0 text-[var(--c-accent)]" aria-hidden />
                {t.details.drop}
              </p>
              {(r.ride_id || r.driver) && (
                <p className="mt-3 text-[12px] text-[var(--c-ink-2)]">
                  Ride {r.ride_id}
                  {r.driver ? ` · ${r.driver}` : ""}
                </p>
              )}
            </div>
          )}

          {t.kind === "order" && items.length > 0 && (
            <div className="rounded-[16px] bg-[var(--c-card)] p-3.5">
              <ul className="space-y-1.5 text-[13px]">
                {items.map((i, n) => (
                  <li key={n} className="flex justify-between gap-3">
                    <span>
                      {i.qty ?? 1} × {i.name}
                      {i.available === false && <span className="ml-1 text-[var(--c-danger-ink)]">(unavailable)</span>}
                    </span>
                    <span className="c-num shrink-0">{i.price ?? ""}</span>
                  </li>
                ))}
              </ul>
              {r.total && (
                <p className="mt-3 flex justify-between border-t border-[var(--c-line)] pt-2.5 text-[14px] font-medium">
                  <span>Total, cash on delivery{r.fees ? ` (fees ${r.fees})` : ""}</span>
                  <span className="c-num">{r.total}</span>
                </p>
              )}
              {r.alternatives?.length ? <p className="mt-2 text-[11.5px] text-[var(--c-ink-2)]">Alternatives: {r.alternatives.join("; ")}</p> : null}
            </div>
          )}

          {(r.order_id || r.eta || r.problem) && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[12.5px]">
              {r.order_id && (
                <>
                  <dt className="text-[var(--c-ink-2)]">Order id</dt>
                  <dd className="c-num">{r.order_id}</dd>
                </>
              )}
              {r.eta && (
                <>
                  <dt className="text-[var(--c-ink-2)]">Arrives</dt>
                  <dd>about {r.eta}</dd>
                </>
              )}
              {r.problem && (
                <>
                  <dt className="text-[var(--c-ink-2)]">What happened</dt>
                  <dd className="text-[var(--c-danger-ink)]">{r.problem}</dd>
                </>
              )}
            </dl>
          )}

          {live && t.inputNeeded && familyId && subjectId && (
            <div className="rounded-[16px] bg-[var(--c-accent-wash)] p-3.5">
              <Decision task={t} busy={busy} familyId={familyId} subjectId={subjectId} run={run} reload={reload} />
            </div>
          )}

          {t.history.length > 0 && (
            <div>
              <p className="text-[11.5px] font-medium uppercase tracking-[0.08em] text-[var(--c-ink-3)]">What happened, step by step</p>
              <ol className="mt-2 space-y-2">
                {t.history.map((h, i) => (
                  <li key={i} className="flex gap-3 text-[12.5px]">
                    <span className="c-num w-12 shrink-0 text-[var(--c-ink-3)]">
                      {new Date(h.at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: IST })}
                    </span>
                    <span className="flex min-w-0 gap-2">
                      {i === t.history.length - 1 && !live ? (
                        <CheckCircle size={14} weight="fill" className="mt-0.5 shrink-0 text-[var(--c-ok-ink)]" aria-hidden />
                      ) : (
                        <Clock size={14} className="mt-0.5 shrink-0 text-[var(--c-ink-3)]" aria-hidden />
                      )}
                      <span>{h.note}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          <p className="flex items-center gap-1.5 text-[11.5px] text-[var(--c-ink-3)]">
            {t.kind === "ride" ? <Car size={13} aria-hidden /> : <ShoppingBag size={13} aria-hidden />}
            On the family&apos;s own {t.serviceLabel} account · cash on delivery
          </p>
        </div>
      )}
    </SideDrawer>
  );
}
