import { describe, expect, it, vi } from "vitest";

import { getRequestDetailForUser } from "@/server/queries/request-detail";

type DetailQueryClient = Parameters<typeof getRequestDetailForUser>[2];

const createdAt = new Date("2026-05-31T12:00:00.000Z");
const updatedAt = new Date("2026-05-31T12:30:00.000Z");

function requestRow(
  overrides: Partial<{
    clientName: string | null;
    clientProfileId: string;
    id: string;
    targetProviderId: string | null;
  }> = {},
) {
  return {
    category: {
      id: "cat_1",
      name: "Plomeria",
      slug: "plomeria",
    },
    categoryId: "cat_1",
    clientProfile: {
      id: overrides.clientProfileId ?? "client_a",
      user: {
        email: "cliente@example.com",
        name: overrides.clientName ?? "Cliente A",
        phone: "+541100000000",
      },
    },
    createdAt,
    description: "Necesito reparar una perdida bajo mesada.",
    id: overrides.id ?? "request_1",
    quotes: [] as Array<{
      comment: string | null;
      createdAt: Date;
      currency: string;
      estimatedDays: number | null;
      id: string;
      price: { toString(): string };
      providerProfile: {
        id: string;
        user: {
          name: string | null;
        };
      };
      status: "ACCEPTED" | "EXPIRED" | "PENDING" | "REJECTED" | "WITHDRAWN";
      updatedAt: Date;
    }>,
    review: null as {
      clientComment: string | null;
      clientRating: number | null;
      clientReviewedAt: Date | null;
      deletedAt: Date | null;
      providerComment: string | null;
      providerRating: number | null;
      providerReviewedAt: Date | null;
    } | null,
    status: "OPEN" as const,
    targetProviderId: overrides.targetProviderId ?? "provider_a",
    title: "Arreglo de perdida",
    updatedAt,
    zone: {
      id: "zone_1",
      name: "Palermo",
      slug: "caba-palermo",
    },
  };
}

function createClient({
  provider = {
    id: "provider_a",
    services: [{ id: "service_1", title: "Reparaciones de plomeria" }],
    user: {
      email: "prestador@example.com",
      name: "Prestador A",
      phone: "+541199999999",
    },
  },
  request = requestRow(),
  viewer = {
    clientProfile: { id: "client_a" },
    providerProfile: null,
    role: "USER" as const,
  },
}: {
  provider?: {
    id: string;
    services: Array<{ id: string; title: string }>;
    user: { email?: string; name: string | null; phone?: string };
  } | null;
  request?: ReturnType<typeof requestRow> | null;
  viewer?: {
    clientProfile: { id: string } | null;
    providerProfile: { id: string } | null;
    role: "ADMIN" | "USER";
  } | null;
} = {}) {
  return {
    providerProfile: {
      findFirst: vi.fn().mockResolvedValue(provider),
    },
    request: {
      findFirst: vi.fn().mockResolvedValue(request),
    },
    user: {
      findFirst: vi.fn().mockResolvedValue(viewer),
    },
  };
}

describe("getRequestDetailForUser", () => {
  it("returns the detail for the client that created the request", async () => {
    const client = createClient();

    const result = await getRequestDetailForUser("request_1", "user_client", client);

    expect(result).toMatchObject({
      client: { id: "client_a", name: "Cliente A" },
      id: "request_1",
      provider: { id: "provider_a", name: "Prestador A" },
      service: { id: "service_1", title: "Reparaciones de plomeria" },
      viewerRole: "client",
    });
  });

  it("returns the detail for the directed provider", async () => {
    const client = createClient({
      viewer: {
        clientProfile: null,
        providerProfile: { id: "provider_a" },
        role: "USER",
      },
    });

    const result = await getRequestDetailForUser("request_1", "user_provider", client);

    expect(result).toMatchObject({
      id: "request_1",
      viewerRole: "provider",
    });
  });

  it("returns the detail for an admin", async () => {
    const client = createClient({
      viewer: {
        clientProfile: null,
        providerProfile: null,
        role: "ADMIN",
      },
    });

    const result = await getRequestDetailForUser("request_1", "user_admin", client);

    expect(result).toMatchObject({
      id: "request_1",
      viewerRole: "admin",
    });
  });

  it("returns null for an unrelated user", async () => {
    const client = createClient({
      viewer: {
        clientProfile: { id: "client_other" },
        providerProfile: { id: "provider_other" },
        role: "USER",
      },
    });

    await expect(getRequestDetailForUser("request_1", "user_other", client)).resolves.toBeNull();
  });

  it("filters out soft-deleted viewers, clients, providers and requests", async () => {
    const missingViewerClient = createClient({ viewer: null });
    const missingRequestClient = createClient({ request: null });
    const missingProviderClient = createClient({ provider: null });

    await expect(
      getRequestDetailForUser("request_1", "deleted_user", missingViewerClient),
    ).resolves.toBeNull();
    await expect(
      getRequestDetailForUser("request_1", "user_client", missingRequestClient),
    ).resolves.toBeNull();
    await expect(
      getRequestDetailForUser("request_1", "user_client", missingProviderClient),
    ).resolves.toBeNull();

    expect(missingViewerClient.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          deletedAt: null,
          id: "deleted_user",
        },
      }),
    );
    expect(missingRequestClient.request.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          clientProfile: {
            user: {
              deletedAt: null,
            },
          },
          deletedAt: null,
          id: "request_1",
        }),
      }),
    );
    expect(missingProviderClient.providerProfile.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "provider_a",
          user: {
            deletedAt: null,
          },
        },
      }),
    );
  });

  it("does not expose private contact or internal fields in the DTO", async () => {
    const client = createClient();

    const result = await getRequestDetailForUser("request_1", "user_client", client);
    const serialized = JSON.stringify(result);

    expect(serialized).not.toMatch(
      /email|phone|cuil|dni|license|documents|subscription|plan|mercadoPago/i,
    );
  });

  it("maps public quotes for authorized viewers", async () => {
    const client = createClient({
      request: {
        ...requestRow(),
        quotes: [
          {
            comment: "Incluye materiales y mano de obra.",
            createdAt,
            currency: "ARS",
            estimatedDays: 3,
            id: "quote_1",
            price: { toString: () => "45000" },
            providerProfile: {
              id: "provider_a",
              user: {
                name: "Prestador A",
                ...{
                  email: "prestador@example.com",
                  phone: "+541199999999",
                },
              },
            },
            status: "PENDING" as const,
            updatedAt,
          },
        ],
      },
    });

    const result = await getRequestDetailForUser("request_1", "user_client", client);

    expect(result?.quotes).toEqual([
      {
        comment: "Incluye materiales y mano de obra.",
        createdAt: "2026-05-31T12:00:00.000Z",
        currency: "ARS",
        estimatedDays: 3,
        id: "quote_1",
        price: "45000",
        provider: {
          id: "provider_a",
          name: "Prestador A",
        },
        status: "PENDING",
        updatedAt: "2026-05-31T12:30:00.000Z",
      },
    ]);
  });

  it("maps public reviews for authorized viewers", async () => {
    const client = createClient({
      request: {
        ...requestRow(),
        review: {
          clientComment: "Excelente trabajo.",
          clientRating: 5,
          clientReviewedAt: createdAt,
          deletedAt: null,
          providerComment: "Cliente claro y puntual.",
          providerRating: 4,
          providerReviewedAt: updatedAt,
        },
      },
    });

    const result = await getRequestDetailForUser("request_1", "user_client", client);

    expect(result?.review).toEqual({
      client: {
        comment: "Excelente trabajo.",
        createdAt: "2026-05-31T12:00:00.000Z",
        rating: 5,
        reviewerName: "Cliente A",
      },
      provider: {
        comment: "Cliente claro y puntual.",
        createdAt: "2026-05-31T12:30:00.000Z",
        rating: 4,
        reviewerName: "Prestador A",
      },
    });
  });
});
