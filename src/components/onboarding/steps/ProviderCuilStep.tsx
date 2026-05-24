"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { CuilInput } from "@/components/ui/cuil-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { saveProviderCuilAction } from "@/server/actions/onboarding";

interface ProviderCuilStepProps {
  initialCuil: string;
  initialBio: string;
}

export function ProviderCuilStep({
  initialCuil,
  initialBio,
}: ProviderCuilStepProps) {
  const router = useRouter();
  const [bio, setBio] = useState(initialBio);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    setFieldErrors({});

    // CuilInput renders a hidden <input name="cuil"> — we read it via FormData
    const formData = new FormData(e.currentTarget);
    const result = await saveProviderCuilAction(formData);

    if (!result.ok) {
      setFieldErrors(
        result.field
          ? { [result.field]: result.error }
          : { _general: result.error },
      );
      setIsPending(false);
      return;
    }

    router.push("/onboarding/zonas");
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground">CUIL y descripción</h1>
        <p className="text-sm text-muted-foreground">
          Tu CUIL/CUIT es necesario para emitir comprobantes y verificar tu
          identidad.
        </p>
      </div>

      <CuilInput
        label="CUIL / CUIT"
        name="cuil"
        defaultValue={initialCuil}
        error={fieldErrors.cuil}
        required
        onBlur={() => {
          // Clear cuil error when user revisits the field
          if (fieldErrors.cuil) {
            setFieldErrors((prev) => {
              const next = { ...prev };
              delete next.cuil;
              return next;
            });
          }
        }}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="bio" className="text-sm font-medium text-foreground">
          Descripción{" "}
          <span className="font-normal text-muted-foreground">(opcional)</span>
        </label>
        <textarea
          id="bio"
          name="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          maxLength={500}
          placeholder="Contá tu experiencia, especialidades y por qué elegiarte…"
          className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-1"
          aria-describedby="bio-count"
        />
        <p
          id="bio-count"
          className="text-right text-xs text-muted-foreground"
          aria-live="polite"
        >
          {bio.length}/500
        </p>
        {fieldErrors.bio && (
          <p className="flex items-start gap-1 text-xs text-destructive" role="alert">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {fieldErrors.bio}
          </p>
        )}
      </div>

      {fieldErrors._general && (
        <p className="text-sm text-destructive" role="alert">
          {fieldErrors._general}
        </p>
      )}

      <SubmitButton isPending={isPending}>Continuar</SubmitButton>
    </form>
  );
}
