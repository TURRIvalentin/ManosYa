"use client";

import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import { ServiceCard } from "@/components/profile/ServiceCard";
import { ServiceForm } from "@/components/profile/ServiceForm";

interface Service {
  id: string;
  title: string;
  categoryId: string;
  categoryName: string;
  priceUnit: string;
  priceFrom: string | null;
  isActive: boolean;
}

interface ServicesSectionProps {
  services: Service[];
  categories: { id: string; name: string }[];
}

export function ServicesSection({ services, categories }: ServicesSectionProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const addFormRef = useRef<HTMLDivElement>(null);

  function handleToggleAdd() {
    const next = !showAddForm;
    setShowAddForm(next);
    if (next) {
      setTimeout(() => {
        addFormRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 50);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {services.length === 0 && !showAddForm && (
        <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
          Todavía no tenés servicios. Agregá el primero.
        </p>
      )}

      {services.map((service) => (
        <ServiceCard
          categories={categories}
          key={service.id}
          service={service}
        />
      ))}

      {/* Add form inline */}
      {showAddForm && (
        <div
          className="rounded-xl border border-border bg-card p-4"
          ref={addFormRef}
        >
          <p className="mb-4 text-sm font-semibold text-foreground">Nuevo servicio</p>
          <ServiceForm
            categories={categories}
            onCancel={() => setShowAddForm(false)}
            onSuccess={() => setShowAddForm(false)}
          />
        </div>
      )}

      {!showAddForm && (
        <button
          className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-brand-600/40 py-3 text-sm font-medium text-brand-600 transition-colors hover:border-brand-600 hover:bg-brand-600/5"
          onClick={handleToggleAdd}
          type="button"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Agregar servicio
        </button>
      )}
    </div>
  );
}
