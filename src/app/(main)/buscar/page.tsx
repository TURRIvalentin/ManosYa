import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";

import { getProviderSearchFilterOptions } from "@/server/queries/provider-search-filters";
import { searchProviders } from "@/server/queries/provider-search";

import { ActiveFilterChips } from "./ActiveFilterChips";
import { PaginationControls } from "./PaginationControls";
import { ProviderCard } from "./ProviderCard";
import { SearchFilters } from "./SearchFilters";
import { hasActiveFilters, parseBuscarSearchParams, type BuscarSearchParams } from "./search-params";

export const metadata: Metadata = { title: "Buscar servicios" };

type BuscarPageProps = {
  searchParams: Promise<BuscarSearchParams>;
};

function EmptyState({ showClear }: { showClear: boolean }) {
  return (
    <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Search aria-hidden="true" className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-base font-semibold text-foreground">
        No encontramos prestadores con esos filtros
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        Proba con otra categoria, zona o una busqueda mas general.
      </p>
      {showClear && (
        <Link
          className="btn-tap mt-5 inline-flex items-center justify-center rounded-lg border border-border px-4 text-sm font-semibold text-foreground"
          href="/buscar"
        >
          Limpiar filtros
        </Link>
      )}
    </div>
  );
}

export default async function BuscarPage({ searchParams }: BuscarPageProps) {
  const params = await searchParams;
  const input = parseBuscarSearchParams(params);

  const [{ categories, zones }, results] = await Promise.all([
    getProviderSearchFilterOptions(),
    searchProviders(input),
  ]);

  const currentPage = results.page;
  const activeCategory = categories.find((category) => category.slug === input.categorySlug);
  const activeZone = zones.find((zone) => zone.slug === input.zoneSlug);
  const hasFilters = hasActiveFilters(input);

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-4 md:px-6 md:py-8">
      <SearchFilters categories={categories} input={input} zones={zones} />

      <ActiveFilterChips activeCategory={activeCategory} activeZone={activeZone} input={input} />

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {results.items.length > 0
            ? `${results.items.length} resultado${results.items.length === 1 ? "" : "s"}`
            : "Sin resultados"}
        </p>
        {currentPage > 1 && (
          <p className="text-sm text-muted-foreground">Pagina {currentPage}</p>
        )}
      </div>

      <div className="mt-3 grid gap-3">
        {results.items.length > 0 ? (
          results.items.map((provider) => <ProviderCard key={provider.id} provider={provider} />)
        ) : (
          <EmptyState showClear={hasFilters} />
        )}
      </div>

      <PaginationControls currentPage={currentPage} hasMore={results.hasMore} input={input} />
    </div>
  );
}
