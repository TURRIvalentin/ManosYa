import Link from "next/link";
import { X } from "lucide-react";

import { formatARS } from "@/lib/utils";
import type { ProviderSearchFilterOptions } from "@/server/queries/provider-search-filters";

import {
  getBuscarHref,
  getFilterHref,
  hasActiveFilters,
  type BuscarSearchInput,
} from "./search-params";

type FilterOption = ProviderSearchFilterOptions["categories"][number];

function getRatingLabel(value: number): string {
  return `${value.toLocaleString("es-AR", { maximumFractionDigits: 1 })}+ estrellas`;
}

function getPriceRangeLabel(priceMin?: number, priceMax?: number): string | null {
  if (priceMin === undefined && priceMax === undefined) return null;
  if (priceMin !== undefined && priceMax !== undefined) {
    return `${formatARS(priceMin)} - ${formatARS(priceMax)}`;
  }
  if (priceMin !== undefined) return `Desde ${formatARS(priceMin)}`;
  return `Hasta ${formatARS(priceMax ?? 0)}`;
}

export function ActiveFilterChips({
  activeCategory,
  activeZone,
  input,
}: {
  activeCategory?: FilterOption;
  activeZone?: ProviderSearchFilterOptions["zones"][number];
  input: BuscarSearchInput;
}) {
  const priceRange = getPriceRangeLabel(input.priceMin, input.priceMax);
  const hasFilters = hasActiveFilters(input);

  return (
    <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
      {input.q && (
        <Link
          className="inline-flex shrink-0 items-center gap-2 rounded-md bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700"
          href={getFilterHref(input, "q", undefined)}
        >
          {input.q}
          <X aria-hidden="true" className="h-3.5 w-3.5" />
        </Link>
      )}
      {activeCategory && (
        <Link
          className="inline-flex shrink-0 items-center gap-2 rounded-md bg-muted px-3 py-1.5 text-sm font-medium text-foreground"
          href={getFilterHref(input, "categorySlug", undefined)}
        >
          {activeCategory.name}
          <X aria-hidden="true" className="h-3.5 w-3.5" />
        </Link>
      )}
      {activeZone && (
        <Link
          className="inline-flex shrink-0 items-center gap-2 rounded-md bg-muted px-3 py-1.5 text-sm font-medium text-foreground"
          href={getFilterHref(input, "zoneSlug", undefined)}
        >
          {activeZone.name}
          <X aria-hidden="true" className="h-3.5 w-3.5" />
        </Link>
      )}
      {input.minRating !== undefined && (
        <Link
          className="inline-flex shrink-0 items-center gap-2 rounded-md bg-muted px-3 py-1.5 text-sm font-medium text-foreground"
          href={getFilterHref(input, "minRating", undefined)}
        >
          {getRatingLabel(input.minRating)}
          <X aria-hidden="true" className="h-3.5 w-3.5" />
        </Link>
      )}
      {input.verified && (
        <Link
          className="inline-flex shrink-0 items-center gap-2 rounded-md bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700"
          href={getFilterHref(input, "verified", undefined)}
        >
          Verificados
          <X aria-hidden="true" className="h-3.5 w-3.5" />
        </Link>
      )}
      {priceRange && (
        <Link
          className="inline-flex shrink-0 items-center gap-2 rounded-md bg-muted px-3 py-1.5 text-sm font-medium text-foreground"
          href={getBuscarHref(input, { page: 1, priceMax: undefined, priceMin: undefined })}
        >
          {priceRange}
          <X aria-hidden="true" className="h-3.5 w-3.5" />
        </Link>
      )}
      {!hasFilters && (
        <span className="shrink-0 rounded-md bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground">
          Todos los prestadores
        </span>
      )}
      {hasFilters && (
        <Link
          className="inline-flex shrink-0 items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground"
          href="/buscar"
        >
          Limpiar filtros
        </Link>
      )}
    </div>
  );
}
