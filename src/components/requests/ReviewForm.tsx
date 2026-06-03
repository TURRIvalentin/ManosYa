"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createReviewAction } from "@/server/actions/review";

type ReviewFormProps = {
  requestId: string;
};

export function ReviewForm({ requestId }: ReviewFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    setError(null);
    formData.set("requestId", requestId);

    startTransition(async () => {
      const result = await createReviewAction(formData);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.refresh();
    });
  };

  return (
    <form action={handleSubmit} className="mt-4 rounded-lg border border-border bg-card p-4">
      <div className="grid gap-3">
        <label className="grid gap-1 text-sm font-medium text-foreground">
          Calificación
          <select
            className="min-h-11 rounded-md border border-input bg-background px-3 py-2 text-sm"
            defaultValue="5"
            disabled={isPending}
            name="rating"
          >
            <option value="5">5 - Excelente</option>
            <option value="4">4 - Muy bueno</option>
            <option value="3">3 - Bueno</option>
            <option value="2">2 - Regular</option>
            <option value="1">1 - Malo</option>
          </select>
        </label>

        <label className="grid gap-1 text-sm font-medium text-foreground">
          Comentario
          <textarea
            className="min-h-28 rounded-md border border-input bg-background px-3 py-2 text-sm"
            disabled={isPending}
            maxLength={1000}
            name="comment"
            placeholder="Contá cómo fue la experiencia."
          />
        </label>
      </div>

      {error && <p className="mt-3 text-sm font-medium text-destructive">{error}</p>}

      <button
        className="mt-4 min-h-11 w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Enviando..." : "Enviar reseña"}
      </button>
    </form>
  );
}
