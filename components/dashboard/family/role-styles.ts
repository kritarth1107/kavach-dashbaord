import type { FamilyMemberRole } from "./family-data";

export const roleStyles: Record<
  FamilyMemberRole,
  { label: string; bg: string; text: string; ring: string; accent: string }
> = {
  care_recipient: {
    label: "Care recipient · Saheli user",
    bg: "bg-emerald-500/15",
    text: "text-emerald-700",
    ring: "ring-emerald-500/20",
    accent: "#16a34a",
  },
  co_caregiver: {
    label: "Co-caregiver",
    bg: "bg-teal-50",
    text: "text-teal-700",
    ring: "ring-teal-500/25",
    accent: "#0d9488",
  },
  view_only: {
    label: "View only",
    bg: "bg-slate-100",
    text: "text-slate-600",
    ring: "ring-slate-300/40",
    accent: "#64748b",
  },
  family_doctor: {
    label: "Family doctor",
    bg: "bg-sky-50",
    text: "text-sky-700",
    ring: "ring-sky-500/25",
    accent: "#0284c7",
  },
  primary_caregiver: {
    label: "Primary caregiver",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    ring: "ring-emerald-500/25",
    accent: "#16a34a",
  },
};
