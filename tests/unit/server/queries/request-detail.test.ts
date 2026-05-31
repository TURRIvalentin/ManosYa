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
});
