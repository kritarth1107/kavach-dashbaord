"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, WhatsappLogo } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { WaitlistForm } from "@/components/auth/waitlist-form";
import { lookupInvite, rememberInvite, type PublicInvite } from "@/lib/invites-api";

/**
 * The page an invite link opens (Kavach is invite-only for now). A usable link: who invited them, then start on
 * WhatsApp (Saheli's number with "hi KAVACH-<code>" typed in) or sign up on the dashboard with the invite applied.
 * A used, expired or cancelled link: why, and the waitlist form.
 */
type State = { status: "loading" } | { status: "ok"; invite: PublicInvite } | { status: "error" };

const DEAD: Record<string, { title: string; body: (who: string) => string }> = {
  used: { title: "has been used", body: (who) => `Each Kavach invite works for one family, once. Ask ${who} for a new link, or join the waitlist below.` },
  expired: { title: "has expired", body: (who) => `Invites stay open for a couple of weeks. Ask ${who} for a fresh link, or join the waitlist below.` },
  revoked: { title: "was cancelled", body: (who) => `${who === "the person who invited you" ? "The person who invited you" : who} cancelled this link. Ask them for a new one, or join the waitlist below.` },
  invalid: { title: "isn't valid", body: () => "Check that the whole link was copied, or join the waitlist below and we'll let you in soon." },
};

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

function Showcase() {
  return (
    <aside className="hidden flex-col justify-between rounded-[32px] bg-[var(--c-card)] p-8 lg:flex" aria-hidden>
      <div>
        <p className="flex items-center gap-2 text-[13px] font-medium">
          <span className="h-3.5 w-3.5 rounded-[4px] bg-[var(--c-accent)]" /> Saheli on WhatsApp
        </p>
        <div className="mt-6 space-y-3 text-[13.5px] leading-relaxed">
          <p className="ml-auto w-fit max-w-[75%] rounded-[18px] rounded-br-[6px] bg-[var(--c-solid)] px-4 py-2.5 text-[var(--c-on-solid)]">hi</p>
          <p className="w-fit max-w-[85%] rounded-[18px] rounded-bl-[6px] bg-[var(--c-frame)] px-4 py-2.5">
            Namaste, I&apos;m Saheli. Tell me who you&apos;d like me to look after, and their medicines, and I&apos;ll take it from there.
          </p>
          <p className="ml-auto w-fit max-w-[75%] rounded-[18px] rounded-br-[6px] bg-[var(--c-solid)] px-4 py-2.5 text-[var(--c-on-solid)]">My mother, in Pune. BP tablet at 8 every morning.</p>
          <p className="w-fit max-w-[85%] rounded-[18px] rounded-bl-[6px] bg-[var(--c-frame)] px-4 py-2.5">
            Done. I&apos;ll remind her at 8 and tell you once she has taken it.
          </p>
        </div>
      </div>
      <ul className="mt-10 space-y-4">
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

  function signUpHere() {
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
                  Kavach helps you look after the people you love, and yourself. Saheli, a caring companion on WhatsApp, reminds them of
                  their medicines, checks in every day in their language, and keeps you in the loop here.
                </p>

                <a
                  href={invite.whatsappLink ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-8 flex h-14 items-center justify-between gap-3 rounded-full bg-[var(--c-solid)] pl-6 pr-2 text-[15px] font-medium text-[var(--c-on-solid)] transition-opacity hover:opacity-90"
                >
                  <span className="flex items-center gap-2.5">
                    <WhatsappLogo size={22} weight="fill" /> Send hi to Saheli on WhatsApp
                  </span>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--c-frame)] text-[var(--c-ink)]">
                    <ArrowRight size={16} weight="bold" />
                  </span>
                </a>
                <p className="mt-2 px-2 text-[12px] text-[var(--c-ink-3)]">Opens WhatsApp with your invite code typed in. Just press send.</p>

                <button
                  type="button"
                  onClick={signUpHere}
                  className="mt-4 flex h-12 items-center justify-center rounded-full border border-[var(--c-line)] bg-[var(--c-frame)] text-[14px] font-medium transition-colors hover:bg-[var(--c-card)]"
                >
                  Or sign up on the dashboard
                </button>

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
        <Showcase />
      </main>
    </div>
  );
}
