"use client";

import { useEffect } from "react";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // TODO Fase 1: integrar error reporting (Sentry u otro)
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="text-5xl font-bold text-destructive">⚠️</p>
      <h1 className="mt-4 text-xl font-semibold text-foreground">
        Algo salió mal
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Ocurrió un error inesperado. Podés intentar de nuevo.
      </p>
      <button
        onClick={reset}
        className="mt-6 min-h-[44px] rounded-lg bg-brand-600 px-6 py-3 text-sm font-medium text-white hover:bg-brand-700"
      >
        Intentar de nuevo
      </button>
    </div>
  );
}
