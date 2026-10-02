"use client";

import {
  CaretDown,
  ChatCircleText,
  House,
  MapPin,
  PencilSimple,
  Plus,
  Stethoscope,
  Trash,
  UsersThree,
  Hospital as HospitalIcon,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import { useCallback, useState } from "react";
import { addDoctorQuestion, getCareTeam, type Appointment, type CareTeam } from "@/lib/care-features-api";
import { saveFact, stopFact } from "@/lib/care-memory-api";
import { cn } from "@/lib/utils";
import { Field, IST, INPUT, Notice, PageHeading, SideDrawer, WhatsAppHint, fmtDay, fmtTime, istDate, useLoad } from "./care-kit";
import { CallLink } from "./emergency-card-view";
import { callName, possessive, usePerson } from "./person-context";
import { DarkButton, Panel, PanelTitle, PillTabs, SmallButton, Tag } from "./ui";

type Kind = "appointment" | "doctor" | "hospital" | "contact" | "helper";
const KINDS: Array<{ id: Kind; label: string }> = [
  { id: "appointment", label: "Appointment" },
  { id: "doctor", label: "Doctor" },
  { id: "hospital", label: "Hospital" },
  { id: "contact", label: "Contact" },
  { id: "helper", label: "Helper" },
];

type Form = { name: string; phone: string; speciality: string; address: string; relation: string; emergency: boolean; role: string; date: string; time: string; place: string; purpose: string };
const BLANK: Form = { name: "", phone: "", speciality: "", address: "", relation: "", emergency: false, role: "", date: "", time: "", place: "", purpose: "" };
type Editing = { kind: Kind; form: Form; existing: boolean };

const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: IST });
function daysBetween(from: Date, to: Date) {
  return Math.round((Date.parse(dayKey(to)) - Date.parse(dayKey(from))) / 86_400_000);
}
function relative(n: number) {
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n > 1) return `In ${n} days`;
  return n === -1 ? "Yesterday" : `${-n} days ago`;
}

function buildFact(kind: Kind, f: Form, who: string) {
  const t = (s: string) => s.trim();
  const name = t(f.name);
  const phone = t(f.phone) || null;
  switch (kind) {
    case "appointment": {
      const place = t(f.place) || null;
      const purpose = t(f.purpose) || null;
      const when = `${f.date}T${f.time}`;
      const d = istDate(when);
      return {
        domain: "appointment",
        name: `${name} ${f.date}`,
        details: { doctor: name, when, place, purpose, questions: [] as string[] },
        sentence: `${who} has an appointment with ${name} on ${fmtDay(d, { weekday: "long", day: "numeric", month: "long" })} at ${fmtTime(d)}${place ? ` at ${place}` : ""}${purpose ? ` for ${purpose}` : ""}.`,
      };
    }
    case "doctor":
      return {
        domain: "doctor",
        name,
        details: { name, phone, speciality: t(f.speciality) || null },
        sentence: `${name} is ${who}'s ${t(f.speciality) ? t(f.speciality).toLowerCase() : "doctor"}${phone ? `, phone ${phone}` : ""}.`,
      };
    case "hospital":
      return {
        domain: "hospital",
        name,
        details: { name, phone, address: t(f.address) || null },
        sentence: `${who}'s preferred hospital is ${name}${t(f.address) ? `, ${t(f.address)}` : ""}${phone ? `, phone ${phone}` : ""}.`,
      };
    case "contact":
      return {
        domain: "contact",
        name,
        details: { name, phone, relation: t(f.relation) || null, emergency: f.emergency },
        sentence: `${name}${t(f.relation) ? ` (${t(f.relation)})` : ""} is ${f.emergency ? "an emergency contact" : "a contact"} for ${who}${phone ? `, phone ${phone}` : ""}.`,
      };
    case "helper":
      return {
        domain: "home",
        name,
        details: { name, phone },
        sentence: t(f.role) ? `${name} helps ${who} at home: ${t(f.role)}.` : `${name} helps ${who} at home.`,
      };
  }
}

function valid(kind: Kind, f: Form) {
  if (!f.name.trim()) return false;
  return kind !== "appointment" || (/^\d{4}-\d{2}-\d{2}$/.test(f.date) && /^\d{2}:\d{2}$/.test(f.time));
}

function RowActions({ label, onEdit, onRemove, busy }: { label: string; onEdit?: () => void; onRemove: () => void; busy: boolean }) {
  const [confirm, setConfirm] = useState(false);
  if (confirm)
    return (
      <span className="flex shrink-0 items-center gap-2 text-[12.5px]">
        <button type="button" className="text-[var(--c-ink-2)] hover:text-[var(--c-ink)]" onClick={() => setConfirm(false)}>
          Keep
        </button>
        <button type="button" disabled={busy} className="font-medium text-[#d92d20] disabled:opacity-50" onClick={onRemove}>
          {busy ? "Removing…" : "Remove"}
        </button>
      </span>
    );
  return (
    <span className="flex shrink-0 items-center">
      {onEdit && (
        <button type="button" aria-label={`Edit ${label}`} onClick={onEdit} className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--c-ink-2)] hover:bg-[var(--c-card)]">
          <PencilSimple size={15} />
        </button>
      )}
      <button
        type="button"
        aria-label={`Remove ${label}`}
        onClick={() => setConfirm(true)}
        className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--c-ink-3)] hover:bg-[var(--c-card)] hover:text-[#d92d20]"
      >
        <Trash size={15} />
      </button>
    </span>
  );
}

function DateChip({ when, dark }: { when: string | null; dark?: boolean }) {
  if (!when) return <span className="flex h-[72px] w-[64px] shrink-0 items-center justify-center rounded-[18px] bg-[var(--c-card)] text-[11px] text-[var(--c-ink-3)]">No date</span>;
  const d = istDate(when);
  return (
    <span
      className={cn(
        "flex w-[64px] shrink-0 flex-col items-center justify-center rounded-[18px] py-2 leading-none",
        dark ? "bg-[var(--c-ink)] text-[var(--c-frame)]" : "bg-[var(--c-card)]",
      )}
    >
      <span className="text-[11px] uppercase tracking-[0.06em] opacity-70">{fmtDay(d, { month: "short" })}</span>
      <span className="c-num mt-1 text-[26px]">{fmtDay(d, { day: "numeric" })}</span>
      <span className="mt-1 text-[11px] opacity-70">{fmtDay(d, { weekday: "short" })}</span>
    </span>
  );
}

function ListPanel<T extends { name: string }>({
  title,
  icon: Icon,
  items,
  empty,
  meta,
  phone,
  onAdd,
  onEdit,
  onRemove,
  busy,
}: {
  title: string;
  icon: PhosphorIcon;
  items: T[];
  empty: string;
  meta: (x: T) => React.ReactNode;
  phone: (x: T) => string | null;
  onAdd: () => void;
  onEdit: (x: T) => void;
  onRemove: (x: T) => void;
  busy: string | null;
}) {
  return (
    <Panel className="flex flex-col">
      <PanelTitle title={title} right={<SmallButton icon={Plus} onClick={onAdd}>Add</SmallButton>} />
      {items.length === 0 ? (
        <p className="mt-4 text-[13px] text-[var(--c-ink-2)]">{empty}</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((x) => (
            <li key={x.name} className="rounded-[18px] bg-[var(--c-frame)] p-3.5">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--c-line)]">
                  <Icon size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-[14px] font-medium">{x.name}</p>
                  <div className="text-[12px] text-[var(--c-ink-2)]">{meta(x)}</div>
                </div>
                <RowActions label={x.name} busy={busy === x.name} onEdit={() => onEdit(x)} onRemove={() => onRemove(x)} />
              </div>
              {phone(x) && (
                <div className="mt-2.5 pl-[52px]">
                  <CallLink phone={phone(x)!} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function CareTeamPage() {
  const { familyId, selectedId, selected } = usePerson();
  const key = familyId && selectedId ? `${familyId}/${selectedId}` : null;
  const load = useCallback(() => getCareTeam(familyId!, selectedId!), [familyId, selectedId]);
  const team = useLoad<CareTeam>(key, load);
  const [now] = useState(() => new Date());
  const [today] = useState(() => dayKey(new Date()));
  const [editing, setEditing] = useState<Editing | null>(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [formErr, setFormErr] = useState("");
  const [showPast, setShowPast] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const closeDrawer = useCallback(() => setEditing(null), []);

  const name = callName(selected);
  const who = selected?.name ?? name;
  const data = team.data;
  const next = data?.upcoming.find((a) => a.when);
  const nextIn = next?.when ? daysBetween(now, istDate(next.when)) : null;

  const open = (kind: Kind, form: Partial<Form> = {}, existing = false) => {
    setFormErr("");
    setEditing({ kind, form: { ...BLANK, emergency: kind === "contact", ...form }, existing });
  };

  async function save() {
    if (!editing || !familyId || !selectedId || !valid(editing.kind, editing.form)) return;
    setSaving(true);
    setFormErr("");
    try {
      await saveFact(familyId, selectedId, buildFact(editing.kind, editing.form, who));
      setEditing(null);
      team.reload();
    } catch (e) {
      setFormErr(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  async function remove(domain: string, factName: string, id: string) {
    if (!familyId || !selectedId) return;
    setBusy(id);
    setErr("");
    try {
      await stopFact(familyId, selectedId, { domain, name: factName, reason: "Removed on the dashboard" });
      team.reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't remove");
    } finally {
      setBusy(null);
    }
  }

  async function ask(a: Appointment) {
    const q = (drafts[a.key] ?? "").trim();
    if (!q || !familyId || !selectedId) return;
    setBusy(`q:${a.key}`);
    setErr("");
    try {
      const res = await addDoctorQuestion(familyId, selectedId, a.key, q);
      const questions = res?.questions ?? [...a.questions, q];
      team.update((d) => ({ ...d, upcoming: d.upcoming.map((x) => (x.key === a.key ? { ...x, questions } : x)) }));
      setDrafts((m) => ({ ...m, [a.key]: "" }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't add the question");
    } finally {
      setBusy(null);
    }
  }

  const apptName = (a: Appointment) => a.key.replace(/^appointment:/, "");

  function appointmentRow(a: Appointment, past = false) {
    const d = a.when ? istDate(a.when) : null;
    const rel = d ? relative(daysBetween(now, d)) : null;
    return (
      <li key={a.key} className="rounded-[20px] bg-[var(--c-frame)] p-4">
        <div className="flex items-start gap-4">
          <DateChip when={a.when} dark={!past} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {d && <span className="text-[13px] font-medium tabular-nums">{fmtTime(d)}</span>}
              {rel && <Tag tone={past ? "light" : "accent"}>{rel}</Tag>}
              {past && a.status && <Tag tone="light">{a.status}</Tag>}
            </div>
            <p className="mt-1 break-words text-[16px] font-medium">{a.doctor}</p>
            {a.purpose && <p className="text-[13px] text-[var(--c-ink-2)]">{a.purpose}</p>}
            {a.place && (
              <p className="mt-1 flex items-start gap-1 text-[12px] text-[var(--c-ink-3)]">
                <MapPin size={13} className="mt-[1px] shrink-0" /> {a.place}
              </p>
            )}
          </div>
          <RowActions label={`appointment with ${a.doctor}`} busy={busy === a.key} onRemove={() => void remove("appointment", apptName(a), a.key)} />
        </div>
        {(a.questions.length > 0 || !past) && (
          <div className="mt-3 rounded-[16px] bg-[var(--c-card)] p-3 sm:ml-[80px]">
            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--c-ink-3)]">
              <ChatCircleText size={13} /> Questions for the doctor
            </p>
            {a.questions.length > 0 && (
              <ol className="mt-2 space-y-1.5">
                {a.questions.map((q, i) => (
                  <li key={`${i}-${q}`} className="flex gap-2 text-[13px]">
                    <span className="w-4 shrink-0 text-right tabular-nums text-[var(--c-ink-3)]">{i + 1}.</span>
                    <span className="min-w-0 break-words">{q}</span>
                  </li>
                ))}
              </ol>
            )}
            {!past && (
              <form
                className="mt-2.5 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void ask(a);
                }}
              >
                <input
                  value={drafts[a.key] ?? ""}
                  onChange={(e) => setDrafts((m) => ({ ...m, [a.key]: e.target.value }))}
                  placeholder="Add question"
                  maxLength={200}
                  aria-label={`Add a question for ${a.doctor}`}
                  className="h-9 min-w-0 flex-1 rounded-full border border-[var(--c-line)] bg-[var(--c-frame)] px-4 text-[13px] outline-none placeholder:text-[var(--c-ink-3)] focus:border-[var(--c-ink)]"
                />
                <SmallButton type="submit" dark icon={Plus} disabled={!(drafts[a.key] ?? "").trim() || busy === `q:${a.key}`}>
                  {busy === `q:${a.key}` ? "Adding…" : "Add"}
                </SmallButton>
              </form>
            )}
          </div>
        )}
      </li>
    );
  }

  const f = editing?.form;
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setEditing((x) => (x ? { ...x, form: { ...x.form, [k]: k === "emergency" ? e.target.checked : e.target.value } } : x));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-5 pb-2 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-end gap-5">
          <PageHeading top={possessive(selected)} bottom="Care team" />
          <span className="mb-2 hidden h-[68px] w-[68px] items-center justify-center rounded-full bg-[var(--c-accent)] text-white sm:flex">
            <Stethoscope size={32} weight="fill" />
          </span>
        </div>
        <DarkButton onClick={() => open("appointment")} className="self-start lg:self-auto">
          Add appointment
        </DarkButton>
      </div>
      <div className="space-y-1">
        <p className="text-[13px] text-[var(--c-ink-2)]">
          Saheli reminds {selected?.self ? "you" : name || "them"} the evening before and 2 hours before each appointment, and brings the questions along.
        </p>
        <WhatsAppHint>tell Saheli “{selected?.self ? "I have" : `${name} has`} an appointment with Dr Iyer on Monday at 11”, or “ask Dr Iyer about the knee pain”.</WhatsAppHint>
      </div>

      {err && <Notice>{err}</Notice>}
      {team.error && !data && <Notice>{team.error}</Notice>}

      {!data ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
          <div className="h-[360px] animate-pulse rounded-[24px] bg-[var(--c-card)]" />
          <div className="h-[200px] animate-pulse rounded-[24px] bg-[var(--c-card)]" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
          <div className="min-w-0 space-y-4">
            <Panel>
              <PanelTitle title="Upcoming appointments" right={<span className="text-[11px] text-[var(--c-ink-3)]">{data.upcoming.length} booked</span>} />
              {data.upcoming.length === 0 ? (
                <div className="mt-4 flex flex-col items-start gap-3 rounded-[18px] bg-[var(--c-frame)] p-4">
                  <p className="text-[13px] text-[var(--c-ink-2)]">Nothing booked. Add the next visit and Saheli will remind {selected?.self ? "you" : name || "them"}.</p>
                  <SmallButton icon={Plus} onClick={() => open("appointment")}>
                    Add appointment
                  </SmallButton>
                </div>
              ) : (
                <ul className="mt-4 space-y-3">
                  {data.upcoming.map((a) => appointmentRow(a))}
                </ul>
              )}
              {data.past.length > 0 && (
                <div className="mt-4 border-t border-[var(--c-line)] pt-3">
                  <button
                    type="button"
                    aria-expanded={showPast}
                    onClick={() => setShowPast((v) => !v)}
                    className="flex w-full items-center justify-between rounded-[12px] px-1 py-1.5 text-[13px] font-medium"
                  >
                    Past appointments · {data.past.length}
                    <CaretDown size={14} className={cn("transition-transform", showPast && "rotate-180")} />
                  </button>
                  {showPast && (
                    <ul className="mt-3 space-y-3">
                      {data.past.map((a) => appointmentRow(a, true))}
                    </ul>
                  )}
                </div>
              )}
            </Panel>

            <div className="grid gap-4 md:grid-cols-2">
              <ListPanel
                title="Doctors"
                icon={Stethoscope}
                items={data.doctors}
                empty="No doctor saved yet."
                meta={(d) => [d.speciality, d.text].filter(Boolean).join(" · ")}
                phone={(d) => d.phone}
                busy={busy}
                onAdd={() => open("doctor")}
                onEdit={(d) => open("doctor", { name: d.name, phone: d.phone ?? "", speciality: d.speciality ?? "" }, true)}
                onRemove={(d) => void remove("doctor", d.name, d.name)}
              />
              <ListPanel
                title="Hospital"
                icon={HospitalIcon}
                items={data.hospital}
                empty="No hospital saved. Add the one to go to in an emergency."
                meta={(h) => h.address ?? h.text}
                phone={(h) => h.phone}
                busy={busy}
                onAdd={() => open("hospital")}
                onEdit={(h) => open("hospital", { name: h.name, phone: h.phone ?? "", address: h.address ?? "" }, true)}
                onRemove={(h) => void remove("hospital", h.name, h.name)}
              />
              <ListPanel
                title="Contacts & neighbours"
                icon={UsersThree}
                items={data.contacts}
                empty="Add a neighbour or relative who can help nearby."
                meta={(c) => (
                  <span className="flex flex-wrap items-center gap-1.5">
                    {[c.relation, c.text].filter(Boolean).join(" · ")}
                    {c.emergency && <Tag>Emergency</Tag>}
                  </span>
                )}
                phone={(c) => c.phone}
                busy={busy}
                onAdd={() => open("contact")}
                onEdit={(c) => open("contact", { name: c.name, phone: c.phone ?? "", relation: c.relation ?? "", emergency: c.emergency }, true)}
                onRemove={(c) => void remove("contact", c.name, c.name)}
              />
              <ListPanel
                title="Helpers"
                icon={House}
                items={data.helpers}
                empty="Cook, maid, driver or attendant. Saheli uses this to plan the day."
                meta={(h) => h.text}
                phone={(h) => h.phone}
                busy={busy}
                onAdd={() => open("helper")}
                onEdit={(h) => open("helper", { name: h.name, phone: h.phone ?? "", role: h.text }, true)}
                onRemove={(h) => void remove("home", h.name, h.name)}
              />
            </div>
          </div>

          <aside className="space-y-4">
            <Panel accent className="flex flex-col">
              <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/80">Next appointment</p>
              {next && next.when && nextIn !== null ? (
                <>
                  <p className="c-num mt-4 text-[56px] leading-none text-white">
                    {nextIn <= 0 ? "Today" : nextIn}
                    {nextIn > 0 && <span className="ml-2 text-[18px] tracking-normal">{nextIn === 1 ? "day" : "days"}</span>}
                  </p>
                  <p className="mt-2 text-[12px] text-white/80">
                    {next.doctor} · {fmtDay(istDate(next.when))}, {fmtTime(istDate(next.when))}
                  </p>
                </>
              ) : (
                <>
                  <p className="c-num mt-4 text-[56px] leading-none text-white">—</p>
                  <p className="mt-2 text-[12px] text-white/80">Nothing booked yet</p>
                </>
              )}
            </Panel>
            <Panel>
              <PanelTitle title="How reminders work" />
              <ul className="mt-3 space-y-2 text-[12.5px] text-[var(--c-ink-2)]">
                {[
                  "The evening before: a WhatsApp reminder with the time and place.",
                  "2 hours before: a nudge to leave, with a ride if needed.",
                  "Questions you add here go into the reminder and the care report.",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--c-accent)]" /> {t}
                  </li>
                ))}
              </ul>
            </Panel>
          </aside>
        </div>
      )}

      <SideDrawer
        open={Boolean(editing)}
        onClose={closeDrawer}
        top={editing?.existing ? "Edit" : "Add"}
        bottom={KINDS.find((k) => k.id === editing?.kind)?.label.toLowerCase() ?? ""}
        label="Care team editor"
        footer={
          <>
            <SmallButton onClick={closeDrawer}>Cancel</SmallButton>
            <DarkButton disabled={saving || !editing || !valid(editing.kind, editing.form)} onClick={() => void save()}>
              {saving ? "Saving…" : "Save"}
            </DarkButton>
          </>
        }
      >
        {editing && f && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            {!editing.existing && <PillTabs<Kind> tabs={KINDS} value={editing.kind} onChange={(kind) => open(kind)} />}
            {editing.kind === "appointment" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Doctor *" className="sm:col-span-2">
                  <input className={INPUT} value={f.name} onChange={set("name")} list="kv-doctors" maxLength={80} placeholder="Dr. Anil Iyer" />
                  <datalist id="kv-doctors">
                    {data?.doctors.map((d) => (
                      <option key={d.name} value={d.name} />
                    ))}
                  </datalist>
                </Field>
                <Field label="Date *">
                  <input type="date" className={INPUT} value={f.date} min={today} onChange={set("date")} />
                </Field>
                <Field label="Time *">
                  <input type="time" className={INPUT} value={f.time} onChange={set("time")} />
                </Field>
                <Field label="Place" className="sm:col-span-2">
                  <input className={INPUT} value={f.place} onChange={set("place")} maxLength={120} placeholder="Iyer Clinic, Shankar Nagar" />
                </Field>
                <Field label="Purpose" className="sm:col-span-2">
                  <input className={INPUT} value={f.purpose} onChange={set("purpose")} maxLength={120} placeholder="BP review" />
                </Field>
                <p className="text-[12px] text-[var(--c-ink-3)] sm:col-span-2">Time is in IST. Add questions for the doctor once it&apos;s saved.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Name *" className="sm:col-span-2">
                  <input
                    className={cn(INPUT, editing.existing && "text-[var(--c-ink-2)]")}
                    value={f.name}
                    onChange={set("name")}
                    readOnly={editing.existing}
                    maxLength={80}
                    placeholder={editing.kind === "doctor" ? "Dr. Meera Rao" : editing.kind === "hospital" ? "Ramkrishna Care Hospital" : editing.kind === "helper" ? "Sunita" : "Mrs. Sharma"}
                  />
                </Field>
                {editing.kind === "doctor" && (
                  <Field label="Speciality">
                    <input className={INPUT} value={f.speciality} onChange={set("speciality")} maxLength={60} placeholder="Cardiologist" />
                  </Field>
                )}
                {editing.kind === "contact" && (
                  <Field label="Relation">
                    <input className={INPUT} value={f.relation} onChange={set("relation")} maxLength={40} placeholder="Neighbour" />
                  </Field>
                )}
                {editing.kind === "helper" && (
                  <Field label="What they do">
                    <input className={INPUT} value={f.role} onChange={set("role")} maxLength={80} placeholder="Cook, comes at 11" />
                  </Field>
                )}
                <Field label="Phone" className={editing.kind === "hospital" ? "sm:col-span-2" : ""}>
                  <input className={INPUT} value={f.phone} onChange={set("phone")} inputMode="tel" maxLength={20} placeholder="+91 98260 11223" />
                </Field>
                {editing.kind === "hospital" && (
                  <Field label="Address" className="sm:col-span-2">
                    <input className={INPUT} value={f.address} onChange={set("address")} maxLength={160} placeholder="Pachpedi Naka, Raipur" />
                  </Field>
                )}
                {editing.kind === "contact" && (
                  <label className="flex items-center gap-2.5 px-1 text-[13px] sm:col-span-2">
                    <input type="checkbox" checked={f.emergency} onChange={set("emergency")} className="h-4 w-4 accent-[var(--c-ink)]" />
                    Call in an emergency (shows on the emergency card)
                  </label>
                )}
              </div>
            )}
            {formErr && <Notice>{formErr}</Notice>}
            <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
          </form>
        )}
      </SideDrawer>
    </div>
  );
}
