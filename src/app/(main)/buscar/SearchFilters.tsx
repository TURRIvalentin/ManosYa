import Link from "next/link";
import { Filter, Search } from "lucide-react";

import type { ProviderSearchFilterOptions } from "@/server/queries/provider-search-filters";

import type { BuscarSearchInput } from "./search-params";

type FilterOption = ProviderSearchFilterOptions["categories"][number];

function SearchField({ defaultValue }: { defaultValue?: string }) {
  return (
    <div className="relative">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
      />
      <input
        className="h-11 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none ring-brand-600 transition focus:ring-2"
        defaultValue={defaultValue ?? ""}
        id="q"
        name="q"
        placeholder="Plomeria, gasista, pintura..."
        type="search"
      />
    </div>
  );
}

function CategorySelect({
  categories,
  defaultValue,
}: {
  categories: FilterOption[];
  defaultValue?: string;
}) {
  return (
    <select
      className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none ring-brand-600 transition focus:ring-2"
      defaultValue={defaultValue ?? ""}
      id="categorySlug"
      name="categorySlug"
    >
      <option value="">Categoria</option>
      {categories.map((category) => (
        <option key={category.slug} value={category.slug}>
          {category.name}
        </option>
      ))}
    </select>
  );
}

function ZoneSelect({
  defaultValue,
  zones,
}: {
  defaultValue?: string;
  zones: ProviderSearchFilterOptions["zones"];
}) {
  return (
    <select
      className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none ring-brand-600 transition focus:ring-2"
      defaultValue={defaultValue ?? ""}
      id="zoneSlug"
      name="zoneSlug"
    >
      <option value="">Zona</option>
      {zones.map((zone) => (
        <option key={zone.slug} value={zone.slug}>
          {zone.name}
        </option>
      ))}
    </select>
  );
}

function AdvancedFilterFields({
  categories,
  input,
  zones,
}: {
  categories: FilterOption[];
  input: BuscarSearchInput;
  zones: ProviderSearchFilterOptions["zones"];
}) {
  return (
    <>
      <label className="sr-only" htmlFor="categorySlug">
        Categoria
      </label>
      <CategorySelect categories={categories} defaultValue={input.categorySlug} />

      <label className="sr-only" htmlFor="zoneSlug">
        Zona
      </label>
      <ZoneSelect defaultValue={input.zoneSlug} zones={zones} />

      <label className="sr-only" htmlFor="minRating">
        Rating minimo
      </label>
      <select
        className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none ring-brand-600 transition focus:ring-2"
        defaultValue={input.minRating ?? ""}
        id="minRating"
        name="minRating"
      >
        <option value="">Rating</option>
        <option value="3">3+ estrellas</option>
        <option value="4">4+ estrellas</option>
        <option value="4.5">4.5+ estrellas</option>
      </select>

      <div className="grid grid-cols-2 gap-2">
        <label className="sr-only" htmlFor="priceMin">
          Precio minimo
        </label>
        <input
          className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none ring-brand-600 transition focus:ring-2"
          defaultValue={input.priceMin ?? ""}
          id="priceMin"
          inputMode="numeric"
          min="0"
          name="priceMin"
          placeholder="Precio min."
          type="number"
        />
        <label className="sr-only" htmlFor="priceMax">
          Precio maximo
        </label>
        <input
          className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none ring-brand-600 transition focus:ring-2"
          defaultValue={input.priceMax ?? ""}
          id="priceMax"
          inputMode="numeric"
          min="0"
          name="priceMax"
          placeholder="Precio max."
          type="number"
        />
      </div>

      <label className="flex h-11 items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm font-medium text-foreground">
        <input
          className="h-4 w-4 rounded border-input text-brand-600 focus:ring-brand-600"
          defaultChecked={input.verified === true}
          name="verified"
          type="checkbox"
          value="true"
        />
        Solo verificados
      </label>
    </>
  );
}

export function SearchFilters({
  categories,
  input,
  zones,
}: {
  categories: FilterOption[];
  input: BuscarSearchInput;
  zones: ProviderSearchFilterOptions["zones"];
}) {
  return (
    <div className="sticky top-0 z-20 -mx-4 border-b border-border bg-background/95 px-4 pb-4 pt-3 backdrop-blur md:top-14 md:mx-0 md:rounded-b-lg md:border-x md:px-5">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-brand-600">Buscar servicios</p>
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">
          Encontra prestadores en CABA y GBA
        </h1>
      </div>

      <form action="/buscar" className="mt-4 grid gap-3 md:hidden">
        <label className="sr-only" htmlFor="q">
          Buscar
        </label>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <SearchField defaultValue={input.q} />
          <button className="btn-tap inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700">
            <Search aria-hidden="true" className="h-4 w-4" />
            <span className="sr-only">Buscar</span>
          </button>
        </div>
      </form>

      <details className="mt-3 md:hidden">
        <summary className="btn-tap inline-flex w-full list-none items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold text-foreground">
          <Filter aria-hidden="true" className="h-4 w-4" />
          Filtros
        </summary>
        <form action="/buscar" className="mt-3 grid gap-3 rounded-lg border border-border p-3">
          {input.q && <input name="q" type="hidden" value={input.q} />}
          <AdvancedFilterFields categories={categories} input={input} zones={zones} />
          <div className="grid grid-cols-2 gap-2">
            <Link
              className="btn-tap inline-flex items-center justify-center rounded-lg border border-border px-4 text-sm font-semibold text-foreground"
              href="/buscar"
            >
              Limpiar filtros
            </Link>
            <button className="btn-tap inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white">
              Aplicar
            </button>
          </div>
        </form>
      </details>

      <form
        action="/buscar"
        className="mt-4 hidden gap-3 md:grid md:grid-cols-4 xl:grid-cols-[minmax(220px,1fr)_150px_150px_130px_170px_150px_auto]"
      >
        <label className="sr-only" htmlFor="qDesktop">
          Buscar
        </label>
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            className="h-11 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none ring-brand-600 transition focus:ring-2"
            defaultValue={input.q ?? ""}
            id="qDesktop"
            name="q"
            placeholder="Plomeria, gasista, pintura..."
            type="search"
          />
        </div>
        <CategorySelect categories={categories} defaultValue={input.categorySlug} />
        <ZoneSelect defaultValue={input.zoneSlug} zones={zones} />
        <select
          className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none ring-brand-600 transition focus:ring-2"
          defaultValue={input.minRating ?? ""}
          name="minRating"
        >
          <option value="">Rating</option>
          <option value="3">3+</option>
          <option value="4">4+</option>
          <option value="4.5">4.5+</option>
        </select>
        <div className="grid grid-cols-2 gap-2">
          <input
            className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none ring-brand-600 transition focus:ring-2"
            defaultValue={input.priceMin ?? ""}
            inputMode="numeric"
            min="0"
            name="priceMin"
            placeholder="Min."
            type="number"
          />
          <input
            className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none ring-brand-600 transition focus:ring-2"
            defaultValue={input.priceMax ?? ""}
            inputMode="numeric"
            min="0"
            name="priceMax"
            placeholder="Max."
            type="number"
          />
        </div>
        <label className="flex h-11 items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm font-medium text-foreground">
          <input
            className="h-4 w-4 rounded border-input text-brand-600 focus:ring-brand-600"
            defaultChecked={input.verified === true}
            name="verified"
            type="checkbox"
            value="true"
          />
          Verificados
        </label>
        <button className="btn-tap inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700">
          <Search aria-hidden="true" className="h-4 w-4" />
          Buscar
        </button>
      </form>
    </div>
  );
}
