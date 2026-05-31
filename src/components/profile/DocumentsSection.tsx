"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, CheckCircle2, Clock, X } from "lucide-react";
import { SubmitButton } from "@/components/ui/submit-button";
import { uploadDocumentAction } from "@/server/actions/profile";
import { cn } from "@/lib/utils";

interface DocumentsSectionProps {
  dniUrl: string | null;
  licenseUrl: string | null;
  isVerified: boolean;
}

interface FilePreview {
  file: File;
  objectUrl: string;
}

function StatusBadge({ url, isVerified }: { url: string | null; isVerified: boolean }) {
  if (!url) {
    return (
      <span className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
        No subido
      </span>
    );
  }
  if (isVerified) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
        <CheckCircle2 aria-hidden="true" className="h-3 w-3" />
        Verificado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
      <Clock aria-hidden="true" className="h-3 w-3" />
      Pendiente de verificación
    </span>
  );
}

function FileUploadSlot({
  label,
  name,
  existingUrl,
  preview,
  onFileChange,
  onClear,
  inputRef,
  error,
}: {
  label: string;
  name: string;
  existingUrl: string | null;
  preview: FilePreview | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  inputRef: React.RefObject<HTMLInputElement>;
  error?: string;
}) {
  const thumbSrc = preview?.objectUrl ?? (existingUrl ?? null);

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-foreground">{label}</span>

      <div
        className={cn(
          "relative flex h-32 w-full items-center justify-center rounded-xl border-2 border-dashed transition-colors",
          thumbSrc ? "border-brand-600/40 bg-brand-600/5" : "border-border bg-muted/30",
          error && "border-destructive",
        )}
      >
        {thumbSrc ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={label}
              className="h-full w-full rounded-xl object-cover"
              src={thumbSrc}
            />
            {preview && (
              <button
                aria-label="Quitar archivo"
                className="absolute right-2 top-2 rounded-full bg-background/90 p-1 text-muted-foreground hover:text-foreground"
                onClick={onClear}
                type="button"
              >
                <X aria-hidden="true" className="h-3.5 w-3.5" />
              </button>
            )}
          </>
        ) : (
          <button
            className="flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => inputRef.current?.click()}
            type="button"
          >
            <Camera aria-hidden="true" className="h-6 w-6" />
            <span className="text-xs">Subir foto</span>
          </button>
        )}
      </div>

      {thumbSrc && !preview && (
        <button
          className="text-left text-xs text-brand-600 underline-offset-4 hover:underline"
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          Reemplazar foto
        </button>
      )}

      <input
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        className="sr-only"
        name={name}
        onChange={onFileChange}
        ref={inputRef}
        type="file"
      />

      {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
    </div>
  );
}

export function DocumentsSection({ dniUrl, licenseUrl, isVerified }: DocumentsSectionProps) {
  const dniRef = useRef<HTMLInputElement>(null);
  const licenseRef = useRef<HTMLInputElement>(null);
  const [dniPreview, setDniPreview] = useState<FilePreview | null>(null);
  const [licensePreview, setLicensePreview] = useState<FilePreview | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
    setPreview: (p: FilePreview | null) => void,
    field: string,
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    setPreview({ file, objectUrl: URL.createObjectURL(file) });
  }

  function clearFile(
    setPreview: React.Dispatch<React.SetStateAction<FilePreview | null>>,
    ref: React.RefObject<HTMLInputElement>,
  ) {
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev.objectUrl);
      return null;
    });
    if (ref.current) ref.current.value = "";
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!dniPreview && !licensePreview) {
      setGlobalError("Seleccioná al menos un documento para subir.");
      return;
    }
    setSaved(false);
    setGlobalError(null);
    setFieldErrors({});
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await uploadDocumentAction(formData);
      if (!result.ok) {
        if (result.field) setFieldErrors({ [result.field]: result.error });
        else setGlobalError(result.error);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 5000);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Estado actual */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-semibold text-foreground">Estado de verificación</p>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">DNI / Frente</span>
            <StatusBadge isVerified={isVerified} url={dniUrl} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Matrícula / Certificado</span>
            <StatusBadge isVerified={isVerified} url={licenseUrl} />
          </div>
        </div>
        {isVerified && (
          <p className="text-xs text-muted-foreground">
            Tu documentación fue verificada. Para actualizarla contactá a soporte.
          </p>
        )}
      </div>

      {/* Upload — deshabilitado si ya verificado */}
      {!isVerified && (
        <form className="flex flex-col gap-5" noValidate onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FileUploadSlot
              error={fieldErrors.dni}
              existingUrl={dniUrl}
              inputRef={dniRef}
              label="DNI / Frente"
              name="dni"
              onClear={() => clearFile(setDniPreview, dniRef)}
              onFileChange={(e) => handleFileChange(e, setDniPreview, "dni")}
              preview={dniPreview}
            />
            <FileUploadSlot
              error={fieldErrors.license}
              existingUrl={licenseUrl}
              inputRef={licenseRef}
              label="Matrícula / Certificado"
              name="license"
              onClear={() => clearFile(setLicensePreview, licenseRef)}
              onFileChange={(e) => handleFileChange(e, setLicensePreview, "license")}
              preview={licensePreview}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Formatos aceptados: JPG, PNG, WEBP, HEIC. Máximo 10 MB por archivo.
          </p>

          {globalError && <p className="text-sm text-destructive" role="alert">{globalError}</p>}

          <div className="flex items-center gap-3">
            <SubmitButton isPending={isPending}>Subir documentos</SubmitButton>
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-green-600">
                <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                Enviado — revisaremos tu documentación
              </span>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
