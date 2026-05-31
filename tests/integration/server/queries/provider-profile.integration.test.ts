import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { getPublicProviderProfile } from "@/server/queries/provider-profile";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/manosya?schema=public";

const db = new PrismaClient({
  datasources: { db: { url: databaseUrl } },
});

const TEST_EMAIL_PREFIX = "provider-profile-it-";

async function cleanup() {
  await db.user.deleteMany({
    where: {
      email: { startsWith: TEST_EMAIL_PREFIX },
    },
  });
  await db.category.deleteMany({
    where: {
      slug: { in: ["it-profile-electricidad", "it-profile-plomeria"] },
    },
  });
  await db.zone.deleteMany({
    where: {
      slug: { in: ["it-profile-palermo", "it-profile-belgrano"] },
    },
  });
}

describe("getPublicProviderProfile integration", () => {
  let activeProviderId: string;
  let deletedProviderId: string;

  beforeAll(async () => {
    await db.$connect();
  });

  beforeEach(async () => {
    await cleanup();

    const [electricidad, plomeria, palermo, belgrano] = await Promise.all([
      db.category.create({
        data: { name: "IT Perfil Electricidad", slug: "it-profile-electricidad" },
      }),
      db.category.create({
        data: { name: "IT Perfil Plomería", slug: "it-profile-plomeria" },
      }),
      db.zone.create({
        data: { name: "IT Perfil Palermo", slug: "it-profile-palermo", type: "BARRIO_CABA" },
      }),
      db.zone.create({
        data: { name: "IT Perfil Belgrano", slug: "it-profile-belgrano", type: "BARRIO_CABA" },
      }),
    ]);

    const active = await db.user.create({
      data: {
        email: `${TEST_EMAIL_PREFIX}active@manosya.test`,
        name: "IT Perfil Activo",
        phone: "+5491111111111",
        providerProfile: {
          create: {
            bio: "Atención pública visible.",
            cuil: "20123456786",
            dniUrl: "https://private.example/dni.pdf",
            licenseUrl: "https://private.example/license.pdf",
            isVerified: true,
            ratingAvg: 4.5,
            ratingCount: 7,
            zones: {
              create: [{ zoneId: palermo.id }, { zoneId: belgrano.id }],
            },
            services: {
              create: [
                {
                  categoryId: electricidad.id,
                  description: "Servicio activo visible.",
                  isActive: true,
                  priceFrom: 100000,
                  priceTo: 150000,
                  priceUpdatedAt: new Date("2026-05-10T00:00:00.000Z"),
                  title: "Instalación eléctrica",
                },
                {
                  categoryId: plomeria.id,
                  description: "Servicio inactivo oculto.",
                  isActive: false,
                  title: "Plomería oculta",
                },
              ],
            },
          },
        },
      },
      select: { providerProfile: { select: { id: true } } },
    });

    const deleted = await db.user.create({
      data: {
        deletedAt: new Date(),
        email: `${TEST_EMAIL_PREFIX}deleted@manosya.test`,
        name: "IT Perfil Borrado",
        providerProfile: {
          create: {
            services: {
              create: {
                categoryId: electricidad.id,
                isActive: true,
                title: "Servicio borrado",
              },
            },
            zones: { create: { zoneId: palermo.id } },
          },
        },
      },
      select: { providerProfile: { select: { id: true } } },
    });

    activeProviderId = active.providerProfile!.id;
    deletedProviderId = deleted.providerProfile!.id;
  });

  afterAll(async () => {
    await cleanup();
    await db.$disconnect();
  });

  it("returns a public profile with active services and zones", async () => {
    const result = await getPublicProviderProfile(activeProviderId, db);

    expect(result?.name).toBe("IT Perfil Activo");
    expect(result?.isVerified).toBe(true);
    expect(result?.services).toHaveLength(1);
    expect(result?.services[0]).toEqual(
      expect.objectContaining({
        category: expect.objectContaining({ slug: "it-profile-electricidad" }),
        priceFrom: "100000",
        priceTo: "150000",
        priceUpdatedAt: "2026-05-10T00:00:00.000Z",
        title: "Instalación eléctrica",
      }),
    );
    expect(result?.zones.map((zone) => zone.slug).sort()).toEqual([
      "it-profile-belgrano",
      "it-profile-palermo",
    ]);
    expect(JSON.stringify(result)).not.toContain("+549");
    expect(JSON.stringify(result)).not.toContain("20123456786");
    expect(JSON.stringify(result)).not.toContain("private.example");
    expect(JSON.stringify(result)).not.toContain("email");
    expect(JSON.stringify(result)).not.toContain("phone");
    expect(JSON.stringify(result)).not.toContain("cuil");
    expect(JSON.stringify(result)).not.toContain("dni");
    expect(JSON.stringify(result)).not.toContain("license");
    expect(JSON.stringify(result)).not.toContain("documents");
    expect(JSON.stringify(result)).not.toContain("subscription");
    expect(JSON.stringify(result)).not.toContain("plan");
    expect(JSON.stringify(result)).not.toContain("mercadoPago");
  });

  it("returns null for missing and soft-deleted providers", async () => {
    await expect(getPublicProviderProfile("missing-provider", db)).resolves.toBeNull();
    await expect(getPublicProviderProfile(deletedProviderId, db)).resolves.toBeNull();
  });
});
