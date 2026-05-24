"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { SubmitButton } from "@/components/ui/submit-button";
import { saveProviderZonesAction } from "@/server/actions/onboarding";

interface Zone {
  id: string;
  name: string;
  type: "BARRIO_CABA" | "PARTIDO_GBA";
}

interface ProviderZonesStepProps {
  zones: Zone[];
  selectedIds: string[];
}

export function ProviderZonesStep({
  zones,
  selectedIds: initialSelected,
}: ProviderZonesStepProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(
    new Set(initialSelected),
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const caba = zones.filter((z) => z.type === "BARRIO_CABA");
  const gba = zones.filter((z) => z.type === "PARTIDO_GBA");

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    if (error) setError(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (selected.size === 0) {
      setError("Seleccioná al menos una zona de trabajo.");
      return;
    }
    setIsPending(true);
    setError(null);

    const formData = new FormData();
    selected.forEach((id) => formData.append("zoneIds", id));
    const result = await saveProviderZonesAction(formData);

    if (!result.ok) {
      setError(result.error);
      setIsPending(false);
      return;
    }

    router.push("/onboarding/servicios");
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground">
          Zonas de trabajo
        </h1>
        <p className="text-sm text-muted-foreground">
          Seleccioná los barrios o partidos donde ofrecés tus servicios.
        </p>
      </div>

      {selected.size > 0 && (
        <p className="text-sm font-medium text-brand-600" aria-live="polite">
          {selected.size} zona{selected.size !== 1 ? "s" : ""} seleccionada
          {selected.size !== 1 ? "s" : ""}
        </p>
      )}

      <div className="flex flex-col gap-5">
        {caba.length > 0 && (
          <ZoneGroup
            title="CABA — Barrios"
            zones={caba}
            selected={selected}
            onToggle={toggle}
          />
        )}
        {gba.length > 0 && (
          <ZoneGroup
            title="GBA — Partidos"
            zones={gba}
            selected={selected}
            onToggle={toggle}
          />
        )}
        {zones.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No hay zonas disponibles. Contactá a soporte.
          </p>
        )}
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

function ZoneGroup({
  title,
  zones,
  selected,
  onToggle,
}: {
  title: string;
  zones: Zone[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      <div className="flex flex-wrap gap-2" role="group" aria-label={title}>
        {zones.map((zone) => {
          const isSelected = selected.has(zone.id);
          return (
            <button
              key={zone.id}
              type="button"
              onClick={() => onToggle(zone.id)}
              aria-pressed={isSelected}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-1 ${
                isSelected
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-border bg-background text-foreground hover:border-brand-400 hover:bg-muted/40"
              }`}
            >
              {isSelected && (
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {zone.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
