"use client";

import { AlertTriangle, Bell, Heart, Loader2, Moon, Sparkles } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import {
  getSaheliCompanion,
  getSaheliCompanionActivity,
  updateSaheliCompanion,
  type SaheliCompanionActivity,
  type SaheliCompanionProfile,
} from "@/lib/api";
import { getCareOverview, type MemoryNote } from "@/lib/care-memory-api";
import { forgetMemory } from "@/lib/care-features-api";
import { useFamily } from "@/components/dashboard/family-context";
import { useRun } from "@/lib/use-run";

type SaheliCompanionPanelProps = {
  recipientUserId: string;
  recipientName: string;
};

/** The person's memory notes (stories, people, what they enjoy) as lines, newest first; diary and summaries left out. */
const NOT_STORIES = new Set(["diary", "weekly", "monthly", "profile-card", "life-so-far"]);
function noteLines(notes: MemoryNote[], subjectId: string): Array<{ key: string; title: string; line: string }> {
  return notes
    .filter((n) => n.subjectId === subjectId && !NOT_STORIES.has(n.slug))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .flatMap((n) =>
      n.body
        .split("\n")
        .map((l) => l.replace(/^\s*[-*•]\s*/, "").trim())
        .filter((l) => l.length > 3)
        .reverse()
        .map((line, i) => ({ key: `${n.slug}-${i}`, title: n.title, line })),
    );
}

const NUDGE_LABELS: Record<string, string> = {
  pre_task: "Upcoming reminder",
  missed_task: "Missed task follow-up",
  praise: "Praise",
  loneliness: "Check-in",
  dose_due: "Medicine reminder",
  pre_reminder: "Medicine reminder",
  missed_followup: "Missed dose",
};

function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function SaheliCompanionPanel({
  recipientUserId,
  recipientName,
}: SaheliCompanionPanelProps) {
  const first = recipientName.split(" ")[0] || recipientName;
  const { activeFamilyId } = useFamily();
  const [profile, setProfile] = useState<SaheliCompanionProfile | null>(null);
  const [activity, setActivity] = useState<SaheliCompanionActivity | null>(null);
  const [memories, setMemories] = useState<Array<{ key: string; title: string; line: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [memoryActionId, setMemoryActionId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!activeFamilyId) return;
    setLoading(true);
    setError("");
    try {
      // Saheli's memory is her care record in the engine (trust plan A1): the notes about this person.
      const [companionRes, overview, activityRes] = await Promise.all([
        getSaheliCompanion(activeFamilyId, recipientUserId),
        getCareOverview(activeFamilyId, recipientUserId).catch(() => null),
        getSaheliCompanionActivity(activeFamilyId, recipientUserId).catch(() => ({
          data: { nudges: [], escalations: [] } as SaheliCompanionActivity,
        })),
      ]);
      setProfile(companionRes.data ?? null);
      setMemories(noteLines(overview?.notes ?? [], recipientUserId));
      setActivity(activityRes.data ?? { nudges: [], escalations: [] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Saheli settings");
    } finally {
      setLoading(false);
    }
  }, [activeFamilyId, recipientUserId]);

  useRun(load);

  async function saveProfile(patch: Partial<SaheliCompanionProfile>) {
    if (!activeFamilyId || !profile) return;
    setSaving(true);
    setError("");
    try {
      const { data } = await updateSaheliCompanion(activeFamilyId, recipientUserId, patch);
      if (data) setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="panel-card mb-5 flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <section className="panel-card mb-5 overflow-hidden">
      <div className="border-b border-[var(--border-strong)] px-4 py-3.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-[14px] font-extrabold text-[var(--text-primary)]">
              Saheli companion
            </h2>
            <p className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">
              Talks like family · remembers casual stories
            </p>
          </div>
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
      </div>

      {error && (
        <p className="border-b border-[var(--border-strong)] px-4 py-2 text-[11px] text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="space-y-4 px-4 py-4">
        <label className="flex items-center justify-between gap-3">
          <span className="text-[12px] font-semibold text-[var(--text-secondary)]">
            Auto reach-out
          </span>
          <input
            type="checkbox"
            checked={profile.enabled}
            disabled={saving}
            onChange={(e) => void saveProfile({ enabled: e.target.checked })}
            className="h-4 w-4 rounded border-[var(--border-strong)] text-primary"
          />
        </label>

        <div>
          <label className="mb-1 block text-[11px] font-semibold text-[var(--text-tertiary)]">
            Voice (child name)
          </label>
          <input
            value={profile.childName}
            disabled={saving}
            onChange={(e) => setProfile({ ...profile, childName: e.target.value })}
            onBlur={() => void saveProfile({ childName: profile.childName })}
            className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--input-bg)] px-3 py-2 text-[12px]"
            placeholder="Saheli"
          />
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-semibold text-[var(--text-tertiary)]">
            Relationship
          </label>
          <input
            value={profile.relationshipLabel}
            disabled={saving}
            onChange={(e) => setProfile({ ...profile, relationshipLabel: e.target.value })}
            onBlur={() => void saveProfile({ relationshipLabel: profile.relationshipLabel })}
            className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--input-bg)] px-3 py-2 text-[12px]"
            placeholder="your daughter"
          />
        </div>

        <label className="flex items-center justify-between gap-3">
          <span className="text-[12px] font-semibold text-[var(--text-secondary)]">
            Share life updates with family
          </span>
          <input
            type="checkbox"
            checked={profile.shareWithFamily}
            disabled={saving}
            onChange={(e) => void saveProfile({ shareWithFamily: e.target.checked })}
            className="h-4 w-4 rounded border-[var(--border-strong)] text-primary"
          />
        </label>

        <div className="rounded-lg border border-[var(--border-strong)] bg-[var(--input-bg)] px-3 py-2.5">
          <div className="mb-2 flex items-center gap-1.5">
            <Moon className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
            <p className="text-[11px] font-bold text-[var(--text-primary)]">Quiet hours</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[10px] text-[var(--text-tertiary)]">From</label>
              <input
                type="time"
                value={profile.quietHoursStart ?? ""}
                disabled={saving}
                onChange={(e) => setProfile({ ...profile, quietHoursStart: e.target.value })}
                onBlur={() =>
                  void saveProfile({ quietHoursStart: profile.quietHoursStart || "" })
                }
                className="w-full rounded-md border border-[var(--border-strong)] bg-[var(--surface)] px-2 py-1.5 text-[11px]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-[var(--text-tertiary)]">Until</label>
              <input
                type="time"
                value={profile.quietHoursEnd ?? ""}
                disabled={saving}
                onChange={(e) => setProfile({ ...profile, quietHoursEnd: e.target.value })}
                onBlur={() => void saveProfile({ quietHoursEnd: profile.quietHoursEnd || "" })}
                className="w-full rounded-md border border-[var(--border-strong)] bg-[var(--surface)] px-2 py-1.5 text-[11px]"
              />
            </div>
          </div>
          <p className="mt-1.5 text-[10px] text-[var(--text-tertiary)]">
            No proactive nudges or outreach during these hours (IST).
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-[11px] font-semibold text-[var(--text-tertiary)]">
            Nudge intensity
          </label>
          <div className="flex flex-wrap gap-1.5">
            {(["gentle", "standard", "persistent"] as const).map((level) => {
              const active = (profile.nudgeIntensity ?? "standard") === level;
              return (
                <button
                  key={level}
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setProfile({ ...profile, nudgeIntensity: level });
                    void saveProfile({ nudgeIntensity: level });
                  }}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ${
                    active
                      ? "bg-primary text-white"
                      : "border border-[var(--border-strong)] text-[var(--text-secondary)]"
                  }`}
                >
                  {level}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(["morning", "afternoon", "evening"] as const).map((slot) => {
            const active = profile.outreachSlots.includes(slot);
            return (
              <button
                key={slot}
                type="button"
                disabled={saving}
                onClick={() => {
                  const next = active
                    ? profile.outreachSlots.filter((s) => s !== slot)
                    : [...profile.outreachSlots, slot];
                  setProfile({ ...profile, outreachSlots: next });
                  void saveProfile({ outreachSlots: next });
                }}
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ${
                  active
                    ? "bg-primary text-white"
                    : "border border-[var(--border-strong)] text-[var(--text-secondary)]"
                }`}
              >
                {slot}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-2 text-[10px] text-[var(--text-tertiary)]">
          <div className="rounded-md border border-[var(--border-strong)] px-2 py-1.5">
            <span className="font-semibold text-[var(--text-secondary)]">Last outreach</span>
            <p>{formatRelativeTime(profile.lastOutreachAt)}</p>
          </div>
          <div className="rounded-md border border-[var(--border-strong)] px-2 py-1.5">
            <span className="font-semibold text-[var(--text-secondary)]">Last on WhatsApp</span>
            <p>{formatRelativeTime(profile.lastWhatsAppInboundAt)}</p>
          </div>
        </div>

      </div>

      {(activity?.escalations.length ?? 0) > 0 || (activity?.nudges.length ?? 0) > 0 ? (
        <div className="border-t border-[var(--border-strong)] px-4 py-3">
          <div className="mb-2 flex items-center gap-1.5">
            <Bell className="h-3.5 w-3.5 text-primary" />
            <p className="text-[11px] font-bold text-[var(--text-primary)]">Companion activity</p>
          </div>

          {activity?.escalations.length ? (
            <ul className="mb-3 space-y-2">
              {activity.escalations.slice(0, 3).map((e, i) => (
                <li
                  key={`esc-${i}`}
                  className="flex gap-2 rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 dark:border-red-900/50 dark:bg-red-950/30"
                >
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" />
                  <div>
                    <p className="text-[11px] font-semibold text-red-800 dark:text-red-300">
                      Emergency escalation
                    </p>
                    <p className="text-[10px] text-red-700 dark:text-red-400">{e.message}</p>
                    <p className="mt-0.5 text-[10px] text-[var(--text-tertiary)]">
                      {e.caregiversNotified > 0
                        ? `${e.caregiversNotified} caregiver${e.caregiversNotified === 1 ? "" : "s"} alerted on WhatsApp`
                        : "No caregiver WhatsApp number on file to alert"}{" "}·{" "}
                      {formatRelativeTime(e.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}

          {activity?.nudges.length ? (
            <ul className="max-h-32 space-y-1.5 overflow-y-auto">
              {activity.nudges.slice(0, 6).map((n, i) => (
                <li
                  key={`nudge-${i}`}
                  className="rounded-lg border border-[var(--border-strong)] bg-[var(--input-bg)] px-2.5 py-2"
                >
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
                    {NUDGE_LABELS[n.nudgeKind] ?? n.nudgeKind}
                    {" · "}
                    {n.delivery === "read" ? "read" : n.delivery === "delivered" ? "delivered" : n.doseStatus ?? (n.delivered ? "sent" : "failed")}
                    {n.delivery && n.delivery !== "failed" ? (
                      <span
                        aria-label={`WhatsApp: ${n.delivery}`}
                        title={`WhatsApp: ${n.delivery}`}
                        className={n.delivery === "read" ? "ml-1 tracking-[-0.12em] text-[#34b7f1]" : "ml-1 tracking-[-0.12em]"}
                      >
                        {n.delivery === "sent" ? "✓" : "✓✓"}
                      </span>
                    ) : null}
                  </p>
                  {n.messagePreview ? (
                    <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
                      {n.messagePreview}
                    </p>
                  ) : null}
                  <p className="mt-0.5 text-[10px] text-[var(--text-tertiary)]">
                    {formatRelativeTime(n.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="border-t border-[var(--border-strong)] px-4 py-3" data-testid="saheli-remembers">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Heart className="h-3.5 w-3.5 text-primary" />
            <p className="text-[11px] font-bold text-[var(--text-primary)]">
              What Saheli remembers
            </p>
          </div>
          <Link href="/dashboard/saheli/memory" className="text-[10px] font-semibold text-primary hover:underline">
            All memory
          </Link>
        </div>
        {memories.length > 0 ? (
          <ul className="max-h-40 space-y-2 overflow-y-auto">
            {memories.slice(0, 8).map((m) => (
              <li
                key={m.key}
                className="rounded-lg border border-[var(--border-strong)] bg-[var(--input-bg)] px-2.5 py-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)]">{m.title}</p>
                  <button
                    type="button"
                    disabled={memoryActionId === m.key}
                    className="shrink-0 text-[10px] font-semibold text-red-600 hover:underline disabled:opacity-50"
                    onClick={() => {
                      if (!activeFamilyId) return;
                      if (!window.confirm("Forget this? Saheli will stop using it (you can bring it back from All memory).")) return;
                      setMemoryActionId(m.key);
                      void forgetMemory(activeFamilyId, recipientUserId, m.line)
                        .then(() => load())
                        .finally(() => setMemoryActionId(null));
                    }}
                  >
                    Forget
                  </button>
                </div>
                <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--text-secondary)]">{m.line}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[11px] text-[var(--text-tertiary)]">
            Nothing yet: Saheli writes down stories and people {first} tells her about.
          </p>
        )}
      </div>
    </section>
  );
}
