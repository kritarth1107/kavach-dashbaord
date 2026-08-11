"use client";

import { ArrowRight, Loader2, Mail, Shield, Smartphone, Sparkles } from "lucide-react";
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
  MOCK_PHONE_OTP,
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
type Step = "identifier" | "otp" | "register";

function MethodToggle({
  value,
  onChange,
}: {
  value: LoginMethod;
  onChange: (method: LoginMethod) => void;
}) {
  return (
    <div className="relative grid grid-cols-2 rounded-xl border border-[#e5e7eb] bg-[#f3f4f6] p-1">
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-1 w-[calc(50%-4px)] rounded-lg bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)] transition-transform duration-200 ease-out",
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
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={cn(
              "relative z-[1] flex items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] font-bold transition-colors",
              selected ? "text-primary" : "text-[#6b7280] hover:text-[#374151]",
            )}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
            {label}
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
  const phoneFromQuery = searchParams.get("phone") ?? "";

  const [step, setStep] = useState<Step>("identifier");
  const [loginMethod, setLoginMethod] = useState<LoginMethod>(
    phoneFromQuery ? "phone" : "email",
  );
  const [channel, setChannel] = useState<OtpChannel>("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("+91");
  const [otp, setOtp] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
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

  useEffect(() => {
    if (emailFromQuery && !email) {
      setEmail(emailFromQuery);
      setLoginMethod("email");
    }
  }, [emailFromQuery, email]);

  useEffect(() => {
    if (phoneFromQuery && !phone) {
      setPhone(phoneFromQuery.replace(/\D/g, ""));
      setLoginMethod("phone");
    }
  }, [phoneFromQuery, phone]);

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

    if (payload.channel === "phone" && payload.phone.length < 6) {
      setError("Enter a valid mobile number");
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
    <div className="relative flex min-h-full w-full items-center justify-center overflow-auto px-4 py-10">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(0,0,0,0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0,0,0,0.04) 1px, transparent 1px)
          `,
          backgroundSize: "32px 32px",
        }}
      />

      <div className="pointer-events-none absolute h-[420px] w-[420px] rounded-full bg-primary/15 blur-[80px]" />

      <div className="relative w-full max-w-[400px] rounded-2xl border border-[#eef0f2] bg-white px-8 py-9 shadow-[0_8px_40px_rgba(15,23,42,0.08)]">
        <div className="mb-6 flex justify-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" strokeWidth={2.25} />
            <span className="text-[17px] font-extrabold tracking-[-0.02em] text-[#111827]">
              Kavach
            </span>
          </Link>
        </div>

        <div className="mb-6 text-center">
          <h1 className="text-[22px] font-extrabold tracking-[-0.02em] text-[#111827]">
            {step === "otp" && channel === "phone" && "Check your phone"}
            {step === "otp" && channel === "email" && "Check your email"}
            {step === "register" && "Create your account"}
            {step === "identifier" && "Welcome back"}
          </h1>
          {step === "identifier" && (
            <p className="mt-1.5 text-[13px] text-[#6b7280]">
              Sign in with email or mobile — we&apos;ll send a one-time code
            </p>
          )}
          {step === "register" && (
            <p className="mt-1.5 text-[13px] text-[#6b7280]">
              Tell us your name to finish signing up
            </p>
          )}
          {step === "otp" && channel === "email" && (
            <p className="mt-1.5 text-[13px] leading-relaxed text-[#6b7280]">
              Enter the code sent to{" "}
              <span className="font-semibold text-[#111827]">{identifierLabel}</span>
              {" · "}
              <span className="text-[#9ca3af]">check spam if you don&apos;t see it</span>
            </p>
          )}
          {step === "otp" && channel === "phone" && (
            <p className="mt-1.5 text-[13px] leading-relaxed text-[#6b7280]">
              Enter the code sent to{" "}
              <span className="font-semibold text-[#111827]">
                {formatPhoneDisplay(phoneCountryCode, phone)}
              </span>
            </p>
          )}
        </div>

        {declinedInvite && step === "identifier" && (
          <p className="mb-4 rounded-xl bg-[#f0fdf4] px-3 py-2 text-center text-[12px] font-medium text-[#15803d]">
            Invitation declined. Sign in again to set up your own family.
          </p>
        )}

        {error && (
          <p className="mb-4 rounded-xl bg-[#fef2f2] px-3 py-2 text-center text-[12px] font-medium text-[#dc2626]">
            {error}
          </p>
        )}

        {step === "identifier" && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <MethodToggle value={loginMethod} onChange={switchLoginMethod} />

            {loginMethod === "email" ? (
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]"
                  strokeWidth={2}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  autoComplete="email"
                  className="w-full rounded-xl border border-[#e5e7eb] bg-[#f9fafb] py-3 pl-10 pr-4 text-[13px] font-medium text-[#111827] placeholder:text-[#9ca3af] outline-none transition-colors focus:border-primary focus:bg-white focus:ring-2 focus:ring-[var(--primary-ring)]"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <select
                    value={phoneCountryCode}
                    onChange={(e) => setPhoneCountryCode(e.target.value)}
                    className="w-[92px] shrink-0 rounded-xl border border-[#e5e7eb] bg-[#f9fafb] px-2 py-3 text-[12px] font-semibold text-[#111827] outline-none transition-colors focus:border-primary focus:bg-white focus:ring-2 focus:ring-[var(--primary-ring)]"
                  >
                    {countryCodeOptions.map(({ code, flag }) => (
                      <option key={code} value={code}>
                        {flag} {code}
                      </option>
                    ))}
                  </select>
                  <div className="relative min-w-0 flex-1">
                    <Smartphone
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]"
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
                      className="w-full rounded-xl border border-[#e5e7eb] bg-[#f9fafb] py-3 pl-10 pr-4 text-[13px] font-medium text-[#111827] placeholder:text-[#9ca3af] outline-none transition-colors focus:border-primary focus:bg-white focus:ring-2 focus:ring-[var(--primary-ring)]"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-dashed border-[#bbf7d0] bg-[#f0fdf4] px-3 py-2">
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={2.25} />
                  <p className="text-[11px] font-medium leading-snug text-[#166534]">
                    Demo mode — use code{" "}
                    <span className="font-extrabold tracking-widest">{MOCK_PHONE_OTP}</span>
                  </p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-[13px] font-bold text-white transition-colors hover:bg-[var(--primary-dark)] disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : loginMethod === "phone" ? (
                "Send code to mobile"
              ) : (
                "Continue with email"
              )}
              {!loading && <ArrowRight className="h-4 w-4" strokeWidth={2.5} />}
            </button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            {channel === "phone" && (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-[#f0fdf4] px-3 py-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" strokeWidth={2.25} />
                <p className="text-[11px] font-semibold text-[#166534]">
                  Demo code: <span className="tracking-widest">{MOCK_PHONE_OTP}</span>
                </p>
              </div>
            )}

            <OtpInput value={otp} onChange={setOtp} disabled={loading} />

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-[13px] font-bold text-white transition-colors hover:bg-[var(--primary-dark)] disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify code"}
            </button>

            <p className="text-center text-[12px] text-[#6b7280]">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={loading || resendCooldown > 0}
                className="font-semibold text-primary hover:text-[var(--primary-dark)] disabled:cursor-not-allowed disabled:text-[#9ca3af]"
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
              </button>
              <span className="mx-2 text-[#d1d5db]">·</span>
              <button
                type="button"
                onClick={resetToIdentifier}
                className="font-semibold hover:text-[#111827]"
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
              className="w-full rounded-xl border border-[#e5e7eb] bg-[#f9fafb] py-3 px-4 text-[13px] font-medium text-[#111827] placeholder:text-[#9ca3af] outline-none transition-colors focus:border-primary focus:bg-white focus:ring-2 focus:ring-[var(--primary-ring)]"
            />
            <button
              type="submit"
              disabled={loading || name.trim().length < 2}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-[13px] font-bold text-white transition-colors hover:bg-[var(--primary-dark)] disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
            </button>
          </form>
        )}

        {step === "identifier" && (
          <>
            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-[#e5e7eb]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#9ca3af]">
                Or continue with
              </span>
              <div className="h-px flex-1 bg-[#e5e7eb]" />
            </div>

            <div className="flex justify-center pb-2">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                aria-label="Continue with Google"
                title="Continue with Google"
                className={cn(
                  "relative flex h-11 w-11 items-center justify-center rounded-full border border-[#e5e7eb] bg-white transition-colors hover:border-primary hover:bg-primary-light",
                  googleLoading && "opacity-60",
                )}
              >
                {googleLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  <GoogleIcon />
                )}
              </button>
            </div>
          </>
        )}

        <p className="mt-8 text-center text-[11px] leading-relaxed text-[#9ca3af]">
          By clicking continue, you agree to our{" "}
          <Link href="#" className="underline underline-offset-2 hover:text-[#6b7280]">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="#" className="underline underline-offset-2 hover:text-[#6b7280]">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
