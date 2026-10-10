/**
 * The onboarding conversation: what Saheli asks next, in her words, and what each tap means. The order adapts to the
 * answers (self-care or family, both parents, diabetes or BP → home checks, lives alone → someone nearby, the chosen
 * self-care areas → their own follow-ups), and Saheli's own follow-up questions slot in where they came up. Free
 * answers (typed or spoken) are read by the backend; this file only plans and words the conversation.
 */
import { ALLERGIES, CALL_NAMES, CONDITIONS, GENDER_OF, HELP_WITH, LIKES, PROBLEMS, RELATION_OF, pronoun, type Answers, type Med, type Person } from "../data";
import { greetingFor, option, regionTop, scriptFor } from "./region";

export type Chapter = "You" | "Who" | "Their day" | "Health" | "Connect";
export const CHAPTERS: Chapter[] = ["You", "Who", "Their day", "Health", "Connect"];

export type Msg = { id: string; from: "saheli" | "you"; text: string; why?: string; kind?: "text" | "photo" | "welcome" | "progress"; voice?: boolean };
export type Extra = { id: string; q: string; options: string[]; after: string; person?: number; source: "ai" | "nurse" };
/** done: answered slots; extra: Saheli's own follow-ups; editing: a slot reopened from the summary; asked: the question on screen. */
export type Flow = { done: string[]; extra: Extra[]; editing?: string | null; nurse?: "asked" | "none"; asked?: string };
export const emptyFlow = (): Flow => ({ done: [], extra: [] });

export type Option = { id: string; label: string; icon?: string; hint?: string };
export type Widget =
  | { type: "chips"; options: Option[]; multi?: boolean; selected?: string[]; exclusive?: string[]; skip?: string }
  | { type: "language"; person: number }
  | { type: "medicines"; person: number }
  | { type: "meds_confirm"; person: number }
  | { type: "phone"; target: string; person?: number; optional?: boolean }
  | { type: "times"; person: number }
  | { type: "number"; placeholder: string; skip?: string }
  | { type: "emergency" }
  | { type: "summary" }
  | { type: "none" };

export type Slot = { key: string; base: string; person?: number; chapter: Chapter; optional?: boolean; extra?: Extra };
export type Ctx = { a: Answers; flow: Flow; verified: Record<string, boolean>; myPhone?: string | null; accountName?: string };
export type Turn = { bubbles: string[]; why?: string; widget: Widget; placeholder: string; topic: string };

let seq = 0;
export const msgId = () => `m${Date.now().toString(36)}${(seq++).toString(36)}`;

/* ── who is who ─────────────────────────────────────────────────────────── */

export const isSelf = (a: Answers) => a.careFor === "self";
const first = (s?: string) => (s || "").trim().split(/\s+/)[0] || "";
const PARENT_WORDS = /^(maa|ma|mummy|mumma|mom|amma|aai|ammi|baa|bebe|biji|papa|pitaji|appa|baba|abbu|bauji|nanna|daddy|dad|dadi|nani|dadu|nana|dada|dadaji|nanaji|thatha|paati|ammamma|ajji|aaji|ajoba|thakuma|thakurda)$/i;

/** What Saheli calls them: "Maa" → "Maa ji"; a name stays a name. */
export const suggestAddress = (callThem: string) => (PARENT_WORDS.test(callThem.trim()) ? `${callThem.trim()} ji` : callThem.trim());

export function callOf(p?: Person, self?: boolean): string {
  if (!p) return "them";
  if (self) return "you";
  return p.addressAs || p.callThem || first(p.name) || `your ${p.relation.toLowerCase()}`;
}

export function chatPerson(relation: string, extra: Partial<Person> = {}): Person {
  return { relation, name: "", conditions: [], problems: [], allergies: { items: [] }, medicines: [], day: { activities: [] }, likes: [], gender: GENDER_OF[relation], ...extra };
}

/** Choosing who to look after creates the people (keeping anyone already answered). */
export function withCareFor(a: Answers, careFor: NonNullable<Answers["careFor"]>): Answers {
  const relations = careFor === "both_parents" ? ["Mother", "Father"] : [RELATION_OF[careFor]];
  const persons = relations.map((r, k) => {
    const had = a.persons[k];
    if (had && had.relation === r) return had;
    if (r === "Self") return chatPerson("Self", { name: a.you.name, addressAs: a.you.callMe || first(a.you.name), phone: a.you.phone });
    return chatPerson(r);
  });
  return { ...a, careFor, persons };
}

const hasDiabetes = (p: Person) => p.conditions.some((c) => /diabet|sugar/i.test(c));
const hasBp = (p: Person) => p.conditions.some((c) => /\bbp\b|blood pressure|hypertension/i.test(c));
const validPhone = (p?: string) => !!p && /^\+\d{8,15}$/.test(p);

/** A typed number → E.164 ("98290 41123" → "+919829041123"), or undefined. */
export function toPhone(raw: string): string | undefined {
  const s = raw.trim();
  let d = s.replace(/\D/g, "");
  if (!d) return undefined;
  if (d.startsWith("00")) d = d.slice(2);
  else if (!s.startsWith("+") && d.length === 11 && d.startsWith("0")) d = `91${d.slice(1)}`;
  else if (!s.startsWith("+") && d.length === 10) d = `91${d}`;
  return /^\d{8,15}$/.test(d) ? `+${d}` : undefined;
}

/* ── self-care areas and their own follow-ups ──────────────────────────── */

export const SELF_AREAS: Option[] = [
  { id: "reminders", label: "Medicines on time", icon: "pill" },
  { id: "sleep", label: "Sleep better", icon: "moon" },
  { id: "mood", label: "Stress & mood", icon: "smiley" },
  { id: "water", label: "Drink more water", icon: "drop" },
  { id: "walks", label: "Walks & exercise", icon: "sneaker" },
  { id: "cycle", label: "Periods & cycle", icon: "calendar" },
  { id: "appointments", label: "Doctor visits & reports", icon: "firstaid" },
  { id: "company", label: "Someone to talk to", icon: "chat" },
];
const SELF_FOLLOWUP: Record<string, { q: string; options: string[]; why: string }> = {
  sleep: { q: "Let's start with sleep. What usually keeps you up at night?", options: ["Work on my mind", "Phone till late", "Worrying about family", "Body pain", "I wake up at night"], why: "Asked because you picked sleep" },
  mood: { q: "When does stress hit you the most?", options: ["Work", "Family", "Health worries", "Money", "Feeling alone", "Not sure"], why: "Asked because you picked stress & mood" },
  water: { q: "Roughly how many glasses of water do you drink in a day?", options: ["1–3 glasses", "4–6 glasses", "7 or more"], why: "Asked because you picked water" },
  walks: { q: "What would feel doable for you most days?", options: ["A 10-minute walk", "A 30-minute walk", "Yoga or stretching", "Gym"], why: "Asked because you picked exercise" },
  cycle: { q: "Would you like gentle reminders around your period?", options: ["Yes, help me track it", "Not right now"], why: "Asked because you picked periods & cycle" },
  appointments: { q: "Any check-ups or reports coming up that I should remember?", options: ["Nothing right now"], why: "Asked because you picked doctor visits" },
};

/* ── the plan ──────────────────────────────────────────────────────────── */

const CHAPTER_OF: Record<string, Chapter> = {
  you_name: "You", care_for: "You", self_help: "Who", self_f: "Who", p_name: "Who", p_call: "Who", p_home: "Who", p_age: "Who", p_language: "Who", p_reads: "Who",
  p_day: "Their day", p_day_times: "Their day", p_likes: "Their day",
  p_conditions: "Health", p_checks: "Health", p_allergies: "Health", p_medicines: "Health", p_meds_confirm: "Health", p_problems: "Health",
};
const slot = (base: string, person?: number, optional?: boolean): Slot => ({
  key: person === undefined ? base : `${base}:${person}`, base, person, optional, chapter: CHAPTER_OF[base] ?? "Connect",
});

export function plan(c: Ctx): Slot[] {
  const { a, flow } = c;
  const out: Slot[] = [slot("you_name"), slot("care_for")];
  if (!a.careFor) return out;
  const self = isSelf(a);
  if (self) {
    out.push(slot("self_help"));
    for (const area of a.helpWith) if (SELF_FOLLOWUP[area]) out.push({ ...slot("self_f"), key: `self_f:${area}` });
  }
  a.persons.forEach((p, i) => {
    if (!self) out.push(slot("p_name", i), slot("p_call", i));
    out.push(slot("p_home", i), slot("p_age", i, true), slot("p_language", i), slot("p_reads", i));
    out.push(slot("p_day", i), slot("p_day_times", i));
    if (!self) out.push(slot("p_likes", i, true));
    out.push(slot("p_conditions", i));
    if (hasDiabetes(p) || hasBp(p)) out.push(slot("p_checks", i));
    out.push(slot("p_allergies", i), slot("p_medicines", i));
    if (p.medicines.length) out.push(slot("p_meds_confirm", i));
    if (!self) out.push(slot("p_problems", i, true));
    out.push(slot("p_whatsapp", i));
    if (!self) out.push(slot("p_codes", i));
  });
  if (!self) {
    out.push(slot("help_with"));
    if (a.persons.some((p) => p.livesWith === "alone")) out.push(slot("emergency", undefined, true));
    // Codes go to your phone for someone: then your WhatsApp is needed, not optional.
    if (!c.myPhone) out.push(slot("you_whatsapp", undefined, !a.persons.some((p) => p.codesFrom === "me")));
  }
  out.push(slot("followups"));
  out.push(slot("anything_else", undefined, true), slot("summary"));
  // Saheli's own follow-ups go right after the answer they came from.
  for (const x of flow.extra) {
    const at = out.findIndex((s) => s.key === x.after);
    const ins: Slot = { key: x.id, base: "extra", person: x.person, chapter: at >= 0 ? out[at].chapter : "Connect", optional: true, extra: x };
    let pos = at >= 0 ? at + 1 : out.findIndex((s) => s.base === "anything_else");
    while (pos < out.length && out[pos].base === "extra") pos++;
    out.splice(pos, 0, ins);
  }
  return out;
}

/** Answered already, by a tap or because they mentioned it earlier. */
export function isDone(s: Slot, c: Ctx): boolean {
  const { a, flow } = c;
  if (flow.editing === s.key) return false;
  if (flow.done.includes(s.key)) return true;
  const p = s.person !== undefined ? a.persons[s.person] : undefined;
  switch (s.base) {
    case "care_for": return !!a.careFor;
    case "p_name": return !!p?.name;
    case "p_home": return !!p?.city;
    case "p_age": return !!p?.age;
    case "p_language": return !!p?.language;
    case "p_reads": return !!p?.reads;
    case "p_day": return !!(p?.day.wake && p?.day.sleep);
    case "p_day_times": return !!(p?.day.wake && p?.day.sleep);
    case "p_likes": return !!(p?.likes.length || p?.likesOther);
    case "p_conditions": return !!(p?.conditions.length || p?.conditionsOther);
    case "p_checks": return !!p && (!hasDiabetes(p) || !!p.sugarCheck) && (!hasBp(p) || p.bpMachine !== undefined);
    case "p_allergies": return !!(p?.allergies.none || p?.allergies.items.length);
    case "p_medicines": return !!(p?.noMedicines || p?.medicines.length);
    case "p_problems": return !!(p?.problems.length || p?.problemsOther);
    case "p_whatsapp": return validPhone(p?.phone) && !!c.verified[isSelf(a) ? "self" : `person:${s.person}`];
    case "p_codes": return !!p?.codesFrom;
    case "you_whatsapp": return validPhone(a.you.phone) && !!c.verified.self;
    case "emergency": return !!a.emergency?.name;
    case "followups": return !!flow.nurse;
    default: return false;
  }
}

export const nextSlot = (c: Ctx): Slot | undefined => plan(c).find((s) => !isDone(s, c));
export const chapterIndex = (s?: Slot) => (s ? CHAPTERS.indexOf(s.chapter) : CHAPTERS.length);

/** For an old-style draft (answers, no chat): everything already answered counts as done. */
export function seedFlow(a: Answers): Flow {
  const flow = emptyFlow();
  const c: Ctx = { a, flow, verified: {} };
  for (const s of plan(c)) {
    if (s.base === "summary" || s.base === "followups") continue;
    const p = s.person !== undefined ? a.persons[s.person] : undefined;
    const answered = isDone(s, c) || (s.base === "you_name" && !!a.you.name) || (s.base === "p_call" && !!(p?.addressAs || p?.callThem))
      || (s.base === "p_meds_confirm" && !!p?.medicines.length) || (s.base === "help_with" && a.helpWith.length > 0 && !!a.persons[0]?.name)
      || (s.base === "self_help" && a.helpWith.length > 0) || (s.base === "anything_else" && !!a.anythingElse);
    if (answered) flow.done.push(s.key);
  }
  return flow;
}

/* ── what Saheli says ──────────────────────────────────────────────────── */

export const OPENING = "Namaste! I'm **Saheli** 🙏 I look after parents on WhatsApp — medicines, check-ins, a little company every day.";

const CARE_OPTIONS: Option[] = [
  { id: "mother", label: "My mother", icon: "user" }, { id: "father", label: "My father", icon: "user" }, { id: "both_parents", label: "Both parents", icon: "users" },
  { id: "self", label: "Myself", icon: "heart" }, { id: "grandmother", label: "My grandmother", icon: "users" }, { id: "grandfather", label: "My grandfather", icon: "users" },
  { id: "spouse", label: "My husband or wife", icon: "heart" }, { id: "other", label: "Someone else", icon: "dots" },
];

const listText = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

export function ask(s: Slot, c: Ctx): Turn {
  const { a } = c;
  const self = isSelf(a);
  const i = s.person ?? 0;
  const p = a.persons[i];
  const pr = self ? { they: "you", them: "you", their: "your", They: "You" } : p ? pronoun(p) : { they: "they", them: "them", their: "their", They: "They" };
  const call = callOf(p, self);
  const Call = call.charAt(0).toUpperCase() + call.slice(1);
  const me = first(a.you.callMe || a.you.name);
  const both = a.careFor === "both_parents";
  const t = (bubbles: string | string[], widget: Widget, placeholder: string, topic: string, why?: string): Turn => ({ bubbles: Array.isArray(bubbles) ? bubbles : [bubbles], widget, placeholder, topic, why });
  const none: Widget = { type: "none" };

  switch (s.base) {
    case "you_name": {
      const acc = first(c.accountName);
      return t("Before I start, I'd love to know your family a little. It takes about 3 minutes. What's your name?",
        acc ? { type: "chips", options: [{ id: c.accountName!, label: c.accountName! }] } : none, "Your name", "your name");
    }
    case "care_for":
      return t(`Lovely to meet you, ${me}. Who would you like me to look after?`, { type: "chips", options: CARE_OPTIONS }, "Or type it in your own words…", "who Saheli looks after");
    case "self_help":
      return t(`I love that you're making time for yourself, ${me} 🌸 What would you like a little help with?`,
        { type: "chips", options: SELF_AREAS, multi: true, selected: a.helpWith.filter((h) => SELF_AREAS.some((o) => o.id === h)) }, "Tell me in your own words…", "what you want help with");
    case "self_f": {
      const area = s.key.split(":")[1];
      const f = SELF_FOLLOWUP[area];
      return t(f.q, { type: "chips", options: f.options.map((o) => ({ id: o, label: o })), skip: "Skip" }, "Or tell me in your own words…", f.q, f.why);
    }
    case "p_name": {
      const lead = both ? (i === 0 ? "Let's start with your mother. " : "Now your father. ") : "";
      if (p.relation === "Relative") return t("Who is it — and what's their name? (Like: my aunt, Sushila)", none, "e.g. My aunt Sushila, we call her Mausi", "their name and relation");
      if (p.relation === "Spouse") return t("What's your partner's name — and what do you call them?", none, "e.g. Rakesh", "their name");
      return t(`${lead}What's ${pr.their} name — and what do you call ${pr.them} at home?`, none, `e.g. Kamla Devi, we call ${pr.them} Maa`, "their name and what the family calls them");
    }
    case "p_call": {
      if (p.callThem) {
        const sug = suggestAddress(p.callThem);
        const opts = [{ id: sug, label: `${sug} is perfect` }];
        if (sug !== p.callThem) opts.push({ id: p.callThem, label: `Just ${p.callThem}` });
        return t(`Thank you. I'll call ${pr.them} **${sug}** unless you'd like something else.`, { type: "chips", options: opts }, `Or type what I should call ${pr.them}…`, "what Saheli should call them");
      }
      const names = CALL_NAMES[p.relation] ?? [];
      return t(`What do you call ${first(p.name) || pr.them} at home?`, names.length ? { type: "chips", options: names.map((n) => ({ id: n, label: n })) } : none, "e.g. Maa, Amma, Papa…", "what the family calls them");
    }
    case "p_home": {
      if (self) return t("Which city or town do you live in?", none, "e.g. Pune", "the city they live in");
      if (p.livesWith && !p.city) return t(`And which city or town is ${call} in?`, none, "e.g. Jodhpur", "the city they live in");
      const partner = p.relation === "Mother" ? "With Papa" : p.relation === "Father" ? "With Maa" : "With partner";
      return t(`Where does ${call} live, and who's at home with ${pr.them}?`,
        { type: "chips", options: [{ id: "alone", label: "Lives alone" }, { id: "spouse", label: partner }, { id: "me", label: "With me" }, { id: "family", label: "With family" }] },
        "e.g. Jodhpur, lives alone", "the city they live in and who lives with them");
    }
    case "p_age":
      return t(self ? "And how old are you?" : `How old is ${call}?`, { type: "number", placeholder: "Age", skip: "Skip" }, "Age", "their age");
    case "p_language": {
      const top = regionTop(p.city, p.state)[0];
      const where = p.city?.split(",")[0];
      if (top && where) {
        const most = `Most families in ${where} speak ${top.name} at home.`;
        return t(self ? `${most} Which language would you like me to talk to you in?` : `${most} What does ${call} speak?`, { type: "language", person: i }, "Or type any language or bhasha…", "the language or bhasha they speak", `Suggested from ${where}`);
      }
      return t(self ? "Which language would you like me to talk to you in? Your local bhasha works too." : `Which language does ${call} speak most comfortably at home? A local bhasha works too.`,
        { type: "language", person: i }, "Or type any language or bhasha…", "the language or bhasha they speak");
    }
    case "p_reads":
      return t(self ? "Should I text you, send voice notes, or both?" : `Should I send ${call} text messages, voice notes, or both?`,
        { type: "chips", options: [
          { id: "text", label: "Text messages", hint: self ? "I read comfortably" : `${pr.They} reads comfortably` },
          { id: "voice", label: "Voice notes", hint: "Easier than reading" },
          { id: "both", label: "Both", hint: "Text, with a voice note" },
        ] }, "Or tell me…", "text messages, voice notes or both");
    case "p_day":
      return t(self ? "What does your usual day look like? Roughly when do you wake up, eat and sleep?" : `What does ${call}'s usual day look like? Roughly when does ${pr.they} wake up, eat and sleep?`,
        { type: "chips", options: [{ id: "__times", label: "Pick times instead" }] }, self ? "e.g. up at 6:30, lunch at 1, sleep by 11" : `e.g. up at 5:30 for puja, lunch at 1, sleeps by 9:30`, "their usual day: wake-up, meals, sleep, routines");
    case "p_day_times":
      return t(self ? "Roughly when do you wake up, eat and go to sleep? Meal times help me time your medicines." : `Roughly when does ${call} wake up, eat and go to sleep? Meal times help me time ${pr.their} medicines.`,
        { type: "times", person: i }, "Or type the times…", "wake-up, meal and sleep times");
    case "p_likes":
      return t(`What does ${call} enjoy talking about? I'll bring these up when we chat.`,
        { type: "chips", options: LIKES.map((l) => ({ id: l, label: l })), multi: true, selected: p.likes, skip: "Skip" }, "Or tell me — and anything I should never bring up…", "what they enjoy talking about, and topics to avoid");
    case "p_conditions":
      return t(self ? "Any long-term health conditions I should know about?" : `Does ${call} have any long-term health conditions?`,
        { type: "chips", options: [...CONDITIONS.map((x) => ({ id: x, label: x })), { id: "__none", label: "None" }], multi: true, selected: p.conditions, exclusive: ["__none"] },
        "Or type them…", "long-term health conditions");
    case "p_checks": {
      const what = hasDiabetes(p) && hasBp(p) ? "diabetes and BP" : hasDiabetes(p) ? "diabetes" : "BP";
      const opts: Option[] = [];
      if (hasDiabetes(p)) opts.push({ id: "sugar_daily", label: "Sugar every day" }, { id: "sugar_sometimes", label: "Sugar sometimes" });
      if (hasBp(p)) opts.push({ id: "bp_machine", label: self ? "I have a BP machine" : "Has a BP machine" });
      opts.push({ id: "__neither", label: hasDiabetes(p) && hasBp(p) ? "Neither" : "No" });
      return t(self ? `Do you check ${hasDiabetes(p) && hasBp(p) ? "these" : "it"} at home?` : `Does ${pr.they} check ${hasDiabetes(p) && hasBp(p) ? "these" : "it"} at home?`,
        { type: "chips", options: opts, multi: true, exclusive: ["__neither"] }, "Or tell me…", "whether they check sugar or BP at home", `Asked because of ${what}`);
    }
    case "p_allergies":
      return t(self ? "Are you allergic to any medicine or food?" : `Is ${call} allergic to any medicine or food?`,
        { type: "chips", options: [{ id: "__none", label: "No allergies" }, ...ALLERGIES.map((x) => ({ id: x, label: x }))], multi: true, selected: p.allergies.items, exclusive: ["__none"] },
        "Or type them…", "allergies to medicines or food");
    case "p_medicines":
      return t(self ? "Do you take any medicines regularly? A photo of the prescription or the strips is easiest 📷" : `Which medicines does ${pr.they} take every day? The easiest is a photo of the prescription or the strips 📷`,
        { type: "medicines", person: i }, "e.g. Metformin 500 morning and night after food, Telma 40 in the morning", "the medicines they take every day, with dose, times and food timing");
    case "p_meds_confirm":
      return t(`Here are ${self ? "your" : `${call}'s`} medicines. Check the times — I've used ${self ? "your" : pr.their} meal times:`, { type: "meds_confirm", person: i }, "Or tell me what to change…", "corrections to the medicines list");
    case "p_problems":
      return t(`Is anything bothering ${call} lately — sleep, pain, feeling low?`,
        { type: "chips", options: [{ id: "__none", label: "Nothing really" }, ...PROBLEMS.map((x) => ({ id: x, label: x }))], multi: true, selected: p.problems, exclusive: ["__none"] },
        "Or tell me in your own words…", "anything bothering them lately");
    case "p_whatsapp": {
      if (self && c.myPhone) {
        return t(`I'll talk to you on **${c.myPhone}** — the number you signed in with. Is that your WhatsApp?`,
          { type: "chips", options: [{ id: "__mine", label: "Yes, that's my WhatsApp" }, { id: "__other", label: "Use another number" }] }, "Or type another number…", "their WhatsApp number");
      }
      const lead = !self && !both ? "Last thing about " : "";
      return t(self ? "Your WhatsApp number, so I can talk to you there." : `${lead ? `${lead}${call}: ` : ""}${lead ? pr.their : `${Call}'s`} WhatsApp number, so I can talk to ${pr.them} there.`,
        { type: "phone", target: self ? "self" : `person:${i}`, person: i }, "Or type the number…", "their WhatsApp number");
    }
    case "p_codes":
      return t(`When ${call} orders something (groceries, medicines, a cab), the store sometimes sends a login code to a phone. Who should I ask for it?`,
        { type: "chips", options: [
          { id: "self", label: `${Call}`, hint: `Code on ${pr.their} phone` },
          { id: "me", label: "Me", hint: "Code on my phone, with the order details" },
        ] }, "Or tell me…", "who gives the store login codes for their orders", "Only when a store asks for a login code");
    case "help_with":
      return t("What should I help with most?", { type: "chips", options: HELP_WITH.map((h) => ({ id: h.id, label: h.label, hint: h.hint })), multi: true, selected: a.helpWith.length ? a.helpWith : ["reminders", "checkins", "company"] }, "Or tell me…", "what the caregiver wants Saheli to help with");
    case "emergency": {
      const alone = a.persons.find((x) => x.livesWith === "alone");
      return t(`Since ${callOf(alone)} lives alone — is there a neighbour or relative nearby I can call if I can't reach you?`, { type: "emergency" }, "Or type their name and number…", "an emergency contact nearby", "Asked because she lives alone".replace("she", alone ? pronoun(alone).they : "they"));
    }
    case "you_whatsapp":
      return t(`And your WhatsApp, ${me}? I'll message you only for four things: a health red flag, a missed check-in, a real mood or safety worry, and an order that needs your OK.`,
        { type: "phone", target: "self", optional: true }, "Or type your number…", "the caregiver's WhatsApp number");
    case "followups":
      return t([], none, "", "");
    case "extra": {
      const x = s.extra!;
      return t(x.q, { type: "chips", options: x.options.map((o) => ({ id: o, label: o })), skip: "Skip" }, "Or tell me in your own words…", x.q, x.source === "nurse" ? "Saheli's own question" : "Asked because of what you said");
    }
    case "anything_else":
      return t(self ? "Anything else you'd like me to know about you?" : `Anything else I should know about ${call}? Family, habits, worries, what makes ${pr.them} smile — anything.`,
        { type: "chips", options: [{ id: "__done", label: "That's all" }] }, "Tell Saheli anything…", "anything else Saheli should know");
    case "summary":
      return t(self ? "Here's what I've understood about you. Anything to change?" : a.persons.length > 1 ? "Here's what I've understood about both of them. Anything to change?" : `Here's what I've understood about ${call}. Anything to change?`,
        { type: "summary" }, "Tell Saheli what to change, or ask anything…", "changes to anything Saheli has understood");
    default:
      return t("", none, "", "");
  }
}

/* ── what a tap means ──────────────────────────────────────────────────── */

export type Applied = { a: Answers; flow: Flow; you: string; ack?: string };

const setP = (a: Answers, i: number, patch: Partial<Person>): Answers => ({ ...a, persons: a.persons.map((p, j) => (j === i ? { ...p, ...patch } : p)) });
const done = (flow: Flow, ...keys: string[]): Flow => ({ ...flow, done: [...new Set([...flow.done, ...keys])], editing: keys.includes(flow.editing ?? "") ? null : flow.editing });

/** A tap on a chip (or chips, for multi) at this slot → new answers, what "you" said, and Saheli's reaction. */
export function applyChips(s: Slot, ids: string[], c: Ctx): Applied {
  const { flow } = c;
  let a = c.a;
  const i = s.person ?? 0;
  const p = a.persons[i];
  const self = isSelf(a);
  const label = (id: string) => ask(s, c).widget.type === "chips" ? ((ask(s, c).widget as Extract<Widget, { type: "chips" }>).options.find((o) => o.id === id)?.label ?? id) : id;
  const you = ids.map(label).join(" · ");
  const call = callOf(p, self);
  const pr = p ? pronoun(p) : { they: "they", them: "them", their: "their", They: "They" };
  switch (s.base) {
    case "you_name": {
      a = { ...a, you: { ...a.you, name: ids[0] } };
      return { a, flow: done(flow, s.key), you };
    }
    case "care_for": {
      const id = ids[0] as NonNullable<Answers["careFor"]>;
      a = withCareFor(a, id);
      const ack = id === "both_parents" ? "Both of them — lovely. I'll get to know them one at a time." : undefined;
      return { a, flow: done(flow, s.key), you, ack };
    }
    case "self_help":
      return { a: { ...a, helpWith: ids }, flow: done(flow, s.key), you };
    case "self_f":
    case "extra": {
      const q = s.base === "extra" ? s.extra!.q : SELF_FOLLOWUP[s.key.split(":")[1]].q;
      if (ids[0] === "__skip") return { a, flow: done(flow, s.key), you: "Skip" };
      return { a: { ...a, followups: [...a.followups.filter((f) => f.q !== q), { q, a: you }].slice(-12) }, flow: done(flow, s.key), you };
    }
    case "p_call": {
      if (p.callThem) return { a: setP(a, i, { addressAs: ids[0] }), flow: done(flow, s.key), you, ack: `${ids[0]} it is.` };
      const sug = suggestAddress(ids[0]);
      return { a: setP(a, i, { callThem: ids[0], addressAs: sug }), flow: done(flow, s.key), you, ack: `I'll call ${pr.them} **${sug}**. Tell me anytime if you'd like something else.` };
    }
    case "p_home":
      return { a: setP(a, i, { livesWith: ids[0] as Person["livesWith"] }), flow, you, ack: ids[0] === "alone" ? `Since ${call} is on ${pr.their} own, I'll check on ${pr.them} gently every morning and evening.` : undefined };
    case "p_age":
      if (ids[0] === "__skip") return { a, flow: done(flow, s.key), you: "Skip" };
      return { a: setP(a, i, { age: Number(ids[0]) }), flow: done(flow, s.key), you };
    case "p_reads":
      return { a: setP(a, i, { reads: ids[0] as Person["reads"] }), flow: done(flow, s.key), you, ack: ids[0] === "text" ? undefined : `Voice notes it is${p.language ? `, in ${option(p.dialect || p.language)?.name ?? "their language"}` : ""} 🎙️` };
    case "p_day":
      return { a, flow: done(flow, s.key), you: "I'll pick the times" };
    case "p_likes":
      if (ids[0] === "__skip") return { a, flow: done(flow, s.key), you: "Skip" };
      return { a: setP(a, i, { likes: ids }), flow: done(flow, s.key), you };
    case "p_conditions": {
      if (ids.includes("__none")) return { a: setP(a, i, { conditions: [] }), flow: done(flow, s.key), you: "None", ack: "That's good to hear." };
      return { a: setP(a, i, { conditions: ids }), flow: done(flow, s.key), you, ack: `Got it — ${listText(ids.map((x) => x.replace(/ \(.*\)$/, "").toLowerCase()))}.` };
    }
    case "p_checks": {
      const sugar = ids.includes("sugar_daily") ? "daily" : ids.includes("sugar_sometimes") ? "sometimes" : "no";
      return { a: setP(a, i, { sugarCheck: hasDiabetes(p) ? sugar : undefined, bpMachine: hasBp(p) ? ids.includes("bp_machine") : undefined }), flow: done(flow, s.key), you,
        ack: ids.includes("__neither") ? undefined : `Good — I can ask ${self ? "you" : pr.them} for the readings and keep track.` };
    }
    case "p_allergies":
      if (ids.includes("__none")) return { a: setP(a, i, { allergies: { none: true, items: [] } }), flow: done(flow, s.key), you: "No allergies" };
      return { a: setP(a, i, { allergies: { items: ids } }), flow: done(flow, s.key), you, ack: `Noted — I'll keep ${listText(ids)} off any order.` };
    case "p_problems":
      if (ids.includes("__none")) return { a, flow: done(flow, s.key), you: "Nothing really" };
      return { a: setP(a, i, { problems: ids }), flow: done(flow, s.key), you, ack: `Thank you for telling me. I'll keep an eye on ${ids.length > 1 ? "these" : "that"} gently.` };
    case "p_whatsapp":
      if (ids[0] === "__mine" && c.myPhone) return { a: setP({ ...a, you: { ...a.you, phone: c.myPhone } }, i, { phone: c.myPhone }), flow: done(flow, s.key), you, ack: "Perfect — I'll talk to you there." };
      if (ids[0] === "__other") return { a, flow, you };
      return { a, flow, you };
    case "p_codes": {
      const me = ids[0] === "me";
      return { a: setP(a, i, { codesFrom: me ? "me" : "self" }), flow: done(flow, s.key), you,
        ack: me ? `Got it. I'll ask you for the code, with what ${call} is ordering. If you cancel an order, I'll tell ${pr.them} gently.` : `Got it. I'll ask ${call} for the code.` };
    }
    case "help_with":
      return { a: { ...a, helpWith: ids }, flow: done(flow, s.key), you };
    case "anything_else":
      return { a, flow: done(flow, s.key), you: "That's all" };
    default:
      return { a, flow: done(flow, s.key), you };
  }
}

/** Optional questions can be skipped; this is their skip. */
export const skip = (s: Slot, flow: Flow): Flow => done(flow, s.key);
export const markDone = done;
export const patchPerson = setP;

/** Medicines confirmed on the card. */
export function confirmMeds(s: Slot, meds: Med[], c: Ctx): Applied {
  const i = s.person ?? 0;
  const keep = meds.filter((m) => m.name.trim());
  const a = setP(c.a, i, { medicines: keep, noMedicines: keep.length ? undefined : true });
  const n = keep.reduce((k, m) => k + m.times.length, 0);
  return { a, flow: done(c.flow, s.key, `p_medicines:${i}`), you: "Looks right", ack: keep.length ? `Lovely — ${n} reminder${n === 1 ? "" : "s"} a day${n ? "" : " once you add times"}.` : undefined };
}

/** What Saheli says after a language or bhasha is picked. */
export function languageAck(p: Person, self: boolean): string {
  const o = option(p.dialect || p.language || "");
  if (!o || p.language === "en") return self ? "English it is." : "English it is.";
  const hello = greetingFor(p.language, p.dialect);
  const script = scriptFor(p.language);
  return self
    ? `**${hello}!** — I'll talk to you in ${o.name}${script ? `, written in ${script}` : ""}.`
    : `**${hello}, ${callOf(p)}!** — that's how I'll greet ${pronoun(p).them}, in ${o.name}${script ? `, written in ${script}` : ""}.`;
}

/* ── free answers read by the backend ──────────────────────────────────── */

export type Understood = {
  answered: boolean;
  ack: string;
  reply: string;
  updates: {
    careFor?: NonNullable<Answers["careFor"]>;
    yourName?: string;
    person?: Partial<Person> & { noConditions?: boolean; noProblems?: boolean };
    helpAreas?: string[];
    emergency?: { name?: string; relation?: string; phone?: string };
    note?: string;
  };
  followup?: { q: string; options: string[] };
};

const union = (x: string[] = [], y: string[] = []) => {
  const seen = new Set(x.map((v) => v.toLowerCase()));
  return [...x, ...y.filter((v) => !seen.has(v.toLowerCase()))];
};

const AREA_WORDS: Array<[string, RegExp]> = [
  ["reminders", /medic|tablet|pill|dawa/i], ["sleep", /sleep|neend|insomnia/i], ["mood", /stress|mood|anxi|tension|sad|depress/i], ["water", /water|pani|hydrat/i],
  ["walks", /walk|exercis|yoga|gym|fitness/i], ["cycle", /period|cycle|pcos|menstru/i], ["appointments", /doctor|report|check.?up|appointment/i], ["company", /talk|lonely|alone|company|friend/i],
];

/** Merge what the backend understood into the answers (only adding; a tap later can still change anything). */
export function applyUnderstood(s: Slot, u: Understood, text: string, c: Ctx): { a: Answers; flow: Flow } {
  let a = c.a;
  let flow = c.flow;
  const i = s.person ?? Math.max(0, a.persons.length - 1);
  const up = u.updates;
  if (up.careFor && !a.careFor) a = withCareFor(a, up.careFor);
  if (up.yourName && (s.base === "you_name" || !a.you.name)) a = { ...a, you: { ...a.you, name: up.yourName } };
  if (s.base === "you_name" && !up.yourName && text.split(/\s+/).length <= 4) a = { ...a, you: { ...a.you, name: text.trim().slice(0, 80) } };
  const p = a.persons[i];
  if (p && up.person) {
    const q = { ...up.person };
    // "We call her Maa" is what the family calls her; what Saheli calls her is confirmed on its own question.
    if (q.addressAs && !q.callThem && s.base !== "p_call") {
      q.callThem = q.addressAs.slice(0, 40);
      delete q.addressAs;
    }
    const next: Person = { ...p };
    for (const k of ["name", "callThem", "addressAs", "age", "city", "state", "livesWith", "reads", "sugarCheck", "bpMachine", "avoidTopics"] as const) {
      if (q[k] !== undefined) (next as Record<string, unknown>)[k] = q[k];
    }
    if (q.gender && !p.gender) next.gender = q.gender;
    if (q.language) { next.language = q.language; next.dialect = q.dialect ?? null; }
    if (q.conditions) next.conditions = union(p.conditions, q.conditions);
    if (q.allergies) next.allergies = q.allergies.none ? { none: true, items: [] } : { items: union(p.allergies.items, q.allergies.items) };
    if (q.medicines) {
      const names = new Set(p.medicines.map((m) => m.name.toLowerCase()));
      next.medicines = [...p.medicines, ...q.medicines.filter((m) => !names.has(m.name.toLowerCase()))];
      next.noMedicines = undefined;
    }
    if (q.noMedicines && !next.medicines.length) next.noMedicines = true;
    if (q.problems) next.problems = union(p.problems, q.problems);
    if (q.day) next.day = { ...p.day, ...q.day, activities: union(p.day.activities, q.day.activities), notes: [p.day.notes, q.day.notes].filter(Boolean).join(" ").slice(0, 500) || undefined };
    if (q.likes) next.likes = union(p.likes, q.likes);
    if (q.doctor) next.doctor = { ...p.doctor, ...q.doctor };
    if (q.phone && (s.base === "p_whatsapp" || !p.phone)) next.phone = q.phone;
    if (next.callThem && !next.addressAs && s.base !== "p_name") next.addressAs = suggestAddress(next.callThem);
    a = setP(a, i, next);
    if (q.noConditions) flow = done(flow, `p_conditions:${i}`);
    if (q.noProblems) flow = done(flow, `p_problems:${i}`);
  }
  if (up.helpAreas?.length && s.base === "self_help") {
    const ids = up.helpAreas.map((h) => AREA_WORDS.find(([, re]) => re.test(h))?.[0] ?? h.slice(0, 30));
    a = { ...a, helpWith: [...new Set(ids)] };
  }
  if (up.emergency) a = { ...a, emergency: { ...a.emergency, ...up.emergency } };
  if (up.note) a = { ...a, anythingElse: [a.anythingElse, up.note].filter(Boolean).join("\n").slice(0, 1500) };

  if (!u.answered) return { a, flow };
  // The question itself is answered.
  if (s.base === "extra" || s.base === "self_f" || (s.base === "followups")) {
    const q = s.base === "extra" ? s.extra!.q : SELF_FOLLOWUP[s.key.split(":")[1]]?.q ?? "";
    if (q) a = { ...a, followups: [...a.followups.filter((f) => f.q !== q), { q, a: text.slice(0, 500) }].slice(-12) };
  }
  if (s.base === "anything_else") a = { ...a, anythingElse: [a.anythingElse, text].filter(Boolean).join("\n").slice(0, 1500) };
  if (s.base === "p_likes" && !up.person?.likes && !up.person?.avoidTopics) a = setP(a, i, { likesOther: text.slice(0, 300) });
  if (s.base === "p_problems" && !up.person?.problems) a = setP(a, i, { problemsOther: text.slice(0, 500) });
  if (s.base === "p_conditions" && !up.person?.conditions && !up.person?.noConditions) a = setP(a, i, { conditionsOther: text.slice(0, 300) });
  if (s.base === "p_day" && !(a.persons[i]?.day.wake && a.persons[i]?.day.sleep) && !up.person?.day) a = setP(a, i, { day: { ...a.persons[i].day, notes: text.slice(0, 500) } });
  const keep = ["p_whatsapp", "you_whatsapp", "p_call", "summary", "p_name", "p_home", "p_language"]; // these finish only when their data is there
  if (s.base === "p_call" && (up.person?.addressAs || up.person?.callThem)) {
    const pp = a.persons[i];
    a = setP(a, i, { addressAs: up.person.addressAs || pp.addressAs || suggestAddress(up.person.callThem!) });
    flow = done(flow, s.key);
  }
  if (!keep.includes(s.base) && s.base !== "p_medicines") flow = done(flow, s.key);
  if (s.base === "p_medicines" && (a.persons[i]?.medicines.length || a.persons[i]?.noMedicines)) flow = done(flow, s.key);
  return { a, flow };
}

/** When the backend can't be reached: keep the words where they fit, so the chat never gets stuck. */
export function fallbackUnderstood(s: Slot, text: string, c: Ctx): { a: Answers; flow: Flow } | null {
  const i = s.person ?? 0;
  const t = text.trim();
  const a = c.a;
  switch (s.base) {
    case "you_name": return { a: { ...a, you: { ...a.you, name: t.slice(0, 80) } }, flow: done(c.flow, s.key) };
    case "p_name": return { a: setP(a, i, { name: t.slice(0, 80) }), flow: c.flow };
    case "p_call": return { a: setP(a, i, { addressAs: t.slice(0, 60), callThem: a.persons[i].callThem || t.slice(0, 40) }), flow: done(c.flow, s.key) };
    case "p_home": return { a: setP(a, i, { city: t.slice(0, 80) }), flow: c.flow };
    case "p_day": return { a: setP(a, i, { day: { ...a.persons[i].day, notes: t.slice(0, 500) } }), flow: done(c.flow, s.key) };
    case "p_conditions": return { a: setP(a, i, { conditionsOther: t.slice(0, 300) }), flow: done(c.flow, s.key) };
    case "p_allergies": return { a: setP(a, i, { allergies: { items: [t.slice(0, 60)] } }), flow: done(c.flow, s.key) };
    case "p_medicines": return { a: setP(a, i, { medicines: [...a.persons[i].medicines, { name: t.slice(0, 80), times: [] }] }), flow: done(c.flow, s.key) };
    case "p_problems": return { a: setP(a, i, { problemsOther: t.slice(0, 500) }), flow: done(c.flow, s.key) };
    case "p_likes": return { a: setP(a, i, { likesOther: t.slice(0, 300) }), flow: done(c.flow, s.key) };
    case "anything_else": return { a: { ...a, anythingElse: [a.anythingElse, t].filter(Boolean).join("\n").slice(0, 1500) }, flow: done(c.flow, s.key) };
    case "self_f":
    case "extra": {
      const q = s.base === "extra" ? s.extra!.q : SELF_FOLLOWUP[s.key.split(":")[1]].q;
      return { a: { ...a, followups: [...a.followups, { q, a: t.slice(0, 500) }].slice(-12) }, flow: done(c.flow, s.key) };
    }
    default: return null;
  }
}

/** The questions still to come, for the backend (so Saheli doesn't add a follow-up that is coming anyway). */
export function upcoming(c: Ctx, from: Slot): string[] {
  const all = plan(c);
  const at = all.findIndex((s) => s.key === from.key);
  return [...new Set(all.slice(at + 1).filter((s) => !isDone(s, c)).map((s) => ask(s, c).topic).filter(Boolean))].slice(0, 14);
}

/* ── the summary card ──────────────────────────────────────────────────── */

export type SummaryRow = { label: string; value: string; edit: string };

export function summaryRows(c: Ctx, i: number): SummaryRow[] {
  const { a } = c;
  const self = isSelf(a);
  const p = a.persons[i];
  if (!p) return [];
  const lang = option(p.dialect || p.language || "");
  const meds = p.medicines.filter((m) => m.name);
  const doses = meds.reduce((n, m) => n + m.times.length, 0);
  const d = p.day;
  const checks = ["checkins", "company", "mood"].some((h) => a.helpWith.includes(h));
  const rows: SummaryRow[] = [
    { label: "Speaks", value: lang ? `${lang.name} (${lang.native})${p.reads ? `, ${p.reads === "both" ? "text + voice notes" : p.reads === "voice" ? "voice notes" : "text"}` : ""}` : "—", edit: `p_language:${i}` },
    { label: "Health", value: [[...p.conditions, p.conditionsOther].filter(Boolean).join(", ") || "No long-term conditions", p.sugarCheck === "daily" ? "sugar check every day" : p.sugarCheck === "sometimes" ? "checks sugar sometimes" : "", p.bpMachine ? "BP machine at home" : ""].filter(Boolean).join(" · "), edit: `p_conditions:${i}` },
    { label: "Allergies", value: p.allergies.none ? "None" : p.allergies.items.join(", ") || "—", edit: `p_allergies:${i}` },
    { label: "Medicines", value: meds.length ? `${meds.length} medicine${meds.length > 1 ? "s" : ""}, ${doses} reminder${doses === 1 ? "" : "s"} a day` : p.noMedicines ? "None regularly" : "—", edit: meds.length ? `p_meds_confirm:${i}` : `p_medicines:${i}` },
    { label: self ? "Your day" : `${pronoun(p).their.charAt(0).toUpperCase()}${pronoun(p).their.slice(1)} day`, value: [d.wake && `up ${d.wake}`, d.breakfast, d.lunch, d.dinner, d.sleep && `sleeps ${d.sleep}`].filter(Boolean).join(" · ") || "—", edit: `p_day_times:${i}` },
    { label: "WhatsApp", value: p.phone ? `${p.phone}${c.verified[self ? "self" : `person:${i}`] ? " · connected" : " · not connected yet"}` : "—", edit: `p_whatsapp:${i}` },
  ];
  if (!self) rows.push({ label: "I'll check in", value: checks ? `Morning and evening${d.sleep ? `, never after ${d.sleep}` : ""}` : "Only for reminders", edit: "help_with" });
  rows.push({ label: "I'll tell you", value: "Only health worries, a missed check-in, mood concerns, orders", edit: "" });
  return rows;
}
