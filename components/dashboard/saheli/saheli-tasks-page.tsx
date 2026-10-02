"use client";

import { Car, ExternalLink, Loader2, ShoppingBag, X } from "lucide-react";
import { useState } from "react";
import { cancelTask, taskInput, taskLiveUrl, type CareTask } from "@/lib/care-memory-api";
import { cn } from "@/lib/utils";
import { AccessGate, CenteredState, PageSpinner, formatIstDateTime, formatIstTime, useRecipientSelection } from "../activity/activity-shared";
import { Banner, SaheliHeader, btnDanger, btnPrimary, btnSecondary, useAction, useCareOverview } from "./saheli-shared";

const LIVE = new Set(["queued", "running", "needs_input", "awaiting_confirm"]);

const STATUS: Record<CareTask["status"], { label: string; pill: string }> = {
  queued: { label: "Starting", pill: "status-pill-pending" },
  running: { label: "Working", pill: "status-pill-pending" },
  needs_input: { label: "Needs input", pill: "status-pill-pending" },
  awaiting_confirm: { label: "Waiting for confirm", pill: "status-pill-pending" },
  done: { label: "Done", pill: "status-pill-success" },
  failed: { label: "Failed", pill: "status-pill-rejected" },
  cancelled: { label: "Cancelled", pill: "status-pill-rejected" },
};

const PHASE: Record<CareTask["phase"], string> = {
  prepare: "building the cart / finding fares",
  otp: "logging in",
  place: "placing",
  cancel: "cancelling on the service",
};

export function SaheliTasksPage() {
  const sel = useRecipientSelection();
  const { familyId, selectedId } = sel;
  const { data, error, loading, reload } = useCareOverview(familyId, selectedId, undefined, 10_000);
  const { busy, banner, run } = useAction();
  const tasks = data?.tasks ?? [];
  const live = tasks.filter((t) => LIVE.has(t.status));
  const past = tasks.filter((t) => !LIVE.has(t.status));

  return (
    <AccessGate
      familyId={sel.familyId}
      loading={sel.loading}
      isCaregiver={sel.isCaregiver}
      isRecipient={sel.isRecipient}
      recipients={sel.recipients}
      error={sel.error}
    >
      <div className="space-y-4">
        <SaheliHeader
          recipients={sel.recipients}
          selectedId={selectedId}
          onSelect={sel.select}
          title={(n) => `Orders & rides for ${n}`}
          subtitle="Saheli runs these on the family's own accounts, cash on delivery only. Nothing is placed without a yes. Updates every 10 seconds."
          badges={{ "/dashboard/saheli/tasks": live.length }}
        />
        <Banner banner={banner} />
        {loading && !data ? (
          <PageSpinner />
        ) : error && !data ? (
          <div className="panel-card">
            <CenteredState tone="error" title="Couldn't load orders and rides" body={error} />
          </div>
        ) : tasks.length === 0 ? (
          <div className="panel-card">
            <CenteredState title="No orders or rides yet" body="When someone asks Saheli on WhatsApp to order or book something, it shows up here." />
          </div>
        ) : (
          <>
            {live.map((t) => (
              <TaskCard key={t.id} task={t} busy={busy} familyId={familyId!} subjectId={selectedId!} run={run} reload={reload} />
            ))}
            {past.length > 0 && (
              <section className="panel-card p-5">
                <h2 className="text-[14px] font-extrabold text-[var(--text-primary)]">Earlier</h2>
                <ul className="mt-3 divide-y divide-[var(--border)]">
                  {past.map((t) => (
                    <li key={t.id} className="py-2.5">
                      <PastRow task={t} />
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </AccessGate>
  );
}

function TaskCard({
  task: t,
  busy,
  familyId,
  subjectId,
  run,
  reload,
}: {
  task: CareTask;
  busy: string | null;
  familyId: string;
  subjectId: string;
  run: (id: string, fn: () => Promise<unknown>, ok?: string) => Promise<boolean>;
  reload: () => void;
}) {
  const [otp, setOtp] = useState("");
  const r = t.result ?? {};
  const Icon = t.kind === "ride" ? Car : ShoppingBag;
  const items = r.items ?? t.details.items ?? [];
  const act = (id: string, fn: () => Promise<unknown>, ok: string) => run(`${t.id}:${id}`, fn, ok).then(reload);
  const isBusy = (id: string) => busy === `${t.id}:${id}`;

  return (
    <section className="panel-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="icon-chip-blue flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h2 className="break-words text-[14px] font-extrabold text-[var(--text-primary)]">
              {t.serviceLabel} · {t.goal}
            </h2>
            <p className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">
              Started {formatIstDateTime(t.createdAt)} · {t.status === "running" || t.status === "queued" ? PHASE[t.phase] : STATUS[t.status].label}
              {t.cancelRequested ? " · cancel requested" : ""}
            </p>
          </div>
        </div>
        <span className={cn(STATUS[t.status].pill, "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold")}>
          {(t.status === "running" || t.status === "queued") && <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />}
          {STATUS[t.status].label}
        </span>
      </div>

      {t.kind === "ride" ? (
        <div className="mt-3 text-[12px] text-[var(--text-secondary)]">
          {t.details.pickup} → {t.details.drop}
          {r.options?.length ? (
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {r.options.map((o, i) => (
                <li key={i} className="flex items-center justify-between rounded-2xl bg-[var(--surface)] px-3 py-2">
                  <span className="font-bold text-[var(--text-primary)]">
                    {o.type} {o.fare} <span className="font-normal text-[var(--text-tertiary)]">· {o.eta}</span>
                  </span>
                  {t.inputNeeded === "choice" && (
                    <button
                      className={btnPrimary}
                      disabled={isBusy("choice")}
                      onClick={() => act("choice", () => taskInput(familyId, subjectId, t.id, "choice", `${o.type} ${o.fare}`), `Booking ${o.type}.`)}
                    >
                      Book
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
          {r.surge && <p className="alert-warning mt-2">Surge pricing is on.</p>}
          {r.ride_id && (
            <p className="mt-2">
              Ride {r.ride_id}
              {r.driver ? ` · ${r.driver}` : ""}
            </p>
          )}
        </div>
      ) : (
        items.length > 0 && (
          <div className="mt-3">
            <ul className="space-y-1 text-[12px]">
              {items.map((i, n) => (
                <li key={n} className="flex justify-between gap-2 text-[var(--text-secondary)]">
                  <span>
                    {i.qty ?? 1} × {i.name}
                    {i.available === false && <span className="ml-1 text-[var(--danger-text)]">(unavailable)</span>}
                  </span>
                  <span className="font-semibold text-[var(--text-primary)]">{i.price ?? ""}</span>
                </li>
              ))}
            </ul>
            {r.total && (
              <p className="mt-2 flex justify-between border-t border-[var(--border)] pt-2 text-[13px] font-extrabold text-[var(--text-primary)]">
                <span>Total (cash on delivery){r.fees ? ` · fees ${r.fees}` : ""}</span>
                <span>{r.total}</span>
              </p>
            )}
            {r.alternatives?.length ? <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">Alternatives: {r.alternatives.join("; ")}</p> : null}
          </div>
        )
      )}

      {t.inputNeeded === "otp" && (
        <div className="mt-4 rounded-2xl bg-[var(--surface)] p-3">
          <p className="text-[12px] font-semibold text-[var(--text-primary)]">
            {t.serviceLabel} sent a login code{r.otp_sent_to ? ` to ${r.otp_sent_to}` : ""}. Enter it here or send it to Saheli on WhatsApp.
          </p>
          <div className="mt-2 flex gap-2">
            <input
              className="theme-field w-32"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={8}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              aria-label="Login code"
            />
            <button
              className={btnPrimary}
              disabled={otp.length < 4 || isBusy("otp")}
              onClick={() => act("otp", () => taskInput(familyId, subjectId, t.id, "otp", otp), "Code sent. Continuing.").then(() => setOtp(""))}
            >
              Submit code
            </button>
          </div>
        </div>
      )}

      {t.inputNeeded === "fee" && (
        <div className="alert-warning mt-4">
          Cancelling now costs {r.cancel_fee}.
          <div className="mt-2 flex gap-2">
            <button className={btnDanger} disabled={isBusy("fee")} onClick={() => act("fee", () => taskInput(familyId, subjectId, t.id, "fee", "yes"), "Cancelling with the fee.")}>
              Cancel anyway
            </button>
            <button className={btnSecondary} disabled={isBusy("fee")} onClick={() => act("fee", () => taskInput(familyId, subjectId, t.id, "fee", "no"), "Kept the order.")}>
              Keep it
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {t.inputNeeded === "confirm" && (
          <>
            <button
              className={btnPrimary}
              disabled={isBusy("confirm")}
              onClick={() => act("confirm", () => taskInput(familyId, subjectId, t.id, "confirm", "yes"), "Confirmed. Placing it now.")}
            >
              {isBusy("confirm") && <Loader2 className="h-3 w-3 animate-spin" />} Confirm {r.total ? `(${r.total})` : ""}
            </button>
            <button className={btnSecondary} disabled={isBusy("confirm")} onClick={() => act("confirm", () => taskInput(familyId, subjectId, t.id, "confirm", "no"), "Declined. Nothing was placed.")}>
              Decline
            </button>
          </>
        )}
        {t.hasLiveView && (t.status === "running" || t.status === "needs_input") && (
          <button
            className={btnSecondary}
            disabled={isBusy("live")}
            onClick={() =>
              run(`${t.id}:live`, async () => {
                const url = await taskLiveUrl(familyId, subjectId, t.id);
                if (!url) throw new Error("The live view is not available right now.");
                window.open(url, "_blank", "noopener,noreferrer");
              })
            }
          >
            <ExternalLink className="h-3.5 w-3.5" /> Watch live
          </button>
        )}
        {!t.cancelRequested && (
          <button
            className={btnDanger}
            disabled={isBusy("cancel")}
            onClick={() => {
              if (!window.confirm(`Cancel this ${t.kind}?`)) return;
              void act("cancel", () => cancelTask(familyId, subjectId, t.id), "Cancel requested.");
            }}
          >
            <X className="h-3.5 w-3.5" /> Cancel
          </button>
        )}
      </div>

      {t.history.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-[11px] font-bold text-[var(--text-tertiary)]">Steps ({t.history.length})</summary>
          <ol className="mt-2 space-y-1">
            {t.history.map((h, i) => (
              <li key={i} className="text-[11px] text-[var(--text-secondary)]">
                <span className="text-[var(--text-tertiary)]">{formatIstTime(h.at)}</span> · {h.note}
              </li>
            ))}
          </ol>
        </details>
      )}
    </section>
  );
}

function PastRow({ task: t }: { task: CareTask }) {
  const r = t.result ?? {};
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="break-words text-[12px] font-semibold text-[var(--text-primary)]">
          {t.serviceLabel} · {t.goal}
        </p>
        <p className="text-[11px] text-[var(--text-tertiary)]">
          {formatIstDateTime(t.createdAt)}
          {r.order_id || r.ride_id ? ` · ${r.order_id || r.ride_id}` : ""}
          {r.total ? ` · ${r.total}` : ""}
          {t.status === "failed" && r.problem ? ` · ${r.problem}` : ""}
        </p>
      </div>
      <span className={cn(STATUS[t.status].pill, "w-fit shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold")}>{STATUS[t.status].label}</span>
    </div>
  );
}
