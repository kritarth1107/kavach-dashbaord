"use client";

import {
  ArrowCounterClockwise,
  ArrowUUpLeft,
  ChatsCircle,
  ClockCounterClockwise,
  FirstAidKit,
  HandHeart,
  Notebook,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getMemoryHistory,
  getMemoryUndoPreview,
  undoMemoryChange,
  type MemoryChange,
  type UndoPreview,
  type UndoResult,
} from "@/lib/care-features-api";
import { cn } from "@/lib/utils";
import { INPUT, Notice, SideDrawer, WhatsAppHint } from "./care-kit";
import { Panel, PanelTitle, SmallButton, Tag } from "./ui";

const HEALTH = new Set(["medicine", "allergy", "condition", "vital_target"]);
const STATUS_WORD: Record<string, string> = {
  active: "in use",
  superseded: "replaced",
  stopped: "stopped",
  pending: "waiting for OK",
  retracted: "taken back",
  proposed: "suggested",
  blocked: "removed",
  archived: "set aside",
  stale: "not used lately",
};
const KIND_ICON: Record<MemoryChange["kind"], PhosphorIcon> = { note: Notebook, fact: FirstAidKit, skill: HandHeart, style: ChatsCircle };
const OP_WORD: Record<string, string> = {
  write: "Saved",
  baseline: "Before history",
  forget: "Forgotten",
  restore: "Put back",
  undo: "Undone",
  snapshot: "From backup",
  pending: "Proposed",
  stop: "Stopped",
  approve: "Approved",
  reject: "Rejected",
  remove: "Removed",
  archive: "Set aside",
};

/** subjectId: the person whose page this is (the URL); owner: whose item it is (that person, or "family" for shared notes). */
export type HistoryItem = { kind: MemoryChange["kind"]; target: string; subjectId: string; owner: string; label: string };

function at(ts: string) {
  return new Date(ts).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function day(iso: string) {
  return new Date(`${iso}T12:00:00+05:30`).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" });
}

/** "- 2026-09-28: asked for poha" → "asked for poha · 28 Sept" (as on the note cards). */
function lineText(l: string) {
  const t = l.replace(/^[-*]\s*/, "");
  const m = t.match(/^(\d{4}-\d{2}-\d{2}):\s*(.*)$/);
  return m ? `${m[2]} · ${day(m[1])}` : t;
}

function isHealth(c: MemoryChange) {
  return c.kind === "fact" && HEALTH.has(c.title);
}

function resultText(c: MemoryChange, r: UndoResult, mode: "undo" | "restore") {
  const did = mode === "undo" ? "Undone" : "Put back";
  if (r.result === "nothing") return `Nothing to change: ${r.why ?? "it already reads like that"}.`;
  if (r.result === "pending") return "Saved as a change waiting for confirmation (it came from a prescription or a stronger source). Confirm it in Approvals.";
  if (r.result === "stopped" && c.title === "medicine") return `${did}. The medicine is off the record and its reminders are switched off.`;
  if (c.title === "medicine" && (r.result === "superseded" || r.result === "created")) return `${did}. Reminders follow the record.`;
  if (r.result === "retracted") return "Taken back. The record stays as it was.";
  return `${did}.`;
}

/** Undo / put back with a confirm step that first says exactly what will happen (from the engine's dry run). */
function ActionRow({
  change,
  mode,
  familyId,
  subjectId,
  onDone,
  onCancel,
}: {
  change: MemoryChange;
  mode: "undo" | "restore";
  familyId: string;
  subjectId: string;
  onDone: (msg: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [preview, setPreview] = useState<UndoPreview | null>(null);

  useEffect(() => {
    let live = true;
    getMemoryUndoPreview(familyId, subjectId, change.id, mode)
      .then((p) => live && setPreview(p))
      .catch((e) => live && setPreview({ effect: "refused", text: e instanceof Error ? e.message : "Couldn't check what this would do.", button: "" }));
    return () => {
      live = false;
    };
  }, [familyId, subjectId, change.id, mode]);

  const go = async () => {
    setBusy(true);
    setErr("");
    try {
      // confirm: the caregiver has just read exactly what happens to this medicine, allergy or condition
      const r = await undoMemoryChange(familyId, subjectId, change.id, { mode, reason: reason.trim(), confirm: isHealth(change) });
      onDone(resultText(change, r, mode));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "That did not work. Try again.");
    } finally {
      setBusy(false);
    }
  };
  const blocked = preview && (preview.effect === "refused" || preview.effect === "nothing");
  return (
    <div className="mt-3 rounded-[16px] border border-[var(--c-line)] bg-[var(--c-frame)] p-3" role="group" aria-label={mode === "undo" ? "Undo this change" : "Put this version back"}>
      <p className="text-[12.5px] font-medium" aria-live="polite">
        {!preview ? "Checking what this would do…" : preview.text}
      </p>
      {preview && !blocked && (
        <input
          className={cn(INPUT, "mt-2")}
          aria-label="Why (optional)"
          placeholder={change.kind === "fact" ? "Why (optional), e.g. the dose was always 500 mg" : "Why (optional), e.g. that never happened"}
          value={reason}
          maxLength={300}
          onChange={(e) => setReason(e.target.value)}
        />
      )}
      {err && <p className="mt-2 text-[12px] text-[var(--c-accent-soft-ink)]">{err}</p>}
      <div className="mt-2 flex justify-end gap-2">
        <SmallButton disabled={busy} onClick={onCancel}>
          {blocked ? "Close" : "Cancel"}
        </SmallButton>
        {preview && !blocked && (
          <SmallButton dark disabled={busy} onClick={() => void go()}>
            {busy ? "Working…" : preview.button || (mode === "undo" ? "Yes, undo" : "Yes, put back")}
          </SmallButton>
        )}
      </div>
    </div>
  );
}

function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[14px] bg-[var(--c-accent-soft)] px-4 py-2.5 text-[13px] text-[var(--c-accent-soft-ink)]" role="alert">
      <span>Couldn&apos;t load the history right now. Nothing has changed.</span>
      <SmallButton onClick={onRetry}>Try again</SmallButton>
    </div>
  );
}

function Lines({ c }: { c: MemoryChange }) {
  if (c.kind !== "note") return c.body ? <p className="mt-2 text-[13px] leading-relaxed">{c.body}</p> : null;
  if (c.deleted) return <p className="mt-2 text-[12.5px] text-[var(--c-ink-3)]">The note was removed.</p>;
  return (
    <ul className="mt-2 space-y-1 text-[12.5px] leading-relaxed">
      {(c.added ?? []).map((l, i) => (
        <li key={`a${i}`} className="flex gap-2">
          <span className="font-medium text-[var(--c-accent)]">+</span>
          <span className="min-w-0 break-words">{lineText(l)}</span>
        </li>
      ))}
      {(c.removed ?? []).map((l, i) => (
        <li key={`r${i}`} className="flex gap-2 text-[var(--c-ink-3)]">
          <span>−</span>
          <span className="min-w-0 break-words line-through">{lineText(l)}</span>
        </li>
      ))}
      {(c.more ?? 0) > 0 && <li className="text-[11.5px] text-[var(--c-ink-3)]">+{c.more} more lines</li>}
    </ul>
  );
}

/** Every version of one item: who changed it, where, why, and undo or put back. */
export function MemoryHistoryDrawer({
  familyId,
  item,
  onClose,
  onChanged,
  canEdit = true,
}: {
  familyId: string;
  item: HistoryItem | null;
  onClose: () => void;
  onChanged?: () => void;
  canEdit?: boolean;
}) {
  const [rows, setRows] = useState<{ key: string; v: MemoryChange[]; error?: boolean } | null>(null);
  const req = useRef(0);
  const [acting, setActing] = useState<{ id: number; mode: "undo" | "restore" } | null>(null);
  const [msg, setMsg] = useState("");
  const key = item ? `${item.subjectId}/${item.owner}/${item.kind}/${item.target}` : "";

  const load = useCallback(async () => {
    if (!item) return;
    const mine = ++req.current; // a slower answer for an item opened earlier never overwrites this one
    try {
      const all = await getMemoryHistory(familyId, item.subjectId, { kind: item.kind, target: item.target, limit: 100 });
      if (mine === req.current) setRows({ key, v: all.filter((c) => c.subjectId === item.owner) });
    } catch {
      if (mine === req.current) setRows({ key, v: [], error: true });
    }
  }, [familyId, item, key]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  const close = useCallback(() => {
    setActing(null);
    setMsg("");
    onClose();
  }, [onClose]);

  const list = rows?.key === key ? rows.v : null;
  const failed = rows?.key === key && rows.error;
  return (
    <SideDrawer open={!!item} onClose={close} top="History of" bottom={item?.label ?? ""} label="Memory history">
      {msg && (
        <div className="mb-4">
          <Notice>{msg}</Notice>
        </div>
      )}
      {failed ? (
        <LoadError onRetry={() => void load()} />
      ) : !list ? (
        <div className="h-24 animate-pulse rounded-[18px] bg-[var(--c-card)]" />
      ) : list.length === 0 ? (
        <p className="text-[13px] text-[var(--c-ink-2)]">No history yet. Changes show here from now on.</p>
      ) : (
        <ol className="space-y-3">
          {list.map((c, i) => (
            <li key={c.id} className="rounded-[20px] bg-[var(--c-card)] p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Tag tone={i === 0 ? "dark" : "light"}>{c.undoes ? "Undo" : OP_WORD[c.op] ?? c.op}</Tag>
                  {c.status && c.kind !== "note" && <span className="text-[11px] text-[var(--c-ink-3)]">{STATUS_WORD[c.status] ?? c.status}</span>}
                </div>
                <span className="text-[11px] text-[var(--c-ink-3)]">v{c.version}</span>
              </div>
              <Lines c={c} />
              <p className="mt-2 text-[11.5px] text-[var(--c-ink-3)]">
                {c.by} · {c.where} · {at(c.at)}
                {c.reason ? ` · “${c.reason}”` : ""}
              </p>
              {acting?.id === c.id ? (
                <ActionRow
                  change={c}
                  mode={acting.mode}
                  familyId={familyId}
                  subjectId={item!.subjectId}
                  onCancel={() => setActing(null)}
                  onDone={(m) => {
                    setActing(null);
                    setMsg(m);
                    void load();
                    onChanged?.();
                  }}
                />
              ) : (
                canEdit && (c.canUndo || (c.canRestore && i > 0)) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {c.canUndo && (
                      <SmallButton icon={ArrowUUpLeft} onClick={() => setActing({ id: c.id, mode: "undo" })}>
                        Undo this change
                      </SmallButton>
                    )}
                    {c.canRestore && i > 0 && (
                      <SmallButton icon={ArrowCounterClockwise} onClick={() => setActing({ id: c.id, mode: "restore" })}>
                        Put back this version
                      </SmallButton>
                    )}
                  </div>
                )
              )}
            </li>
          ))}
        </ol>
      )}
      <WhatsAppHint className="mt-5">tell Saheli “galat hai, pehle wala sahi tha” or “undo that” and she finds the change.</WhatsAppHint>
    </SideDrawer>
  );
}

/** The last few changes to this person's memory, with undo, and a way into each item's full history. */
export function RecentChangesPanel({
  familyId,
  subjectId,
  name,
  onChanged,
  refresh,
  canEdit = true,
}: {
  familyId: string;
  subjectId: string;
  name: string;
  onChanged?: () => void;
  /** Anything that changes when memory may have changed elsewhere on the page (e.g. the overview data): reloads the list. */
  refresh?: unknown;
  /** Undo and put back are for caregivers; others only read. */
  canEdit?: boolean;
}) {
  const [data, setData] = useState<{ id: string; v: MemoryChange[]; error?: boolean } | null>(null);
  const req = useRef(0);
  const [acting, setActing] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState<HistoryItem | null>(null);

  const load = useCallback(async () => {
    const mine = ++req.current; // drop answers that arrive after a newer load (e.g. after switching person)
    try {
      const v = await getMemoryHistory(familyId, subjectId, { limit: 8 });
      if (mine === req.current) setData({ id: subjectId, v });
    } catch {
      if (mine === req.current) setData({ id: subjectId, v: [], error: true });
    }
  }, [familyId, subjectId]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load, refresh]);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(""), 8000);
    return () => clearTimeout(t);
  }, [msg]);

  const rows = data?.id === subjectId ? data.v : null;
  const changed = () => {
    void load();
    onChanged?.();
  };

  return (
    <Panel>
      <PanelTitle title="Recent changes" right={<ClockCounterClockwise size={18} />} />
      <p className="mt-1 text-[12px] text-[var(--c-ink-3)]">
        Everything Saheli or the family changed in what she knows about {name || "them"}. Undo any change; nothing is lost.
      </p>
      {msg && (
        <div className="mt-3">
          <Notice>{msg}</Notice>
        </div>
      )}
      {data?.id === subjectId && data.error ? (
        <div className="mt-4">
          <LoadError onRetry={() => void load()} />
        </div>
      ) : !rows ? (
        <div className="mt-4 h-20 animate-pulse rounded-[16px] bg-[var(--c-frame)]" />
      ) : rows.length === 0 ? (
        <p className="mt-4 text-[13px] text-[var(--c-ink-2)]">No changes yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-[var(--c-line)]">
          {rows.map((c) => {
            const Icon = KIND_ICON[c.kind];
            return (
              <li key={c.id} className="py-3">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--c-frame)]">
                    <Icon size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">{c.label}</p>
                    <p className="truncate text-[12.5px] text-[var(--c-ink-2)]">{c.undoes ? `undo · ${c.summary}` : c.summary}</p>
                    <p className="mt-0.5 text-[11px] text-[var(--c-ink-3)]">
                      {c.by} · {c.where} · {at(c.at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <SmallButton
                      aria-label={`History of ${c.label}`}
                      icon={ClockCounterClockwise}
                      onClick={() => setOpen({ kind: c.kind, target: c.target, subjectId, owner: c.subjectId, label: c.label })}
                    >
                      History
                    </SmallButton>
                    {canEdit && c.canUndo && acting !== c.id && (
                      <SmallButton icon={ArrowUUpLeft} onClick={() => setActing(c.id)}>
                        Undo
                      </SmallButton>
                    )}
                  </div>
                </div>
                {acting === c.id && (
                  <ActionRow
                    change={c}
                    mode="undo"
                    familyId={familyId}
                    subjectId={subjectId}
                    onCancel={() => setActing(null)}
                    onDone={(m) => {
                      setActing(null);
                      setMsg(m);
                      changed();
                    }}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
      <WhatsAppHint className="mt-3">tell Saheli “galat hai, pehle wala sahi tha” or “undo that”.</WhatsAppHint>
      <MemoryHistoryDrawer familyId={familyId} item={open} onClose={() => setOpen(null)} onChanged={changed} canEdit={canEdit} />
    </Panel>
  );
}
