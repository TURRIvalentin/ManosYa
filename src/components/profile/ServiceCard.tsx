"use client";

import { useRef, useState, useTransition } from "react";
import { ChevronUp, Pencil, Trash2 } from "lucide-react";
import { ServiceForm } from "@/components/profile/ServiceForm";
import { toggleServiceAction, deleteServiceAction } from "@/server/actions/profile";
import { formatARS } from "@/lib/utils";
import { cn } from "@/lib/utils";

const PRICE_UNIT_LABEL: Record<string, string> = {
  POR_HORA: "/ hora",
  POR_TRABAJO: "/ trabajo",
  POR_M2: "/ m²",
  A_CONVENIR: "",
};

interface ServiceCardProps {
  service: {
    id: string;
    title: string;
    categoryId: string;
    categoryName: string;
    priceUnit: string;
    priceFrom: string | null;
    isActive: boolean;
  };
  categories: { id: string; name: string }[];
}

export function ServiceCard({ service, categories }: ServiceCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isActive, setIsActive] = useState(service.isActive);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [togglePending, startToggle] = useTransition();
  const [deletePending, startDelete] = useTransition();
  const formRef = useRef<HTMLDivElement>(null);

  function handleToggleEdit() {
    const next = !isExpanded;
    setIsExpanded(next);
    if (next) {
      // scrollIntoView so the form is visible on mobile after expanding
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 50);
    }
  }

  function handleToggleActive() {
    const next = !isActive;
    setIsActive(next);
    startToggle(async () => {
      const fd = new FormData();
      fd.set("serviceId", service.id);
      fd.set("isActive", String(next));
      const result = await toggleServiceAction(fd);
      if (!result.ok) setIsActive(!next); // revert on error
    });
  }

  function handleDelete() {
    startDelete(async () => {
      const fd = new FormData();
      fd.set("serviceId", service.id);
      await deleteServiceAction(fd);
      // revalidatePath in the action refreshes the list
    });
  }

  const priceLabel =
    service.priceUnit === "A_CONVENIR"
      ? "A convenir"
      : service.priceFrom
      ? `${formatARS(Number(service.priceFrom))} ${PRICE_UNIT_LABEL[service.priceUnit] ?? ""}`
      : "Sin precio";

  return (
    <div className={cn(
      "rounded-xl border border-border bg-card transition-shadow",
      !isActive && "opacity-60",
    )}>
      {/* Header row */}
      <div className="flex items-center gap-3 p-4">
        {/* Toggle activo */}
        <button
          aria-checked={isActive}
          aria-label={isActive ? "Desactivar servicio" : "Activar servicio"}
          className={cn(
            "relative h-5 w-9 shrink-0 rounded-full transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-1",
            isActive ? "bg-brand-600" : "bg-muted-foreground/30",
            togglePending && "cursor-wait opacity-50",
          )}
          disabled={togglePending}
          onClick={handleToggleActive}
          role="switch"
          type="button"
        >
          <span className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
            isActive ? "left-4" : "left-0.5",
          )} />
        </button>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{service.title}</p>
          <p className="text-xs text-muted-foreground">
            {service.categoryName} · {priceLabel}
          </p>
        </div>

        {/* Acciones */}
        <div className="flex shrink-0 items-center gap-1">
          <button
            aria-label="Editar servicio"
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
            onClick={handleToggleEdit}
            type="button"
          >
            {isExpanded
              ? <ChevronUp aria-hidden="true" className="h-4 w-4" />
              : <Pencil aria-hidden="true" className="h-4 w-4" />}
          </button>

          {!confirmDelete ? (
            <button
              aria-label="Eliminar servicio"
              className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
              onClick={() => setConfirmDelete(true)}
              type="button"
            >
              <Trash2 aria-hidden="true" className="h-4 w-4" />
            </button>
          ) : (
            <div className="flex items-center gap-1 rounded-lg bg-destructive/10 px-2 py-1">
              <span className="text-xs text-destructive">¿Eliminar?</span>
              <button
                className="rounded px-1.5 py-0.5 text-xs font-medium text-destructive hover:bg-destructive hover:text-white disabled:opacity-50"
                disabled={deletePending}
                onClick={handleDelete}
                type="button"
              >
                Sí
              </button>
              <button
                className="rounded px-1.5 py-0.5 text-xs font-medium text-muted-foreground hover:bg-muted"
                onClick={() => setConfirmDelete(false)}
                type="button"
              >
                No
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Inline edit form */}
      {isExpanded && (
        <div className="border-t border-border px-4 pb-4 pt-4" ref={formRef}>
          <ServiceForm
            categories={categories}
            initialValues={{
              serviceId: service.id,
              categoryId: service.categoryId,
              title: service.title,
              priceUnit: service.priceUnit,
              priceFrom: service.priceFrom ?? "",
            }}
            onCancel={() => setIsExpanded(false)}
            onSuccess={() => setIsExpanded(false)}
          />
        </div>
      )}
    </div>
  );
}
