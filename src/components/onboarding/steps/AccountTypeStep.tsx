"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Wrench, Layers } from "lucide-react";
import { SubmitButton } from "@/components/ui/submit-button";
import { saveAccountTypeAction } from "@/server/actions/onboarding";

type AccountType = "CLIENT" | "PROVIDER" | "BOTH";

const OPTIONS: {
  value: AccountType;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    value: "CLIENT",
    label: "Quiero contratar servicios",
    description: "Buscás plomeros, electricistas, pintores y más.",
    icon: Users,
  },
  {
    value: "PROVIDER",
    label: "Ofrezco mis servicios",
    description: "Sos profesional y querés conseguir clientes.",
    icon: Wrench,
  },
  {
    value: "BOTH",
    label: "Las dos cosas",
    description: "Contratás servicios y también los ofrecés.",
    icon: Layers,
  },
];

export function AccountTypeStep() {
  const router = useRouter();
  const [selected, setSelected] = useState<AccountType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) {
      setError("Seleccioná cómo vas a usar ManosYa.");
      return;
    }
    setIsPending(true);
    setError(null);

    const formData = new FormData();
    formData.set("type", selected);
    const result = await saveAccountTypeAction(formData);

    if (!result.ok) {
      setError(result.error);
      setIsPending(false);
      return;
    }

    router.push("/onboarding/info-basica");
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground">
          ¿Cómo vas a usar ManosYa?
        </h1>
        <p className="text-sm text-muted-foreground">
          Podés cambiar esto después desde tu perfil.
        </p>
      </div>

      <div className="flex flex-col gap-3" role="group" aria-label="Tipo de cuenta">
        {OPTIONS.map(({ value, label, description, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setSelected(value);
              setError(null);
            }}
            aria-pressed={selected === value}
            className={`flex items-start gap-4 rounded-xl border-2 p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 ${
              selected === value
                ? "border-brand-600 bg-brand-50"
                : "border-border bg-card hover:border-brand-300 hover:bg-muted/40"
            }`}
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
                selected === value
                  ? "bg-brand-600 text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{label}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {description}
              </p>
            </div>
          </button>
        ))}
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <SubmitButton isPending={isPending}>Continuar</SubmitButton>
    </form>
  );
}
