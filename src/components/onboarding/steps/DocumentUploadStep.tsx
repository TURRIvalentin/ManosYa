"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Camera, X } from "lucide-react";
import { SubmitButton } from "@/components/ui/submit-button";
import { saveProviderDocumentsAction } from "@/server/actions/onboarding";

interface DocumentUploadStepProps {
  existingDni: string | null;
  existingLicense: string | null;
}

interface FilePreview {
  file: File;
  objectUrl: string;
}

export function DocumentUploadStep({
  existingDni,
  existingLicense,
}: DocumentUploadStepProps) {
  const router = useRouter();
  const dniRef = useRef<HTMLInputElement>(null);
  const licenseRef = useRef<HTMLInputElement>(null);

  const [dniPreview, setDniPreview] = useState<FilePreview | null>(null);
  const [licensePreview, setLicensePreview] = useState<FilePreview | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isPending, setIsPending] = useState(false);

  function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
    setPreview: (p: FilePreview | null) => void,
    field: string,
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
    const objectUrl = URL.createObjectURL(file);
    setPreview({ file, objectUrl });
  }

  function clearFile(
    setPreview: (p: FilePreview | null) => void,
    inputRef: React.RefObject<HTMLInputElement>,
  ) {
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev.objectUrl);
      return null;
    });
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    setFieldErrors({});

    const formData = new FormData();
    if (dniPreview?.file) formData.set("dni", dniPreview.file);
    if (licensePreview?.file) formData.set("license", licensePreview.file);

    const result = await saveProviderDocumentsAction(formData);

    if (!result.ok) {
      setFieldErrors(
        result.field
          ? { [result.field]: result.error }
          : { _general: result.error },
      );
      setIsPending(false);
      return;
    }

    router.push("/");
  }

  const hasFiles = dniPreview || licensePreview;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground">Documentación</h1>
        <p className="text-sm text-muted-foreground">
          Subí una foto de tu DNI y tu habilitación para verificar tu identidad.
        </p>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Este paso es <strong>opcional</strong>. Podés subirlos después desde tu
        perfil. Solo los ve nuestro equipo — no son visibles para los clientes.
      </div>

      <DocumentField
        label="DNI (frente)"
        field="dni"
        inputRef={dniRef}
        preview={dniPreview}
        existingUrl={existingDni}
        error={fieldErrors.dni}
        onFileChange={(e) => handleFileChange(e, setDniPreview, "dni")}
        onClear={() => clearFile(setDniPreview, dniRef)}
      />

      <DocumentField
        label="Matrícula o habilitación"
        field="license"
        inputRef={licenseRef}
        preview={licensePreview}
        existingUrl={existingLicense}
        error={fieldErrors.license}
        onFileChange={(e) => handleFileChange(e, setLicensePreview, "license")}
        onClear={() => clearFile(setLicensePreview, licenseRef)}
      />

      {fieldErrors._general && (
        <p className="text-sm text-destructive" role="alert">
          {fieldErrors._general}
        </p>
      )}

      <div className="flex flex-col gap-3 pb-safe">
        <SubmitButton isPending={isPending} fixedBottom={false}>
          {hasFiles ? "Subir y terminar" : "Terminar sin subir"}
        </SubmitButton>

        <button
          type="button"
          onClick={() => router.push("/")}
          disabled={isPending}
          className="flex h-11 items-center justify-center rounded-xl border border-border text-sm font-medium text-muted-foreground transition-colors hover:border-brand-300 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 disabled:opacity-50"
        >
          Subir después desde mi perfil
        </button>
      </div>
    </form>
  );
}

interface DocumentFieldProps {
  label: string;
  field: string;
  inputRef: React.RefObject<HTMLInputElement>;
  preview: FilePreview | null;
  existingUrl: string | null;
  error?: string;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
}

function DocumentField({
  label,
  field,
  inputRef,
  preview,
  existingUrl,
  error,
  onFileChange,
  onClear,
}: DocumentFieldProps) {
  const displayUrl = preview?.objectUrl ?? existingUrl;
  const inputId = `doc-${field}`;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-foreground">{label}</p>

      {displayUrl ? (
        <div className="overflow-hidden rounded-xl border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={displayUrl}
            alt={`Vista previa: ${label}`}
            className="max-h-48 w-full object-cover"
          />
          <div className="flex items-center justify-between px-3 py-2">
            <p className="text-xs text-muted-foreground">
              {preview ? "Foto nueva — se sube al guardar" : "Foto guardada"}
            </p>
            <button
              type="button"
              onClick={onClear}
              aria-label={`Quitar foto de ${label}`}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Quitar
            </button>
          </div>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border p-6 text-center transition-colors hover:border-brand-300 hover:bg-muted/20 focus-within:border-brand-600 focus-within:bg-muted/20"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Camera className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              Sacar foto o elegir archivo
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              JPG, PNG, WEBP o HEIC · Máx. 10 MB
            </p>
          </div>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onFileChange}
            className="sr-only"
          />
        </label>
      )}

      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
