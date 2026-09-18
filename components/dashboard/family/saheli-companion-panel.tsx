"use client";

import { Heart, Loader2, Sparkles, Sun } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  getFamilyMemories,
  getSaheliCompanion,
  refreshSaheliMemory,
  triggerSaheliOutreach,
  updateSaheliCompanion,
  type FamilyMemoryItem,
  type SaheliCompanionProfile,
} from "@/lib/api";
import { useFamily } from "@/components/dashboard/family-context";

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

export function SaheliCompanionPanel({
  recipientUserId,
  recipientName,
  onOutreachSent,
}: SaheliCompanionPanelProps) {
  const { activeFamilyId } = useFamily();
  const [profile, setProfile] = useState<SaheliCompanionProfile | null>(null);
  const [memories, setMemories] = useState<FamilyMemoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [outreaching, setOutreaching] = useState(false);
  const [refreshingMemory, setRefreshingMemory] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!activeFamilyId) return;
    setLoading(true);
    setError("");
    try {
      const [companionRes, memoryRes] = await Promise.all([
        getSaheliCompanion(activeFamilyId, recipientUserId),
        getFamilyMemories(activeFamilyId, recipientUserId).catch(() => ({
          data: { memories: [] as FamilyMemoryItem[] },
        })),
      ]);
      setProfile(companionRes.data ?? null);
      setMemories(memoryRes.data?.memories ?? []);
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
            {refreshingMemory ? "Syncing…" : "Refresh memory"}
          </button>
        </div>
        {memories.length > 0 ? (
          <ul className="max-h-40 space-y-2 overflow-y-auto">
            {memories.slice(0, 8).map((m) => (
              <li
                key={m.id}
                className="rounded-lg border border-[var(--border-strong)] bg-[var(--input-bg)] px-2.5 py-2"
              >
                <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
                  {TOPIC_LABELS[m.topic] ?? m.category}
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                  {m.content}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[11px] text-[var(--text-tertiary)]">
            No memories yet — Saheli learns from chats and uploaded reports.
          </p>
        )}
      </div>
    </section>
  );
}
