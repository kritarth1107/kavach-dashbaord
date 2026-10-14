"use client";
/** The emergency card as a medical ID (design approved 2026-10-13): the first ten minutes on one card. */

import { FirstAidKit, MapPin, Phone, QrCode, Warning } from "@phosphor-icons/react";
import type { EmergencyCard } from "@/lib/care-features-api";
import { cn } from "@/lib/utils";
import { telHref } from "./care-kit";
import { PersonPhoto } from "./portrait-kit";

export type CallPerson = { name: string; relation?: string | null; phone: string; photo?: string | null; note?: string | null };

function Ecg({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 800 90" preserveAspectRatio="none" aria-hidden>
      <path d="M0 50 H250 L270 50 L282 20 L296 82 L310 8 L326 62 L338 50 H520 L534 50 L544 32 L556 70 L566 44 L576 50 H800" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function BloodDrop({ group }: { group?: string }) {
  return (
    <div className="relative flex h-[132px] w-[118px] shrink-0 flex-col items-center justify-end pb-5">
      <svg viewBox="0 0 118 132" className="absolute inset-0" aria-hidden>
        <path d="M59 4 C59 4 12 56 12 84 a47 44 0 0 0 94 0 C106 56 59 4 59 4z" className="fill-[var(--c-danger)]" />
      </svg>
      <span className="relative text-[9.5px] tracking-[0.12em] opacity-90">BLOOD</span>
      <span className="c-num relative text-[40px] leading-none">{group || "?"}</span>
    </div>
  );
}

const Glass = ({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) => (
  <div className={cn("rounded-[18px] border border-white/10 bg-white/[0.07] px-4 py-3", className)}>
    <p className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-white/50">{title}</p>
    <div className="mt-2">{children}</div>
  </div>
);

export function MedicalIdCard({
  card,
  name,
  photo,
  lines,
  callers,
  qrSvg,
  onMakeLink,
  updated,
}: {
  card: EmergencyCard;
  name: string;
  photo?: string | null;
  lines: string[];
  callers: CallPerson[];
  qrSvg: string | null;
  onMakeLink?: () => void;
  updated?: string;
}) {
  const allergies = card.allergies;
  const doctor = card.doctors[0];
  const hospital = card.hospital[0];
  const insurance = card.profile.insurance;
  return (
    <div className="relative">
      <div className="relative overflow-hidden rounded-[24px] bg-[var(--c-solid)] p-5 text-white shadow-[var(--c-shadow)] sm:p-7">
        <Ecg className="pointer-events-none absolute bottom-7 left-0 right-0 h-14 text-white/10" />
        <div className="relative flex items-center justify-between gap-3">
          <span className="flex items-center gap-2.5 text-[12px] font-semibold tracking-[0.16em]">
            <span className="flex h-7 w-7 items-center justify-center rounded-[9px] bg-[var(--c-accent)] text-[var(--c-accent-ink)]">
              <FirstAidKit size={16} weight="fill" />
            </span>
            MEDICAL ID
          </span>
          {updated && <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11.5px]">Kavach · {updated}</span>}
        </div>

        <div className="relative mt-7 flex flex-col gap-5 sm:flex-row sm:items-center">
          <PersonPhoto name={name} src={photo} rounded="rounded-[24px]" className="h-[104px] w-[104px] border-2 border-white/80 sm:h-[112px] sm:w-[112px]" text={38} />
          <div className="min-w-0 flex-1">
            <p className="break-words text-[32px] font-medium leading-none tracking-[-0.035em] sm:text-[38px]">{name}</p>
            {lines.map((l) => (
              <p key={l} className="mt-1.5 text-[13.5px] text-white/75">
                {l}
              </p>
            ))}
          </div>
          <BloodDrop group={card.profile.blood_group} />
        </div>

        <div
          className={cn(
            "relative mt-6 flex items-center gap-3 rounded-[18px] px-4 py-3",
            allergies.length ? "bg-[var(--c-danger)]" : "border border-white/10 bg-white/[0.07]",
          )}
        >
          <Warning size={22} weight="fill" className="shrink-0" />
          <div className="min-w-0">
            {allergies.length ? (
              <>
                <p className="text-[15px] font-semibold">Allergic to {allergies.map((a) => a.allergen).join(", ")}</p>
                <p className="mt-0.5 text-[12.5px] text-white/90">
                  {allergies
                    .map((a) => (a.reaction ? `${a.allergen}: ${a.reaction}` : null))
                    .filter(Boolean)
                    .join(" · ") || allergies.map((a) => a.text).join(" ")}
                </p>
              </>
            ) : (
              <p className="text-[14px]">{card.none?.allergy ? "No known allergies (the family confirmed)" : "Allergies not recorded yet"}</p>
            )}
          </div>
        </div>

        <div className="relative mt-3 grid gap-3 sm:grid-cols-2">
          <Glass title="Conditions">
            {card.conditions.length ? (
              <div className="flex flex-wrap gap-1.5">
                {card.conditions.map((c) => (
                  <span key={c} className="rounded-full bg-white/10 px-3 py-1 text-[12.5px]">
                    {c}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-white/60">{card.none?.condition ? "No long-term conditions" : "None recorded"}</p>
            )}
          </Glass>
          <Glass title="Takes daily">
            {card.medicines.length ? (
              <ul className="space-y-1">
                {card.medicines.slice(0, 5).map((m) => (
                  <li key={m.name} className="flex justify-between gap-3 text-[13px]">
                    <b className="min-w-0 truncate font-semibold">
                      {m.name}
                      {m.dose ? ` ${m.dose}` : ""}
                    </b>
                    <span className="shrink-0 tabular-nums text-white/65">{m.times.join(" · ")}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-white/60">{card.none?.medicine ? "No regular medicines" : "None recorded"}</p>
            )}
          </Glass>
        </div>

        <div className="relative mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_150px]">
          {callers.slice(0, 2).map((c) => (
            <div key={c.name} className="flex items-center gap-3 rounded-[18px] border border-white/10 bg-white/[0.07] p-2.5">
              <PersonPhoto name={c.name} src={c.photo} rounded="rounded-full" className="h-[46px] w-[46px]" text={16} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium">{c.name}</p>
                <p className="truncate text-[11.5px] capitalize text-white/65">{[c.relation, c.note].filter(Boolean).join(" · ")}</p>
              </div>
              <a href={telHref(c.phone)} aria-label={`Call ${c.name}`} className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-[var(--c-accent)] text-[var(--c-accent-ink)]">
                <Phone size={18} weight="fill" />
              </a>
            </div>
          ))}
          {callers.length === 0 && (
            <div className="rounded-[18px] border border-dashed border-white/25 p-3 text-[12.5px] text-white/70 sm:col-span-2">No one to call yet. Add an emergency contact with a phone number.</div>
          )}
          {callers.length === 1 && <div className="hidden sm:block" />}
          {/* The QR needs a light quiet zone in both themes: the on-solid chip, with jade text, stays light in dark mode. */}
          <div className="flex flex-col items-center justify-center rounded-[18px] bg-[var(--c-on-solid)] p-2.5 text-[var(--c-solid)]">
            {qrSvg ? (
              <>
                <span className="block h-[96px] w-[96px] [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: qrSvg }} />
                <span className="mt-1 text-center text-[10px] leading-tight opacity-80">Scan for the live card</span>
              </>
            ) : (
              <button type="button" onClick={onMakeLink} className="flex flex-col items-center gap-1.5 py-2 text-center text-[11px] opacity-80">
                <QrCode size={40} />
                Make a link to get a QR
              </button>
            )}
          </div>
        </div>

        <div className="relative mt-4 flex flex-col gap-1 text-[12px] text-white/75 sm:flex-row sm:justify-between">
          <span className="flex items-start gap-1.5">
            <MapPin size={14} weight="fill" className="mt-0.5 shrink-0 text-[var(--c-accent)]" />
            {card.home ? <b className="font-medium text-white">{card.home}</b> : <span>Home address not saved</span>}
          </span>
          <span className="truncate">{[doctor?.name, hospital?.name, insurance].filter(Boolean).join(" · ")}</span>
        </div>
      </div>
    </div>
  );
}
