import { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { getPublicProviderProfile } from "@/server/queries/provider-profile";

function createClient(result: unknown) {
  return {
    providerProfile: {
      findFirst: vi.fn().mockResolvedValue(result),
    },
  };
}

describe("getPublicProviderProfile", () => {
  it("returns null for a missing provider", async () => {
    const client = createClient(null);

    await expect(getPublicProviderProfile("missing", client)).resolves.toBeNull();
    expect(client.providerProfile.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "missing", user: { deletedAt: null } },
      }),
    );
  });

  it("selects active public data only and maps the DTO", async () => {
    const priceUpdatedAt = new Date("2026-05-20T12:00:00.000Z");
    const updatedAt = new Date("2026-05-21T12:00:00.000Z");
    const client = createClient({
      avatarUrl: "https://cdn.example/avatar.webp",
      bio: "Electricista matriculado.",
      id: "provider_1",
      isFeatured: true,
      isVerified: true,
      ratingAvg: 4.75,
      ratingCount: 18,
      services: [
        {
          category: {
            iconName: "zap",
            id: "cat_1",
            name: "Electricidad",
            slug: "electricidad",
          },
          description: "Arreglos e instalaciones.",
          id: "service_1",
          priceFrom: new Prisma.Decimal("100000"),
          priceTo: new Prisma.Decimal("150000"),
          priceUnit: "POR_TRABAJO",
          priceUpdatedAt,
          title: "Arreglo de cables",
          updatedAt,
        },
      ],
      user: { name: "Valentín Turri" },
      zones: [
        {
          zone: {
            id: "zone_1",
            name: "Agronomía",
            slug: "caba-agronomia",
            type: "BARRIO_CABA",
          },
        },
      ],
    });

    const result = await getPublicProviderProfile("provider_1", client);

    expect(result).toEqual({
      avatarUrl: "https://cdn.example/avatar.webp",
      bio: "Electricista matriculado.",
      id: "provider_1",
      isFeatured: true,
      isVerified: true,
      name: "Valentín Turri",
      ratingAvg: 4.75,
      ratingCount: 18,
      services: [
        {
          category: {
            iconName: "zap",
            id: "cat_1",
            name: "Electricidad",
            slug: "electricidad",
          },
          description: "Arreglos e instalaciones.",
          id: "service_1",
          priceFrom: "100000",
          priceTo: "150000",
          priceUnit: "POR_TRABAJO",
          priceUpdatedAt: "2026-05-20T12:00:00.000Z",
          title: "Arreglo de cables",
          updatedAt: "2026-05-21T12:00:00.000Z",
        },
      ],
      zones: [
        {
          id: "zone_1",
          name: "Agronomía",
          slug: "caba-agronomia",
          type: "BARRIO_CABA",
        },
      ],
    });

    expect(JSON.stringify(result)).not.toContain("email");
    expect(JSON.stringify(result)).not.toContain("phone");
    expect(JSON.stringify(result)).not.toContain("cuil");
    expect(JSON.stringify(result)).not.toContain("dni");
    expect(JSON.stringify(result)).not.toContain("dniUrl");
    expect(JSON.stringify(result)).not.toContain("documents");
    expect(JSON.stringify(result)).not.toContain("license");
    expect(JSON.stringify(result)).not.toContain("plan");
    expect(JSON.stringify(result)).not.toContain("subscription");
    expect(JSON.stringify(result)).not.toContain("mercadoPago");
  });

  it("filters out inactive services and soft-deleted users in the query", async () => {
    const client = createClient({
      avatarUrl: null,
      bio: null,
      id: "provider_1",
      isFeatured: false,
      isVerified: false,
      ratingAvg: 0,
      ratingCount: 0,
      services: [],
      user: { name: null },
      zones: [],
    });

    await getPublicProviderProfile("provider_1", client);

    expect(client.providerProfile.findFirst).toHaveBeenCalledTimes(1);
    expect(client.providerProfile.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "provider_1", user: { deletedAt: null } },
        select: expect.objectContaining({
          services: expect.objectContaining({
            where: { isActive: true },
          }),
        }),
      }),
    );
  });
});
