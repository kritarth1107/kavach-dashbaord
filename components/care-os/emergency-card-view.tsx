"use client";

import { FirstAidKit, Phone, Pill, Warning } from "@phosphor-icons/react";
import type { EmergencyCard } from "@/lib/care-features-api";
import { cn } from "@/lib/utils";
import { telHref } from "./care-kit";
import { Avatar } from "./ui";

export const PROFILE_FIELDS: Array<{ key: string; label: string }> = [
  { key: "blood_group", label: "Blood group" },
  { key: "mobility", label: "Mobility" },
  { key: "height", label: "Height" },
  { key: "weight", label: "Weight" },
  { key: "insurance", label: "Insurance" },
  { key: "id_note", label: "ID" },
];

export function CallLink({ phone, label, dark }: { phone: string; label?: string; dark?: boolean }) {
  return (
    <a
      href={telHref(phone)}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-medium tabular-nums transition-opacity hover:opacity-90",
        dark ? "bg-[var(--c-solid)] text-[var(--c-on-solid)]" : "border border-[var(--c-line)] bg-[var(--c-frame)]",
      )}
    >
      <Phone size={14} weight="fill" />
      {label ?? phone}
    </a>
  );
}

function Block({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("kv-avoid rounded-[18px] bg-[var(--c-frame)] p-4", className)}>
      <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--c-ink-3)]">{title}</p>
      <div className="mt-2.5">{children}</div>
    </div>
  );
}

const Empty = ({ children }: { children: React.ReactNode }) => <p className="text-[13px] text-[var(--c-ink-3)]">{children}</p>;

/** The emergency card itself: used on the page and for the printed copy. */
export function EmergencyCardView({
  card,
  name,
  relation,
  photo,
  print,
}: {
  card: EmergencyCard;
  name: string;
  relation?: string;
  photo?: string | null;
  print?: boolean;
}) {
  const blood = card.profile.blood_group;
  const facts = PROFILE_FIELDS.filter((f) => f.key !== "blood_group" && card.profile[f.key]);
  const emergency = card.contacts.filter((c) => c.emergency);
  const others = card.contacts.filter((c) => !c.emergency);

  return (
    <div className={cn("rounded-[24px] bg-[var(--c-card)] p-4 sm:p-6", print && "p-5")}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar name={name || "?"} src={photo} size={64} />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--c-accent)]">
              <FirstAidKit size={13} weight="fill" /> Emergency card
            </p>
            <p className="mt-0.5 break-words text-[26px] font-medium leading-tight tracking-[-0.02em]">{name}</p>
            {relation && relation !== "self care" && <p className="text-[13px] capitalize text-[var(--c-ink-2)]">{relation}</p>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3 self-start rounded-[18px] bg-[var(--c-solid)] px-5 py-3 text-[var(--c-on-solid)] sm:self-auto">
          <span className="text-[11px] font-medium uppercase leading-tight tracking-[0.06em] opacity-70">
            Blood
            <br />
            group
          </span>
          <span className="c-num text-[36px] leading-none">{blood || "—"}</span>
        </div>
      </div>

      <div className="kv-avoid mt-5 rounded-[18px] bg-[var(--c-accent-soft)] p-4 text-[var(--c-accent-soft-ink)]">
        <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.08em]">
          <Warning size={15} weight="fill" /> Allergies
        </p>
        {card.allergies.length === 0 ? (
          <p className="mt-2 text-[14px]">No known allergies recorded.</p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-2">
            {card.allergies.map((a) => (
              <li key={a.allergen} className="rounded-full bg-[var(--c-frame)] px-3.5 py-1.5 text-[15px] font-semibold">
                {a.allergen}
                {a.reaction && <span className="font-normal"> · {a.reaction}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Block title="Conditions">
          {card.conditions.length === 0 ? (
            <Empty>None recorded.</Empty>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {card.conditions.map((c) => (
                <li key={c} className="rounded-full bg-[var(--c-card)] px-3 py-1 text-[13px] font-medium">
                  {c}
                </li>
              ))}
            </ul>
          )}
        </Block>

        <Block title="Details">
          {facts.length === 0 ? (
            <Empty>Mobility, height, weight and insurance show here.</Empty>
          ) : (
            <dl className="space-y-1.5 text-[13px]">
              {facts.map((f) => (
                <div key={f.key} className="flex gap-3">
                  <dt className="w-[78px] shrink-0 text-[var(--c-ink-2)]">{f.label}</dt>
                  <dd className="min-w-0 break-words font-medium">{card.profile[f.key]}</dd>
                </div>
              ))}
            </dl>
          )}
        </Block>

        <Block title="Medicines" className="sm:col-span-2">
          {card.medicines.length === 0 ? (
            <Empty>No medicines recorded.</Empty>
          ) : (
            <ul className="divide-y divide-[var(--c-line)]">
              {card.medicines.map((m) => (
                <li key={m.name} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 first:pt-0 last:pb-0">
                  <Pill size={15} className="shrink-0 text-[var(--c-ink-3)]" />
                  <span className="text-[14px] font-medium">{m.name}</span>
                  {m.dose && <span className="text-[13px] text-[var(--c-ink-2)]">{m.dose}</span>}
                  {m.times.length > 0 && <span className="ml-auto text-[12px] tabular-nums text-[var(--c-ink-2)]">{m.times.join(" · ")}</span>}
                </li>
              ))}
            </ul>
          )}
        </Block>

        <Block title="Emergency contacts" className="sm:col-span-2">
          {emergency.length === 0 ? (
            <Empty>No emergency contacts yet.</Empty>
          ) : (
            <ul className="space-y-2">
              {emergency.map((c) => (
                <li key={c.name} className="flex flex-wrap items-center justify-between gap-2">
                  <span className="min-w-0">
                    <span className="text-[14px] font-medium">{c.name}</span>
                    {c.relation && <span className="text-[13px] capitalize text-[var(--c-ink-2)]"> · {c.relation}</span>}
                    {c.text && <span className="block text-[12px] text-[var(--c-ink-3)]">{c.text}</span>}
                  </span>
                  {c.phone && <CallLink phone={c.phone} dark />}
                </li>
              ))}
            </ul>
          )}
        </Block>

        <Block title="Doctors">
          {card.doctors.length === 0 ? (
            <Empty>No doctor saved.</Empty>
          ) : (
            <ul className="space-y-2.5">
              {card.doctors.map((d) => (
                <li key={d.name}>
                  <p className="text-[14px] font-medium">{d.name}</p>
                  {d.speciality && <p className="text-[12px] text-[var(--c-ink-2)]">{d.speciality}</p>}
                  {d.phone && (
                    <div className="mt-1.5">
                      <CallLink phone={d.phone} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Block>

        <Block title="Hospital">
          {card.hospital.length === 0 ? (
            <Empty>No hospital saved.</Empty>
          ) : (
            <ul className="space-y-2.5">
              {card.hospital.map((h) => (
                <li key={h.name}>
                  <p className="text-[14px] font-medium">{h.name}</p>
                  {h.address && <p className="text-[12px] text-[var(--c-ink-2)]">{h.address}</p>}
                  {h.phone && (
                    <div className="mt-1.5">
                      <CallLink phone={h.phone} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Block>

        {(card.diet.length > 0 || card.familyRules.length > 0 || others.length > 0) && (
          <Block title="Good to know" className="sm:col-span-2">
            <ul className="space-y-1.5 text-[13px]">
              {[...card.diet, ...card.familyRules].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--c-accent)]" /> {t}
                </li>
              ))}
              {others.map((c) => (
                <li key={c.name} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--c-accent)]" />
                  <span>
                    {c.name}
                    {c.relation && ` (${c.relation})`}
                    {c.phone && (
                      <a href={telHref(c.phone)} className="ml-1.5 font-medium tabular-nums underline-offset-2 hover:underline">
                        {c.phone}
                      </a>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </Block>
        )}
      </div>
    </div>
  );
}
