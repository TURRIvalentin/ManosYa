"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Lock } from "lucide-react";
import { SubmitButton } from "@/components/ui/submit-button";
import { CuilInput } from "@/components/ui/cuil-input";
import { updateProviderBioAction, updateProviderCuilAction } from "@/server/actions/profile";
import { SUPPORT_EMAIL } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface ProviderBioFormProps {
  initialBio: string | null;
  initialCuil: string | null;
  isVerified: boolean;
}

export function ProviderBioForm({ initialBio, initialCuil, isVerified }: ProviderBioFormProps) {
  const [bioPending, startBioTransition] = useTransition();
  const [cuilPending, startCuilTransition] = useTransition();
  const [bioError, setBioError] = useState<string | null>(null);
  const [bioSaved, setBioSaved] = useState(false);
  const [cuilError, setCuilError] = useState<string | null>(null);
  const [cuilSaved, setCuilSaved] = useState(false);

  function handleBioSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBioError(null);
    setBioSaved(false);
    const formData = new FormData(e.currentTarget);
    startBioTransition(async () => {
      const result = await updateProviderBioAction(formData);
      if (!result.ok) { setBioError(result.error); return; }
      setBioSaved(true);
      setTimeout(() => setBioSaved(false), 4000);
    });
  }

  function handleCuilSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCuilError(null);
    setCuilSaved(false);
    const formData = new FormData(e.currentTarget);
    startCuilTransition(async () => {
      const result = await updateProviderCuilAction(formData);
      if (!result.ok) { setCuilError(result.error); return; }
      setCuilSaved(true);
      setTimeout(() => setCuilSaved(false), 4000);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Bio */}
      <form className="flex flex-col gap-3" onSubmit={handleBioSubmit}>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground" htmlFor="bio">
            Descripción profesional
          </label>
          <textarea
            className={cn(
              "min-h-[100px] w-full rounded-lg border border-input bg-background px-3 py-2 text-base text-foreground",
              "placeholder:text-muted-foreground/60",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-1",
              "resize-y",
              bioError && "border-destructive",
            )}
            defaultValue={initialBio ?? ""}
            id="bio"
            maxLength={500}
            name="bio"
            placeholder="Contale a los clientes sobre tu experiencia y especialidades…"
          />
          <p className="text-xs text-muted-foreground">Máximo 500 caracteres.</p>
        </div>
        {bioError && <p className="text-sm text-destructive" role="alert">{bioError}</p>}
        <div className="flex items-center gap-3">
          <SubmitButton isPending={bioPending}>Guardar descripción</SubmitButton>
          {bioSaved && (
            <span className="flex items-center gap-1.5 text-sm text-green-600">
              <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
              Guardado
            </span>
          )}
        </div>
      </form>

      {/* CUIL */}
      <div className="flex flex-col gap-2">
        {isVerified ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">CUIL/CUIT</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                <CheckCircle2 aria-hidden="true" className="h-3 w-3" />
                Verificado
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
              <Lock aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="font-mono text-base tracking-wider text-foreground">
                {initialCuil ?? "—"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Tu CUIL fue verificado y no puede modificarse. Para cambiarlo contactanos en{" "}
              <a className="underline underline-offset-4" href={`mailto:${SUPPORT_EMAIL}`}>
                {SUPPORT_EMAIL}
              </a>
              .
            </p>
          </div>
        ) : (
          <form className="flex flex-col gap-3" onSubmit={handleCuilSubmit}>
            <CuilInput
              defaultValue={initialCuil ?? ""}
              error={cuilError ?? undefined}
              label="CUIL/CUIT"
              required
            />
            {initialCuil && !isVerified && (
              <p className="text-xs text-amber-600">
                Podés modificarlo hasta que verifiquemos tu CUIL.
              </p>
            )}
            {cuilError && <p className="text-sm text-destructive" role="alert">{cuilError}</p>}
            <div className="flex items-center gap-3">
              <SubmitButton isPending={cuilPending}>Guardar CUIL</SubmitButton>
              {cuilSaved && (
                <span className="flex items-center gap-1.5 text-sm text-green-600">
                  <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                  Guardado
                </span>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
