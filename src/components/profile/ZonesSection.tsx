"use client";

import { useState, useTransition } from "react";
import { Check, CheckCircle2 } from "lucide-react";
import { SubmitButton } from "@/components/ui/submit-button";
import { updateZonesAction } from "@/server/actions/profile";

interface Zone {
  id: string;
  name: string;
  type: "BARRIO_CABA" | "PARTIDO_GBA";
}

interface ZonesSectionProps {
  zones: Zone[];
  selectedIds: string[];
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
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div aria-label={title} className="flex flex-wrap gap-2" role="group">
        {zones.map((zone) => {
          const isSelected = selected.has(zone.id);
          return (
            <button
              aria-pressed={isSelected}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-1 ${
                isSelected
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-border bg-background text-foreground hover:border-brand-400 hover:bg-muted/40"
              }`}
              key={zone.id}
              onClick={() => onToggle(zone.id)}
              type="button"
            >
              {isSelected && <Check aria-hidden="true" className="h-3.5 w-3.5" />}
              {zone.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ZonesSection({ zones, selectedIds }: ZonesSectionProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedIds));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const caba = zones.filter((z) => z.type === "BARRIO_CABA");
  const gba = zones.filter((z) => z.type === "PARTIDO_GBA");

  function toggle(id: string) {
    setSaved(false);
    setError(null);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (selected.size === 0) {
      setError("Seleccioná al menos una zona de trabajo.");
      return;
    }
    setSaved(false);
    setError(null);
    const formData = new FormData();
    selected.forEach((id) => formData.append("zoneIds", id));
    startTransition(async () => {
      const result = await updateZonesAction(formData);
      if (!result.ok) { setError(result.error); return; }
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    });
  }

  return (
    <form className="flex flex-col gap-6" noValidate onSubmit={handleSubmit}>
      {selected.size > 0 && (
        <p aria-live="polite" className="text-sm font-medium text-brand-600">
          {selected.size} zona{selected.size !== 1 ? "s" : ""} seleccionada{selected.size !== 1 ? "s" : ""}
        </p>
      )}

      <div className="flex flex-col gap-5">
        {caba.length > 0 && (
          <ZoneGroup onToggle={toggle} selected={selected} title="CABA — Barrios" zones={caba} />
        )}
        {gba.length > 0 && (
          <ZoneGroup onToggle={toggle} selected={selected} title="GBA — Partidos" zones={gba} />
        )}
        {zones.length === 0 && (
          <p className="text-sm text-muted-foreground">No hay zonas disponibles.</p>
        )}
      </div>

      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

      <div className="flex items-center gap-3">
        <SubmitButton isPending={isPending}>Guardar zonas</SubmitButton>
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
