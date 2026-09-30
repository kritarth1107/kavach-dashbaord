/**
 * The upload and paste buttons read one elder id.
 * A hidden "select a recipient" control must not keep them disabled
 * when the page already knows who the record is for.
 */
export function resolveRecordElderId(input: {
  fixedRecipientUserId?: string | null;
  chosenRecipientId?: string | null;
  recipientFilter?: string | null;
  recipientIds?: string[];
}): string {
  const fixed = input.fixedRecipientUserId?.trim() || "";
  if (fixed) return fixed;
  const chosen = input.chosenRecipientId?.trim() || "";
  if (chosen) return chosen;
  const filter = input.recipientFilter?.trim() || "";
  if (filter && filter !== "all") return filter;
  const ids = (input.recipientIds ?? []).filter(Boolean);
  if (ids.length === 1) return ids[0]!;
  return "";
}

export function uploadButtonDisabled(input: { saving: boolean; fileCount: number; elderId: string }): boolean {
  return input.saving || input.fileCount < 1 || !input.elderId;
}

export function submitButtonDisabled(input: { saving: boolean; text: string; elderId: string }): boolean {
  return input.saving || !input.text.trim() || !input.elderId;
}
