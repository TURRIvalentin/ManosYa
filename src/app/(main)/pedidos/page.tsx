import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarClock, CheckCircle2, Inbox, MapPin, Send } from "lucide-react";

import { hasCompletedOnboarding, requireVerifiedEmail } from "@/lib/session";
import { formatDate } from "@/lib/utils";
import { getUserRequests, type RequestListItem } from "@/server/queries/requests";

export const metadata: Metadata = { title: "Mis pedidos" };

type PedidosPageProps = {
  searchParams: Promise<{
    created?: string;
  }>;
};

const STATUS_LABELS: Record<RequestListItem["status"], string> = {
  CANCELLED: "Cancelado",
  COMPLETED: "Completado",
  EXPIRED: "Vencido",
  HIRED: "Contratado",
  IN_PROGRESS: "En curso",
  OPEN: "Abierto",
  QUOTED: "Con presupuesto",
};

function RequestCard({
  item,
  mode,
}: {
  item: RequestListItem;
  mode: "client" | "provider";
}) {
  const counterpart =
    mode === "client"
      ? item.provider?.name ?? "Prestador"
      : item.client.name ?? "Cliente";

  return (
    <article className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="line-clamp-2 text-base font-semibold text-foreground">{item.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{counterpart}</p>
        </div>
        <span className="shrink-0 rounded-md bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700">
          {STATUS_LABELS[item.status]}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-2 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Inbox aria-hidden="true" className="h-4 w-4" />
          {item.category.name}
        </span>
        <span className="inline-flex items-center gap-1">
          <MapPin aria-hidden="true" className="h-4 w-4" />
          {item.zone.name}
        </span>
        <span className="inline-flex items-center gap-1">
          <CalendarClock aria-hidden="true" className="h-4 w-4" />
          {formatDate(item.createdAt)}
        </span>
      </div>

      <div className="mt-4 flex justify-stretch md:justify-end">
        <Link
          className="btn-tap inline-flex w-full items-center justify-center rounded-lg border border-border px-4 text-sm font-semibold text-foreground transition hover:bg-muted md:w-auto"
          href={`/pedidos/${item.id}`}
        >
          Ver detalle
        </Link>
      </div>
    </article>
  );
}

function RequestSection({
  emptyText,
  items,
  mode,
  title,
}: {
  emptyText: string;
  items: RequestListItem[];
  mode: "client" | "provider";
  title: string;
}) {
  return (
    <section className="mt-5">
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">
          {items.length} pedido{items.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="mt-3 grid gap-3">
        {items.length > 0 ? (
          items.map((item) => <RequestCard item={item} key={item.id} mode={mode} />)
        ) : (
          <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Inbox aria-hidden="true" className="h-6 w-6" />
            </div>
            <p className="mt-4 text-sm font-medium text-foreground">{emptyText}</p>
          </div>
        )}
      </div>
    </section>
  );
}

export default async function PedidosPage({ searchParams }: PedidosPageProps) {
  const [{ created }, user] = await Promise.all([searchParams, requireVerifiedEmail()]);
  const done = await hasCompletedOnboarding(user.id);
  if (!done) redirect("/onboarding");

  const {
    canCreateRequests,
    canReceiveRequests,
    createdRequestVisible,
    myRequests,
    receivedRequests,
  } = await getUserRequests(user.id, {
    createdId: created,
  });
  const hasBothGroups = canCreateRequests && canReceiveRequests;

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 pb-28 pt-5 md:px-6 md:pb-8 md:pt-8">
      <div>
        <p className="text-sm font-medium text-brand-600">Pedidos</p>
        <h1 className="mt-1 text-2xl font-bold text-foreground md:text-3xl">
          Tus pedidos y solicitudes
        </h1>
      </div>

      {createdRequestVisible && (
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
          <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Pedido enviado correctamente</p>
            <p className="mt-1 text-sm">Ya quedo registrado en tu listado.</p>
          </div>
        </div>
      )}

      {hasBothGroups ? (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          <a
            className="shrink-0 rounded-md bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700"
            href="#mis-pedidos"
          >
            Mis pedidos
          </a>
          <a
            className="shrink-0 rounded-md bg-muted px-3 py-1.5 text-sm font-medium text-foreground"
            href="#solicitudes-recibidas"
          >
            Solicitudes recibidas
          </a>
        </div>
      ) : null}

      {canCreateRequests && (
        <div id="mis-pedidos">
          <RequestSection
            emptyText="Todavia no creaste pedidos."
            items={myRequests}
            mode="client"
            title="Mis pedidos"
          />
        </div>
      )}

      {canReceiveRequests && (
        <div id="solicitudes-recibidas">
          <RequestSection
            emptyText="Todavia no recibiste solicitudes dirigidas."
            items={receivedRequests}
            mode="provider"
            title="Solicitudes recibidas"
          />
        </div>
      )}

      {myRequests.length === 0 && receivedRequests.length === 0 && (
        <div className="mt-5 rounded-lg bg-muted px-4 py-4 text-sm leading-6 text-muted-foreground">
          <div className="flex gap-3">
            <Send aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
            <p>
              Cuando pidas presupuesto a un prestador o recibas una solicitud dirigida, va a
              aparecer aca.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
