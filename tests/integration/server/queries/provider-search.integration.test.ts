import { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";

import { searchProviders } from "@/server/queries/provider-search";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/manosya?schema=public";

const db = new PrismaClient({
  datasources: { db: { url: databaseUrl } },
});

const TEST_EMAIL_PREFIX = "provider-search-it-";

async function ensureSearchPrerequisites() {
  await db.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS unaccent`);
  await db.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
  await db.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION f_unaccent(text)
      RETURNS text
      LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS
    $$SELECT unaccent('unaccent', $1)$$
  `);
  await db.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_ts_config WHERE cfgname = 'spanish_unaccent'
      ) THEN
        CREATE TEXT SEARCH CONFIGURATION spanish_unaccent ( COPY = spanish );
        ALTER TEXT SEARCH CONFIGURATION spanish_unaccent
          ALTER MAPPING FOR hword, hword_part, word
          WITH unaccent, spanish_stem;
      END IF;
    END;
    $$
  `);
}

async function cleanup() {
  await db.user.deleteMany({
    where: {
      email: { startsWith: TEST_EMAIL_PREFIX },
    },
  });
  await db.category.deleteMany({
    where: {
      slug: { in: ["it-plomeria", "it-gasistas"] },
    },
  });
  await db.zone.deleteMany({
    where: {
      slug: { in: ["it-palermo", "it-belgrano"] },
    },
  });
}

async function seedProvider({
  categoryId,
  deletedAt = null,
  email,
  isActive = true,
  name,
  serviceDescription = null,
  serviceTitle,
  zoneId,
}: {
  categoryId: string;
  deletedAt?: Date | null;
  email: string;
  isActive?: boolean;
  name: string;
  serviceDescription?: string | null;
  serviceTitle: string;
  zoneId: string;
}) {
  return db.user.create({
    data: {
      deletedAt,
      email,
      name,
      providerProfile: {
        create: {
          bio: "Atención profesional en CABA.",
          zones: { create: { zoneId } },
          services: {
            create: {
              categoryId,
              description: serviceDescription,
              isActive,
              priceFrom: 15000,
              priceTo: 30000,
              title: serviceTitle,
            },
          },
        },
      },
    },
  });
}

describe("searchProviders integration", () => {
  let plumbingCategoryId: string;
  let gasCategoryId: string;
  let palermoZoneId: string;
  let belgranoZoneId: string;

  beforeAll(async () => {
    await db.$connect();
    await ensureSearchPrerequisites();
  });

  beforeEach(async () => {
    await cleanup();

    const [plumbingCategory, gasCategory, palermoZone, belgranoZone] = await Promise.all([
      db.category.create({
        data: {
          name: "IT Plomería",
          slug: "it-plomeria",
        },
      }),
      db.category.create({
        data: {
          name: "IT Gasistas",
          slug: "it-gasistas",
        },
      }),
      db.zone.create({
        data: {
          name: "IT Palermo",
          slug: "it-palermo",
          type: "BARRIO_CABA",
        },
      }),
      db.zone.create({
        data: {
          name: "IT Belgrano",
          slug: "it-belgrano",
          type: "BARRIO_CABA",
        },
      }),
    ]);

    plumbingCategoryId = plumbingCategory.id;
    gasCategoryId = gasCategory.id;
    palermoZoneId = palermoZone.id;
    belgranoZoneId = belgranoZone.id;

    await Promise.all([
      seedProvider({
        categoryId: plumbingCategoryId,
        email: `${TEST_EMAIL_PREFIX}active@manosya.test`,
        name: "IT Prestador Activo",
        serviceDescription: "Arreglos de plomería y cañerías.",
        serviceTitle: "Plomería urgente",
        zoneId: palermoZoneId,
      }),
      seedProvider({
        categoryId: plumbingCategoryId,
        deletedAt: new Date(),
        email: `${TEST_EMAIL_PREFIX}deleted@manosya.test`,
        name: "IT Prestador Borrado",
        serviceTitle: "Plomería oculta",
        zoneId: palermoZoneId,
      }),
      seedProvider({
        categoryId: plumbingCategoryId,
        email: `${TEST_EMAIL_PREFIX}inactive@manosya.test`,
        isActive: false,
        name: "IT Prestador Inactivo",
        serviceTitle: "Plomería inactiva",
        zoneId: palermoZoneId,
      }),
      seedProvider({
        categoryId: gasCategoryId,
        email: `${TEST_EMAIL_PREFIX}gas-belgrano@manosya.test`,
        name: "IT Gas Belgrano",
        serviceTitle: "Gasista matriculado",
        zoneId: belgranoZoneId,
      }),
    ]);
  });

  afterAll(async () => {
    await cleanup();
    await db.$disconnect();
  });

  it("returns active providers with zone and service only", async () => {
    const result = await searchProviders({ categorySlug: "it-plomeria" }, db);
    const names = result.items.map((item) => item.name);

    expect(names).toContain("IT Prestador Activo");
    expect(names).not.toContain("IT Prestador Borrado");
    expect(names).not.toContain("IT Prestador Inactivo");
    expect(result.items[0]?.zones).toEqual([
      expect.objectContaining({ name: "IT Palermo", slug: "it-palermo" }),
    ]);
  });

  it("combines zone and category filters", async () => {
    const palermoPlumbing = await searchProviders({
      categorySlug: "it-plomeria",
      zoneSlug: "it-palermo",
    }, db);
    const belgranoPlumbing = await searchProviders({
      categorySlug: "it-plomeria",
      zoneSlug: "it-belgrano",
    }, db);

    expect(palermoPlumbing.items.map((item) => item.name)).toEqual(["IT Prestador Activo"]);
    expect(belgranoPlumbing.items).toEqual([]);
  });

  it("matches unaccented text against accented service content", async () => {
    const result = await searchProviders({ q: "plomeria" }, db);

    expect(result.items.map((item) => item.name)).toContain("IT Prestador Activo");
  });
});
