"use client";
/** Building blocks for the onboarding questions, in the Care OS look (white frame, grey panels, saffron accent). */
import { ArrowRight, Camera, Check, CheckCircle, CircleNotch, Copy, Plus, ShareNetwork, WhatsappLogo, X } from "@phosphor-icons/react";
import QRCode from "qrcode";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { onboardingApi } from "./api";
import { DIALECTS, LANGUAGES, slotTimes, type Med, type Person } from "./data";

export const INPUT = "h-14 w-full rounded-[18px] border border-[var(--c-line)] bg-[var(--c-frame)] px-5 text-[17px] outline-none transition placeholder:text-[var(--c-ink-3)] focus:border-[var(--c-ink)]";

export function Heading({ light, dark, sub }: { light: string; dark: string; sub?: React.ReactNode }) {
  return (
    <div className="mb-7">
      <h1 className="text-[34px] leading-[1.06] tracking-[-0.035em] sm:text-[42px]">
        <span className="block font-light text-[var(--c-ink-3)]">{light}</span>
        <span className="block font-medium">{dark}</span>
      </h1>
      {sub && <p className="mt-3 max-w-[520px] text-[14px] leading-relaxed text-[var(--c-ink-2)]">{sub}</p>}
    </div>
  );
}

export function Continue({ onClick, disabled, label = "Continue", loading }: { onClick: () => void; disabled?: boolean; label?: string; loading?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="flex h-12 min-w-[200px] items-center justify-between gap-3 rounded-full bg-[var(--c-ink)] pl-6 pr-1.5 text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
    >
      <span>{label}</span>
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[var(--c-ink)]">
        {loading ? <CircleNotch size={16} className="animate-spin" weight="bold" /> : <ArrowRight size={16} weight="bold" />}
      </span>
    </button>
  );
}

export function Choice<T extends string>({ options, value, onPick, columns = 2 }: {
  options: ReadonlyArray<{ id: T; label: string; hint?: string; native?: string }>; value?: T | null; onPick: (v: T) => void; columns?: 1 | 2 | 3;
}) {
  return (
    <div className={cn("grid gap-2.5", columns === 1 ? "grid-cols-1" : columns === 3 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2")} role="radiogroup">
      {options.map((o) => {
        const on = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onPick(o.id)}
            className={cn(
              "group flex items-center justify-between gap-3 rounded-[18px] border px-4 py-3.5 text-left transition",
              on ? "border-[var(--c-ink)] bg-[var(--c-ink)] text-white" : "border-transparent bg-[var(--c-card)] hover:border-[var(--c-line)] hover:bg-[var(--c-frame)]",
            )}
          >
            <span className="min-w-0">
              <span className="block text-[15px] font-medium">{o.native ? <><span className="mr-2">{o.native}</span><span className={on ? "text-white/70" : "text-[var(--c-ink-3)]"}>{o.label}</span></> : o.label}</span>
              {o.hint && <span className={cn("mt-0.5 block text-[12px]", on ? "text-white/70" : "text-[var(--c-ink-2)]")}>{o.hint}</span>}
            </span>
            <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full", on ? "bg-[var(--c-accent)]" : "bg-[var(--c-frame)]")}>
              {on && <Check size={13} weight="bold" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function Chips({ options, values, onChange, allowOther = true, otherLabel = "Add another" }: {
  options: string[]; values: string[]; onChange: (v: string[]) => void; allowOther?: boolean; otherLabel?: string;
}) {
  const [adding, setAdding] = useState("");
  const all = [...options, ...values.filter((v) => !options.includes(v))];
  const toggle = (v: string) => onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {all.map((o) => {
          const on = values.includes(o);
          return (
            <button key={o} type="button" aria-pressed={on} onClick={() => toggle(o)}
              className={cn("inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[14px] transition", on ? "bg-[var(--c-ink)] text-white" : "bg-[var(--c-card)] text-[var(--c-ink)] hover:bg-[var(--c-line)]")}>
              {on && <Check size={13} weight="bold" className="text-[var(--c-accent)]" />}
              {o}
            </button>
          );
        })}
      </div>
      {allowOther && (
        <form className="mt-3 flex max-w-[420px] gap-2" onSubmit={(e) => { e.preventDefault(); const v = adding.trim(); if (v && !values.includes(v)) onChange([...values, v]); setAdding(""); }}>
          <input value={adding} maxLength={60} onChange={(e) => setAdding(e.target.value)} placeholder={otherLabel} className="h-10 flex-1 rounded-full border border-[var(--c-line)] bg-[var(--c-frame)] px-4 text-[14px] outline-none focus:border-[var(--c-ink)]" />
          <button type="submit" disabled={!adding.trim()} className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--c-card)] disabled:opacity-40" aria-label="Add"><Plus size={16} /></button>
        </form>
      )}
    </div>
  );
}

const CODES = ["+91", "+1", "+44", "+971", "+65", "+61", "+977", "+880", "+94", "+966", "+974", "+60"];
const codeOf = (p: string) => [...CODES].sort((x, y) => y.length - x.length).find((c) => p.startsWith(c));

export function PhoneField({ value, onChange, label }: { value?: string; onChange: (v: string) => void; label: string }) {
  const id = useId();
  const current = value || "";
  const cc = codeOf(current) || "+91";
  const num = current.startsWith(cc) ? current.slice(cc.length) : current.replace(/^\+\d{1,3}/, "");
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[12px] font-medium uppercase tracking-[0.06em] text-[var(--c-ink-3)]">{label}</label>
      <div className="flex gap-2">
        <select aria-label="Country code" value={cc} onChange={(e) => onChange(`${e.target.value}${num}`)} className="h-14 rounded-[18px] border border-[var(--c-line)] bg-[var(--c-frame)] px-3 text-[16px] outline-none focus:border-[var(--c-ink)]">
          {CODES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input id={id} inputMode="tel" autoComplete="tel-national" value={num} onChange={(e) => onChange(`${cc}${e.target.value.replace(/\D/g, "").slice(0, 12)}`)} placeholder="98765 43210" className={INPUT} />
      </div>
    </div>
  );
}

/** A country code from the list and the number: 10 digits in India, 7 to 12 elsewhere (Singapore has 8). */
export const validPhone = (p?: string) => {
  const cc = p ? codeOf(p) : undefined;
  const num = cc ? p!.slice(cc.length) : "";
  return !!cc && /^\d+$/.test(num) && (cc === "+91" ? num.length === 10 : num.length >= 7 && num.length <= 12);
};
/** Same WhatsApp number (last 10 digits), for "the two people need different numbers". */
export const samePhone = (x?: string, y?: string) => !!x && !!y && x.replace(/\D/g, "").slice(-10) === y.replace(/\D/g, "").slice(-10);

/**
 * Verify a WhatsApp number. Default: Saheli sends a 6-digit code on WhatsApp (approved "otp" template) and you type it
 * in. Other way: the person sends "KAVACH 123456" to Saheli from that phone (link or QR); that also lets Saheli greet
 * them the moment setup finishes.
 */
export function VerifyWhatsApp({ target, phone, who, verified, onVerified, saheliNumber }: { target: string; phone: string; who: string; verified: boolean; onVerified: () => void; saheliNumber?: string }) {
  const [mode, setMode] = useState<"idle" | "otp" | "message">("idle");
  const [msg, setMsg] = useState<{ text: string; link: string; saheliNumber: string } | null>(null);
  const [qr, setQr] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const self = target === "self";
  const their = self ? "your" : `${who}'s`;

  const sendOtp = async () => {
    setBusy(true);
    setError("");
    try {
      await onboardingApi.startVerify(target, phone, "otp");
      setMode("otp");
      setOtp("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const confirm = async (code: string) => {
    setBusy(true);
    setError("");
    try {
      const r = await onboardingApi.confirmVerify(target, code);
      if (r.verified) onVerified();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const startMessage = async () => {
    setBusy(true);
    setError("");
    try {
      const c = await onboardingApi.startVerify(target, phone, "message");
      setMsg({ text: c.text!, link: c.link!, saheliNumber: c.saheliNumber! });
      setQr(await QRCode.toString(c.link!, { type: "svg", margin: 1, width: 180, color: { dark: "#142a22", light: "#ffffff" } }));
      setMode("message");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    if (mode !== "message" || verified) return;
    const t = setInterval(async () => {
      try {
        const s = await onboardingApi.verifyStatus(target);
        if (s.verified) onVerified();
      } catch {
        /* keep checking */
      }
    }, 3000);
    return () => clearInterval(t);
  }, [mode, verified, target, onVerified]);

  if (verified) {
    const hi = saheliNumber ? `https://wa.me/${saheliNumber.replace(/\D/g, "")}?text=${encodeURIComponent("Namaste Saheli 🙏")}` : "";
    return (
      <div className="rounded-[20px] bg-[#e6f2ec] px-5 py-4 text-[14px] text-[var(--c-forest)]">
        <p className="flex items-center gap-3"><CheckCircle size={26} weight="fill" className="shrink-0 text-[#1f7a4d]" /><b className="font-medium">{self ? "Your" : `${who}'s`} WhatsApp is verified.</b></p>
        {!self && mode === "otp" && hi && (
          <p className="mt-2 pl-[38px] text-[13px]">WhatsApp lets Saheli start the chat only after {who} has written once. Ask {who} to send her a &ldquo;Namaste&rdquo;: <a href={hi} target="_blank" rel="noreferrer" className="font-medium underline">open the chat</a>.</p>
        )}
      </div>
    );
  }

  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const share = async () => {
    if (!msg) return;
    const text = `Tap this and press Send, so Saheli can talk to you on WhatsApp: ${msg.link}`;
    if (canShare) await navigator.share({ text }).catch(() => undefined);
    else {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    }
  };

  return (
    <div className="rounded-[20px] bg-[var(--c-card)] p-5">
      {mode === "idle" && (
        <>
          <p className="text-[14px] text-[var(--c-ink-2)]">Saheli will send a 6-digit code to {their} WhatsApp. {self ? "Type it here." : `${who} reads it out to you, or you check ${who}'s phone.`}</p>
          <button type="button" onClick={sendOtp} disabled={busy || !validPhone(phone)} className="mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-[var(--c-accent)] px-5 text-[14px] font-medium text-white disabled:opacity-40">
            {busy ? <CircleNotch size={16} className="animate-spin" /> : <WhatsappLogo size={18} weight="fill" />} Send code to {their} WhatsApp
          </button>
        </>
      )}

      {mode === "otp" && (
        <>
          <p className="text-[14px]">Code sent to <b className="font-medium">{phone}</b> on WhatsApp. It works for 10 minutes.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} aria-label="6-digit code"
              onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 6); setOtp(v); if (v.length === 6) void confirm(v); }}
              placeholder="••••••" className="c-num h-14 w-44 rounded-[16px] bg-white px-4 text-center text-[26px] tracking-[0.35em] outline-none focus:ring-2 focus:ring-[var(--c-ink)]"
            />
            <button type="button" onClick={() => confirm(otp)} disabled={busy || otp.length !== 6} className="inline-flex h-11 items-center gap-2 rounded-full bg-[var(--c-ink)] px-5 text-[14px] font-medium text-white disabled:opacity-40">
              {busy ? <CircleNotch size={16} className="animate-spin" /> : <Check size={16} weight="bold" />} Verify
            </button>
            <button type="button" onClick={sendOtp} disabled={busy} className="h-11 rounded-full px-3 text-[13px] text-[var(--c-ink-2)] hover:text-[var(--c-ink)]">Send again</button>
          </div>
        </>
      )}

      {mode === "message" && msg && (
        <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
          <div className="hidden overflow-hidden rounded-[14px] bg-white p-2 sm:block" aria-label="QR code to open WhatsApp" dangerouslySetInnerHTML={{ __html: qr }} />
          <div className="flex flex-col justify-center">
            <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-[var(--c-ink-3)]">{self ? "From your phone" : `From ${who}'s phone`}</p>
            <p className="mt-1 text-[15px]">Send <b className="rounded-md bg-white px-2 py-0.5 font-mono font-semibold tracking-wide">{msg.text}</b> to Saheli ({msg.saheliNumber}).</p>
            <p className="mt-1 text-[13px] text-[var(--c-ink-2)]">{self ? "Scan the code or tap the button on your phone." : `With ${who}? Scan the code with their phone. Not together? Send them the link; they just tap Send. Saheli can then greet ${who} as soon as you finish.`}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href={msg.link} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full bg-[var(--c-accent)] px-4 text-[13px] font-medium text-white"><WhatsappLogo size={16} weight="fill" /> Open WhatsApp</a>
              {!self && <button type="button" onClick={share} className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-[13px] font-medium">{copied ? <Check size={15} /> : canShare ? <ShareNetwork size={15} /> : <Copy size={15} />} {copied ? "Link copied" : `Send link to ${who}`}</button>}
            </div>
            <p className="mt-4 flex items-center gap-2 text-[12px] text-[var(--c-ink-2)]"><span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--c-accent)] opacity-60" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--c-accent)]" /></span> Waiting for the message…</p>
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-[13px] text-[var(--c-danger)]">{error}</p>}
      {mode !== "message" && (
        <button type="button" onClick={startMessage} disabled={busy || !validPhone(phone)} className="mt-4 block text-left text-[12.5px] text-[var(--c-ink-2)] underline-offset-4 hover:text-[var(--c-ink)] hover:underline disabled:opacity-40">
          {self ? "Other way: send a message to Saheli from your phone" : `Other way: ${who} sends a message to Saheli (Saheli can then greet ${who} right away)`}
        </button>
      )}
      {mode === "message" && (
        <button type="button" onClick={sendOtp} disabled={busy} className="mt-4 block text-[12.5px] text-[var(--c-ink-2)] underline-offset-4 hover:underline">Or send a code to {their} WhatsApp instead</button>
      )}
    </div>
  );
}

export function LanguagePicker({ value, onPick }: { value?: string; onPick: (code: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {LANGUAGES.map((l) => {
        const on = value === l.code;
        return (
          <button key={l.code} type="button" onClick={() => onPick(l.code)} aria-pressed={on}
            className={cn("rounded-[18px] px-4 py-3 text-left transition", on ? "bg-[var(--c-ink)] text-white" : "bg-[var(--c-card)] hover:bg-[var(--c-line)]")}>
            <span className="block text-[18px] leading-tight">{l.native}</span>
            <span className={cn("text-[12px]", on ? "text-white/70" : "text-[var(--c-ink-2)]")}>{l.name}</span>
          </button>
        );
      })}
    </div>
  );
}

export const dialectsFor = (lang?: string) => DIALECTS.filter((d) => d.base === lang);

export function TimeField({ label, value, onChange }: { label: string; value?: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex items-center justify-between gap-3 rounded-[16px] bg-[var(--c-card)] px-4 py-2.5">
      <span className="text-[14px]">{label}</span>
      <input id={id} type="time" value={value || ""} onChange={(e) => onChange(e.target.value)} className="h-9 rounded-full bg-white px-3 text-[14px] outline-none" />
    </label>
  );
}

const SLOTS = [
  { key: "morning", label: "Morning" },
  { key: "afternoon", label: "Afternoon" },
  { key: "evening", label: "Evening" },
  { key: "night", label: "Night" },
] as const;
const FOOD = [
  { id: "before_food", label: "Before food" },
  { id: "after_food", label: "After food" },
  { id: "with_food", label: "With food" },
  { id: "empty_stomach", label: "Empty stomach" },
] as const;

function MedCard({ m, person, onChange, onRemove }: { m: Med; person: Person; onChange: (m: Med) => void; onRemove: () => void }) {
  const at = slotTimes(person);
  const toggleSlot = (t: string) => onChange({ ...m, times: m.times.includes(t) ? m.times.filter((x) => x !== t) : [...m.times, t].sort() });
  return (
    <div className="rounded-[20px] bg-[var(--c-card)] p-4">
      <div className="flex gap-2">
        <input value={m.name} maxLength={80} onChange={(e) => onChange({ ...m, name: e.target.value })} placeholder="Medicine name (as on the strip)" className="h-11 min-w-0 flex-[2] rounded-[14px] bg-white px-4 text-[15px] font-medium outline-none" />
        <input value={m.dose || ""} maxLength={60} onChange={(e) => onChange({ ...m, dose: e.target.value })} placeholder="Dose, e.g. 500 mg" className="h-11 min-w-0 flex-1 rounded-[14px] bg-white px-4 text-[14px] outline-none" />
        <button type="button" onClick={onRemove} aria-label={`Remove ${m.name || "medicine"}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[var(--c-ink-2)] hover:text-[var(--c-danger)]"><X size={16} /></button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {SLOTS.map((s) => {
          const t = at[s.key];
          const on = m.times.includes(t);
          return (
            <button key={s.key} type="button" onClick={() => toggleSlot(t)} aria-pressed={on} className={cn("h-9 rounded-full px-3 text-[13px] transition", on ? "bg-[var(--c-ink)] text-white" : "bg-white text-[var(--c-ink-2)]")}>
              {s.label} <span className={on ? "text-white/60" : "text-[var(--c-ink-3)]"}>{t}</span>
            </button>
          );
        })}
        {m.times.filter((t) => !Object.values(at).includes(t)).map((t) => (
          <button key={t} type="button" onClick={() => toggleSlot(t)} className="h-9 rounded-full bg-[var(--c-ink)] px-3 text-[13px] text-white">{t} ✕</button>
        ))}
        <input type="time" aria-label="Another time" onChange={(e) => e.target.value && !m.times.includes(e.target.value) && onChange({ ...m, times: [...m.times, e.target.value].sort() })} className="h-9 rounded-full bg-white px-3 text-[13px] text-[var(--c-ink-2)] outline-none" />
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {FOOD.map((f) => (
          <button key={f.id} type="button" onClick={() => onChange({ ...m, food: m.food === f.id ? undefined : f.id })} aria-pressed={m.food === f.id}
            className={cn("h-8 rounded-full px-3 text-[12px] transition", m.food === f.id ? "bg-[var(--c-accent-soft)] text-[var(--c-accent-soft-ink)]" : "bg-white text-[var(--c-ink-2)]")}>{f.label}</button>
        ))}
      </div>
    </div>
  );
}

export function MedicineEditor({ person, onChange }: { person: Person; onChange: (meds: Med[]) => void }) {
  const file = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);
  const [note, setNote] = useState("");
  const meds = person.medicines;
  const scan = async (f: File) => {
    setReading(true);
    setNote("");
    try {
      const r = await onboardingApi.prescription(f);
      const at = slotTimes(person);
      // The backend guesses times from the prescription's 1-0-1 / BD notes; align them to this person's meal times.
      const align = (t: string) => ({ "08:00": at.morning, "13:00": at.afternoon, "18:00": at.evening, "21:00": at.night } as Record<string, string>)[t] || t;
      const found = r.medicines.map((m) => ({ ...m, times: [...new Set(m.times.map(align))].sort() }));
      const names = new Set(meds.map((m) => m.name.toLowerCase()));
      onChange([...meds, ...found.filter((m) => !names.has(m.name.toLowerCase()))]);
      setNote(found.length ? `Found ${found.length} medicine${found.length > 1 ? "s" : ""}. Check the times and food, then continue.` : r.note);
    } catch (e) {
      setNote((e as Error).message);
    } finally {
      setReading(false);
    }
  };
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => file.current?.click()} disabled={reading} className="inline-flex h-11 items-center gap-2 rounded-full bg-[var(--c-accent)] px-5 text-[14px] font-medium text-white disabled:opacity-60">
          {reading ? <CircleNotch size={16} className="animate-spin" /> : <Camera size={18} />} {reading ? "Reading the prescription…" : "Scan a prescription"}
        </button>
        <button type="button" onClick={() => onChange([...meds, { name: "", times: [], food: undefined }])} className="inline-flex h-11 items-center gap-2 rounded-full bg-[var(--c-card)] px-5 text-[14px] font-medium"><Plus size={16} /> Add by hand</button>
        <input ref={file} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void scan(f); e.target.value = ""; }} />
      </div>
      {note && <p className="mb-3 text-[13px] text-[var(--c-ink-2)]">{note}</p>}
      <div className="space-y-2.5">
        {meds.map((m, i) => (
          <MedCard key={i} m={m} person={person} onChange={(next) => onChange(meds.map((x, j) => (j === i ? next : x)))} onRemove={() => onChange(meds.filter((_, j) => j !== i))} />
        ))}
      </div>
    </div>
  );
}
