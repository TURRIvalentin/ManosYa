import { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import {
  buildProviderSearchQuery,
  providerSearchInputSchema,
  searchProviders,
} from "@/server/queries/provider-search";

function sqlText(query: Prisma.Sql): string {
  return query.sql.replace(/\s+/g, " ").trim();
}

describe("providerSearchInputSchema", () => {
  it("normalizes query params and applies a safe default limit", () => {
    const parsed = providerSearchInputSchema.parse({
      limit: "12",
      minRating: "4",
      page: "2",
      priceMax: "50000",
      priceMin: "10000",
      q: " gasista matriculado ",
      verified: "true",
    });

    expect(parsed).toEqual({
      limit: 12,
      minRating: 4,
      page: 2,
      priceMax: 50000,
      priceMin: 10000,
      q: "gasista matriculado",
      verified: true,
    });
  });

  it("rejects invalid slugs, ratings, limits and inverted price ranges", () => {
    expect(() => providerSearchInputSchema.parse({ categorySlug: "../gas" })).toThrow();
    expect(() => providerSearchInputSchema.parse({ limit: 100 })).toThrow();
    expect(() => providerSearchInputSchema.parse({ minRating: 6 })).toThrow();
    expect(() => providerSearchInputSchema.parse({ page: 0 })).toThrow();
    expect(() => providerSearchInputSchema.parse({ priceMax: 100, priceMin: 200 })).toThrow();
  });
});

describe("buildProviderSearchQuery", () => {
  it("uses active services, non-deleted users and provider zones as base filters", () => {
    const query = buildProviderSearchQuery(providerSearchInputSchema.parse({}));
    const text = sqlText(query);

    expect(text).toContain('FROM "ProviderService" ps');
    expect(text).toContain('JOIN "ProviderProfile" pp ON pp."id" = ps."providerProfileId"');
    expect(text).toContain('JOIN "User" u ON u."id" = pp."userId"');
    expect(text).toContain('ps."isActive" = true');
    expect(text).toContain('u."deletedAt" IS NULL');
    expect(text).toContain('FROM "ProviderZone" pz_ready');
    expect(text).toContain("row_number() OVER");
    expect(text).toContain("LIMIT ?");
    expect(text).toContain("OFFSET ?");
    expect(query.values).toEqual(expect.arrayContaining([21, 0]));
  });

  it("adds category, zone, rating, verified, price and text filters", () => {
    const query = buildProviderSearchQuery(
      providerSearchInputSchema.parse({
        categorySlug: "gasistas",
        limit: 10,
        minRating: 4,
        page: 3,
        priceMax: 90000,
        priceMin: 15000,
        q: "gasista palermo",
        verified: true,
        zoneSlug: "palermo",
      }),
    );
    const text = sqlText(query);

    expect(text).toContain('c."slug" = ?');
    expect(text).toContain('JOIN "Zone" z_filter ON z_filter."id" = pz_filter."zoneId"');
    expect(text).toContain('z_filter."slug" = ?');
    expect(text).toContain('pp."ratingAvg" >= ?');
    expect(text).toContain('pp."isVerified" = ?');
    expect(text).toContain('ps."priceUnit" <> \'A_CONVENIR\'');
    expect(text).toContain('coalesce(ps."priceTo", ps."priceFrom") >= ?');
    expect(text).toContain('ps."priceFrom" <= ?');
    expect(text).toContain("websearch_to_tsquery('spanish_unaccent', f_unaccent(?))");
    expect(text).toContain('u."name" ILIKE ?');
    expect(query.values).toEqual(
      expect.arrayContaining([
        "gasistas",
        "palermo",
        4,
        true,
        15000,
        90000,
        "gasista palermo",
        "%gasista palermo%",
        11,
        20,
      ]),
    );
  });
});

describe("searchProviders", () => {
  it("returns a public DTO without private user or verification fields", async () => {
    const queryRaw = vi.fn().mockResolvedValue([
      {
        avatar_url: "https://cdn.example/avatar.webp",
        bio: "Gasista matriculado.",
        category_icon_name: "flame",
        category_id: "cat_1",
        category_name: "Gasistas",
        category_slug: "gasistas",
        is_featured: true,
        is_verified: true,
        name: "Juan Perez",
        price_from: new Prisma.Decimal("15000"),
        price_to: new Prisma.Decimal("30000"),
        price_unit: "POR_TRABAJO",
        provider_id: "provider_1",
        rating_avg: 4.8,
        rating_count: 12,
        service_id: "service_1",
        service_title: "Instalaciones y reparaciones de gas",
        zones: [
          {
            id: "zone_1",
            name: "Palermo",
            slug: "palermo",
            type: "BARRIO_CABA",
          },
        ],
      },
      {
        avatar_url: null,
        bio: null,
        category_icon_name: null,
        category_id: "cat_2",
        category_name: "Plomería",
        category_slug: "plomeria",
        is_featured: false,
        is_verified: false,
        name: "Ana Gomez",
        price_from: null,
        price_to: null,
        price_unit: "A_CONVENIR",
        provider_id: "provider_2",
        rating_avg: 4,
        rating_count: 2,
        service_id: "service_2",
        service_title: "Plomería",
        zones: [],
      },
    ]);

    const result = await searchProviders(
      { limit: 1, page: 1, q: "gas", verified: true },
      { $queryRaw: queryRaw },
    );

    expect(result.hasMore).toBe(true);
    expect(result.limit).toBe(1);
    expect(result.page).toBe(1);
    expect(result.items).toEqual([
      {
        avatarUrl: "https://cdn.example/avatar.webp",
        bio: "Gasista matriculado.",
        id: "provider_1",
        isFeatured: true,
        isVerified: true,
        name: "Juan Perez",
        primaryService: {
          category: {
            iconName: "flame",
            id: "cat_1",
            name: "Gasistas",
            slug: "gasistas",
          },
          id: "service_1",
          priceFrom: "15000",
          priceTo: "30000",
          priceUnit: "POR_TRABAJO",
          title: "Instalaciones y reparaciones de gas",
        },
        ratingAvg: 4.8,
        ratingCount: 12,
        zones: [
          {
            id: "zone_1",
            name: "Palermo",
            slug: "palermo",
            type: "BARRIO_CABA",
          },
        ],
      },
    ]);
    expect(JSON.stringify(result)).not.toContain("email");
    expect(JSON.stringify(result)).not.toContain("phone");
    expect(JSON.stringify(result)).not.toContain("cuil");
    expect(JSON.stringify(result)).not.toContain("dniUrl");
    expect(JSON.stringify(result)).not.toContain("licenseUrl");
  });
});
