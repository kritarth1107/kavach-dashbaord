/** Onboarding calls (same-origin routes that forward to the backend with the session cookie). */
import type { Answers, Med } from "./data";

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: "include", ...init });
  const json = (await res.json().catch(() => ({}))) as { data?: T; message?: string; error?: string };
  if (!res.ok) throw Object.assign(new Error(json.message || json.error || "Something went wrong. Please try again."), { status: res.status });
  return json.data as T;
}

const jsonBody = (body: unknown): RequestInit => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export type OnboardingState = {
  required: boolean;
  status: string;
  name: string;
  draft: { answers: Partial<Answers>; step: string } | null;
  verified: Record<string, { phone: string; at: string }>;
  saheliNumber: string;
};

export type SetupResult = {
  persons: Array<{ userId: string; name: string; addressAs: string; language: string; reminders: Array<{ name: string; times: string[] }>; checkins: string[]; verified: boolean; welcomeSent: boolean; welcome: "sent" | "waiting" | "not_verified" | "failed"; problems: string[] }>;
  caregiver: { name: string; phoneVerified: boolean };
};

export const onboardingApi = {
  state: () => call<OnboardingState>("/api/onboarding"),
  save: (answers: Answers, step: string) => call<{ saved: boolean }>("/api/onboarding/draft", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers, step }) }),
  skip: () => call<{ skipped: boolean }>("/api/onboarding/skip", jsonBody({})),
  startVerify: (target: string, phone: string, method: "otp" | "message" = "otp") =>
    call<{ method: "otp" | "message"; sentTo?: string; code?: string; text?: string; link?: string; saheliNumber?: string; expiresInMinutes: number }>("/api/onboarding/verify", jsonBody({ target, phone, method })),
  confirmVerify: (target: string, code: string) => call<{ verified: boolean }>("/api/onboarding/verify/confirm", jsonBody({ target, code })),
  verifyStatus: (target: string) => call<{ verified: boolean; phone?: string; expired?: boolean }>(`/api/onboarding/verify/${encodeURIComponent(target)}`),
  prescription: (file: File) => {
    const fd = new FormData();
    fd.append("file", file, file.name);
    return call<{ medicines: Med[]; note: string }>("/api/onboarding/prescription", { method: "POST", body: fd });
  },
  followups: (answers: Answers) => call<{ questions: Array<{ id: string; q: string; placeholder?: string }> }>("/api/onboarding/followups", jsonBody({ answers })),
  complete: (answers: Answers) => call<SetupResult>("/api/onboarding/complete", jsonBody({ answers })),
};
