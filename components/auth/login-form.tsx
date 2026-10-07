"use client";

import { ArrowRight, Loader2, Mail, Smartphone } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { countryCodeOptions } from "@/components/dashboard/family/form-options";
import {
  registerWithOtp,
  sendOtp,
  verifyOtp,
  type OtpChannel,
  type OtpIdentifier,
} from "@/lib/api";
import {
  formatPhoneDisplay,
  maskPhoneNumber,
  normalizePhoneDigits,
} from "@/lib/phone";
import { cn } from "@/lib/utils";
import { OtpInput } from "./otp-input";

function routeAfterLogin() {
  return "/auth/post-login";
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

type LoginMethod = OtpChannel;

/** Mobile sign-in: the code comes on WhatsApp (no SMS). */
const PHONE_LOGIN_ENABLED = true;

const LOGIN_ERRORS: Record<string, string> = {
  care_recipient:
    "This account belongs to someone Kavach cares for. Saheli talks to them on WhatsApp; only caregivers can sign in here.",
};

function SubmitButton({
  loading,
  disabled,
  label,
  loadingLabel,
}: {
  loading: boolean;
  disabled?: boolean;
  label: string;
  loadingLabel: string;
}) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      aria-busy={loading}
      className={cn(
        "flex h-12 w-full items-center justify-between gap-2 rounded-full bg-[var(--c-ink)] pl-6 pr-1.5 text-[14px] font-medium text-white transition-opacity hover:opacity-90",
        loading ? "cursor-wait" : "disabled:opacity-50",
      )}
    >
      <span>{loading ? loadingLabel : label}</span>
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[var(--c-ink)]">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
        ) : (
          <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
        )}
      </span>
    </button>
  );
}
type Step = "identifier" | "otp" | "register";

function MethodToggle({
  value,
  onChange,
}: {
  value: LoginMethod;
  onChange: (method: LoginMethod) => void;
}) {
  return (
    <div className="relative grid grid-cols-2 rounded-full bg-[var(--c-card)] p-1">
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-1 w-[calc(50%-4px)] rounded-full bg-[var(--c-ink)] transition-transform duration-200 ease-out",
          value === "phone" ? "translate-x-[calc(100%+4px)]" : "translate-x-1",
        )}
      />
      {(
        [
          { id: "email" as const, label: "Email", icon: Mail },
          { id: "phone" as const, label: "Mobile", icon: Smartphone },
        ] as const
      ).map(({ id, label, icon: Icon }) => {
        const selected = value === id;
        const off = id === "phone" && !PHONE_LOGIN_ENABLED;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            disabled={off}
            title={off ? "Mobile sign-in is coming soon" : undefined}
            className={cn(
              "relative z-[1] flex h-10 items-center justify-center gap-1.5 rounded-full text-[13px] font-medium transition-colors",
              selected ? "text-white" : "text-[var(--c-ink-2)] hover:text-[var(--c-ink)]",
              off && "cursor-not-allowed text-[var(--c-ink-3)] hover:text-[var(--c-ink-3)]",
            )}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
            {label}
            {off && (
              <span className="rounded-full bg-[var(--c-frame)] px-2 py-0.5 text-[10px] font-medium text-[var(--c-ink-3)]">
                Soon
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const declinedInvite = searchParams.get("declined") === "1";
  const emailFromQuery = searchParams.get("email") ?? "";
  const phoneFromQuery = PHONE_LOGIN_ENABLED ? (searchParams.get("phone") ?? "") : "";
  const queryError = LOGIN_ERRORS[searchParams.get("error") ?? ""] ?? "";

  const [step, setStep] = useState<Step>("identifier");
  const [loginMethod, setLoginMethod] = useState<LoginMethod>(
    phoneFromQuery ? "phone" : "email",
  );
  const [channel, setChannel] = useState<OtpChannel>("email");
  const [email, setEmail] = useState(emailFromQuery);
  const [phone, setPhone] = useState(phoneFromQuery.replace(/\D/g, ""));
  const [phoneCountryCode, setPhoneCountryCode] = useState("+91");
  const [otp, setOtp] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState(queryError);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const identifier = useMemo<OtpIdentifier>(() => {
    if (channel === "phone") {
      return {
        channel: "phone",
        phone: normalizePhoneDigits(phone),
        phoneCountryCode,
      };
    }
    return { channel: "email", email: email.trim().toLowerCase() };
  }, [channel, email, phone, phoneCountryCode]);

  const identifierLabel = useMemo(() => {
    if (channel === "phone") {
      return maskPhoneNumber(phoneCountryCode, phone);
    }
    return email.trim().toLowerCase();
  }, [channel, email, phone, phoneCountryCode]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  function switchLoginMethod(method: LoginMethod) {
    setLoginMethod(method);
    setError("");
  }

  function resetToIdentifier() {
    setStep("identifier");
    setOtp("");
    setOtpToken("");
    setError("");
    setResendCooldown(0);
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setError("");
    await signIn("google", { callbackUrl: "/auth/post-login" });
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const payload: OtpIdentifier =
      loginMethod === "phone"
        ? {
            channel: "phone",
            phone: normalizePhoneDigits(phone),
            phoneCountryCode,
          }
        : { channel: "email", email: email.trim().toLowerCase() };

    if (payload.channel === "phone" && (phoneCountryCode === "+91" ? payload.phone.length !== 10 : payload.phone.length < 7 || payload.phone.length > 12)) {
      setError(phoneCountryCode === "+91" ? "Enter your 10-digit mobile number" : "Enter a valid mobile number");
      setLoading(false);
      return;
    }

    try {
      const { data } = await sendOtp(payload);
      if (!data?.otpToken) throw new Error("Unexpected response");
      setChannel(data.channel ?? payload.channel);
      setOtpToken(data.otpToken);
      setOtp("");
      setStep("otp");
      setResendCooldown(30);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send code");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await verifyOtp(identifier, otp, otpToken);
      if (!data) throw new Error("Unexpected response");

      if (data.registered) {
        router.push(routeAfterLogin());
        return;
      }

      setStep("register");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    if (resendCooldown > 0 || loading) return;
    setLoading(true);
    setError("");
    try {
      const { data } = await sendOtp(identifier);
      if (!data?.otpToken) throw new Error("Unexpected response");
      setOtpToken(data.otpToken);
      setOtp("");
      setResendCooldown(30);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend code");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await registerWithOtp(identifier, otp, name, otpToken);
      if (!data?.user) throw new Error("Registration failed");

      router.push(routeAfterLogin());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full">
      <div className="flex w-full flex-col bg-[var(--c-frame)] px-6 py-8 sm:px-12 lg:w-[46%] lg:px-16">
        <div className="mx-auto w-full max-w-[400px]">
          <Link href="/" className="inline-flex" aria-label="Kavach CareOS">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/kavach-careos-logo.png" alt="Kavach CareOS" className="h-11 w-auto" />
          </Link>
        </div>
        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">
        <div className="mb-8">
          <h1 className="text-[44px] leading-[1.02] tracking-[-0.035em]">
            <span className="block font-light text-[var(--c-ink-3)]">
              {step === "identifier" ? "Welcome to" : step === "register" ? "Almost" : "Check your"}
            </span>
            <span className="block font-medium">
              {step === "identifier" ? "Kavach" : step === "register" ? "there" : channel === "phone" ? "WhatsApp" : "email"}
            </span>
          </h1>
          {step === "identifier" && (
            <p className="mt-3 text-[13px] text-[var(--c-ink-2)]">
              {loginMethod === "phone"
                ? "Sign in with your mobile number. We'll send a one-time code on WhatsApp."
                : "Sign in with your email. We'll send a one-time code."}
            </p>
          )}
          {step === "register" && (
            <p className="mt-1.5 text-[13px] text-[var(--text-secondary)]">
              Tell us your name to finish signing up
            </p>
          )}
          {step === "otp" && channel === "email" && (
            <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--text-secondary)]">
              Enter the code sent to{" "}
              <span className="font-semibold text-[var(--text-primary)]">{identifierLabel}</span>
              {" · "}
              <span className="text-[var(--text-tertiary)]">check spam if you don&apos;t see it</span>
            </p>
          )}
          {step === "otp" && channel === "phone" && (
            <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--text-secondary)]">
              Enter the code we sent on WhatsApp to{" "}
              <span className="font-semibold text-[var(--text-primary)]">
                {formatPhoneDisplay(phoneCountryCode, phone)}
              </span>
              {" · "}
              <span className="text-[var(--text-tertiary)]">from Kavach, with a Copy code button</span>
            </p>
          )}
        </div>

        {declinedInvite && step === "identifier" && (
          <p className="mb-4 rounded-full bg-[var(--c-accent-soft)] px-4 py-2 text-center text-[12px] font-medium text-primary">
            Invitation declined. Sign in again to set up your own family.
          </p>
        )}

        {error && (
          <p className="mb-4 rounded-[14px] bg-[var(--c-accent-soft)] px-4 py-2.5 text-center text-[12px] font-medium text-[var(--c-accent-soft-ink)]">
            {error}
          </p>
        )}

        {step === "identifier" && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <MethodToggle value={loginMethod} onChange={switchLoginMethod} />

            {loginMethod === "email" ? (
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]"
                  strokeWidth={2}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  autoComplete="email"
                  className="w-full rounded-full border border-[var(--c-line)] bg-[var(--c-card)] h-12 pl-11 pr-4 text-[13px] font-medium text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none transition-colors focus:border-[var(--c-ink)] focus:bg-[var(--c-frame)]"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <select
                    value={phoneCountryCode}
                    onChange={(e) => setPhoneCountryCode(e.target.value)}
                    className="h-12 w-[96px] shrink-0 rounded-full border border-[var(--c-line)] bg-[var(--c-card)] px-3 text-[12px] font-semibold text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--c-ink)] focus:bg-[var(--c-frame)]"
                  >
                    {countryCodeOptions.map(({ code, flag }) => (
                      <option key={code} value={code}>
                        {flag} {code}
                      </option>
                    ))}
                  </select>
                  <div className="relative min-w-0 flex-1">
                    <Smartphone
                      className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]"
                      strokeWidth={2}
                    />
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={phone}
                      onChange={(e) => setPhone(normalizePhoneDigits(e.target.value))}
                      placeholder="Mobile number"
                      required
                      autoComplete="tel-national"
                      maxLength={15}
                      className="w-full rounded-full border border-[var(--c-line)] bg-[var(--c-card)] h-12 pl-11 pr-4 text-[13px] font-medium text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none transition-colors focus:border-[var(--c-ink)] focus:bg-[var(--c-frame)]"
                    />
                  </div>
                </div>
              </div>
            )}

            <SubmitButton
              loading={loading}
              label={loginMethod === "phone" ? "Send code on WhatsApp" : "Continue with email"}
              loadingLabel="Signing in"
            />
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <OtpInput value={otp} onChange={setOtp} disabled={loading} />

            <SubmitButton loading={loading} disabled={otp.length !== 6} label="Verify code" loadingLabel="Verifying" />

            <p className="text-center text-[12px] text-[var(--text-secondary)]">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={loading || resendCooldown > 0}
                className="font-semibold text-primary hover:text-[var(--primary-dark)] disabled:cursor-not-allowed disabled:text-[var(--text-tertiary)]"
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
              </button>
              <span className="mx-2 text-[var(--text-tertiary)]">·</span>
              <button
                type="button"
                onClick={resetToIdentifier}
                className="font-semibold hover:text-[var(--text-primary)]"
              >
                {channel === "phone" ? "Different number" : "Different email"}
              </button>
            </p>
          </form>
        )}

        {step === "register" && (
          <form onSubmit={handleRegister} className="space-y-4">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              required
              minLength={2}
              className="w-full rounded-full border border-[var(--c-line)] bg-[var(--c-card)] h-12 px-5 text-[13px] font-medium text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none transition-colors focus:border-[var(--c-ink)] focus:bg-[var(--c-frame)]"
            />
            <SubmitButton
              loading={loading}
              disabled={name.trim().length < 2}
              label="Create account"
              loadingLabel="Creating account"
            />
          </form>
        )}

        {step === "identifier" && (
          <>
            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-[var(--chart-track)]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                Or continue with
              </span>
              <div className="h-px flex-1 bg-[var(--chart-track)]" />
            </div>

            <div className="pb-2">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                aria-label="Continue with Google"
                title="Continue with Google"
                className={cn(
                  "relative flex h-12 w-full items-center justify-center gap-2 rounded-full border border-[var(--c-line)] bg-[var(--c-frame)] text-[13px] font-medium transition-colors hover:bg-[var(--c-card)]",
                  googleLoading && "opacity-60",
                )}
              >
                {googleLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  <>
                    <GoogleIcon /> Continue with Google
                  </>
                )}
              </button>
            </div>
          </>
        )}

        <p className="mt-8 text-[11px] leading-relaxed text-[var(--c-ink-3)]">
          By continuing you agree to our{" "}
          <Link href="#" className="underline underline-offset-2 hover:text-[var(--c-ink-2)]">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="#" className="underline underline-offset-2 hover:text-[var(--c-ink-2)]">
            Privacy Policy
          </Link>
          .
        </p>
        </div>
      </div>
      <LoginShowcase />
    </div>
  );
}

const BARS = [70, 100, 100, 72, 100, 100, 48, 100, 100, 100, 74, 100, 100, 90];

function LoginShowcase() {
  return (
    <aside className="hidden flex-1 flex-col justify-between bg-[var(--c-card)] p-12 lg:flex" aria-hidden>
      <div className="flex items-start justify-between">
        <h2 className="text-[52px] leading-[1.02] tracking-[-0.035em]">
          <span className="block font-light text-[var(--c-ink-3)]">Care for</span>
          <span className="block font-medium">your parents</span>
        </h2>
        <span className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-[var(--c-accent)] text-white"><svg viewBox="0 0 24 24" className="h-8 w-8"><path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg></span>
      </div>
      <div className="grid grid-cols-[1fr_1.6fr] gap-4">
        <div className="rounded-[24px] bg-[var(--c-frame)] p-5">
          <p className="flex items-center gap-2 text-[13px] font-medium">
            <span className="h-3.5 w-3.5 rounded-[4px] bg-[var(--c-accent)]" /> Medicines
          </p>
          <p className="c-num mt-6 text-[52px] leading-none">
            3<span className="text-[var(--c-ink-3)]">/4</span>
          </p>
          <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.06em]">Doses taken today</p>
          <div className="mt-6 space-y-2 text-[12px]">
            {["BP tablet · 08:00", "Vitamin D3 · 10:00", "Folvite · 13:00"].map((t) => (
              <p key={t} className="flex items-center gap-2">
                <span className="flex h-4 w-4 items-center justify-center rounded-[5px] bg-[var(--c-ink)] text-[9px] text-white">✓</span>
                {t}
              </p>
            ))}
          </div>
        </div>
        <div className="rounded-[24px] bg-[var(--c-frame)] p-5">
          <p className="flex items-center gap-2 text-[13px] font-medium">
            <span className="h-3.5 w-3.5 rounded-[4px] bg-[var(--c-accent)]" /> Care trends
          </p>
          <div className="mt-6 flex h-[150px] items-end gap-[6px]">
            {BARS.map((v, i) => (
              <span key={i} className={i === BARS.length - 1 ? "flex-1 rounded-full bg-[var(--c-accent)]" : "flex-1 rounded-full bg-[var(--c-ink)]"} style={{ height: `${v}%` }} />
            ))}
          </div>
          <p className="mt-4 text-[12px] text-[var(--c-ink-2)]">14 days of doses, reminded on WhatsApp</p>
        </div>
      </div>
      <div className="flex items-end justify-between gap-6">
        <p className="max-w-sm text-[19px] font-medium leading-snug tracking-[-0.02em]">
          Saheli talks to them on WhatsApp, remembers every medicine, and tells you only what matters.
        </p>
        <span className="rounded-full bg-[var(--c-frame)] px-4 py-2 text-[12px] text-[var(--c-ink-2)]">Kavach CareOS</span>
      </div>
    </aside>
  );
}
