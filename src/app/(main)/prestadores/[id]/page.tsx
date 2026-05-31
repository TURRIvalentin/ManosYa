import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BadgeCheck, CalendarClock, MapPin, Star } from "lucide-react";

import { formatARS, formatDate } from "@/lib/utils";
import {
  getPublicProviderProfile,
  type PublicProviderProfile,
} from "@/server/queries/provider-profile";

type ProviderPageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = { title: "Prestador" };

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getPriceLabel(service: PublicProviderProfile["services"][number]): string {
  if (service.priceUnit === "A_CONVENIR" || !service.priceFrom) return "A convenir";

  const from = formatARS(Number(service.priceFrom));
  if (!service.priceTo || service.priceTo === service.priceFrom) return `Desde ${from}`;

  return `${from} - ${formatARS(Number(service.priceTo))}`;
}

function ServiceCard({ service }: { service: PublicProviderProfile["services"][number] }) {
  return (
    <article className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase text-brand-600">
            {service.category.name}
          </p>
          <h2 className="mt-1 text-base font-semibold text-foreground">{service.title}</h2>
        </div>
        <p className="shrink-0 text-right text-sm font-semibold text-foreground">
          {getPriceLabel(service)}
        </p>
      </div>

      {service.description && (
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{service.description}</p>
      )}

      {service.priceUpdatedAt && (
        <p className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
          <CalendarClock aria-hidden="true" className="h-3.5 w-3.5" />
          Precio actualizado el {formatDate(service.priceUpdatedAt)}
        </p>
      )}
    </article>
  );
}

export default async function ProviderPage({ params }: ProviderPageProps) {
  const { id } = await params;
  const provider = await getPublicProviderProfile(id);

  if (!provider) notFound();

  const initials = getInitials(provider.name);
  const ratingLabel =
    provider.ratingCount > 0
      ? `${provider.ratingAvg.toFixed(1)} (${provider.ratingCount} reseñas)`
      : "Sin reseñas todavía";

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-5 md:px-6 md:py-8">
      <section className="rounded-lg border border-border bg-card p-4 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex gap-4">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-brand-600/10 md:h-24 md:w-24">
              {provider.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={provider.name ?? "Prestador"}
                  className="h-full w-full object-cover"
                  src={provider.avatarUrl}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xl font-bold text-brand-600">
                  {initials}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground md:text-3xl">
                  {provider.name ?? "Prestador"}
                </h1>
                {provider.isVerified && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                    <BadgeCheck aria-hidden="true" className="h-3.5 w-3.5" />
                    Verificado
                  </span>
                )}
                {provider.isFeatured && (
                  <span className="rounded-md bg-accent-50 px-2 py-1 text-xs font-medium text-accent-700">
                    Destacado
                  </span>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
                <span className="inline-flex items-center gap-1 text-amber-700">
                  <Star aria-hidden="true" className="h-4 w-4 fill-amber-400 text-amber-400" />
                  {ratingLabel}
                </span>
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <MapPin aria-hidden="true" className="h-4 w-4" />
                  {provider.zones.length} zona{provider.zones.length === 1 ? "" : "s"}
                </span>
              </div>
            </div>
          </div>

          <button
            disabled
            className="btn-tap inline-flex w-full cursor-not-allowed items-center justify-center rounded-lg bg-muted px-4 text-sm font-semibold text-muted-foreground md:w-auto md:min-w-[220px]"
            type="button"
          >
            Pedir presupuesto próximamente
          </button>
        </div>

        {provider.bio && (
          <div className="mt-5 border-t border-border pt-5">
            <h2 className="text-sm font-semibold text-foreground">Sobre el prestador</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{provider.bio}</p>
          </div>
        )}
      </section>

      <section className="mt-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-brand-600">Servicios</p>
            <h2 className="text-xl font-bold text-foreground">Trabajos disponibles</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {provider.services.length} activo{provider.services.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="mt-3 grid gap-3">
          {provider.services.length > 0 ? (
            provider.services.map((service) => <ServiceCard key={service.id} service={service} />)
          ) : (
            <div className="rounded-lg border border-dashed border-border p-6 text-center">
              <p className="text-sm font-medium text-foreground">
                Este prestador todavía no publicó servicios.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Volvé a consultar más adelante.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="mt-5">
        <p className="text-sm font-medium text-brand-600">Zonas de trabajo</p>
        <h2 className="text-xl font-bold text-foreground">Dónde atiende</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {provider.zones.map((zone) => (
            <span
              className="rounded-md bg-muted px-3 py-1.5 text-sm font-medium text-foreground"
              key={zone.id}
            >
              {zone.name}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
