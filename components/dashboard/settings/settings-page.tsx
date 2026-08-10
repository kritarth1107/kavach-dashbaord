"use client";

import {
  Bell,
  CheckCircle2,
  ChevronRight,
  Globe,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Monitor,
  Shield,
  ShieldCheck,
  Smartphone,
  User,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getMyProfile,
  getMySessions,
  revokeOtherSessions,
  revokeSession,
  updateMyProfile,
  type UserPreferences,
  type UserProfile,
  type UserSession,
} from "@/lib/api";
import { countryCodeOptions } from "@/components/dashboard/family/form-options";
import { cn } from "@/lib/utils";

type SettingsTab = "profile" | "security" | "sessions" | "notifications";

const inputClass =
  "w-full rounded-lg border border-[#e5e7eb] bg-[#fafafa] px-3 py-2.5 text-[13px] font-medium text-[#111827] outline-none transition-colors focus:border-primary focus:bg-white focus:ring-1 focus:ring-[var(--primary-ring)]";

const settingsCardClass = "rounded-lg border border-[#eef0f2] bg-white";

const tabs: { id: SettingsTab; label: string; icon: typeof User; description: string }[] = [
  { id: "profile", label: "Profile", icon: User, description: "Name, contact & avatar" },
  { id: "security", label: "Security", icon: Shield, description: "Sign-in, password & MFA" },
  { id: "sessions", label: "Sessions", icon: Monitor, description: "Active devices & browsers" },
  { id: "notifications", label: "Notifications", icon: Bell, description: "Alerts & reminders" },
];

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#9ca3af]">
      {children}
    </label>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5">
      <h2 className="text-[16px] font-extrabold tracking-[-0.02em] text-[#111827]">{title}</h2>
      <p className="mt-1 text-[13px] leading-relaxed text-[#9ca3af]">{description}</p>
    </div>
  );
}

function StatusBadge({
  tone,
  children,
}: {
  tone: "success" | "muted" | "soon";
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        tone === "success" && "bg-primary-light text-primary",
        tone === "muted" && "bg-[#f3f4f6] text-[#6b7280]",
        tone === "soon" && "bg-[#fef9c3] text-[#a16207]",
      )}
    >
      {children}
    </span>
  );
}

function parseUserAgent(ua: string) {
  const lower = ua.toLowerCase();
  let browser = "Browser";
  if (lower.includes("chrome") && !lower.includes("edg")) browser = "Chrome";
  else if (lower.includes("firefox")) browser = "Firefox";
  else if (lower.includes("safari") && !lower.includes("chrome")) browser = "Safari";
  else if (lower.includes("edg")) browser = "Edge";

  let os = "Unknown OS";
  if (lower.includes("windows")) os = "Windows";
  else if (lower.includes("mac os") || lower.includes("macintosh")) os = "macOS";
  else if (lower.includes("iphone") || lower.includes("ipad")) os = "iOS";
  else if (lower.includes("android")) os = "Android";
  else if (lower.includes("linux")) os = "Linux";

  return { browser, os, label: `${browser} on ${os}` };
}

function formatRelativeTime(iso: string) {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatMemberSince(iso?: string) {
  if (!iso) return "Recently joined";
  return new Date(iso).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

function providerLabel(provider: string) {
  switch (provider.toUpperCase()) {
    case "GOOGLE":
      return "Google";
    case "EMAIL":
      return "Email OTP";
    case "APPLE":
      return "Apple";
    default:
      return provider;
  }
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-[#f0f0f2] bg-[#fafafa] p-4 transition-colors hover:bg-white">
      <div className="min-w-0">
        <p className="text-[13px] font-bold text-[#111827]">{title}</p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-[#9ca3af]">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-[#e5e7eb]",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-5" : "translate-x-0.5",
          )}
        />
      </button>
    </label>
  );
}

export function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>("profile");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("+91");
  const [preferences, setPreferences] = useState<UserPreferences>({
    emailAlerts: true,
    pushReminders: true,
    weeklyDigest: false,
    familyActivity: true,
    medicineReminders: true,
    checkInReminders: true,
  });

  const applyProfile = useCallback((data: UserProfile) => {
    setProfile(data);
    setFirstName(data.firstName ?? "");
    setLastName(data.lastName ?? "");
    setPhone(data.phone?.number ?? "");
    setPhoneCountryCode(data.phone?.countryCode ?? "+91");
    setPreferences(data.preferences);
  }, []);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await getMyProfile();
      if (!data) throw new Error("Failed to load profile");
      applyProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [applyProfile]);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const { data } = await getMySessions();
      setSessions(data?.sessions ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sessions");
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (tab === "sessions") void loadSessions();
  }, [tab, loadSessions]);

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(""), 3000);
    return () => clearTimeout(timer);
  }, [success]);

  const profileDirty = useMemo(() => {
    if (!profile) return false;
    return (
      firstName !== (profile.firstName ?? "") ||
      lastName !== (profile.lastName ?? "") ||
      phone !== (profile.phone?.number ?? "") ||
      phoneCountryCode !== (profile.phone?.countryCode ?? "+91")
    );
  }, [profile, firstName, lastName, phone, phoneCountryCode]);

  const prefsDirty = useMemo(() => {
    if (!profile) return false;
    return JSON.stringify(preferences) !== JSON.stringify(profile.preferences);
  }, [profile, preferences]);

  async function handleSaveProfile() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const { data } = await updateMyProfile({
        firstName,
        lastName,
        phone: phone.trim() || null,
        phoneCountryCode: phone.trim() ? phoneCountryCode : null,
      });
      if (!data) throw new Error("Failed to save profile");
      applyProfile(data);
      setSuccess("Profile saved successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  async function handleSavePreferences() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const { data } = await updateMyProfile({ preferences });
      if (!data) throw new Error("Failed to save preferences");
      applyProfile(data);
      setSuccess("Notification preferences saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  }

  async function handleRevokeSession(sessionId: string) {
    setError("");
    try {
      await revokeSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
      setSuccess("Session revoked");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke session");
    }
  }

  async function handleRevokeOthers() {
    setError("");
    try {
      await revokeOtherSessions();
      await loadSessions();
      setSuccess("All other sessions revoked");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke sessions");
    }
  }

  if (loading && !profile) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const initials =
    profile?.initials ??
    profile?.fullName
      ?.split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ??
    "?";

  return (
    <div className="w-full">
      {/* Profile header */}
      <div className={`${settingsCardClass} mb-6 p-0`}>
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            {profile?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatarUrl}
                alt=""
                className="h-16 w-16 shrink-0 rounded-lg object-cover ring-1 ring-[#eef0f2]"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-[#111827] text-xl font-extrabold text-white ring-1 ring-[#eef0f2]">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[1.35rem] font-extrabold tracking-[-0.03em] text-[#111827]">
                  {profile?.fullName ?? "Your account"}
                </h1>
                {profile?.emailVerified && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-[#f0fdf4] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                    <CheckCircle2 className="h-3 w-3" />
                    Verified
                  </span>
                )}
              </div>
              <p className="mt-1 truncate text-[13px] text-[#6b7280]">{profile?.email}</p>
              <p className="mt-1 text-[12px] text-[#9ca3af]">
                Member since {formatMemberSince(profile?.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
            <span className="rounded-lg border border-[#e5e7eb] bg-[#fafafa] px-3 py-1.5 text-[11px] font-semibold text-[#374151]">
              Kavach account
            </span>
            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#6b7280]">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Active
            </span>
          </div>
        </div>
      </div>

      {(error || success) && (
        <div
          className={cn(
            "mb-4 rounded-lg px-4 py-3 text-[13px] font-medium",
            error ? "bg-[#fef2f2] text-[#dc2626]" : "bg-primary-light text-primary",
          )}
        >
          {error || success}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
        {/* Tab nav */}
        <nav className={`${settingsCardClass} flex flex-row gap-1 overflow-x-auto p-2 lg:flex-col lg:overflow-visible`}>
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "flex min-w-[140px] flex-1 items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors lg:min-w-0 lg:flex-none",
                tab === item.id
                  ? "border-[#e5e7eb] bg-[#fafafa] text-[#111827]"
                  : "border-transparent text-[#6b7280] hover:bg-[#fafafa] hover:text-[#111827]",
              )}
            >
              <item.icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  tab === item.id ? "text-primary" : "text-[#9ca3af]",
                )}
                strokeWidth={2.25}
              />
              <div className="min-w-0">
                <p className="text-[13px] font-bold">{item.label}</p>
                <p className="hidden text-[11px] opacity-70 lg:block">{item.description}</p>
              </div>
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="min-w-0 space-y-4">
          {tab === "profile" && (
            <>
              <div className={`${settingsCardClass} p-6`}>
                <SectionHeader
                  title="Personal information"
                  description="Update how your name and contact details appear across Kavach — in family circles, care logs, and notifications."
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel>First name</FieldLabel>
                    <input
                      className={inputClass}
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Your first name"
                    />
                  </div>
                  <div>
                    <FieldLabel>Last name</FieldLabel>
                    <input
                      className={inputClass}
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Your last name"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <FieldLabel>Email address</FieldLabel>
                    <div className="flex items-center gap-2 rounded-lg border border-[#e5e7eb] bg-[#f3f4f6] px-3 py-2.5">
                      <Mail className="h-4 w-4 text-[#9ca3af]" />
                      <span className="text-[13px] font-medium text-[#6b7280]">
                        {profile?.email}
                      </span>
                      <StatusBadge tone="muted">Managed by sign-in</StatusBadge>
                    </div>
                  </div>
                  <div>
                    <FieldLabel>Country code</FieldLabel>
                    <select
                      className={inputClass}
                      value={phoneCountryCode}
                      onChange={(e) => setPhoneCountryCode(e.target.value)}
                    >
                      {countryCodeOptions.map((opt) => (
                        <option key={opt.code} value={opt.code}>
                          {opt.flag} {opt.label} ({opt.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <FieldLabel>Phone number</FieldLabel>
                    <input
                      className={inputClass}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                      placeholder="9876543210"
                      inputMode="numeric"
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    disabled={!profileDirty || saving}
                    onClick={() => void handleSaveProfile()}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-[13px] font-bold text-white transition-opacity disabled:opacity-50"
                  >
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save profile
                  </button>
                </div>
              </div>

              <div className={`${settingsCardClass} p-6`}>
                <SectionHeader
                  title="Account details"
                  description="Read-only information about your Kavach account."
                />
                <div className="divide-y divide-[#f0f0f2]">
                  {[
                    { label: "Account created", value: profile?.createdAt ? new Date(profile.createdAt).toLocaleString("en-IN") : "—" },
                    { label: "Last updated", value: profile?.updatedAt ? new Date(profile.updatedAt).toLocaleString("en-IN") : "—" },
                    { label: "Account status", value: profile?.status ?? "ACTIVE" },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between py-3">
                      <span className="text-[12px] font-semibold text-[#9ca3af]">{row.label}</span>
                      <span className="max-w-[60%] truncate text-right text-[12px] font-bold text-[#111827]">
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {tab === "security" && (
            <>
              <div className={`${settingsCardClass} p-6`}>
                <SectionHeader
                  title="Sign-in methods"
                  description="How you access Kavach. Keep at least one method active so you never lose access to your care data."
                />
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg border border-[#f0f0f2] bg-[#fafafa] p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#dbeafe]">
                        <Mail className="h-5 w-5 text-[#2563eb]" />
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-[#111827]">Email verification code</p>
                        <p className="text-[12px] text-[#9ca3af]">{profile?.email}</p>
                      </div>
                    </div>
                    <StatusBadge tone={profile?.emailVerified ? "success" : "muted"}>
                      {profile?.emailVerified ? "Active" : "Unverified"}
                    </StatusBadge>
                  </div>

                  {profile?.socialAccounts.map((account) => (
                    <div
                      key={account.provider}
                      className="flex items-center justify-between rounded-lg border border-[#f0f0f2] bg-[#fafafa] p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white">
                          <Globe className="h-5 w-5 text-[#374151]" />
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-[#111827]">
                            {providerLabel(account.provider)}
                          </p>
                          <p className="text-[12px] text-[#9ca3af]">
                            {account.email ?? account.displayName ?? "Connected account"}
                          </p>
                        </div>
                      </div>
                      <StatusBadge tone="success">Linked</StatusBadge>
                    </div>
                  ))}

                  {!profile?.socialAccounts.length && profile?.primaryAuthProvider === "EMAIL" && (
                    <div className="rounded-lg border border-dashed border-[#e5e7eb] bg-[#fafafa] p-4 text-center">
                      <p className="text-[12px] text-[#9ca3af]">
                        Link Google from the sign-in page on your next visit for faster access.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className={`${settingsCardClass} p-6`}>
                <SectionHeader
                  title="Password"
                  description="Kavach uses secure email codes and social sign-in. Password login is optional and coming soon."
                />
                <div className="rounded-lg border border-[#f0f0f2] bg-[#fafafa] p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#ede9fe]">
                      <KeyRound className="h-5 w-5 text-[#7c3aed]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[14px] font-bold text-[#111827]">Password sign-in</p>
                        <StatusBadge tone="soon">Coming soon</StatusBadge>
                      </div>
                      <p className="mt-1 text-[12px] leading-relaxed text-[#9ca3af]">
                        Set a password as a backup sign-in method. You&apos;ll still receive OTP
                        verification when signing in from a new device.
                      </p>
                      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          disabled
                          className="rounded-lg border border-[#e5e7eb] bg-white px-4 py-2.5 text-[12px] font-semibold text-[#9ca3af]"
                        >
                          Set password
                        </button>
                        <button
                          type="button"
                          disabled
                          className="rounded-lg border border-[#e5e7eb] bg-white px-4 py-2.5 text-[12px] font-semibold text-[#9ca3af]"
                        >
                          Change password
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`${settingsCardClass} p-6`}>
                <SectionHeader
                  title="Two-factor authentication (MFA)"
                  description="Add an extra layer of security beyond your sign-in method. Required for sensitive care data exports."
                />
                <div className="space-y-3">
                  <div className="rounded-lg border border-[#f0f0f2] bg-[#fafafa] p-5 opacity-90">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-light">
                          <Smartphone className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-[14px] font-bold text-[#111827]">Authenticator app</p>
                            <StatusBadge tone="soon">Coming soon</StatusBadge>
                          </div>
                          <p className="mt-1 text-[12px] leading-relaxed text-[#9ca3af]">
                            Use Google Authenticator, Authy, or 1Password to generate one-time codes
                            at sign-in.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled
                        className="relative h-6 w-11 shrink-0 rounded-full bg-[#e5e7eb]"
                        aria-label="Enable authenticator app"
                      >
                        <span className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm" />
                      </button>
                    </div>
                  </div>

                  <div className="rounded-lg border border-[#f0f0f2] bg-[#fafafa] p-5 opacity-90">
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#fee2e2]">
                        <ShieldCheck className="h-5 w-5 text-[#dc2626]" />
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[14px] font-bold text-[#111827]">Recovery codes</p>
                          <StatusBadge tone="muted">Not set up</StatusBadge>
                        </div>
                        <p className="mt-1 text-[12px] leading-relaxed text-[#9ca3af]">
                          Generate 10 single-use backup codes to access your account if you lose
                          your authenticator device.
                        </p>
                        <button
                          type="button"
                          disabled
                          className="mt-3 rounded-lg border border-[#e5e7eb] bg-white px-4 py-2 text-[12px] font-semibold text-[#9ca3af]"
                        >
                          Generate recovery codes
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`${settingsCardClass} p-6`}>
                <SectionHeader
                  title="Security recommendations"
                  description="Best practices to keep your care account safe."
                />
                <ul className="space-y-3">
                  {[
                    "Sign out on shared or public devices after each session.",
                    "Review active sessions regularly and revoke anything unfamiliar.",
                    "Keep your email inbox secure — it's used for sign-in verification codes.",
                    "Enable MFA when available to protect health records and family data.",
                  ].map((tip) => (
                    <li
                      key={tip}
                      className="flex items-start gap-3 rounded-lg bg-[#fafafa] px-4 py-3 text-[12px] leading-relaxed text-[#374151]"
                    >
                      <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2.25} />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {tab === "sessions" && (
            <div className={`${settingsCardClass} p-6`}>
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <SectionHeader
                    title="Active sessions"
                    description="Devices and browsers where you're currently signed in. Revoke any session you don't recognize."
                  />
                </div>
                {sessions.some((s) => !s.isCurrent) && (
                  <button
                    type="button"
                    onClick={() => void handleRevokeOthers()}
                    className="rounded-lg border border-[#fecaca] bg-[#fef2f2] px-4 py-2 text-[12px] font-bold text-[#dc2626] transition-colors hover:bg-[#fee2e2]"
                  >
                    Sign out all other devices
                  </button>
                )}
              </div>

              {sessionsLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : sessions.length === 0 ? (
                <p className="py-8 text-center text-[13px] text-[#9ca3af]">No active sessions found.</p>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session) => {
                    const device = parseUserAgent(session.userAgent);
                    return (
                      <div
                        key={session.sessionId}
                        className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-[#f0f0f2] bg-[#fafafa] p-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white">
                            <Monitor className="h-5 w-5 text-[#374151]" />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-[13px] font-bold text-[#111827]">{device.label}</p>
                              {session.isCurrent && (
                                <StatusBadge tone="success">This device</StatusBadge>
                              )}
                            </div>
                            <p className="text-[11px] text-[#9ca3af]">
                              {providerLabel(session.authProvider)} · Last active{" "}
                              {formatRelativeTime(session.lastActiveAt)}
                              {session.ipAddress ? ` · ${session.ipAddress}` : ""}
                            </p>
                          </div>
                        </div>
                        {!session.isCurrent && (
                          <button
                            type="button"
                            onClick={() => void handleRevokeSession(session.sessionId)}
                            className="text-[12px] font-semibold text-[#dc2626] hover:underline"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === "notifications" && (
            <>
              <div className={`${settingsCardClass} p-6`}>
                <SectionHeader
                  title="Care alerts"
                  description="Choose how Kavach keeps you and your family informed about health activity."
                />
                <div className="space-y-3">
                  <ToggleRow
                    title="Email alerts"
                    description="Important updates about check-ins, vitals, and family activity sent to your inbox."
                    checked={preferences.emailAlerts}
                    onChange={(v) => setPreferences((p) => ({ ...p, emailAlerts: v }))}
                  />
                  <ToggleRow
                    title="Family activity"
                    description="When a caregiver logs medicine, vitals, or notes for your care circle."
                    checked={preferences.familyActivity}
                    onChange={(v) => setPreferences((p) => ({ ...p, familyActivity: v }))}
                  />
                  <ToggleRow
                    title="Weekly digest"
                    description="A Sunday summary of adherence, check-ins, and upcoming appointments."
                    checked={preferences.weeklyDigest}
                    onChange={(v) => setPreferences((p) => ({ ...p, weeklyDigest: v }))}
                  />
                </div>
              </div>

              <div className={`${settingsCardClass} p-6`}>
                <SectionHeader
                  title="Reminders"
                  description="Stay on track with medicines, check-ins, and daily wellness routines."
                />
                <div className="space-y-3">
                  <ToggleRow
                    title="Push reminders"
                    description="Mobile and browser notifications for time-sensitive care tasks."
                    checked={preferences.pushReminders}
                    onChange={(v) => setPreferences((p) => ({ ...p, pushReminders: v }))}
                  />
                  <ToggleRow
                    title="Medicine reminders"
                    description="Alerts before each scheduled dose — morning, afternoon, and evening."
                    checked={preferences.medicineReminders}
                    onChange={(v) => setPreferences((p) => ({ ...p, medicineReminders: v }))}
                  />
                  <ToggleRow
                    title="Check-in reminders"
                    description="Daily Saheli wellness check-in prompts at your preferred time."
                    checked={preferences.checkInReminders}
                    onChange={(v) => setPreferences((p) => ({ ...p, checkInReminders: v }))}
                  />
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    disabled={!prefsDirty || saving}
                    onClick={() => void handleSavePreferences()}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-[13px] font-bold text-white transition-opacity disabled:opacity-50"
                  >
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save preferences
                  </button>
                </div>
              </div>

              <div className={`${settingsCardClass} p-6`}>
                <SectionHeader
                  title="Privacy & data"
                  description="Control how your health information is stored and shared."
                />
                <div className="space-y-3">
                  {[
                    {
                      title: "Export my data",
                      description: "Download a copy of your health records, logs, and account data.",
                      action: "Coming soon",
                    },
                    {
                      title: "Care data sharing",
                      description: "Manage which family members can view your vitals and reports.",
                      action: "Family settings",
                    },
                    {
                      title: "Delete account",
                      description: "Permanently remove your account and all associated care data.",
                      action: "Contact support",
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="flex items-center justify-between gap-4 rounded-lg border border-[#f0f0f2] bg-[#fafafa] p-4"
                    >
                      <div>
                        <p className="text-[13px] font-bold text-[#111827]">{item.title}</p>
                        <p className="mt-0.5 text-[12px] text-[#9ca3af]">{item.description}</p>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-[#9ca3af]">
                        {item.action}
                        <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
