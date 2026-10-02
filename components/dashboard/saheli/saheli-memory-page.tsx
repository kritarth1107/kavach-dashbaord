"use client";

import { Loader2, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { saveNote, type MemoryNote } from "@/lib/care-memory-api";
import { AccessGate, CenteredState, PageSpinner, formatIstDateTime, useRecipientSelection } from "../activity/activity-shared";
import { Banner, SaheliHeader, btnPrimary, btnSecondary, useAction, useCareOverview } from "./saheli-shared";

type Editing = { subjectId: string; slug: string; title: string; body: string; isNew: boolean };

function slugify(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 100) || "note";
}

export function SaheliMemoryPage() {
  const sel = useRecipientSelection();
  const { familyId, selectedId } = sel;
  const { data, error, loading, reload } = useCareOverview(familyId, selectedId);
  const { busy, banner, run } = useAction();
  const [editing, setEditing] = useState<Editing | null>(null);
  const name = sel.recipients.find((r) => r.userId === selectedId)?.name ?? "them";

  const groups: Array<{ subjectId: string; label: string; notes: MemoryNote[] }> = selectedId
    ? [
        { subjectId: selectedId, label: `About ${name}`, notes: (data?.notes ?? []).filter((n) => n.subjectId === selectedId) },
        { subjectId: "family", label: "About the family", notes: (data?.notes ?? []).filter((n) => n.subjectId === "family") },
      ]
    : [];

  async function save() {
    if (!editing || !familyId || !selectedId) return;
    const ok = await run(
      "save",
      () =>
        saveNote(familyId, selectedId, {
          subjectId: editing.subjectId,
          slug: editing.isNew ? slugify(editing.title) : editing.slug,
          title: editing.title.trim(),
          body: editing.body,
        }),
      "Saved. Saheli reads this from her next message.",
    );
    if (ok) {
      setEditing(null);
      reload();
    }
  }

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
          title={(n) => `${n}'s Memory`}
          subtitle="Life around the care: people, stories, dishes, likes, how they like things done. Saheli adds to these from conversations; you can correct anything."
        />
        <Banner banner={banner} />
        {editing && (
          <section className="panel-card p-5" aria-label="Edit note">
            <label className="text-[11px] font-bold text-[var(--text-secondary)]">
              Title
              <input
                className="theme-field mt-1 w-full"
                value={editing.title}
                disabled={!editing.isNew}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                placeholder="Food, Grandchildren, Daily routine…"
              />
            </label>
            <label className="mt-3 block text-[11px] font-bold text-[var(--text-secondary)]">
              Note
              <textarea
                className="theme-field mt-1 min-h-[220px] w-full font-mono text-[12px]"
                value={editing.body}
                onChange={(e) => setEditing({ ...editing, body: e.target.value })}
              />
            </label>
            <div className="mt-3 flex gap-2">
              <button className={btnPrimary} disabled={busy === "save" || !editing.title.trim()} onClick={save}>
                {busy === "save" && <Loader2 className="h-3 w-3 animate-spin" />} Save
              </button>
              <button className={btnSecondary} onClick={() => setEditing(null)}>
                Cancel
              </button>
            </div>
          </section>
        )}
        {loading && !data ? (
          <PageSpinner />
        ) : error && !data ? (
          <div className="panel-card">
            <CenteredState tone="error" title="Couldn't load memory" body={error} />
          </div>
        ) : (
          groups.map((g) => (
            <section key={g.subjectId} className="panel-card p-5">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2.5 text-[14px] font-medium text-[var(--text-primary)]"><span className="h-[14px] w-[14px] shrink-0 rounded-[4px] bg-[var(--c-accent)]" aria-hidden />{g.label}</h2>
                <button className={btnSecondary} onClick={() => setEditing({ subjectId: g.subjectId, slug: "", title: "", body: "", isNew: true })}>
                  <Plus className="h-3.5 w-3.5" /> New note
                </button>
              </div>
              {g.notes.length === 0 ? (
                <p className="mt-3 text-[12px] text-[var(--text-tertiary)]">Nothing yet.</p>
              ) : (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {g.notes.map((n) => (
                    <article key={n.slug} className="rounded-2xl bg-[var(--surface)] p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-[13px] font-extrabold text-[var(--text-primary)]">{n.title}</h3>
                        <button
                          className={btnSecondary}
                          aria-label={`Edit ${n.title}`}
                          onClick={() => setEditing({ subjectId: n.subjectId, slug: n.slug, title: n.title, body: n.body, isNew: false })}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap break-words text-[12px] leading-relaxed text-[var(--text-secondary)]">{n.body}</p>
                      <p className="mt-2 text-[10px] text-[var(--text-tertiary)]">
                        Updated {formatIstDateTime(n.updatedAt)} · version {n.version}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          ))
        )}
      </div>
    </AccessGate>
  );
}
