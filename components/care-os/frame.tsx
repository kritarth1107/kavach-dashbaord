"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Bell,
  Brain,
  CaretRight,
  ChartBar,
  Check,
  CheckCircle,
  CreditCard,
  FirstAidKit,
  Gear,
  Heart,
  ListChecks,
  MapPin,
  Plugs,
  Question,
  SignOut,
  Siren,
  Stethoscope,
  UsersThree,
  Wallet,
  X,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";
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
import { Avatar } from "./ui";

function navFor(pathname: string): NavKey {
  if (pathname === "/dashboard") return "home";
  if (pathname.startsWith("/dashboard/saheli/care")) return "care";
  if (pathname.startsWith("/dashboard/saheli/tasks") || pathname.startsWith("/dashboard/approvals")) return "orders";
  if (pathname.startsWith("/dashboard/saheli/memory")) return "memory";
  if (pathname.startsWith("/dashboard/saheli") || pathname.startsWith("/dashboard/activity") || pathname.startsWith("/dashboard/alerts")) return "today";
  if (
    pathname.startsWith("/dashboard/record") ||
    pathname.startsWith("/dashboard/reports") ||
    pathname.startsWith("/dashboard/report") ||
    pathname.startsWith("/dashboard/emergency") ||
    pathname.startsWith("/dashboard/care-team") ||
    pathname.startsWith("/dashboard/wellbeing") ||
    /health-record/.test(pathname)
  )
    return "health";
  if (
    pathname.startsWith("/dashboard/family") ||
    pathname.startsWith("/dashboard/addresses") ||
    pathname.startsWith("/dashboard/spending")
  )
    return "family";
  return "settings";
}

const MENU: Array<{ group: string; phoneOnly?: boolean; items: Array<{ href: string; label: string; icon: PhosphorIcon }> }> = [
  {
    // On phones the icon rail becomes a five-tab bar; these rail pages move here.
    group: "Care records",
    phoneOnly: true,
    items: [
      { href: "/dashboard/record", label: "Health records", icon: FirstAidKit },
      { href: "/dashboard/saheli/memory", label: "What Saheli knows", icon: Brain },
    ],
  },
  {
    group: "Care",
    items: [
      { href: "/dashboard/emergency", label: "Emergency card", icon: Siren },
      { href: "/dashboard/care-team", label: "Care team & appointments", icon: Stethoscope },
      { href: "/dashboard/report", label: "Care report for the doctor", icon: ChartBar },
      { href: "/dashboard/wellbeing", label: "Wellbeing", icon: Heart },
      { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
      { href: "/dashboard/approvals", label: "Approvals", icon: CheckCircle },
    ],
  },
  {
    group: "Family",
    items: [
      { href: "/dashboard/family-tasks", label: "Family tasks", icon: ListChecks },
      { href: "/dashboard/spending", label: "Spending", icon: Wallet },
      { href: "/dashboard/addresses", label: "Address book", icon: MapPin },
    ],
  },
  {
    group: "Account",
    items: [
      { href: "/dashboard/family", label: "Family members", icon: UsersThree },
      { href: "/dashboard/integrations", label: "Connected apps", icon: Plugs },
      { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
      { href: "/dashboard/settings", label: "Settings", icon: Gear },
      { href: "/dashboard/help", label: "Help", icon: Question },
    ],
  },
];

function Drawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { families, activeFamilyId, selectFamily } = useFamily();
  const { me } = usePerson();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  return (
    <div className={cn("fixed inset-0 z-[60]", !open && "pointer-events-none")} aria-hidden={!open}>
      <button
        type="button"
        aria-label="Close menu"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
        className={cn("absolute inset-0 bg-[rgba(20,42,34,0.28)] transition-opacity duration-300", open ? "opacity-100" : "opacity-0")}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className={cn(
          "care-os absolute inset-y-0 right-0 flex w-full max-w-[380px] flex-col bg-[var(--c-frame)] transition-[transform,visibility] duration-300 ease-out",
          open ? "visible translate-x-0 shadow-[-30px_0_80px_-40px_rgba(0,0,0,0.35)]" : "invisible translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-6 pb-4 pt-6">
          <div className="flex items-center gap-3">
            <Avatar name={me.name || "You"} src={me.avatar} size={44} />
            <div className="leading-tight">
              <p className="text-[15px] font-medium">{me.name || "Your account"}</p>
              <p className="text-[12px] text-[var(--c-ink-3)]">Kavach CareOS</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--c-line)] hover:bg-[var(--c-card)]">
            <X size={18} />
          </button>
        </div>
        <div className="c-scroll flex-1 overflow-y-auto px-4 pb-4">
          {families.length > 0 && (
            <section className="rounded-[22px] border border-[var(--c-line)] p-2">
              <p className="flex items-center gap-2 px-3 pb-1 pt-2 text-[12px] font-medium">
                <span className="h-3 w-3 rounded-[3px] bg-[var(--c-accent)]" /> Family
              </p>
              {families.map((f) => (
                <button
                  key={f.familyId}
                  type="button"
                  onClick={() => {
                    void selectFamily(f.familyId);
                    onClose();
                  }}
                  className={cn("flex w-full items-center gap-3 rounded-[16px] px-3 py-2.5 text-left", f.familyId === activeFamilyId ? "bg-[var(--c-card)]" : "hover:bg-[var(--c-card)]")}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--c-ink)] text-[12px] font-medium text-white">{f.initial || f.name[0]}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium">{f.name}</span>
                    <span className="block text-[11px] text-[var(--c-ink-3)]">{f.roleLabel}</span>
                  </span>
                  {f.familyId === activeFamilyId && <Check size={15} weight="bold" className="text-[var(--c-accent)]" />}
                </button>
              ))}
            </section>
          )}
          {MENU.map((g) => (
            <section key={g.group} className={cn("mt-5", g.phoneOnly && "md:hidden")}>
              <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--c-ink-3)]">{g.group}</p>
              {g.items.map((m) => {
                const on = pathname === m.href;
                return (
                  <Link
                    key={m.href}
                    href={m.href}
                    onClick={onClose}
                    className={cn("flex items-center gap-3 rounded-[16px] px-3 py-2.5 text-[14px]", on ? "bg-[var(--c-card)] font-medium" : "hover:bg-[var(--c-card)]")}
                  >
                    <span className={cn("flex h-9 w-9 items-center justify-center rounded-full border", on ? "border-transparent bg-[var(--c-accent)] text-white" : "border-[var(--c-line)]")}>
                      <m.icon size={17} />
                    </span>
                    {m.label}
                    <CaretRight size={13} className="ml-auto text-[var(--c-ink-3)]" />
                  </Link>
                );
              })}
            </section>
          ))}
        </div>
        <div className="border-t border-[var(--c-line)] px-4 py-3">
          <button
            type="button"
            onClick={async () => {
              await logout().catch(() => undefined);
              await signOut({ redirect: false });
              router.replace("/auth/login");
            }}
            className="flex items-center gap-2 px-3 py-2 text-[14px] font-medium text-[#d92d20] hover:underline"
          >
            <SignOut size={17} /> Sign out
          </button>
        </div>
      </aside>
    </div>
  );
}

function Inner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { people, selectedId, select, me, unread, loading } = usePerson();
  const { familyAccessAlert, dismissFamilyAccessAlert } = useFamily();
  const [menu, setMenu] = useState(false);
  const closeMenu = useCallback(() => setMenu(false), []);
  const isRecipientView = /^\/dashboard\/family\/[^/]+$/.test(pathname);
  const isRecipientRoute = /^\/dashboard\/family\/[^/]+(\/health-record)?$/.test(pathname);
  const fullBleed = false;

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
      loadingPeople={loading}
      selectedId={selectedId}
      onSelectPerson={select}
      me={{ name: me.name || "there" }}
      alerts={unread}
      onMenu={() => setMenu(true)}
    >
      {body}
      <Drawer open={menu} onClose={closeMenu} />
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
