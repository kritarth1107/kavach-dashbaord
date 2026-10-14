"use client";

import { Ambulance, ArrowClockwise, Check, Copy, LinkBreak, MapPin, PencilSimple, Phone, Printer, Trash, WhatsappLogo } from "@phosphor-icons/react";
import QRCode from "qrcode";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  createEmergencyLink,
  getEmergencyCard,
  getEmergencyLink,
  revokeEmergencyLink,
  type EmergencyCard,
  type EmergencyLink,
} from "@/lib/care-features-api";
import { getPortrait, saveFact, stopFact, type Portrait } from "@/lib/care-memory-api";
import type { FamilyMember } from "@/components/dashboard/family/family-data";
import { Field, INPUT, Notice, PageHeading, PrintSheet, SideDrawer, fmtAt, telHref, useLoad } from "./care-kit";
import { EmergencyCardView, PROFILE_FIELDS } from "./emergency-card-view";
import { MedicalIdCard, type CallPerson } from "./medical-id-card";
import { callName, possessive, usePerson } from "./person-context";
import { PersonPhoto, Ring } from "./portrait-kit";
import { DarkButton, Panel, PanelTitle, SmallButton, Tag } from "./ui";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const EDIT_FIELDS = ["blood_group", "height", "weight", "mobility", "insurance", "id_note"];
const PLACEHOLDER: Record<string, string> = {
  height: "5 ft 2 in",
  weight: "58 kg",
  mobility: "Walks with a stick",
  insurance: "Star Health, policy SH-2231",
  id_note: "Aadhaar copy in the blue file",
};

type Contact = EmergencyCard["contacts"][number];
type ContactForm = { name: string; relation: string; phone: string; emergency: boolean };
const NEW_CONTACT: ContactForm = { name: "", relation: "", phone: "", emergency: true };

function errText(e: unknown) {
  return e instanceof Error ? e.message : "Something went wrong";
}

function Editor({
  familyId,
  subjectId,
  personName,
  card,
  onSaved,
}: {
  familyId: string;
  subjectId: string;
  personName: string;
  card: EmergencyCard;
  onSaved: () => void;
}) {
  const [profile, setProfile] = useState<Record<string, string>>(() => Object.fromEntries(EDIT_FIELDS.map((k) => [k, card.profile[k] ?? ""])));
  const [contact, setContact] = useState<ContactForm>(NEW_CONTACT);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const label = (k: string) => PROFILE_FIELDS.find((f) => f.key === k)?.label ?? k;
  const dirty = EDIT_FIELDS.filter((k) => (profile[k] ?? "").trim() !== (card.profile[k] ?? ""));

  async function saveProfile() {
    setBusy("profile");
    setMsg(null);
    try {
      for (const k of dirty) {
        const value = profile[k].trim();
        if (value) {
          await saveFact(familyId, subjectId, {
            domain: "profile",
            name: k,
            details: { value },
            sentence: `${personName}'s ${label(k).toLowerCase()} is ${value}.`,
          });
        } else {
          await stopFact(familyId, subjectId, { domain: "profile", name: k, reason: "Cleared on the dashboard" });
        }
      }
      setMsg({ text: "Saved. The card and Saheli are up to date." });
      onSaved();
    } catch (e) {
      setMsg({ text: errText(e), error: true });
    } finally {
      setBusy(null);
    }
  }

  async function saveContact() {
    const c = { name: contact.name.trim(), relation: contact.relation.trim(), phone: contact.phone.trim(), emergency: contact.emergency };
    if (!c.name) return;
    setBusy("contact");
    setMsg(null);
    try {
      await saveFact(familyId, subjectId, {
        domain: "contact",
        name: c.name,
        details: { name: c.name, phone: c.phone || null, relation: c.relation || null, emergency: c.emergency },
        sentence: `${c.name}${c.relation ? ` (${c.relation})` : ""} is ${c.emergency ? "an emergency contact" : "a contact"} for ${personName}${c.phone ? `, phone ${c.phone}` : ""}.`,
      });
      setContact(NEW_CONTACT);
      setMsg({ text: `${c.name} saved.` });
      onSaved();
    } catch (e) {
      setMsg({ text: errText(e), error: true });
    } finally {
      setBusy(null);
    }
  }

  async function remove(c: Contact) {
    setBusy(`rm:${c.name}`);
    setMsg(null);
    try {
      await stopFact(familyId, subjectId, { domain: "contact", name: c.name, reason: "Removed on the dashboard" });
      setMsg({ text: `${c.name} removed.` });
      onSaved();
    } catch (e) {
      setMsg({ text: errText(e), error: true });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-7">
      {msg && <Notice tone={msg.error ? "soft" : "plain"}>{msg.text}</Notice>}
      <section>
        <p className="mb-3 text-[14px] font-medium">Health details</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {EDIT_FIELDS.map((k) => (
            <Field key={k} label={label(k)} className={k === "blood_group" || k === "height" || k === "weight" ? "" : "sm:col-span-3"}>
              {k === "blood_group" ? (
                <select className={INPUT} value={profile[k]} onChange={(e) => setProfile({ ...profile, [k]: e.target.value })}>
                  <option value="">Not known</option>
                  {BLOOD_GROUPS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              ) : (
                <input className={INPUT} value={profile[k]} maxLength={120} placeholder={PLACEHOLDER[k]} onChange={(e) => setProfile({ ...profile, [k]: e.target.value })} />
              )}
            </Field>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <SmallButton dark disabled={!dirty.length || busy !== null} onClick={() => void saveProfile()}>
            {busy === "profile" ? "Saving…" : "Save details"}
          </SmallButton>
        </div>
      </section>

      <section>
        <p className="mb-3 text-[14px] font-medium">Contacts</p>
        {card.contacts.length > 0 && (
          <ul className="mb-4 space-y-2">
            {card.contacts.map((c) => (
              <li key={c.name} className="flex items-center gap-3 rounded-[16px] bg-[var(--c-card)] px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium">
                    {c.name}
                    {c.relation && <span className="font-normal capitalize text-[var(--c-ink-2)]"> · {c.relation}</span>}
                  </p>
                  <p className="text-[12px] text-[var(--c-ink-3)]">
                    {[c.phone, c.emergency ? "Emergency contact" : "Contact"].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Edit ${c.name}`}
                  onClick={() => setContact({ name: c.name, relation: c.relation ?? "", phone: c.phone ?? "", emergency: c.emergency })}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--c-ink-2)] hover:bg-[var(--c-frame)]"
                >
                  <PencilSimple size={15} />
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${c.name}`}
                  disabled={busy !== null}
                  onClick={() => void remove(c)}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--c-ink-3)] hover:bg-[var(--c-frame)] hover:text-[var(--c-danger-ink)] disabled:opacity-40"
                >
                  <Trash size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name *" className="sm:col-span-2">
            <input className={INPUT} value={contact.name} maxLength={80} placeholder="Mrs. Sharma" onChange={(e) => setContact({ ...contact, name: e.target.value })} />
          </Field>
          <Field label="Relation">
            <input className={INPUT} value={contact.relation} maxLength={40} placeholder="Neighbour, son…" onChange={(e) => setContact({ ...contact, relation: e.target.value })} />
          </Field>
          <Field label="Phone">
            <input className={INPUT} value={contact.phone} maxLength={20} inputMode="tel" placeholder="+91 90000 11111" onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
          </Field>
          <label className="flex items-center gap-2.5 px-1 text-[13px] sm:col-span-2">
            <input
              type="checkbox"
              checked={contact.emergency}
              onChange={(e) => setContact({ ...contact, emergency: e.target.checked })}
              className="h-4 w-4 accent-[var(--c-ink)]"
            />
            Call in an emergency
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          {contact.name && (
            <SmallButton onClick={() => setContact(NEW_CONTACT)} disabled={busy !== null}>
              Clear
            </SmallButton>
          )}
          <SmallButton dark disabled={!contact.name.trim() || busy !== null} onClick={() => void saveContact()}>
            {busy === "contact" ? "Saving…" : card.contacts.some((c) => c.name === contact.name.trim()) ? "Save contact" : "Add contact"}
          </SmallButton>
        </div>
      </section>
    </div>
  );
}

/** "Speaks Hindi (हिन्दी), in Roman letters…" → "Speaks Hindi". */
function shortLanguage(text?: string | null) {
  return text ? text.split(/[,(]/)[0].trim() : null;
}

/** Who a helper calls: the family's caregivers with a real number (primary first), then the record's emergency contacts. */
export function callPeople(card: EmergencyCard, members: FamilyMember[], subjectId: string | null): CallPerson[] {
  const out: CallPerson[] = [];
  const caregivers = members
    .filter((m) => m.userId && m.userId !== subjectId && m.status === "joined" && (m.role === "primary_caregiver" || m.role === "co_caregiver"))
    .sort((a, b) => Number(b.role === "primary_caregiver") - Number(a.role === "primary_caregiver"));
  for (const m of caregivers) {
    const cc = m.phoneCountryCode || "";
    if (!m.phone || cc.startsWith("+99")) continue;
    const rel = m.relationship && m.relationship !== "—" ? m.relationship : m.role === "primary_caregiver" ? "caregiver" : "family";
    out.push({ name: m.name, relation: rel, phone: `${cc}${m.phone}`, photo: m.avatarUrl });
  }
  for (const c of card.contacts) {
    if (!c.emergency || !c.phone || out.some((o) => o.name.toLowerCase() === c.name.toLowerCase())) continue;
    out.push({ name: c.name, relation: c.relation, phone: c.phone });
  }
  return out;
}

/** The public card as a helper sees it on their phone. */
function HelperPreview({ card, name, photo, callers }: { card: EmergencyCard; name: string; photo?: string | null; callers: CallPerson[] }) {
  return (
    <div className="mx-auto w-[248px] rounded-[40px] bg-[#0d0f0e] p-[9px] shadow-[0_30px_50px_-28px_rgba(0,0,0,0.6)]">
      <div className="relative h-[470px] overflow-hidden rounded-[32px] bg-[var(--c-solid)] px-3.5 pt-8 text-[var(--c-on-solid)]">
        <p className="text-center text-[10.5px] font-semibold tracking-[0.14em] text-[var(--c-accent)]">MEDICAL ID</p>
        <div className="mt-3 flex flex-col items-center">
          <PersonPhoto name={name} src={photo} rounded="rounded-[20px]" className="h-16 w-16 border-2 border-white" text={22} />
          <p className="mt-2 text-[18px] font-medium">{name}</p>
          <p className="text-[11px] opacity-70">{[card.profile.blood_group, card.conditions[0]].filter(Boolean).join(" · ")}</p>
        </div>
        {card.allergies.length > 0 && (
          <p className="mt-3 rounded-[12px] bg-[var(--c-danger)] px-3 py-2 text-[11.5px] text-white">
            <b>Allergic:</b> {card.allergies.map((a) => a.allergen).join(", ")}
          </p>
        )}
        <div className="mt-2 grid gap-1.5">
          {callers.slice(0, 2).map((c) => (
            <div key={c.name} className="flex items-center gap-2 rounded-[12px] bg-white/[0.08] p-1.5">
              <PersonPhoto name={c.name} src={c.photo} rounded="rounded-full" className="h-[30px] w-[30px]" text={11} />
              <span className="min-w-0 flex-1 truncate text-[12px]">Call {c.name}</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--c-accent)] text-[var(--c-accent-ink)]">
                <Phone size={13} weight="fill" />
              </span>
            </div>
          ))}
        </div>
        <p className="mt-2.5 text-[11px] leading-relaxed opacity-75">
          {card.medicines.map((m) => m.name).join(" · ") || (card.none?.medicine ? "No regular medicines" : "")}
          {card.home && (
            <>
              <br />
              {card.home} · <span className="text-[var(--c-accent)]">Maps</span>
            </>
          )}
        </p>
        <span className="absolute bottom-3.5 left-3.5 right-3.5 flex h-10 items-center justify-center rounded-full bg-[var(--c-danger)] text-[13px] font-semibold text-white">Call 112</span>
      </div>
    </div>
  );
}

export function EmergencyPage() {
  const { familyId, selectedId, selected, members } = usePerson();
  const key = familyId && selectedId ? `${familyId}/${selectedId}` : null;
  const loadCard = useCallback(() => getEmergencyCard(familyId!, selectedId!), [familyId, selectedId]);
  const loadLink = useCallback(async () => (await getEmergencyLink(familyId!, selectedId!)) ?? null, [familyId, selectedId]);
  const loadPortrait = useCallback(() => getPortrait(familyId!, selectedId!), [familyId, selectedId]);
  const card = useLoad<EmergencyCard>(key, loadCard);
  const link = useLoad<EmergencyLink | null>(key, loadLink);
  const portrait = useLoad<Portrait>(key, loadPortrait);
  const [qrState, setQrState] = useState<{ url: string; svg: string } | null>(null);
  const [linkState, setLinkState] = useState<{ key: string | null; link: EmergencyLink | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState("");
  const [editing, setEditing] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);
  const closeEditor = useCallback(() => setEditing(false), []);

  const name = callName(selected);
  const active = linkState && linkState.key === key ? linkState.link : (link.data ?? null);
  const data = card.data;
  const qr = active && qrState?.url === active.url ? qrState.svg : null;

  useEffect(() => {
    if (!active?.url || qrState?.url === active.url) return;
    let off = false;
    QRCode.toString(active.url, { type: "svg", margin: 0, width: 192, color: { dark: "#1b201e", light: "#ffffff" } })
      .then((svg) => !off && setQrState({ url: active.url, svg }))
      .catch(() => undefined);
    return () => {
      off = true;
    };
  }, [active?.url, qrState?.url]);

  async function share() {
    if (!familyId || !selectedId) return;
    shareRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (active) return;
    setBusy(true);
    setErr("");
    try {
      const l = await createEmergencyLink(familyId, selectedId);
      setLinkState({ key, link: l ?? null });
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    if (!familyId || !selectedId) return;
    setBusy(true);
    setErr("");
    try {
      await revokeEmergencyLink(familyId, selectedId);
      setLinkState({ key, link: null });
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy(false);
    }
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setErr("Couldn't copy. Select the link and copy it.");
    }
  }

  const waText = active ? encodeURIComponent(`${selected?.self ? "My" : `${name}'s`} emergency card (blood group, allergies, medicines, contacts): ${active.url}`) : "";
  const person = portrait.data?.person;
  const callers = data ? callPeople(data, members, selectedId) : [];
  const hospital = data?.hospital[0];
  const mapQuery = hospital ? [hospital.name, hospital.address || person?.city].filter(Boolean).join(", ") : "";
  const lines = [
    [person?.age ? `${person.age} years` : null, person?.city, shortLanguage(person?.language)].filter(Boolean).join(" · "),
    [data?.profile.mobility, selected?.relation && selected.relation !== "self care" ? selected.relation : null].filter(Boolean).join(" · "),
  ].filter(Boolean);
  const checks = data
    ? [
        { label: "Blood group", ok: Boolean(data.profile.blood_group) },
        { label: "Allergies", ok: data.allergies.length > 0 || Boolean(data.none?.allergy) },
        { label: "Someone to call", ok: callers.length > 0 },
        { label: "Doctor", ok: data.doctors.length > 0 },
        { label: "Hospital", ok: data.hospital.length > 0 },
        { label: "Home address", ok: Boolean(data.home) },
      ]
    : [];
  const done = checks.filter((c) => c.ok).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-5 pb-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <PageHeading top={possessive(selected)} bottom="Emergency card" />
          <p className="mt-3 max-w-[560px] text-[13px] leading-relaxed text-[var(--c-ink-2)]">
            Everything a neighbour, driver or doctor needs in the first ten minutes. Kept current from {selected?.self ? "your" : `${name}'s`} chats with Saheli and your edits.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <SmallButton icon={PencilSimple} onClick={() => setEditing(true)} disabled={!data}>
            Edit
          </SmallButton>
          <SmallButton icon={Printer} onClick={() => window.print()} disabled={!data}>
            Print card
          </SmallButton>
          <DarkButton onClick={() => void share()} disabled={busy || !data}>
            Share card
          </DarkButton>
        </div>
      </div>

      {err && <Notice>{err}</Notice>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          {card.error && !data ? (
            <Panel className="flex flex-col items-center py-14 text-center">
              <p className="text-[18px] font-medium">The emergency card couldn&apos;t load</p>
              <p className="mt-1 max-w-sm text-[13px] text-[var(--c-ink-2)]">{card.error}</p>
              <SmallButton dark icon={ArrowClockwise} className="mt-5" disabled={card.loading} onClick={card.reload}>
                {card.loading ? "Trying…" : "Try again"}
              </SmallButton>
            </Panel>
          ) : !data ? (
            <div className="h-[560px] animate-pulse rounded-[32px] bg-[var(--c-card)]" />
          ) : (
            <MedicalIdCard
              card={data}
              name={selected?.name ?? ""}
              photo={selected?.photo}
              lines={lines}
              callers={callers}
              qrSvg={active ? qr : null}
              onMakeLink={() => void share()}
              updated="kept current by Saheli"
            />
          )}

          <div className="mt-2 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            <Panel>
              <PanelTitle title="Card health" right={<span className="text-[12px] text-[var(--c-ink-2)]">{data ? `${done} of ${checks.length} filled` : ""}</span>} />
              <div className="mt-4 flex items-center gap-5">
                <Ring pct={checks.length ? (done / checks.length) * 100 : 0} />
                <ul className="grid flex-1 grid-cols-1 gap-x-4 gap-y-1.5 text-[12.5px] sm:grid-cols-2">
                  {checks.map((c) => (
                    <li key={c.label} className={c.ok ? "" : "text-[var(--c-accent-soft-ink)]"}>
                      {c.ok ? "✓ " : "! "}
                      {c.label}
                      {!c.ok && (
                        <button type="button" onClick={() => setEditing(true)} className="ml-1 underline underline-offset-2">
                          add
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="mt-3 text-[11.5px] text-[var(--c-ink-3)]">
                Allergies, medicines, doctor and hospital also change in the care plan, or on WhatsApp: “{name === "You" ? "my" : `${name} ka`} blood group B+ hai”.
              </p>
            </Panel>

            <div ref={shareRef}>
              <Panel>
                <PanelTitle title="Share link" right={active ? <Tag tone="ok">On</Tag> : <Tag tone="light">Off</Tag>} />
                {link.loading && !link.data && !linkState ? (
                  <div className="mt-4 h-20 animate-pulse rounded-[16px] bg-[var(--c-frame)]" />
                ) : active ? (
                  <>
                    <p className="mt-3 select-all break-all rounded-[14px] bg-[var(--c-frame)] px-4 py-3 text-[12.5px] font-medium">{active.url}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <SmallButton icon={copied ? Check : Copy} onClick={() => void copy(active.url)}>
                        {copied ? "Copied" : "Copy"}
                      </SmallButton>
                      <a
                        href={`https://wa.me/?text=${waText}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[var(--c-solid)] px-3.5 text-[12px] font-medium text-[var(--c-on-solid)] hover:opacity-90"
                      >
                        <WhatsappLogo size={14} weight="bold" /> WhatsApp
                      </a>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void turnOff()}
                        className="inline-flex h-8 items-center gap-1.5 rounded-full px-2 text-[12px] font-medium text-[var(--c-danger-ink)] hover:underline disabled:opacity-50"
                      >
                        <LinkBreak size={14} /> Turn off
                      </button>
                    </div>
                    <p className="mt-3 text-[11.5px] text-[var(--c-ink-3)]">
                      {active.opens ? `Opened ${active.opens} time${active.opens === 1 ? "" : "s"}` : "Not opened yet"}
                      {active.lastOpenedAt ? ` · last ${fmtAt(active.lastOpenedAt)}` : ""}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="mt-3 text-[12.5px] text-[var(--c-ink-2)]">
                      A private link and QR for a neighbour, driver or paramedic. They see the card without signing in. Turn it off any time.
                    </p>
                    <SmallButton dark className="mt-4" disabled={busy || !data} onClick={() => void share()}>
                      {busy ? "Creating…" : "Create link and QR"}
                    </SmallButton>
                  </>
                )}
              </Panel>
            </div>
          </div>
        </div>

        <aside className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2.5">
            <a href="tel:112" className="flex flex-col gap-6 rounded-[22px] bg-[var(--c-danger)] p-4 text-white transition-opacity hover:opacity-95">
              <span className="text-[11.5px] opacity-85">Police · fire · medical</span>
              <span>
                <span className="c-num block text-[34px] leading-none">112</span>
                <span className="mt-1 block text-[11.5px] opacity-85">Tap to call</span>
              </span>
            </a>
            <a href="tel:108" className="flex flex-col gap-6 rounded-[22px] bg-[var(--c-accent)] p-4 text-[var(--c-accent-ink)] transition-opacity hover:opacity-95">
              <Ambulance size={20} weight="fill" />
              <span>
                <span className="c-num block text-[34px] leading-none">108</span>
                <span className="mt-1 block text-[11.5px] opacity-85">Ambulance</span>
              </span>
            </a>
          </div>

          <Panel className="p-4">
            <PanelTitle title="Nearest help" right={<span className="text-[12px] text-[var(--c-ink-2)]">{hospital ? "their hospital" : ""}</span>} />
            {hospital ? (
              <>
                <div className="mt-3 h-[170px] overflow-hidden rounded-[18px] bg-[var(--c-frame)]">
                  <iframe
                    title={`Map: ${hospital.name}`}
                    src={`https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`}
                    className="h-full w-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
                <p className="mt-2.5 truncate px-1 text-[12.5px]">
                  <b className="font-medium">{hospital.name}</b>
                  <span className="text-[var(--c-ink-2)]">{hospital.address ? ` · ${hospital.address}` : ""}</span>
                </p>
                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  {hospital.phone ? (
                    <a href={telHref(hospital.phone)} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-[var(--c-line)] bg-[var(--c-frame)] text-[12.5px] font-medium">
                      <Phone size={14} weight="fill" /> Call hospital
                    </a>
                  ) : (
                    <span className="inline-flex h-9 items-center justify-center rounded-full border border-dashed border-[var(--c-line)] text-[11.5px] text-[var(--c-ink-3)]">No phone saved</span>
                  )}
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapQuery)}${data?.home ? `&origin=${encodeURIComponent(data.home)}` : ""}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-[var(--c-solid)] text-[12.5px] font-medium text-[var(--c-on-solid)]"
                  >
                    <MapPin size={14} weight="fill" /> Directions
                  </a>
                </div>
              </>
            ) : (
              <div className="mt-3 rounded-[18px] border border-dashed border-[var(--c-line)] p-4 text-[12.5px] text-[var(--c-ink-2)]">
                No hospital saved. Tell Saheli their usual hospital (“Maa ko City Care Hospital le jaate hain”) and it shows here with directions.
              </div>
            )}
          </Panel>

          {data && (
            <Panel className="px-4 pb-5 pt-4">
              <HelperPreview card={data} name={selected?.name ?? ""} photo={selected?.photo} callers={callers} />
              <p className="mt-3 text-center text-[11.5px] text-[var(--c-ink-2)]">What a helper sees after scanning the QR. No app, no login.</p>
            </Panel>
          )}
        </aside>
      </div>

      {data && (
        <PrintSheet>
          <EmergencyCardView card={data} name={selected?.name ?? ""} relation={selected?.relation} photo={selected?.photo} print />
          <p className="mt-3 text-center text-[10px] text-[var(--c-ink-3)]">Kavach CareOS · emergency card · keep this with you</p>
        </PrintSheet>
      )}

      <SideDrawer open={editing} onClose={closeEditor} top="Edit" bottom="emergency card" label="Edit emergency card" footer={<DarkButton onClick={closeEditor}>Done</DarkButton>}>
        {data && familyId && selectedId && (
          <Editor key={key ?? ""} familyId={familyId} subjectId={selectedId} personName={selected?.name ?? name} card={data} onSaved={card.reload} />
        )}
      </SideDrawer>
    </div>
  );
}
