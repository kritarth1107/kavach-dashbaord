"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type OtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

const LENGTH = 6;

export function OtpInput({ value, onChange, disabled }: OtpInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(LENGTH, " ").slice(0, LENGTH).split("");

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  function updateDigit(index: number, digit: string) {
    const next = digits.map((d, i) => (i === index ? digit : d.trim())).join("");
    onChange(next.replace(/\s/g, "").slice(0, LENGTH));
  }

  function handleChange(index: number, raw: string) {
    const digit = raw.replace(/\D/g, "").slice(-1);
    updateDigit(index, digit);

    if (digit && index < LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index]?.trim() && index > 0) {
      inputsRef.current[index - 1]?.focus();
      updateDigit(index - 1, "");
    }

    if (e.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }

    if (e.key === "ArrowRight" && index < LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, LENGTH);
    if (!pasted) return;

    onChange(pasted);
    const focusIndex = Math.min(pasted.length, LENGTH - 1);
    inputsRef.current[focusIndex]?.focus();
  }

  return (
    <div className="flex justify-center gap-2" onPaste={handlePaste}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputsRef.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={digit.trim()}
          disabled={disabled}
          aria-label={`Digit ${index + 1} of ${LENGTH}`}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onFocus={(e) => e.target.select()}
          className={cn(
            "h-11 w-10 rounded-xl border bg-[#f9fafb] text-center text-[18px] font-bold text-[#111827] outline-none transition-colors sm:h-12 sm:w-11",
            digit.trim()
              ? "border-primary bg-white ring-1 ring-[var(--primary-ring)]"
              : "border-[#e5e7eb]",
            "focus:border-primary focus:bg-white focus:ring-2 focus:ring-[var(--primary-ring)]",
            disabled && "cursor-not-allowed opacity-60",
          )}
        />
      ))}
    </div>
  );
}
