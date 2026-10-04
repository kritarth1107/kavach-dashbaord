"use client";

import { Check, PencilSimple, Plus, Sparkle, Storefront, Trash } from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";
import { addSkill, getSkills, skillAction, type Skill } from "@/lib/care-features-api";
import { INPUT } from "./feature-kit";
import { Panel, PanelTitle, SmallButton, Tag } from "./ui";

const STORE_NAME: Record<string, string> = {
  swiggy: "Swiggy", instamart: "Instamart", zepto: "Zepto", blinkit: "Blinkit", zomato: "Zomato",
  apollo: "Apollo", "1mg": "Tata 1mg", pharmeasy: "PharmEasy", uber: "Uber", ola: "Ola", rapido: "Rapido",
};

/** How this person likes things (family skills, editable), plus what the store agents learned (read-only). */
export function SkillsPanel({ familyId, subjectId, name }: { familyId: string; subjectId: string; name: string }) {
  const [data, setData] = useState<{ id: string; skills: Skill[]; store: Skill[] } | null>(null);
  const [text, setText] = useState("");
  const [editing, setEditing] = useState<{ id: number; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const v = await getSkills(familyId, subjectId);
      setData({ id: subjectId, ...v });
    } catch {
      setData({ id: subjectId, skills: [], store: [] });
    }
  }, [familyId, subjectId]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      await load();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const v = data?.id === subjectId ? data : null;
  const live = (v?.skills ?? []).filter((s) => s.status !== "blocked");
  const removed = (v?.skills ?? []).filter((s) => s.status === "blocked").slice(0, 3);

  return (
    <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
      <Panel>
        <PanelTitle title={`How ${name || "they"} likes things`} right={<Sparkle size={18} />} />
        <p className="mt-1 text-[12px] text-[var(--c-ink-3)]">
          Tone, timing and habits Saheli follows with {name || "them"}. Medicines, reminder times and safety stay in the care record.
        </p>
        {!v ? (
          <div className="mt-4 h-16 animate-pulse rounded-[16px] bg-[var(--c-frame)]" />
        ) : live.length === 0 ? (
          <p className="mt-4 text-[13px] text-[var(--c-ink-2)]">Nothing yet. Add one below, or tell Saheli on WhatsApp, e.g. “Maa ko puja ke baad yaad dilana”.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {live.map((s) => (
              <li key={s.id} className="rounded-[14px] bg-[var(--c-frame)] px-3 py-2.5">
                {editing?.id === s.id ? (
                  <div className="flex gap-2">
                    <input className={INPUT} value={editing.text} maxLength={600} onChange={(e) => setEditing({ id: s.id, text: e.target.value })} />
                    <SmallButton dark className="h-11 shrink-0 px-4" disabled={busy || editing.text.trim().length < 3}
                      onClick={() => void run(() => skillAction(familyId, subjectId, s.id, "edit", editing.text.trim())).then((ok) => ok && setEditing(null))}>
                      Save
                    </SmallButton>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13px] leading-snug">{s.body}</p>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-[var(--c-ink-3)]">
                        {s.status === "proposed" ? <Tag tone="accent">Saheli suggests</Tag> : s.status === "stale" ? <Tag tone="light">not used lately</Tag> : null}
                        <span>{s.source === "dream" ? "learned from how they reply" : s.source === "elder" ? `${name || "they"} asked for this` : "from the family"}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      {s.status === "proposed" && (
                        <SmallButton dark icon={Check} disabled={busy} onClick={() => void run(() => skillAction(familyId, subjectId, s.id, "approve"))}>
                          Use it
                        </SmallButton>
                      )}
                      <SmallButton icon={PencilSimple} aria-label="Edit" disabled={busy} onClick={() => setEditing({ id: s.id, text: s.body })} />
                      <SmallButton icon={Trash} aria-label="Remove" disabled={busy} onClick={() => void run(() => skillAction(familyId, subjectId, s.id, "remove"))} />
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex gap-2">
          <input className={INPUT} placeholder="e.g. Short Hinglish, no emoji" value={text} maxLength={600} onChange={(e) => setText(e.target.value)} />
          <SmallButton dark icon={Plus} className="h-11 shrink-0 px-5" disabled={busy || text.trim().length < 3}
            onClick={() => void run(() => addSkill(familyId, subjectId, text.trim())).then((ok) => ok && setText(""))}>
            Add
          </SmallButton>
        </div>
        {error && <p className="mt-2 text-[12px] text-[var(--c-accent)]">{error}</p>}
        {removed.length > 0 && (
          <p className="mt-3 text-[11.5px] text-[var(--c-ink-3)]">
            Removed:{" "}
            {removed.map((s, i) => (
              <span key={s.id}>
                {i > 0 && " · "}“{s.body}”{" "}
                <button type="button" className="underline" onClick={() => void run(() => skillAction(familyId, subjectId, s.id, "restore"))}>
                  restore
                </button>
              </span>
            ))}
          </p>
        )}
      </Panel>
      <Panel>
        <PanelTitle title="What the order agents learned" right={<Storefront size={18} />} />
        <p className="mt-1 text-[12px] text-[var(--c-ink-3)]">Paths through each store&apos;s website that worked, shared by all families. No personal details are kept.</p>
        {!v ? null : v.store.length === 0 ? (
          <p className="mt-4 text-[13px] text-[var(--c-ink-2)]">Nothing yet. Each successful order or ride teaches the next one.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {v.store.slice(0, 8).map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 text-[12.5px]">
                <span className="min-w-0 truncate">
                  <span className="font-medium">{STORE_NAME[s.service] ?? s.service}</span> <span className="text-[var(--c-ink-3)]">{s.title.replace(" path", "")}</span>
                </span>
                <span className="shrink-0 text-[11px] text-[var(--c-ink-3)]">
                  {s.successes}/{s.uses} worked{s.status === "stale" ? " · paused" : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
