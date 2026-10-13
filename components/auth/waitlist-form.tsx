"use client";

import { ArrowRight, Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { countryCodeOptions } from "@/components/dashboard/family/form-options";
import { joinWaitlist } from "@/lib/invites-api";
import { normalizePhoneDigits } from "@/lib/phone";
import { cn } from "@/lib/utils";

const FIELD =
  "h-12 w-full rounded-full border border-[var(--c-line)] bg-[var(--c-card)] px-5 text-[13px] font-medium text-[var(--c-ink)] outline-none transition-colors placeholder:text-[var(--c-ink-3)] focus:border-[var(--c-ink)] focus:bg-[var(--c-frame)]";

/**
 * Kavach is invite-only for now: someone without an invite leaves their details here, and the team lets them in.
 * Shown instead of an account on the sign-in page, and on the join page when a link can't be used.
 */
export function WaitlistForm({
  initial,
  reason,
  onBack,
  backLabel = "Back to sign in",
}: {
  initial?: { name?: string; email?: string; phone?: string; phoneCountryCode?: string };
  /** Why they are here ("This invite link has already been used…"). */
  reason?: string;
  onBack?: () => void;
  backLabel?: string;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(normalizePhoneDigits(initial?.phone ?? ""));
  const [phoneCountryCode, setPhoneCountryCode] = useState(initial?.phoneCountryCode || "+91");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (name.trim().length < 2) return setError("Please tell us your name");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Please enter a valid email address");
    if (phone && (phoneCountryCode === "+91" ? phone.length !== 10 : phone.length < 7 || phone.length > 12)) {
      return setError(phoneCountryCode === "+91" ? "Enter a 10-digit mobile number, or leave it empty" : "Enter a valid mobile number, or leave it empty");
    }
    setLoading(true);
    try {
      await joinWaitlist({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        ...(phone ? { phone, phoneCountryCode } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add you to the waitlist. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-[24px] bg-[var(--c-card)] p-6" role="status">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--c-solid)] text-[var(--c-on-solid)]">
          <Check className="h-5 w-5" strokeWidth={2.5} />
        </span>
        <p className="mt-4 text-[20px] font-medium tracking-[-0.02em]">You&apos;re on the waitlist</p>
        <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--c-ink-2)]">
          Thank you, {name.trim().split(/\s+/)[0]}. We&apos;ll write to <span className="font-medium text-[var(--c-ink)]">{email.trim().toLowerCase()}</span> as soon as
          your place is ready. If someone already on Kavach invites you, their link lets you in straight away.
        </p>
        {onBack && (
          <button type="button" onClick={onBack} className="mt-5 text-[12.5px] font-medium text-[var(--c-ink)] underline underline-offset-4">
            {backLabel}
          </button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3" aria-label="Join the waitlist">
      <div className="rounded-[20px] bg-[var(--c-accent-wash)] px-4 py-3 text-[13px] leading-relaxed text-[var(--c-ink-2)]">
        <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-[var(--c-accent)] align-middle" aria-hidden />
        {reason || "Kavach is invite-only for now. Leave your details and we'll let you in soon."}
      </div>
      {error && (
        <p className="rounded-[14px] bg-[var(--c-accent-soft)] px-4 py-2.5 text-center text-[12px] font-medium text-[var(--c-accent-soft-ink)]">{error}</p>
      )}
      <input className={FIELD} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" maxLength={80} required aria-label="Your name" />
      <input className={FIELD} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" autoComplete="email" maxLength={200} required aria-label="Email" />
      <div className="flex gap-2">
        <select
          value={phoneCountryCode}
          onChange={(e) => setPhoneCountryCode(e.target.value)}
          aria-label="Country code"
          className="h-12 w-[96px] shrink-0 rounded-full border border-[var(--c-line)] bg-[var(--c-card)] px-3 text-[12px] font-semibold text-[var(--c-ink)] outline-none focus:border-[var(--c-ink)] focus:bg-[var(--c-frame)]"
        >
          {countryCodeOptions.map(({ code, flag }) => (
            <option key={code} value={code}>
              {flag} {code}
            </option>
          ))}
        </select>
        <input
          className={cn(FIELD, "min-w-0 flex-1")}
          type="tel"
          inputMode="numeric"
          value={phone}
          onChange={(e) => setPhone(normalizePhoneDigits(e.target.value))}
          placeholder="WhatsApp number (optional)"
          autoComplete="tel-national"
          maxLength={15}
          aria-label="WhatsApp number (optional)"
        />
      </div>
      <input
        className={FIELD}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Who are you caring for? (optional)"
        maxLength={300}
        aria-label="Who are you caring for? (optional)"
      />
      <button
        type="submit"
        disabled={loading}
        aria-busy={loading}
        className="flex h-12 w-full items-center justify-between gap-2 rounded-full bg-[var(--c-solid)] pl-6 pr-1.5 text-[14px] font-medium text-[var(--c-on-solid)] transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        <span>{loading ? "Adding you" : "Join the waitlist"}</span>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--c-frame)] text-[var(--c-ink)]">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} /> : <ArrowRight className="h-4 w-4" strokeWidth={2.5} />}
        </span>
      </button>
      {onBack && (
        <p className="pt-1 text-center text-[12px] text-[var(--c-ink-2)]">
          Already on Kavach, or have an invite link?{" "}
          <button type="button" onClick={onBack} className="font-medium text-[var(--c-ink)] underline underline-offset-4">
            {backLabel}
          </button>
        </p>
      )}
    </form>
  );
}
