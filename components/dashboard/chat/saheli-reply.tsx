"use client";

import { FileText } from "lucide-react";

function parseCitation(chunk: string): { body: string; cite: string } | null {
  const fromIdx = chunk.lastIndexOf("\nFrom: ");
  if (fromIdx === -1) return null;
  const body = chunk.slice(0, fromIdx).trim();
  const cite = chunk
    .slice(fromIdx + 7)
    .replace(/^[“"]|[”"]$/g, "")
    .trim();
  if (!body || !cite) return null;
  return { body, cite };
}

export function SaheliReply({ content }: { content: string }) {
  const chunks = content.split(/\n\n+/);
  return (
    <div className="space-y-2.5">
      {chunks.map((chunk, i) => {
        const citation = parseCitation(chunk);
        if (citation) {
          return (
            <div key={i} className="space-y-1.5">
              <p className="text-[13px] leading-relaxed text-[var(--text-primary)]">
                {citation.body}
              </p>
              <div className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary-light px-3 py-2">
                <FileText
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary"
                  strokeWidth={2.25}
                />
                <p className="text-[11px] font-semibold leading-snug text-primary">{citation.cite}</p>
              </div>
            </div>
          );
        }
        if (chunk.startsWith("Reported only")) {
          return (
            <p key={i} className="text-[11px] font-medium text-[var(--text-tertiary)]">
              {chunk}
            </p>
          );
        }
        return (
          <p
            key={i}
            className="whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--text-primary)]"
          >
            {chunk}
          </p>
        );
      })}
    </div>
  );
}
