"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { FieldInput } from "@/components/ui/field-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { addServiceAction, updateServiceAction } from "@/server/actions/profile";

interface Category {
  id: string;
  name: string;
}

interface ServiceFormProps {
  categories: Category[];
  initialValues?: {
    serviceId: string;
    categoryId: string;
    title: string;
    priceUnit: string;
    priceFrom: string;
  };
  onSuccess: () => void;
  onCancel?: () => void;
}

const PRICE_UNITS = [
  { value: "POR_TRABAJO", label: "Por trabajo" },
  { value: "POR_HORA", label: "Por hora" },
  { value: "POR_M2", label: "Por m²" },
  { value: "A_CONVENIR", label: "A convenir" },
] as const;

export function ServiceForm({
  categories,
  initialValues,
  onSuccess,
  onCancel,
}: ServiceFormProps) {
  const isEdit = !!initialValues;
  const [priceUnit, setPriceUnit] = useState(initialValues?.priceUnit ?? "POR_TRABAJO");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
  const [isPending, setIsPending] = useState(false);
  // Errors only shown after first submit attempt to avoid "red on open" UX
  const [hasSubmitted, setHasSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setHasSubmitted(true);
    setFieldErrors({});
    setIsPending(true);
    const formData = new FormData(e.currentTarget);
    const action = isEdit ? updateServiceAction : addServiceAction;
    const result = await action(formData);
    setIsPending(false);
    if (!result.ok) {
      if (result.field) setFieldErrors({ [result.field]: result.error });
      else setFieldErrors({ _general: result.error });
      return;
    }
    onSuccess();
  }

  return (
    <form className="flex flex-col gap-4" noValidate onSubmit={handleSubmit}>
      {isEdit && (
        <input name="serviceId" type="hidden" value={initialValues.serviceId} />
      )}

      {fieldErrors._general && (
        <p className="text-sm text-destructive" role="alert">{fieldErrors._general}</p>
      )}

      {/* Categoría */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground" htmlFor="categoryId">
          Categoría <span aria-hidden="true" className="text-destructive">*</span>
        </label>
        <select
          aria-describedby={hasSubmitted && fieldErrors.categoryId ? "cat-error" : undefined}
          aria-invalid={hasSubmitted && !!fieldErrors.categoryId}
          className="h-11 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-1"
          defaultValue={initialValues?.categoryId ?? ""}
          id="categoryId"
          name="categoryId"
          onChange={() => setFieldErrors((p) => ({ ...p, categoryId: undefined }))}
        >
          <option value="">Seleccioná una categoría</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        {hasSubmitted && fieldErrors.categoryId && (
          <p className="flex items-start gap-1 text-xs text-destructive" id="cat-error" role="alert">
            <AlertCircle aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {fieldErrors.categoryId}
          </p>
        )}
      </div>

      {/* Título */}
      <FieldInput
        defaultValue={initialValues?.title ?? ""}
        error={fieldErrors.title}
        label="Título del servicio"
        maxLength={100}
        name="title"
        onBlur={() => setFieldErrors((p) => ({ ...p, title: undefined }))}
        placeholder="Ej: Instalación eléctrica domiciliaria"
        required
        type="text"
      />

      {/* Precio */}
      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground" htmlFor="priceUnit">Modalidad</label>
          <select
            className="h-11 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-1"
            defaultValue={initialValues?.priceUnit ?? "POR_TRABAJO"}
            id="priceUnit"
            name="priceUnit"
            onChange={(e) => setPriceUnit(e.target.value)}
          >
            {PRICE_UNITS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {priceUnit !== "A_CONVENIR" && (
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="priceFrom">
              Precio desde (ARS)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 select-none text-sm text-muted-foreground">$</span>
              <input
                className="h-11 w-full rounded-lg border border-input bg-background py-0 pl-7 pr-3 text-base text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-1"
                defaultValue={initialValues?.priceFrom ?? ""}
                id="priceFrom"
                inputMode="numeric"
                name="priceFrom"
                onChange={(e) => {
                  e.target.value = e.target.value.replace(/\D/g, "");
                  setFieldErrors((p) => ({ ...p, priceFrom: undefined }));
                }}
                placeholder="0"
                type="text"
              />
            </div>
            {fieldErrors.priceFrom && (
              <p className="text-xs text-destructive" role="alert">{fieldErrors.priceFrom}</p>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <SubmitButton isPending={isPending}>
          {isEdit ? "Guardar cambios" : "Agregar servicio"}
        </SubmitButton>
        {onCancel && (
          <button
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={onCancel}
            type="button"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
