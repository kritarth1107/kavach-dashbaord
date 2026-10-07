"use client";
/** The right-hand panel: Saheli's notes on the person, filling in as each question is answered. */
import { CheckCircle, Clock, Pill, Sparkle, Translate, WarningCircle, WhatsappLogo } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { DAY_SLOTS, DIALECTS, LANGUAGES, type Answers, type Person } from "./data";

function Row({ icon: Icon, children, muted }: { icon: typeof Pill; children: React.ReactNode; muted?: boolean }) {
  return (
    <p className={cn("flex items-start gap-2.5 text-[13px] leading-snug", muted && "text-[var(--c-ink-3)]")}>
      <Icon size={16} className="mt-[1px] shrink-0 text-[var(--c-accent)]" />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

function PersonCard({ p, verified, compact }: { p: Person; verified: boolean; compact?: boolean }) {
  const lang = LANGUAGES.find((l) => l.code === p.language);
  const dialect = DIALECTS.find((d) => d.code === p.dialect);
  const initial = (p.name || p.relation || "?").trim().charAt(0).toUpperCase();
  const firstSlot = DAY_SLOTS.map((s) => p.day[s.key]).filter(Boolean);
  return (
    <div className="rounded-[24px] bg-[var(--c-frame)] p-5 shadow-[0_1px_0_rgba(20,42,34,0.04)]">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--c-accent)] text-[18px] font-medium text-white">{initial}</span>
        <div className="min-w-0">
          <p className="truncate text-[17px] font-medium tracking-[-0.02em]">{p.name || <span className="text-[var(--c-ink-3)]">Name</span>}</p>
          <p className="text-[12px] text-[var(--c-ink-2)]">{[p.relation !== "Self" ? p.relation : "You", p.age ? `${p.age} yrs` : "", p.city].filter(Boolean).join(" · ")}</p>
        </div>
      </div>
      <div className="mt-4 space-y-2.5">
        <Row icon={Sparkle} muted={!p.addressAs && !p.callThem}>Saheli calls {p.relation === "Self" ? "you" : "them"} <b className="font-medium">{p.addressAs || p.callThem || "…"}</b></Row>
        <Row icon={Translate} muted={!lang}>{lang ? <>{dialect ? `${dialect.name} · ${dialect.native}` : `${lang.name} · ${lang.native}`}{p.reads === "voice" ? " · voice notes" : p.reads === "both" ? " · text + voice" : ""}</> : "Language"}</Row>
        <Row icon={WhatsappLogo} muted={!p.phone}>{p.phone ? <>{p.phone} {verified ? <span className="ml-1 inline-flex items-center gap-1 text-[#1f7a4d]"><CheckCircle size={13} weight="fill" /> connected</span> : <span className="text-[var(--c-ink-3)]">· not verified yet</span>}</> : "WhatsApp"}</Row>
        {(p.conditions.length > 0 || p.allergies.items.length > 0) && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {p.conditions.map((c) => <span key={c} className="rounded-full bg-[var(--c-card)] px-2.5 py-1 text-[11px]">{c}</span>)}
            {!p.allergies.none && p.allergies.items.map((a) => <span key={a} className="inline-flex items-center gap-1 rounded-full bg-[#ffe1e1] px-2.5 py-1 text-[11px] text-[#b4232a]"><WarningCircle size={11} weight="fill" /> {a}</span>)}
          </div>
        )}
      </div>
      {!compact && p.medicines.length > 0 && (
        <div className="mt-4 rounded-[18px] bg-[var(--c-card)] p-3.5">
          <p className="mb-2 flex items-center gap-2 text-[12px] font-medium"><span className="h-3 w-3 rounded-[3px] bg-[var(--c-accent)]" /> Reminders on WhatsApp</p>
          <ul className="space-y-1.5">
            {p.medicines.filter((m) => m.name).slice(0, 6).map((m, i) => (
              <li key={i} className="flex items-center justify-between gap-2 text-[12.5px]">
                <span className="flex min-w-0 items-center gap-1.5"><Pill size={13} className="shrink-0 text-[var(--c-ink-3)]" /><span className="truncate">{m.name}{m.dose ? ` ${m.dose}` : ""}</span></span>
                <span className="c-num shrink-0 text-[var(--c-ink-2)]">{m.times.join(" · ") || "no time"}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {!compact && firstSlot.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 flex items-center gap-2 text-[12px] font-medium"><Clock size={13} className="text-[var(--c-accent)]" /> Their day</p>
          <div className="flex h-10 items-end gap-1">
            {DAY_SLOTS.map((s) => (
              <div key={s.key} className="flex flex-1 flex-col items-center gap-1">
                <span className={cn("w-full rounded-full", p.day[s.key] ? (s.key === "wake" || s.key === "sleep" ? "h-3 bg-[var(--c-ink)]" : "h-6 bg-[var(--c-accent)]") : "h-2 bg-[var(--c-line)]")} />
                <span className="c-num text-[10px] text-[var(--c-ink-3)]">{p.day[s.key] || "–"}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function Preview({ answers, verified }: { answers: Answers; verified: Record<string, boolean> }) {
  const people = answers.persons;
  return (
    <aside className="sticky top-0 hidden h-screen flex-1 flex-col justify-between overflow-y-auto bg-[var(--c-card)] p-10 lg:flex" aria-label="What Saheli knows so far">
      <div>
        <h2 className="text-[40px] leading-[1.04] tracking-[-0.035em]">
          <span className="block font-light text-[var(--c-ink-3)]">Saheli is getting</span>
          <span className="block font-medium">to know your family</span>
        </h2>
        <p className="mt-3 max-w-sm text-[13px] text-[var(--c-ink-2)]">Every answer goes straight into Saheli&apos;s notes. You can change anything later from the dashboard, or just tell her on WhatsApp.</p>
      </div>
      <div className="my-8 space-y-4">
        {people.length === 0 && (
          <div className="rounded-[24px] border border-dashed border-[var(--c-line)] p-8 text-center text-[13px] text-[var(--c-ink-3)]">Who Saheli looks after appears here.</div>
        )}
        {people.map((p, i) => <PersonCard key={i} p={p} verified={!!verified[answers.careFor === "self" ? "self" : `person:${i}`]} compact={people.length > 1} />)}
      </div>
      <p className="text-[12px] text-[var(--c-ink-3)]">Private to your family. Saheli never shares health details outside it.</p>
    </aside>
  );
}
