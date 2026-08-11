import type { ApiFamilyMember } from "@/lib/family-types";

export type FamilyMemberRole =
  | "care_recipient"
  | "co_caregiver"
  | "view_only"
  | "family_doctor"
  | "primary_caregiver";

export type MemberStatus = "pending" | "joined" | "blocked" | "rejected";

export type FamilyMember = {
  id: string;
  userId: string | null;
  inviteId?: string;
  prefix?: string;
  name: string;
  email: string;
  phone?: string;
  phoneCountryCode?: string;
  relationship: string;
  role: FamilyMemberRole;
  status: MemberStatus;
  location: string;
  avatarColor: string;
  avatarUrl?: string | null;
};

const ROLE_MAP: Record<string, FamilyMemberRole> = {
  CARE_RECIPIENT: "care_recipient",
  CO_CAREGIVER: "co_caregiver",
  VIEW_ONLY: "view_only",
  FAMILY_DOCTOR: "family_doctor",
  PRIMARY_CAREGIVER: "primary_caregiver",
};

const UI_ROLE_MAP: Record<FamilyMemberRole, string> = {
  care_recipient: "CARE_RECIPIENT",
  co_caregiver: "CO_CAREGIVER",
  view_only: "VIEW_ONLY",
  family_doctor: "FAMILY_DOCTOR",
  primary_caregiver: "PRIMARY_CAREGIVER",
};

export function uiRoleToApi(role: FamilyMemberRole): string {
  return UI_ROLE_MAP[role];
}

export function canManageFamilyMembers(role: string | null | undefined): boolean {
  if (!role) return false;
  const normalized = role.toUpperCase();
  return normalized === "PRIMARY_CAREGIVER" || normalized === "CO_CAREGIVER";
}

export function isCareRecipientRole(role: string | null | undefined): boolean {
  return role?.toUpperCase() === "CARE_RECIPIENT";
}

const NAME_PREFIXES = ["Mr.", "Mrs.", "Ms.", "Miss", "Dr.", "Prof.", "Mx."] as const;

export function splitNamePrefix(fullName: string): { prefix: string; name: string } {
  const trimmed = fullName.trim();
  for (const prefix of NAME_PREFIXES) {
    if (trimmed.startsWith(`${prefix} `)) {
      return { prefix, name: trimmed.slice(prefix.length + 1).trim() };
    }
  }
  return { prefix: "", name: trimmed };
}

const RELATIONSHIP_OPTIONS = [
  "Mother",
  "Father",
  "Son",
  "Daughter",
  "Spouse",
  "Brother",
  "Sister",
  "Grandmother",
  "Grandfather",
  "Uncle",
  "Aunt",
  "Other",
] as const;

export function matchRelationshipOption(value: string): string {
  if (!value || value === "—") return "";
  const match = RELATIONSHIP_OPTIONS.find(
    (option) => option.toLowerCase() === value.toLowerCase(),
  );
  return match ?? value;
}

export function normalizeStatus(status: string): MemberStatus {
  const upper = status.toUpperCase();
  if (upper === "PENDING") return "pending";
  if (upper === "BLOCKED") return "blocked";
  if (upper === "REJECTED") return "rejected";
  return "joined";
}

export function normalizePhoneFields(
  phone?: string | { countryCode?: string; number?: string } | null,
  phoneCountryCode?: string,
): { phone?: string; phoneCountryCode?: string } {
  if (!phone) {
    return { phoneCountryCode };
  }

  if (typeof phone === "object") {
    return {
      phone: phone.number?.trim(),
      phoneCountryCode: phone.countryCode?.trim() ?? phoneCountryCode,
    };
  }

  return {
    phone: String(phone).trim(),
    phoneCountryCode,
  };
}

export function apiMemberToFamilyMember(
  member: ApiFamilyMember,
  index: number,
): FamilyMember {
  const colors = ["#16a34a", "#059669", "#0d9488", "#64748b", "#0284c7"];
  const phoneFields = normalizePhoneFields(member.phone, member.phoneCountryCode);

  const explicitPrefix = member.namePrefix?.trim() ?? "";
  const rawName = member.name || member.fullName || "";
  const parsedName =
    explicitPrefix || !rawName
      ? { prefix: explicitPrefix, name: member.name || rawName }
      : splitNamePrefix(rawName);

  return {
    id: member.inviteId ?? member.userId ?? member.id,
    userId: member.userId,
    inviteId: member.inviteId,
    prefix: parsedName.prefix,
    name: parsedName.name || rawName,
    email:
      member.email && !member.email.endsWith("@pending.kavach")
        ? member.email
        : "—",
    phone: phoneFields.phone,
    phoneCountryCode: phoneFields.phoneCountryCode,
    relationship: member.relationship || "—",
    role: ROLE_MAP[member.role] ?? "view_only",
    status: normalizeStatus(member.status),
    location: member.location || "—",
    avatarColor: colors[index % colors.length],
    avatarUrl: member.avatarUrl ?? null,
  };
}

export type MemberFormData = {
  prefix: string;
  name: string;
  email: string;
  phoneCountryCode: string;
  phone: string;
  relationship: string;
  role: FamilyMemberRole;
  location: string;
};

export const emptyMemberForm: MemberFormData = {
  prefix: "",
  name: "",
  email: "",
  phoneCountryCode: "+91",
  phone: "",
  relationship: "",
  role: "co_caregiver",
  location: "",
};

export function formatDisplayName(prefix: string | undefined, name: string) {
  const trimmed = name.trim();
  if (!prefix?.trim()) return trimmed;
  return `${prefix.trim()} ${trimmed}`;
}

export function formatPhone(
  countryCode: string,
  phone?: string | { countryCode?: string; number?: string } | null,
) {
  const normalized = normalizePhoneFields(phone, countryCode);
  const trimmed = normalized.phone?.trim() ?? "";
  if (!trimmed) return undefined;
  return `${normalized.phoneCountryCode ?? countryCode} ${trimmed}`;
}

export function memberToFormData(member: FamilyMember): MemberFormData {
  let prefix = member.prefix ?? "";
  let name = member.name;

  if (!prefix && name) {
    const split = splitNamePrefix(name);
    prefix = split.prefix;
    name = split.name;
  }

  return {
    prefix,
    name,
    email: member.email === "—" ? "" : member.email,
    phoneCountryCode: member.phoneCountryCode ?? "+91",
    phone: member.phone ?? "",
    relationship: matchRelationshipOption(member.relationship),
    role: member.role,
    location: member.location === "—" ? "" : member.location,
  };
}

export function getInitials(name: string, prefix?: string) {
  const display = formatDisplayName(prefix, name);
  return display
    .split(" ")
    .filter(Boolean)
    .map((part) => part.replace(/\./g, "")[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export const statusLabels: Record<MemberStatus, string> = {
  pending: "Pending",
  joined: "Joined",
  blocked: "Blocked",
  rejected: "Declined",
};
