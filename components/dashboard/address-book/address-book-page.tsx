"use client";

import {
  BookUser,
  Building2,
  Check,
  Home,
  Loader2,
  MapPin,
  MessageCircle,
  Pencil,
  Plus,
  Star,
  Stethoscope,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useFamily } from "@/components/dashboard/family-context";
import {
  apiMemberToFamilyMember,
  canManageFamilyMembers,
  isCareRecipientRole,
} from "@/components/dashboard/family/family-data";
import { getFamilyMembers } from "@/lib/api";
import {
  createAddress,
  deleteAddress,
  listAddresses,
  setDefaultAddress,
  updateAddress,
  type AddressInput,
  type FamilyAddress,
} from "@/lib/address-book-api";
import { cn } from "@/lib/utils";

type Member = { userId: string; name: string; isRecipient: boolean };

const INPUT =
  "w-full rounded-xl border border-[var(--border-strong)] bg-[var(--input-bg)] px-3 py-2.5 text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] focus:border-primary focus:ring-2 focus:ring-[var(--primary-ring)]";
const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-[var(--primary-dark)] disabled:opacity-60";
const BTN_GHOST =
  "inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border-strong)] px-3 py-2 text-[12px] font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface)] disabled:opacity-60";

function PlaceIcon({ nickname, className }: { nickname: string; className?: string }) {
  const k = nickname.toLowerCase();
  const Icon = /\b(home|ghar|house)\b/.test(k)
    ? Home
    : /\b(clinic|hospital|doctor|dr)\b/.test(k)
      ? Stethoscope
      : /\b(office|work|shop)\b/.test(k)
        ? Building2
        : MapPin;
  return <Icon className={className} strokeWidth={2.25} />;
}

const EMPTY: Required<Pick<AddressInput, "nickname" | "line1" | "pincode">> & {
  line2: string;
  landmark: string;
  city: string;
  state: string;
  contactName: string;
  contactPhone: string;
} = { nickname: "", line1: "", line2: "", landmark: "", city: "", state: "", pincode: "", contactName: "", contactPhone: "" };

type FormState = typeof EMPTY;

function fromAddress(a: FamilyAddress): FormState {
  return {
    nickname: a.nickname,
    line1: a.line1,
    line2: a.line2 ?? "",
    landmark: a.landmark ?? "",
    city: a.city ?? "",
    state: a.state ?? "",
    pincode: a.pincode,
    contactName: a.contactName ?? "",
    contactPhone: a.contactPhone ?? "",
  };
}

function AddressForm({
  initial,
  saving,
  error,
  onCancel,
  onSubmit,
  submitLabel,
}: {
  initial: FormState;
  saving: boolean;
  error: string;
  onCancel: () => void;
  onSubmit: (f: FormState) => void;
  submitLabel: string;
}) {
  const [f, setF] = useState<FormState>(initial);
  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => setF((p) => ({ ...p, [k]: e.target.value }));
  const pinOk = /^[1-9]\d{5}$/.test(f.pincode.trim());
  const valid = f.nickname.trim().length > 0 && f.line1.trim().length >= 3 && pinOk;
  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid && !saving) onSubmit(f);
      }}
    >
      <label className="sm:col-span-2">
        <span className="mb-1 block text-[11.5px] font-semibold text-[var(--text-secondary)]">Nickname *</span>
        <input className={INPUT} value={f.nickname} onChange={set("nickname")} maxLength={40} placeholder="Home, Beta's flat, Clinic…" required />
      </label>
      <label className="sm:col-span-2">
        <span className="mb-1 block text-[11.5px] font-semibold text-[var(--text-secondary)]">Flat / house, building, street *</span>
        <input className={INPUT} value={f.line1} onChange={set("line1")} maxLength={240} placeholder="Flat 12, Lake View Apartments, Shyamla Hills" required />
      </label>
      <label className="sm:col-span-2">
        <span className="mb-1 block text-[11.5px] font-semibold text-[var(--text-secondary)]">Area / line 2</span>
        <input className={INPUT} value={f.line2} onChange={set("line2")} maxLength={160} />
      </label>
      <label>
        <span className="mb-1 block text-[11.5px] font-semibold text-[var(--text-secondary)]">Landmark</span>
        <input className={INPUT} value={f.landmark} onChange={set("landmark")} maxLength={120} placeholder="Near…" />
      </label>
      <label>
        <span className="mb-1 block text-[11.5px] font-semibold text-[var(--text-secondary)]">Pincode *</span>
        <input
          className={cn(INPUT, f.pincode && !pinOk && "border-[var(--danger-text)]")}
          value={f.pincode}
          onChange={set("pincode")}
          inputMode="numeric"
          maxLength={6}
          placeholder="6 digits"
          required
        />
      </label>
      <label>
        <span className="mb-1 block text-[11.5px] font-semibold text-[var(--text-secondary)]">City</span>
        <input className={INPUT} value={f.city} onChange={set("city")} maxLength={60} />
      </label>
      <label>
        <span className="mb-1 block text-[11.5px] font-semibold text-[var(--text-secondary)]">State</span>
        <input className={INPUT} value={f.state} onChange={set("state")} maxLength={60} />
      </label>
      <label>
        <span className="mb-1 block text-[11.5px] font-semibold text-[var(--text-secondary)]">Contact name (optional)</span>
        <input className={INPUT} value={f.contactName} onChange={set("contactName")} maxLength={80} />
      </label>
      <label>
        <span className="mb-1 block text-[11.5px] font-semibold text-[var(--text-secondary)]">Contact phone (optional)</span>
        <input className={INPUT} value={f.contactPhone} onChange={set("contactPhone")} inputMode="tel" maxLength={16} />
      </label>
      {error && (
        <p className="sm:col-span-2 rounded-xl bg-[var(--danger-bg)] px-3 py-2 text-[12px] font-medium text-[var(--danger-text)]">{error}</p>
      )}
      <div className="flex flex-wrap justify-end gap-2 sm:col-span-2">
        <button type="button" className={BTN_GHOST} onClick={onCancel} disabled={saving}>
          <X className="h-3.5 w-3.5" /> Cancel
        </button>
        <button type="submit" className={BTN_PRIMARY} disabled={!valid || saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

function toInput(f: FormState): AddressInput {
  const opt = (v: string) => (v.trim() ? v.trim() : null);
  return {
    nickname: f.nickname.trim(),
    line1: f.line1.trim(),
    line2: opt(f.line2),
    landmark: opt(f.landmark),
    city: opt(f.city),
    state: opt(f.state),
    pincode: f.pincode.trim(),
    contactName: opt(f.contactName),
    contactPhone: opt(f.contactPhone),
  };
}

/** Remount per family so one family's places never linger while another's load. */
export function AddressBookPage() {
  const { activeFamilyId } = useFamily();
  return <AddressBook key={activeFamilyId ?? "none"} />;
}

function AddressBook() {
  const { activeFamilyId, activeFamily, loading: familyLoading } = useFamily();
  const canEdit = canManageFamilyMembers(activeFamily?.role ?? null);
  const [addresses, setAddresses] = useState<FamilyAddress[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!activeFamilyId) return;
    let cancelled = false;
    Promise.all([listAddresses(activeFamilyId), getFamilyMembers(activeFamilyId).catch(() => null)])
      .then(([list, mem]) => {
        if (cancelled) return;
        setAddresses(list);
        const ms = (mem?.data?.members ?? [])
          .map(apiMemberToFamilyMember)
          .filter((m) => m.status === "joined" && m.userId)
          .map((m) => ({ userId: m.userId as string, name: m.name, isRecipient: isCareRecipientRole(m.role) }))
          .sort((x, y) => Number(y.isRecipient) - Number(x.isRecipient));
        setMembers(ms);
        setError("");
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Couldn't load the address book");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeFamilyId]);

  const nameOf = useMemo(() => new Map(members.map((m) => [m.userId, m.name])), [members]);
  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(""), 3000);
  };

  const replace = (a: FamilyAddress) => setAddresses((prev) => prev.map((x) => (x.addressId === a.addressId ? a : x)));

  async function onCreate(f: FormState) {
    if (!activeFamilyId) return;
    setSaving(true);
    setFormError("");
    try {
      const firstRecipient = members.find((m) => m.isRecipient);
      const input = toInput(f);
      if (!addresses.length && firstRecipient) input.defaultForUserIds = [firstRecipient.userId];
      const a = await createAddress(activeFamilyId, input);
      setAddresses((prev) => [a, ...prev]);
      setAdding(false);
      flash(`Saved “${a.nickname}”`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  async function onUpdate(id: string, f: FormState) {
    if (!activeFamilyId) return;
    setSaving(true);
    setFormError("");
    try {
      replace(await updateAddress(activeFamilyId, id, toInput(f)));
      setEditingId(null);
      flash("Saved");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  async function onSetDefault(id: string, memberUserId: string) {
    if (!activeFamilyId || !memberUserId) return;
    setBusyId(id);
    try {
      await setDefaultAddress(activeFamilyId, id, memberUserId);
      // Only one default per member → refresh every card's badges.
      setAddresses(await listAddresses(activeFamilyId));
      flash(`Default for ${nameOf.get(memberUserId) ?? "member"} updated`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't set default");
    } finally {
      setBusyId(null);
    }
  }

  async function onDelete(id: string) {
    if (!activeFamilyId) return;
    setBusyId(id);
    try {
      await deleteAddress(activeFamilyId, id);
      setAddresses((prev) => prev.filter((a) => a.addressId !== id));
      setConfirmDelete(null);
      flash("Deleted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete");
    } finally {
      setBusyId(null);
    }
  }

  if (familyLoading || (loading && !addresses.length && !error)) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!activeFamilyId) {
    return <div className="panel-card px-6 py-14 text-center text-[13px] text-[var(--text-secondary)]">Choose a family from the switcher to see its address book.</div>;
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[1.35rem] font-extrabold tracking-[-0.02em] text-[var(--text-primary)]">Address book</h1>
          <p className="mt-1 max-w-md text-[13px] leading-relaxed text-[var(--text-secondary)]">
            Your family’s saved places. Saheli uses them for every order and ride and just asks “Deliver to Home?” — nobody has to
            type an address again.
          </p>
        </div>
        {canEdit && !adding && (
          <button
            type="button"
            className={BTN_PRIMARY}
            onClick={() => {
              setAdding(true);
              setEditingId(null);
              setFormError("");
            }}
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} /> Add place
          </button>
        )}
      </div>

      {notice && (
        <p className="mb-4 rounded-xl bg-primary-light px-3 py-2 text-[12px] font-semibold text-primary" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-xl bg-[var(--danger-bg)] px-3 py-2 text-[12px] font-medium text-[var(--danger-text)]">{error}</p>
      )}

      {adding && (
        <div className="panel-card mb-5 p-4 sm:p-5">
          <p className="mb-3 text-[14px] font-bold text-[var(--text-primary)]">New place</p>
          <AddressForm
            initial={EMPTY}
            saving={saving}
            error={formError}
            submitLabel="Save place"
            onCancel={() => setAdding(false)}
            onSubmit={onCreate}
          />
        </div>
      )}

      {!addresses.length && !adding ? (
        <div className="panel-card flex flex-col items-center px-6 py-14 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light text-primary">
            <BookUser className="h-6 w-6" />
          </div>
          <p className="text-[14px] font-bold text-[var(--text-primary)]">No saved places yet</p>
          <p className="mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-[var(--text-tertiary)]">
            Add Home here, or just send the address to Saheli on WhatsApp — it will be saved to this book.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {addresses.map((a) => {
            const defaults = a.defaultForUserIds.map((id) => nameOf.get(id) ?? "a member");
            const editing = editingId === a.addressId;
            return (
              <li key={a.addressId} className="panel-card p-4 sm:p-5">
                {editing ? (
                  <>
                    <p className="mb-3 text-[14px] font-bold text-[var(--text-primary)]">Edit “{a.nickname}”</p>
                    <AddressForm
                      initial={fromAddress(a)}
                      saving={saving}
                      error={formError}
                      submitLabel="Save changes"
                      onCancel={() => setEditingId(null)}
                      onSubmit={(f) => onUpdate(a.addressId, f)}
                    />
                  </>
                ) : (
                  <>
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary">
                        <PlaceIcon nickname={a.nickname} className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="break-words text-[15px] font-extrabold text-[var(--text-primary)]">{a.nickname}</p>
                          {defaults.map((n) => (
                            <span key={n} className="status-pill-success inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold">
                              <Star className="h-3 w-3" /> Default for {n}
                            </span>
                          ))}
                          {a.source === "whatsapp" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--surface)] px-2 py-0.5 text-[10.5px] font-semibold text-[var(--text-tertiary)]">
                              <MessageCircle className="h-3 w-3" /> from WhatsApp
                            </span>
                          )}
                        </div>
                        <p className="mt-1 break-words text-[12.5px] leading-relaxed text-[var(--text-secondary)]">{a.fullAddress}</p>
                        {(a.contactName || a.contactPhone) && (
                          <p className="mt-0.5 text-[11.5px] text-[var(--text-tertiary)]">
                            Contact: {[a.contactName, a.contactPhone].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </div>
                    </div>
                    {canEdit && (
                      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-3">
                        <button
                          type="button"
                          className={BTN_GHOST}
                          onClick={() => {
                            setEditingId(a.addressId);
                            setAdding(false);
                            setFormError("");
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </button>
                        {members.length > 0 && (
                          <label className="inline-flex min-w-0 items-center gap-1.5">
                            <span className="sr-only">Make default for</span>
                            <select
                              className="max-w-[12rem] rounded-xl border border-[var(--border-strong)] bg-[var(--input-bg)] px-2.5 py-2 text-[12px] font-semibold text-[var(--text-secondary)] outline-none focus:border-primary"
                              value=""
                              disabled={busyId === a.addressId}
                              onChange={(e) => void onSetDefault(a.addressId, e.target.value)}
                            >
                              <option value="">Make default for…</option>
                              {members
                                .filter((m) => !a.defaultForUserIds.includes(m.userId))
                                .map((m) => (
                                  <option key={m.userId} value={m.userId}>
                                    {m.name}
                                    {m.isRecipient ? " (cared for)" : ""}
                                  </option>
                                ))}
                            </select>
                          </label>
                        )}
                        <div className="ml-auto flex items-center gap-2">
                          {confirmDelete === a.addressId ? (
                            <>
                              <span className="text-[12px] text-[var(--text-secondary)]">Delete?</span>
                              <button type="button" className={BTN_GHOST} onClick={() => setConfirmDelete(null)} disabled={busyId === a.addressId}>
                                No
                              </button>
                              <button
                                type="button"
                                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--danger-text)] px-3 py-2 text-[12px] font-bold text-white disabled:opacity-60"
                                onClick={() => void onDelete(a.addressId)}
                                disabled={busyId === a.addressId}
                              >
                                {busyId === a.addressId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                Yes, delete
                              </button>
                            </>
                          ) : (
                            <button type="button" className={cn(BTN_GHOST, "text-[var(--danger-text)]")} onClick={() => setConfirmDelete(a.addressId)}>
                              <Trash2 className="h-3.5 w-3.5" /> Delete
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {!canEdit && addresses.length > 0 && (
        <p className="mt-4 text-center text-[12px] text-[var(--text-tertiary)]">Only caregivers can change the address book.</p>
      )}
    </div>
  );
}
