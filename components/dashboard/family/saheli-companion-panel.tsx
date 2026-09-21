"use client";

import { AlertTriangle, Bell, Heart, Loader2, Moon, Sparkles, Sun } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  correctFamilyMemory,
  forgetFamilyMemory,
  getFamilyMemories,
  getSaheliCompanion,
  getSaheliCompanionActivity,
  refreshSaheliMemory,
  triggerSaheliOutreach,
  updateSaheliCompanion,
  type FamilyMemoryItem,
  type SaheliCompanionActivity,
  type SaheliCompanionProfile,
} from "@/lib/api";
import { useFamily } from "@/components/dashboard/family-context";
import { SaheliMemoryPanel } from "@/components/dashboard/family/saheli-memory-panel";

type SaheliCompanionPanelProps = {
  recipientUserId: string;
  recipientName: string;
  onOutreachSent?: () => void;
};

const TOPIC_LABELS: Record<string, string> = {
  day_life: "Daily life",
  family: "Family",
  hobbies: "Hobbies & TV",
  food: "Food & cooking",
  mood: "Mood & feelings",
  memories: "Old memories",
};

const NUDGE_LABELS: Record<string, string> = {
  pre_task: "Upcoming reminder",
  missed_task: "Missed task follow-up",
  praise: "Praise",
  loneliness: "Check-in",
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
  onOutreachSent,
}: SaheliCompanionPanelProps) {
  const { activeFamilyId } = useFamily();
  const [profile, setProfile] = useState<SaheliCompanionProfile | null>(null);
  const [activity, setActivity] = useState<SaheliCompanionActivity | null>(null);
  const [memories, setMemories] = useState<FamilyMemoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [outreaching, setOutreaching] = useState(false);
  const [refreshingMemory, setRefreshingMemory] = useState(false);
  const [memoryActionId, setMemoryActionId] = useState<string | null>(null);
  const [correctingId, setCorrectingId] = useState<string | null>(null);
  const [correctionText, setCorrectionText] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!activeFamilyId) return;
    setLoading(true);
    setError("");
    try {
      const [companionRes, memoryRes, activityRes] = await Promise.all([
        getSaheliCompanion(activeFamilyId, recipientUserId),
        getFamilyMemories(activeFamilyId, recipientUserId).catch(() => ({
          data: { memories: [] as FamilyMemoryItem[] },
        })),
        getSaheliCompanionActivity(activeFamilyId, recipientUserId).catch(() => ({
          data: { nudges: [], escalations: [] } as SaheliCompanionActivity,
        })),
      ]);
      setProfile(companionRes.data ?? null);
      setMemories(memoryRes.data?.memories ?? []);
      setActivity(activityRes.data ?? { nudges: [], escalations: [] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Saheli settings");
    } finally {
      setLoading(false);
    }
  }, [activeFamilyId, recipientUserId]);

  useEffect(() => {
    void load();
  }, [load]);

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

  async function handleReachOut() {
    if (!activeFamilyId) return;
    setOutreaching(true);
    setError("");
    try {
      await triggerSaheliOutreach(activeFamilyId, recipientUserId, "casual");
      onOutreachSent?.();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Outreach failed");
    } finally {
      setOutreaching(false);
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

        <button
          type="button"
          disabled={outreaching}
          onClick={() => void handleReachOut()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-[12px] font-bold text-white disabled:opacity-50"
        >
          {outreaching ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sun className="h-3.5 w-3.5" />
          )}
          Reach out to {recipientName.split(" ")[0]} now
        </button>
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
                      {e.caregiversNotified} caregiver(s) notified ·{" "}
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
                    {n.delivered ? "" : " · pending"}
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

      <div className="border-t border-[var(--border-strong)] px-4 py-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Heart className="h-3.5 w-3.5 text-primary" />
            <p className="text-[11px] font-bold text-[var(--text-primary)]">
              What Saheli remembers
            </p>
          </div>
          <button
            type="button"
            disabled={refreshingMemory}
            onClick={() => {
              if (!activeFamilyId) return;
              setRefreshingMemory(true);
              void refreshSaheliMemory(activeFamilyId, recipientUserId)
                .then(() => load())
                .finally(() => setRefreshingMemory(false));
            }}
            className="text-[10px] font-semibold text-primary hover:underline disabled:opacity-50"
          >
            {refreshingMemory ? "Syncing…" : "Sync chat history"}
          </button>
        </div>
        {memories.length > 0 ? (
          <ul className="max-h-40 space-y-2 overflow-y-auto">
            {memories.slice(0, 8).map((m) => (
              <li
                key={m.id}
                className="rounded-lg border border-[var(--border-strong)] bg-[var(--input-bg)] px-2.5 py-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
                    {TOPIC_LABELS[m.topic] ?? m.category}
                    {m.superseded_by ? " · superseded" : ""}
                  </p>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      disabled={memoryActionId === m.id}
                      className="text-[10px] font-semibold text-primary hover:underline disabled:opacity-50"
                      onClick={() => {
                        setCorrectingId(m.id);
                        setCorrectionText(m.content);
                      }}
                    >
                      Fix
                    </button>
                    <button
                      type="button"
                      disabled={memoryActionId === m.id}
                      className="text-[10px] font-semibold text-red-600 hover:underline disabled:opacity-50"
                      onClick={() => {
                        if (!activeFamilyId) return;
                        if (!window.confirm("Forget this memory? Saheli will stop using it.")) return;
                        setMemoryActionId(m.id);
                        void forgetFamilyMemory(activeFamilyId, recipientUserId, m.id)
                          .then(() => load())
                          .finally(() => setMemoryActionId(null));
                      }}
                    >
                      Forget
                    </button>
                  </div>
                </div>
                <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                  {m.content}
                </p>
                <p className="mt-1 text-[10px] text-[var(--text-tertiary)]">
                  {m.source_role ?? "elder"} · {formatRelativeTime(m.created_at)}
                </p>
                {correctingId === m.id ? (
                  <div className="mt-2 space-y-1.5">
                    <textarea
                      value={correctionText}
                      onChange={(e) => setCorrectionText(e.target.value)}
                      rows={2}
                      className="w-full rounded-md border border-[var(--border-strong)] bg-[var(--surface)] px-2 py-1 text-[11px]"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded-md bg-primary px-2 py-1 text-[10px] font-bold text-white"
                        onClick={() => {
                          if (!activeFamilyId || correctionText.trim().length < 4) return;
                          setMemoryActionId(m.id);
                          void correctFamilyMemory(
                            activeFamilyId,
                            recipientUserId,
                            m.id,
                            correctionText.trim(),
                          )
                            .then(() => {
                              setCorrectingId(null);
                              return load();
                            })
                            .finally(() => setMemoryActionId(null));
                        }}
                      >
                        Save fix
                      </button>
                      <button
                        type="button"
                        className="text-[10px] text-[var(--text-tertiary)]"
                        onClick={() => setCorrectingId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[11px] text-[var(--text-tertiary)]">
            No memories yet — Saheli learns from chats and uploaded reports.
          </p>
        )}
      </div>

      <SaheliMemoryPanel recipientUserId={recipientUserId} />
    </section>
  );
}
