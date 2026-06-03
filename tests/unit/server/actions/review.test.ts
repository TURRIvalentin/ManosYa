import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  getCurrentUser: vi.fn(),
}));

import { createReviewForUser } from "@/server/actions/review";

function reviewForm(overrides: Record<string, string> = {}) {
  const formData = new FormData();
  formData.set("comment", "Trabajo prolijo y puntual.");
  formData.set("rating", "5");
  formData.set("requestId", "request_1");

  for (const [key, value] of Object.entries(overrides)) {
    formData.set(key, value);
  }

  return formData;
}

function createClient(
  overrides: Partial<{
    aggregate: unknown;
    existingReview: unknown;
    request: unknown;
    reviewCreate: unknown;
    reviewUpdate: unknown;
    viewer: unknown;
  }> = {},
) {
  const tx = {
    providerProfile: {
      update: vi.fn().mockResolvedValue({ id: "provider_1" }),
    },
    request: {
      findFirst: vi.fn().mockResolvedValue({
        clientProfileId: "client_1",
        id: "request_1",
        status: "COMPLETED",
        targetProviderId: "provider_1",
      }),
    },
    review: {
      aggregate: vi.fn().mockResolvedValue({
        _avg: { clientRating: 4.5 },
        _count: { clientRating: 2 },
      }),
      create: vi.fn().mockResolvedValue({ id: "review_1" }),
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({ id: "review_1" }),
    },
    user: {
      findFirst: vi.fn().mockResolvedValue({
        clientProfile: { id: "client_1" },
        providerProfile: null,
      }),
    },
  };

  if (overrides.aggregate) {
    tx.review.aggregate = overrides.aggregate as typeof tx.review.aggregate;
  }
  if (overrides.existingReview) {
    tx.review.findUnique = overrides.existingReview as typeof tx.review.findUnique;
  }
  if (overrides.request) {
    tx.request.findFirst = overrides.request as typeof tx.request.findFirst;
  }
  if (overrides.reviewCreate) {
    tx.review.create = overrides.reviewCreate as typeof tx.review.create;
  }
  if (overrides.reviewUpdate) {
    tx.review.update = overrides.reviewUpdate as typeof tx.review.update;
  }
  if (overrides.viewer) {
    tx.user.findFirst = overrides.viewer as typeof tx.user.findFirst;
  }

  return {
    client: {
      $transaction: vi.fn((callback) => callback(tx)),
    },
    tx,
  };
}

describe("createReviewForUser", () => {
  it("lets the client review the provider for a completed request", async () => {
    const { client, tx } = createClient();

    const result = await createReviewForUser(reviewForm(), {
      client,
      userId: "client_user",
    });

    expect(result).toEqual({
      ok: true,
      data: {
        providerId: "provider_1",
        requestId: "request_1",
        reviewId: "review_1",
      },
    });
    expect(tx.review.create).toHaveBeenCalledWith({
      data: {
        clientComment: "Trabajo prolijo y puntual.",
        clientProfileId: "client_1",
        clientRating: 5,
        clientReviewedAt: expect.any(Date),
        providerProfileId: "provider_1",
        requestId: "request_1",
      },
      select: { id: true },
    });
  });

  it("lets the provider review the client for a completed request", async () => {
    const { client, tx } = createClient({
      viewer: vi.fn().mockResolvedValue({
        clientProfile: null,
        providerProfile: { id: "provider_1" },
      }),
    });

    const result = await createReviewForUser(reviewForm({ rating: "4" }), {
      client,
      userId: "provider_user",
    });

    expect(result.ok).toBe(true);
    expect(tx.review.create).toHaveBeenCalledWith({
      data: {
        clientProfileId: "client_1",
        providerComment: "Trabajo prolijo y puntual.",
        providerProfileId: "provider_1",
        providerRating: 4,
        providerReviewedAt: expect.any(Date),
        requestId: "request_1",
      },
      select: { id: true },
    });
    expect(tx.providerProfile.update).not.toHaveBeenCalled();
  });

  it("rejects unrelated users", async () => {
    const { client, tx } = createClient({
      viewer: vi.fn().mockResolvedValue({
        clientProfile: { id: "client_other" },
        providerProfile: { id: "provider_other" },
      }),
    });

    const result = await createReviewForUser(reviewForm(), {
      client,
      userId: "user_other",
    });

    expect(result).toEqual({
      ok: false,
      error: "No podés reseñar este pedido.",
      field: "requestId",
    });
    expect(tx.review.create).not.toHaveBeenCalled();
  });

  it("rejects requests that are not completed", async () => {
    const { client, tx } = createClient({
      request: vi.fn().mockResolvedValue({
        clientProfileId: "client_1",
        id: "request_1",
        status: "HIRED",
        targetProviderId: "provider_1",
      }),
    });

    const result = await createReviewForUser(reviewForm(), {
      client,
      userId: "client_user",
    });

    expect(result).toEqual({
      ok: false,
      error: "Solo podés reseñar pedidos completados.",
      field: "requestId",
    });
    expect(tx.review.create).not.toHaveBeenCalled();
  });

  it("rejects duplicate reviews by the same author", async () => {
    const { client, tx } = createClient({
      existingReview: vi.fn().mockResolvedValue({
        clientReviewedAt: new Date("2026-06-01T12:00:00.000Z"),
        id: "review_1",
        providerReviewedAt: null,
      }),
    });

    const result = await createReviewForUser(reviewForm(), {
      client,
      userId: "client_user",
    });

    expect(result).toEqual({
      ok: false,
      error: "Ya dejaste una reseña para este pedido.",
      field: "requestId",
    });
    expect(tx.review.update).not.toHaveBeenCalled();
  });

  it("rejects ratings outside the 1-5 range", async () => {
    const { client, tx } = createClient();

    const result = await createReviewForUser(reviewForm({ rating: "6" }), {
      client,
      userId: "client_user",
    });

    expect(result).toMatchObject({
      ok: false,
      field: "rating",
    });
    expect(client.$transaction).not.toHaveBeenCalled();
    expect(tx.review.create).not.toHaveBeenCalled();
  });

  it("does not create an empty review without a real rating", async () => {
    const { client, tx } = createClient();
    const formData = reviewForm({ comment: "Solo comentario." });
    formData.delete("rating");

    const result = await createReviewForUser(formData, {
      client,
      userId: "client_user",
    });

    expect(result).toMatchObject({
      ok: false,
      field: "rating",
    });
    expect(client.$transaction).not.toHaveBeenCalled();
    expect(tx.review.create).not.toHaveBeenCalled();
    expect(tx.review.update).not.toHaveBeenCalled();
  });

  it("does not create an empty row when the provider reviews first", async () => {
    const { client, tx } = createClient({
      viewer: vi.fn().mockResolvedValue({
        clientProfile: null,
        providerProfile: { id: "provider_1" },
      }),
    });

    await createReviewForUser(reviewForm({ rating: "4" }), {
      client,
      userId: "provider_user",
    });

    expect(tx.review.create).toHaveBeenCalledWith({
      data: {
        clientProfileId: "client_1",
        providerComment: "Trabajo prolijo y puntual.",
        providerProfileId: "provider_1",
        providerRating: 4,
        providerReviewedAt: expect.any(Date),
        requestId: "request_1",
      },
      select: { id: true },
    });
  });

  it("updates provider rating average and count from client reviews", async () => {
    const { client, tx } = createClient({
      aggregate: vi.fn().mockResolvedValue({
        _avg: { clientRating: 4.25 },
        _count: { clientRating: 8 },
      }),
    });

    await createReviewForUser(reviewForm({ rating: "4" }), {
      client,
      userId: "client_user",
    });

    expect(tx.review.aggregate).toHaveBeenCalledWith({
      _avg: { clientRating: true },
      _count: { clientRating: true },
      where: {
        clientRating: { not: null },
        clientReviewedAt: { not: null },
        deletedAt: null,
        providerProfileId: "provider_1",
      },
    });
    expect(tx.providerProfile.update).toHaveBeenCalledWith({
      data: {
        ratingAvg: 4.25,
        ratingCount: 8,
      },
      where: { id: "provider_1" },
    });
  });
});
