"use client";

import { useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import { CheckCircle2 } from "lucide-react";
import { FieldInput } from "@/components/ui/field-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { updateProfileDataAction } from "@/server/actions/profile";

interface ProfileDataFormProps {
  initialName: string | null;
  initialPhone: string | null;
}

export function ProfileDataForm({ initialName, initialPhone }: ProfileDataFormProps) {
  const { update } = useSession();
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
  const [saved, setSaved] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaved(false);
    setFieldErrors({});
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateProfileDataAction(formData);
      if (!result.ok) {
        if (result.field) setFieldErrors({ [result.field]: result.error });
        else setFieldErrors({ _general: result.error });
        return;
      }
      // Show saved feedback, then hard-reload so TopBar picks up the new name.
      // update() updates the NextAuth JWT; window.location.reload() is the
      // reliable fallback because next-auth v5-beta.31 doesn't always propagate
      // token.name changes to useSession() consumers in the same render cycle.
      setSaved(true);
      await update();
      setTimeout(() => window.location.reload(), 1500);
    });
  }

  return (
    <form className="flex flex-col gap-4" noValidate onSubmit={handleSubmit}>
      {fieldErrors._general && (
        <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
          {fieldErrors._general}
        </p>
      )}

      <FieldInput
        autoComplete="name"
        defaultValue={initialName ?? ""}
        error={fieldErrors.name}
        label="Nombre completo"
        name="name"
        onBlur={() => setFieldErrors((p) => ({ ...p, name: undefined }))}
        placeholder="Juan García"
        required
        type="text"
      />

      <FieldInput
        autoComplete="tel"
        defaultValue={initialPhone ?? ""}
        error={fieldErrors.phone}
        hint="Ej: +54 11 1234-5678"
        inputMode="tel"
        label="Teléfono"
        name="phone"
        onBlur={() => setFieldErrors((p) => ({ ...p, phone: undefined }))}
        placeholder="+54 11 1234-5678"
        required
        type="tel"
      />

      <div className="flex items-center gap-3">
        <SubmitButton isPending={isPending}>Guardar cambios</SubmitButton>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-green-600">
            <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
            Guardado
          </span>
        )}
      </div>
    </form>
  );
}
