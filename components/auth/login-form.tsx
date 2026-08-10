"use client";

import { ArrowRight, Loader2, Mail, Shield } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { OtpInput } from "./otp-input";
import { registerWithOtp, sendOtp, verifyOtp } from "@/lib/api";

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

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-[#111827]" aria-hidden>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.04-.02-2.04-3.34.73-4.04-1.61-4.04-1.61-.54-1.38-1.33-1.75-1.33-1.75-1.09-.75.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.84 2.82 1.31 3.51 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.17 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 3-.4c1.02.01 2.05.14 3 .4 2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.24 2.87.12 3.17.77.84 1.24 1.91 1.24 3.22 0 4.61-2.8 5.63-5.48 5.92.43.37.81 1.1.81 2.22 0 1.61-.01 2.9-.01 3.29 0 .32.21.7.82.58A12.01 12.01 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-[#0A66C2]" aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.062 2.062 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-[#111827]" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const comingSoonProviders = [
  { label: "GitHub", icon: GitHubIcon },
  { label: "LinkedIn", icon: LinkedInIcon },
  { label: "X", icon: XIcon },
];

type Step = "email" | "otp" | "register";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const declinedInvite = searchParams.get("declined") === "1";
  const emailFromQuery = searchParams.get("email") ?? "";
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (emailFromQuery && !email) {
      setEmail(emailFromQuery);
    }
  }, [emailFromQuery, email]);

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setError("");
    await signIn("google", { callbackUrl: "/auth/post-login" });
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await sendOtp(email);
      if (!data?.otpToken) throw new Error("Unexpected response");
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
      const { data } = await verifyOtp(email, otp, otpToken);
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
      const { data } = await sendOtp(email);
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
      const { data } = await registerWithOtp(email, otp, name, otpToken);
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
            {step === "otp" && "Check your email"}
            {step === "register" && "Create your account"}
            {step === "email" && "Welcome back"}
          </h1>
          {step === "email" && (
            <p className="mt-1.5 text-[13px] text-[#6b7280]">
              Enter your email to sign in or register
            </p>
          )}
          {step === "register" && (
            <p className="mt-1.5 text-[13px] text-[#6b7280]">
              Tell us your name to finish signing up
            </p>
          )}
          {step === "otp" && (
            <p className="mt-1.5 text-[13px] leading-relaxed text-[#6b7280]">
              Enter the code sent to{" "}
              <span className="font-semibold text-[#111827]">{email}</span>
              {" · "}
              <span className="text-[#9ca3af]">check spam if you don&apos;t see it</span>
            </p>
          )}
        </div>

        {declinedInvite && step === "email" && (
          <p className="mb-4 rounded-xl bg-[#f0fdf4] px-3 py-2 text-center text-[12px] font-medium text-[#15803d]">
            Invitation declined. Sign in again to set up your own family.
          </p>
        )}

        {error && (
          <p className="mb-4 rounded-xl bg-[#fef2f2] px-3 py-2 text-center text-[12px] font-medium text-[#dc2626]">
            {error}
          </p>
        )}

        {step === "email" && (
          <form onSubmit={handleSendOtp} className="space-y-4">
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
                className="w-full rounded-xl border border-[#e5e7eb] bg-[#f9fafb] py-3 pl-10 pr-4 text-[13px] font-medium text-[#111827] placeholder:text-[#9ca3af] outline-none transition-colors focus:border-primary focus:bg-white focus:ring-2 focus:ring-[var(--primary-ring)]"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-[13px] font-bold text-white transition-colors hover:bg-[var(--primary-dark)] disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue with Email"}
              {!loading && <ArrowRight className="h-4 w-4" strokeWidth={2.5} />}
            </button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
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
                onClick={() => {
                  setStep("email");
                  setOtp("");
                  setOtpToken("");
                  setError("");
                  setResendCooldown(0);
                }}
                className="font-semibold hover:text-[#111827]"
              >
                Different email
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

        {step === "email" && (
          <>
            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-[#e5e7eb]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#9ca3af]">
                Or continue with
              </span>
              <div className="h-px flex-1 bg-[#e5e7eb]" />
            </div>

            <div className="flex justify-center gap-3 pb-2">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                aria-label="Continue with Google"
                title="Continue with Google"
                className={cn(
                  "relative flex h-10 w-10 items-center justify-center rounded-full border border-[#e5e7eb] bg-white transition-colors hover:border-primary hover:bg-primary-light",
                  googleLoading && "opacity-60",
                )}
              >
                {googleLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  <GoogleIcon />
                )}
              </button>

              {comingSoonProviders.map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  disabled
                  aria-label={`${label} — coming soon`}
                  title={`${label} — coming soon`}
                  className="relative flex h-10 w-10 cursor-not-allowed items-center justify-center rounded-full border border-[#e5e7eb] bg-[#fafafa] opacity-45"
                >
                  <Icon />
                  <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] font-bold uppercase tracking-wide text-[#9ca3af]">
                    Soon
                  </span>
                </button>
              ))}
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
