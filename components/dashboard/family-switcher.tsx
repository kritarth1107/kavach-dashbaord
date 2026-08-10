"use client";

import { Check, ChevronsUpDown, Loader2, Plus, Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { familyAvatarColor, useFamily } from "./family-context";

type FamilySwitcherProps = {
  collapsed: boolean;
};

export function FamilySwitcher({ collapsed }: FamilySwitcherProps) {
  const {
    families,
    activeFamily,
    loading,
    switching,
    selectFamily,
    setAsPrimaryFamily,
    createNewFamily,
  } = useFamily();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleCreate() {
    const name = window.prompt("Family name");
    if (!name?.trim()) return;

    try {
      await createNewFamily(name.trim());
      setOpen(false);
    } catch {
      // error surfaced via context
    }
  }

  if (loading || !activeFamily) {
    return (
      <div className={cn("mb-5 px-2", collapsed ? "flex justify-center" : "")}>
        <div
          className={cn(
            "animate-pulse rounded-xl bg-[#f3f4f6]",
            collapsed ? "h-8 w-8" : "h-[52px] w-full",
          )}
        />
      </div>
    );
  }

  const primaryFamily = families.find((family) => family.isPrimary);

  return (
    <div
      ref={ref}
      className={cn("relative mb-5", collapsed ? "px-2" : "px-2")}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={switching}
        title={collapsed ? activeFamily.name : undefined}
        className={cn(
          "flex w-full items-center rounded-xl border border-[#e5e7eb] bg-white text-left transition-colors hover:bg-[#fafafa]",
          collapsed
            ? "justify-center border-none bg-transparent p-0 hover:bg-transparent"
            : "gap-3 px-3 py-2.5",
          switching && "opacity-70",
        )}
      >
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
          style={{
            backgroundColor: familyAvatarColor(
              Math.max(
                0,
                families.findIndex((f) => f.familyId === activeFamily.familyId),
              ),
            ),
          }}
        >
          {switching ? (
            <Loader2 className="h-4 w-4 animate-spin text-white" />
          ) : (
            activeFamily.initial
          )}
        </div>
        {!collapsed && (
          <>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-[13px] font-semibold text-[#111827]">
                  {activeFamily.name}
                </p>
                {activeFamily.isPrimary && (
                  <span className="shrink-0 rounded bg-[#fef9c3] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#a16207]">
                    Primary
                  </span>
                )}
              </div>
              <p className="truncate text-[10px] font-medium uppercase tracking-wide text-[#9ca3af]">
                {activeFamily.switcherRoleBadge}
                {!activeFamily.isPrimary && primaryFamily
                  ? ` · Primary: ${primaryFamily.name}`
                  : ""}
              </p>
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-[#9ca3af]" strokeWidth={2} />
          </>
        )}
      </button>

      {open && (
        <div
          className={cn(
            "absolute z-50 overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.08)]",
            collapsed
              ? "left-full top-0 ml-2 w-72"
              : "left-2 right-2 top-full mt-1.5",
          )}
        >
          <p className="px-3 pb-2 pt-3 text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">
            Switch family
          </p>
          {families.map((family, index) => {
            const selected = family.familyId === activeFamily.familyId;
            return (
              <div
                key={family.familyId}
                className={cn(
                  "flex items-center gap-1 px-2 py-1",
                  selected ? "bg-primary-light/60" : "hover:bg-[#f9fafb]",
                )}
              >
                <button
                  type="button"
                  disabled={switching}
                  onClick={() => {
                    void selectFamily(family.familyId)
                      .then(() => setOpen(false))
                      .catch(() => undefined);
                  }}
                  className={cn(
                    "flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1 py-1.5 text-left transition-colors",
                    switching && "opacity-60",
                  )}
                >
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
                    style={{ backgroundColor: familyAvatarColor(index) }}
                  >
                    {family.initial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p
                        className={cn(
                          "truncate text-[13px] font-semibold",
                          selected ? "text-primary" : "text-[#111827]",
                        )}
                      >
                        {family.name}
                      </p>
                      {family.isPrimary && (
                        <span className="shrink-0 rounded bg-[#fef9c3] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#a16207]">
                          Primary
                        </span>
                      )}
                    </div>
                    <p
                      className={cn(
                        "truncate text-[10px] font-medium uppercase tracking-wide",
                        selected ? "text-[#4ade80]" : "text-[#9ca3af]",
                      )}
                    >
                      {family.switcherRoleBadge}
                    </p>
                  </div>
                  {selected && (
                    <Check className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.5} />
                  )}
                </button>
                {!family.isPrimary && (
                  <button
                    type="button"
                    disabled={switching}
                    title="Set as primary family"
                    onClick={(e) => {
                      e.stopPropagation();
                      void setAsPrimaryFamily(family.familyId).catch(() => undefined);
                    }}
                    className="shrink-0 rounded-lg p-2 text-[#9ca3af] transition-colors hover:bg-white hover:text-[#a16207]"
                  >
                    <Star className="h-4 w-4" strokeWidth={2} />
                  </button>
                )}
              </div>
            );
          })}
          <div className="border-t border-[#f0f0f2] p-2">
            <button
              type="button"
              disabled={switching}
              onClick={() => void handleCreate()}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-[13px] font-medium text-[#374151] transition-colors hover:bg-[#f9fafb] disabled:opacity-60"
            >
              <Plus className="h-4 w-4 text-[#6b7280]" strokeWidth={2} />
              Create new
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
