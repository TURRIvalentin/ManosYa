import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, Inbox, MapPin, MessageSquareText, UserRound } from "lucide-react";

import { requireVerifiedEmail } from "@/lib/session";
import { formatDate } from "@/lib/utils";
import {
  getRequestDetailForUser,
  type RequestDetail,
} from "@/server/queries/request-detail";

export const metadata: Metadata = { title: "Detalle del pedido" };

type RequestDetailPageProps = {
  params: Promise<{ id: string }>;
};

const STATUS_LABELS: Record<RequestDetail["status"], string> = {
  CANCELLED: "Cancelado",
  COMPLETED: "Completado",
  EXPIRED: "Vencido",
  HIRED: "Contratado",
  IN_PROGRESS: "En curso",
  OPEN: "Abierto",
  QUOTED: "Con presupuesto",
};

function Counterpart({ request }: { request: RequestDetail }) {
  const label = request.viewerRole === "provider" ? "Cliente" : "Prestador";
  const name =
    request.viewerRole === "provider"
      ? request.client.name ?? "Cliente"
      : request.provider?.name ?? "Prestador";

  return (
    <section className="mt-5 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <UserRound aria-hidden="true" className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-medium text-brand-600">{label}</p>
          <p className="text-base font-semibold text-foreground">{name}</p>
        </div>
      </div>
    </section>
  );
}

export default async function RequestDetailPage({ params }: RequestDetailPageProps) {
  const [{ id }, user] = await Promise.all([params, requireVerifiedEmail()]);
  const request = await getRequestDetailForUser(id, user.id);

  if (!request) notFound();

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 pb-28 pt-5 md:px-6 md:pb-8 md:pt-8">
      <Link
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        href="/pedidos"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        Volver a pedidos
      </Link>

      <section className="mt-4 rounded-lg border border-border bg-card p-4 md:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-brand-600">Pedido</p>
            <h1 className="mt-1 text-2xl font-bold text-foreground md:text-3xl">
              {request.title}
            </h1>
          </div>
          <span className="shrink-0 rounded-md bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700">
            {STATUS_LABELS[request.status]}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Inbox aria-hidden="true" className="h-4 w-4" />
            {request.category.name}
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin aria-hidden="true" className="h-4 w-4" />
            {request.zone.name}
          </span>
          <span className="inline-flex items-center gap-1">
            <CalendarClock aria-hidden="true" className="h-4 w-4" />
            {formatDate(request.createdAt)}
          </span>
        </div>

        <div className="mt-5 border-t border-border pt-5">
          <h2 className="text-sm font-semibold text-foreground">Descripcion</h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">
            {request.description}
          </p>
        </div>

        <div className="mt-5 rounded-lg bg-muted px-3 py-3 text-sm text-muted-foreground">
          <p>
            Servicio:{" "}
            <span className="font-medium text-foreground">
              {request.service?.title ?? request.category.name}
            </span>
          </p>
          <p className="mt-1">
            Zona: <span className="font-medium text-foreground">{request.zone.name}</span>
          </p>
        </div>
      </section>

      <Counterpart request={request} />

      <section className="mt-5 rounded-lg bg-muted px-4 py-4 text-sm leading-6 text-muted-foreground">
        <div className="flex gap-3">
          <MessageSquareText aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
          <p>El chat y los presupuestos se agregan en la próxima fase.</p>
        </div>
      </section>
    </div>
  );
}
