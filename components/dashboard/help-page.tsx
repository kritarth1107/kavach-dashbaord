"use client";

import Link from "next/link";
import { BookOpen, Mail, MessageSquare } from "lucide-react";

export function HelpPage() {
  return (
    <div className="space-y-4">
      <div className="panel-card p-5">
        <h1 className="text-[18px] font-extrabold text-[var(--text-primary)]">Help</h1>
        <p className="mt-1 text-[13px] text-[var(--text-tertiary)]">
          Pilot support for Vish/Sudha demo and Kavach caregivers
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
          href="/dashboard/chat"
          className="panel-card flex flex-col gap-3 p-5 transition-colors hover:border-primary"
        >
          <MessageSquare className="h-5 w-5 text-primary" />
          <p className="text-[14px] font-bold text-[var(--text-primary)]">Ask Saheli</p>
          <p className="text-[12px] text-[var(--text-secondary)]">In-app companion for care questions</p>
        </Link>
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
        <h2 className="text-[15px] font-bold text-[var(--text-primary)]">How to order from Swiggy</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-[13px] leading-relaxed text-[var(--text-secondary)]">
          <li>Connect Swiggy under Integrations and tap Sync addresses.</li>
          <li>Open Ask Saheli and say e.g. &ldquo;Order dal makhani from Swiggy for lunch.&rdquo;</li>
          <li>Pick a delivery address, browse dishes, and add items to your basket.</li>
          <li>Confirm the basket — a family member approves before checkout.</li>
        </ol>
        <p className="mt-4 text-[12px] text-[var(--text-tertiary)]">
          Press ⌘K (Ctrl+K) anywhere in the dashboard to search reports, chats, and people.
        </p>
      </div>
    </div>
  );
}
