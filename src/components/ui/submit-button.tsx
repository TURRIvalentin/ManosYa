"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SubmitButtonProps {
  children: React.ReactNode;
  isPending?: boolean;
  /** Fix the button to the bottom edge on mobile, inline on md+. Default true. */
  fixedBottom?: boolean;
  className?: string;
  variant?: "primary" | "secondary";
}

export function SubmitButton({
  children,
  isPending = false,
  fixedBottom = true,
  className,
  variant = "primary",
}: SubmitButtonProps) {
  const btn = (
    <button
      type="submit"
      disabled={isPending}
      aria-busy={isPending}
      aria-live="polite"
      className={cn(
        "flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold",
        "transition-all active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" && [
          "bg-brand-600 text-white shadow-sm",
          "hover:bg-brand-700 active:bg-brand-800",
          "focus-visible:ring-brand-600",
        ],
        variant === "secondary" && [
          "border border-border bg-background text-foreground",
          "hover:bg-muted",
          "focus-visible:ring-brand-600",
        ],
        className,
      )}
    >
      {isPending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          <span>Cargando…</span>
        </>
      ) : (
        children
      )}
    </button>
  );

  if (fixedBottom) {
    return (
      <>
        {/* Spacer so content isn't hidden behind the fixed bar */}
        <div className="h-24 md:hidden" aria-hidden="true" />
        <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-border bg-background/95 px-4 py-3 pb-safe backdrop-blur-sm md:static md:border-0 md:bg-transparent md:px-0 md:py-0 md:pb-0 md:backdrop-blur-none">
          {btn}
        </div>
      </>
    );
  }

  return btn;
}
