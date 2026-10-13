"use client";
/**
 * Pages the admin console switches on (backend feature flags, GET /api/families/:familyId/features). A page behind a
 * switch has no menu entry and no route until its switch is on, e.g. Food & nutrition until the founder approves it.
 */
import { useEffect, useState } from "react";
import { request } from "@/lib/activity-api";

export type Features = { nutritionPage: boolean };

const OFF: Features = { nutritionPage: false };
const cache = new Map<string, { at: number; p: Promise<Features> }>();
const FRESH_MS = 5 * 60_000;

export function getFeatures(familyId: string): Promise<Features> {
  const hit = cache.get(familyId);
  if (hit && Date.now() - hit.at < FRESH_MS) return hit.p;
  const p = request<Partial<Features>>(`/api/families/${encodeURIComponent(familyId)}/features`)
    .then((d) => ({ ...OFF, ...(d ?? {}) }))
    // a switch that can't be read stays off
    .catch(() => {
      cache.delete(familyId);
      return OFF;
    });
  cache.set(familyId, { at: Date.now(), p });
  return p;
}

/** null while loading (also while the family is not known yet: a page must not be closed before its switch is read). */
export function useFeatures(familyId: string | null | undefined): Features | null {
  const [got, setGot] = useState<{ familyId: string; features: Features } | null>(null);
  useEffect(() => {
    if (!familyId) return;
    let off = false;
    void getFeatures(familyId).then((features) => !off && setGot({ familyId, features }));
    return () => {
      off = true;
    };
  }, [familyId]);
  if (!familyId) return null;
  return got?.familyId === familyId ? got.features : null;
}
