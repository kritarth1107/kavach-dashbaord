"use client";

import Link from "next/link";
import { CaretDown, Check, Plus } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { Person } from "./shell";
import { Avatar } from "./ui";

function handle(p: Person) {
  return p.relation ? `@${p.relation.toLowerCase().replace(/\s+/g, "")}` : "care recipient";
}

/** The topbar pill: who you are looking after right now; click to switch between everyone in the family. */
export function PersonPicker({
  people,
  loading,
  selectedId,
  onSelect,
}: {
  people: Person[];
  loading?: boolean;
  selectedId: string | null;
  onSelect?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const person = people.find((p) => p.id === selectedId) ?? people[0];

  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", off);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", off);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  if (!person && loading) {
    return <div className="h-[42px] w-[180px] animate-pulse rounded-full bg-[var(--c-card)]" aria-hidden />;
  }
  if (!person) {
    return (
      <Link href="/dashboard/family/new" className="flex h-12 items-center gap-2 rounded-full border border-[var(--c-line)] px-4 text-[13px] font-medium hover:bg-[var(--c-card)]">
        <Plus size={16} weight="bold" /> Add someone to care for
      </Link>
    );
  }

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Caring for ${person.name}. Switch person`}
        className="flex min-w-0 items-center gap-2.5 rounded-full bg-[var(--c-card)] py-1 pl-1 pr-3 text-left transition-colors hover:bg-[#ebedee]"
      >
        <Avatar name={person.name} src={person.photo} size={34} />
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-[13px] font-medium">{person.name}</span>
          <span className="block truncate text-[11px] text-[var(--c-ink-3)]">{handle(person)}</span>
        </span>
        <CaretDown size={13} weight="bold" className={cn("ml-1 shrink-0 text-[var(--c-ink-2)] transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div role="listbox" className="absolute left-0 top-[calc(100%+8px)] z-50 w-[300px] rounded-[22px] border border-[var(--c-line)] bg-[var(--c-frame)] p-2 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.3)]">
          <p className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--c-ink-3)]">Caring for</p>
          {people.map((p) => {
            const on = p.id === person.id;
            return (
              <button
                key={p.id}
                type="button"
                role="option"
                aria-selected={on}
                onClick={() => {
                  onSelect?.(p.id);
                  setOpen(false);
                }}
                className={cn("flex w-full items-center gap-3 rounded-[16px] px-2 py-2 text-left", on ? "bg-[var(--c-card)]" : "hover:bg-[var(--c-card)]")}
              >
                <Avatar name={p.name} src={p.photo} size={36} />
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate text-[13px] font-medium">{p.name}</span>
                  <span className="block truncate text-[11px] text-[var(--c-ink-3)]">{handle(p)}</span>
                </span>
                {on && <Check size={16} weight="bold" className="text-[var(--c-accent)]" />}
              </button>
            );
          })}
          <Link
            href="/dashboard/family/new?role=care_recipient"
            onClick={() => setOpen(false)}
            className="mt-1 flex items-center gap-3 rounded-[16px] border-t border-[var(--c-line)] px-2 pb-1.5 pt-3 text-[13px] font-medium hover:text-[var(--c-accent)]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-[var(--c-ink-3)]">
              <Plus size={15} weight="bold" />
            </span>
            Add someone to care for
          </Link>
        </div>
      )}
    </div>
  );
}
