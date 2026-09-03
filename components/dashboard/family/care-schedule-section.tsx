"use client";

import { Loader2, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { CareScheduleItem, CareSchedulePayload } from "@/lib/api";
import { useCareSchedule } from "./care-recipient-schedule-context";
import { CareScheduleModal } from "./care-schedule-modal";
import {
  formatScheduleDays,
  getActiveSchedulesForDate,
  getScheduleTypeMeta,
  sortSchedules,
} from "./care-schedule-data";
import { useOptionalRecipientDate } from "@/components/dashboard/recipient/recipient-date-context";
import { formatDayLabel } from "@/lib/date-utils";

type CareScheduleSectionProps = {
  subjectName: string;
};

export function CareScheduleSection({ subjectName }: CareScheduleSectionProps) {
  const { schedules, loading, saving, canManage, addSchedule, updateSchedule, removeSchedule } =
    useCareSchedule();
  const dateCtx = useOptionalRecipientDate();
  const selectedDate = dateCtx?.selectedDate ?? new Date();
  const dateLabel = formatDayLabel(selectedDate);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editingItem, setEditingItem] = useState<CareScheduleItem | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const sortedSchedules = useMemo(() => sortSchedules(schedules), [schedules]);
  const daySchedules = useMemo(
    () => getActiveSchedulesForDate(schedules, selectedDate),
    [schedules, selectedDate],
  );
  const dayScheduleIds = useMemo(
    () => new Set(daySchedules.map((item) => item.scheduleId)),
    [daySchedules],
  );
  const activeCount = schedules.filter((item) => item.active).length;

  function openAddModal() {
    setModalMode("add");
    setEditingItem(null);
    setModalOpen(true);
  }

  function openEditModal(item: CareScheduleItem) {
    setModalMode("edit");
    setEditingItem(item);
    setMenuOpenId(null);
    setModalOpen(true);
  }

  async function handleSave(payload: CareSchedulePayload) {
    if (modalMode === "edit" && editingItem) {
      await updateSchedule(editingItem.scheduleId, payload);
    } else {
      await addSchedule(payload);
    }
  }

  async function handleDelete(item: CareScheduleItem) {
    if (!window.confirm(`Remove "${item.title}" from the schedule?`)) return;
    setDeletingId(item.scheduleId);
    setMenuOpenId(null);
    try {
      await removeSchedule(item.scheduleId);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-extrabold tracking-[-0.02em] text-[var(--text-primary)]">
              Care schedule
            </h2>
            <p className="mt-0.5 text-[12px] text-[var(--text-secondary)]">
              {canManage
                ? `Manage ${subjectName}'s medicines, check-ins, and reminders · ${dateLabel}: ${daySchedules.length} active`
                : `${subjectName}'s daily care reminders · ${dateLabel}: ${daySchedules.length} active`}
            </p>
          </div>
          {canManage && (
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-[12px] font-bold text-white hover:bg-[var(--primary-dark)]"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
              Add item
            </button>
          )}
        </div>

        <div className="rounded-lg border border-[var(--border-strong)] bg-[var(--card)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : sortedSchedules.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-[14px] font-bold text-[var(--text-primary)]">No care schedule yet</p>
              <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-[var(--text-secondary)]">
                {canManage
                  ? `Add medicine times, check-ins, vitals, or appointments for ${subjectName}.`
                  : `No reminders have been set for ${subjectName} yet.`}
              </p>
              {canManage && (
                <button
                  type="button"
                  onClick={openAddModal}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-primary bg-primary-light px-4 py-2 text-[12px] font-bold text-primary hover:bg-primary-light"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                  Add medicine schedule
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-[var(--border-strong)] bg-[var(--input-bg)] px-4 py-2.5">
                <p className="text-[11px] font-semibold text-[var(--text-secondary)]">
                  {dateLabel}: {daySchedules.length} on calendar · {activeCount} active total
                </p>
                {canManage && (
                  <button
                    type="button"
                    onClick={openAddModal}
                    className="text-[11px] font-bold text-primary hover:underline"
                  >
                    Add more
                  </button>
                )}
              </div>
              <ul className="divide-y divide-[#f5f5f7]">
                {sortedSchedules.map((item) => {
                  const meta = getScheduleTypeMeta(item.type);
                  const Icon = meta.icon;
                  const isDeleting = deletingId === item.scheduleId;

                  return (
                    <li
                      key={item.scheduleId}
                      className={cn(
                        "flex items-start gap-3 px-4 py-3.5",
                        !item.active && "opacity-60",
                        dayScheduleIds.has(item.scheduleId) && "bg-primary-light/60",
                        !dayScheduleIds.has(item.scheduleId) && "opacity-50",
                      )}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface)]">
                        <Icon className="h-4 w-4 text-[var(--text-secondary)]" strokeWidth={2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[13px] font-bold text-[var(--text-primary)]">{item.title}</p>
                          <span className="rounded-md bg-[var(--surface)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                            {meta.label}
                          </span>
                          {!item.active && (
                            <span className="rounded-md bg-[var(--danger-bg)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--danger-text)]">
                              Paused
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[12px] text-[var(--text-secondary)]">
                          {item.time}
                          {item.dosage ? ` · ${item.dosage}` : ""}
                          {" · "}
                          {formatScheduleDays(item.daysOfWeek)}
                        </p>
                        {item.instructions && (
                          <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-tertiary)]">
                            {item.instructions}
                          </p>
                        )}
                      </div>
                      {canManage && (
                        <div className="relative shrink-0">
                          <button
                            type="button"
                            aria-label="Schedule actions"
                            onClick={() =>
                              setMenuOpenId((prev) =>
                                prev === item.scheduleId ? null : item.scheduleId,
                              )
                            }
                            disabled={isDeleting}
                            className="rounded-lg p-1.5 text-[var(--text-tertiary)] hover:bg-[var(--surface)] hover:text-[var(--text-secondary)] disabled:opacity-50"
                          >
                            {isDeleting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreHorizontal className="h-4 w-4" strokeWidth={2} />
                            )}
                          </button>
                          {menuOpenId === item.scheduleId && (
                            <>
                              <button
                                type="button"
                                aria-label="Close menu"
                                className="fixed inset-0 z-10"
                                onClick={() => setMenuOpenId(null)}
                              />
                              <div className="absolute right-0 top-full z-20 mt-1 min-w-[140px] overflow-hidden rounded-lg border border-[var(--border-strong)] bg-[var(--card)] py-1 shadow-lg">
                                <button
                                  type="button"
                                  onClick={() => openEditModal(item)}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface)]"
                                >
                                  <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleDelete(item)}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-semibold text-[var(--danger-text)] hover:bg-[var(--danger-bg)]"
                                >
                                  <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                                  Remove
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </section>

      <CareScheduleModal
        open={modalOpen}
        mode={modalMode}
        initialItem={editingItem}
        saving={saving}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
    </>
  );
}
