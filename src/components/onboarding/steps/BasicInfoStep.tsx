"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FieldInput } from "@/components/ui/field-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { saveBasicInfoAction } from "@/server/actions/onboarding";

interface BasicInfoStepProps {
  initialPhone: string;
}

export function BasicInfoStep({ initialPhone }: BasicInfoStepProps) {
  const router = useRouter();
  const [phone, setPhone] = useState(initialPhone);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!phone.trim()) {
      setError("El teléfono es requerido.");
      return;
    }

    setIsPending(true);
    setError(null);

    const formData = new FormData();
    formData.set("phone", phone);
    const result = await saveBasicInfoAction(formData);

    if (!result.ok) {
      setError(result.error);
      setIsPending(false);
      return;
    }

    // /onboarding redirector determines next step (cuil for providers, / for clients)
    router.push("/onboarding");
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground">
          Tu número de teléfono
        </h1>
        <p className="text-sm text-muted-foreground">
          Lo usamos para que los clientes puedan contactarte directamente.
        </p>
      </div>

      <FieldInput
        label="Teléfono"
        id="phone"
        name="phone"
        type="tel"
        inputMode="tel"
        value={phone}
        onChange={(e) => {
          setPhone(e.target.value);
          if (error) setError(null);
        }}
        placeholder="Ej: 11 1234-5678"
        hint="Sin el 0 ni el 15 delante. Ej: 11 para CABA y GBA."
        error={error ?? undefined}
        required
        autoComplete="tel"
      />

      <SubmitButton isPending={isPending}>Continuar</SubmitButton>
    </form>
  );
}
