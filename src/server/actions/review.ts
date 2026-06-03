"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { createReviewSchema } from "@/lib/validations/review";

export type ReviewActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; field?: string };

type Queryable = {
  $transaction<T>(
    callback: (tx: Prisma.TransactionClient) => Promise<T> | T,
  ): Promise<T>;
};

type CreateReviewDeps = {
  client?: Queryable;
  userId?: string | null;
};

function parseCreateReviewFormData(formData: FormData) {
  return createReviewSchema.safeParse({
    comment: formData.get("comment") || undefined,
    rating: formData.get("rating"),
    requestId: formData.get("requestId"),
  });
}

export async function createReviewForUser(
  formData: FormData,
  { client = db, userId }: CreateReviewDeps = {},
): Promise<ReviewActionResult<{ providerId: string; requestId: string; reviewId: string }>> {
  if (!userId) {
    return { ok: false, error: "Necesitás iniciar sesión para dejar una reseña." };
  }

  const parsed = parseCreateReviewFormData(formData);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: first?.message ?? "Datos inválidos.",
      field: String(first?.path[0] ?? ""),
    };
  }

  const result = await client.$transaction(async (tx) => {
    const [viewer, request] = await Promise.all([
      tx.user.findFirst({
        select: {
          clientProfile: {
            select: { id: true },
          },
          providerProfile: {
            select: { id: true },
          },
        },
        where: {
          deletedAt: null,
          id: userId,
        },
      }),
      tx.request.findFirst({
        select: {
          clientProfileId: true,
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
      }),
    ]);

    if (!viewer || !request?.targetProviderId) {
      return { ok: false as const, error: "El pedido no está disponible.", field: "requestId" };
    }

    const isClientOwner = viewer.clientProfile?.id === request.clientProfileId;
    const isTargetProvider = viewer.providerProfile?.id === request.targetProviderId;

    if (isClientOwner && isTargetProvider) {
      return { ok: false as const, error: "No podés reseñarte a vos mismo.", field: "requestId" };
    }

    if (!isClientOwner && !isTargetProvider) {
      return { ok: false as const, error: "No podés reseñar este pedido.", field: "requestId" };
    }

    if (request.status !== "COMPLETED") {
      return {
        ok: false as const,
        error: "Solo podés reseñar pedidos completados.",
        field: "requestId",
      };
    }

    const existingReview = await tx.review.findUnique({
      select: {
        clientReviewedAt: true,
        id: true,
        providerReviewedAt: true,
      },
      where: { requestId: request.id },
    });

    const now = new Date();
    const comment = parsed.data.comment || null;

    if (isClientOwner) {
      if (existingReview?.clientReviewedAt) {
        return { ok: false as const, error: "Ya dejaste una reseña para este pedido.", field: "requestId" };
      }

      const review = existingReview
        ? await tx.review.update({
            data: {
              clientComment: comment,
              clientRating: parsed.data.rating,
              clientReviewedAt: now,
            },
            select: { id: true },
            where: { id: existingReview.id },
          })
        : await tx.review.create({
            data: {
              clientComment: comment,
              clientProfileId: request.clientProfileId,
              clientRating: parsed.data.rating,
              clientReviewedAt: now,
              providerProfileId: request.targetProviderId,
              requestId: request.id,
            },
            select: { id: true },
          });

      const stats = await tx.review.aggregate({
        _avg: { clientRating: true },
        _count: { clientRating: true },
        where: {
          clientRating: { not: null },
          clientReviewedAt: { not: null },
          deletedAt: null,
          providerProfileId: request.targetProviderId,
        },
      });

      await tx.providerProfile.update({
        data: {
          ratingAvg: stats._avg.clientRating ?? 0,
          ratingCount: stats._count.clientRating,
        },
        where: { id: request.targetProviderId },
      });

      return {
        ok: true as const,
        data: {
          providerId: request.targetProviderId,
          requestId: request.id,
          reviewId: review.id,
        },
      };
    }

    if (existingReview?.providerReviewedAt) {
      return { ok: false as const, error: "Ya dejaste una reseña para este pedido.", field: "requestId" };
    }

    const review = existingReview
      ? await tx.review.update({
          data: {
            providerComment: comment,
            providerRating: parsed.data.rating,
            providerReviewedAt: now,
          },
          select: { id: true },
          where: { id: existingReview.id },
        })
      : await tx.review.create({
          data: {
            clientProfileId: request.clientProfileId,
            providerComment: comment,
            providerProfileId: request.targetProviderId,
            providerRating: parsed.data.rating,
            providerReviewedAt: now,
            requestId: request.id,
          },
          select: { id: true },
        });

    return {
      ok: true as const,
      data: {
        providerId: request.targetProviderId,
        requestId: request.id,
        reviewId: review.id,
      },
    };
  });

  if (result.ok) {
    revalidatePath(`/pedidos/${result.data.requestId}`);
    revalidatePath("/pedidos");
    revalidatePath(`/prestadores/${result.data.providerId}`);
  }

  return result;
}

export async function createReviewAction(formData: FormData) {
  const user = await getCurrentUser();
  return createReviewForUser(formData, { userId: user?.id ?? null });
}
