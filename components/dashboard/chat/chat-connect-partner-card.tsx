"use client";

import { ExternalLink, Link2, Loader2, ShoppingBag, UtensilsCrossed, Zap } from "lucide-react";
import { useCallback, useState } from "react";
import { startMcpConnect, type SaheliConnectSuggestion } from "@/lib/api";
import { useFamily } from "@/components/dashboard/family-context";
import { cn } from "@/lib/utils";

const partnerIcons = {
  zepto: Zap,
  swiggy: UtensilsCrossed,
  instamart: ShoppingBag,
} as const;

export function ChatConnectPartnerCard({ connect }: { connect: SaheliConnectSuggestion }) {
  const { activeFamilyId } = useFamily();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [authUrl, setAuthUrl] = useState(connect.connectUrl ?? "");

  const openConnect = useCallback(
    async (url?: string | null) => {
      let target = url ?? authUrl;
      if (!target && activeFamilyId) {
        setBusy(true);
        setError("");
        try {
          const { data } = await startMcpConnect(activeFamilyId, connect.connectPartner);
          target = data?.authorizationUrl ?? "";
          if (target) setAuthUrl(target);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not start connect");
          setBusy(false);
          return;
        }
        setBusy(false);
      }

      if (!target) {
        setError("Connect link unavailable — try Integrations page.");
        return;
      }

      window.open(target, "_blank", "noopener,noreferrer,width=520,height=720");
    },
    [activeFamilyId, authUrl, connect.connectPartner],
  );

  const PartnerIcon = partnerIcons[connect.connectPartner] ?? Link2;

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-amber-500/30 bg-amber-500/5">
      <div className="flex items-center gap-2.5 border-b border-amber-500/15 px-3.5 py-2.5">
        <PartnerIcon className="h-4 w-4 text-amber-600" />
        <span className="text-[12px] font-bold text-amber-900 dark:text-amber-200">
          Connect {connect.partnerLabel}
        </span>
      </div>
      <div className="space-y-3 px-3.5 py-3">
        <p className="text-[12px] leading-relaxed text-[var(--text-secondary)]">
          Link your {connect.partnerLabel} account once — then Saheli can search items, build a cart,
          and place orders from this chat.
        </p>
        {connect.connectPartner === "instamart" && (
          <p className="rounded-lg bg-[var(--input-bg)] px-2.5 py-2 text-[11px] text-[var(--text-tertiary)]">
            Instamart is separate from Swiggy Food. Same Swiggy login, but connect groceries here.
          </p>
        )}
        {connect.connectPartner === "swiggy" && (
          <p className="rounded-lg bg-[var(--input-bg)] px-2.5 py-2 text-[11px] text-[var(--text-tertiary)]">
            Swiggy Food covers restaurant orders. For groceries, connect Instamart separately.
          </p>
        )}
        {error && <p className="text-[11px] font-medium text-red-600">{error}</p>}
        <button
          type="button"
          disabled={busy}
          onClick={() => void openConnect()}
          className={cn(
            "inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[12px] font-bold text-white",
            "bg-amber-600 hover:bg-amber-700 disabled:opacity-60",
          )}
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
          Connect {connect.partnerLabel}
        </button>
      </div>
    </div>
  );
}
