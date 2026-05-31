import { describe, expect, it, vi } from "vitest";

import { getUserRequests } from "@/server/queries/requests";

const createdAt = new Date("2026-05-31T10:00:00.000Z");
const updatedAt = new Date("2026-05-31T11:00:00.000Z");
type RequestsQueryClient = NonNullable<Parameters<typeof getUserRequests>[1]>["client"];

function requestRow(
  overrides: Partial<{
    clientName: string | null;
    clientProfileId: string;
    id: string;
    targetProviderId: string | null;
    title: string;
  }> = {},
) {
  return {
    category: {
      id: "cat_1",
      name: "Plomeria",
      slug: "plomeria",
    },
    clientProfile: {
      id: overrides.clientProfileId ?? "client_a",
      user: {
        email: "cliente@example.com",
        name: overrides.clientName ?? "Cliente A",
        phone: "+541100000000",
      },
    },
    createdAt,
    id: overrides.id ?? "request_1",
    status: "OPEN" as const,
    targetProviderId: overrides.targetProviderId ?? "provider_a",
    title: overrides.title ?? "Arreglo de perdida",
    updatedAt,
    zone: {
      id: "zone_1",
      name: "Palermo",
      slug: "caba-palermo",
    },
  };
}

function createClient({
  myRequests = [],
  providerProfileId = null,
  providers = [],
  receivedRequests = [],
}: {
  myRequests?: ReturnType<typeof requestRow>[];
  providerProfileId?: string | null;
  providers?: Array<{ id: string; user: { name: string | null } }>;
  receivedRequests?: ReturnType<typeof requestRow>[];
} = {}) {
  const requestFindMany = vi.fn((args: { where?: Record<string, unknown> }) => {
    if (args.where?.clientProfileId === "client_a") return Promise.resolve(myRequests);
    if (providerProfileId && args.where?.targetProviderId === providerProfileId) {
      return Promise.resolve(receivedRequests);
    }

    return Promise.resolve([]);
  });

  return {
    providerProfile: {
      findMany: vi.fn().mockResolvedValue(providers),
    },
    request: {
      findMany: requestFindMany,
    },
    user: {
      findUnique: vi.fn().mockResolvedValue({
        clientProfile: { id: "client_a" },
        providerProfile: providerProfileId ? { id: providerProfileId } : null,
      }),
    },
  };
}

describe("getUserRequests", () => {
  it("returns only requests created by the authenticated client", async () => {
    const client = createClient({
      myRequests: [requestRow({ id: "mine", targetProviderId: "provider_a" })],
      providers: [{ id: "provider_a", user: { name: "Prestador A" } }],
    });

    const result = await getUserRequests("user_a", { client: client as RequestsQueryClient });

    expect(result.myRequests).toHaveLength(1);
    expect(result.myRequests[0]).toMatchObject({
      id: "mine",
      provider: { id: "provider_a", name: "Prestador A" },
    });
    expect(client.request.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          clientProfileId: "client_a",
          deletedAt: null,
        },
      }),
    );
  });

  it("returns only requests directed to the authenticated provider", async () => {
    const client = createClient({
      providerProfileId: "provider_a",
      providers: [{ id: "provider_a", user: { name: "Prestador A" } }],
      receivedRequests: [requestRow({ id: "received", targetProviderId: "provider_a" })],
    });

    const result = await getUserRequests("user_a", { client: client as RequestsQueryClient });

    expect(result.receivedRequests).toHaveLength(1);
    expect(result.receivedRequests[0]).toMatchObject({
      client: { id: "client_a", name: "Cliente A" },
      id: "received",
    });
    expect(client.request.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: {
          deletedAt: null,
          targetProviderId: "provider_a",
        },
      }),
    );
  });

  it("returns both groups for users with client and provider profiles", async () => {
    const client = createClient({
      myRequests: [requestRow({ id: "mine", targetProviderId: "provider_other" })],
      providerProfileId: "provider_a",
      providers: [
        { id: "provider_a", user: { name: "Prestador A" } },
        { id: "provider_other", user: { name: "Prestador externo" } },
      ],
      receivedRequests: [requestRow({ id: "received", targetProviderId: "provider_a" })],
    });

    const result = await getUserRequests("user_a", { client: client as RequestsQueryClient });

    expect(result.canCreateRequests).toBe(true);
    expect(result.canReceiveRequests).toBe(true);
    expect(result.myRequests.map((request) => request.id)).toEqual(["mine"]);
    expect(result.receivedRequests.map((request) => request.id)).toEqual(["received"]);
  });

  it("does not query or expose requests owned by another user", async () => {
    const client = createClient();

    await getUserRequests("user_a", { client: client as RequestsQueryClient });

    expect(client.request.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({
          clientProfileId: "client_b",
        }),
      }),
    );
  });

  it("does not expose private contact or internal fields in the DTO", async () => {
    const client = createClient({
      myRequests: [requestRow({ id: "mine" })],
      providers: [{ id: "provider_a", user: { name: "Prestador A" } }],
    });

    const result = await getUserRequests("user_a", { client: client as RequestsQueryClient });
    const serialized = JSON.stringify(result);

    expect(serialized).not.toMatch(
      /email|phone|cuil|dni|license|documents|subscription|plan|mercadoPago/i,
    );
  });

  it("only marks created banner visible when the request belongs to the user", async () => {
    const client = createClient({
      myRequests: [requestRow({ id: "owned" })],
    });

    await expect(
      getUserRequests("user_a", { client: client as RequestsQueryClient, createdId: "foreign" }),
    ).resolves.toMatchObject({
      createdRequestVisible: false,
    });
    await expect(
      getUserRequests("user_a", { client: client as RequestsQueryClient, createdId: "owned" }),
    ).resolves.toMatchObject({
      createdRequestVisible: true,
    });
  });

  it("does not show the created banner for requests only received by the provider", async () => {
    const client = createClient({
      providerProfileId: "provider_a",
      receivedRequests: [requestRow({ id: "received", targetProviderId: "provider_a" })],
    });

    await expect(
      getUserRequests("user_a", { client: client as RequestsQueryClient, createdId: "received" }),
    ).resolves.toMatchObject({
      createdRequestVisible: false,
    });
  });
});
