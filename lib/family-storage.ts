const STORAGE_KEY = "kavach_active_family";

type StoredFamilySelection = {
  userId: string;
  familyId: string;
};

function readStored(): StoredFamilySelection | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as StoredFamilySelection | string;
    if (typeof parsed === "string") {
      return null;
    }

    if (parsed.userId && parsed.familyId) {
      return parsed;
    }

    return null;
  } catch {
    return null;
  }
}

export function getStoredFamilyId(userId: string): string | null {
  const stored = readStored();
  if (!stored || stored.userId !== userId) return null;
  return stored.familyId;
}

export function setStoredFamilyId(familyId: string, userId: string): void {
  if (typeof window === "undefined") return;

  try {
    const value: StoredFamilySelection = { userId, familyId };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // ignore quota / private mode errors
  }
}

export function clearStoredFamilyId(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function resolveActiveFamilyId(
  families: { familyId: string }[],
  serverActiveId: string | null | undefined,
  userId: string,
): string | null {
  if (families.length === 0) return null;

  const stored = getStoredFamilyId(userId);
  if (stored && families.some((family) => family.familyId === stored)) {
    return stored;
  }

  if (
    serverActiveId &&
    families.some((family) => family.familyId === serverActiveId)
  ) {
    return serverActiveId;
  }

  return families[0]?.familyId ?? null;
}
