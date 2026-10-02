"use client";

import Link from "next/link";
import { BookOpen, Mail } from "lucide-react";

export function HelpPage() {
  return (
    <div className="space-y-4">
      <div className="panel-card p-5">
        <h1 className="text-[18px] font-extrabold text-[var(--text-primary)]">Help</h1>
        <p className="mt-1 text-[13px] text-[var(--text-tertiary)]">
          Support for Kavach families and caregivers
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <a
          href="mailto:support@kavach.care"
          className="panel-card flex flex-col gap-3 p-5 transition-colors hover:border-primary"
        >
          <Mail className="h-5 w-5 text-primary" />
          <p className="text-[14px] font-bold text-[var(--text-primary)]">Email support</p>
          <p className="text-[12px] text-[var(--text-secondary)]">support@kavach.care</p>
        </a>
        <Link
          href="/dashboard/reports"
          className="panel-card flex flex-col gap-3 p-5 transition-colors hover:border-primary"
        >
          <BookOpen className="h-5 w-5 text-primary" />
          <p className="text-[14px] font-bold text-[var(--text-primary)]">Care Brief</p>
          <p className="text-[12px] text-[var(--text-secondary)]">Live summary from the Care Record</p>
        </Link>
      </div>

      <div className="panel-card p-5">
        <h2 className="text-[15px] font-bold text-[var(--text-primary)]">How ordering works</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-[13px] leading-relaxed text-[var(--text-secondary)]">
          <li>Optional: link Swiggy (Food + Instamart) or Zepto under <Link href="/dashboard/integrations" className="font-semibold text-primary">Integrations</Link> → <b>Connect</b>, so orders need no OTP.</li>
          <li>Save delivery places in the <Link href="/dashboard/addresses" className="font-semibold text-primary">Address Book</Link> — Saheli only delivers to these.</li>
          <li>On WhatsApp, just ask Saheli, e.g. &ldquo;doodh mangwa do&rdquo; or &ldquo;order dal makhani from Swiggy&rdquo;.</li>
          <li>Saheli shows real items and prices, and orders only after the reply <b>confirm</b>. Always Cash on Delivery.</li>
        </ol>
        <p className="mt-4 text-[12px] text-[var(--text-tertiary)]">
          Press ⌘K (Ctrl+K) anywhere in the dashboard to search reports, chats, and people.
        </p>
      </div>
    </div>
  );
}
