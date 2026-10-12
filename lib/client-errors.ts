/**
 * A page or panel that crashed in someone's browser tells the server, so it shows in the dashboard's logs (founder
 * 2026-10-12: the Memory page showed "This page couldn't load" and nothing anywhere said so). Only the error's own
 * words, where it happened and the page path go; never the page's data.
 */
const sent = new Set<string>();

export function reportClientError(error: unknown, where: string): void {
  if (typeof window === "undefined") return;
  const e = error instanceof Error ? error : new Error(String(error));
  const key = `${where}|${e.message}`;
  if (sent.has(key) || sent.size > 20) return; // once per error per page load
  sent.add(key);
  const body = JSON.stringify({
    where,
    path: window.location.pathname + window.location.search,
    message: e.message.slice(0, 500),
    digest: (e as Error & { digest?: string }).digest ?? null,
    stack: (e.stack ?? "").split("\n").slice(0, 8).join("\n").slice(0, 1500),
  });
  try {
    if (navigator.sendBeacon?.("/api/client-error", new Blob([body], { type: "application/json" }))) return;
  } catch {
    // fall through to fetch
  }
  void fetch("/api/client-error", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => undefined);
}
