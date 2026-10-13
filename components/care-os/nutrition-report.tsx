"use client";
/**
 * The food and nutrition report for a doctor (plan §N10, founder Q8: only when the caregiver chooses to share it). One
 * view for the printable PDF on the Food & nutrition page and the read-only link /n/[token]. Facts only: what was logged,
 * the numbers with how sure they are, and targets with who set them. No phone numbers, no advice.
 */
import { cn } from "@/lib/utils";
import { IST } from "./feature-kit";
import type { NutritionReport } from "./nutrition-data";

const AVG_ROWS: Array<{ key: keyof NutritionReport["averages"]; label: string; unit: string; dp?: number }> = [
  { key: "energy_kcal", label: "Energy", unit: "kcal" },
  { key: "protein_g", label: "Protein", unit: "g" },
  { key: "carbs_g", label: "Carbohydrate", unit: "g" },
  { key: "sugar_g", label: "Sugar", unit: "g" },
  { key: "fat_g", label: "Fat", unit: "g" },
  { key: "sat_fat_g", label: "Saturated fat", unit: "g" },
  { key: "fibre_g", label: "Fibre", unit: "g" },
  { key: "sodium_mg", label: "Sodium", unit: "mg" },
  { key: "potassium_mg", label: "Potassium", unit: "mg" },
  { key: "calcium_mg", label: "Calcium", unit: "mg" },
  { key: "iron_mg", label: "Iron", unit: "mg", dp: 1 },
  { key: "water_ml", label: "Water (drinks)", unit: "ml" },
];

const CONF_LABEL: Record<string, string> = {
  label: "from a pack label",
  said: "amount as said",
  photo: "estimated from a photo",
  estimate: "estimated (amount unclear)",
  unquantified: "eaten, no amount",
};

const fmt = (v: number | null | undefined, dp = 0) =>
  v == null || Number.isNaN(v) ? "—" : v.toLocaleString("en-IN", { minimumFractionDigits: dp, maximumFractionDigits: dp });
const dayText = (day: string, opts: Intl.DateTimeFormatOptions) => new Date(`${day}T12:00:00+05:30`).toLocaleDateString("en-IN", { ...opts, timeZone: IST });

function Block({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("kv-avoid rounded-[18px] bg-[var(--c-card)] p-4", className)}>
      <h2 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.07em] text-[var(--c-ink-2)]">
        <span className="h-[11px] w-[11px] rounded-[3px] bg-[var(--c-accent)]" aria-hidden />
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

const TH = "py-1.5 pr-3 text-left text-[11.5px] font-medium text-[var(--c-ink-2)]";
const TD = "border-t border-[var(--c-line)] py-1.5 pr-3 text-[13px]";
const TDN = cn(TD, "c-num text-right tabular-nums");

export function NutritionReportView({ report: r, name, sharedAt, expiresAt }: { report: NutritionReport; name: string; sharedAt?: string | null; expiresAt?: string | null }) {
  const conf = Object.entries(r.confidence).filter(([, n]) => n > 0);
  const totalItems = conf.reduce((s, [, n]) => s + n, 0);
  const rough = (r.confidence.estimate ?? 0) + (r.confidence.unquantified ?? 0);
  const slots = Object.keys(r.mealPattern) as Array<keyof NutritionReport["mealPattern"]>;
  return (
    <div className="space-y-3">
      <header className="kv-avoid">
        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--c-accent-text)]">Food and nutrition report</p>
        <h1 className="mt-1 text-[24px] font-medium leading-tight">{name}</h1>
        <p className="mt-1 text-[13px] text-[var(--c-ink-2)]">
          {dayText(r.from, { day: "numeric", month: "short" })} – {dayText(r.to, { day: "numeric", month: "short", year: "numeric" })} · food logged on{" "}
          <b className="font-medium text-[var(--c-ink)]">
            {r.daysLogged} of {r.days} days
          </b>
        </p>
        {(sharedAt || expiresAt) && (
          <p className="mt-0.5 text-[11.5px] text-[var(--c-ink-3)]">
            {sharedAt ? `Shared by the family on ${dayText(sharedAt.slice(0, 10), { day: "numeric", month: "short" })}` : ""}
            {expiresAt ? `${sharedAt ? " · " : ""}this link closes on ${dayText(expiresAt.slice(0, 10), { day: "numeric", month: "short" })}` : ""}
          </p>
        )}
      </header>

      {r.daysLogged === 0 ? (
        <Block title="Nothing logged">
          <p className="text-[13px] text-[var(--c-ink-2)]">No food was logged in these {r.days} days.</p>
        </Block>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2 print:grid-cols-2">
            <Block title="Daily average on logged days">
              <table className="w-full border-collapse">
                <tbody>
                  {AVG_ROWS.filter((row) => r.averages[row.key] != null).map((row) => (
                    <tr key={row.key}>
                      <td className={TD}>{row.label}</td>
                      <td className={TDN}>
                        {fmt(r.averages[row.key], row.dp)} <span className="text-[11.5px] text-[var(--c-ink-2)]">{row.unit}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Block>
            <div className="space-y-3">
              <Block title="Targets and rules">
                {r.targets.length + r.rules.length === 0 ? (
                  <p className="text-[13px] text-[var(--c-ink-2)]">None set. The numbers are tracked without a target.</p>
                ) : (
                  <ul className="space-y-2">
                    {r.targets.map((t) => (
                      <li key={t.field} className="text-[13px] leading-snug">
                        <span className="font-medium">{t.text}</span>
                        {/* the engine's text names who set it and how strict */}
                        <span className="block text-[11.5px] text-[var(--c-ink-2)]">
                          met on {t.daysMet} of {t.daysLogged} logged days
                        </span>
                      </li>
                    ))}
                    {r.rules.map((rule) => (
                      <li key={rule.text} className="text-[13px] leading-snug">
                        <span className="font-medium">{rule.text}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {r.deviations.length > 0 && <p className="mt-2 text-[12px] text-[var(--c-ink-2)]">Past a strict target or rule: {r.deviations.join(", ")}.</p>}
              </Block>
              <Block title="Meals logged">
                <div className="grid grid-cols-3 gap-2">
                  {slots.map((s) => (
                    <div key={s} className="rounded-[12px] bg-[var(--c-frame)] px-3 py-2">
                      <p className="text-[11.5px] capitalize text-[var(--c-ink-2)]">{s}</p>
                      <p className="c-num text-[17px]">
                        {r.mealPattern[s]}
                        <span className="text-[11.5px] text-[var(--c-ink-2)]"> / {r.days} days</span>
                      </p>
                      {r.skipped[s] ? <p className="text-[11px] text-[var(--c-ink-2)]">skipped {r.skipped[s]}×</p> : null}
                    </div>
                  ))}
                </div>
              </Block>
            </div>
          </div>

          <Block title="Day by day">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className={TH}>Day</th>
                    <th className={cn(TH, "text-right")}>kcal</th>
                    <th className={cn(TH, "text-right")}>Protein g</th>
                    <th className={cn(TH, "text-right")}>Carbs g</th>
                    <th className={cn(TH, "text-right")}>Sugar g</th>
                    <th className={cn(TH, "text-right")}>Fat g</th>
                    <th className={cn(TH, "text-right")}>Sodium mg</th>
                    <th className={cn(TH, "text-right")}>Water ml</th>
                    <th className={cn(TH, "text-right")}>Meals</th>
                  </tr>
                </thead>
                <tbody>
                  {r.daily.map((d) => {
                    const none = !d.energy_kcal && !d.mealsLogged;
                    return (
                      <tr key={d.day} className={none ? "text-[var(--c-ink-3)]" : undefined}>
                        <td className={cn(TD, "whitespace-nowrap")}>{dayText(d.day, { weekday: "short", day: "numeric", month: "short" })}</td>
                        <td className={TDN}>{none ? "—" : fmt(d.energy_kcal)}</td>
                        <td className={TDN}>{none ? "—" : fmt(d.protein_g)}</td>
                        <td className={TDN}>{none ? "—" : fmt(d.carbs_g)}</td>
                        <td className={TDN}>{none ? "—" : fmt(d.sugar_g)}</td>
                        <td className={TDN}>{none ? "—" : fmt(d.fat_g)}</td>
                        <td className={TDN}>{none ? "—" : fmt(d.sodium_mg)}</td>
                        <td className={TDN}>{none ? "—" : fmt(d.water_ml)}</td>
                        <td className={TDN}>{none ? "not logged" : `${d.mealsLogged} of 3`}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Block>

          <div className="grid gap-3 md:grid-cols-2 print:grid-cols-2">
            <Block title="Most eaten">
              {r.topFoods.length === 0 ? (
                <p className="text-[13px] text-[var(--c-ink-2)]">—</p>
              ) : (
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className={TH}>Food</th>
                      <th className={cn(TH, "text-right")}>Times</th>
                      <th className={cn(TH, "text-right")}>Share of kcal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.topFoods.map((f) => (
                      <tr key={f.name}>
                        <td className={TD}>{f.name}</td>
                        <td className={TDN}>{f.times}</td>
                        <td className={TDN}>{f.kcalShare}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Block>
            <div className="space-y-3">
              <Block title="How sure the numbers are">
                <ul className="space-y-1 text-[13px]">
                  {conf.map(([k, n]) => (
                    <li key={k} className="flex justify-between gap-3">
                      <span>{CONF_LABEL[k] ?? k}</span>
                      <span className="c-num tabular-nums">
                        {n} of {totalItems}
                      </span>
                    </li>
                  ))}
                </ul>
                {rough > 0 && <p className="mt-2 text-[12px] text-[var(--c-ink-2)]">Treat estimated items and items without an amount as rough.</p>}
              </Block>
              {r.weight.length > 0 && (
                <Block title="Weight readings">
                  <ul className="space-y-1 text-[13px]">
                    {r.weight.slice(-8).map((w) => (
                      <li key={`${w.day}-${w.value}`} className="flex justify-between gap-3">
                        <span>{dayText(w.day, { day: "numeric", month: "short" })}</span>
                        <span className="c-num tabular-nums">{fmt(w.value, 1)} kg</span>
                      </li>
                    ))}
                  </ul>
                </Block>
              )}
            </div>
          </div>
        </>
      )}

      <p className="kv-avoid px-1 text-[11.5px] leading-relaxed text-[var(--c-ink-3)]">
        {r.note} From what the family and the person told Saheli (Kavach CareOS) on WhatsApp or the dashboard. Nutrition values come from pack labels and
        published food tables. This is a record of what was eaten, not a medical assessment.
      </p>
    </div>
  );
}
