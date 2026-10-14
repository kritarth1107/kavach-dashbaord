"use client";

import { ArrowCounterClockwise, Eraser, IdentificationCard, Wrench } from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";
import { forgetMemory, getMemoryHealth, restoreForgotten, type MemoryHealth } from "@/lib/care-features-api";
import { INPUT } from "./feature-kit";
import { Panel, PanelTitle, SmallButton } from "./ui";

/** Saheli's profile card of this person, record problems she will ask about, and forget / restore. */
export function MemoryHealthPanel({ familyId, subjectId, name, canEdit = true }: { familyId: string; subjectId: string; name: string; canEdit?: boolean }) {
  // v is null when the load failed: an error, never "looks consistent" or an empty card
  const [data, setData] = useState<{ id: string; v: MemoryHealth | null } | null>(null);
  const [what, setWhat] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setData({ id: subjectId, v: await getMemoryHealth(familyId, subjectId) });
    } catch {
      setData((d) => (d?.id === subjectId && d.v ? d : { id: subjectId, v: null }));
    }
  }, [familyId, subjectId]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  const loaded = data?.id === subjectId;
  const v = loaded ? data.v : null;
  const failed = loaded && !data.v;
  const retry = () => {
    setData(null);
    void load();
  };

  const doForget = async () => {
    if (what.trim().length < 3) return;
    setBusy(true);
    setError("");
    try {
      const r = await forgetMemory(familyId, subjectId, what.trim());
      setNote(r.forgotten ? `Forgot ${r.forgotten} item${r.forgotten === 1 ? "" : "s"}. You can restore it below.` : "Nothing matched those words.");
      setWhat("");
      await load();
    } catch (e) {
      setNote("");
      setError(e instanceof Error ? e.message : "Couldn't forget that. Nothing was changed.");
    } finally {
      setBusy(false);
    }
  };

  const doRestore = async (id: number) => {
    setBusy(true);
    setError("");
    try {
      await restoreForgotten(familyId, subjectId, id);
      setNote("Restored.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't restore it. Nothing was changed.");
    } finally {
      setBusy(false);
    }
  };

  const failNote = (
    <div className="mt-4 flex items-center justify-between gap-3 rounded-[14px] bg-[var(--c-accent-soft)] px-4 py-2.5 text-[13px] text-[var(--c-accent-soft-ink)]" role="alert">
      <span>Couldn&apos;t load this right now.</span>
      <SmallButton onClick={retry}>Try again</SmallButton>
    </div>
  );

  return (
    <div className="grid gap-3">
      <Panel>
        <PanelTitle title={`Saheli's card for ${name === "You" ? "you" : name || "them"}`} right={<IdentificationCard size={18} />} />
        <p className="mt-1 text-[12px] text-[var(--c-ink-3)]">Rebuilt every night from the care record and notes. Every reply starts from this.</p>
        {failed ? (
          failNote
        ) : !v ? (
          <div className="mt-4 h-20 animate-pulse rounded-[16px] bg-[var(--c-frame)]" />
        ) : v.profileCard ? (
          <ul className="mt-4 space-y-1.5 text-[13px]">
            {v.profileCard.split("\n").map((ln) => {
              const [k, ...rest] = ln.split(":");
              return (
                <li key={ln}>
                  <span className="text-[var(--c-ink-3)]">{k}:</span> {rest.join(":")}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-4 text-[13px] text-[var(--c-ink-2)]">The first card is made tonight.</p>
        )}
      </Panel>
      <div className="space-y-4">
        <Panel>
          <PanelTitle title="Things to check" right={<Wrench size={18} />} />
          {failed ? (
            <p className="mt-3 text-[13px] text-[var(--c-ink-2)]">Couldn&apos;t check the care record right now.</p>
          ) : !v ? null : v.issues.length === 0 ? (
            <p className="mt-3 text-[13px] text-[var(--c-ink-2)]">The care record looks consistent.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {v.issues.map((i) => (
                <li key={i.key} className="rounded-[14px] bg-[var(--c-frame)] px-3 py-2.5 text-[12.5px]">
                  <p className="font-medium">{i.ask}</p>
                  <p className="mt-0.5 text-[11.5px] text-[var(--c-ink-3)]">{i.problem}</p>
                </li>
              ))}
            </ul>
          )}
          {v && v.issues.length > 0 && <p className="mt-2 text-[11px] text-[var(--c-ink-3)]">Saheli asks about each one once on WhatsApp; fix it there or in the care record.</p>}
        </Panel>
        {canEdit && <Panel>
          <PanelTitle title="Forget something" right={<Eraser size={18} />} />
          <div className="mt-3 flex gap-2">
            <input className={INPUT} placeholder="A few words, e.g. the argument last Sunday" value={what} maxLength={200} onChange={(e) => setWhat(e.target.value)} />
            <SmallButton dark className="h-11 shrink-0 px-5" disabled={busy || what.trim().length < 3} onClick={() => void doForget()}>
              Forget
            </SmallButton>
          </div>
          {note && <p className="mt-2 text-[12px] text-[var(--c-ink-2)]">{note}</p>}
          {error && (
            <p className="mt-2 text-[12px] text-[var(--c-accent-text)]" role="alert">
              {error}
            </p>
          )}
          {v && v.forgotten.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {v.forgotten.slice(0, 5).map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-2 text-[12.5px]">
                  <span className="truncate">“{f.what}”</span>
                  {f.restored ? (
                    <span className="text-[11px] text-[var(--c-ink-3)]">restored</span>
                  ) : (
                    <SmallButton icon={ArrowCounterClockwise} disabled={busy} onClick={() => void doRestore(f.id)}>
                      Restore
                    </SmallButton>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[11px] text-[var(--c-ink-3)]">On WhatsApp: tell Saheli “forget that” or “remove what I said about …”.</p>
        </Panel>}
      </div>
    </div>
  );
}
