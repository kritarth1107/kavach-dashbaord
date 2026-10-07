"use client";

/**
 * Onboarding as a chat with Saheli. She asks one thing at a time, in her own words, and what she asks next depends on
 * the answers (see engine.ts). Answers can be tapped, typed or spoken (any language); typed and spoken ones are read
 * by the backend. Everything she has understood fills her notebook on the right, and the whole chat is saved after
 * every message, so a refresh or another device picks up where it stopped. "Set everything up" runs the same setup
 * as before (care record, reminders, language, check-ins, a hello on WhatsApp).
 */
import { ArrowRight, ArrowUp, CaretDown, Camera, CircleNotch, Microphone, Sparkle, Stop } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { onboardingApi, type SetupResult } from "../api";
import { slotTimes, type Answers, type Person } from "../data";
import {
  CHAPTERS, OPENING, applyChips, applyUnderstood, ask, callOf, chapterIndex, confirmMeds, emptyFlow, fallbackUnderstood, isSelf, languageAck,
  markDone, msgId, nextSlot, patchPerson, seedFlow, skip, summaryRows, toPhone, upcoming, type Ctx, type Flow, type Msg, type Slot,
} from "./engine";
import { Notebook, type CardKey } from "./notebook";
import { greetingFor, option, type LangOption } from "./region";
import {
  Chips, EmergencyWidget, LanguageCard, MedicinesAsk, MedsConfirm, NumberWidget, PhoneWidget, SetupProgress, SummaryCard, TimesWidget, WelcomePreview,
} from "./widgets";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const saheli = (text: string, why?: string): Msg => ({ id: msgId(), from: "saheli", text, why });
const you = (text: string, kind?: Msg["kind"]): Msg => ({ id: msgId(), from: "you", text, kind });

const CARD_OF: Record<string, CardKey> = {
  p_name: "who", p_call: "who", p_home: "who", p_age: "who", p_language: "speaks", p_reads: "speaks", p_conditions: "health", p_checks: "health",
  p_allergies: "health", p_medicines: "meds", p_meds_confirm: "meds", p_day: "day", p_day_times: "day",
};

function blank(myPhone?: string | null): Answers {
  return { you: { name: "", ...(myPhone ? { phone: myPhone } : {}) }, persons: [], helpWith: [], followups: [] };
}

/** A draft from the earlier form, or a half-finished chat, made safe to continue. */
function fromDraft(d: Partial<Answers>, base: Answers): Answers {
  const persons = (d.persons || []).map((p) => ({
    ...p, conditions: p.conditions || [], problems: p.problems || [], allergies: { items: p.allergies?.items || [], none: p.allergies?.none },
    medicines: p.medicines || [], day: { ...(p.day || {}), activities: p.day?.activities || [] }, likes: p.likes || [],
  })) as Person[];
  return { ...base, ...d, you: { ...base.you, ...(d.you || {}), ...(!d.you?.phone && base.you.phone ? { phone: base.you.phone } : {}) }, persons, helpWith: d.helpWith || [], followups: d.followups || [] };
}

function Rich({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return <>{parts.map((p, k) => (k % 2 ? <b key={k} className="font-medium">{p}</b> : <span key={k}>{p}</span>))}</>;
}

const Avatar = ({ show }: { show: boolean }) =>
  show ? <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--c-accent)] text-[15px] font-medium text-white">स</span> : <span className="w-8 shrink-0" />;

export function OnboardingChat() {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [answers, setAnswers] = useState<Answers>(blank());
  const [flow, setFlow] = useState<Flow>(emptyFlow());
  const [chat, setChat] = useState<Msg[]>([]);
  const [verified, setVerified] = useState<Record<string, boolean>>({});
  const [myPhone, setMyPhone] = useState<string | null>(null);
  const [accountName, setAccountName] = useState("");
  const [saheliNumber, setSaheliNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<"chat" | "setup" | "done">("chat");
  const [result, setResult] = useState<SetupResult | null>(null);
  const [text, setText] = useState("");
  const [rec, setRec] = useState<"idle" | "recording" | "reading">("idle");
  const [notice, setNotice] = useState("");
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [fresh, setFresh] = useState<CardKey | null>(null);
  const [nbPick, setNbPick] = useState<{ key?: string; i: number } | null>(null);
  const [nbOpen, setNbOpen] = useState(false);
  const [phoneOverride, setPhoneOverride] = useState(false);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const nurseAsked = useRef(false);

  const ctx: Ctx = useMemo(() => ({ a: answers, flow, verified, myPhone, accountName }), [answers, flow, verified, myPhone, accountName]);
  const current = useMemo(() => (loaded && phase === "chat" ? nextSlot(ctx) : undefined), [ctx, loaded, phase]);
  const turn = current ? ask(current, ctx) : null;
  const self = isSelf(answers);
  // Phones get a short placeholder; a long one wraps in a one-line box.
  const narrow = typeof window !== "undefined" && window.innerWidth < 640;

  /* ── load / resume ── */
  useEffect(() => {
    void (async () => {
      try {
        const st = await onboardingApi.state();
        if (st.status === "done" && !st.draft) {
          router.replace("/dashboard");
          return;
        }
        const base = blank(st.myPhone);
        const d = st.draft?.answers as Partial<Answers> | undefined;
        const a = d ? fromDraft(d, base) : base;
        const vf = Object.fromEntries(Object.keys(st.verified || {}).map((k) => [k, true]));
        let f: Flow;
        let c: Msg[];
        if (st.draft?.chat?.length) {
          c = st.draft.chat.filter((m) => m.kind !== "progress");
          f = { ...emptyFlow(), ...(st.draft.flow || {}) } as Flow;
        } else if (d && (d.careFor || d.persons?.length)) {
          f = seedFlow(a);
          c = [saheli(OPENING), saheli("Welcome back! I've kept everything you told me. Let's pick up where we left off.")];
        } else {
          f = emptyFlow();
          c = [saheli(OPENING)];
        }
        const nc: Ctx = { a, flow: f, verified: vf, myPhone: st.myPhone, accountName: st.name };
        const nx = nextSlot(nc);
        if (nx && nx.base !== "followups" && f.asked !== nx.key) {
          const q = ask(nx, nc);
          c = [...c, ...q.bubbles.map((b, k) => saheli(b, k === q.bubbles.length - 1 ? q.why : undefined))];
          f = { ...f, asked: nx.key };
        }
        setAnswers(a);
        setFlow(f);
        setChat(c);
        setVerified(vf);
        setMyPhone(st.myPhone ?? null);
        setAccountName(st.name || "");
        setSaheliNumber(st.saheliNumber || "");
      } catch (e) {
        setNotice((e as Error).message);
      } finally {
        setLoaded(true);
      }
    })();
  }, [router]);

  /* ── save after every change ── */
  useEffect(() => {
    if (!loaded || phase !== "chat") return;
    const t = setTimeout(() => {
      void onboardingApi.save(answers, flow.asked || "chat", chat.filter((m) => m.kind !== "progress").slice(-200), flow).then(() => setSaved(true), () => setSaved(false));
    }, 600);
    return () => clearTimeout(t);
  }, [answers, flow, chat, loaded, phase]);

  // Keep the newest message and its answer card in view (again shortly after, once cards have their full height).
  useEffect(() => {
    const go = () => endRef.current?.scrollIntoView({ block: "end" });
    const raf = requestAnimationFrame(go);
    const t = setTimeout(go, 250);
    return () => { cancelAnimationFrame(raf); clearTimeout(t); };
  }, [chat.length, busy, current?.key, phoneOverride]);

  /** Saheli's turn: react, then ask whatever comes next. */
  const proceed = useCallback(async (a: Answers, f: Flow, acks: Array<string | undefined>, opts: { you?: Msg; delay?: number; reAsk?: boolean; verified?: Record<string, boolean>; from?: Slot } = {}) => {
    if (opts.you) setChat((c) => [...c, opts.you!]);
    setAnswers(a);
    setFlow(f);
    setPhoneOverride(false);
    setBusy(true);
    await sleep(opts.delay ?? 550);
    const v = opts.verified ?? verified;
    const nc: Ctx = { a, flow: f, verified: v, myPhone, accountName };
    const nx = nextSlot(nc);
    const out: Msg[] = acks.filter((x): x is string => !!x).map((x) => saheli(x));
    let nf = f;
    if (nx && nx.base !== "followups" && (opts.reAsk || f.asked !== nx.key)) {
      const q = ask(nx, nc);
      out.push(...q.bubbles.map((b, k) => saheli(b, k === q.bubbles.length - 1 ? q.why : undefined)));
      nf = { ...f, asked: nx.key };
    }
    setChat((c) => [...c, ...out]);
    setFlow(nf);
    setBusy(false);
    const card = opts.from ? CARD_OF[opts.from.base] : undefined;
    if (card) {
      setFresh(card);
      setTimeout(() => setFresh(null), 2600);
    }
  }, [verified, myPhone, accountName]);

  /* ── Saheli's own questions from everything so far ── */
  useEffect(() => {
    if (current?.base !== "followups" || busy || nurseAsked.current) return;
    nurseAsked.current = true;
    setBusy(true);
    void (async () => {
      let qs: Array<{ id: string; q: string; placeholder?: string }> = [];
      try {
        qs = (await onboardingApi.followups(answers)).questions;
      } catch {
        qs = [];
      }
      const asked = new Set(answers.followups.map((f) => f.q));
      const extras = qs.filter((q) => !asked.has(q.q)).slice(0, 3).map((q, k) => ({ id: `n${k}${Date.now().toString(36)}`, q: q.q, options: [], after: "followups", source: "nurse" as const }));
      const f: Flow = { ...flow, nurse: extras.length ? "asked" : "none", extra: [...flow.extra, ...extras] };
      const p = answers.persons[0];
      await proceed(answers, f, extras.length ? [self ? "A couple more questions from me, so I really understand you." : `A couple more questions from me, so I really understand ${callOf(p)}.`] : [], { delay: 0 });
    })();
  }, [current?.base, busy, answers, flow, proceed, self]);

  if (!loaded) {
    return <div className="flex min-h-screen items-center justify-center"><CircleNotch size={26} className="animate-spin text-[var(--c-accent)]" /></div>;
  }

  const i = current?.person ?? 0;
  // The notebook follows whoever the chat is about, unless a tab was picked for this question.
  const nbIndex = nbPick && nbPick.key === current?.key ? nbPick.i : current?.person ?? nbPick?.i ?? 0;
  const setNbIndex = (k: number) => setNbPick({ key: current?.key, i: k });
  const person = answers.persons[i];

  /* ── answers ── */
  const onChips = (ids: string[]) => {
    if (!current) return;
    if (current.base === "p_whatsapp" && ids[0] === "__other") {
      void proceed(answers, flow, ["Sure — what's the number?"], { you: you("Use another number") }).then(() => setPhoneOverride(true));
      return;
    }
    if ((current.base === "extra" || current.base === "self_f") && ids[0] === "__skip") return onSkip();
    const r = applyChips(current, ids, ctx);
    void proceed(r.a, r.flow, [r.ack], { you: you(r.you), from: current });
  };
  const onSkip = () => current && void proceed(answers, skip(current, flow), [], { you: you("Skip") });

  const onLanguage = (o: LangOption & { just?: boolean }) => {
    if (!current) return;
    const a = patchPerson(answers, i, { language: o.dialect ? o.base : o.code, dialect: o.dialect ? o.code : null });
    void proceed(a, markDone(flow, current.key), [languageAck(a.persons[i], self)], { you: you(o.just ? `Just ${o.name}` : o.code === "en" ? "English" : `${o.native} · ${o.name}`), from: current });
  };

  const scanPhoto = async (f: File) => {
    const at = Math.min(i, Math.max(0, answers.persons.length - 1));
    const p = answers.persons[at];
    if (!p) return;
    const m = you("📷 Prescription photo", "photo");
    setPhotos((x) => ({ ...x, [m.id]: URL.createObjectURL(f) }));
    setChat((c) => [...c, m]);
    setBusy(true);
    try {
      const r = await onboardingApi.prescription(f);
      const t = slotTimes(p);
      const align = (x: string) => ({ "08:00": t.morning, "13:00": t.afternoon, "18:00": t.evening, "21:00": t.night } as Record<string, string>)[x] || x;
      const found = r.medicines.map((x) => ({ ...x, times: [...new Set(x.times.map(align))].sort() }));
      const names = new Set(p.medicines.map((x) => x.name.toLowerCase()));
      const a = patchPerson(answers, at, { medicines: [...p.medicines, ...found.filter((x) => !names.has(x.name.toLowerCase()))], noMedicines: undefined });
      const f2: Flow = { ...markDone(flow, `p_medicines:${at}`), done: flow.done.filter((k) => k !== `p_meds_confirm:${at}`).concat(`p_medicines:${at}`) };
      await proceed(a, f2, [found.length ? `I found ${found.length} medicine${found.length > 1 ? "s" : ""} on it.` : r.note], { delay: 0, from: current });
    } catch (e) {
      await proceed(answers, flow, [(e as Error).message], { delay: 0 });
    }
  };

  const send = async (raw?: string) => {
    const t = (raw ?? text).trim();
    if (!t || busy || !current || phase !== "chat") return;
    setText("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    setNotice("");
    const s = current;
    const m = you(t);
    if (s.base === "p_whatsapp" || s.base === "you_whatsapp") {
      const ph = toPhone(t);
      if (!ph) return void proceed(answers, flow, ["That doesn't look like a WhatsApp number. Type it with the country code, like +91 98290 41123."], { you: m });
      const a = s.base === "you_whatsapp" ? { ...answers, you: { ...answers.you, phone: ph } } : patchPerson(self ? { ...answers, you: { ...answers.you, phone: ph } } : answers, i, { phone: ph });
      setPhoneOverride(true);
      return void proceed(a, flow, ["Got it — verify it below, or continue without verifying."], { you: m }).then(() => setPhoneOverride(true));
    }
    if (s.base === "p_age" && /^\d{1,3}$/.test(t) && Number(t) >= 1 && Number(t) <= 120) {
      const r = applyChips(s, [t], ctx);
      return void proceed(r.a, r.flow, [], { you: m, from: s });
    }
    setChat((c) => [...c, m]);
    setBusy(true);
    const p = answers.persons[s.person ?? 0];
    const aiLeft = Math.max(0, 3 - flow.extra.filter((x) => x.source === "ai").length);
    try {
      const u = await onboardingApi.understand({
        slot: s.base, question: turn?.bubbles.join(" ") ?? "", text: t,
        who: { relation: p?.relation, name: p?.name || undefined, call: p ? callOf(p, self) : undefined, self },
        day: p?.day as Record<string, unknown> | undefined,
        recent: [...chat.slice(-6), m].map((x) => ({ from: x.from, text: x.text.slice(0, 600) })),
        upcoming: upcoming(ctx, s),
        followupsLeft: s.base === "summary" || s.base === "extra" || s.base === "anything_else" ? 0 : Math.min(1, aiLeft),
      });
      const r = applyUnderstood(s, u, t, ctx);
      const a = r.a;
      let f = r.flow;
      if (u.followup && u.answered && aiLeft > 0) f = { ...f, extra: [...f.extra, { id: `x${Date.now().toString(36)}`, q: u.followup.q, options: u.followup.options, after: s.key, person: s.person, source: "ai" }] };
      let acks: Array<string | undefined> = u.answered ? [u.ack] : [u.reply || "Let me come back to that."];
      if (u.answered && s.base === "p_language" && a.persons[i]?.language && a.persons[i].language !== p?.language) acks = [languageAck(a.persons[i], self)];
      if (u.answered && s.base === "summary") acks = [u.ack || "Done — I've updated that."];
      await proceed(a, f, acks, { delay: 0, reAsk: !u.answered, from: s });
    } catch (e) {
      const fb = fallbackUnderstood(s, t, ctx);
      if (fb) await proceed(fb.a, fb.flow, [], { delay: 0, from: s });
      else await proceed(answers, flow, [(e as Error).message || "Sorry, I didn't catch that — could you tap an answer below?"], { delay: 0, reAsk: true });
    }
  };

  const toggleMic = async () => {
    setNotice("");
    if (rec === "recording") return recorder.current?.stop();
    if (rec !== "idle") return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((x) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(x));
      const r = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks: Blob[] = [];
      r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      r.onstop = async () => {
        stream.getTracks().forEach((tr) => tr.stop());
        setRec("reading");
        try {
          const { text: heard } = await onboardingApi.transcribe(new Blob(chunks, { type: r.mimeType || "audio/webm" }));
          setText((x) => (x ? `${x} ${heard}` : heard));
          inputRef.current?.focus();
        } catch (e) {
          setNotice((e as Error).message);
        } finally {
          setRec("idle");
        }
      };
      r.start();
      recorder.current = r;
      setRec("recording");
      setTimeout(() => r.state === "recording" && r.stop(), 60_000);
    } catch {
      setNotice("Allow the microphone to talk to Saheli, or type instead.");
    }
  };

  const later = async () => {
    await onboardingApi.save(answers, flow.asked || "chat", chat.filter((m) => m.kind !== "progress"), flow).catch(() => undefined);
    await onboardingApi.skip().catch(() => undefined);
    router.replace("/dashboard");
  };

  const finish = async () => {
    setPhase("setup");
    const names = answers.persons.map((p) => callOf(p, self)).join(" and ");
    setChat((c) => [...c, you("Set everything up"), saheli(self ? "On it! Setting things up for you…" : `On it! Setting things up for ${names}…`), { id: msgId(), from: "saheli", text: "", kind: "progress" }]);
    try {
      const r = await onboardingApi.complete(answers);
      setResult(r);
      const out: Msg[] = [];
      for (const p of r.persons) {
        const ap = answers.persons.find((x) => x.name === p.name);
        const pr = ap ? callOf(ap, self) : p.addressAs;
        if (!p.userId) {
          out.push(saheli(`I couldn't add ${p.name}: ${p.problems.join(", ")}. You can add ${pr} from the Family page.`));
          continue;
        }
        if (p.welcome === "sent" && p.welcomeText) {
          const voice = ap?.reads === "voice" || ap?.reads === "both";
          out.push(saheli(`This is what I just sent ${pr} 👇${voice ? " It goes as a voice note too." : ""}`), { id: msgId(), from: "saheli", text: p.welcomeText, kind: "welcome", voice });
        } else if (p.welcome === "waiting") {
          const hello = ap?.language && ap.language !== "en" ? `, with a ${greetingFor(ap.language, ap.dialect)}` : "";
          out.push(saheli(self
            ? `Send me a "Namaste" on WhatsApp whenever you're ready — WhatsApp lets me write first only after you've messaged me once. I'll reply right away${hello}.`
            : `Ask ${pr} to send me a "Namaste" on WhatsApp — WhatsApp lets me write first only after they've messaged me once. I'll greet them right away${hello}.`));
        } else if (p.welcome === "not_verified" && !self) {
          out.push(saheli(`Connect ${pr}'s WhatsApp from the Family page and I'll say hello.`));
        }
        if (p.problems.length) out.push(saheli(`A few things didn't save yet: ${p.problems.join(", ")}. You can add them from the dashboard, or just tell me on WhatsApp.`));
      }
      out.push(saheli(`All set, ${(answers.you.callMe || answers.you.name).split(" ")[0]} 🌸 I'll take it from here. You'll hear from me only when it matters — and your dashboard is ready.`));
      setChat((c) => [...c, ...out]);
      setPhase("done");
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status === 409 && /already set up/i.test(err.message)) {
        router.replace("/dashboard");
        return;
      }
      setChat((c) => [...c.filter((m) => m.kind !== "progress"), saheli(`${err.message} Let's try that again.`)]);
      setPhase("chat");
    }
  };

  /* ── the widget under Saheli's question ── */
  const widget = (() => {
    if (!current || !turn || busy || phase !== "chat") return null;
    const w = turn.widget;
    const target = self ? "self" : `person:${i}`;
    if (phoneOverride && current.base === "p_whatsapp" && w.type === "chips") {
      return <PhoneWidget target={target} who={callOf(person, self)} initial={person?.phone} verified={!!verified[target]} saheliNumber={saheliNumber}
        onPhone={(ph) => setAnswers((a) => patchPerson(self ? { ...a, you: { ...a.you, phone: ph } } : a, i, { phone: ph }))}
        onVerified={() => { const v = { ...verified, [target]: true }; setVerified(v); void proceed(answers, markDone(flow, current.key), ["Perfect — your WhatsApp is connected ✓"], { verified: v }); }}
        onContinue={() => void proceed(answers, markDone(flow, current.key), [], { you: you("Continue without verifying") })} />;
    }
    switch (w.type) {
      case "chips":
        return <Chips key={current.key} options={w.options} multi={w.multi} selected={w.selected} exclusive={w.exclusive} skip={w.skip} onPick={onChips} onSkip={onSkip} />;
      case "language":
        return <LanguageCard key={current.key} person={person} self={self} onPick={onLanguage} />;
      case "medicines":
        return <MedicinesAsk busy={busy} self={self} onPhoto={(f) => void scanPhoto(f)} onType={() => inputRef.current?.focus()}
          onNone={() => void proceed(patchPerson(answers, i, { noMedicines: true, medicines: [] }), markDone(flow, current.key), [], { you: you(self ? "I don't take any" : "No regular medicines"), from: current })} />;
      case "meds_confirm":
        return <MedsConfirm key={current.key} person={person} onConfirm={(meds) => { const r = confirmMeds(current, meds, ctx); void proceed(r.a, r.flow, [r.ack], { you: you(r.you), from: current }); }} />;
      case "phone": {
        const isYou = w.target === "self" && !self;
        const other = !self && i > 0 ? answers.persons[0]?.phone : !self && answers.persons[1] ? answers.persons[1].phone : undefined;
        const who = isYou ? "your" : callOf(person, self);
        return <PhoneWidget key={current.key} target={w.target} who={isYou ? "You" : who} initial={isYou ? answers.you.phone : person?.phone} otherPhone={isYou ? undefined : other}
          verified={!!verified[w.target]} saheliNumber={saheliNumber} optional={w.optional}
          onPhone={(ph) => setAnswers((a) => (isYou ? { ...a, you: { ...a.you, phone: ph } } : patchPerson(self ? { ...a, you: { ...a.you, phone: ph } } : a, i, { phone: ph })))}
          onVerified={() => {
            const v = { ...verified, [w.target]: true };
            setVerified(v);
            void proceed(answers, markDone(flow, current.key), [isYou || self ? "Perfect — your WhatsApp is connected ✓" : `${callOf(person)}'s WhatsApp is connected ✓`], { verified: v });
          }}
          onContinue={() => void proceed(answers, markDone(flow, current.key), [isYou || self ? undefined : "No problem — you can connect it later from the Family page."], { you: you("Continue without verifying") })}
          onSkip={onSkip} />;
      }
      case "times":
        return <TimesWidget key={current.key} person={person} self={self} onDone={(day) => {
          const a = patchPerson(answers, i, { day: { ...person.day, ...day } });
          const said = [`Up ${day.wake}`, `breakfast ${day.breakfast}`, `lunch ${day.lunch}`, `dinner ${day.dinner}`, `sleep ${day.sleep}`].join(" · ");
          void proceed(a, markDone(flow, current.key, `p_day:${i}`), [self ? "Perfect — I'll keep to your waking hours." : `Perfect — I'll keep my messages to ${callOf(person)}'s waking hours.`], { you: you(said), from: current });
        }} />;
      case "number":
        return <NumberWidget key={current.key} placeholder={w.placeholder} skip={w.skip} onSkip={onSkip} onValue={(n) => { const r = applyChips(current, [String(n)], ctx); void proceed(r.a, r.flow, [], { you: you(String(n)), from: current }); }} />;
      case "emergency":
        return <EmergencyWidget onSkip={onSkip} onSave={(e) => void proceed({ ...answers, emergency: e }, markDone(flow, current.key), ["Thank you — I'll only call them if I really can't reach you."], { you: you(`${e.name}${e.relation ? ` (${e.relation})` : ""}, ${e.phone}`) })} />;
      case "summary":
        return (
          <div className="space-y-3">
            {answers.persons.map((p, k) => (
              <SummaryCard key={k} person={self ? { ...p, name: answers.you.name || p.name } : p} call={callOf(p, self)} rows={summaryRows(ctx, k)}
                onEdit={(key, label) => void proceed(answers, { ...flow, done: flow.done.filter((x) => x !== key), editing: key }, [], { you: you(`Change ${label.toLowerCase()}`) })} />
            ))}
            <div className="flex flex-wrap gap-2 pt-1">
              <button type="button" onClick={() => void finish()} className="inline-flex h-12 items-center gap-2 rounded-full bg-[var(--c-accent)] px-6 text-[14.5px] font-medium text-white">Set everything up <ArrowRight size={16} /></button>
              <button type="button" onClick={() => void proceed(answers, flow, ["Sure — tap the pencil next to anything, or just tell me what to change."], { you: you("Change something") })}
                className="inline-flex h-12 items-center rounded-full border border-[var(--c-line)] bg-white px-5 text-[14px]">Change something</button>
            </div>
          </div>
        );
      default:
        return null;
    }
  })();

  const at = phase === "chat" ? chapterIndex(current) : CHAPTERS.length;
  const chapterName = (c: string) => (self && c === "Their day" ? "Your day" : c);
  const np = answers.persons[nbIndex];
  const known = np ? [np.name, np.language, np.conditions.length || np.allergies.none || np.allergies.items.length, np.medicines.length || np.noMedicines, np.day.wake].filter(Boolean).length : 0;
  const notebookTitle = known ? `${known} thing${known > 1 ? "s" : ""} so far` : "listening";

  return (
    <div className="flex h-dvh w-full bg-[var(--c-page)] lg:p-3">
      <div className="flex min-w-0 flex-1 flex-col bg-[var(--c-frame)] lg:rounded-l-[28px]">
        <header className="px-5 pt-4 sm:px-8 sm:pt-6">
          <div className="flex items-center justify-between gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/kavach-careos-logo.png" alt="Kavach CareOS" className="h-7 w-auto sm:h-9" />
            <nav className="hidden items-center gap-1.5 md:flex" aria-label="Progress">
              {CHAPTERS.map((c, k) => (
                <span key={c} className={cn("flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px]", k === at ? "bg-[var(--c-card)] font-medium" : k < at ? "text-[var(--c-ink-2)]" : "text-[var(--c-ink-3)]")}>
                  {k < at ? <span className="text-[11px] text-[#1f7a4d]">✓</span> : k === at ? <span className="h-1.5 w-1.5 rounded-full bg-[var(--c-accent)]" /> : null}{chapterName(c)}
                </span>
              ))}
            </nav>
            {phase !== "done" && (
              <span className="shrink-0 text-[12.5px] text-[var(--c-ink-3)]">{saved ? "Saved · " : ""}<button type="button" onClick={() => void later()} className="underline underline-offset-4 hover:text-[var(--c-ink)]">Finish later</button></span>
            )}
          </div>
          <div className="mt-3 flex gap-1 md:hidden">{CHAPTERS.map((c, k) => <span key={c} className={cn("h-1 flex-1 rounded-full", k < at ? "bg-[var(--c-ink)]" : k === at ? "bg-[var(--c-accent)]" : "bg-[var(--c-card)]")} />)}</div>
          <button type="button" onClick={() => setNbOpen((x) => !x)} className="mt-3 flex w-full items-center justify-between rounded-full bg-[var(--c-card)] px-4 py-2 text-[12.5px] lg:hidden">
            <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-[3px] bg-[var(--c-accent)]" />Saheli&apos;s notebook · <b className="font-medium">{notebookTitle}</b></span>
            <CaretDown size={14} className={cn("transition", nbOpen && "rotate-180")} />
          </button>
          {nbOpen && <div className="mt-2 max-h-[55vh] overflow-y-auto rounded-[22px] bg-[var(--c-card)] p-4 lg:hidden"><Notebook answers={answers} index={nbIndex} onIndex={setNbIndex} compact /></div>}
        </header>

        <main className="flex-1 overflow-y-auto px-4 sm:px-8">
          <div className="mx-auto flex min-h-full w-full max-w-[720px] flex-col justify-end gap-3.5 pb-6 pt-8">
            <div className="mb-4 flex flex-col items-start gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--c-accent)] text-[26px] font-medium text-white">स</span>
              <h1 className="text-[36px] leading-[1.02] tracking-[-0.035em] sm:text-[44px]"><span className="block font-light text-[var(--c-ink-3)]">Let&apos;s set up Saheli</span><span className="block font-medium">together.</span></h1>
              <p className="max-w-[460px] text-[14px] text-[var(--c-ink-2)]">Just a chat — she&apos;ll ask what she needs to know about your family, one thing at a time.</p>
            </div>
            {chat.map((m, k) => {
              const lastOfGroup = chat[k + 1]?.from !== m.from || chat[k + 1]?.kind === "progress" || chat[k + 1]?.kind === "welcome";
              if (m.kind === "progress") return <div key={m.id} className="sm:ml-11"><SetupProgress steps={setupSteps(answers, verified)} finished={phase === "done" || !!result} /></div>;
              if (m.kind === "welcome") return <div key={m.id} className="sm:ml-11"><WelcomePreview text={m.text} voice={!!m.voice} /></div>;
              if (m.from === "you") {
                return (
                  <div key={m.id} className="flex justify-end">
                    {m.kind === "photo" && photos[m.id]
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <div className="w-[200px] overflow-hidden rounded-[22px] rounded-br-[6px] bg-[var(--c-ink)] p-1.5"><img src={photos[m.id]} alt="Prescription" className="h-[140px] w-full rounded-[17px] object-cover" /><p className="px-2 py-1.5 text-[12px] text-white/70">Prescription photo</p></div>
                      : <div className="max-w-[80%] whitespace-pre-wrap rounded-[22px] rounded-br-[6px] bg-[var(--c-ink)] px-4 py-3 text-[15px] leading-[1.5] text-white">{m.text}</div>}
                  </div>
                );
              }
              return (
                <div key={m.id} className="flex items-end gap-3">
                  <Avatar show={lastOfGroup} />
                  <div className="max-w-[84%] sm:max-w-[78%]">
                    <div className={cn("rounded-[22px] bg-[var(--c-card)] px-4 py-3 text-[15px] leading-[1.5]", lastOfGroup && "rounded-bl-[6px]")}><Rich text={m.text} /></div>
                    {m.why && <p className="mt-1.5 flex items-center gap-1 pl-1 text-[11.5px] text-[var(--c-ink-3)]"><Sparkle size={12} weight="fill" className="text-[var(--c-accent)]" />{m.why}</p>}
                  </div>
                </div>
              );
            })}
            {busy && (
              <div className="flex items-end gap-3">
                <Avatar show />
                <div className="flex gap-1 rounded-[22px] rounded-bl-[6px] bg-[var(--c-card)] px-4 py-4" aria-label="Saheli is typing">
                  {[0, 1, 2].map((d) => <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--c-ink-2)]" style={{ animationDelay: `${d * 0.15}s` }} />)}
                </div>
              </div>
            )}
            {widget && <div className="sm:ml-11">{widget}</div>}
            {phase === "done" && (
              <div className="sm:ml-11"><button type="button" onClick={() => router.replace("/dashboard")} className="inline-flex h-12 items-center gap-2 rounded-full bg-[var(--c-ink)] px-6 text-[14.5px] font-medium text-white">Open my dashboard <ArrowRight size={16} /></button></div>
            )}
            <div ref={endRef} />
          </div>
        </main>

        {phase === "chat" && (
          <footer className="mx-auto w-full max-w-[784px] px-3 pb-4 sm:px-8 sm:pb-6">
            <div className="flex items-end gap-2 rounded-[26px] border border-[var(--c-line)] bg-white p-1.5 pl-5">
              <textarea ref={inputRef} rows={1} value={text} maxLength={1500} disabled={busy}
                onChange={(e) => { setText(e.target.value); e.target.style.height = "auto"; e.target.style.height = `${Math.min(120, e.target.scrollHeight)}px`; }}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
                placeholder={rec === "recording" ? "Listening… tap stop when done" : rec === "reading" ? "Writing down what you said…" : narrow ? "Type or talk…" : turn?.placeholder || "Type your answer…"}
                aria-label="Your answer" className="min-h-10 min-w-0 flex-1 resize-none overflow-hidden bg-transparent py-2.5 text-[15px] outline-none placeholder:truncate placeholder:text-[var(--c-ink-3)]" />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={busy || !answers.persons.length} aria-label="Send a photo of a prescription" className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--c-ink-2)] hover:bg-[var(--c-card)] disabled:opacity-40"><Camera size={19} /></button>
              <button type="button" onClick={() => void toggleMic()} disabled={busy || rec === "reading"} aria-label={rec === "recording" ? "Stop recording" : "Talk to Saheli"}
                className={cn("flex h-10 w-10 items-center justify-center rounded-full", rec === "recording" ? "animate-pulse bg-[var(--c-danger)] text-white" : "bg-[var(--c-card)]")}>
                {rec === "reading" ? <CircleNotch size={18} className="animate-spin" /> : rec === "recording" ? <Stop size={17} weight="fill" /> : <Microphone size={19} />}
              </button>
              <button type="button" onClick={() => void send()} disabled={busy || !text.trim()} aria-label="Send" className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--c-accent)] text-white disabled:opacity-40"><ArrowUp size={17} weight="bold" /></button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void scanPhoto(f); e.target.value = ""; }} />
            </div>
            <p className={cn("mt-2 text-center text-[11.5px]", notice ? "text-[var(--c-danger)]" : "text-[var(--c-ink-3)]")}>{notice || "Tap an answer, type, or tap the mic and just talk — in English, Hindi or your own bhasha."}</p>
          </footer>
        )}
      </div>
      <aside className="hidden w-[440px] shrink-0 bg-[var(--c-frame)] p-3 pl-0 lg:block lg:rounded-r-[28px]">
        <div className="h-full overflow-y-auto rounded-[22px] bg-[var(--c-card)] p-7">
          <p className="mb-5 flex items-center gap-2 text-[13px] font-medium"><span className="h-3.5 w-3.5 rounded-[4px] bg-[var(--c-accent)]" />Saheli&apos;s notebook</p>
          <Notebook answers={answers} index={nbIndex} onIndex={setNbIndex} fresh={fresh} />
          {phase === "done" && result && <p className="mt-4 text-[13px] text-[#1f7a4d]">✓ Saheli is with {result.persons.filter((p) => p.userId).map((p) => p.addressAs).join(" and ") || "you"} now</p>}
        </div>
      </aside>
    </div>
  );
}

function setupSteps(a: Answers, verified: Record<string, boolean>): string[] {
  const self = isSelf(a);
  const p = a.persons[0];
  const names = a.persons.map((x) => callOf(x, self)).join(" and ");
  const lang = p ? option(p.dialect || p.language || "") : undefined;
  const doses = a.persons.reduce((n, x) => n + x.medicines.reduce((k, m) => k + m.times.length, 0), 0);
  const steps = [
    self ? "Setting up your profile" : `Adding ${names} to your family`,
    lang ? `I'll speak ${lang.name}${p?.reads && p.reads !== "text" ? ", with voice notes" : ""}` : "Choosing how I'll talk",
    doses ? `${doses} medicine reminder${doses > 1 ? "s" : ""} a day` : "Noting health and allergies",
    "Planning gentle check-ins",
    self ? "Writing notes about your day" : "Notes about their day and health",
  ];
  if (!self && a.persons.some((_, k) => verified[`person:${k}`])) steps.push(`Saying ${greetingFor(p?.language, p?.dialect)} on WhatsApp`);
  return steps;
}
