"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  getFactHistory,
  resolveFact,
  saveFact,
  stopFact,
  SOURCE_LABEL,
  type CareFact,
} from "@/lib/care-memory-api";
import { getMemoryHistory, undoMemoryChange, type MemoryChange } from "@/lib/care-features-api";
import { useCareOverview } from "@/components/dashboard/saheli/saheli-shared";
import { callName, usePerson } from "./person-context";

const IST = "Asia/Kolkata";
const NEW_MS = 14 * 86_400_000;

type Bucket = "habits" | "foods" | "preferences";

/** Where a fact sits. Unknown learned keys still show, under habits and times. */
function bucketOf(fact: CareFact): Bucket {
  if (fact.domain === "preference" || fact.key.startsWith("preference:")) return "preferences";
  const rest = fact.key.startsWith("learned:") ? fact.key.slice("learned:".length) : fact.key;
  if (rest === "nudges_meals_portions" || rest.endsWith("_portions")) return "foods";
  return "habits";
}

function shown(fact: CareFact): boolean {
  return fact.domain === "learned" || fact.domain === "preference" || fact.key.startsWith("learned:") || fact.key.startsWith("preference:");
}

function domainOf(fact: CareFact): string {
  if (fact.domain) return fact.domain;
  const cut = fact.key.indexOf(":");
  return cut > 0 ? fact.key.slice(0, cut) : "learned";
}

/** The slug the engine's stop and remember use. The stored key wins over a display name. */
function factName(fact: CareFact): string {
  const prefix = `${domainOf(fact)}:`;
  if (fact.key.startsWith(prefix)) return fact.key.slice(prefix.length);
  return fact.name || fact.key;
}

function textOf(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return "";
}

function valueOf(fact: CareFact): Record<string, unknown> {
  return fact.value && typeof fact.value === "object" && !Array.isArray(fact.value) ? fact.value : {};
}

/** 14 or "14:00" or "08:30" as a clock a person would say. */
function clockPhrase(raw: unknown): string {
  let h = -1;
  let min = 0;
  if (typeof raw === "number" && Number.isInteger(raw)) h = raw;
  else {
    const m = /^(\d{1,2}):(\d{2})$/.exec(textOf(raw));
    if (!m) return "";
    h = Number(m[1]);
    min = Number(m[2]);
  }
  if (h < 0 || h > 23 || min < 0 || min > 59) return "";
  const hour = h % 12 || 12;
  return `${hour}${min ? `:${String(min).padStart(2, "0")}` : ""} ${h >= 12 ? "pm" : "am"}`;
}

function joinAnd(parts: string[]): string {
  if (parts.length <= 1) return parts[0] || "";
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/** Consecutive hours read as the window they cover: 14 and 15 is 2–4 pm. One hour stays "2 pm". */
function hourSpan(hours: number[]): string {
  const xs = [...new Set(hours.filter((h) => Number.isInteger(h) && h >= 0 && h <= 23))].sort((a, b) => a - b);
  const groups: number[][] = [];
  for (const h of xs) {
    const last = groups[groups.length - 1];
    if (last && h === last[last.length - 1] + 1) last.push(h);
    else groups.push([h]);
  }
  return joinAnd(
    groups.map((g) => {
      if (g.length === 1) return clockPhrase(g[0]);
      const start = clockPhrase(g[0]);
      const end = clockPhrase(g[g.length - 1] + 1 === 24 ? 0 : g[g.length - 1] + 1);
      const sm = start.match(/ (am|pm)$/);
      const em = end.match(/ (am|pm)$/);
      if (sm && em && sm[1] === em[1]) return `${start.slice(0, sm.index)}–${end}`;
      return `${start}–${end}`;
    }),
  );
}

const MEAL_WORD: Record<string, string> = { breakfast: "breakfast", lunch: "lunch", snack: "a snack", dinner: "dinner" };

function mealBits(row: Record<string, unknown>): string[] {
  return ["breakfast", "lunch", "snack", "dinner"].flatMap((slot) => {
    const when = clockPhrase(row[slot]);
    return when ? [`${MEAL_WORD[slot]} around ${when}`] : [];
  });
}

function mealSentence(value: Record<string, unknown>): string {
  const bits = mealBits(value);
  const weekend = value.weekend;
  if (weekend && typeof weekend === "object" && !Array.isArray(weekend)) {
    const extra = mealBits(weekend as Record<string, unknown>).map((s) => s.replace(" around ", " "));
    if (extra.length) bits.push(`weekends ${joinAnd(extra)}`);
  }
  return bits.length ? `Usually has ${joinAnd(bits)}.` : "";
}

function waterSentence(value: Record<string, unknown>): string {
  const list = Array.isArray(value.times) ? value.times : Array.isArray(value.weekday) ? value.weekday : [];
  const times = list.map(clockPhrase).filter(Boolean);
  return times.length ? `Usually drinks water around ${joinAnd(times)}.` : "";
}

function quietSentence(key: string, value: Record<string, unknown>): string {
  const avoid = Array.isArray(value.avoid_hours) ? value.avoid_hours.filter((h): h is number => typeof h === "number") : [];
  const span = hourSpan(avoid);
  if (!span) return "";
  const preferList = Array.isArray(value.prefer_hours) ? value.prefer_hours.filter((h): h is number => typeof h === "number") : [];
  const prefer = typeof value.prefer_hour === "number" ? hourSpan([value.prefer_hour]) : hourSpan(preferList);
  const nightly = key === "timing_messages";
  if (!prefer) return nightly ? `Rarely answers around ${span}.` : `Saheli stays quiet around ${span}.`;
  return nightly
    ? `Rarely answers around ${span}; Saheli writes around ${prefer} instead.`
    : `Doesn't answer around ${span}; Saheli asks around ${prefer} instead.`;
}

/** A sentence from the stored hours when the engine sent no line of its own. */
function sentenceFrom(fact: CareFact): string {
  const value = valueOf(fact);
  const rest = fact.key.startsWith("learned:") ? fact.key.slice("learned:".length) : fact.key;
  if (rest === "nudges_ask_hours" || rest === "timing_messages") return quietSentence(rest, value);
  if (rest === "nudges_meals_times" || rest === "nudges_meals_clocks") return mealSentence(value);
  if (rest === "nudges_water_times") return waterSentence(value);
  return "";
}

function lineOf(fact: CareFact): string {
  const text = textOf(fact.text);
  if (text && !text.startsWith("{") && !text.startsWith("[")) return text;
  const built = sentenceFrom(fact);
  if (built) return built;
  const pills = portionPills(fact.value);
  if (pills.length) return pills.join(", ");
  return "Something Saheli learned";
}

function portionPills(value: Record<string, unknown> | null | undefined): string[] {
  const items = value?.items;
  if (!items || typeof items !== "object" || Array.isArray(items)) return [];
  const out: string[] = [];
  for (const [name, raw] of Object.entries(items as Record<string, unknown>)) {
    const label = textOf(name).replaceAll("_", " ");
    if (!label) continue;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      out.push(label);
      continue;
    }
    const row = raw as Record<string, unknown>;
    const extra = [textOf(row.quantity ?? row.qty), textOf(row.unit)].filter(Boolean).join(" ");
    out.push(extra ? `${label} · ${extra}` : label);
  }
  return out;
}

function evidenceOf(value: Record<string, unknown> | null | undefined): string {
  return textOf(value?.evidence);
}

const SOURCE: Record<string, string> = {
  ...SOURCE_LABEL,
  learned: "From her meals and replies",
  nightly: "Learned overnight",
};

function sourceLabel(source: string): string {
  return SOURCE[source] ?? "From what she noticed";
}

function whenLabel(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  return new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: IST });
}

function earlierOf(fact: CareFact, versions: CareFact[]): CareFact | null {
  const current = textOf(fact.text);
  const older = versions.filter((v) => v.id !== fact.id && v.status !== "active" && v.status !== "pending" && textOf(v.text) && textOf(v.text) !== current);
  if (!older.length) return null;
  return [...older].sort((a, b) => Date.parse(b.recordedAt || "") - Date.parse(a.recordedAt || ""))[0] ?? null;
}

function restoreId(key: string, earlier: CareFact, changes: MemoryChange[]): number | null {
  const want = textOf(earlier.text);
  const mine = changes.filter((c) => c && c.target === key);
  const hit = mine.find((c) => textOf(c.body) === want);
  return hit ? hit.id : null;
}

function Row({
  line,
  meta,
  note,
  pills,
  fresh,
  label,
  busy,
  onUndo,
}: {
  line: string;
  meta: string;
  note?: string;
  pills?: string[];
  fresh?: boolean;
  label: string;
  busy: boolean;
  onUndo: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 border-t border-[var(--c-line)] px-4 py-3.5 sm:flex-row sm:items-start sm:gap-4 sm:px-[18px]">
      <div className="min-w-0 flex-1">
        <p className="text-[14.5px] font-medium leading-snug text-[var(--c-ink)]">
          {line}
          {fresh && (
            <span className="ml-2 inline-block rounded-full bg-[var(--c-accent)] px-2 py-px text-[11px] font-semibold text-[var(--c-accent-ink)]">New</span>
          )}
        </p>
        {pills && pills.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {pills.map((p) => (
              <span key={p} className="rounded-full bg-[var(--c-card)] px-2.5 py-1 text-[12.5px] text-[var(--c-ink)]">
                {p}
              </span>
            ))}
          </div>
        )}
        {meta && <p className="mt-1 text-[12.5px] text-[var(--c-ink-2)]">{meta}</p>}
        {note && <p className="mt-1 text-[12.5px] text-[var(--c-ink-3)]">{note}</p>}
      </div>
      <button
        type="button"
        aria-label={label}
        disabled={busy}
        onClick={onUndo}
        className="shrink-0 self-start rounded-full border border-[var(--c-line)] bg-[var(--c-frame)] px-3 py-1.5 text-[13px] font-medium text-[var(--c-ink)] hover:bg-[var(--c-card)] disabled:opacity-50"
      >
        Undo
      </button>
    </div>
  );
}

function Section({ title, lead, children }: { title: string; lead?: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-[18px] border border-[var(--c-line)] bg-[var(--c-frame)]">
      <div className="px-[18px] py-3">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[var(--c-ink)]">
          <span className="h-2 w-2 rounded-full bg-[var(--c-solid)]" aria-hidden />
          {title}
        </h2>
        {lead && <p className="mt-1 text-[12.5px] text-[var(--c-ink-2)]">{lead}</p>}
      </div>
      {children}
    </section>
  );
}

export function LearnedPage() {
  const { familyId, selectedId, selected } = usePerson();
  const { data, error, loading, reload } = useCareOverview(familyId, selectedId);
  const [versions, setVersions] = useState<Record<string, CareFact[]>>({});
  const [changes, setChanges] = useState<MemoryChange[]>([]);
  const [now, setNow] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  const facts = useMemo(() => {
    const all = [...(data?.facts ?? []), ...(data?.pending ?? [])];
    const seen = new Set<string>();
    return all.filter((f) => {
      if (!f?.id || seen.has(f.id)) return false;
      seen.add(f.id);
      if (f.status !== "active" && f.status !== "pending") return false;
      const owner = (f as { subjectId?: string }).subjectId;
      if (owner && selectedId && owner !== selectedId) return false;
      return shown(f);
    });
  }, [data, selectedId]);

  const sig = facts.map((f) => f.id).join(",");

  useEffect(() => {
    const t = setTimeout(() => setNow(Date.now()), 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!familyId || !selectedId || !facts.length) return;
    let live = true;
    const keys = facts.map((f) => f.key);
    Promise.all(
      keys.map(async (key) => {
        try {
          return [key, await getFactHistory(familyId, selectedId, key)] as const;
        } catch {
          return [key, [] as CareFact[]] as const;
        }
      }),
    ).then((rows) => {
      if (live) setVersions(Object.fromEntries(rows));
    });
    getMemoryHistory(familyId, selectedId, { kind: "fact", limit: 80 })
      .then((rows) => live && setChanges(rows))
      .catch(() => live && setChanges([]));
    return () => {
      live = false;
    };
  }, [familyId, selectedId, sig, facts]);

  const name = selected?.self ? "you" : callName(selected) || "them";
  const their = selected?.self ? "your" : "their";

  async function undoFact(fact: CareFact) {
    if (!familyId || !selectedId) return;
    setBusy(fact.id);
    setActionError("");
    try {
      if (fact.status === "pending") await resolveFact(familyId, selectedId, fact.key, false);
      else {
        await stopFact(familyId, selectedId, {
          domain: domainOf(fact),
          name: factName(fact),
          reason: "undone on What Saheli learned",
          wrong: false,
        });
      }
      reload();
    } catch {
      setActionError("That undo did not go through. Try again.");
    } finally {
      setBusy(null);
    }
  }

  async function undoCorrection(fact: CareFact, earlier: CareFact) {
    if (!familyId || !selectedId) return;
    setBusy(`restore:${fact.id}`);
    setActionError("");
    try {
      const id = restoreId(fact.key, earlier, changes);
      if (id != null) {
        await undoMemoryChange(familyId, selectedId, id, { mode: "restore", reason: "restore the earlier version" });
      } else {
        await saveFact(familyId, selectedId, {
          domain: domainOf(earlier),
          name: factName(earlier),
          details: earlier.value && typeof earlier.value === "object" ? earlier.value : {},
          sentence: textOf(earlier.text) || lineOf(fact),
        });
      }
      reload();
    } catch {
      setActionError("That undo did not go through. Try again.");
    } finally {
      setBusy(null);
    }
  }

  const groups: Record<Bucket, CareFact[]> = { habits: [], foods: [], preferences: [] };
  const corrections: Array<{ fact: CareFact; earlier: CareFact }> = [];
  for (const fact of facts) {
    groups[bucketOf(fact)].push(fact);
    const earlier = earlierOf(fact, versions[fact.key] ?? []);
    if (earlier) corrections.push({ fact, earlier });
  }

  const metaOf = (fact: CareFact) => [whenLabel(fact.recordedAt), sourceLabel(fact.source || "")].filter(Boolean).join(" · ");

  const renderFact = (fact: CareFact) => {
    const earlier = earlierOf(fact, versions[fact.key] ?? []);
    const when = earlier ? whenLabel(earlier.recordedAt) : "";
    const pills = bucketOf(fact) === "foods" ? portionPills(fact.value) : [];
    return (
      <Row
        key={fact.id}
        line={lineOf(fact)}
        pills={pills}
        fresh={now != null && Number.isFinite(Date.parse(fact.recordedAt)) && now - Date.parse(fact.recordedAt) < NEW_MS}
        meta={metaOf(fact)}
        note={
          [evidenceOf(fact.value), fact.status === "pending" ? "Waiting for a yes before she uses it." : "", earlier ? `Earlier version${when ? `, ${when}` : ""}: ${lineOf(earlier)}` : ""]
            .filter(Boolean)
            .join(" ")
        }
        label={`Undo ${lineOf(fact)}`}
        busy={busy === fact.id}
        onUndo={() => void undoFact(fact)}
      />
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 pb-4">
      <div>
        <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-[var(--c-ink)] sm:text-[34px]">What Saheli learned</h1>
        <p className="mt-2 max-w-xl text-[13.5px] leading-relaxed text-[var(--c-ink-2)]">
          About {name}, from {their} meals, replies and chats. Undo stops one thing, and she will not learn it again for 60 days.
        </p>
      </div>
      {error && !data && (
        <div className="rounded-[18px] border border-[var(--c-line)] bg-[var(--c-frame)] px-4 py-4">
          <p className="text-[14px] text-[var(--c-ink)]">Couldn&apos;t load what Saheli learned.</p>
          <button type="button" onClick={reload} className="mt-3 rounded-full bg-[var(--c-solid)] px-3 py-1.5 text-[13px] font-medium text-[var(--c-on-solid)]">
            Try again
          </button>
        </div>
      )}
      {actionError && <p className="text-[13px] text-[var(--c-ink-2)]">{actionError}</p>}
      {!error && !loading && facts.length === 0 && (
        <section className="rounded-[18px] border border-[var(--c-line)] bg-[var(--c-frame)] px-[18px] py-8">
          <h2 className="text-[16px] font-semibold text-[var(--c-ink)]">Nothing learned yet</h2>
          <p className="mt-2 max-w-md text-[13.5px] leading-relaxed text-[var(--c-ink-2)]">
            Meal, water and sleep times show up after about a week of {their} own logs. Likes show up when {selected?.self ? "you answer" : "they answer"} a follow-up. Anything she learns can be undone here.
          </p>
        </section>
      )}
      {groups.habits.length > 0 && <Section title="Habits and times">{groups.habits.map(renderFact)}</Section>}
      {groups.foods.length > 0 && <Section title="Usual foods">{groups.foods.map(renderFact)}</Section>}
      {groups.preferences.length > 0 && <Section title="Preferences">{groups.preferences.map(renderFact)}</Section>}
      {corrections.length > 0 && (
        <Section title="Corrections" lead="Undo puts the earlier version back.">
          {corrections.map(({ fact, earlier }) => {
            const when = whenLabel(earlier.recordedAt);
            return (
              <Row
                key={`c-${fact.id}`}
                line={lineOf(fact)}
                meta={[when ? `${when} was changed` : "An earlier version was changed", lineOf(earlier)].filter(Boolean).join(" · ")}
                label={`Restore the earlier version: ${lineOf(earlier)}`}
                busy={busy === `restore:${fact.id}`}
                onUndo={() => void undoCorrection(fact, earlier)}
              />
            );
          })}
        </Section>
      )}
      {loading && !data && <p className="text-[13px] text-[var(--c-ink-3)]">Loading…</p>}
    </div>
  );
}
