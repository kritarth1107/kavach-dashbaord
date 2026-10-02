"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Camera, Eye, Heart, Trash, UsersThree, type Icon as PhosphorIcon } from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getFamilyMembers, inviteFamilyMember, updateFamilyInvitation, updateFamilyMember, uploadMemberAvatar } from "@/lib/api";
import {
  apiMemberToFamilyMember,
  emptyMemberForm,
  memberToFormData,
  uiRoleToApi,
  type FamilyMember,
  type FamilyMemberRole,
  type MemberFormData,
} from "@/components/dashboard/family/family-data";
import { countryCodeOptions, prefixOptions, relationshipOptions } from "@/components/dashboard/family/form-options";
import { useFamily } from "@/components/dashboard/family-context";
import { cn } from "@/lib/utils";
import { usePerson } from "./person-context";
import { Avatar, DarkButton, Panel, PanelTitle } from "./ui";

const ROLES: Array<{ value: FamilyMemberRole; label: string; hint: string; icon: PhosphorIcon }> = [
  { value: "care_recipient", label: "Care recipient", hint: "The person Saheli looks after on WhatsApp. Joins directly, no app needed.", icon: Heart },
  { value: "co_caregiver", label: "Co-caregiver", hint: "Sees everything and can manage care. Accepts an email invite.", icon: UsersThree },
  { value: "view_only", label: "View only", hint: "Can follow updates but not change anything.", icon: Eye },
];

const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAX_PHOTO = 5 * 1024 * 1024;

const field =
  "h-12 w-full rounded-full border border-[var(--c-line)] bg-[var(--c-card)] px-5 text-[14px] outline-none transition-colors placeholder:text-[var(--c-ink-3)] focus:border-[var(--c-ink)] focus:bg-[var(--c-frame)]";

function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <span className="mb-2 flex items-baseline justify-between gap-2 px-1">
      <span className="text-[12px] font-medium">{children}</span>
      {hint && <span className="text-[11px] text-[var(--c-ink-3)]">{hint}</span>}
    </span>
  );
}

function sameMember(a: FamilyMember, form: MemberFormData) {
  const digits = (s: string) => s.replace(/\D/g, "").slice(-10);
  if (form.phone && a.phone && digits(a.phone) === digits(form.phone)) return true;
  if (form.email && a.email && a.email.toLowerCase() === form.email.trim().toLowerCase()) return true;
  return a.name.trim().toLowerCase() === form.name.trim().toLowerCase();
}

export function MemberFormPage({ memberId }: { memberId?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const { activeFamilyId } = useFamily();
  const { reloadMembers } = usePerson();
  const editing = Boolean(memberId);
  const [form, setForm] = useState<MemberFormData>(() => ({
    ...emptyMemberForm,
    role: (params.get("role") as FamilyMemberRole) || "care_recipient",
  }));
  const [member, setMember] = useState<FamilyMember | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const preview = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(editing);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing || !activeFamilyId) return;
    getFamilyMembers(activeFamilyId)
      .then(({ data }) => {
        const m = (data?.members ?? []).map(apiMemberToFamilyMember).find((x) => x.userId === memberId || x.id === memberId);
        if (!m) throw new Error("This member is not in the family");
        setMember(m);
        setForm(memberToFormData(m));
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Couldn't load member"))
      .finally(() => setLoading(false));
  }, [editing, activeFamilyId, memberId]);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const relationships = useMemo(() => {
    const v: string[] = [...relationshipOptions];
    if (form.relationship && !v.some((r) => r.toLowerCase() === form.relationship.toLowerCase())) v.unshift(form.relationship);
    return v;
  }, [form.relationship]);

  const set = <K extends keyof MemberFormData>(k: K, v: MemberFormData[K]) => setForm((f) => ({ ...f, [k]: v }));
  const isRecipient = form.role === "care_recipient";

  function choosePhoto(file: File | undefined) {
    setError("");
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type)) return setError("Photo must be JPG, PNG, WebP or HEIC.");
    if (file.size > MAX_PHOTO) return setError("Photo must be under 5 MB.");
    setPhoto(file);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeFamilyId) return;
    setError("");
    if (!form.name.trim()) return setError("Add their name.");
    if (!editing && isRecipient && !form.email.trim() && form.phone.replace(/\D/g, "").length < 6) {
      return setError("Add a WhatsApp number so Saheli can reach them.");
    }
    if (!editing && !isRecipient && !form.email.trim()) return setError("Add an email for the invite.");
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        namePrefix: form.prefix.trim() || undefined,
        role: uiRoleToApi(form.role),
        relationship: form.relationship,
        phone: form.phone,
        phoneCountryCode: form.phoneCountryCode,
        location: form.location,
      };
      let members: FamilyMember[] = [];
      if (editing && member) {
        const res =
          member.inviteId && member.status === "pending"
            ? await updateFamilyInvitation(activeFamilyId, member.inviteId, payload)
            : await updateFamilyMember(activeFamilyId, member.userId!, payload);
        members = (res.data?.members ?? []).map(apiMemberToFamilyMember);
      } else {
        const res = await inviteFamilyMember(activeFamilyId, { ...payload, email: form.email.trim() || undefined });
        members = (res.data?.members ?? []).map(apiMemberToFamilyMember);
      }
      if (photo) {
        const target = editing ? member : members.filter((m) => sameMember(m, form)).pop();
        if (target?.userId) {
          await uploadMemberAvatar(activeFamilyId, target.userId, photo);
        } else {
          // Invited members have no account until they accept; the photo can be added then.
          sessionStorage.setItem("kavach:photo-note", "Photo will be added once they accept the invite.");
        }
      }
      reloadMembers();
      router.push("/dashboard/family");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  const shownPhoto = preview ?? member?.avatarUrl ?? null;

  return (
    <form onSubmit={submit} className="mx-auto max-w-[1100px] space-y-4">
      <Link href="/dashboard/family" className="inline-flex items-center gap-2 text-[13px] text-[var(--c-ink-2)] hover:text-[var(--c-ink)]">
        <ArrowLeft size={15} /> Family
      </Link>
      <div className="flex flex-col gap-5 pb-2 lg:flex-row lg:items-end lg:justify-between">
        <h1 className="text-[40px] leading-[1.02] tracking-[-0.035em] sm:text-[52px]">
          <span className="block font-light text-[var(--c-ink-3)]">{editing ? "Edit" : "Add a"}</span>
          <span className="block font-medium">{editing ? form.name || "member" : isRecipient ? "Person to care for" : "Family member"}</span>
        </h1>
        <DarkButton type="submit" disabled={saving || loading}>
          {saving ? "Saving…" : editing ? "Save changes" : isRecipient ? "Add to family" : "Send invite"}
        </DarkButton>
      </div>

      {error && <p className="rounded-[14px] bg-[var(--c-accent-soft)] px-4 py-2.5 text-[13px] text-[var(--c-accent-soft-ink)]">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Panel className="flex flex-col items-center text-center">
          <PanelTitle title="Photo" right={<span className="text-[11px] text-[var(--c-ink-3)]">optional</span>} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              choosePhoto(e.dataTransfer.files?.[0]);
            }}
            className="group relative mt-6 rounded-full"
            aria-label="Choose photo"
          >
            {shownPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shownPhoto} alt="" className="h-40 w-40 rounded-full object-cover" />
            ) : (
              <span className="flex h-40 w-40 items-center justify-center rounded-full border border-dashed border-[var(--c-ink-3)] bg-[var(--c-frame)]">
                {form.name.trim() ? <Avatar name={form.name} size={96} /> : <Camera size={34} className="text-[var(--c-ink-3)]" />}
              </span>
            )}
            <span className="absolute bottom-1 right-1 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--c-accent)] text-white shadow-lg">
              <Camera size={18} weight="fill" />
            </span>
          </button>
          <input ref={fileRef} type="file" accept={PHOTO_TYPES.join(",")} className="hidden" onChange={(e) => choosePhoto(e.target.files?.[0])} />
          <p className="mt-5 text-[12px] leading-relaxed text-[var(--c-ink-2)]">
            A clear face helps the family recognise who Saheli is talking about. JPG, PNG, WebP or HEIC, up to 5 MB.
          </p>
          {photo && (
            <button type="button" onClick={() => setPhoto(null)} className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-[var(--c-accent)]">
              <Trash size={13} /> Remove photo
            </button>
          )}
        </Panel>

        <div className="space-y-4">
          <Panel>
            <PanelTitle title="Role" />
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {ROLES.map((r) => {
                const on = form.role === r.value;
                const locked = editing && (member?.role === "primary_caregiver" || (member?.role === "care_recipient") !== (r.value === "care_recipient"));
                return (
                  <button
                    key={r.value}
                    type="button"
                    disabled={locked}
                    onClick={() => set("role", r.value)}
                    className={cn(
                      "rounded-[20px] p-4 text-left transition-colors disabled:opacity-40",
                      on ? "bg-[var(--c-ink)] text-white" : "bg-[var(--c-frame)] hover:bg-white",
                    )}
                  >
                    <span className={cn("flex h-9 w-9 items-center justify-center rounded-full", on ? "bg-[var(--c-accent)] text-white" : "border border-[var(--c-line)]")}>
                      <r.icon size={17} weight={on ? "fill" : "regular"} />
                    </span>
                    <p className="mt-4 text-[14px] font-medium">{r.label}</p>
                    <p className={cn("mt-1 text-[12px] leading-relaxed", on ? "text-white/70" : "text-[var(--c-ink-2)]")}>{r.hint}</p>
                  </button>
                );
              })}
            </div>
          </Panel>

          <Panel>
            <PanelTitle title="About them" />
            <div className="mt-4 grid gap-4 sm:grid-cols-[140px_1fr]">
              <label>
                <Label>Title</Label>
                <select value={form.prefix} onChange={(e) => set("prefix", e.target.value)} className={field}>
                  {prefixOptions.map((p) => (
                    <option key={p.label} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <Label>Full name</Label>
                <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Vasundara Devi" className={field} required />
              </label>
            </div>
            <div className="mt-5">
              <Label hint="Saheli uses this to know how to address them">Relationship to you</Label>
              <div className="flex flex-wrap gap-2">
                {relationships.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => set("relationship", r)}
                    className={cn(
                      "h-9 rounded-[10px] border px-3.5 text-[13px] transition-colors",
                      form.relationship === r ? "border-transparent bg-[var(--c-accent)] text-white" : "border-[var(--c-line)] bg-[var(--c-frame)] text-[var(--c-ink-2)] hover:text-[var(--c-ink)]",
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <label className="mt-5 block">
              <Label>City</Label>
              <input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Raipur" className={field} />
            </label>
          </Panel>

          <Panel>
            <PanelTitle title="How to reach them" />
            <div className="mt-4 grid gap-4 sm:grid-cols-[120px_1fr]">
              <label>
                <Label>Code</Label>
                <select value={form.phoneCountryCode} onChange={(e) => set("phoneCountryCode", e.target.value)} className={field}>
                  {countryCodeOptions.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <Label hint={isRecipient ? "Saheli talks to them here" : undefined}>WhatsApp number</Label>
                <input value={form.phone} onChange={(e) => set("phone", e.target.value.replace(/[^\d\s]/g, ""))} inputMode="tel" placeholder="98765 43210" className={field} />
              </label>
            </div>
            {!editing && (
              <label className="mt-4 block">
                <Label hint={isRecipient ? "optional" : "the invite goes here"}>Email</Label>
                <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="name@example.com" className={field} />
              </label>
            )}
          </Panel>
        </div>
      </div>
    </form>
  );
}
