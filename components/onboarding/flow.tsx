"use client";
/**
 * New-caregiver onboarding: one question at a time, saved after every answer, with Saheli's notes filling in on the
 * right. The order adapts to the answers (both parents → the questions twice; diabetes → home sugar checks; a Hindi
 * speaker → which local bhasha). At the end Saheli asks a few smart follow-ups, then everything is set up in one go.
 */
import { ArrowLeft, Bell, ChatCircleDots, CheckCircle, CircleNotch, Heartbeat, PencilSimple, Sparkle, WarningCircle } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { onboardingApi, type SetupResult } from "./api";
import {
  ACTIVITIES, ALLERGIES, CALL_NAMES, CARE_FOR, CONDITIONS, DAY_SLOTS, DIALECTS, GENDER_OF, HELP_WITH, LANGUAGES, LIKES, PROBLEMS, RELATION_OF,
  emptyPerson, pronoun, type Answers, type Person,
} from "./data";
import { Chips, Choice, Continue, Heading, INPUT, LanguagePicker, MedicineEditor, PhoneField, TimeField, VerifyWhatsApp, dialectsFor, samePhone, validPhone } from "./fields";
import { Preview } from "./preview";

type Step = { id: string; section: string; person?: number };
const SECTIONS = ["You", "Who", "About them", "Health", "Day & medicines", "Finish"];

const blank = (name = "", phone?: string): Answers => ({ you: { name, ...(phone ? { phone } : {}) }, persons: [], helpWith: ["reminders", "checkins", "company"], followups: [] });

function buildSteps(a: Answers): Step[] {
  const s: Step[] = [{ id: "welcome", section: "You" }, { id: "you_name", section: "You" }, { id: "care_for", section: "Who" }];
  const self = a.careFor === "self";
  a.persons.forEach((p, i) => {
    const add = (id: string, section: string) => s.push({ id: `${id}:${i}`, section, person: i });
    if (!self) add("p_name", "Who");
    if (!self) add("p_call", "Who");
    add("p_age", "About them");
    add("p_home", "About them");
    add("p_language", "About them");
    if (dialectsFor(p.language).length) add("p_dialect", "About them");
    add("p_reads", "About them");
    add("p_whatsapp", "About them");
    add("p_conditions", "Health");
    add("p_problems", "Health");
    add("p_allergies", "Health");
    add("p_day", "Day & medicines");
    add("p_medicines", "Day & medicines");
    add("p_doctor", "Day & medicines");
    add("p_likes", "Day & medicines");
  });
  if (a.persons.length) {
    s.push({ id: "help_with", section: "Finish" });
    if (!self) s.push({ id: "you_whatsapp", section: "Finish" });
    s.push({ id: "emergency", section: "Finish" }, { id: "followups", section: "Finish" }, { id: "anything_else", section: "Finish" }, { id: "review", section: "Finish" });
  }
  return s;
}

const display = (p: Person) => (p.relation === "Self" ? "you" : p.callThem || p.name.split(/\s+/)[0] || p.relation.toLowerCase());

export function OnboardingFlow() {
  const router = useRouter();
  const [answers, setAnswers] = useState<Answers>(blank());
  const [stepId, setStepId] = useState("welcome");
  const [verified, setVerified] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState("");
  const [followups, setFollowups] = useState<Array<{ id: string; q: string; placeholder?: string }> | null>(null);
  const [phase, setPhase] = useState<"questions" | "setup" | "done">("questions");
  const [result, setResult] = useState<SetupResult | null>(null);
  const [dir, setDir] = useState<1 | -1>(1);
  const [saheliNumber, setSaheliNumber] = useState("");

  // Load: resume a saved draft; anyone already set up goes to the dashboard.
  useEffect(() => {
    void (async () => {
      try {
        const st = await onboardingApi.state();
        if (st.status === "done" && !st.draft) {
          router.replace("/dashboard");
          return;
        }
        const base = blank(st.name, st.myPhone || undefined); // signed in with their mobile: already proven on WhatsApp
        const draft = st.draft?.answers as Partial<Answers> | undefined;
        setAnswers(draft ? { ...base, ...draft, you: { ...base.you, ...(draft.you || {}), ...(!draft.you?.phone && base.you.phone ? { phone: base.you.phone } : {}) }, persons: draft.persons || [], followups: draft.followups || [] } : base);
        if (st.draft?.step) setStepId(st.draft.step);
        setVerified(Object.fromEntries(Object.keys(st.verified || {}).map((k) => [k, true])));
        setSaheliNumber(st.saheliNumber || "");
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoaded(true);
      }
    })();
  }, [router]);

  const steps = useMemo(() => buildSteps(answers), [answers]);
  const index = Math.max(0, steps.findIndex((s) => s.id === stepId));
  const step = steps[index] ?? steps[0];
  const person = step.person !== undefined ? answers.persons[step.person] : undefined;

  // Save after every change (debounced).
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!loaded || phase !== "questions") return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setSaved("saving");
      try {
        await onboardingApi.save(answers, step.id);
        setSaved("saved");
      } catch {
        setSaved("idle");
      }
    }, 700);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [answers, step.id, loaded, phase]);

  const setP = useCallback((i: number, patch: Partial<Person>) => {
    setAnswers((a) => ({ ...a, persons: a.persons.map((p, j) => (j === i ? { ...p, ...patch } : p)) }));
  }, []);

  const go = (delta: 1 | -1) => {
    setError("");
    setDir(delta);
    const next = steps[index + delta];
    if (next) setStepId(next.id);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const jump = (id: string) => {
    setDir(-1);
    setStepId(id);
  };

  // Follow-up questions are written by Saheli from the answers when that step opens (none → skip it).
  useEffect(() => {
    if (step.id !== "followups" || followups !== null) return;
    void onboardingApi.followups(answers).then(
      (r) => {
        setFollowups(r.questions);
        if (!r.questions.length) go(1);
      },
      () => {
        setFollowups([]);
        go(1);
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.id]);

  const finish = async () => {
    setPhase("setup");
    setError("");
    try {
      setResult(await onboardingApi.complete(answers));
      setPhase("done");
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status === 409 && /already set up/i.test(err.message)) {
        router.replace("/dashboard"); // finished in another tab, or a retry after it went through
        return;
      }
      setError(err.message);
      setPhase("questions");
    }
  };

  // "I'll finish later": keep the answers so far (the dashboard offers to continue), then open the dashboard.
  const later = async () => {
    if (timer.current) clearTimeout(timer.current);
    await onboardingApi.save(answers, step.id).catch(() => undefined);
    await onboardingApi.skip().catch(() => undefined);
    router.replace("/dashboard");
  };

  if (!loaded) {
    return <div className="flex min-h-screen items-center justify-center"><CircleNotch size={26} className="animate-spin text-[var(--c-accent)]" /></div>;
  }
  if (phase === "setup") return <SettingUp answers={answers} />;
  if (phase === "done" && result) return <Done result={result} onOpen={() => router.replace("/dashboard")} />;

  const q = renderStep({ step, answers, setAnswers, person, setP, verified, setVerified, followups, go, jump, finish, saheliNumber });
  const sectionIdx = SECTIONS.indexOf(step.section);

  return (
    <div className="flex min-h-screen w-full">
      <div className="flex w-full flex-col bg-[var(--c-frame)] px-6 py-6 sm:px-12 lg:w-[56%] lg:px-16">
        <header className="mx-auto flex w-full max-w-[600px] items-center justify-between gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/kavach-careos-logo.png" alt="Kavach CareOS" className="h-10 w-auto" />
          <span className="text-[12px] text-[var(--c-ink-3)]" aria-live="polite">{saved === "saving" ? "Saving…" : saved === "saved" ? "Saved" : ""}</span>
        </header>
        <nav className="mx-auto mt-6 flex w-full max-w-[600px] gap-1.5" aria-label="Progress">
          {SECTIONS.map((s, i) => (
            <div key={s} className="flex-1">
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--c-card)]">
                <div className={cn("h-full rounded-full transition-all duration-500", i < sectionIdx ? "w-full bg-[var(--c-ink)]" : i === sectionIdx ? "bg-[var(--c-accent)]" : "w-0")} style={i === sectionIdx ? { width: `${Math.max(12, ((steps.filter((x, k) => x.section === s && k <= index).length) / Math.max(1, steps.filter((x) => x.section === s).length)) * 100)}%` } : undefined} />
              </div>
              <span className={cn("mt-1.5 hidden text-[10px] font-medium uppercase tracking-[0.06em] sm:block", i === sectionIdx ? "text-[var(--c-ink)]" : "text-[var(--c-ink-3)]")}>{s}</span>
            </div>
          ))}
        </nav>
        <main className="mx-auto flex w-full max-w-[600px] flex-1 flex-col justify-center py-10">
          {person && step.section !== "Who" && person.relation !== "Self" && answers.persons.length > 1 && (
            <p className="mb-3 inline-flex w-fit rounded-full bg-[var(--c-accent-soft)] px-3 py-1 text-[12px] font-medium text-[var(--c-accent-soft-ink)]">About {display(person)}</p>
          )}
          <div key={step.id} className={dir === 1 ? "animate-[ob-in_.35s_ease-out]" : "animate-[ob-back_.35s_ease-out]"}>
            {q.body}
          </div>
          {error && <p className="mt-5 flex items-center gap-2 rounded-[14px] bg-[#ffe1e1] px-4 py-3 text-[13px] text-[#b4232a]"><WarningCircle size={16} weight="fill" /> {error}</p>}
          {!q.hideNav && (
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Continue onClick={q.onContinue ?? (() => go(1))} disabled={!q.ok} label={q.cta ?? "Continue"} />
              {q.optional && <button type="button" onClick={() => go(1)} className="h-12 rounded-full px-5 text-[14px] font-medium text-[var(--c-ink-2)] hover:text-[var(--c-ink)]">Skip</button>}
              {index > 0 && <button type="button" onClick={() => go(-1)} className="ml-auto inline-flex h-12 items-center gap-1.5 rounded-full px-4 text-[13px] text-[var(--c-ink-2)] hover:text-[var(--c-ink)]"><ArrowLeft size={15} /> Back</button>}
            </div>
          )}
          {step.id !== "review" && (
            <button type="button" onClick={later} className="mt-6 w-fit text-[12px] text-[var(--c-ink-3)] underline-offset-4 hover:underline">{step.id === "welcome" ? "I'll do this later" : "I'll finish later"}</button>
          )}
        </main>
      </div>
      <Preview answers={answers} verified={verified} />
      <style>{`@keyframes ob-in{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}@keyframes ob-back{from{opacity:0;transform:translateY(-14px)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}

type Ctx = {
  step: Step; answers: Answers; setAnswers: React.Dispatch<React.SetStateAction<Answers>>; person?: Person; setP: (i: number, patch: Partial<Person>) => void;
  verified: Record<string, boolean>; setVerified: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  followups: Array<{ id: string; q: string; placeholder?: string }> | null; go: (d: 1 | -1) => void; jump: (id: string) => void; finish: () => void;
  saheliNumber: string;
};
type Rendered = { body: React.ReactNode; ok: boolean; optional?: boolean; cta?: string; onContinue?: () => void; hideNav?: boolean };

function renderStep(c: Ctx): Rendered {
  const { step, answers: a, setAnswers, person: p, setP, verified, setVerified, saheliNumber } = c;
  const i = step.person ?? 0;
  const kind = step.id.split(":")[0];
  const pr = p ? pronoun(p) : { they: "they", them: "them", their: "their", They: "They" };
  const name = p ? display(p) : "";
  const self = a.careFor === "self";

  switch (kind) {
    case "welcome":
      return {
        ok: true, cta: "Let's begin",
        body: (
          <>
            <Heading light={`Namaste${a.you.name ? ` ${a.you.name.split(" ")[0]}` : ""},`} dark="let's get Saheli ready." sub="A few questions, one at a time, about the person you care for. Saheli uses your answers to talk to them in their own language, remind them of every medicine on time, and know when something needs you. About five minutes; everything is saved as you go." />
            <div className="grid gap-2.5 sm:grid-cols-3">
              {[
                { icon: ChatCircleDots, t: "Tell us about them", d: "Who they are, how they speak, their health and their day." },
                { icon: Bell, t: "Connect WhatsApp", d: "One message from their phone, no app to install." },
                { icon: Sparkle, t: "Saheli takes over", d: "Reminders, check-ins and a hello in their language." },
              ].map(({ icon: Icon, t, d }) => (
                <div key={t} className="rounded-[20px] bg-[var(--c-card)] p-4">
                  <Icon size={22} className="text-[var(--c-accent)]" />
                  <p className="mt-3 text-[14px] font-medium">{t}</p>
                  <p className="mt-1 text-[12.5px] leading-snug text-[var(--c-ink-2)]">{d}</p>
                </div>
              ))}
            </div>
          </>
        ),
      };
    case "you_name":
      return {
        ok: a.you.name.trim().length > 1,
        body: (
          <>
            <Heading light="First, about you." dark="What's your name?" sub="Saheli will mention you to your family by this name, and use the second one when she writes to you." />
            <input autoFocus value={a.you.name} maxLength={80} onChange={(e) => setAnswers({ ...a, you: { ...a.you, name: e.target.value } })} placeholder="Your full name" className={INPUT} />
            <input value={a.you.callMe || ""} maxLength={40} onChange={(e) => setAnswers({ ...a, you: { ...a.you, callMe: e.target.value } })} placeholder="What Saheli should call you (optional), e.g. Riya, Bhaiya" className={cn(INPUT, "mt-3")} />
          </>
        ),
      };
    case "care_for":
      return {
        ok: !!a.careFor,
        body: (
          <>
            <Heading light="Who will Saheli" dark="look after?" />
            <Choice
              options={CARE_FOR}
              value={a.careFor}
              onPick={(id) => {
                const relations = id === "both_parents" ? ["Mother", "Father"] : [RELATION_OF[id]];
                const persons = relations.map((r, k) => {
                  const existing = a.persons[k];
                  if (existing && existing.relation === r) return existing;
                  const fresh = emptyPerson(r);
                  if (r === "Self") Object.assign(fresh, { name: a.you.name, addressAs: a.you.callMe || a.you.name.split(" ")[0], ...(a.you.phone ? { phone: a.you.phone } : {}) });
                  return { ...fresh, gender: GENDER_OF[r] };
                });
                setAnswers({ ...a, careFor: id, persons });
              }}
            />
          </>
        ),
      };
    case "p_name":
      return {
        ok: !!p?.name.trim(),
        body: (
          <>
            <Heading light={`Your ${p!.relation.toLowerCase()}`} dark={`What's ${pr.their} name?`} sub="Their full name, as on their documents." />
            <input autoFocus value={p!.name} maxLength={80} onChange={(e) => setP(i, { name: e.target.value })} placeholder="e.g. Kamla Devi Sharma" className={INPUT} />
          </>
        ),
      };
    case "p_call": {
      const first = p!.name.split(/\s+/)[0];
      const suggestions = [...new Set([p!.callThem && `${p!.callThem} ji`, first && `${first} ji`, p!.callThem, p!.relation === "Spouse" ? first : null].filter(Boolean) as string[])];
      return {
        ok: !!(p!.callThem?.trim() && p!.addressAs?.trim()),
        body: (
          <>
            <Heading light={`What do you call ${first || pr.them}`} dark="at home?" sub="Saheli talks about them to you using this name." />
            <Chips options={CALL_NAMES[p!.relation] || []} values={p!.callThem ? [p!.callThem] : []} onChange={(v) => { const call = v[v.length - 1] || ""; setP(i, { callThem: call, addressAs: call ? `${call} ji` : p!.addressAs }); }} otherLabel="Something else" />
            {p!.callThem && (
              <div className="mt-8">
                <p className="mb-3 text-[15px] font-medium">And how should Saheli address {pr.them}?</p>
                <Chips options={suggestions} values={p!.addressAs ? [p!.addressAs] : []} onChange={(v) => setP(i, { addressAs: v[v.length - 1] || "" })} otherLabel="Type another" />
              </div>
            )}
          </>
        ),
      };
    }
    case "p_age":
      return {
        ok: true, optional: true,
        body: (
          <>
            <Heading light={self ? "How old" : `How old is ${name}?`} dark={self ? "are you?" : "Roughly is fine."} />
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setP(i, { age: Math.max(1, (p!.age || 70) - 1) })} className="h-14 w-14 rounded-full bg-[var(--c-card)] text-[22px]" aria-label="Younger">−</button>
              <input inputMode="numeric" value={p!.age ?? ""} onChange={(e) => setP(i, { age: Number(e.target.value.replace(/\D/g, "").slice(0, 3)) || undefined })} placeholder="70" className={cn(INPUT, "c-num w-32 text-center text-[28px]")} aria-label="Age" />
              <button type="button" onClick={() => setP(i, { age: Math.min(120, (p!.age || 69) + 1) })} className="h-14 w-14 rounded-full bg-[var(--c-card)] text-[22px]" aria-label="Older">+</button>
              <span className="text-[15px] text-[var(--c-ink-2)]">years</span>
            </div>
            {(p!.relation === "Spouse" || p!.relation === "Relative" || p!.relation === "Self") && (
              <div className="mt-6 max-w-[420px]"><Choice columns={3} options={[{ id: "female", label: "Woman" }, { id: "male", label: "Man" }, { id: "other", label: "Other" }] as const} value={p!.gender} onPick={(g) => setP(i, { gender: g })} /></div>
            )}
          </>
        ),
      };
    case "p_home":
      return {
        ok: !!p!.livesWith,
        body: (
          <>
            <Heading light={self ? "Who do you" : `Who does ${name}`} dark={self ? "live with?" : "live with?"} sub={self ? undefined : "If they live alone, Saheli checks in a little more and knows to reach you sooner."} />
            <Choice options={[
              { id: "alone", label: "Alone" }, { id: "spouse", label: self ? "With my husband or wife" : "With their husband or wife" },
              ...(self ? [] : [{ id: "me", label: "With me" }]), { id: "family", label: "With other family" }, { id: "care_home", label: "In a care home" },
            ] as Array<{ id: Person["livesWith"] & string; label: string }>} value={p!.livesWith} onPick={(v) => setP(i, { livesWith: v })} />
            <input value={p!.city || ""} maxLength={80} onChange={(e) => setP(i, { city: e.target.value })} placeholder="City or town, e.g. Jodhpur" className={cn(INPUT, "mt-4")} />
          </>
        ),
      };
    case "p_language":
      return {
        ok: !!p!.language,
        body: (
          <>
            <Heading light={self ? "Which language" : `Which language is ${name}`} dark={self ? "suits you best?" : "most comfortable in?"} sub="Saheli writes in that language's own script (Hindi in Devanagari, Tamil in Tamil) and speaks it in voice notes." />
            <LanguagePicker value={p!.language} onPick={(code) => setP(i, { language: code, dialect: dialectsFor(code).some((d) => d.code === p!.dialect) ? p!.dialect : null })} />
          </>
        ),
      };
    case "p_dialect":
      return {
        ok: p!.dialect !== undefined,
        body: (
          <>
            <Heading light={self ? "Do you speak a" : `Does ${name} speak a`} dark="local bhasha at home?" sub={`Marwari, Bhojpuri, Maithili, Chhattisgarhi… Saheli will talk the way ${self ? "you talk" : `${pr.they} talks`}: "Ram Ram sa", "Jai Johar", "Pranam".`} />
            <DialectChoice person={p!} onPick={(d) => setP(i, { dialect: d })} />
          </>
        ),
      };
    case "p_reads":
      return {
        ok: !!p!.reads,
        body: (
          <>
            <Heading light="How should Saheli" dark={self ? "talk to you?" : `talk to ${name}?`} />
            <Choice columns={1} options={[
              { id: "text", label: "Text messages", hint: `${self ? "I read" : `${pr.They} reads`} comfortably on the phone` },
              { id: "voice", label: "Voice notes", hint: "Easier than reading; a short voice note with every message" },
              { id: "both", label: "Both", hint: "Text, and a voice note with it" },
            ] as const} value={p!.reads} onPick={(v) => setP(i, { reads: v })} />
          </>
        ),
      };
    case "p_whatsapp": {
      const target = self ? "self" : `person:${i}`;
      const clash = i > 0 && samePhone(p!.phone, a.persons[0]?.phone);
      return {
        ok: validPhone(p!.phone) && !clash,
        body: (
          <>
            <Heading light={self ? "Your WhatsApp" : `${name[0]?.toUpperCase()}${name.slice(1)}'s WhatsApp`} dark="Let's connect it." sub="Saheli talks only on WhatsApp. Nothing to install." />
            <PhoneField label={self ? "Your WhatsApp number" : `${name}'s WhatsApp number`} value={p!.phone} onChange={(v) => { setP(i, { phone: v }); setVerified((x) => ({ ...x, [target]: false })); }} />
            {clash && <p className="mt-3 text-[13px] text-[#b4232a]">That&apos;s {display(a.persons[0])}&apos;s number. Each person needs their own WhatsApp.</p>}
            {validPhone(p!.phone) && !clash && <div className="mt-4"><VerifyWhatsApp target={target} phone={p!.phone!} who={name} saheliNumber={saheliNumber} verified={!!verified[target]} onVerified={() => setVerified((x) => ({ ...x, [target]: true }))} /></div>}
            {validPhone(p!.phone) && !clash && !verified[target] && <p className="mt-3 text-[12px] text-[var(--c-ink-3)]">Not now? Continue; you can connect it later and Saheli will say hello then.</p>}
          </>
        ),
      };
    }
    case "p_conditions": {
      const diabetes = p!.conditions.some((x) => /diabetes|sugar/i.test(x));
      const bp = p!.conditions.some((x) => /bp|blood pressure/i.test(x));
      return {
        ok: true,
        cta: p!.conditions.length ? "Continue" : "None of these",
        body: (
          <>
            <Heading light="Any long-term" dark="health conditions?" sub="Saheli keeps these in mind, checks food and medicines against them, and knows what's a real warning sign." />
            <Chips options={CONDITIONS} values={p!.conditions} onChange={(v) => setP(i, { conditions: v })} otherLabel="Another condition" />
            {diabetes && (
              <div className="mt-7">
                <p className="mb-3 text-[15px] font-medium">Does {self ? "you" : name} check sugar at home?</p>
                <Choice columns={3} options={[{ id: "daily", label: "Every day" }, { id: "sometimes", label: "Sometimes" }, { id: "no", label: "No" }] as const} value={p!.sugarCheck} onPick={(v) => setP(i, { sugarCheck: v })} />
              </div>
            )}
            {bp && (
              <div className="mt-6">
                <p className="mb-3 text-[15px] font-medium">Is there a BP machine at home?</p>
                <Choice columns={3} options={[{ id: "yes", label: "Yes" }, { id: "no", label: "No" }] as const} value={p!.bpMachine === undefined ? undefined : p!.bpMachine ? "yes" : "no"} onPick={(v) => setP(i, { bpMachine: v === "yes" })} />
              </div>
            )}
          </>
        ),
      };
    }
    case "p_problems":
      return {
        ok: true, optional: true,
        body: (
          <>
            <Heading light={self ? "Anything bothering you" : `Anything bothering ${name}`} dark="these days?" sub="Saheli will gently ask about it and tell you if it gets worse." />
            <Chips options={PROBLEMS} values={p!.problems} onChange={(v) => setP(i, { problems: v })} />
            <textarea value={p!.problemsOther || ""} maxLength={500} onChange={(e) => setP(i, { problemsOther: e.target.value })} rows={3} placeholder="In your own words (optional): she has been sad since Papa passed, wakes up at 3 am…" className="mt-4 w-full rounded-[18px] border border-[var(--c-line)] bg-[var(--c-frame)] p-4 text-[15px] outline-none focus:border-[var(--c-ink)]" />
          </>
        ),
      };
    case "p_allergies":
      return {
        ok: !!p!.allergies.none || p!.allergies.items.length > 0,
        body: (
          <>
            <Heading light={self ? "Are you allergic" : `Is ${name} allergic`} dark="to anything?" sub="Food or medicine. Saheli never suggests or orders anything on this list." />
            <Choice columns={3} options={[{ id: "no", label: "No allergies" }, { id: "yes", label: "Yes" }] as const} value={p!.allergies.none ? "no" : p!.allergies.items.length ? "yes" : undefined}
              onPick={(v) => setP(i, { allergies: v === "no" ? { none: true, items: [] } : { none: false, items: p!.allergies.items.length ? p!.allergies.items : [] } })} />
            {p!.allergies.none === false && <div className="mt-5"><Chips options={ALLERGIES} values={p!.allergies.items} onChange={(v) => setP(i, { allergies: { none: false, items: v } })} otherLabel="Another allergy" /></div>}
          </>
        ),
      };
    case "p_day":
      return {
        ok: true,
        body: (
          <>
            <Heading light={self ? "What does your" : `What does ${name}'s`} dark="day look like?" sub="Medicine times follow these meals, and Saheli won't message during sleep." />
            <div className="grid gap-2 sm:grid-cols-2">
              {DAY_SLOTS.map((s) => <TimeField key={s.key} label={s.label} value={p!.day[s.key]} onChange={(v) => setP(i, { day: { ...p!.day, [s.key]: v } })} />)}
            </div>
            <p className="mb-3 mt-7 text-[15px] font-medium">Things {self ? "you" : pr.they} usually do</p>
            <Chips options={ACTIVITIES} values={p!.day.activities} onChange={(v) => setP(i, { day: { ...p!.day, activities: v } })} />
            <textarea value={p!.day.notes || ""} maxLength={500} onChange={(e) => setP(i, { day: { ...p!.day, notes: e.target.value } })} rows={2} placeholder="Anything else: the maid comes at 11, she watches her serial at 9…" className="mt-4 w-full rounded-[18px] border border-[var(--c-line)] bg-[var(--c-frame)] p-4 text-[15px] outline-none focus:border-[var(--c-ink)]" />
          </>
        ),
      };
    case "p_medicines": {
      const meds = p!.medicines;
      const missingTime = meds.filter((m) => m.name.trim() && !m.times.length);
      return {
        ok: !!p!.noMedicines || (meds.length > 0 && meds.every((m) => m.name.trim())),
        body: (
          <>
            <Heading light={self ? "Your medicines." : `${name[0]?.toUpperCase()}${name.slice(1)}'s medicines.`} dark="What's taken daily?" sub="Scan the prescription and check what Saheli read, or add them by hand. Each time becomes a WhatsApp reminder." />
            {!p!.noMedicines && <MedicineEditor person={p!} onChange={(m) => setP(i, { medicines: m })} />}
            <label className="mt-5 flex w-fit items-center gap-2.5 text-[14px] text-[var(--c-ink-2)]">
              <input type="checkbox" checked={!!p!.noMedicines} onChange={(e) => setP(i, { noMedicines: e.target.checked })} className="h-4 w-4 accent-[var(--c-ink)]" />
              {self ? "I don't take" : `${pr.They} doesn't take`} regular medicines
            </label>
            {missingTime.length > 0 && <p className="mt-3 text-[12.5px] text-[var(--c-ink-2)]">No time for {missingTime.map((m) => m.name).join(", ")}: Saheli will note it but can&apos;t remind {self ? "you" : pr.them} until it has one.</p>}
          </>
        ),
      };
    }
    case "p_doctor":
      return {
        ok: true, optional: true,
        body: (
          <>
            <Heading light={self ? "Your regular doctor" : `${name[0]?.toUpperCase()}${name.slice(1)}'s regular doctor`} dark="Who looks after them?" sub="Saheli reminds about visits and helps prepare questions. Skip if you'd rather add this later." />
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={p!.doctor?.name || ""} maxLength={80} onChange={(e) => setP(i, { doctor: { ...p!.doctor, name: e.target.value } })} placeholder="Doctor's name" className={INPUT} />
              <input value={p!.doctor?.hospital || ""} maxLength={120} onChange={(e) => setP(i, { doctor: { ...p!.doctor, hospital: e.target.value } })} placeholder="Clinic or hospital" className={INPUT} />
              <input inputMode="tel" value={p!.doctor?.phone || ""} maxLength={20} onChange={(e) => setP(i, { doctor: { ...p!.doctor, phone: e.target.value } })} placeholder="Phone (optional)" className={INPUT} />
              <input type="date" value={p!.doctor?.nextVisit || ""} onChange={(e) => setP(i, { doctor: { ...p!.doctor, nextVisit: e.target.value } })} aria-label="Next visit" className={INPUT} />
            </div>
          </>
        ),
      };
    case "p_likes":
      return {
        ok: true, optional: true,
        body: (
          <>
            <Heading light={self ? "What do you enjoy" : `What does ${name} enjoy`} dark="talking about?" sub="So Saheli's chats feel like a granddaughter's, not a reminder app's." />
            <Chips options={LIKES} values={p!.likes} onChange={(v) => setP(i, { likes: v })} />
            <input value={p!.avoidTopics || ""} maxLength={300} onChange={(e) => setP(i, { avoidTopics: e.target.value })} placeholder="Anything Saheli should never bring up? (optional)" className={cn(INPUT, "mt-5")} />
          </>
        ),
      };
    case "help_with":
      return {
        ok: a.helpWith.length > 0,
        body: (
          <>
            <Heading light="What should Saheli" dark="help with?" sub="Pick as many as you like. You can change this anytime." />
            <div className="grid gap-2.5 sm:grid-cols-2">
              {HELP_WITH.map((h) => {
                const on = a.helpWith.includes(h.id);
                return (
                  <button key={h.id} type="button" aria-pressed={on} onClick={() => setAnswers({ ...a, helpWith: on ? a.helpWith.filter((x) => x !== h.id) : [...a.helpWith, h.id] })}
                    className={cn("rounded-[18px] px-4 py-3.5 text-left transition", on ? "bg-[var(--c-ink)] text-white" : "bg-[var(--c-card)] hover:bg-[var(--c-line)]")}>
                    <span className="flex items-center justify-between gap-2 text-[15px] font-medium">{h.label}{on && <CheckCircle size={18} weight="fill" className="text-[var(--c-accent)]" />}</span>
                    <span className={cn("mt-0.5 block text-[12px]", on ? "text-white/70" : "text-[var(--c-ink-2)]")}>{h.hint}</span>
                  </button>
                );
              })}
            </div>
          </>
        ),
      };
    case "you_whatsapp": {
      const who = a.persons.map(display).join(" and ");
      return {
        ok: true, optional: true,
        body: (
          <>
            <Heading light="Your WhatsApp," dark="for what really matters." sub={`Saheli messages you only for four things: a health red flag, when ${who} doesn't answer a check, a real mood or safety worry, and an order that needs your OK. Everything else waits in your dashboard.`} />
            <PhoneField label="Your WhatsApp number" value={a.you.phone} onChange={(v) => { setAnswers({ ...a, you: { ...a.you, phone: v } }); setVerified((x) => ({ ...x, self: false })); }} />
            {validPhone(a.you.phone) && <div className="mt-4"><VerifyWhatsApp target="self" phone={a.you.phone!} who="you" saheliNumber={saheliNumber} verified={!!verified.self} onVerified={() => setVerified((x) => ({ ...x, self: true }))} /></div>}
          </>
        ),
      };
    }
    case "emergency":
      return {
        ok: true, optional: true,
        body: (
          <>
            <Heading light="If Saheli can't reach you," dark="who else should she call?" sub="A sibling, a neighbour, a relative nearby." />
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={a.emergency?.name || ""} maxLength={80} onChange={(e) => setAnswers({ ...a, emergency: { ...a.emergency, name: e.target.value } })} placeholder="Name" className={INPUT} />
              <input value={a.emergency?.relation || ""} maxLength={40} onChange={(e) => setAnswers({ ...a, emergency: { ...a.emergency, relation: e.target.value } })} placeholder="Relation, e.g. brother, neighbour" className={INPUT} />
            </div>
            <div className="mt-3"><PhoneField label="Their number" value={a.emergency?.phone} onChange={(v) => setAnswers({ ...a, emergency: { ...a.emergency, phone: v } })} /></div>
          </>
        ),
      };
    case "followups": {
      if (c.followups === null) {
        return { ok: false, hideNav: true, body: <div className="flex items-center gap-3 text-[15px] text-[var(--c-ink-2)]"><CircleNotch size={22} className="animate-spin text-[var(--c-accent)]" /> Saheli is reading your answers…</div> };
      }
      const qs = c.followups;
      const get = (q: string) => a.followups.find((f) => f.q === q)?.a || "";
      const set = (q: string, v: string) => setAnswers({ ...a, followups: [...a.followups.filter((f) => f.q !== q), { q, a: v }] });
      return {
        ok: true, optional: true,
        body: (
          <>
            <Heading light="A few questions" dark="from Saheli." sub="She read everything you told her and would like to know a little more." />
            <div className="space-y-5">
              {qs.map((q) => (
                <div key={q.id}>
                  <p className="mb-2 flex items-start gap-2 text-[15px] font-medium"><Sparkle size={16} weight="fill" className="mt-1 shrink-0 text-[var(--c-accent)]" />{q.q}</p>
                  <textarea value={get(q.q)} maxLength={500} onChange={(e) => set(q.q, e.target.value)} rows={2} placeholder={q.placeholder || "Your answer"} className="w-full rounded-[18px] border border-[var(--c-line)] bg-[var(--c-frame)] p-4 text-[15px] outline-none focus:border-[var(--c-ink)]" />
                </div>
              ))}
            </div>
          </>
        ),
      };
    }
    case "anything_else":
      return {
        ok: true, optional: true,
        body: (
          <>
            <Heading light="Anything else" dark="Saheli should know?" sub="Family members, habits, worries, what makes them smile. Write it like you'd tell a new caretaker." />
            <textarea autoFocus value={a.anythingElse || ""} maxLength={1500} onChange={(e) => setAnswers({ ...a, anythingElse: e.target.value })} rows={6} placeholder="Her grandson Aarav calls every Sunday. She loves Lata Mangeshkar. She gets anxious if nobody calls by evening…" className="w-full rounded-[20px] border border-[var(--c-line)] bg-[var(--c-frame)] p-5 text-[15px] leading-relaxed outline-none focus:border-[var(--c-ink)]" />
          </>
        ),
      };
    case "review":
      return { ok: true, cta: "Set everything up", onContinue: c.finish, body: <Review answers={a} verified={verified} jump={c.jump} /> };
    default:
      return { ok: true, body: null };
  }
}

/** The most common bhashas first; the rest behind "More". */
const POPULAR = ["mwr", "bho", "mai", "bgc", "awa", "hne", "mag", "bns", "gbm", "kfy"];
function DialectChoice({ person: p, onPick }: { person: Person; onPick: (d: string | null) => void }) {
  const lang = LANGUAGES.find((l) => l.code === p.language);
  const all = dialectsFor(p.language).sort((x, y) => (POPULAR.indexOf(x.code) + 1 || 99) - (POPULAR.indexOf(y.code) + 1 || 99));
  const [more, setMore] = useState(all.length <= 9 || (!!p.dialect && all.findIndex((d) => d.code === p.dialect) >= 7));
  const shown = more ? all : all.slice(0, 7);
  const options = [{ id: "none", label: `Just ${lang?.name}`, hint: "No particular local bhasha" }, ...shown.map((d) => ({ id: d.code, label: d.name, native: d.native, hint: d.region }))];
  return (
    <>
      <Choice options={options} value={p.dialect === null ? "none" : p.dialect} onPick={(v) => onPick(v === "none" ? null : v)} />
      {!more && <button type="button" onClick={() => setMore(true)} className="mt-3 h-10 rounded-full bg-[var(--c-card)] px-4 text-[13px] font-medium">More bhashas ({all.length - 7})</button>}
    </>
  );
}

function ReviewItem({ label, value, to, jump }: { label: string; value: React.ReactNode; to: string; jump: (id: string) => void }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[var(--c-line)] py-2.5 last:border-0">
      <span className="w-36 shrink-0 text-[12.5px] text-[var(--c-ink-2)]">{label}</span>
      <span className="min-w-0 flex-1 text-[13.5px]">{value || <span className="text-[var(--c-ink-3)]">—</span>}</span>
      <button type="button" onClick={() => jump(to)} className="shrink-0 text-[var(--c-ink-3)] hover:text-[var(--c-ink)]" aria-label={`Change ${label}`}><PencilSimple size={15} /></button>
    </div>
  );
}

function Review({ answers: a, verified, jump }: { answers: Answers; verified: Record<string, boolean>; jump: (id: string) => void }) {
  return (
    <>
      <Heading light="Here's what Saheli" dark="has learned." sub="Check it once. Tap the pencil to change anything." />
      <div className="space-y-4">
        {a.persons.map((p, i) => {
          const lang = LANGUAGES.find((l) => l.code === p.language);
          const dialect = DIALECTS.find((d) => d.code === p.dialect);
          const t = a.careFor === "self" ? "self" : `person:${i}`;
          return (
            <section key={i} className="rounded-[22px] bg-[var(--c-card)] p-5">
              <p className="mb-2 flex items-center gap-2 text-[14px] font-medium"><span className="h-3.5 w-3.5 rounded-[4px] bg-[var(--c-accent)]" />{p.name || p.relation}</p>
              <ReviewItem jump={jump} label="Saheli calls them" value={p.addressAs || p.callThem} to={`p_call:${i}`} />
              <ReviewItem jump={jump} label="Language" value={lang ? `${dialect ? `${dialect.name} (${dialect.native})` : lang.name}${p.reads ? ` · ${p.reads === "text" ? "text" : p.reads === "voice" ? "voice notes" : "text + voice"}` : ""}` : ""} to={`p_language:${i}`} />
              <ReviewItem jump={jump} label="WhatsApp" value={p.phone ? `${p.phone} ${verified[t] ? "· connected ✓" : "· not connected yet"}` : ""} to={`p_whatsapp:${i}`} />
              <ReviewItem jump={jump} label="Conditions" value={[...p.conditions, p.conditionsOther].filter(Boolean).join(", ")} to={`p_conditions:${i}`} />
              <ReviewItem jump={jump} label="Allergies" value={p.allergies.none ? "None" : p.allergies.items.join(", ")} to={`p_allergies:${i}`} />
              <ReviewItem jump={jump} label="Medicines" value={p.noMedicines ? "None regularly" : p.medicines.filter((m) => m.name).map((m) => `${m.name}${m.times.length ? ` (${m.times.join(", ")})` : ""}`).join(" · ")} to={`p_medicines:${i}`} />
              <ReviewItem jump={jump} label="Day" value={DAY_SLOTS.filter((s) => p.day[s.key]).map((s) => `${s.label} ${p.day[s.key]}`).join(" · ")} to={`p_day:${i}`} />
            </section>
          );
        })}
        <section className="rounded-[22px] bg-[var(--c-card)] p-5">
          <p className="mb-2 flex items-center gap-2 text-[14px] font-medium"><span className="h-3.5 w-3.5 rounded-[4px] bg-[var(--c-ink)]" />You</p>
          <ReviewItem jump={jump} label="Name" value={a.you.name} to="you_name" />
          <ReviewItem jump={jump} label="Saheli helps with" value={a.helpWith.map((h) => HELP_WITH.find((x) => x.id === h)?.label || h).join(", ")} to="help_with" />
          <ReviewItem jump={jump} label="Emergency contact" value={a.emergency?.name ? `${a.emergency.name}${a.emergency.relation ? ` (${a.emergency.relation})` : ""}` : ""} to="emergency" />
        </section>
      </div>
    </>
  );
}

function SettingUp({ answers }: { answers: Answers }) {
  const p = answers.persons[0];
  const lang = LANGUAGES.find((l) => l.code === p?.language);
  const dialect = DIALECTS.find((d) => d.code === p?.dialect);
  const meds = answers.persons.reduce((n, x) => n + x.medicines.filter((m) => m.name && m.times.length).length, 0);
  const steps = [
    `Adding ${answers.persons.map(display).join(" and ")} to your family`,
    `Teaching Saheli to speak ${dialect ? dialect.name : lang?.name || "their language"}`,
    meds ? `Setting ${meds} medicine reminder${meds > 1 ? "s" : ""}` : "Noting their health and allergies",
    "Planning gentle daily check-ins",
    "Writing Saheli's notes about their day",
    "Saying namaste on WhatsApp",
  ];
  const [done, setDone] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setDone((d) => Math.min(steps.length - 1, d + 1)), 1800);
    return () => clearInterval(t);
  }, [steps.length]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--c-frame)] px-6">
      <div className="w-full max-w-[520px]">
        <Heading light="Setting everything up," dark="just a moment." />
        <ul className="space-y-3">
          {steps.map((s, k) => (
            <li key={s} className={cn("flex items-center gap-3 rounded-[18px] px-4 py-3.5 text-[15px] transition-all duration-500", k < done ? "bg-[var(--c-card)]" : k === done ? "bg-[var(--c-ink)] text-white" : "text-[var(--c-ink-3)]")}>
              {k < done ? <CheckCircle size={20} weight="fill" className="text-[#1f7a4d]" /> : k === done ? <CircleNotch size={20} className="animate-spin text-[var(--c-accent)]" /> : <span className="h-5 w-5 rounded-full border border-[var(--c-line)]" />}
              {s}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** What happens with Saheli's hello. WhatsApp lets her write first only after the person has messaged her. */
function welcomeLine(p: SetupResult["persons"][number]): string {
  switch (p.welcome) {
    case "sent": return "Saheli has said hello on WhatsApp";
    case "waiting": return `Ask ${p.addressAs} to send "Namaste" to Saheli on WhatsApp; she'll reply in their language`;
    case "failed": return `Saheli couldn't say hello yet; she will as soon as ${p.addressAs} sends her a message`;
    default: return "Connect their WhatsApp from the Family page and Saheli will say hello";
  }
}

function Done({ result, onOpen }: { result: SetupResult; onOpen: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--c-frame)] px-6 py-12">
      <div className="w-full max-w-[620px]">
        <span className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--c-accent)] text-white"><Heartbeat size={30} weight="bold" /></span>
        <Heading light="All set." dark="Saheli is with your family now." />
        <div className="space-y-3">
          {result.persons.map((p, k) => !p.userId ? (
            <section key={k} className="rounded-[22px] bg-[var(--c-card)] p-5">
              <p className="text-[16px] font-medium">{p.name}</p>
              <p className="mt-2 flex gap-2 text-[13.5px] text-[var(--c-ink-2)]"><WarningCircle size={16} weight="fill" className="mt-0.5 shrink-0 text-[var(--c-warn)]" />Couldn&apos;t add {p.name}: {p.problems.join(", ")}. Add them from the Family page.</p>
            </section>
          ) : (
            <section key={k} className="rounded-[22px] bg-[var(--c-card)] p-5">
              <p className="text-[16px] font-medium">{p.name} <span className="font-normal text-[var(--c-ink-2)]">· Saheli calls them {p.addressAs} · {p.language}</span></p>
              <ul className="mt-3 space-y-1.5 text-[13.5px]">
                <li className="flex gap-2"><CheckCircle size={16} weight="fill" className="mt-0.5 shrink-0 text-[#1f7a4d]" />{p.reminders.length ? `${p.reminders.length} medicine reminder${p.reminders.length > 1 ? "s" : ""}: ${p.reminders.map((r) => `${r.name}${r.times.length ? ` at ${r.times.join(", ")}` : ""}`).join(" · ")}` : "Health, allergies and their day are in Saheli's notes"}</li>
                {p.checkins.length > 0 && <li className="flex gap-2"><CheckCircle size={16} weight="fill" className="mt-0.5 shrink-0 text-[#1f7a4d]" />Check-ins every {p.checkins.join(" and ")}</li>}
                <li className="flex gap-2">{p.welcome === "sent" ? <CheckCircle size={16} weight="fill" className="mt-0.5 shrink-0 text-[#1f7a4d]" /> : <WarningCircle size={16} weight="fill" className="mt-0.5 shrink-0 text-[var(--c-warn)]" />}{welcomeLine(p)}</li>
                {p.problems.length > 0 && <li className="flex gap-2 text-[var(--c-ink-2)]"><WarningCircle size={16} className="mt-0.5 shrink-0" />Couldn&apos;t finish: {p.problems.join(", ")}. You can add these from the dashboard or tell Saheli.</li>}
              </ul>
            </section>
          ))}
        </div>
        <div className="mt-8"><Continue onClick={onOpen} label="Open my dashboard" /></div>
      </div>
    </div>
  );
}
