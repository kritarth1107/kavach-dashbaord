"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getFamilyMembers, getMe, getNotifications } from "@/lib/api";
import {
  apiMemberToFamilyMember,
  canManageFamilyMembers,
  isCareRecipientRole,
  type FamilyMember,
} from "@/components/dashboard/family/family-data";
import { useFamily } from "@/components/dashboard/family-context";
import type { Person } from "./shell";

type PersonCtx = {
  familyId: string | null;
  people: Person[];
  members: FamilyMember[];
  selectedId: string | null;
  selected: Person | null;
  select: (id: string) => void;
  isCaregiver: boolean;
  isRecipient: boolean;
  me: { id: string | null; name: string; avatar?: string | null };
  unread: number;
  loading: boolean;
  error: string;
  reloadMembers: () => void;
};

const Ctx = createContext<PersonCtx | null>(null);
const key = (familyId: string) => `kavach:person:${familyId}`;

export function PersonProvider({ children }: { children: React.ReactNode }) {
  const { activeFamilyId, activeFamily, userId, loading: famLoading } = useFamily();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const role = activeFamily?.role ?? null;
  const isCaregiver = canManageFamilyMembers(role);
  const isRecipient = isCareRecipientRole(role);
  const [state, setState] = useState<{ key: string | null; members: FamilyMember[]; error: string }>({ key: null, members: [], error: "" });
  const [me, setMe] = useState<{ id: string | null; name: string; avatar?: string | null }>({ id: null, name: "" });
  const [unread, setUnread] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    getMe()
      .then(({ data }) => data?.user && setMe({ id: data.user.userId ?? null, name: data.user.fullName ?? "", avatar: data.user.avatarUrl }))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!activeFamilyId) return;
    let off = false;
    getFamilyMembers(activeFamilyId)
      .then(({ data }) => {
        if (!off) setState({ key: activeFamilyId, members: (data?.members ?? []).map(apiMemberToFamilyMember), error: "" });
      })
      .catch((err: unknown) => !off && setState({ key: activeFamilyId, members: [], error: err instanceof Error ? err.message : "Couldn't load family" }));
    getNotifications(activeFamilyId)
      .then(({ data }) => !off && setUnread(data?.unreadCount ?? 0))
      .catch(() => undefined);
    return () => {
      off = true;
    };
  }, [activeFamilyId, tick]);

  const members = useMemo(() => (state.key === activeFamilyId ? state.members : []), [state, activeFamilyId]);
  const people: Person[] = useMemo(
    () =>
      members
        .filter((m) => isCareRecipientRole(m.role) && m.status === "joined" && m.userId)
        .map((m) => ({ id: m.userId as string, name: [m.prefix, m.name].filter(Boolean).join(" ") || m.name, relation: m.relationship || undefined, photo: m.avatarUrl })),
    [members],
  );

  const requested = params.get("recipient");
  const stored = typeof window !== "undefined" && activeFamilyId ? window.localStorage.getItem(key(activeFamilyId)) : null;
  const selectedId = useMemo(() => {
    if (!people.length) return isRecipient ? userId : null;
    for (const id of [requested, stored]) if (id && people.some((p) => p.id === id)) return id;
    return people[0].id;
  }, [people, requested, stored, isRecipient, userId]);

  // Keep ?recipient= in the URL so older pages that read it agree with the switcher.
  useEffect(() => {
    if (selectedId && !requested && people.length > 1) {
      const q = new URLSearchParams(params.toString());
      q.set("recipient", selectedId);
      router.replace(`${pathname}?${q}`, { scroll: false });
    }
  }, [selectedId, requested, people.length, params, pathname, router]);

  const select = useCallback(
    (id: string) => {
      if (activeFamilyId) window.localStorage.setItem(key(activeFamilyId), id);
      const q = new URLSearchParams(params.toString());
      q.set("recipient", id);
      router.replace(`${pathname}?${q}`, { scroll: false });
    },
    [activeFamilyId, params, pathname, router],
  );

  const value: PersonCtx = {
    familyId: activeFamilyId,
    people,
    members,
    selectedId,
    selected: people.find((p) => p.id === selectedId) ?? null,
    select,
    isCaregiver,
    isRecipient,
    me,
    unread,
    loading: famLoading || (Boolean(activeFamilyId) && state.key !== activeFamilyId),
    error: state.error,
    reloadMembers: () => setTick((n) => n + 1),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePerson() {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePerson must be used inside PersonProvider");
  return v;
}

/** "Maa" for a recipient whose relationship is Mother, else their first name. */
export function callName(p: Person | null): string {
  if (!p) return "";
  const r = (p.relation || "").toLowerCase();
  if (["mother", "mom", "mum", "maa", "amma"].includes(r)) return "Maa";
  if (["father", "dad", "papa", "pitaji"].includes(r)) return "Papa";
  if (r.startsWith("grandmother") || r === "dadi" || r === "nani") return r === "nani" ? "Nani" : "Dadi";
  if (r.startsWith("grandfather") || r === "dada" || r === "nana") return r === "nana" ? "Nana" : "Dada";
  return p.name.split(" ")[0];
}
