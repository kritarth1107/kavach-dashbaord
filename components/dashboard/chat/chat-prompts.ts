import type { LabDocument } from "@/lib/api";

const ELDER_PROMPTS = [
  "Order 2 Maggi and 1 litre milk from Instamart.",
  "Mujhe khana mangao — dal rice from Swiggy.",
  "Zepto se bread aur eggs mangao.",
  "Feeling okay this morning.",
];

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name || "they";
}

export function buildChatPrompts(
  isRecipient: boolean,
  recipientName: string,
  labs: LabDocument[],
): string[] {
  if (isRecipient) return ELDER_PROMPTS;

  const prompts: string[] = [`How is ${firstName(recipientName)} today?`];
  const blob = labs
    .map((l) => `${l.title} ${l.raw_text ?? ""} ${(l.tags ?? []).join(" ")}`)
    .join(" ")
    .toLowerCase();

  if (/tsh|thyroid/.test(blob)) prompts.push("Last TSH on file?");
  if (/creatinine/.test(blob)) prompts.push("Latest creatinine?");
  if (/hba1c|a1c|hemoglobin|haemoglobin/.test(blob)) prompts.push("Latest HbA1c?");
  if (/pet[-\s]?ct|pet scan/.test(blob)) prompts.push("Latest PET-CT?");
  if (/vitamin d|vit d/.test(blob)) prompts.push("Latest vitamin D?");

  prompts.push("Order dal makhani from Swiggy for lunch.");
  prompts.push(labs.length ? "Summarize saved reports" : "What reports are saved?");

  return [...new Set(prompts)].slice(0, 6);
}
