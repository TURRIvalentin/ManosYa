"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Eye, EyeOff, Info } from "lucide-react";
import { FieldInput } from "@/components/ui/field-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { changePasswordAction } from "@/server/actions/profile";

export function ChangePasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
  const [saved, setSaved] = useState(false);

  if (!hasPassword) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
        Tu cuenta usa Google para ingresar y no tiene contraseña propia. Podés agregar una desde Perfil &gt; Seguridad (próximamente).
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaved(false);
    setFieldErrors({});
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await changePasswordAction(formData);
      if (!result.ok) {
        if (result.field) setFieldErrors({ [result.field]: result.error });
        else setFieldErrors({ _general: result.error });
        return;
      }
      form.reset();
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    });
  }

  return (
    <form className="flex flex-col gap-4" noValidate onSubmit={handleSubmit}>
      {fieldErrors._general && (
        <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
          {fieldErrors._general}
        </p>
      )}

      <div className="relative flex flex-col gap-1.5">
        <FieldInput
          autoComplete="current-password"
          className="pr-10"
          error={fieldErrors.currentPassword}
          label="Contraseña actual"
          name="currentPassword"
          onBlur={() => setFieldErrors((p) => ({ ...p, currentPassword: undefined }))}
          required
          type={showCurrent ? "text" : "password"}
        />
        <button
          aria-label={showCurrent ? "Ocultar contraseña" : "Mostrar contraseña"}
          className="absolute right-3 top-[2.125rem] rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-1"
          onClick={() => setShowCurrent((v) => !v)}
          type="button"
        >
          {showCurrent ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
        </button>
      </div>

      <div className="relative flex flex-col gap-1.5">
        <FieldInput
          autoComplete="new-password"
          className="pr-10"
          error={fieldErrors.newPassword}
          hint="Mínimo 8 caracteres, una mayúscula y un número"
          label="Nueva contraseña"
          name="newPassword"
          onBlur={() => setFieldErrors((p) => ({ ...p, newPassword: undefined }))}
          required
          type={showNew ? "text" : "password"}
        />
        <button
          aria-label={showNew ? "Ocultar contraseña" : "Mostrar contraseña"}
          className="absolute right-3 top-[2.125rem] rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-1"
          onClick={() => setShowNew((v) => !v)}
          type="button"
        >
          {showNew ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
        </button>
      </div>

      <FieldInput
        autoComplete="new-password"
        error={fieldErrors.confirmPassword}
        label="Repetir nueva contraseña"
        name="confirmPassword"
        onBlur={() => setFieldErrors((p) => ({ ...p, confirmPassword: undefined }))}
        required
        type="password"
      />

      <div className="flex items-center gap-3">
        <SubmitButton isPending={isPending}>Cambiar contraseña</SubmitButton>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-green-600">
            <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
            Contraseña actualizada
          </span>
        )}
      </div>
    </form>
  );
}
