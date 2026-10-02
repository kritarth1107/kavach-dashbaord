"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DotsThree,
  EnvelopeSimple,
  MagnifyingGlass,
  MapPin,
  PencilSimple,
  Phone,
  Prohibit,
  Plus,
  Trash,
  UserPlus,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getFamilyMembers, removeFamilyMember, revokeFamilyInvitation, updateFamilyMemberStatus } from "@/lib/api";
import { apiMemberToFamilyMember, canManageFamilyMembers, type FamilyMember } from "@/components/dashboard/family/family-data";
import { useFamily } from "@/components/dashboard/family-context";
import { cn } from "@/lib/utils";
import { usePerson } from "./person-context";
import { Avatar, DarkButton, Panel, PanelTitle, PillTabs, Tag } from "./ui";

const ROLE: Record<string, string> = {
  care_recipient: "Care recipient",
  primary_caregiver: "Primary caregiver",
  co_caregiver: "Co-caregiver",
  view_only: "View only",
  family_doctor: "Family doctor",
};

type Filter = "all" | "recipients" | "circle";

function contact(m: FamilyMember) {
  const phone = m.phone ? `${m.phoneCountryCode ?? ""} ${m.phone}`.trim() : "";
  return { phone, email: m.email && m.email !== "—" ? m.email : "" };
}

function Menu({ member, onRemove, onBlock }: { member: FamilyMember; onRemove: () => void; onBlock: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", off);
    return () => document.removeEventListener("mousedown", off);
  }, [open]);
  const editHref = `/dashboard/family/${encodeURIComponent(member.userId ?? member.id)}/edit`;
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={`Options for ${member.name}`}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--c-line)] bg-[var(--c-frame)] hover:bg-[var(--c-card)]"
      >
        <DotsThree size={18} weight="bold" />
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-20 w-48 rounded-[18px] border border-[var(--c-line)] bg-[var(--c-frame)] p-1.5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.3)]">
          <Link href={editHref} className="flex items-center gap-2 rounded-[12px] px-3 py-2 text-[13px] hover:bg-[var(--c-card)]">
            <PencilSimple size={15} /> Edit details
          </Link>
          {member.userId && member.status !== "pending" && (
            <button type="button" onClick={() => (setOpen(false), onBlock())} className="flex w-full items-center gap-2 rounded-[12px] px-3 py-2 text-left text-[13px] hover:bg-[var(--c-card)]">
              <Prohibit size={15} /> {member.status === "blocked" ? "Unblock" : "Block"}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              if (window.confirm(`Remove ${member.name} from the family?`)) onRemove();
            }}
            className="flex w-full items-center gap-2 rounded-[12px] px-3 py-2 text-left text-[13px] text-[var(--c-accent)] hover:bg-[var(--c-card)]"
          >
            <Trash size={15} /> {member.inviteId && member.status === "pending" ? "Cancel invite" : "Remove"}
          </button>
        </div>
      )}
    </div>
  );
}

function RecipientCard({ m, canManage, onRemove, onBlock }: { m: FamilyMember; canManage: boolean; onRemove: () => void; onBlock: () => void }) {
  const c = contact(m);
  return (
    <Panel className="flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <Avatar name={m.name} src={m.avatarUrl} size={64} />
        <div className="flex items-center gap-2">
          <Tag tone={m.status === "joined" ? "accent" : "light"}>{m.status === "joined" ? "On Saheli" : m.status}</Tag>
          {canManage && <Menu member={m} onRemove={onRemove} onBlock={onBlock} />}
        </div>
      </div>
      <p className="mt-5 text-[22px] font-medium leading-tight tracking-[-0.02em]">{[m.prefix, m.name].filter(Boolean).join(" ")}</p>
      <p className="mt-1 text-[13px] text-[var(--c-ink-2)]">{m.relationship || "Care recipient"}</p>
      <div className="mt-5 space-y-2 text-[12.5px] text-[var(--c-ink-2)]">
        {c.phone && (
          <p className="flex items-center gap-2">
            <Phone size={14} /> {c.phone}
          </p>
        )}
        {m.location && (
          <p className="flex items-center gap-2">
            <MapPin size={14} /> {m.location}
          </p>
        )}
      </div>
      {m.userId && (
        <Link
          href={`/dashboard?recipient=${m.userId}`}
          className="mt-6 inline-flex h-10 items-center justify-center rounded-full bg-[var(--c-ink)] px-4 text-[13px] font-medium text-white hover:opacity-90"
        >
          Open {m.name.split(" ")[0]}&apos;s care
        </Link>
      )}
    </Panel>
  );
}

function CircleRow({ m, me, canManage, onRemove, onBlock }: { m: FamilyMember; me: string | null; canManage: boolean; onRemove: () => void; onBlock: () => void }) {
  const c = contact(m);
  const isMe = m.userId === me;
  return (
    <li className="flex items-center gap-4 border-b border-[var(--c-line)] py-3.5 last:border-0">
      <Avatar name={m.name} src={m.avatarUrl} size={44} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-medium">
          {m.name} {isMe && <span className="text-[var(--c-ink-3)]">(you)</span>}
        </p>
        <p className="truncate text-[12px] text-[var(--c-ink-3)]">
          {[m.relationship, c.email || c.phone].filter(Boolean).join(" · ")}
        </p>
      </div>
      <span className="hidden sm:block">
        <Tag tone="light">{ROLE[m.role] ?? m.role}</Tag>
      </span>
      {m.status !== "joined" && <Tag tone={m.status === "blocked" ? "danger" : "accent"}>{m.status === "pending" ? "invited" : m.status}</Tag>}
      {canManage && !isMe && m.role !== "primary_caregiver" ? <Menu member={m} onRemove={onRemove} onBlock={onBlock} /> : <span className="w-9" />}
    </li>
  );
}

export function FamilyPage() {
  const router = useRouter();
  const { activeFamilyId, activeFamily, userId } = useFamily();
  const { reloadMembers } = usePerson();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const canManage = canManageFamilyMembers(myRole ?? activeFamily?.role);

  const load = useCallback(async () => {
    if (!activeFamilyId) return;
    try {
      const { data } = await getFamilyMembers(activeFamilyId);
      setMyRole(data?.myRole ?? null);
      setMembers((data?.members ?? []).map(apiMemberToFamilyMember));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load family");
    } finally {
      setLoading(false);
    }
  }, [activeFamilyId]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  const term = q.trim().toLowerCase();
  const match = useCallback(
    (m: FamilyMember) => !term || [m.name, m.email, m.relationship, m.location, m.phone ?? ""].some((v) => (v || "").toLowerCase().includes(term)),
    [term],
  );
  const recipients = useMemo(() => members.filter((m) => m.role === "care_recipient" && match(m)), [members, match]);
  const circle = useMemo(() => members.filter((m) => m.role !== "care_recipient" && match(m)), [members, match]);

  async function act(fn: () => Promise<{ data?: { members: Parameters<typeof apiMemberToFamilyMember>[0][] } }>) {
    setError("");
    try {
      const { data } = await fn();
      if (data) setMembers(data.members.map(apiMemberToFamilyMember));
      reloadMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That did not work");
    }
  }
  const remove = (m: FamilyMember) =>
    act(() => (m.inviteId && m.status === "pending" ? revokeFamilyInvitation(activeFamilyId!, m.inviteId) : removeFamilyMember(activeFamilyId!, m.userId!)));
  const block = (m: FamilyMember) => act(() => updateFamilyMemberStatus(activeFamilyId!, m.userId!, m.status === "blocked" ? "JOINED" : "BLOCKED"));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-5 pb-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-[40px] leading-[1.02] tracking-[-0.035em] sm:text-[52px]">
            <span className="block font-light text-[var(--c-ink-3)]">{(activeFamily?.name ?? "Your").replace(/\s+family$/i, "")}</span>
            <span className="block font-medium">Family</span>
          </h1>
          <p className="mt-2 max-w-xl text-[13px] text-[var(--c-ink-2)]">
            The people you care for, and the people who care with you. Care recipients join directly; everyone else accepts an invite.
          </p>
        </div>
        {canManage && <DarkButton onClick={() => router.push("/dashboard/family/new")}>Add member</DarkButton>}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PillTabs<Filter>
          value={filter}
          onChange={setFilter}
          tabs={[
            { id: "all", label: `Everyone · ${members.length}` },
            { id: "recipients", label: `Being cared for · ${members.filter((m) => m.role === "care_recipient").length}` },
            { id: "circle", label: `Care circle · ${members.filter((m) => m.role !== "care_recipient").length}` },
          ]}
        />
        <label className="flex h-11 w-full items-center gap-2 rounded-full bg-[var(--c-card)] px-4 sm:w-[300px]">
          <MagnifyingGlass size={16} className="text-[var(--c-ink-3)]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search family" className="w-full bg-transparent text-[13px] outline-none placeholder:text-[var(--c-ink-3)]" />
        </label>
      </div>

      {error && <p className="rounded-[14px] bg-[var(--c-accent-soft)] px-4 py-2.5 text-[13px] text-[var(--c-accent-soft-ink)]">{error}</p>}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[260px] animate-pulse rounded-[24px] bg-[var(--c-card)]" />
          ))}
        </div>
      ) : (
        <>
          {filter !== "circle" && (
            <section>
              <div className="mb-3 mt-2">
                <PanelTitle title="Being cared for" />
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {recipients.map((m) => (
                  <RecipientCard key={m.id} m={m} canManage={canManage} onRemove={() => void remove(m)} onBlock={() => void block(m)} />
                ))}
                {canManage && (
                  <Link
                    href="/dashboard/family/new?role=care_recipient"
                    className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-[24px] border border-dashed border-[var(--c-ink-3)] text-[var(--c-ink-2)] transition-colors hover:border-[var(--c-accent)] hover:text-[var(--c-accent)]"
                  >
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--c-card)]">
                      <Plus size={22} weight="bold" />
                    </span>
                    <span className="text-[14px] font-medium">Add someone to care for</span>
                  </Link>
                )}
              </div>
            </section>
          )}
          {filter !== "recipients" && (
            <Panel>
              <PanelTitle
                title="Care circle"
                right={
                  canManage ? (
                    <Link href="/dashboard/family/new?role=co_caregiver" className="flex items-center gap-1.5 text-[12px] font-medium hover:text-[var(--c-accent)]">
                      <UserPlus size={15} /> Invite
                    </Link>
                  ) : undefined
                }
              />
              {circle.length === 0 ? (
                <p className="py-6 text-[13px] text-[var(--c-ink-3)]">No one else yet. Invite a sibling, spouse or the family doctor.</p>
              ) : (
                <ul className="mt-2">
                  {circle.map((m) => (
                    <CircleRow key={m.id} m={m} me={userId} canManage={canManage} onRemove={() => void remove(m)} onBlock={() => void block(m)} />
                  ))}
                </ul>
              )}
            </Panel>
          )}
          {members.length > 0 && (
            <p className={cn("flex items-center gap-2 px-1 text-[12px] text-[var(--c-ink-3)]")}>
              <EnvelopeSimple size={14} /> Invites go by email; care recipients use Saheli on WhatsApp, no app needed.
            </p>
          )}
        </>
      )}
    </div>
  );
}
