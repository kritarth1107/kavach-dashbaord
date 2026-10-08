"use client";

import {
  Buildings,
  ChatCircle,
  House,
  MapPin,
  MapTrifold,
  PencilSimple,
  Plus,
  Star,
  Stethoscope,
  Trash,
  X,
} from "@phosphor-icons/react";
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
import { DarkButton, Panel, PanelTitle, Tag } from "@/components/care-os/ui";

type Member = { userId: string; name: string; isRecipient: boolean };

const INPUT =
  "h-11 w-full rounded-[14px] border border-[var(--c-line)] bg-[var(--c-frame)] px-4 text-[14px] outline-none transition-colors placeholder:text-[var(--c-ink-3)] focus:border-[var(--c-ink)]";
const BTN_GHOST =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-[var(--c-line)] px-3.5 text-[12.5px] text-[var(--c-ink-2)] transition-colors hover:bg-[var(--c-frame)] hover:text-[var(--c-ink)] disabled:opacity-60";
const LABEL = "mb-1.5 block px-1 text-[12px] font-medium text-[var(--c-ink-2)]";

function PlaceIcon({ nickname, className }: { nickname: string; className?: string }) {
  const k = nickname.toLowerCase();
  const Icon = /\b(home|ghar|house)\b/.test(k)
    ? House
    : /\b(clinic|hospital|doctor|dr)\b/.test(k)
      ? Stethoscope
      : /\b(office|work|shop)\b/.test(k)
        ? Buildings
        : MapPin;
  return <Icon size={18} className={className} />;
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
        <span className={LABEL}>Nickname *</span>
        <input className={INPUT} value={f.nickname} onChange={set("nickname")} maxLength={40} placeholder="Home, Beta's flat, Clinic…" required />
      </label>
      <label className="sm:col-span-2">
        <span className={LABEL}>Flat / house, building, street *</span>
        <input className={INPUT} value={f.line1} onChange={set("line1")} maxLength={240} placeholder="Flat 12, Lake View Apartments, Shyamla Hills" required />
      </label>
      <label className="sm:col-span-2">
        <span className={LABEL}>Area / line 2</span>
        <input className={INPUT} value={f.line2} onChange={set("line2")} maxLength={160} />
      </label>
      <label>
        <span className={LABEL}>Landmark</span>
        <input className={INPUT} value={f.landmark} onChange={set("landmark")} maxLength={120} placeholder="Near…" />
      </label>
      <label>
        <span className={LABEL}>Pincode *</span>
        <input
          className={cn(INPUT, f.pincode && !pinOk && "border-[var(--c-danger-ink)]")}
          value={f.pincode}
          onChange={set("pincode")}
          inputMode="numeric"
          maxLength={6}
          placeholder="6 digits"
          required
        />
      </label>
      <label>
        <span className={LABEL}>City</span>
        <input className={INPUT} value={f.city} onChange={set("city")} maxLength={60} />
      </label>
      <label>
        <span className={LABEL}>State</span>
        <input className={INPUT} value={f.state} onChange={set("state")} maxLength={60} />
      </label>
      <label>
        <span className={LABEL}>Contact name (optional)</span>
        <input className={INPUT} value={f.contactName} onChange={set("contactName")} maxLength={80} />
      </label>
      <label>
        <span className={LABEL}>Contact phone (optional)</span>
        <input className={INPUT} value={f.contactPhone} onChange={set("contactPhone")} inputMode="tel" maxLength={16} />
      </label>
      {error && (
        <p className="sm:col-span-2 rounded-[14px] bg-[var(--c-accent-soft)] px-4 py-2.5 text-[13px] text-[var(--c-accent-soft-ink)]">{error}</p>
      )}
      <div className="flex items-center justify-end gap-3 pt-2 sm:col-span-2">
        <button type="button" className="h-11 px-4 text-[14px] text-[var(--c-ink-2)] hover:text-[var(--c-ink)]" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button
          type="submit"
          className="h-11 rounded-full bg-[var(--c-solid)] px-6 text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          disabled={!valid || saving}
        >
          {saving ? "Saving…" : submitLabel}
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

  const formOpen = adding || editingId !== null;
  const editingAddress = addresses.find((a) => a.addressId === editingId) ?? null;
  const closeForm = () => {
    setAdding(false);
    setEditingId(null);
  };

  if (!activeFamilyId && !familyLoading) {
    return <Panel className="py-14 text-center text-[13px] text-[var(--c-ink-2)]">Choose a family from the menu to see its address book.</Panel>;
  }
  const busyLoading = familyLoading || (loading && !addresses.length && !error);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 pb-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-[40px] leading-[1.02] tracking-[-0.035em] sm:text-[52px]">
            <span className="block font-light text-[var(--c-ink-3)]">Family</span>
            <span className="block font-medium">Addresses</span>
          </h1>
          <p className="mt-2 max-w-xl text-[13px] text-[var(--c-ink-2)]">
            Saved places for every order and ride. Saheli just asks “Deliver to Home?” so nobody types an address again.
          </p>
        </div>
        {canEdit && (
          <DarkButton
            onClick={() => {
              setAdding(true);
              setEditingId(null);
              setFormError("");
            }}
          >
            Add place
          </DarkButton>
        )}
      </div>

      {notice && (
        <p className="rounded-[14px] bg-[var(--c-card)] px-4 py-2.5 text-[13px]" role="status">
          {notice}
        </p>
      )}
      {error && <p className="rounded-[14px] bg-[var(--c-accent-soft)] px-4 py-2.5 text-[13px] text-[var(--c-accent-soft-ink)]">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          {busyLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[0, 1].map((i) => (
                <div key={i} className="h-[190px] animate-pulse rounded-[24px] bg-[var(--c-card)]" />
              ))}
            </div>
          ) : !addresses.length ? (
            <Panel className="flex flex-col items-center py-16 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--c-frame)]">
                <MapTrifold size={24} />
              </span>
              <p className="mt-4 text-[18px] font-medium">No saved places yet</p>
              <p className="mt-1 max-w-sm text-[13px] text-[var(--c-ink-2)]">
                Add Home here, or send the address to Saheli on WhatsApp and it will be saved to this book.
              </p>
            </Panel>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {addresses.map((a) => {
                const defaults = a.defaultForUserIds.map((id) => nameOf.get(id) ?? "a member");
                return (
                  <li key={a.addressId} className="flex flex-col rounded-[24px] bg-[var(--c-card)] p-5">
                    <div className="flex items-start gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--c-solid)] text-white">
                        <PlaceIcon nickname={a.nickname} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-[16px] font-medium">{a.nickname}</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {defaults.map((n) => (
                            <Tag key={n} tone="accent">
                              <Star size={11} weight="fill" className="mr-1 inline" /> Default for {n.split(" ")[0]}
                            </Tag>
                          ))}
                          {a.source === "whatsapp" && (
                            <Tag tone="light">
                              <ChatCircle size={11} className="mr-1 inline" /> From WhatsApp
                            </Tag>
                          )}
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 flex-1 break-words rounded-[16px] bg-[var(--c-frame)] px-4 py-3 text-[13px] leading-relaxed text-[var(--c-ink-2)]">
                      {a.fullAddress}
                      {(a.contactName || a.contactPhone) && (
                        <span className="mt-1 block text-[12px] text-[var(--c-ink-3)]">{[a.contactName, a.contactPhone].filter(Boolean).join(" · ")}</span>
                      )}
                    </p>
                    {canEdit && (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          className={BTN_GHOST}
                          onClick={() => {
                            setEditingId(a.addressId);
                            setAdding(false);
                            setFormError("");
                          }}
                        >
                          <PencilSimple size={13} /> Edit
                        </button>
                        {members.some((m) => !a.defaultForUserIds.includes(m.userId)) && (
                          <select
                            aria-label="Make default for"
                            className="h-9 max-w-[11rem] rounded-full border border-[var(--c-line)] bg-transparent px-3 text-[12.5px] text-[var(--c-ink-2)] outline-none hover:bg-[var(--c-frame)]"
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
                        )}
                        <div className="ml-auto">
                          {confirmDelete === a.addressId ? (
                            <span className="flex items-center gap-2 text-[12.5px]">
                              <button type="button" className="text-[var(--c-ink-2)] hover:text-[var(--c-ink)]" onClick={() => setConfirmDelete(null)}>
                                Keep
                              </button>
                              <button
                                type="button"
                                className="font-medium text-[var(--c-danger-ink)] disabled:opacity-50"
                                onClick={() => void onDelete(a.addressId)}
                                disabled={busyId === a.addressId}
                              >
                                {busyId === a.addressId ? "Deleting…" : "Delete"}
                              </button>
                            </span>
                          ) : (
                            <button
                              type="button"
                              aria-label={`Delete ${a.nickname}`}
                              className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--c-ink-3)] hover:bg-[var(--c-frame)] hover:text-[var(--c-danger-ink)]"
                              onClick={() => setConfirmDelete(a.addressId)}
                            >
                              <Trash size={15} />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
              {canEdit && (
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setAdding(true);
                      setEditingId(null);
                      setFormError("");
                    }}
                    className="flex h-full min-h-[190px] w-full flex-col items-center justify-center gap-3 rounded-[24px] border border-dashed border-[var(--c-ink-3)] text-[13px] text-[var(--c-ink-2)] hover:bg-[var(--c-card)]"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--c-line)]">
                      <Plus size={18} />
                    </span>
                    Add a place
                  </button>
                </li>
              )}
            </ul>
          )}
          {!canEdit && addresses.length > 0 && (
            <p className="mt-4 text-center text-[12px] text-[var(--c-ink-3)]">Only caregivers can change the address book.</p>
          )}
        </div>

        <aside className="space-y-4">
          <Panel accent>
            <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/80">Saved places</p>
            <p className="c-num mt-4 text-[56px] leading-none text-white">{addresses.length}</p>
            <p className="mt-2 text-[12px] text-white/80">
              {addresses.filter((a) => a.defaultForUserIds.length).length} set as someone&apos;s default
            </p>
          </Panel>
          <Panel>
            <PanelTitle title="How Saheli uses these" />
            <ul className="mt-3 space-y-2 text-[12.5px] text-[var(--c-ink-2)]">
              {[
                "Groceries, food and medicines go to the person's default place.",
                "Rides use these as pickup and drop points.",
                "An address sent on WhatsApp is saved here automatically.",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--c-accent)]" /> {t}
                </li>
              ))}
            </ul>
          </Panel>
        </aside>
      </div>

      <div className={cn("fixed inset-0 z-[60]", !formOpen && "pointer-events-none")} aria-hidden={!formOpen}>
        <button
          type="button"
          aria-label="Close"
          tabIndex={formOpen ? 0 : -1}
          onClick={closeForm}
          className={cn("absolute inset-0 bg-[rgba(20,42,34,0.28)] transition-opacity duration-300", formOpen ? "opacity-100" : "opacity-0")}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label={editingAddress ? `Edit ${editingAddress.nickname}` : "New place"}
          className={cn(
            "absolute inset-y-0 right-0 flex w-full max-w-[520px] flex-col bg-[var(--c-frame)] transition-[transform,visibility] duration-300 ease-out",
            formOpen ? "visible translate-x-0 shadow-[-30px_0_80px_-40px_rgba(0,0,0,0.35)]" : "invisible translate-x-full",
          )}
        >
          <div className="flex items-center justify-between px-6 pb-2 pt-6">
            <h2 className="text-[22px] font-medium tracking-[-0.02em]">{editingAddress ? `Edit “${editingAddress.nickname}”` : "New place"}</h2>
            <button type="button" onClick={closeForm} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--c-line)] hover:bg-[var(--c-card)]">
              <X size={18} />
            </button>
          </div>
          <div className="c-scroll flex-1 overflow-y-auto px-6 pb-6 pt-4">
            {formOpen && (
              <AddressForm
                key={editingId ?? "new"}
                initial={editingAddress ? fromAddress(editingAddress) : EMPTY}
                saving={saving}
                error={formError}
                submitLabel={editingAddress ? "Save changes" : "Save place"}
                onCancel={closeForm}
                onSubmit={(f) => (editingAddress ? onUpdate(editingAddress.addressId, f) : onCreate(f))}
              />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
