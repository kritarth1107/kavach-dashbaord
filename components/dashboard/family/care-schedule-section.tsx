"use client";

import { Loader2, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { CareScheduleItem, CareSchedulePayload } from "@/lib/api";
import { useCareSchedule } from "./care-recipient-schedule-context";
import { CareScheduleModal } from "./care-schedule-modal";
import {
  formatScheduleDays,
  getScheduleTypeMeta,
  sortSchedules,
} from "./care-schedule-data";

type CareScheduleSectionProps = {
  subjectName: string;
};

export function CareScheduleSection({ subjectName }: CareScheduleSectionProps) {
  const { schedules, loading, saving, canManage, addSchedule, updateSchedule, removeSchedule } =
    useCareSchedule();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editingItem, setEditingItem] = useState<CareScheduleItem | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const sortedSchedules = useMemo(() => sortSchedules(schedules), [schedules]);
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
            <h2 className="text-[15px] font-extrabold tracking-[-0.02em] text-[#111827]">
              Care schedule
            </h2>
            <p className="mt-0.5 text-[12px] text-[#6b7280]">
              {canManage
                ? `Manage ${subjectName}'s medicines, check-ins, and reminders`
                : `${subjectName}'s daily care reminders`}
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

        <div className="rounded-lg border border-[#f0f0f2] bg-white">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : sortedSchedules.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-[14px] font-bold text-[#111827]">No care schedule yet</p>
              <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-[#6b7280]">
                {canManage
                  ? `Add medicine times, check-ins, vitals, or appointments for ${subjectName}.`
                  : `No reminders have been set for ${subjectName} yet.`}
              </p>
              {canManage && (
                <button
                  type="button"
                  onClick={openAddModal}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-primary bg-[#f0fdf4] px-4 py-2 text-[12px] font-bold text-primary hover:bg-[#dcfce7]"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                  Add medicine schedule
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-[#f0f0f2] px-4 py-2.5">
                <p className="text-[11px] font-semibold text-[#6b7280]">
                  {activeCount} active · {sortedSchedules.length} total
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
                      )}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f5f5f7]">
                        <Icon className="h-4 w-4 text-[#374151]" strokeWidth={2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[13px] font-bold text-[#111827]">{item.title}</p>
                          <span className="rounded-md bg-[#f3f4f6] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#6b7280]">
                            {meta.label}
                          </span>
                          {!item.active && (
                            <span className="rounded-md bg-[#fef2f2] px-1.5 py-0.5 text-[10px] font-semibold text-[#dc2626]">
                              Paused
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[12px] text-[#6b7280]">
                          {item.time}
                          {item.dosage ? ` · ${item.dosage}` : ""}
                          {" · "}
                          {formatScheduleDays(item.daysOfWeek)}
                        </p>
                        {item.instructions && (
                          <p className="mt-1 text-[11px] leading-relaxed text-[#9ca3af]">
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
                            className="rounded-lg p-1.5 text-[#9ca3af] hover:bg-[#f5f5f7] hover:text-[#374151] disabled:opacity-50"
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
                              <div className="absolute right-0 top-full z-20 mt-1 min-w-[140px] overflow-hidden rounded-lg border border-[#e5e7eb] bg-white py-1 shadow-lg">
                                <button
                                  type="button"
                                  onClick={() => openEditModal(item)}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-semibold text-[#374151] hover:bg-[#f5f5f7]"
                                >
                                  <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleDelete(item)}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-semibold text-[#dc2626] hover:bg-[#fef2f2]"
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
