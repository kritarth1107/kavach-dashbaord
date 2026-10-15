/**
 * A summary edit must not hide Finish. Synthetic people only.
 *   npx tsx scripts/test-onboarding-edit.ts
 */
import { emptyPerson, type Answers } from "../components/onboarding/data";
import { applyChips, markDone, nextSlot, plan, resumeFlow, type Ctx, type Flow } from "../components/onboarding/chat/engine";

const day = { wake: "06:30", breakfast: "08:30", lunch: "13:00", tea: "17:00", dinner: "20:30", sleep: "22:00", activities: [] as string[] };

function person(relation: string, phone: string) {
  return {
    ...emptyPerson(relation),
    name: relation === "Self" ? "Asha Verma" : "Meera Shah",
    callThem: relation === "Self" ? "Asha" : "Maa",
    addressAs: relation === "Self" ? "Asha" : "Maa",
    city: "Pune",
    age: 70,
    language: "hi",
    reads: "both" as const,
    phone,
    diet: "veg" as const,
    conditions: [],
    allergies: { none: true, items: [] },
    noMedicines: true,
    day,
  };
}

function ready(careFor: "mother" | "self"): Ctx {
  const self = careFor === "self";
  const phone = self ? "+919000000301" : "+919000000201";
  const a: Answers = {
    you: { name: self ? "Asha Verma" : "Arun Shah", callMe: self ? "Asha" : "Arun", phone: self ? phone : "+919000000302" },
    careFor,
    persons: [person(self ? "Self" : "Mother", phone)],
    helpWith: [],
    followups: [],
  };
  const flow: Flow = { done: [], extra: [], nurse: "none" };
  const verified: Record<string, boolean> = self ? { self: true } : { "person:0": true, self: true };
  const c: Ctx = { a, flow, verified, myPhone: a.you.phone ?? null };
  const done = plan(c).filter((s) => s.base !== "summary").map((s) => s.key);
  return { ...c, flow: { done, extra: [], nurse: "none", asked: "summary" } };
}

function openEdit(c: Ctx, key: string): Ctx {
  return { ...c, flow: { ...c.flow, done: c.flow.done.filter((k) => k !== key), editing: key, asked: key } };
}

const problems: string[] = [];
const check = (cond: boolean, what: string) => {
  if (!cond) problems.push(what);
};

for (const care of ["mother", "self"] as const) {
  const c = ready(care);
  const key = "p_whatsapp:0";
  const editing = openEdit(c, key);
  check(nextSlot(editing)?.base === "p_whatsapp", `${care}: an open edit still asks for the number`);
  const resumed = { ...editing, flow: resumeFlow(editing) };
  check(resumed.flow.editing == null, `${care}: a verified number clears the edit on reopen`);
  check(nextSlot(resumed)?.base === "summary", `${care}: reopen lands on the summary`);
  const after = markDone(editing.flow, key);
  check(after.editing == null, `${care}: confirming the number clears the edit`);
  check(nextSlot({ ...editing, flow: after })?.base === "summary", `${care}: after verify the summary is next`);

  const diet = openEdit(c, "p_diet:0");
  const slot = plan(diet).find((s) => s.key === "p_diet:0");
  check(!!slot, `${care}: diet slot exists`);
  if (slot) {
    const picked = applyChips(slot, ["jain"], diet);
    check(picked.flow.editing == null, `${care}: a chip picked from the summary clears the edit`);
    check(picked.a.persons[0].diet === "jain", `${care}: the chip is saved`);
    check(nextSlot({ ...diet, a: picked.a, flow: picked.flow })?.base === "summary", `${care}: a chip returns to the summary`);
  }
  const unanswered = { ...editing, verified: {} };
  check(resumeFlow(unanswered).editing === key, `${care}: an unverified edit stays open`);
}

if (problems.length) {
  for (const p of problems) console.error("FAIL", p);
  process.exit(1);
}
console.log("onboarding edit: reopen, verify, and a chip all return to the summary");
