"use client";

import { usePathname } from "next/navigation";

const CLIENT_STEPS = ["tipo-cuenta", "info-basica"] as const;
const PROVIDER_STEPS = [
  "tipo-cuenta",
  "info-basica",
  "cuil",
  "zonas",
  "servicios",
  "documentos",
] as const;

const STEP_LABELS: Record<string, string> = {
  "tipo-cuenta": "Tipo de cuenta",
  "info-basica": "Tus datos",
  cuil: "CUIL y perfil",
  zonas: "Zonas de trabajo",
  servicios: "Tu servicio",
  documentos: "Documentación",
};

interface ProgressBarProps {
  isProvider: boolean;
}

export function ProgressBar({ isProvider }: ProgressBarProps) {
  const pathname = usePathname();
  const steps = isProvider ? PROVIDER_STEPS : CLIENT_STEPS;
  const slug = pathname.split("/").at(-1) ?? "";
  const idx = (steps as readonly string[]).indexOf(slug);

  if (idx === -1) return null;

  const current = idx + 1;
  const total = steps.length;

  return (
    <div className="flex flex-col gap-2" aria-label={`Paso ${current} de ${total}: ${STEP_LABELS[slug]}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Paso {current} de {total}
        </p>
        <p className="text-xs font-medium text-foreground">
          {STEP_LABELS[slug]}
        </p>
      </div>
      <div
        className="flex gap-1"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label={`Progreso del registro: paso ${current} de ${total}`}
      >
        {steps.map((s, i) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
              i < current ? "bg-brand-600" : "bg-muted"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
