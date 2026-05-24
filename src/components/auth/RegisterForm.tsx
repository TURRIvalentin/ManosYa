"use client";

import { useState, useTransition, useCallback } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { FieldInput } from "@/components/ui/field-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { TurnstileWidget } from "@/components/auth/TurnstileWidget";
import { registerAction } from "@/server/actions/auth";

type FieldErrors = Partial<Record<string, string>>;

export function RegisterForm() {
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const handleTurnstileToken = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGlobalError(null);
    setFieldErrors({});

    const formData = new FormData(e.currentTarget);
    formData.set("turnstileToken", turnstileToken);

    startTransition(async () => {
      const result = await registerAction(formData);
      if (!result.ok) {
        if (result.field) {
          setFieldErrors({ [result.field]: result.error });
        } else {
          setGlobalError(result.error);
        }
      } else {
        setSubmitted(true);
      }
    });
  }

  // ── Estado "email enviado" ────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <div
          role="img"
          aria-label="Email enviado"
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-600/10 text-3xl"
        >
          📬
        </div>
        <h2 className="text-xl font-bold text-foreground">Revisá tu email</h2>
        <p className="text-sm text-muted-foreground">
          Te mandamos un link de verificación. Hacé clic en el link para
          activar tu cuenta.
        </p>
        <p className="text-xs text-muted-foreground">
          ¿No llegó? Revisá la carpeta de spam o{" "}
          <Link
            href="/auth/verify-email"
            className="font-medium text-brand-600 underline-offset-4 hover:underline"
          >
            solicitá otro link
          </Link>
          .
        </p>
      </div>
    );
  }

  // ── Formulario ────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground">Crear cuenta</h1>
        <p className="text-sm text-muted-foreground">
          ¿Ya tenés cuenta?{" "}
          <Link
            href="/auth/login"
            className="font-medium text-brand-600 underline-offset-4 hover:underline"
          >
            Ingresá
          </Link>
        </p>
      </div>

      {globalError && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {globalError}
        </div>
      )}

      <FieldInput
        label="Nombre completo"
        name="name"
        type="text"
        autoComplete="name"
        required
        inputMode="text"
        placeholder="Juan García"
        error={fieldErrors.name}
        onBlur={() => setFieldErrors((p) => ({ ...p, name: undefined }))}
      />

      <FieldInput
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        inputMode="email"
        placeholder="juan@ejemplo.com"
        error={fieldErrors.email}
        onBlur={() => setFieldErrors((p) => ({ ...p, email: undefined }))}
      />

      <div className="relative flex flex-col gap-1.5">
        <FieldInput
          label="Contraseña"
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          required
          hint="Mínimo 8 caracteres, una mayúscula y un número"
          error={fieldErrors.password}
          onBlur={() => setFieldErrors((p) => ({ ...p, password: undefined }))}
          className="pr-10"
        />
        <button
          type="button"
          aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          onClick={() => setShowPassword((v) => !v)}
          className="absolute right-3 top-[2.125rem] text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-1 rounded"
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>

      <div className="relative flex flex-col gap-1.5">
        <FieldInput
          label="Repetir contraseña"
          name="confirmPassword"
          type={showConfirm ? "text" : "password"}
          autoComplete="new-password"
          required
          error={fieldErrors.confirmPassword}
          onBlur={() =>
            setFieldErrors((p) => ({ ...p, confirmPassword: undefined }))
          }
          className="pr-10"
        />
        <button
          type="button"
          aria-label={showConfirm ? "Ocultar contraseña" : "Mostrar contraseña"}
          onClick={() => setShowConfirm((v) => !v)}
          className="absolute right-3 top-[2.125rem] text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-1 rounded"
        >
          {showConfirm ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>

      <TurnstileWidget onTokenChange={handleTurnstileToken} />

      <p className="text-xs text-muted-foreground">
        Al registrarte aceptás los{" "}
        <Link
          href="/terminos"
          className="underline underline-offset-4 hover:text-foreground"
        >
          Términos de uso
        </Link>{" "}
        y la{" "}
        <Link
          href="/privacidad"
          className="underline underline-offset-4 hover:text-foreground"
        >
          Política de privacidad
        </Link>
        .
      </p>

      <SubmitButton isPending={isPending}>Crear cuenta</SubmitButton>
    </form>
  );
}
