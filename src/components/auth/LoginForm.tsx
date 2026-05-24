"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Eye, EyeOff } from "lucide-react";
import { FieldInput } from "@/components/ui/field-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { loginAction } from "@/server/actions/auth";
import { cn } from "@/lib/utils";

export function LoginForm() {
  const [isPending, startTransition] = useTransition();
  const [isGooglePending, setIsGooglePending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleCredentialsSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await loginAction(null, formData);
      if (result && !result.ok) {
        setError(result.error);
      }
      // On success, loginAction re-throws the redirect — browser navigates automatically
    });
  }

  async function handleGoogleSignIn() {
    setIsGooglePending(true);
    try {
      await signIn("google", { callbackUrl: "/" });
    } catch {
      setIsGooglePending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground">Ingresar</h1>
        <p className="text-sm text-muted-foreground">
          ¿No tenés cuenta?{" "}
          <Link
            href="/auth/register"
            className="font-medium text-brand-600 underline-offset-4 hover:underline"
          >
            Registrate gratis
          </Link>
        </p>
      </div>

      {/* Google OAuth */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isGooglePending || isPending}
        aria-busy={isGooglePending}
        className={cn(
          "flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-border bg-background",
          "text-sm font-medium text-foreground shadow-sm",
          "transition-colors hover:bg-muted",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-1",
          "disabled:cursor-not-allowed disabled:opacity-60",
        )}
      >
        {isGooglePending ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-foreground" />
        ) : (
          /* Google G icon — inline SVG to avoid image request */
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="h-4 w-4 shrink-0"
            aria-hidden="true"
          >
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
        )}
        Continuar con Google
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3" role="separator">
        <div className="flex-1 border-t border-border" />
        <span className="text-xs text-muted-foreground">o con email</span>
        <div className="flex-1 border-t border-border" />
      </div>

      {/* Credentials form */}
      <form onSubmit={handleCredentialsSubmit} noValidate className="flex flex-col gap-4">
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </div>
        )}

        <FieldInput
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          inputMode="email"
          placeholder="juan@ejemplo.com"
        />

        <div className="relative flex flex-col gap-1.5">
          <FieldInput
            label="Contraseña"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
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

        <div className="flex justify-end">
          <Link
            href="/auth/forgot-password"
            className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Olvidé mi contraseña
          </Link>
        </div>

        <SubmitButton isPending={isPending}>Ingresar</SubmitButton>
      </form>
    </div>
  );
}
