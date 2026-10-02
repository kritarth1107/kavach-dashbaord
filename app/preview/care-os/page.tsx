"use client";

import { useState } from "react";
import { CareHome, type HomeData } from "@/components/care-os/home";
import { CareShell } from "@/components/care-os/shell";

/** Design preview with sample data (no sign-in). Remove once the real pages ship. */
const DATA: HomeData = {
  person: { id: "maa", name: "Vasundara Devi", callAs: "Maa" },
  saheliSays: "Took her BP tablet and Vitamin D on time, had poha, and asked to call you tonight. Knee pain in the morning eased after her walk.",
  mood: "Calm",
  lastHeard: "12 min ago",
  doses: [
    { id: "1", time: "08:00", name: "BP tablet", dose: "1 tablet", status: "taken" },
    { id: "2", time: "10:00", name: "Vitamin D3 60K", dose: "1 capsule", status: "taken" },
    { id: "3", time: "13:00", name: "Folvite 5 mg", dose: "½ tablet", status: "due" },
    { id: "4", time: "14:00", name: "Shelcal 500", dose: "1 tablet", status: "upcoming" },
  ],
  week: {
    taken: 26,
    scheduled: 28,
    streakDays: 6,
    adherence: [75, 100, 100, 75, 100, 100, 50, 100, 100, 100, 75, 100, 100, 50],
    labels: ["Sep 19", "Sep 20", "Sep 21", "Sep 22", "Sep 23", "Sep 24", "Sep 25", "Sep 26", "Sep 27", "Sep 28", "Sep 29", "Sep 30", "Oct 1", "Oct 2"],
  },
  bp: { value: "132/84", at: "Today 9:10 am", trend: [138, 136, 132], change: "2%", changeDir: "down", state: "in range" },
  sugar: { value: "118", note: "Fasting, today", change: "−3% from last week" },
  weight: { value: "61.4", note: "Sunday", change: "−0.4 kg in a month" },
  needsYou: [{ id: "n1", title: "Stop the BP tablet?", meta: "Maa said it makes her dizzy. Saheli kept it on until you decide." }],
  followUps: [
    { id: "f1", title: "Ask Maa if her knee still hurts", when: "4:30 pm" },
    { id: "f2", title: "Remind about Dr Iyer's appointment", when: "Tomorrow 9 am" },
  ],
  tasks: [{ id: "t1", label: "Aashirvaad atta 5 kg · Instamart", status: "arriving", total: "₹283" }],
  timeline: [
    { id: "e5", time: "12:40", text: "Chatted about Pihu's school play" },
    { id: "e4", time: "11:05", text: "Ordered atta on Instamart · ₹283 COD" },
    { id: "e3", time: "10:02", text: "Vitamin D3 taken, 2 min after reminder" },
    { id: "e2", time: "09:10", text: "BP 132/84 · in her usual range" },
  ],
};

export default function CareOsPreview() {
  const [who, setWho] = useState("maa");
  return (
    <CareShell
      active="home"
      people={[
        { id: "maa", name: "Vasundara Devi", relation: "Maa" },
        { id: "papa", name: "Ramesh Kumar", relation: "Papa" },
      ]}
      selectedId={who}
      onSelectPerson={setWho}
      me={{ name: "Kritarth Singhal" }}
      alerts={1}
    >
      <CareHome data={DATA} />
    </CareShell>
  );
}
