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

const GET_TIMEOUT_MS = 12_000;
const WRITE_TIMEOUT_MS = 25_000;

async function timedFetch(
  input: string,
  init: RequestInit = {},
  timeoutMs = GET_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, {
      ...init,
      credentials: init.credentials ?? "include",
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Saheli is taking too long. Memory may be offline.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

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

export type OtpChannel = "email" | "phone";

export type OtpIdentifier =
  | { channel: "email"; email: string }
  | { channel: "phone"; phone: string; phoneCountryCode: string };

function otpRequestBody(identifier: OtpIdentifier) {
  if (identifier.channel === "phone") {
    return {
      channel: "phone" as const,
      phone: identifier.phone,
      phoneCountryCode: identifier.phoneCountryCode,
    };
  }

  return {
    channel: "email" as const,
    email: identifier.email,
  };
}

export async function sendOtp(identifier: OtpIdentifier) {
  const res = await fetch("/api/auth/otp/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(otpRequestBody(identifier)),
  });
  return parseResponse<{
    channel: OtpChannel;
    email?: string;
    phone?: string;
    phoneCountryCode?: string;
    otpToken: string;
  }>(res);
}

export async function verifyOtp(
  identifier: OtpIdentifier,
  code: string,
  otpToken: string,
) {
  const res = await fetch("/api/auth/otp/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ ...otpRequestBody(identifier), code, otpToken }),
  });
  return parseResponse<LoginSessionData>(res);
}

export async function registerWithOtp(
  identifier: OtpIdentifier,
  code: string,
  name: string,
  otpToken: string,
) {
  const res = await fetch("/api/auth/otp/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ ...otpRequestBody(identifier), code, name, otpToken }),
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

export type SaheliOrderItem = {
  name: string;
  quantity: number;
  unitPricePaise?: number;
  matchedName?: string;
};

export type SaheliPartnerAddress = {
  id: string;
  label: string;
  line1: string;
  city?: string;
  pincode?: string;
  isDefault?: boolean;
};

export type SaheliOrderSuggestion = {
  orderId: string;
  partner: string;
  partnerLabel: string;
  totalPaise: number;
  items: SaheliOrderItem[];
  status: string;
  source?: "mock" | "zepto_mcp" | "swiggy_mcp" | "instamart_mcp";
  searchResults?: Array<{
    query: string;
    name: string;
    pricePaise?: number;
    kind?: "restaurant" | "dish" | "product";
    restaurantName?: string;
    restaurantId?: string;
  }>;
  addresses?: SaheliPartnerAddress[];
};

export type SaheliOrderFlowCatalogItem = {
  id?: string;
  itemId?: string;
  name: string;
  pricePaise?: number;
  kind?: "restaurant" | "dish" | "product";
  restaurantId?: string;
  restaurantName?: string;
};

export type SaheliOrderFlow = {
  sessionId: string;
  phase: "select_address" | "browse" | "review_cart" | "submitted" | "expired";
  partner: string;
  partnerLabel: string;
  query: string;
  selectedAddressId?: string;
  addresses?: SaheliPartnerAddress[];
  catalog?: {
    restaurants: SaheliOrderFlowCatalogItem[];
    dishes: SaheliOrderFlowCatalogItem[];
    products?: SaheliOrderFlowCatalogItem[];
  };
  cartItems?: Array<{
    itemId?: string;
    name: string;
    quantity: number;
    pricePaise: number;
    restaurantId?: string;
    restaurantName?: string;
  }>;
  orderId?: string;
  message?: string;
  disambiguation?: {
    query: string;
    candidates: Array<{
      candidateId?: string;
      name: string;
      pricePaise?: number;
      kind?: string;
      confidence?: number;
    }>;
  };
};

export type SaheliConnectSuggestion = {
  partner: string;
  partnerLabel: string;
  connectPartner: McpIntegrationPartner;
  connectUrl?: string | null;
  note?: string;
};

export type SaheliOrderPreview = {
  kind?: "order_preview";
  previewId: string;
  partner: string;
  partnerLabel: string;
  addressLabel?: string;
  deliveryAddress: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPricePaise: number;
    itemId?: string;
    spinId?: string;
    restaurantId?: string;
    restaurantName?: string;
  }>;
  totalPaise: number;
  notes?: string;
};

export type SaheliMessage = {
  role: string;
  content: string;
  createdAt?: string | null;
  order?: SaheliOrderSuggestion;
  orderFlow?: SaheliOrderFlow;
  orderPreview?: SaheliOrderPreview;
  connect?: SaheliConnectSuggestion;
};

export type SaheliChatSession = {
  sessionId: string;
  title: string;
  preview: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type SaheliChatResponse = {
  reply: string;
  conversationId: string;
  sessionId?: string;
  order?: SaheliOrderSuggestion;
  orderFlow?: SaheliOrderFlow;
  orderPreview?: SaheliOrderPreview;
  connect?: SaheliConnectSuggestion;
};

export type SaheliInsight = {
  kind: string;
  title: string;
  detail: string;
  actionUrl?: string;
  recipientUserId?: string;
};

export type CommandCenterRecipient = {
  userId: string;
  name: string;
  insightCount: number;
  activeOrderPhase: string | null;
  lastElderSnippet: string | null;
  lastElderAt: string | null;
  nextScheduleTitle: string | null;
  nextScheduleTime: string | null;
  pendingApprovals: number;
  swiggyConnected: boolean;
  swiggyAddressCount: number;
};

export type CommandCenterPayload = {
  pendingApprovalsTotal: number;
  recipients: CommandCenterRecipient[];
  quickPrompts: string[];
};

export type NotificationItem = {
  notificationId: string;
  kind: string;
  title: string;
  body: string;
  actionUrl?: string;
  recipientUserId?: string;
  readAt: string | null;
  createdAt: string | null;
};

export type SearchResult = {
  type: "recipient" | "lab" | "chat" | "order" | "member" | "page";
  id: string;
  title: string;
  subtitle: string;
  url: string;
};

export type LabTrendPoint = {
  value: string;
  unit?: string;
  date: string;
  documentId: string;
  title: string;
};

export function formatSaheliError(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) return "Saheli is reconnecting — try again in a moment.";
  if (trimmed.includes("<html")) return "Saheli is reconnecting — try again in a moment.";
  try {
    const parsed = JSON.parse(trimmed) as {
      detail?: string | Array<{ msg?: string; type?: string }>;
      message?: string;
    };
    if (typeof parsed.detail === "string") return parsed.detail;
    if (Array.isArray(parsed.detail)) {
      return parsed.detail.map((row) => row.msg ?? row.type ?? "Request failed").join(" ");
    }
    if (parsed.message) return parsed.message;
  } catch {
    // keep raw message
  }
  return trimmed;
}

export type SaheliStreamEvent =
  | { type: "token"; delta: string }
  | { type: "tool_start"; id: string; name: string; label?: string }
  | {
      type: "tool_result";
      id: string;
      order?: SaheliOrderSuggestion;
      connect?: SaheliConnectSuggestion;
      orderPreview?: SaheliOrderPreview;
    }
  | {
      type: "done";
      sessionId?: string;
      conversationId?: string;
      reply?: string;
      order?: SaheliOrderSuggestion;
      orderFlow?: SaheliOrderFlow;
      orderPreview?: SaheliOrderPreview;
      connect?: SaheliConnectSuggestion;
    }
  | { type: "error"; message: string };

export type ScheduleDayStatus = "upcoming" | "due" | "completed" | "missed";

export type BriefingItem = {
  scheduleId?: string;
  title: string;
  time: string;
  dosage?: string;
  type: string;
  status?: ScheduleDayStatus;
};

export type ScheduleStatusItem = BriefingItem & {
  scheduleId: string;
  status: ScheduleDayStatus;
  markedBy?: string | null;
  markedAt?: string | null;
};

export type RecipientBriefing = {
  recipientName: string;
  lastHeardAt: string | null;
  lastHeardLine: string | null;
  lastCheckInAt: string | null;
  todayItems: BriefingItem[];
  unconfirmedItems: BriefingItem[];
  scheduleStatuses?: ScheduleStatusItem[];
  completedCount?: number;
  missedCount?: number;
  upcomingCount?: number;
  elapsedCount?: number;
  adherencePercent?: number | null;
  dateKey?: string;
};

export type ScheduleDayStatusResponse = {
  dateKey: string;
  items: ScheduleStatusItem[];
  completedCount: number;
  missedCount: number;
  upcomingCount: number;
  dueCount: number;
  elapsedCount: number;
  adherencePercent: number | null;
};

export type LabDocument = {
  document_id: string;
  title: string;
  kind: string;
  record_date: string | null;
  created_at: string | null;
  snippet?: string | null;
  raw_text?: string | null;
  source?: "text" | "file";
  file_url?: string | null;
  file_name?: string | null;
  mime_type?: string | null;
  file_size?: number | null;
  storage_key?: string | null;
  ai_summary?: string | null;
  tags?: string[];
  highlights?: string[];
  analysis_status?: "pending" | "ready" | "failed" | null;
};

export type LabDocumentDetail = LabDocument & {
  raw_text: string;
};

export type FamilyOverview = {
  careRecipientCount: number;
  schedulesToday: number;
  checkInsToday: number;
  completedToday: number;
  messagesToday: number;
  pendingApprovals: number;
  medAdherencePercent: number | null;
  lastSaheliReply: string | null;
  lastHeardLine: string | null;
  lastActivityAt: string | null;
  labCount: number;
  recipients: Array<{ userId: string; name: string }>;
  recentActivity: ActivityItem[];
};

export type ActivityItem = {
  id: string;
  type: "message" | "schedule" | "check_in" | "lab";
  title: string;
  detail: string;
  recipientUserId: string;
  recipientName: string;
  at: string;
  status: "completed" | "scheduled" | "reported";
};

export async function getFamilyOverview(familyId: string) {
  const res = await timedFetch(`/api/families/${familyId}/overview`);
  return parseResponse<FamilyOverview>(res);
}

export async function getFamilyActivity(familyId: string) {
  const res = await timedFetch(`/api/families/${familyId}/activity`);
  return parseResponse<{ items: ActivityItem[] }>(res);
}

export async function listSaheliChatSessions(familyId: string, recipientUserId: string) {
  const res = await timedFetch(
    `/api/families/${familyId}/recipients/${recipientUserId}/saheli/chat/sessions`,
  );
  return parseResponse<{ sessions: SaheliChatSession[] }>(res);
}

export async function createSaheliChatSession(familyId: string, recipientUserId: string) {
  const res = await timedFetch(
    `/api/families/${familyId}/recipients/${recipientUserId}/saheli/chat/sessions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    },
  );
  return parseResponse<SaheliChatSession>(res);
}

export async function getSaheliChat(
  familyId: string,
  recipientUserId: string,
  sessionId?: string,
) {
  const query = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : "";
  const res = await timedFetch(
    `/api/families/${familyId}/recipients/${recipientUserId}/saheli/chat${query}`,
  );
  return parseResponse<{
    sessionId: string | null;
    conversationId: string;
    messages: SaheliMessage[];
  }>(res);
}

export async function sendSaheliChat(
  familyId: string,
  recipientUserId: string,
  message: string,
  sessionId?: string,
) {
  const res = await timedFetch(
    `/api/families/${familyId}/recipients/${recipientUserId}/saheli/chat`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, sessionId }),
    },
    WRITE_TIMEOUT_MS,
  );
  return parseResponse<SaheliChatResponse>(res);
}

export async function triggerSaheliCheckIn(
  familyId: string,
  recipientUserId: string,
) {
  const res = await timedFetch(
    `/api/families/${familyId}/recipients/${recipientUserId}/saheli/check-in`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    },
    WRITE_TIMEOUT_MS,
  );
  return parseResponse<{ reply: string; conversationId: string }>(res);
}

export type SaheliCompanionProfile = {
  enabled: boolean;
  childName: string;
  relationshipLabel: string;
  personaNotes?: string;
  outreachSlots: Array<"morning" | "afternoon" | "evening">;
  outreachTopics: string[];
  shareWithFamily: boolean;
  preferredChannel: "dashboard" | "whatsapp" | "phone";
  timezone: string;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  nudgeIntensity?: "gentle" | "standard" | "persistent";
  preferredLanguage?: "english" | "hinglish" | "hindi" | "tamil";
  birthday?: string;
  importantDates?: Array<{ label: string; date: string }>;
  lastOutreachAt?: string | null;
  lastWhatsAppInboundAt?: string | null;
};

export type SaheliCompanionActivity = {
  nudges: Array<{
    nudgeKind: string;
    messagePreview?: string;
    delivered: boolean;
    channel?: string;
    createdAt: string | null;
  }>;
  escalations: Array<{
    message: string;
    caregiversNotified: number;
    createdAt: string | null;
  }>;
};

export type FamilyMemoryItem = {
  id: string;
  category: string;
  topic: string;
  content: string;
  share_with_family: boolean;
  importance: number;
  created_at: string | null;
};

export async function getSaheliCompanion(
  familyId: string,
  recipientUserId: string,
) {
  const res = await timedFetch(
    `/api/families/${familyId}/recipients/${recipientUserId}/saheli/companion`,
  );
  return parseResponse<SaheliCompanionProfile>(res);
}

export async function updateSaheliCompanion(
  familyId: string,
  recipientUserId: string,
  patch: Partial<SaheliCompanionProfile>,
) {
  const res = await timedFetch(
    `/api/families/${familyId}/recipients/${recipientUserId}/saheli/companion`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    },
    WRITE_TIMEOUT_MS,
  );
  return parseResponse<SaheliCompanionProfile>(res);
}

export async function getSaheliCompanionActivity(
  familyId: string,
  recipientUserId: string,
) {
  const res = await timedFetch(
    `/api/families/${familyId}/recipients/${recipientUserId}/saheli/companion/activity`,
  );
  return parseResponse<SaheliCompanionActivity>(res);
}

export async function triggerSaheliOutreach(
  familyId: string,
  recipientUserId: string,
  outreachKind?: "casual" | "care" | "mixed",
) {
  const res = await timedFetch(
    `/api/families/${familyId}/recipients/${recipientUserId}/saheli/outreach`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outreachKind: outreachKind ?? "casual" }),
    },
    WRITE_TIMEOUT_MS,
  );
  return parseResponse<{ reply: string; delivered: boolean; topicBucket?: string }>(res);
}

export async function getFamilyMemories(
  familyId: string,
  recipientUserId: string,
) {
  const res = await timedFetch(
    `/api/families/${familyId}/recipients/${recipientUserId}/saheli/memories`,
  );
  return parseResponse<{ memories: FamilyMemoryItem[] }>(res);
}

export async function listCaregiverSaheliChatSessions(
  familyId: string,
  recipientUserId: string,
) {
  const res = await timedFetch(
    `/api/families/${familyId}/recipients/${recipientUserId}/saheli/caregiver/chat/sessions`,
  );
  return parseResponse<{ sessions: SaheliChatSession[] }>(res);
}

export async function createCaregiverSaheliChatSession(
  familyId: string,
  recipientUserId: string,
) {
  const res = await timedFetch(
    `/api/families/${familyId}/recipients/${recipientUserId}/saheli/caregiver/chat/sessions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    },
  );
  return parseResponse<SaheliChatSession>(res);
}

export async function getCaregiverSaheliChat(
  familyId: string,
  recipientUserId: string,
  sessionId?: string,
) {
  const query = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : "";
  const res = await timedFetch(
    `/api/families/${familyId}/recipients/${recipientUserId}/saheli/caregiver/chat${query}`,
  );
  return parseResponse<{
    sessionId: string | null;
    conversationId: string;
    messages: SaheliMessage[];
  }>(res);
}

export async function sendCaregiverSaheliChat(
  familyId: string,
  recipientUserId: string,
  message: string,
  sessionId?: string,
) {
  const res = await timedFetch(
    `/api/families/${familyId}/recipients/${recipientUserId}/saheli/caregiver/chat`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, sessionId }),
    },
    WRITE_TIMEOUT_MS,
  );
  return parseResponse<SaheliChatResponse>(res);
}

export async function* streamCaregiverSaheliChat(
  familyId: string,
  recipientUserId: string,
  message: string,
  sessionId?: string,
): AsyncGenerator<SaheliStreamEvent> {
  const res = await fetch(
    `/api/families/${familyId}/recipients/${recipientUserId}/saheli/caregiver/chat?stream=1`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ message, sessionId }),
    },
  );

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    let messageText = text;
    try {
      const json = JSON.parse(text) as ApiResponse<unknown>;
      messageText = json.message ?? text;
    } catch {
      // keep raw text
    }
    yield {
      type: "error",
      message:
        res.status === 503
          ? "Saheli is reconnecting — try again in a moment."
          : messageText || `Request failed (${res.status})`,
    };
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data:")) continue;
      const json = line.slice(5).trim();
      if (!json || json === "[DONE]") continue;
      try {
        const parsed = JSON.parse(json) as SaheliStreamEvent & {
          order_preview?: SaheliOrderPreview;
        };
        if (parsed.type === "tool_result" && parsed.order_preview && !parsed.orderPreview) {
          parsed.orderPreview = parsed.order_preview;
        }
        if (parsed.type === "done" && parsed.order_preview && !parsed.orderPreview) {
          parsed.orderPreview = parsed.order_preview;
        }
        yield parsed;
      } catch {
        // skip malformed chunk
      }
    }
  }
}

export async function startOrderFlow(
  familyId: string,
  recipientUserId: string,
  message: string,
  saheliSessionId?: string,
) {
  const res = await timedFetch(
    `/api/families/${familyId}/recipients/${recipientUserId}/saheli/order-sessions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, saheliSessionId }),
    },
    WRITE_TIMEOUT_MS,
  );
  return parseResponse<SaheliOrderFlow>(res);
}

export async function getOrderSession(familyId: string, sessionId: string) {
  const res = await timedFetch(
    `/api/families/${familyId}/saheli/order-sessions/${sessionId}`,
    {},
    WRITE_TIMEOUT_MS,
  );
  return parseResponse<SaheliOrderFlow>(res);
}

export async function searchOrderFlowCatalog(
  familyId: string,
  sessionId: string,
  query: string,
) {
  const qs = query ? `?query=${encodeURIComponent(query)}` : "";
  const res = await timedFetch(
    `/api/families/${familyId}/saheli/order-sessions/${sessionId}/catalog${qs}`,
    {},
    WRITE_TIMEOUT_MS,
  );
  return parseResponse<SaheliOrderFlow>(res);
}

export async function selectOrderFlowAddress(
  familyId: string,
  sessionId: string,
  addressId: string,
) {
  const res = await timedFetch(
    `/api/families/${familyId}/saheli/order-sessions/${sessionId}/address`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addressId }),
    },
    WRITE_TIMEOUT_MS,
  );
  return parseResponse<SaheliOrderFlow>(res);
}

export async function loadOrderFlowRestaurantMenu(
  familyId: string,
  sessionId: string,
  restaurantId: string,
) {
  const res = await timedFetch(
    `/api/families/${familyId}/saheli/order-sessions/${sessionId}/menu/${restaurantId}`,
    {},
    WRITE_TIMEOUT_MS,
  );
  return parseResponse<SaheliOrderFlow>(res);
}

export async function addOrderFlowCartItem(
  familyId: string,
  sessionId: string,
  item: {
    itemId?: string;
    name: string;
    quantity?: number;
    pricePaise?: number;
    restaurantId?: string;
    restaurantName?: string;
  },
) {
  const res = await timedFetch(
    `/api/families/${familyId}/saheli/order-sessions/${sessionId}/cart/items`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item }),
    },
    WRITE_TIMEOUT_MS,
  );
  return parseResponse<SaheliOrderFlow>(res);
}

export async function updateOrderFlowCartItem(
  familyId: string,
  sessionId: string,
  itemIndex: number,
  quantity: number,
) {
  const res = await timedFetch(
    `/api/families/${familyId}/saheli/order-sessions/${sessionId}/cart/items`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemIndex, quantity }),
    },
    WRITE_TIMEOUT_MS,
  );
  return parseResponse<SaheliOrderFlow>(res);
}

export async function submitOrderFlowCart(familyId: string, sessionId: string) {
  const res = await timedFetch(
    `/api/families/${familyId}/saheli/order-sessions/${sessionId}/submit`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    },
    WRITE_TIMEOUT_MS,
  );
  return parseResponse<{ flow: SaheliOrderFlow; order: SaheliOrderSuggestion }>(res);
}

export async function placeCodOrder(familyId: string, previewId: string) {
  const res = await timedFetch(`/api/families/${familyId}/saheli/orders/place-cod`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ previewId }),
  }, WRITE_TIMEOUT_MS);
  return parseResponse<{
    kind: string;
    orderId: string;
    partner: string;
    partnerLabel: string;
    totalPaise: number;
    partnerRef?: string;
    status: string;
  }>(res);
}

export async function getActiveOrderFlow(
  familyId: string,
  recipientUserId: string,
  saheliSessionId?: string,
) {
  const qs = saheliSessionId ? `?saheliSessionId=${encodeURIComponent(saheliSessionId)}` : "";
  const res = await timedFetch(
    `/api/families/${familyId}/recipients/${recipientUserId}/saheli/order-sessions/active${qs}`,
  );
  return parseResponse<SaheliOrderFlow | null>(res);
}

export async function getSaheliInsights(familyId: string, recipientUserId: string) {
  const res = await timedFetch(
    `/api/families/${familyId}/recipients/${recipientUserId}/saheli/insights`,
  );
  return parseResponse<{ insights: SaheliInsight[] }>(res);
}

export async function getCommandCenter(familyId: string) {
  const res = await timedFetch(`/api/families/${familyId}/dashboard/command-center`);
  return parseResponse<CommandCenterPayload>(res);
}

export async function getNotifications(familyId: string) {
  const res = await timedFetch(`/api/families/${familyId}/notifications`);
  return parseResponse<{ notifications: NotificationItem[]; unreadCount: number }>(res);
}

export async function markNotificationRead(familyId: string, notificationId: string) {
  const res = await timedFetch(
    `/api/families/${familyId}/notifications/${notificationId}/read`,
    { method: "PATCH" },
  );
  return parseResponse<unknown>(res);
}

export async function markAllNotificationsRead(familyId: string) {
  const res = await timedFetch(`/api/families/${familyId}/notifications/read-all`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  return parseResponse<unknown>(res);
}

export async function searchFamily(familyId: string, query: string, limit = 20) {
  const qs = `?q=${encodeURIComponent(query)}&limit=${limit}`;
  const res = await timedFetch(`/api/families/${familyId}/search${qs}`);
  return parseResponse<{ results: SearchResult[] }>(res);
}

export async function refreshSaheliMemory(
  familyId: string,
  recipientUserId: string,
  sessionId?: string,
) {
  const res = await timedFetch(
    `/api/families/${familyId}/recipients/${recipientUserId}/saheli/memory/refresh`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    },
    WRITE_TIMEOUT_MS,
  );
  return parseResponse<unknown>(res);
}

export async function getLabTrends(
  familyId: string,
  recipientUserId: string,
  marker: string,
  limit = 12,
) {
  const qs = `?marker=${encodeURIComponent(marker)}&limit=${limit}`;
  const res = await timedFetch(
    `/api/families/${familyId}/recipients/${recipientUserId}/labs/trends${qs}`,
  );
  return parseResponse<{ marker: string; points: LabTrendPoint[] }>(res);
}

export async function getRecipientBriefing(
  familyId: string,
  recipientUserId: string,
  dateKey?: string,
) {
  const qs = dateKey ? `?date=${encodeURIComponent(dateKey)}` : "";
  const res = await timedFetch(
    `/api/families/${familyId}/recipients/${recipientUserId}/briefing${qs}`,
  );
  return parseResponse<RecipientBriefing>(res);
}

export async function setScheduleCompletion(
  familyId: string,
  recipientUserId: string,
  scheduleId: string,
  payload: { status: "completed" | "missed"; dateKey?: string; note?: string },
) {
  const res = await timedFetch(
    `/api/families/${familyId}/recipients/${recipientUserId}/care-schedule/${scheduleId}/completion`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  return parseResponse<ScheduleDayStatusResponse>(res);
}

export async function getRecipientLabs(familyId: string, recipientUserId: string) {
  const res = await timedFetch(
    `/api/families/${familyId}/recipients/${recipientUserId}/labs`,
  );
  return parseResponse<{ documents: LabDocument[] }>(res);
}

export async function uploadRecipientLab(
  familyId: string,
  recipientUserId: string,
  payload: { title?: string; rawText: string; kind?: string; recordDate?: string },
) {
  const res = await timedFetch(
    `/api/families/${familyId}/recipients/${recipientUserId}/labs`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    WRITE_TIMEOUT_MS,
  );
  return parseResponse<{ document_id: string; title: string; kind: string }>(res);
}

export async function uploadRecipientLabFiles(
  familyId: string,
  recipientUserId: string,
  files: File[],
  payload: { kind?: string; recordDate?: string },
) {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }
  if (payload.kind) formData.append("kind", payload.kind);
  if (payload.recordDate) formData.append("recordDate", payload.recordDate);

  const res = await timedFetch(
    `/api/families/${familyId}/recipients/${recipientUserId}/labs/upload`,
    {
      method: "POST",
      body: formData,
    },
    120_000,
  );
  return parseResponse<{
    uploaded: Array<{
      document_id: string;
      title: string;
      kind: string;
      file_url?: string;
      ai_summary?: string | null;
      tags?: string[];
      analysis_status?: string;
    }>;
    failed: Array<{ file_name: string; error: string }>;
    count: number;
  }>(res);
}

export async function uploadRecipientLabFile(
  familyId: string,
  recipientUserId: string,
  file: File,
  payload: { title?: string; kind?: string; recordDate?: string },
) {
  const formData = new FormData();
  formData.append("file", file);
  if (payload.title) formData.append("title", payload.title);
  if (payload.kind) formData.append("kind", payload.kind);
  if (payload.recordDate) formData.append("recordDate", payload.recordDate);

  const res = await timedFetch(
    `/api/families/${familyId}/recipients/${recipientUserId}/labs/upload`,
    {
      method: "POST",
      body: formData,
    },
    60_000,
  );
  return parseResponse<{
    document_id: string;
    title: string;
    kind: string;
    file_url?: string;
    storage_key?: string;
    ai_summary?: string | null;
    tags?: string[];
    analysis_status?: string;
  }>(res);
}

export function getRecipientLabDownloadPath(
  familyId: string,
  recipientUserId: string,
  documentId: string,
) {
  return `/api/families/${familyId}/recipients/${recipientUserId}/labs/${documentId}/download`;
}

export async function downloadRecipientLabFile(
  familyId: string,
  recipientUserId: string,
  documentId: string,
  fileName?: string | null,
) {
  const res = await timedFetch(
    getRecipientLabDownloadPath(familyId, recipientUserId, documentId),
    { method: "GET" },
    60_000,
  );

  if (!res.ok) {
    let message = "Could not download file";
    try {
      const json = (await res.json()) as { message?: string };
      message = json.message || message;
    } catch {
      /* binary error body */
    }
    throw new Error(message);
  }

  const blob = await res.blob();
  const disposition = res.headers.get("content-disposition") || "";
  const match = disposition.match(/filename=\"?([^\";\n]+)\"?/i);
  const name = fileName || (match ? decodeURIComponent(match[1]) : "report");

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function getRecipientLabDetail(
  familyId: string,
  recipientUserId: string,
  documentId: string,
) {
  const res = await timedFetch(
    `/api/families/${familyId}/recipients/${recipientUserId}/labs/${documentId}`,
  );
  return parseResponse<LabDocumentDetail>(res);
}

export async function deleteRecipientLab(
  familyId: string,
  recipientUserId: string,
  documentId: string,
) {
  const res = await timedFetch(
    `/api/families/${familyId}/recipients/${recipientUserId}/labs/${documentId}`,
    { method: "DELETE" },
    WRITE_TIMEOUT_MS,
  );
  return parseResponse<{ deleted: boolean }>(res);
}

export type CareRecordEventItem = {
  eventId: string;
  type: string;
  source: string;
  channel: string;
  title: string;
  detail: string;
  status?: string;
  at: string | null;
  payload?: Record<string, unknown>;
};

export type CareRecordMetrics = {
  careEventsByDay: number[];
  dosesByDay: number[];
  totalEvents: number;
  dosesTaken: number;
  dosesDue: number;
  checkInsSent: number;
  checkInsReplied: number;
  checkInReplyRate: number;
};

export type PendingOrder = {
  order_id: string;
  status: string;
  total_paise: number;
  items: Array<{ name: string; quantity: number; unitPricePaise: number }>;
  deep_link?: string | null;
  subject_user_id: string;
  created_at: string | null;
};

export type CareBrief = {
  subjectName: string;
  generatedAt: string;
  sections: {
    narrative: string;
    recentSignals: CareRecordEventItem[];
    recentOrders: CareRecordEventItem[];
    recentDocuments: CareRecordEventItem[];
  };
  eventCount: number;
};

export async function getCareRecordTimeline(
  familyId: string,
  subjectUserId: string,
  limit = 100,
) {
  const res = await timedFetch(
    `/api/families/${familyId}/subjects/${subjectUserId}/care-record/timeline?limit=${limit}`,
  );
  return parseResponse<{ events: CareRecordEventItem[] }>(res);
}

export async function getCareRecordMetrics(familyId: string, subjectUserId: string) {
  const res = await timedFetch(
    `/api/families/${familyId}/subjects/${subjectUserId}/care-record/metrics`,
  );
  return parseResponse<CareRecordMetrics>(res);
}

export async function getCareBrief(familyId: string, subjectUserId: string) {
  const res = await timedFetch(
    `/api/families/${familyId}/subjects/${subjectUserId}/care-brief`,
    {},
    WRITE_TIMEOUT_MS,
  );
  return parseResponse<CareBrief>(res);
}

export async function getPendingApprovals(familyId: string) {
  const res = await timedFetch(`/api/families/${familyId}/approvals/pending`);
  return parseResponse<{ orders: PendingOrder[] }>(res);
}

export async function approveOrder(familyId: string, orderId: string) {
  const res = await timedFetch(
    `/api/families/${familyId}/orders/${orderId}/approve`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    },
    WRITE_TIMEOUT_MS,
  );
  return parseResponse<{ order_id: string; status: string }>(res);
}

export async function payOrder(
  familyId: string,
  orderId: string,
  opts?: { partnerAddressId?: string; deliveryAddress?: string },
) {
  const res = await timedFetch(
    `/api/families/${familyId}/orders/${orderId}/pay`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        partnerAddressId: opts?.partnerAddressId,
        deliveryAddress: opts?.deliveryAddress,
      }),
    },
    WRITE_TIMEOUT_MS,
  );
  return parseResponse<{
    order_id: string;
    status: string;
    payment_id?: string;
    payment_link?: string | null;
    provider?: string;
  }>(res);
}

export async function rejectOrder(familyId: string, orderId: string) {
  const res = await timedFetch(
    `/api/families/${familyId}/orders/${orderId}/reject`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    },
    WRITE_TIMEOUT_MS,
  );
  return parseResponse<{ order_id: string; status: string }>(res);
}

export type OrderHistoryItem = PendingOrder;

export async function getOrderHistory(familyId: string) {
  const res = await timedFetch(`/api/families/${familyId}/orders/history`);
  return parseResponse<{ orders: OrderHistoryItem[] }>(res);
}

export type McpIntegrationPartner = "zepto" | "swiggy" | "instamart";

export type McpIntegrationInfo = {
  status: string;
  mode: string;
  description: string;
  connected: boolean;
  connectedAt: string | null;
  addressCount?: number;
  redirectUri: string;
  mcpUrl?: string;
  pendingApprovals: number;
  partnerTrack: string;
  paymentNote: string;
  label?: string;
};

export type PartnerAddress = {
  address_id: string;
  partner: McpIntegrationPartner;
  partner_address_id: string;
  label: string;
  line1: string;
  line2: string;
  city: string;
  pincode: string;
  is_default: boolean;
  synced_at: string | null;
};

export type ChannelIdentity = {
  identityId?: string;
  channelType: string;
  channelIdentifier: string;
  familyId: string;
  userId: string;
  role: string;
  label?: string;
  active?: boolean;
};

export type FamilyIntegrations = {
  zepto: McpIntegrationInfo;
  swiggy: McpIntegrationInfo;
  instamart: McpIntegrationInfo;
  whatsapp: {
    status: string;
    description: string;
    kavachNumber?: string;
    linkedIdentities: number;
    identities: Array<{ label?: string; role: string; identifier: string }>;
  };
  phone: { status: string; linkedIdentities: number; webhook: string };
  smartSpeaker: { status: string; linkedIdentities: number; webhook: string };
  recentOrders: Array<{
    order_id: string;
    status: string;
    partner?: string;
    total_paise: number;
    created_at: string | null;
  }>;
  partnerAddresses?: PartnerAddress[];
};

export async function getFamilyIntegrations(familyId: string) {
  const res = await timedFetch(`/api/families/${familyId}/integrations`);
  return parseResponse<FamilyIntegrations>(res);
}

export async function startMcpConnect(familyId: string, partner: McpIntegrationPartner) {
  const path =
    partner === "zepto"
      ? `/api/families/${familyId}/integrations/zepto/connect`
      : `/api/families/${familyId}/integrations/${partner}/connect`;
  const res = await timedFetch(path);
  return parseResponse<{ connected: boolean; authorizationUrl: string | null; oauthState?: string }>(
    res,
  );
}

export async function disconnectMcp(familyId: string, partner: McpIntegrationPartner) {
  const path =
    partner === "zepto"
      ? `/api/families/${familyId}/integrations/zepto`
      : `/api/families/${familyId}/integrations/${partner}`;
  const res = await timedFetch(path, { method: "DELETE" });
  return parseResponse<{ disconnected: boolean }>(res);
}

export async function startZeptoConnect(familyId: string) {
  return startMcpConnect(familyId, "zepto");
}

export async function getZeptoStatus(familyId: string) {
  const res = await timedFetch(`/api/families/${familyId}/integrations/zepto/status`);
  return parseResponse<{
    connected: boolean;
    connectedAt: string | null;
    redirectUri: string;
    mcpUrl: string;
  }>(res);
}

export async function disconnectZepto(familyId: string) {
  return disconnectMcp(familyId, "zepto");
}

export async function syncPartnerAddresses(familyId: string, partner: McpIntegrationPartner) {
  const res = await timedFetch(
    `/api/families/${familyId}/integrations/${partner}/sync-addresses`,
    { method: "POST" },
  );
  return parseResponse<{ synced: number }>(res);
}

export type PartnerOrderSettings = {
  allowRecipientDirectOrders: boolean;
  approvalThresholdPaise: number | null;
};

export type PartnerIntegrationDetail = {
  partner: McpIntegrationPartner;
  label: string;
  connected: boolean;
  connectedAt: string | null;
  addressCount: number;
  addresses: PartnerAddress[];
  capabilities: string[];
  paymentNote: string;
  partnerTrack: string;
  mcpUrl?: string;
  description: string;
  pendingApprovals: number;
  orderSettings: PartnerOrderSettings;
  recentOrders: Array<{
    order_id: string;
    status: string;
    total_paise: number;
    created_at: string | null;
  }>;
};

export async function getPartnerIntegrationDetail(
  familyId: string,
  partner: McpIntegrationPartner,
) {
  const res = await timedFetch(
    `/api/families/${familyId}/integrations/${partner}/detail`,
  );
  return parseResponse<PartnerIntegrationDetail>(res);
}

export async function updatePartnerOrderSettings(
  familyId: string,
  partner: McpIntegrationPartner,
  patch: {
    allowRecipientDirectOrders?: boolean;
    approvalThresholdRupees?: number | null;
    approvalThresholdPaise?: number | null;
  },
) {
  const res = await timedFetch(
    `/api/families/${familyId}/integrations/${partner}/settings`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    },
  );
  return parseResponse<PartnerOrderSettings>(res);
}

export async function getChannelIdentities(familyId: string) {
  const res = await timedFetch(`/api/families/${familyId}/channel-identities`);
  return parseResponse<{ identities: ChannelIdentity[] }>(res);
}

export async function linkChannelIdentity(
  familyId: string,
  body: {
    channelType: "whatsapp" | "phone" | "smart_speaker";
    channelIdentifier: string;
    userId: string;
    role: string;
    label?: string;
  },
) {
  const res = await timedFetch(`/api/families/${familyId}/channel-identities`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseResponse<ChannelIdentity>(res);
}
