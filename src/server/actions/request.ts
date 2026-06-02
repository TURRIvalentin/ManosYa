"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { createRequestSchema, requestDecisionSchema } from "@/lib/validations/request";

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

const CANCELABLE_REQUEST_STATUSES = ["OPEN", "HIRED"] as const;

function parseCreateRequestFormData(formData: FormData) {
  return createRequestSchema.safeParse({
    categoryId: formData.get("categoryId"),
    description: formData.get("description"),
    providerId: formData.get("providerId"),
    title: formData.get("title"),
    zoneId: formData.get("zoneId"),
  });
}

function parseRequestDecisionFormData(formData: FormData) {
  return requestDecisionSchema.safeParse({
    requestId: formData.get("requestId"),
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

export async function completeRequestForUser(
  formData: FormData,
  { client = db, userId }: CreateRequestDeps = {},
): Promise<RequestActionResult<{ requestId: string }>> {
  if (!userId) {
    return { ok: false, error: "Necesitás iniciar sesión para completar un pedido." };
  }

  const parsed = parseRequestDecisionFormData(formData);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: first?.message ?? "Datos inválidos.",
      field: String(first?.path[0] ?? ""),
    };
  }

  const result = await client.$transaction(async (tx) => {
    const update = await tx.request.updateMany({
      data: { status: "COMPLETED" },
      where: {
        clientProfile: {
          user: {
            deletedAt: null,
            id: userId,
          },
        },
        deletedAt: null,
        id: parsed.data.requestId,
        status: "HIRED",
      },
    });

    if (update.count !== 1) {
      return {
        ok: false as const,
        error: "Este pedido no se puede marcar como completado.",
        field: "requestId",
      };
    }

    return { ok: true as const, data: { requestId: parsed.data.requestId } };
  });

  if (result.ok) {
    revalidatePath(`/pedidos/${result.data.requestId}`);
    revalidatePath("/pedidos");
  }

  return result;
}

export async function cancelRequestForUser(
  formData: FormData,
  { client = db, userId }: CreateRequestDeps = {},
): Promise<RequestActionResult<{ requestId: string }>> {
  if (!userId) {
    return { ok: false, error: "Necesitás iniciar sesión para cancelar un pedido." };
  }

  const parsed = parseRequestDecisionFormData(formData);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: first?.message ?? "Datos inválidos.",
      field: String(first?.path[0] ?? ""),
    };
  }

  const result = await client.$transaction(async (tx) => {
    const request = await tx.request.findFirst({
      select: {
        clientProfile: {
          select: { userId: true },
        },
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

    const providerProfile = await tx.providerProfile.findFirst({
      select: { id: true },
      where: {
        user: {
          deletedAt: null,
          id: userId,
        },
      },
    });

    const isClientOwner = request.clientProfile.userId === userId;
    const isTargetProvider =
      Boolean(providerProfile) && request.targetProviderId === providerProfile?.id;

    if (!isClientOwner && !isTargetProvider) {
      return {
        ok: false as const,
        error: "No podés cancelar este pedido.",
        field: "requestId",
      };
    }

    if (!CANCELABLE_REQUEST_STATUSES.includes(request.status as "OPEN" | "HIRED")) {
      return {
        ok: false as const,
        error: "Este pedido ya no se puede cancelar.",
        field: "requestId",
      };
    }

    const update = await tx.request.updateMany({
      data: { status: "CANCELLED" },
      where: {
        ...(isClientOwner
          ? {
              clientProfile: {
                userId,
              },
            }
          : {
              targetProviderId: providerProfile?.id,
            }),
        deletedAt: null,
        id: request.id,
        status: { in: [...CANCELABLE_REQUEST_STATUSES] },
      },
    });

    if (update.count !== 1) {
      return {
        ok: false as const,
        error: "Este pedido ya no se puede cancelar.",
        field: "requestId",
      };
    }

    if (!isClientOwner && isTargetProvider && providerProfile) {
      if (request.status === "HIRED") {
        await tx.quote.updateMany({
          data: { status: "REJECTED" },
          where: {
            providerProfileId: providerProfile.id,
            requestId: request.id,
            status: "ACCEPTED",
          },
        });
      } else {
        await tx.quote.updateMany({
          data: { status: "WITHDRAWN" },
          where: {
            providerProfileId: providerProfile.id,
            requestId: request.id,
            status: "PENDING",
          },
        });
      }
    }

    return { ok: true as const, data: { requestId: request.id } };
  });

  if (result.ok) {
    revalidatePath(`/pedidos/${result.data.requestId}`);
    revalidatePath("/pedidos");
  }

  return result;
}

export async function completeRequestAction(formData: FormData) {
  const user = await getCurrentUser();
  return completeRequestForUser(formData, { userId: user?.id ?? null });
}

export async function cancelRequestAction(formData: FormData) {
  const user = await getCurrentUser();
  return cancelRequestForUser(formData, { userId: user?.id ?? null });
}
