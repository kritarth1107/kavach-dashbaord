"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Camera } from "@phosphor-icons/react";
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
import { Avatar } from "./ui";

const ROLES: Array<{ value: FamilyMemberRole; label: string; hint: string }> = [
  { value: "care_recipient", label: "Cared for", hint: "Saheli looks after them on WhatsApp. No app or sign-in needed." },
  { value: "co_caregiver", label: "Co-caregiver", hint: "Sees everything and can manage care. Gets an email invite." },
  { value: "view_only", label: "View only", hint: "Follows updates but can't change anything. Gets an email invite." },
];

const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAX_PHOTO = 5 * 1024 * 1024;

const box =
  "h-11 rounded-[14px] border border-[var(--c-line)] bg-[var(--c-frame)] px-4 text-[14px] outline-none transition-colors placeholder:text-[var(--c-ink-3)] focus:border-[var(--c-ink)]";
const field = `${box} w-full`;

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between gap-2 px-1">
        <span className="text-[12px] font-medium text-[var(--c-ink-2)]">{label}</span>
        {hint && <span className="text-[11px] text-[var(--c-ink-3)]">{hint}</span>}
      </span>
      {children}
    </label>
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

  const role = ROLES.find((r) => r.value === form.role) ?? ROLES[0];
  const roleLocked = (value: FamilyMemberRole) =>
    editing && (member?.role === "primary_caregiver" || (member?.role === "care_recipient") !== (value === "care_recipient"));

  return (
    <form onSubmit={submit} className="mx-auto max-w-[600px] pb-10">
      <Link href="/dashboard/family" className="inline-flex items-center gap-2 text-[13px] text-[var(--c-ink-2)] hover:text-[var(--c-ink)]">
        <ArrowLeft size={15} /> Family
      </Link>
      <h1 className="mt-4 text-[34px] font-medium leading-tight tracking-[-0.03em]">
        {editing ? `Edit ${form.name.split(" ")[0] || "member"}` : "Add a family member"}
      </h1>

      {error && <p className="mt-4 rounded-[14px] bg-[var(--c-accent-soft)] px-4 py-2.5 text-[13px] text-[var(--c-accent-soft-ink)]">{error}</p>}

      <div className="mt-6 space-y-5 rounded-[24px] bg-[var(--c-card)] p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              choosePhoto(e.dataTransfer.files?.[0]);
            }}
            className="relative shrink-0 rounded-full"
            aria-label="Choose photo"
          >
            {shownPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shownPhoto} alt="" className="h-16 w-16 rounded-full object-cover" />
            ) : form.name.trim() ? (
              <Avatar name={form.name} size={64} />
            ) : (
              <span className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-[var(--c-ink-3)] bg-[var(--c-frame)]">
                <Camera size={22} className="text-[var(--c-ink-3)]" />
              </span>
            )}
          </button>
          <div className="min-w-0 text-[13px]">
            <button type="button" onClick={() => fileRef.current?.click()} className="font-medium hover:underline">
              {shownPhoto ? "Change photo" : "Add a photo"}
            </button>
            {photo && (
              <button type="button" onClick={() => setPhoto(null)} className="ml-3 text-[var(--c-ink-3)] hover:text-[var(--c-ink)]">
                Remove
              </button>
            )}
            <p className="text-[12px] text-[var(--c-ink-3)]">Optional · JPG, PNG or HEIC up to 5 MB</p>
          </div>
          <input ref={fileRef} type="file" accept={PHOTO_TYPES.join(",")} className="hidden" onChange={(e) => choosePhoto(e.target.files?.[0])} />
        </div>

        <div>
          <span className="mb-1.5 block px-1 text-[12px] font-medium text-[var(--c-ink-2)]">Role</span>
          <div className="grid grid-cols-3 gap-1 rounded-[14px] bg-[var(--c-frame)] p-1">
            {ROLES.map((r) => (
              <button
                key={r.value}
                type="button"
                disabled={roleLocked(r.value)}
                onClick={() => set("role", r.value)}
                className={cn(
                  "h-9 rounded-[10px] text-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                  form.role === r.value ? "bg-[var(--c-ink)] font-medium text-white" : "text-[var(--c-ink-2)] hover:text-[var(--c-ink)]",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 px-1 text-[12px] text-[var(--c-ink-3)]">{role.hint}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-[110px_1fr]">
          <Field label="Title">
            <select value={form.prefix} onChange={(e) => set("prefix", e.target.value)} className={field}>
              {prefixOptions.map((p) => (
                <option key={p.label} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Full name">
            <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Vasundara Devi" className={field} required />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Relationship to you" hint="how Saheli addresses them">
            <select value={form.relationship} onChange={(e) => set("relationship", e.target.value)} className={field}>
              <option value="">Choose</option>
              {relationships.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>
          <Field label="City">
            <input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Raipur" className={field} />
          </Field>
        </div>

        <Field label="WhatsApp number" hint={isRecipient ? "Saheli talks to them here" : undefined}>
          <div className="flex gap-2">
            <select value={form.phoneCountryCode} onChange={(e) => set("phoneCountryCode", e.target.value)} className={`${box} w-[104px] shrink-0 !px-3`} aria-label="Country code">
              {countryCodeOptions.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.code}
                </option>
              ))}
            </select>
            <input value={form.phone} onChange={(e) => set("phone", e.target.value.replace(/[^\d\s]/g, ""))} inputMode="tel" placeholder="98765 43210" className={`${box} min-w-0 flex-1`} />
          </div>
        </Field>

        {!editing && (
          <Field label="Email" hint={isRecipient ? "optional" : "the invite goes here"}>
            <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="name@example.com" className={field} />
          </Field>
        )}
      </div>

      <div className="mt-5 flex items-center justify-end gap-3">
        <Link href="/dashboard/family" className="h-11 rounded-full px-5 text-[14px] leading-[44px] text-[var(--c-ink-2)] hover:text-[var(--c-ink)]">
          Cancel
        </Link>
        <button
          type="submit"
          disabled={saving || loading}
          className="h-11 rounded-full bg-[var(--c-ink)] px-6 text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving…" : editing ? "Save changes" : isRecipient ? "Add to family" : "Send invite"}
        </button>
      </div>
    </form>
  );
}
