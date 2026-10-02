"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Check, SignOut } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { logout } from "@/lib/api";
import { useFamily } from "@/components/dashboard/family-context";
import { FamilyAccessBanner } from "@/components/dashboard/family-access-banner";
import { CareRecipientViewRightPanel } from "@/components/dashboard/family/care-recipient-view-right-panel";
import { CareRecipientProfileProvider } from "@/components/dashboard/family/care-recipient-profile-context";
import { CareRecipientScheduleProvider } from "@/components/dashboard/family/care-recipient-schedule-context";
import { RecipientDateProvider } from "@/components/dashboard/recipient/recipient-date-context";
import { cn } from "@/lib/utils";
import { PersonProvider, usePerson } from "./person-context";
import { CareShell, type NavKey } from "./shell";

function navFor(pathname: string): NavKey {
  if (pathname === "/dashboard") return "home";
  if (pathname.startsWith("/dashboard/saheli/care")) return "care";
  if (pathname.startsWith("/dashboard/saheli/tasks") || pathname.startsWith("/dashboard/approvals")) return "orders";
  if (pathname.startsWith("/dashboard/saheli/memory")) return "memory";
  if (pathname.startsWith("/dashboard/saheli") || pathname.startsWith("/dashboard/activity") || pathname.startsWith("/dashboard/alerts")) return "today";
  if (pathname.startsWith("/dashboard/record") || pathname.startsWith("/dashboard/reports") || /health-record/.test(pathname)) return "health";
  if (pathname.startsWith("/dashboard/chat")) return "saheli";
  if (pathname.startsWith("/dashboard/family") || pathname.startsWith("/dashboard/addresses")) return "family";
  return "settings";
}

const MENU = [
  { href: "/dashboard/notifications", label: "Notifications" },
  { href: "/dashboard/approvals", label: "Approvals" },
  { href: "/dashboard/addresses", label: "Address book" },
  { href: "/dashboard/reports", label: "Reports" },
  { href: "/dashboard/integrations", label: "Connected apps" },
  { href: "/dashboard/billing", label: "Billing" },
  { href: "/dashboard/settings", label: "Settings" },
  { href: "/dashboard/help", label: "Help" },
];

function Menu({ onClose }: { onClose: () => void }) {
  const { families, activeFamilyId, selectFamily } = useFamily();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const off = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && onClose();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", off);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", off);
      document.removeEventListener("keydown", esc);
    };
  }, [onClose]);
  return (
    <div ref={ref} role="menu" className="absolute right-0 top-14 z-50 w-72 rounded-[22px] border border-[var(--c-line)] bg-[var(--c-frame)] p-2 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.3)]">
      {families.length > 0 && (
        <div className="border-b border-[var(--c-line)] px-2 pb-2">
          <p className="px-2 pb-1 pt-1 text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--c-ink-3)]">Families</p>
          {families.map((f) => (
            <button
              key={f.familyId}
              type="button"
              role="menuitem"
              onClick={() => {
                void selectFamily(f.familyId);
                onClose();
              }}
              className="flex w-full items-center justify-between rounded-[12px] px-2 py-2 text-left text-[13px] hover:bg-[var(--c-card)]"
            >
              <span className="truncate">{f.name}</span>
              {f.familyId === activeFamilyId && <Check size={14} weight="bold" />}
            </button>
          ))}
        </div>
      )}
      <div className="p-2">
        {MENU.map((m) => (
          <Link key={m.href} href={m.href} role="menuitem" onClick={onClose} className="block rounded-[12px] px-2 py-2 text-[13px] hover:bg-[var(--c-card)]">
            {m.label}
          </Link>
        ))}
        <button
          type="button"
          role="menuitem"
          onClick={async () => {
            await logout().catch(() => undefined);
            await signOut({ redirect: false });
            router.replace("/auth/login");
          }}
          className="mt-1 flex w-full items-center gap-2 rounded-[12px] px-2 py-2 text-left text-[13px] text-[var(--c-accent)] hover:bg-[var(--c-card)]"
        >
          <SignOut size={15} /> Sign out
        </button>
      </div>
    </div>
  );
}

function Inner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { people, selectedId, select, me, unread } = usePerson();
  const { familyAccessAlert, dismissFamilyAccessAlert } = useFamily();
  const [menu, setMenu] = useState(false);
  const isRecipientView = /^\/dashboard\/family\/[^/]+$/.test(pathname);
  const isRecipientRoute = /^\/dashboard\/family\/[^/]+(\/health-record)?$/.test(pathname);
  const fullBleed = pathname === "/dashboard/chat";

  let body = (
    <div className={cn(isRecipientView && "grid gap-5 xl:grid-cols-[1fr_340px]", fullBleed && "h-full")}>
      <div className={cn("min-w-0", fullBleed && "flex h-full flex-col")}>
        {familyAccessAlert && <FamilyAccessBanner alert={familyAccessAlert} onDismiss={dismissFamilyAccessAlert} />}
        {children}
      </div>
      {isRecipientView && (
        <aside className="min-w-0">
          <CareRecipientViewRightPanel />
        </aside>
      )}
    </div>
  );
  if (isRecipientRoute) {
    body = (
      <CareRecipientScheduleProvider>
        {isRecipientView ? (
          <CareRecipientProfileProvider>
            <RecipientDateProvider>{body}</RecipientDateProvider>
          </CareRecipientProfileProvider>
        ) : (
          body
        )}
      </CareRecipientScheduleProvider>
    );
  }

  return (
    <CareShell
      active={navFor(pathname)}
      people={people}
      selectedId={selectedId}
      onSelectPerson={select}
      me={{ name: me.name || "there" }}
      alerts={unread}
      onMenu={() => setMenu((v) => !v)}
      menu={menu ? <Menu onClose={() => setMenu(false)} /> : null}
    >
      {body}
    </CareShell>
  );
}

export function CareOsFrame({ children }: { children: React.ReactNode }) {
  return (
    <PersonProvider>
      <Inner>{children}</Inner>
    </PersonProvider>
  );
}
