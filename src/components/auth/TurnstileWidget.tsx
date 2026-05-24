"use client";

import { useEffect } from "react";
import { ShieldCheck } from "lucide-react";

interface TurnstileWidgetProps {
  onTokenChange: (token: string) => void;
}

/**
 * Wrapper de Cloudflare Turnstile.
 *
 * Dev (sin NEXT_PUBLIC_TURNSTILE_SITE_KEY): auto-completa con "dev-bypass-token".
 * El server-side verifyTurnstile() lo acepta cuando NODE_ENV !== "production".
 *
 * Prod: renderiza el widget real de @marsidev/react-turnstile.
 * TODO: instalar @marsidev/react-turnstile y descomentar la importación real.
 */
export function TurnstileWidget({ onTokenChange }: TurnstileWidgetProps) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  // Dev bypass: setear el token inmediatamente sin ningún widget
  useEffect(() => {
    if (!siteKey) {
      onTokenChange("dev-bypass-token");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!siteKey) {
    return null; // sin widget visible en dev
  }

  // Production widget — activar cuando se instale @marsidev/react-turnstile:
  // import { Turnstile } from "@marsidev/react-turnstile";
  // return <Turnstile siteKey={siteKey} onSuccess={onTokenChange} />;

  return (
    <div
      role="status"
      className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground"
    >
      <ShieldCheck className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
      Verificación de seguridad
    </div>
  );
}
