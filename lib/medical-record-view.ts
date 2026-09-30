/** Lines shown on the elder's health record for one saved upload. */
export type MedicalRecordFacts = {
  patient_name?: string | null;
  provider?: string | null;
  record_date?: string | null;
  medicines?: Array<{ name: string; dose?: string | null }>;
  lab_values?: Array<{ name: string; value: string; unit?: string | null }>;
  unread?: string[];
  extraction_status?: "ready" | "partial" | "failed" | null;
  ai_summary?: string | null;
  file_name?: string | null;
};

export function medicalRecordLines(doc: MedicalRecordFacts): string[] {
  const lines: string[] = [];
  if (doc.extraction_status === "failed") {
    lines.push("Extraction failed. The original file is saved.");
  }
  if (doc.patient_name) lines.push(`Patient: ${doc.patient_name}`);
  if (doc.record_date) lines.push(`Date: ${doc.record_date}`);
  if (doc.provider) lines.push(`From: ${doc.provider}`);
  for (const med of doc.medicines ?? []) {
    lines.push(`Medicine: ${med.name}${med.dose ? ` ${med.dose}` : ""}`);
  }
  for (const lab of doc.lab_values ?? []) {
    lines.push(`${lab.name} ${lab.value}${lab.unit ? ` ${lab.unit}` : ""}`);
  }
  if (doc.unread?.length) lines.push(`Could not read: ${doc.unread.join(", ")}.`);
  if (!lines.length && doc.ai_summary) lines.push(doc.ai_summary);
  if (doc.file_name) lines.push(`File: ${doc.file_name}`);
  return lines;
}
