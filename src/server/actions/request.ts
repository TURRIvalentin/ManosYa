"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { createRequestSchema } from "@/lib/validations/request";

export type RequestActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; field?: string };

type Queryable = {
  $transaction<T>(
    callback: (tx: Prisma.TransactionClient) => Promise<T> | T,
  ): Promise<T>;
};

type CreateRequestDeps = {
  client?: Queryable;
  userId?: string | null;
};

function parseCreateRequestFormData(formData: FormData) {
  return createRequestSchema.safeParse({
    categoryId: formData.get("categoryId"),
    description: formData.get("description"),
    providerId: formData.get("providerId"),
    title: formData.get("title"),
    zoneId: formData.get("zoneId"),
  });
}

export async function createRequestForUser(
  formData: FormData,
  { client = db, userId }: CreateRequestDeps = {},
): Promise<RequestActionResult<{ requestId: string }>> {
  if (!userId) {
    return { ok: false, error: "Necesitás iniciar sesión para crear un pedido." };
  }

  const parsed = parseCreateRequestFormData(formData);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: first?.message ?? "Datos inválidos.",
      field: String(first?.path[0] ?? ""),
    };
  }

  const result = await client.$transaction(async (tx) => {
    const clientProfile = await tx.clientProfile.findUnique({
      select: {
        id: true,
        user: {
          select: { phone: true },
        },
      },
      where: { userId },
    });
    if (!clientProfile?.user.phone) {
      return {
        ok: false as const,
        error: "Completá tu onboarding como cliente para crear pedidos.",
      };
    }

    const [category, zone, provider] = await Promise.all([
      tx.category.findFirst({
        select: { id: true },
        where: { id: parsed.data.categoryId, isActive: true },
      }),
      tx.zone.findUnique({
        select: { id: true },
        where: { id: parsed.data.zoneId },
      }),
      tx.providerProfile.findFirst({
        select: {
          id: true,
          userId: true,
          services: {
            select: { categoryId: true, id: true },
            where: { isActive: true },
          },
        },
        where: {
          id: parsed.data.providerId,
          services: { some: { isActive: true } },
          user: { deletedAt: null },
        },
      }),
    ]);

    if (!category) {
      return { ok: false as const, error: "La categoría seleccionada no es válida.", field: "categoryId" };
    }
    if (!zone) {
      return { ok: false as const, error: "La zona seleccionada no es válida.", field: "zoneId" };
    }
    if (!provider) {
      return { ok: false as const, error: "El prestador seleccionado no está disponible.", field: "providerId" };
    }
    if (provider.userId === userId) {
      return {
        ok: false as const,
        error: "No podés pedirte presupuesto a tu propio perfil de prestador.",
        field: "providerId",
      };
    }
    if (!provider.services.some((service) => service.categoryId === parsed.data.categoryId)) {
      return {
        ok: false as const,
        error: "La categoría seleccionada no corresponde a un servicio activo del prestador.",
        field: "categoryId",
      };
    }

    const request = await tx.request.create({
      data: {
        categoryId: parsed.data.categoryId,
        clientProfileId: clientProfile.id,
        description: parsed.data.description,
        status: "OPEN",
        targetProviderId: provider.id,
        title: parsed.data.title,
        zoneId: parsed.data.zoneId,
      },
      select: { id: true },
    });

    return { ok: true as const, data: { requestId: request.id } };
  });

  if (result.ok) {
    revalidatePath("/pedidos");
  }

  return result;
}

export async function createRequestAction(
  formData: FormData,
): Promise<RequestActionResult<{ requestId: string }>> {
  const user = await getCurrentUser();
  return createRequestForUser(formData, { userId: user?.id ?? null });
}
