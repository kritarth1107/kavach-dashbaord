"use client";

import { Check, Copy, FirstAidKit, LinkBreak, PencilSimple, Printer, Trash, WhatsappLogo } from "@phosphor-icons/react";
import { useCallback, useRef, useState } from "react";
import {
  createEmergencyLink,
  getEmergencyCard,
  getEmergencyLink,
  revokeEmergencyLink,
  type EmergencyCard,
  type EmergencyLink,
} from "@/lib/care-features-api";
import { saveFact, stopFact } from "@/lib/care-memory-api";
import { Field, INPUT, Notice, PageHeading, PrintSheet, SideDrawer, WhatsAppHint, fmtAt, useLoad } from "./care-kit";
import { EmergencyCardView, PROFILE_FIELDS } from "./emergency-card-view";
import { callName, possessive, usePerson } from "./person-context";
import { DarkButton, Panel, PanelTitle, SmallButton } from "./ui";

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
        <div className="grid gap-3 sm:grid-cols-2">
          {EDIT_FIELDS.map((k) => (
            <Field key={k} label={label(k)} className={k === "blood_group" || k === "height" || k === "weight" ? "" : "sm:col-span-2"}>
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
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--c-ink-3)] hover:bg-[var(--c-frame)] hover:text-[#d92d20] disabled:opacity-40"
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

export function EmergencyPage() {
  const { familyId, selectedId, selected } = usePerson();
  const key = familyId && selectedId ? `${familyId}/${selectedId}` : null;
  const loadCard = useCallback(() => getEmergencyCard(familyId!, selectedId!), [familyId, selectedId]);
  const loadLink = useCallback(async () => (await getEmergencyLink(familyId!, selectedId!)) ?? null, [familyId, selectedId]);
  const card = useLoad<EmergencyCard>(key, loadCard);
  const link = useLoad<EmergencyLink | null>(key, loadLink);
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
  const missingBlood = data && !data.profile.blood_group;
  const missingContacts = data && !data.contacts.some((c) => c.emergency);

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

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-5 pb-2 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-end gap-5">
          <PageHeading top={possessive(selected)} bottom="Emergency card" />
          <span className="mb-2 hidden h-[68px] w-[68px] items-center justify-center rounded-full bg-[var(--c-accent)] text-white sm:flex">
            <FirstAidKit size={32} weight="fill" />
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <SmallButton icon={PencilSimple} onClick={() => setEditing(true)} disabled={!data}>
            Edit
          </SmallButton>
          <SmallButton icon={Printer} onClick={() => window.print()} disabled={!data}>
            Print
          </SmallButton>
          <DarkButton onClick={() => void share()} disabled={busy || !data}>
            Share link
          </DarkButton>
        </div>
      </div>
      <WhatsAppHint>ask Saheli for {selected?.self ? "your" : `${name}'s`} emergency card, or say “share the emergency link”.</WhatsAppHint>

      {err && <Notice>{err}</Notice>}
      {card.error && !data && <Notice>{card.error}</Notice>}
      {(missingBlood || missingContacts) && (
        <div className="flex flex-col gap-3 rounded-[18px] bg-[var(--c-accent-soft)] px-4 py-3 text-[var(--c-accent-soft-ink)] sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px]">
            {missingBlood && missingContacts
              ? "Add a blood group and at least one emergency contact so a helper knows what to do."
              : missingBlood
                ? "The blood group is missing. It's the first thing a paramedic asks."
                : "No emergency contact yet. Add someone nearby who can be called."}
          </p>
          <SmallButton onClick={() => setEditing(true)} className="shrink-0 self-start sm:self-auto">
            Add now
          </SmallButton>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          {!data ? (
            <div className="h-[520px] animate-pulse rounded-[24px] bg-[var(--c-card)]" />
          ) : (
            <EmergencyCardView card={data} name={selected?.name ?? ""} relation={selected?.relation} photo={selected?.photo} />
          )}
        </div>

        <aside className="space-y-4">
          <Panel accent className="flex flex-col">
            <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/80">Share link opened</p>
            <p className="c-num mt-4 text-[56px] leading-none text-white">{active ? (active.opens ?? 0) : "Off"}</p>
            <p className="mt-2 text-[12px] text-white/80">
              {active
                ? active.lastOpenedAt
                  ? `Last opened ${fmtAt(active.lastOpenedAt)}`
                  : "Not opened yet"
                : "No link is active. Nobody outside the family can see the card."}
            </p>
          </Panel>

          <div ref={shareRef}>
            <Panel>
              <PanelTitle title="Share link" />
              {link.loading && !link.data && !linkState ? (
                <div className="mt-4 h-20 animate-pulse rounded-[16px] bg-[var(--c-frame)]" />
              ) : active ? (
                <>
                  <p className="mt-3 text-[12.5px] text-[var(--c-ink-2)]">Anyone with this link sees the card without signing in. Send it to a neighbour, driver or doctor.</p>
                  <p className="mt-3 select-all break-all rounded-[14px] bg-[var(--c-frame)] px-4 py-3 text-[12.5px] font-medium">{active.url}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <SmallButton dark icon={copied ? Check : Copy} onClick={() => void copy(active.url)}>
                      {copied ? "Copied" : "Copy"}
                    </SmallButton>
                    <a
                      href={`https://wa.me/?text=${waText}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[var(--c-line)] bg-[var(--c-frame)] px-3.5 text-[12px] font-medium hover:bg-[var(--c-card)]"
                    >
                      <WhatsappLogo size={14} weight="bold" /> WhatsApp
                    </a>
                  </div>
                  {active.createdAt && <p className="mt-3 text-[11px] text-[var(--c-ink-3)]">Created {fmtAt(active.createdAt)}</p>}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void turnOff()}
                    className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#d92d20] hover:underline disabled:opacity-50"
                  >
                    <LinkBreak size={14} /> Turn off link
                  </button>
                </>
              ) : (
                <>
                  <p className="mt-3 text-[12.5px] text-[var(--c-ink-2)]">
                    Make a private link to this card for a neighbour, driver or paramedic. You can turn it off any time.
                  </p>
                  <SmallButton dark className="mt-4" disabled={busy || !data} onClick={() => void share()}>
                    {busy ? "Creating…" : "Create link"}
                  </SmallButton>
                </>
              )}
            </Panel>
          </div>

          <Panel>
            <PanelTitle title="Keep it handy" />
            <ul className="mt-3 space-y-2 text-[12.5px] text-[var(--c-ink-2)]">
              {[
                "Print it and keep one copy on the fridge and one in the wallet.",
                "Allergies and medicines update here as Saheli learns them.",
                "Set the link as a phone wallpaper note or share with the society guard.",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--c-accent)]" /> {t}
                </li>
              ))}
            </ul>
          </Panel>
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
