"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, WhatsappLogo } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { WaitlistForm } from "@/components/auth/waitlist-form";
import { lookupInvite, rememberInvite, type PublicInvite } from "@/lib/invites-api";
import { cn } from "@/lib/utils";

/**
 * The page an invite link opens (Kavach is invite-only for now). Web first, then WhatsApp (founder 2026-10-13: "invite
 * onboarding should not start with whatsapp. people can only access saheli via whatsapp when they have completed the
 * onboarding via web"): a usable link shows who invited them and one action, "Accept invite and sign up", which carries
 * the invite into sign-up; the steps are create your account, set up with Saheli here, then say hi to her on WhatsApp
 * (that button comes at the end of the setup). A used, expired or cancelled link: why, and the waitlist form.
 */
type State = { status: "loading" } | { status: "ok"; invite: PublicInvite } | { status: "error" };

const DEAD: Record<string, { title: string; body: (who: string) => string }> = {
  used: { title: "has been used", body: (who) => `Each Kavach invite works for one family, once. Ask ${who} for a new link, or join the waitlist below.` },
  expired: { title: "has expired", body: (who) => `Invites stay open for a couple of weeks. Ask ${who} for a fresh link, or join the waitlist below.` },
  revoked: { title: "was cancelled", body: (who) => `${who === "the person who invited you" ? "The person who invited you" : who} cancelled this link. Ask them for a new one, or join the waitlist below.` },
  invalid: { title: "isn't valid", body: () => "Check that the whole link was copied, or join the waitlist below and we'll let you in soon." },
};

const STEPS = [
  { title: "Create your account", body: "With your email or your mobile number." },
  { title: "Set up with Saheli here", body: "A short chat, one question at a time.", tags: ["Who you care for", "Their medicines", "Their language"] },
  { title: "Say hi to Saheli on WhatsApp", body: "When setup is done, one tap opens WhatsApp. She greets you there and takes it from there." },
];

const POINTS = [
  { title: "Medicine reminders that get answered", body: "On WhatsApp, on time, in the language your family speaks." },
  { title: "A warm check-in every day", body: "And a quiet word to you if something seems off." },
  { title: "Orders and rides, always asked first", body: "Medicines, groceries or a cab, confirmed before anything is placed." },
];

function Logo() {
  return (
    <Link href="/" className="inline-flex" aria-label="Kavach CareOS">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/kavach-careos-logo.png" alt="Kavach CareOS" className="h-10 w-auto dark:hidden" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/kavach-careos-logo-dark.png" alt="" aria-hidden className="hidden h-10 w-auto dark:block" />
    </Link>
  );
}

/** The three steps: account, setup with Saheli on the web, then hi on WhatsApp (the last one in marigold). */
function Steps({ compact = false }: { compact?: boolean }) {
  return (
    <ol className={cn(compact ? "mt-4" : "mt-8")}>
      {STEPS.map((s, i) => {
        const last = i === STEPS.length - 1;
        return (
          <li key={s.title} className={cn("relative flex gap-4", !last && (compact ? "pb-5" : "pb-7"))}>
            {!last && <span aria-hidden className="absolute bottom-0 left-[17px] top-10 w-px bg-[var(--c-line)]" />}
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[14px] font-semibold",
                last ? "bg-[var(--c-accent)] text-[var(--c-accent-ink)]" : "bg-[var(--c-solid)] text-[var(--c-on-solid)]",
              )}
            >
              {i + 1}
            </span>
            <span className="min-w-0 pt-1.5">
              <span className="block text-[15px] font-medium leading-snug">{s.title}</span>
              <span className="mt-1 block text-[13px] leading-relaxed text-[var(--c-ink-2)]">{s.body}</span>
              {s.tags && (
                <span className="mt-2.5 flex flex-wrap gap-1.5">
                  {s.tags.map((t) => (
                    <span key={t} className={cn("rounded-full px-2.5 py-1 text-[12px] text-[var(--c-ink)]", compact ? "bg-[var(--c-card)]" : "bg-[var(--c-frame)]")}>
                      {t}
                    </span>
                  ))}
                </span>
              )}
              {last && (
                <span className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className={cn("inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-[var(--c-line)] px-3 py-1.5 text-[12px] font-medium", compact ? "bg-[var(--c-card)]" : "bg-[var(--c-frame)]")}>
                    <WhatsappLogo size={15} weight="fill" className="text-[var(--c-solid)]" /> Send hi to Saheli
                  </span>
                  <span className="text-[12px] text-[var(--c-ink-3)]">at the end of setup</span>
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function HowItWorks() {
  return (
    <aside className="hidden flex-col justify-between rounded-[32px] bg-[var(--c-card)] p-8 lg:flex" aria-label="How it works">
      <div>
        <p className="flex items-center gap-2 text-[13px] font-medium">
          <span className="h-3.5 w-3.5 rounded-[4px] bg-[var(--c-accent)]" /> How it works
        </p>
        <h2 className="mt-5 text-[26px] leading-[1.12] tracking-[-0.025em]">
          <span className="block font-light text-[var(--c-ink-3)]">Set up here in a few minutes,</span>
          <span className="block font-medium">then meet Saheli on WhatsApp.</span>
        </h2>
        <Steps />
      </div>
      <ul className="mt-10 space-y-4 border-t border-[var(--c-line)] pt-6">
        {POINTS.map((p) => (
          <li key={p.title} className="flex gap-3">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-[2px] bg-[var(--c-accent)]" />
            <span>
              <span className="block text-[14px] font-medium">{p.title}</span>
              <span className="block text-[12.5px] text-[var(--c-ink-2)]">{p.body}</span>
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export default function JoinPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let off = false;
    lookupInvite(token)
      .then((invite) => !off && setState({ status: "ok", invite }))
      .catch(() => !off && setState({ status: "error" }));
    return () => {
      off = true;
    };
  }, [token]);

  function acceptAndSignUp() {
    rememberInvite(token);
    router.push(`/auth/login?invite=${encodeURIComponent(token)}`);
  }

  const invite = state.status === "ok" ? state.invite : null;
  const live = invite?.state === "active";
  const fromTeam = invite?.kind === "waitlist";
  const first = invite?.inviterName?.split(/\s+/)[0] || "";
  const who = fromTeam ? "the Kavach team" : first || "the person who invited you";
  const until = invite?.expiresAt
    ? new Date(invite.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", timeZone: "Asia/Kolkata" })
    : null;
  const dead = invite && !live ? DEAD[invite.state] ?? DEAD.invalid : state.status === "error" ? DEAD.invalid : null;

  return (
    <div className="care-os min-h-dvh overflow-y-auto">
      <main className="mx-auto grid min-h-dvh w-full max-w-[1120px] gap-8 px-5 py-6 sm:px-10 lg:grid-cols-[1fr_440px] lg:py-10">
        <div className="flex flex-col">
          <Logo />
          <div className="flex max-w-[480px] flex-1 flex-col justify-center py-10">
            {state.status === "loading" && (
              <div className="space-y-4" aria-busy="true">
                <div className="h-4 w-32 animate-pulse rounded-full bg-[var(--c-card)]" />
                <div className="h-24 animate-pulse rounded-[22px] bg-[var(--c-card)]" />
                <div className="h-14 animate-pulse rounded-full bg-[var(--c-card)]" />
              </div>
            )}

            {live && invite && (
              <>
                <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--c-accent-text)]">
                  {fromTeam ? "Your place is ready" : "A personal invite"}
                </p>
                <h1 className="mt-3 text-[42px] leading-[1.02] tracking-[-0.035em] sm:text-[52px]">
                  <span className="block font-light text-[var(--c-ink-3)]">{fromTeam ? "You're off the" : first ? `${first} invited you` : "You're invited"}</span>
                  <span className="block font-medium">{fromTeam ? "waitlist" : "to Kavach"}</span>
                </h1>
                <p className="mt-4 text-[15px] leading-relaxed text-[var(--c-ink-2)]">
                  Kavach helps you look after the people you love, and yourself. Sign up and set things up here with Saheli in a few
                  minutes. Then she&apos;s with you on WhatsApp: medicine reminders, a check-in every day in your family&apos;s language,
                  and you in the loop.
                </p>

                <button
                  type="button"
                  onClick={acceptAndSignUp}
                  className="mt-8 flex h-14 w-full items-center justify-between gap-3 rounded-full bg-[var(--c-solid)] pl-6 pr-2 text-[15px] font-medium text-[var(--c-on-solid)] transition-opacity hover:opacity-90"
                >
                  Accept invite and sign up
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--c-frame)] text-[var(--c-ink)]">
                    <ArrowRight size={16} weight="bold" />
                  </span>
                </button>
                <p className="mt-2 px-2 text-[12px] text-[var(--c-ink-3)]">Your invite is applied when you sign up. Setup takes a few minutes.</p>

                <div className="mt-8 rounded-[24px] bg-[var(--c-frame)] p-5 ring-1 ring-[var(--c-line)] lg:hidden">
                  <p className="flex items-center gap-2 text-[13px] font-medium">
                    <span className="h-3 w-3 rounded-[3px] bg-[var(--c-accent)]" /> How it works
                  </p>
                  <Steps compact />
                </div>

                <p className="mt-6 text-[12.5px] leading-relaxed text-[var(--c-ink-2)]">
                  This invite works once{until ? ` and is open until ${until}` : ""}. Already on Kavach?{" "}
                  <Link href="/auth/login" className="font-medium text-[var(--c-ink)] underline underline-offset-4">
                    Sign in
                  </Link>
                </p>
              </>
            )}

            {dead && (
              <>
                <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--c-accent-text)]">Invite link</p>
                <h1 className="mt-3 text-[42px] leading-[1.02] tracking-[-0.035em] sm:text-[52px]">
                  <span className="block font-light text-[var(--c-ink-3)]">This invite</span>
                  <span className="block font-medium">{dead.title}</span>
                </h1>
                <p className="mb-6 mt-4 text-[15px] leading-relaxed text-[var(--c-ink-2)]">{dead.body(who)}</p>
                <WaitlistForm reason="Kavach is invite-only for now. Leave your details and we'll let you in soon." />
                <p className="mt-6 text-[12.5px] text-[var(--c-ink-2)]">
                  Already on Kavach?{" "}
                  <Link href="/auth/login" className="font-medium text-[var(--c-ink)] underline underline-offset-4">
                    Sign in
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
        <HowItWorks />
      </main>
    </div>
  );
}
