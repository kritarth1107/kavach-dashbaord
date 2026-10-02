"use client";

import { FirstAidKit, Hospital, LinkBreak, Phone, Pill, Stethoscope, Warning } from "@phosphor-icons/react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getPublicEmergency, type PublicEmergency } from "@/lib/care-features-api";
import { fmtAt, telHref } from "@/components/care-os/care-kit";
import { PROFILE_FIELDS } from "@/components/care-os/emergency-card-view";
import { Avatar } from "@/components/care-os/ui";
import { cn } from "@/lib/utils";

type State = { status: "loading" } | { status: "ok"; data: PublicEmergency } | { status: "error"; message: string };

function Section({ title, icon: Icon, children }: { title: string; icon?: typeof Pill; children: React.ReactNode }) {
  return (
    <section className="rounded-[22px] bg-[var(--c-card)] p-4">
      <h2 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.07em] text-[var(--c-ink-2)]">
        {Icon ? <Icon size={15} weight="fill" /> : <span className="h-[12px] w-[12px] rounded-[3px] bg-[var(--c-accent)]" aria-hidden />}
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function CallRow({ name, meta, phone, primary }: { name: string; meta?: string | null; phone: string; primary?: boolean }) {
  return (
    <a
      href={telHref(phone)}
      className={cn(
        "flex min-h-[64px] items-center gap-3 rounded-[18px] px-4 py-3 transition-opacity active:opacity-80",
        primary ? "bg-[var(--c-ink)] text-[var(--c-frame)]" : "bg-[var(--c-frame)]",
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[16px] font-medium">{name}</span>
        <span className={cn("block truncate text-[13px] tabular-nums", primary ? "opacity-75" : "text-[var(--c-ink-2)]")}>
          {[meta, phone].filter(Boolean).join(" · ")}
        </span>
      </span>
      <span className={cn("flex h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-[14px] font-medium", primary ? "bg-[var(--c-accent)] text-white" : "bg-[var(--c-ink)] text-[var(--c-frame)]")}>
        <Phone size={16} weight="fill" /> Call
      </span>
    </a>
  );
}

export default function PublicEmergencyPage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let off = false;
    getPublicEmergency(token)
      .then((data) => !off && setState({ status: "ok", data }))
      .catch((e: unknown) => !off && setState({ status: "error", message: e instanceof Error ? e.message : "This emergency link is not active" }));
    return () => {
      off = true;
    };
  }, [token]);

  return (
    <div className="care-os h-dvh overflow-y-auto">
      <main className="mx-auto w-full max-w-[560px] px-4 pb-10 pt-5">
        <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--c-accent)]">
          <FirstAidKit size={15} weight="fill" /> Emergency card
        </p>

        {state.status === "loading" && (
          <div className="mt-4 space-y-3" aria-busy="true">
            <div className="h-[120px] animate-pulse rounded-[22px] bg-[var(--c-card)]" />
            <div className="h-[90px] animate-pulse rounded-[22px] bg-[var(--c-card)]" />
            <div className="h-[200px] animate-pulse rounded-[22px] bg-[var(--c-card)]" />
          </div>
        )}

        {state.status === "error" && (
          <div className="mt-6 flex flex-col items-center rounded-[24px] bg-[var(--c-card)] px-6 py-12 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--c-frame)]">
              <LinkBreak size={24} />
            </span>
            <h1 className="mt-4 text-[22px] font-medium tracking-[-0.02em]">This link is not active</h1>
            <p className="mt-2 max-w-sm text-[14px] text-[var(--c-ink-2)]">
              The family may have turned it off or made a new one. Ask them for the latest link.
            </p>
            <a href="tel:112" className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-[var(--c-ink)] px-6 text-[15px] font-medium text-[var(--c-frame)]">
              <Phone size={18} weight="fill" /> Emergency: call 112
            </a>
          </div>
        )}

        {state.status === "ok" && <Card data={state.data} />}

        <p className="mt-8 text-center text-[12px] text-[var(--c-ink-3)]">Kavach CareOS · shared by the family</p>
      </main>
    </div>
  );
}

function Card({ data }: { data: PublicEmergency }) {
  const { person, card } = data;
  const blood = card.profile.blood_group;
  const details = PROFILE_FIELDS.filter((f) => f.key !== "blood_group" && card.profile[f.key]);
  const caregivers = [...data.caregivers].filter((c) => c.phone).sort((a, b) => Number(b.primary) - Number(a.primary));
  const contacts = card.contacts.filter((c) => c.emergency && c.phone && !caregivers.some((g) => g.phone === c.phone));

  return (
    <div className="mt-3 space-y-3">
      <header className="flex items-center gap-4">
        <Avatar name={person.name} src={person.photo} size={72} />
        <div className="min-w-0 flex-1">
          <h1 className="break-words text-[30px] font-medium leading-[1.05] tracking-[-0.03em]">{person.name}</h1>
          {person.phone && (
            <a href={telHref(person.phone)} className="mt-1 inline-block text-[14px] tabular-nums text-[var(--c-ink-2)] underline-offset-2 hover:underline">
              {person.phone}
            </a>
          )}
        </div>
      </header>

      <div className="grid grid-cols-[auto_1fr] gap-3">
        <div className="flex flex-col justify-center rounded-[22px] bg-[var(--c-ink)] px-5 py-4 text-[var(--c-frame)]">
          <span className="text-[11px] font-medium uppercase tracking-[0.07em] opacity-70">Blood group</span>
          <span className="c-num mt-1 text-[44px] leading-none">{blood || "—"}</span>
        </div>
        <section className="rounded-[22px] bg-[var(--c-accent)] p-4 text-white">
          <h2 className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.08em]">
            <Warning size={16} weight="fill" /> Allergies
          </h2>
          {card.allergies.length === 0 ? (
            <p className="mt-2 text-[15px]">None known</p>
          ) : (
            <ul className="mt-1.5 space-y-1">
              {card.allergies.map((a) => (
                <li key={a.allergen} className="text-[18px] font-semibold leading-snug">
                  {a.allergen}
                  {a.reaction && <span className="text-[14px] font-normal opacity-90"> · {a.reaction}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {card.conditions.length > 0 && (
        <Section title="Conditions">
          <ul className="flex flex-wrap gap-2">
            {card.conditions.map((c) => (
              <li key={c} className="rounded-full bg-[var(--c-frame)] px-3.5 py-1.5 text-[15px] font-medium">
                {c}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {card.medicines.length > 0 && (
        <Section title="Medicines" icon={Pill}>
          <ul className="divide-y divide-[var(--c-line)] rounded-[16px] bg-[var(--c-frame)] px-4">
            {card.medicines.map((m) => (
              <li key={m.name} className="flex items-baseline justify-between gap-3 py-2.5">
                <span className="min-w-0">
                  <span className="text-[15px] font-medium">{m.name}</span>
                  {m.dose && <span className="text-[14px] text-[var(--c-ink-2)]"> {m.dose}</span>}
                </span>
                {m.times.length > 0 && <span className="shrink-0 text-[13px] tabular-nums text-[var(--c-ink-2)]">{m.times.join(", ")}</span>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {(caregivers.length > 0 || contacts.length > 0) && (
        <Section title="Call family" icon={Phone}>
          <div className="space-y-2">
            {caregivers.map((c, i) => (
              <CallRow key={`g${i}`} name={c.name} meta={c.primary ? "Primary caregiver" : "Caregiver"} phone={c.phone!} primary={i === 0} />
            ))}
            {contacts.map((c) => (
              <CallRow key={c.name} name={c.name} meta={c.relation} phone={c.phone!} primary={caregivers.length === 0 && c === contacts[0]} />
            ))}
          </div>
        </Section>
      )}

      {card.doctors.length > 0 && (
        <Section title="Doctor" icon={Stethoscope}>
          <div className="space-y-2">
            {card.doctors.map((d) =>
              d.phone ? (
                <CallRow key={d.name} name={d.name} meta={d.speciality} phone={d.phone} />
              ) : (
                <p key={d.name} className="rounded-[18px] bg-[var(--c-frame)] px-4 py-3 text-[15px] font-medium">
                  {d.name}
                  {d.speciality && <span className="font-normal text-[var(--c-ink-2)]"> · {d.speciality}</span>}
                </p>
              ),
            )}
          </div>
        </Section>
      )}

      {card.hospital.length > 0 && (
        <Section title="Hospital" icon={Hospital}>
          <div className="space-y-2">
            {card.hospital.map((h) => (
              <div key={h.name}>
                {h.phone ? (
                  <CallRow name={h.name} meta={null} phone={h.phone} />
                ) : (
                  <p className="rounded-[18px] bg-[var(--c-frame)] px-4 py-3 text-[15px] font-medium">{h.name}</p>
                )}
                {h.address && <p className="mt-1.5 px-1 text-[13px] text-[var(--c-ink-2)]">{h.address}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {(details.length > 0 || card.diet.length > 0) && (
        <Section title="Good to know">
          <dl className="space-y-1.5 text-[14px]">
            {details.map((f) => (
              <div key={f.key} className="flex gap-3">
                <dt className="w-[84px] shrink-0 text-[var(--c-ink-2)]">{f.label}</dt>
                <dd className="min-w-0 break-words font-medium">{card.profile[f.key]}</dd>
              </div>
            ))}
            {card.diet.length > 0 && (
              <div className="flex gap-3">
                <dt className="w-[84px] shrink-0 text-[var(--c-ink-2)]">Diet</dt>
                <dd className="min-w-0 font-medium">{card.diet.join(", ")}</dd>
              </div>
            )}
          </dl>
        </Section>
      )}

      <p className="pt-1 text-center text-[12px] text-[var(--c-ink-3)]">Updated {fmtAt(data.updatedAt)}</p>
    </div>
  );
}
