"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getSaheliMemoryEntity,
  getSaheliMemoryProfile,
  type SaheliMemoryEntityHit,
} from "@/lib/api";
import { useFamily } from "@/components/dashboard/family-context";

const KIND_LABELS: Record<string, string> = {
  medication: "Medicines",
  person: "People",
  condition: "Conditions",
  preference: "Preferences",
  symptom: "Symptoms",
  procedure: "Procedures",
  visit: "Visits",
  episode: "Episodes",
  health: "Health",
};

type SaheliMemoryPanelProps = {
  recipientUserId: string;
};

export function SaheliMemoryPanel({ recipientUserId }: SaheliMemoryPanelProps) {
  const { activeFamilyId } = useFamily();
  const [entities, setEntities] = useState<SaheliMemoryEntityHit[]>([]);
  const [profileMd, setProfileMd] = useState("");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [entityBody, setEntityBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingEntity, setLoadingEntity] = useState(false);
  const [error, setError] = useState("");

  const grouped = useMemo(() => {
    const map = new Map<string, SaheliMemoryEntityHit[]>();
    for (const hit of entities) {
      const key = hit.kind || "other";
      const list = map.get(key) ?? [];
      list.push(hit);
      map.set(key, list);
    }
    return map;
  }, [entities]);

  const load = useCallback(async () => {
    if (!activeFamilyId) return;
    setLoading(true);
    setError("");
    try {
      const { data } = await getSaheliMemoryProfile(activeFamilyId, recipientUserId);
      setProfileMd(data?.profile_md ?? "");
      setEntities(data?.entities ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load memory index");
    } finally {
      setLoading(false);
    }
  }, [activeFamilyId, recipientUserId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function openEntity(slug: string) {
    if (!activeFamilyId) return;
    setSelectedSlug(slug);
    setLoadingEntity(true);
    setError("");
    try {
      const { data } = await getSaheliMemoryEntity(activeFamilyId, recipientUserId, slug);
      setEntityBody(data?.body_md ?? "(No body yet — nightly dream job may not have run.)");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load entity");
      setEntityBody("");
    } finally {
      setLoadingEntity(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 text-[11px] text-[var(--text-tertiary)]">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Loading memory index…
      </div>
    );
  }

  return (
    <div className="border-t border-[var(--border-strong)] px-4 py-3">
      <p className="mb-2 text-[11px] font-bold text-[var(--text-primary)]">What Saheli knows</p>
      {error ? <p className="mb-2 text-[11px] text-red-600">{error}</p> : null}

      {profileMd ? (
        <pre className="mb-3 max-h-28 overflow-y-auto whitespace-pre-wrap rounded-lg border border-[var(--border-strong)] bg-[var(--input-bg)] p-2 text-[10px] text-[var(--text-secondary)]">
          {profileMd.slice(0, 1200)}
        </pre>
      ) : null}

      {entities.length === 0 ? (
        <p className="text-[11px] text-[var(--text-tertiary)]">
          No curated entities yet — facts appear here after the nightly memory dream job.
        </p>
      ) : (
        <div className="space-y-3">
          {[...grouped.entries()].map(([kind, hits]) => (
            <div key={kind}>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
                {KIND_LABELS[kind] ?? kind}
              </p>
              <ul className="space-y-1">
                {hits.map((hit) => (
                  <li key={hit.slug}>
                    <button
                      type="button"
                      onClick={() => void openEntity(hit.slug)}
                      className={`w-full rounded-lg border px-2.5 py-2 text-left text-[11px] ${
                        selectedSlug === hit.slug
                          ? "border-primary bg-primary/5"
                          : "border-[var(--border-strong)] bg-[var(--input-bg)]"
                      }`}
                    >
                      <span className="font-semibold text-[var(--text-primary)]">{hit.title}</span>
                      <p className="mt-0.5 text-[10px] text-[var(--text-tertiary)]">{hit.snippet}</p>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {selectedSlug ? (
        <div className="mt-3 rounded-lg border border-[var(--border-strong)] bg-[var(--input-bg)] p-2.5">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
            {selectedSlug}
          </p>
          {loadingEntity ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--text-tertiary)]" />
          ) : (
            <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap text-[10px] leading-relaxed text-[var(--text-secondary)]">
              {entityBody}
            </pre>
          )}
        </div>
      ) : null}
    </div>
  );
}
