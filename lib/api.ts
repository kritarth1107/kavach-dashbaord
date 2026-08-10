import type {
  FamilyMembersPayload,
  FamilySummary,
  FamilySwitcherPayload,
} from "./family-types";

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

async function parseResponse<T>(res: Response): Promise<ApiResponse<T>> {
  const text = await res.text();

  if (!text.trim()) {
    throw new Error(
      res.status === 503
        ? "Cannot reach the API server. Make sure the backend is running on port 5000."
        : `Request failed (${res.status})`,
    );
  }

  let json: ApiResponse<T>;
  try {
    json = JSON.parse(text) as ApiResponse<T>;
  } catch {
    throw new Error("Invalid response from server");
  }

  if (!res.ok) {
    throw new Error(json.message ?? "Request failed");
  }

  return json;
}

export async function sendOtp(email: string) {
  const res = await fetch("/api/auth/otp/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email }),
  });
  return parseResponse<{ email: string; otpToken: string }>(res);
}

export async function verifyOtp(email: string, code: string, otpToken: string) {
  const res = await fetch("/api/auth/otp/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, code, otpToken }),
  });
  return parseResponse<LoginSessionData>(res);
}

export async function registerWithOtp(
  email: string,
  code: string,
  name: string,
  otpToken: string,
) {
  const res = await fetch("/api/auth/otp/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, code, name, otpToken }),
  });
  return parseResponse<LoginSessionData & { user: AuthUser }>(res);
}

export async function logout() {
  const res = await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });
  return parseResponse<null>(res);
}

export async function getMe() {
  const res = await fetch("/api/auth/me", {
    credentials: "include",
  });
  return parseResponse<
    FamilySwitcherPayload & {
      user: AuthUser;
      requiresInvitationAction?: boolean;
      pendingInvitations?: PendingInvitation[];
      familyAccessAlert?: FamilyAccessAlert | null;
    }
  >(res);
}

export type FamilyAccessAlert = {
  type: "removed" | "blocked";
  familyId: string;
  familyName: string;
};

export async function getFamilySwitcher() {
  const res = await fetch("/api/families/switcher", {
    credentials: "include",
  });
  return parseResponse<FamilySwitcherPayload>(res);
}

export async function switchActiveFamily(familyId: string) {
  const res = await fetch("/api/families/active", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ familyId }),
  });
  return parseResponse<FamilySwitcherPayload>(res);
}

export async function setPrimaryFamily(familyId: string) {
  const res = await fetch("/api/families/primary", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ familyId }),
  });
  return parseResponse<FamilySwitcherPayload>(res);
}

export async function createFamily(name?: string) {
  const res = await fetch("/api/families", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(name ? { name } : {}),
  });

  const text = await res.text();
  if (!text.trim()) {
    throw new Error(`Request failed (${res.status})`);
  }

  const json = JSON.parse(text) as {
    success: boolean;
    message?: string;
    data?: unknown;
    switcher?: FamilySwitcherPayload;
  };

  if (!res.ok) {
    throw new Error(json.message ?? "Request failed");
  }

  return {
    switcher: json.switcher ?? null,
  };
}

export async function getFamilyMembers(familyId: string) {
  const res = await fetch(`/api/families/${familyId}/members`, {
    credentials: "include",
  });
  return parseResponse<FamilyMembersPayload>(res);
}

export async function inviteFamilyMember(
  familyId: string,
  payload: {
    email?: string;
    name: string;
    namePrefix?: string;
    role: string;
    relationship?: string;
    phone?: string;
    phoneCountryCode?: string;
    location?: string;
  },
) {
  const res = await fetch(`/api/families/${familyId}/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return parseResponse<FamilyMembersPayload>(res);
}

export async function updateFamilyMemberStatus(
  familyId: string,
  memberUserId: string,
  status: "PENDING" | "JOINED" | "BLOCKED",
) {
  const res = await fetch(
    `/api/families/${familyId}/members/${memberUserId}/status`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status }),
    },
  );
  return parseResponse<FamilyMembersPayload>(res);
}

export async function updateFamilyMember(
  familyId: string,
  memberUserId: string,
  payload: {
    name: string;
    namePrefix?: string;
    role: string;
    relationship?: string;
    phone?: string;
    phoneCountryCode?: string;
    location?: string;
  },
) {
  const res = await fetch(`/api/families/${familyId}/members/${memberUserId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return parseResponse<FamilyMembersPayload>(res);
}

export async function updateFamilyInvitation(
  familyId: string,
  inviteId: string,
  payload: {
    name: string;
    namePrefix?: string;
    role: string;
    relationship?: string;
    phone?: string;
    phoneCountryCode?: string;
    location?: string;
  },
) {
  const res = await fetch(`/api/families/${familyId}/invitations/${inviteId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return parseResponse<FamilyMembersPayload>(res);
}

export async function removeFamilyMember(familyId: string, memberUserId: string) {
  const res = await fetch(`/api/families/${familyId}/members/${memberUserId}`, {
    method: "DELETE",
    credentials: "include",
  });
  return parseResponse<FamilyMembersPayload>(res);
}

export async function revokeFamilyInvitation(familyId: string, inviteId: string) {
  const res = await fetch(`/api/families/${familyId}/invitations/${inviteId}`, {
    method: "DELETE",
    credentials: "include",
  });
  return parseResponse<FamilyMembersPayload>(res);
}

export async function acceptFamilyInvitation(token: string) {
  const res = await fetch("/api/families/invitations/accept", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ token }),
  });
  return parseResponse<{ familyId: string; name: string }>(res);
}

export async function acceptInvitationById(inviteId: string) {
  const res = await fetch("/api/families/invitations/respond/accept", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ inviteId }),
  });
  return parseResponse<FamilySwitcherPayload & { family?: unknown }>(res);
}

export async function rejectInvitationById(inviteId: string) {
  const res = await fetch("/api/families/invitations/respond/reject", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ inviteId }),
  });
  return parseResponse<null>(res);
}

export type AuthUser = {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName: string;
  avatarUrl?: string;
  emailVerified: boolean;
  primaryAuthProvider: string;
  activeFamilyId?: string | null;
  createdAt?: string;
};

export type LoginSessionData = {
  registered: boolean;
  email?: string;
  user?: AuthUser;
  activeFamilyId?: string | null;
  activeFamily?: FamilySummary | null;
  families?: FamilySummary[];
  requiresInvitationAction?: boolean;
  pendingInvitations?: PendingInvitation[];
};

export type PendingInvitation = {
  inviteId: string;
  familyId: string;
  familyName: string;
  role: string;
  roleLabel: string;
  invitedByName: string;
  relationship?: string;
  expiresAt: string;
  createdAt: string;
};

export type UserPhone = {
  countryCode: string;
  number: string;
};

export type UserSocialAccount = {
  provider: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
  linkedAt: string;
  lastUsedAt?: string;
};

export type UserPreferences = {
  emailAlerts: boolean;
  pushReminders: boolean;
  weeklyDigest: boolean;
  familyActivity: boolean;
  medicineReminders: boolean;
  checkInReminders: boolean;
};

export type UserProfile = {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName: string;
  initials: string;
  avatarUrl?: string;
  phone: UserPhone | null;
  emailVerified: boolean;
  primaryAuthProvider: string;
  linkedProviders: string[];
  socialAccounts: UserSocialAccount[];
  hasPassword: boolean;
  preferences: UserPreferences;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type UserSession = {
  sessionId: string;
  authProvider: string;
  userAgent: string;
  ipAddress: string | null;
  lastActiveAt: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
};

export async function getMyProfile() {
  const res = await fetch("/api/users/me", { credentials: "include" });
  return parseResponse<UserProfile>(res);
}

export async function updateMyProfile(payload: {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  phoneCountryCode?: string | null;
  avatarUrl?: string | null;
  preferences?: Partial<UserPreferences>;
}) {
  const res = await fetch("/api/users/me", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return parseResponse<UserProfile>(res);
}

export async function getMySessions() {
  const res = await fetch("/api/users/me/sessions", { credentials: "include" });
  return parseResponse<{ sessions: UserSession[] }>(res);
}

export async function revokeSession(sessionId: string) {
  const res = await fetch(`/api/users/me/sessions/${sessionId}`, {
    method: "DELETE",
    credentials: "include",
  });
  return parseResponse<null>(res);
}

export async function revokeOtherSessions() {
  const res = await fetch("/api/users/me/sessions/revoke-others", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({}),
  });
  return parseResponse<{ revokedCount: number }>(res);
}

export type CareScheduleType =
  | "MEDICINE"
  | "CHECK_IN"
  | "VITALS"
  | "APPOINTMENT"
  | "CUSTOM";

export type CareScheduleItem = {
  scheduleId: string;
  familyId: string;
  recipientUserId: string;
  type: CareScheduleType;
  title: string;
  time: string;
  dosage: string | null;
  instructions: string | null;
  daysOfWeek: number[];
  active: boolean;
  createdBy: string;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CareSchedulePayload = {
  type?: CareScheduleType;
  title: string;
  time: string;
  dosage?: string | null;
  instructions?: string | null;
  daysOfWeek?: number[];
  active?: boolean;
};

export async function getCareSchedule(familyId: string, recipientUserId: string) {
  const res = await fetch(
    `/api/families/${familyId}/recipients/${recipientUserId}/care-schedule`,
    { credentials: "include" },
  );
  return parseResponse<{ schedules: CareScheduleItem[]; canManage: boolean }>(res);
}

export async function createCareScheduleItem(
  familyId: string,
  recipientUserId: string,
  payload: CareSchedulePayload,
) {
  const res = await fetch(
    `/api/families/${familyId}/recipients/${recipientUserId}/care-schedule`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    },
  );
  return parseResponse<CareScheduleItem>(res);
}

export async function updateCareScheduleItem(
  familyId: string,
  recipientUserId: string,
  scheduleId: string,
  payload: Partial<CareSchedulePayload>,
) {
  const res = await fetch(
    `/api/families/${familyId}/recipients/${recipientUserId}/care-schedule/${scheduleId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    },
  );
  return parseResponse<CareScheduleItem>(res);
}

export async function deleteCareScheduleItem(
  familyId: string,
  recipientUserId: string,
  scheduleId: string,
) {
  const res = await fetch(
    `/api/families/${familyId}/recipients/${recipientUserId}/care-schedule/${scheduleId}`,
    {
      method: "DELETE",
      credentials: "include",
    },
  );
  return parseResponse<null>(res);
}
