"use client";

import { useState, useTransition, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, Mail } from "lucide-react";
import { SubmitButton } from "@/components/ui/submit-button";
import { TurnstileWidget } from "@/components/auth/TurnstileWidget";
import { verifyEmailAction, resendVerificationAction } from "@/server/actions/auth";

interface VerifyEmailClientProps {
  token?: string;
  email?: string;
}

type Status = "idle" | "verifying" | "success" | "error" | "resending" | "resent";

export function VerifyEmailClient({ token, email }: VerifyEmailClientProps) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(token ? "verifying" : "idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleTurnstileToken = useCallback((t: string) => {
    setTurnstileToken(t);
  }, []);

  // Auto-verify when token is present in URL
  useEffect(() => {
    if (!token || !email) return;
    const formData = new FormData();
    formData.set("token", token);
    formData.set("email", email);
    void verifyEmailAction(formData).then((result) => {
      if (result.ok) {
        setStatus("success");
        // Redirect to login after 3s so user can see the success state
        setTimeout(() => router.push("/login?verified=1"), 3000);
      } else {
        setStatus("error");
        setErrorMsg(result.error);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleResend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email) return;
    setStatus("resending");
    const formData = new FormData();
    formData.set("email", email);
    formData.set("turnstileToken", turnstileToken);
    startTransition(async () => {
      await resendVerificationAction(formData);
      setStatus("resent");
    });
  }

  // ── Verificando automáticamente ──────────────────────────────────────────
  if (status === "verifying") {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-brand-600" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Verificando tu email…</p>
      </div>
    );
  }

  // ── Éxito ─────────────────────────────────────────────────────────────────
  if (status === "success") {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <CheckCircle2
          className="h-14 w-14 text-green-500"
          aria-hidden="true"
        />
        <h1 className="text-xl font-bold text-foreground">¡Email verificado!</h1>
        <p className="text-sm text-muted-foreground">
          Tu cuenta está activa. Te redirigimos al ingreso…
        </p>
        <Link
          href="/login"
          className="mt-2 text-sm font-medium text-brand-600 underline-offset-4 hover:underline"
        >
          Ir a ingresar ahora
        </Link>
      </div>
    );
  }

  // ── Error (token expirado / inválido) ─────────────────────────────────────
  if (status === "error") {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col items-center gap-3 text-center">
          <XCircle className="h-12 w-12 text-destructive" aria-hidden="true" />
          <h1 className="text-xl font-bold text-foreground">El link no funcionó</h1>
          <p className="text-sm text-muted-foreground">
            {errorMsg ?? "El enlace expiró o ya fue usado."}
          </p>
        </div>

        {email && (
          <form onSubmit={handleResend} noValidate className="flex flex-col gap-4">
            <TurnstileWidget onTokenChange={handleTurnstileToken} />
            <SubmitButton isPending={isPending}>
              Mandar nuevo link a {email}
            </SubmitButton>
          </form>
        )}

        <p className="text-center text-sm text-muted-foreground">
          ¿Recordás la contraseña?{" "}
          <Link
            href="/login"
            className="font-medium text-brand-600 underline-offset-4 hover:underline"
          >
            Intentá ingresar
          </Link>
        </p>
      </div>
    );
  }

  // ── Reenvío exitoso ───────────────────────────────────────────────────────
  if (status === "resent") {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <Mail className="h-12 w-12 text-brand-600" aria-hidden="true" />
        <h1 className="text-xl font-bold text-foreground">Link enviado</h1>
        <p className="text-sm text-muted-foreground">
          Si {email} tiene una cuenta sin verificar, te mandamos el link.
          Revisá también la carpeta de spam.
        </p>
        <Link
          href="/login"
          className="text-sm font-medium text-brand-600 underline-offset-4 hover:underline"
        >
          Volver al ingreso
        </Link>
      </div>
    );
  }

  // ── Estado idle — llegaron sin token (desde /login?unverified=...) ───
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground">Verificá tu email</h1>
        <p className="text-sm text-muted-foreground">
          Antes de continuar necesitás verificar tu dirección de email.
          {email && (
            <>
              {" "}
              Te mandamos un link a{" "}
              <span className="font-medium text-foreground">{email}</span>.
            </>
          )}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-muted/40 px-4 py-4 text-sm text-muted-foreground">
        <p>
          Revisá tu bandeja de entrada y la carpeta de spam. El link expira en
          24 horas.
        </p>
      </div>

      {email && (
        <form onSubmit={handleResend} noValidate className="flex flex-col gap-4">
          <TurnstileWidget onTokenChange={handleTurnstileToken} />
          <SubmitButton isPending={status === "resending"}>
            Reenviar link de verificación
          </SubmitButton>
        </form>
      )}

      <p className="text-center text-sm text-muted-foreground">
        <Link
          href="/login"
          className="font-medium text-brand-600 underline-offset-4 hover:underline"
        >
          Volver al ingreso
        </Link>
      </p>
    </div>
  );
}
