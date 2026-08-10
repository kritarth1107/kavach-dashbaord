export type FamilySummary = {
  familyId: string;
  name: string;
  initial: string;
  description?: string;
  role: string;
  roleLabel: string;
  roleBadge: string;
  switcherRoleBadge: string;
  memberCount: number;
  isActive: boolean;
  isPrimary: boolean;
  status: string;
};

export type FamilySwitcherPayload = {
  activeFamilyId: string | null;
  primaryFamilyId: string | null;
  activeFamily: FamilySummary | null;
  families: FamilySummary[];
};

export type FamilyMemberStatus = "PENDING" | "JOINED" | "BLOCKED" | "ACTIVE";

export type ApiFamilyMember = {
  id: string;
  userId: string | null;
  inviteId?: string;
  fullName: string;
  name: string;
  email: string | null;
  initials: string;
  role: string;
  roleLabel: string;
  roleBadge: string;
  status: FamilyMemberStatus;
  statusLabel?: string;
  relationship?: string;
  phone?: string | { countryCode?: string; number?: string };
  phoneCountryCode?: string;
  location?: string;
  joinedAt?: string | null;
  invitedAt?: string;
  avatarUrl?: string | null;
  namePrefix?: string | null;
};

export type FamilyMembersPayload = {
  familyId: string;
  familyName: string;
  myRole: string | null;
  members: ApiFamilyMember[];
};

const FAMILY_COLORS = ["#16a34a", "#059669", "#0d9488", "#0891b2", "#0284c7"];

export function familyAvatarColor(index: number): string {
  return FAMILY_COLORS[index % FAMILY_COLORS.length];
}
