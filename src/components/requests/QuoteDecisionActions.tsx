"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";

import { acceptQuoteAction, rejectQuoteAction } from "@/server/actions/quote";

type QuoteDecisionActionsProps = {
  quoteId: string;
};

export function QuoteDecisionActions({ quoteId }: QuoteDecisionActionsProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function runAction(action: "accept" | "reject") {
    setError(null);
    const formData = new FormData();
    formData.set("quoteId", quoteId);

    startTransition(async () => {
      const result =
        action === "accept"
          ? await acceptQuoteAction(formData)
          : await rejectQuoteAction(formData);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="mt-4 grid gap-2">
      {error && (
        <p
          className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button
          className="btn-tap inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending}
          type="button"
          onClick={() => runAction("accept")}
        >
          <Check aria-hidden="true" className="h-4 w-4" />
          Aceptar
        </button>
        <button
          className="btn-tap inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending}
          type="button"
          onClick={() => runAction("reject")}
        >
          <X aria-hidden="true" className="h-4 w-4" />
          Rechazar
        </button>
      </div>
    </div>
  );
}
