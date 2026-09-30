/** Client-side check before a medical file is sent. The API repeats the same rules. */
export const MAX_MEDICAL_UPLOAD_BYTES = 15 * 1024 * 1024;

const EXT = new Set(["pdf", "jpg", "jpeg", "png", "heic", "heif", "webp", "txt", "md", "csv", "docx", "doc", "xlsx", "xls"]);

export function medicalUploadError(file: { name: string; size: number; type?: string }): string | null {
  if (!file.size) return "This file is empty.";
  if (file.size > MAX_MEDICAL_UPLOAD_BYTES) return "This file is too large. The maximum is 15 MB.";
  const ext = file.name.toLowerCase().split(".").pop() || "";
  const mime = (file.type || "").toLowerCase();
  const mimeOk =
    mime === "application/pdf" ||
    mime.startsWith("image/") ||
    mime.startsWith("text/") ||
    mime.includes("word") ||
    mime.includes("sheet") ||
    mime.includes("excel");
  if (EXT.has(ext) || mimeOk) return null;
  return "This is not a document we can read. Use a photo (JPG, PNG, HEIC) or a PDF.";
}
