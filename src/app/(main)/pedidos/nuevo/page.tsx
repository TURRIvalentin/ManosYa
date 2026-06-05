import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, BadgeCheck } from "lucide-react";
import Link from "next/link";

import { NewRequestForm } from "@/components/requests/NewRequestForm";
import { getCurrentUser, hasClientOnboarded } from "@/lib/session";
import { getNewRequestFormData } from "@/server/queries/new-request";

export const metadata: Metadata = { title: "Nuevo pedido" };
export const dynamic = "force-dynamic";

type NewRequestPageProps = {
  searchParams: Promise<{
    providerId?: string;
  }>;
};

function getCallbackUrl(providerId?: string) {
  const params = new URLSearchParams();
  if (providerId) params.set("providerId", providerId);
  const query = params.toString();
  return query ? `/pedidos/nuevo?${query}` : "/pedidos/nuevo";
}

export default async function NewRequestPage({ searchParams }: NewRequestPageProps) {
  const { providerId } = await searchParams;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(getCallbackUrl(providerId))}`);
  }

  const clientReady = await hasClientOnboarded(user.id);
  if (!clientReady) redirect("/onboarding");
  if (!providerId) notFound();

  const { provider } = await getNewRequestFormData(providerId);

  if (!provider) notFound();

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-5 md:px-6 md:py-8">
      <Link
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        href={`/prestadores/${provider.id}`}
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        Volver al prestador
      </Link>

      <section className="mt-4 rounded-lg border border-border bg-card p-4 md:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-brand-600">Pedido dirigido</p>
            <h1 className="mt-1 text-2xl font-bold text-foreground md:text-3xl">
              Pedir presupuesto
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Le vamos a enviar tu pedido a {provider.name ?? "este prestador"} para que pueda
              responderte con una propuesta.
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
            <BadgeCheck aria-hidden="true" className="h-3.5 w-3.5" />
            Dirigido
          </span>
        </div>

        <div className="mt-4 rounded-lg bg-muted px-3 py-2">
          <p className="text-sm font-semibold text-foreground">{provider.name ?? "Prestador"}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {provider.services.length} servicio{provider.services.length === 1 ? "" : "s"} activo
            {provider.services.length === 1 ? "" : "s"} en {provider.zones.length} zona
            {provider.zones.length === 1 ? "" : "s"}
          </p>
        </div>

        <NewRequestForm provider={provider} />
      </section>
    </div>
  );
}
