import { Eye, Heart, Stethoscope, Users, type LucideIcon } from "lucide-react";
import type { FamilyMemberRole } from "./family-data";

export const prefixOptions = [
  { value: "", label: "No prefix" },
  { value: "Mr.", label: "Mr." },
  { value: "Mrs.", label: "Mrs." },
  { value: "Ms.", label: "Ms." },
  { value: "Miss", label: "Miss" },
  { value: "Dr.", label: "Dr." },
  { value: "Prof.", label: "Prof." },
  { value: "Mx.", label: "Mx." },
] as const;

export const relationshipOptions = [
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

export const countryCodeOptions = [
  { code: "+91", label: "India", flag: "🇮🇳" },
  { code: "+1", label: "US / Canada", flag: "🇺🇸" },
  { code: "+44", label: "UK", flag: "🇬🇧" },
  { code: "+65", label: "Singapore", flag: "🇸🇬" },
  { code: "+971", label: "UAE", flag: "🇦🇪" },
  { code: "+61", label: "Australia", flag: "🇦🇺" },
  { code: "+49", label: "Germany", flag: "🇩🇪" },
  { code: "+33", label: "France", flag: "🇫🇷" },
  { code: "+81", label: "Japan", flag: "🇯🇵" },
  { code: "+86", label: "China", flag: "🇨🇳" },
] as const;

export type RoleFormOption = {
  value: FamilyMemberRole;
  label: string;
  description: string;
  icon: LucideIcon;
};

export const roleFormOptions: RoleFormOption[] = [
  {
    value: "care_recipient",
    label: "Care recipient",
    description:
      "The loved one receiving care. Uses Saheli on their phone — no app needed.",
    icon: Heart,
  },
  {
    value: "co_caregiver",
    label: "Co-caregiver",
    description:
      "Can view updates, manage care tasks, and coordinate with the family.",
    icon: Users,
  },
  {
    value: "view_only",
    label: "View only",
    description:
      "Read-only access to health updates and activity — cannot make changes.",
    icon: Eye,
  },
  {
    value: "family_doctor",
    label: "Family doctor",
    description:
      "Clinical access to health records, vitals, and care notes.",
    icon: Stethoscope,
  },
];
