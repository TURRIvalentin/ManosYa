"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { FieldInput } from "@/components/ui/field-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { saveProviderServiceAction } from "@/server/actions/onboarding";

interface Category {
  id: string;
  name: string;
  iconName: string | null;
}

interface ProviderServicesStepProps {
  categories: Category[];
}

const PRICE_UNITS = [
  { value: "POR_TRABAJO", label: "Por trabajo" },
  { value: "POR_HORA", label: "Por hora" },
  { value: "POR_M2", label: "Por m²" },
  { value: "A_CONVENIR", label: "A convenir" },
] as const;

export function ProviderServicesStep({ categories }: ProviderServicesStepProps) {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [priceUnit, setPriceUnit] = useState("POR_TRABAJO");
  const [priceFrom, setPriceFrom] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isPending, setIsPending] = useState(false);

  function clearError(field: string) {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    setFieldErrors({});

    // All inputs are controlled and part of the form
    const formData = new FormData(e.currentTarget);
    const result = await saveProviderServiceAction(formData);

    if (!result.ok) {
      setFieldErrors(
        result.field
          ? { [result.field]: result.error }
          : { _general: result.error },
      );
      setIsPending(false);
      return;
    }

    router.push("/onboarding/documentos");
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground">Tu primer servicio</h1>
        <p className="text-sm text-muted-foreground">
          Después podés agregar más desde tu perfil.
        </p>
      </div>

      {/* Categoría */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="categoryId" className="text-sm font-medium text-foreground">
          Categoría
          <span className="ml-0.5 text-destructive" aria-hidden="true">*</span>
        </label>
        <select
          id="categoryId"
          name="categoryId"
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            clearError("categoryId");
          }}
          required
          aria-invalid={!!fieldErrors.categoryId}
          aria-describedby={fieldErrors.categoryId ? "categoryId-error" : undefined}
          className="h-11 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-1"
        >
          <option value="">Seleccioná una categoría</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        {fieldErrors.categoryId && (
          <p
            id="categoryId-error"
            role="alert"
            className="flex items-start gap-1 text-xs text-destructive"
          >
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {fieldErrors.categoryId}
          </p>
        )}
      </div>

      {/* Título */}
      <FieldInput
        label="Título del servicio"
        id="title"
        name="title"
        type="text"
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          clearError("title");
        }}
        placeholder="Ej: Instalación eléctrica domiciliaria"
        error={fieldErrors.title}
        required
        maxLength={100}
      />

      {/* Precio */}
      <div className="flex gap-3">
        <div className="flex flex-col gap-1.5 flex-1">
          <label htmlFor="priceUnit" className="text-sm font-medium text-foreground">
            Modalidad
          </label>
          <select
            id="priceUnit"
            name="priceUnit"
            value={priceUnit}
            onChange={(e) => setPriceUnit(e.target.value)}
            className="h-11 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-1"
          >
            {PRICE_UNITS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {priceUnit !== "A_CONVENIR" && (
          <div className="flex flex-col gap-1.5 flex-1">
            <label htmlFor="priceFrom" className="text-sm font-medium text-foreground">
              Precio desde (ARS)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none">
                $
              </span>
              <input
                id="priceFrom"
                name="priceFrom"
                type="text"
                inputMode="numeric"
                value={priceFrom}
                onChange={(e) => {
                  setPriceFrom(e.target.value.replace(/\D/g, ""));
                  clearError("priceFrom");
                }}
                placeholder="0"
                aria-invalid={!!fieldErrors.priceFrom}
                className="h-11 w-full rounded-lg border border-input bg-background py-0 pl-7 pr-3 text-base text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-1"
              />
            </div>
            {fieldErrors.priceFrom && (
              <p className="flex items-start gap-1 text-xs text-destructive" role="alert">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {fieldErrors.priceFrom}
              </p>
            )}
          </div>
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
