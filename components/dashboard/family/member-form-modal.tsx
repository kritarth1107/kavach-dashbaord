"use client";

import { ChevronDown, Loader2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  countryCodeOptions,
  prefixOptions,
  relationshipOptions,
  roleFormOptions,
} from "./form-options";
import {
  emptyMemberForm,
  type FamilyMemberRole,
  type MemberFormData,
} from "./family-data";

type MemberFormModalProps = {
  open: boolean;
  mode?: "invite" | "edit";
  initialData?: MemberFormData;
  saving?: boolean;
  onClose: () => void;
  onInvite: (data: MemberFormData) => Promise<void>;
  onSave?: (data: MemberFormData) => Promise<void>;
};

const inputClass =
  "w-full rounded-lg border border-[#e5e7eb] bg-[#fafafa] px-2.5 py-2 text-[12px] font-medium text-[#111827] outline-none transition-colors focus:border-primary focus:bg-white focus:ring-1 focus:ring-[var(--primary-ring)]";

export function MemberFormModal({
  open,
  mode = "invite",
  initialData,
  saving,
  onClose,
  onInvite,
  onSave,
}: MemberFormModalProps) {
  const [form, setForm] = useState<MemberFormData>(emptyMemberForm);
  const [error, setError] = useState("");
  const isEdit = mode === "edit";

  useEffect(() => {
    if (!open) return;
    setForm(initialData ?? emptyMemberForm);
    setError("");
  }, [open, initialData]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const relationshipChoices = useMemo(() => {
    const values: string[] = [...relationshipOptions];
    if (
      form.relationship &&
      !values.some((rel) => rel.toLowerCase() === form.relationship.toLowerCase())
    ) {
      values.unshift(form.relationship);
    }
    return values;
  }, [form.relationship]);

  if (!open) return null;

  function update<K extends keyof MemberFormData>(key: K, value: MemberFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!isEdit && form.role === "care_recipient") {
      const hasEmail = form.email.trim().length > 0;
      const hasPhone = form.phone.replace(/\D/g, "").length >= 6;
      if (!hasEmail && !hasPhone) {
        setError("Add an email or mobile number for this care recipient");
        return;
      }
    }

    try {
      if (isEdit) {
        await onSave?.(form);
      } else {
        await onInvite(form);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isEdit
            ? "Failed to update member"
            : "Failed to send invitation",
      );
    }
  }

  const isCareRecipient = form.role === "care_recipient";
  const showEmailField = !isEdit;
  const emailRequired = !isCareRecipient;
  const contactHint = isCareRecipient && !isEdit;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close modal backdrop"
        className="absolute inset-0 bg-[#0f172a]/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-[560px] overflow-hidden rounded-2xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.15)]">
        <div className="flex items-center justify-between border-b border-[#f0f0f2] px-5 py-3.5">
          <div>
            <h2 className="text-[15px] font-extrabold text-[#111827]">
              {isEdit ? "Edit family member" : "Add family member"}
            </h2>
            <p className="text-[11px] text-[#9ca3af]">
              {isEdit
                ? "Update role and contact details for this member"
                : isCareRecipient
                  ? "Care recipients are added immediately — email or mobile required"
                  : "They'll receive an invite and must accept to join"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-[#9ca3af] hover:bg-[#f5f5f7] hover:text-[#374151]"
          >
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)}>
          <div className="space-y-3.5 px-5 py-4">
            {error && (
              <p className="rounded-lg bg-[#fef2f2] px-3 py-2 text-[12px] text-[#dc2626]">
                {error}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Name</FieldLabel>
                <div className="flex gap-1.5">
                  <Select
                    value={form.prefix}
                    onChange={(v) => update("prefix", v)}
                    className="w-[72px] shrink-0"
                  >
                    {prefixOptions.map(({ value, label }) => (
                      <option key={label} value={value}>
                        {value || "—"}
                      </option>
                    ))}
                  </Select>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder="Full name"
                    required
                    className={cn(inputClass, "min-w-0 flex-1")}
                  />
                </div>
              </div>
              <div>
                <FieldLabel>Relationship</FieldLabel>
                <Select
                  value={form.relationship}
                  onChange={(v) => update("relationship", v)}
                  required
                >
                  <option value="" disabled>
                    Select
                  </option>
                  {relationshipChoices.map((rel) => (
                    <option key={rel} value={rel}>
                      {rel}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>{contactHint ? "Mobile (or use email above)" : "Phone"}</FieldLabel>
                <div className="flex gap-1.5">
                  <Select
                    value={form.phoneCountryCode}
                    onChange={(v) => update("phoneCountryCode", v)}
                    className="w-[76px] shrink-0"
                  >
                    {countryCodeOptions.map(({ code, flag }) => (
                      <option key={code} value={code}>
                        {flag} {code}
                      </option>
                    ))}
                  </Select>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    placeholder="Number"
                    className={cn(inputClass, "min-w-0 flex-1")}
                  />
                </div>
              </div>
              <div>
                <FieldLabel>Location</FieldLabel>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => update("location", e.target.value)}
                  placeholder="City, Country"
                  className={inputClass}
                />
              </div>
            </div>

            {showEmailField && (
              <div>
                <FieldLabel>
                  {contactHint ? "Email (or use mobile below)" : emailRequired ? "Email" : "Email (optional)"}
                </FieldLabel>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="name@email.com"
                  required={emailRequired}
                  className={inputClass}
                />
              </div>
            )}

            {!isEdit && isCareRecipient && (
              <p className="text-[11px] font-medium text-[#6b7280]">
                Provide at least one contact — email or mobile — so they can be reached or sign in later.
              </p>
            )}

            <div>
              <FieldLabel>Access role</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                {roleFormOptions.map(({ value, label, description, icon: Icon }) => {
                  const selected = form.role === value;
                  return (
                    <label
                      key={value}
                      title={description}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 transition-colors",
                        selected
                          ? "border-primary bg-primary-light"
                          : "border-[#e5e7eb] bg-[#fafafa] hover:border-[#d1d5db]",
                      )}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={value}
                        checked={selected}
                        onChange={() => update("role", value as FamilyMemberRole)}
                        className="sr-only"
                      />
                      <span
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
                          selected ? "border-primary bg-primary" : "border-[#d1d5db] bg-white",
                        )}
                      >
                        {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </span>
                      <Icon
                        className={cn(
                          "h-3.5 w-3.5 shrink-0",
                          selected ? "text-primary" : "text-[#9ca3af]",
                        )}
                        strokeWidth={2.25}
                      />
                      <span
                        className={cn(
                          "text-[11.5px] font-semibold leading-tight",
                          selected ? "text-primary" : "text-[#374151]",
                        )}
                      >
                        {label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-[#f0f0f2] px-5 py-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg px-3.5 py-2 text-[12px] font-semibold text-[#6b7280] hover:bg-[#f5f5f7] disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-[12px] font-bold text-white hover:bg-[var(--primary-dark)] disabled:opacity-60"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isEdit ? "Save changes" : "Send invite"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#9ca3af]">
      {children}
    </label>
  );
}

function Select({
  value,
  onChange,
  children,
  className,
  required,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
  required?: boolean;
}) {
  return (
    <div className={cn("relative", className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className={cn(inputClass, "appearance-none pr-7")}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9ca3af]" />
    </div>
  );
}
