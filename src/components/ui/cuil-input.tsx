"use client";

import { useState, useId } from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// Display format: XX-XXXXXXXX-X  (max 13 visible chars)
function toDisplay(digits: string): string {
  if (digits.length <= 2) return digits;
  if (digits.length <= 10) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
}

interface CuilInputProps {
  label?: string;
  name?: string;
  defaultValue?: string;
  error?: string;
  required?: boolean;
  onBlur?: () => void;
  disabled?: boolean;
}

export function CuilInput({
  label = "CUIL/CUIT",
  name = "cuil",
  defaultValue = "",
  error,
  required,
  onBlur,
  disabled,
}: CuilInputProps) {
  const id = useId();
  const errorId = `${id}-error`;

  // Internal state is always raw digits (max 11)
  const [digits, setDigits] = useState(
    () => defaultValue.replace(/\D/g, "").slice(0, 11),
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Strip any non-digit char the user typed and keep max 11
    const raw = e.target.value.replace(/\D/g, "").slice(0, 11);
    setDigits(raw);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // Allow: backspace, delete, tab, escape, enter, arrows, home, end
    const allowed = [
      "Backspace",
      "Delete",
      "Tab",
      "Escape",
      "Enter",
      "ArrowLeft",
      "ArrowRight",
      "Home",
      "End",
    ];
    if (allowed.includes(e.key)) return;
    // Block non-digits
    if (!/\d/.test(e.key)) e.preventDefault();
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {required && (
          <span className="ml-0.5 text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </label>

      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="20-12345678-9"
        disabled={disabled}
        required={required}
        value={toDisplay(digits)}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={onBlur}
        maxLength={13}
        aria-describedby={error ? errorId : undefined}
        aria-invalid={error ? "true" : undefined}
        className={cn(
          "h-11 w-full rounded-lg border border-input bg-background px-3 text-base tracking-wider",
          "placeholder:text-muted-foreground/60 placeholder:tracking-normal",
          "transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-1",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-destructive focus-visible:ring-destructive/70",
        )}
      />

      {/* Hidden input carries raw digits to the form */}
      <input type="hidden" name={name} value={digits} />

      {error && (
        <p
          id={errorId}
          role="alert"
          className="flex items-start gap-1 text-xs text-destructive"
        >
          <AlertCircle
            className="mt-0.5 h-3.5 w-3.5 shrink-0"
            aria-hidden="true"
          />
          {error}
        </p>
      )}
    </div>
  );
}
