"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import {
  cancelRequestAction,
  completeRequestAction,
} from "@/server/actions/request";

type RequestStatusActionsProps = {
  canCancel: boolean;
  canComplete: boolean;
  cancelLabel: string;
  requestId: string;
};

export function RequestStatusActions({
  canCancel,
  canComplete,
  cancelLabel,
  requestId,
}: RequestStatusActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (!canCancel && !canComplete) return null;

  const runAction = (action: "cancel" | "complete") => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("requestId", requestId);

      const result =
        action === "complete"
          ? await completeRequestAction(formData)
          : await cancelRequestAction(formData);

      if (!result.ok) {
        window.alert(result.error);
        return;
      }

      router.refresh();
    });
  };

  return (
    <section className="mt-5 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        {canCancel && (
          <button
            className="min-h-11 rounded-md border border-border px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:border-destructive hover:text-destructive disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending}
            type="button"
            onClick={() => runAction("cancel")}
          >
            {isPending ? "Actualizando..." : cancelLabel}
          </button>
        )}
        {canComplete && (
          <button
            className="min-h-11 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending}
            type="button"
            onClick={() => runAction("complete")}
          >
            {isPending ? "Actualizando..." : "Marcar como completado"}
          </button>
        )}
      </div>
    </section>
  );
}
