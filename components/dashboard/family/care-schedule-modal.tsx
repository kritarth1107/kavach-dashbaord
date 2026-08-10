"use client";

import { Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { CareSchedulePayload } from "@/lib/api";
import {
  dayOptions,
  emptyScheduleForm,
  scheduleToForm,
  scheduleTypeOptions,
  timeOptions,
  type ScheduleFormData,
} from "./care-schedule-data";
import type { CareScheduleItem } from "@/lib/api";

type CareScheduleModalProps = {
  open: boolean;
  mode: "add" | "edit";
  initialItem?: CareScheduleItem | null;
  saving?: boolean;
  onClose: () => void;
  onSave: (payload: CareSchedulePayload) => Promise<void>;
};

const inputClass =
  "w-full rounded-lg border border-[#e5e7eb] bg-[#fafafa] px-2.5 py-2 text-[12px] font-medium text-[#111827] outline-none transition-colors focus:border-primary focus:bg-white focus:ring-1 focus:ring-[var(--primary-ring)]";

export function CareScheduleModal({
  open,
  mode,
  initialItem,
  saving,
  onClose,
  onSave,
}: CareScheduleModalProps) {
  const [form, setForm] = useState<ScheduleFormData>(emptyScheduleForm());
  const [error, setError] = useState("");
  const isEdit = mode === "edit";
  const showDosage = form.type === "MEDICINE";

  useEffect(() => {
    if (!open) return;
    setForm(initialItem ? scheduleToForm(initialItem) : emptyScheduleForm());
    setError("");
  }, [open, initialItem]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function update<K extends keyof ScheduleFormData>(key: K, value: ScheduleFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleDay(day: number) {
    setForm((prev) => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter((d) => d !== day)
        : [...prev.daysOfWeek, day],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const title = form.title.trim();
    if (!title) {
      setError("Title is required");
      return;
    }

    const payload: CareSchedulePayload = {
      type: form.type,
      title,
      time: form.time,
      dosage: showDosage && form.dosage.trim() ? form.dosage.trim() : null,
      instructions: form.instructions.trim() ? form.instructions.trim() : null,
      daysOfWeek: form.daysOfWeek,
      active: form.active,
    };

    try {
      await onSave(payload);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save schedule");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close modal backdrop"
        className="absolute inset-0 bg-[#0f172a]/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative max-h-[90vh] w-full max-w-[520px] overflow-hidden rounded-2xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.15)]">
        <div className="flex items-center justify-between border-b border-[#f0f0f2] px-5 py-3.5">
          <div>
            <h2 className="text-[15px] font-extrabold text-[#111827]">
              {isEdit ? "Edit schedule item" : "Add to care schedule"}
            </h2>
            <p className="text-[11px] text-[#9ca3af]">
              {isEdit
                ? "Update medicine, check-in, or other care reminders"
                : "Set medicine, check-in, vitals, or custom reminders"}
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

        <form onSubmit={(e) => void handleSubmit(e)} className="overflow-y-auto">
          <div className="space-y-3.5 px-5 py-4">
            {error && (
              <p className="rounded-lg bg-[#fef2f2] px-3 py-2 text-[12px] text-[#dc2626]">
                {error}
              </p>
            )}

            <div>
              <FieldLabel>Type</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                {scheduleTypeOptions.map(({ value, label, icon: Icon, description }) => {
                  const selected = form.type === value;
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
                        name="scheduleType"
                        value={value}
                        checked={selected}
                        onChange={() => update("type", value)}
                        className="sr-only"
                      />
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

            <div>
              <FieldLabel>Title</FieldLabel>
              <input
                type="text"
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder={
                  form.type === "MEDICINE"
                    ? "Blood pressure medicine"
                    : form.type === "CHECK_IN"
                      ? "Morning check-in"
                      : "Schedule title"
                }
                required
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Time</FieldLabel>
                <select
                  value={form.time}
                  onChange={(e) => update("time", e.target.value)}
                  className={inputClass}
                >
                  {timeOptions.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>
              {showDosage && (
                <div>
                  <FieldLabel>Dosage (optional)</FieldLabel>
                  <input
                    type="text"
                    value={form.dosage}
                    onChange={(e) => update("dosage", e.target.value)}
                    placeholder="1 tablet"
                    className={inputClass}
                  />
                </div>
              )}
            </div>

            <div>
              <FieldLabel>Instructions (optional)</FieldLabel>
              <textarea
                value={form.instructions}
                onChange={(e) => update("instructions", e.target.value)}
                placeholder="Take after breakfast, with water..."
                rows={2}
                className={cn(inputClass, "resize-none")}
              />
            </div>

            <div>
              <FieldLabel>Repeat on</FieldLabel>
              <p className="mb-2 text-[11px] text-[#9ca3af]">
                Leave all unchecked for every day
              </p>
              <div className="flex flex-wrap gap-1.5">
                {dayOptions.map(({ value, label }) => {
                  const selected = form.daysOfWeek.includes(value);
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleDay(value)}
                      className={cn(
                        "rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-colors",
                        selected
                          ? "bg-primary text-white"
                          : "bg-[#f3f4f6] text-[#6b7280] hover:bg-[#e5e7eb]",
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {isEdit && (
              <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-[#e5e7eb] bg-[#fafafa] px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => update("active", e.target.checked)}
                  className="h-4 w-4 rounded border-[#d1d5db] text-primary focus:ring-primary"
                />
                <span className="text-[12px] font-semibold text-[#374151]">Active on schedule</span>
              </label>
            )}
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
              {isEdit ? "Save changes" : "Add to schedule"}
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
