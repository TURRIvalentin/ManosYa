"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Camera, Send } from "lucide-react";

import { SubmitButton } from "@/components/ui/submit-button";
import { createRequestAction } from "@/server/actions/request";
import type { NewRequestFormData } from "@/server/queries/new-request";

type NewRequestFormProps = {
  provider: NonNullable<NewRequestFormData["provider"]>;
};

type FieldErrors = Partial<
  Record<"categoryId" | "description" | "providerId" | "title" | "zoneId" | "_general", string>
>;

export function NewRequestForm({ provider }: NewRequestFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const firstService = provider.services[0];
  const firstZone = provider.zones[0];
  const isSubmitting = isPending || hasSubmitted;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (hasSubmitted) return;
    setHasSubmitted(true);
    setFieldErrors({});
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await createRequestAction(formData);
      if (!result.ok) {
        setHasSubmitted(false);
        if (result.field) setFieldErrors({ [result.field]: result.error });
        else setFieldErrors({ _general: result.error });
        return;
      }
      router.push(`/pedidos?created=${result.data.requestId}`);
    });
  }

  return (
    <form noValidate className="mt-5 grid gap-4" onSubmit={handleSubmit}>
      <input name="providerId" type="hidden" value={provider.id} />

      {fieldErrors._general && (
        <p
          className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {fieldErrors._general}
        </p>
      )}

      <label className="grid gap-1.5">
        <span className="text-sm font-medium text-foreground">Título del pedido</span>
        <input
          required
          className="h-11 rounded-lg border border-input bg-background px-3 text-sm outline-none ring-brand-600 transition focus:ring-2"
          name="title"
          placeholder="Ej: Reparar pérdida debajo de la bacha"
          type="text"
        />
        {fieldErrors.title && (
          <span className="text-sm text-destructive">{fieldErrors.title}</span>
        )}
      </label>

      <label className="grid gap-1.5">
        <span className="text-sm font-medium text-foreground">Servicio</span>
        <select
          required
          className="h-11 rounded-lg border border-input bg-background px-3 text-sm outline-none ring-brand-600 transition focus:ring-2"
          defaultValue={firstService?.category.id ?? ""}
          name="categoryId"
        >
          {provider.services.map((service) => (
            <option key={service.id} value={service.category.id}>
              {service.title} - {service.category.name}
            </option>
          ))}
        </select>
        {fieldErrors.categoryId && (
          <span className="text-sm text-destructive">{fieldErrors.categoryId}</span>
        )}
      </label>

      <label className="grid gap-1.5">
        <span className="text-sm font-medium text-foreground">Zona</span>
        <select
          required
          className="h-11 rounded-lg border border-input bg-background px-3 text-sm outline-none ring-brand-600 transition focus:ring-2"
          defaultValue={firstZone?.id ?? ""}
          name="zoneId"
        >
          {provider.zones.map((zone) => (
            <option key={zone.id} value={zone.id}>
              {zone.name}
            </option>
          ))}
        </select>
        {fieldErrors.zoneId && (
          <span className="text-sm text-destructive">{fieldErrors.zoneId}</span>
        )}
      </label>

      <label className="grid gap-1.5">
        <span className="text-sm font-medium text-foreground">Descripción</span>
        <textarea
          required
          className="min-h-32 rounded-lg border border-input bg-background px-3 py-2 text-sm leading-6 outline-none ring-brand-600 transition focus:ring-2"
          name="description"
          placeholder="Contá qué necesitás, medidas aproximadas, horarios posibles y cualquier detalle útil."
        />
        {fieldErrors.description && (
          <span className="text-sm text-destructive">{fieldErrors.description}</span>
        )}
      </label>

      <div className="rounded-lg border border-dashed border-border bg-muted/40 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground">
            <Camera aria-hidden="true" className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Fotos opcionales</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              La carga de fotos se agregará próximamente. Por ahora, podés describir el problema
              con detalle.
            </p>
          </div>
        </div>
      </div>

      <SubmitButton isPending={isSubmitting}>
        <Send aria-hidden="true" className="h-4 w-4" />
        Enviar pedido
      </SubmitButton>
    </form>
  );
}
