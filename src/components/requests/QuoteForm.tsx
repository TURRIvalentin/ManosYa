"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Send } from "lucide-react";

import { SubmitButton } from "@/components/ui/submit-button";
import { createQuoteAction } from "@/server/actions/quote";

type QuoteFormProps = {
  requestId: string;
};

type FieldErrors = Partial<Record<"comment" | "estimatedDays" | "price" | "requestId" | "_general", string>>;

export function QuoteForm({ requestId }: QuoteFormProps) {
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isSubmitting = isPending || hasSubmitted;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (hasSubmitted) return;

    setHasSubmitted(true);
    setFieldErrors({});
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await createQuoteAction(formData);
      if (!result.ok) {
        setHasSubmitted(false);
        if (result.field) setFieldErrors({ [result.field]: result.error });
        else setFieldErrors({ _general: result.error });
        return;
      }

      router.refresh();
    });
  }

  return (
    <form
      noValidate
      className="mt-5 grid gap-4 rounded-lg border border-border bg-card p-4"
      onSubmit={handleSubmit}
    >
      <input name="requestId" type="hidden" value={requestId} />

      <div>
        <p className="text-sm font-medium text-brand-600">Presupuesto</p>
        <h2 className="mt-1 text-xl font-bold text-foreground">Enviar presupuesto</h2>
      </div>

      {fieldErrors._general && (
        <p
          className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {fieldErrors._general}
        </p>
      )}

      <label className="grid gap-1.5">
        <span className="text-sm font-medium text-foreground">Monto</span>
        <input
          required
          className="h-11 rounded-lg border border-input bg-background px-3 text-sm outline-none ring-brand-600 transition focus:ring-2"
          inputMode="decimal"
          name="price"
          placeholder="Ej: 45000"
          type="text"
        />
        {fieldErrors.price && <span className="text-sm text-destructive">{fieldErrors.price}</span>}
      </label>

      <label className="grid gap-1.5">
        <span className="text-sm font-medium text-foreground">Mensaje</span>
        <textarea
          required
          className="min-h-28 rounded-lg border border-input bg-background px-3 py-2 text-sm leading-6 outline-none ring-brand-600 transition focus:ring-2"
          name="comment"
          placeholder="Contale al cliente qué incluye el presupuesto y cualquier condición importante."
        />
        {fieldErrors.comment && (
          <span className="text-sm text-destructive">{fieldErrors.comment}</span>
        )}
      </label>

      <label className="grid gap-1.5">
        <span className="text-sm font-medium text-foreground">Tiempo estimado</span>
        <input
          className="h-11 rounded-lg border border-input bg-background px-3 text-sm outline-none ring-brand-600 transition focus:ring-2"
          inputMode="numeric"
          min="1"
          name="estimatedDays"
          placeholder="Ej: 3"
          type="number"
        />
        {fieldErrors.estimatedDays && (
          <span className="text-sm text-destructive">{fieldErrors.estimatedDays}</span>
        )}
      </label>

      <SubmitButton isPending={isSubmitting}>
        <Send aria-hidden="true" className="h-4 w-4" />
        Enviar presupuesto
      </SubmitButton>
    </form>
  );
}
