import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, ChevronLeft, ChevronRight, MapPin, Search, Star } from "lucide-react";

import { db } from "@/lib/db";
import { formatARS } from "@/lib/utils";
import {
  providerSearchInputSchema,
  searchProviders,
  type ProviderSearchResult,
} from "@/server/queries/provider-search";

export const metadata: Metadata = { title: "Buscar servicios" };

type BuscarPageProps = {
  searchParams: Promise<{
    categorySlug?: string;
    page?: string;
    q?: string;
    zoneSlug?: string;
  }>;
};

const PAGE_SIZE = 10;

function getPriceLabel(service: ProviderSearchResult["primaryService"]): string {
  if (service.priceUnit === "A_CONVENIR" || !service.priceFrom) return "A convenir";

  const from = formatARS(Number(service.priceFrom));
  if (!service.priceTo || service.priceTo === service.priceFrom) return `Desde ${from}`;

  return `${from} - ${formatARS(Number(service.priceTo))}`;
}

function getPageHref(
  params: Awaited<BuscarPageProps["searchParams"]>,
  page: number,
): string {
  const next = new URLSearchParams();

  if (params.q) next.set("q", params.q);
  if (params.categorySlug) next.set("categorySlug", params.categorySlug);
  if (params.zoneSlug) next.set("zoneSlug", params.zoneSlug);
  if (page > 1) next.set("page", String(page));

  const query = next.toString();
  return query ? `/buscar?${query}` : "/buscar";
}

function ProviderCard({ provider }: { provider: ProviderSearchResult }) {
  const initials =
    provider.name
      ?.split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "?";
  const zoneLabel = provider.zones.map((zone) => zone.name).join(", ");

  return (
    <article className="provider-card">
      <div className="flex gap-3">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-brand-600/10">
          {provider.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={provider.name ?? "Prestador"}
              className="h-full w-full object-cover"
              src={provider.avatarUrl}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-bold text-brand-600">
              {initials}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-foreground">
                {provider.name ?? "Prestador"}
              </h2>
              <p className="truncate text-sm text-muted-foreground">
                {provider.primaryService.category.name}
              </p>
            </div>
            {provider.isVerified && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                <BadgeCheck aria-hidden="true" className="h-3.5 w-3.5" />
                Verificado
              </span>
            )}
          </div>

          <p className="mt-3 line-clamp-2 text-sm font-medium text-foreground">
            {provider.primaryService.title}
          </p>

          {provider.bio && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{provider.bio}</p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
            <span className="inline-flex items-center gap-1 text-amber-700">
              <Star aria-hidden="true" className="h-4 w-4 fill-amber-400 text-amber-400" />
              {provider.ratingCount > 0
                ? `${provider.ratingAvg.toFixed(1)} (${provider.ratingCount})`
                : "Sin reseñas"}
            </span>
            {zoneLabel && (
              <span className="inline-flex min-w-0 items-center gap-1 text-muted-foreground">
                <MapPin aria-hidden="true" className="h-4 w-4 shrink-0" />
                <span className="truncate">{zoneLabel}</span>
              </span>
            )}
          </div>

          <div className="mt-3 border-t border-border pt-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-foreground">
                {getPriceLabel(provider.primaryService)}
              </p>
              {provider.isFeatured && (
                <span className="rounded-md bg-accent-50 px-2 py-1 text-xs font-medium text-accent-700">
                  Destacado
                </span>
              )}
            </div>

            <Link
              className="btn-tap mt-3 inline-flex w-full items-center justify-center rounded-lg bg-foreground px-4 text-sm font-semibold text-background transition hover:bg-foreground/90 md:w-auto md:min-w-[144px]"
              href={`/prestadores/${provider.id}`}
            >
              Ver prestador
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Search aria-hidden="true" className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-base font-semibold text-foreground">No encontramos prestadores</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        Probá con otra categoría, zona o una búsqueda más general.
      </p>
    </div>
  );
}

export default async function BuscarPage({ searchParams }: BuscarPageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const parsed = providerSearchInputSchema.safeParse({
    categorySlug: params.categorySlug,
    limit: PAGE_SIZE,
    page,
    q: params.q,
    zoneSlug: params.zoneSlug,
  });
  const input = parsed.success ? parsed.data : { limit: PAGE_SIZE, page: 1 };

  const [categories, zones, results] = await Promise.all([
    db.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { name: true, slug: true },
      where: { isActive: true },
    }),
    db.zone.findMany({
      orderBy: [{ type: "asc" }, { name: "asc" }],
      select: { name: true, slug: true, type: true },
    }),
    searchProviders(input),
  ]);

  const currentPage = results.page;
  const activeCategory = categories.find((category) => category.slug === input.categorySlug);
  const activeZone = zones.find((zone) => zone.slug === input.zoneSlug);

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-4 md:px-6 md:py-8">
      <div className="sticky top-0 z-20 -mx-4 border-b border-border bg-background/95 px-4 pb-4 pt-3 backdrop-blur md:top-14 md:mx-0 md:rounded-b-lg md:border-x md:px-5">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-brand-600">Buscar servicios</p>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">
            Encontrá prestadores en CABA y GBA
          </h1>
        </div>

        <form action="/buscar" className="mt-4 grid gap-3 md:grid-cols-[1fr_180px_180px_auto]">
          <label className="sr-only" htmlFor="q">
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
              id="q"
              name="q"
              placeholder="Plomería, gasista, pintura..."
              type="search"
            />
          </div>

          <label className="sr-only" htmlFor="categorySlug">
            Categoría
          </label>
          <select
            className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none ring-brand-600 transition focus:ring-2"
            defaultValue={input.categorySlug ?? ""}
            id="categorySlug"
            name="categorySlug"
          >
            <option value="">Categoría</option>
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>

          <label className="sr-only" htmlFor="zoneSlug">
            Zona
          </label>
          <select
            className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none ring-brand-600 transition focus:ring-2"
            defaultValue={input.zoneSlug ?? ""}
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

          <button className="btn-tap inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700">
            <Search aria-hidden="true" className="h-4 w-4" />
            Buscar
          </button>
        </form>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {input.q && (
          <span className="shrink-0 rounded-md bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700">
            {input.q}
          </span>
        )}
        {activeCategory && (
          <span className="shrink-0 rounded-md bg-muted px-3 py-1.5 text-sm font-medium text-foreground">
            {activeCategory.name}
          </span>
        )}
        {activeZone && (
          <span className="shrink-0 rounded-md bg-muted px-3 py-1.5 text-sm font-medium text-foreground">
            {activeZone.name}
          </span>
        )}
        {!input.q && !activeCategory && !activeZone && (
          <span className="shrink-0 rounded-md bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground">
            Todos los prestadores
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {results.items.length > 0
            ? `${results.items.length} resultado${results.items.length === 1 ? "" : "s"}`
            : "Sin resultados"}
        </p>
        {currentPage > 1 && (
          <p className="text-sm text-muted-foreground">Página {currentPage}</p>
        )}
      </div>

      <div className="mt-3 grid gap-3">
        {results.items.length > 0 ? (
          results.items.map((provider) => <ProviderCard key={provider.id} provider={provider} />)
        ) : (
          <EmptyState />
        )}
      </div>

      {(currentPage > 1 || results.hasMore) && (
        <nav aria-label="Paginación" className="mt-5 flex items-center justify-between gap-3">
          {currentPage > 1 ? (
            <Link
              className="btn-tap inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-medium text-foreground"
              href={getPageHref(params, currentPage - 1)}
            >
              <ChevronLeft aria-hidden="true" className="h-4 w-4" />
              Anterior
            </Link>
          ) : (
            <span />
          )}
          {results.hasMore && (
            <Link
              className="btn-tap inline-flex items-center justify-center gap-2 rounded-lg bg-foreground px-4 text-sm font-medium text-background"
              href={getPageHref(params, currentPage + 1)}
            >
              Siguiente
              <ChevronRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
