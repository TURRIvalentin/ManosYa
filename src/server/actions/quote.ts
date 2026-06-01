"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { createQuoteSchema } from "@/lib/validations/quote";

export type QuoteActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; field?: string };

type Queryable = {
  $transaction<T>(
    callback: (tx: Prisma.TransactionClient) => Promise<T> | T,
  ): Promise<T>;
};

type CreateQuoteDeps = {
  client?: Queryable;
  userId?: string | null;
};

function parseCreateQuoteFormData(formData: FormData) {
  return createQuoteSchema.safeParse({
    comment: formData.get("comment"),
    estimatedDays: formData.get("estimatedDays") || undefined,
    price: formData.get("price"),
    requestId: formData.get("requestId"),
  });
}

export async function createQuoteForUser(
  formData: FormData,
  { client = db, userId }: CreateQuoteDeps = {},
): Promise<QuoteActionResult<{ quoteId: string; requestId: string }>> {
  if (!userId) {
    return { ok: false, error: "Necesitás iniciar sesión para enviar un presupuesto." };
  }

  const parsed = parseCreateQuoteFormData(formData);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: first?.message ?? "Datos inválidos.",
      field: String(first?.path[0] ?? ""),
    };
  }

  const result = await client.$transaction(async (tx) => {
    const providerProfile = await tx.providerProfile.findFirst({
      select: { id: true },
      where: {
        user: {
          deletedAt: null,
          id: userId,
        },
      },
    });

    if (!providerProfile) {
      return {
        ok: false as const,
        error: "Solo un prestador puede enviar presupuestos.",
      };
    }

    const request = await tx.request.findFirst({
      select: {
        id: true,
        status: true,
        targetProviderId: true,
      },
      where: {
        clientProfile: {
          user: {
            deletedAt: null,
          },
        },
        deletedAt: null,
        id: parsed.data.requestId,
      },
    });

    if (!request) {
      return { ok: false as const, error: "El pedido no está disponible.", field: "requestId" };
    }
    if (request.targetProviderId !== providerProfile.id) {
      return {
        ok: false as const,
        error: "No podés presupuestar un pedido dirigido a otro prestador.",
        field: "requestId",
      };
    }
    if (request.status !== "OPEN") {
      return {
        ok: false as const,
        error: "Este pedido ya no acepta presupuestos.",
        field: "requestId",
      };
    }

    const existingQuote = await tx.quote.findUnique({
      select: { id: true },
      where: {
        requestId_providerProfileId: {
          providerProfileId: providerProfile.id,
          requestId: request.id,
        },
      },
    });

    if (existingQuote) {
      return {
        ok: false as const,
        error: "Ya enviaste un presupuesto para este pedido.",
        field: "requestId",
      };
    }

    const quote = await tx.quote.create({
      data: {
        comment: parsed.data.comment,
        estimatedDays: parsed.data.estimatedDays,
        price: parsed.data.price,
        providerProfileId: providerProfile.id,
        requestId: request.id,
        status: "PENDING",
      },
      select: { id: true },
    });

    await tx.request.update({
      data: { status: "QUOTED" },
      where: { id: request.id },
    });

    return { ok: true as const, data: { quoteId: quote.id, requestId: request.id } };
  });

  if (result.ok) {
    revalidatePath(`/pedidos/${result.data.requestId}`);
    revalidatePath("/pedidos");
  }

  return result;
}

export async function createQuoteAction(formData: FormData) {
  const user = await getCurrentUser();
  return createQuoteForUser(formData, { userId: user?.id ?? null });
}
