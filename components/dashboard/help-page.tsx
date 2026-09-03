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
    </div>
  );
}
