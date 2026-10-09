"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useFamily } from "@/components/dashboard/family-context";
import { getBoundaries, saveBoundaries, type BoundaryPolicy, type Boundaries } from "@/lib/care-features-api";
import { taskInput } from "@/lib/care-memory-api";
import { cn } from "@/lib/utils";
import { ErrorNote, OnWhatsApp, PageHeading, ago, parseIst, rupees } from "./feature-kit";
import { callName, usePerson } from "./person-context";
import { Avatar, DarkButton, Panel, PanelTitle, SmallButton, Tag } from "./ui";

const CATEGORIES: Array<{ id: BoundaryPolicy["approval_categories"][number]; label: string; stores: string }> = [
  { id: "grocery", label: "Groceries", stores: "Blinkit, Instamart, Zepto" },
  { id: "food", label: "Food", stores: "Swiggy, Zomato" },
  { id: "pharmacy", label: "Medicines", stores: "Apollo, 1mg, PharmEasy" },
  { id: "ride", label: "Rides", stores: "Uber, Ola, Rapido" },
];

function Toggle({ on, onChange, disabled, label }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={cn("relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors disabled:opacity-50", on ? "bg-[var(--c-solid)]" : "bg-[var(--c-ink-3)]")}
    >
      <span className={cn("absolute top-[3px] h-4 w-4 rounded-full bg-white transition-all", on ? "left-[19px]" : "left-[3px]")} />
    </button>
  );
}

function Money({ value, onChange, disabled, placeholder, label }: { value: number | null; onChange: (v: number | null) => void; disabled?: boolean; placeholder?: string; label: string }) {
  return (
    <label className="flex h-10 w-[128px] shrink-0 items-center gap-1 rounded-[12px] border border-[var(--c-line)] bg-[var(--c-frame)] px-3 text-[14px] font-medium">
      <span className="text-[var(--c-ink-3)]">₹</span>
      <input
        aria-label={label}
        inputMode="numeric"
        disabled={disabled}
        placeholder={placeholder ?? "off"}
        value={value ?? ""}
        onChange={(e) => {
          const t = e.target.value.replace(/[^\d]/g, "");
          onChange(t ? Number(t) : null);
        }}
        className="w-full bg-transparent text-right outline-none placeholder:font-normal placeholder:text-[var(--c-ink-3)] disabled:opacity-60"
      />
    </label>
  );
}

function Row({ title, meta, children }: { title: string; meta?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-[var(--c-line)] py-3 first:border-t-0">
      <div className="min-w-0">
        <p className="text-[13.5px] font-medium">{title}</p>
        {meta && <div className="mt-0.5 text-[12px] text-[var(--c-ink-2)]">{meta}</div>}
      </div>
      {children}
    </div>
  );
}

export function LimitsPage() {
  const { userId } = useFamily();
  const { familyId, selectedId, members, people, me } = usePerson();
  const myId = userId ?? me.id;
  const person = people.find((p) => p.id === selectedId) ?? null;
  const who = callName(person);
  const [data, setData] = useState<Boundaries | null>(null);
  const [draft, setDraft] = useState<BoundaryPolicy | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  const load = useCallback(async () => {
    if (!familyId || !selectedId) return;
    try {
      const d = await getBoundaries(familyId, selectedId);
      setData(d);
      setDraft(d.policy);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load the limits");
    }
  }, [familyId, selectedId]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  const canEdit = !!data && !!myId && data.approvers.some((a) => a.id === myId);
  const dirty = useMemo(() => !!data && !!draft && JSON.stringify(data.policy) !== JSON.stringify(draft), [data, draft]);
  const set = (patch: Partial<BoundaryPolicy>) => {
    setSaved(false);
    setDraft((d) => (d ? { ...d, ...patch } : d));
  };
  const nameOf = (id: string) => data?.members.find((m) => m.id === id)?.name ?? members.find((m) => m.userId === id)?.name ?? "Family member";
  const avatarOf = (id: string) => members.find((m) => m.userId === id)?.avatarUrl ?? null;

  async function save() {
    if (!familyId || !selectedId || !draft || !data) return;
    setSaving(true);
    try {
      const changes: Partial<BoundaryPolicy> = {};
      (Object.keys(draft) as Array<keyof BoundaryPolicy>).forEach((k) => {
        if (JSON.stringify(draft[k]) !== JSON.stringify(data.policy[k])) (changes as Record<string, unknown>)[k] = draft[k] ?? 0;
      });
      await saveBoundaries(familyId, selectedId, changes);
      await load();
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  async function decide(taskId: string, yes: boolean) {
    if (!familyId || !selectedId) return;
    setBusy(taskId);
    try {
      await taskInput(familyId, selectedId, taskId, "approve", yes ? "yes" : "no");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send your answer");
    } finally {
      setBusy(null);
    }
  }

  const spent = data?.monthSpent ?? 0;
  const cap = draft?.monthly_cap ?? null;

  return (
    <div className="space-y-5">
      <PageHeading
        light="Limits"
        dark="& approvals"
        sub={`What Saheli may do on her own for ${who}, and when she must ask first. Checked in code on every order and ride.`}
        right={
          canEdit ? (
            <DarkButton onClick={() => void save()} disabled={!dirty || saving}>
              {saving ? "Saving…" : saved && !dirty ? "Saved" : "Save changes"}
            </DarkButton>
          ) : data ? (
            <Tag tone="light">Only {data.approvers.map((a) => a.name.split(" ")[0]).join(", ") || "the approver"} can change these</Tag>
          ) : null
        }
      />
      {error && <ErrorNote>{error}</ErrorNote>}

      {!!data?.waiting.length && (
        <Panel className="border border-[var(--c-accent-soft)] bg-[var(--c-accent-wash)]">
          <PanelTitle title="Waiting for approval" />
          <div className="mt-3">
            {data.waiting.map((w) => (
              <Row
                key={w.taskId}
                title={`${w.title}${typeof w.amount === "number" ? ` · ${rupees(w.amount)}` : ""}`}
                meta={[w.asked_by ? `Asked by ${nameOf(w.asked_by)}` : null, w.asked_at ? ago(parseIst(w.asked_at), now) : null, (w.reasons ?? []).join("; ")]
                  .filter(Boolean)
                  .join(" · ")}
              >
                {myId && (w.approvers ?? []).includes(myId) ? (
                  <div className="flex shrink-0 gap-2">
                    <SmallButton disabled={busy === w.taskId} onClick={() => void decide(w.taskId, false)}>
                      Decline
                    </SmallButton>
                    <SmallButton disabled={busy === w.taskId} onClick={() => void decide(w.taskId, true)} className="border-transparent bg-[var(--c-accent)] text-[var(--c-accent-ink)] hover:bg-[var(--c-accent)] hover:opacity-90">
                      Approve
                    </SmallButton>
                  </div>
                ) : (
                  <Tag tone="light">Waiting for {(w.approvers ?? []).map((a) => nameOf(a).split(" ")[0]).join(", ")}</Tag>
                )}
              </Row>
            ))}
          </div>
        </Panel>
      )}

      {draft && data && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel>
            <PanelTitle title="Spend limits" />
            <div className="mt-3">
              <Row title={`${who}'s own orders`} meta="Above this, Saheli asks the approver">
                <Money label="Own orders limit" value={draft.elder_order_limit} disabled={!canEdit} placeholder="1500" onChange={(v) => set({ elder_order_limit: v ?? 0 })} />
              </Row>
              <Row title={`${who}'s own rides`} meta="Cab, auto or bike booked by them">
                <Money label="Own rides limit" value={draft.elder_ride_limit} disabled={!canEdit} placeholder="800" onChange={(v) => set({ elder_ride_limit: v ?? 0 })} />
              </Row>
              <Row title="Anyone, any order" meta="Whoever asks, above this needs approval">
                <Money label="Anyone limit" value={draft.anyone_over} disabled={!canEdit} onChange={(v) => set({ anyone_over: v })} />
              </Row>
              <Row
                title="Monthly limit"
                meta={
                  <>
                    <span>Placed this month: {rupees(spent)}{cap ? ` of ${rupees(cap)}` : ""}</span>
                    {cap ? (
                      <span className="mt-1.5 block h-2 w-[220px] overflow-hidden rounded-full bg-[var(--c-line)]">
                        <span className="block h-full bg-[var(--c-solid)]" style={{ width: `${Math.min(100, Math.round((spent / cap) * 100))}%` }} />
                      </span>
                    ) : null}
                  </>
                }
              >
                <Money label="Monthly limit" value={draft.monthly_cap} disabled={!canEdit} onChange={(v) => set({ monthly_cap: v })} />
              </Row>
            </div>
          </Panel>

          <Panel>
            <PanelTitle title="Always ask first for" />
            <div className="mt-3">
              {CATEGORIES.map((c) => {
                const on = draft.approval_categories.includes(c.id);
                return (
                  <Row key={c.id} title={c.label} meta={c.stores}>
                    <Toggle
                      label={`Always ask for ${c.label}`}
                      on={on}
                      disabled={!canEdit}
                      onChange={(v) => set({ approval_categories: v ? [...draft.approval_categories, c.id] : draft.approval_categories.filter((x) => x !== c.id) })}
                    />
                  </Row>
                );
              })}
            </div>
          </Panel>

          <Panel>
            <PanelTitle title="Who may order on their own" />
            <div className="mt-3">
              {data.members.map((m) => {
                const rule = draft.members[m.id] ?? { can_order: true, can_ride: true };
                const approver = data.approvers.some((a) => a.id === m.id);
                const elder = /elder|recipient/i.test(m.role ?? "");
                return (
                  <div key={m.id} className="flex items-center justify-between gap-4 border-t border-[var(--c-line)] py-3 first:border-t-0">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={m.name} src={avatarOf(m.id)} size={30} />
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-medium">{m.name}</p>
                        <p className="text-[12px] text-[var(--c-ink-2)]">
                          {elder ? "Care recipient · within their limits" : approver ? `${m.role ?? "Caregiver"} · approver` : m.role ?? "Family"}
                        </p>
                      </div>
                    </div>
                    {approver ? (
                      <Tag tone="ok">Approver</Tag>
                    ) : (
                      <div className="flex shrink-0 items-center gap-4 text-[12px] text-[var(--c-ink-2)]">
                        <span className="flex items-center gap-2">
                          Orders
                          <Toggle label={`${m.name} may order`} on={rule.can_order} disabled={!canEdit} onChange={(v) => set({ members: { ...draft.members, [m.id]: { ...rule, can_order: v } } })} />
                        </span>
                        <span className="flex items-center gap-2">
                          Rides
                          <Toggle label={`${m.name} may book rides`} on={rule.can_ride} disabled={!canEdit} onChange={(v) => set({ members: { ...draft.members, [m.id]: { ...rule, can_ride: v } } })} />
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel>
            <PanelTitle title="How it works" />
            <p className="mt-3 text-[13px] leading-relaxed text-[var(--c-ink-2)]">
              Saheli always shows the price and waits for a yes. If an order is outside these limits she sends it to the approver on WhatsApp first;
              nothing is placed until they say yes. Every change here is saved with who changed it and can be undone.
            </p>
            <OnWhatsApp className="mt-4">“Maa ke orders ki limit 500 kar do” or “food orders pe pehle mujhse poochna”.</OnWhatsApp>
          </Panel>
        </div>
      )}
    </div>
  );
}
