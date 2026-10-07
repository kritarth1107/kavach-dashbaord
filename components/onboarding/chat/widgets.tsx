"use client";

/** The tap-able parts of the onboarding chat: they sit under Saheli's question, and typing or talking always works too. */
import {
  ArrowRight, CalendarHeart, Camera, ChatCircle, Check, CheckCircle, CircleNotch, DotsThree, Drop, FirstAidKit, Heart, MagnifyingGlass, MapPin,
  Moon, PencilSimple, Pill, Plus, Smiley, SneakerMove, User, Users,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { DIALECTS, LANGUAGES, type Med, type Person } from "../data";
import { MedCard, PhoneField, TimeField, VerifyWhatsApp, samePhone, validPhone } from "../fields";
import { greetingFor, option, regionTop, searchOptions, type LangOption } from "./region";
import type { Option, SummaryRow } from "./engine";

const ICONS: Record<string, typeof User> = {
  user: User, users: Users, heart: Heart, dots: DotsThree, pill: Pill, moon: Moon, smiley: Smiley, drop: Drop, sneaker: SneakerMove, calendar: CalendarHeart, firstaid: FirstAidKit, chat: ChatCircle,
};

export const LABEL = "mb-2.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.07em] text-[var(--c-ink-3)]";
const CARD = "rounded-[24px] border border-[var(--c-line)] bg-white p-4";
const PRIMARY = "inline-flex h-11 items-center gap-2 rounded-full bg-[var(--c-ink)] px-5 text-[14px] font-medium text-white transition hover:opacity-90 disabled:opacity-40";
const GHOST = "inline-flex h-11 items-center gap-1.5 rounded-full border border-[var(--c-line)] bg-white px-4 text-[14px] transition hover:border-[var(--c-ink)]";

export function Chips({ options, multi, selected = [], exclusive = [], skip, onPick, onSkip }: {
  options: Option[]; multi?: boolean; selected?: string[]; exclusive?: string[]; skip?: string; onPick: (ids: string[]) => void; onSkip?: () => void;
}) {
  const [on, setOn] = useState<string[]>(selected);
  const toggle = (id: string) => {
    if (!multi) return onPick([id]);
    setOn((cur) => (exclusive.includes(id) ? (cur.includes(id) ? [] : [id]) : cur.includes(id) ? cur.filter((x) => x !== id) : [...cur.filter((x) => !exclusive.includes(x)), id]));
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const Icon = o.icon ? ICONS[o.icon] : null;
        const sel = on.includes(o.id);
        return (
          <button key={o.id} type="button" onClick={() => toggle(o.id)} aria-pressed={multi ? sel : undefined} title={o.hint}
            className={cn("inline-flex min-h-10 items-center gap-2 rounded-full px-4 py-2 text-left text-[14px] transition",
              sel ? "bg-[var(--c-ink)] text-white" : "border border-[var(--c-line)] bg-white hover:border-[var(--c-ink)]")}>
            {Icon && <Icon size={16} className={sel ? "" : "text-[var(--c-ink-2)]"} />}
            <span>{o.label}{o.hint && !multi && <span className={cn("ml-1.5 text-[12px]", sel ? "text-white/60" : "text-[var(--c-ink-3)]")}>· {o.hint}</span>}</span>
          </button>
        );
      })}
      {multi && (
        <button type="button" onClick={() => on.length && onPick(on)} disabled={!on.length} className="inline-flex h-10 items-center gap-2 rounded-full bg-[var(--c-accent)] px-4 text-[14px] font-medium text-white disabled:opacity-40">
          Done <ArrowRight size={15} />
        </button>
      )}
      {skip && onSkip && <button type="button" onClick={onSkip} className="h-10 rounded-full px-3 text-[13.5px] text-[var(--c-ink-2)] hover:text-[var(--c-ink)]">{skip}</button>}
    </div>
  );
}

/** Region first: what families around their city speak, then other bhashas, then languages, then search. */
export function LanguageCard({ person, self, onPick }: { person: Person; self: boolean; onPick: (o: LangOption) => void }) {
  const top = useMemo(() => regionTop(person.city, person.state).slice(0, 3), [person.city, person.state]);
  const base = top[0]?.base ?? "hi";
  const baseLang = option(base);
  const topCards: Array<LangOption & { just?: boolean }> = top.length
    ? [...top, ...(top.some((t) => !t.dialect && t.code === base) ? [] : baseLang ? [{ ...baseLang, just: true }] : [])]
    : ["hi", "en", "bn", "mr"].map((c) => option(c)!).filter(Boolean);
  const shown = new Set(topCards.map((t) => t.code));
  const POPULAR = ["bho", "mai", "hne", "awa", "bgc", "mwr", "bns", "kfy", "gbm", "mag"];
  const others = DIALECTS.filter((d) => !shown.has(d.code)).sort((x, y) => (POPULAR.indexOf(x.code) + 1 || 99) - (POPULAR.indexOf(y.code) + 1 || 99)).map((d) => option(d.code)!);
  const [more, setMore] = useState(false);
  const [q, setQ] = useState("");
  const found = searchOptions(q);
  const where = person.city?.split(",")[0];
  const sample = (o: LangOption) => (o.dialect ? `“${greetingFor(o.base, o.code)}…”` : o.region);
  return (
    <div className={cn(CARD, "max-w-[620px]")}>
      <p className={LABEL}>{top.length ? <><MapPin size={13} />Spoken around {where}</> : "Most chosen"}</p>
      <div className="grid grid-cols-2 gap-2">
        {topCards.slice(0, 4).map((o, k) => (
          <button key={o.code + (o.just ? "-just" : "")} type="button" onClick={() => onPick(o)}
            className={cn("relative rounded-[18px] bg-[var(--c-card)] p-3.5 text-left transition hover:bg-[var(--c-line)]", k === 0 && top.length > 0 && "ring-2 ring-[var(--c-accent)]")}>
            {k === 0 && top.length > 0 && <span className="absolute right-3 top-3 rounded-full bg-[var(--c-accent-soft)] px-2 py-0.5 text-[10.5px] font-medium text-[var(--c-accent-soft-ink)]">Most families here</span>}
            <span className="block text-[20px] leading-tight">{o.native}</span>
            <span className="mt-1 block text-[12.5px] font-medium">{o.just ? `Just ${o.name}` : o.name}</span>
            <span className="block truncate text-[11.5px] text-[var(--c-ink-3)]">{o.just ? "No particular bhasha" : sample(o) || (o.code === "en" ? "Saheli writes in English" : "")}</span>
          </button>
        ))}
      </div>
      <div className="mt-4">
        <p className={LABEL}>Other bhashas</p>
        <div className="flex flex-wrap gap-1.5 text-[13px]">
          {(more ? others : others.slice(0, 7)).map((o) => (
            <button key={o.code} type="button" onClick={() => onPick(o)} className="rounded-full border border-[var(--c-line)] px-3 py-1.5 transition hover:border-[var(--c-ink)]">{o.native} {o.name}</button>
          ))}
          {!more && others.length > 7 && <button type="button" onClick={() => setMore(true)} className="rounded-full px-3 py-1.5 text-[var(--c-ink-2)] hover:text-[var(--c-ink)]">+ {others.length - 7} more</button>}
        </div>
      </div>
      <div className="mt-3.5">
        <p className={LABEL}>Languages</p>
        <div className="flex flex-wrap gap-1.5 text-[13px]">
          {LANGUAGES.filter((l) => !shown.has(l.code)).map((l) => (
            <button key={l.code} type="button" onClick={() => onPick(option(l.code)!)} className="rounded-full border border-[var(--c-line)] px-3 py-1.5 transition hover:border-[var(--c-ink)]">{l.code === "en" ? "English" : `${l.native} ${l.name}`}</button>
          ))}
        </div>
      </div>
      <div className="relative mt-4">
        <MagnifyingGlass size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--c-ink-3)]" />
        <input value={q} onChange={(e) => setQ(e.target.value)} maxLength={40} placeholder="Find any language or bhasha — Tulu, Garhwali, Sindhi…" aria-label={self ? "Find your language" : "Find their language"}
          className="h-11 w-full rounded-full bg-[var(--c-card)] pl-10 pr-4 text-[13.5px] outline-none focus:ring-2 focus:ring-[var(--c-ink)]" />
      </div>
      {q && (
        <div className="mt-2 flex flex-wrap gap-1.5 text-[13px]">
          {found.length ? found.map((o) => (
            <button key={o.code} type="button" onClick={() => onPick(o)} className="rounded-full bg-[var(--c-ink)] px-3 py-1.5 text-white">{o.native} {o.name}</button>
          )) : <span className="px-1 text-[var(--c-ink-3)]">Not in my list yet — type it below and send, I&apos;ll note it.</span>}
        </div>
      )}
    </div>
  );
}

export function MedicinesAsk({ busy, onPhoto, onType, onNone, self }: { busy: boolean; onPhoto: (f: File) => void; onType: () => void; onNone: () => void; self: boolean }) {
  const file = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={busy} onClick={() => file.current?.click()} className="inline-flex h-11 items-center gap-2 rounded-full bg-[var(--c-accent)] px-5 text-[14px] font-medium text-white disabled:opacity-50">
        {busy ? <CircleNotch size={16} className="animate-spin" /> : <Camera size={18} />} Photo of prescription or strips
      </button>
      <button type="button" onClick={onType} className={GHOST}>Type them</button>
      <button type="button" onClick={onNone} className="h-11 rounded-full px-3 text-[14px] text-[var(--c-ink-2)] hover:text-[var(--c-ink)]">{self ? "I don't take any" : "No regular medicines"}</button>
      <input ref={file} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPhoto(f); e.target.value = ""; }} />
    </div>
  );
}

export function MedsConfirm({ person, onConfirm }: { person: Person; onConfirm: (meds: Med[]) => void }) {
  const [meds, setMeds] = useState<Med[]>(person.medicines.length ? person.medicines : [{ name: "", times: [] }]);
  return (
    <div className={cn(CARD, "max-w-[620px] p-2.5")}>
      <div className="space-y-2">
        {meds.map((m, k) => (
          <MedCard key={k} m={m} person={person} onChange={(next) => setMeds(meds.map((x, j) => (j === k ? next : x)))} onRemove={() => setMeds(meds.filter((_, j) => j !== k))} />
        ))}
      </div>
      <div className="flex flex-wrap gap-2 p-1.5 pt-3">
        <button type="button" onClick={() => onConfirm(meds)} className={PRIMARY}><Check size={16} weight="bold" />Looks right</button>
        <button type="button" onClick={() => setMeds([...meds, { name: "", times: [] }])} className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-[14px] text-[var(--c-ink-2)] hover:text-[var(--c-ink)]"><Plus size={15} />Add one</button>
      </div>
    </div>
  );
}

export function PhoneWidget({ target, who, initial, otherPhone, verified, saheliNumber, optional, onPhone, onVerified, onContinue, onSkip }: {
  target: string; who: string; initial?: string; otherPhone?: string; verified: boolean; saheliNumber: string; optional?: boolean;
  onPhone: (p: string) => void; onVerified: () => void; onContinue: () => void; onSkip?: () => void;
}) {
  const phone = initial || "";
  const clash = samePhone(phone, otherPhone);
  const ok = validPhone(phone) && !clash;
  return (
    <div className={cn(CARD, "max-w-[560px]")}>
      <PhoneField label={target === "self" ? "Your WhatsApp number" : `${who}'s WhatsApp number`} value={phone} onChange={onPhone} />
      {clash && <p className="mt-2 text-[13px] text-[var(--c-danger)]">That&apos;s the other person&apos;s number. Each person needs their own WhatsApp.</p>}
      {ok && <div className="mt-3"><VerifyWhatsApp target={target} phone={phone} who={who} verified={verified} saheliNumber={saheliNumber} onVerified={onVerified} /></div>}
      <div className="mt-3 flex flex-wrap gap-3 text-[13px]">
        {ok && !verified && <button type="button" onClick={onContinue} className="text-[var(--c-ink-2)] underline-offset-4 hover:text-[var(--c-ink)] hover:underline">Continue without verifying</button>}
        {optional && onSkip && <button type="button" onClick={onSkip} className="text-[var(--c-ink-2)] underline-offset-4 hover:text-[var(--c-ink)] hover:underline">Not now</button>}
      </div>
    </div>
  );
}

const DAY_FIELDS = [
  { key: "wake", label: "Wakes up", def: "06:30" }, { key: "breakfast", label: "Breakfast", def: "08:30" }, { key: "lunch", label: "Lunch", def: "13:00" },
  { key: "dinner", label: "Dinner", def: "20:30" }, { key: "sleep", label: "Goes to sleep", def: "22:00" },
] as const;

export function TimesWidget({ person, self, onDone }: { person: Person; self: boolean; onDone: (day: Partial<Person["day"]>) => void }) {
  const [t, setT] = useState<Record<string, string>>(Object.fromEntries(DAY_FIELDS.map((f) => [f.key, person.day[f.key] || f.def])));
  return (
    <div className={cn(CARD, "max-w-[460px]")}>
      <div className="space-y-1.5">
        {DAY_FIELDS.map((f) => <TimeField key={f.key} label={self && f.key === "wake" ? "I wake up" : self && f.key === "sleep" ? "I go to sleep" : f.label} value={t[f.key]} onChange={(v) => setT({ ...t, [f.key]: v })} />)}
      </div>
      <button type="button" onClick={() => onDone(t)} className={cn(PRIMARY, "mt-3")}><Check size={16} weight="bold" />These are right</button>
    </div>
  );
}

export function NumberWidget({ placeholder, skip, onValue, onSkip }: { placeholder: string; skip?: string; onValue: (n: number) => void; onSkip: () => void }) {
  const [v, setV] = useState("");
  const n = Number(v);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input inputMode="numeric" value={v} onChange={(e) => setV(e.target.value.replace(/\D/g, "").slice(0, 3))} onKeyDown={(e) => e.key === "Enter" && n >= 1 && n <= 120 && onValue(n)}
        placeholder={placeholder} aria-label={placeholder} className="c-num h-11 w-28 rounded-full border border-[var(--c-line)] bg-white px-4 text-center text-[16px] outline-none focus:border-[var(--c-ink)]" />
      <button type="button" disabled={!(n >= 1 && n <= 120)} onClick={() => onValue(n)} className={PRIMARY}>Send</button>
      {skip && <button type="button" onClick={onSkip} className="h-11 rounded-full px-3 text-[13.5px] text-[var(--c-ink-2)] hover:text-[var(--c-ink)]">{skip}</button>}
    </div>
  );
}

export function EmergencyWidget({ onSave, onSkip }: { onSave: (e: { name: string; relation?: string; phone: string }) => void; onSkip: () => void }) {
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("");
  const [phone, setPhone] = useState("");
  const input = "h-11 w-full rounded-[14px] bg-[var(--c-card)] px-4 text-[14px] outline-none focus:ring-2 focus:ring-[var(--c-ink)]";
  return (
    <div className={cn(CARD, "max-w-[520px]")}>
      <div className="grid gap-2 sm:grid-cols-2">
        <input value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="Name" className={input} />
        <input value={relation} maxLength={40} onChange={(e) => setRelation(e.target.value)} placeholder="Neighbour, brother…" className={input} />
      </div>
      <div className="mt-2"><PhoneField label="Their number" value={phone} onChange={setPhone} /></div>
      <div className="mt-3 flex gap-2">
        <button type="button" disabled={!name.trim() || !validPhone(phone)} onClick={() => onSave({ name: name.trim(), relation: relation.trim() || undefined, phone })} className={PRIMARY}>Save</button>
        <button type="button" onClick={onSkip} className="h-11 rounded-full px-3 text-[13.5px] text-[var(--c-ink-2)] hover:text-[var(--c-ink)]">Skip</button>
      </div>
    </div>
  );
}

const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";

export function SummaryCard({ person, call, rows, onEdit }: { person: Person; call: string; rows: SummaryRow[]; onEdit: (key: string, label: string) => void }) {
  const facts = [person.age && `${person.age}`, person.city, person.livesWith === "alone" ? "lives alone" : person.livesWith === "care_home" ? "in a care home" : person.livesWith ? `lives with ${person.livesWith === "me" ? "you" : person.livesWith === "spouse" ? "partner" : "family"}` : ""].filter(Boolean).join(" · ");
  return (
    <div className={cn(CARD, "max-w-[600px] p-5")}>
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--c-ink)] text-[15px] font-medium text-white">{initials(person.name)}</span>
        <div className="min-w-0">
          <p className="text-[16px] font-medium">{person.name}{call !== "you" && <span className="font-normal text-[var(--c-ink-2)]"> · {call}</span>}</p>
          {facts && <p className="text-[12.5px] text-[var(--c-ink-3)]">{facts}</p>}
        </div>
      </div>
      <div className="mt-4 divide-y divide-[var(--c-line)] text-[13.5px]">
        {rows.map((r) => (
          <div key={r.label} className="flex items-start gap-3 py-2.5">
            <span className="w-28 shrink-0 text-[var(--c-ink-2)]">{r.label}</span>
            <span className="min-w-0 flex-1">{r.value}</span>
            {r.edit && <button type="button" onClick={() => onEdit(r.edit, r.label)} aria-label={`Change ${r.label}`} className="text-[var(--c-ink-3)] hover:text-[var(--c-ink)]"><PencilSimple size={15} /></button>}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SetupProgress({ steps, finished }: { steps: string[]; finished: boolean }) {
  const [at, setAt] = useState(0);
  useEffect(() => {
    if (finished) return;
    const t = setInterval(() => setAt((x) => Math.min(steps.length - 1, x + 1)), 1500);
    return () => clearInterval(t);
  }, [finished, steps.length]);
  const upto = finished ? steps.length : at;
  return (
    <div className={cn(CARD, "max-w-[480px] p-3")}>
      {steps.map((s, k) => (
        <div key={s} className={cn("flex items-center gap-3 rounded-[14px] px-3 py-2.5 text-[14px]", k === upto && "bg-[var(--c-card)]")}>
          {k < upto ? <CheckCircle size={19} weight="fill" className="text-[#1f7a4d]" /> : k === upto ? <CircleNotch size={19} className="animate-spin text-[var(--c-accent)]" /> : <span className="h-[19px] w-[19px] rounded-full border border-[var(--c-line)]" />}
          <span className={k > upto ? "text-[var(--c-ink-3)]" : ""}>{s}</span>
        </div>
      ))}
    </div>
  );
}

export function WelcomePreview({ text, voice }: { text: string; voice: boolean }) {
  const bars = [4, 9, 14, 8, 18, 12, 6, 16, 10, 20, 8, 13, 5, 15, 9, 11, 6, 14, 8, 4];
  return (
    <div className="max-w-[440px] rounded-[24px] bg-[#efeae2] p-3">
      <div className="rounded-[16px] rounded-tl-[4px] bg-white px-3.5 py-2.5 text-[14.5px] leading-[1.55] shadow-sm">
        {text}
        <p className="c-num mt-1 text-right text-[10.5px] text-[var(--c-ink-3)]">{new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} ✓✓</p>
      </div>
      {voice && (
        <div className="mt-1.5 flex w-[250px] items-center gap-2.5 rounded-[16px] bg-white px-3 py-2 shadow-sm" aria-hidden>
          <span className="h-0 w-0 border-y-[7px] border-l-[11px] border-y-transparent border-l-[var(--c-ink-2)]" />
          <div className="flex h-6 flex-1 items-center gap-[2px]">{bars.map((h, k) => <span key={k} className="w-[3px] rounded-full bg-[var(--c-ink-3)]" style={{ height: h }} />)}</div>
        </div>
      )}
    </div>
  );
}
