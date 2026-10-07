"use client";

/** Saheli's notebook: everything she has understood so far, filling in as the chat goes. */
import { CheckCircle, Heartbeat, Pill, SunHorizon, Translate, User } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { pronoun, type Answers, type Person } from "../data";
import { callOf, isSelf } from "./engine";
import { greetingFor, option, scriptFor } from "./region";
import { LABEL } from "./widgets";

export type CardKey = "who" | "speaks" | "health" | "meds" | "day";

const Empty = ({ text, icon: Icon }: { text: string; icon: typeof User }) => (
  <div className="flex items-center gap-3 rounded-[18px] border border-dashed border-[#d5d9dc] px-4 py-3.5 text-[13.5px] text-[var(--c-ink-3)]"><Icon size={18} />{text}</div>
);
const Card = ({ title, children, fresh }: { title: string; children: React.ReactNode; fresh?: boolean }) => (
  <div className={cn("h-full rounded-[20px] bg-white p-4 transition-shadow duration-700", fresh && "shadow-[0_0_0_2px_var(--c-accent-soft)]")}>
    <p className={LABEL}>{title}</p>
    {children}
  </div>
);
const Pill2 = ({ t }: { t: string }) => <span className="c-num rounded-full bg-[var(--c-ink)] px-2.5 py-1 text-[12px] text-white">{t}</span>;

function DayLine({ p }: { p: Person }) {
  const d = p.day;
  const min = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
  const pos = (t: string) => Math.max(0, Math.min(100, ((min(t) - 300) / (17 * 60 + 30)) * 100));
  return (
    <>
      <div className="relative mt-1 h-2 rounded-full bg-[var(--c-card)]">
        {d.wake && d.sleep && min(d.sleep) > min(d.wake) && <div className="absolute inset-y-0 rounded-full bg-[var(--c-ink)]" style={{ left: `${pos(d.wake)}%`, right: `${100 - pos(d.sleep)}%` }} />}
        {[d.breakfast, d.lunch, d.dinner].filter((t): t is string => !!t).map((t) => (
          <span key={t} className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[var(--c-accent)]" style={{ left: `${pos(t)}%` }} />
        ))}
      </div>
      <div className="c-num mt-2 flex justify-between text-[10.5px] text-[var(--c-ink-3)]"><span>5 am</span><span>9 am</span><span>1 pm</span><span>5 pm</span><span>10 pm</span></div>
      <p className="mt-2 text-[12.5px] text-[var(--c-ink-2)]">{[d.wake && `Up ${d.wake}`, d.sleep && `asleep by ${d.sleep}`].filter(Boolean).join(", ")}{d.activities.length ? ` · ${d.activities.slice(0, 3).join(", ")}` : ""}</p>
    </>
  );
}

export function Notebook({ answers: a, index, onIndex, fresh, compact }: { answers: Answers; index: number; onIndex: (i: number) => void; fresh?: CardKey | null; compact?: boolean }) {
  const self = isSelf(a);
  const p = a.persons[index];
  const lang = p ? option(p.dialect || p.language || "") : undefined;
  const pr = p ? pronoun(p) : { their: "their" };
  if (!p || (!p.name && !self)) {
    return (
      <div>
        <h2 className="text-[34px] leading-[1.05] tracking-[-0.03em]"><span className="block font-light text-[var(--c-ink-3)]">Saheli is</span><span className="block font-medium">listening.</span></h2>
        <p className="mt-2 text-[13.5px] text-[var(--c-ink-2)]">Everything you tell her lands here, so you can see what she understood.</p>
        <div className="mt-7 space-y-2.5">
          <Empty text="Who Saheli looks after" icon={User} />
          <Empty text="The language and bhasha they speak" icon={Translate} />
          <Empty text="Health and allergies" icon={Heartbeat} />
          <Empty text="Medicines and reminders" icon={Pill} />
          <Empty text="Their day" icon={SunHorizon} />
        </div>
      </div>
    );
  }
  const name = self ? (a.you.name || "you") : p.name;
  const meds = p.medicines.filter((m) => m.name);
  const tags = [p.relation !== "Self" ? p.relation : "", p.age ? `${p.age}` : "", p.city?.split(",")[0] ?? "", p.livesWith === "alone" ? "Lives alone" : p.livesWith === "me" ? "Lives with you" : p.livesWith === "spouse" ? "With partner" : p.livesWith === "family" ? "With family" : ""].filter(Boolean);
  const health = [...p.conditions.map((c) => c.replace(/ \(.*\)$/, "")), p.conditionsOther].filter((x): x is string => !!x);
  const extra = [p.sugarCheck === "daily" ? "Sugar check daily" : p.sugarCheck === "sometimes" ? "Checks sugar sometimes" : "", p.bpMachine ? "BP machine at home" : "", p.allergies.none ? "No allergies" : "", ...p.allergies.items.map((x) => `Allergic: ${x}`)].filter(Boolean);
  return (
    <div>
      {a.persons.length > 1 && (
        <div className="mb-4 flex gap-1.5">
          {a.persons.map((x, k) => (
            <button key={k} type="button" onClick={() => onIndex(k)} className={cn("rounded-full px-3 py-1 text-[12.5px]", k === index ? "bg-[var(--c-ink)] text-white" : "bg-white text-[var(--c-ink-2)]")}>{callOf(x) || x.relation}</button>
          ))}
        </div>
      )}
      {!compact && <h2 className="text-[34px] leading-[1.05] tracking-[-0.03em]"><span className="block font-light text-[var(--c-ink-3)]">Getting to know</span><span className="block truncate font-medium">{name}</span></h2>}
      <div className={cn("grid grid-cols-2 gap-2", !compact && "mt-5")}>
        <div className="col-span-2">
          <Card title={self ? "You" : "Who"} fresh={fresh === "who"}>
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--c-ink)] text-[16px] font-medium text-white">{name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("")}</span>
              <div className="min-w-0">
                <p className="truncate text-[16px] font-medium">{name}</p>
                {!self && (p.addressAs || p.callThem) && <p className="text-[12.5px] text-[var(--c-ink-2)]">Saheli calls {pr.their === "his" ? "him" : pr.their === "her" ? "her" : "them"} <b className="font-medium text-[var(--c-ink)]">{p.addressAs || p.callThem}</b></p>}
              </div>
            </div>
            {tags.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5 text-[12px]">{tags.map((x) => <span key={x} className="rounded-full bg-[var(--c-card)] px-2.5 py-1">{x}</span>)}</div>}
          </Card>
        </div>
        {lang ? (
          <Card title="Speaks" fresh={fresh === "speaks"}>
            <p className="text-[15px] font-medium">{lang.name}</p>
            <p className="text-[13px] text-[var(--c-ink-2)]">{lang.native}{scriptFor(p.language) ? ` · in ${scriptFor(p.language)}` : ""}</p>
            {p.language !== "en" && <p className="mt-2 inline-block rounded-full bg-[var(--c-card)] px-2.5 py-1 text-[12.5px]">“{greetingFor(p.language, p.dialect)}”</p>}
            {p.reads && <p className="mt-2 text-[12px] text-[var(--c-ink-2)]">{p.reads === "voice" ? "Voice notes" : p.reads === "both" ? "Text + voice notes" : "Text messages"}</p>}
          </Card>
        ) : <div className="col-span-2"><Empty text={self ? "The language you'd like" : "The language and bhasha they speak"} icon={Translate} /></div>}
        {health.length || extra.length ? (
          <Card title="Health" fresh={fresh === "health"}>
            <div className="flex flex-wrap gap-1.5 text-[12.5px]">
              {health.map((x) => <span key={x} className="rounded-full bg-[var(--c-accent-soft)] px-2.5 py-1 text-[var(--c-accent-soft-ink)]">{x}</span>)}
              {extra.map((x) => <span key={x} className="rounded-full bg-[var(--c-card)] px-2.5 py-1">{x}</span>)}
            </div>
          </Card>
        ) : <div className={lang ? "" : "col-span-2"}><Empty text="Health and allergies" icon={Heartbeat} /></div>}
        <div className="col-span-2">
          {meds.length ? (
            <Card title="Medicines" fresh={fresh === "meds"}>
              {meds.slice(0, 6).map((m) => (
                <div key={m.name} className="flex items-center justify-between gap-2 py-1 text-[13.5px]">
                  <span className="truncate">{m.name}{m.dose ? ` ${m.dose}` : ""}</span>
                  <span className="flex shrink-0 gap-1">{m.times.length ? m.times.map((t) => <Pill2 key={t} t={t} />) : <span className="text-[12px] text-[var(--c-ink-3)]">time?</span>}</span>
                </div>
              ))}
            </Card>
          ) : p.noMedicines ? <Card title="Medicines"><p className="text-[13.5px] text-[var(--c-ink-2)]">None regularly</p></Card> : <Empty text="Medicines and reminders" icon={Pill} />}
        </div>
        <div className="col-span-2">
          {p.day.wake || p.day.sleep || p.day.breakfast ? <Card title={self ? "Your day" : `${pr.their.charAt(0).toUpperCase()}${pr.their.slice(1)} day`} fresh={fresh === "day"}><DayLine p={p} /></Card> : <Empty text={self ? "Your day" : "Their day"} icon={SunHorizon} />}
        </div>
      </div>
    </div>
  );
}

export function SetupDoneNote({ names }: { names: string }) {
  return <p className="mt-4 flex items-center gap-2 text-[13px] text-[#1f7a4d]"><CheckCircle size={16} weight="fill" />Saheli is with {names} now</p>;
}
