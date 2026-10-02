"use client";

import { useState } from "react";
import { CareHome, type HomeData } from "@/components/care-os/home";
import { CareShell } from "@/components/care-os/shell";

/** Design preview with sample data (no sign-in). Remove once the real pages ship. */
const DATA: HomeData = {
  caregiverName: "Kritarth",
  person: { id: "maa", name: "Vasundara Devi", callAs: "Maa", gender: "female" },
  greeting: "Good afternoon, Kritarth",
  headline: "Maa is having a good day.",
  saheliSays:
    "She took her BP tablet and Vitamin D on time, had poha for breakfast and chatted about Pihu's school play. Her knee hurt a little in the morning; she said it eased after the walk.",
  mood: { label: "Cheerful", tone: "butter" },
  lastHeard: "12 min ago",
  doses: [
    { id: "1", time: "08:00", name: "BP tablet", dose: "1 tablet", note: "after breakfast", status: "taken" },
    { id: "2", time: "10:00", name: "Vitamin D3 60K", dose: "1 capsule", status: "taken" },
    { id: "3", time: "13:00", name: "Folvite 5 mg", dose: "½ tablet", status: "due" },
    { id: "4", time: "14:00", name: "Shelcal 500", dose: "1 tablet", note: "after lunch", status: "upcoming" },
  ],
  vitals: [
    { kind: "bp", value: "132/84", unit: "mmHg", state: "good", when: "Today 9:10 am", trend: [138, 141, 136, 134, 139, 133, 132] },
    { kind: "sugar", value: "118", unit: "mg/dL", state: "good", when: "Fasting, today", trend: [124, 131, 119, 126, 122, 117, 118] },
    { kind: "weight", value: "61.4", unit: "kg", state: "watch", when: "Sunday", trend: [62.8, 62.5, 62.4, 62.0, 61.9, 61.6, 61.4] },
  ],
  needsYou: [
    { id: "n1", kind: "confirm", title: "Stop the BP tablet?", detail: "Maa told Saheli it makes her dizzy and she wants to stop. Saheli kept it on until you decide." },
  ],
  followUps: [
    { id: "f1", title: "Ask Maa if her knee still hurts", when: "Checks again at 4:30 pm" },
    { id: "f2", title: "Remind about Dr Iyer's appointment", when: "Tomorrow 9:00 am" },
  ],
  tasks: [{ id: "t1", kind: "order", service: "Instamart", goal: "Aashirvaad atta 5 kg", status: "Arriving in 12 min", total: "₹283" }],
  timeline: [
    { id: "e5", time: "12:40", label: "Chatted with Saheli", summary: "Talked about Pihu's school play; asked to remind her to call Kritarth tonight.", tone: "butter", icon: "chat" },
    { id: "e4", time: "11:05", label: "Groceries ordered", summary: "Aashirvaad atta 5 kg on Instamart · ₹283 cash on delivery · confirmed by Maa", tone: "mint", icon: "order" },
    { id: "e3", time: "10:02", label: "Vitamin D3 taken", summary: "Replied 'le li' two minutes after the reminder.", tone: "mint", icon: "pill" },
    { id: "e2", time: "09:10", label: "BP 132/84", summary: "In her usual range. Mild knee pain noted; Saheli will ask again later.", tone: "rose", icon: "heart" },
    { id: "e1", time: "08:00", label: "BP tablet reminder sent", summary: "On WhatsApp in Hindi. Taken at 8:06.", tone: "sky", icon: "alarm" },
  ],
  life: [
    { label: "Breakfast", value: "Poha, chai", icon: "food" },
    { label: "Walk", value: "20 min, evening", icon: "walk" },
    { label: "Sleep", value: "Up once at night", icon: "sleep" },
    { label: "Water", value: "5 glasses", icon: "water" },
  ],
};

export default function CareOsPreview() {
  const [who, setWho] = useState("maa");
  return (
    <CareShell
      active="home"
      people={[
        { id: "maa", name: "Vasundara Devi", relation: "Maa", tone: "peach" },
        { id: "papa", name: "Ramesh Kumar", relation: "Papa", tone: "sky" },
      ]}
      selectedId={who}
      onSelectPerson={setWho}
      me={{ name: "Kritarth Singhal" }}
      alerts={1}
      dateLabel="Fri, 2 Oct"
    >
      <CareHome data={DATA} />
    </CareShell>
  );
}
