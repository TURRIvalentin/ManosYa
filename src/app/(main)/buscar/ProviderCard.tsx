import Link from "next/link";
import { BadgeCheck, MapPin, Star } from "lucide-react";

import { formatARS } from "@/lib/utils";
import type { ProviderSearchResult } from "@/server/queries/provider-search";

function getPriceLabel(service: ProviderSearchResult["primaryService"]): string {
  if (service.priceUnit === "A_CONVENIR" || !service.priceFrom) return "A convenir";

  const from = formatARS(Number(service.priceFrom));
  if (!service.priceTo || service.priceTo === service.priceFrom) return `Desde ${from}`;

  return `${from} - ${formatARS(Number(service.priceTo))}`;
}

export function ProviderCard({ provider }: { provider: ProviderSearchResult }) {
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
                : "Sin resenas"}
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
