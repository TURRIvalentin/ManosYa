import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Inbox,
  MapPin,
  MessageSquareText,
  ReceiptText,
  Star,
  UserRound,
} from "lucide-react";

import { QuoteDecisionActions } from "@/components/requests/QuoteDecisionActions";
import { QuoteForm } from "@/components/requests/QuoteForm";
import { RequestStatusActions } from "@/components/requests/RequestStatusActions";
import { ReviewForm } from "@/components/requests/ReviewForm";
import { requireVerifiedEmail } from "@/lib/session";
import { formatARS, formatDate } from "@/lib/utils";
import {
  getRequestDetailForUser,
  type RequestDetail,
} from "@/server/queries/request-detail";

export const metadata: Metadata = { title: "Detalle del pedido" };
export const dynamic = "force-dynamic";

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

const QUOTE_STATUS_LABELS: Record<RequestDetail["quotes"][number]["status"], string> = {
  ACCEPTED: "Aceptado",
  EXPIRED: "Vencido",
  PENDING: "Pendiente",
  REJECTED: "Rechazado",
  WITHDRAWN: "Retirado",
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

function QuoteList({
  canDecide,
  hasAcceptedQuote,
  quotes,
  requestStatus,
}: {
  canDecide: boolean;
  hasAcceptedQuote: boolean;
  quotes: RequestDetail["quotes"];
  requestStatus: RequestDetail["status"];
}) {
  if (quotes.length === 0) return null;

  return (
    <section className="mt-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-brand-600">Presupuestos</p>
          <h2 className="text-xl font-bold text-foreground">Recibidos</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {quotes.length} presupuesto{quotes.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="mt-3 grid gap-3">
        {quotes.map((quote) => (
          <article className="rounded-lg border border-border bg-card p-4" key={quote.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-bold text-foreground">
                  {formatARS(Number(quote.price))}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {quote.provider.name ?? "Prestador"}
                </p>
              </div>
              <span className="shrink-0 rounded-md bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700">
                {QUOTE_STATUS_LABELS[quote.status]}
              </span>
            </div>

            {quote.comment && (
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-muted-foreground">
                {quote.comment}
              </p>
            )}

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
              {quote.estimatedDays && (
                <span className="inline-flex items-center gap-1">
                  <ReceiptText aria-hidden="true" className="h-4 w-4" />
                  {quote.estimatedDays} día{quote.estimatedDays === 1 ? "" : "s"} estimado
                  {quote.estimatedDays === 1 ? "" : "s"}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <CalendarClock aria-hidden="true" className="h-4 w-4" />
                {formatDate(quote.createdAt)}
              </span>
            </div>

            {canDecide &&
              !hasAcceptedQuote &&
              requestStatus === "OPEN" &&
              quote.status === "PENDING" && <QuoteDecisionActions quoteId={quote.id} />}
          </article>
        ))}
      </div>
    </section>
  );
}

function ReviewCard({
  comment,
  createdAt,
  label,
  rating,
  reviewerName,
}: {
  comment: string | null;
  createdAt: string | null;
  label: string;
  rating: number | null;
  reviewerName: string | null;
}) {
  if (!rating || !createdAt) return null;

  return (
    <article className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-brand-600">{label}</p>
          <p className="mt-1 text-base font-semibold text-foreground">
            {reviewerName ?? "Usuario"}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-sm font-semibold text-amber-700">
          <Star aria-hidden="true" className="h-4 w-4 fill-current" />
          {rating}/5
        </span>
      </div>
      {comment && (
        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-muted-foreground">
          {comment}
        </p>
      )}
      <p className="mt-3 text-xs text-muted-foreground">{formatDate(createdAt)}</p>
    </article>
  );
}

function ReviewSection({ request }: { request: RequestDetail }) {
  if (request.status !== "COMPLETED") return null;

  const clientReview = request.review?.client ?? null;
  const providerReview = request.review?.provider ?? null;
  const viewerAlreadyReviewed =
    request.viewerRole === "client"
      ? Boolean(clientReview?.createdAt)
      : request.viewerRole === "provider"
        ? Boolean(providerReview?.createdAt)
        : true;

  return (
    <section className="mt-5">
      <div>
        <p className="text-sm font-medium text-brand-600">Reseñas</p>
        <h2 className="text-xl font-bold text-foreground">Experiencia del trabajo</h2>
      </div>

      {!viewerAlreadyReviewed && <ReviewForm requestId={request.id} />}

      <div className="mt-4 grid gap-3">
        <ReviewCard
          comment={clientReview?.comment ?? null}
          createdAt={clientReview?.createdAt ?? null}
          label="Cliente sobre prestador"
          rating={clientReview?.rating ?? null}
          reviewerName={clientReview?.reviewerName ?? null}
        />
        <ReviewCard
          comment={providerReview?.comment ?? null}
          createdAt={providerReview?.createdAt ?? null}
          label="Prestador sobre cliente"
          rating={providerReview?.rating ?? null}
          reviewerName={providerReview?.reviewerName ?? null}
        />
      </div>
    </section>
  );
}

export default async function RequestDetailPage({ params }: RequestDetailPageProps) {
  const [{ id }, user] = await Promise.all([params, requireVerifiedEmail()]);
  const request = await getRequestDetailForUser(id, user.id);

  if (!request) notFound();
  const hasAcceptedQuote = request.quotes.some((quote) => quote.status === "ACCEPTED");
  const isCancelable = request.status === "OPEN" || request.status === "HIRED";
  const canComplete = request.viewerRole === "client" && request.status === "HIRED";
  const canCancel =
    (request.viewerRole === "client" || request.viewerRole === "provider") && isCancelable;
  const cancelLabel =
    request.viewerRole === "provider" ? "No puedo tomar este pedido" : "Cancelar pedido";

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

      <RequestStatusActions
        canCancel={canCancel}
        canComplete={canComplete}
        cancelLabel={cancelLabel}
        requestId={request.id}
      />

      {hasAcceptedQuote && (
        <div className="mt-5 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
          <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Presupuesto aceptado</p>
            <p className="mt-1 text-sm">El pedido ya quedó contratado con el prestador elegido.</p>
          </div>
        </div>
      )}

      {request.viewerRole === "provider" && request.status === "OPEN" && request.quotes.length === 0 && (
        <QuoteForm requestId={request.id} />
      )}

      {request.viewerRole === "provider" && request.quotes.length > 0 && (
        <div className="mt-5 rounded-lg bg-muted px-4 py-4 text-sm leading-6 text-muted-foreground">
          Ya enviaste un presupuesto para este pedido.
        </div>
      )}

      <QuoteList
        canDecide={request.viewerRole === "client"}
        hasAcceptedQuote={hasAcceptedQuote}
        quotes={request.quotes}
        requestStatus={request.status}
      />

      <ReviewSection request={request} />

      <section className="mt-5 rounded-lg bg-muted px-4 py-4 text-sm leading-6 text-muted-foreground">
        <div className="flex gap-3">
          <MessageSquareText aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
          <p>El chat y los presupuestos se agregan en la próxima fase.</p>
        </div>
      </section>
    </div>
  );
}
